/**
 * Script to create missing indexes for all AC-based collections.
 * Run this script to optimize query performance across all collections.
 *
 * Usage: node server/scripts/createMissingIndexes.js
 */

import mongoose from 'mongoose';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from server/.env
config({ path: join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

// All valid AC IDs
const ALL_AC_IDS = [101, 102, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126];

async function createIndex(collection, indexSpec, options = {}) {
  try {
    await collection.createIndex(indexSpec, options);
    return true;
  } catch (error) {
    // Index might already exist
    if (error.code === 85 || error.code === 86) {
      return true;
    }
    console.warn(`  Warning: ${error.message}`);
    return false;
  }
}

async function createMissingIndexes() {
  if (!MONGODB_URI) {
    console.error('ERROR: MONGODB_URI environment variable is not set');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  console.log('Creating missing indexes...\n');
  console.log('=' .repeat(60));

  let totalCreated = 0;
  let totalFailed = 0;

  for (const acId of ALL_AC_IDS) {
    console.log(`\nProcessing AC ${acId}...`);
    console.log('-'.repeat(40));

    // ========================================
    // Survey Responses Collection
    // ========================================
    const surveyCollectionName = `surveyresponses_${acId}`;
    try {
      const surveyCollection = db.collection(surveyCollectionName);

      const surveyIndexes = [
        { spec: { aci_id: 1 }, name: 'aci_id_1' },
        { spec: { booth_id: 1 }, name: 'booth_id_1' },
        { spec: { boothname: 1 }, name: 'boothname_1' },
        { spec: { formId: 1 }, name: 'formId_1' },
        { spec: { createdAt: -1 }, name: 'createdAt_-1' },
        { spec: { aci_id: 1, createdAt: -1 }, name: 'aci_id_1_createdAt_-1' },
        { spec: { respondentVoterId: 1 }, name: 'respondentVoterId_1', options: { sparse: true } },
      ];

      for (const idx of surveyIndexes) {
        const created = await createIndex(surveyCollection, idx.spec, idx.options || {});
        if (created) totalCreated++;
        else totalFailed++;
      }
      console.log(`  ${surveyCollectionName}: indexes configured`);
    } catch (error) {
      console.log(`  ${surveyCollectionName}: collection may not exist, skipping`);
    }

    // ========================================
    // Mobile App Answers Collection
    // ========================================
    const answersCollectionName = `mobileappanswers_${acId}`;
    try {
      const answersCollection = db.collection(answersCollectionName);

      const answerIndexes = [
        { spec: { aci_id: 1 }, name: 'aci_id_1' },
        { spec: { voterId: 1 }, name: 'voterId_1' },
        { spec: { booth_id: 1 }, name: 'booth_id_1' },
        { spec: { questionId: 1 }, name: 'questionId_1' },
        { spec: { submittedBy: 1 }, name: 'submittedBy_1' },
        { spec: { submittedAt: -1 }, name: 'submittedAt_-1' },
        { spec: { aci_id: 1, submittedAt: -1 }, name: 'aci_id_1_submittedAt_-1' },
      ];

      for (const idx of answerIndexes) {
        const created = await createIndex(answersCollection, idx.spec, idx.options || {});
        if (created) totalCreated++;
        else totalFailed++;
      }
      console.log(`  ${answersCollectionName}: indexes configured`);
    } catch (error) {
      console.log(`  ${answersCollectionName}: collection may not exist, skipping`);
    }

    // ========================================
    // Booth Agent Activities Collection
    // ========================================
    const activitiesCollectionName = `boothagentactivities_${acId}`;
    try {
      const activitiesCollection = db.collection(activitiesCollectionName);

      const activityIndexes = [
        { spec: { aci_id: 1 }, name: 'aci_id_1' },
        { spec: { userId: 1 }, name: 'userId_1' },
        { spec: { booth_id: 1 }, name: 'booth_id_1' },
        { spec: { status: 1 }, name: 'status_1' },
        { spec: { loginTime: -1 }, name: 'loginTime_-1' },
        { spec: { aci_id: 1, loginTime: -1 }, name: 'aci_id_1_loginTime_-1' },
      ];

      for (const idx of activityIndexes) {
        const created = await createIndex(activitiesCollection, idx.spec, idx.options || {});
        if (created) totalCreated++;
        else totalFailed++;
      }
      console.log(`  ${activitiesCollectionName}: indexes configured`);
    } catch (error) {
      console.log(`  ${activitiesCollectionName}: collection may not exist, skipping`);
    }

    // ========================================
    // Voters Collection - Additional Indexes
    // ========================================
    const votersCollectionName = `voters_${acId}`;
    try {
      const votersCollection = db.collection(votersCollectionName);

      const voterIndexes = [
        // Compound sort index for voter listing
        { spec: { boothno: 1, 'name.english': 1 }, name: 'boothno_1_name.english_1' },
        // Family details query optimization
        { spec: { familyId: 1, relationToHead: 1 }, name: 'familyId_1_relationToHead_1', options: { sparse: true } },
        // Gender-based queries (for reports)
        { spec: { gender: 1 }, name: 'gender_1' },
        // Age-based queries (for reports)
        { spec: { age: 1 }, name: 'age_1' },
      ];

      for (const idx of voterIndexes) {
        const created = await createIndex(votersCollection, idx.spec, idx.options || {});
        if (created) totalCreated++;
        else totalFailed++;
      }
      console.log(`  ${votersCollectionName}: additional indexes configured`);
    } catch (error) {
      console.log(`  ${votersCollectionName}: error configuring indexes`);
    }
  }

  // ========================================
  // Global Collections
  // ========================================
  console.log('\nProcessing global collections...');
  console.log('-'.repeat(40));

  // MobileAppQuestions
  try {
    const questionsCollection = db.collection('mobileappquestions');
    await createIndex(questionsCollection, { order: 1 });
    await createIndex(questionsCollection, { masterQuestionId: 1 }, { sparse: true });
    console.log('  mobileappquestions: indexes configured');
  } catch (error) {
    console.log('  mobileappquestions: error configuring indexes');
  }

  // MasterQuestions
  try {
    const masterQuestionsCollection = db.collection('masterquestions');
    await createIndex(masterQuestionsCollection, { prompt: 'text' });
    await createIndex(masterQuestionsCollection, { type: 1 });
    await createIndex(masterQuestionsCollection, { order: 1 });
    console.log('  masterquestions: indexes configured');
  } catch (error) {
    console.log('  masterquestions: error configuring indexes');
  }

  // MobileAppResponses (global)
  try {
    const responsesCollection = db.collection('mobileappresponses');
    await createIndex(responsesCollection, { aci_id: 1 });
    await createIndex(responsesCollection, { booth_id: 1 });
    await createIndex(responsesCollection, { agentId: 1 });
    await createIndex(responsesCollection, { createdAt: -1 });
    await createIndex(responsesCollection, { aci_id: 1, booth_id: 1 });
    console.log('  mobileappresponses: indexes configured');
  } catch (error) {
    console.log('  mobileappresponses: error configuring indexes');
  }

  console.log('\n' + '='.repeat(60));
  console.log('\nIndex creation complete!');
  console.log(`Total indexes processed: ${totalCreated + totalFailed}`);
  console.log(`Successfully created/verified: ${totalCreated}`);
  if (totalFailed > 0) {
    console.log(`Failed: ${totalFailed}`);
  }

  await mongoose.disconnect();
  console.log('\nDisconnected from MongoDB');
}

createMissingIndexes().catch(error => {
  console.error('Error creating indexes:', error);
  process.exit(1);
});
