/**
 * Voter Document Routes
 * Handles viewing, verifying, and deleting voter documents
 * Documents are uploaded by BoothAgents via mobile app
 */

import express from 'express';
import mongoose from 'mongoose';
import { isAuthenticated, hasRole, canAccessAC } from '../middleware/auth.js';
import { findVoterById, getVoterModel } from '../utils/voterCollection.js';
import {
  getPresignedDownloadUrl,
  deleteFile,
  isStorageConfigured,
} from '../config/cloudStorage.js';
import {
  sendSuccess,
  sendBadRequest,
  sendForbidden,
  sendNotFound,
  sendServerError,
} from '../utils/responseHelpers.js';

const router = express.Router();

// Apply authentication to all routes
router.use(isAuthenticated);

// Document type labels for display
const DOCUMENT_TYPE_LABELS = {
  aadhaar: 'Aadhaar Card',
  pan: 'PAN Card',
  voterId: 'Voter ID (EPIC)',
  other: 'Other Document',
};

/**
 * GET /api/voter-documents/:voterId
 * Get all documents for a voter
 */
router.get('/:voterId', hasRole('L0', 'L1', 'L2'), async (req, res) => {
  try {
    const { voterId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(voterId)) {
      return sendBadRequest(res, 'Invalid voter ID');
    }

    // Find voter across all AC collections
    const result = await findVoterById(voterId);
    if (!result) {
      return sendNotFound(res, 'Voter not found');
    }

    const { voter, acId } = result;

    // Check AC access for L1/L2 users
    if (!canAccessAC(req.user, acId)) {
      return sendForbidden(res, 'You do not have access to this AC');
    }

    // Get documents array (may not exist if no documents uploaded)
    const documents = voter.documents || [];

    // Format documents for response
    const formattedDocuments = documents.map((doc) => ({
      documentType: doc.documentType,
      documentLabel: DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType,
      fileName: doc.fileName,
      originalName: doc.originalName,
      publicUrl: doc.publicUrl,
      uploadedAt: doc.uploadedAt,
      uploadedBy: doc.uploadedBy,
      // Verification info
      verified: doc.verified || false,
      verifiedAt: doc.verifiedAt || null,
      verifiedBy: doc.verifiedBy || null,
      verificationNotes: doc.verificationNotes || null,
    }));

    return sendSuccess(res, {
      voterId: voter._id,
      voterID: voter.voterID,
      voterName: voter.name?.english || voter.name?.tamil || 'Unknown',
      acId,
      documents: formattedDocuments,
      totalDocuments: formattedDocuments.length,
      verifiedCount: formattedDocuments.filter((d) => d.verified).length,
    });
  } catch (error) {
    console.error('Error fetching voter documents:', error);
    return sendServerError(res, 'Failed to fetch voter documents', error);
  }
});

/**
 * GET /api/voter-documents/download/:voterId/:documentType
 * Get presigned download URL for a specific document
 */
router.get('/download/:voterId/:documentType', hasRole('L0', 'L1', 'L2'), async (req, res) => {
  try {
    const { voterId, documentType } = req.params;

    if (!mongoose.Types.ObjectId.isValid(voterId)) {
      return sendBadRequest(res, 'Invalid voter ID');
    }

    if (!isStorageConfigured()) {
      return sendServerError(res, 'Cloud storage not configured');
    }

    // Find voter
    const result = await findVoterById(voterId);
    if (!result) {
      return sendNotFound(res, 'Voter not found');
    }

    const { voter, acId } = result;

    // Check AC access
    if (!canAccessAC(req.user, acId)) {
      return sendForbidden(res, 'You do not have access to this AC');
    }

    // Find the specific document
    const documents = voter.documents || [];
    const document = documents.find((d) => d.documentType === documentType);

    if (!document) {
      return sendNotFound(res, `No ${documentType} document found for this voter`);
    }

    // Generate presigned URL
    const downloadUrl = await getPresignedDownloadUrl(document.fileName, 3600);

    return sendSuccess(res, {
      downloadUrl,
      fileName: document.originalName || document.fileName,
      documentType: document.documentType,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error('Error generating download URL:', error);
    return sendServerError(res, 'Failed to generate download URL', error);
  }
});

/**
 * PUT /api/voter-documents/:voterId/:documentType/verify
 * Mark a document as verified
 */
router.put('/:voterId/:documentType/verify', hasRole('L0', 'L1', 'L2'), async (req, res) => {
  try {
    const { voterId, documentType } = req.params;
    const { verified = true, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(voterId)) {
      return sendBadRequest(res, 'Invalid voter ID');
    }

    // Find voter
    const result = await findVoterById(voterId);
    if (!result) {
      return sendNotFound(res, 'Voter not found');
    }

    const { voter, acId } = result;

    // Check AC access
    if (!canAccessAC(req.user, acId)) {
      return sendForbidden(res, 'You do not have access to this AC');
    }

    // Find the document index
    const documents = voter.documents || [];
    const docIndex = documents.findIndex((d) => d.documentType === documentType);

    if (docIndex === -1) {
      return sendNotFound(res, `No ${documentType} document found for this voter`);
    }

    // Update verification status
    const VoterModel = getVoterModel(acId);
    const updatePath = `documents.${docIndex}`;

    const updateData = {
      [`${updatePath}.verified`]: verified,
      [`${updatePath}.verifiedAt`]: verified ? new Date() : null,
      [`${updatePath}.verifiedBy`]: verified ? req.user._id : null,
    };

    if (notes !== undefined) {
      updateData[`${updatePath}.verificationNotes`] = notes;
    }

    await VoterModel.updateOne(
      { _id: voterId },
      { $set: updateData }
    );

    return sendSuccess(res, {
      documentType,
      verified,
      verifiedAt: verified ? new Date() : null,
      verifiedBy: verified ? req.user._id : null,
      verificationNotes: notes || null,
    }, `Document ${verified ? 'verified' : 'unverified'} successfully`);
  } catch (error) {
    console.error('Error verifying document:', error);
    return sendServerError(res, 'Failed to verify document', error);
  }
});

/**
 * DELETE /api/voter-documents/:voterId/:documentType
 * Delete a document from storage and voter record
 */
router.delete('/:voterId/:documentType', hasRole('L0', 'L1', 'L2'), async (req, res) => {
  try {
    const { voterId, documentType } = req.params;

    if (!mongoose.Types.ObjectId.isValid(voterId)) {
      return sendBadRequest(res, 'Invalid voter ID');
    }

    // Find voter
    const result = await findVoterById(voterId);
    if (!result) {
      return sendNotFound(res, 'Voter not found');
    }

    const { voter, acId } = result;

    // Check AC access
    if (!canAccessAC(req.user, acId)) {
      return sendForbidden(res, 'You do not have access to this AC');
    }

    // Find the document to delete
    const documents = voter.documents || [];
    const document = documents.find((d) => d.documentType === documentType);

    if (!document) {
      return sendNotFound(res, `No ${documentType} document found for this voter`);
    }

    // Delete from cloud storage
    if (document.fileName && isStorageConfigured()) {
      try {
        await deleteFile(document.fileName);
        console.log(`[VoterDocuments] Deleted file from storage: ${document.fileName}`);
      } catch (err) {
        console.error(`[VoterDocuments] Error deleting file from storage: ${err.message}`);
        // Continue with database update even if storage delete fails
      }
    }

    // Remove document from voter record
    const VoterModel = getVoterModel(acId);
    await VoterModel.updateOne(
      { _id: voterId },
      { $pull: { documents: { documentType } } }
    );

    return sendSuccess(res, {
      documentType,
      deleted: true,
    }, 'Document deleted successfully');
  } catch (error) {
    console.error('Error deleting document:', error);
    return sendServerError(res, 'Failed to delete document', error);
  }
});

export default router;
