/**
 * Pre-computed Dashboard Statistics
 *
 * Instead of running heavy aggregations on every dashboard request,
 * we pre-compute stats and store them in a simple collection.
 *
 * This reduces MongoDB CPU from 100% to minimal usage.
 *
 * How it works:
 * 1. Background job computes stats for each AC every 5 minutes
 * 2. Stats are stored in `precomputed_stats` collection
 * 3. Dashboard API reads from this collection (single document read)
 *
 * NO Redis needed - this uses MongoDB itself as the cache.
 */

import mongoose from 'mongoose';
import { createRequire } from 'module';
import { getVoterModel, ALL_AC_IDS, countVoters, countSurveyedVoters, aggregateVoters } from './voterCollection.js';

// Create require for CommonJS modules (logger)
const require = createRequire(import.meta.url);
const logger = require('./logger.cjs');

// Schema for pre-computed stats
const precomputedStatsSchema = new mongoose.Schema({
  acId: { type: Number, required: true, unique: true, index: true },
  acName: String,
  totalMembers: { type: Number, default: 0 },
  totalFamilies: { type: Number, default: 0 },
  totalBooths: { type: Number, default: 0 },
  // Legacy field - voters who completed at least one survey (surveyed: true)
  surveysCompleted: { type: Number, default: 0 },
  // NEW: Multi-survey tracking
  activeSurveysCount: { type: Number, default: 0 },        // Number of active survey forms for this AC
  totalSurveysNeeded: { type: Number, default: 0 },        // activeSurveys × totalVoters
  totalSurveysCompleted: { type: Number, default: 0 },     // Sum of all voter.surveysTaken
  votersSurveyed: { type: Number, default: 0 },            // Voters with at least one survey (same as surveysCompleted)
  // Per-survey breakdown
  surveyBreakdown: [{
    surveyId: String,
    surveyName: String,
    completedCount: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 }
  }],
  // SIR Statistics
  sirStats: {
    activeVoters: { type: Number, default: 0 },
    removedVoters: { type: Number, default: 0 },
    newVoters: { type: Number, default: 0 },           // NEW: Voters added from SIR (not in old data)
    activePercentage: { type: Number, default: 0 },
    removedPercentage: { type: Number, default: 0 },
    newPercentage: { type: Number, default: 0 },       // NEW: Percentage of new voters
    currentRevision: { type: String, default: null }   // NEW: Current SIR revision (e.g., "december2024")
  },
  boothStats: [{
    boothNo: mongoose.Schema.Types.Mixed, // Can be String or Number depending on data
    boothName: String,
    boothId: String,
    voters: Number,
    // Demographics for reports endpoint
    maleVoters: { type: Number, default: 0 },
    femaleVoters: { type: Number, default: 0 },
    verifiedVoters: { type: Number, default: 0 },
    surveyedVoters: { type: Number, default: 0 },
    avgAge: { type: Number, default: 0 },
    familyCount: { type: Number, default: 0 },
    // SIR Statistics per booth
    activeVoters: { type: Number, default: 0 },
    removedVoters: { type: Number, default: 0 }
  }],
  computedAt: { type: Date, default: Date.now },
  computeDurationMs: Number
}, {
  timestamps: true,
  collection: 'precomputed_stats'
});

// Index for fast lookups
precomputedStatsSchema.index({ acId: 1 });
precomputedStatsSchema.index({ computedAt: -1 });

const PrecomputedStats = mongoose.models.PrecomputedStats ||
  mongoose.model('PrecomputedStats', precomputedStatsSchema);

/**
 * Helper function to select the best booth name from multiple options
 * Prefers names with booth number prefix (e.g., "1- Corporation...") over Tamil names
 */
function selectBestBoothName(boothnames, boothNumber) {
  if (!boothnames || boothnames.length === 0) {
    return `Booth ${boothNumber}`;
  }

  // Filter out null/undefined/empty values
  const validNames = boothnames.filter(name => name && name.trim());
  if (validNames.length === 0) {
    return `Booth ${boothNumber}`;
  }

  // Prefer names that already have the booth number prefix (e.g., "1- Corporation...")
  const withNumberPrefix = validNames.find(name => /^\d+[-\s]/.test(name));
  if (withNumberPrefix) {
    return withNumberPrefix;
  }

  // Otherwise, pick the shortest name (usually the English format)
  const shortestName = validNames.reduce((shortest, current) => {
    return current.length < shortest.length ? current : shortest;
  }, validNames[0]);

  return shortestName;
}

/**
 * Compute statistics for a single AC
 * This is the heavy operation - runs aggregations
 */
export async function computeStatsForAC(acId) {
  const startTime = Date.now();

  try {
    const VoterModel = getVoterModel(acId);

    // Check if collection has data
    const sampleDoc = await VoterModel.findOne({}).lean();
    if (!sampleDoc) {
      // Empty collection - store zeros
      return {
        acId,
        acName: null,
        totalMembers: 0,
        totalFamilies: 0,
        totalBooths: 0,
        surveysCompleted: 0,
        // NEW: Multi-survey tracking defaults
        activeSurveysCount: 0,
        totalSurveysNeeded: 0,
        totalSurveysCompleted: 0,
        votersSurveyed: 0,
        surveyBreakdown: [],
        // SIR Statistics defaults
        sirStats: {
          activeVoters: 0,
          removedVoters: 0,
          newVoters: 0,
          activePercentage: 0,
          removedPercentage: 0,
          newPercentage: 0,
          currentRevision: null
        },
        boothStats: [],
        computedAt: new Date(),
        computeDurationMs: Date.now() - startTime
      };
    }

    // Get Survey model for counting active surveys
    const Survey = mongoose.models.Survey || mongoose.model('Survey', new mongoose.Schema({}, { strict: false }), 'surveys');

    // Run all aggregations in parallel for speed
    const [
      totalMembers,
      surveysCompleted,
      familiesResult,
      boothsResult,
      boothStatsResult,
      acMeta,
      activeSurveys,
      totalSurveysTakenResult,
      surveyBreakdownResult,
      sirActiveCount,
      sirRemovedCount,
      sirNewCount,
      sirRevisionDoc
    ] = await Promise.all([
      // 1. Count total voters
      countVoters(acId, {}),

      // 2. Count surveyed voters using aggregation (bypasses schema validation)
      // The surveyed field can be boolean true, string "true", "yes", or "Yes"
      countSurveyedVoters(acId),

      // 3. Count unique families
      aggregateVoters(acId, [
        { $match: { familyId: { $exists: true, $ne: null } } },
        { $group: { _id: "$familyId" } },
        { $count: "total" }
      ]),

      // 4. Count unique booths (only booths with active voters)
      aggregateVoters(acId, [
        { $match: { booth_id: { $exists: true, $ne: null }, isActive: { $ne: false } } },
        { $group: { _id: "$booth_id" } },
        { $count: "total" }
      ]),

      // 5. Booth-wise stats with demographics (for reports)
      // Group by booth_id to avoid duplicates when same booth has multiple name formats
      aggregateVoters(acId, [
        { $match: {} },
        {
          $group: {
            _id: "$booth_id",
            boothno: { $first: "$boothno" },
            // Collect all unique booth names to pick the best one
            boothnames: { $addToSet: "$boothname" },
            voters: { $sum: 1 },
            // Demographics for reports endpoint
            maleVoters: { $sum: { $cond: [{ $eq: ["$gender", "Male"] }, 1, 0] } },
            femaleVoters: { $sum: { $cond: [{ $eq: ["$gender", "Female"] }, 1, 0] } },
            verifiedVoters: { $sum: { $cond: ["$verified", 1, 0] } },
            // Handle surveyed as boolean true, string "true", or "yes"/"Yes"
            surveyedVoters: { $sum: { $cond: [{ $or: [
              { $eq: ["$surveyed", true] },
              { $eq: ["$surveyed", "true"] },
              { $eq: ["$surveyed", "yes"] },
              { $eq: ["$surveyed", "Yes"] }
            ]}, 1, 0] } },
            avgAge: { $avg: "$age" },
            uniqueFamilies: { $addToSet: "$familyId" },
            // SIR counts per booth (isActive: true or not set = active, isActive: false = removed)
            activeVoters: { $sum: { $cond: [{ $or: [{ $eq: ["$isActive", true] }, { $not: { $ifNull: ["$isActive", false] } }] }, 1, 0] } },
            removedVoters: { $sum: { $cond: [{ $eq: ["$isActive", false] }, 1, 0] } }
          }
        },
        {
          $project: {
            boothno: 1,
            boothnames: 1,
            voters: 1,
            maleVoters: 1,
            femaleVoters: 1,
            verifiedVoters: 1,
            surveyedVoters: 1,
            avgAge: 1,
            familyCount: { $size: { $filter: { input: "$uniqueFamilies", as: "f", cond: { $and: [{ $ne: ["$$f", null] }, { $ne: ["$$f", ""] }] } } } },
            activeVoters: 1,
            removedVoters: 1
          }
        },
        { $sort: { boothno: 1 } }
      ]),

      // 6. Get AC metadata
      VoterModel.findOne({}, { aci_name: 1, aci_id: 1 }).lean(),

      // 7. Get active surveys for this AC
      Survey.find({ assignedACs: acId, status: 'Active' }, { _id: 1, title: 1 }).lean(),

      // 8. Sum of all voter.surveysTaken (total individual survey completions)
      aggregateVoters(acId, [
        { $match: { surveysTaken: { $exists: true, $gt: 0 } } },
        { $group: { _id: null, total: { $sum: "$surveysTaken" } } }
      ]),

      // 9. Per-survey breakdown from voter.completedSurveys array
      aggregateVoters(acId, [
        { $match: { completedSurveys: { $exists: true, $ne: [] } } },
        { $unwind: "$completedSurveys" },
        { $group: {
          _id: "$completedSurveys.surveyId",
          surveyName: { $first: "$completedSurveys.surveyName" },
          completedCount: { $sum: 1 }
        }},
        { $sort: { completedCount: -1 } }
      ]),

      // 10. SIR Active voters count (isActive: true or isActive not set)
      countVoters(acId, { $or: [{ isActive: true }, { isActive: { $exists: false } }] }),

      // 11. SIR Removed voters count (isActive: false)
      countVoters(acId, { isActive: false }),

      // 12. NEW voters from SIR (isNewFromSir: true)
      countVoters(acId, { isNewFromSir: true }),

      // 13. Get current SIR revision from any voter
      VoterModel.findOne({ currentSirRevision: { $exists: true, $ne: null } }, { currentSirRevision: 1 }).lean()
    ]);

    // Calculate multi-survey metrics
    const activeSurveysCount = activeSurveys?.length || 0;
    const totalSurveysNeeded = activeSurveysCount * totalMembers;
    const totalSurveysCompleted = totalSurveysTakenResult[0]?.total || 0;
    const votersSurveyed = surveysCompleted; // Same as surveysCompleted (voters with surveyed: true)

    // Build survey breakdown with completion rates
    const surveyBreakdown = (surveyBreakdownResult || []).map(s => ({
      surveyId: s._id?.toString() || '',
      surveyName: s.surveyName || 'Unknown Survey',
      completedCount: s.completedCount || 0,
      completionRate: totalMembers > 0 ? Math.round((s.completedCount / totalMembers) * 10000) / 100 : 0
    }));

    // Calculate SIR statistics
    const activeVoters = sirActiveCount || 0;
    const removedVoters = sirRemovedCount || 0;
    const newVoters = sirNewCount || 0;
    const currentRevision = sirRevisionDoc?.currentSirRevision || null;
    const sirStats = {
      activeVoters,
      removedVoters,
      newVoters,
      activePercentage: totalMembers > 0 ? Math.round((activeVoters / totalMembers) * 10000) / 100 : 0,
      removedPercentage: totalMembers > 0 ? Math.round((removedVoters / totalMembers) * 10000) / 100 : 0,
      newPercentage: totalMembers > 0 ? Math.round((newVoters / totalMembers) * 10000) / 100 : 0,
      currentRevision
    };

    const stats = {
      acId,
      acName: acMeta?.aci_name || null,
      totalMembers,
      totalFamilies: familiesResult[0]?.total || 0,
      totalBooths: boothsResult[0]?.total || 0,
      surveysCompleted, // Legacy: voters with at least one survey
      // NEW: Multi-survey tracking
      activeSurveysCount,
      totalSurveysNeeded,
      totalSurveysCompleted,
      votersSurveyed,
      surveyBreakdown,
      // SIR Statistics
      sirStats,
      boothStats: boothStatsResult.map(booth => {
        const boothNumber = booth.boothno || 0;
        // Select the best booth name from available options
        const selectedName = selectBestBoothName(booth.boothnames, boothNumber);
        // Check if name already has booth number prefix - if not, add it
        const hasNumberPrefix = /^\d+[-\s]/.test(selectedName);
        const displayName = hasNumberPrefix ? selectedName : `${boothNumber}- ${selectedName}`;

        return {
          boothNo: boothNumber,
          boothName: displayName,
          boothId: booth._id, // booth._id is now booth_id since we group by booth_id
          voters: booth.voters,
          // Demographics for reports endpoint
          maleVoters: booth.maleVoters || 0,
          femaleVoters: booth.femaleVoters || 0,
          verifiedVoters: booth.verifiedVoters || 0,
          surveyedVoters: booth.surveyedVoters || 0,
          avgAge: Math.round(booth.avgAge || 0),
          familyCount: booth.familyCount || 0,
          // SIR Statistics per booth
          activeVoters: booth.activeVoters || 0,
          removedVoters: booth.removedVoters || 0
        };
      }),
      computedAt: new Date(),
      computeDurationMs: Date.now() - startTime
    };

    return stats;
  } catch (error) {
    logger.error({ acId, error: error.message }, 'Error computing stats for AC');
    return null;
  }
}

/**
 * Save pre-computed stats to database
 */
export async function savePrecomputedStats(stats) {
  if (!stats) return null;

  try {
    const result = await PrecomputedStats.findOneAndUpdate(
      { acId: stats.acId },
      { $set: stats },
      { upsert: true, new: true }
    );
    return result;
  } catch (error) {
    logger.error({ acId: stats.acId, error: error.message }, 'Error saving stats for AC');
    return null;
  }
}

/**
 * Get pre-computed stats for an AC
 * Returns cached stats if available and fresh (< maxAgeMs)
 */
export async function getPrecomputedStats(acId, maxAgeMs = 10 * 60 * 1000) {
  try {
    const stats = await PrecomputedStats.findOne({ acId }).lean();

    if (!stats) {
      return null;
    }

    // Check if stats are fresh enough
    const age = Date.now() - new Date(stats.computedAt).getTime();
    if (age > maxAgeMs) {
      // Stats are stale - return them but flag for refresh
      return { ...stats, isStale: true };
    }

    return { ...stats, isStale: false };
  } catch (error) {
    logger.error({ acId, error: error.message }, 'Error getting stats for AC');
    return null;
  }
}

/**
 * Compute and save stats for a single AC (used by staggered job)
 */
async function computeAndSaveSingleAC(acId) {
  try {
    const stats = await computeStatsForAC(acId);
    if (stats) {
      await savePrecomputedStats(stats);
      logger.info({ acId, voters: stats.totalMembers, durationMs: stats.computeDurationMs }, '[PrecomputedStats] AC stats computed');
      return { acId, status: 'success', voters: stats.totalMembers };
    }
    return { acId, status: 'skipped' };
  } catch (error) {
    logger.error({ acId, error: error.message }, '[PrecomputedStats] AC computation failed');
    return { acId, status: 'failed', error: error.message };
  }
}

/**
 * Compute and save stats for all ACs
 * Run this as a background job every 5-10 minutes
 * OPTIMIZED: Stagger computation with longer delays to prevent CPU spikes
 */
export async function computeAllStats() {
  logger.info('[PrecomputedStats] Starting stats computation for all ACs...');
  const startTime = Date.now();

  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    details: []
  };

  // Process ACs sequentially with 15-second delay between each
  // This spreads 17 ACs over ~4.5 minutes instead of all at once
  const DELAY_BETWEEN_ACS = 15000; // 15 seconds

  for (const acId of ALL_AC_IDS) {
    const result = await computeAndSaveSingleAC(acId);
    results.details.push(result);

    if (result.status === 'success') results.success++;
    else if (result.status === 'failed') results.failed++;
    else results.skipped++;

    // Wait before processing next AC to avoid CPU spike
    if (ALL_AC_IDS.indexOf(acId) < ALL_AC_IDS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_ACS));
    }
  }

  const totalDuration = Date.now() - startTime;
  logger.info({ success: results.success, failed: results.failed, skipped: results.skipped, durationSec: Math.round(totalDuration/1000) }, '[PrecomputedStats] Computation completed');

  return {
    ...results,
    totalDurationMs: totalDuration
  };
}

/**
 * Start background job to compute stats periodically
 * @param {number} intervalMs - Interval in milliseconds (default: 10 minutes)
 * OPTIMIZED: Default increased to 10 minutes since computation takes ~4.5 minutes
 */
let statsInterval = null;
let isComputationRunning = false;

export function startStatsComputeJob(intervalMs = 10 * 60 * 1000) {
  if (statsInterval) {
    logger.info('[PrecomputedStats] Job already running');
    return;
  }

  logger.info({ intervalSec: intervalMs / 1000 }, '[PrecomputedStats] Starting background job');
  logger.info('[PrecomputedStats] Computation is staggered: 15s delay between each AC');

  // Run immediately on startup (after 30s delay to let server stabilize)
  setTimeout(() => {
    runComputationIfNotBusy();
  }, 30000);

  // Then run periodically
  statsInterval = setInterval(() => {
    runComputationIfNotBusy();
  }, intervalMs);

  return statsInterval;
}

async function runComputationIfNotBusy() {
  if (isComputationRunning) {
    logger.info('[PrecomputedStats] Skipping - previous computation still running');
    return;
  }

  isComputationRunning = true;
  try {
    await computeAllStats();
  } catch (err) {
    logger.error({ error: err.message }, '[PrecomputedStats] Computation failed');
  } finally {
    isComputationRunning = false;
  }
}

export function stopStatsComputeJob() {
  if (statsInterval) {
    clearInterval(statsInterval);
    statsInterval = null;
    logger.info('[PrecomputedStats] Background job stopped');
  }
}

/**
 * Get all precomputed stats for all ACs
 * Used by L0 dashboard to avoid expensive cross-AC aggregations
 */
export async function getAllPrecomputedStats() {
  try {
    const allStats = await PrecomputedStats.find({}).lean();
    return allStats || [];
  } catch (error) {
    logger.error({ error: error.message }, '[PrecomputedStats] Error getting all stats');
    return [];
  }
}

export default {
  computeStatsForAC,
  savePrecomputedStats,
  getPrecomputedStats,
  getAllPrecomputedStats,
  computeAllStats,
  startStatsComputeJob,
  stopStatsComputeJob,
  PrecomputedStats
};
