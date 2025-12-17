/**
 * Simple in-memory cache utility for frequently accessed data.
 *
 * Data Categories:
 * 1. STATIC - Rarely changes (demographics, booth lists, AC metadata)
 * 2. SEMI_DYNAMIC - Changes occasionally (survey forms, family groupings)
 * 3. DYNAMIC - Changes frequently (survey responses, agent activities)
 *
 * Note: In-memory cache is per-worker. For shared cache across cluster workers,
 * precomputed_stats in MongoDB serves as the shared cache layer.
 *
 * For production with 2,000+ users, consider adding Redis.
 */

// Internal cache store
const cache = new Map();

// Track cache statistics
let cacheHits = 0;
let cacheMisses = 0;

/**
 * TTL values in milliseconds, organized by data volatility
 *
 * Guidelines:
 * - STATIC: Data that rarely changes (voter demographics, AC boundaries)
 * - SEMI_DYNAMIC: Data that changes daily or on user action (survey forms, families)
 * - DYNAMIC: Data that changes frequently (survey responses, live activities)
 */
export const TTL = {
  // ========== STATIC DATA (rarely changes) ==========
  // Safe to cache aggressively - voter demographics, gender counts, booth lists
  AC_METADATA: 60 * 60 * 1000,         // 1 hour - AC names, IDs, boundaries
  VOTER_DEMOGRAPHICS: 60 * 60 * 1000,  // 1 hour - gender/age distribution
  BOOTH_LIST: 30 * 60 * 1000,          // 30 minutes - booth IDs and names
  VOTER_FIELDS: 30 * 60 * 1000,        // 30 minutes - field definitions

  // ========== SEMI-DYNAMIC DATA (changes occasionally) ==========
  // Moderate caching - changes on user updates but not constantly
  SURVEY_FORMS: 10 * 60 * 1000,        // 10 minutes - form definitions
  FAMILY_DATA: 10 * 60 * 1000,         // 10 minutes - family groupings
  DASHBOARD_STATS: 5 * 60 * 1000,      // 5 minutes - precomputed aggregates
  USER_LIST: 5 * 60 * 1000,            // 5 minutes - user/agent lists

  // ========== DYNAMIC DATA (changes frequently) ==========
  // Short or no caching - actively changing data
  SURVEY_RESPONSES: 2 * 60 * 1000,     // 2 minutes - recent submissions
  AGENT_ACTIVITIES: 60 * 1000,         // 1 minute - live booth updates
  LOCATION_DATA: 30 * 1000,            // 30 seconds - real-time location
  VOTER_STATUS: 2 * 60 * 1000,         // 2 minutes - voter survey status

  // ========== GENERIC ALIASES (for backward compatibility) ==========
  SHORT: 60 * 1000,                    // 1 minute
  MEDIUM: 5 * 60 * 1000,               // 5 minutes
  LONG: 30 * 60 * 1000,                // 30 minutes
  VERY_LONG: 60 * 60 * 1000,           // 1 hour
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
    cacheMisses++;
    return null;
  }

  if (Date.now() - item.timestamp > ttlMs) {
    // Expired - remove from cache
    cache.delete(key);
    cacheMisses++;
    return null;
  }

  cacheHits++;
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
 * Get cache statistics including hit/miss ratio
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

  const totalRequests = cacheHits + cacheMisses;
  const hitRate = totalRequests > 0 ? ((cacheHits / totalRequests) * 100).toFixed(2) : 0;

  return {
    total: cache.size,
    valid: validCount,
    expired: expiredCount,
    hits: cacheHits,
    misses: cacheMisses,
    hitRate: `${hitRate}%`
  };
}

/**
 * Reset cache hit/miss counters
 */
export function resetCacheStats() {
  cacheHits = 0;
  cacheMisses = 0;
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

// Log cache stats every 10 minutes (only in production to reduce noise)
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    const stats = getCacheStats();
    if (stats.hits + stats.misses > 0) {
      console.log(`[Cache Stats] Entries: ${stats.valid}/${stats.total} | Hits: ${stats.hits} | Misses: ${stats.misses} | Hit Rate: ${stats.hitRate}`);
      // Reset counters after logging to get fresh stats for next period
      resetCacheStats();
    }
  }, 10 * 60 * 1000);
}

export default {
  getCache,
  setCache,
  hasCache,
  deleteCache,
  invalidateCache,
  invalidateACCache,
  clearCache,
  getCacheStats,
  resetCacheStats,
  cleanupExpiredEntries,
  cacheKeys,
  cached,
  TTL,
};
