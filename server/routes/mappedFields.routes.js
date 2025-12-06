import express from "express";
import mongoose from "mongoose";
import SurveyMasterDataMapping from "../models/SurveyMasterDataMapping.js";
import MappedField from "../models/MappedField.js";
import MasterDataSection from "../models/MasterDataSection.js";
import { connectToDatabase } from "../config/database.js";
import { findVoterById, findOneVoter, getVoterModel } from "../utils/voterCollection.js";
import {
  getSurveyResponseModel,
  querySurveyResponses,
  findSurveyResponseById,
  queryAllSurveyResponses
} from "../utils/surveyResponseCollection.js";

const router = express.Router();

// Survey Master Data Mappings

// Get all mappings
router.get("/survey-master-data-mappings", async (req, res) => {
  try {
    await connectToDatabase();
    const { surveyId, masterDataSectionId } = req.query;

    console.log("GET /api/survey-master-data-mappings - query params:", { surveyId, masterDataSectionId });

    const query = {};
    if (surveyId) query.surveyId = surveyId;
    if (masterDataSectionId) query.masterDataSectionId = masterDataSectionId;

    const mappings = await SurveyMasterDataMapping.find(query)
      .sort({ createdAt: -1 })
      .populate("createdBy", "username email role");

    return res.json({
      mappings: mappings.map(m => m.toJSON()),
    });
  } catch (error) {
    console.error("Error fetching survey master data mappings:", error);
    return res.status(500).json({
      message: "Failed to fetch mappings",
      error: error.message,
    });
  }
});

// Get a specific mapping
router.get("/survey-master-data-mappings/:mappingId", async (req, res) => {
  try {
    await connectToDatabase();
    const { mappingId } = req.params;

    const mapping = await SurveyMasterDataMapping.findById(mappingId)
      .populate("createdBy", "username email role");

    if (!mapping) {
      return res.status(404).json({ message: "Mapping not found" });
    }

    return res.json(mapping.toJSON());
  } catch (error) {
    console.error("Error fetching survey master data mapping:", error);
    return res.status(500).json({
      message: "Failed to fetch mapping",
      error: error.message,
    });
  }
});

// Create or update a mapping
router.post("/survey-master-data-mappings", async (req, res) => {
  try {
    await connectToDatabase();

    const {
      surveyId,
      surveyTitle,
      masterDataSectionId,
      masterDataSectionName,
      mappings,
      createdBy,
      createdByRole,
      status,
      notes,
    } = req.body ?? {};

    if (!surveyId || !masterDataSectionId || !Array.isArray(mappings)) {
      return res.status(400).json({
        message: "surveyId, masterDataSectionId, and mappings array are required",
      });
    }

    const existingMapping = await SurveyMasterDataMapping.findOne({
      surveyId,
      masterDataSectionId,
    });

    if (existingMapping) {
      existingMapping.surveyTitle = surveyTitle || existingMapping.surveyTitle;
      existingMapping.masterDataSectionName = masterDataSectionName || existingMapping.masterDataSectionName;
      existingMapping.mappings = mappings;
      if (status) existingMapping.status = status;
      if (notes !== undefined) existingMapping.notes = notes;
      if (createdBy) existingMapping.createdBy = createdBy;
      if (createdByRole) existingMapping.createdByRole = createdByRole;

      await existingMapping.save();

      return res.json({
        message: "Mapping updated successfully",
        mapping: existingMapping.toJSON(),
      });
    }

    const mappingData = {
      surveyId,
      surveyTitle: surveyTitle || "",
      masterDataSectionId,
      masterDataSectionName: masterDataSectionName || "",
      mappings,
      status: status || "draft",
      notes: notes || "",
    };

    if (createdBy) mappingData.createdBy = createdBy;
    if (createdByRole) mappingData.createdByRole = createdByRole;

    const mapping = await SurveyMasterDataMapping.create(mappingData);

    return res.status(201).json({
      message: "Mapping created successfully",
      mapping: mapping.toJSON(),
    });
  } catch (error) {
    console.error("Error creating/updating survey master data mapping:", error);
    return res.status(500).json({
      message: "Failed to create/update mapping",
      error: error.message,
    });
  }
});

// Update mapping status
router.put("/survey-master-data-mappings/:mappingId/status", async (req, res) => {
  try {
    await connectToDatabase();
    const { mappingId } = req.params;
    const { status } = req.body ?? {};

    if (!status || !["draft", "active", "archived"].includes(status)) {
      return res.status(400).json({
        message: "Valid status (draft, active, archived) is required",
      });
    }

    const mapping = await SurveyMasterDataMapping.findByIdAndUpdate(
      mappingId,
      { status },
      { new: true }
    );

    if (!mapping) {
      return res.status(404).json({ message: "Mapping not found" });
    }

    return res.json({
      message: "Mapping status updated successfully",
      mapping: mapping.toJSON(),
    });
  } catch (error) {
    console.error("Error updating mapping status:", error);
    return res.status(500).json({
      message: "Failed to update mapping status",
      error: error.message,
    });
  }
});

// Delete a mapping
router.delete("/survey-master-data-mappings/:mappingId", async (req, res) => {
  try {
    await connectToDatabase();
    const { mappingId } = req.params;

    const mapping = await SurveyMasterDataMapping.findByIdAndDelete(mappingId);

    if (!mapping) {
      return res.status(404).json({ message: "Mapping not found" });
    }

    return res.json({
      message: "Mapping deleted successfully",
      mappingId,
    });
  } catch (error) {
    console.error("Error deleting survey master data mapping:", error);
    return res.status(500).json({
      message: "Failed to delete mapping",
      error: error.message,
    });
  }
});

// Apply mapping and save to mappedfields collection
router.post("/mapped-fields/apply-mapping", async (req, res) => {
  try {
    await connectToDatabase();

    const {
      mappingId,
      surveyResponseId,
      voterId,
      acNumber,
      applyToAll = false,
      createdBy,
      createdByRole,
    } = req.body ?? {};

    if (!mappingId || !surveyResponseId) {
      return res.status(400).json({
        message: "mappingId and surveyResponseId are required",
      });
    }

    const mapping = await SurveyMasterDataMapping.findById(mappingId);
    if (!mapping) {
      return res.status(404).json({ message: "Mapping not found" });
    }

    if (mapping.status !== "active") {
      return res.status(400).json({
        message: "Mapping must be active to apply",
      });
    }

    let surveyResponses = [];
    if (applyToAll) {
      // If acNumber is provided, query that specific collection
      if (acNumber) {
        const responses = await querySurveyResponses(acNumber, { surveyId: mapping.surveyId }, { limit: 1000 });
        surveyResponses = responses;
      } else {
        // Query all AC collections (for L0 admin)
        const responses = await queryAllSurveyResponses({ surveyId: mapping.surveyId }, { limit: 1000 });
        surveyResponses = responses;
      }
    } else {
      // Find single response - search across all collections if acNumber not provided
      if (acNumber) {
        const SurveyResponseModel = getSurveyResponseModel(acNumber);
        const response = await SurveyResponseModel.findById(surveyResponseId);
        if (!response) {
          return res.status(404).json({ message: "Survey response not found" });
        }
        surveyResponses = [response];
      } else {
        const result = await findSurveyResponseById(surveyResponseId);
        if (!result) {
          return res.status(404).json({ message: "Survey response not found" });
        }
        surveyResponses = [result.response];
      }
    }

    const masterSection = await MasterDataSection.findById(mapping.masterDataSectionId);
    if (!masterSection) {
      return res.status(404).json({ message: "Master data section not found" });
    }

    const mappedFieldsArray = [];

    for (const surveyResponse of surveyResponses) {
      const responseVoterId = voterId || surveyResponse.voterId || surveyResponse.respondentName || '';

      let voter = null;
      if (responseVoterId) {
        if (mongoose.Types.ObjectId.isValid(responseVoterId)) {
          const result = await findVoterById(responseVoterId);
          if (result) voter = result.voter;
        }

        if (!voter) {
          const result = await findOneVoter({
            $or: [
              { voterID: responseVoterId },
              { "name.english": { $regex: new RegExp(responseVoterId, 'i') } },
              { "name.tamil": { $regex: new RegExp(responseVoterId, 'i') } },
            ],
          });
          if (result) voter = result.voter;
        }
      }

      let acInfo = {
        acNumber: acNumber || null,
        acName: null,
        aci_id: null,
        aci_name: null,
      };

      if (voter) {
        acInfo.acNumber = voter.aci_num || voter.aci_id || acNumber;
        acInfo.acName = voter.aci_name || voter.ac_name;
        acInfo.aci_id = voter.aci_id || voter.aci_num;
        acInfo.aci_name = voter.aci_name || voter.ac_name;
      } else if (acNumber) {
        try {
          const VoterModel = getVoterModel(acNumber);
          const sampleVoter = await VoterModel.findOne({}).select('aci_name ac_name').lean();

          if (sampleVoter) {
            acInfo.acName = sampleVoter.aci_name || sampleVoter.ac_name;
            acInfo.aci_id = acNumber;
            acInfo.aci_name = sampleVoter.aci_name || sampleVoter.ac_name;
          }
        } catch (err) {
          console.warn(`Could not find AC info for AC ${acNumber}:`, err.message);
        }
      }

      const responseAnswers = surveyResponse.answers || surveyResponse.responses || {};

      for (const mappingItem of mapping.mappings) {
        const surveyQuestionId = mappingItem.surveyQuestionId;
        const surveyResponseValue = responseAnswers[surveyQuestionId];

        if (surveyResponseValue === undefined || surveyResponseValue === null) {
          continue;
        }

        const masterQuestion = masterSection.questions.find(
          (q) => q.id.toString() === mappingItem.masterDataQuestionId
        );

        if (!masterQuestion) {
          continue;
        }

        let mappedValue = surveyResponseValue;
        let originalValue = surveyResponseValue;

        if (mappingItem.mappingType === "value-mapping" && mappingItem.responseValueMappings) {
          const valueStr = String(surveyResponseValue).trim();
          const valueMapping = mappingItem.responseValueMappings.find(
            (vm) => String(vm.surveyResponseValue).trim().toLowerCase() === valueStr.toLowerCase()
          );

          if (valueMapping && valueMapping.masterDataAnswerValue) {
            mappedValue = valueMapping.masterDataAnswerValue;
            originalValue = surveyResponseValue;
          }
        }

        const singleMappedField = {
          surveyQuestionId: mappingItem.surveyQuestionId,
          surveyQuestionText: mappingItem.surveyQuestionText,
          surveyResponseValue: originalValue,
          masterDataQuestionId: mappingItem.masterDataQuestionId,
          masterDataQuestionPrompt: mappingItem.masterDataQuestionPrompt,
          mappedValue: mappedValue,
          mappingType: mappingItem.mappingType,
          originalValue: originalValue,
        };

        const existingMappedField = await MappedField.findOne({
          voterId: voter?._id?.toString() || responseVoterId,
          surveyId: mapping.surveyId,
          surveyResponseId: surveyResponse._id.toString(),
          masterDataSectionId: mapping.masterDataSectionId,
          "mappedFields.surveyQuestionId": mappingItem.surveyQuestionId,
          "mappedFields.masterDataQuestionId": mappingItem.masterDataQuestionId,
        });

        if (existingMappedField) {
          const mappedFieldIndex = existingMappedField.mappedFields.findIndex(
            (mf) => mf.surveyQuestionId === mappingItem.surveyQuestionId &&
                     mf.masterDataQuestionId === mappingItem.masterDataQuestionId
          );

          if (mappedFieldIndex >= 0) {
            existingMappedField.mappedFields[mappedFieldIndex] = singleMappedField;
          } else {
            existingMappedField.mappedFields.push(singleMappedField);
          }

          existingMappedField.mappedAt = new Date();
          if (createdBy) existingMappedField.mappedBy = createdBy;
          if (createdByRole) existingMappedField.mappedByRole = createdByRole;

          if (voter) {
            existingMappedField.voterId = voter._id.toString();
            existingMappedField.voterName = voter.name?.english || voter.name?.tamil || '';
            existingMappedField.voterID = voter.voterID || '';
          }

          if (acInfo.acNumber) {
            existingMappedField.acNumber = acInfo.acNumber;
            existingMappedField.acName = acInfo.acName || '';
          }

          await existingMappedField.save();

          if (!mappedFieldsArray.find(mf => mf.id === existingMappedField._id.toString())) {
            mappedFieldsArray.push(existingMappedField.toJSON());
          }
        } else {
          const mappedFieldData = {
            voterId: voter?._id?.toString() || responseVoterId,
            voterName: voter?.name?.english || voter?.name?.tamil || surveyResponse.voterName || '',
            voterID: voter?.voterID || '',
            acNumber: acInfo.acNumber || acNumber || null,
            acName: acInfo.acName || '',
            surveyId: mapping.surveyId,
            surveyTitle: mapping.surveyTitle,
            surveyResponseId: surveyResponse._id.toString(),
            masterDataSectionId: mapping.masterDataSectionId,
            masterDataSectionName: mapping.masterDataSectionName,
            mappingId: mapping._id.toString(),
            mappedFields: [singleMappedField],
            mappedBy: createdBy,
            mappedByRole: createdByRole,
          };

          const mappedField = await MappedField.create(mappedFieldData);
          mappedFieldsArray.push(mappedField.toJSON());
        }
      }
    }

    return res.status(201).json({
      message: `Mapped fields created/updated successfully for ${mappedFieldsArray.length} record(s)`,
      mappedFields: mappedFieldsArray,
    });
  } catch (error) {
    console.error("Error applying mapping to mappedfields:", error);
    return res.status(500).json({
      message: "Failed to apply mapping",
      error: error.message,
    });
  }
});

// Get mapped fields
router.get("/mapped-fields", async (req, res) => {
  try {
    await connectToDatabase();

    const {
      acNumber,
      surveyId,
      masterDataSectionId,
      voterId,
      voterID,
      page = 1,
      limit = 50,
      search,
    } = req.query;

    const query = {};

    if (acNumber) query.acNumber = parseInt(acNumber);
    if (surveyId) query.surveyId = surveyId;
    if (masterDataSectionId) query.masterDataSectionId = masterDataSectionId;
    if (voterId) query.voterId = voterId;
    if (voterID) query.voterID = voterID;

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { voterName: searchRegex },
        { voterNameTamil: searchRegex },
        { voterID: searchRegex },
        { acName: searchRegex },
        { surveyTitle: searchRegex },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const mappedFields = await MappedField.find(query)
      .sort({ mappedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("mappedBy", "username email role")
      .lean();

    const total = await MappedField.countDocuments(query);

    return res.json({
      mappedFields: mappedFields.map((mf) => ({
        ...mf,
        id: mf._id.toString(),
        _id: undefined,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching mapped fields:", error);
    return res.status(500).json({
      message: "Failed to fetch mapped fields",
      error: error.message,
    });
  }
});

// Get a specific mapped field
router.get("/mapped-fields/:mappedFieldId", async (req, res) => {
  try {
    await connectToDatabase();
    const { mappedFieldId } = req.params;

    const mappedField = await MappedField.findById(mappedFieldId)
      .populate("mappedBy", "username email role")
      .lean();

    if (!mappedField) {
      return res.status(404).json({ message: "Mapped field not found" });
    }

    return res.json({
      ...mappedField,
      id: mappedField._id.toString(),
      _id: undefined,
    });
  } catch (error) {
    console.error("Error fetching mapped field:", error);
    return res.status(500).json({
      message: "Failed to fetch mapped field",
      error: error.message,
    });
  }
});

export default router;
