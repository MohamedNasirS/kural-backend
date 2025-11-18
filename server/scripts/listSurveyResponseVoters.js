import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.resolve(__dirname, "../.env");
dotenv.config({
  path: fs.existsSync(envPath) ? envPath : undefined,
});

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/kural";

// Connect to database
async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB\n");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}

// Disconnect from database
async function disconnectFromDatabase() {
  await mongoose.disconnect();
}

// Define model
const SurveyResponse = mongoose.models.SurveyResponse || mongoose.model(
  "SurveyResponse",
  new mongoose.Schema({}, { strict: false, collection: "surveyresponses" })
);

async function listSurveyResponseVoters() {
  try {
    await connectToDatabase();

    const surveyId = "ioio"; // Survey ID or ObjectId
    const surveyObjectId = "691c7158a5d6a71f3390be26"; // From earlier output
    
    // Find all survey responses for the "ioio" survey
    // Try multiple ways to find the survey
    const responses = await SurveyResponse.find({
      $or: [
        { surveyId: surveyObjectId },
        { formId: surveyObjectId },
        { surveyId: surveyId },
        { formId: surveyId },
        { surveyId: { $regex: new RegExp(surveyId, "i") } },
        { formId: { $regex: new RegExp(surveyId, "i") } },
      ],
    })
      .select("voterName respondentName voterID booth acId acName surveyId")
      .sort({ createdAt: -1 })
      .lean();

    if (responses.length === 0) {
      console.log("No survey responses found for survey 'ioio'");
      return;
    }

    console.log("=== Voters with Survey Responses for 'ioio' ===\n");
    console.log(`Total Responses: ${responses.length}\n`);
    console.log("Voter Names (for filtering in mapper):\n");

    responses.forEach((response, index) => {
      const voterName = response.voterName || response.respondentName || "N/A";
      const voterID = response.voterID || "N/A";
      const booth = response.booth || "N/A";
      const acName = response.acName || "N/A";
      
      console.log(`${index + 1}. ${voterName}`);
      console.log(`   Voter ID: ${voterID}`);
      console.log(`   Booth: ${booth}`);
      console.log(`   AC: ${acName}`);
      console.log("");
    });

    console.log("\n=== Quick Reference (Names only) ===");
    console.log(responses.map((r, i) => `${i + 1}. ${r.voterName || r.respondentName || "N/A"}`).join("\n"));
    console.log("");

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await disconnectFromDatabase();
  }
}

// Run the script
listSurveyResponseVoters()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

