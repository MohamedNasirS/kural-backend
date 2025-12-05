import express from "express";
import mongoose from "mongoose";
import { connectToDatabase } from "../config/database.js";
import { getVoterModel } from "../utils/voterCollection.js";

const router = express.Router();

// Get booth performance reports
router.get("/:acId/booth-performance", async (req, res) => {
  try {
    await connectToDatabase();

    const acId = parseInt(req.params.acId);
    const { booth } = req.query;

    if (isNaN(acId)) {
      return res.status(400).json({ message: "Invalid AC ID" });
    }

    const matchQuery = {};

    if (booth && booth !== 'all') {
      matchQuery.boothname = booth;
    }

    // Aggregate booth performance data
    const VoterModel = getVoterModel(acId);
    const boothPerformance = await VoterModel.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            boothname: "$boothname",
            boothno: "$boothno"
          },
          total_voters: { $sum: 1 },
          male_voters: {
            $sum: { $cond: [{ $eq: ["$gender", "Male"] }, 1, 0] }
          },
          female_voters: {
            $sum: { $cond: [{ $eq: ["$gender", "Female"] }, 1, 0] }
          },
          verified_voters: {
            $sum: { $cond: ["$verified", 1, 0] }
          },
          avg_age: { $avg: "$age" }
        }
      },
      { $sort: { "_id.boothno": 1 } }
    ]);

    // Get survey completion data
    const SurveyResponse = mongoose.models.SurveyResponse ||
      mongoose.model('SurveyResponse', new mongoose.Schema({}, { strict: false, collection: 'surveyresponses' }));
    const surveysByBooth = await SurveyResponse.aggregate([
      {
        $group: {
          _id: "$booth",
          surveys_completed: { $sum: 1 }
        }
      }
    ]);

    const surveyMap = new Map(surveysByBooth.map(s => [s._id, s.surveys_completed]));

    // Calculate families per booth
    const familiesByBooth = await VoterModel.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            booth: "$boothname",
            address: "$address"
          }
        }
      },
      {
        $group: {
          _id: "$_id.booth",
          total_families: { $sum: 1 }
        }
      }
    ]);

    const familyMap = new Map(familiesByBooth.map(f => [f._id, f.total_families]));

    return res.json({
      reports: boothPerformance.map(booth => ({
        booth: booth._id.boothname || `Booth ${booth._id.boothno}`,
        boothNo: booth._id.boothno,
        total_voters: booth.total_voters,
        total_families: familyMap.get(booth._id.boothname) || 0,
        male_voters: booth.male_voters,
        female_voters: booth.female_voters,
        verified_voters: booth.verified_voters,
        surveys_completed: surveyMap.get(booth._id.boothname) || 0,
        avg_age: Math.round(booth.avg_age || 0),
        completion_rate: booth.total_voters > 0
          ? Math.round(((surveyMap.get(booth._id.boothname) || 0) / booth.total_voters) * 100)
          : 0
      }))
    });

  } catch (error) {
    console.error("Error fetching booth performance:", error);
    return res.status(500).json({ message: "Failed to fetch booth performance" });
  }
});

export default router;
