import express from "express";
import { connectToDatabase } from "../config/database.js";
import { buildAcQuery } from "../utils/helpers.js";
import {
  getVoterModel,
  countVoters,
  aggregateVoters,
  findOneVoter,
} from "../utils/voterCollection.js";
import {
  queryBoothAgentActivities,
  queryAllBoothAgentActivities,
  countBoothAgentActivities,
  countAllBoothAgentActivities,
} from "../utils/boothAgentActivityCollection.js";
import {
  queryMobileAppAnswers,
} from "../utils/mobileAppAnswerCollection.js";
import {
  querySurveyResponses,
} from "../utils/surveyResponseCollection.js";
import { isAuthenticated, canAccessAC } from "../middleware/auth.js";
import { getCache, setCache, cacheKeys, TTL } from "../utils/cache.js";
import { AC_NAMES, normalizeLocation } from "../utils/universalAdapter.js";
import { getPrecomputedStats, computeStatsForAC, savePrecomputedStats } from "../utils/precomputedStats.js";
import { dashboardRateLimiter } from "../middleware/rateLimit.js";
import { CACHE_CONFIG } from "../config/constants.js";

const router = express.Router();

// Apply authentication and rate limiting to all routes
router.use(isAuthenticated);
router.use(dashboardRateLimiter);

// Dashboard Statistics API - OPTIMIZED with pre-computed stats
// This version reads from pre-computed stats collection instead of running heavy aggregations
// Pre-computed stats are refreshed by background job every 5 minutes
router.get("/stats/:acId", async (req, res) => {
  try {
    await connectToDatabase();

    const rawIdentifier = req.params.acId ?? req.query.aciName ?? req.query.acName;

    // Parse AC ID
    const numericAcId = Number(rawIdentifier);
    if (!Number.isFinite(numericAcId)) {
      return res.status(400).json({ message: "Invalid AC identifier - must be numeric" });
    }

    const acId = numericAcId;

    // AC Isolation: Check if user can access this AC
    if (!canAccessAC(req.user, acId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have permission to view this AC's data."
      });
    }

    // OPTIMIZATION: Try to get pre-computed stats first (fast path)
    // This avoids running heavy aggregations on every request
    const precomputed = await getPrecomputedStats(acId, CACHE_CONFIG.precomputedStats); // 10 min max age

    if (precomputed && !precomputed.isStale) {
      // Return pre-computed stats (fast - single document read)
      const responseData = {
        acIdentifier: precomputed.acName || String(acId),
        acId: acId,
        acName: precomputed.acName || AC_NAMES[acId] || null,
        acNumber: acId,
        totalFamilies: precomputed.totalFamilies,
        totalMembers: precomputed.totalMembers,
        surveysCompleted: precomputed.surveysCompleted,
        totalBooths: precomputed.totalBooths,
        boothStats: precomputed.boothStats || [],
        _source: 'precomputed',
        _computedAt: precomputed.computedAt
      };
      return res.json(responseData);
    }

    // FALLBACK: Compute stats if pre-computed not available or stale
    // This path should rarely be hit once background job is running
    console.log(`[Dashboard] Computing stats for AC ${acId} (precomputed ${precomputed ? 'stale' : 'missing'})`);

    const VoterModel = getVoterModel(acId);

    // Get AC metadata
    const acMeta = await VoterModel.findOne({}, {
      aci_name: 1,
      ac_name: 1,
      aci_num: 1,
      aci_id: 1,
    }).lean().exec();

    const acName = acMeta?.aci_name ?? acMeta?.ac_name ?? AC_NAMES[acId] ?? null;

    // Run aggregations (this is the slow path)
    const [totalMembers, surveysCompleted, familiesAggregation, boothsAggregation, boothStats] = await Promise.all([
      countVoters(acId, {}),
      countVoters(acId, { surveyed: true }),
      aggregateVoters(acId, [
        { $match: { familyId: { $exists: true, $ne: null } } },
        { $group: { _id: "$familyId" } },
        { $count: "total" }
      ]),
      aggregateVoters(acId, [
        { $match: { booth_id: { $exists: true, $ne: null } } },
        { $group: { _id: "$booth_id" } },
        { $count: "total" }
      ]),
      aggregateVoters(acId, [
        { $match: {} },
        {
          $group: {
            _id: "$boothname",
            boothno: { $first: "$boothno" },
            booth_id: { $first: "$booth_id" },
            voters: { $sum: 1 }
          }
        },
        { $sort: { boothno: 1 } }
      ])
    ]);

    const totalFamilies = familiesAggregation[0]?.total || 0;
    const totalBooths = boothsAggregation[0]?.total || 0;

    const responseData = {
      acIdentifier: acName || String(acId),
      acId: acId,
      acName: acName,
      acNumber: acId,
      totalFamilies,
      totalMembers,
      surveysCompleted,
      totalBooths,
      boothStats: boothStats.map((booth) => ({
        boothNo: booth.boothno,
        boothName: booth._id,
        boothId: booth.booth_id,
        voters: booth.voters,
      })),
      _source: 'realtime'
    };

    // Save to pre-computed stats collection for next request (async, don't wait)
    savePrecomputedStats({
      acId,
      acName,
      totalMembers,
      totalFamilies,
      totalBooths,
      surveysCompleted,
      boothStats: responseData.boothStats,
      computedAt: new Date()
    }).catch(err => console.error(`[Dashboard] Failed to save precomputed stats: ${err.message}`));

    // Also cache in memory for immediate subsequent requests
    const cacheKey = cacheKeys.dashboardStats(acId);
    setCache(cacheKey, responseData, TTL.DASHBOARD_STATS);

    return res.json(responseData);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return res.status(500).json({ message: "Failed to fetch dashboard statistics" });
  }
});

// Booth Agent Activities API - fetch actual activity records from boothagentactivities_* collections
router.get("/booth-agent-activities", async (req, res) => {
  try {
    await connectToDatabase();

    const { acId, boothId, limit = 100, status } = req.query;
    const numericLimit = Math.min(Number(limit) || 100, 500);

    // Build query
    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    if (boothId && boothId !== 'all') {
      // Support both booth_id (e.g., "BOOTH1-111") and boothno (e.g., "BOOTH1") matching
      query.$or = [
        { booth_id: boothId },
        { boothno: boothId },
        { booth_id: { $regex: new RegExp(`^${boothId}`, 'i') } }
      ];
    }

    let activities = [];
    let total = 0;

    if (acId && acId !== 'all') {
      const numericAcId = Number(acId);
      if (!Number.isFinite(numericAcId)) {
        return res.status(400).json({ success: false, message: "Invalid AC ID" });
      }

      // AC Isolation: Check if user can access this AC
      if (!canAccessAC(req.user, numericAcId)) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You do not have permission to view this AC's data."
        });
      }

      activities = await queryBoothAgentActivities(numericAcId, query, {
        sort: { loginTime: -1 },
        limit: numericLimit,
      });
      total = await countBoothAgentActivities(numericAcId, query);
    } else {
      // L0 and L1 users can query all ACs, L2 must specify an AC
      if (req.user.role !== 'L0' && req.user.role !== 'L1') {
        return res.status(403).json({
          success: false,
          message: "Please select an AC to view activities"
        });
      }

      activities = await queryAllBoothAgentActivities(query, {
        sort: { loginTime: -1 },
        limit: numericLimit,
      });
      total = await countAllBoothAgentActivities(query);
    }

    // Normalize location data and add AC name
    const normalizedActivities = activities.map(activity => {
      const acIdValue = activity.aci_id || activity._acId;
      return {
        ...activity,
        id: activity._id?.toString(),
        acId: acIdValue,
        aci_name: activity.aci_name || AC_NAMES[acIdValue] || null,
        location: activity.location ? normalizeLocation(activity.location) : null,
      };
    });

    // Get unique booth_ids from results for debugging
    const uniqueBooths = [...new Set(normalizedActivities.map(a => a.booth_id).filter(Boolean))];

    return res.json({
      success: true,
      activities: normalizedActivities,
      total,
      count: normalizedActivities.length,
      filters: { acId, boothId, status },
      availableBooths: uniqueBooths.slice(0, 10), // For debugging
    });
  } catch (error) {
    console.error("Error fetching booth agent activities:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch booth agent activities",
      error: error.message
    });
  }
});

// ==================== LOCATION DATA API ====================
/**
 * GET /api/dashboard/location-data
 * Unified endpoint for fetching location data from all collections
 * Returns data from: boothAgentActivities, mobileAppAnswers, surveyResponses
 * Supports filtering by data source type
 */
router.get("/location-data", async (req, res) => {
  try {
    await connectToDatabase();
    const { acId, sources = 'all', limit = 100 } = req.query;

    if (!acId) {
      return res.status(400).json({ success: false, message: "acId is required" });
    }

    const numericAcId = parseInt(acId, 10);
    if (isNaN(numericAcId)) {
      return res.status(400).json({ success: false, message: "Invalid acId" });
    }

    // Verify user has access to this AC
    if (!canAccessAC(req.user, numericAcId)) {
      return res.status(403).json({ success: false, message: "Access denied to this AC" });
    }

    const parsedLimit = Math.min(parseInt(limit, 10) || 100, 500);
    const sourceList = sources === 'all'
      ? ['activities', 'mobile', 'surveys']
      : sources.split(',').filter(s => ['activities', 'mobile', 'surveys'].includes(s));

    const results = {
      activities: [],
      mobile: [],
      surveys: [],
    };

    // Fetch booth agent activities with location
    if (sourceList.includes('activities')) {
      try {
        const activities = await queryBoothAgentActivities(numericAcId, {
          location: { $exists: true, $ne: null }
        }, {
          limit: parsedLimit,
          sort: { loginTime: -1, createdAt: -1 }
        });

        results.activities = activities
          .filter(a => a.location?.coordinates?.length >= 2 || (a.location?.latitude && a.location?.longitude))
          .map(a => {
            const loc = normalizeLocation(a.location);
            return {
              id: a._id?.toString(),
              type: 'activity',
              latitude: loc?.latitude,
              longitude: loc?.longitude,
              title: a.userName || 'Booth Agent',
              subtitle: `${a.activityType || 'login'} - ${a.boothno || a.booth_id || 'Unknown Booth'}`,
              booth_id: a.booth_id,
              boothno: a.boothno,
              boothname: a.boothname,
              agent: a.userName,
              status: a.status,
              timestamp: a.loginTime || a.createdAt,
              color: a.status === 'active' ? '#22c55e' : '#6b7280',
            };
          })
          .filter(a => a.latitude && a.longitude);
      } catch (err) {
        console.log(`No activities collection for AC ${numericAcId}`);
      }
    }

    // Fetch mobile app answers with location
    if (sourceList.includes('mobile')) {
      try {
        const answers = await queryMobileAppAnswers(numericAcId, {
          location: { $exists: true, $ne: null }
        }, {
          limit: parsedLimit,
          sort: { submittedAt: -1, createdAt: -1 }
        });

        results.mobile = answers
          .filter(a => a.location?.latitude && a.location?.longitude)
          .map(a => {
            const loc = normalizeLocation(a.location);
            return {
              id: a._id?.toString(),
              type: 'mobile',
              latitude: loc?.latitude,
              longitude: loc?.longitude,
              title: a.submittedByName || 'Mobile Response',
              subtitle: `Response - ${a.boothno || a.booth_id || 'Unknown Booth'}`,
              booth_id: a.booth_id,
              boothno: a.boothno,
              boothname: a.boothname,
              agent: a.submittedByName,
              answerValue: a.answerValue || a.answerLabel,
              timestamp: a.submittedAt || a.createdAt,
              color: '#3b82f6',
            };
          })
          .filter(a => a.latitude && a.longitude);
      } catch (err) {
        console.log(`No mobile answers collection for AC ${numericAcId}`);
      }
    }

    // Fetch survey responses with location
    if (sourceList.includes('surveys')) {
      try {
        const surveys = await querySurveyResponses(numericAcId, {
          $or: [
            { location: { $exists: true, $ne: null } },
            { 'metadata.location': { $exists: true, $ne: null } }
          ]
        }, {
          limit: parsedLimit,
          sort: { submittedAt: -1, createdAt: -1 }
        });

        results.surveys = surveys
          .filter(s => {
            const loc = s.location || s.metadata?.location;
            return loc && (loc.latitude || loc.coordinates);
          })
          .map(s => {
            const rawLoc = s.location || s.metadata?.location;
            const loc = normalizeLocation(rawLoc);
            return {
              id: s._id?.toString(),
              type: 'survey',
              latitude: loc?.latitude,
              longitude: loc?.longitude,
              title: s.respondentName || 'Survey Response',
              subtitle: `Survey - ${s.boothno || s.booth_id || 'Unknown Booth'}`,
              booth_id: s.booth_id,
              boothno: s.boothno,
              boothname: s.boothname,
              respondent: s.respondentName,
              status: s.status || (s.isComplete ? 'completed' : 'pending'),
              timestamp: s.submittedAt || s.createdAt,
              color: '#f59e0b',
            };
          })
          .filter(s => s.latitude && s.longitude);
      } catch (err) {
        console.log(`No survey responses collection for AC ${numericAcId}`);
      }
    }

    // Combine and sort all results
    const allLocations = [
      ...results.activities,
      ...results.mobile,
      ...results.surveys,
    ].sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });

    return res.json({
      success: true,
      data: allLocations,
      counts: {
        activities: results.activities.length,
        mobile: results.mobile.length,
        surveys: results.surveys.length,
        total: allLocations.length,
      },
      acId: numericAcId,
      acName: AC_NAMES[numericAcId] || null,
    });
  } catch (error) {
    console.error("Error fetching location data:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch location data",
      error: error.message
    });
  }
});

export default router;
