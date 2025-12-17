/**
 * RBAC User Management Routes
 * Handles user CRUD operations with role-based access control
 */

import express from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../../models/User.js";
// Booth model import removed - using voter data as source of truth for booth info
// import Booth from "../../models/Booth.js";
import { getVoterModel } from "../../utils/voterCollection.js";
import {
  isAuthenticated,
  canAccessAC,
} from "../../middleware/auth.js";
import { getCache, setCache, invalidateCache, TTL } from "../../utils/cache.js";
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendConflict,
  sendServerError
} from "../../utils/responseHelpers.js";

const router = express.Router();

/**
 * Normalize phone number - remove spaces, dashes, and keep only digits
 * @param {string|number} phone - Phone number to normalize
 * @returns {string} Normalized phone number
 */
function normalizePhone(phone) {
  if (!phone) return phone;
  const normalized = String(phone).replace(/\D/g, '');
  return normalized || phone;
}

/**
 * GET /api/rbac/users
 * Get all users (with optional filters)
 * Access: L0, L1, L2
 */
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const { role, ac, search, status } = req.query;

    // Check permissions - L0, L1, and L2 can view users (with restrictions)
    if (!["L0", "L1", "L2"].includes(req.user.role)) {
      return sendForbidden(res, "You don't have permission to view users");
    }

    // Cache check - only use cache when no search filter
    const cacheKey = `users:${req.user.role}:${req.user.assignedAC || 'all'}:${role || 'all'}:${ac || 'all'}:${status || 'all'}`;
    if (!search) {
      const cached = getCache(cacheKey);
      if (cached) {
        return res.json(cached);
      }
    }

    const query = {};

    // Only filter by isActive for L1 and L2, L0 can see all users
    if (req.user.role !== "L0") {
      query.isActive = true;
    }

    // L2 (ACI) can only see users in their AC
    if (req.user.role === "L2") {
      query.assignedAC = req.user.assignedAC;
    }

    // Filter by role
    if (role) {
      if (role === "Booth Agent" || role === "BoothAgent") {
        query.$or = [{ role: "Booth Agent" }, { role: "BoothAgent" }];
      } else {
        query.role = role;
      }
    }

    // Filter by AC
    if (ac) {
      const acId = parseInt(ac);
      if (req.user.role === "L2" && acId !== req.user.assignedAC) {
        return sendForbidden(res, "Access denied to users in this AC");
      }
      query.assignedAC = acId;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Search by name, email, or phone
    if (search) {
      const searchRegex = new RegExp(search, "i");
      const searchFilter = {
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { phone: searchRegex },
        ]
      };

      if (query.$and) {
        query.$and.push(searchFilter);
      } else if (query.$or) {
        query.$and = [
          { $or: query.$or },
          searchFilter
        ];
        delete query.$or;
      } else {
        query.$or = searchFilter.$or;
      }
    }

    const users = await User.find(query)
      .select("-password -passwordHash")
      .populate("createdBy", "name role")
      .populate("assignedBoothId", "boothName boothCode")
      .sort({ createdAt: -1 })
      .limit(10000)
      .lean()
      .exec();

    const totalCount = await User.countDocuments(query);

    let totalInDatabase = totalCount;
    if (req.user.role === "L0") {
      totalInDatabase = await User.countDocuments({});
    }

    const response = {
      success: true,
      count: users.length,
      totalCount: totalCount,
      totalInDatabase: totalInDatabase,
      users,
    };

    if (!search) {
      setCache(cacheKey, response, TTL.SHORT);
    }

    res.json(response);
  } catch (error) {
    console.error("Error fetching users:", error);
    sendServerError(res, "Failed to fetch users", error);
  }
});

/**
 * POST /api/rbac/users
 * Create a new user
 * Access: L0 (all users), L1/ACIM (can create L2/ACI and BoothAgent)
 */
router.post("/", isAuthenticated, async (req, res) => {
  try {
    const {
      name, email, phone, password, role, assignedAC, aci_name, assignedBoothId, status,
      booth_id, booth_agent_id, aci_id
    } = req.body;

    // Validate required fields
    if (!name || !role) {
      return sendBadRequest(res, "Name and role are required");
    }

    if (!password) {
      return sendBadRequest(res, "Password is required");
    }

    // Check creation privileges
    if (req.user.role === "L0") {
      // L0 can create anyone
    } else if (req.user.role === "L1") {
      if (role === "L0") {
        return sendForbidden(res, "ACIM cannot create System Admin users");
      }
    } else if (req.user.role === "L2") {
      if (role !== "Booth Agent" && role !== "BoothAgent") {
        return sendForbidden(res, "ACI can only create Booth Agent users");
      }
      const requestedAC = aci_id || assignedAC;
      const requestedACNum = typeof requestedAC === 'number' ? requestedAC : parseInt(requestedAC);
      const userAC = typeof req.user.assignedAC === 'number' ? req.user.assignedAC : parseInt(req.user.assignedAC);

      if (requestedAC && requestedACNum !== userAC) {
        return sendForbidden(res, `You can only create users in your assigned AC (${userAC})`);
      }
    } else {
      return sendForbidden(res, "You don't have permission to create users");
    }

    // Validate role
    const validRoles = ["L0", "L1", "L2", "MLA", "Booth Agent", "BoothAgent"];
    if (!validRoles.includes(role)) {
      return sendBadRequest(res, "Invalid role");
    }

    // For L2 and MLA, assignedAC is required
    if ((role === "L2" || role === "MLA") && !assignedAC && !aci_id) {
      return sendBadRequest(res, `assignedAC is required for role ${role}`);
    }

    // For L1 (ACIM), assignedAC should NOT be set
    if (role === "L1" && (assignedAC || aci_id)) {
      return sendBadRequest(res, "ACIM (L1) users should not have an assigned AC");
    }

    // Check if user already exists
    if (email || phone) {
      const existingUser = await User.findOne({
        $or: [
          email ? { email } : null,
          phone ? { phone } : null,
        ].filter(Boolean),
        isActive: true,
      });

      if (existingUser) {
        return sendConflict(res, "User with this email or phone already exists");
      }
    }

    // Auto-generate booth_agent_id for Booth Agent role if not provided
    // SIMPLIFIED: No longer uses Booth collection, booth info stored directly in user document
    let finalBoothAgentId = booth_agent_id;
    let boothIdentifier = booth_id || assignedBoothId;

    // Normalize booth identifier format
    if (boothIdentifier && boothIdentifier.startsWith('voter-booth-')) {
      const parts = boothIdentifier.split('-');
      if (parts.length >= 4) {
        const acIdFromId = parseInt(parts[2]);
        const boothNumberFromId = parseInt(parts[3]);
        boothIdentifier = `ac${acIdFromId}${String(boothNumberFromId).padStart(3, '0')}`;
      }
    }

    if ((role === "Booth Agent" || role === "BoothAgent") && boothIdentifier && !booth_agent_id) {
      // Count existing agents assigned to this specific booth (by booth_id string)
      const existingAgentsCount = await User.countDocuments({
        role: { $in: ["Booth Agent", "BoothAgent"] },
        isActive: true,
        booth_id: boothIdentifier
      });

      let sequence = existingAgentsCount + 1;
      finalBoothAgentId = `${boothIdentifier}-${sequence}`;

      // Ensure unique booth_agent_id
      let existingAgentId = await User.findOne({ booth_agent_id: finalBoothAgentId });
      while (existingAgentId) {
        sequence++;
        finalBoothAgentId = `${boothIdentifier}-${sequence}`;
        existingAgentId = await User.findOne({ booth_agent_id: finalBoothAgentId });
      }
    }

    // Check if booth_agent_id already exists
    if (finalBoothAgentId) {
      const existingAgent = await User.findOne({ booth_agent_id: finalBoothAgentId });
      if (existingAgent) {
        return sendConflict(res, "Booth agent ID already exists");
      }
    }

    // Use booth_id directly (no Booth collection lookup needed)
    let finalBoothId = boothIdentifier;

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user (no longer uses assignedBoothId - booth info stored in booth_id string)
    const newUser = new User({
      name,
      email,
      phone,
      passwordHash,
      password: passwordHash,
      role,
      assignedAC: aci_id || assignedAC || (req.user.role === "L1" ? req.user.assignedAC : undefined),
      aci_id: aci_id || assignedAC,
      aci_name: aci_name || (req.user.role === "L1" ? req.user.aci_name : undefined),
      booth_id: finalBoothId,
      booth_agent_id: finalBoothAgentId,
      status: status || "Active",
      createdBy: req.user._id,
      isActive: true,
      emailVerified: false,
      loginAttempts: 0,
    });

    await newUser.save();

    const userResponse = await User.findById(newUser._id)
      .select("-password -passwordHash")
      .populate("createdBy", "name role");

    invalidateCache('users:');
    invalidateCache('booth-agents:');

    sendCreated(res, {
      user: userResponse,
      booth_agent_id: newUser.booth_agent_id,
    }, "User created successfully");
  } catch (error) {
    console.error("Error creating user:", error);
    sendServerError(res, "Failed to create user", error);
  }
});

/**
 * POST /api/rbac/users/booth-agent
 * Create a new booth agent (dedicated endpoint)
 * SIMPLIFIED: No longer uses Booth collection, booth info stored directly in user document
 * Access: L0, L1, L2
 */
router.post("/booth-agent", isAuthenticated, async (req, res) => {
  try {
    const {
      username,
      password,
      fullName,
      phoneNumber,
      booth_id,
      aci_id,
      aci_name
    } = req.body;

    // Validate required fields
    if (!username || !password || !fullName || !phoneNumber || !booth_id || !aci_id) {
      return sendBadRequest(res, "All fields are required (username, password, fullName, phoneNumber, booth_id, aci_id)");
    }

    const normalizedPhone = normalizePhone(phoneNumber);
    const aciIdNum = typeof aci_id === 'number' ? aci_id : parseInt(aci_id);

    // Check creation privileges
    if (req.user.role === "L0") {
      // L0 can create anyone
    } else if (req.user.role === "L1" || req.user.role === "L2") {
      const userAC = typeof req.user.assignedAC === 'number' ? req.user.assignedAC : parseInt(req.user.assignedAC);
      if (aciIdNum !== userAC) {
        return sendForbidden(res, `You can only create booth agents in your assigned AC (${userAC})`);
      }
    } else {
      return sendForbidden(res, "You don't have permission to create booth agents");
    }

    // Normalize booth_id format
    let boothIdentifier = booth_id;
    if (booth_id.startsWith('voter-booth-')) {
      const parts = booth_id.split('-');
      if (parts.length >= 4) {
        const acIdFromId = parseInt(parts[2]);
        const boothNumberFromId = parseInt(parts[3]);
        boothIdentifier = `ac${acIdFromId}${String(boothNumberFromId).padStart(3, '0')}`;
      }
    }

    // Validate booth AC matches the requested AC
    if (boothIdentifier.startsWith('ac')) {
      const boothAC = parseInt(boothIdentifier.substring(2, 5));
      if (boothAC !== aciIdNum) {
        return sendBadRequest(res, "Booth does not belong to the specified AC");
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: username.toLowerCase() },
        { phone: normalizedPhone },
        { phone: phoneNumber },
      ],
      isActive: true,
    });

    if (existingUser) {
      return sendConflict(res, "User with this username or phone number already exists");
    }

    // Generate booth_agent_id
    const existingAgentsCount = await User.countDocuments({
      booth_id: boothIdentifier,
      role: { $in: ["Booth Agent", "BoothAgent"] },
      isActive: true
    });

    let sequence = existingAgentsCount + 1;
    let booth_agent_id = `${boothIdentifier}-${sequence}`;

    let existingAgentId = await User.findOne({ booth_agent_id });
    while (existingAgentId) {
      sequence++;
      booth_agent_id = `${boothIdentifier}-${sequence}`;
      existingAgentId = await User.findOne({ booth_agent_id });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = new User({
      email: username.toLowerCase(),
      name: fullName.trim(),
      phone: normalizedPhone,
      passwordHash,
      password: passwordHash,
      role: "Booth Agent",
      assignedAC: aciIdNum,
      aci_id: aciIdNum,
      aci_name: aci_name || `AC ${aciIdNum}`,
      booth_id: boothIdentifier,
      booth_agent_id,
      status: "Active",
      createdBy: req.user._id,
      isActive: true,
      emailVerified: false,
      loginAttempts: 0,
    });

    await newUser.save();

    const userResponse = await User.findById(newUser._id)
      .select("-password -passwordHash")
      .populate("createdBy", "name role");

    invalidateCache('users:');
    invalidateCache('booth-agents:');

    sendCreated(res, {
      user: userResponse,
      booth_agent_id: newUser.booth_agent_id,
    }, "Booth agent created successfully");
  } catch (error) {
    console.error("Error creating booth agent:", error);
    sendServerError(res, "Failed to create booth agent", error);
  }
});

/**
 * PUT /api/rbac/users/:userId
 * Update an existing user
 * Access: L0, L1 (for users they created)
 */
router.put("/:userId", isAuthenticated, async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, fullName, email, phone, phoneNumber, password, role, assignedAC, aci_name, assignedBoothId, booth_id, status, isActive } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return sendNotFound(res, "User not found");
    }

    // Check update permissions
    if (req.user.role !== "L0") {
      if (req.user.role === "L1") {
        if (user.role === "L0") {
          return sendForbidden(res, "ACIM cannot update System Admin users");
        }
      } else if (req.user.role === "L2") {
        if (user.role !== "Booth Agent" && user.role !== "BoothAgent") {
          return sendForbidden(res, "ACI can only update booth agents");
        }
        if (user.assignedAC !== req.user.assignedAC) {
          return sendForbidden(res, "You can only update booth agents in your assigned AC");
        }
      } else {
        return sendForbidden(res, "You don't have permission to update users");
      }
    }

    // Update fields
    if (name || fullName) user.name = name || fullName;
    if (email) user.email = email;
    if (phone || phoneNumber) user.phone = phone || phoneNumber;
    if (role && req.user.role === "L0") user.role = role;
    if (assignedAC !== undefined) user.assignedAC = assignedAC;
    if (aci_name) user.aci_name = aci_name;
    if (status) user.status = status;
    if (isActive !== undefined && req.user.role === "L0") user.isActive = isActive;

    // Handle booth assignment update for booth agents
    // SIMPLIFIED: No longer uses Booth collection, just stores booth_id string
    const newBoothId = booth_id || assignedBoothId;
    if (newBoothId !== undefined && (user.role === "Booth Agent" || user.role === "BoothAgent")) {
      let boothIdentifier = newBoothId;

      // Normalize booth_id format
      if (newBoothId && newBoothId.startsWith('voter-booth-')) {
        const parts = newBoothId.split('-');
        if (parts.length >= 4) {
          const acIdFromId = parseInt(parts[2]);
          const boothNumberFromId = parseInt(parts[3]);
          boothIdentifier = `ac${acIdFromId}${String(boothNumberFromId).padStart(3, '0')}`;
        }
      }

      user.booth_id = boothIdentifier || undefined;
      user.assignedBoothId = undefined; // Clear legacy field
    }

    // Update password if provided
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user.passwordHash = hashedPassword;
      user.password = hashedPassword;
    }

    await user.save();

    const userResponse = await User.findById(user._id)
      .select("-password -passwordHash")
      .populate("createdBy", "name role");

    invalidateCache('users:');
    invalidateCache('booth-agents:');

    sendSuccess(res, { user: userResponse }, "User updated successfully");
  } catch (error) {
    console.error("Error updating user:", error);
    sendServerError(res, "Failed to update user", error);
  }
});

/**
 * DELETE /api/rbac/users/:userId
 * Permanently delete a user from the database
 * Access: L0 (all users), L1 (users they created), L2 (booth agents in their AC)
 */
router.delete("/:userId", isAuthenticated, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!["L0", "L1", "L2"].includes(req.user.role)) {
      return sendForbidden(res, "You don't have permission to delete users");
    }

    const user = await User.findById(userId);
    if (!user) {
      return sendNotFound(res, "User not found");
    }

    if (req.user.role === "L2") {
      if (user.role !== "BoothAgent" && user.role !== "Booth Agent") {
        return sendForbidden(res, "You can only delete booth agents");
      }
      if (user.assignedAC !== req.user.assignedAC) {
        return sendForbidden(res, "You can only delete booth agents in your assigned AC");
      }
    }

    if (req.user.role === "L1") {
      if (user.role === "L0") {
        return sendForbidden(res, "ACIM cannot delete System Admin users");
      }
    }

    // No longer need to sync with Booth collection - booth info is only in user document
    await User.findByIdAndDelete(userId);

    invalidateCache('users:');
    invalidateCache('booth-agents:');

    sendSuccess(res, null, "User deleted successfully");
  } catch (error) {
    console.error("Error deleting user:", error);
    sendServerError(res, "Failed to delete user", error);
  }
});

export default router;
