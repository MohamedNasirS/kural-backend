/**
 * RBAC Analytics and Dashboard Routes
 * Handles dashboard statistics and AC overview analytics
 */

import express from "express";
import User from "../../models/User.js";
// Booth model import removed - using precomputed stats from voter data
// import Booth from "../../models/Booth.js";
import { resolveAssignedACFromUser } from "../../utils/ac.js";
import { aggregateVoters } from "../../utils/voterCollection.js";
import {
  isAuthenticated,
  validateACAccess,
} from "../../middleware/auth.js";
import { getCache, setCache, TTL } from "../../utils/cache.js";
import { getPrecomputedStats, getAllPrecomputedStats } from "../../utils/precomputedStats.js";
import { buildDashboardAnalytics } from "./helpers.js";
import {
  sendSuccess,
  sendForbidden,
  sendServerError
} from "../../utils/responseHelpers.js";
import { dashboardRateLimiter } from "../../middleware/rateLimit.js";

const router = express.Router();

// Apply rate limiting to all analytics routes
router.use(dashboardRateLimiter);

/**
 * GET /api/rbac/dashboard/stats
 * Get dashboard statistics
 * OPTIMIZED: Uses precomputed stats for booth count (from voter data)
 * Agent assignment stats come from user documents (booth_id field)
 * Access: L0, L1, L2
 */
router.get("/stats", isAuthenticated, validateACAccess, async (req, res) => {
  try {
    const assignedAC = req.user.role === "L0" ? null : resolveAssignedACFromUser(req.user);

    // Check cache
    const cacheKey = assignedAC === null
      ? 'L0:dashboard:stats'
      : `ac:${assignedAC}:dashboard:stats`;

    const cached = getCache(cacheKey, TTL.DASHBOARD_STATS);
    if (cached) {
      return res.json(cached);
    }

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
    if (req.user.role === "L0") {
      const [totalACIMs, totalACIs, totalUsers] = await Promise.all([
        User.countDocuments({ ...userQuery, role: "L1" }),
        User.countDocuments({ ...userQuery, role: "L2" }),
        User.countDocuments(userQuery)
      ]);
      stats.totalACIMs = totalACIMs;
      stats.totalACIs = totalACIs;
      stats.totalUsers = totalUsers;
    }

    const analytics = await buildDashboardAnalytics({
      assignedAC,
      totalBooths,
      boothsActive,
    });

    const response = {
      success: true,
      stats: {
        ...stats,
        ...analytics,
      },
    };

    setCache(cacheKey, response, TTL.DASHBOARD_STATS);

    res.json(response);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    sendServerError(res, "Failed to fetch dashboard statistics", error);
  }
});

/**
 * GET /api/rbac/dashboard/ac-overview
 * Batched AC performance stats to avoid hundreds of client requests
 * Access: L0 (all ACs), L1/L2 (their AC only)
 */
router.get("/ac-overview", isAuthenticated, async (req, res) => {
  try {
    const limitToAc =
      req.user.role === "L2"
        ? resolveAssignedACFromUser(req.user)
        : null;

    if (req.user.role === "L2" && limitToAc === null) {
      return sendForbidden(res, "No AC assigned to your account.");
    }

    // Check cache
    const cacheKey = limitToAc === null
      ? 'L0:ac:overview'
      : `ac:${limitToAc}:overview`;

    const cached = getCache(cacheKey, TTL.DASHBOARD_STATS);
    if (cached) {
      return res.json(cached);
    }

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
              $sum: {
                $cond: [
                  { $eq: ["$surveyed", true] },
                  1,
                  0,
                ],
              },
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

    const users = usersData;

    const perAcUserCounts = new Map();
    const roleTotals = {
      totalL1Admins: 0,
      totalL2Moderators: 0,
      totalL3Agents: 0,
    };

    users.forEach((user) => {
      if (user.role === "L1") {
        roleTotals.totalL1Admins += 1;
      } else if (user.role === "L2") {
        roleTotals.totalL2Moderators += 1;
      } else if (user.role === "Booth Agent" || user.role === "BoothAgent") {
        roleTotals.totalL3Agents += 1;
      }

      const acId = resolveAssignedACFromUser(user);
      if (acId === null) {
        return;
      }

      const bucket =
        perAcUserCounts.get(acId) || { admins: 0, moderators: 0, agents: 0 };

      if (user.role === "L1") {
        bucket.admins += 1;
      } else if (user.role === "L2") {
        bucket.moderators += 1;
      } else if (user.role === "Booth Agent" || user.role === "BoothAgent") {
        bucket.agents += 1;
      }

      perAcUserCounts.set(acId, bucket);
    });

    // Deduplicate and merge AC data
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
        if (!existing.acName && acName) {
          existing.acName = acName;
        }
      } else {
        acDataMap.set(acId, {
          acId,
          acName: acName || null,
          voters,
          surveyedMembers,
          families,
          booths,
        });
      }
    });

    const acPerformance = Array.from(acDataMap.values()).map((entry) => {
      const counts = perAcUserCounts.get(entry.acId) || {
        admins: 0,
        moderators: 0,
        agents: 0,
      };
      const completion =
        entry.voters > 0 ? Math.round((entry.surveyedMembers / entry.voters) * 1000) / 10 : 0;

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
    acPerformance.sort((a, b) => {
      const aId = a.acNumber ?? 0;
      const bId = b.acNumber ?? 0;
      return aId - bId;
    });

    const totals = {
      ...roleTotals,
      totalVoters: acPerformance.reduce((sum, ac) => sum + ac.voters, 0),
      totalSurveyedMembers: acPerformance.reduce(
        (sum, ac) => sum + (ac.surveyedMembers || 0),
        0,
      ),
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

    res.json(response);
  } catch (error) {
    console.error("Error building AC overview stats:", error);
    sendServerError(res, "Failed to build AC overview stats", error);
  }
});

export default router;
