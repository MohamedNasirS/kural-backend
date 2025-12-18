/**
 * RBAC Booth Management Routes
 * Handles booth CRUD operations with role-based access control
 */

import express from "express";
// Booth model import removed - using voter data as source of truth
// import Booth from "../../models/Booth.js";
import User from "../../models/User.js";
import { aggregateVoters } from "../../utils/voterCollection.js";
import {
  isAuthenticated,
  canManageBooths,
  validateACAccess,
  canAccessAC,
} from "../../middleware/auth.js";
import { getCache, setCache, invalidateCache, TTL } from "../../utils/cache.js";
import { getPrecomputedStats } from "../../utils/precomputedStats.js";
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  sendConflict,
  sendServerError
} from "../../utils/responseHelpers.js";

const router = express.Router();

/**
 * GET /api/rbac/booths
 * Get booths from voter collections (source of truth)
 * Aggregates booth data from voter_{AC_ID} collections
 * Access: L0, L1, L2
 */
router.get("/", isAuthenticated, canManageBooths, validateACAccess, async (req, res) => {
  try {
    const { ac, search, source, page = 1, limit = 500 } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 500;

    // Validate AC filter for L1/L2 users
    if (ac) {
      const acId = parseInt(ac);
      if (!canAccessAC(req.user, acId)) {
        return sendForbidden(res, "Access denied to this AC");
      }
    }

    const targetAC = ac ? parseInt(ac) : req.user.assignedAC;

    // Cache check
    if (targetAC && !search) {
      const cacheKey = `ac:${targetAC}:booths:page${pageNum}:limit${limitNum}`;
      const cached = getCache(cacheKey, TTL.BOOTH_LIST);
      if (cached) {
        return res.json(cached);
      }
    }

    let booths = [];

    if (targetAC) {
      try {
        let voterBooths = null;

        const precomputed = await getPrecomputedStats(targetAC, 60 * 60 * 1000);
        if (precomputed && precomputed.boothStats && precomputed.boothStats.length > 0) {
          voterBooths = precomputed.boothStats.map(b => ({
            _id: b.boothId,
            boothno: b.boothNo,
            boothname: b.boothName,
            aci_id: targetAC,
            aci_name: precomputed.acName,
            totalVoters: b.voters
          }));
        } else {
          voterBooths = await aggregateVoters(targetAC, [
            { $match: {} },
            {
              $group: {
                _id: "$booth_id",
                boothno: { $first: "$boothno" },
                boothname: { $first: "$boothname" },
                aci_id: { $first: "$aci_id" },
                aci_name: { $first: "$aci_name" },
                totalVoters: { $sum: 1 }
              }
            },
            { $sort: { boothno: 1 } }
          ]);
        }

        // Get booth agents for this AC
        const boothAgentMap = {};
        const boothAgents = await User.find({
          role: { $in: ["Booth Agent", "BoothAgent"] },
          assignedAC: targetAC,
          deleted: { $ne: true }
        }).select("name phone role booth_id assignedBoothId booth_agent_id");

        boothAgents.forEach(agent => {
          let boothId = null;
          if (agent.booth_id && agent.booth_id.toString().startsWith("BOOTH")) {
            boothId = agent.booth_id;
          } else if (agent.booth_agent_id) {
            const match = agent.booth_agent_id.match(/^(BOOTH\d+-\d+)/);
            if (match) boothId = match[1];
          }
          if (!boothId) {
            boothId = agent.booth_id || (agent.assignedBoothId ? agent.assignedBoothId.toString() : null);
          }
          if (boothId) {
            if (!boothAgentMap[boothId]) boothAgentMap[boothId] = [];
            boothAgentMap[boothId].push({
              _id: agent._id,
              name: agent.name,
              phone: agent.phone,
              role: agent.role
            });
          }
        });

        // Transform to booth format
        booths = voterBooths.map((vb, index) => {
          const boothId = vb._id;
          const boothNumber = vb.boothno || index + 1;
          const agentsFromUsers = boothAgentMap[boothId] || [];

          return {
            _id: boothId,
            boothCode: boothId,
            boothNumber: boothNumber,
            boothName: vb.boothname || `Booth ${boothNumber}`,
            ac_id: vb.aci_id || targetAC,
            ac_name: vb.aci_name || `AC ${targetAC}`,
            totalVoters: vb.totalVoters,
            assignedAgents: agentsFromUsers,
            primaryAgent: agentsFromUsers.length > 0 ? agentsFromUsers[0] : null,
            isActive: true,
            isFromVoterData: true
          };
        });

        // Apply search filter
        if (search) {
          const searchRegex = new RegExp(search, "i");
          booths = booths.filter(b =>
            searchRegex.test(b.boothName) || searchRegex.test(b.boothCode)
          );
        }
      } catch (voterError) {
        console.error("Error aggregating booths from voter data:", voterError);
        return sendServerError(res, "Failed to fetch booth data from voter collection", voterError);
      }
    } else {
      return sendSuccess(res, {
        count: 0,
        booths: [],
        message: "Please select a constituency to view booths"
      });
    }

    // Apply pagination
    const totalCount = booths.length;
    const totalPages = Math.ceil(totalCount / limitNum);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedBooths = booths.slice(startIndex, endIndex);

    const response = {
      success: true,
      count: paginatedBooths.length,
      total: totalCount,
      booths: paginatedBooths,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages,
        total: totalCount,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    };

    // Cache the response
    if (targetAC && !search) {
      const cacheKey = `ac:${targetAC}:booths:page${pageNum}:limit${limitNum}`;
      setCache(cacheKey, response, TTL.BOOTH_LIST);
    }

    res.json(response);
  } catch (error) {
    console.error("Error fetching booths:", error);
    sendServerError(res, "Failed to fetch booths", error);
  }
});

/**
 * POST /api/rbac/booths
 * DEPRECATED: Manual booth creation is disabled. Booths are derived from voter data.
 */
router.post("/", isAuthenticated, canManageBooths, validateACAccess, async (req, res) => {
  res.status(410).json({
    success: false,
    message: "Manual booth creation is disabled. Booths are derived from voter data.",
  });
});

/**
 * PUT /api/rbac/booths/:boothId
 * DEPRECATED: Manual booth updates are disabled. Booths are derived from voter data.
 */
router.put("/:boothId", isAuthenticated, canManageBooths, validateACAccess, async (req, res) => {
  res.status(410).json({
    success: false,
    message: "Manual booth updates are disabled. Booths are derived from voter data.",
  });
});

/**
 * DELETE /api/rbac/booths/:boothId
 * DEPRECATED: Manual booth deletion is disabled. Booths are derived from voter data.
 */
router.delete("/:boothId", isAuthenticated, canManageBooths, validateACAccess, async (req, res) => {
  res.status(410).json({
    success: false,
    message: "Manual booth deletion is disabled. Booths are derived from voter data.",
  });
});

/**
 * GET /api/rbac/booths/:boothId/agents
 * Get all agents assigned to a specific booth
 * SIMPLIFIED: Queries users by booth_id field instead of using Booth collection
 * Access: L0, L1, L2
 * @param boothId - booth_id string (e.g., "ac101002", "voter-booth-101-2", "BOOTH2-101")
 */
router.get("/:boothId/agents", isAuthenticated, async (req, res) => {
  try {
    const { boothId } = req.params;

    // Try to extract AC from booth_id for access control
    let boothAC = null;
    if (boothId.startsWith('ac')) {
      // Format: ac101002 -> AC 101
      boothAC = parseInt(boothId.substring(2, 5));
    } else if (boothId.startsWith('voter-booth-')) {
      // Format: voter-booth-101-2 -> AC 101
      const parts = boothId.split('-');
      if (parts.length >= 3) {
        boothAC = parseInt(parts[2]);
      }
    } else if (boothId.includes('-')) {
      // Format: BOOTH2-101 -> AC 101
      const parts = boothId.split('-');
      boothAC = parseInt(parts[parts.length - 1]);
    }

    // Check AC access for L2 only (L0 and L1 can access all ACs)
    if (req.user.role === "L2" && boothAC && boothAC !== req.user.assignedAC) {
      return sendForbidden(res, "Access denied to this booth");
    }

    // Query users by booth_id field
    const agents = await User.find({
      booth_id: boothId,
      $or: [{ role: "Booth Agent" }, { role: "BoothAgent" }],
      isActive: true
    })
      .select("name phone email booth_agent_id booth_id status isActive assignedAC")
      .lean();

    sendSuccess(res, {
      booth: {
        booth_id: boothId,
        acId: boothAC,
      },
      agents: agents,
      primaryAgent: null, // No longer tracking primary agent in Booth collection
    });
  } catch (error) {
    console.error("Error fetching booth agents:", error);
    sendServerError(res, "Failed to fetch booth agents", error);
  }
});

export default router;
