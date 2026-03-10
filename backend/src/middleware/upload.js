const multer = require('multer');
const path = require('path');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(Object.assign(new Error(`Unsupported file type: ${file.mimetype}`), { status: 415 }), false);
  }
};

// Memory storage is used so we can stream directly to S3 or save to disk as needed.
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

module.exports = { upload, ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES };
