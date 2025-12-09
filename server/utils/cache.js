/**
 * Simple in-memory cache utility for frequently accessed data.
 *
 * Ideal for:
 * - Dashboard statistics (5 min TTL)
 * - Booth lists (15 min TTL)
 * - Survey forms (10 min TTL)
 * - AC metadata (1 hour TTL)
 *
 * For production with multiple server instances, consider Redis instead.
 */

// Internal cache store
const cache = new Map();

// Default TTL values in milliseconds
export const TTL = {
  DASHBOARD_STATS: 5 * 60 * 1000,      // 5 minutes
  BOOTH_LIST: 15 * 60 * 1000,          // 15 minutes
  SURVEY_FORMS: 10 * 60 * 1000,        // 10 minutes
  AC_METADATA: 60 * 60 * 1000,         // 1 hour
  SHORT: 60 * 1000,                     // 1 minute
  MEDIUM: 5 * 60 * 1000,               // 5 minutes
  LONG: 30 * 60 * 1000,                // 30 minutes
};

/**
 * Get cached data if not expired
 * @param {string} key - Cache key
 * @param {number} ttlMs - Time to live in milliseconds (default: 5 minutes)
 * @returns {any|null} - Cached data or null if expired/missing
 */
export function getCache(key, ttlMs = TTL.MEDIUM) {
  const item = cache.get(key);

  if (!item) {
    return null;
  }

  if (Date.now() - item.timestamp > ttlMs) {
    // Expired - remove from cache
    cache.delete(key);
    return null;
  }

  return item.data;
}

/**
 * Set data in cache
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttlMs - Time to live in milliseconds (optional, used for cleanup)
 */
export function setCache(key, data, ttlMs = TTL.MEDIUM) {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMs
  });

  // Schedule cleanup if cache gets too large
  if (cache.size > 1000) {
    cleanupExpiredEntries();
  }
}

/**
 * Check if a key exists in cache and is not expired
 * @param {string} key - Cache key
 * @param {number} ttlMs - Time to live in milliseconds
 * @returns {boolean}
 */
export function hasCache(key, ttlMs = TTL.MEDIUM) {
  return getCache(key, ttlMs) !== null;
}

/**
 * Delete a specific cache entry
 * @param {string} key - Cache key
 */
export function deleteCache(key) {
  cache.delete(key);
}

/**
 * Invalidate all cache entries matching a pattern
 * @param {string} pattern - Pattern to match (uses includes())
 */
export function invalidateCache(pattern) {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

/**
 * Invalidate all cache entries for a specific AC
 * @param {number} acId - AC ID
 */
export function invalidateACCache(acId) {
  invalidateCache(`ac:${acId}`);
}

/**
 * Clear all cached data
 */
export function clearCache() {
  cache.clear();
}

/**
 * Get cache statistics
 * @returns {Object} Cache statistics
 */
export function getCacheStats() {
  const now = Date.now();
  let validCount = 0;
  let expiredCount = 0;

  for (const [key, item] of cache.entries()) {
    if (now - item.timestamp <= item.ttl) {
      validCount++;
    } else {
      expiredCount++;
    }
  }

  return {
    total: cache.size,
    valid: validCount,
    expired: expiredCount
  };
}

/**
 * Remove expired entries from cache
 */
export function cleanupExpiredEntries() {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, item] of cache.entries()) {
    if (now - item.timestamp > item.ttl) {
      cache.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[Cache] Cleaned up ${cleaned} expired entries`);
  }

  return cleaned;
}

/**
 * Cache key builders for consistent key naming
 */
export const cacheKeys = {
  dashboardStats: (acId) => `ac:${acId}:dashboard:stats`,
  boothList: (acId) => `ac:${acId}:booths`,
  surveyForms: () => 'surveys:active',
  surveyForm: (surveyId) => `survey:${surveyId}`,
  acMetadata: (acId) => `ac:${acId}:metadata`,
  voterCount: (acId) => `ac:${acId}:voter:count`,
  surveyedCount: (acId) => `ac:${acId}:surveyed:count`,
  familyCount: (acId) => `ac:${acId}:family:count`,
};

/**
 * Decorator function for caching async functions
 * @param {Function} fn - Async function to cache
 * @param {Function} keyBuilder - Function that builds cache key from args
 * @param {number} ttlMs - Time to live in milliseconds
 * @returns {Function} Cached version of the function
 *
 * @example
 * const cachedGetStats = cached(
 *   getDashboardStats,
 *   (acId) => cacheKeys.dashboardStats(acId),
 *   TTL.DASHBOARD_STATS
 * );
 */
export function cached(fn, keyBuilder, ttlMs = TTL.MEDIUM) {
  return async (...args) => {
    const key = keyBuilder(...args);
    const cachedResult = getCache(key, ttlMs);

    if (cachedResult !== null) {
      return cachedResult;
    }

    const result = await fn(...args);
    setCache(key, result, ttlMs);
    return result;
  };
}

// Auto-cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

export default {
  getCache,
  setCache,
  hasCache,
  deleteCache,
  invalidateCache,
  invalidateACCache,
  clearCache,
  getCacheStats,
  cleanupExpiredEntries,
  cacheKeys,
  cached,
  TTL,
};
