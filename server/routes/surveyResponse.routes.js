import express from "express";
import mongoose from "mongoose";
import { connectToDatabase } from "../config/database.js";
import { escapeRegExp } from "../utils/helpers.js";
import { aggregateVoters, getVoterModel } from "../utils/voterCollection.js";

const router = express.Router();

// Get all survey responses (for L0 admin)
router.get("/", async (req, res) => {
  console.log("Survey responses endpoint hit:", req.query);
  try {
    await connectToDatabase();

    const { booth, survey, ac, page = 1, limit = 50, search } = req.query;

    // Use the surveyresponses collection
    const SurveyResponse = mongoose.models.SurveyResponse ||
      mongoose.model('SurveyResponse', new mongoose.Schema({}, { strict: false, collection: 'surveyresponses' }));

    const query = {};
    let boothNamesFromAC = [];

    // Filter by AC
    if (ac && ac !== 'all') {
      const acId = parseInt(ac);

      try {
        const voterBooths = await aggregateVoters(acId, [
          { $match: {} },
          { $group: { _id: "$boothname" } }
        ]);
        boothNamesFromAC = voterBooths.map(b => b._id).filter(Boolean);
        console.log(`Found ${boothNamesFromAC.length} unique booth names for AC ${acId}`);

        if (boothNamesFromAC.length > 0) {
          query.booth = { $in: boothNamesFromAC };
        } else {
          query.$or = [
            { acId: acId },
            { aci_id: acId },
            { aci_num: acId },
            { assignedAC: acId }
          ];
        }
      } catch (voterError) {
        console.error("Error getting booth names from voter data:", voterError);
        query.$or = [
          { acId: acId },
          { aci_id: acId },
          { aci_num: acId },
          { assignedAC: acId }
        ];
      }
    }

    // Filter by booth
    if (booth && booth !== 'all') {
      console.log(`Booth filter requested: "${booth}"`);
      if (boothNamesFromAC.length > 0) {
        if (boothNamesFromAC.includes(booth)) {
          query.booth = booth;
          console.log(`Exact booth match found: "${booth}"`);
        } else {
          const matchingBoothNames = boothNamesFromAC.filter(name =>
            name && name.toLowerCase().includes(booth.toLowerCase())
          );
          if (matchingBoothNames.length > 0) {
            query.booth = { $in: matchingBoothNames };
            console.log(`Partial booth match found ${matchingBoothNames.length} booths`);
          } else {
            query.booth = { $regex: booth, $options: 'i' };
            console.log(`Using regex booth match for: "${booth}"`);
          }
        }
      } else if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $or: [
            { booth: { $regex: booth, $options: 'i' } },
            { boothCode: booth },
            { booth_id: booth }
          ]}
        ];
        delete query.$or;
      } else {
        query.$or = [
          { booth: { $regex: booth, $options: 'i' } },
          { boothCode: booth },
          { booth_id: booth }
        ];
      }
    }

    if (survey && survey !== 'all') {
      const surveyFilter = { $or: [{ surveyId: survey }, { formId: survey }] };
      if (query.$and) {
        query.$and.push(surveyFilter);
      } else if (query.$or) {
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

    const responses = await SurveyResponse.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const totalResponses = await SurveyResponse.countDocuments(query);

    return res.json({
      responses: responses.map(response => ({
        id: response._id,
        survey_id: response.surveyId || response.formId || 'N/A',
        respondent_name: response.voterName || response.respondentName || 'N/A',
        voter_id: response.respondentVoterId || response.voterId || response.voterID || 'N/A',
        voterID: response.respondentVoterId || response.voterID || '',
        voterId: response.respondentVoterId || response.voterId || response.voterID || 'N/A',
        booth: response.booth || 'N/A',
        ac_id: response.acId || response.aci_id || response.aci_num || null,
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

    const SurveyResponse = mongoose.models.SurveyResponse ||
      mongoose.model('SurveyResponse', new mongoose.Schema({}, { strict: false, collection: 'surveyresponses' }));

    const query = {};

    if (booth && booth !== 'all') {
      query.booth = booth;
    }

    if (survey && survey !== 'all') {
      query.surveyId = survey;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const responses = await SurveyResponse.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const totalResponses = await SurveyResponse.countDocuments(query);

    return res.json({
      responses: responses.map(response => ({
        id: response._id,
        survey_id: response.surveyId || response.formId || 'N/A',
        respondent_name: response.voterName || response.respondentName || 'N/A',
        voter_id: response.voterId || 'N/A',
        voterID: response.voterID || '',
        voterId: response.voterId || response.voterID || 'N/A',
        booth: response.booth || 'N/A',
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
