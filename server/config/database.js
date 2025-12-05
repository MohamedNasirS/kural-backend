import mongoose from "mongoose";
import { MONGODB_URI } from "./index.js";

let indexFixAttempted = false;

export async function connectToDatabase() {
  if (!MONGODB_URI) {
    throw new Error("Missing MONGODB_URI environment variable");
  }

  const wasConnected = mongoose.connection.readyState === 1;

  if (!wasConnected) {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
  }

  // Fix formNumber index to be sparse (allows multiple null values) - only once
  if (!indexFixAttempted && mongoose.connection.readyState === 1) {
    indexFixAttempted = true;
    try {
      const surveysCollection = mongoose.connection.db.collection('surveys');
      const indexes = await surveysCollection.indexes();

      // Drop old formId_1 index if it exists (legacy index from old schema)
      const formIdIndex = indexes.find(idx => idx.name === 'formId_1');
      if (formIdIndex) {
        try {
          await surveysCollection.dropIndex('formId_1');
          console.log('✓ Dropped old formId_1 index (legacy index)');
        } catch (dropError) {
          console.log('Could not drop formId_1 index (may not exist):', dropError.message);
        }
      }

      const formNumberIndex = indexes.find(idx => idx.name === 'formNumber_1');

      if (formNumberIndex) {
        if (!formNumberIndex.sparse) {
          // Drop the old non-sparse index
          try {
            await surveysCollection.dropIndex('formNumber_1');
            console.log('Dropped old formNumber_1 index');
          } catch (dropError) {
            console.log('Could not drop index (may not exist):', dropError.message);
          }
          // Create a new sparse unique index
          await surveysCollection.createIndex({ formNumber: 1 }, { unique: true, sparse: true });
          console.log('✓ Fixed formNumber index: converted to sparse');
        } else {
          console.log('✓ formNumber index is already sparse');
        }
      } else {
        // Create the index if it doesn't exist
        await surveysCollection.createIndex({ formNumber: 1 }, { unique: true, sparse: true });
        console.log('✓ Created formNumber index as sparse');
      }
    } catch (error) {
      console.error('Error fixing formNumber index:', error.message);
      console.error('Full error:', error);
      // Continue even if index fix fails
    }
  }
}
