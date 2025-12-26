/**
 * Pre-computed MLA Dashboard Statistics
 *
 * Caches heavy aggregations for MLA dashboard:
 * - AC overview (booth sentiment, vote shares, margins)
 * - Gender distribution
 * - Margin distribution
 * - Booth size distribution
 * - Current voter stats (from SIR data)
 *
 * Refreshes every 10 minutes via background job.
 */

import mongoose from 'mongoose';
import { createRequire } from 'module';

// Create require for CommonJS modules (logger)
const require = createRequire(import.meta.url);
const logger = require('./logger.cjs');

// Schema for MLA pre-computed stats
const mlaPrecomputedStatsSchema = new mongoose.Schema({
  acId: { type: Number, required: true, unique: true, index: true },

  // Overview data
  overview: {
    ac: {
      id: Number,
      name: String,
      district: String,
    },
    stats: {
      totalBooths: Number,
      totalVoters: Number,
      avgVotersPerBooth: Number,
    },
    lastElection: {
      year: Number,
      result: String,
      margin: Number,
      marginPercent: Number,
      ourParty: {
        name: String,
        votes: Number,
        voteSharePercent: Number,
      },
      opponent: {
        name: String,
        votes: Number,
        voteSharePercent: Number,
      },
    },
    boothSentiment: {
      favorable: { count: Number, percentage: Number },
      negative: { count: Number, percentage: Number },
      balanced: { count: Number, percentage: Number },
      flippable: { count: Number, percentage: Number },
    },
    flippableBooths: {
      count: Number,
      totalGapToFlip: Number,
      avgGapPerBooth: Number,
    },
    predictedTurnout2026: Number,
  },

  // Gender distribution (from voter data)
  genderDistribution: {
    male: { count: Number, percentage: Number },
    female: { count: Number, percentage: Number },
    transgender: { count: Number, percentage: Number },
    total: Number,
    note: String,
  },

  // Margin distribution
  marginDistribution: {
    distribution: [{
      range: String,
      count: Number,
      type: String,
    }],
    totalBooths: Number,
  },

  // Booth size distribution
  boothSizeDistribution: {
    distribution: [{
      range: String,
      count: Number,
      percentage: Number,
    }],
    totalBooths: Number,
  },

  // Current voter stats (SIR data)
  currentVoterStats: {
    available: Boolean,
    totalBooths: Number,
    activeVoters: Number,
    removedVoters: Number,
    newVoters: Number,
    totalInDB: Number,
    genderDistribution: {
      male: { count: Number, percentage: Number },
      female: { count: Number, percentage: Number },
      others: { count: Number, percentage: Number },
    },
  },

  // Priority targets (top flippable booths)
  priorityTargets: [{
    boothNo: String,
    boothName: String,
    ourVoteSharePercent: Number,
    margin: { votes: Number, percent: Number },
    gapToFlip: Number,
    totalVoters: Number,
    reason: String,
  }],
  prioritySummary: {
    totalFlippable: Number,
    totalGapToFlip: Number,
    avgGapPerBooth: Number,
  },

  computedAt: { type: Date, default: Date.now },
  computeDurationMs: Number,
}, {
  timestamps: true,
  collection: 'mla_precomputed_stats'
});

mlaPrecomputedStatsSchema.index({ acId: 1 });
mlaPrecomputedStatsSchema.index({ computedAt: -1 });

const MLAPrecomputedStats = mongoose.models.MLAPrecomputedStats ||
  mongoose.model('MLAPrecomputedStats', mlaPrecomputedStatsSchema);

// Helper to get collections
const getCollections = () => {
  const db = mongoose.connection.db;
  return {
    boothResults: db.collection('mla_booth_results'),
    electionSummary: db.collection('mla_election_summary'),
  };
};

// Helper to get voter collection
const getVoterCollection = (acId) => {
  return mongoose.connection.db.collection(`voters_${acId}`);
};

/**
 * Compute MLA stats for a single AC
 */
export async function computeMLAStatsForAC(acId) {
  const startTime = Date.now();

  try {
    const { boothResults, electionSummary } = getCollections();
    const voterCollection = getVoterCollection(acId);

    // Check if we have booth results for this AC
    const boothCount = await boothResults.countDocuments({ acId });
    if (boothCount === 0) {
      logger.info({ acId }, '[MLAPrecomputed] No booth results found, skipping');
      return null;
    }

    // Run all aggregations in parallel
    const [
      summary,
      boothStats,
      flippableBoothsData,
      allBooths,
      voterCount,
      voterGenderStats,
      sirStats,
    ] = await Promise.all([
      // 1. AC summary
      electionSummary.findOne({ acId }),

      // 2. Booth sentiment stats
      boothResults.aggregate([
        { $match: { acId } },
        {
          $group: {
            _id: '$sentiment',
            count: { $sum: 1 },
            totalVotes: { $sum: '$totalVotes' },
          },
        },
      ]).toArray(),

      // 3. Flippable booths data
      boothResults.aggregate([
        { $match: { acId, sentiment: 'flippable' } },
        {
          $group: {
            _id: null,
            totalGapToFlip: { $sum: '$gapToFlip' },
            count: { $sum: 1 },
          },
        },
      ]).toArray(),

      // 4. All booths for distributions
      boothResults.find({ acId }).toArray(),

      // 5. Voter count
      voterCollection.countDocuments(),

      // 6. Voter gender stats (active only)
      voterCollection.aggregate([
        { $match: { isActive: { $ne: false } } },
        { $group: { _id: '$gender', count: { $sum: 1 } } },
      ]).toArray(),

      // 7. SIR stats
      voterCollection.aggregate([
        {
          $facet: {
            active: [
              { $match: { isActive: { $ne: false } } },
              { $count: 'count' }
            ],
            removed: [
              { $match: { isActive: false } },
              { $count: 'count' }
            ],
            newVoters: [
              { $match: { $or: [{ isNewFromSir: true }, { currentSirStatus: 'new' }] } },
              { $count: 'count' }
            ],
            gender: [
              { $match: { isActive: { $ne: false } } },
              { $group: { _id: '$gender', count: { $sum: 1 } } }
            ],
            booths: [
              { $match: { isActive: { $ne: false } } },
              { $group: { _id: '$boothno' } },
              { $count: 'count' }
            ]
          }
        }
      ]).toArray(),
    ]);

    // Process booth sentiment
    const sentimentCounts = {
      favorable: 0,
      negative: 0,
      balanced: 0,
      flippable: 0,
    };
    let totalVotes = 0;
    boothStats.forEach((s) => {
      if (sentimentCounts.hasOwnProperty(s._id)) {
        sentimentCounts[s._id] = s.count;
      }
      totalVotes += s.totalVotes || 0;
    });
    const totalBooths = Object.values(sentimentCounts).reduce((a, b) => a + b, 0);

    // Process flippable stats
    const flippableStats = flippableBoothsData[0] || { count: 0, totalGapToFlip: 0 };

    // Process winner/runner-up
    const winner2021 = summary?.winner2021 || summary?.electionResults?.[2021]?.[0];
    const runnerUp2021 = summary?.runnerUp2021 || summary?.electionResults?.[2021]?.[1];
    const isOurPartyWinner = winner2021?.party === 'AIADMK';
    const ourParty = isOurPartyWinner ? winner2021 : runnerUp2021;
    const opponent = isOurPartyWinner ? runnerUp2021 : winner2021;
    const margin = winner2021 && runnerUp2021 ? winner2021.votes - runnerUp2021.votes : 0;
    const acName = summary?.acName || `AC ${acId}`;

    // Process margin distribution
    const marginDistribution = {
      'Lost by 500+': 0,
      'Lost by 101-500': 0,
      'Lost by 51-100': 0,
      'Lost by 0-50': 0,
      'Won by 0-50': 0,
      'Won by 51-100': 0,
      'Won by 101-500': 0,
      'Won by 500+': 0,
    };

    // Process booth size distribution
    let lessThan500 = 0, from500to1000 = 0, from1000to1500 = 0, moreThan1500 = 0;

    allBooths.forEach((b) => {
      // Margin distribution
      const boothMargin = b.margin || 0;
      const absMargin = Math.abs(boothMargin);
      if (boothMargin >= 0) {
        if (absMargin <= 50) marginDistribution['Won by 0-50']++;
        else if (absMargin <= 100) marginDistribution['Won by 51-100']++;
        else if (absMargin <= 500) marginDistribution['Won by 101-500']++;
        else marginDistribution['Won by 500+']++;
      } else {
        if (absMargin <= 50) marginDistribution['Lost by 0-50']++;
        else if (absMargin <= 100) marginDistribution['Lost by 51-100']++;
        else if (absMargin <= 500) marginDistribution['Lost by 101-500']++;
        else marginDistribution['Lost by 500+']++;
      }

      // Booth size distribution
      const votes = b.totalVotes || 0;
      if (votes < 500) lessThan500++;
      else if (votes < 1000) from500to1000++;
      else if (votes < 1500) from1000to1500++;
      else moreThan1500++;
    });

    // Process voter gender (2021 election view)
    let genderDistribution;
    if (voterCount > 0) {
      const genderMap = { male: 0, female: 0, others: 0 };
      voterGenderStats.forEach((g) => {
        const gender = (g._id || '').toLowerCase().trim();
        if (gender === 'm' || gender === 'male') genderMap.male = g.count;
        else if (gender === 'f' || gender === 'female') genderMap.female = g.count;
        else if (gender && gender !== '') genderMap.others += g.count;
      });
      const knownGenderTotal = genderMap.male + genderMap.female + genderMap.others;
      genderDistribution = {
        male: {
          count: genderMap.male,
          percentage: knownGenderTotal > 0 ? parseFloat(((genderMap.male / knownGenderTotal) * 100).toFixed(1)) : 0,
        },
        female: {
          count: genderMap.female,
          percentage: knownGenderTotal > 0 ? parseFloat(((genderMap.female / knownGenderTotal) * 100).toFixed(1)) : 0,
        },
        transgender: {
          count: genderMap.others,
          percentage: knownGenderTotal > 0 ? parseFloat(((genderMap.others / knownGenderTotal) * 100).toFixed(2)) : 0,
        },
        total: knownGenderTotal,
        note: 'Based on actual voter data',
      };
    } else {
      // Fallback estimated
      genderDistribution = {
        male: { count: Math.round(totalVotes * 0.48), percentage: 48 },
        female: { count: Math.round(totalVotes * 0.50), percentage: 50 },
        transgender: { count: Math.round(totalVotes * 0.02), percentage: 2 },
        total: totalVotes,
        note: 'Estimated based on regional demographics',
      };
    }

    // Process SIR stats (current voter roll)
    let currentVoterStats = { available: false };
    if (voterCount > 0 && sirStats[0]) {
      const result = sirStats[0];
      const activeCount = result.active[0]?.count || 0;
      const removedCount = result.removed[0]?.count || 0;
      const newCount = result.newVoters[0]?.count || 0;
      const boothCount = result.booths[0]?.count || 0;

      const genderMap = { male: 0, female: 0, others: 0 };
      result.gender.forEach((g) => {
        const gender = (g._id || '').toLowerCase().trim();
        if (gender === 'm' || gender === 'male') genderMap.male = g.count;
        else if (gender === 'f' || gender === 'female') genderMap.female = g.count;
        else if (gender && gender !== '') genderMap.others += g.count;
      });
      const knownGenderTotal = genderMap.male + genderMap.female + genderMap.others;

      currentVoterStats = {
        available: true,
        totalBooths: boothCount,
        activeVoters: activeCount,
        removedVoters: removedCount,
        newVoters: newCount,
        totalInDB: voterCount,
        genderDistribution: {
          male: {
            count: genderMap.male,
            percentage: knownGenderTotal > 0 ? parseFloat(((genderMap.male / knownGenderTotal) * 100).toFixed(1)) : 0,
          },
          female: {
            count: genderMap.female,
            percentage: knownGenderTotal > 0 ? parseFloat(((genderMap.female / knownGenderTotal) * 100).toFixed(1)) : 0,
          },
          others: {
            count: genderMap.others,
            percentage: knownGenderTotal > 0 ? parseFloat(((genderMap.others / knownGenderTotal) * 100).toFixed(2)) : 0,
          },
        },
      };
    }

    // Get priority targets (top 10 flippable booths)
    const flippableBooths = await boothResults.find({
      acId,
      sentiment: 'flippable',
    })
      .sort({ gapToFlip: 1 })
      .limit(10)
      .toArray();

    const priorityTargets = flippableBooths.map((b) => ({
      boothNo: b.boothNo,
      boothName: b.boothName || `Booth ${b.boothNo}`,
      ourVoteSharePercent: b.ourParty?.voteSharePercent || 0,
      margin: {
        votes: Math.abs(b.margin || 0),
        percent: Math.abs(b.marginPercent || 0),
      },
      gapToFlip: b.gapToFlip || 0,
      totalVoters: b.totalVotes || 0,
      reason: `Lost by ${Math.abs(b.margin || 0)} votes - need ${b.gapToFlip || 0} more votes to flip`,
    }));

    const totalFlippable = await boothResults.countDocuments({ acId, sentiment: 'flippable' });

    const stats = {
      acId,
      overview: {
        ac: {
          id: acId,
          name: acName,
          district: summary?.district || 'Coimbatore',
        },
        stats: {
          totalBooths,
          totalVoters: totalVotes,
          avgVotersPerBooth: totalBooths > 0 ? Math.round(totalVotes / totalBooths) : 0,
        },
        lastElection: {
          year: 2021,
          result: isOurPartyWinner ? 'won' : 'lost',
          margin: isOurPartyWinner ? margin : -margin,
          marginPercent: totalVotes > 0 ? parseFloat((Math.abs(margin) / totalVotes * 100).toFixed(2)) : 0,
          ourParty: {
            name: 'AIADMK',
            votes: ourParty?.votes || 0,
            voteSharePercent: ourParty?.voteShare || 0,
          },
          opponent: {
            name: opponent?.party || 'DMK',
            votes: opponent?.votes || 0,
            voteSharePercent: opponent?.voteShare || 0,
          },
        },
        boothSentiment: {
          favorable: {
            count: sentimentCounts.favorable,
            percentage: totalBooths > 0 ? Math.round((sentimentCounts.favorable / totalBooths) * 100) : 0,
          },
          negative: {
            count: sentimentCounts.negative,
            percentage: totalBooths > 0 ? Math.round((sentimentCounts.negative / totalBooths) * 100) : 0,
          },
          balanced: {
            count: sentimentCounts.balanced,
            percentage: totalBooths > 0 ? Math.round((sentimentCounts.balanced / totalBooths) * 100) : 0,
          },
          flippable: {
            count: sentimentCounts.flippable,
            percentage: totalBooths > 0 ? Math.round((sentimentCounts.flippable / totalBooths) * 100) : 0,
          },
        },
        flippableBooths: {
          count: flippableStats.count,
          totalGapToFlip: flippableStats.totalGapToFlip,
          avgGapPerBooth: flippableStats.count > 0 ? Math.round(flippableStats.totalGapToFlip / flippableStats.count) : 0,
        },
        predictedTurnout2026: summary?.predictedTurnout2026 || null,
      },
      genderDistribution,
      marginDistribution: {
        distribution: [
          { range: 'Lost by 500+', count: marginDistribution['Lost by 500+'], type: 'lost' },
          { range: 'Lost by 101-500', count: marginDistribution['Lost by 101-500'], type: 'lost' },
          { range: 'Lost by 51-100', count: marginDistribution['Lost by 51-100'], type: 'lost' },
          { range: 'Lost by 0-50', count: marginDistribution['Lost by 0-50'], type: 'lost' },
          { range: 'Won by 0-50', count: marginDistribution['Won by 0-50'], type: 'won' },
          { range: 'Won by 51-100', count: marginDistribution['Won by 51-100'], type: 'won' },
          { range: 'Won by 101-500', count: marginDistribution['Won by 101-500'], type: 'won' },
          { range: 'Won by 500+', count: marginDistribution['Won by 500+'], type: 'won' },
        ],
        totalBooths: allBooths.length,
      },
      boothSizeDistribution: {
        distribution: [
          { range: '< 500 voters', count: lessThan500, percentage: allBooths.length > 0 ? Math.round((lessThan500 / allBooths.length) * 100) : 0 },
          { range: '500-1000 voters', count: from500to1000, percentage: allBooths.length > 0 ? Math.round((from500to1000 / allBooths.length) * 100) : 0 },
          { range: '1000-1500 voters', count: from1000to1500, percentage: allBooths.length > 0 ? Math.round((from1000to1500 / allBooths.length) * 100) : 0 },
          { range: '> 1500 voters', count: moreThan1500, percentage: allBooths.length > 0 ? Math.round((moreThan1500 / allBooths.length) * 100) : 0 },
        ],
        totalBooths: allBooths.length,
      },
      currentVoterStats,
      priorityTargets,
      prioritySummary: {
        totalFlippable,
        totalGapToFlip: flippableStats.totalGapToFlip,
        avgGapPerBooth: totalFlippable > 0 ? Math.round(flippableStats.totalGapToFlip / totalFlippable) : 0,
      },
      computedAt: new Date(),
      computeDurationMs: Date.now() - startTime,
    };

    return stats;
  } catch (error) {
    logger.error({ acId, error: error.message }, '[MLAPrecomputed] Error computing stats for AC');
    return null;
  }
}

/**
 * Save MLA pre-computed stats to database
 * Uses native MongoDB driver to avoid Mongoose schema validation issues
 */
export async function saveMLAPrecomputedStats(stats) {
  if (!stats) return null;

  try {
    // Use native MongoDB driver to bypass Mongoose schema validation
    const db = mongoose.connection.db;
    const result = await db.collection('mlaprecomputedstats').findOneAndUpdate(
      { acId: stats.acId },
      { $set: stats },
      { upsert: true, returnDocument: 'after' }
    );
    return result;
  } catch (error) {
    logger.error({ acId: stats.acId, error: error.message }, '[MLAPrecomputed] Error saving stats for AC');
    return null;
  }
}

/**
 * Get MLA pre-computed stats for an AC
 * Uses native MongoDB driver for consistency with save function
 */
export async function getMLAPrecomputedStats(acId, maxAgeMs = 15 * 60 * 1000) {
  try {
    const db = mongoose.connection.db;
    const stats = await db.collection('mlaprecomputedstats').findOne({ acId });

    if (!stats) {
      return null;
    }

    // Check if stats are fresh enough
    const age = Date.now() - new Date(stats.computedAt).getTime();
    if (age > maxAgeMs) {
      return { ...stats, isStale: true };
    }

    return { ...stats, isStale: false };
  } catch (error) {
    logger.error({ acId, error: error.message }, '[MLAPrecomputed] Error getting stats for AC');
    return null;
  }
}

// MLA-specific AC IDs - all ACs (auto-skips ACs without polling data)
const MLA_AC_IDS = [101, 102, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126];

/**
 * Compute and save MLA stats for all ACs with polling data
 */
export async function computeAllMLAStats() {
  logger.info('[MLAPrecomputed] Starting MLA stats computation...');
  const startTime = Date.now();

  const results = { success: 0, failed: 0, skipped: 0 };

  for (const acId of MLA_AC_IDS) {
    try {
      const stats = await computeMLAStatsForAC(acId);
      if (stats) {
        await saveMLAPrecomputedStats(stats);
        logger.info({ acId, booths: stats.overview.stats.totalBooths, durationMs: stats.computeDurationMs }, '[MLAPrecomputed] AC stats computed');
        results.success++;
      } else {
        results.skipped++;
      }
    } catch (error) {
      logger.error({ acId, error: error.message }, '[MLAPrecomputed] AC computation failed');
      results.failed++;
    }

    // Small delay between ACs
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  const totalDuration = Date.now() - startTime;
  logger.info({ success: results.success, failed: results.failed, skipped: results.skipped, durationSec: Math.round(totalDuration/1000) }, '[MLAPrecomputed] Computation completed');

  return { ...results, totalDurationMs: totalDuration };
}

// Background job management
let mlaStatsInterval = null;

export function startMLAStatsComputeJob(intervalMs = 10 * 60 * 1000) {
  if (mlaStatsInterval) {
    logger.info('[MLAPrecomputed] Job already running');
    return;
  }

  logger.info({ intervalSec: intervalMs / 1000 }, '[MLAPrecomputed] Starting background job');

  // Run immediately on startup (after 45s delay)
  setTimeout(() => {
    computeAllMLAStats().catch(err => logger.error({ error: err.message }, '[MLAPrecomputed] Initial computation failed'));
  }, 45000);

  // Then run periodically
  mlaStatsInterval = setInterval(() => {
    computeAllMLAStats().catch(err => logger.error({ error: err.message }, '[MLAPrecomputed] Periodic computation failed'));
  }, intervalMs);

  return mlaStatsInterval;
}

export function stopMLAStatsComputeJob() {
  if (mlaStatsInterval) {
    clearInterval(mlaStatsInterval);
    mlaStatsInterval = null;
    logger.info('[MLAPrecomputed] Background job stopped');
  }
}

export default {
  computeMLAStatsForAC,
  saveMLAPrecomputedStats,
  getMLAPrecomputedStats,
  computeAllMLAStats,
  startMLAStatsComputeJob,
  stopMLAStatsComputeJob,
  MLAPrecomputedStats,
  MLA_AC_IDS,
};
