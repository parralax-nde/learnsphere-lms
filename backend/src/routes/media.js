const express = require('express');
const router = express.Router();
const { upload } = require('../middleware/upload');
const { uploadImage, parseVideoUrlHandler } = require('../controllers/mediaController');

/**
 * POST /api/media/upload-image
 * Upload a single image file. Returns { url } on success.
 */
router.post('/upload-image', upload.single('image'), uploadImage);

/**
 * POST /api/media/parse-video-url
 * Body: { url: string }
 * Parse a YouTube or Vimeo URL and return embed metadata.
 */
router.post('/parse-video-url', parseVideoUrlHandler);

module.exports = router;
