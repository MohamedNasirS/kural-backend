import dotenv from "dotenv";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../.env");

dotenv.config({
  path: fs.existsSync(envPath) ? envPath : undefined,
});

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/kuralapp";

async function fetchDatabaseStructure() {
  try {
    console.log("Connecting to MongoDB...");
    console.log("URI:", MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, "//***:***@")); // Hide credentials

    await mongoose.connect(MONGODB_URI);
    console.log("✓ Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // Get all collections
    const collections = await db.listCollections().toArray();

    console.log("=" .repeat(60));
    console.log("DATABASE STRUCTURE");
    console.log("=" .repeat(60));
    console.log(`\nDatabase: ${db.databaseName}`);
    console.log(`Total Collections: ${collections.length}\n`);

    const structure = {};

    for (const collection of collections) {
      const collName = collection.name;
      const coll = db.collection(collName);

      // Get document count
      const count = await coll.countDocuments();

      // Get sample document to understand schema
      const sampleDoc = await coll.findOne();

      // Get indexes
      const indexes = await coll.indexes();

      structure[collName] = {
        count,
        indexes: indexes.map(idx => idx.name),
        sampleFields: sampleDoc ? Object.keys(sampleDoc) : []
      };

      console.log("-".repeat(60));
      console.log(`📁 Collection: ${collName}`);
      console.log(`   Documents: ${count.toLocaleString()}`);
      console.log(`   Indexes: ${indexes.map(idx => idx.name).join(", ")}`);

      if (sampleDoc) {
        console.log(`   Fields: ${Object.keys(sampleDoc).join(", ")}`);
      }
    }

    // Summary by category
    console.log("\n" + "=".repeat(60));
    console.log("SUMMARY BY CATEGORY");
    console.log("=".repeat(60));

    // Voter collections (AC-specific)
    const voterCollections = collections.filter(c => c.name.startsWith("voters_ac_"));
    if (voterCollections.length > 0) {
      console.log(`\n📊 Voter Collections (${voterCollections.length} ACs):`);
      let totalVoters = 0;
      for (const vc of voterCollections) {
        const count = await db.collection(vc.name).countDocuments();
        totalVoters += count;
        console.log(`   - ${vc.name}: ${count.toLocaleString()} voters`);
      }
      console.log(`   Total Voters: ${totalVoters.toLocaleString()}`);
    }

    // Core collections
    const coreCollections = ["users", "surveys", "surveyresponses", "booths", "families"];
    console.log("\n📊 Core Collections:");
    for (const name of coreCollections) {
      if (collections.find(c => c.name === name)) {
        const count = await db.collection(name).countDocuments();
        console.log(`   - ${name}: ${count.toLocaleString()} documents`);
      }
    }

    // Mobile app collections
    const mobileCollections = ["mobileappquestions", "mobileappresponses"];
    console.log("\n📱 Mobile App Collections:");
    for (const name of mobileCollections) {
      if (collections.find(c => c.name === name)) {
        const count = await db.collection(name).countDocuments();
        console.log(`   - ${name}: ${count.toLocaleString()} documents`);
      }
    }

    // Master data collections
    const masterCollections = ["masterdatasections", "surveymasterdatamappings", "mappedfields"];
    console.log("\n📋 Master Data Collections:");
    for (const name of masterCollections) {
      if (collections.find(c => c.name === name)) {
        const count = await db.collection(name).countDocuments();
        console.log(`   - ${name}: ${count.toLocaleString()} documents`);
      }
    }

    // Session and system collections
    const systemCollections = ["sessions"];
    console.log("\n⚙️ System Collections:");
    for (const name of systemCollections) {
      if (collections.find(c => c.name === name)) {
        const count = await db.collection(name).countDocuments();
        console.log(`   - ${name}: ${count.toLocaleString()} documents`);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("Database structure fetch complete!");
    console.log("=".repeat(60));

    await mongoose.disconnect();
    console.log("\n✓ Disconnected from MongoDB");

  } catch (error) {
    console.error("Error fetching database structure:", error);
    process.exit(1);
  }
}

fetchDatabaseStructure();
