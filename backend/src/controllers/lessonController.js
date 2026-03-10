import { PrismaClient } from '@prisma/client';
import sanitizeHtml from 'sanitize-html';
import { validationResult } from 'express-validator';

const prisma = new PrismaClient();

/**
 * Allowed HTML tags and attributes for sanitizing rich text lesson content.
 *
 * Supports:
 *  - Headings (h1–h6), paragraphs, line breaks
 *  - Text formatting: bold, italic, underline, strikethrough
 *  - Ordered and unordered lists
 *  - Code blocks and inline code (pre, code)
 *  - Blockquotes
 *  - Links (http/https only)
 *  - Images (http/https/data URIs for embedded images)
 */
const SANITIZE_OPTIONS = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'strong', 'em', 'u', 's', 'sub', 'sup',
    'ul', 'ol', 'li',
    'blockquote',
    'pre', 'code',
    'a',
    'img',
    'span', 'div',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    code: ['class'],
    pre: ['class'],
    span: ['class', 'style'],
    div: ['class'],
    '*': ['class'],
  },
  allowedSchemes: ['http', 'https', 'data'],
  allowedSchemesByTag: {
    img: ['http', 'https', 'data'],
    a: ['http', 'https', 'mailto'],
  },
  // Force safe attributes on links
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
  },
  // Allow safe CSS properties for styling (e.g. Quill color/alignment spans)
  allowedStyles: {
    span: {
      color: [/^#[0-9a-f]{3,6}$/i, /^rgb\(\d+,\s*\d+,\s*\d+\)$/],
      'background-color': [/^#[0-9a-f]{3,6}$/i, /^rgb\(\d+,\s*\d+,\s*\d+\)$/],
    },
  },
};

/**
 * Sanitizes rich-text HTML content from the editor before storage.
 *
 * @param {string} html - Raw HTML from the rich text editor
 * @returns {string} Sanitized HTML safe for storage and rendering
 */
function sanitizeContent(html) {
  if (!html || typeof html !== 'string') return '';
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

// ---------------------------------------------------------------------------
// Course endpoints (inline — lightweight support for lesson context)
// ---------------------------------------------------------------------------

/**
 * GET /api/lessons/courses
 * Returns all courses belonging to the authenticated instructor.
 */
export async function listCourses(req, res) {
  try {
    const courses = await prisma.course.findMany({
      where: { instructorId: req.user.sub },
      include: { _count: { select: { lessons: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ courses });
  } catch (err) {
    console.error('List courses error:', err);
    return res.status(500).json({ message: 'An unexpected error occurred.' });
  }
}

/**
 * POST /api/lessons/courses
 * Creates a new course for the authenticated instructor.
 */
export async function createCourse(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      message: 'Validation failed.',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  const { title, description } = req.body;

  try {
    const course = await prisma.course.create({
      data: { title, description, instructorId: req.user.sub },
    });
    return res.status(201).json({ course });
  } catch (err) {
    console.error('Create course error:', err);
    return res.status(500).json({ message: 'An unexpected error occurred.' });
  }
}

// ---------------------------------------------------------------------------
// Lesson endpoints
// ---------------------------------------------------------------------------

/**
 * GET /api/lessons/courses/:courseId/lessons
 * Returns all lessons for a given course.
 */
export async function listLessons(req, res) {
  const { courseId } = req.params;

  try {
    // Verify the course belongs to the requesting instructor
    const course = await prisma.course.findFirst({
      where: { id: courseId, instructorId: req.user.sub },
    });
    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    const lessons = await prisma.lesson.findMany({
      where: { courseId },
      select: { id: true, title: true, order: true, createdAt: true, updatedAt: true },
      orderBy: { order: 'asc' },
    });
    return res.json({ lessons });
  } catch (err) {
    console.error('List lessons error:', err);
    return res.status(500).json({ message: 'An unexpected error occurred.' });
  }
}

/**
 * GET /api/lessons/courses/:courseId/lessons/:lessonId
 * Returns a single lesson with its full (sanitized) content.
 */
export async function getLesson(req, res) {
  const { courseId, lessonId } = req.params;

  try {
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        courseId,
        course: { instructorId: req.user.sub },
      },
    });
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found.' });
    }
    return res.json({ lesson });
  } catch (err) {
    console.error('Get lesson error:', err);
    return res.status(500).json({ message: 'An unexpected error occurred.' });
  }
}

/**
 * POST /api/lessons/courses/:courseId/lessons
 * Creates a new lesson with sanitized rich-text content.
 */
export async function createLesson(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      message: 'Validation failed.',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  const { courseId } = req.params;
  const { title, content, order } = req.body;

  try {
    // Verify the course belongs to the requesting instructor
    const course = await prisma.course.findFirst({
      where: { id: courseId, instructorId: req.user.sub },
    });
    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    const sanitizedContent = sanitizeContent(content);

    const lesson = await prisma.lesson.create({
      data: {
        title,
        content: sanitizedContent,
        order: order ?? 0,
        courseId,
      },
    });
    return res.status(201).json({ lesson });
  } catch (err) {
    console.error('Create lesson error:', err);
    return res.status(500).json({ message: 'An unexpected error occurred.' });
  }
}

/**
 * PUT /api/lessons/courses/:courseId/lessons/:lessonId
 * Updates a lesson's title, content (sanitized), and/or order.
 */
export async function updateLesson(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      message: 'Validation failed.',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  const { courseId, lessonId } = req.params;
  const { title, content, order } = req.body;

  try {
    // Verify the lesson belongs to a course owned by the instructor
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        courseId,
        course: { instructorId: req.user.sub },
      },
    });
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found.' });
    }

    const data = {};
    if (title !== undefined) data.title = title;
    if (content !== undefined) data.content = sanitizeContent(content);
    if (order !== undefined) data.order = order;

    const updated = await prisma.lesson.update({
      where: { id: lessonId },
      data,
    });
    return res.json({ lesson: updated });
  } catch (err) {
    console.error('Update lesson error:', err);
    return res.status(500).json({ message: 'An unexpected error occurred.' });
  }
}

/**
 * DELETE /api/lessons/courses/:courseId/lessons/:lessonId
 * Deletes a lesson.
 */
export async function deleteLesson(req, res) {
  const { courseId, lessonId } = req.params;

  try {
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        courseId,
        course: { instructorId: req.user.sub },
      },
    });
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found.' });
    }

    await prisma.lesson.delete({ where: { id: lessonId } });
    return res.status(204).send();
  } catch (err) {
    console.error('Delete lesson error:', err);
    return res.status(500).json({ message: 'An unexpected error occurred.' });
  }
}
