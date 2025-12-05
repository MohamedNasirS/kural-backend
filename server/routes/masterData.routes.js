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

const router = express.Router();

// Helper function to format section response
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
      .sort({ order: 1, createdAt: 1 });
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

// Get all sections
router.get("/sections", async (_req, res) => {
  try {
    await connectToDatabase();
    const sections = await MasterDataSection.find().sort({ order: 1, createdAt: 1 });
    const formattedSections = await Promise.all(
      sections.map((section) => formatMasterSectionResponse(section, true))
    );
    return res.json({
      sections: formattedSections,
    });
  } catch (error) {
    console.error("Error fetching master data sections:", error);
    return res.status(500).json({
      message: "Failed to fetch master data sections",
      error: error.message,
    });
  }
});

// Get all questions
router.get("/questions", async (req, res) => {
  try {
    await connectToDatabase();
    const { isVisible } = req.query;

    let query = {};
    if (isVisible !== undefined) {
      query.isVisible = isVisible === 'true' || isVisible === true;
    }

    const questions = await MasterQuestion.find(query)
      .sort({ order: 1, createdAt: 1 });

    return res.json({
      questions: questions.map((question) => formatMasterQuestionResponse(question)),
    });
  } catch (error) {
    console.error("Error fetching master data questions:", error);
    return res.status(500).json({
      message: "Failed to fetch master data questions",
      error: error.message,
    });
  }
});

// Create section
router.post("/sections", async (req, res) => {
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

// Update section
router.put("/sections/:sectionId", async (req, res) => {
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

// Delete section
router.delete("/sections/:sectionId", async (req, res) => {
  try {
    await connectToDatabase();
    const { sectionId } = req.params;

    const section = await MasterDataSection.findById(sectionId);
    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }

    await MasterQuestion.deleteMany({ sectionId: section._id });
    await MasterDataSection.findByIdAndDelete(sectionId);

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

// Add question to section
router.post("/sections/:sectionId/questions", async (req, res) => {
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

// Update question
router.put("/sections/:sectionId/questions/:questionId", async (req, res) => {
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

// Delete question
router.delete("/sections/:sectionId/questions/:questionId", async (req, res) => {
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
