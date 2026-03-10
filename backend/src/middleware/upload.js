import multer from 'multer';

/** Maximum upload size (default 10 MB). */
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760', 10);

/**
 * Allowed MIME types for lesson attachments:
 * – Documents: PDF, Word, Excel, PowerPoint, plain text
 * – Code / data: JS, TS, Python, JSON, CSV, XML, HTML, CSS, Markdown
 * – Archives: ZIP, tar, gzip
 * – Images: JPEG, PNG, GIF, WEBP, SVG
 */
const ALLOWED_MIME_TYPES = new Set([
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  // Code / data
  'application/javascript',
  'text/javascript',
  'application/typescript',
  'text/typescript',
  'text/x-python',
  'application/json',
  'text/csv',
  'application/xml',
  'text/xml',
  'text/html',
  'text/css',
  'text/markdown',
  'text/x-markdown',
  // Archives
  'application/zip',
  'application/x-zip-compressed',
  'application/x-tar',
  'application/gzip',
  'application/x-gzip',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]);

/**
 * multer file filter – rejects files whose MIME type is not in the allow-list.
 */
function fileFilter(_req, file, cb) {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      Object.assign(new Error(`File type "${file.mimetype}" is not allowed`), {
        code: 'INVALID_FILE_TYPE',
        status: 400,
      }),
      false,
    );
  }
}

/**
 * Configured multer instance.
 * Files are kept in memory so they can be streamed directly to S3.
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

/**
 * Express error-handling middleware that converts multer errors into
 * consistent JSON responses.
 */
export function handleUploadError(err, _req, res, next) {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: `File is too large. Maximum allowed size is ${MAX_FILE_SIZE / (1024 * 1024)} MB`,
      });
    }
    if (err.code === 'INVALID_FILE_TYPE') {
      return res.status(400).json({ error: err.message });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected file field' });
    }
  }
  next(err);
}
