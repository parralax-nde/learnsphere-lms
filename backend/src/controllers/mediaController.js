const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { parseVideoUrl } = require('../utils/mediaUtils');

/**
 * Returns true when all required AWS env vars are present.
 */
function isS3Configured() {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.S3_BUCKET_NAME
  );
}

/**
 * Uploads an image file to AWS S3 and returns the public URL.
 * @param {Express.Multer.File} file
 * @returns {Promise<string>} Public URL
 */
async function uploadToS3(file) {
  // Lazy-load to avoid errors when SDK is not configured.
  const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

  const client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const ext = path.extname(file.originalname).toLowerCase() || '.bin';
  const key = `media/${uuidv4()}${ext}`;

  await client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }),
  );

  return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
}

/**
 * Saves an image file to local disk and returns a URL pointing to it.
 * Used as a fallback when S3 is not configured.
 * @param {Express.Multer.File} file
 * @returns {Promise<string>} URL
 */
async function uploadToLocal(file) {
  const uploadDir = path.resolve(
    __dirname,
    '../../',
    process.env.LOCAL_UPLOAD_DIR || 'uploads',
  );
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const ext = path.extname(file.originalname).toLowerCase() || '.bin';
  const filename = `${uuidv4()}${ext}`;
  const filePath = path.join(uploadDir, filename);
  fs.writeFileSync(filePath, file.buffer);

  const baseUrl = process.env.LOCAL_BASE_URL || 'http://localhost:3001';
  return `${baseUrl}/uploads/${filename}`;
}

/**
 * POST /api/media/upload-image
 * Accepts a multipart/form-data request with a single "image" field.
 * Uploads the image to S3 (or local storage as a fallback) and returns the URL.
 */
async function uploadImage(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided.' });
    }

    let url;
    if (isS3Configured()) {
      url = await uploadToS3(req.file);
    } else {
      url = await uploadToLocal(req.file);
    }

    return res.status(201).json({ url });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/media/parse-video-url
 * Body: { url: string }
 * Returns embed metadata for a YouTube or Vimeo URL.
 */
function parseVideoUrlHandler(req, res) {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'A "url" string is required.' });
  }

  const result = parseVideoUrl(url.trim());
  if (!result) {
    return res.status(422).json({
      error: 'URL is not a recognised YouTube or Vimeo link.',
    });
  }

  return res.json(result);
}

module.exports = { uploadImage, parseVideoUrlHandler, uploadToS3, uploadToLocal, isS3Configured };
