import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Courses ──────────────────────────────────────────────────────────────────

export async function getCourses(req, res) {
  const courses = await prisma.course.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: { items: { orderBy: { order: 'asc' } } },
      },
    },
  });
  res.json(courses);
}

export async function getCourse(req, res) {
  const course = await prisma.course.findUnique({
    where: { id: req.params.id },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: { items: { orderBy: { order: 'asc' } } },
      },
    },
  });
  if (!course) return res.status(404).json({ error: 'Course not found' });
  res.json(course);
}

export async function createCourse(req, res) {
  const { title, description } = req.body;
  if (!title || !title.trim()) {
    return res.status(422).json({ error: 'Title is required' });
  }
  const course = await prisma.course.create({
    data: { title: title.trim(), description: description?.trim() ?? null },
    include: { sections: true },
  });
  res.status(201).json(course);
}

export async function updateCourse(req, res) {
  const { title, description } = req.body;
  if (title !== undefined && !title.trim()) {
    return res.status(422).json({ error: 'Title cannot be empty' });
  }
  const course = await prisma.course.findUnique({ where: { id: req.params.id } });
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const updated = await prisma.course.update({
    where: { id: req.params.id },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description: description.trim() }),
    },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: { items: { orderBy: { order: 'asc' } } },
      },
    },
  });
  res.json(updated);
}

export async function deleteCourse(req, res) {
  const course = await prisma.course.findUnique({ where: { id: req.params.id } });
  if (!course) return res.status(404).json({ error: 'Course not found' });
  await prisma.course.delete({ where: { id: req.params.id } });
  res.status(204).end();
}

// ─── Sections ─────────────────────────────────────────────────────────────────

export async function createSection(req, res) {
  const { title } = req.body;
  const { courseId } = req.params;
  if (!title || !title.trim()) {
    return res.status(422).json({ error: 'Title is required' });
  }
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const count = await prisma.section.count({ where: { courseId } });
  const section = await prisma.section.create({
    data: { title: title.trim(), courseId, order: count },
    include: { items: true },
  });
  res.status(201).json(section);
}

export async function updateSection(req, res) {
  const { title } = req.body;
  if (title !== undefined && !title.trim()) {
    return res.status(422).json({ error: 'Title cannot be empty' });
  }
  const section = await prisma.section.findUnique({ where: { id: req.params.sectionId } });
  if (!section) return res.status(404).json({ error: 'Section not found' });

  const updated = await prisma.section.update({
    where: { id: req.params.sectionId },
    data: { ...(title !== undefined && { title: title.trim() }) },
    include: { items: { orderBy: { order: 'asc' } } },
  });
  res.json(updated);
}

export async function deleteSection(req, res) {
  const section = await prisma.section.findUnique({ where: { id: req.params.sectionId } });
  if (!section) return res.status(404).json({ error: 'Section not found' });
  await prisma.section.delete({ where: { id: req.params.sectionId } });
  res.status(204).end();
}

export async function reorderSections(req, res) {
  const { courseId } = req.params;
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) {
    return res.status(422).json({ error: 'orderedIds must be an array' });
  }
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return res.status(404).json({ error: 'Course not found' });

  await Promise.all(
    orderedIds.map((id, index) =>
      prisma.section.update({ where: { id }, data: { order: index } })
    )
  );

  const sections = await prisma.section.findMany({
    where: { courseId },
    orderBy: { order: 'asc' },
    include: { items: { orderBy: { order: 'asc' } } },
  });
  res.json(sections);
}

// ─── Items (lessons / quizzes) ────────────────────────────────────────────────

export async function createItem(req, res) {
  const { title, type } = req.body;
  const { courseId, sectionId } = req.params;
  if (!title || !title.trim()) {
    return res.status(422).json({ error: 'Title is required' });
  }
  const validTypes = ['lesson', 'quiz'];
  const itemType = type && validTypes.includes(type) ? type : 'lesson';

  const section = await prisma.section.findFirst({
    where: { id: sectionId, courseId },
  });
  if (!section) return res.status(404).json({ error: 'Section not found' });

  const count = await prisma.item.count({ where: { sectionId } });
  const item = await prisma.item.create({
    data: { title: title.trim(), type: itemType, sectionId, order: count },
  });
  res.status(201).json(item);
}

export async function updateItem(req, res) {
  const { title, type } = req.body;
  const { sectionId, itemId } = req.params;
  if (title !== undefined && !title.trim()) {
    return res.status(422).json({ error: 'Title cannot be empty' });
  }
  const validTypes = ['lesson', 'quiz'];
  if (type !== undefined && !validTypes.includes(type)) {
    return res.status(422).json({ error: 'Type must be lesson or quiz' });
  }

  const item = await prisma.item.findFirst({ where: { id: itemId, sectionId } });
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const updated = await prisma.item.update({
    where: { id: itemId },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(type !== undefined && { type }),
    },
  });
  res.json(updated);
}

export async function deleteItem(req, res) {
  const { sectionId, itemId } = req.params;
  const item = await prisma.item.findFirst({ where: { id: itemId, sectionId } });
  if (!item) return res.status(404).json({ error: 'Item not found' });
  await prisma.item.delete({ where: { id: itemId } });
  res.status(204).end();
}

export async function reorderItems(req, res) {
  const { sectionId } = req.params;
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) {
    return res.status(422).json({ error: 'orderedIds must be an array' });
  }
  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section) return res.status(404).json({ error: 'Section not found' });

  await Promise.all(
    orderedIds.map((id, index) =>
      prisma.item.update({ where: { id }, data: { order: index } })
    )
  );

  const items = await prisma.item.findMany({
    where: { sectionId },
    orderBy: { order: 'asc' },
  });
  res.json(items);
}
