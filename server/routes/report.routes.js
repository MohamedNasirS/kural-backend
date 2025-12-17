import express from "express";
import mongoose from "mongoose";
import { connectToDatabase } from "../config/database.js";
import { getVoterModel } from "../utils/voterCollection.js";
import { aggregateSurveyResponses } from "../utils/surveyResponseCollection.js";
import { isAuthenticated, canAccessAC } from "../middleware/auth.js";
import { getCache, setCache, TTL } from "../utils/cache.js";
import { getPrecomputedStats } from "../utils/precomputedStats.js";
import { aggregationRateLimiter } from "../middleware/rateLimit.js";
import { CACHE_CONFIG } from "../config/constants.js";

const router = express.Router();

// Apply authentication and rate limiting to all routes
router.use(isAuthenticated);
router.use(aggregationRateLimiter);

// Get booth performance reports
// OPTIMIZED v3: Uses precomputed stats when available, falls back to aggregation
router.get("/:acId/booth-performance", async (req, res) => {
  try {
    await connectToDatabase();

    const acId = parseInt(req.params.acId);
    const { booth } = req.query;

    if (isNaN(acId)) {
      return res.status(400).json({ message: "Invalid AC ID" });
    }

    // AC Isolation: Check if user can access this AC
    if (!canAccessAC(req.user, acId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have permission to view this AC's data."
      });
    }

    // OPTIMIZATION: Cache booth performance reports (10 min TTL)
    const cacheKey = booth && booth !== 'all'
      ? `ac:${acId}:report:booth-performance:${booth}`
      : `ac:${acId}:report:booth-performance`;
    const cached = getCache(cacheKey, TTL.SURVEY_FORMS);
    if (cached) {
      return res.json(cached);
    }

    // OPTIMIZATION: Try precomputed stats first (for all booths - most common case)
    if (!booth || booth === 'all') {
      const precomputed = await getPrecomputedStats(acId, CACHE_CONFIG.precomputedStats); // 10 min max age
      if (precomputed && precomputed.boothStats && precomputed.boothStats.length > 0) {
        console.log(`[Reports] Using precomputed stats for AC ${acId} booth-performance`);

        const response = {
          reports: precomputed.boothStats.map(booth => ({
            booth: booth.boothName || `Booth ${booth.boothNo}`,
            boothname: booth.boothName,
            boothNo: booth.boothNo,
            booth_id: booth.boothId,
            total_voters: booth.voters || 0,
            total_families: booth.familyCount || 0,
            male_voters: booth.maleVoters || 0,
            female_voters: booth.femaleVoters || 0,
            verified_voters: booth.verifiedVoters || 0,
            surveys_completed: booth.surveyedVoters || 0,
            avg_age: booth.avgAge || 0,
            completion_rate: booth.voters > 0
              ? Math.round((booth.surveyedVoters || 0) / booth.voters * 100)
              : 0
          })),
          _source: 'precomputed'
        };

        // Cache the response
        setCache(cacheKey, response, TTL.SURVEY_FORMS);
        return res.json(response);
      }
    }

    // FALLBACK: Run aggregation (for filtered queries or when precomputed not available)
    console.log(`[Reports] Running aggregation for AC ${acId} booth-performance (booth=${booth || 'all'})`);

    const matchQuery = {};
    if (booth && booth !== 'all') {
      matchQuery.boothname = booth;
    }

    const VoterModel = getVoterModel(acId);

    // Single aggregation with $facet for booth stats + family counts
    const [result] = await VoterModel.aggregate([
      { $match: matchQuery },
      {
        $facet: {
          boothStats: [
            {
              $group: {
                _id: {
                  boothname: "$boothname",
                  boothno: "$boothno",
                  booth_id: "$booth_id"
                },
                total_voters: { $sum: 1 },
                male_voters: {
                  $sum: { $cond: [{ $eq: ["$gender", "Male"] }, 1, 0] }
                },
                female_voters: {
                  $sum: { $cond: [{ $eq: ["$gender", "Female"] }, 1, 0] }
                },
                verified_voters: {
                  $sum: { $cond: ["$verified", 1, 0] }
                },
                avg_age: { $avg: "$age" }
              }
            },
            { $sort: { "_id.boothno": 1 } }
          ],
          familyCounts: [
            { $match: { familyId: { $exists: true, $nin: [null, ""] } } },
            {
              $group: {
                _id: { boothname: "$boothname", familyId: "$familyId" }
              }
            },
            {
              $group: {
                _id: "$_id.boothname",
                total_families: { $sum: 1 }
              }
            }
          ]
        }
      }
    ]);

    const boothPerformance = result.boothStats || [];
    const familyMap = new Map((result.familyCounts || []).map(f => [f._id, f.total_families]));

    // Get survey completion data
    let surveysByBooth = [];
    try {
      surveysByBooth = await aggregateSurveyResponses(acId, [
        {
          $group: {
            _id: { $ifNull: ["$boothname", { $ifNull: ["$booth_id", "$booth"] }] },
            surveys_completed: { $sum: 1 }
          }
        }
      ]);
    } catch (error) {
      console.error("Error aggregating survey responses:", error);
    }

    const surveyMap = new Map(surveysByBooth.map(s => [s._id, s.surveys_completed]));

    const response = {
      reports: boothPerformance.map(booth => ({
        booth: booth._id.boothname || `Booth ${booth._id.boothno}`,
        boothname: booth._id.boothname,
        boothNo: booth._id.boothno,
        booth_id: booth._id.booth_id,
        total_voters: booth.total_voters,
        total_families: familyMap.get(booth._id.boothname) || 0,
        male_voters: booth.male_voters,
        female_voters: booth.female_voters,
        verified_voters: booth.verified_voters,
        surveys_completed: surveyMap.get(booth._id.boothname) || surveyMap.get(booth._id.booth_id) || 0,
        avg_age: Math.round(booth.avg_age || 0),
        completion_rate: booth.total_voters > 0
          ? Math.round(((surveyMap.get(booth._id.boothname) || surveyMap.get(booth._id.booth_id) || 0) / booth.total_voters) * 100)
          : 0
      })),
      _source: 'aggregation'
    };

    // Cache the response for 10 minutes
    setCache(cacheKey, response, TTL.SURVEY_FORMS);
    return res.json(response);

  } catch (error) {
    console.error("Error fetching booth performance:", error);
    return res.status(500).json({ message: "Failed to fetch booth performance" });
  }
});

// Get demographics data including age distribution
// OPTIMIZED v2: Single $facet aggregation with caching
router.get("/:acId/demographics", async (req, res) => {
  try {
    await connectToDatabase();

    const acId = parseInt(req.params.acId);
    const { booth } = req.query;

    if (isNaN(acId)) {
      return res.status(400).json({ message: "Invalid AC ID" });
    }

    // AC Isolation: Check if user can access this AC
    if (!canAccessAC(req.user, acId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have permission to view this AC's data."
      });
    }

    // OPTIMIZATION: Cache demographics reports (10 min TTL)
    const cacheKey = booth && booth !== 'all'
      ? `ac:${acId}:report:demographics:${booth}`
      : `ac:${acId}:report:demographics`;
    const cached = getCache(cacheKey, TTL.SURVEY_FORMS);
    if (cached) {
      return res.json(cached);
    }

    const matchQuery = {};
    if (booth && booth !== 'all') {
      matchQuery.boothname = booth;
    }

    const VoterModel = getVoterModel(acId);

    // Single aggregation with $facet - 3 queries in 1
    const [result] = await VoterModel.aggregate([
      { $match: matchQuery },
      {
        $facet: {
          ageDistribution: [
            { $match: { age: { $exists: true, $ne: null } } },
            {
              $group: {
                _id: {
                  $switch: {
                    branches: [
                      { case: { $and: [{ $gte: ["$age", 18] }, { $lte: ["$age", 25] }] }, then: "18-25" },
                      { case: { $and: [{ $gte: ["$age", 26] }, { $lte: ["$age", 35] }] }, then: "26-35" },
                      { case: { $and: [{ $gte: ["$age", 36] }, { $lte: ["$age", 45] }] }, then: "36-45" },
                      { case: { $and: [{ $gte: ["$age", 46] }, { $lte: ["$age", 55] }] }, then: "46-55" },
                      { case: { $and: [{ $gte: ["$age", 56] }, { $lte: ["$age", 65] }] }, then: "56-65" },
                      { case: { $gte: ["$age", 66] }, then: "65+" }
                    ],
                    default: "Unknown"
                  }
                },
                count: { $sum: 1 },
                maleCount: { $sum: { $cond: [{ $eq: ["$gender", "Male"] }, 1, 0] } },
                femaleCount: { $sum: { $cond: [{ $eq: ["$gender", "Female"] }, 1, 0] } }
              }
            }
          ],
          genderDistribution: [
            {
              $group: {
                _id: "$gender",
                count: { $sum: 1 }
              }
            }
          ],
          surveyStatus: [
            {
              $group: {
                _id: "$surveyed",
                count: { $sum: 1 }
              }
            }
          ]
        }
      }
    ]);

    // Format age groups in consistent order
    const ageGroups = ["18-25", "26-35", "36-45", "46-55", "56-65", "65+"];
    const formattedAgeData = ageGroups.map(group => {
      const data = result.ageDistribution.find(a => a._id === group);
      return {
        ageGroup: group,
        count: data?.count || 0,
        male: data?.maleCount || 0,
        female: data?.femaleCount || 0
      };
    });

    const genderData = {
      male: result.genderDistribution.find(g => g._id === "Male")?.count || 0,
      female: result.genderDistribution.find(g => g._id === "Female")?.count || 0
    };

    const surveyData = {
      surveyed: result.surveyStatus.find(s => s._id === true)?.count || 0,
      notSurveyed: result.surveyStatus.find(s => s._id === false || s._id === null)?.count || 0
    };

    const response = {
      ageDistribution: formattedAgeData,
      genderDistribution: genderData,
      surveyStatus: surveyData
    };

    // Cache the response for 10 minutes
    setCache(cacheKey, response, TTL.SURVEY_FORMS);
    return res.json(response);

  } catch (error) {
    console.error("Error fetching demographics:", error);
    return res.status(500).json({ message: "Failed to fetch demographics data" });
  }
});

export default router;
