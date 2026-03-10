import { Router } from 'express';
import {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  createSection,
  updateSection,
  deleteSection,
  reorderSections,
  createItem,
  updateItem,
  deleteItem,
  reorderItems,
} from '../controllers/courseController.js';

const router = Router();

// Courses
router.get('/', getCourses);
router.post('/', createCourse);
router.get('/:id', getCourse);
router.patch('/:id', updateCourse);
router.delete('/:id', deleteCourse);

// Sections
router.post('/:courseId/sections', createSection);
router.patch('/:courseId/sections/:sectionId', updateSection);
router.delete('/:courseId/sections/:sectionId', deleteSection);
router.put('/:courseId/sections/reorder', reorderSections);

// Items (lessons / quizzes)
router.post('/:courseId/sections/:sectionId/items', createItem);
router.patch('/:courseId/sections/:sectionId/items/:itemId', updateItem);
router.delete('/:courseId/sections/:sectionId/items/:itemId', deleteItem);
router.put('/:courseId/sections/:sectionId/items/reorder', reorderItems);

export default router;
