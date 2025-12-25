import express from "express";
import mongoose from "mongoose";
import { connectToDatabase } from "../config/database.js";
import { escapeRegExp } from "../utils/helpers.js";
import { aggregateVoters, getVoterModel, ALL_AC_IDS } from "../utils/voterCollection.js";
import {
  getSurveyResponseModel,
  querySurveyResponses,
  countSurveyResponses,
  queryAllSurveyResponses,
  countAllSurveyResponses
} from "../utils/surveyResponseCollection.js";
import {
  normalizeSurveyResponse,
  enrichAcFields
} from "../utils/universalAdapter.js";
import Survey from "../models/Survey.js";
import { isAuthenticated, canAccessAC } from "../middleware/auth.js";
import { getCache, setCache, TTL } from "../utils/cache.js";

const router = express.Router();

// Apply authentication to all routes
router.use(isAuthenticated);

// Survey form cache to avoid N+1 queries
const surveyFormCache = new Map();
const SURVEY_FORM_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Batch fetch survey forms - called once per request with all unique surveyIds
const batchFetchSurveyForms = async (surveyIds) => {
  const uniqueIds = [...new Set(surveyIds.filter(Boolean).map(String))];
  const result = new Map();
  const toFetch = [];
  const now = Date.now();

  // Check cache first
  for (const id of uniqueIds) {
    const cached = surveyFormCache.get(id);
    if (cached && (now - cached.timestamp) < SURVEY_FORM_CACHE_TTL) {
      result.set(id, cached.form);
    } else {
      toFetch.push(id);
    }
  }

  // Fetch missing forms in one query
  if (toFetch.length > 0) {
    try {
      const forms = await Survey.find({ _id: { $in: toFetch } }).lean();
      for (const form of forms) {
        const id = form._id.toString();
        surveyFormCache.set(id, { form, timestamp: now });
        result.set(id, form);
      }
    } catch (err) {
      console.log(`Batch fetch survey forms error: ${err.message}`);
    }
  }

  return result;
};

// Synchronous question text population using pre-fetched form
const populateQuestionTextSync = (answers, surveyForm) => {
  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    return answers;
  }

  const questionMap = new Map();
  if (surveyForm && surveyForm.questions) {
    surveyForm.questions.forEach((q) => {
      if (q.id) questionMap.set(q.id, q.text || q.prompt || 'Question');
      if (q._id) questionMap.set(q._id.toString(), q.text || q.prompt || 'Question');
    });
  }

  return answers.map((answer, index) => {
    if (answer.question && typeof answer.question === 'string' && answer.question.length > 0 && !/^\d+$/.test(answer.question)) {
      return answer;
    }
    const qId = answer.questionId || answer.question;
    const questionText = qId ? questionMap.get(String(qId)) : null;
    return {
      ...answer,
      question: questionText || answer.prompt || `Question ${index + 1}`,
      questionId: qId || answer.questionId
    };
  });
};

// Legacy helper function to populate question text from survey form (kept for compatibility)
const populateQuestionText = async (answers, surveyId) => {
  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    return answers;
  }

  // Try to fetch the survey form to get question text
  let surveyForm = null;
  if (surveyId) {
    try {
      surveyForm = await Survey.findById(surveyId);
    } catch (err) {
      // surveyId might not be a valid ObjectId
      console.log(`Could not fetch survey form: ${err.message}`);
    }
  }

  // Build a map of questionId to question text
  const questionMap = new Map();
  if (surveyForm && surveyForm.questions) {
    surveyForm.questions.forEach((q) => {
      if (q.id) {
        questionMap.set(q.id, q.text || q.prompt || `Question`);
      }
      if (q._id) {
        questionMap.set(q._id.toString(), q.text || q.prompt || `Question`);
      }
    });
  }

  // Populate question text in answers
  return answers.map((answer, index) => {
    // If question text already exists, use it
    if (answer.question && typeof answer.question === 'string' && answer.question.length > 0 && !/^\d+$/.test(answer.question)) {
      return answer;
    }

    // Try to find question text from map
    const qId = answer.questionId || answer.question;
    const questionText = qId ? questionMap.get(String(qId)) : null;

    return {
      ...answer,
      question: questionText || answer.prompt || `Question ${index + 1}`,
      questionId: qId || answer.questionId
    };
  });
};

// Get all survey responses (for L0 admin)
router.get("/", async (req, res) => {
  console.log("Survey responses endpoint hit:", req.query);
  try {
    await connectToDatabase();

    const { booth, survey, ac, page = 1, limit = 50, search } = req.query;

    const query = {};
    let boothNamesFromAC = [];
    const acId = ac && ac !== 'all' ? parseInt(ac) : null;

    // When AC is specified, we'll query the AC-specific collection directly
    // No need to filter by booth names - the collection already contains only that AC's data
    if (acId) {
      console.log(`Querying AC-specific collection: surveyresponses_${acId}`);
      // Get booth names for booth filter dropdown support
      // Group by booth_id to avoid duplicates when same booth has multiple name formats
      try {
        const voterBooths = await aggregateVoters(acId, [
          { $match: {} },
          { $group: {
              _id: "$booth_id",
              boothno: { $first: "$boothno" },
              boothnames: { $addToSet: "$boothname" }
            }
          },
          { $sort: { boothno: 1 } }
        ]);
        // Select the best booth name for each booth (prefer English with number prefix)
        boothNamesFromAC = voterBooths.map(b => {
          if (!b.boothnames || b.boothnames.length === 0) return null;
          const validNames = b.boothnames.filter(n => n && n.trim());
          if (validNames.length === 0) return null;
          // Prefer names with booth number prefix (e.g., "1- Corporation...")
          const withPrefix = validNames.find(n => /^\d+[-\s]/.test(n));
          if (withPrefix) return withPrefix;
          // Otherwise pick the shortest name
          return validNames.reduce((s, c) => c.length < s.length ? c : s, validNames[0]);
        }).filter(Boolean);
        console.log(`Found ${boothNamesFromAC.length} unique booth names for AC ${acId}`);
      } catch (voterError) {
        console.error("Error getting booth names from voter data:", voterError);
      }
    }

    // Filter by booth - prioritize booth_id match, then boothname, then legacy booth field
    if (booth && booth !== 'all') {
      console.log(`[L0 Survey] Booth filter requested: "${booth}"`);
      // Build comprehensive $or query to match any booth field variant
      const boothFilters = [
        { booth_id: booth },                    // Exact booth_id match (primary)
        { booth_id: { $regex: booth, $options: 'i' } }, // Partial booth_id match
        { boothname: booth },                   // Exact boothname match
        { boothname: { $regex: booth, $options: 'i' } }, // Partial boothname match
        { booth: booth },                       // Legacy exact booth match
        { booth: { $regex: booth, $options: 'i' } },    // Legacy partial booth match
        { boothCode: booth }                    // Legacy boothCode match
      ];
      query.$or = boothFilters;
      console.log(`[L0 Survey] Using booth filter with multiple field variants`);
    }

    if (survey && survey !== 'all') {
      console.log(`[L0 SurveyResponses] Filtering by survey form: "${survey}"`);
      const surveyIdFilters = [
        { surveyId: survey },
        { formId: survey },
        { form_id: survey },
        { survey_id: survey }
      ];
      // Also try with ObjectId if it's a valid ObjectId string
      if (mongoose.Types.ObjectId.isValid(survey)) {
        const surveyObjId = new mongoose.Types.ObjectId(survey);
        surveyIdFilters.push(
          { surveyId: surveyObjId },
          { formId: surveyObjId },
          { form_id: surveyObjId },
          { survey_id: surveyObjId }
        );
      }
      console.log(`[L0 SurveyResponses] Survey filter with ${surveyIdFilters.length} conditions`);
      const surveyFilter = { $or: surveyIdFilters };
      if (query.$or) {
        query.$and = [{ $or: query.$or }, surveyFilter];
        delete query.$or;
      } else {
        query.$or = surveyFilter.$or;
      }
    }

    // Search functionality
    if (search) {
      const searchRegex = new RegExp(escapeRegExp(search), 'i');
      const isObjectId = mongoose.Types.ObjectId.isValid(search);

      const searchFilter = isObjectId ? {
        $or: [
          { voterId: search },
          { voterName: searchRegex },
          { respondentName: searchRegex },
          { voterID: searchRegex },
          { respondentVoterId: searchRegex },
          { surveyId: search },
          { formId: search }
        ]
      } : {
        $or: [
          { voterName: searchRegex },
          { respondentName: searchRegex },
          { voterId: searchRegex },
          { voterID: searchRegex },
          { respondentVoterId: searchRegex },
          { surveyId: searchRegex },
          { formId: searchRegex }
        ]
      };

      if (query.$and) {
        query.$and.push(searchFilter);
      } else if (query.$or) {
        query.$and = [{ $or: query.$or }, searchFilter];
        delete query.$or;
      } else if (query.booth) {
        query.$and = [{ booth: query.booth }, searchFilter];
        delete query.booth;
      } else {
        query.$or = searchFilter.$or;
      }
    }

    console.log("Survey responses query:", JSON.stringify(query, null, 2));

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    let responses = [];
    let totalResponses = 0;

    // If AC is specified, query that specific collection
    if (acId) {
      responses = await querySurveyResponses(acId, query, {
        skip,
        limit: limitNum,
        sort: { createdAt: -1 }
      });
      totalResponses = await countSurveyResponses(acId, query);
    } else {
      // Query all AC collections for L0 admin
      responses = await queryAllSurveyResponses(query, {
        limit: limitNum,
        sort: { createdAt: -1 }
      });
      totalResponses = await countAllSurveyResponses(query);

      // Apply pagination on combined results
      responses = responses.slice(skip, skip + limitNum);
    }

    // Batch fetch all survey forms ONCE (fixes N+1 query problem)
    const normalizedResponses = responses.map(r => normalizeSurveyResponse(r, { enrichAc: true, enrichBooth: true }));
    const surveyIds = normalizedResponses.map(r => r.formId).filter(Boolean);
    const surveyFormsMap = await batchFetchSurveyForms(surveyIds);

    // Process responses synchronously using pre-fetched forms
    const processedResponses = normalizedResponses.map((normalized) => {
      const surveyId = normalized.formId;
      const surveyForm = surveyId ? surveyFormsMap.get(String(surveyId)) : null;
      const answers = normalized.answers || [];
      const populatedAnswers = populateQuestionTextSync(answers, surveyForm);

      return {
        id: normalized._id,
        survey_id: surveyId || 'N/A',
        respondent_name: normalized.respondentName || 'N/A',
        voter_id: normalized.respondentVoterId || 'N/A',
        voterID: normalized.respondentVoterId || '',
        voterId: normalized.respondentVoterId || 'N/A',
        booth: normalized.boothname || 'N/A',
        booth_id: normalized.booth_id || null,
        boothno: normalized.boothno || null,
        ac_id: normalized.aci_id || null,
        aci_name: normalized.aci_name || null,
        survey_date: normalized.submittedAt || new Date(),
        status: normalized.isComplete ? 'Completed' : (normalized.status || 'Pending'),
        answers: populatedAnswers
      };
    });

    return res.json({
      responses: processedResponses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalResponses,
        pages: Math.ceil(totalResponses / parseInt(limit))
      }
    });

  } catch (error) {
    console.error("Error fetching survey responses:", error);
    return res.status(500).json({ message: "Failed to fetch survey responses" });
  }
});

// Get survey responses for a specific AC
router.get("/:acId", async (req, res) => {
  try {
    await connectToDatabase();

    const acId = parseInt(req.params.acId);
    const { booth, survey, search, page = 1, limit = 50 } = req.query;

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

    const query = {};
    const conditions = [];

    // Filter by booth - prioritize booth_id match, then boothname, then legacy booth field
    if (booth && booth !== 'all') {
      console.log(`[L1 Survey] Booth filter requested: "${booth}"`);
      conditions.push({
        $or: [
          { booth_id: booth },                    // Exact booth_id match (primary)
          { booth_id: { $regex: booth, $options: 'i' } }, // Partial booth_id match
          { boothname: booth },                   // Exact boothname match
          { boothname: { $regex: booth, $options: 'i' } }, // Partial boothname match
          { booth: booth },                       // Legacy exact booth match
          { booth: { $regex: booth, $options: 'i' } },    // Legacy partial booth match
          { boothCode: booth }                    // Legacy boothCode match
        ]
      });
    }

    // Filter by survey form - handle all possible field names and ObjectId vs string
    if (survey && survey !== 'all') {
      console.log(`[L1 SurveyResponses] Filtering by survey: "${survey}"`);
      const surveyIdFilters = [
        { surveyId: survey },
        { formId: survey },
        { form_id: survey },
        { survey_id: survey }
      ];
      // Also try with ObjectId if it's a valid ObjectId string
      if (mongoose.Types.ObjectId.isValid(survey)) {
        const surveyObjId = new mongoose.Types.ObjectId(survey);
        console.log(`[L1 SurveyResponses] Valid ObjectId, adding ObjectId filters`);
        surveyIdFilters.push(
          { surveyId: surveyObjId },
          { formId: surveyObjId },
          { form_id: surveyObjId },
          { survey_id: surveyObjId }
        );
      }
      conditions.push({ $or: surveyIdFilters });
      console.log(`[L1 SurveyResponses] Survey filter with ${surveyIdFilters.length} conditions`);
    }

    // Search by voter name or voter ID
    if (search && search.trim()) {
      const searchRegex = new RegExp(escapeRegExp(search.trim()), 'i');
      conditions.push({
        $or: [
          { respondentName: searchRegex },
          { voterName: searchRegex },
          { respondentVoterId: searchRegex },
          { voterId: searchRegex },
          { voterID: searchRegex }
        ]
      });
    }

    // Build final query
    if (conditions.length > 0) {
      query.$and = conditions;
    }

    console.log(`[L1 SurveyResponses] Final query for AC ${acId}:`, JSON.stringify(query, null, 2));

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Query the AC-specific collection
    const responses = await querySurveyResponses(acId, query, {
      skip,
      limit: limitNum,
      sort: { createdAt: -1 }
    });

    const totalResponses = await countSurveyResponses(acId, query);
    console.log(`[L1 SurveyResponses] Found ${responses.length} responses, total: ${totalResponses}`);

    // Batch fetch all survey forms ONCE (fixes N+1 query problem)
    const normalizedResponses = responses.map(r => normalizeSurveyResponse(r, { enrichAc: true, enrichBooth: true }));
    const surveyIds = normalizedResponses.map(r => r.formId).filter(Boolean);
    const surveyFormsMap = await batchFetchSurveyForms(surveyIds);

    // Process responses synchronously using pre-fetched forms
    const processedResponses = normalizedResponses.map((normalized) => {
      const surveyId = normalized.formId;
      const surveyForm = surveyId ? surveyFormsMap.get(String(surveyId)) : null;
      const answers = normalized.answers || [];
      const populatedAnswers = populateQuestionTextSync(answers, surveyForm);

      return {
        id: normalized._id,
        survey_id: surveyId || 'N/A',
        respondent_name: normalized.respondentName || 'N/A',
        voter_id: normalized.respondentVoterId || 'N/A',
        voterID: normalized.respondentVoterId || '',
        voterId: normalized.respondentVoterId || 'N/A',
        booth: normalized.boothname || 'N/A',
        booth_id: normalized.booth_id || null,
        boothno: normalized.boothno || null,
        ac_id: normalized.aci_id || acId,
        aci_name: normalized.aci_name || null,
        survey_date: normalized.submittedAt || new Date(),
        status: normalized.isComplete ? 'Completed' : (normalized.status || 'Pending'),
        answers: populatedAnswers
      };
    });

    return res.json({
      responses: processedResponses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalResponses,
        pages: Math.ceil(totalResponses / parseInt(limit))
      }
    });

  } catch (error) {
    console.error("Error fetching survey responses:", error);
    return res.status(500).json({ message: "Failed to fetch survey responses" });
  }
});

export default router;
