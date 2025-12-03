/**
 * Utility for accessing sharded voter collections.
 *
 * The database has been restructured to shard voter data by Assembly Constituency (AC).
 * Instead of a single `voters` collection, voters are now stored in `voters_{AC_ID}` collections.
 *
 * Example:
 *   - voters_111 (AC 111 voters)
 *   - voters_119 (AC 119 voters)
 */

import mongoose from 'mongoose';

// Voter schema - matches the actual database structure
const voterSchema = new mongoose.Schema({
  name: {
    english: String,
    tamil: String
  },
  voterID: String,
  address: String,
  DOB: Date,
  fathername: String,
  doornumber: mongoose.Schema.Types.Mixed, // Can be string or number
  fatherless: Boolean,
  guardian: String,
  age: Number,
  gender: String,
  mobile: mongoose.Schema.Types.Mixed, // Can be string or number
  emailid: String,
  aadhar: String,
  pan: String,
  religion: String,
  caste: String,
  subcaste: String,
  booth_id: String,
  booth_agent_id: String,
  boothname: String,
  boothno: Number,
  status: String,
  verified: Boolean,
  verifiedAt: Date,
  surveyed: {
    type: Boolean,
    default: false
  },
  surveyedAt: Date,
  aci_id: Number,
  aci_name: String,
  familyId: String,
  bloodgroup: String,
  annual_income: String,
  additionalDetailsSubmitted: Boolean,
  additionalDetailsSubmittedAt: String
}, {
  timestamps: true,
  strict: false // Allow dynamic fields
});

// Cache for compiled models to avoid recompilation
const modelCache = {};

/**
 * All valid AC IDs that have voter collections
 */
export const ALL_AC_IDS = [101, 102, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126];

/**
 * Get Voter model for a specific AC
 * @param {number|string} acId - Assembly Constituency ID
 * @returns {mongoose.Model} Mongoose model for the AC's voter collection
 */
export function getVoterModel(acId) {
  const numericAcId = Number(acId);

  if (!numericAcId || isNaN(numericAcId)) {
    throw new Error(`Invalid AC ID: ${acId}`);
  }

  const collectionName = `voters_${numericAcId}`;

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
  const model = mongoose.model(collectionName, voterSchema, collectionName);
  modelCache[collectionName] = model;
  return model;
}

/**
 * Get all AC IDs that have voter collections
 * @returns {number[]} Array of AC IDs
 */
export function getAllACIds() {
  return [...ALL_AC_IDS];
}

/**
 * Check if an AC ID is valid
 * @param {number|string} acId - AC ID to check
 * @returns {boolean} True if valid
 */
export function isValidACId(acId) {
  const numericAcId = Number(acId);
  return ALL_AC_IDS.includes(numericAcId);
}

/**
 * Find a voter by ID across all AC collections
 * @param {string} voterId - Voter document ID
 * @returns {Promise<Object|null>} Voter document or null
 */
export async function findVoterById(voterId) {
  for (const acId of ALL_AC_IDS) {
    try {
      const VoterModel = getVoterModel(acId);
      const voter = await VoterModel.findById(voterId).lean();
      if (voter) {
        return { voter, acId };
      }
    } catch (err) {
      // Continue to next collection
    }
  }
  return null;
}

/**
 * Find a voter by ID and update across all AC collections
 * @param {string} voterId - Voter document ID
 * @param {Object} update - Update object
 * @param {Object} options - Mongoose options
 * @returns {Promise<Object|null>} Updated voter document or null
 */
export async function findVoterByIdAndUpdate(voterId, update, options = {}) {
  for (const acId of ALL_AC_IDS) {
    try {
      const VoterModel = getVoterModel(acId);
      const voter = await VoterModel.findByIdAndUpdate(voterId, update, { new: true, ...options }).lean();
      if (voter) {
        return { voter, acId };
      }
    } catch (err) {
      // Continue to next collection
    }
  }
  return null;
}

/**
 * Query voters from a specific AC collection
 * @param {number|string} acId - AC ID
 * @param {Object} query - MongoDB query object
 * @param {Object} options - Query options (limit, skip, sort, select)
 * @returns {Promise<Array>} Array of voters
 */
export async function queryVoters(acId, query = {}, options = {}) {
  const VoterModel = getVoterModel(acId);
  let queryBuilder = VoterModel.find(query);

  if (options.select) queryBuilder = queryBuilder.select(options.select);
  if (options.sort) queryBuilder = queryBuilder.sort(options.sort);
  if (options.skip) queryBuilder = queryBuilder.skip(options.skip);
  if (options.limit) queryBuilder = queryBuilder.limit(options.limit);

  return queryBuilder.lean();
}

/**
 * Count voters in a specific AC collection
 * @param {number|string} acId - AC ID
 * @param {Object} query - MongoDB query object
 * @returns {Promise<number>} Count
 */
export async function countVoters(acId, query = {}) {
  const VoterModel = getVoterModel(acId);
  return VoterModel.countDocuments(query);
}

/**
 * Aggregate voters in a specific AC collection
 * @param {number|string} acId - AC ID
 * @param {Array} pipeline - Aggregation pipeline
 * @returns {Promise<Array>} Aggregation results
 */
export async function aggregateVoters(acId, pipeline) {
  const VoterModel = getVoterModel(acId);
  return VoterModel.aggregate(pipeline);
}

/**
 * Query voters across ALL AC collections (for L0 cross-AC queries)
 * @param {Object} query - MongoDB query object
 * @param {Object} options - Query options (limit, skip, sort, select)
 * @returns {Promise<Array>} Combined results from all collections
 */
export async function queryAllVoters(query = {}, options = {}) {
  const results = [];

  for (const acId of ALL_AC_IDS) {
    try {
      const voters = await queryVoters(acId, query, options);
      results.push(...voters);
    } catch (err) {
      console.error(`Error querying voters_${acId}:`, err.message);
    }
  }

  // Apply global limit if specified
  if (options.limit && results.length > options.limit) {
    return results.slice(0, options.limit);
  }

  return results;
}

/**
 * Count voters across ALL AC collections (for L0 cross-AC queries)
 * @param {Object} query - MongoDB query object
 * @returns {Promise<number>} Total count
 */
export async function countAllVoters(query = {}) {
  let total = 0;

  for (const acId of ALL_AC_IDS) {
    try {
      const count = await countVoters(acId, query);
      total += count;
    } catch (err) {
      console.error(`Error counting voters_${acId}:`, err.message);
    }
  }

  return total;
}

/**
 * Find one voter across ALL AC collections
 * @param {Object} query - MongoDB query object
 * @returns {Promise<Object|null>} Voter document or null
 */
export async function findOneVoter(query = {}) {
  for (const acId of ALL_AC_IDS) {
    try {
      const VoterModel = getVoterModel(acId);
      const voter = await VoterModel.findOne(query).lean();
      if (voter) {
        return { voter, acId };
      }
    } catch (err) {
      // Continue to next collection
    }
  }
  return null;
}

/**
 * Aggregate across ALL AC collections (for L0 cross-AC aggregations)
 * Note: Results are combined, not merged. Use with caution for complex aggregations.
 * @param {Array} pipeline - Aggregation pipeline
 * @returns {Promise<Array>} Combined aggregation results
 */
export async function aggregateAllVoters(pipeline) {
  const results = [];

  for (const acId of ALL_AC_IDS) {
    try {
      const VoterModel = getVoterModel(acId);
      const partialResults = await VoterModel.aggregate(pipeline);
      results.push(...partialResults);
    } catch (err) {
      console.error(`Error aggregating voters_${acId}:`, err.message);
    }
  }

  return results;
}

export default {
  getVoterModel,
  getAllACIds,
  isValidACId,
  findVoterById,
  findVoterByIdAndUpdate,
  queryVoters,
  countVoters,
  aggregateVoters,
  queryAllVoters,
  countAllVoters,
  findOneVoter,
  aggregateAllVoters,
  ALL_AC_IDS
};
