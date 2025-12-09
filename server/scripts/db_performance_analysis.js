/**
 * MongoDB Database Performance Analysis
 * Analyzes query performance, index usage, and identifies optimization opportunities
 */

import mongoose from 'mongoose';
import { MONGODB_URI } from '../config/index.js';
import { ALL_AC_IDS, getVoterModel } from '../utils/voterCollection.js';

const performanceResults = {
  collectionStats: {},
  indexAnalysis: {},
  queryExplains: [],
  recommendations: [],
  hotspots: [],
  summary: {}
};

async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error("Missing MONGODB_URI");
  }
  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });
  console.log('✓ Connected to MongoDB');
}

async function getCollectionStats() {
  console.log('\n========== COLLECTION STATISTICS ==========\n');

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  for (const col of collections) {
    try {
      const stats = await db.command({ collStats: col.name });
      performanceResults.collectionStats[col.name] = {
        count: stats.count,
        size: stats.size,
        avgObjSize: stats.avgObjSize,
        storageSize: stats.storageSize,
        indexCount: stats.nindexes,
        totalIndexSize: stats.totalIndexSize,
        sizeInMB: (stats.size / (1024 * 1024)).toFixed(2),
        storageSizeInMB: (stats.storageSize / (1024 * 1024)).toFixed(2),
        indexSizeInMB: (stats.totalIndexSize / (1024 * 1024)).toFixed(2)
      };
      console.log(`Collection: ${col.name}`);
      console.log(`  Documents: ${stats.count}`);
      console.log(`  Size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
      console.log(`  Indexes: ${stats.nindexes}`);
      console.log(`  Index Size: ${(stats.totalIndexSize / (1024 * 1024)).toFixed(2)} MB`);
      console.log('');
    } catch (err) {
      console.log(`Skipping ${col.name}: ${err.message}`);
    }
  }
}

async function analyzeIndexes() {
  console.log('\n========== INDEX ANALYSIS ==========\n');

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  for (const col of collections) {
    try {
      const indexes = await db.collection(col.name).indexes();
      performanceResults.indexAnalysis[col.name] = {
        indexes: indexes.map(idx => ({
          name: idx.name,
          keys: idx.key,
          unique: idx.unique || false,
          sparse: idx.sparse || false
        })),
        indexCount: indexes.length
      };

      console.log(`Collection: ${col.name} (${indexes.length} indexes)`);
      indexes.forEach(idx => {
        console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}${idx.unique ? ' [unique]' : ''}${idx.sparse ? ' [sparse]' : ''}`);
      });
      console.log('');
    } catch (err) {
      console.log(`Skipping ${col.name}: ${err.message}`);
    }
  }
}

async function runExplainAnalysis() {
  console.log('\n========== QUERY EXPLAIN ANALYSIS ==========\n');

  const db = mongoose.connection.db;

  // Define critical queries to analyze
  const criticalQueries = [
    {
      name: 'Voter Lookup by ID',
      collection: 'voters_111',
      query: { voterID: 'YPC6654847' },
      type: 'findOne'
    },
    {
      name: 'Voters by Booth',
      collection: 'voters_111',
      query: { booth_id: 'BOOTH1-111' },
      type: 'find'
    },
    {
      name: 'Surveyed Voters Count',
      collection: 'voters_111',
      query: { surveyed: true },
      type: 'count'
    },
    {
      name: 'Voters by Family',
      collection: 'voters_111',
      query: { familyId: { $exists: true, $ne: null } },
      type: 'find'
    },
    {
      name: 'User by Email',
      collection: 'users',
      query: { email: 'admin@kuralapp.com' },
      type: 'findOne'
    },
    {
      name: 'Active Booth Agents',
      collection: 'users',
      query: { role: { $in: ['Booth Agent', 'BoothAgent'] }, isActive: true },
      type: 'find'
    },
    {
      name: 'Surveys by AC',
      collection: 'surveys',
      query: { assignedACs: 111 },
      type: 'find'
    },
    {
      name: 'Active Booths',
      collection: 'booths',
      query: { isActive: true },
      type: 'find'
    },
    {
      name: 'Booths by AC',
      collection: 'booths',
      query: { ac_id: 111, isActive: true },
      type: 'find'
    },
    {
      name: 'Mobile App Questions',
      collection: 'mobileappquestions',
      query: {},
      type: 'find'
    }
  ];

  for (const q of criticalQueries) {
    try {
      const collection = db.collection(q.collection);
      const explain = await collection.find(q.query).explain('executionStats');

      const stats = explain.executionStats;
      const queryPlanner = explain.queryPlanner;

      const result = {
        name: q.name,
        collection: q.collection,
        query: q.query,
        executionTimeMs: stats.executionTimeMillis,
        totalKeysExamined: stats.totalKeysExamined,
        totalDocsExamined: stats.totalDocsExamined,
        totalDocsReturned: stats.nReturned,
        indexUsed: queryPlanner.winningPlan.inputStage?.indexName || queryPlanner.winningPlan.stage,
        scanType: queryPlanner.winningPlan.stage,
        efficiency: stats.totalDocsReturned > 0
          ? (stats.totalDocsReturned / Math.max(stats.totalDocsExamined, 1) * 100).toFixed(1) + '%'
          : 'N/A',
        isEfficient: stats.totalDocsExamined <= stats.nReturned * 2 || queryPlanner.winningPlan.stage === 'IXSCAN'
      };

      performanceResults.queryExplains.push(result);

      console.log(`Query: ${q.name}`);
      console.log(`  Collection: ${q.collection}`);
      console.log(`  Execution Time: ${stats.executionTimeMillis}ms`);
      console.log(`  Keys Examined: ${stats.totalKeysExamined}`);
      console.log(`  Docs Examined: ${stats.totalDocsExamined}`);
      console.log(`  Docs Returned: ${stats.nReturned}`);
      console.log(`  Index Used: ${result.indexUsed}`);
      console.log(`  Scan Type: ${queryPlanner.winningPlan.stage}`);
      console.log(`  Efficiency: ${result.efficiency}`);
      console.log(`  Status: ${result.isEfficient ? '✓ EFFICIENT' : '⚠ NEEDS OPTIMIZATION'}`);
      console.log('');

      if (!result.isEfficient) {
        performanceResults.hotspots.push({
          query: q.name,
          collection: q.collection,
          issue: `COLLSCAN or high doc examination ratio`,
          docsExamined: stats.totalDocsExamined,
          docsReturned: stats.nReturned
        });
      }
    } catch (err) {
      console.log(`Skipping ${q.name}: ${err.message}`);
    }
  }
}

async function analyzeVoterCollections() {
  console.log('\n========== VOTER COLLECTION ANALYSIS ==========\n');

  const db = mongoose.connection.db;
  let totalVoters = 0;
  let totalSize = 0;

  for (const acId of ALL_AC_IDS) {
    const collName = `voters_${acId}`;
    try {
      const stats = await db.command({ collStats: collName });
      totalVoters += stats.count;
      totalSize += stats.size;

      console.log(`AC ${acId}: ${stats.count} voters, ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
    } catch (err) {
      console.log(`AC ${acId}: Collection not found or empty`);
    }
  }

  console.log(`\nTotal Voters: ${totalVoters}`);
  console.log(`Total Size: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);

  performanceResults.summary.totalVoters = totalVoters;
  performanceResults.summary.voterDataSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
}

async function generateRecommendations() {
  console.log('\n========== RECOMMENDATIONS ==========\n');

  const recommendations = [];

  // Check for COLLSCAN queries
  const collscanQueries = performanceResults.queryExplains.filter(q =>
    q.scanType === 'COLLSCAN' || q.scanType === 'FETCH'
  );
  if (collscanQueries.length > 0) {
    recommendations.push({
      severity: 'HIGH',
      category: 'Index',
      issue: 'Collection scans detected',
      queries: collscanQueries.map(q => q.name),
      recommendation: 'Add indexes on frequently queried fields to avoid full collection scans'
    });
  }

  // Check for large collections without sufficient indexes
  for (const [collName, stats] of Object.entries(performanceResults.collectionStats)) {
    if (stats.count > 10000 && stats.indexCount < 3) {
      recommendations.push({
        severity: 'MEDIUM',
        category: 'Index',
        issue: `Collection ${collName} has ${stats.count} documents but only ${stats.indexCount} indexes`,
        recommendation: 'Consider adding more indexes for common query patterns'
      });
    }
  }

  // Check index efficiency
  const inefficientQueries = performanceResults.queryExplains.filter(q => !q.isEfficient);
  if (inefficientQueries.length > 0) {
    recommendations.push({
      severity: 'HIGH',
      category: 'Query Optimization',
      issue: `${inefficientQueries.length} queries have poor efficiency`,
      queries: inefficientQueries.map(q => q.name),
      recommendation: 'Review these queries and add compound indexes matching query patterns'
    });
  }

  // Recommended indexes based on query patterns
  recommendations.push({
    severity: 'INFO',
    category: 'Recommended Indexes',
    recommendation: `
For voters_* collections:
  - { aci_id: 1, booth_id: 1 } - Compound index for booth-based queries
  - { aci_id: 1, surveyed: 1 } - For surveyed voter counts
  - { voterID: 1 } - For voter lookups
  - { familyId: 1 } - For family-based queries

For users collection:
  - { email: 1 } - Unique index for login
  - { phone: 1 } - For phone-based login
  - { role: 1, isActive: 1 } - For role-filtered queries
  - { assignedAC: 1, role: 1 } - For AC-filtered user queries

For surveys collection:
  - { assignedACs: 1 } - For AC-based survey lookups
  - { status: 1 } - For active survey queries

For booths collection:
  - { ac_id: 1, isActive: 1 } - For AC-filtered booth queries
  - { boothCode: 1 } - For booth lookups
    `
  });

  performanceResults.recommendations = recommendations;

  recommendations.forEach((rec, i) => {
    console.log(`${i + 1}. [${rec.severity}] ${rec.category}`);
    if (rec.issue) console.log(`   Issue: ${rec.issue}`);
    if (rec.queries) console.log(`   Affected: ${rec.queries.join(', ')}`);
    console.log(`   Recommendation: ${rec.recommendation}`);
    console.log('');
  });
}

async function generateSummary() {
  console.log('\n========== PERFORMANCE SUMMARY ==========\n');

  const summary = {
    ...performanceResults.summary,
    totalCollections: Object.keys(performanceResults.collectionStats).length,
    totalIndexes: Object.values(performanceResults.indexAnalysis).reduce((sum, c) => sum + c.indexCount, 0),
    queriesAnalyzed: performanceResults.queryExplains.length,
    efficientQueries: performanceResults.queryExplains.filter(q => q.isEfficient).length,
    hotspotCount: performanceResults.hotspots.length,
    recommendationCount: performanceResults.recommendations.length
  };

  summary.queryEfficiencyRate = summary.queriesAnalyzed > 0
    ? ((summary.efficientQueries / summary.queriesAnalyzed) * 100).toFixed(1) + '%'
    : 'N/A';

  performanceResults.summary = summary;

  console.log(`Total Collections: ${summary.totalCollections}`);
  console.log(`Total Indexes: ${summary.totalIndexes}`);
  console.log(`Total Voters: ${summary.totalVoters || 'N/A'}`);
  console.log(`Voter Data Size: ${summary.voterDataSizeMB || 'N/A'} MB`);
  console.log(`Queries Analyzed: ${summary.queriesAnalyzed}`);
  console.log(`Efficient Queries: ${summary.efficientQueries} (${summary.queryEfficiencyRate})`);
  console.log(`Hotspots Identified: ${summary.hotspotCount}`);
  console.log(`Recommendations: ${summary.recommendationCount}`);
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     MONGODB DATABASE PERFORMANCE ANALYSIS                     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\nAnalysis started at: ${new Date().toISOString()}\n`);

  try {
    await connectDB();
    await getCollectionStats();
    await analyzeIndexes();
    await runExplainAnalysis();
    await analyzeVoterCollections();
    await generateRecommendations();
    await generateSummary();

    console.log('\n========== JSON OUTPUT ==========\n');
    console.log(JSON.stringify(performanceResults, null, 2));

  } catch (error) {
    console.error('Analysis error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
  }
}

main();
