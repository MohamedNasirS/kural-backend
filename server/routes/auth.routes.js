import express from "express";
import User from "../models/User.js";
import { connectToDatabase } from "../config/database.js";
import { roleMap } from "../utils/helpers.js";
import { isProduction, SESSION_COOKIE_SAMESITE, SESSION_COOKIE_DOMAIN } from "../config/index.js";
import { loginRateLimiter, resetRateLimit } from "../middleware/rateLimit.js";

const router = express.Router();

// Login endpoint with rate limiting
router.post("/login", loginRateLimiter, async (req, res) => {
  try {
    const { identifier, password } = req.body ?? {};

    if (!identifier || !password) {
      return res.status(400).json({
        message: "Identifier and password are required",
      });
    }

    try {
      await connectToDatabase();
    } catch (dbError) {
      console.error("Database connection error:", dbError);
      console.error("Database connection error stack:", dbError.stack);
      return res.status(500).json({
        message: "Database connection failed",
        error: process.env.NODE_ENV === "development" ? dbError.message : undefined
      });
    }

    const trimmedIdentifier = String(identifier).trim();
    const normalizedIdentifier = trimmedIdentifier.toLowerCase();

    const identifierVariants = new Set();
    const addVariant = (variant) => {
      if (variant === undefined || variant === null) {
        return;
      }
      const value = typeof variant === "string" ? variant.trim() : variant;
      if (value === "" || identifierVariants.has(value)) {
        return;
      }
      identifierVariants.add(value);
    };

    addVariant(trimmedIdentifier);
    addVariant(normalizedIdentifier);

    if (/^\d+$/.test(trimmedIdentifier)) {
      addVariant(Number(trimmedIdentifier));
    }

    const digitsOnly = trimmedIdentifier.replace(/\D/g, "");
    if (digitsOnly && digitsOnly !== trimmedIdentifier) {
      addVariant(digitsOnly);
    }
    if (/^\d+$/.test(digitsOnly)) {
      addVariant(Number(digitsOnly));
      if (digitsOnly.length > 10) {
        addVariant(digitsOnly.slice(-10));
        addVariant(Number(digitsOnly.slice(-10)));
      }
    }

    const lookupConditions = [];
    const conditionKeys = new Set();
    const pushCondition = (condition) => {
      const key = JSON.stringify(condition);
      if (!conditionKeys.has(key)) {
        lookupConditions.push(condition);
        conditionKeys.add(key);
      }
    };

    for (const value of identifierVariants) {
      if (typeof value === "string") {
        const lowerValue = value.toLowerCase();
        pushCondition({ email: lowerValue });
        pushCondition({ email: value });
        pushCondition({ phone: value });
        pushCondition({ phone: lowerValue });
      } else {
        pushCondition({ phone: value });
      }
    }

    // Debug logging (sanitized - no sensitive data)
    if (process.env.NODE_ENV === 'development') {
      console.debug("Login lookup variants count:", identifierVariants.size);
      console.debug("Login lookup conditions count:", lookupConditions.length);
    }
    const activeFilter = { $or: [{ isActive: { $exists: false } }, { isActive: true }] };

    const user = await User.findOne({
      $and: [{ $or: lookupConditions }, activeFilter],
    }).lean(false);

    if (!user) {
      // Log sanitized info (no credentials)
      console.warn("Login failed: user not found", {
        identifierType: normalizedIdentifier.includes('@') ? 'email' : 'phone',
        lookupConditions: lookupConditions.length
      });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Log user found (sanitized - no sensitive data)
    console.log("User found:", {
      userId: user._id.toString(),
      role: user.role,
      isActive: user.isActive
    });

    let isPasswordValid = false;
    try {
      isPasswordValid = await user.verifyPassword(password);
    } catch (passwordError) {
      console.error("Password verification error:", passwordError);
      console.error("Password verification error stack:", passwordError.stack);
      return res.status(500).json({
        message: "Error verifying password",
        error: process.env.NODE_ENV === "development" ? passwordError.message : undefined
      });
    }

    if (!isPasswordValid) {
      // Log sanitized info (no credentials)
      console.warn("Login failed: invalid password", {
        userId: user._id.toString()
      });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log("Password verified successfully");

    const mappedRole = roleMap.get(user.role);
    if (!mappedRole) {
      console.warn("Login failed: role not mapped", {
        userId: user._id.toString(),
        userRole: user.role,
        availableRoles: Array.from(roleMap.keys())
      });
      return res.status(403).json({ message: "Role is not authorised" });
    }

    console.log("Role mapped successfully:", mappedRole);

    // Store user in session
    const userSession = {
      _id: user._id,
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: mappedRole,
      assignedAC: user.assignedAC ?? null,
      aciName: user.aci_name ?? null,
    };

    req.session.user = userSession;
    req.user = userSession;

    // Save session explicitly and wait for it
    try {
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            reject(err);
          } else {
            resolve(null);
          }
        });
      });
    } catch (sessionError) {
      console.error("Failed to save session:", sessionError);
      return res.status(500).json({ message: "Failed to create session" });
    }

    // Log session creation (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('Login successful - Session ID:', req.sessionID);
      console.log('Login successful - User stored in session:', !!req.session.user);
      console.log('Login successful - Cookie headers:', res.getHeader('Set-Cookie'));
    }

    return res.json({
      user: userSession,
    });
  } catch (error) {
    console.error("Login error", error);
    console.error("Login error stack:", error.stack);
    return res.status(500).json({
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
});

// Logout endpoint
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Failed to logout" });
    }
    // Clear cookie with same settings as when it was set
    res.clearCookie("kural.sid", {
      path: '/',
      httpOnly: true,
      secure: isProduction,
      sameSite: SESSION_COOKIE_SAMESITE,
      domain: SESSION_COOKIE_DOMAIN || (isProduction ? '.kuralapp.in' : undefined),
    });
    return res.json({ message: "Logged out successfully" });
  });
});

// Check session endpoint
router.get("/me", async (req, res) => {
  // Ensure session is initialized
  if (!req.session) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Auth check - No session object found');
    }
    return res.status(401).json({ message: "Not authenticated" });
  }

  // Debug logging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('Auth check - Session exists:', !!req.session);
    console.log('Auth check - User in session:', !!req.session?.user);
    console.log('Auth check - Session ID:', req.sessionID);
    console.log('Auth check - Has cookies:', !!req.headers.cookie);
  }

  if (req.session && req.session.user) {
    // If user exists in session, verify it's still valid by checking the database
    try {
      await connectToDatabase();
      const user = await User.findById(req.session.user._id || req.session.user.id).lean();

      if (!user) {
        // User no longer exists in database, destroy session
        req.session.destroy((err) => {
          if (err) console.error('Error destroying session:', err);
        });
        return res.status(401).json({ message: "User not found" });
      }

      // Check if user is still active
      if (user.isActive === false) {
        req.session.destroy((err) => {
          if (err) console.error('Error destroying session:', err);
        });
        return res.status(401).json({ message: "User account is inactive" });
      }

      // Update session with latest user data (in case role or assignedAC changed)
      const mappedRole = roleMap.get(user.role);
      if (!mappedRole) {
        req.session.destroy((err) => {
          if (err) console.error('Error destroying session:', err);
        });
        return res.status(403).json({ message: "Role is not authorised" });
      }

      const userSession = {
        _id: user._id,
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: mappedRole,
        assignedAC: user.assignedAC ?? null,
        aciName: user.aci_name ?? null,
      };

      // Update session if user data changed
      if (JSON.stringify(req.session.user) !== JSON.stringify(userSession)) {
        req.session.user = userSession;
        await new Promise((resolve, reject) => {
          req.session.save((err) => {
            if (err) reject(err);
            else resolve(null);
          });
        });
      }

      return res.json({ user: userSession });
    } catch (error) {
      console.error('Error verifying user session:', error);
      console.error('Error stack:', error.stack);
      // On error, return proper error response in development
      if (process.env.NODE_ENV === "development") {
        return res.status(500).json({
          message: "Error verifying session",
          error: error.message,
          stack: error.stack
        });
      }
      // In production, still return the session user if it exists
      return res.json({ user: req.session.user });
    }
  }

  // Log more details for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('Auth check - No user found in session');
    console.log('Auth check - Session ID:', req.sessionID);
    console.log('Auth check - Has cookies:', !!req.headers.cookie);
  }
  return res.status(401).json({ message: "Not authenticated" });
});

// Diagnostic endpoint to check session/cookie status
// ISS-006 fix: Only available in development environment
router.get("/debug", (req, res) => {
  // Block in production to prevent information disclosure
  if (isProduction) {
    return res.status(404).json({ message: "Not found" });
  }

  res.json({
    hasSession: !!req.session,
    hasSessionUser: !!(req.session && req.session.user),
    sessionId: req.sessionID,
    hasCookies: !!req.headers.cookie,
    cookieHeader: req.headers.cookie || null,
    userAgent: req.headers['user-agent'],
    origin: req.headers.origin,
    referer: req.headers.referer,
    cookieSettings: {
      secure: isProduction,
      sameSite: SESSION_COOKIE_SAMESITE,
      domain: SESSION_COOKIE_DOMAIN || (isProduction ? '.kuralapp.in' : undefined),
    }
  });
});

export default router;
