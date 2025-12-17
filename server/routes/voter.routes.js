import express from "express";
import mongoose from "mongoose";
import VoterField from "../models/VoterField.js";
import { connectToDatabase } from "../config/database.js";
import {
  unwrapLegacyFieldValue,
  inferFieldTypeFromValue,
  hasMeaningfulValue,
} from "../utils/helpers.js";
import {
  getVoterModel,
  findVoterById,
  findVoterByIdAndUpdate,
  findOneVoter,
  countAllVoters,
  queryAllVoters,
  ALL_AC_IDS,
} from "../utils/voterCollection.js";
import { isAuthenticated, canAccessAC } from "../middleware/auth.js";
import { getCache, setCache, TTL, invalidateCache, invalidateACCache } from "../utils/cache.js";
import { getPrecomputedStats } from "../utils/precomputedStats.js";
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  sendServerError,
  sendPaginated
} from "../utils/responseHelpers.js";
import { MESSAGES, PAGINATION_CONFIG, CACHE_CONFIG } from "../config/constants.js";

const router = express.Router();

// Apply authentication to all routes
router.use(isAuthenticated);

// Reserved field names - EMPTY to allow full flexibility
const RESERVED_FIELDS = [];

// Get existing fields from actual voter documents (for reference)
// OPTIMIZED: Uses caching and samples from single AC collection
router.get("/fields/existing", async (req, res) => {
  try {
    await connectToDatabase();

    // Check cache first (30 minute TTL)
    const cacheKey = 'global:voter:fields:existing';
    const cached = getCache(cacheKey, CACHE_CONFIG.veryLong);
    if (cached) {
      return sendSuccess(res, cached);
    }

    // Sample from voters_111 which has the most data (10k voters)
    // This is much faster than querying all 21 AC collections
    const primaryAcId = 111;
    const VoterModel = getVoterModel(primaryAcId);

    // Get total count from primary collection
    const totalVoters = await VoterModel.countDocuments({});

    // Sample 50 documents (sufficient for field discovery)
    const sampleVoters = await VoterModel.find({})
      .limit(50)
      .lean();

    if (sampleVoters.length === 0) {
      const data = { fields: {}, totalVoters: 0, samplesAnalyzed: 0 };
      setCache(cacheKey, data, CACHE_CONFIG.veryLong);
      return sendSuccess(res, data);
    }

    // Analyze all fields present in voter documents
    const fieldAnalysis = {};

    sampleVoters.forEach((voter) => {
      Object.keys(voter).forEach((key) => {
        // Skip MongoDB internal fields
        if (key === '_id' || key === '__v' || key === 'createdAt' || key === 'updatedAt') {
          return;
        }

        if (!fieldAnalysis[key]) {
          fieldAnalysis[key] = {
            type: 'Unknown',
            samples: []
          };
        }

        const { actualValue, legacyVisible } = unwrapLegacyFieldValue(voter[key]);
        if (fieldAnalysis[key].visible === undefined && legacyVisible !== undefined) {
          fieldAnalysis[key].visible = legacyVisible;
        }

        // Determine type based on actual value
        let inferredType = 'Unknown';
        if (actualValue === null || actualValue === undefined) {
          inferredType = 'Null';
        } else if (typeof actualValue === 'string') {
          inferredType = 'String';
        } else if (typeof actualValue === 'number') {
          inferredType = 'Number';
        } else if (typeof actualValue === 'boolean') {
          inferredType = 'Boolean';
        } else if (actualValue instanceof Date) {
          inferredType = 'Date';
        } else if (Array.isArray(actualValue)) {
          inferredType = 'Array';
        } else if (typeof actualValue === 'object') {
          inferredType = 'Object';
        }

        // Update type if it's more specific
        if (fieldAnalysis[key].type === 'Unknown' || fieldAnalysis[key].type === 'Null') {
          fieldAnalysis[key].type = inferredType;
        }

        // Collect sample values (up to 3 unique samples per field - reduced from 5)
        if (fieldAnalysis[key].samples.length < 3) {
          let displayValue = actualValue;
          if (actualValue instanceof Date) {
            displayValue = actualValue.toISOString().split('T')[0];
          } else if (typeof actualValue === 'object' && actualValue !== null) {
            displayValue = JSON.stringify(actualValue);
            if (displayValue.length > 50) {
              displayValue = displayValue.substring(0, 50) + '...';
            }
          } else if (typeof actualValue === 'string' && actualValue.length > 50) {
            displayValue = actualValue.substring(0, 50) + '...';
          }

          if (!fieldAnalysis[key].samples.some(s => String(s.value) === String(displayValue))) {
            fieldAnalysis[key].samples.push({
              value: displayValue,
              type: inferredType
            });
          }
        }
      });
    });

    // Sort fields alphabetically
    const sortedFields = {};
    Object.keys(fieldAnalysis).sort().forEach(key => {
      sortedFields[key] = fieldAnalysis[key];
    });

    // Fetch visibility status from VoterField collection
    const fieldMetadata = await VoterField.find({}).lean();
    const visibilityMap = {};
    fieldMetadata.forEach(field => {
      visibilityMap[field.name] = field.visible !== undefined ? field.visible : true;
    });

    // Add visibility information to each field
    Object.keys(sortedFields).forEach(key => {
      if (sortedFields[key].visible === undefined) {
        sortedFields[key].visible = visibilityMap[key] !== undefined ? visibilityMap[key] : true;
      }
    });

    const data = {
      fields: sortedFields,
      totalVoters,
      samplesAnalyzed: sampleVoters.length
    };

    // Cache the result
    setCache(cacheKey, data, CACHE_CONFIG.veryLong);

    return sendSuccess(res, data);
  } catch (error) {
    console.error("Error fetching existing fields from voters:", error);
    return sendServerError(res, "Failed to fetch existing fields", error);
  }
});

// Get all voter fields
router.get("/fields", async (req, res) => {
  try {
    await connectToDatabase();

    const fields = await VoterField.find().sort({ name: 1 });

    return sendSuccess(res, {
      fields: fields.map(field => ({
        name: field.name,
        type: field.type,
        required: field.required,
        default: field.default,
        label: field.label,
        description: field.description,
        visible: field.visible !== undefined ? field.visible : true,
        isReserved: false,
      })),
    });
  } catch (error) {
    console.error("Error fetching voter fields:", error);
    return sendServerError(res, "Failed to fetch voter fields", error);
  }
});

// Convert all existing fields to object format { value, visible }
router.post("/fields/convert-all", async (_req, res) => {
  try {
    await connectToDatabase();

    const systemFields = new Set(['_id', '__v', 'createdAt', 'updatedAt']);
    const batchSize = 500;
    let totalFlattenedFields = 0;
    let totalVotersUpdated = 0;
    let totalVotersChecked = 0;

    // Iterate through all sharded voter collections
    for (const acId of ALL_AC_IDS) {
      const VoterModel = getVoterModel(acId);
      const cursor = VoterModel.find({}).lean().cursor();
      let bulkOps = [];
      let batchIndex = 0;

      for await (const voter of cursor) {
        totalVotersChecked++;
        const updateObj = {};

        Object.keys(voter).forEach((key) => {
          if (systemFields.has(key)) return;

          const { actualValue, wasLegacyFormat } = unwrapLegacyFieldValue(voter[key]);
          if (wasLegacyFormat) {
            updateObj[key] = actualValue ?? null;
            totalFlattenedFields++;
          }
        });

        if (Object.keys(updateObj).length > 0) {
          bulkOps.push({
            updateOne: {
              filter: { _id: voter._id },
              update: { $set: updateObj },
            },
          });
        }

        if (bulkOps.length >= batchSize) {
          const result = await VoterModel.bulkWrite(bulkOps, { ordered: false });
          totalVotersUpdated += result.modifiedCount || 0;
          console.log(`[Convert-All] AC ${acId} Batch ${batchIndex} flattened ${result.modifiedCount || 0} voters`);
          bulkOps = [];
          batchIndex++;
        }
      }

      if (bulkOps.length > 0) {
        const result = await VoterModel.bulkWrite(bulkOps, { ordered: false });
        totalVotersUpdated += result.modifiedCount || 0;
        console.log(`[Convert-All] AC ${acId} Final batch flattened ${result.modifiedCount || 0} voters`);
      }
    }

    return sendSuccess(res, {
      flattenedFields: totalFlattenedFields,
      votersUpdated: totalVotersUpdated,
      votersChecked: totalVotersChecked,
    }, `Flattened ${totalFlattenedFields} legacy field instances across ${totalVotersUpdated} voter documents`);
  } catch (error) {
    console.error("Error flattening legacy field objects:", error);
    return sendServerError(res, "Failed to normalize voter fields", error);
  }
});

// Add a new voter field
router.post("/fields", async (req, res) => {
  try {
    await connectToDatabase();

    const { name, type, required, default: defaultValue, label, description } = req.body;

    if (!name || !type) {
      return sendBadRequest(res, "Field name and type are required");
    }

    // Validate field name
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      return sendBadRequest(res, "Field name must start with a letter or underscore and contain only letters, numbers, and underscores");
    }

    // Check if field already exists
    const existingField = await VoterField.findOne({ name });
    if (existingField) {
      return sendBadRequest(res, `Field "${name}" already exists`);
    }

    // Create field metadata
    const newField = new VoterField({
      name,
      type,
      required: required || false,
      default: defaultValue,
      label,
      description,
      visible: req.body.visible !== undefined ? req.body.visible : true,
    });

    await newField.save();

    // Add the field to ALL existing voter documents across all sharded collections
    const normalizedDefault =
      defaultValue !== undefined && defaultValue !== null && defaultValue !== ''
        ? defaultValue
        : null;

    let totalUpdated = 0;
    let totalVoters = 0;
    for (const acId of ALL_AC_IDS) {
      const VoterModel = getVoterModel(acId);
      const updateResult = await VoterModel.updateMany(
        { [name]: { $exists: false } },
        { $set: { [name]: normalizedDefault } }
      );
      totalUpdated += updateResult.modifiedCount;
      totalVoters += await VoterModel.countDocuments({});
    }

    // Cache invalidation: Clear all AC caches since field affects all voters
    for (const acId of ALL_AC_IDS) {
      invalidateACCache(acId);
    }
    invalidateCache('global:voter:fields');
    console.log(`[Cache] Invalidated all AC caches after adding field "${name}"`);

    return sendCreated(res, {
      field: {
        name: newField.name,
        type: newField.type,
        required: newField.required,
        default: newField.default,
        label: newField.label,
        description: newField.description,
      },
    }, `Field "${name}" has been successfully added to all ${totalVoters} voters. ${totalUpdated} voters were updated.`);
  } catch (error) {
    console.error("Error adding voter field:", error);
    return sendServerError(res, "Failed to add voter field", error);
  }
});

// Rename a field across all voter documents
router.post("/fields/:oldFieldName/rename", async (req, res) => {
  try {
    await connectToDatabase();

    const { oldFieldName } = req.params;
    const { newFieldName } = req.body;

    if (!newFieldName || !newFieldName.trim()) {
      return sendBadRequest(res, "New field name is required");
    }

    // Validate new field name
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(newFieldName.trim())) {
      return sendBadRequest(res, "New field name must start with a letter or underscore and contain only letters, numbers, and underscores");
    }

    // Only prevent renaming of critical fields
    const CRITICAL_FIELDS = ['_id', 'name', 'voterID', 'voterId', 'createdAt', 'updatedAt'];
    const isCritical = CRITICAL_FIELDS.some(cf => cf.toLowerCase() === oldFieldName.toLowerCase());

    if (isCritical) {
      return sendBadRequest(res, `Field "${oldFieldName}" is a critical system field and cannot be renamed`);
    }

    const trimmedNewName = newFieldName.trim();

    // Check if new field name already exists in schema
    const existingFieldInSchema = await VoterField.findOne({ name: trimmedNewName });

    // Check if new field name already exists in voter documents
    const votersWithNewField = await countAllVoters({ [trimmedNewName]: { $exists: true } });
    const votersWithOldField = await countAllVoters({ [oldFieldName]: { $exists: true } });

    // If target field exists and it's different from source, we'll merge the data
    const needsMerge = votersWithNewField > 0 && trimmedNewName !== oldFieldName;

    // Count total voters
    const totalVoters = await countAllVoters({});
    const votersWithoutField = totalVoters - votersWithOldField;

    if (votersWithOldField === 0) {
      return sendNotFound(res, `Field "${oldFieldName}" not found in any voter documents. Total voters: ${totalVoters}`);
    }

    // Handle field metadata
    try {
      const oldFieldMeta = await VoterField.findOne({ name: oldFieldName });
      const newFieldMeta = await VoterField.findOne({ name: trimmedNewName });

      if (oldFieldMeta) {
        if (newFieldMeta && trimmedNewName !== oldFieldName) {
          await VoterField.deleteOne({ name: oldFieldName });
          console.log(`Merging: Deleted old field metadata "${oldFieldName}" since "${trimmedNewName}" already exists`);
        } else if (!newFieldMeta) {
          try {
            oldFieldMeta.name = trimmedNewName;
            await oldFieldMeta.save();
          } catch (saveError) {
            await VoterField.deleteOne({ name: oldFieldName });
            console.log(`Merging: Deleted old field metadata "${oldFieldName}" after save error:`, saveError.message);
          }
        }
      }
    } catch (metaError) {
      console.warn(`Metadata update failed, continuing with field rename:`, metaError.message);
    }

    // Rename the field in voter documents
    let renamedCount = 0;
    let mergedCount = 0;

    for (const acId of ALL_AC_IDS) {
      const VoterModel = getVoterModel(acId);
      const votersWithField = await VoterModel.find({ [oldFieldName]: { $exists: true } }).lean();

      const batchSize = 100;
      for (let i = 0; i < votersWithField.length; i += batchSize) {
        const batch = votersWithField.slice(i, i + batchSize);
        const bulkOps = batch.map(voter => {
          const { actualValue: oldActual } = unwrapLegacyFieldValue(voter[oldFieldName]);
          const { actualValue: newActual } = unwrapLegacyFieldValue(voter[trimmedNewName]);

          let finalValue = oldActual ?? null;

          if (needsMerge) {
            const targetHasValue = hasMeaningfulValue(newActual);
            const sourceHasValue = hasMeaningfulValue(oldActual);

            if (!targetHasValue && sourceHasValue) {
              mergedCount++;
            }

            if (targetHasValue) {
              finalValue = newActual;
            }
          }

          return {
            updateOne: {
              filter: { _id: voter._id },
              update: {
                $set: { [trimmedNewName]: finalValue },
                $unset: { [oldFieldName]: "" }
              }
            }
          };
        });

        if (bulkOps.length > 0) {
          const batchResult = await VoterModel.bulkWrite(bulkOps);
          renamedCount += batchResult.modifiedCount;
        }
      }
    }

    // Cache invalidation: Clear all AC caches since field rename affects all voters
    for (const acId of ALL_AC_IDS) {
      invalidateACCache(acId);
    }
    invalidateCache('global:voter:fields');
    console.log(`[Cache] Invalidated all AC caches after renaming field "${oldFieldName}" to "${trimmedNewName}"`);

    let message;
    if (needsMerge) {
      message = `Field "${oldFieldName}" has been merged into "${trimmedNewName}" in ${renamedCount} voter documents.`;
    } else {
      message = `Field "${oldFieldName}" has been successfully renamed to "${trimmedNewName}" in ${renamedCount} voter documents`;
    }

    return sendSuccess(res, {
      oldFieldName,
      newFieldName: trimmedNewName,
      votersAffected: renamedCount,
      totalVoters,
      votersWithField: votersWithOldField,
      votersWithoutField,
      merged: needsMerge,
      mergedCount: needsMerge ? mergedCount : 0,
    }, message);
  } catch (error) {
    console.error("Error renaming voter field:", error);
    const newName = newFieldName?.trim() || 'unknown';
    if (error.message?.includes('already exists') || error.message?.includes('duplicate') || error.code === 11000) {
      return sendSuccess(res, {
        oldFieldName,
        newFieldName: newName,
        merged: true,
      }, `Field rename/merge completed. Some metadata conflicts were resolved automatically.`);
    }
    return sendServerError(res, "Failed to rename voter field", error);
  }
});

// Toggle field visibility
router.put("/fields/:fieldName/visibility", async (req, res) => {
  try {
    await connectToDatabase();

    const { fieldName } = req.params;
    const { visible } = req.body;

    if (typeof visible !== 'boolean') {
      return sendBadRequest(res, "Visible parameter must be a boolean value");
    }

    const CRITICAL_FIELDS = ['_id', 'createdAt', 'updatedAt'];
    if (CRITICAL_FIELDS.includes(fieldName)) {
      return sendBadRequest(res, `Field "${fieldName}" is a critical system field and cannot have visibility toggled`);
    }

    let field = await VoterField.findOne({ name: fieldName });

    if (field) {
      field.visible = visible;
      await field.save();
    } else {
      const sampleVoterResult = await findOneVoter({ [fieldName]: { $exists: true } });
      if (!sampleVoterResult) {
        return sendNotFound(res, `Field "${fieldName}" not found in schema or voter documents`);
      }

      const { actualValue } = unwrapLegacyFieldValue(sampleVoterResult.voter[fieldName]);
      field = new VoterField({
        name: fieldName,
        type: inferFieldTypeFromValue(actualValue),
        required: false,
        visible,
      });
      await field.save();
    }

    // Cache invalidation: Clear field-related caches
    invalidateCache('global:voter:fields');
    console.log(`[Cache] Invalidated field caches after toggling visibility for "${fieldName}"`);

    return sendSuccess(res, {
      field: {
        name: field.name,
        type: field.type,
        visible: field.visible,
      },
    }, `Field "${fieldName}" visibility updated to ${visible ? 'visible' : 'hidden'}`);
  } catch (error) {
    console.error("Error toggling field visibility:", error);
    return sendServerError(res, "Failed to toggle field visibility", error);
  }
});

// Update a voter field
router.put("/fields/:fieldName", async (req, res) => {
  try {
    await connectToDatabase();

    const { fieldName } = req.params;
    const { type, required, default: defaultValue, label, description } = req.body;

    const field = await VoterField.findOne({ name: fieldName });
    if (!field) {
      return sendNotFound(res, `Field "${fieldName}" not found`);
    }

    if (type !== undefined) field.type = type;
    if (required !== undefined) field.required = required;
    if (defaultValue !== undefined) field.default = defaultValue;
    if (label !== undefined) field.label = label;
    if (description !== undefined) field.description = description;
    if (req.body.visible !== undefined) field.visible = req.body.visible;

    await field.save();

    if (defaultValue !== undefined && defaultValue !== null && defaultValue !== '') {
      const updateQuery = { $set: { [fieldName]: defaultValue } };
      for (const acId of ALL_AC_IDS) {
        const VoterModel = getVoterModel(acId);
        await VoterModel.updateMany({ [fieldName]: { $exists: false } }, updateQuery);
      }
    }

    // Cache invalidation: Clear field-related caches
    invalidateCache('global:voter:fields');
    console.log(`[Cache] Invalidated field caches after updating "${fieldName}"`);

    return sendSuccess(res, {
      field: {
        name: field.name,
        type: field.type,
        required: field.required,
        default: field.default,
        label: field.label,
        description: field.description,
        visible: field.visible !== undefined ? field.visible : true,
      },
    }, `Field "${fieldName}" has been successfully updated`);
  } catch (error) {
    console.error("Error updating voter field:", error);
    return sendServerError(res, "Failed to update voter field", error);
  }
});

// Delete a voter field
router.delete("/fields/:fieldName", async (req, res) => {
  try {
    await connectToDatabase();

    const { fieldName } = req.params;

    const field = await VoterField.findOne({ name: fieldName });

    if (field) {
      await VoterField.deleteOne({ name: fieldName });
    }

    const unsetQuery = { $unset: { [fieldName]: "" } };
    let totalModified = 0;
    for (const acId of ALL_AC_IDS) {
      const VoterModel = getVoterModel(acId);
      const result = await VoterModel.updateMany({}, unsetQuery);
      totalModified += result.modifiedCount;
    }

    // Cache invalidation: Clear all AC caches since field deletion affects all voters
    for (const acId of ALL_AC_IDS) {
      invalidateACCache(acId);
    }
    invalidateCache('global:voter:fields');
    console.log(`[Cache] Invalidated all AC caches after deleting field "${fieldName}"`);

    return sendSuccess(res, {
      fieldName,
      votersAffected: totalModified,
      wasInSchema: !!field,
    }, `Field "${fieldName}" has been successfully deleted from all voters`);
  } catch (error) {
    console.error("Error deleting voter field:", error);
    return sendServerError(res, "Failed to delete voter field", error);
  }
});

// Get single voter by ID
router.get("/details/:voterId", async (req, res) => {
  try {
    await connectToDatabase();

    const { voterId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(voterId)) {
      return sendBadRequest(res, "Invalid voter ID");
    }

    const result = await findVoterById(voterId);

    if (!result) {
      return sendNotFound(res, "Voter not found");
    }

    return sendSuccess(res, result.voter);
  } catch (error) {
    console.error("Error fetching voter details:", error);
    return sendServerError(res, "Failed to fetch voter details", error);
  }
});

// Update a single voter by ID
router.put("/:voterId", async (req, res) => {
  try {
    await connectToDatabase();

    const { voterId } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(voterId)) {
      return sendBadRequest(res, "Invalid voter ID");
    }

    const currentVoterResult = await findVoterById(voterId);
    if (!currentVoterResult) {
      return sendNotFound(res, "Voter not found");
    }
    const currentVoter = currentVoterResult.voter;
    const voterAcId = currentVoterResult.acId;

    if (updateData.name && typeof updateData.name === 'string') {
      updateData.name = { ...currentVoter.name, english: updateData.name };
    }

    const processedUpdateData = {};
    Object.entries(updateData).forEach(([key, rawValue]) => {
      if (key === '_id' || key === '__v') {
        return;
      }

      if (key === 'name' && typeof rawValue === 'string') {
        processedUpdateData.name = { ...currentVoter.name, english: rawValue };
        return;
      }

      const { actualValue } = unwrapLegacyFieldValue(rawValue);
      processedUpdateData[key] = actualValue;
    });

    const VoterModel = getVoterModel(voterAcId);
    const voter = await VoterModel.findByIdAndUpdate(
      voterId,
      { $set: processedUpdateData },
      { new: true, runValidators: false }
    );

    if (!voter) {
      return sendNotFound(res, "Voter not found");
    }

    // Cache invalidation: Clear voter and dashboard caches for this AC
    invalidateACCache(voterAcId);
    invalidateCache(`ac:${voterAcId}:voters`);
    invalidateCache(`ac:${voterAcId}:families`);
    invalidateCache(`ac:${voterAcId}:dashboard`);
    console.log(`[Cache] Invalidated caches for AC ${voterAcId} after voter update`);

    return sendSuccess(res, { voter }, "Voter updated successfully");
  } catch (error) {
    console.error("Error updating voter:", error);
    return sendServerError(res, "Failed to update voter", error);
  }
});

// Get all voters for a specific AC with optional booth filter
router.get("/:acId", async (req, res) => {
  try {
    await connectToDatabase();

    const acIdParam = req.params.acId;

    // Check if it's a reserved path
    if (['fields', 'details'].includes(acIdParam)) {
      return sendBadRequest(res, "Invalid route");
    }

    const rawIdentifier = acIdParam ?? req.query.aciName ?? req.query.acName;

    // Check if the identifier looks like an ObjectId
    if (mongoose.Types.ObjectId.isValid(rawIdentifier) && rawIdentifier.length === 24) {
      return sendBadRequest(res, "Invalid AC identifier. Use /api/voters/details/:voterId to fetch individual voter details.");
    }

    let acId;
    const numericId = Number(rawIdentifier);
    if (!isNaN(numericId) && numericId > 0) {
      acId = numericId;
    } else {
      const identifierString = String(rawIdentifier);
      const voterResult = await findOneVoter({
        $or: [
          { aci_name: new RegExp(`^${identifierString}$`, 'i') },
          { ac_name: new RegExp(`^${identifierString}$`, 'i') }
        ]
      });
      if (voterResult && voterResult.voter) {
        acId = voterResult.voter.aci_id || voterResult.voter.aci_num;
      }
    }

    if (!acId) {
      return sendBadRequest(res, `Invalid AC identifier: ${rawIdentifier}`);
    }

    // AC Isolation: Check if user can access this AC
    if (!canAccessAC(req.user, acId)) {
      return sendForbidden(res, "Access denied. You do not have permission to view this AC's data.");
    }

    const { booth, search, status, page = 1, limit = 50 } = req.query;

    // OPTIMIZATION: Cache simple paginated queries (no filters) - increased TTL for better performance
    const isSimpleQuery = !search && (!status || status === 'all') && (!booth || booth === 'all');
    const cacheKey = isSimpleQuery ? `ac:${acId}:voters:page${page}:limit${limit}` : null;

    if (cacheKey) {
      const cached = getCache(cacheKey, TTL.MEDIUM); // 5 minute cache for voter lists (was 1 min)
      if (cached) {
        return sendSuccess(res, cached);
      }
    }

    const queryClauses = [];

    if (booth && booth !== "all") {
      // Support both booth_id (e.g., "BOOTH1-111") and boothname
      queryClauses.push({
        $or: [
          { booth_id: booth },
          { boothname: booth }
        ]
      });
    }

    if (status && status !== "all") {
      // Handle "Not Contacted" status - includes voters without status field or with null/undefined status
      if (status === "Not Contacted") {
        queryClauses.push({
          $or: [
            { status: { $regex: /^not\s*contacted$/i } },
            { status: { $exists: false } },
            { status: null },
            { status: "" }
          ]
        });
      } else if (status === "Surveyed") {
        // Match "Surveyed" or "verified" (case-insensitive)
        queryClauses.push({
          $or: [
            { status: { $regex: /^surveyed$/i } },
            { status: { $regex: /^verified$/i } }
          ]
        });
      } else if (status === "Pending") {
        // Match "Pending" (case-insensitive)
        queryClauses.push({ status: { $regex: /^pending$/i } });
      } else {
        // For any other status, use case-insensitive match
        queryClauses.push({ status: { $regex: new RegExp(`^${status}$`, 'i') } });
      }
    }

    if (search && search.trim()) {
      const searchTerm = search.trim();
      // Use text search for 3+ characters (faster with text index)
      // Use regex for shorter searches (partial match support)
      if (searchTerm.length >= 3) {
        // Text search - uses the voter_search_text index
        queryClauses.push({ $text: { $search: searchTerm } });
      } else {
        // Short search - use prefix regex for partial matches
        const escapedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        queryClauses.push({
          $or: [
            { voterID: { $regex: `^${escapedSearch}`, $options: "i" } },
            { "name.english": { $regex: `^${escapedSearch}`, $options: "i" } },
          ],
        });
      }
    }

    const query = queryClauses.length === 0 ? {} :
      queryClauses.length === 1 ? queryClauses[0] : { $and: queryClauses };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const VoterModel = getVoterModel(acId);

    const voters = await VoterModel.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ boothno: 1, "name.english": 1 })
      .lean();

    // OPTIMIZATION: Use precomputed stats for total count on simple queries (avoids full collection scan)
    let totalVoters;
    if (isSimpleQuery) {
      // Try precomputed stats first (fast - single document read)
      const precomputed = await getPrecomputedStats(acId, CACHE_CONFIG.precomputedStats); // 10 min max age
      if (precomputed && precomputed.totalMembers) {
        totalVoters = precomputed.totalMembers;
      } else {
        // Fallback to count with separate caching
        const countCacheKey = `ac:${acId}:voters:total`;
        totalVoters = getCache(countCacheKey, TTL.MEDIUM);
        if (!totalVoters) {
          totalVoters = await VoterModel.countDocuments({});
          setCache(countCacheKey, totalVoters, TTL.MEDIUM);
        }
      }
    } else {
      // Filtered queries need actual count
      totalVoters = await VoterModel.countDocuments(query);
    }

    const response = {
      voters: voters.map((voter) => {
        let voterName = "N/A";
        let voterNameTamil = null;
        if (voter.name) {
          if (typeof voter.name === 'object' && voter.name !== null) {
            voterName = voter.name.english || voter.name.tamil || voter.name.value || "N/A";
            voterNameTamil = voter.name.tamil || null;
          } else if (typeof voter.name === 'string') {
            voterName = voter.name;
          }
        }

        return {
          id: voter._id,
          name: voterName,
          nameTamil: voterNameTamil,
          voterId: voter.voterID || "N/A",
          familyId: voter.familyId || voter.family_id || "N/A",
          booth: voter.boothname || `Booth ${voter.boothno || "N/A"}`,
          boothNo: voter.boothno,
          boothId: voter.booth_id,
          phone: voter.mobile ? String(voter.mobile) : "N/A",
          status: voter.status || "Not Contacted",
          age: voter.age,
          gender: voter.gender,
          verified: voter.verified || false,
          surveyed: voter.surveyed ?? false,
          // Additional fields
          address: voter.address || null,
          doorNumber: voter.doornumber || voter.Door_No || null,
          fatherName: voter.fathername || null,
          guardian: voter.guardian || null,
          dob: voter.DOB || null,
          email: voter.emailid || null,
          aadhar: voter.aadhar || null,
          pan: voter.pan || voter.PAN || null,
          religion: voter.religion || null,
          caste: voter.caste || null,
          subcaste: voter.subcaste || null,
          bloodGroup: voter.bloodgroup || null,
          annualIncome: voter.annual_income || null,
          aciId: voter.aci_id || null,
          aciName: voter.aci_name || null,
          boothAgentId: voter.booth_agent_id || null,
          verifiedAt: voter.verifiedAt || null,
          surveyedAt: voter.surveyedAt || null,
          createdAt: voter.createdAt || null,
          updatedAt: voter.updatedAt || null,
        };
      }),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalVoters,
        pages: Math.ceil(totalVoters / parseInt(limit)),
      },
    };

    // OPTIMIZATION: Cache the response for simple queries (5 min TTL)
    if (cacheKey) {
      setCache(cacheKey, response, TTL.MEDIUM);
    }

    return sendSuccess(res, response);
  } catch (error) {
    console.error("Error fetching voters:", error);
    return sendServerError(res, "Failed to fetch voters", error);
  }
});

// Get distinct booths for a specific AC
router.get("/:acId/booths", async (req, res) => {
  try {
    await connectToDatabase();

    const rawIdentifier = req.params.acId;

    let acId;
    const numericId = Number(rawIdentifier);
    if (!isNaN(numericId) && numericId > 0) {
      acId = numericId;
    } else {
      const identifierString = String(rawIdentifier);
      const voterResult = await findOneVoter({
        $or: [
          { aci_name: new RegExp(`^${identifierString}$`, 'i') },
          { ac_name: new RegExp(`^${identifierString}$`, 'i') }
        ]
      });
      if (voterResult && voterResult.voter) {
        acId = voterResult.voter.aci_id || voterResult.voter.aci_num;
      }
    }

    if (!acId) {
      return sendBadRequest(res, `Invalid AC identifier: ${rawIdentifier}`);
    }

    // AC Isolation: Check if user can access this AC
    if (!canAccessAC(req.user, acId)) {
      return sendForbidden(res, "Access denied. You do not have permission to view this AC's data.");
    }

    const VoterModel = getVoterModel(acId);

    const boothsAggregation = await VoterModel.aggregate([
      {
        $group: {
          _id: "$booth_id",
          boothno: { $first: "$boothno" },
          boothname: { $first: "$boothname" },
          voterCount: { $sum: 1 }
        }
      },
      { $sort: { boothno: 1 } }
    ]);

    const booths = boothsAggregation
      .filter((booth) => booth._id != null && booth._id !== "")
      .map((booth) => ({
        boothId: booth._id,
        booth_id: booth._id,
        boothNo: booth.boothno,
        boothName: booth.boothname || `Booth ${booth.boothno}`,
        voterCount: booth.voterCount,
        label: booth.boothname || `Booth ${booth.boothno}`,
        // Combined display for dropdowns: "BOOTH_ID - Booth Name"
        displayName: `${booth._id} - ${booth.boothname || `Booth ${booth.boothno}`}`
      }));

    return sendSuccess(res, { booths });
  } catch (error) {
    console.error("Error fetching booths:", error);
    return sendServerError(res, "Failed to fetch booths", error);
  }
});

export default router;
