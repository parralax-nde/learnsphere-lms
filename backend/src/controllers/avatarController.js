const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');
const path = require('path');
const crypto = require('crypto');
const s3Client = require('../config/s3');
const User = require('../models/User');

const S3_BUCKET = process.env.AWS_S3_BUCKET;
const AVATAR_DIMENSIONS = parseInt(process.env.AVATAR_DIMENSIONS || '256', 10);

function generateAvatarKey(userId) {
  const randomHex = crypto.randomBytes(8).toString('hex');
  return `avatars/${userId}/${randomHex}.webp`;
}

function extractKeyFromUrl(url) {
  try {
    const parsed = new URL(url);
    // Remove the leading slash from the pathname
    return parsed.pathname.slice(1);
  } catch {
    return null;
  }
}

async function resizeAndConvertImage(buffer) {
  return sharp(buffer)
    .resize(AVATAR_DIMENSIONS, AVATAR_DIMENSIONS, {
      fit: 'cover',
      position: 'center',
    })
    .webp({ quality: 85 })
    .toBuffer();
}

async function uploadToS3(key, imageBuffer) {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: imageBuffer,
    ContentType: 'image/webp',
    CacheControl: 'max-age=31536000',
  });
  await s3Client.send(command);
  return `https://${S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
}

async function deleteFromS3(url) {
  const key = extractKeyFromUrl(url);
  if (!key || !key.startsWith('avatars/')) {
    return;
  }
  try {
    const command = new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key });
    await s3Client.send(command);
  } catch {
    // Non-critical: log and continue if old avatar deletion fails
  }
}

/**
 * POST /api/profile/avatar
 * Upload or replace the authenticated user's avatar.
 */
async function uploadAvatar(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }

  const user = req.user;

  let processedBuffer;
  try {
    processedBuffer = await resizeAndConvertImage(req.file.buffer);
  } catch (err) {
    return res.status(422).json({ error: 'Failed to process image. Ensure the file is a valid image.' });
  }

  const key = generateAvatarKey(user._id.toString());
  let avatarUrl;
  try {
    avatarUrl = await uploadToS3(key, processedBuffer);
  } catch (err) {
    return res.status(502).json({ error: 'Failed to upload image to storage. Please try again.' });
  }

  // Delete old avatar from S3 if present (best-effort)
  if (user.avatarUrl) {
    await deleteFromS3(user.avatarUrl);
  }

  try {
    user.avatarUrl = avatarUrl;
    await user.save();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update user profile' });
  }

  return res.status(200).json({
    message: 'Avatar updated successfully',
    avatarUrl,
  });
}

/**
 * DELETE /api/profile/avatar
 * Remove the authenticated user's avatar.
 */
async function deleteAvatar(req, res) {
  const user = req.user;

  if (!user.avatarUrl) {
    return res.status(404).json({ error: 'No avatar to delete' });
  }

  await deleteFromS3(user.avatarUrl);

  try {
    user.avatarUrl = null;
    await user.save();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update user profile' });
  }

  return res.status(200).json({ message: 'Avatar removed successfully' });
}

module.exports = { uploadAvatar, deleteAvatar, resizeAndConvertImage, uploadToS3, deleteFromS3 };
