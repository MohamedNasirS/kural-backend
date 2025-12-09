import express from "express";
import MasterDataSection from "../models/MasterDataSection.js";
import MasterQuestion from "../models/MasterQuestion.js";
import { connectToDatabase } from "../config/database.js";
import {
  sanitizeDescription,
  sanitizeSectionName,
  normalizeAnswerOptions,
  normalizeMasterQuestion,
  formatMasterQuestionResponse,
  MASTER_QUESTION_TYPES,
  OPTION_REQUIRED_TYPES,
} from "../utils/helpers.js";
import { isAuthenticated, hasRole } from "../middleware/auth.js";
import { getCache, setCache, invalidateCache, TTL } from "../utils/cache.js";
import { writeRateLimiter } from "../middleware/rateLimit.js";

const router = express.Router();

// Apply authentication to all routes
router.use(isAuthenticated);

// Helper function to format section response (single section with individual query)
async function formatMasterSectionResponse(sectionDoc, includeQuestions = true) {
  if (!sectionDoc) {
    return null;
  }

  const section =
    typeof sectionDoc.toObject === "function"
      ? sectionDoc.toObject({ versionKey: false })
      : sectionDoc;

  let formattedQuestions = [];
  if (includeQuestions) {
    const questions = await MasterQuestion.find({ sectionId: section._id || sectionDoc._id })
      .sort({ order: 1, createdAt: 1 })
      .lean();  // ISS-029 fix: use .lean()
    formattedQuestions = questions.map((question) => formatMasterQuestionResponse(question)).filter(Boolean);
  }

  return {
    id: section._id?.toString?.() ?? section._id ?? undefined,
    name: section.name,
    description: section.description,
    order: section.order ?? 0,
    aci_id: Array.isArray(section.aci_id) ? section.aci_id : [],
    aci_name: Array.isArray(section.aci_name) ? section.aci_name : [],
    isVisible: section.isVisible !== undefined ? Boolean(section.isVisible) : true,
    createdAt: section.createdAt,
    updatedAt: section.updatedAt,
    questions: formattedQuestions,
  };
}

// Helper function to format section with pre-loaded questions (ISS-013 fix: avoid N+1)
function formatMasterSectionWithQuestions(sectionDoc, questionsBySection) {
  if (!sectionDoc) {
    return null;
  }

  const section =
    typeof sectionDoc.toObject === "function"
      ? sectionDoc.toObject({ versionKey: false })
      : sectionDoc;

  const sectionId = (section._id || sectionDoc._id)?.toString?.();
  const questions = questionsBySection.get(sectionId) || [];
  const formattedQuestions = questions.map((question) => formatMasterQuestionResponse(question)).filter(Boolean);

  return {
    id: section._id?.toString?.() ?? section._id ?? undefined,
    name: section.name,
    description: section.description,
    order: section.order ?? 0,
    aci_id: Array.isArray(section.aci_id) ? section.aci_id : [],
    aci_name: Array.isArray(section.aci_name) ? section.aci_name : [],
    isVisible: section.isVisible !== undefined ? Boolean(section.isVisible) : true,
    createdAt: section.createdAt,
    updatedAt: section.updatedAt,
    questions: formattedQuestions,
  };
}

// Cache key for master data sections
const MASTER_SECTIONS_CACHE_KEY = 'master-data:sections';

// Get all sections (ISS-013 fix: batch query, ISS-014 fix: pagination, ISS-007 fix: caching)
router.get("/sections", async (req, res) => {
  try {
    await connectToDatabase();

    // ISS-014 fix: Add pagination support
    const { limit, offset, includeQuestions = 'true' } = req.query;
    const parsedLimit = limit ? Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500) : undefined;
    const parsedOffset = offset ? Math.max(parseInt(offset, 10) || 0, 0) : 0;
    const shouldIncludeQuestions = includeQuestions === 'true' || includeQuestions === true;

    // ISS-007 fix: Try cache for default query (no pagination, with questions)
    const isDefaultQuery = !parsedLimit && parsedOffset === 0 && shouldIncludeQuestions;
    if (isDefaultQuery) {
      const cached = getCache(MASTER_SECTIONS_CACHE_KEY, TTL.LONG);
      if (cached) {
        return res.json(cached);
      }
    }

    let sectionsQuery = MasterDataSection.find().sort({ order: 1, createdAt: 1 });
    if (parsedOffset > 0) sectionsQuery = sectionsQuery.skip(parsedOffset);
    if (parsedLimit) sectionsQuery = sectionsQuery.limit(parsedLimit);

    const [sections, totalCount] = await Promise.all([
      sectionsQuery.lean(),
      MasterDataSection.countDocuments()
    ]);

    let formattedSections;
    if (shouldIncludeQuestions && sections.length > 0) {
      // Batch fetch all questions in a single query (ISS-013 fix)
      const sectionIds = sections.map(s => s._id);
      const allQuestions = await MasterQuestion.find({ sectionId: { $in: sectionIds } })
        .sort({ order: 1, createdAt: 1 })
        .lean();

      // Group questions by sectionId
      const questionsBySection = new Map();
      allQuestions.forEach(q => {
        const sectionId = q.sectionId?.toString?.();
        if (!questionsBySection.has(sectionId)) {
          questionsBySection.set(sectionId, []);
        }
        questionsBySection.get(sectionId).push(q);
      });

      formattedSections = sections.map(section =>
        formatMasterSectionWithQuestions(section, questionsBySection)
      );
    } else {
      formattedSections = sections.map(section =>
        formatMasterSectionWithQuestions(section, new Map())
      );
    }

    const responseData = {
      sections: formattedSections,
      pagination: parsedLimit ? {
        total: totalCount,
        limit: parsedLimit,
        offset: parsedOffset,
        hasMore: parsedOffset + sections.length < totalCount
      } : undefined
    };

    // Cache default query result
    if (isDefaultQuery) {
      setCache(MASTER_SECTIONS_CACHE_KEY, responseData, TTL.LONG);
    }

    return res.json(responseData);
  } catch (error) {
    console.error("Error fetching master data sections:", error);
    return res.status(500).json({
      message: "Failed to fetch master data sections",
      error: error.message,
    });
  }
});

// Get all questions (ISS-015 fix: pagination)
router.get("/questions", async (req, res) => {
  try {
    await connectToDatabase();
    const { isVisible, limit, offset, sectionId } = req.query;

    // ISS-015 fix: Add pagination support
    const parsedLimit = limit ? Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500) : undefined;
    const parsedOffset = offset ? Math.max(parseInt(offset, 10) || 0, 0) : 0;

    let query = {};
    if (isVisible !== undefined) {
      query.isVisible = isVisible === 'true' || isVisible === true;
    }
    if (sectionId) {
      query.sectionId = sectionId;
    }

    let questionsQuery = MasterQuestion.find(query).sort({ order: 1, createdAt: 1 });
    if (parsedOffset > 0) questionsQuery = questionsQuery.skip(parsedOffset);
    if (parsedLimit) questionsQuery = questionsQuery.limit(parsedLimit);

    const [questions, totalCount] = await Promise.all([
      questionsQuery.lean(),
      MasterQuestion.countDocuments(query)
    ]);

    return res.json({
      questions: questions.map((question) => formatMasterQuestionResponse(question)),
      pagination: parsedLimit ? {
        total: totalCount,
        limit: parsedLimit,
        offset: parsedOffset,
        hasMore: parsedOffset + questions.length < totalCount
      } : undefined
    });
  } catch (error) {
    console.error("Error fetching master data questions:", error);
    return res.status(500).json({
      message: "Failed to fetch master data questions",
      error: error.message,
    });
  }
});

// Create section (ISS-022 fix: rate limited)
router.post("/sections", writeRateLimiter, async (req, res) => {
  try {
    await connectToDatabase();

    console.log("POST /api/master-data/sections - Request body:", JSON.stringify(req.body, null, 2));

    const rawName = sanitizeSectionName(req.body?.name ?? req.body?.title ?? "");
    if (!rawName) {
      return res.status(400).json({ message: "Section name is required" });
    }

    const descriptionInput = sanitizeDescription(req.body?.description);
    const description = descriptionInput ? descriptionInput : undefined;

    const orderValue =
      typeof req.body?.order === "number" && Number.isFinite(req.body.order)
        ? req.body.order
        : await MasterDataSection.countDocuments();

    let aci_id = [];
    let aci_name = [];

    if ('aci_id' in req.body && Array.isArray(req.body.aci_id)) {
      aci_id = req.body.aci_id.filter((id) => typeof id === "number" && Number.isFinite(id));
    }

    if ('aci_name' in req.body && Array.isArray(req.body.aci_name)) {
      aci_name = req.body.aci_name.filter((name) => typeof name === "string" && name.trim()).map((name) => name.trim());
    }

    const minLength = Math.min(aci_id.length, aci_name.length);
    aci_id = aci_id.slice(0, minLength);
    aci_name = aci_name.slice(0, minLength);

    const isVisible = req.body?.isVisible !== undefined ? Boolean(req.body.isVisible) : true;

    const sectionData = {
      name: rawName,
      description,
      order: orderValue,
      aci_id: Array.isArray(aci_id) ? aci_id : [],
      aci_name: Array.isArray(aci_name) ? aci_name : [],
      isVisible,
    };

    const section = await MasterDataSection.create(sectionData);
    const savedSection = await MasterDataSection.findById(section._id);

    // ISS-007 fix: Invalidate cache on write
    invalidateCache(MASTER_SECTIONS_CACHE_KEY);

    return res.status(201).json({
      message: "Section created successfully",
      section: await formatMasterSectionResponse(savedSection || section, true),
    });
  } catch (error) {
    console.error("Error creating master data section:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "A section with this name already exists" });
    }
    return res.status(500).json({
      message: "Failed to create section",
      error: error.message,
    });
  }
});

// Update section (ISS-022 fix: rate limited)
router.put("/sections/:sectionId", writeRateLimiter, async (req, res) => {
  try {
    await connectToDatabase();
    const { sectionId } = req.params;

    const section = await MasterDataSection.findById(sectionId);
    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }

    const nameInput = sanitizeSectionName(req.body?.name ?? req.body?.title ?? "");
    if (nameInput) {
      section.name = nameInput;
    }

    if (req.body?.description !== undefined) {
      const descriptionInput = sanitizeDescription(req.body.description);
      section.description = descriptionInput || undefined;
    }

    if (req.body?.order !== undefined) {
      const parsedOrder = Number(req.body.order);
      if (!Number.isNaN(parsedOrder)) {
        section.order = parsedOrder;
      }
    }

    const hasAciId = 'aci_id' in req.body;
    const hasAciName = 'aci_name' in req.body;

    if (hasAciId || hasAciName) {
      const aci_id = hasAciId && Array.isArray(req.body.aci_id)
        ? req.body.aci_id.filter((id) => typeof id === "number" && Number.isFinite(id))
        : (hasAciId ? [] : (Array.isArray(section.aci_id) ? section.aci_id : []));

      const aci_name = hasAciName && Array.isArray(req.body.aci_name)
        ? req.body.aci_name.filter((name) => typeof name === "string" && name.trim()).map((name) => name.trim())
        : (hasAciName ? [] : (Array.isArray(section.aci_name) ? section.aci_name : []));

      const minLength = Math.min(aci_id.length, aci_name.length);
      const finalAciId = aci_id.slice(0, minLength);
      const finalAciName = aci_name.slice(0, minLength);

      section.set('aci_id', finalAciId);
      section.set('aci_name', finalAciName);
      section.markModified('aci_id');
      section.markModified('aci_name');
    }

    if (req.body?.isVisible !== undefined) {
      section.isVisible = Boolean(req.body.isVisible);
    }

    await section.save();
    const savedSection = await MasterDataSection.findById(section._id);

    // ISS-007 fix: Invalidate cache on write
    invalidateCache(MASTER_SECTIONS_CACHE_KEY);

    return res.json({
      message: "Section updated successfully",
      section: await formatMasterSectionResponse(savedSection || section, true),
    });
  } catch (error) {
    console.error("Error updating master data section:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "A section with this name already exists" });
    }
    return res.status(500).json({
      message: "Failed to update section",
      error: error.message,
    });
  }
});

// Delete section (ISS-022 fix: rate limited)
router.delete("/sections/:sectionId", writeRateLimiter, async (req, res) => {
  try {
    await connectToDatabase();
    const { sectionId } = req.params;

    const section = await MasterDataSection.findById(sectionId);
    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }

    await MasterQuestion.deleteMany({ sectionId: section._id });
    await MasterDataSection.findByIdAndDelete(sectionId);

    // ISS-007 fix: Invalidate cache on write
    invalidateCache(MASTER_SECTIONS_CACHE_KEY);

    return res.json({
      message: "Section deleted successfully",
      sectionId,
    });
  } catch (error) {
    console.error("Error deleting master data section:", error);
    return res.status(500).json({
      message: "Failed to delete section",
      error: error.message,
    });
  }
});

// Add question to section (ISS-022 fix: rate limited)
router.post("/sections/:sectionId/questions", writeRateLimiter, async (req, res) => {
  try {
    await connectToDatabase();
    const { sectionId } = req.params;

    const section = await MasterDataSection.findById(sectionId);
    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }

    const nextOrder =
      typeof req.body?.order === "number" && Number.isFinite(req.body.order)
        ? req.body.order
        : await MasterQuestion.countDocuments({ sectionId: section._id });

    const questionData = normalizeMasterQuestion(req.body ?? {}, nextOrder);

    const question = await MasterQuestion.create({
      ...questionData,
      sectionId: section._id,
    });

    // ISS-007 fix: Invalidate cache on write
    invalidateCache(MASTER_SECTIONS_CACHE_KEY);

    return res.status(201).json({
      message: "Question added successfully",
      question: formatMasterQuestionResponse(question),
      section: await formatMasterSectionResponse(section, true),
    });
  } catch (error) {
    console.error("Error adding master data question:", error);
    return res.status(500).json({
      message: "Failed to add question",
      error: error.message,
    });
  }
});

// Update question (ISS-022 fix: rate limited)
router.put("/sections/:sectionId/questions/:questionId", writeRateLimiter, async (req, res) => {
  try {
    await connectToDatabase();
    const { sectionId, questionId } = req.params;

    const section = await MasterDataSection.findById(sectionId);
    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }

    const question = await MasterQuestion.findOne({
      _id: questionId,
      sectionId: section._id,
    });
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    if (req.body?.prompt !== undefined || req.body?.text !== undefined) {
      const promptValue =
        typeof req.body.prompt === "string" && req.body.prompt.trim()
          ? req.body.prompt.trim()
          : typeof req.body.text === "string" && req.body.text.trim()
            ? req.body.text.trim()
            : "";
      if (!promptValue) {
        return res.status(400).json({ message: "Question prompt is required" });
      }
      question.prompt = promptValue;
    }

    if (req.body?.helperText !== undefined) {
      const helper =
        typeof req.body.helperText === "string" && req.body.helperText.trim()
          ? req.body.helperText.trim()
          : undefined;
      question.helperText = helper;
    }

    if (req.body?.isRequired !== undefined || req.body?.required !== undefined) {
      const requiredValue = Boolean(req.body.isRequired ?? req.body.required);
      question.isRequired = requiredValue;
    }

    if (req.body?.isVisible !== undefined) {
      question.isVisible = Boolean(req.body.isVisible);
    }

    if (req.body?.order !== undefined) {
      const parsedOrder = Number(req.body.order);
      if (!Number.isNaN(parsedOrder)) {
        question.order = parsedOrder;
      }
    }

    let nextType = question.type;
    if (req.body?.type !== undefined) {
      const typeInput =
        typeof req.body.type === "string" && req.body.type.trim()
          ? req.body.type.trim().toLowerCase()
          : "";
      if (MASTER_QUESTION_TYPES.has(typeInput)) {
        nextType = typeInput;
      }
    }

    const typeChanged = nextType !== question.type;
    if (typeChanged) {
      question.type = nextType;
    }

    if (OPTION_REQUIRED_TYPES.has(nextType)) {
      let normalizedOptions;
      if (req.body?.options !== undefined || req.body?.answers !== undefined) {
        normalizedOptions = normalizeAnswerOptions(
          nextType,
          req.body.options ?? req.body.answers,
        );
      } else if (!OPTION_REQUIRED_TYPES.has(question.type)) {
        normalizedOptions = [];
      } else {
        normalizedOptions = normalizeAnswerOptions(nextType, question.options);
      }

      if (normalizedOptions.length === 0 && OPTION_REQUIRED_TYPES.has(nextType)) {
        return res.status(400).json({
          message: "This question type must include at least one answer option",
        });
      }
      question.options = normalizedOptions;
    } else {
      question.options = [];
    }

    await question.save();

    // ISS-007 fix: Invalidate cache on write
    invalidateCache(MASTER_SECTIONS_CACHE_KEY);

    return res.json({
      message: "Question updated successfully",
      question: formatMasterQuestionResponse(question),
      section: await formatMasterSectionResponse(section, true),
    });
  } catch (error) {
    console.error("Error updating master data question:", error);
    return res.status(500).json({
      message: "Failed to update question",
      error: error.message,
    });
  }
});

// Delete question (ISS-022 fix: rate limited)
router.delete("/sections/:sectionId/questions/:questionId", writeRateLimiter, async (req, res) => {
  try {
    await connectToDatabase();
    const { sectionId, questionId } = req.params;

    const section = await MasterDataSection.findById(sectionId);
    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }

    const question = await MasterQuestion.findOne({
      _id: questionId,
      sectionId: section._id,
    });
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    await MasterQuestion.findByIdAndDelete(questionId);

    // ISS-007 fix: Invalidate cache on write
    invalidateCache(MASTER_SECTIONS_CACHE_KEY);

    return res.json({
      message: "Question deleted successfully",
      section: await formatMasterSectionResponse(section, true),
    });
  } catch (error) {
    console.error("Error deleting master data question:", error);
    return res.status(500).json({
      message: "Failed to delete question",
      error: error.message,
    });
  }
});

export default router;
