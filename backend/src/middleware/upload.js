const multer = require('multer');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE_BYTES = parseInt(process.env.AVATAR_MAX_SIZE_MB || '5', 10) * 1024 * 1024;

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new multer.MulterError(
        'LIMIT_UNEXPECTED_FILE',
        `Unsupported file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
      ),
      false
    );
  }
}

const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_SIZE_BYTES,
    files: 1,
  },
});

module.exports = { uploadMiddleware, ALLOWED_MIME_TYPES, MAX_SIZE_BYTES };
