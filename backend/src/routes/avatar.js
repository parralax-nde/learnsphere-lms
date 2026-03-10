const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { uploadMiddleware } = require('../middleware/upload');
const { uploadAvatar, deleteAvatar } = require('../controllers/avatarController');
const multer = require('multer');

function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      const maxMb = Math.round(parseInt(process.env.AVATAR_MAX_SIZE_MB || '5', 10));
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
  authenticate,
  (req, res, next) => uploadMiddleware.single('avatar')(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, next);
    next();
  }),
  uploadAvatar
);

// DELETE /api/profile/avatar – remove avatar
router.delete('/', authenticate, deleteAvatar);

module.exports = router;
