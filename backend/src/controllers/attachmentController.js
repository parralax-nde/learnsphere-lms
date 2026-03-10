import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { uploadFile, deleteFile, getPresignedDownloadUrl } from '../services/s3Service.js';

const prisma = new PrismaClient();

/**
 * POST /api/lessons/:lessonId/attachments
 *
 * Upload a file for a specific lesson. The file is validated by the upload
 * middleware before this handler is reached.
 *
 * Roles: INSTRUCTOR, ADMIN
 */
export async function uploadAttachment(req, res) {
  const { lessonId } = req.params;

  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) {
    return res.status(404).json({ error: 'Lesson not found' });
  }

  const fileExt = req.file.originalname.split('.').pop() ?? '';
  const s3Key = `lessons/${lessonId}/attachments/${uuidv4()}${fileExt ? `.${fileExt}` : ''}`;

  let s3Url;
  try {
    s3Url = await uploadFile(req.file.buffer, s3Key, req.file.mimetype);
  } catch (err) {
    console.error('S3 upload error:', err);
    return res.status(502).json({ error: 'Failed to upload file to storage' });
  }

  const attachment = await prisma.attachment.create({
    data: {
      originalName: req.file.originalname,
      filename: s3Key.split('/').pop(),
      mimeType: req.file.mimetype,
      size: req.file.size,
      s3Key,
      s3Url,
      lessonId,
    },
  });

  return res.status(201).json(attachment);
}

/**
 * GET /api/lessons/:lessonId/attachments
 *
 * Return all attachments linked to a lesson.
 *
 * Roles: any authenticated user
 */
export async function listAttachments(req, res) {
  const { lessonId } = req.params;

  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) {
    return res.status(404).json({ error: 'Lesson not found' });
  }

  const attachments = await prisma.attachment.findMany({
    where: { lessonId },
    orderBy: { uploadedAt: 'asc' },
  });

  return res.json(attachments);
}

/**
 * GET /api/attachments/:id/download
 *
 * Return a short-lived pre-signed S3 download URL for the attachment.
 *
 * Roles: any authenticated user
 */
export async function getDownloadUrl(req, res) {
  const { id } = req.params;

  const attachment = await prisma.attachment.findUnique({ where: { id } });
  if (!attachment) {
    return res.status(404).json({ error: 'Attachment not found' });
  }

  let url;
  try {
    url = await getPresignedDownloadUrl(attachment.s3Key);
  } catch (err) {
    console.error('S3 presign error:', err);
    return res.status(502).json({ error: 'Failed to generate download URL' });
  }

  return res.json({ url, expiresIn: 3600 });
}

/**
 * DELETE /api/attachments/:id
 *
 * Remove an attachment from S3 and the database.
 *
 * Roles: INSTRUCTOR, ADMIN
 */
export async function deleteAttachment(req, res) {
  const { id } = req.params;

  const attachment = await prisma.attachment.findUnique({ where: { id } });
  if (!attachment) {
    return res.status(404).json({ error: 'Attachment not found' });
  }

  try {
    await deleteFile(attachment.s3Key);
  } catch (err) {
    console.error('S3 delete error:', err);
    return res.status(502).json({ error: 'Failed to delete file from storage' });
  }

  await prisma.attachment.delete({ where: { id } });

  return res.status(204).send();
}
