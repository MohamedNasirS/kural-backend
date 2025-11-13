#!/usr/bin/env node
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI in server/.env');
  process.exit(1);
}

const client = new MongoClient(MONGODB_URI);

async function checkVoterStructure() {
  try {
    await client.connect();
    const db = client.db();
    
    // Check total count
    const totalCount = await db.collection('voters').countDocuments({});
    console.log(`Total voters in collection: ${totalCount}`);
    
    // Get a sample voter document to see structure
    const sample = await db.collection('voters').findOne({});
    console.log('\nSample voter document:');
    console.log(JSON.stringify(sample, null, 2));
    
    // Get unique aci_num values
    const aciNums = await db.collection('voters').distinct('aci_num');
    console.log('\nUnique aci_num values:', aciNums.sort((a, b) => a - b));
    
    // Check for Thondamuthur specifically
    const thondamuthurCount = await db.collection('voters').countDocuments({ 
      aci_name: /thondamuthur/i 
    });
    console.log(`\nVoters with "Thondamuthur" in aci_name: ${thondamuthurCount}`);
    
    if (thondamuthurCount > 0) {
      const thondaSample = await db.collection('voters').findOne({ 
        aci_name: /thondamuthur/i 
      });
      console.log('\nSample Thondamuthur voter:');
      console.log(JSON.stringify(thondaSample, null, 2));
    }
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
  }
}

checkVoterStructure();
