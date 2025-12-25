/**
 * MLA Dashboard Routes
 * APIs for MLA War Room Dashboard
 *
 * Updated to work with imported polling data
 */

import express from 'express';
import mongoose from 'mongoose';
import { isAuthenticated, hasRole } from '../../middleware/auth.js';
import { getMLAPrecomputedStats } from '../../utils/mlaPrecomputedStats.js';

const router = express.Router();

// Apply authentication to all MLA routes - only MLA users can access
router.use(isAuthenticated);
router.use(hasRole('MLA', 'L0', 'L1')); // MLA, Super Admin, and ACIM can access

// Middleware to validate AC access for MLA users
router.use('/:acId/*', (req, res, next) => {
  const acId = Number(req.params.acId);
  const user = req.user;

  // MLA users can only access their assigned AC
  if (user.role === 'MLA' && user.assignedAC !== acId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only view your assigned AC.',
    });
  }

  next();
});

// Helper to get collections directly
const getCollections = () => {
  const db = mongoose.connection.db;
  return {
    boothResults: db.collection('mla_booth_results'),
    electionSummary: db.collection('mla_election_summary'),
  };
};

// Helper to get dynamic voter collection (voters_XXX format)
const getVoterCollection = (acId) => {
  return mongoose.connection.db.collection(`voters_${acId}`);
};

// Helper to convert MLA booth number to voter collection format
// MLA uses: "1", "1A", "10" etc.
// Voters use: "ac120001", "ac1200010" etc. (ac + acId + paddedBoothNo)
const getVoterBoothNumber = (acId, boothNo) => {
  // Extract numeric part from boothNo (e.g., "1A" -> "1", "10" -> "10")
  const numericPart = String(boothNo).replace(/[^0-9]/g, '');
  if (!numericPart) return null;
  // Pad to 3 digits and prepend with ac + acId
  const paddedNum = numericPart.padStart(3, '0');
  return `ac${acId}${paddedNum}`;
};

/**
 * GET /api/mla-dashboard/:acId/overview
 * Returns AC overview with stats, last election result, booth sentiment
 * Uses cached data if available (refreshed every 10 minutes)
 */
router.get('/:acId/overview', async (req, res) => {
  try {
    const acId = Number(req.params.acId);

    // Try to use cached data first
    const cached = await getMLAPrecomputedStats(acId);
    if (cached && cached.overview && !cached.isStale) {
      return res.json(cached.overview);
    }

    // Fall back to live query if cache is not available or stale
    const { boothResults, electionSummary } = getCollections();

    // Get AC summary from historical data
    const summary = await electionSummary.findOne({ acId });

    // Get booth stats from booth results
    const boothStats = await boothResults.aggregate([
      { $match: { acId } },
      {
        $group: {
          _id: '$sentiment',
          count: { $sum: 1 },
          totalVotes: { $sum: '$totalVotes' },
        },
      },
    ]).toArray();

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

    // Get flippable booth details for gap calculation
    const flippableBoothsData = await boothResults.aggregate([
      { $match: { acId, sentiment: 'flippable' } },
      {
        $group: {
          _id: null,
          totalGapToFlip: { $sum: '$gapToFlip' },
          count: { $sum: 1 },
        },
      },
    ]).toArray();

    const flippableStats = flippableBoothsData[0] || { count: 0, totalGapToFlip: 0 };

    // Get winner and runner-up from summary or calculate from booth data
    const winner2021 = summary?.winner2021 || summary?.electionResults?.[2021]?.[0];
    const runnerUp2021 = summary?.runnerUp2021 || summary?.electionResults?.[2021]?.[1];

    // Determine if AIADMK won
    const isOurPartyWinner = winner2021?.party === 'AIADMK';
    const ourParty = isOurPartyWinner ? winner2021 : runnerUp2021;
    const opponent = isOurPartyWinner ? runnerUp2021 : winner2021;

    const margin = winner2021 && runnerUp2021 ? winner2021.votes - runnerUp2021.votes : 0;

    // Get AC name from summary or booth data
    const acName = summary?.acName || (await boothResults.findOne({ acId }))?.acName || `AC ${acId}`;

    const response = {
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
      historicalData: summary?.historicalVoteShares || null,
      leadingSummary: summary?.leadingSummary || null,
    };

    res.json(response);
  } catch (error) {
    console.error('Error in overview API:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * GET /api/mla-dashboard/:acId/gender-distribution
 * Returns gender breakdown for AC
 * Uses cached data if available, otherwise live query
 */
router.get('/:acId/gender-distribution', async (req, res) => {
  try {
    const acId = Number(req.params.acId);

    // Try to use cached data first
    const cached = await getMLAPrecomputedStats(acId);
    if (cached && cached.genderDistribution && !cached.isStale) {
      // Return in same format as live query
      return res.json({
        genderDistribution: {
          male: cached.genderDistribution.male,
          female: cached.genderDistribution.female,
          transgender: cached.genderDistribution.transgender,
        },
        total: cached.genderDistribution.total,
        note: cached.genderDistribution.note,
      });
    }

    // Fall back to live query
    const { boothResults } = getCollections();
    const voterCollection = getVoterCollection(acId);

    // Try to get actual voter data first
    const voterCount = await voterCollection.countDocuments();

    if (voterCount > 0) {
      // Use actual voter data
      const genderStats = await voterCollection.aggregate([
        {
          $group: {
            _id: '$gender',
            count: { $sum: 1 },
          },
        },
      ]).toArray();

      const genderMap = { male: 0, female: 0, others: 0 };
      genderStats.forEach((g) => {
        const gender = (g._id || '').toLowerCase().trim();
        if (gender === 'm' || gender === 'male') genderMap.male = g.count;
        else if (gender === 'f' || gender === 'female') genderMap.female = g.count;
        else if (gender && gender !== '') genderMap.others += g.count; // Only count non-empty values
        // Empty/null gender values are ignored (data quality issue)
      });

      // Calculate percentages based on voters with known gender
      const knownGenderTotal = genderMap.male + genderMap.female + genderMap.others;
      res.json({
        genderDistribution: {
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
        },
        total: knownGenderTotal,
        note: 'Based on actual voter data',
      });
    } else {
      // Fall back to estimated demographics from booth votes
      const totalStats = await boothResults.aggregate([
        { $match: { acId } },
        { $group: { _id: null, totalVotes: { $sum: '$totalVotes' } } },
      ]).toArray();

      const total = totalStats[0]?.totalVotes || 100000;
      const genderData = {
        male: Math.round(total * 0.48),
        female: Math.round(total * 0.50),
        transgender: Math.round(total * 0.02),
      };

      res.json({
        genderDistribution: {
          male: {
            count: genderData.male,
            percentage: 48,
          },
          female: {
            count: genderData.female,
            percentage: 50,
          },
          transgender: {
            count: genderData.transgender,
            percentage: 2,
          },
        },
        total,
        note: 'Estimated based on regional demographics (no voter data available)',
      });
    }
  } catch (error) {
    console.error('Error in gender distribution API:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * GET /api/mla-dashboard/:acId/booth-size-distribution
 * Returns booth size analysis
 * Uses cached data if available
 */
router.get('/:acId/booth-size-distribution', async (req, res) => {
  try {
    const acId = Number(req.params.acId);

    // Try to use cached data first
    const cached = await getMLAPrecomputedStats(acId);
    if (cached && cached.boothSizeDistribution && !cached.isStale) {
      return res.json({
        boothSizeDistribution: cached.boothSizeDistribution.distribution,
        totalBooths: cached.boothSizeDistribution.totalBooths,
      });
    }

    // Fall back to live query
    const { boothResults } = getCollections();

    const booths = await boothResults.find({ acId }).toArray();

    let lessThan500 = 0;
    let from500to1000 = 0;
    let from1000to1500 = 0;
    let moreThan1500 = 0;

    booths.forEach((b) => {
      const votes = b.totalVotes || 0;
      if (votes < 500) lessThan500++;
      else if (votes < 1000) from500to1000++;
      else if (votes < 1500) from1000to1500++;
      else moreThan1500++;
    });

    const total = booths.length;

    res.json({
      boothSizeDistribution: [
        { range: '< 500 voters', count: lessThan500, percentage: total > 0 ? Math.round((lessThan500 / total) * 100) : 0 },
        { range: '500-1000 voters', count: from500to1000, percentage: total > 0 ? Math.round((from500to1000 / total) * 100) : 0 },
        { range: '1000-1500 voters', count: from1000to1500, percentage: total > 0 ? Math.round((from1000to1500 / total) * 100) : 0 },
        { range: '> 1500 voters', count: moreThan1500, percentage: total > 0 ? Math.round((moreThan1500 / total) * 100) : 0 },
      ],
      totalBooths: total,
    });
  } catch (error) {
    console.error('Error in booth size distribution API:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * GET /api/mla-dashboard/:acId/margin-distribution
 * Returns victory margin distribution across booths
 * Uses cached data if available
 */
router.get('/:acId/margin-distribution', async (req, res) => {
  try {
    const acId = Number(req.params.acId);

    // Try to use cached data first
    const cached = await getMLAPrecomputedStats(acId);
    if (cached && cached.marginDistribution && !cached.isStale) {
      return res.json({
        marginDistribution: cached.marginDistribution.distribution,
        totalBooths: cached.marginDistribution.totalBooths,
      });
    }

    // Fall back to live query
    const { boothResults } = getCollections();

    const booths = await boothResults.find({ acId }).toArray();

    const distribution = {
      'Lost by 500+': 0,
      'Lost by 101-500': 0,
      'Lost by 51-100': 0,
      'Lost by 0-50': 0,
      'Won by 0-50': 0,
      'Won by 51-100': 0,
      'Won by 101-500': 0,
      'Won by 500+': 0,
    };

    booths.forEach((b) => {
      const margin = b.margin || 0; // Positive = won, negative = lost
      const absMargin = Math.abs(margin);

      if (margin >= 0) {
        // Won
        if (absMargin <= 50) distribution['Won by 0-50']++;
        else if (absMargin <= 100) distribution['Won by 51-100']++;
        else if (absMargin <= 500) distribution['Won by 101-500']++;
        else distribution['Won by 500+']++;
      } else {
        // Lost
        if (absMargin <= 50) distribution['Lost by 0-50']++;
        else if (absMargin <= 100) distribution['Lost by 51-100']++;
        else if (absMargin <= 500) distribution['Lost by 101-500']++;
        else distribution['Lost by 500+']++;
      }
    });

    const marginDistribution = [
      { range: 'Lost by 500+', count: distribution['Lost by 500+'], type: 'lost' },
      { range: 'Lost by 101-500', count: distribution['Lost by 101-500'], type: 'lost' },
      { range: 'Lost by 51-100', count: distribution['Lost by 51-100'], type: 'lost' },
      { range: 'Lost by 0-50', count: distribution['Lost by 0-50'], type: 'lost' },
      { range: 'Won by 0-50', count: distribution['Won by 0-50'], type: 'won' },
      { range: 'Won by 51-100', count: distribution['Won by 51-100'], type: 'won' },
      { range: 'Won by 101-500', count: distribution['Won by 101-500'], type: 'won' },
      { range: 'Won by 500+', count: distribution['Won by 500+'], type: 'won' },
    ];

    res.json({ marginDistribution, totalBooths: booths.length });
  } catch (error) {
    console.error('Error in margin distribution API:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * GET /api/mla-dashboard/:acId/booths
 * Returns booth list with filters
 */
router.get('/:acId/booths', async (req, res) => {
  try {
    const acId = Number(req.params.acId);
    const { sentiment, sort = 'margin', order = 'asc', search, page = 1, limit = 20 } = req.query;
    const { boothResults } = getCollections();

    // Build query
    const query = { acId };

    if (sentiment && sentiment !== 'all') {
      query.sentiment = sentiment;
    }

    if (search) {
      query.$or = [
        { boothNo: { $regex: search, $options: 'i' } },
        { boothName: { $regex: search, $options: 'i' } },
      ];
    }

    // Build sort
    const sortOptions = {};
    if (sort === 'margin') {
      sortOptions.margin = order === 'desc' ? -1 : 1;
    } else if (sort === 'turnout') {
      sortOptions.turnoutPercent = order === 'desc' ? -1 : 1;
    } else if (sort === 'voters') {
      sortOptions.totalVotes = order === 'desc' ? -1 : 1;
    } else {
      sortOptions.boothNo = 1;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await boothResults.countDocuments(query);
    const booths = await boothResults.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit))
      .toArray();

    const boothList = booths.map((b) => {
      const ourParty = b.ourParty || {};
      const total = b.totalVotes || 0;

      return {
        boothNo: b.boothNo,
        boothName: b.boothName || `Booth ${b.boothNo}`,
        sentiment: b.sentiment,
        result: ourParty.isWinner ? 'won' : 'lost',
        ourVoteShare: {
          votes: ourParty.votes || 0,
          percent: ourParty.voteSharePercent || 0,
        },
        margin: {
          votes: Math.abs(b.margin || 0),
          percent: Math.abs(b.marginPercent || 0),
        },
        gapToFlip: b.gapToFlip || 0,
        totalVoters: b.totalVotes || 0,
        turnoutPercent: b.turnoutPercent || 0,
        winner: b.winner ? {
          party: b.winner.partyShort,
          votes: b.winner.votes,
          percent: b.winner.voteSharePercent,
        } : null,
        gender: {
          male: { count: Math.round(total * 0.48), percentage: 48 },
          female: { count: Math.round(total * 0.50), percentage: 50 },
          others: { count: Math.round(total * 0.02), percentage: 2 },
        },
      };
    });

    res.json({
      booths: boothList,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
      filters: {
        sentiment: sentiment || 'all',
        sort,
        order,
      },
    });
  } catch (error) {
    console.error('Error in booths API:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * GET /api/mla-dashboard/:acId/booth/:boothNo
 * Returns single booth detail
 * Uses actual voter data if available for demographics
 */
router.get('/:acId/booth/:boothNo', async (req, res) => {
  try {
    const acId = Number(req.params.acId);
    const { boothNo } = req.params;
    const { boothResults } = getCollections();
    const voterCollection = getVoterCollection(acId);

    const booth = await boothResults.findOne({ acId, boothNo });

    if (!booth) {
      return res.status(404).json({ message: 'Booth not found' });
    }

    const total = booth.totalVotes || 0;
    const ourParty = booth.ourParty || {};

    // Find opponent (if our party won, opponent is runner-up; if lost, opponent is winner)
    const opponent = ourParty.isWinner ? booth.runnerUp : booth.winner;

    // Try to get actual voter demographics for this booth
    let voterStats = {
      total,
      male: { count: Math.round(total * 0.48), percentage: 48 },
      female: { count: Math.round(total * 0.50), percentage: 50 },
      others: { count: Math.round(total * 0.02), percentage: 2 },
    };
    let ageDistribution = [
      { range: '18-25', count: Math.round(total * 0.20), percentage: 20 },
      { range: '26-35', count: Math.round(total * 0.25), percentage: 25 },
      { range: '36-45', count: Math.round(total * 0.25), percentage: 25 },
      { range: '46-60', count: Math.round(total * 0.18), percentage: 18 },
      { range: '60+', count: Math.round(total * 0.12), percentage: 12 },
    ];

    // Convert MLA booth number to voter collection format (e.g., "1" -> "ac120001")
    const voterBoothNo = getVoterBoothNumber(acId, boothNo);

    // Check if voter data exists for this booth
    const boothVoterCount = voterBoothNo ? await voterCollection.countDocuments({ boothno: voterBoothNo }) : 0;

    if (boothVoterCount > 0) {
      // Get gender distribution from actual voter data
      const genderStats = await voterCollection.aggregate([
        { $match: { boothno: voterBoothNo } },
        { $group: { _id: '$gender', count: { $sum: 1 } } },
      ]).toArray();

      const genderMap = { male: 0, female: 0, others: 0 };
      genderStats.forEach((g) => {
        const gender = (g._id || '').toLowerCase().trim();
        if (gender === 'm' || gender === 'male') genderMap.male = g.count;
        else if (gender === 'f' || gender === 'female') genderMap.female = g.count;
        else if (gender && gender !== '') genderMap.others += g.count; // Only count non-empty values
      });

      const knownGenderTotal = genderMap.male + genderMap.female + genderMap.others;
      voterStats = {
        total: boothVoterCount,
        male: { count: genderMap.male, percentage: knownGenderTotal > 0 ? parseFloat(((genderMap.male / knownGenderTotal) * 100).toFixed(1)) : 0 },
        female: { count: genderMap.female, percentage: knownGenderTotal > 0 ? parseFloat(((genderMap.female / knownGenderTotal) * 100).toFixed(1)) : 0 },
        others: { count: genderMap.others, percentage: knownGenderTotal > 0 ? parseFloat(((genderMap.others / knownGenderTotal) * 100).toFixed(2)) : 0 },
      };

      // Get age distribution from actual voter data
      const ageStats = await voterCollection.aggregate([
        { $match: { boothno: voterBoothNo } },
        {
          $bucket: {
            groupBy: '$age',
            boundaries: [18, 26, 36, 46, 61, 150],
            default: 'unknown',
            output: { count: { $sum: 1 } },
          },
        },
      ]).toArray();

      const ageRanges = ['18-25', '26-35', '36-45', '46-60', '60+'];
      const ageBuckets = [18, 26, 36, 46, 61];
      ageDistribution = ageRanges.map((range, i) => {
        const bucket = ageStats.find((a) => a._id === ageBuckets[i]);
        const count = bucket?.count || 0;
        return {
          range,
          count,
          percentage: voterTotal > 0 ? Math.round(count / voterTotal * 100) : 0,
        };
      });
    }

    const response = {
      booth: {
        boothNo: booth.boothNo,
        boothName: booth.boothName || `Booth ${booth.boothNo}`,
        acId: booth.acId,
        acName: booth.acName,
        sentiment: booth.sentiment,
      },
      electionResult: {
        year: booth.year,
        result: ourParty.isWinner ? 'won' : 'lost',
        totalVotes: booth.totalVotes,
        turnoutPercent: booth.turnoutPercent || 0,
        ourParty: {
          name: ourParty.partyShort || 'AIADMK',
          votes: ourParty.votes || 0,
          voteSharePercent: ourParty.voteSharePercent || 0,
        },
        opponent: opponent ? {
          name: opponent.partyShort,
          votes: opponent.votes,
          voteSharePercent: opponent.voteSharePercent,
        } : null,
        margin: {
          votes: Math.abs(booth.margin || 0),
          percent: Math.abs(booth.marginPercent || 0),
        },
        gapToFlip: booth.gapToFlip || 0,
      },
      voterStats,
      ageDistribution,
      allPartyResults: (booth.results || []).map((r) => ({
        party: r.partyShort,
        candidate: r.candidate,
        votes: r.votes,
        voteSharePercent: r.voteSharePercent,
      })),
    };

    res.json(response);
  } catch (error) {
    console.error('Error in booth detail API:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * GET /api/mla-dashboard/:acId/priority-targets
 * Returns flippable booths (lost by narrow margin)
 * Uses cached data if available (for default limit)
 */
router.get('/:acId/priority-targets', async (req, res) => {
  try {
    const acId = Number(req.params.acId);
    const { limit = 10 } = req.query;

    // Try to use cached data for default limit (10 or less)
    if (Number(limit) <= 10) {
      const cached = await getMLAPrecomputedStats(acId);
      if (cached && cached.priorityTargets && !cached.isStale) {
        return res.json({
          priorityTargets: cached.priorityTargets.slice(0, Number(limit)),
          summary: {
            totalFlippable: cached.prioritySummary.totalFlippable,
            totalGapToFlip: cached.prioritySummary.totalGapToFlip,
            avgGapPerBooth: cached.prioritySummary.avgGapPerBooth,
            potentialBoothGain: cached.prioritySummary.totalFlippable,
          },
        });
      }
    }

    // Fall back to live query
    const { boothResults } = getCollections();

    // Get flippable booths sorted by gap to flip (ascending)
    const flippableBooths = await boothResults.find({
      acId,
      
      sentiment: 'flippable',
    })
      .sort({ gapToFlip: 1 })
      .limit(Number(limit))
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

    // Calculate totals
    const totalGapToFlip = flippableBooths.reduce((sum, b) => sum + (b.gapToFlip || 0), 0);
    const totalFlippable = await boothResults.countDocuments({
      acId,
      
      sentiment: 'flippable',
    });

    res.json({
      priorityTargets,
      summary: {
        totalFlippable,
        totalGapToFlip,
        avgGapPerBooth: totalFlippable > 0 ? Math.round(totalGapToFlip / totalFlippable) : 0,
        potentialBoothGain: totalFlippable,
      },
    });
  } catch (error) {
    console.error('Error in priority targets API:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * GET /api/mla-dashboard/:acId/historical-trends
 * Returns historical election data for charts
 */
router.get('/:acId/historical-trends', async (req, res) => {
  try {
    const acId = Number(req.params.acId);
    const { electionSummary } = getCollections();

    const summary = await electionSummary.findOne({ acId });
    if (!summary) {
      return res.status(404).json({ message: 'AC data not found' });
    }

    // Parse historical data - use historicalVoteShares from imported data
    const historicalVoteShares = summary.historicalVoteShares || {};
    const electionResults = summary.electionResults || {};

    // Build trend data from historicalVoteShares structure
    const years = [2009, 2011, 2014, 2016, 2019, 2021];
    const partyTrends = {
      AIADMK: [],
      DMK: [],
      others: [],
    };

    years.forEach((year) => {
      const yearData = historicalVoteShares[year];
      if (yearData) {
        // Handle various AIADMK naming (AIADMK, ADMK, etc.)
        const aiadmkShare = yearData.AIADMK || yearData.ADMK || 0;
        const dmkShare = yearData.DMK || 0;
        const electionType = yearData.type || 'Assembly';

        partyTrends.AIADMK.push({
          year,
          voteShare: aiadmkShare,
          type: electionType,
        });
        partyTrends.DMK.push({
          year,
          voteShare: dmkShare,
          type: electionType,
        });
        // Sum up other parties
        const othersShare = Object.entries(yearData)
          .filter(([party]) => !['AIADMK', 'ADMK', 'DMK', 'type'].includes(party))
          .reduce((sum, [, share]) => sum + (typeof share === 'number' ? share : 0), 0);
        partyTrends.others.push({
          year,
          voteShare: othersShare,
          type: electionType,
        });
      }
    });

    // Get candidate history from electionResults
    const candidateHistory = [];
    Object.entries(electionResults).forEach(([year, candidates]) => {
      if (Array.isArray(candidates) && candidates.length > 0) {
        candidateHistory.push({
          year: parseInt(year),
          candidates: candidates.slice(0, 3).map((c) => ({
            name: c.candidate,
            party: c.party,
            votes: c.votes,
            voteShare: c.voteShare,
          })),
        });
      }
    });

    res.json({
      acId,
      acName: summary.acName,
      partyTrends,
      candidateHistory: candidateHistory.sort((a, b) => b.year - a.year),
      leadingSummary: summary.leadingSummary || '',
    });
  } catch (error) {
    console.error('Error in historical trends API:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * GET /api/mla-dashboard/:acId/competitor-analysis
 * Returns detailed competitor party analysis
 */
router.get('/:acId/competitor-analysis', async (req, res) => {
  try {
    const acId = Number(req.params.acId);
    const { boothResults } = getCollections();

    // Aggregate party performance across all booths
    const partyStats = await boothResults.aggregate([
      { $match: { acId } },
      { $unwind: '$results' },
      {
        $group: {
          _id: '$results.partyShort',
          totalVotes: { $sum: '$results.votes' },
          avgVoteShare: { $avg: '$results.voteSharePercent' },
          boothsContested: { $sum: 1 },
          boothsWon: {
            $sum: {
              $cond: [{ $eq: ['$winner.partyShort', '$results.partyShort'] }, 1, 0],
            },
          },
        },
      },
      { $sort: { totalVotes: -1 } },
    ]).toArray();

    const totalVotes = partyStats.reduce((sum, p) => sum + p.totalVotes, 0);

    const competitors = partyStats.map((p) => ({
      party: p._id,
      totalVotes: p.totalVotes,
      voteSharePercent: totalVotes > 0 ? parseFloat(((p.totalVotes / totalVotes) * 100).toFixed(2)) : 0,
      avgBoothVoteShare: parseFloat(p.avgVoteShare.toFixed(2)),
      boothsContested: p.boothsContested,
      boothsWon: p.boothsWon,
      winRate: p.boothsContested > 0 ? parseFloat(((p.boothsWon / p.boothsContested) * 100).toFixed(1)) : 0,
    }));

    res.json({
      acId,
      totalVotes,
      competitors,
      ourParty: competitors.find((c) => c.party === 'AIADMK') || null,
      mainOpponent: competitors.find((c) => c.party === 'DMK') || null,
    });
  } catch (error) {
    console.error('Error in competitor analysis API:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * GET /api/mla-dashboard/:acId/current-voter-stats
 * Returns current voter roll statistics from SIR data
 * Shows: active voters, removed voters, new voters, gender breakdown
 * Uses cached data if available
 */
router.get('/:acId/current-voter-stats', async (req, res) => {
  try {
    const acId = Number(req.params.acId);

    // Try to use cached data first
    const cached = await getMLAPrecomputedStats(acId);
    if (cached && cached.currentVoterStats && !cached.isStale) {
      return res.json({
        available: cached.currentVoterStats.available,
        currentVoterRoll: cached.currentVoterStats.available ? {
          totalBooths: cached.currentVoterStats.totalBooths,
          activeVoters: cached.currentVoterStats.activeVoters,
          removedVoters: cached.currentVoterStats.removedVoters,
          newVoters: cached.currentVoterStats.newVoters,
          totalInDB: cached.currentVoterStats.totalInDB,
          genderDistribution: cached.currentVoterStats.genderDistribution,
        } : undefined,
        note: 'Current voter roll based on latest SIR data (cached)',
      });
    }

    // Fall back to live query
    const voterCollection = getVoterCollection(acId);

    // Check if voter data exists
    const totalVoters = await voterCollection.countDocuments();
    if (totalVoters === 0) {
      return res.json({
        available: false,
        message: 'No voter data available for this AC',
      });
    }

    // Get comprehensive stats in a single aggregation
    const stats = await voterCollection.aggregate([
      {
        $facet: {
          // Active voters count
          active: [
            { $match: { isActive: { $ne: false } } },
            { $count: 'count' }
          ],
          // Removed voters count
          removed: [
            { $match: { isActive: false } },
            { $count: 'count' }
          ],
          // New voters from SIR
          newVoters: [
            { $match: { $or: [{ isNewFromSir: true }, { currentSirStatus: 'new' }] } },
            { $count: 'count' }
          ],
          // Gender distribution (active only)
          gender: [
            { $match: { isActive: { $ne: false } } },
            { $group: { _id: '$gender', count: { $sum: 1 } } }
          ],
          // Booth count (active only)
          booths: [
            { $match: { isActive: { $ne: false } } },
            { $group: { _id: '$boothno' } },
            { $count: 'count' }
          ]
        }
      }
    ]).toArray();

    const result = stats[0];
    const activeCount = result.active[0]?.count || 0;
    const removedCount = result.removed[0]?.count || 0;
    const newCount = result.newVoters[0]?.count || 0;
    const boothCount = result.booths[0]?.count || 0;

    // Process gender stats
    const genderMap = { male: 0, female: 0, others: 0 };
    result.gender.forEach((g) => {
      const gender = (g._id || '').toLowerCase().trim();
      if (gender === 'm' || gender === 'male') genderMap.male = g.count;
      else if (gender === 'f' || gender === 'female') genderMap.female = g.count;
      else if (gender && gender !== '') genderMap.others += g.count; // Only count non-empty values as "others"
      // Empty/null gender values are ignored (data quality issue)
    });

    // Calculate percentages based on voters with known gender
    const knownGenderTotal = genderMap.male + genderMap.female + genderMap.others;

    res.json({
      available: true,
      currentVoterRoll: {
        totalBooths: boothCount,
        activeVoters: activeCount,
        removedVoters: removedCount,
        newVoters: newCount,
        totalInDB: totalVoters,
        genderDistribution: {
          male: {
            count: genderMap.male,
            percentage: knownGenderTotal > 0 ? parseFloat(((genderMap.male / knownGenderTotal) * 100).toFixed(1)) : 0
          },
          female: {
            count: genderMap.female,
            percentage: knownGenderTotal > 0 ? parseFloat(((genderMap.female / knownGenderTotal) * 100).toFixed(1)) : 0
          },
          others: {
            count: genderMap.others,
            percentage: knownGenderTotal > 0 ? parseFloat(((genderMap.others / knownGenderTotal) * 100).toFixed(2)) : 0
          }
        }
      },
      note: 'Current voter roll based on latest SIR data'
    });
  } catch (error) {
    console.error('Error in current voter stats API:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * GET /api/mla-dashboard/:acId/booths-sir-stats
 * Returns SIR statistics for all booths in an AC
 */
router.get('/:acId/booths-sir-stats', async (req, res) => {
  try {
    const acId = Number(req.params.acId);
    const voterCollection = getVoterCollection(acId);

    // Check if voter data exists
    const totalVoters = await voterCollection.countDocuments();
    if (totalVoters === 0) {
      return res.json({
        available: false,
        message: 'No voter data available for this AC',
      });
    }

    // Get booth-level stats using aggregation
    const boothStats = await voterCollection.aggregate([
      {
        $group: {
          _id: '$boothno',
          boothname: { $first: '$boothname_english' },
          boothnameTamil: { $first: '$boothname' },
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $ne: ['$isActive', false] }, 1, 0] } },
          removed: { $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] } },
          newVoters: { $sum: { $cond: [{ $or: [{ $eq: ['$isNewFromSir', true] }, { $eq: ['$currentSirStatus', 'new'] }] }, 1, 0] } },
          male: { $sum: { $cond: [{ $and: [{ $ne: ['$isActive', false] }, { $in: ['$gender', ['male', 'Male', 'm', 'M']] }] }, 1, 0] } },
          female: { $sum: { $cond: [{ $and: [{ $ne: ['$isActive', false] }, { $in: ['$gender', ['female', 'Female', 'f', 'F']] }] }, 1, 0] } },
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    const booths = boothStats.map(b => ({
      boothNo: b._id,
      boothName: b.boothname || b.boothnameTamil || `Booth ${b._id}`,
      activeVoters: b.active,
      removedVoters: b.removed,
      newVoters: b.newVoters,
      male: b.male,
      female: b.female,
      others: b.active - b.male - b.female,
    }));

    res.json({
      available: true,
      totalBooths: booths.length,
      booths,
    });
  } catch (error) {
    console.error('Error in booths SIR stats API:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * GET /api/mla-dashboard/:acId/booth/:boothNo/sir-stats
 * Returns SIR statistics for a specific booth
 */
router.get('/:acId/booth/:boothNo/sir-stats', async (req, res) => {
  try {
    const acId = Number(req.params.acId);
    const { boothNo } = req.params;
    const voterCollection = getVoterCollection(acId);

    // Try numeric boothno first
    let query = { boothno: parseInt(boothNo) };
    let count = await voterCollection.countDocuments(query);

    // If no results, try string boothno
    if (count === 0) {
      query = { boothno: boothNo };
      count = await voterCollection.countDocuments(query);
    }

    if (count === 0) {
      return res.json({
        available: false,
        message: `No voter data found for booth ${boothNo}`,
      });
    }

    // Get booth-level SIR stats
    const stats = await voterCollection.aggregate([
      { $match: query },
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
          boothInfo: [
            { $limit: 1 },
            { $project: { boothname: 1, boothname_english: 1 } }
          ]
        }
      }
    ]).toArray();

    const result = stats[0];
    const activeCount = result.active[0]?.count || 0;
    const removedCount = result.removed[0]?.count || 0;
    const newCount = result.newVoters[0]?.count || 0;
    const boothInfo = result.boothInfo[0] || {};

    // Process gender
    const genderMap = { male: 0, female: 0, others: 0 };
    result.gender.forEach((g) => {
      const gender = (g._id || '').toLowerCase().trim();
      if (gender === 'm' || gender === 'male') genderMap.male = g.count;
      else if (gender === 'f' || gender === 'female') genderMap.female = g.count;
      else if (gender && gender !== '') genderMap.others += g.count; // Only count non-empty values
    });

    res.json({
      available: true,
      boothNo,
      boothName: boothInfo.boothname_english || boothInfo.boothname || `Booth ${boothNo}`,
      sirStats: {
        activeVoters: activeCount,
        removedVoters: removedCount,
        newVoters: newCount,
        totalInDB: count,
        genderDistribution: {
          male: genderMap.male,
          female: genderMap.female,
          others: genderMap.others
        }
      }
    });
  } catch (error) {
    console.error('Error in booth SIR stats API:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * Analytics API Proxy Configuration
 * Proxies requests to the external analytics service at kural.digital
 */
const ANALYTICS_API_BASE = process.env.ANALYTICS_API_URL || 'https://kural.digital/api/v1';
const ANALYTICS_CREDENTIALS = {
  email: process.env.ANALYTICS_API_EMAIL || 'admin@kuralai.com',
  password: process.env.ANALYTICS_API_PASSWORD || 'kuraladmin@123',
};

// Mapping from AC IDs to Analytics API location IDs
const AC_TO_LOCATION_ID = {
  101: 26,  // Dharapuram
  102: 28,  // Kangayam
  108: 32,  // Udhagamandalam
  109: 27,  // Gudalur
  110: 34,  // Coonoor
  111: 41,  // Mettuppalayam
  112: 31,  // Avanashi
  113: 33,  // Tiruppur North
  114: 37,  // Tiruppur South
  115: 40,  // Palladam
  116: 39,  // Sulur
  117: 36,  // Kavundampalayam
  118: 44,  // Coimbatore North
  121: 43,  // Singanallur
  122: 35,  // Kinathukadavu
  123: 30,  // Pollachi
  124: 42,  // Valparai
  125: 29,  // Udumalaipettai
  126: 38,  // Madathukulam
};

// All Constituencies location ID (aggregated data)
const ALL_CONSTITUENCIES_LOCATION_ID = 45;

// Helper to get location_id from acId
// Currently using All Constituencies (45) as individual AC data is not available
const getLocationId = (acId) => ALL_CONSTITUENCIES_LOCATION_ID;

// Cache for analytics JWT token
let analyticsToken = null;
let tokenExpiry = null;

// Helper to get analytics API token
const getAnalyticsToken = async () => {
  // Return cached token if still valid (with 5 min buffer)
  if (analyticsToken && tokenExpiry && Date.now() < tokenExpiry - 300000) {
    return analyticsToken;
  }

  try {
    const response = await fetch(`${ANALYTICS_API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ANALYTICS_CREDENTIALS),
    });

    if (!response.ok) {
      throw new Error('Failed to authenticate with analytics API');
    }

    const responseData = await response.json();
    // Token is nested in responseData.data.access_token
    analyticsToken = responseData.data?.access_token || responseData.access_token || responseData.token;
    if (!analyticsToken) {
      throw new Error('No token received from analytics API');
    }
    // Set expiry based on expires_in or default to 1 hour
    const expiresIn = responseData.data?.expires_in || 3600;
    tokenExpiry = Date.now() + (expiresIn * 1000);
    return analyticsToken;
  } catch (error) {
    console.error('Analytics API auth error:', error);
    throw error;
  }
};

/**
 * GET /api/mla-dashboard/:acId/social-media/share-of-voice
 * Proxy to analytics API - Get mention share percentage per competitor
 */
router.get('/:acId/social-media/share-of-voice', async (req, res) => {
  try {
    const acId = Number(req.params.acId);
    const { time_range = '30d', start_date, end_date } = req.query;

    const token = await getAnalyticsToken();

    // Build query params - map acId to analytics API location_id
    const locationId = getLocationId(acId);
    const params = new URLSearchParams();
    params.append('time_range', time_range);
    params.append('location_id', locationId.toString());
    if (start_date) params.append('start_date', start_date);
    if (end_date) params.append('end_date', end_date);

    const response = await fetch(
      `${ANALYTICS_API_BASE}/analytics/share-of-voice?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        success: false,
        message: error.message || 'Failed to fetch share of voice data',
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error in share of voice proxy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch social media analytics',
      error: error.message,
    });
  }
});

/**
 * GET /api/mla-dashboard/:acId/social-media/sentiment-breakdown
 * Proxy to analytics API - Get sentiment distribution
 */
router.get('/:acId/social-media/sentiment-breakdown', async (req, res) => {
  try {
    const acId = Number(req.params.acId);
    const { time_range = '30d' } = req.query;

    const token = await getAnalyticsToken();

    // Map acId to analytics API location_id
    const locationId = getLocationId(acId);
    const params = new URLSearchParams();
    params.append('time_range', time_range);
    params.append('location_id', locationId.toString());

    const response = await fetch(
      `${ANALYTICS_API_BASE}/dashboard/sentiment-breakdown?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        success: false,
        message: error.message || 'Failed to fetch sentiment data',
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error in sentiment breakdown proxy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch social media analytics',
      error: error.message,
    });
  }
});

export default router;
