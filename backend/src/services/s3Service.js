import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/** S3 client, initialised lazily so tests can inject a mock before importing. */
let _client = null;

function getClient() {
  if (!_client) {
    _client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials:
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }
  return _client;
}

/** Overwrite the internal client – used by tests to inject a mock. */
export function setS3Client(client) {
  _client = client;
}

const BUCKET = () => process.env.S3_BUCKET_NAME || 'learnsphere-attachments';

/**
 * Upload a file buffer to S3.
 * @param {Buffer} buffer  File content
 * @param {string} key     S3 object key (path inside the bucket)
 * @param {string} mimeType  Content-Type for the stored object
 * @returns {Promise<string>} Public-style S3 URL (https://bucket.s3.region.amazonaws.com/key)
 */
export async function uploadFile(buffer, key, mimeType) {
  const command = new PutObjectCommand({
    Bucket: BUCKET(),
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  });
  await getClient().send(command);
  const region = process.env.AWS_REGION || 'us-east-1';
  return `https://${BUCKET()}.s3.${region}.amazonaws.com/${key}`;
}

/**
 * Delete an object from S3.
 * @param {string} key  S3 object key to remove
 */
export async function deleteFile(key) {
  const command = new DeleteObjectCommand({ Bucket: BUCKET(), Key: key });
  await getClient().send(command);
}

/**
 * Generate a pre-signed URL that allows a holder to download the object
 * for the given number of seconds (default: 1 hour).
 * @param {string} key        S3 object key
 * @param {number} expiresIn  TTL in seconds (default 3600)
 * @returns {Promise<string>} Pre-signed download URL
 */
export async function getPresignedDownloadUrl(key, expiresIn = 3600) {
  const command = new GetObjectCommand({ Bucket: BUCKET(), Key: key });
  return getSignedUrl(getClient(), command, { expiresIn });
}
