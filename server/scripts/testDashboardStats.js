import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '..', '.env');

dotenv.config({
  path: fs.existsSync(envPath) ? envPath : undefined,
});

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kuralapp';

// Import Voter model
const voterSchema = new mongoose.Schema({
  name: {
    english: String,
    tamil: String
  },
  voterID: String,
  address: String,
  guardian: String,
  booth_id: String,
  boothname: String,
  boothno: Number,
  surveyed: Boolean,
  aci_id: Number,
  aci_name: String
}, {
  timestamps: true
});

const Voter = mongoose.model('Voter', voterSchema, 'voters');

async function testDashboardStats() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Test for AC 119 (Thondamuthur)
    const acQuery = { 
      $or: [
        { aci_id: 119 },
        { aci_num: 119 }
      ]
    };

    console.log('=== Dashboard Statistics for AC 119 (Thondamuthur) ===\n');

    // Total Families
    const familiesAggregation = await Voter.aggregate([
      { $match: acQuery },
      {
        $group: {
          _id: {
            address: "$address",
            guardian: "$guardian",
            booth_id: "$booth_id",
          },
        },
      },
      { $count: "total" },
    ]);
    const totalFamilies = familiesAggregation.length > 0 ? familiesAggregation[0].total : 0;
    console.log(`Total Families: ${totalFamilies}`);

    // Total Members
    const totalMembers = await Voter.countDocuments(acQuery);
    console.log(`Total Members: ${totalMembers}`);

    // Surveys Completed: Count all members who have surveyed: true
    const surveysCompleted = await Voter.countDocuments({
      ...acQuery,
      surveyed: true
    });
    console.log(`Surveys Completed (Members with surveyed: true): ${surveysCompleted}`);

    // Get total booths
    const boothsAggregation = await Voter.aggregate([
      { $match: acQuery },
      { $group: { _id: "$boothno" } },
      { $count: "total" },
    ]);
    const totalBooths = boothsAggregation.length > 0 ? boothsAggregation[0].total : 0;
    console.log(`Total Booths: ${totalBooths}`);

    // Calculate survey completion percentage
    const memberCompletionPercentage = totalMembers > 0 
      ? ((surveysCompleted / totalMembers) * 100).toFixed(2) 
      : 0;

    console.log(`\n=== Summary ===`);
    console.log(`Member Completion Rate: ${memberCompletionPercentage}%`);
    console.log(`${surveysCompleted} out of ${totalMembers} members have completed surveys`);

    // Show some sample families
    console.log('\n=== Sample Surveyed Members ===');
    const surveyedSamples = await Voter.find({
      ...acQuery,
      surveyed: true
    })
    .limit(5)
    .select('name voterID address surveyed')
    .lean();

    if (surveyedSamples.length > 0) {
      surveyedSamples.forEach((member, index) => {
        console.log(`\nMember ${index + 1}:`);
        console.log(`  Name: ${member.name?.english || member.name?.tamil || 'N/A'}`);
        console.log(`  Voter ID: ${member.voterID}`);
        console.log(`  Address: ${member.address}`);
        console.log(`  Surveyed: ${member.surveyed}`);
      });
    } else {
      console.log('No surveyed members found.');
    }

    // Get booth statistics
    const boothStats = await Voter.aggregate([
      { $match: acQuery },
      {
        $group: {
          _id: {
            boothno: "$boothno",
            boothname: "$boothname",
          },
          totalVoters: { $sum: 1 },
          surveyedVoters: {
            $sum: {
              $cond: [{ $eq: ["$surveyed", true] }, 1, 0]
            }
          }
        },
      },
      { $sort: { "_id.boothno": 1 } },
      { $limit: 5 },
    ]);

    console.log('\n=== Top 5 Booths ===');
    boothStats.forEach(booth => {
      const completionRate = booth.totalVoters > 0 
        ? ((booth.surveyedVoters / booth.totalVoters) * 100).toFixed(2)
        : 0;
      console.log(`\nBooth ${booth._id.boothno}: ${booth._id.boothname}`);
      console.log(`  Total Voters: ${booth.totalVoters}`);
      console.log(`  Surveyed: ${booth.surveyedVoters}`);
      console.log(`  Completion Rate: ${completionRate}%`);
    });

  } catch (error) {
    console.error('Error testing dashboard stats:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

testDashboardStats();
