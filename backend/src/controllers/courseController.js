import { PrismaClient } from '@prisma/client';
import {
  sendCourseSubmittedEmail,
  sendCourseApprovedEmail,
  sendCourseRejectedEmail,
} from '../services/emailService.js';

const prisma = new PrismaClient();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function courseSelect(includeRejectionNote = false) {
  return {
    id: true,
    title: true,
    description: true,
    status: true,
    ...(includeRejectionNote && { rejectionNote: true }),
    submittedAt: true,
    reviewedAt: true,
    createdAt: true,
    updatedAt: true,
    instructor: { select: { id: true, name: true, email: true } },
    sections: { orderBy: { order: 'asc' } },
  };
}

// ─── Instructor Endpoints ─────────────────────────────────────────────────────

/**
 * GET /api/courses
 * Instructors see their own courses. Admins see all courses.
 */
export async function listCourses(req, res) {
  const { role, id: userId } = req.user;

  const where = role === 'ADMIN' ? {} : { instructorId: userId };
  const courses = await prisma.course.findMany({
    where,
    select: courseSelect(true),
    orderBy: { createdAt: 'desc' },
  });
  res.json(courses);
}

/**
 * POST /api/courses
 * Create a new course in DRAFT status (instructors only).
 */
export async function createCourse(req, res) {
  const { title, description, sections = [] } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'title and description are required' });
  }

  const course = await prisma.course.create({
    data: {
      title,
      description,
      instructorId: req.user.id,
      sections: {
        create: sections.map((s, i) => ({
          title: s.title,
          content: s.content,
          order: i,
        })),
      },
    },
    select: courseSelect(true),
  });
  res.status(201).json(course);
}

/**
 * GET /api/courses/:id
 */
export async function getCourse(req, res) {
  const { role, id: userId } = req.user;
  const course = await prisma.course.findUnique({
    where: { id: req.params.id },
    select: courseSelect(true),
  });

  if (!course) return res.status(404).json({ error: 'Course not found' });

  // Instructors can only view their own courses
  if (role === 'INSTRUCTOR' && course.instructor.id !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.json(course);
}

/**
 * PUT /api/courses/:id
 * Update a course (only if DRAFT or REJECTED, instructor only).
 */
export async function updateCourse(req, res) {
  const { title, description, sections } = req.body;
  const { id: userId } = req.user;

  const existing = await prisma.course.findUnique({
    where: { id: req.params.id },
    select: { id: true, status: true, instructorId: true },
  });
  if (!existing) return res.status(404).json({ error: 'Course not found' });
  if (existing.instructorId !== userId) return res.status(403).json({ error: 'Forbidden' });
  if (!['DRAFT', 'REJECTED'].includes(existing.status)) {
    return res.status(400).json({ error: 'Only DRAFT or REJECTED courses can be edited' });
  }

  // Replace sections atomically when provided
  const updateData = {
    ...(title && { title }),
    ...(description && { description }),
    // When a course is re-edited after rejection, clear the rejection note
    ...(existing.status === 'REJECTED' && { rejectionNote: null }),
  };

  if (sections !== undefined) {
    await prisma.courseSection.deleteMany({ where: { courseId: existing.id } });
    updateData.sections = {
      create: sections.map((s, i) => ({
        title: s.title,
        content: s.content,
        order: i,
      })),
    };
  }

  const course = await prisma.course.update({
    where: { id: existing.id },
    data: updateData,
    select: courseSelect(true),
  });
  res.json(course);
}

/**
 * DELETE /api/courses/:id
 * Delete a course (instructor, DRAFT/REJECTED only).
 */
export async function deleteCourse(req, res) {
  const { id: userId } = req.user;

  const existing = await prisma.course.findUnique({
    where: { id: req.params.id },
    select: { id: true, status: true, instructorId: true },
  });
  if (!existing) return res.status(404).json({ error: 'Course not found' });
  if (existing.instructorId !== userId) return res.status(403).json({ error: 'Forbidden' });
  if (!['DRAFT', 'REJECTED'].includes(existing.status)) {
    return res.status(400).json({ error: 'Only DRAFT or REJECTED courses can be deleted' });
  }

  await prisma.course.delete({ where: { id: existing.id } });
  res.status(204).end();
}

// ─── Course Publishing Workflow ───────────────────────────────────────────────

/**
 * POST /api/courses/:id/submit
 * Instructor submits a DRAFT (or REJECTED) course for admin review.
 * Status transitions to PENDING_REVIEW.
 * Sends notification emails to all admins.
 */
export async function submitCourse(req, res) {
  const { id: userId } = req.user;

  const course = await prisma.course.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      title: true,
      status: true,
      instructorId: true,
      sections: true,
      instructor: { select: { name: true, email: true } },
    },
  });
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (course.instructorId !== userId) return res.status(403).json({ error: 'Forbidden' });
  if (!['DRAFT', 'REJECTED'].includes(course.status)) {
    return res.status(400).json({ error: 'Only DRAFT or REJECTED courses can be submitted for review' });
  }
  if (course.sections.length === 0) {
    return res.status(400).json({ error: 'Course must have at least one section before submitting' });
  }

  const updated = await prisma.course.update({
    where: { id: course.id },
    data: { status: 'PENDING_REVIEW', submittedAt: new Date(), rejectionNote: null },
    select: courseSelect(true),
  });

  // Notify all admins asynchronously (don't block the response)
  prisma.user.findMany({ where: { role: 'ADMIN' }, select: { email: true } })
    .then((admins) => {
      if (admins.length === 0) return;
      return sendCourseSubmittedEmail({
        adminEmails: admins.map((a) => a.email),
        courseName: course.title,
        instructorName: course.instructor.name,
        courseId: course.id,
      });
    })
    .catch((err) => console.error('Failed to send submission notification:', err));

  res.json(updated);
}

/**
 * POST /api/courses/:id/approve
 * Admin approves a PENDING_REVIEW course.
 * Status transitions to PUBLISHED.
 */
export async function approveCourse(req, res) {
  const course = await prisma.course.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      title: true,
      status: true,
      instructor: { select: { email: true, name: true } },
    },
  });
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (course.status !== 'PENDING_REVIEW') {
    return res.status(400).json({ error: 'Only PENDING_REVIEW courses can be approved' });
  }

  const updated = await prisma.course.update({
    where: { id: course.id },
    data: { status: 'PUBLISHED', reviewedAt: new Date(), rejectionNote: null },
    select: courseSelect(true),
  });

  // Notify instructor asynchronously
  sendCourseApprovedEmail({
    instructorEmail: course.instructor.email,
    courseName: course.title,
  }).catch((err) => console.error('Failed to send approval notification:', err));

  res.json(updated);
}

/**
 * POST /api/courses/:id/reject
 * Admin rejects a PENDING_REVIEW course with a required note.
 * Status transitions to REJECTED.
 */
export async function rejectCourse(req, res) {
  const { note } = req.body;

  if (!note || !note.trim()) {
    return res.status(400).json({ error: 'A rejection note is required' });
  }

  const course = await prisma.course.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      title: true,
      status: true,
      instructor: { select: { email: true, name: true } },
    },
  });
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (course.status !== 'PENDING_REVIEW') {
    return res.status(400).json({ error: 'Only PENDING_REVIEW courses can be rejected' });
  }

  const updated = await prisma.course.update({
    where: { id: course.id },
    data: { status: 'REJECTED', rejectionNote: note.trim(), reviewedAt: new Date() },
    select: courseSelect(true),
  });

  // Notify instructor asynchronously
  sendCourseRejectedEmail({
    instructorEmail: course.instructor.email,
    courseName: course.title,
    rejectionNote: note.trim(),
  }).catch((err) => console.error('Failed to send rejection notification:', err));

  res.json(updated);
}

/**
 * GET /api/courses/pending
 * Admin: list all PENDING_REVIEW courses.
 */
export async function listPendingCourses(req, res) {
  const courses = await prisma.course.findMany({
    where: { status: 'PENDING_REVIEW' },
    select: courseSelect(),
    orderBy: { submittedAt: 'asc' },
  });
  res.json(courses);
}
