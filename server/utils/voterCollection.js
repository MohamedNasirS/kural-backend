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

// Add indexes for common query patterns
voterSchema.index({ aci_id: 1 });
voterSchema.index({ aci_id: 1, booth_id: 1 });
voterSchema.index({ booth_id: 1 });
voterSchema.index({ voterID: 1 });
voterSchema.index({ surveyed: 1 });
voterSchema.index({ aci_id: 1, surveyed: 1 });
voterSchema.index({ familyId: 1 }, { sparse: true });
voterSchema.index({ mobile: 1 }, { sparse: true });
voterSchema.index({ boothno: 1, 'name.english': 1 }); // Sort index for voter listing
voterSchema.index({ familyId: 1, relationToHead: 1 }, { sparse: true }); // Family details

// REPORT OPTIMIZATION INDEXES
// Booth performance reports - grouping by boothname
voterSchema.index({ boothname: 1 });
// Demographics - age distribution queries
voterSchema.index({ age: 1 });
// Demographics - gender distribution queries
voterSchema.index({ gender: 1 });
// Booth performance - verified voters count
voterSchema.index({ verified: 1 });
// Compound: booth + gender for booth-filtered gender reports
voterSchema.index({ boothname: 1, gender: 1 });
// Compound: booth + age for booth-filtered age reports
voterSchema.index({ boothname: 1, age: 1 });
// Compound: booth + familyId for unique family counts per booth
voterSchema.index({ boothname: 1, familyId: 1 });
// Compound: booth + surveyed for booth-filtered survey status
voterSchema.index({ boothname: 1, surveyed: 1 });

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
 * Uses parallel queries for better performance (ISS-002 fix)
 * @param {string} voterId - Voter document ID
 * @returns {Promise<Object|null>} Voter document or null
 */
export async function findVoterById(voterId) {
  // Parallel search across all ACs for better performance
  const searchPromises = ALL_AC_IDS.map(async (acId) => {
    try {
      const VoterModel = getVoterModel(acId);
      const voter = await VoterModel.findById(voterId).lean();
      return voter ? { voter, acId } : null;
    } catch (err) {
      // Collection may not exist or other error - continue
      return null;
    }
  });

  const results = await Promise.all(searchPromises);
  return results.find(r => r !== null) || null;
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
 * Uses parallel queries with per-AC limits for memory efficiency (ISS-001 fix)
 * @param {Object} query - MongoDB query object
 * @param {Object} options - Query options (limit, skip, sort, select, throwOnError)
 * @returns {Promise<Array>} Combined results from all collections
 */
export async function queryAllVoters(query = {}, options = {}) {
  const { throwOnError = false, ...queryOptions } = options;

  // Calculate per-AC limit to prevent OOM (ISS-001 fix)
  // Use 2x buffer per AC to account for uneven distribution
  const perAcLimit = queryOptions.limit
    ? Math.ceil(queryOptions.limit / ALL_AC_IDS.length) * 2
    : undefined;

  const perAcOptions = perAcLimit
    ? { ...queryOptions, limit: perAcLimit }
    : queryOptions;

  // Track errors for optional error propagation (ISS-019 fix)
  const errors = [];

  // Run queries in parallel for better performance
  const queryPromises = ALL_AC_IDS.map(acId =>
    queryVoters(acId, query, perAcOptions)
      .catch(err => {
        const errorInfo = { acId, message: err.message };
        errors.push(errorInfo);
        console.error(`Error querying voters_${acId}:`, err.message);
        return [];
      })
  );

  const resultsArrays = await Promise.all(queryPromises);

  // Throw aggregated error if requested and errors occurred
  if (throwOnError && errors.length > 0) {
    const errorMsg = `Errors querying ${errors.length} AC collections: ${errors.map(e => `AC${e.acId}: ${e.message}`).join(', ')}`;
    throw new Error(errorMsg);
  }

  let results = resultsArrays.flat();

  // Apply sorting if specified (needed after combining results)
  if (queryOptions.sort && results.length > 0) {
    const sortKey = Object.keys(queryOptions.sort)[0];
    const sortOrder = queryOptions.sort[sortKey];
    results.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (sortOrder === -1) return bVal > aVal ? 1 : -1;
      return aVal > bVal ? 1 : -1;
    });
  }

  // Apply global limit after sorting (final limit enforcement)
  if (queryOptions.limit && results.length > queryOptions.limit) {
    return results.slice(0, queryOptions.limit);
  }

  return results;
}

/**
 * Count voters across ALL AC collections (for L0 cross-AC queries)
 * Uses parallel queries for better performance
 * @param {Object} query - MongoDB query object
 * @param {Object} options - Options (throwOnError)
 * @returns {Promise<number>} Total count
 */
export async function countAllVoters(query = {}, options = {}) {
  const { throwOnError = false } = options;
  const errors = [];

  // Run count queries in parallel for better performance
  const countPromises = ALL_AC_IDS.map(acId =>
    countVoters(acId, query)
      .catch(err => {
        const errorInfo = { acId, message: err.message };
        errors.push(errorInfo);
        console.error(`Error counting voters_${acId}:`, err.message);
        return 0;
      })
  );

  const counts = await Promise.all(countPromises);

  // Throw aggregated error if requested and errors occurred (ISS-019 fix)
  if (throwOnError && errors.length > 0) {
    const errorMsg = `Errors counting ${errors.length} AC collections: ${errors.map(e => `AC${e.acId}: ${e.message}`).join(', ')}`;
    throw new Error(errorMsg);
  }

  return counts.reduce((sum, count) => sum + count, 0);
}

/**
 * Find one voter across ALL AC collections
 * Uses parallel queries for better performance (ISS-016 fix)
 * @param {Object} query - MongoDB query object
 * @returns {Promise<Object|null>} Voter document or null
 */
export async function findOneVoter(query = {}) {
  // Parallel search across all ACs for better performance
  const searchPromises = ALL_AC_IDS.map(async (acId) => {
    try {
      const VoterModel = getVoterModel(acId);
      const voter = await VoterModel.findOne(query).lean();
      return voter ? { voter, acId } : null;
    } catch (err) {
      // Collection may not exist or other error - continue
      return null;
    }
  });

  const results = await Promise.all(searchPromises);
  return results.find(r => r !== null) || null;
}

/**
 * Aggregate across ALL AC collections (for L0 cross-AC aggregations)
 * Uses parallel queries for better performance
 * Note: Results are combined, not merged. Use with caution for complex aggregations.
 * @param {Array} pipeline - Aggregation pipeline
 * @param {Object} options - Options (throwOnError)
 * @returns {Promise<Array>} Combined aggregation results
 */
export async function aggregateAllVoters(pipeline, options = {}) {
  const { throwOnError = false } = options;
  const errors = [];

  // Run aggregations in parallel for better performance
  const aggregatePromises = ALL_AC_IDS.map(acId => {
    const VoterModel = getVoterModel(acId);
    return VoterModel.aggregate(pipeline)
      .catch(err => {
        const errorInfo = { acId, message: err.message };
        errors.push(errorInfo);
        console.error(`Error aggregating voters_${acId}:`, err.message);
        return [];
      });
  });

  const resultsArrays = await Promise.all(aggregatePromises);

  // Throw aggregated error if requested and errors occurred (ISS-019 fix)
  if (throwOnError && errors.length > 0) {
    const errorMsg = `Errors aggregating ${errors.length} AC collections: ${errors.map(e => `AC${e.acId}: ${e.message}`).join(', ')}`;
    throw new Error(errorMsg);
  }

  return resultsArrays.flat();
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
