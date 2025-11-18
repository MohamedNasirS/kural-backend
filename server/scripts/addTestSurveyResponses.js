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
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}

// Disconnect from database
async function disconnectFromDatabase() {
  await mongoose.disconnect();
  console.log("Disconnected from MongoDB");
}

// Define models (minimal schemas for flexibility)
const Voter = mongoose.models.Voter || mongoose.model(
  "Voter",
  new mongoose.Schema({}, { strict: false, collection: "voters" })
);

const Survey = mongoose.models.Survey || mongoose.model(
  "Survey",
  new mongoose.Schema({}, { strict: false, collection: "surveys" })
);

const SurveyResponse = mongoose.models.SurveyResponse || mongoose.model(
  "SurveyResponse",
  new mongoose.Schema({}, { strict: false, collection: "surveyresponses" })
);

async function addTestSurveyResponses() {
  try {
    await connectToDatabase();

    // AC 111 is Mettupalayam
    const acNumber = 111;
    const surveyId = "ioio"; // Survey ID to find

    console.log(`\n=== Adding Test Survey Responses ===`);
    console.log(`AC: ${acNumber} (Mettupalayam)`);
    console.log(`Survey ID: ${surveyId}\n`);

    // Find the survey by ID, formNumber, or title
    // Check if surveyId is a valid ObjectId
    const isValidObjectId = mongoose.Types.ObjectId.isValid(surveyId);
    
    const queryConditions = [];
    if (isValidObjectId) {
      queryConditions.push({ _id: surveyId });
    }
    queryConditions.push(
      { formNumber: surveyId },
      { title: { $regex: new RegExp(surveyId, "i") } }
    );
    
    const survey = await Survey.findOne({
      $or: queryConditions,
    });

    if (!survey) {
      console.error(`❌ Survey with ID "${surveyId}" not found!`);
      console.log("\nAvailable surveys:");
      const allSurveys = await Survey.find({}).limit(10).select("_id title formNumber");
      allSurveys.forEach((s) => {
        console.log(`  - ID: ${s._id}, Title: ${s.title || "N/A"}, FormNumber: ${s.formNumber || "N/A"}`);
      });
      return;
    }

    console.log(`✅ Found survey: ${survey.title || "N/A"} (ID: ${survey._id})`);
    console.log(`   Questions: ${survey.questions?.length || 0}`);

    // Get voters from Mettupalayam AC (AC 111)
    // Try different field names for AC number
    const voters = await Voter.find({
      $or: [
        { aci_num: acNumber },
        { aci_id: acNumber },
        { ac_number: acNumber },
      ],
    })
      .limit(10)
      .lean();

    if (voters.length === 0) {
      console.error(`❌ No voters found in AC ${acNumber} (Mettupalayam)`);
      return;
    }

    console.log(`✅ Found ${voters.length} voters in AC ${acNumber}\n`);

    // Generate test responses for each voter
    const testResponses = [];
    const sampleAnswers = {
      // Common answer options
      "yes": ["Yes", "Y", "yes", "YES"],
      "no": ["No", "N", "no", "NO"],
      "maybe": ["Maybe", "M", "maybe", "MAYBE"],
      "text": ["Good", "Excellent", "Fair", "Poor", "Very Good", "Satisfactory"],
      "number": [1, 2, 3, 4, 5, 10, 20, 30, 50, 100],
    };

    for (let i = 0; i < voters.length; i++) {
      const voter = voters[i];
      const answers = {};

      // Generate answers for each question in the survey
      if (survey.questions && Array.isArray(survey.questions)) {
        survey.questions.forEach((question) => {
          let answer = null;

          switch (question.type?.toLowerCase()) {
            case "text":
            case "textarea":
              // Random text answer
              answer =
                sampleAnswers.text[
                  Math.floor(Math.random() * sampleAnswers.text.length)
                ];
              break;

            case "number":
              // Random number
              answer =
                sampleAnswers.number[
                  Math.floor(Math.random() * sampleAnswers.number.length)
                ];
              break;

            case "radio":
            case "select":
              // Random option from available options
              if (question.options && question.options.length > 0) {
                answer =
                  question.options[
                    Math.floor(Math.random() * question.options.length)
                  ];
              }
              break;

            case "checkbox":
              // Multiple options
              if (question.options && question.options.length > 0) {
                const numSelections = Math.floor(
                  Math.random() * Math.min(3, question.options.length)
                ) + 1;
                const selectedOptions = [];
                const availableOptions = [...question.options];

                for (let j = 0; j < numSelections; j++) {
                  const randomIndex = Math.floor(
                    Math.random() * availableOptions.length
                  );
                  selectedOptions.push(availableOptions[randomIndex]);
                  availableOptions.splice(randomIndex, 1);
                }
                answer = selectedOptions;
              }
              break;

            case "boolean":
              // Yes/No randomly
              answer = Math.random() > 0.5;
              break;

            default:
              // Default: random yes/no text
              answer =
                sampleAnswers.yes[
                  Math.floor(Math.random() * sampleAnswers.yes.length)
                ];
          }

          if (answer !== null) {
            answers[question.id] = answer;
          }
        });
      }

      const voterName =
        voter.name?.english ||
        voter.name?.tamil ||
        voter.name ||
        `Voter ${voter.voterID || i + 1}`;

      const surveyResponse = {
        surveyId: survey._id.toString(),
        formId: survey._id.toString(),
        voterId: voter._id.toString(),
        voterName: voterName,
        respondentName: voterName,
        voterID: voter.voterID || "",
        booth: voter.boothname || voter.booth || `Booth ${i + 1}`,
        boothNumber: voter.boothno || "",
        acId: acNumber,
        acName: "Mettupalayam",
        answers: answers,
        responses: answers, // Also store in responses field
        status: "Completed",
        submittedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      testResponses.push(surveyResponse);

      console.log(
        `  📝 Voter ${i + 1}: ${voterName} (${voter.voterID || "N/A"}) - ${Object.keys(answers).length} answers`
      );
    }

    // Insert survey responses
    console.log(`\n💾 Inserting ${testResponses.length} survey responses...\n`);

    const result = await SurveyResponse.insertMany(testResponses, {
      ordered: false, // Continue on error
    });

    console.log(`✅ Successfully created ${result.length} test survey responses!\n`);

    // Show summary
    console.log(`=== Summary ===`);
    console.log(`Survey: ${survey.title || "N/A"} (${survey._id})`);
    console.log(`AC: ${acNumber} (Mettupalayam)`);
    console.log(`Voters: ${voters.length}`);
    console.log(`Responses Created: ${result.length}`);
    console.log(`\n✅ Done!\n`);
  } catch (error) {
    console.error("❌ Error:", error);
    if (error.writeErrors) {
      console.error("Write errors:", error.writeErrors);
    }
  } finally {
    await disconnectFromDatabase();
  }
}

// Run the script
addTestSurveyResponses()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

