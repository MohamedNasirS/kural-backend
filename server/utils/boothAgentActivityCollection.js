/**
 * Utility for accessing sharded booth agent activity collections.
 *
 * The database has been restructured to shard booth agent activity data by Assembly Constituency (AC).
 * Instead of a single `boothagentactivities` collection, activities are now stored in `boothagentactivities_{AC_ID}` collections.
 *
 * Example:
 *   - boothagentactivities_111 (AC 111 booth agent activities)
 *   - boothagentactivities_119 (AC 119 booth agent activities)
 */

import mongoose from 'mongoose';
import { ALL_AC_IDS } from './voterCollection.js';

// Booth Agent Activity schema - matches the actual database structure
// Booth fields aligned with voters collection: booth_id, boothname, boothno
const boothAgentActivitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: String,
  userPhone: String,
  // Booth fields - aligned with voters collection structure
  booth_id: String,      // e.g., "BOOTH1-111" - unique booth identifier
  boothname: String,     // Full booth name/address
  boothno: String,       // e.g., "BOOTH1" - booth number
  // AC fields
  aci_id: mongoose.Schema.Types.Mixed, // Can be string or number (e.g., 111)
  aci_name: String,      // Assembly Constituency name (e.g., "METTUPALAYAM")
  // Activity fields
  loginTime: Date,
  logoutTime: Date,
  timeSpentMinutes: Number,
  status: {
    type: String,
    enum: ['active', 'timeout', 'logout', 'inactive'],
    default: 'active'
  },
  activityType: {
    type: String,
    enum: ['login', 'logout', 'auto-logout', 'timeout', 'session'],
    default: 'login'
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: [Number] // [longitude, latitude]
  },
  ipAddress: String,
  sessionId: String
}, {
  timestamps: true,
  strict: false // Allow dynamic fields
});

// Add 2dsphere index for geospatial queries
boothAgentActivitySchema.index({ location: '2dsphere' });

// Cache for compiled models to avoid recompilation
const modelCache = {};

/**
 * Get BoothAgentActivity model for a specific AC
 * @param {number|string} acId - Assembly Constituency ID
 * @returns {mongoose.Model} Mongoose model for the AC's booth agent activity collection
 */
export function getBoothAgentActivityModel(acId) {
  const numericAcId = Number(acId);

  if (!numericAcId || isNaN(numericAcId)) {
    throw new Error(`Invalid AC ID: ${acId}`);
  }

  const collectionName = `boothagentactivities_${numericAcId}`;

  // Return from cache if available
  if (modelCache[collectionName]) {
    return modelCache[collectionName];
  }

  // Check if model already exists in mongoose
  if (mongoose.models[collectionName]) {
    modelCache[collectionName] = mongoose.models[collectionName];
    return modelCache[collectionName];
  }

  // Create new model for this collection
  const model = mongoose.model(collectionName, boothAgentActivitySchema, collectionName);
  modelCache[collectionName] = model;
  return model;
}

/**
 * Query booth agent activities from a specific AC collection
 * @param {number|string} acId - AC ID
 * @param {Object} query - MongoDB query object
 * @param {Object} options - Query options (limit, skip, sort, select)
 * @returns {Promise<Array>} Array of booth agent activities
 */
export async function queryBoothAgentActivities(acId, query = {}, options = {}) {
  const BoothAgentActivityModel = getBoothAgentActivityModel(acId);
  let queryBuilder = BoothAgentActivityModel.find(query);

  if (options.select) queryBuilder = queryBuilder.select(options.select);
  if (options.sort) queryBuilder = queryBuilder.sort(options.sort);
  if (options.skip) queryBuilder = queryBuilder.skip(options.skip);
  if (options.limit) queryBuilder = queryBuilder.limit(options.limit);

  return queryBuilder.lean();
}

/**
 * Count booth agent activities in a specific AC collection
 * @param {number|string} acId - AC ID
 * @param {Object} query - MongoDB query object
 * @returns {Promise<number>} Count
 */
export async function countBoothAgentActivities(acId, query = {}) {
  const BoothAgentActivityModel = getBoothAgentActivityModel(acId);
  return BoothAgentActivityModel.countDocuments(query);
}

/**
 * Aggregate booth agent activities in a specific AC collection
 * @param {number|string} acId - AC ID
 * @param {Array} pipeline - Aggregation pipeline
 * @returns {Promise<Array>} Aggregation results
 */
export async function aggregateBoothAgentActivities(acId, pipeline) {
  const BoothAgentActivityModel = getBoothAgentActivityModel(acId);
  return BoothAgentActivityModel.aggregate(pipeline);
}

/**
 * Query booth agent activities across ALL AC collections (for L0 cross-AC queries)
 * @param {Object} query - MongoDB query object
 * @param {Object} options - Query options (limit, skip, sort, select)
 * @returns {Promise<Array>} Combined results from all collections
 */
export async function queryAllBoothAgentActivities(query = {}, options = {}) {
  const results = [];

  for (const acId of ALL_AC_IDS) {
    try {
      const activities = await queryBoothAgentActivities(acId, query, options);
      results.push(...activities.map(a => ({ ...a, _acId: acId })));
    } catch (err) {
      console.error(`Error querying boothagentactivities_${acId}:`, err.message);
    }
  }

  // Sort combined results if sort option provided
  if (options.sort && results.length > 0) {
    const sortKey = Object.keys(options.sort)[0];
    const sortOrder = options.sort[sortKey];
    results.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (sortOrder === -1) return bVal > aVal ? 1 : -1;
      return aVal > bVal ? 1 : -1;
    });
  }

  // Apply global limit if specified
  if (options.limit && results.length > options.limit) {
    return results.slice(0, options.limit);
  }

  return results;
}

/**
 * Count booth agent activities across ALL AC collections (for L0 cross-AC queries)
 * @param {Object} query - MongoDB query object
 * @returns {Promise<number>} Total count
 */
export async function countAllBoothAgentActivities(query = {}) {
  let total = 0;

  for (const acId of ALL_AC_IDS) {
    try {
      const count = await countBoothAgentActivities(acId, query);
      total += count;
    } catch (err) {
      console.error(`Error counting boothagentactivities_${acId}:`, err.message);
    }
  }

  return total;
}

/**
 * Find one booth agent activity by ID across all AC collections
 * @param {string} activityId - Activity document ID
 * @returns {Promise<Object|null>} Booth agent activity or null
 */
export async function findBoothAgentActivityById(activityId) {
  for (const acId of ALL_AC_IDS) {
    try {
      const BoothAgentActivityModel = getBoothAgentActivityModel(acId);
      const activity = await BoothAgentActivityModel.findById(activityId).lean();
      if (activity) {
        return { activity, acId };
      }
    } catch (err) {
      // Continue to next collection
    }
  }
  return null;
}

/**
 * Create a new booth agent activity in the appropriate AC collection
 * @param {number|string} acId - AC ID
 * @param {Object} data - Booth agent activity data
 * @returns {Promise<Object>} Created booth agent activity
 */
export async function createBoothAgentActivity(acId, data) {
  const BoothAgentActivityModel = getBoothAgentActivityModel(acId);
  const activity = new BoothAgentActivityModel(data);
  return activity.save();
}

/**
 * Update a booth agent activity by ID
 * @param {number|string} acId - AC ID
 * @param {string} activityId - Activity document ID
 * @param {Object} update - Update object
 * @param {Object} options - Mongoose options
 * @returns {Promise<Object|null>} Updated booth agent activity or null
 */
export async function updateBoothAgentActivity(acId, activityId, update, options = {}) {
  const BoothAgentActivityModel = getBoothAgentActivityModel(acId);
  return BoothAgentActivityModel.findByIdAndUpdate(activityId, update, { new: true, ...options }).lean();
}

/**
 * Get active sessions for a specific AC
 * @param {number|string} acId - AC ID
 * @returns {Promise<Array>} Active sessions
 */
export async function getActiveSessions(acId) {
  return queryBoothAgentActivities(acId, { status: 'active' }, { sort: { loginTime: -1 } });
}

/**
 * Get today's activities for a specific AC
 * @param {number|string} acId - AC ID
 * @returns {Promise<Array>} Today's activities
 */
export async function getTodayActivities(acId) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return queryBoothAgentActivities(acId, {
    loginTime: { $gte: startOfDay }
  }, { sort: { loginTime: -1 } });
}

/**
 * Get activity summary for a specific AC
 * @param {number|string} acId - AC ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Object>} Activity summary
 */
export async function getActivitySummary(acId, startDate, endDate) {
  const pipeline = [
    {
      $match: {
        loginTime: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$userId',
        userName: { $first: '$userName' },
        totalSessions: { $sum: 1 },
        totalTimeMinutes: { $sum: '$timeSpentMinutes' },
        avgTimePerSession: { $avg: '$timeSpentMinutes' },
        firstLogin: { $min: '$loginTime' },
        lastLogin: { $max: '$loginTime' }
      }
    },
    { $sort: { totalTimeMinutes: -1 } }
  ];

  return aggregateBoothAgentActivities(acId, pipeline);
}

/**
 * Aggregate across ALL AC collections (for L0 cross-AC aggregations)
 * @param {Array} pipeline - Aggregation pipeline
 * @returns {Promise<Array>} Combined aggregation results
 */
export async function aggregateAllBoothAgentActivities(pipeline) {
  const results = [];

  for (const acId of ALL_AC_IDS) {
    try {
      const BoothAgentActivityModel = getBoothAgentActivityModel(acId);
      const partialResults = await BoothAgentActivityModel.aggregate(pipeline);
      results.push(...partialResults.map(r => ({ ...r, _acId: acId })));
    } catch (err) {
      console.error(`Error aggregating boothagentactivities_${acId}:`, err.message);
    }
  }

  return results;
}

/**
 * End an active session (set logout time and calculate time spent)
 * @param {number|string} acId - AC ID
 * @param {string} activityId - Activity document ID
 * @param {string} logoutType - Type of logout (logout, auto-logout, timeout)
 * @returns {Promise<Object|null>} Updated activity or null
 */
export async function endSession(acId, activityId, logoutType = 'logout') {
  const BoothAgentActivityModel = getBoothAgentActivityModel(acId);
  const activity = await BoothAgentActivityModel.findById(activityId);

  if (!activity) return null;

  const logoutTime = new Date();
  const loginTime = new Date(activity.loginTime);
  const timeSpentMinutes = Math.round((logoutTime - loginTime) / (1000 * 60));

  return BoothAgentActivityModel.findByIdAndUpdate(
    activityId,
    {
      logoutTime,
      timeSpentMinutes,
      status: logoutType === 'timeout' ? 'timeout' : 'logout',
      activityType: logoutType
    },
    { new: true }
  ).lean();
}

export default {
  getBoothAgentActivityModel,
  queryBoothAgentActivities,
  countBoothAgentActivities,
  aggregateBoothAgentActivities,
  queryAllBoothAgentActivities,
  countAllBoothAgentActivities,
  findBoothAgentActivityById,
  createBoothAgentActivity,
  updateBoothAgentActivity,
  getActiveSessions,
  getTodayActivities,
  getActivitySummary,
  aggregateAllBoothAgentActivities,
  endSession,
  ALL_AC_IDS
};
