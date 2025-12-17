/**
 * BoothService - Business logic for booth management operations
 * Decouples business logic from route handlers
 */

import Booth from "../models/Booth.js";
import User from "../models/User.js";
import { getCache, setCache, TTL } from "../utils/cache.js";
import { resolveAssignedACFromUser } from "../utils/ac.js";

/**
 * Get all booths with filtering and pagination
 * @param {Object} options - Query options
 * @param {Object} requestingUser - User making the request
 * @returns {Promise<Object>} Paginated booths
 */
export async function getBooths(options = {}, requestingUser = null) {
  const {
    page = 1,
    limit = 50,
    acId,
    search,
    hasAgents
  } = options;

  const query = { isActive: { $ne: false } };

  // Apply AC filter for non-L0 users
  if (requestingUser && requestingUser.role !== 'L0') {
    const userAC = resolveAssignedACFromUser(requestingUser);
    if (userAC) {
      query.acId = userAC;
    }
  } else if (acId && acId !== 'all') {
    query.acId = parseInt(acId);
  }

  if (search) {
    query.$or = [
      { boothNumber: { $regex: search, $options: 'i' } },
      { boothName: { $regex: search, $options: 'i' } },
      { booth_id: { $regex: search, $options: 'i' } }
    ];
  }

  // Filter by agent assignment
  if (hasAgents !== undefined) {
    if (hasAgents === 'true' || hasAgents === true) {
      query.assignedAgents = { $exists: true, $ne: [] };
    } else {
      query.$or = [
        { assignedAgents: { $exists: false } },
        { assignedAgents: { $size: 0 } }
      ];
    }
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [booths, total] = await Promise.all([
    Booth.find(query)
      .populate('assignedAgents', 'name phone email role')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ boothNumber: 1 })
      .lean(),
    Booth.countDocuments(query)
  ]);

  return {
    booths: booths.map(formatBoothResponse),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  };
}

/**
 * Get booth by ID
 * @param {string} boothId - Booth ID
 * @returns {Promise<Object>} Booth data
 */
export async function getBoothById(boothId) {
  const booth = await Booth.findById(boothId)
    .populate('assignedAgents', 'name phone email role')
    .lean();

  if (!booth) {
    throw { status: 404, message: "Booth not found" };
  }

  return formatBoothResponse(booth);
}

/**
 * Get booth by booth number
 * @param {string} boothNumber - Booth number
 * @param {number} acId - AC ID
 * @returns {Promise<Object>} Booth data
 */
export async function getBoothByNumber(boothNumber, acId) {
  const booth = await Booth.findOne({
    boothNumber,
    acId: parseInt(acId),
    isActive: { $ne: false }
  })
    .populate('assignedAgents', 'name phone email role')
    .lean();

  if (!booth) {
    throw { status: 404, message: "Booth not found" };
  }

  return formatBoothResponse(booth);
}

/**
 * Create a new booth
 * @param {Object} boothData - Booth data
 * @param {Object} createdBy - User creating the booth
 * @returns {Promise<Object>} Created booth
 */
export async function createBooth(boothData, createdBy = null) {
  const {
    boothNumber,
    boothName,
    acId,
    booth_id,
    location,
    assignedAgents
  } = boothData;

  // Validation
  if (!boothNumber || !acId) {
    throw { status: 400, message: "Booth number and AC ID are required" };
  }

  // Check for duplicate booth in same AC
  const existingBooth = await Booth.findOne({
    $or: [
      { boothNumber, acId: parseInt(acId) },
      { booth_id: booth_id || `${boothNumber}-${acId}`, acId: parseInt(acId) }
    ],
    isActive: { $ne: false }
  });

  if (existingBooth) {
    throw { status: 409, message: `Booth ${boothNumber} already exists in AC ${acId}` };
  }

  const newBooth = new Booth({
    boothNumber,
    boothName: boothName || `Booth ${boothNumber}`,
    acId: parseInt(acId),
    booth_id: booth_id || `${boothNumber}-${acId}`,
    location,
    assignedAgents: assignedAgents || [],
    isActive: true,
    createdBy: createdBy?._id
  });

  await newBooth.save();

  // Invalidate cache
  invalidateBoothCache(acId);

  return {
    message: "Booth created successfully",
    booth: formatBoothResponse(newBooth.toObject())
  };
}

/**
 * Update an existing booth
 * @param {string} boothId - Booth ID
 * @param {Object} updateData - Update data
 * @returns {Promise<Object>} Updated booth
 */
export async function updateBooth(boothId, updateData) {
  const booth = await Booth.findById(boothId);
  if (!booth) {
    throw { status: 404, message: "Booth not found" };
  }

  const {
    boothNumber,
    boothName,
    acId,
    booth_id,
    location,
    assignedAgents
  } = updateData;

  // Check for duplicate booth number
  if (boothNumber && boothNumber !== booth.boothNumber) {
    const existingBooth = await Booth.findOne({
      _id: { $ne: boothId },
      boothNumber,
      acId: acId || booth.acId,
      isActive: { $ne: false }
    });

    if (existingBooth) {
      throw { status: 409, message: `Booth ${boothNumber} already exists in this AC` };
    }
  }

  // Update fields
  if (boothNumber !== undefined) booth.boothNumber = boothNumber;
  if (boothName !== undefined) booth.boothName = boothName;
  if (acId !== undefined) booth.acId = parseInt(acId);
  if (booth_id !== undefined) booth.booth_id = booth_id;
  if (location !== undefined) booth.location = location;
  if (assignedAgents !== undefined) booth.assignedAgents = assignedAgents;

  await booth.save();

  // Invalidate cache
  invalidateBoothCache(booth.acId);

  return {
    message: "Booth updated successfully",
    booth: formatBoothResponse(booth.toObject())
  };
}

/**
 * Delete (soft delete) a booth
 * @param {string} boothId - Booth ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteBooth(boothId) {
  const booth = await Booth.findById(boothId);
  if (!booth) {
    throw { status: 404, message: "Booth not found" };
  }

  // Unassign all agents
  if (booth.assignedAgents && booth.assignedAgents.length > 0) {
    await User.updateMany(
      { _id: { $in: booth.assignedAgents } },
      { $unset: { assignedBoothId: "", booth_id: "" } }
    );
  }

  // Soft delete
  booth.isActive = false;
  await booth.save();

  // Invalidate cache
  invalidateBoothCache(booth.acId);

  return {
    message: "Booth deleted successfully",
    boothId: booth._id
  };
}

/**
 * Get booths for a specific AC
 * @param {number} acId - AC ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} List of booths
 */
export async function getBoothsByAC(acId, options = {}) {
  const { includeAgents = false, limit = 0 } = options;

  const cacheKey = `ac:${acId}:booths:list`;
  const cached = getCache(cacheKey, TTL.MEDIUM);
  if (cached && !includeAgents) return cached;

  let query = Booth.find({
    acId: parseInt(acId),
    isActive: { $ne: false }
  }).sort({ boothNumber: 1 });

  if (includeAgents) {
    query = query.populate('assignedAgents', 'name phone email role');
  }

  if (limit > 0) {
    query = query.limit(limit);
  }

  const booths = await query.lean();
  const formatted = booths.map(formatBoothResponse);

  if (!includeAgents) {
    setCache(cacheKey, formatted, TTL.MEDIUM);
  }

  return formatted;
}

/**
 * Get booth statistics for an AC
 * @param {number} acId - AC ID (null for all ACs)
 * @returns {Promise<Object>} Booth statistics
 */
export async function getBoothStats(acId = null) {
  const cacheKey = acId ? `ac:${acId}:booth:stats` : 'global:booth:stats';
  const cached = getCache(cacheKey, TTL.MEDIUM);
  if (cached) return cached;

  const query = { isActive: { $ne: false } };
  if (acId) {
    query.acId = parseInt(acId);
  }

  const [total, withAgents, withoutAgents] = await Promise.all([
    Booth.countDocuments(query),
    Booth.countDocuments({
      ...query,
      assignedAgents: { $exists: true, $ne: [] }
    }),
    Booth.countDocuments({
      ...query,
      $or: [
        { assignedAgents: { $exists: false } },
        { assignedAgents: { $size: 0 } }
      ]
    })
  ]);

  const stats = {
    total,
    withAgents,
    withoutAgents,
    coverage: total > 0 ? Math.round((withAgents / total) * 100) : 0
  };

  setCache(cacheKey, stats, TTL.MEDIUM);
  return stats;
}

/**
 * Get agents assigned to a booth
 * @param {string} boothId - Booth ID
 * @returns {Promise<Array>} List of agents
 */
export async function getBoothAgents(boothId) {
  const booth = await Booth.findById(boothId)
    .populate('assignedAgents', 'name phone email role status assignedAC')
    .lean();

  if (!booth) {
    throw { status: 404, message: "Booth not found" };
  }

  return booth.assignedAgents || [];
}

/**
 * Assign multiple agents to a booth
 * @param {string} boothId - Booth ID
 * @param {Array} agentIds - Array of agent IDs
 * @returns {Promise<Object>} Assignment result
 */
export async function assignAgents(boothId, agentIds) {
  const booth = await Booth.findById(boothId);
  if (!booth) {
    throw { status: 404, message: "Booth not found" };
  }

  if (!Array.isArray(agentIds) || agentIds.length === 0) {
    throw { status: 400, message: "Agent IDs array is required" };
  }

  // Verify all agents exist and are booth agents
  const agents = await User.find({
    _id: { $in: agentIds },
    isActive: { $ne: false },
    $or: [{ role: 'Booth Agent' }, { role: 'BoothAgent' }]
  });

  if (agents.length !== agentIds.length) {
    throw { status: 400, message: "Some agents were not found or are not booth agents" };
  }

  // Add new agents (avoid duplicates)
  const existingIds = (booth.assignedAgents || []).map(id => id.toString());
  const newIds = agentIds.filter(id => !existingIds.includes(id.toString()));

  booth.assignedAgents = [...(booth.assignedAgents || []), ...newIds];
  await booth.save();

  // Update agents with booth assignment
  await User.updateMany(
    { _id: { $in: newIds } },
    {
      $set: {
        assignedBoothId: boothId,
        booth_id: booth.boothNumber || booth.booth_id
      }
    }
  );

  // Invalidate cache
  invalidateBoothCache(booth.acId);

  return {
    message: `${newIds.length} agents assigned to booth`,
    booth: formatBoothResponse(booth.toObject()),
    assignedCount: newIds.length,
    skippedCount: agentIds.length - newIds.length
  };
}

/**
 * Unassign multiple agents from a booth
 * @param {string} boothId - Booth ID
 * @param {Array} agentIds - Array of agent IDs
 * @returns {Promise<Object>} Unassignment result
 */
export async function unassignAgents(boothId, agentIds) {
  const booth = await Booth.findById(boothId);
  if (!booth) {
    throw { status: 404, message: "Booth not found" };
  }

  if (!Array.isArray(agentIds) || agentIds.length === 0) {
    throw { status: 400, message: "Agent IDs array is required" };
  }

  // Remove agents from booth
  const agentIdStrings = agentIds.map(id => id.toString());
  booth.assignedAgents = (booth.assignedAgents || []).filter(
    id => !agentIdStrings.includes(id.toString())
  );
  await booth.save();

  // Clear booth assignment from agents
  await User.updateMany(
    { _id: { $in: agentIds }, assignedBoothId: boothId },
    { $unset: { assignedBoothId: "", booth_id: "" } }
  );

  // Invalidate cache
  invalidateBoothCache(booth.acId);

  return {
    message: `${agentIds.length} agents unassigned from booth`,
    booth: formatBoothResponse(booth.toObject())
  };
}

/**
 * Invalidate booth-related cache
 * @param {number} acId - AC ID
 */
function invalidateBoothCache(acId) {
  // Cache invalidation is handled by TTL expiration
  // Could implement explicit invalidation if needed
}

/**
 * Format booth response
 * @param {Object} booth - Booth document
 * @returns {Object} Formatted booth
 */
function formatBoothResponse(booth) {
  return {
    _id: booth._id,
    boothNumber: booth.boothNumber,
    boothName: booth.boothName,
    booth_id: booth.booth_id,
    acId: booth.acId,
    location: booth.location,
    assignedAgents: booth.assignedAgents || [],
    agentCount: (booth.assignedAgents || []).length,
    isActive: booth.isActive,
    createdAt: booth.createdAt,
    updatedAt: booth.updatedAt
  };
}

export default {
  getBooths,
  getBoothById,
  getBoothByNumber,
  createBooth,
  updateBooth,
  deleteBooth,
  getBoothsByAC,
  getBoothStats,
  getBoothAgents,
  assignAgents,
  unassignAgents,
};
