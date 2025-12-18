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
import { getVoterModel, ALL_AC_IDS, countVoters, countSurveyedVoters, aggregateVoters } from './voterCollection.js';

// Schema for pre-computed stats
const precomputedStatsSchema = new mongoose.Schema({
  acId: { type: Number, required: true, unique: true, index: true },
  acName: String,
  totalMembers: { type: Number, default: 0 },
  totalFamilies: { type: Number, default: 0 },
  totalBooths: { type: Number, default: 0 },
  surveysCompleted: { type: Number, default: 0 },
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
    familyCount: { type: Number, default: 0 }
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
        boothStats: [],
        computedAt: new Date(),
        computeDurationMs: Date.now() - startTime
      };
    }

    // Run all aggregations in parallel for speed
    const [
      totalMembers,
      surveysCompleted,
      familiesResult,
      boothsResult,
      boothStatsResult,
      acMeta
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

      // 4. Count unique booths
      aggregateVoters(acId, [
        { $match: { booth_id: { $exists: true, $ne: null } } },
        { $group: { _id: "$booth_id" } },
        { $count: "total" }
      ]),

      // 5. Booth-wise stats with demographics (for reports)
      aggregateVoters(acId, [
        { $match: {} },
        {
          $group: {
            _id: "$boothname",
            boothno: { $first: "$boothno" },
            booth_id: { $first: "$booth_id" },
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
            uniqueFamilies: { $addToSet: "$familyId" }
          }
        },
        {
          $project: {
            boothno: 1,
            booth_id: 1,
            voters: 1,
            maleVoters: 1,
            femaleVoters: 1,
            verifiedVoters: 1,
            surveyedVoters: 1,
            avgAge: 1,
            familyCount: { $size: { $filter: { input: "$uniqueFamilies", as: "f", cond: { $and: [{ $ne: ["$$f", null] }, { $ne: ["$$f", ""] }] } } } }
          }
        },
        { $sort: { boothno: 1 } }
      ]),

      // 6. Get AC metadata
      VoterModel.findOne({}, { aci_name: 1, aci_id: 1 }).lean()
    ]);

    const stats = {
      acId,
      acName: acMeta?.aci_name || null,
      totalMembers,
      totalFamilies: familiesResult[0]?.total || 0,
      totalBooths: boothsResult[0]?.total || 0,
      surveysCompleted,
      boothStats: boothStatsResult.map(booth => ({
        boothNo: booth.boothno,
        boothName: booth._id,
        boothId: booth.booth_id,
        voters: booth.voters,
        // Demographics for reports endpoint
        maleVoters: booth.maleVoters || 0,
        femaleVoters: booth.femaleVoters || 0,
        verifiedVoters: booth.verifiedVoters || 0,
        surveyedVoters: booth.surveyedVoters || 0,
        avgAge: Math.round(booth.avgAge || 0),
        familyCount: booth.familyCount || 0
      })),
      computedAt: new Date(),
      computeDurationMs: Date.now() - startTime
    };

    return stats;
  } catch (error) {
    console.error(`Error computing stats for AC ${acId}:`, error.message);
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
    console.error(`Error saving stats for AC ${stats.acId}:`, error.message);
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
    console.error(`Error getting stats for AC ${acId}:`, error.message);
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
      console.log(`[PrecomputedStats] AC ${acId}: ${stats.totalMembers} voters, ${stats.computeDurationMs}ms`);
      return { acId, status: 'success', voters: stats.totalMembers };
    }
    return { acId, status: 'skipped' };
  } catch (error) {
    console.error(`[PrecomputedStats] AC ${acId} failed:`, error.message);
    return { acId, status: 'failed', error: error.message };
  }
}

/**
 * Compute and save stats for all ACs
 * Run this as a background job every 5-10 minutes
 * OPTIMIZED: Stagger computation with longer delays to prevent CPU spikes
 */
export async function computeAllStats() {
  console.log('[PrecomputedStats] Starting stats computation for all ACs...');
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
  console.log(`[PrecomputedStats] Completed: ${results.success} success, ${results.failed} failed, ${results.skipped} skipped in ${Math.round(totalDuration/1000)}s`);

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
    console.log('[PrecomputedStats] Job already running');
    return;
  }

  console.log(`[PrecomputedStats] Starting background job (interval: ${intervalMs / 1000}s)`);
  console.log('[PrecomputedStats] Computation is staggered: 15s delay between each AC');

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
    console.log('[PrecomputedStats] Skipping - previous computation still running');
    return;
  }

  isComputationRunning = true;
  try {
    await computeAllStats();
  } catch (err) {
    console.error('[PrecomputedStats] Computation failed:', err.message);
  } finally {
    isComputationRunning = false;
  }
}

export function stopStatsComputeJob() {
  if (statsInterval) {
    clearInterval(statsInterval);
    statsInterval = null;
    console.log('[PrecomputedStats] Background job stopped');
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
    console.error('[PrecomputedStats] Error getting all stats:', error.message);
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
