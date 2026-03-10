import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { upload, handleUploadError } from '../middleware/upload.js';
import {
  uploadAttachment,
  listAttachments,
  getDownloadUrl,
  deleteAttachment,
} from '../controllers/attachmentController.js';

const router = Router();

/**
 * Lesson-scoped attachment endpoints
 * POST   /api/lessons/:lessonId/attachments  – upload (INSTRUCTOR, ADMIN)
 * GET    /api/lessons/:lessonId/attachments  – list   (authenticated)
 */
router.post(
  '/lessons/:lessonId/attachments',
  requireAuth,
  requireRole('INSTRUCTOR', 'ADMIN'),
  upload.single('file'),
  handleUploadError,
  uploadAttachment,
);

router.get(
  '/lessons/:lessonId/attachments',
  requireAuth,
  listAttachments,
);

/**
 * Attachment-scoped endpoints
 * GET    /api/attachments/:id/download  – presigned URL (authenticated)
 * DELETE /api/attachments/:id           – remove (INSTRUCTOR, ADMIN)
 */
router.get(
  '/attachments/:id/download',
  requireAuth,
  getDownloadUrl,
);

router.delete(
  '/attachments/:id',
  requireAuth,
  requireRole('INSTRUCTOR', 'ADMIN'),
  deleteAttachment,
);

export default router;
