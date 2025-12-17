/**
 * RBAC Routes - Shared Helper Functions
 * Common utilities used across RBAC route handlers
 */

import mongoose from "mongoose";
import Survey from "../../models/Survey.js";
import User from "../../models/User.js";
import { resolveAssignedACFromUser } from "../../utils/ac.js";
import {
  aggregateVoters
} from "../../utils/voterCollection.js";
import {
  querySurveyResponses
} from "../../utils/surveyResponseCollection.js";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Check if error is a namespace not found error
 */
export const isNamespaceMissingError = (error) =>
  error?.codeName === "NamespaceNotFound" ||
  error?.message?.toLowerCase?.().includes("ns not found");

/**
 * Get start of day for a date
 */
export const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/**
 * Get start of week (Sunday) for a date
 */
export const startOfWeek = (date) => {
  const start = startOfDay(date);
  const day = start.getDay(); // Sunday = 0
  start.setDate(start.getDate() - day);
  return start;
};

/**
 * Create month buckets for time-series data
 * @param {number} count - Number of months
 */
export const createMonthBuckets = (count = 5) => {
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

/**
 * Create week buckets for time-series data
 * @param {number} count - Number of weeks
 */
export const createWeekBuckets = (count = 6) => {
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

/**
 * Create day buckets for time-series data
 * @param {number} count - Number of days
 */
export const createDayBuckets = (count = 7) => {
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

/**
 * Format hour window (e.g., "9 AM - 10 AM")
 */
export const formatHourWindow = (hour) => {
  if (!Number.isFinite(hour) || hour < 0) {
    return null;
  }
  const normalize = (value) => (value % 12 === 0 ? 12 : value % 12);
  const suffix = (value) => (value < 12 ? "AM" : "PM");
  const endHour = (hour + 1) % 24;
  return `${normalize(hour)} ${suffix(hour)} - ${normalize(endHour)} ${suffix(endHour)}`;
};

/**
 * Aggregate counts by month for a model
 */
export const aggregateCountsByMonth = async (model, baseMatch, buckets, dateField = "createdAt") => {
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

/**
 * Aggregate voter counts by month from AC-specific collections
 * OPTIMIZATION: Skip heavy cross-AC aggregation for L0 users to prevent 100% CPU
 */
export const aggregateVoterCountsByMonth = async (assignedAC, buckets, dateField = "createdAt") => {
  if (buckets.length === 0) {
    return [];
  }

  // OPTIMIZATION: For L0 users (all ACs), skip this heavy aggregation
  if (assignedAC === null) {
    console.log('[Dashboard Analytics] Skipping heavy voter aggregation for L0 user');
    return buckets.map(() => 0);
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
    results = await aggregateVoters(assignedAC, pipeline);
  } catch (error) {
    console.error("Error aggregating voter counts:", error);
  }

  const lookup = new Map();
  results.forEach((item) => {
    const key = `${item._id.year}-${item._id.month}`;
    lookup.set(key, (lookup.get(key) || 0) + item.count);
  });

  return buckets.map((bucket) => lookup.get(`${bucket.year}-${bucket.month}`) || 0);
};

/**
 * Build dashboard analytics data
 */
export const buildDashboardAnalytics = async ({ assignedAC, totalBooths, boothsActive }) => {
  const monthBuckets = createMonthBuckets(5);
  const weekBuckets = createWeekBuckets(6);
  const dayBuckets = createDayBuckets(7);

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

  const [voterMonthlyCounts, surveyMonthlyCounts, agentMonthlyCounts] = await Promise.all([
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
    if (assignedAC !== null) {
      surveyResponses = await querySurveyResponses(assignedAC, surveyResponseDateFilter, {
        select: { createdAt: 1, submittedAt: 1, updatedAt: 1, status: 1 }
      });
    } else {
      console.log('[Dashboard Analytics] Skipping heavy survey response query for L0 user');
      surveyResponses = [];
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

export default {
  isNamespaceMissingError,
  startOfDay,
  startOfWeek,
  createMonthBuckets,
  createWeekBuckets,
  createDayBuckets,
  formatHourWindow,
  aggregateCountsByMonth,
  aggregateVoterCountsByMonth,
  buildDashboardAnalytics
};
