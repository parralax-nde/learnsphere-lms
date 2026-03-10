const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  createCourse,
  listCourses,
  getCourse,
  updateCourse,
  deleteCourse,
  submitForReview,
  publishCourse,
  rejectCourse,
  unpublishCourse,
} = require('../controllers/courseController');

const router = Router();

// General API rate limit (100 requests per 15 minutes per IP)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// Apply rate limiting to all course routes
router.use(apiLimiter);

// ─── Public / role-adaptive ───────────────────────────────────────────────────
// GET /api/courses  – role-adaptive listing (see courseController.listCourses)
router.get('/', authenticate, listCourses);

// GET /api/courses/:id
router.get('/:id', authenticate, getCourse);

// ─── Instructor ───────────────────────────────────────────────────────────────
// POST /api/courses  – create a new course (defaults to DRAFT)
router.post('/', authenticate, requireRole('INSTRUCTOR', 'ADMIN'), createCourse);

// PUT /api/courses/:id  – update course content
router.put('/:id', authenticate, requireRole('INSTRUCTOR', 'ADMIN'), updateCourse);

// DELETE /api/courses/:id
router.delete('/:id', authenticate, requireRole('INSTRUCTOR', 'ADMIN'), deleteCourse);

// POST /api/courses/:id/submit  – DRAFT/REJECTED → PENDING_REVIEW
router.post('/:id/submit', authenticate, requireRole('INSTRUCTOR'), submitForReview);

// ─── Admin ────────────────────────────────────────────────────────────────────
// POST /api/courses/:id/publish  – PENDING_REVIEW → PUBLISHED
router.post('/:id/publish', authenticate, requireRole('ADMIN'), publishCourse);

// POST /api/courses/:id/reject   – PENDING_REVIEW → REJECTED
router.post('/:id/reject', authenticate, requireRole('ADMIN'), rejectCourse);

// POST /api/courses/:id/unpublish – PUBLISHED → DRAFT
router.post('/:id/unpublish', authenticate, requireRole('ADMIN'), unpublishCourse);

module.exports = router;
