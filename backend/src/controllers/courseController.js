import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';

const prisma = new PrismaClient();

// Course status constants
const STATUS = {
  DRAFT: 'DRAFT',
  PENDING_REVIEW: 'PENDING_REVIEW',
  PUBLISHED: 'PUBLISHED',
  REJECTED: 'REJECTED',
};

/**
 * Fields returned to non-instructor/non-admin users (public view).
 */
const PUBLIC_SELECT = {
  id: true,
  title: true,
  description: true,
  category: true,
  thumbnailUrl: true,
  status: true,
  publishedAt: true,
  instructor: { select: { id: true, name: true, email: true } },
};

/**
 * Full fields returned to the owning instructor or admin.
 */
const FULL_SELECT = {
  ...PUBLIC_SELECT,
  rejectionNote: true,
  submittedAt: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
  reviewedBy: { select: { id: true, name: true, email: true } },
};

// ---------------------------------------------------------------------------
// GET /api/courses
// ---------------------------------------------------------------------------

/**
 * List courses with role-based visibility:
 *  - STUDENT / unauthenticated: only PUBLISHED courses
 *  - INSTRUCTOR: their own courses (all statuses)
 *  - ADMIN: all courses (all statuses)
 */
export async function listCourses(req, res) {
  try {
    const user = req.user; // may be undefined for unauthenticated requests

    let where = {};
    let select = PUBLIC_SELECT;

    if (!user || user.role === 'STUDENT') {
      where = { status: STATUS.PUBLISHED };
    } else if (user.role === 'INSTRUCTOR') {
      where = { instructorId: user.sub };
      select = FULL_SELECT;
    } else if (user.role === 'ADMIN') {
      // No filter — see everything
      select = FULL_SELECT;
    }

    const courses = await prisma.course.findMany({ where, select, orderBy: { createdAt: 'desc' } });
    return res.json({ courses });
  } catch (err) {
    console.error('listCourses error:', err);
    return res.status(500).json({ message: 'An unexpected error occurred.' });
  }
}

// ---------------------------------------------------------------------------
// GET /api/courses/:id
// ---------------------------------------------------------------------------

/**
 * Get a single course.
 * - Students / unauthenticated: only if PUBLISHED
 * - Instructor: only if their own course
 * - Admin: any course
 */
export async function getCourse(req, res) {
  const { id } = req.params;
  const user = req.user;

  try {
    const course = await prisma.course.findUnique({ where: { id }, select: FULL_SELECT });

    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    if (!user || user.role === 'STUDENT') {
      if (course.status !== STATUS.PUBLISHED) {
        return res.status(404).json({ message: 'Course not found.' });
      }
      // Return public fields only
      const { rejectionNote, submittedAt, reviewedAt, createdAt, updatedAt, reviewedBy, ...publicCourse } = course;
      return res.json({ course: publicCourse });
    }

    if (user.role === 'INSTRUCTOR' && course.instructor.id !== user.sub) {
      return res.status(403).json({ message: 'You do not have permission to view this course.' });
    }

    return res.json({ course });
  } catch (err) {
    console.error('getCourse error:', err);
    return res.status(500).json({ message: 'An unexpected error occurred.' });
  }
}

// ---------------------------------------------------------------------------
// POST /api/courses
// ---------------------------------------------------------------------------

/**
 * Create a new course (INSTRUCTOR or ADMIN only).
 * New courses start as DRAFT.
 */
export async function createCourse(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      message: 'Validation failed.',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  const { title, description, category = '', thumbnailUrl } = req.body;
  const instructorId = req.user.sub;

  try {
    const course = await prisma.course.create({
      data: { title, description, category, thumbnailUrl: thumbnailUrl || null, instructorId, status: STATUS.DRAFT },
      select: FULL_SELECT,
    });
    return res.status(201).json({ course });
  } catch (err) {
    console.error('createCourse error:', err);
    return res.status(500).json({ message: 'An unexpected error occurred.' });
  }
}

// ---------------------------------------------------------------------------
// PUT /api/courses/:id
// ---------------------------------------------------------------------------

/**
 * Update a course.
 * Only the owning instructor (or admin) can edit, and only if status is DRAFT or REJECTED.
 */
export async function updateCourse(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      message: 'Validation failed.',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  const { id } = req.params;
  const user = req.user;

  try {
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) return res.status(404).json({ message: 'Course not found.' });

    if (user.role === 'INSTRUCTOR' && course.instructorId !== user.sub) {
      return res.status(403).json({ message: 'You do not have permission to edit this course.' });
    }

    if (![STATUS.DRAFT, STATUS.REJECTED].includes(course.status)) {
      return res.status(409).json({ message: `Cannot edit a course with status ${course.status}.` });
    }

    const { title, description, category, thumbnailUrl } = req.body;
    const updated = await prisma.course.update({
      where: { id },
      data: { title, description, category, thumbnailUrl: thumbnailUrl || null },
      select: FULL_SELECT,
    });
    return res.json({ course: updated });
  } catch (err) {
    console.error('updateCourse error:', err);
    return res.status(500).json({ message: 'An unexpected error occurred.' });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/courses/:id
// ---------------------------------------------------------------------------

/**
 * Delete a course (DRAFT only).
 */
export async function deleteCourse(req, res) {
  const { id } = req.params;
  const user = req.user;

  try {
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) return res.status(404).json({ message: 'Course not found.' });

    if (user.role === 'INSTRUCTOR' && course.instructorId !== user.sub) {
      return res.status(403).json({ message: 'You do not have permission to delete this course.' });
    }

    if (course.status !== STATUS.DRAFT) {
      return res.status(409).json({ message: 'Only DRAFT courses can be deleted.' });
    }

    await prisma.course.delete({ where: { id } });
    return res.status(204).send();
  } catch (err) {
    console.error('deleteCourse error:', err);
    return res.status(500).json({ message: 'An unexpected error occurred.' });
  }
}

// ---------------------------------------------------------------------------
// POST /api/courses/:id/submit
// ---------------------------------------------------------------------------

/**
 * Submit a course for admin review (INSTRUCTOR only).
 * Transitions: DRAFT or REJECTED → PENDING_REVIEW
 */
export async function submitForReview(req, res) {
  const { id } = req.params;
  const user = req.user;

  try {
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) return res.status(404).json({ message: 'Course not found.' });

    if (course.instructorId !== user.sub) {
      return res.status(403).json({ message: 'You do not have permission to submit this course.' });
    }

    if (![STATUS.DRAFT, STATUS.REJECTED].includes(course.status)) {
      return res.status(409).json({ message: `Cannot submit a course with status ${course.status}.` });
    }

    const updated = await prisma.course.update({
      where: { id },
      data: { status: STATUS.PENDING_REVIEW, submittedAt: new Date(), rejectionNote: null },
      select: FULL_SELECT,
    });
    return res.json({ course: updated });
  } catch (err) {
    console.error('submitForReview error:', err);
    return res.status(500).json({ message: 'An unexpected error occurred.' });
  }
}

// ---------------------------------------------------------------------------
// POST /api/courses/:id/publish  (ADMIN only)
// ---------------------------------------------------------------------------

/**
 * Publish an approved course, making it visible to students.
 * Transitions: PENDING_REVIEW → PUBLISHED
 */
export async function publishCourse(req, res) {
  const { id } = req.params;
  const adminId = req.user.sub;

  try {
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) return res.status(404).json({ message: 'Course not found.' });

    if (course.status !== STATUS.PENDING_REVIEW) {
      return res.status(409).json({
        message: `Cannot publish a course with status ${course.status}. Course must be in PENDING_REVIEW status.`,
      });
    }

    const now = new Date();
    const updated = await prisma.course.update({
      where: { id },
      data: {
        status: STATUS.PUBLISHED,
        publishedAt: now,
        reviewedAt: now,
        reviewedById: adminId,
        rejectionNote: null,
      },
      select: FULL_SELECT,
    });
    return res.json({ course: updated });
  } catch (err) {
    console.error('publishCourse error:', err);
    return res.status(500).json({ message: 'An unexpected error occurred.' });
  }
}

// ---------------------------------------------------------------------------
// POST /api/courses/:id/reject  (ADMIN only)
// ---------------------------------------------------------------------------

/**
 * Reject a course under review, optionally providing a rejection note.
 * Transitions: PENDING_REVIEW → REJECTED
 */
export async function rejectCourse(req, res) {
  const { id } = req.params;
  const adminId = req.user.sub;
  const { note } = req.body;

  try {
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) return res.status(404).json({ message: 'Course not found.' });

    if (course.status !== STATUS.PENDING_REVIEW) {
      return res.status(409).json({
        message: `Cannot reject a course with status ${course.status}. Course must be in PENDING_REVIEW status.`,
      });
    }

    const now = new Date();
    const updated = await prisma.course.update({
      where: { id },
      data: {
        status: STATUS.REJECTED,
        reviewedAt: now,
        reviewedById: adminId,
        rejectionNote: note || null,
      },
      select: FULL_SELECT,
    });
    return res.json({ course: updated });
  } catch (err) {
    console.error('rejectCourse error:', err);
    return res.status(500).json({ message: 'An unexpected error occurred.' });
  }
}

// ---------------------------------------------------------------------------
// POST /api/courses/:id/unpublish  (ADMIN only)
// ---------------------------------------------------------------------------

/**
 * Unpublish a course, removing it from public view while retaining its content.
 * Transitions: PUBLISHED → DRAFT
 * The course can be re-submitted for review and re-published later.
 */
export async function unpublishCourse(req, res) {
  const { id } = req.params;

  try {
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) return res.status(404).json({ message: 'Course not found.' });

    if (course.status !== STATUS.PUBLISHED) {
      return res.status(409).json({
        message: `Cannot unpublish a course with status ${course.status}. Course must be in PUBLISHED status.`,
      });
    }

    const updated = await prisma.course.update({
      where: { id },
      data: {
        status: STATUS.DRAFT,
        publishedAt: null,
        reviewedAt: null,
        reviewedById: null,
      },
      select: FULL_SELECT,
    });
    return res.json({ course: updated });
  } catch (err) {
    console.error('unpublishCourse error:', err);
    return res.status(500).json({ message: 'An unexpected error occurred.' });
  }
}
