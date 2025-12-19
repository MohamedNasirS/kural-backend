/**
 * DashboardService - Business logic for dashboard and analytics operations
 * Decouples business logic from route handlers
 */

import { getVoterModel, aggregateVoters, countVoters } from "../utils/voterCollection.js";
import { queryBoothAgentActivities, countBoothAgentActivities } from "../utils/boothAgentActivityCollection.js";
import { aggregateSurveyResponses } from "../utils/surveyResponseCollection.js";
import { getCache, setCache, TTL, cacheKeys } from "../utils/cache.js";
import { getPrecomputedStats, savePrecomputedStats, getAllPrecomputedStats } from "../utils/precomputedStats.js";
import { AC_NAMES, normalizeLocation } from "../utils/universalAdapter.js";
import User from "../models/User.js";
// Booth model import removed - using precomputed stats from voter data
// import Booth from "../models/Booth.js";
import { resolveAssignedACFromUser } from "../utils/ac.js";

/**
 * Get dashboard statistics for an AC
 * Uses precomputed stats with fallback to real-time computation
 * @param {number} acId - AC ID
 * @returns {Promise<Object>} Dashboard stats
 */
export async function getDashboardStats(acId) {
  // Try precomputed stats first (fast path)
  const precomputed = await getPrecomputedStats(acId, 10 * 60 * 1000);

  if (precomputed && !precomputed.isStale) {
    return {
      acIdentifier: precomputed.acName || String(acId),
      acId: acId,
      acName: precomputed.acName || AC_NAMES[acId] || null,
      acNumber: acId,
      totalFamilies: precomputed.totalFamilies,
      totalMembers: precomputed.totalMembers,
      surveysCompleted: precomputed.surveysCompleted, // Legacy: voters with at least one survey
      totalBooths: precomputed.totalBooths,
      boothStats: precomputed.boothStats || [],
      // NEW: Multi-survey tracking metrics
      activeSurveysCount: precomputed.activeSurveysCount || 0,
      totalSurveysNeeded: precomputed.totalSurveysNeeded || 0,
      totalSurveysCompleted: precomputed.totalSurveysCompleted || 0,
      votersSurveyed: precomputed.votersSurveyed || precomputed.surveysCompleted || 0,
      surveyBreakdown: precomputed.surveyBreakdown || [],
      _source: 'precomputed',
      _computedAt: precomputed.computedAt
    };
  }

  // Fallback: Compute stats in real-time
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

  // Run aggregations in parallel
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

  // Save to precomputed stats asynchronously
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

  // Cache in memory for subsequent requests
  const cacheKey = cacheKeys.dashboardStats(acId);
  setCache(cacheKey, responseData, TTL.DASHBOARD_STATS);

  return responseData;
}

/**
 * Get RBAC dashboard stats (for admin panel)
 * @param {Object} user - Requesting user
 * @returns {Promise<Object>} Dashboard statistics
 */
export async function getRBACDashboardStats(user) {
  const assignedAC = user.role === "L0" ? null : resolveAssignedACFromUser(user);

  const cacheKey = assignedAC === null
    ? 'L0:dashboard:stats'
    : `ac:${assignedAC}:dashboard:stats`;

  const cached = getCache(cacheKey, TTL.DASHBOARD_STATS);
  if (cached) return cached;

  const userQuery = assignedAC !== null ? { isActive: true, assignedAC } : { isActive: true };
  const agentRoleFilter = {
    $or: [{ role: "Booth Agent" }, { role: "BoothAgent" }],
  };

  // Get booth count from precomputed stats (derived from voter data)
  let totalBooths = 0;
  if (assignedAC !== null) {
    const precomputed = await getPrecomputedStats(assignedAC, 60 * 60 * 1000);
    totalBooths = precomputed?.totalBooths || 0;
  } else {
    // L0: aggregate from all ACs
    const allStats = await getAllPrecomputedStats();
    totalBooths = allStats.reduce((sum, stat) => sum + (stat.totalBooths || 0), 0);
  }

  // Get agent statistics from user documents
  // Assigned agents = agents with booth_id set
  // Unassigned agents = agents without booth_id
  const [totalAgents, assignedAgents, agentsWithBoothIds] = await Promise.all([
    User.countDocuments({ ...userQuery, ...agentRoleFilter }),
    User.countDocuments({
      ...userQuery,
      ...agentRoleFilter,
      booth_id: { $exists: true, $ne: null, $ne: "" }
    }),
    // Get unique booth_ids to count active booths
    User.distinct("booth_id", {
      ...userQuery,
      ...agentRoleFilter,
      booth_id: { $exists: true, $ne: null, $ne: "" }
    })
  ]);

  const unassignedAgents = Math.max(totalAgents - assignedAgents, 0);
  const boothsActive = agentsWithBoothIds.length; // Count of unique booths with agents

  const stats = {
    totalBooths,
    totalAgents,
    assignedAgents,
    unassignedAgents,
    boothsActive,
  };

  // L0 gets additional user counts
  if (user.role === "L0") {
    const [totalACIMs, totalACIs, totalUsers] = await Promise.all([
      User.countDocuments({ ...userQuery, role: "L1" }),
      User.countDocuments({ ...userQuery, role: "L2" }),
      User.countDocuments(userQuery)
    ]);
    stats.totalACIMs = totalACIMs;
    stats.totalACIs = totalACIs;
    stats.totalUsers = totalUsers;
  }

  // Cache the response
  setCache(cacheKey, stats, TTL.DASHBOARD_STATS);

  return stats;
}

/**
 * Get AC overview with performance data
 * @param {Object} user - Requesting user
 * @returns {Promise<Object>} AC overview
 */
export async function getACOverview(user) {
  const limitToAc = user.role === "L2" ? resolveAssignedACFromUser(user) : null;

  if (user.role === "L2" && limitToAc === null) {
    throw { status: 403, message: "No AC assigned to your account." };
  }

  const cacheKey = limitToAc === null
    ? 'L0:ac:overview'
    : `ac:${limitToAc}:overview`;

  const cached = getCache(cacheKey, TTL.DASHBOARD_STATS);
  if (cached) return cached;

  const userMatch = {
    isActive: { $ne: false },
    role: { $in: ["L1", "L2", "Booth Agent", "BoothAgent"] },
  };
  if (limitToAc !== null) {
    userMatch.assignedAC = limitToAc;
  }

  let voterAggregation;
  let usersData;

  if (limitToAc === null) {
    // L0 user: Use precomputed stats
    const [allPrecomputed, users] = await Promise.all([
      getAllPrecomputedStats(),
      User.find(userMatch).select("role assignedAC").lean()
    ]);

    voterAggregation = allPrecomputed.map(stat => ({
      _id: { acId: stat.acId, acName: stat.acName },
      totalMembers: stat.totalMembers || 0,
      surveyedMembers: stat.surveysCompleted || 0,
      families: stat.totalFamilies || 0,
      booths: stat.totalBooths || 0,
    }));

    usersData = users;
  } else {
    // L1/L2 user: Run aggregation on single AC
    const aggregationPipeline = [
      {
        $group: {
          _id: { acId: "$aci_id", acName: "$aci_name" },
          totalMembers: { $sum: 1 },
          surveyedMembers: {
            $sum: { $cond: [{ $eq: ["$surveyed", true] }, 1, 0] },
          },
          uniqueFamilies: { $addToSet: "$familyId" },
          uniqueBooths: { $addToSet: "$booth_id" },
        },
      },
      {
        $project: {
          _id: 1,
          totalMembers: 1,
          surveyedMembers: 1,
          families: { $size: "$uniqueFamilies" },
          booths: { $size: "$uniqueBooths" },
        },
      },
      { $sort: { "_id.acId": 1 } },
    ];

    const [aggregationResult, users] = await Promise.all([
      aggregateVoters(limitToAc, aggregationPipeline),
      User.find(userMatch).select("role assignedAC").lean()
    ]);

    voterAggregation = aggregationResult;
    usersData = users;
  }

  // Build per-AC user counts
  const perAcUserCounts = new Map();
  const roleTotals = {
    totalL1Admins: 0,
    totalL2Moderators: 0,
    totalL3Agents: 0,
  };

  usersData.forEach((userDoc) => {
    if (userDoc.role === "L1") {
      roleTotals.totalL1Admins += 1;
    } else if (userDoc.role === "L2") {
      roleTotals.totalL2Moderators += 1;
    } else if (userDoc.role === "Booth Agent" || userDoc.role === "BoothAgent") {
      roleTotals.totalL3Agents += 1;
    }

    const acId = resolveAssignedACFromUser(userDoc);
    if (acId === null) return;

    const bucket = perAcUserCounts.get(acId) || { admins: 0, moderators: 0, agents: 0 };

    if (userDoc.role === "L1") bucket.admins += 1;
    else if (userDoc.role === "L2") bucket.moderators += 1;
    else if (userDoc.role === "Booth Agent" || userDoc.role === "BoothAgent") bucket.agents += 1;

    perAcUserCounts.set(acId, bucket);
  });

  // Build AC performance data
  const acDataMap = new Map();

  voterAggregation.forEach((entry) => {
    const acId = entry._id.acId;
    if (acId === null || acId === undefined) return;

    const acName = entry._id.acName;
    const voters = entry.totalMembers || 0;
    const surveyedMembers = entry.surveyedMembers || 0;
    const families = entry.families || 0;
    const booths = entry.booths || 0;

    if (acDataMap.has(acId)) {
      const existing = acDataMap.get(acId);
      existing.voters += voters;
      existing.surveyedMembers += surveyedMembers;
      existing.families += families;
      existing.booths += booths;
      if (!existing.acName && acName) existing.acName = acName;
    } else {
      acDataMap.set(acId, { acId, acName: acName || null, voters, surveyedMembers, families, booths });
    }
  });

  const acPerformance = Array.from(acDataMap.values()).map((entry) => {
    const counts = perAcUserCounts.get(entry.acId) || { admins: 0, moderators: 0, agents: 0 };
    const completion = entry.voters > 0
      ? Math.round((entry.surveyedMembers / entry.voters) * 1000) / 10
      : 0;

    return {
      ac: entry.acName ? `${entry.acId} - ${entry.acName}` : `AC ${entry.acId}`,
      acNumber: entry.acId,
      acName: entry.acName,
      voters: entry.voters,
      surveyedMembers: entry.surveyedMembers,
      families: entry.families || 0,
      booths: entry.booths || 0,
      completion,
      admins: counts.admins,
      moderators: counts.moderators,
      agents: counts.agents,
    };
  });

  // Include ACs that only have user data
  perAcUserCounts.forEach((counts, acId) => {
    if (!acPerformance.find((ac) => ac.acNumber === acId)) {
      acPerformance.push({
        ac: `AC ${acId}`,
        acNumber: acId,
        acName: null,
        voters: 0,
        surveyedMembers: 0,
        families: 0,
        booths: 0,
        completion: 0,
        admins: counts.admins,
        moderators: counts.moderators,
        agents: counts.agents,
      });
    }
  });

  // Sort by AC number
  acPerformance.sort((a, b) => (a.acNumber ?? 0) - (b.acNumber ?? 0));

  const totals = {
    ...roleTotals,
    totalVoters: acPerformance.reduce((sum, ac) => sum + ac.voters, 0),
    totalSurveyedMembers: acPerformance.reduce((sum, ac) => sum + (ac.surveyedMembers || 0), 0),
    totalFamilies: acPerformance.reduce((sum, ac) => sum + (ac.families || 0), 0),
    totalBooths: acPerformance.reduce((sum, ac) => sum + (ac.booths || 0), 0),
  };

  const response = {
    success: true,
    totals,
    acPerformance,
    scope: limitToAc ?? "all",
  };

  setCache(cacheKey, response, TTL.DASHBOARD_STATS);

  return response;
}

/**
 * Get booth performance report
 * @param {number} acId - AC ID
 * @param {string} booth - Optional booth filter
 * @returns {Promise<Object>} Booth performance data
 */
export async function getBoothPerformance(acId, booth = null) {
  const cacheKey = booth && booth !== 'all'
    ? `ac:${acId}:report:booth-performance:${booth}`
    : `ac:${acId}:report:booth-performance`;

  const cached = getCache(cacheKey, TTL.SURVEY_FORMS);
  if (cached) return cached;

  // Try precomputed stats first
  if (!booth || booth === 'all') {
    const precomputed = await getPrecomputedStats(acId, 10 * 60 * 1000);
    if (precomputed && precomputed.boothStats && precomputed.boothStats.length > 0) {
      console.log(`[Reports] Using precomputed stats for AC ${acId} booth-performance`);

      const response = {
        reports: precomputed.boothStats.map(b => ({
          booth: b.boothName || `Booth ${b.boothNo}`,
          boothname: b.boothName,
          boothNo: b.boothNo,
          booth_id: b.boothId,
          total_voters: b.voters || 0,
          total_families: b.familyCount || 0,
          male_voters: b.maleVoters || 0,
          female_voters: b.femaleVoters || 0,
          verified_voters: b.verifiedVoters || 0,
          surveys_completed: b.surveyedVoters || 0,
          avg_age: b.avgAge || 0,
          completion_rate: b.voters > 0
            ? Math.round((b.surveyedVoters || 0) / b.voters * 100)
            : 0
        })),
        _source: 'precomputed'
      };

      setCache(cacheKey, response, TTL.SURVEY_FORMS);
      return response;
    }
  }

  // Fallback to aggregation
  console.log(`[Reports] Running aggregation for AC ${acId} booth-performance (booth=${booth || 'all'})`);

  const matchQuery = {};
  if (booth && booth !== 'all') {
    matchQuery.boothname = booth;
  }

  const VoterModel = getVoterModel(acId);

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
              male_voters: { $sum: { $cond: [{ $eq: ["$gender", "Male"] }, 1, 0] } },
              female_voters: { $sum: { $cond: [{ $eq: ["$gender", "Female"] }, 1, 0] } },
              verified_voters: { $sum: { $cond: ["$verified", 1, 0] } },
              avg_age: { $avg: "$age" }
            }
          },
          { $sort: { "_id.boothno": 1 } }
        ],
        familyCounts: [
          { $match: { familyId: { $exists: true, $nin: [null, ""] } } },
          { $group: { _id: { boothname: "$boothname", familyId: "$familyId" } } },
          { $group: { _id: "$_id.boothname", total_families: { $sum: 1 } } }
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
    reports: boothPerformance.map(b => ({
      booth: b._id.boothname || `Booth ${b._id.boothno}`,
      boothname: b._id.boothname,
      boothNo: b._id.boothno,
      booth_id: b._id.booth_id,
      total_voters: b.total_voters,
      total_families: familyMap.get(b._id.boothname) || 0,
      male_voters: b.male_voters,
      female_voters: b.female_voters,
      verified_voters: b.verified_voters,
      surveys_completed: surveyMap.get(b._id.boothname) || surveyMap.get(b._id.booth_id) || 0,
      avg_age: Math.round(b.avg_age || 0),
      completion_rate: b.total_voters > 0
        ? Math.round(((surveyMap.get(b._id.boothname) || surveyMap.get(b._id.booth_id) || 0) / b.total_voters) * 100)
        : 0
    })),
    _source: 'aggregation'
  };

  setCache(cacheKey, response, TTL.SURVEY_FORMS);
  return response;
}

/**
 * Get demographics data for an AC
 * @param {number} acId - AC ID
 * @param {string} booth - Optional booth filter
 * @returns {Promise<Object>} Demographics data
 */
export async function getDemographics(acId, booth = null) {
  const cacheKey = booth && booth !== 'all'
    ? `ac:${acId}:report:demographics:${booth}`
    : `ac:${acId}:report:demographics`;

  const cached = getCache(cacheKey, TTL.SURVEY_FORMS);
  if (cached) return cached;

  const matchQuery = {};
  if (booth && booth !== 'all') {
    matchQuery.boothname = booth;
  }

  const VoterModel = getVoterModel(acId);

  // Single aggregation with $facet
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
          { $group: { _id: "$gender", count: { $sum: 1 } } }
        ],
        surveyStatus: [
          { $group: { _id: "$surveyed", count: { $sum: 1 } } }
        ]
      }
    }
  ]);

  // Format age groups
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

  setCache(cacheKey, response, TTL.SURVEY_FORMS);
  return response;
}

/**
 * Get booth agent activities
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Activities data
 */
export async function getBoothAgentActivities(options = {}) {
  const { acId, boothId, limit = 100, status } = options;
  const numericLimit = Math.min(Number(limit) || 100, 500);

  const query = {};
  if (status && status !== 'all') {
    query.status = status;
  }
  if (boothId && boothId !== 'all') {
    query.$or = [
      { booth_id: boothId },
      { boothno: boothId },
      { booth_id: { $regex: new RegExp(`^${boothId}`, 'i') } }
    ];
  }

  if (!acId || acId === 'all') {
    throw { status: 400, message: "AC ID is required" };
  }

  const numericAcId = Number(acId);
  if (!Number.isFinite(numericAcId)) {
    throw { status: 400, message: "Invalid AC ID" };
  }

  const [activities, total] = await Promise.all([
    queryBoothAgentActivities(numericAcId, query, {
      sort: { loginTime: -1 },
      limit: numericLimit,
    }),
    countBoothAgentActivities(numericAcId, query)
  ]);

  // Normalize location data
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

  const uniqueBooths = [...new Set(normalizedActivities.map(a => a.booth_id).filter(Boolean))];

  return {
    success: true,
    activities: normalizedActivities,
    total,
    count: normalizedActivities.length,
    filters: { acId, boothId, status },
    availableBooths: uniqueBooths.slice(0, 10),
  };
}

export default {
  getDashboardStats,
  getRBACDashboardStats,
  getACOverview,
  getBoothPerformance,
  getDemographics,
  getBoothAgentActivities,
};
