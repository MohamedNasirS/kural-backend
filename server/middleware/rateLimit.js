/**
 * Rate Limiting Middleware
 * Provides protection against brute-force attacks on login and other sensitive endpoints
 */

// Simple in-memory rate limiter (for production, use Redis-based solution)
const rateLimitStore = new Map();

/**
 * Clean up expired entries periodically
 */
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

// Prevent the interval from keeping the process alive
if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

/**
 * Create a rate limiter middleware
 * @param {Object} options - Rate limiting options
 * @param {number} options.windowMs - Time window in milliseconds (default: 15 minutes)
 * @param {number} options.max - Maximum requests per window (default: 5)
 * @param {string} options.message - Error message to return
 * @param {Function} options.keyGenerator - Function to generate rate limit key from request
 */
export const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 5,
    message = "Too many requests, please try again later.",
    keyGenerator = (req) => {
      // Use IP address as default key
      return req.ip || req.connection.remoteAddress || "unknown";
    },
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();

    let rateLimitData = rateLimitStore.get(key);

    // Initialize or reset if window has expired
    if (!rateLimitData || now > rateLimitData.resetTime) {
      rateLimitData = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    rateLimitData.count++;
    rateLimitStore.set(key, rateLimitData);

    // Calculate remaining time
    const remainingTime = Math.ceil((rateLimitData.resetTime - now) / 1000);
    const remaining = Math.max(0, max - rateLimitData.count);

    // Set rate limit headers
    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", Math.ceil(rateLimitData.resetTime / 1000));

    if (rateLimitData.count > max) {
      res.setHeader("Retry-After", remainingTime);
      return res.status(429).json({
        success: false,
        message,
        retryAfter: remainingTime,
      });
    }

    next();
  };
};

/**
 * Pre-configured rate limiter for login endpoint
 * Allows 5 attempts per 15 minutes per IP
 */
export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: "Too many login attempts. Please try again in 15 minutes.",
  keyGenerator: (req) => {
    // Use IP + identifier for more specific limiting
    const identifier = req.body?.identifier || "";
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    return `login:${ip}:${identifier}`;
  },
});

/**
 * Pre-configured rate limiter for general API endpoints
 * More lenient than login - 100 requests per minute
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: "Too many requests. Please slow down.",
});

/**
 * ISS-022 fix: Pre-configured rate limiter for write endpoints
 * Prevents abuse of data modification APIs - 30 writes per minute per IP
 */
export const writeRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 write operations
  message: "Too many write operations. Please slow down.",
  keyGenerator: (req) => {
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    const userId = req.session?.user?.id || "anon";
    return `write:${ip}:${userId}`;
  },
});

/**
 * Reset rate limit for a specific key (useful after successful login)
 * @param {string} key - The rate limit key to reset
 */
export const resetRateLimit = (key) => {
  rateLimitStore.delete(key);
};

export default {
  createRateLimiter,
  loginRateLimiter,
  apiRateLimiter,
  writeRateLimiter,
  resetRateLimit,
};
