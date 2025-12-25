/**
 * VoterService - Business logic for voter operations
 * Decouples business logic from route handlers
 */

import mongoose from "mongoose";
import VoterField from "../models/VoterField.js";
import {
  getVoterModel,
  findVoterById,
  findOneVoter,
  countAllVoters,
  ALL_AC_IDS,
} from "../utils/voterCollection.js";
import {
  unwrapLegacyFieldValue,
  inferFieldTypeFromValue,
  hasMeaningfulValue,
} from "../utils/helpers.js";
import { getCache, setCache, TTL } from "../utils/cache.js";
import { getPrecomputedStats } from "../utils/precomputedStats.js";

// Critical fields that cannot be renamed or deleted
const CRITICAL_FIELDS = ['_id', 'name', 'voterID', 'voterId', 'createdAt', 'updatedAt'];
const SYSTEM_FIELDS = new Set(['_id', '__v', 'createdAt', 'updatedAt']);

/**
 * Get existing fields from voter documents with caching
 * @param {number} primaryAcId - AC to sample from (default: 111)
 * @returns {Promise<Object>} Field analysis results
 */
export async function getExistingFields(primaryAcId = 111) {
  const cacheKey = 'global:voter:fields:existing';
  const cached = getCache(cacheKey, 30 * 60 * 1000);
  if (cached) return cached;

  const VoterModel = getVoterModel(primaryAcId);
  const totalVoters = await VoterModel.countDocuments({});
  const sampleVoters = await VoterModel.find({}).limit(50).lean();

  if (sampleVoters.length === 0) {
    const response = { fields: {}, totalVoters: 0, samplesAnalyzed: 0 };
    setCache(cacheKey, response, 30 * 60 * 1000);
    return response;
  }

  const fieldAnalysis = analyzeVoterFields(sampleVoters);
  const visibilityMap = await getFieldVisibilityMap();

  // Apply visibility to fields
  Object.keys(fieldAnalysis).forEach(key => {
    if (fieldAnalysis[key].visible === undefined) {
      fieldAnalysis[key].visible = visibilityMap[key] !== undefined ? visibilityMap[key] : true;
    }
  });

  const response = {
    fields: sortFieldsAlphabetically(fieldAnalysis),
    totalVoters,
    samplesAnalyzed: sampleVoters.length
  };

  setCache(cacheKey, response, 30 * 60 * 1000);
  return response;
}

/**
 * Analyze fields from voter documents
 * @param {Array} voters - Array of voter documents
 * @returns {Object} Field analysis
 */
function analyzeVoterFields(voters) {
  const fieldAnalysis = {};

  voters.forEach((voter) => {
    Object.keys(voter).forEach((key) => {
      if (SYSTEM_FIELDS.has(key)) return;

      if (!fieldAnalysis[key]) {
        fieldAnalysis[key] = { type: 'Unknown', samples: [] };
      }

      const { actualValue, legacyVisible } = unwrapLegacyFieldValue(voter[key]);
      if (fieldAnalysis[key].visible === undefined && legacyVisible !== undefined) {
        fieldAnalysis[key].visible = legacyVisible;
      }

      const inferredType = inferTypeFromValue(actualValue);
      if (fieldAnalysis[key].type === 'Unknown' || fieldAnalysis[key].type === 'Null') {
        fieldAnalysis[key].type = inferredType;
      }

      addSampleValue(fieldAnalysis[key], actualValue, inferredType);
    });
  });

  return fieldAnalysis;
}

/**
 * Infer type from value
 */
function inferTypeFromValue(value) {
  if (value === null || value === undefined) return 'Null';
  if (typeof value === 'string') return 'String';
  if (typeof value === 'number') return 'Number';
  if (typeof value === 'boolean') return 'Boolean';
  if (value instanceof Date) return 'Date';
  if (Array.isArray(value)) return 'Array';
  if (typeof value === 'object') return 'Object';
  return 'Unknown';
}

/**
 * Add sample value to field analysis
 */
function addSampleValue(fieldData, actualValue, inferredType) {
  if (fieldData.samples.length >= 3) return;

  let displayValue = actualValue;
  if (actualValue instanceof Date) {
    displayValue = actualValue.toISOString().split('T')[0];
  } else if (typeof actualValue === 'object' && actualValue !== null) {
    displayValue = JSON.stringify(actualValue);
    if (displayValue.length > 50) displayValue = displayValue.substring(0, 50) + '...';
  } else if (typeof actualValue === 'string' && actualValue.length > 50) {
    displayValue = actualValue.substring(0, 50) + '...';
  }

  if (!fieldData.samples.some(s => String(s.value) === String(displayValue))) {
    fieldData.samples.push({ value: displayValue, type: inferredType });
  }
}

/**
 * Sort fields alphabetically
 */
function sortFieldsAlphabetically(fields) {
  const sorted = {};
  Object.keys(fields).sort().forEach(key => { sorted[key] = fields[key]; });
  return sorted;
}

/**
 * Get field visibility map from VoterField collection
 */
async function getFieldVisibilityMap() {
  const fieldMetadata = await VoterField.find({}).lean();
  const map = {};
  fieldMetadata.forEach(field => {
    map[field.name] = field.visible !== undefined ? field.visible : true;
  });
  return map;
}

/**
 * Get all voter fields from schema
 * @returns {Promise<Array>} Array of field definitions
 */
export async function getAllVoterFields() {
  const fields = await VoterField.find().sort({ name: 1 });
  return fields.map(field => ({
    name: field.name,
    type: field.type,
    required: field.required,
    default: field.default,
    label: field.label,
    description: field.description,
    visible: field.visible !== undefined ? field.visible : true,
    isReserved: false,
  }));
}

/**
 * Create a new voter field
 * @param {Object} fieldData - Field data
 * @returns {Promise<Object>} Created field result
 */
export async function createVoterField(fieldData) {
  const { name, type, required, default: defaultValue, label, description, visible } = fieldData;

  if (!name || !type) {
    throw { status: 400, message: "Field name and type are required" };
  }

  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw { status: 400, message: "Field name must start with a letter or underscore and contain only letters, numbers, and underscores" };
  }

  const existingField = await VoterField.findOne({ name });
  if (existingField) {
    throw { status: 400, message: `Field "${name}" already exists` };
  }

  const newField = new VoterField({
    name,
    type,
    required: required || false,
    default: defaultValue,
    label,
    description,
    visible: visible !== undefined ? visible : true,
  });

  await newField.save();

  // Add field to all voter documents
  const normalizedDefault = defaultValue !== undefined && defaultValue !== null && defaultValue !== ''
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

  return {
    message: `Field "${name}" has been successfully added to all ${totalVoters} voters. ${totalUpdated} voters were updated.`,
    field: {
      name: newField.name,
      type: newField.type,
      required: newField.required,
      default: newField.default,
      label: newField.label,
      description: newField.description,
    },
  };
}

/**
 * Rename a voter field across all documents
 * @param {string} oldFieldName - Current field name
 * @param {string} newFieldName - New field name
 * @returns {Promise<Object>} Rename result
 */
export async function renameVoterField(oldFieldName, newFieldName) {
  if (!newFieldName || !newFieldName.trim()) {
    throw { status: 400, message: "New field name is required" };
  }

  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(newFieldName.trim())) {
    throw { status: 400, message: "New field name must start with a letter or underscore and contain only letters, numbers, and underscores" };
  }

  const isCritical = CRITICAL_FIELDS.some(cf => cf.toLowerCase() === oldFieldName.toLowerCase());
  if (isCritical) {
    throw { status: 400, message: `Field "${oldFieldName}" is a critical system field and cannot be renamed` };
  }

  const trimmedNewName = newFieldName.trim();
  const votersWithNewField = await countAllVoters({ [trimmedNewName]: { $exists: true } });
  const votersWithOldField = await countAllVoters({ [oldFieldName]: { $exists: true } });
  const needsMerge = votersWithNewField > 0 && trimmedNewName !== oldFieldName;
  const totalVoters = await countAllVoters({});

  if (votersWithOldField === 0) {
    throw { status: 404, message: `Field "${oldFieldName}" not found in any voter documents. Total voters: ${totalVoters}` };
  }

  // Handle field metadata
  await updateFieldMetadata(oldFieldName, trimmedNewName);

  // Rename in voter documents
  let renamedCount = 0;
  let mergedCount = 0;

  for (const acId of ALL_AC_IDS) {
    const result = await renameFieldInCollection(acId, oldFieldName, trimmedNewName, needsMerge);
    renamedCount += result.renamed;
    mergedCount += result.merged;
  }

  const message = needsMerge
    ? `Field "${oldFieldName}" has been merged into "${trimmedNewName}" in ${renamedCount} voter documents.`
    : `Field "${oldFieldName}" has been successfully renamed to "${trimmedNewName}" in ${renamedCount} voter documents`;

  return {
    message,
    oldFieldName,
    newFieldName: trimmedNewName,
    votersAffected: renamedCount,
    totalVoters,
    votersWithField: votersWithOldField,
    votersWithoutField: totalVoters - votersWithOldField,
    merged: needsMerge,
    mergedCount: needsMerge ? mergedCount : 0,
  };
}

/**
 * Update field metadata during rename
 */
async function updateFieldMetadata(oldName, newName) {
  try {
    const oldFieldMeta = await VoterField.findOne({ name: oldName });
    const newFieldMeta = await VoterField.findOne({ name: newName });

    if (oldFieldMeta) {
      if (newFieldMeta && newName !== oldName) {
        await VoterField.deleteOne({ name: oldName });
      } else if (!newFieldMeta) {
        try {
          oldFieldMeta.name = newName;
          await oldFieldMeta.save();
        } catch {
          await VoterField.deleteOne({ name: oldName });
        }
      }
    }
  } catch (error) {
    console.warn(`Metadata update failed:`, error.message);
  }
}

/**
 * Rename field in a single AC collection
 */
async function renameFieldInCollection(acId, oldFieldName, newFieldName, needsMerge) {
  const VoterModel = getVoterModel(acId);
  const votersWithField = await VoterModel.find({ [oldFieldName]: { $exists: true } }).lean();

  let renamed = 0;
  let merged = 0;
  const batchSize = 100;

  for (let i = 0; i < votersWithField.length; i += batchSize) {
    const batch = votersWithField.slice(i, i + batchSize);
    const bulkOps = batch.map(voter => {
      const { actualValue: oldActual } = unwrapLegacyFieldValue(voter[oldFieldName]);
      const { actualValue: newActual } = unwrapLegacyFieldValue(voter[newFieldName]);

      let finalValue = oldActual ?? null;

      if (needsMerge) {
        const targetHasValue = hasMeaningfulValue(newActual);
        const sourceHasValue = hasMeaningfulValue(oldActual);

        if (!targetHasValue && sourceHasValue) merged++;
        if (targetHasValue) finalValue = newActual;
      }

      return {
        updateOne: {
          filter: { _id: voter._id },
          update: {
            $set: { [newFieldName]: finalValue },
            $unset: { [oldFieldName]: "" }
          }
        }
      };
    });

    if (bulkOps.length > 0) {
      const result = await VoterModel.bulkWrite(bulkOps);
      renamed += result.modifiedCount;
    }
  }

  return { renamed, merged };
}

/**
 * Toggle field visibility
 * @param {string} fieldName - Field name
 * @param {boolean} visible - Visibility state
 * @returns {Promise<Object>} Updated field
 */
export async function toggleFieldVisibility(fieldName, visible) {
  if (typeof visible !== 'boolean') {
    throw { status: 400, message: "Visible parameter must be a boolean value" };
  }

  const criticalFields = ['_id', 'createdAt', 'updatedAt'];
  if (criticalFields.includes(fieldName)) {
    throw { status: 400, message: `Field "${fieldName}" is a critical system field and cannot have visibility toggled` };
  }

  let field = await VoterField.findOne({ name: fieldName });

  if (field) {
    field.visible = visible;
    await field.save();
  } else {
    const sampleVoterResult = await findOneVoter({ [fieldName]: { $exists: true } });
    if (!sampleVoterResult) {
      throw { status: 404, message: `Field "${fieldName}" not found in schema or voter documents` };
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

  return {
    message: `Field "${fieldName}" visibility updated to ${visible ? 'visible' : 'hidden'}`,
    field: {
      name: field.name,
      type: field.type,
      visible: field.visible,
    },
  };
}

/**
 * Update a voter field
 * @param {string} fieldName - Field name
 * @param {Object} updateData - Update data
 * @returns {Promise<Object>} Updated field
 */
export async function updateVoterField(fieldName, updateData) {
  const field = await VoterField.findOne({ name: fieldName });
  if (!field) {
    throw { status: 404, message: `Field "${fieldName}" not found` };
  }

  const { type, required, default: defaultValue, label, description, visible } = updateData;
  if (type !== undefined) field.type = type;
  if (required !== undefined) field.required = required;
  if (defaultValue !== undefined) field.default = defaultValue;
  if (label !== undefined) field.label = label;
  if (description !== undefined) field.description = description;
  if (visible !== undefined) field.visible = visible;

  await field.save();

  // Apply default to documents missing the field
  if (defaultValue !== undefined && defaultValue !== null && defaultValue !== '') {
    for (const acId of ALL_AC_IDS) {
      const VoterModel = getVoterModel(acId);
      await VoterModel.updateMany({ [fieldName]: { $exists: false } }, { $set: { [fieldName]: defaultValue } });
    }
  }

  return {
    message: `Field "${fieldName}" has been successfully updated`,
    field: {
      name: field.name,
      type: field.type,
      required: field.required,
      default: field.default,
      label: field.label,
      description: field.description,
      visible: field.visible !== undefined ? field.visible : true,
    },
  };
}

/**
 * Delete a voter field
 * @param {string} fieldName - Field name
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteVoterField(fieldName) {
  const field = await VoterField.findOne({ name: fieldName });
  if (field) {
    await VoterField.deleteOne({ name: fieldName });
  }

  let totalModified = 0;
  for (const acId of ALL_AC_IDS) {
    const VoterModel = getVoterModel(acId);
    const result = await VoterModel.updateMany({}, { $unset: { [fieldName]: "" } });
    totalModified += result.modifiedCount;
  }

  return {
    message: `Field "${fieldName}" has been successfully deleted from all voters`,
    fieldName,
    votersAffected: totalModified,
    wasInSchema: !!field,
  };
}

/**
 * Get voter by ID
 * @param {string} voterId - Voter ObjectId
 * @returns {Promise<Object>} Voter data
 */
export async function getVoterById(voterId) {
  if (!mongoose.Types.ObjectId.isValid(voterId)) {
    throw { status: 400, message: "Invalid voter ID" };
  }

  const result = await findVoterById(voterId);
  if (!result) {
    throw { status: 404, message: "Voter not found" };
  }

  return result.voter;
}

/**
 * Update voter by ID
 * @param {string} voterId - Voter ObjectId
 * @param {Object} updateData - Update data
 * @returns {Promise<Object>} Updated voter
 */
export async function updateVoter(voterId, updateData) {
  if (!mongoose.Types.ObjectId.isValid(voterId)) {
    throw { status: 400, message: "Invalid voter ID" };
  }

  const currentVoterResult = await findVoterById(voterId);
  if (!currentVoterResult) {
    throw { status: 404, message: "Voter not found" };
  }

  const currentVoter = currentVoterResult.voter;
  const voterAcId = currentVoterResult.acId;

  const processedUpdateData = {};
  Object.entries(updateData).forEach(([key, rawValue]) => {
    if (key === '_id' || key === '__v') return;

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
    throw { status: 404, message: "Voter not found" };
  }

  return { message: "Voter updated successfully", voter };
}

/**
 * Get voters by AC with pagination and filters
 * @param {number} acId - AC ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Paginated voters
 */
export async function getVotersByAC(acId, options = {}) {
  const { booth, search, status, page = 1, limit = 50 } = options;

  const isSimpleQuery = !search && (!status || status === 'all') && (!booth || booth === 'all');
  const cacheKey = isSimpleQuery ? `ac:${acId}:voters:page${page}:limit${limit}` : null;

  if (cacheKey) {
    const cached = getCache(cacheKey, TTL.MEDIUM);
    if (cached) return cached;
  }

  const query = buildVoterQuery({ booth, search, status });
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const VoterModel = getVoterModel(acId);
  const voters = await VoterModel.find(query)
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ boothno: 1, "name.english": 1 })
    .lean();

  const totalVoters = await getVoterCount(acId, query, isSimpleQuery);

  const response = {
    voters: voters.map(formatVoterResponse),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: totalVoters,
      pages: Math.ceil(totalVoters / parseInt(limit)),
    },
  };

  if (cacheKey) {
    setCache(cacheKey, response, TTL.MEDIUM);
  }

  return response;
}

/**
 * Build voter query from filters
 */
function buildVoterQuery({ booth, search, status }) {
  const queryClauses = [];

  if (booth && booth !== "all") {
    queryClauses.push({
      $or: [{ booth_id: booth }, { boothname: booth }]
    });
  }

  if (status && status !== "all") {
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
      queryClauses.push({
        $or: [
          { status: { $regex: /^surveyed$/i } },
          { status: { $regex: /^verified$/i } }
        ]
      });
    } else if (status === "Pending") {
      queryClauses.push({ status: { $regex: /^pending$/i } });
    } else {
      queryClauses.push({ status: { $regex: new RegExp(`^${status}$`, 'i') } });
    }
  }

  if (search) {
    queryClauses.push({
      $or: [
        { "name.english": { $regex: search, $options: "i" } },
        { "name.tamil": { $regex: search, $options: "i" } },
        { voterID: { $regex: search, $options: "i" } },
      ],
    });
  }

  if (queryClauses.length === 0) return {};
  if (queryClauses.length === 1) return queryClauses[0];
  return { $and: queryClauses };
}

/**
 * Get voter count with optimizations
 */
async function getVoterCount(acId, query, isSimpleQuery) {
  if (isSimpleQuery) {
    const precomputed = await getPrecomputedStats(acId, 10 * 60 * 1000);
    if (precomputed && precomputed.totalMembers) {
      return precomputed.totalMembers;
    }

    const countCacheKey = `ac:${acId}:voters:total`;
    let count = getCache(countCacheKey, TTL.MEDIUM);
    if (!count) {
      const VoterModel = getVoterModel(acId);
      count = await VoterModel.countDocuments({});
      setCache(countCacheKey, count, TTL.MEDIUM);
    }
    return count;
  }

  const VoterModel = getVoterModel(acId);
  return await VoterModel.countDocuments(query);
}

/**
 * Format voter for response
 */
function formatVoterResponse(voter) {
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
}

/**
 * Helper function to select the best booth name from multiple options
 * Prefers names with booth number prefix (e.g., "1- Corporation...") over Tamil names
 */
function selectBestBoothName(boothnames, boothNumber) {
  if (!boothnames || boothnames.length === 0) {
    return `Booth ${boothNumber}`;
  }

  // Filter out null/undefined/empty values
  const validNames = boothnames.filter(name => name && name.trim());
  if (validNames.length === 0) {
    return `Booth ${boothNumber}`;
  }

  // Prefer names that already have the booth number prefix (e.g., "1- Corporation...")
  const withNumberPrefix = validNames.find(name => /^\d+[-\s]/.test(name));
  if (withNumberPrefix) {
    return withNumberPrefix;
  }

  // Otherwise, pick the shortest name (usually the English format)
  const shortestName = validNames.reduce((shortest, current) => {
    return current.length < shortest.length ? current : shortest;
  }, validNames[0]);

  return shortestName;
}

/**
 * Get distinct booths for an AC
 * @param {number} acId - AC ID
 * @returns {Promise<Array>} Array of booths
 */
export async function getBoothsByAC(acId) {
  const VoterModel = getVoterModel(acId);

  const boothsAggregation = await VoterModel.aggregate([
    {
      $group: {
        _id: "$booth_id",
        boothno: { $first: "$boothno" },
        // Collect all unique booth names to pick the best one
        boothnames: { $addToSet: "$boothname" },
        voterCount: { $sum: 1 }
      }
    },
    { $sort: { boothno: 1 } }
  ]);

  return boothsAggregation
    .filter((booth) => booth._id != null && booth._id !== "")
    .map((booth) => {
      const boothNumber = booth.boothno || 0;
      // Select the best booth name from available options
      const selectedName = selectBestBoothName(booth.boothnames, boothNumber);
      // Check if name already has booth number prefix - if not, add it
      const hasNumberPrefix = /^\d+[-\s]/.test(selectedName);
      const displayName = hasNumberPrefix ? selectedName : `${boothNumber}- ${selectedName}`;

      return {
        boothId: booth._id,
        booth_id: booth._id,
        boothNo: boothNumber,
        boothName: displayName,
        voterCount: booth.voterCount,
        label: displayName,
        displayName: `${booth._id} - ${displayName}`
      };
    });
}

export default {
  getExistingFields,
  getAllVoterFields,
  createVoterField,
  renameVoterField,
  toggleFieldVisibility,
  updateVoterField,
  deleteVoterField,
  getVoterById,
  updateVoter,
  getVotersByAC,
  getBoothsByAC,
};
