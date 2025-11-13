#!/usr/bin/env node
/*
 Safe script to change AC number 118 -> 119 in MongoDB.
 Usage:
   # dry-run (default)
   node updateAC118to119.js

   # apply changes
   node updateAC118to119.js --apply

 The script reads MONGODB_URI from ../.env (server/.env). It will:
  - list collections
  - for each collection, run a set of heuristic queries to identify documents that reference AC 118 or 'Thondamuthur'
  - print counts and up to 5 sample documents per match type
  - if --apply is passed, perform specific updates for common fields (assignedAC, assignedACs, ac, acNumber, constituencyNumber, number, and simple string replacements of '118 - Thondamuthur')
*/

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient, ObjectId } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI in server/.env');
  process.exit(1);
}

const dryRun = !process.argv.includes('--apply');

console.log(`Running updateAC118to119.js (dryRun=${dryRun})`);

const client = new MongoClient(MONGODB_URI, { maxPoolSize: 10 });

async function sample(cursor, n = 5) {
  const arr = await cursor.limit(n).toArray();
  return arr;
}

async function replaceInStringFields(db, collName, query, fieldNames) {
  const coll = db.collection(collName);
  const cursor = coll.find(query).limit(50);
  const docs = await cursor.toArray();
  let updates = 0;
  for (const doc of docs) {
    let changed = false;
    const update = {};
    for (const field of fieldNames) {
      const val = doc[field];
      if (typeof val === 'string') {
        const newVal = val.replace(/118 - Thondamuthur/g, '119 - Thondamuthur').replace(/\b118\b/g, '119');
        if (newVal !== val) {
          update[field] = newVal;
          changed = true;
        }
      }
    }
    if (changed) {
      updates++;
      if (!dryRun) {
        await coll.updateOne({ _id: doc._id }, { $set: update });
      }
    }
  }
  return updates;
}

async function run() {
  try {
    await client.connect();
    const db = client.db();

    const collections = await db.listCollections().toArray();
    console.log('Collections found:', collections.map((c) => c.name).join(', '));

    const results = [];

    for (const { name } of collections) {
      const coll = db.collection(name);

      const queries = [
        { assignedAC: 118 },
        { assignedACs: 118 },
        { ac: 118 },
        { acNumber: 118 },
        { constituencyNumber: 118 },
        { number: 118 },
        { 'ac': '118 - Thondamuthur' },
        { 'ac': '118' },
        { 'constituencyName': 'Thondamuthur' },
        { 'constituency': 'Thondamuthur' },
        { name: /Thondamuthur/i },
        { title: /Thondamuthur/i },
        { description: /Thondamuthur/i },
        { $or: [ { email: /ac118/ }, { email: /ac118/ } ] },
      ];

      const collResult = { collection: name, matches: [] };

      for (const q of queries) {
        try {
          const count = await coll.countDocuments(q);
          if (count > 0) {
            const samples = await coll.find(q).limit(5).toArray();
            collResult.matches.push({ query: q, count, samples });
          }
        } catch (err) {
          // ignore invalid queries for this collection
        }
      }

      if (collResult.matches.length) {
        results.push(collResult);
      }
    }

    if (results.length === 0) {
      console.log('No candidate documents found referencing AC 118 or Thondamuthur.');
    } else {
      console.log('\nDry-run results:');
      for (const r of results) {
        console.log(`\nCollection: ${r.collection}`);
        for (const m of r.matches) {
          console.log(' Query:', JSON.stringify(m.query));
          console.log(' Count:', m.count);
          console.log(' Sample docs:');
          for (const s of m.samples) {
            console.log('  -', JSON.stringify(s, replaceObjectIds, 2));
          }
        }
      }

      if (!dryRun) {
        console.log('\nApplying updates...');

        // 1) users.assignedAC
        if (await db.collection('users').countDocuments({ assignedAC: 118 })) {
          const res = await db.collection('users').updateMany({ assignedAC: 118 }, { $set: { assignedAC: 119 } });
          console.log(`Updated users.assignedAC: ${res.modifiedCount} documents`);
        }

        // 2) surveys.assignedACs (replace array elements)
        const surveyColl = db.collection('surveys');
        const surveyCursor = surveyColl.find({ assignedACs: 118 });
        let surveyUpdates = 0;
        while (await surveyCursor.hasNext()) {
          const doc = await surveyCursor.next();
          const newAssigned = (doc.assignedACs || []).map((a) => (a === 118 ? 119 : a));
          const res = await surveyColl.updateOne({ _id: doc._id }, { $set: { assignedACs: newAssigned } });
          if (res.modifiedCount) surveyUpdates++;
        }
        if (surveyUpdates) console.log(`Updated surveys.assignedACs: ${surveyUpdates} documents`);

        // 3) Generic numeric fields
        const numericFieldNames = ['ac', 'acNumber', 'constituencyNumber', 'number'];
        for (const fname of numericFieldNames) {
          for (const { name } of collections) {
            const coll = db.collection(name);
            const q = {};
            q[fname] = 118;
            const cnt = await coll.countDocuments(q);
            if (cnt) {
              const res = await coll.updateMany(q, { $set: { [fname]: 119 } });
              console.log(`Updated ${name}.${fname}: ${res.modifiedCount} documents`);
            }
          }
        }

        // 4) Simple string replacements for '118 - Thondamuthur' and 'ac118' in email
        for (const { name } of collections) {
          const coll = db.collection(name);
          const q = { $or: [ { ac: /118 - Thondamuthur/ }, { email: /ac118/ }, { assignedAC: 118 } ] };
          const cnt = await coll.countDocuments(q);
          if (cnt) {
            const cursor = coll.find(q);
            let changed = 0;
            while (await cursor.hasNext()) {
              const doc = await cursor.next();
              const update = {};
              for (const key of Object.keys(doc)) {
                const v = doc[key];
                if (typeof v === 'string') {
                  const newVal = v.replace(/118 - Thondamuthur/g, '119 - Thondamuthur').replace(/ac118/g, 'ac119').replace(/\b118\b/g, '119');
                  if (newVal !== v) update[key] = newVal;
                }
                if (typeof v === 'number' && v === 118) update[key] = 119;
                if (Array.isArray(v) && v.includes(118)) update[key] = v.map((x) => (x === 118 ? 119 : x));
              }
              if (Object.keys(update).length) {
                await coll.updateOne({ _id: doc._id }, { $set: update });
                changed++;
              }
            }
            if (changed) console.log(`String/array updates in ${name}: ${changed} documents`);
          }
        }

        console.log('\nUpdate pass complete.');
      } else {
        console.log('\nDry-run complete. To apply changes, run with --apply');
      }
    }
  } catch (err) {
    console.error('Error', err);
  } finally {
    await client.close();
  }
}

function replaceObjectIds(key, value) {
  if (value && value._bsontype === 'ObjectID') {
    return value.toString();
  }
  return value;
}

run();
