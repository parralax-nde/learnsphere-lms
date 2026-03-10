const prisma = require('../models/prismaClient');

const COURSE_STATUS = {
  DRAFT: 'DRAFT',
  PENDING_REVIEW: 'PENDING_REVIEW',
  PUBLISHED: 'PUBLISHED',
  REJECTED: 'REJECTED',
};

// Fields visible to everyone (public summary)
const PUBLIC_FIELDS = {
  id: true,
  title: true,
  description: true,
  category: true,
  thumbnailUrl: true,
  status: true,
  publishedAt: true,
  instructor: { select: { id: true, name: true, email: true } },
};

// Full fields for instructor/admin
const FULL_FIELDS = {
  id: true,
  title: true,
  description: true,
  category: true,
  thumbnailUrl: true,
  status: true,
  rejectionNote: true,
  submittedAt: true,
  publishedAt: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
  instructor: { select: { id: true, name: true, email: true } },
  reviewedBy: { select: { id: true, name: true, email: true } },
};

// ─────────────────────────────────────────────
// CREATE – Instructors only (defaults to DRAFT)
// ─────────────────────────────────────────────
async function createCourse(req, res) {
  const { title, description, category, thumbnailUrl } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'title and description are required' });
  }

  try {
    const course = await prisma.course.create({
      data: {
        title,
        description,
        category: category || '',
        thumbnailUrl: thumbnailUrl || null,
        status: COURSE_STATUS.DRAFT,
        instructorId: req.user.id,
      },
      select: FULL_FIELDS,
    });
    return res.status(201).json(course);
  } catch (err) {
    console.error('createCourse error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─────────────────────────────────────────────
// LIST – behaviour depends on role
//   ADMIN      → all courses, any status
//   INSTRUCTOR → their own courses, any status
//   STUDENT    → only PUBLISHED courses
// ─────────────────────────────────────────────
async function listCourses(req, res) {
  const { role, id: userId } = req.user || {};
  const { status, category } = req.query;

  try {
    let where = {};

    if (role === 'ADMIN') {
      if (status) where.status = status;
      if (category) where.category = category;
    } else if (role === 'INSTRUCTOR') {
      where.instructorId = userId;
      if (status) where.status = status;
      if (category) where.category = category;
    } else {
      // STUDENT or unauthenticated – only published
      where.status = COURSE_STATUS.PUBLISHED;
      if (category) where.category = category;
    }

    const courses = await prisma.course.findMany({
      where,
      select: role === 'STUDENT' || !role ? PUBLIC_FIELDS : FULL_FIELDS,
      orderBy: { updatedAt: 'desc' },
    });

    return res.json(courses);
  } catch (err) {
    console.error('listCourses error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─────────────────────────────────────────────
// GET ONE
// ─────────────────────────────────────────────
async function getCourse(req, res) {
  const { id } = req.params;
  const { role, id: userId } = req.user || {};

  try {
    const course = await prisma.course.findUnique({
      where: { id },
      select: FULL_FIELDS,
    });

    if (!course) return res.status(404).json({ error: 'Course not found' });

    // Access control for non-published courses
    if (course.status !== COURSE_STATUS.PUBLISHED) {
      if (role === 'ADMIN') {
        // admin can see all
      } else if (role === 'INSTRUCTOR' && course.instructor.id === userId) {
        // instructor can see their own
      } else {
        return res.status(404).json({ error: 'Course not found' });
      }
    }

    return res.json(course);
  } catch (err) {
    console.error('getCourse error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─────────────────────────────────────────────
// UPDATE – Instructor (own courses in DRAFT or REJECTED only)
//         Admin (any field, any status)
// ─────────────────────────────────────────────
async function updateCourse(req, res) {
  const { id } = req.params;
  const { role, id: userId } = req.user;
  const { title, description, category, thumbnailUrl } = req.body;

  try {
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    if (role === 'INSTRUCTOR') {
      if (course.instructorId !== userId) {
        return res.status(403).json({ error: 'Not authorised' });
      }
      if (![COURSE_STATUS.DRAFT, COURSE_STATUS.REJECTED].includes(course.status)) {
        return res.status(400).json({
          error: 'Only DRAFT or REJECTED courses can be edited',
        });
      }
    }

    const updated = await prisma.course.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(thumbnailUrl !== undefined && { thumbnailUrl }),
      },
      select: FULL_FIELDS,
    });

    return res.json(updated);
  } catch (err) {
    console.error('updateCourse error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─────────────────────────────────────────────
// DELETE – Instructor (own DRAFT courses) or Admin
// ─────────────────────────────────────────────
async function deleteCourse(req, res) {
  const { id } = req.params;
  const { role, id: userId } = req.user;

  try {
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    if (role === 'INSTRUCTOR') {
      if (course.instructorId !== userId) {
        return res.status(403).json({ error: 'Not authorised' });
      }
      if (course.status !== COURSE_STATUS.DRAFT) {
        return res.status(400).json({ error: 'Only DRAFT courses can be deleted' });
      }
    }

    await prisma.course.delete({ where: { id } });
    return res.json({ message: 'Course deleted' });
  } catch (err) {
    console.error('deleteCourse error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─────────────────────────────────────────────────────────────────────
// STATUS TRANSITION: DRAFT → PENDING_REVIEW  (instructor submits for review)
// ─────────────────────────────────────────────────────────────────────
async function submitForReview(req, res) {
  const { id } = req.params;
  const { id: userId } = req.user;

  try {
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    if (course.instructorId !== userId) {
      return res.status(403).json({ error: 'Not authorised' });
    }

    if (![COURSE_STATUS.DRAFT, COURSE_STATUS.REJECTED].includes(course.status)) {
      return res.status(400).json({
        error: `Cannot submit a ${course.status} course for review`,
      });
    }

    const updated = await prisma.course.update({
      where: { id },
      data: {
        status: COURSE_STATUS.PENDING_REVIEW,
        rejectionNote: null,
        submittedAt: new Date(),
      },
      select: FULL_FIELDS,
    });

    return res.json(updated);
  } catch (err) {
    console.error('submitForReview error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─────────────────────────────────────────────────────────────────────
// STATUS TRANSITION: PENDING_REVIEW → PUBLISHED  (admin approves)
// ─────────────────────────────────────────────────────────────────────
async function publishCourse(req, res) {
  const { id } = req.params;
  const { id: adminId } = req.user;

  try {
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    if (course.status !== COURSE_STATUS.PENDING_REVIEW) {
      return res.status(400).json({
        error: `Cannot publish a course with status ${course.status}`,
      });
    }

    const updated = await prisma.course.update({
      where: { id },
      data: {
        status: COURSE_STATUS.PUBLISHED,
        rejectionNote: null,
        reviewedById: adminId,
        reviewedAt: new Date(),
        publishedAt: new Date(),
      },
      select: FULL_FIELDS,
    });

    return res.json(updated);
  } catch (err) {
    console.error('publishCourse error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─────────────────────────────────────────────────────────────────────
// STATUS TRANSITION: PENDING_REVIEW → REJECTED  (admin rejects)
// ─────────────────────────────────────────────────────────────────────
async function rejectCourse(req, res) {
  const { id } = req.params;
  const { id: adminId } = req.user;
  const { rejectionNote } = req.body;

  try {
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    if (course.status !== COURSE_STATUS.PENDING_REVIEW) {
      return res.status(400).json({
        error: `Cannot reject a course with status ${course.status}`,
      });
    }

    const updated = await prisma.course.update({
      where: { id },
      data: {
        status: COURSE_STATUS.REJECTED,
        rejectionNote: rejectionNote || null,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
      select: FULL_FIELDS,
    });

    return res.json(updated);
  } catch (err) {
    console.error('rejectCourse error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─────────────────────────────────────────────────────────────────────
// STATUS TRANSITION: PUBLISHED → DRAFT  (admin unpublishes)
// ─────────────────────────────────────────────────────────────────────
async function unpublishCourse(req, res) {
  const { id } = req.params;

  try {
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    if (course.status !== COURSE_STATUS.PUBLISHED) {
      return res.status(400).json({
        error: `Cannot unpublish a course with status ${course.status}`,
      });
    }

    const updated = await prisma.course.update({
      where: { id },
      data: { status: COURSE_STATUS.DRAFT, publishedAt: null },
      select: FULL_FIELDS,
    });

    return res.json(updated);
  } catch (err) {
    console.error('unpublishCourse error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  createCourse,
  listCourses,
  getCourse,
  updateCourse,
  deleteCourse,
  submitForReview,
  publishCourse,
  rejectCourse,
  unpublishCourse,
};
