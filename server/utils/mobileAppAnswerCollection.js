/**
 * Utility for accessing sharded mobile app answer collections.
 *
 * The database has been restructured to shard mobile app answer data by Assembly Constituency (AC).
 * Instead of a single `mobileappanswers` collection, answers are now stored in `mobileappanswers_{AC_ID}` collections.
 *
 * Example:
 *   - mobileappanswers_111 (AC 111 mobile app answers)
 *   - mobileappanswers_119 (AC 119 mobile app answers)
 */

import mongoose from 'mongoose';
import { ALL_AC_IDS } from './voterCollection.js';

// Mobile App Answer schema - matches the actual database structure
// Booth fields aligned with voters collection: booth_id, boothname, boothno
const mobileAppAnswerSchema = new mongoose.Schema({
  voterId: { type: mongoose.Schema.Types.ObjectId },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'MobileAppQuestion' },
  masterQuestionId: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterQuestion' },
  selectedOptionId: mongoose.Schema.Types.ObjectId,
  masterOptionId: mongoose.Schema.Types.ObjectId,
  answerValue: String,
  answerLabel: String,
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  submittedByName: String,
  // Booth fields - aligned with voters collection structure
  booth_id: String,      // e.g., "BOOTH1-111" - unique booth identifier
  boothname: String,     // Full booth name/address
  boothno: String,       // e.g., "BOOTH1" - booth number
  // AC fields
  aci_id: Number,        // Assembly Constituency ID (e.g., 111)
  aci_name: String,      // Assembly Constituency name (e.g., "METTUPALAYAM")
  // Legacy/alternate fields for backward compatibility
  boothId: String,       // Legacy - will map to booth_id
  aciId: Number,         // Legacy - will map to aci_id
  deviceInfo: {
    platform: String,
    version: String,
    model: String
  },
  location: {
    latitude: Number,
    longitude: Number,
    accuracy: Number
  },
  submittedAt: Date
}, {
  timestamps: true,
  strict: false // Allow dynamic fields
});

// Add indexes for common query patterns
mobileAppAnswerSchema.index({ aci_id: 1 });
mobileAppAnswerSchema.index({ voterId: 1 });
mobileAppAnswerSchema.index({ booth_id: 1 });
mobileAppAnswerSchema.index({ questionId: 1 });
mobileAppAnswerSchema.index({ submittedBy: 1 });
mobileAppAnswerSchema.index({ submittedAt: -1 });
mobileAppAnswerSchema.index({ aci_id: 1, submittedAt: -1 }); // Combined filter + sort
mobileAppAnswerSchema.index({ aci_id: 1, booth_id: 1 }); // Combined AC + booth filter

// Cache for compiled models to avoid recompilation
const modelCache = {};

/**
 * Get MobileAppAnswer model for a specific AC
 * @param {number|string} acId - Assembly Constituency ID
 * @returns {mongoose.Model} Mongoose model for the AC's mobile app answer collection
 */
export function getMobileAppAnswerModel(acId) {
  const numericAcId = Number(acId);

  if (!numericAcId || isNaN(numericAcId)) {
    throw new Error(`Invalid AC ID: ${acId}`);
  }

  const collectionName = `mobileappanswers_${numericAcId}`;

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
  const model = mongoose.model(collectionName, mobileAppAnswerSchema, collectionName);
  modelCache[collectionName] = model;
  return model;
}

/**
 * Query mobile app answers from a specific AC collection
 * @param {number|string} acId - AC ID
 * @param {Object} query - MongoDB query object
 * @param {Object} options - Query options (limit, skip, sort, select)
 * @returns {Promise<Array>} Array of mobile app answers
 */
export async function queryMobileAppAnswers(acId, query = {}, options = {}) {
  const MobileAppAnswerModel = getMobileAppAnswerModel(acId);
  let queryBuilder = MobileAppAnswerModel.find(query);

  if (options.select) queryBuilder = queryBuilder.select(options.select);
  if (options.sort) queryBuilder = queryBuilder.sort(options.sort);
  if (options.skip) queryBuilder = queryBuilder.skip(options.skip);
  if (options.limit) queryBuilder = queryBuilder.limit(options.limit);

  return queryBuilder.lean();
}

/**
 * Count mobile app answers in a specific AC collection
 * @param {number|string} acId - AC ID
 * @param {Object} query - MongoDB query object
 * @returns {Promise<number>} Count
 */
export async function countMobileAppAnswers(acId, query = {}) {
  const MobileAppAnswerModel = getMobileAppAnswerModel(acId);
  return MobileAppAnswerModel.countDocuments(query);
}

/**
 * Aggregate mobile app answers in a specific AC collection
 * @param {number|string} acId - AC ID
 * @param {Array} pipeline - Aggregation pipeline
 * @returns {Promise<Array>} Aggregation results
 */
export async function aggregateMobileAppAnswers(acId, pipeline) {
  const MobileAppAnswerModel = getMobileAppAnswerModel(acId);
  return MobileAppAnswerModel.aggregate(pipeline);
}

/**
 * Query mobile app answers across ALL AC collections (for L0 cross-AC queries)
 * Uses parallel queries for better performance
 * @param {Object} query - MongoDB query object
 * @param {Object} options - Query options (limit, skip, sort, select)
 * @returns {Promise<Array>} Combined results from all collections
 */
export async function queryAllMobileAppAnswers(query = {}, options = {}) {
  // Run queries in parallel for better performance
  const queryPromises = ALL_AC_IDS.map(acId =>
    queryMobileAppAnswers(acId, query, options)
      .then(answers => answers.map(a => ({ ...a, _acId: acId })))
      .catch(err => {
        console.error(`Error querying mobileappanswers_${acId}:`, err.message);
        return [];
      })
  );

  const resultsArrays = await Promise.all(queryPromises);
  let results = resultsArrays.flat();

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
 * Count mobile app answers across ALL AC collections (for L0 cross-AC queries)
 * Uses parallel queries for better performance
 * @param {Object} query - MongoDB query object
 * @returns {Promise<number>} Total count
 */
export async function countAllMobileAppAnswers(query = {}) {
  // Run count queries in parallel for better performance
  const countPromises = ALL_AC_IDS.map(acId =>
    countMobileAppAnswers(acId, query)
      .catch(err => {
        console.error(`Error counting mobileappanswers_${acId}:`, err.message);
        return 0;
      })
  );

  const counts = await Promise.all(countPromises);
  return counts.reduce((sum, count) => sum + count, 0);
}

/**
 * Find one mobile app answer by ID across all AC collections
 * @param {string} answerId - Answer document ID
 * @returns {Promise<Object|null>} Mobile app answer or null
 */
export async function findMobileAppAnswerById(answerId) {
  for (const acId of ALL_AC_IDS) {
    try {
      const MobileAppAnswerModel = getMobileAppAnswerModel(acId);
      const answer = await MobileAppAnswerModel.findById(answerId).lean();
      if (answer) {
        return { answer, acId };
      }
    } catch (err) {
      // Continue to next collection
    }
  }
  return null;
}

/**
 * Create a new mobile app answer in the appropriate AC collection
 * @param {number|string} acId - AC ID
 * @param {Object} data - Mobile app answer data
 * @returns {Promise<Object>} Created mobile app answer
 */
export async function createMobileAppAnswer(acId, data) {
  const MobileAppAnswerModel = getMobileAppAnswerModel(acId);
  const answer = new MobileAppAnswerModel(data);
  return answer.save();
}

/**
 * Get answers grouped by voter for a specific AC
 * @param {number|string} acId - AC ID
 * @param {Object} query - Additional query filters
 * @returns {Promise<Array>} Answers grouped by voter
 */
export async function getAnswersByVoter(acId, query = {}) {
  const pipeline = [
    { $match: query },
    {
      $group: {
        _id: '$voterId',
        answers: { $push: '$$ROOT' },
        answerCount: { $sum: 1 },
        lastSubmittedAt: { $max: '$submittedAt' }
      }
    },
    { $sort: { lastSubmittedAt: -1 } }
  ];

  return aggregateMobileAppAnswers(acId, pipeline);
}

/**
 * Aggregate across ALL AC collections (for L0 cross-AC aggregations)
 * Uses parallel queries for better performance
 * @param {Array} pipeline - Aggregation pipeline
 * @returns {Promise<Array>} Combined aggregation results
 */
export async function aggregateAllMobileAppAnswers(pipeline) {
  // Run aggregations in parallel for better performance
  const aggregatePromises = ALL_AC_IDS.map(acId => {
    const MobileAppAnswerModel = getMobileAppAnswerModel(acId);
    return MobileAppAnswerModel.aggregate(pipeline)
      .then(results => results.map(r => ({ ...r, _acId: acId })))
      .catch(err => {
        console.error(`Error aggregating mobileappanswers_${acId}:`, err.message);
        return [];
      });
  });

  const resultsArrays = await Promise.all(aggregatePromises);
  return resultsArrays.flat();
}

export default {
  getMobileAppAnswerModel,
  queryMobileAppAnswers,
  countMobileAppAnswers,
  aggregateMobileAppAnswers,
  queryAllMobileAppAnswers,
  countAllMobileAppAnswers,
  findMobileAppAnswerById,
  createMobileAppAnswer,
  getAnswersByVoter,
  aggregateAllMobileAppAnswers,
  ALL_AC_IDS
};
