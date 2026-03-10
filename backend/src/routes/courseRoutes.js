import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, requireRole } from '../middleware/authenticate.js';
import { verifyToken } from '../middleware/jwtUtils.js';
import { courseValidation } from '../middleware/validation.js';
import {
  listCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  submitForReview,
  publishCourse,
  rejectCourse,
  unpublishCourse,
} from '../controllers/courseController.js';

const router = Router();

// Rate limit: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});

router.use(limiter);

/**
 * Optional auth middleware — attaches req.user if a valid Bearer token is
 * present, but does NOT reject unauthenticated requests.
 */
function authOptional(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      req.user = verifyToken(authHeader.slice(7));
    } catch {
      // Ignore invalid tokens — treat as unauthenticated
    }
  }
  return next();
}

/**
 * @route  GET /api/courses
 * @desc   List courses (role-adaptive visibility)
 * @access Public (students see published only; instructors see own; admins see all)
 */
router.get('/', authOptional, listCourses);

/**
 * @route  GET /api/courses/:id
 * @desc   Get a single course
 * @access Public (students see published only)
 */
router.get('/:id', authOptional, getCourse);

/**
 * @route  POST /api/courses
 * @desc   Create a new course (starts as DRAFT)
 * @access INSTRUCTOR, ADMIN
 */
router.post('/', authenticate, requireRole('INSTRUCTOR', 'ADMIN'), courseValidation, createCourse);

/**
 * @route  PUT /api/courses/:id
 * @desc   Update a course (DRAFT or REJECTED only)
 * @access INSTRUCTOR (own courses), ADMIN
 */
router.put('/:id', authenticate, requireRole('INSTRUCTOR', 'ADMIN'), courseValidation, updateCourse);

/**
 * @route  DELETE /api/courses/:id
 * @desc   Delete a course (DRAFT only)
 * @access INSTRUCTOR (own courses), ADMIN
 */
router.delete('/:id', authenticate, requireRole('INSTRUCTOR', 'ADMIN'), deleteCourse);

/**
 * @route  POST /api/courses/:id/submit
 * @desc   Submit a course for admin review (DRAFT or REJECTED → PENDING_REVIEW)
 * @access INSTRUCTOR (own courses only)
 */
router.post('/:id/submit', authenticate, requireRole('INSTRUCTOR'), submitForReview);

/**
 * @route  POST /api/courses/:id/publish
 * @desc   Publish an approved course (PENDING_REVIEW → PUBLISHED)
 * @access ADMIN only
 */
router.post('/:id/publish', authenticate, requireRole('ADMIN'), publishCourse);

/**
 * @route  POST /api/courses/:id/reject
 * @desc   Reject a course under review (PENDING_REVIEW → REJECTED)
 * @access ADMIN only
 */
router.post('/:id/reject', authenticate, requireRole('ADMIN'), rejectCourse);

/**
 * @route  POST /api/courses/:id/unpublish
 * @desc   Unpublish a published course, returning it to DRAFT (PUBLISHED → DRAFT)
 * @access ADMIN only
 */
router.post('/:id/unpublish', authenticate, requireRole('ADMIN'), unpublishCourse);

export default router;
