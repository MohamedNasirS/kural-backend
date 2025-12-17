/**
 * RBAC Booth Agent Management Routes
 * Handles agent assignment and management operations
 */

import express from "express";
import User from "../../models/User.js";
// Booth model import removed - using voter data as source of truth
// import Booth from "../../models/Booth.js";
import {
  isAuthenticated,
  canManageBoothAgents,
  canAssignAgents,
  validateACAccess,
  canAccessAC,
} from "../../middleware/auth.js";
import { getCache, setCache, invalidateCache, TTL } from "../../utils/cache.js";
import {
  sendSuccess,
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  sendServerError
} from "../../utils/responseHelpers.js";

const router = express.Router();

/**
 * GET /api/rbac/booth-agents
 * Get booth agents (filtered by AC for L1/L2)
 * Access: L0, L1, L2
 */
router.get("/", isAuthenticated, canManageBoothAgents, validateACAccess, async (req, res) => {
  try {
    const { ac, assigned, search } = req.query;

    // Cache check
    const cacheKey = `booth-agents:${req.user.assignedAC || 'all'}:${ac || 'all'}:${assigned || 'all'}:${search || ''}`;
    const cached = getCache(cacheKey, TTL.MEDIUM);
    if (cached) {
      return res.json(cached);
    }

    let query = {
      $or: [
        { role: "Booth Agent" },
        { role: "BoothAgent" }
      ],
      isActive: true
    };

    // Apply AC filter for L2 only
    if (req.user.role === "L2") {
      query.assignedAC = req.user.assignedAC;
    }

    // Additional AC filter from query params
    if (ac) {
      const acId = parseInt(ac);
      if (req.user.role === "L2" && acId !== req.user.assignedAC) {
        return sendForbidden(res, "Access denied to agents in this AC");
      }
      query.assignedAC = acId;
    }

    // Search filter
    if (search) {
      const searchRegex = new RegExp(search, "i");
      const searchCondition = {
        $or: [{ name: searchRegex }, { phone: searchRegex }]
      };

      if (query.$or) {
        query = {
          $and: [
            { $or: query.$or },
            searchCondition
          ],
          isActive: query.isActive,
          ...(query.assignedAC && { assignedAC: query.assignedAC })
        };
      } else {
        Object.assign(query, searchCondition);
      }
    }

    const agents = await User.find(query)
      .select("-password -passwordHash")
      .sort({ name: 1 })
      .lean();

    // Filter by assigned status if specified
    // SIMPLIFIED: Check booth_id field on user document instead of Booth collection
    let filteredAgents = agents;
    if (assigned !== undefined) {
      const isAssigned = assigned === "true";
      filteredAgents = agents.filter((agent) => {
        const hasBoothAssignment = !!agent.booth_id;
        return isAssigned ? hasBoothAssignment : !hasBoothAssignment;
      });
    }

    // Transform agents to include booth info
    const transformedAgents = filteredAgents.map(agent => {
      const agentObj = agent.toObject ? agent.toObject() : agent;

      let boothName = null;
      let boothNo = null;
      let boothId = null;

      if (agentObj.assignedBoothId && typeof agentObj.assignedBoothId === 'object') {
        boothName = agentObj.assignedBoothId.boothName;
        boothNo = agentObj.assignedBoothId.boothNumber || agentObj.assignedBoothId.boothCode;
        boothId = agentObj.assignedBoothId.booth_id || agentObj.assignedBoothId.boothCode;
      } else if (agentObj.booth_id) {
        const match = agentObj.booth_id.match(/^BOOTH(\d+)-(\d+)$/);
        if (match) {
          boothNo = match[1];
          boothId = agentObj.booth_id;
        } else {
          boothId = agentObj.booth_id;
        }
      }

      return {
        ...agentObj,
        boothName: boothName,
        boothNo: boothNo,
        boothId: boothId,
      };
    });

    const response = {
      success: true,
      count: transformedAgents.length,
      agents: transformedAgents,
    };

    setCache(cacheKey, response, TTL.MEDIUM);

    res.json(response);
  } catch (error) {
    console.error("Error fetching booth agents:", error);
    sendServerError(res, "Failed to fetch booth agents", error);
  }
});

/**
 * POST /api/rbac/booth-agents/:boothId/assign
 * DEPRECATED: Booth collection is no longer used. Agent assignment is done via user's booth_id field.
 * Use PUT /:agentId/assign-booth instead
 */
router.post("/:boothId/assign", isAuthenticated, canAssignAgents, validateACAccess, async (req, res) => {
  res.status(410).json({
    success: false,
    message: "This endpoint is deprecated. Use PUT /api/rbac/booth-agents/:agentId/assign-booth instead. Booth assignments are now stored directly on user documents.",
  });
});

/**
 * DELETE /api/rbac/booth-agents/:boothId/unassign/:agentId
 * DEPRECATED: Booth collection is no longer used. Agent assignment is done via user's booth_id field.
 * Use PUT /:agentId/assign-booth with no boothId to unassign
 */
router.delete("/:boothId/unassign/:agentId", isAuthenticated, canAssignAgents, validateACAccess, async (req, res) => {
  res.status(410).json({
    success: false,
    message: "This endpoint is deprecated. Use PUT /api/rbac/booth-agents/:agentId/assign-booth without boothId to unassign. Booth assignments are now stored directly on user documents.",
  });
});

/**
 * PUT /api/rbac/booth-agents/:agentId/assign-booth
 * Assign an agent directly to a booth (updates agent's booth_id field)
 * SIMPLIFIED: No longer uses Booth collection, just stores booth_id string on user
 * Access: L0, L1, L2
 * @body booth_id - String identifier for the booth (e.g., "ac101002", "voter-booth-101-2"). Send empty/null to unassign.
 */
router.put("/:agentId/assign-booth", isAuthenticated, canAssignAgents, validateACAccess, async (req, res) => {
  try {
    const { agentId } = req.params;
    // Accept both booth_id (string) and boothId (legacy) for backwards compatibility
    const boothIdInput = req.body.booth_id || req.body.boothId;

    const agent = await User.findById(agentId);
    if (!agent || (agent.role !== "Booth Agent" && agent.role !== "BoothAgent") || !agent.isActive) {
      return sendNotFound(res, "Booth agent not found");
    }

    // Check AC access for agent
    if (req.user.role !== "L0" && agent.assignedAC && agent.assignedAC !== req.user.assignedAC) {
      return sendForbidden(res, "Access denied to this agent");
    }

    // If booth_id provided, validate and assign
    if (boothIdInput) {
      // Normalize booth_id format
      let normalizedBoothId = boothIdInput;

      // Handle voter-booth-{acId}-{boothNumber} format from frontend
      if (boothIdInput.startsWith('voter-booth-')) {
        const parts = boothIdInput.split('-');
        if (parts.length >= 4) {
          const acIdFromId = parseInt(parts[2]);
          const boothNumberFromId = parseInt(parts[3]);
          normalizedBoothId = `ac${acIdFromId}${String(boothNumberFromId).padStart(3, '0')}`;
        }
      }

      // Extract AC from booth_id for validation
      let boothAC = null;
      if (normalizedBoothId.startsWith('ac')) {
        boothAC = parseInt(normalizedBoothId.substring(2, 5));
      } else if (normalizedBoothId.includes('-')) {
        const parts = normalizedBoothId.split('-');
        boothAC = parseInt(parts[parts.length - 1]);
      }

      // Verify booth and agent are in same AC
      if (boothAC && agent.assignedAC && agent.assignedAC !== boothAC) {
        return sendBadRequest(res, "Agent and booth must be in the same AC");
      }

      // Check AC access for the booth
      if (boothAC && !canAccessAC(req.user, boothAC)) {
        return sendForbidden(res, "Access denied to this booth");
      }

      agent.booth_id = normalizedBoothId;
      agent.assignedBoothId = undefined; // Clear legacy field

      // Generate booth_agent_id if not already set
      if (!agent.booth_agent_id) {
        // Count existing agents assigned to this specific booth
        const existingAgentsCount = await User.countDocuments({
          role: { $in: ["Booth Agent", "BoothAgent"] },
          isActive: true,
          booth_id: normalizedBoothId,
          _id: { $ne: agent._id } // Exclude current agent
        });

        let sequence = existingAgentsCount + 1;
        let newBoothAgentId = `${normalizedBoothId}-${sequence}`;

        // Ensure unique booth_agent_id
        let existingAgentId = await User.findOne({ booth_agent_id: newBoothAgentId });
        while (existingAgentId) {
          sequence++;
          newBoothAgentId = `${normalizedBoothId}-${sequence}`;
          existingAgentId = await User.findOne({ booth_agent_id: newBoothAgentId });
        }

        agent.booth_agent_id = newBoothAgentId;
      }
    } else {
      // Unassign booth
      agent.booth_id = undefined;
      agent.assignedBoothId = undefined;
    }

    await agent.save();

    const agentResponse = await User.findById(agent._id)
      .select("-password -passwordHash");

    invalidateCache('booth-agents:');
    invalidateCache('users:');

    sendSuccess(res, { agent: agentResponse }, boothIdInput ? "Agent assigned to booth successfully" : "Agent unassigned from booth");
  } catch (error) {
    console.error("Error assigning booth to agent:", error);
    sendServerError(res, "Failed to assign booth to agent", error);
  }
});

export default router;
