const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { uploadMiddleware } = require('../middleware/upload');
const { uploadAvatar, deleteAvatar } = require('../controllers/avatarController');
const multer = require('multer');

// Limit avatar operations to 10 requests per 15 minutes per IP
const avatarRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many avatar requests, please try again later.' },
});

function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      const maxMb = parseInt(process.env.AVATAR_MAX_SIZE_MB || '5', 10);
      return res.status(413).json({ error: `File too large. Maximum size is ${maxMb}MB.` });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(415).json({ error: err.field || 'Unsupported file type' });
    }
    return res.status(400).json({ error: err.message });
  }
  next(err);
}

// POST /api/profile/avatar – upload/replace avatar
router.post(
  '/',
  avatarRateLimiter,
  authenticate,
  (req, res, next) => uploadMiddleware.single('avatar')(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, next);
    next();
  }),
  uploadAvatar
);

// DELETE /api/profile/avatar – remove avatar
router.delete('/', avatarRateLimiter, authenticate, deleteAvatar);

module.exports = router;
