import { Router } from 'express';
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
router.post('/:id/submit', requireRole('INSTRUCTOR'), submitCourse);
router.post('/:id/approve', requireRole('ADMIN'), approveCourse);
router.post('/:id/reject', requireRole('ADMIN'), rejectCourse);

export default router;
