import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  listCourses,
  createCourse,
  getCourse,
  updateCourse,
  deleteCourse,
  submitCourse,
  approveCourse,
  rejectCourse,
  listPendingCourses,
} from '../controllers/courseController.js';

const router = Router();

// Rate limit for workflow-changing operations (submit/approve/reject)
const workflowLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Too many requests, please try again later' },
});

// All course routes require authentication
router.use(authenticate);

// ── Admin-only: review queue ──────────────────────────────────────────────────
// NOTE: this route must come before '/:id' to avoid being matched as an id
router.get('/pending', requireRole('ADMIN'), listPendingCourses);

// ── Shared: list / create ─────────────────────────────────────────────────────
router.get('/', requireRole('INSTRUCTOR', 'ADMIN'), listCourses);
router.post('/', requireRole('INSTRUCTOR'), createCourse);

// ── Shared: individual course operations ─────────────────────────────────────
router.get('/:id', requireRole('INSTRUCTOR', 'ADMIN'), getCourse);
router.put('/:id', requireRole('INSTRUCTOR'), updateCourse);
router.delete('/:id', requireRole('INSTRUCTOR'), deleteCourse);

// ── Workflow transitions ──────────────────────────────────────────────────────
router.post('/:id/submit', requireRole('INSTRUCTOR'), workflowLimiter, submitCourse);
router.post('/:id/approve', requireRole('ADMIN'), workflowLimiter, approveCourse);
router.post('/:id/reject', requireRole('ADMIN'), workflowLimiter, rejectCourse);

export default router;
