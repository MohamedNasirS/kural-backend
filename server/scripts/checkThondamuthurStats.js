import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import Voter from "../models/Voter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/kuralapp";

async function checkThondamuthurStats() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected successfully!");

    console.log("\n=== Checking Thondamuthur AC 119 Statistics ===\n");

    // Method 1: Using aci_num and aci_name (recommended)
    const countByNum = await Voter.countDocuments({ 
      aci_num: 119, 
      aci_name: "THONDAMUTHUR" 
    });
    console.log(`✓ Total voters (aci_num: 119, aci_name: "THONDAMUTHUR"): ${countByNum}`);

    // Method 2: Using aci_num only
    const countByNumOnly = await Voter.countDocuments({ aci_num: 119 });
    console.log(`✓ Total voters (aci_num: 119 only): ${countByNumOnly}`);

    // Method 3: Using aci_id (fallback)
    const countById = await Voter.countDocuments({ aci_id: 119 });
    console.log(`✓ Total voters (aci_id: 119): ${countById}`);

    // Check what field names exist in the collection
    console.log("\n=== Sample Document Fields ===");
    const sampleVoter = await Voter.findOne({ 
      $or: [{ aci_num: 119 }, { aci_id: 119 }] 
    });
    
    if (sampleVoter) {
      console.log("Available AC-related fields:");
      if (sampleVoter.aci_num !== undefined) console.log(`  - aci_num: ${sampleVoter.aci_num}`);
      if (sampleVoter.aci_id !== undefined) console.log(`  - aci_id: ${sampleVoter.aci_id}`);
      if (sampleVoter.aci_name !== undefined) console.log(`  - aci_name: ${sampleVoter.aci_name}`);
    } else {
      console.log("No voters found for AC 119");
    }

    // Get unique booths
    const booths = await Voter.aggregate([
      { $match: { $or: [{ aci_num: 119 }, { aci_id: 119 }] } },
      { $group: { _id: "$boothno" } },
      { $count: "total" }
    ]);
    console.log(`\n✓ Total booths: ${booths.length > 0 ? booths[0].total : 0}`);

    // Get unique families (approximate)
    const families = await Voter.aggregate([
      { $match: { $or: [{ aci_num: 119 }, { aci_id: 119 }] } },
      { 
        $group: { 
          _id: { 
            address: "$address", 
            guardian: "$guardian",
            booth_id: "$booth_id"
          } 
        } 
      },
      { $count: "total" }
    ]);
    console.log(`✓ Total families: ${families.length > 0 ? families[0].total : 0}`);

    console.log("\n=== Query Test Complete ===\n");

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

checkThondamuthurStats();
