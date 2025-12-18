/**
 * RBAC Routes - Role-Based Access Control for Election Management
 * Handles user management, booth management, and agent assignment
 */

import express from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/User.js";
import Survey from "../models/Survey.js";
// Note: Booth model is imported via server/models/index.js for populate() support
import { resolveAssignedACFromUser } from "../utils/ac.js";
import {
  getVoterModel,
  aggregateVoters,
  aggregateAllVoters,
  ALL_AC_IDS
} from "../utils/voterCollection.js";
import {
  getSurveyResponseModel as getACSurveyResponseModel,
  querySurveyResponses,
  countSurveyResponses,
  queryAllSurveyResponses,
  countAllSurveyResponses,
  aggregateSurveyResponses,
  aggregateAllSurveyResponses
} from "../utils/surveyResponseCollection.js";
import {
  getMobileAppAnswerModel,
  queryMobileAppAnswers,
  countMobileAppAnswers,
  queryAllMobileAppAnswers,
  countAllMobileAppAnswers
} from "../utils/mobileAppAnswerCollection.js";
import {
  getBoothAgentActivityModel,
  queryBoothAgentActivities,
  countBoothAgentActivities,
  queryAllBoothAgentActivities,
  countAllBoothAgentActivities
} from "../utils/boothAgentActivityCollection.js";
import {
  isAuthenticated,
  canManageUsers,
  canManageBooths,
  canManageBoothAgents,
  canAssignAgents,
  validateACAccess,
  applyACFilter,
  canAccessAC,
} from "../middleware/auth.js";
import { getCache, setCache, invalidateCache, TTL, cacheKeys } from "../utils/cache.js";
import { getPrecomputedStats, getAllPrecomputedStats } from "../utils/precomputedStats.js";

const router = express.Router();

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Legacy function for backward compatibility - use getACSurveyResponseModel from utility instead
const getSurveyResponseModel = (acId = null) => {
  if (acId) {
    // Use AC-specific collection
    return getACSurveyResponseModel(acId);
  }
  // Fallback to legacy global collection (for backward compatibility)
  if (mongoose.models.SurveyResponse) {
    return mongoose.models.SurveyResponse;
  }
  return mongoose.model(
    "SurveyResponse",
    new mongoose.Schema({}, { strict: false, collection: "surveyresponses" }),
  );
};

const isNamespaceMissingError = (error) =>
  error?.codeName === "NamespaceNotFound" ||
  error?.message?.toLowerCase?.().includes("ns not found");

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const startOfWeek = (date) => {
  const start = startOfDay(date);
  const day = start.getDay(); // Sunday = 0
  start.setDate(start.getDate() - day);
  return start;
};

const createMonthBuckets = (count = 5) => {
  const buckets = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const reference = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
    const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 1);
    buckets.push({
      label: `${MONTH_LABELS[start.getMonth()]} ${String(start.getFullYear()).slice(-2)}`,
      year: start.getFullYear(),
      month: start.getMonth() + 1,
      start,
      end,
    });
  }
  return buckets;
};

const createWeekBuckets = (count = 6) => {
  const buckets = [];
  const currentWeekStart = startOfWeek(new Date());
  for (let i = count - 1; i >= 0; i -= 1) {
    const start = new Date(currentWeekStart);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    buckets.push({
      label: `Week of ${start.toLocaleDateString("en-IN", { month: "short", day: "2-digit" })}`,
      start,
      end,
    });
  }
  return buckets;
};

const createDayBuckets = (count = 7) => {
  const buckets = [];
  const todayStart = startOfDay(new Date());
  for (let i = count - 1; i >= 0; i -= 1) {
    const start = new Date(todayStart);
    start.setDate(start.getDate() - i);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    buckets.push({
      label: start.toLocaleDateString("en-IN", { weekday: "short" }),
      start,
      end,
    });
  }
  return buckets;
};

const formatHourWindow = (hour) => {
  if (!Number.isFinite(hour) || hour < 0) {
    return null;
  }
  const normalize = (value) => (value % 12 === 0 ? 12 : value % 12);
  const suffix = (value) => (value < 12 ? "AM" : "PM");
  const endHour = (hour + 1) % 24;
  return `${normalize(hour)} ${suffix(hour)} - ${normalize(endHour)} ${suffix(endHour)}`;
};

const aggregateCountsByMonth = async (model, baseMatch, buckets, dateField = "createdAt") => {
  if (!model || buckets.length === 0) {
    return [];
  }

  const matchStage = {
    ...baseMatch,
    [dateField]: {
      $gte: buckets[0].start,
      $lt: buckets[buckets.length - 1].end,
    },
  };

  const results = await model.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: `$${dateField}` },
          month: { $month: `$${dateField}` },
        },
        count: { $sum: 1 },
      },
    },
  ]);

  const lookup = new Map(
    results.map((item) => [`${item._id.year}-${item._id.month}`, item.count]),
  );

  return buckets.map((bucket) => lookup.get(`${bucket.year}-${bucket.month}`) || 0);
};

// Aggregate voter counts using AC-specific collections
// OPTIMIZATION: Skip heavy cross-AC aggregation for L0 users to prevent 100% CPU
const aggregateVoterCountsByMonth = async (assignedAC, buckets, dateField = "createdAt") => {
  if (buckets.length === 0) {
    return [];
  }

  // OPTIMIZATION: For L0 users (all ACs), skip this heavy aggregation
  // Monthly voter trends are not critical - main stats are precomputed
  if (assignedAC === null) {
    console.log('[Dashboard Analytics] Skipping heavy voter aggregation for L0 user');
    return buckets.map(() => 0); // Return zeros - this data is non-critical
  }

  const matchStage = {
    [dateField]: {
      $gte: buckets[0].start,
      $lt: buckets[buckets.length - 1].end,
    },
  };

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: `$${dateField}` },
          month: { $month: `$${dateField}` },
        },
        count: { $sum: 1 },
      },
    },
  ];

  let results = [];
  try {
    // Only query single AC collection (L1/L2 users)
    results = await aggregateVoters(assignedAC, pipeline);
  } catch (error) {
    console.error("Error aggregating voter counts:", error);
  }

  // Merge results
  const lookup = new Map();
  results.forEach((item) => {
    const key = `${item._id.year}-${item._id.month}`;
    lookup.set(key, (lookup.get(key) || 0) + item.count);
  });

  return buckets.map((bucket) => lookup.get(`${bucket.year}-${bucket.month}`) || 0);
};

const buildDashboardAnalytics = async ({ assignedAC, totalBooths, boothsActive }) => {
  const monthBuckets = createMonthBuckets(5);
  const weekBuckets = createWeekBuckets(6);
  const dayBuckets = createDayBuckets(7);

  const voterMatch = assignedAC !== null ? { aci_id: assignedAC } : {};
  const surveyMatch = assignedAC !== null ? { assignedACs: assignedAC } : {};
  const agentMatch =
    assignedAC !== null
      ? { assignedAC, role: { $in: ["Booth Agent", "BoothAgent"] } }
      : { role: { $in: ["Booth Agent", "BoothAgent"] } };
  const dayUserMatch =
    assignedAC !== null
      ? { assignedAC, role: { $in: ["L1", "L2", "Booth Agent", "BoothAgent"] } }
      : { role: { $in: ["L1", "L2", "Booth Agent", "BoothAgent"] } };

  const weekRangeStart = weekBuckets[0].start;
  const weekRangeEnd = weekBuckets[weekBuckets.length - 1].end;
  const surveyResponseDateFilter = {
    $or: [
      { createdAt: { $gte: weekRangeStart, $lt: weekRangeEnd } },
      { submittedAt: { $gte: weekRangeStart, $lt: weekRangeEnd } },
      { updatedAt: { $gte: weekRangeStart, $lt: weekRangeEnd } },
    ],
  };
  const acFilter =
    assignedAC !== null
      ? {
        $or: [
          { aci_id: assignedAC },
          { aci_num: assignedAC },
          { acId: assignedAC },
          { assignedAC },
          { "metadata.acId": assignedAC },
        ],
      }
      : null;
  const surveyResponseMatch =
    acFilter !== null
      ? { $and: [surveyResponseDateFilter, acFilter] }
      : surveyResponseDateFilter;

  const [voterMonthlyCounts, surveyMonthlyCounts, agentMonthlyCounts] = await Promise.all([
    // Use AC-specific voter collections
    aggregateVoterCountsByMonth(assignedAC, monthBuckets, "createdAt"),
    aggregateCountsByMonth(Survey, surveyMatch, monthBuckets, "createdAt"),
    aggregateCountsByMonth(User, agentMatch, monthBuckets, "createdAt"),
  ]);

  const dayRangeStart = dayBuckets[0].start;
  const recentUsers = await User.find({
    ...dayUserMatch,
    createdAt: { $gte: dayRangeStart },
  })
    .select({ role: 1, createdAt: 1 })
    .lean();

  let surveyResponses = [];
  try {
    // Use AC-specific collection if assignedAC is set, otherwise skip for L0
    // OPTIMIZATION: Skip heavy cross-AC survey response query for L0 users
    if (assignedAC !== null) {
      surveyResponses = await querySurveyResponses(assignedAC, surveyResponseDateFilter, {
        select: { createdAt: 1, submittedAt: 1, updatedAt: 1, status: 1 }
      });
    } else {
      // L0 user: Skip heavy queryAllSurveyResponses to prevent CPU spike
      console.log('[Dashboard Analytics] Skipping heavy survey response query for L0 user');
      surveyResponses = []; // Return empty - weekly distribution will show zeros
    }
  } catch (error) {
    if (!isNamespaceMissingError(error)) {
      console.error("Error fetching survey responses for analytics:", error);
    }
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const formsCreatedLast30Days = await Survey.countDocuments({
    ...surveyMatch,
    createdAt: { $gte: thirtyDaysAgo },
  });

  const systemGrowthData = monthBuckets.map((bucket, index) => ({
    month: bucket.label,
    voters: voterMonthlyCounts[index] || 0,
    surveys: surveyMonthlyCounts[index] || 0,
    agents: agentMonthlyCounts[index] || 0,
  }));

  const weeklyBucketsData = weekBuckets.map((bucket) => ({
    ...bucket,
    completed: 0,
    pending: 0,
  }));
  const hourBuckets = Array(24).fill(0);

  surveyResponses.forEach((response) => {
    const timestamp =
      response.createdAt || response.submittedAt || response.updatedAt;
    if (!timestamp) {
      return;
    }
    const time = new Date(timestamp);
    const target = weeklyBucketsData.find(
      (bucket) => time >= bucket.start && time < bucket.end,
    );
    if (!target) {
      return;
    }
    const isCompleted = String(response.status || "").toLowerCase() === "completed";
    if (isCompleted) {
      target.completed += 1;
    } else {
      target.pending += 1;
    }
    const hour = time.getHours();
    if (Number.isFinite(hour)) {
      hourBuckets[hour] += 1;
    }
  });

  const surveyDistribution = weeklyBucketsData.map((bucket) => ({
    category: bucket.label,
    completed: bucket.completed,
    pending: bucket.pending,
  }));

  const adminActivityBuckets = dayBuckets.map((bucket) => ({
    ...bucket,
    l1: 0,
    l2: 0,
    l3: 0,
  }));

  recentUsers.forEach((user) => {
    const createdAt = user.createdAt ? new Date(user.createdAt) : null;
    if (!createdAt) {
      return;
    }
    const bucket = adminActivityBuckets.find(
      (entry) => createdAt >= entry.start && createdAt < entry.end,
    );
    if (!bucket) {
      return;
    }
    if (user.role === "L1") {
      bucket.l1 += 1;
    } else if (user.role === "L2") {
      bucket.l2 += 1;
    } else if (user.role === "Booth Agent" || user.role === "BoothAgent") {
      bucket.l3 += 1;
    }
  });

  const adminActivityData = adminActivityBuckets.map((bucket) => ({
    day: bucket.label,
    l1: bucket.l1,
    l2: bucket.l2,
    l3: bucket.l3,
  }));

  const totalActivity = adminActivityData.reduce(
    (sum, row) => sum + row.l1 + row.l2 + row.l3,
    0,
  );
  const avgDailyLogins =
    adminActivityData.length > 0
      ? Math.round((totalActivity / adminActivityData.length) * 10) / 10
      : null;
  const peakHourCount = Math.max(...hourBuckets);
  const peakHourIndex = peakHourCount > 0 ? hourBuckets.indexOf(peakHourCount) : null;

  const trendSummary = {
    avgDailyLogins,
    peakHourActivity: peakHourIndex !== null ? formatHourWindow(peakHourIndex) : null,
    formsCreatedLast30Days,
    boothsActive,
    boothsTotal: totalBooths,
  };

  return {
    systemGrowthData,
    surveyDistribution,
    adminActivityData,
    trendSummary,
  };
};

// ==================== USER MANAGEMENT ROUTES ====================
// L0 can manage all users, L1 (ACIM) can create L2 (ACI) and BoothAgents

/**
 * GET /api/rbac/users
 * Get all users (with optional filters)
 * Access: L0, L1 (ACIM)
 */
router.get("/users", isAuthenticated, async (req, res) => {
  try {
    const { role, ac, search, status } = req.query;

    // Check permissions - L0, L1, and L2 can view users (with restrictions)
    if (req.user.role !== "L0" && req.user.role !== "L1" && req.user.role !== "L2") {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to view users",
      });
    }

    // Cache check - only use cache when no search filter (common case)
    const cacheKey = `users:${req.user.role}:${req.user.assignedAC || 'all'}:${role || 'all'}:${ac || 'all'}:${status || 'all'}`;
    if (!search) {
      const cached = getCache(cacheKey);
      if (cached) {
        return res.json(cached);
      }
    }

    // L0 can see all users (including inactive), L1/L2 only see active users
    const query = {};

    // Only filter by isActive for L1 and L2, L0 can see all users
    if (req.user.role !== "L0") {
      query.isActive = true;
    }

    // L1 (ACIM) can see ALL users across all ACs (no AC restriction)
    // L0 can also see all users
    // Only L2 is restricted to their assigned AC

    // L2 (ACI) can only see users in their AC
    if (req.user.role === "L2") {
      query.assignedAC = req.user.assignedAC;
    }

    // Filter by role
    if (role) {
      // Handle both "Booth Agent" and "BoothAgent" for backward compatibility
      if (role === "Booth Agent" || role === "BoothAgent") {
        query.$or = [{ role: "Booth Agent" }, { role: "BoothAgent" }];
      } else {
        query.role = role;
      }
    }

    // Filter by AC
    if (ac) {
      const acId = parseInt(ac);
      // L2 can only filter by their own AC, L0 and L1 can access any AC
      if (req.user.role === "L2" && acId !== req.user.assignedAC) {
        return res.status(403).json({
          success: false,
          message: "Access denied to users in this AC",
        });
      }
      query.assignedAC = acId;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Search by name, email, or phone
    if (search && search.trim()) {
      const searchTerm = search.trim();
      let searchFilter;

      // Use text search for 3+ characters (faster with text index)
      // Use regex for shorter searches (partial match support)
      if (searchTerm.length >= 3) {
        // Text search - uses the user_search_text index
        searchFilter = { $text: { $search: searchTerm } };
      } else {
        // Short search - use prefix regex for partial matches
        const escapedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = new RegExp(`^${escapedSearch}`, "i");
        searchFilter = {
          $or: [
            { name: searchRegex },
            { email: searchRegex },
            { phone: searchRegex },
          ]
        };
      }

      // If there's already a $and (from L1 + role filter), add search to it
      if (query.$and) {
        query.$and.push(searchFilter);
      } else if (query.$or) {
        // If there's a $or (from role filter or L1), combine with $and
        query.$and = [
          { $or: query.$or },
          searchFilter
        ];
        delete query.$or;
      } else if (searchFilter.$or) {
        query.$or = searchFilter.$or;
      } else {
        // For text search, add directly to query
        Object.assign(query, searchFilter);
      }
    }

    // Fetch all users without any limit
    // Remove any potential default limits by explicitly setting a very high limit
    const users = await User.find(query)
      .select("-password -passwordHash")
      .populate("createdBy", "name role")
      .populate("assignedBoothId", "boothName boothCode")
      .sort({ createdAt: -1 })
      .limit(10000) // Set a very high limit to ensure we get all users
      .lean()
      .exec();

    // Get the actual count to verify
    const totalCount = await User.countDocuments(query);

    // Also get total count without any filters for L0
    let totalInDatabase = totalCount;
    if (req.user.role === "L0") {
      totalInDatabase = await User.countDocuments({});
    }

    console.log(`[RBAC] Query:`, JSON.stringify(query, null, 2));
    console.log(`[RBAC] Fetched ${users.length} users out of ${totalCount} total matching query`);
    console.log(`[RBAC] Total users in database: ${totalInDatabase}`);

    const response = {
      success: true,
      count: users.length,
      totalCount: totalCount,
      totalInDatabase: totalInDatabase,
      users,
    };

    // Cache the response (only when no search filter)
    if (!search) {
      setCache(cacheKey, response, TTL.SHORT);
    }

    res.json(response);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
});

/**
 * POST /api/rbac/users
 * Create a new user
 * Access: L0 (all users), L1/ACIM (can create L2/ACI and BoothAgent)
 */
router.post("/users", isAuthenticated, async (req, res) => {
  try {
    const {
      name, email, phone, password, role, assignedAC, aci_name, assignedBoothId, status,
      booth_id, booth_agent_id, aci_id
    } = req.body;

    console.log("Create user request:", {
      name, role, assignedAC, booth_id, booth_agent_id, aci_id,
      currentUserRole: req.user.role, currentUserAC: req.user.assignedAC
    });

    // Validate required fields
    if (!name || !role) {
      return res.status(400).json({
        success: false,
        message: "Name and role are required",
      });
    }

    // Password is required for new users
    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
      });
    }

    // Check creation privileges
    if (req.user.role === "L0") {
      // L0 can create anyone
    } else if (req.user.role === "L1") {
      // L1 (ACIM) can create L1, L2 (ACI) and Booth Agent - but NOT L0
      if (role === "L0") {
        return res.status(403).json({
          success: false,
          message: "ACIM cannot create System Admin users",
        });
      }
      // L1 (ACIM) can access ALL ACs, so no AC restriction needed
    } else if (req.user.role === "L2") {
      // L2 can only create Booth Agents in their own AC
      if (role !== "Booth Agent" && role !== "BoothAgent") {
        return res.status(403).json({
          success: false,
          message: "ACI can only create Booth Agent users",
        });
      }
      // Must be in same AC
      const requestedAC = aci_id || assignedAC;
      const requestedACNum = typeof requestedAC === 'number' ? requestedAC : parseInt(requestedAC);
      const userAC = typeof req.user.assignedAC === 'number' ? req.user.assignedAC : parseInt(req.user.assignedAC);

      if (requestedAC && requestedACNum !== userAC) {
        return res.status(403).json({
          success: false,
          message: `You can only create users in your assigned AC (${userAC})`,
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to create users",
      });
    }

    // Validate role
    const validRoles = ["L0", "L1", "L2", "MLA", "Booth Agent", "BoothAgent"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    // For L2 and MLA, assignedAC is required
    if ((role === "L2" || role === "MLA") && !assignedAC && !aci_id) {
      return res.status(400).json({
        success: false,
        message: `assignedAC is required for role ${role}`,
      });
    }

    // For L1 (ACIM), assignedAC should NOT be set
    if (role === "L1" && (assignedAC || aci_id)) {
      return res.status(400).json({
        success: false,
        message: "ACIM (L1) users should not have an assigned AC",
      });
    }

    // Check if user already exists
    if (email || phone) {
      const existingUser = await User.findOne({
        $or: [
          email ? { email } : null,
          phone ? { phone } : null,
        ].filter(Boolean),
        isActive: true,
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "User with this email or phone already exists",
        });
      }
    }

    // Auto-generate booth_agent_id for Booth Agent role if not provided
    // Simplified: No longer uses Booth collection, booth info stored directly in user document
    let finalBoothAgentId = booth_agent_id;
    let boothIdentifier = assignedBoothId || booth_id; // Use the booth_id string directly

    if ((role === "Booth Agent" || role === "BoothAgent") && boothIdentifier && !booth_agent_id) {
      // Count existing agents assigned to this specific booth (by booth_id string)
      const existingAgentsCount = await User.countDocuments({
        role: { $in: ["Booth Agent", "BoothAgent"] },
        isActive: true,
        booth_id: boothIdentifier
      });

      // Generate booth_agent_id: {booth_id}-{sequence}
      let sequence = existingAgentsCount + 1;
      finalBoothAgentId = `${boothIdentifier}-${sequence}`;

      // Check if booth_agent_id already exists
      let existingAgentId = await User.findOne({ booth_agent_id: finalBoothAgentId });
      while (existingAgentId) {
        sequence++;
        finalBoothAgentId = `${boothIdentifier}-${sequence}`;
        existingAgentId = await User.findOne({ booth_agent_id: finalBoothAgentId });
      }

      console.log(`Auto-generated booth_agent_id: ${finalBoothAgentId} for booth ${boothIdentifier}`);
    }

    // Check if booth_agent_id already exists (if manually provided)
    if (finalBoothAgentId) {
      const existingAgent = await User.findOne({ booth_agent_id: finalBoothAgentId });
      if (existingAgent) {
        return res.status(409).json({
          success: false,
          message: "Booth agent ID already exists",
        });
      }
    }

    // Use booth_id directly (no Booth collection lookup needed)
    let finalBoothId = booth_id || assignedBoothId;

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user with all fields (including mobile app fields)
    const newUser = new User({
      name,
      email,
      phone,
      passwordHash,
      password: passwordHash, // Store in both fields for compatibility
      role,
      assignedAC: aci_id || assignedAC || (req.user.role === "L1" ? req.user.assignedAC : undefined),
      aci_id: aci_id || assignedAC,
      aci_name: aci_name || (req.user.role === "L1" ? req.user.aci_name : undefined),
      // assignedBoothId removed - no longer using Booth collection
      booth_id: finalBoothId,
      booth_agent_id: finalBoothAgentId,
      status: status || "Active",
      createdBy: req.user._id,
      isActive: true,
      // Mobile app fields
      emailVerified: false,
      loginAttempts: 0,
    });

    await newUser.save();

    // Return user without password
    const userResponse = await User.findById(newUser._id)
      .select("-password -passwordHash")
      .populate("createdBy", "name role");

    // Invalidate user caches to ensure fresh data on next fetch
    invalidateCache('users:');
    invalidateCache('booth-agents:');

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: userResponse,
      booth_agent_id: newUser.booth_agent_id,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create user",
      error: error.message,
    });
  }
});

/**
 * Normalize phone number - remove spaces, dashes, and keep only digits
 * @param {string|number} phone - Phone number to normalize
 * @returns {string} Normalized phone number
 */
function normalizePhone(phone) {
  if (!phone) return phone;
  // Convert to string and remove all non-digit characters
  const normalized = String(phone).replace(/\D/g, '');
  return normalized || phone; // Return original if normalization results in empty string
}

/**
 * POST /api/rbac/users/booth-agent
 * Create a new booth agent (dedicated endpoint)
 * Access: L0, L1, L2
 */
router.post("/users/booth-agent", isAuthenticated, async (req, res) => {
  try {
    const {
      username,
      password,
      fullName,
      phoneNumber,
      booth_id,
      aci_id,
      aci_name
    } = req.body;

    console.log("Create booth agent request:", {
      username, fullName, phoneNumber, booth_id, aci_id,
      currentUserRole: req.user.role, currentUserAC: req.user.assignedAC
    });

    // Validate required fields
    if (!username || !password || !fullName || !phoneNumber || !booth_id || !aci_id) {
      return res.status(400).json({
        success: false,
        message: "All fields are required (username, password, fullName, phoneNumber, booth_id, aci_id)",
      });
    }

    // Normalize phone number
    const normalizedPhone = normalizePhone(phoneNumber);

    // Check creation privileges
    if (req.user.role === "L0") {
      // L0 can create anyone
    } else if (req.user.role === "L1") {
      // L1 (ACIM) can only create in their AC
      const requestedACNum = typeof aci_id === 'number' ? aci_id : parseInt(aci_id);
      const userAC = typeof req.user.assignedAC === 'number' ? req.user.assignedAC : parseInt(req.user.assignedAC);

      if (requestedACNum !== userAC) {
        return res.status(403).json({
          success: false,
          message: `You can only create booth agents in your assigned AC (${userAC})`,
        });
      }
    } else if (req.user.role === "L2") {
      // L2 (ACI) can only create in their AC
      const requestedACNum = typeof aci_id === 'number' ? aci_id : parseInt(aci_id);
      const userAC = typeof req.user.assignedAC === 'number' ? req.user.assignedAC : parseInt(req.user.assignedAC);

      if (requestedACNum !== userAC) {
        return res.status(403).json({
          success: false,
          message: `You can only create booth agents in your assigned AC (${userAC})`,
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to create booth agents",
      });
    }

    // Simplified: No longer uses Booth collection
    // Booth info is stored directly in user document, booth data comes from voter collections
    const aciIdNum = typeof aci_id === 'number' ? aci_id : parseInt(aci_id);

    // Normalize booth_id - handle various formats
    let boothIdentifier = booth_id;
    if (booth_id.startsWith('voter-booth-')) {
      const parts = booth_id.split('-');
      const acIdFromId = parseInt(parts[2]);
      const boothNumberFromId = parseInt(parts[3]);
      boothIdentifier = `BOOTH${boothNumberFromId}-${acIdFromId}`;
    }

    // Check if user already exists (by email/username or phone)
    // Check both normalized and original phone for backward compatibility
    const existingUser = await User.findOne({
      $or: [
        { email: username.toLowerCase() },
        { phone: normalizedPhone },
        { phone: phoneNumber }, // Also check original format for backward compatibility
      ],
      isActive: true,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this username or phone number already exists",
      });
    }

    // Generate booth_agent_id
    // Format: {booth_id}-{sequence} where sequence is the number of agents for this booth
    // Count existing agents assigned to this specific booth (by booth_id string)
    const existingAgentsCount = await User.countDocuments({
      booth_id: boothIdentifier,
      role: { $in: ["Booth Agent", "BoothAgent"] },
      isActive: true
    });

    // Generate booth_agent_id: {booth_id}-{sequence}
    let sequence = existingAgentsCount + 1;
    let booth_agent_id = `${boothIdentifier}-${sequence}`;

    // Check if booth_agent_id already exists (unlikely but possible)
    let existingAgentId = await User.findOne({ booth_agent_id });
    while (existingAgentId) {
      // Try with incremented sequence
      sequence++;
      booth_agent_id = `${boothIdentifier}-${sequence}`;
      existingAgentId = await User.findOne({ booth_agent_id });
    }

    console.log(`Generated booth_agent_id: ${booth_agent_id} for booth ${boothIdentifier} (${existingAgentsCount} existing agents)`);

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create booth agent user
    // Store username in email field for login purposes
    // Store normalized phone number for consistency
    // Simplified: No longer uses Booth collection ObjectId reference
    const newUser = new User({
      email: username.toLowerCase(),
      name: fullName.trim(),
      phone: normalizedPhone, // Store normalized phone as string
      passwordHash,
      password: passwordHash, // Store in both fields for compatibility
      role: "Booth Agent",
      assignedAC: aciIdNum,
      aci_id: aciIdNum,
      aci_name: aci_name || `AC ${aciIdNum}`,
      // assignedBoothId removed - no longer using Booth collection
      booth_id: boothIdentifier, // Store the booth identifier string (e.g., "BOOTH1-111")
      booth_agent_id,
      status: "Active",
      createdBy: req.user._id,
      isActive: true,
      // Mobile app fields
      emailVerified: false,
      loginAttempts: 0,
    });

    console.log(`Creating booth agent with booth: ${boothIdentifier}`);

    await newUser.save();

    // Return user without password
    const userResponse = await User.findById(newUser._id)
      .select("-password -passwordHash")
      .populate("createdBy", "name role");

    // Invalidate caches to ensure fresh data on next fetch
    invalidateCache('users:');
    invalidateCache('booth-agents:');
    invalidateCache('booths');

    res.status(201).json({
      success: true,
      message: "Booth agent created successfully",
      user: userResponse,
      booth_agent_id: newUser.booth_agent_id,
    });
  } catch (error) {
    console.error("Error creating booth agent:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create booth agent",
      error: error.message,
    });
  }
});

/**
 * PUT /api/rbac/users/:userId
 * Update an existing user
 * Access: L0, L1 (for users they created)
 */
router.put("/users/:userId", isAuthenticated, async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, fullName, email, phone, phoneNumber, password, role, assignedAC, aci_name, assignedBoothId, booth_id, status, isActive } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check update permissions
    if (req.user.role !== "L0") {
      // L1 (ACIM) can update L1, L2, and BoothAgent users - but NOT L0
      if (req.user.role === "L1") {
        if (user.role === "L0") {
          return res.status(403).json({
            success: false,
            message: "ACIM cannot update System Admin users",
          });
        }
        // L1 can update all other user types (L1, L2, BoothAgent)
      }
      // L2 can update booth agents in their AC
      else if (req.user.role === "L2") {
        // L2 can only update booth agents (not other user types)
        if (user.role !== "Booth Agent" && user.role !== "BoothAgent") {
          return res.status(403).json({
            success: false,
            message: "ACI can only update booth agents",
          });
        }
        // L2 can only update agents in their assigned AC
        if (user.assignedAC !== req.user.assignedAC) {
          return res.status(403).json({
            success: false,
            message: "You can only update booth agents in your assigned AC",
          });
        }
      } else {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to update users",
        });
      }
    }

    // Update fields (support both naming conventions)
    if (name || fullName) user.name = name || fullName;
    if (email) user.email = email;
    if (phone || phoneNumber) user.phone = phone || phoneNumber;
    if (role && req.user.role === "L0") user.role = role; // Only L0 can change roles
    if (assignedAC !== undefined) user.assignedAC = assignedAC;
    if (aci_name) user.aci_name = aci_name;
    if (status) user.status = status;
    if (isActive !== undefined && req.user.role === "L0") user.isActive = isActive;

    // Handle booth assignment update for booth agents
    // Simplified: No longer uses Booth collection, just stores booth_id string
    const newBoothId = booth_id || assignedBoothId;
    if (newBoothId !== undefined && (user.role === "Booth Agent" || user.role === "BoothAgent")) {
      // Normalize booth_id - handle various formats
      let boothIdentifier = newBoothId;
      if (newBoothId.startsWith('voter-booth-')) {
        const parts = newBoothId.split('-');
        const acIdFromId = parseInt(parts[2]);
        const boothNumberFromId = parseInt(parts[3]);
        boothIdentifier = `BOOTH${boothNumberFromId}-${acIdFromId}`;
      }

      // Update user's booth_id field directly
      user.booth_id = boothIdentifier;
      // Clear assignedBoothId as we no longer use Booth collection
      user.assignedBoothId = undefined;

      console.log(`Updating booth agent ${user._id} booth assignment to: ${boothIdentifier}`);
    }

    // Update password if provided - update both fields for compatibility
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user.passwordHash = hashedPassword;
      user.password = hashedPassword; // Keep both fields in sync
    }

    await user.save();

    const userResponse = await User.findById(user._id)
      .select("-password -passwordHash")
      .populate("createdBy", "name role");

    // Invalidate caches to ensure fresh data on next fetch
    invalidateCache('users:');
    invalidateCache('booth-agents:');

    res.json({
      success: true,
      message: "User updated successfully",
      user: userResponse,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user",
      error: error.message,
    });
  }
});

/**
 * DELETE /api/rbac/users/:userId
 * Permanently delete a user from the database
 * Access: L0 (all users), L1 (users they created), L2 (booth agents in their AC)
 */
router.delete("/users/:userId", isAuthenticated, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check permissions - L0, L1, and L2 can delete users
    if (!["L0", "L1", "L2"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete users",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // L2 users can only delete booth agents within their assigned AC
    if (req.user.role === "L2") {
      // Check for both "BoothAgent" and "Booth Agent" role formats
      if (user.role !== "BoothAgent" && user.role !== "Booth Agent") {
        return res.status(403).json({
          success: false,
          message: "You can only delete booth agents",
        });
      }
      if (user.assignedAC !== req.user.assignedAC) {
        return res.status(403).json({
          success: false,
          message: "You can only delete booth agents in your assigned AC",
        });
      }
    }

    // L1 (ACIM) can delete L1, L2, and BoothAgent users - but NOT L0
    if (req.user.role === "L1") {
      if (user.role === "L0") {
        return res.status(403).json({
          success: false,
          message: "ACIM cannot delete System Admin users",
        });
      }
      // L1 can delete all other user types (L1, L2, BoothAgent)
    }

    // No longer need to update Booth collection since we don't use it for agent tracking
    // Agent-booth relationship is stored in user document only

    // Permanently delete the user from the database
    await User.findByIdAndDelete(userId);

    // Invalidate caches to ensure fresh data on next fetch
    invalidateCache('users:');
    invalidateCache('booth-agents:');
    invalidateCache('booths');

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: error.message,
    });
  }
});

// ==================== BOOTH MANAGEMENT ROUTES ====================
// L0, L1, L2 can manage booths (with AC restrictions for L1/L2)

/**
 * GET /api/rbac/booths
 * Get booths from voter collections (source of truth)
 * Aggregates booth data from voter_{AC_ID} collections
 * Access: L0, L1, L2
 */
router.get("/booths", isAuthenticated, canManageBooths, validateACAccess, async (req, res) => {
  try {
    const { ac, search, source, page = 1, limit = 500 } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 500;

    // Validate AC filter for L1/L2 users
    if (ac) {
      const acId = parseInt(ac);
      if (!canAccessAC(req.user, acId)) {
        return res.status(403).json({
          success: false,
          message: "Access denied to this AC",
        });
      }
    }

    // Determine the target AC for voter data aggregation
    const targetAC = ac ? parseInt(ac) : req.user.assignedAC;

    // OPTIMIZATION: Cache booth list for AC (only when no search)
    if (targetAC && !search) {
      const cacheKey = `ac:${targetAC}:booths:page${pageNum}:limit${limitNum}`;
      const cached = getCache(cacheKey, TTL.BOOTH_LIST);
      if (cached) {
        return res.json(cached);
      }
    }

    let booths = [];

    // Always aggregate booths from voter collections when AC is specified
    if (targetAC) {
      try {
        // OPTIMIZATION: Try to use precomputed stats first (fast path)
        // This avoids running heavy aggregations on 3-5 lakh documents
        let voterBooths = null;

        const precomputed = await getPrecomputedStats(targetAC, 60 * 60 * 1000); // 1 hour max age for booth list
        if (precomputed && precomputed.boothStats && precomputed.boothStats.length > 0) {
          // Use precomputed booth stats (fast - single document read)
          voterBooths = precomputed.boothStats.map(b => ({
            _id: b.boothId,
            boothno: b.boothNo,
            boothname: b.boothName,
            aci_id: targetAC,
            aci_name: precomputed.acName,
            totalVoters: b.voters
          }));
          console.log(`[RBAC Booths] Using precomputed stats for AC ${targetAC} (${voterBooths.length} booths)`);
        } else {
          // FALLBACK: Aggregate from voter collection (slow path - should rarely happen)
          console.log(`[RBAC Booths] Precomputed stats not available for AC ${targetAC}, using aggregation`);
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

        // Get booth agents for this AC from users collection
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

        // Transform voter data into booth format
        booths = voterBooths.map((vb, index) => {
          const boothId = vb._id; // e.g., "BOOTH1-111"
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

        // Apply search filter if provided
        if (search) {
          const searchRegex = new RegExp(search, "i");
          booths = booths.filter(b =>
            searchRegex.test(b.boothName) || searchRegex.test(b.boothCode)
          );
        }
      } catch (voterError) {
        console.error("Error aggregating booths from voter data:", voterError);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch booth data from voter collection",
          error: voterError.message
        });
      }
    } else {
      // L0 user without AC filter - no booths to show (they must select an AC first)
      return res.json({
        success: true,
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

    // OPTIMIZATION: Cache the response (only when no search)
    if (targetAC && !search) {
      const cacheKey = `ac:${targetAC}:booths:page${pageNum}:limit${limitNum}`;
      setCache(cacheKey, response, TTL.BOOTH_LIST);
    }

    res.json(response);
  } catch (error) {
    console.error("Error fetching booths:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch booths",
      error: error.message,
    });
  }
});

/**
 * POST /api/rbac/booths
 * DISABLED - Booths are derived from voter data
 * Booth data comes from voter collections, not the booths collection
 */
router.post("/booths", isAuthenticated, canManageBooths, async (req, res) => {
  res.status(410).json({
    success: false,
    message: "Manual booth creation is disabled. Booths are derived from voter data.",
  });
});

/**
 * PUT /api/rbac/booths/:boothId
 * DISABLED - Booths are derived from voter data
 */
router.put("/booths/:boothId", isAuthenticated, canManageBooths, async (req, res) => {
  res.status(410).json({
    success: false,
    message: "Manual booth update is disabled. Booths are derived from voter data.",
  });
});

/**
 * DELETE /api/rbac/booths/:boothId
 * DISABLED - Booths are derived from voter data
 */
router.delete("/booths/:boothId", isAuthenticated, canManageBooths, async (req, res) => {
  res.status(410).json({
    success: false,
    message: "Manual booth deletion is disabled. Booths are derived from voter data.",
  });
});

// ==================== BOOTH AGENT MANAGEMENT ROUTES ====================
// L0, L1, L2 can manage booth agents and assignments

/**
 * GET /api/rbac/booth-agents
 * Get booth agents (filtered by AC for L1/L2)
 * Access: L0, L1, L2
 */
router.get("/booth-agents", isAuthenticated, canManageBoothAgents, validateACAccess, async (req, res) => {
  try {
    const { ac, assigned, search } = req.query;

    // OPTIMIZATION: Check cache first (10 min TTL for booth agents)
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

    // Apply AC filter for L2 only (L0 and L1 can access all ACs)
    if (req.user.role === "L2") {
      query.assignedAC = req.user.assignedAC;
    }

    // Additional AC filter from query params
    if (ac) {
      const acId = parseInt(ac);
      // L2 can only access their own AC, L0 and L1 can access any AC
      if (req.user.role === "L2" && acId !== req.user.assignedAC) {
        return res.status(403).json({
          success: false,
          message: "Access denied to agents in this AC",
        });
      }
      query.assignedAC = acId;
    }

    // BUGFIX: Search by name or phone (preserve role filter)
    if (search && search.trim()) {
      const searchTerm = search.trim();
      let searchCondition;

      // Use text search for 3+ characters (faster with text index)
      // Use regex for shorter searches (partial match support)
      if (searchTerm.length >= 3) {
        // Text search - uses the user_search_text index
        searchCondition = { $text: { $search: searchTerm } };
      } else {
        // Short search - use prefix regex for partial matches
        const escapedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = new RegExp(`^${escapedSearch}`, "i");
        searchCondition = {
          $or: [{ name: searchRegex }, { phone: searchRegex }]
        };
      }

      // Combine with existing query using $and to preserve role filter
      if (query.$or) {
        query = {
          $and: [
            { $or: query.$or },  // Preserve role filter
            searchCondition
          ],
          isActive: query.isActive,
          ...(query.assignedAC && { assignedAC: query.assignedAC })
        };
      } else if (searchCondition.$or) {
        Object.assign(query, searchCondition);
      } else {
        // For text search, add directly to query
        Object.assign(query, searchCondition);
      }
    }

    // OPTIMIZATION: Use .lean() for better performance (returns plain JS objects)
    const agents = await User.find(query)
      .select("-password -passwordHash")
      .sort({ name: 1 })
      .lean();

    // Simplified: Filter by assigned status using booth_id field directly
    let filteredAgents = agents;
    if (assigned !== undefined) {
      const isAssigned = assigned === "true";
      filteredAgents = agents.filter((agent) => {
        const hasBoothAssignment = !!agent.booth_id;
        return isAssigned ? hasBoothAssignment : !hasBoothAssignment;
      });
    }

    // Transform agents to include booth info in a format the frontend expects
    // Simplified: No longer uses Booth collection, booth info comes from booth_id string
    const transformedAgents = filteredAgents.map(agent => {
      const agentObj = agent.toObject ? agent.toObject() : agent;

      // Get booth info from booth_id string
      let boothNo = null;
      let boothId = agentObj.booth_id || null;

      if (agentObj.booth_id) {
        // Extract booth number from booth_id string (e.g., "BOOTH1-101" -> "1", "ac101002" -> "002")
        const boothMatch = agentObj.booth_id.match(/^BOOTH(\d+)-(\d+)$/);
        const acMatch = agentObj.booth_id.match(/^ac(\d+)(\d{3})$/);
        if (boothMatch) {
          boothNo = boothMatch[1];
        } else if (acMatch) {
          boothNo = parseInt(acMatch[2]).toString();
        }
      }

      return {
        ...agentObj,
        boothNo: boothNo,
        boothId: boothId,
      };
    });

    const response = {
      success: true,
      count: transformedAgents.length,
      agents: transformedAgents,
    };

    // OPTIMIZATION: Cache the result (10 min TTL)
    setCache(cacheKey, response, TTL.MEDIUM);

    res.json(response);
  } catch (error) {
    console.error("Error fetching booth agents:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch booth agents",
      error: error.message,
    });
  }
});

/**
 * POST /api/rbac/booth-agents/:boothId/assign
 * DEPRECATED: Booth collection is no longer used. Agent assignment is done via user's booth_id field.
 * Use PUT /booth-agents/:agentId/assign-booth instead
 */
router.post("/booth-agents/:boothId/assign", isAuthenticated, canAssignAgents, validateACAccess, async (req, res) => {
  res.status(410).json({
    success: false,
    message: "This endpoint is deprecated. Use PUT /api/rbac/booth-agents/:agentId/assign-booth instead. Booth assignments are now stored directly on user documents.",
  });
});

/**
 * DELETE /api/rbac/booth-agents/:boothId/unassign/:agentId
 * DEPRECATED: Booth collection is no longer used. Agent assignment is done via user's booth_id field.
 * Use PUT /booth-agents/:agentId/assign-booth with no boothId to unassign
 */
router.delete("/booth-agents/:boothId/unassign/:agentId", isAuthenticated, canAssignAgents, validateACAccess, async (req, res) => {
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
 * @body booth_id - String identifier for the booth (e.g., "ac101002", "BOOTH2-101"). Send empty/null to unassign.
 */
router.put("/booth-agents/:agentId/assign-booth", isAuthenticated, canAssignAgents, validateACAccess, async (req, res) => {
  try {
    const { agentId } = req.params;
    // Accept both booth_id (string) and boothId (legacy) for backwards compatibility
    const boothIdInput = req.body.booth_id || req.body.boothId;

    // Find agent
    const agent = await User.findById(agentId);
    if (!agent || (agent.role !== "Booth Agent" && agent.role !== "BoothAgent") || !agent.isActive) {
      return res.status(404).json({
        success: false,
        message: "Booth agent not found",
      });
    }

    // Check AC access for agent
    if (req.user.role !== "L0" && agent.assignedAC && agent.assignedAC !== req.user.assignedAC) {
      return res.status(403).json({
        success: false,
        message: "Access denied to this agent",
      });
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

      // Extract AC from booth_id for validation (formats: "ac101002", "BOOTH2-101")
      let boothAC = null;
      if (normalizedBoothId.startsWith('ac')) {
        // Format: ac101002 -> AC 101
        boothAC = parseInt(normalizedBoothId.substring(2, 5));
      } else if (normalizedBoothId.includes('-')) {
        // Format: BOOTH2-101 -> AC 101
        const parts = normalizedBoothId.split('-');
        boothAC = parseInt(parts[parts.length - 1]);
      }

      // Verify booth and agent are in same AC (if we can determine booth AC)
      if (boothAC && agent.assignedAC && agent.assignedAC !== boothAC) {
        return res.status(400).json({
          success: false,
          message: "Agent and booth must be in the same AC",
        });
      }

      // Check AC access for the booth
      if (boothAC && !canAccessAC(req.user, boothAC)) {
        return res.status(403).json({
          success: false,
          message: "Access denied to this booth",
        });
      }

      agent.booth_id = normalizedBoothId;
      agent.assignedBoothId = undefined; // Clear legacy field
    } else {
      // Unassign booth
      agent.booth_id = undefined;
      agent.assignedBoothId = undefined;
    }

    await agent.save();

    const agentResponse = await User.findById(agent._id)
      .select("-password -passwordHash");

    // Invalidate caches to ensure fresh data on next fetch
    invalidateCache('booth-agents:');
    invalidateCache('booths');
    invalidateCache('users:');

    res.json({
      success: true,
      message: boothIdInput ? "Agent assigned to booth successfully" : "Agent unassigned from booth",
      agent: agentResponse,
    });
  } catch (error) {
    console.error("Error assigning booth to agent:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign booth to agent",
      error: error.message,
    });
  }
});

// ==================== DASHBOARD & STATISTICS ====================

/**
 * GET /api/rbac/dashboard/stats
 * Get dashboard statistics
 * Access: L0, L1, L2
 * OPTIMIZED: Uses precomputed stats for booth count (from voter data)
 * Agent assignment stats come from user documents (booth_id field)
 */
router.get("/dashboard/stats", isAuthenticated, validateACAccess, async (req, res) => {
  try {
    const assignedAC = req.user.role === "L0" ? null : resolveAssignedACFromUser(req.user);

    // Check cache for L0 users (expensive cross-AC queries)
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

    // L0 gets additional user counts - parallelize these too
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

    // Cache the response
    setCache(cacheKey, response, TTL.DASHBOARD_STATS);

    res.json(response);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
      error: error.message,
    });
  }
});

/**
 * GET /api/rbac/dashboard/ac-overview
 * Batched AC performance stats to avoid hundreds of client requests
 * Access: L0 (all ACs), L1/L2 (their AC only)
 * OPTIMIZED: Added caching for L0 users (5 minute TTL)
 */
router.get("/dashboard/ac-overview", isAuthenticated, async (req, res) => {
  try {
    // L0 and L1 have access to ALL ACs, L2 is restricted to assignedAC
    const limitToAc =
      req.user.role === "L2"
        ? resolveAssignedACFromUser(req.user)
        : null;

    if (req.user.role === "L2" && limitToAc === null) {
      return res.status(403).json({
        success: false,
        message: "No AC assigned to your account.",
      });
    }

    // Check cache for L0 users (expensive cross-AC queries)
    const cacheKey = limitToAc === null
      ? 'L0:ac:overview'
      : `ac:${limitToAc}:overview`;

    const cached = getCache(cacheKey, TTL.DASHBOARD_STATS);
    if (cached) {
      return res.json(cached);
    }

    // User query is always needed (small collection, fast)
    const userMatch = {
      isActive: { $ne: false },
      role: { $in: ["L1", "L2", "Booth Agent", "BoothAgent"] },
    };
    if (limitToAc !== null) {
      userMatch.assignedAC = limitToAc;
    }

    let voterAggregation;

    if (limitToAc === null) {
      // L0 user: Use precomputed stats (FAST - no heavy aggregation)
      const [allPrecomputed, users] = await Promise.all([
        getAllPrecomputedStats(),
        User.find(userMatch).select("role assignedAC").lean()
      ]);

      // Transform precomputed stats to match expected format
      voterAggregation = allPrecomputed.map(stat => ({
        _id: { acId: stat.acId, acName: stat.acName },
        totalMembers: stat.totalMembers || 0,
        surveyedMembers: stat.surveysCompleted || 0,
        families: stat.totalFamilies || 0,
        booths: stat.totalBooths || 0,
      }));

      // Process users outside the parallel block
      var usersData = users;
    } else {
      // L1/L2 user: Run aggregation on single AC (acceptable)
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
      var usersData = users;
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

    // Deduplicate and merge AC data by acId (fix for duplicate entries)
    const acDataMap = new Map();

    voterAggregation.forEach((entry) => {
      const acId = entry._id.acId;
      if (acId === null || acId === undefined) return;

      const acName = entry._id.acName;
      const voters = entry.totalMembers || 0;
      const surveyedMembers = entry.surveyedMembers || 0;
      const families = entry.families || 0;
      const booths = entry.booths || 0;

      // Merge with existing data if AC already exists (handles duplicates)
      if (acDataMap.has(acId)) {
        const existing = acDataMap.get(acId);
        existing.voters += voters;
        existing.surveyedMembers += surveyedMembers;
        existing.families += families;
        existing.booths += booths;
        // Keep the most complete acName
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

    // Include ACs that only have user data (no voters yet)
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

    // Cache the response
    setCache(cacheKey, response, TTL.DASHBOARD_STATS);

    res.json(response);
  } catch (error) {
    console.error("Error building AC overview stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to build AC overview stats",
      error: error.message,
    });
  }
});

/**
 * GET /api/rbac/booths/:boothId/agents
 * Get all agents assigned to a specific booth
 * SIMPLIFIED: Queries users by booth_id field instead of using Booth collection
 * Access: L0, L1, L2
 * @param boothId - booth_id string (e.g., "ac101002", "voter-booth-101-2")
 */
router.get("/booths/:boothId/agents", isAuthenticated, async (req, res) => {
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
      return res.status(403).json({
        success: false,
        message: "Access denied to this booth",
      });
    }

    // Query users by booth_id field
    const agents = await User.find({
      booth_id: boothId,
      $or: [{ role: "Booth Agent" }, { role: "BoothAgent" }],
      isActive: true
    })
      .select("name phone email booth_agent_id booth_id status isActive assignedAC")
      .lean();

    res.json({
      success: true,
      booth: {
        booth_id: boothId,
        acId: boothAC,
      },
      agents: agents,
      primaryAgent: null, // No longer tracking primary agent in Booth collection
    });
  } catch (error) {
    console.error("Error fetching booth agents:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch booth agents",
      error: error.message,
    });
  }
});

export default router;
