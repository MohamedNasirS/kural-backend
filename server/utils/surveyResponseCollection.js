/**
 * Utility for accessing sharded survey response collections.
 *
 * The database has been restructured to shard survey response data by Assembly Constituency (AC).
 * Instead of a single `surveyresponses` collection, responses are now stored in `surveyresponses_{AC_ID}` collections.
 *
 * Example:
 *   - surveyresponses_111 (AC 111 survey responses)
 *   - surveyresponses_119 (AC 119 survey responses)
 */

import mongoose from 'mongoose';
import { ALL_AC_IDS } from './voterCollection.js';

// Survey Response schema - matches the actual database structure
// Booth fields aligned with voters collection: booth_id, boothname, boothno
const surveyResponseSchema = new mongoose.Schema({
  formId: { type: mongoose.Schema.Types.ObjectId, ref: 'Survey' },
  respondentId: String,
  respondentName: String,
  respondentMobile: String,
  respondentAge: Number,
  respondentVoterId: String,
  answers: [{
    questionId: String,
    questionText: String,
    answer: mongoose.Schema.Types.Mixed,
    answerText: String,
    selectedOptions: [String],
    masterQuestionId: String,
    selectedOption: {
      optionId: String,
      optionText: String,
      optionValue: String,
      optionIndex: Number
    },
    optionMapping: {
      surveyOptionIndex: Number,
      masterQuestionId: String,
      masterOptionValue: String
    },
    submittedAt: Date
  }],
  isComplete: Boolean,
  submittedAt: Date,
  // Booth fields - aligned with voters collection structure
  booth_id: String,      // e.g., "BOOTH1-111" - unique booth identifier
  boothname: String,     // Full booth name/address
  boothno: String,       // e.g., "BOOTH1" - booth number
  // AC fields
  aci_id: Number,        // Assembly Constituency ID (e.g., 111)
  aci_name: String,      // Assembly Constituency name (e.g., "METTUPALAYAM")
  // Legacy/alternate fields for backward compatibility
  voterId: mongoose.Schema.Types.Mixed,
  voterName: String,
  voterID: String,
  booth: String,         // Legacy - will map to boothname
  boothCode: String,     // Legacy - will map to booth_id
  acId: Number,          // Legacy - will map to aci_id
  aci_num: Number,       // Legacy - will map to aci_id
  surveyId: mongoose.Schema.Types.Mixed,
  status: String,
  responses: mongoose.Schema.Types.Mixed
}, {
  timestamps: true,
  strict: false // Allow dynamic fields
});

// Add indexes for common query patterns
surveyResponseSchema.index({ aci_id: 1 });
surveyResponseSchema.index({ booth_id: 1 });
surveyResponseSchema.index({ boothname: 1 });
surveyResponseSchema.index({ formId: 1 });
surveyResponseSchema.index({ createdAt: -1 });
surveyResponseSchema.index({ aci_id: 1, createdAt: -1 }); // Combined filter + sort
surveyResponseSchema.index({ respondentVoterId: 1 }, { sparse: true });
surveyResponseSchema.index({ aci_id: 1, booth_id: 1 }); // Combined AC + booth filter

// Cache for compiled models to avoid recompilation
const modelCache = {};

/**
 * Get SurveyResponse model for a specific AC
 * @param {number|string} acId - Assembly Constituency ID
 * @returns {mongoose.Model} Mongoose model for the AC's survey response collection
 */
export function getSurveyResponseModel(acId) {
  const numericAcId = Number(acId);

  if (!numericAcId || isNaN(numericAcId)) {
    throw new Error(`Invalid AC ID: ${acId}`);
  }

  const collectionName = `surveyresponses_${numericAcId}`;

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
  const model = mongoose.model(collectionName, surveyResponseSchema, collectionName);
  modelCache[collectionName] = model;
  return model;
}

/**
 * Query survey responses from a specific AC collection
 * @param {number|string} acId - AC ID
 * @param {Object} query - MongoDB query object
 * @param {Object} options - Query options (limit, skip, sort, select)
 * @returns {Promise<Array>} Array of survey responses
 */
export async function querySurveyResponses(acId, query = {}, options = {}) {
  const SurveyResponseModel = getSurveyResponseModel(acId);
  let queryBuilder = SurveyResponseModel.find(query);

  if (options.select) queryBuilder = queryBuilder.select(options.select);
  if (options.sort) queryBuilder = queryBuilder.sort(options.sort);
  if (options.skip) queryBuilder = queryBuilder.skip(options.skip);
  if (options.limit) queryBuilder = queryBuilder.limit(options.limit);

  return queryBuilder.lean();
}

/**
 * Count survey responses in a specific AC collection
 * @param {number|string} acId - AC ID
 * @param {Object} query - MongoDB query object
 * @returns {Promise<number>} Count
 */
export async function countSurveyResponses(acId, query = {}) {
  const SurveyResponseModel = getSurveyResponseModel(acId);
  return SurveyResponseModel.countDocuments(query);
}

/**
 * Aggregate survey responses in a specific AC collection
 * @param {number|string} acId - AC ID
 * @param {Array} pipeline - Aggregation pipeline
 * @returns {Promise<Array>} Aggregation results
 */
export async function aggregateSurveyResponses(acId, pipeline) {
  const SurveyResponseModel = getSurveyResponseModel(acId);
  return SurveyResponseModel.aggregate(pipeline);
}

/**
 * Query survey responses across ALL AC collections (for L0 cross-AC queries)
 * Uses parallel queries for better performance
 * @param {Object} query - MongoDB query object
 * @param {Object} options - Query options (limit, skip, sort, select)
 * @returns {Promise<Array>} Combined results from all collections
 */
export async function queryAllSurveyResponses(query = {}, options = {}) {
  // Run queries in parallel for better performance
  const queryPromises = ALL_AC_IDS.map(acId =>
    querySurveyResponses(acId, query, options)
      .then(responses => responses.map(r => ({ ...r, _acId: acId })))
      .catch(err => {
        console.error(`Error querying surveyresponses_${acId}:`, err.message);
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
 * Count survey responses across ALL AC collections (for L0 cross-AC queries)
 * Uses parallel queries for better performance
 * @param {Object} query - MongoDB query object
 * @returns {Promise<number>} Total count
 */
export async function countAllSurveyResponses(query = {}) {
  // Run count queries in parallel for better performance
  const countPromises = ALL_AC_IDS.map(acId =>
    countSurveyResponses(acId, query)
      .catch(err => {
        console.error(`Error counting surveyresponses_${acId}:`, err.message);
        return 0;
      })
  );

  const counts = await Promise.all(countPromises);
  return counts.reduce((sum, count) => sum + count, 0);
}

/**
 * Find one survey response by ID across all AC collections
 * @param {string} responseId - Response document ID
 * @returns {Promise<Object|null>} Survey response or null
 */
export async function findSurveyResponseById(responseId) {
  for (const acId of ALL_AC_IDS) {
    try {
      const SurveyResponseModel = getSurveyResponseModel(acId);
      const response = await SurveyResponseModel.findById(responseId).lean();
      if (response) {
        return { response, acId };
      }
    } catch (err) {
      // Continue to next collection
    }
  }
  return null;
}

/**
 * Create a new survey response in the appropriate AC collection
 * @param {number|string} acId - AC ID
 * @param {Object} data - Survey response data
 * @returns {Promise<Object>} Created survey response
 */
export async function createSurveyResponse(acId, data) {
  const SurveyResponseModel = getSurveyResponseModel(acId);
  const response = new SurveyResponseModel(data);
  return response.save();
}

/**
 * Update a survey response by ID
 * @param {number|string} acId - AC ID
 * @param {string} responseId - Response document ID
 * @param {Object} update - Update object
 * @param {Object} options - Mongoose options
 * @returns {Promise<Object|null>} Updated survey response or null
 */
export async function updateSurveyResponse(acId, responseId, update, options = {}) {
  const SurveyResponseModel = getSurveyResponseModel(acId);
  return SurveyResponseModel.findByIdAndUpdate(responseId, update, { new: true, ...options }).lean();
}

/**
 * Aggregate across ALL AC collections (for L0 cross-AC aggregations)
 * Uses parallel queries for better performance
 * Note: Results are combined, not merged. Use with caution for complex aggregations.
 * @param {Array} pipeline - Aggregation pipeline
 * @returns {Promise<Array>} Combined aggregation results
 */
export async function aggregateAllSurveyResponses(pipeline) {
  // Run aggregations in parallel for better performance
  const aggregatePromises = ALL_AC_IDS.map(acId => {
    const SurveyResponseModel = getSurveyResponseModel(acId);
    return SurveyResponseModel.aggregate(pipeline)
      .then(results => results.map(r => ({ ...r, _acId: acId })))
      .catch(err => {
        console.error(`Error aggregating surveyresponses_${acId}:`, err.message);
        return [];
      });
  });

  const resultsArrays = await Promise.all(aggregatePromises);
  return resultsArrays.flat();
}

export default {
  getSurveyResponseModel,
  querySurveyResponses,
  countSurveyResponses,
  aggregateSurveyResponses,
  queryAllSurveyResponses,
  countAllSurveyResponses,
  findSurveyResponseById,
  createSurveyResponse,
  updateSurveyResponse,
  aggregateAllSurveyResponses,
  ALL_AC_IDS
};
