import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { upload, handleUploadError } from '../middleware/upload.js';
import {
  uploadAttachment,
  listAttachments,
  getDownloadUrl,
  deleteAttachment,
} from '../controllers/attachmentController.js';

const router = Router();

/** Rate limiter for upload operations: 20 uploads per 15 minutes per IP. */
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many upload requests, please try again later' },
});

/** Rate limiter for read/download operations: 100 requests per minute per IP. */
const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

/** Rate limiter for delete operations: 30 deletes per 15 minutes per IP. */
const deleteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many delete requests, please try again later' },
});

/**
 * Lesson-scoped attachment endpoints
 * POST   /api/lessons/:lessonId/attachments  – upload (INSTRUCTOR, ADMIN)
 * GET    /api/lessons/:lessonId/attachments  – list   (authenticated)
 */
router.post(
  '/lessons/:lessonId/attachments',
  uploadLimiter,
  requireAuth,
  requireRole('INSTRUCTOR', 'ADMIN'),
  upload.single('file'),
  handleUploadError,
  uploadAttachment,
);

router.get(
  '/lessons/:lessonId/attachments',
  readLimiter,
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
  readLimiter,
  requireAuth,
  getDownloadUrl,
);

router.delete(
  '/attachments/:id',
  deleteLimiter,
  requireAuth,
  requireRole('INSTRUCTOR', 'ADMIN'),
  deleteAttachment,
);

export default router;
