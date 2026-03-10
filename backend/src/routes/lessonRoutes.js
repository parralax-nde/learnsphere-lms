import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';
import { courseValidation, lessonValidation } from '../middleware/validation.js';
import {
  listCourses,
  createCourse,
  listLessons,
  getLesson,
  createLesson,
  updateLesson,
  deleteLesson,
} from '../controllers/lessonController.js';

const router = Router();

// All lesson routes require authentication and the INSTRUCTOR role
router.use(authenticate, requireRole('INSTRUCTOR', 'ADMIN'));

/**
 * @route  GET  /api/lessons/courses
 * @desc   List all courses owned by the authenticated instructor
 * @access INSTRUCTOR, ADMIN
 */
router.get('/courses', listCourses);

/**
 * @route  POST /api/lessons/courses
 * @desc   Create a new course
 * @access INSTRUCTOR, ADMIN
 */
router.post('/courses', courseValidation, createCourse);

/**
 * @route  GET  /api/lessons/courses/:courseId/lessons
 * @desc   List all lessons for a given course
 * @access INSTRUCTOR, ADMIN
 */
router.get('/courses/:courseId/lessons', listLessons);

/**
 * @route  GET  /api/lessons/courses/:courseId/lessons/:lessonId
 * @desc   Get a single lesson with full content
 * @access INSTRUCTOR, ADMIN
 */
router.get('/courses/:courseId/lessons/:lessonId', getLesson);

/**
 * @route  POST /api/lessons/courses/:courseId/lessons
 * @desc   Create a new lesson with sanitized rich-text content
 * @access INSTRUCTOR, ADMIN
 */
router.post('/courses/:courseId/lessons', lessonValidation, createLesson);

/**
 * @route  PUT  /api/lessons/courses/:courseId/lessons/:lessonId
 * @desc   Update a lesson's title, content, or order
 * @access INSTRUCTOR, ADMIN
 */
router.put('/courses/:courseId/lessons/:lessonId', lessonValidation, updateLesson);

/**
 * @route  DELETE /api/lessons/courses/:courseId/lessons/:lessonId
 * @desc   Delete a lesson
 * @access INSTRUCTOR, ADMIN
 */
router.delete('/courses/:courseId/lessons/:lessonId', deleteLesson);

export default router;
