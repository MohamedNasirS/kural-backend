/**
 * DigitalOcean Spaces Configuration (S3-compatible)
 * Used for voter document storage
 */

import { S3Client, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// S3 client instance (lazy initialized)
let s3Client = null;

/**
 * Get or create S3 client for DigitalOcean Spaces
 * @returns {S3Client|null}
 */
export function getS3Client() {
  if (s3Client) {
    return s3Client;
  }

  if (!process.env.DO_SPACES_KEY || !process.env.DO_SPACES_SECRET) {
    console.warn('[CloudStorage] DigitalOcean Spaces credentials not configured');
    return null;
  }

  s3Client = new S3Client({
    endpoint: `https://${process.env.DO_SPACES_ENDPOINT}`,
    region: process.env.DO_SPACES_REGION || 'blr1',
    credentials: {
      accessKeyId: process.env.DO_SPACES_KEY,
      secretAccessKey: process.env.DO_SPACES_SECRET,
    },
    forcePathStyle: false,
  });

  return s3Client;
}

/**
 * Get bucket name from environment
 * @returns {string}
 */
export function getBucketName() {
  return process.env.DO_SPACES_BUCKET || 'kural-voter-documents';
}

/**
 * Get CDN endpoint from environment
 * @returns {string}
 */
export function getCDNEndpoint() {
  return process.env.DO_SPACES_CDN_ENDPOINT ||
    `${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_REGION}.cdn.digitaloceanspaces.com`;
}

/**
 * Check if cloud storage is configured
 * @returns {boolean}
 */
export function isStorageConfigured() {
  return !!(process.env.DO_SPACES_KEY && process.env.DO_SPACES_SECRET);
}

/**
 * Generate a presigned download URL for a document
 * @param {string} fileName - File path in bucket (e.g., "101/RGJ0726935/aadhaar.pdf")
 * @param {number} expiresIn - URL expiry time in seconds (default: 1 hour)
 * @returns {Promise<string>} Presigned URL
 */
export async function getPresignedDownloadUrl(fileName, expiresIn = 3600) {
  const client = getS3Client();
  if (!client) {
    throw new Error('Cloud storage not configured');
  }

  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: fileName,
  });

  return getSignedUrl(client, command, { expiresIn });
}

/**
 * Delete a file from cloud storage
 * @param {string} fileName - File path in bucket
 * @returns {Promise<boolean>} Success status
 */
export async function deleteFile(fileName) {
  const client = getS3Client();
  if (!client) {
    throw new Error('Cloud storage not configured');
  }

  const command = new DeleteObjectCommand({
    Bucket: getBucketName(),
    Key: fileName,
  });

  await client.send(command);
  return true;
}

export default {
  getS3Client,
  getBucketName,
  getCDNEndpoint,
  isStorageConfigured,
  getPresignedDownloadUrl,
  deleteFile,
};
