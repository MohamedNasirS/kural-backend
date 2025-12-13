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
import { getVoterModel, ALL_AC_IDS, countVoters, aggregateVoters } from './voterCollection.js';

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
    voters: Number
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

      // 2. Count surveyed voters
      countVoters(acId, { surveyed: true }),

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
            surveyedVoters: { $sum: { $cond: ["$surveyed", 1, 0] } },
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
 * Compute and save stats for all ACs
 * Run this as a background job every 5-10 minutes
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

  // Process ACs sequentially to avoid overwhelming MongoDB
  for (const acId of ALL_AC_IDS) {
    try {
      const stats = await computeStatsForAC(acId);

      if (stats) {
        await savePrecomputedStats(stats);
        results.success++;
        results.details.push({
          acId,
          status: 'success',
          voters: stats.totalMembers,
          durationMs: stats.computeDurationMs
        });
        console.log(`[PrecomputedStats] AC ${acId}: ${stats.totalMembers} voters, ${stats.computeDurationMs}ms`);
      } else {
        results.skipped++;
      }
    } catch (error) {
      results.failed++;
      results.details.push({
        acId,
        status: 'failed',
        error: error.message
      });
      console.error(`[PrecomputedStats] AC ${acId} failed:`, error.message);
    }

    // Small delay between ACs to prevent CPU spike
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const totalDuration = Date.now() - startTime;
  console.log(`[PrecomputedStats] Completed: ${results.success} success, ${results.failed} failed, ${results.skipped} skipped in ${totalDuration}ms`);

  return {
    ...results,
    totalDurationMs: totalDuration
  };
}

/**
 * Start background job to compute stats periodically
 * @param {number} intervalMs - Interval in milliseconds (default: 5 minutes)
 */
let statsInterval = null;

export function startStatsComputeJob(intervalMs = 5 * 60 * 1000) {
  if (statsInterval) {
    console.log('[PrecomputedStats] Job already running');
    return;
  }

  console.log(`[PrecomputedStats] Starting background job (interval: ${intervalMs / 1000}s)`);

  // Run immediately on startup
  computeAllStats().catch(err => {
    console.error('[PrecomputedStats] Initial computation failed:', err.message);
  });

  // Then run periodically
  statsInterval = setInterval(() => {
    computeAllStats().catch(err => {
      console.error('[PrecomputedStats] Periodic computation failed:', err.message);
    });
  }, intervalMs);

  return statsInterval;
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
