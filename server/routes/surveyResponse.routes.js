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

const router = express.Router();

// Get all survey responses (for L0 admin)
router.get("/", async (req, res) => {
  console.log("Survey responses endpoint hit:", req.query);
  try {
    await connectToDatabase();

    const { booth, survey, ac, page = 1, limit = 50, search } = req.query;

    const query = {};
    let boothNamesFromAC = [];
    const acId = ac && ac !== 'all' ? parseInt(ac) : null;

    // Filter by AC - use booth names from voters collection
    if (acId) {
      try {
        const voterBooths = await aggregateVoters(acId, [
          { $match: {} },
          { $group: { _id: "$boothname", booth_id: { $first: "$booth_id" } } }
        ]);
        boothNamesFromAC = voterBooths.map(b => b._id).filter(Boolean);
        console.log(`Found ${boothNamesFromAC.length} unique booth names for AC ${acId}`);

        // For AC-specific collection, we use boothname field (aligned with voters)
        if (boothNamesFromAC.length > 0) {
          query.boothname = { $in: boothNamesFromAC };
        }
      } catch (voterError) {
        console.error("Error getting booth names from voter data:", voterError);
      }
    }

    // Filter by booth - use boothname (primary), booth_id, or legacy booth field
    if (booth && booth !== 'all') {
      console.log(`Booth filter requested: "${booth}"`);
      if (boothNamesFromAC.length > 0) {
        if (boothNamesFromAC.includes(booth)) {
          query.boothname = booth;
          console.log(`Exact booth match found: "${booth}"`);
        } else {
          const matchingBoothNames = boothNamesFromAC.filter(name =>
            name && name.toLowerCase().includes(booth.toLowerCase())
          );
          if (matchingBoothNames.length > 0) {
            query.boothname = { $in: matchingBoothNames };
            console.log(`Partial booth match found ${matchingBoothNames.length} booths`);
          } else {
            // Try matching on multiple booth fields
            query.$or = [
              { boothname: { $regex: booth, $options: 'i' } },
              { booth_id: { $regex: booth, $options: 'i' } },
              { booth: { $regex: booth, $options: 'i' } }
            ];
            console.log(`Using regex booth match for: "${booth}"`);
          }
        }
      } else {
        // When no AC context, search across all booth field variants
        query.$or = [
          { boothname: { $regex: booth, $options: 'i' } },
          { booth_id: booth },
          { booth: { $regex: booth, $options: 'i' } },
          { boothCode: booth }
        ];
      }
    }

    if (survey && survey !== 'all') {
      const surveyFilter = { $or: [{ surveyId: survey }, { formId: survey }] };
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

    return res.json({
      responses: responses.map(response => ({
        id: response._id,
        survey_id: response.surveyId || response.formId || 'N/A',
        respondent_name: response.voterName || response.respondentName || 'N/A',
        voter_id: response.respondentVoterId || response.voterId || response.voterID || 'N/A',
        voterID: response.respondentVoterId || response.voterID || '',
        voterId: response.respondentVoterId || response.voterId || response.voterID || 'N/A',
        // Booth fields - prioritize new structure, fallback to legacy
        booth: response.boothname || response.booth || 'N/A',
        booth_id: response.booth_id || response.boothCode || null,
        boothno: response.boothno || null,
        // AC fields
        ac_id: response.aci_id || response.acId || response.aci_num || response._acId || null,
        aci_name: response.aci_name || null,
        survey_date: response.createdAt || response.submittedAt || new Date(),
        status: response.isComplete ? 'Completed' : (response.status || 'Pending'),
        answers: response.answers || response.responses || []
      })),
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
    const { booth, survey, page = 1, limit = 50 } = req.query;

    if (isNaN(acId)) {
      return res.status(400).json({ message: "Invalid AC ID" });
    }

    const query = {};

    // Filter by booth - use boothname (primary), booth_id, or legacy booth field
    if (booth && booth !== 'all') {
      query.$or = [
        { boothname: { $regex: booth, $options: 'i' } },
        { booth_id: { $regex: booth, $options: 'i' } },
        { booth: { $regex: booth, $options: 'i' } },
        { boothCode: booth }
      ];
    }

    if (survey && survey !== 'all') {
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $or: [{ surveyId: survey }, { formId: survey }] }
        ];
        delete query.$or;
      } else {
        query.$or = [{ surveyId: survey }, { formId: survey }];
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Query the AC-specific collection
    const responses = await querySurveyResponses(acId, query, {
      skip,
      limit: limitNum,
      sort: { createdAt: -1 }
    });

    const totalResponses = await countSurveyResponses(acId, query);

    return res.json({
      responses: responses.map(response => ({
        id: response._id,
        survey_id: response.surveyId || response.formId || 'N/A',
        respondent_name: response.voterName || response.respondentName || 'N/A',
        voter_id: response.voterId || 'N/A',
        voterID: response.voterID || '',
        voterId: response.voterId || response.voterID || 'N/A',
        // Booth fields - prioritize new structure, fallback to legacy
        booth: response.boothname || response.booth || 'N/A',
        booth_id: response.booth_id || response.boothCode || null,
        boothno: response.boothno || null,
        // AC fields
        ac_id: acId,
        aci_name: response.aci_name || null,
        survey_date: response.createdAt || response.submittedAt || new Date(),
        status: response.status || 'Completed',
        answers: response.answers || response.responses || []
      })),
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
