/**
 * UserService - Business logic for user management operations
 * Decouples business logic from route handlers
 */

import User from "../models/User.js";
import Booth from "../models/Booth.js";
import bcrypt from "bcryptjs";
import { getCache, setCache, TTL } from "../utils/cache.js";
import { resolveAssignedACFromUser } from "../utils/ac.js";

// Role hierarchy for permission checks
const ROLE_HIERARCHY = {
  L0: 4,
  L1: 3,
  L2: 2,
  MLA: 2,
  'Booth Agent': 1,
  'BoothAgent': 1
};

/**
 * Get all users with filtering and pagination
 * @param {Object} options - Query options
 * @param {Object} requestingUser - User making the request
 * @returns {Promise<Object>} Paginated users
 */
export async function getUsers(options = {}, requestingUser = null) {
  const {
    page = 1,
    limit = 50,
    role,
    search,
    status,
    assignedAC
  } = options;

  const query = { isActive: { $ne: false } };

  // Apply AC filter for non-L0 users
  if (requestingUser && requestingUser.role !== 'L0') {
    const userAC = resolveAssignedACFromUser(requestingUser);
    if (userAC) {
      query.assignedAC = userAC;
    }
  }

  // Apply filters
  if (role && role !== 'all') {
    if (role === 'BoothAgent') {
      query.$or = [{ role: 'Booth Agent' }, { role: 'BoothAgent' }];
    } else {
      query.role = role;
    }
  }

  if (status && status !== 'all') {
    query.status = status;
  }

  if (assignedAC && assignedAC !== 'all') {
    query.assignedAC = parseInt(assignedAC);
  }

  if (search) {
    const searchQuery = {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ]
    };

    // Merge search with existing query
    if (query.$or) {
      query.$and = [{ $or: query.$or }, searchQuery];
      delete query.$or;
    } else {
      Object.assign(query, searchQuery);
    }
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [users, total] = await Promise.all([
    User.find(query)
      .select('-passwordHash')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .lean(),
    User.countDocuments(query)
  ]);

  return {
    users: users.map(formatUserResponse),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  };
}

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User data
 */
export async function getUserById(userId) {
  const user = await User.findById(userId).select('-passwordHash').lean();
  if (!user) {
    throw { status: 404, message: "User not found" };
  }
  return formatUserResponse(user);
}

/**
 * Create a new user
 * @param {Object} userData - User data
 * @param {Object} createdBy - User creating the account
 * @returns {Promise<Object>} Created user
 */
export async function createUser(userData, createdBy = null) {
  const {
    name,
    email,
    phone,
    password,
    role,
    assignedAC,
    assignedBoothId,
    status = 'Active',
    aci_name
  } = userData;

  // Validation
  if (!name || !password || !role) {
    throw { status: 400, message: "Name, password, and role are required" };
  }

  if (!email && !phone) {
    throw { status: 400, message: "Either email or phone is required" };
  }

  // Validate role
  const validRoles = ['L0', 'L1', 'L2', 'MLA', 'Booth Agent', 'BoothAgent'];
  if (!validRoles.includes(role)) {
    throw { status: 400, message: `Invalid role. Must be one of: ${validRoles.join(', ')}` };
  }

  // Check for duplicates
  const duplicateQuery = [];
  if (email) duplicateQuery.push({ email: email.toLowerCase() });
  if (phone) duplicateQuery.push({ phone });

  const existingUser = await User.findOne({
    $or: duplicateQuery,
    isActive: { $ne: false }
  });

  if (existingUser) {
    const field = existingUser.email === email?.toLowerCase() ? 'email' : 'phone';
    throw { status: 409, message: `User with this ${field} already exists` };
  }

  // Require AC assignment for certain roles
  if (['L2', 'MLA', 'Booth Agent', 'BoothAgent'].includes(role) && !assignedAC) {
    throw { status: 400, message: `AC assignment is required for role ${role}` };
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = new User({
    name,
    email: email?.toLowerCase(),
    phone,
    passwordHash,
    role,
    assignedAC: assignedAC ? parseInt(assignedAC) : undefined,
    assignedBoothId,
    status,
    aci_name,
    isActive: true,
    createdBy: createdBy?._id
  });

  await newUser.save();

  return {
    message: "User created successfully",
    user: formatUserResponse(newUser.toObject())
  };
}

/**
 * Update an existing user
 * @param {string} userId - User ID
 * @param {Object} updateData - Update data
 * @returns {Promise<Object>} Updated user
 */
export async function updateUser(userId, updateData) {
  const user = await User.findById(userId);
  if (!user) {
    throw { status: 404, message: "User not found" };
  }

  const {
    name,
    email,
    phone,
    password,
    role,
    assignedAC,
    assignedBoothId,
    status,
    aci_name
  } = updateData;

  // Check for duplicate email/phone
  if (email || phone) {
    const duplicateQuery = [];
    if (email && email.toLowerCase() !== user.email) {
      duplicateQuery.push({ email: email.toLowerCase() });
    }
    if (phone && phone !== user.phone) {
      duplicateQuery.push({ phone });
    }

    if (duplicateQuery.length > 0) {
      const existingUser = await User.findOne({
        _id: { $ne: userId },
        $or: duplicateQuery,
        isActive: { $ne: false }
      });

      if (existingUser) {
        const field = existingUser.email === email?.toLowerCase() ? 'email' : 'phone';
        throw { status: 409, message: `Another user with this ${field} already exists` };
      }
    }
  }

  // Update fields
  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email.toLowerCase();
  if (phone !== undefined) user.phone = phone;
  if (role !== undefined) user.role = role;
  if (assignedAC !== undefined) user.assignedAC = assignedAC ? parseInt(assignedAC) : null;
  if (assignedBoothId !== undefined) user.assignedBoothId = assignedBoothId;
  if (status !== undefined) user.status = status;
  if (aci_name !== undefined) user.aci_name = aci_name;

  // Update password if provided
  if (password) {
    user.passwordHash = await bcrypt.hash(password, 10);
  }

  await user.save();

  return {
    message: "User updated successfully",
    user: formatUserResponse(user.toObject())
  };
}

/**
 * Delete (soft delete) a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteUser(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw { status: 404, message: "User not found" };
  }

  // Prevent deleting super admin
  if (user.role === 'L0' && user.email === 'admin@kuralapp.com') {
    throw { status: 403, message: "Cannot delete the primary super admin account" };
  }

  // Soft delete
  user.isActive = false;
  user.status = 'Inactive';
  await user.save();

  // Remove from any assigned booths
  await Booth.updateMany(
    { assignedAgents: user._id },
    { $pull: { assignedAgents: user._id } }
  );

  return {
    message: "User deleted successfully",
    userId: user._id
  };
}

/**
 * Get booth agents with filtering
 * @param {Object} options - Query options
 * @param {Object} requestingUser - User making the request
 * @returns {Promise<Object>} Agents list
 */
export async function getBoothAgents(options = {}, requestingUser = null) {
  const {
    page = 1,
    limit = 50,
    assigned,
    search,
    assignedAC
  } = options;

  const query = {
    isActive: { $ne: false },
    $or: [{ role: 'Booth Agent' }, { role: 'BoothAgent' }]
  };

  // Apply AC filter for non-L0 users
  if (requestingUser && requestingUser.role !== 'L0') {
    const userAC = resolveAssignedACFromUser(requestingUser);
    if (userAC) {
      query.assignedAC = userAC;
    }
  } else if (assignedAC && assignedAC !== 'all') {
    query.assignedAC = parseInt(assignedAC);
  }

  if (search) {
    query.$and = [
      { $or: query.$or },
      {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
        ]
      }
    ];
    delete query.$or;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  let agents = await User.find(query)
    .select('-passwordHash')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 })
    .lean();

  // Get assigned booth info
  const agentIds = agents.map(a => a._id);
  const booths = await Booth.find({
    assignedAgents: { $in: agentIds },
    isActive: { $ne: false }
  }).lean();

  // Map agents to their booths
  const agentBoothMap = new Map();
  booths.forEach(booth => {
    booth.assignedAgents?.forEach(agentId => {
      const id = agentId.toString();
      if (!agentBoothMap.has(id)) {
        agentBoothMap.set(id, []);
      }
      agentBoothMap.get(id).push({
        _id: booth._id,
        boothNumber: booth.boothNumber,
        boothName: booth.boothName
      });
    });
  });

  // Filter by assigned status if specified
  if (assigned !== undefined) {
    agents = agents.filter(agent => {
      const hasBooths = agentBoothMap.has(agent._id.toString()) &&
                       agentBoothMap.get(agent._id.toString()).length > 0;
      return assigned === 'true' ? hasBooths : !hasBooths;
    });
  }

  const total = await User.countDocuments(query);

  return {
    agents: agents.map(agent => ({
      ...formatUserResponse(agent),
      assignedBooths: agentBoothMap.get(agent._id.toString()) || []
    })),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  };
}

/**
 * Assign agent to booth
 * @param {string} boothId - Booth ID
 * @param {string} agentId - Agent ID
 * @returns {Promise<Object>} Assignment result
 */
export async function assignAgentToBooth(boothId, agentId) {
  const [booth, agent] = await Promise.all([
    Booth.findById(boothId),
    User.findById(agentId)
  ]);

  if (!booth) {
    throw { status: 404, message: "Booth not found" };
  }
  if (!agent) {
    throw { status: 404, message: "Agent not found" };
  }

  // Verify agent role
  if (!['Booth Agent', 'BoothAgent'].includes(agent.role)) {
    throw { status: 400, message: "User is not a booth agent" };
  }

  // Check if already assigned
  if (booth.assignedAgents?.includes(agentId)) {
    throw { status: 409, message: "Agent is already assigned to this booth" };
  }

  // Add agent to booth
  if (!booth.assignedAgents) {
    booth.assignedAgents = [];
  }
  booth.assignedAgents.push(agentId);
  await booth.save();

  // Update agent's assigned booth
  agent.assignedBoothId = boothId;
  agent.booth_id = booth.boothNumber || booth.booth_id;
  await agent.save();

  return {
    message: "Agent assigned to booth successfully",
    booth: {
      _id: booth._id,
      boothNumber: booth.boothNumber,
      assignedAgents: booth.assignedAgents
    },
    agent: formatUserResponse(agent.toObject())
  };
}

/**
 * Unassign agent from booth
 * @param {string} boothId - Booth ID
 * @param {string} agentId - Agent ID
 * @returns {Promise<Object>} Unassignment result
 */
export async function unassignAgentFromBooth(boothId, agentId) {
  const [booth, agent] = await Promise.all([
    Booth.findById(boothId),
    User.findById(agentId)
  ]);

  if (!booth) {
    throw { status: 404, message: "Booth not found" };
  }
  if (!agent) {
    throw { status: 404, message: "Agent not found" };
  }

  // Remove agent from booth
  booth.assignedAgents = booth.assignedAgents?.filter(
    id => id.toString() !== agentId
  ) || [];
  await booth.save();

  // Clear agent's assigned booth if it matches
  if (agent.assignedBoothId?.toString() === boothId) {
    agent.assignedBoothId = null;
    agent.booth_id = null;
    await agent.save();
  }

  return {
    message: "Agent unassigned from booth successfully",
    booth: {
      _id: booth._id,
      boothNumber: booth.boothNumber,
      assignedAgents: booth.assignedAgents
    }
  };
}

/**
 * Get user statistics
 * @param {Object} requestingUser - User making the request
 * @returns {Promise<Object>} User statistics
 */
export async function getUserStats(requestingUser = null) {
  const cacheKey = requestingUser?.role === 'L0'
    ? 'L0:user:stats'
    : `ac:${resolveAssignedACFromUser(requestingUser)}:user:stats`;

  const cached = getCache(cacheKey, TTL.MEDIUM);
  if (cached) return cached;

  const query = { isActive: { $ne: false } };

  if (requestingUser && requestingUser.role !== 'L0') {
    const userAC = resolveAssignedACFromUser(requestingUser);
    if (userAC) {
      query.assignedAC = userAC;
    }
  }

  const [total, byRole, byStatus] = await Promise.all([
    User.countDocuments(query),
    User.aggregate([
      { $match: query },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]),
    User.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])
  ]);

  const stats = {
    total,
    byRole: Object.fromEntries(byRole.map(r => [r._id, r.count])),
    byStatus: Object.fromEntries(byStatus.map(s => [s._id || 'Unknown', s.count]))
  };

  setCache(cacheKey, stats, TTL.MEDIUM);
  return stats;
}

/**
 * Verify user password
 * @param {string} identifier - Email or phone
 * @param {string} password - Password to verify
 * @returns {Promise<Object>} User if valid
 */
export async function verifyCredentials(identifier, password) {
  const query = {
    isActive: { $ne: false },
    $or: [
      { email: identifier.toLowerCase() },
      { phone: identifier }
    ]
  };

  const user = await User.findOne(query);
  if (!user) {
    throw { status: 401, message: "Invalid credentials" };
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw { status: 401, message: "Invalid credentials" };
  }

  return formatUserResponse(user.toObject());
}

/**
 * Format user response (remove sensitive fields)
 * @param {Object} user - User document
 * @returns {Object} Formatted user
 */
function formatUserResponse(user) {
  const formatted = { ...user };
  delete formatted.passwordHash;
  delete formatted.__v;
  return formatted;
}

export default {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getBoothAgents,
  assignAgentToBooth,
  unassignAgentFromBooth,
  getUserStats,
  verifyCredentials,
};
