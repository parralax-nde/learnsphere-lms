const express = require('express');
const { PrismaClient } = require('@prisma/client');
const rateLimit = require('express-rate-limit');
const { authenticate, requireInstructor } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Rate limit: instructors can make up to 60 course API calls per 15 minutes
const courseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// All course routes require authentication and instructor role
router.use(courseLimiter, authenticate, requireInstructor);

/**
 * GET /api/instructor/courses
 * List all courses for the authenticated instructor.
 */
router.get('/', async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      where: { instructorId: req.user.id },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(courses.map(normalizeCourse));
  } catch (err) {
    console.error('GET /courses error:', err);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

/**
 * GET /api/instructor/courses/:id
 * Get a single course by ID (must belong to the instructor).
 */
router.get('/:id', async (req, res) => {
  try {
    const course = await prisma.course.findFirst({
      where: { id: req.params.id, instructorId: req.user.id },
    });
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json(normalizeCourse(course));
  } catch (err) {
    console.error('GET /courses/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

/**
 * POST /api/instructor/courses
 * Create a new course (default status: draft).
 */
router.post('/', async (req, res) => {
  const {
    title,
    shortDescription = '',
    fullDescription = '',
    category = '',
    difficulty = 'beginner',
    prerequisites = [],
    coverImageUrl = '',
    status = 'draft',
  } = req.body;

  const validationError = validateCourseFields({ title, category, difficulty });
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    const course = await prisma.course.create({
      data: {
        instructorId: req.user.id,
        title: title.trim(),
        shortDescription: shortDescription.trim(),
        fullDescription: fullDescription.trim(),
        category: category.trim(),
        difficulty,
        prerequisites: JSON.stringify(
          Array.isArray(prerequisites) ? prerequisites : []
        ),
        coverImageUrl: coverImageUrl.trim(),
        status: status === 'published' ? 'published' : 'draft',
      },
    });
    res.status(201).json(normalizeCourse(course));
  } catch (err) {
    console.error('POST /courses error:', err);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

/**
 * PUT /api/instructor/courses/:id
 * Update a course. Passing status="draft" saves a draft without publishing.
 */
router.put('/:id', async (req, res) => {
  const {
    title,
    shortDescription,
    fullDescription,
    category,
    difficulty,
    prerequisites,
    coverImageUrl,
    status,
  } = req.body;

  // Ensure course belongs to this instructor
  const existing = await prisma.course.findFirst({
    where: { id: req.params.id, instructorId: req.user.id },
  });
  if (!existing) return res.status(404).json({ error: 'Course not found' });

  const updates = {};
  if (title !== undefined) {
    if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });
    updates.title = title.trim();
  }
  if (shortDescription !== undefined) updates.shortDescription = shortDescription.trim();
  if (fullDescription !== undefined) updates.fullDescription = fullDescription.trim();
  if (category !== undefined) updates.category = category.trim();
  if (difficulty !== undefined) {
    if (!VALID_DIFFICULTIES.includes(difficulty)) {
      return res.status(400).json({ error: 'Invalid difficulty level' });
    }
    updates.difficulty = difficulty;
  }
  if (prerequisites !== undefined) {
    updates.prerequisites = JSON.stringify(
      Array.isArray(prerequisites) ? prerequisites : []
    );
  }
  if (coverImageUrl !== undefined) updates.coverImageUrl = coverImageUrl.trim();
  if (status !== undefined) {
    updates.status = status === 'published' ? 'published' : 'draft';
  }

  try {
    const course = await prisma.course.update({
      where: { id: req.params.id },
      data: updates,
    });
    res.json(normalizeCourse(course));
  } catch (err) {
    console.error('PUT /courses/:id error:', err);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

/**
 * DELETE /api/instructor/courses/:id
 * Delete a course (must be a draft owned by this instructor).
 */
router.delete('/:id', async (req, res) => {
  const existing = await prisma.course.findFirst({
    where: { id: req.params.id, instructorId: req.user.id },
  });
  if (!existing) return res.status(404).json({ error: 'Course not found' });

  try {
    await prisma.course.delete({ where: { id: req.params.id } });
    res.json({ message: 'Course deleted' });
  } catch (err) {
    console.error('DELETE /courses/:id error:', err);
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

// ─── Helpers ────────────────────────────────────────────────────────────────

const VALID_DIFFICULTIES = ['beginner', 'intermediate', 'advanced', 'all_levels'];

function validateCourseFields({ title, category, difficulty }) {
  if (!title || !title.trim()) return 'Title is required';
  if (title.trim().length < 5) return 'Title must be at least 5 characters';
  if (title.trim().length > 120) return 'Title must be at most 120 characters';
  if (!category || !category.trim()) return 'Category is required';
  if (difficulty && !VALID_DIFFICULTIES.includes(difficulty)) return 'Invalid difficulty level';
  return null;
}

function normalizeCourse(course) {
  return {
    ...course,
    prerequisites: safeParseJSON(course.prerequisites, []),
  };
}

function safeParseJSON(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

module.exports = router;
