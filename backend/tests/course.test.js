import { execSync } from 'child_process';
import request from 'supertest';
import app from '../src/app.js';

beforeAll(() => {
  execSync('npx prisma db push --force-reset --skip-generate', {
    env: { ...process.env, DATABASE_URL: 'file:./tests/test.db' },
  });
});

describe('GET /api/health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Courses CRUD', () => {
  let courseId;

  it('POST /api/courses - creates a course', async () => {
    const res = await request(app)
      .post('/api/courses')
      .send({ title: 'Intro to JS', description: 'Learn JS' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Intro to JS');
    expect(res.body.id).toBeDefined();
    courseId = res.body.id;
  });

  it('POST /api/courses - requires title', async () => {
    const res = await request(app).post('/api/courses').send({});
    expect(res.status).toBe(422);
  });

  it('GET /api/courses - lists courses', async () => {
    const res = await request(app).get('/api/courses');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('GET /api/courses/:id - gets a course', async () => {
    const res = await request(app).get(`/api/courses/${courseId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(courseId);
  });

  it('GET /api/courses/:id - 404 for unknown course', async () => {
    const res = await request(app).get('/api/courses/doesnotexist');
    expect(res.status).toBe(404);
  });

  it('PATCH /api/courses/:id - updates title', async () => {
    const res = await request(app)
      .patch(`/api/courses/${courseId}`)
      .send({ title: 'Advanced JS' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Advanced JS');
  });

  it('DELETE /api/courses/:id - deletes a course', async () => {
    const res = await request(app).delete(`/api/courses/${courseId}`);
    expect(res.status).toBe(204);
    const check = await request(app).get(`/api/courses/${courseId}`);
    expect(check.status).toBe(404);
  });
});

describe('Sections CRUD', () => {
  let courseId, sectionId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/courses')
      .send({ title: 'Section Test Course' });
    courseId = res.body.id;
  });

  it('POST /api/courses/:courseId/sections - creates a section', async () => {
    const res = await request(app)
      .post(`/api/courses/${courseId}/sections`)
      .send({ title: 'Week 1' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Week 1');
    expect(res.body.order).toBe(0);
    sectionId = res.body.id;
  });

  it('POST /api/courses/:courseId/sections - requires title', async () => {
    const res = await request(app)
      .post(`/api/courses/${courseId}/sections`)
      .send({});
    expect(res.status).toBe(422);
  });

  it('PATCH section - updates title', async () => {
    const res = await request(app)
      .patch(`/api/courses/${courseId}/sections/${sectionId}`)
      .send({ title: 'Week 1 Updated' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Week 1 Updated');
  });

  it('PUT sections/reorder - reorders sections', async () => {
    const s2 = await request(app)
      .post(`/api/courses/${courseId}/sections`)
      .send({ title: 'Week 2' });
    const res = await request(app)
      .put(`/api/courses/${courseId}/sections/reorder`)
      .send({ orderedIds: [s2.body.id, sectionId] });
    expect(res.status).toBe(200);
    expect(res.body[0].id).toBe(s2.body.id);
    expect(res.body[1].id).toBe(sectionId);
  });

  it('DELETE section - deletes section', async () => {
    const res = await request(app)
      .delete(`/api/courses/${courseId}/sections/${sectionId}`);
    expect(res.status).toBe(204);
  });
});

describe('Items CRUD', () => {
  let courseId, sectionId, itemId;

  beforeAll(async () => {
    const c = await request(app)
      .post('/api/courses')
      .send({ title: 'Item Test Course' });
    courseId = c.body.id;
    const s = await request(app)
      .post(`/api/courses/${courseId}/sections`)
      .send({ title: 'Section 1' });
    sectionId = s.body.id;
  });

  it('POST item - creates a lesson', async () => {
    const res = await request(app)
      .post(`/api/courses/${courseId}/sections/${sectionId}/items`)
      .send({ title: 'Lesson 1', type: 'lesson' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Lesson 1');
    expect(res.body.type).toBe('lesson');
    expect(res.body.order).toBe(0);
    itemId = res.body.id;
  });

  it('POST item - creates a quiz', async () => {
    const res = await request(app)
      .post(`/api/courses/${courseId}/sections/${sectionId}/items`)
      .send({ title: 'Quiz 1', type: 'quiz' });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('quiz');
  });

  it('POST item - requires title', async () => {
    const res = await request(app)
      .post(`/api/courses/${courseId}/sections/${sectionId}/items`)
      .send({});
    expect(res.status).toBe(422);
  });

  it('POST item - defaults to lesson type', async () => {
    const res = await request(app)
      .post(`/api/courses/${courseId}/sections/${sectionId}/items`)
      .send({ title: 'No Type Item' });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('lesson');
  });

  it('PATCH item - updates title and type', async () => {
    const res = await request(app)
      .patch(`/api/courses/${courseId}/sections/${sectionId}/items/${itemId}`)
      .send({ title: 'Updated Lesson', type: 'quiz' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated Lesson');
    expect(res.body.type).toBe('quiz');
  });

  it('PATCH item - rejects invalid type', async () => {
    const res = await request(app)
      .patch(`/api/courses/${courseId}/sections/${sectionId}/items/${itemId}`)
      .send({ type: 'video' });
    expect(res.status).toBe(422);
  });

  it('PUT items/reorder - reorders items', async () => {
    const i2 = await request(app)
      .post(`/api/courses/${courseId}/sections/${sectionId}/items`)
      .send({ title: 'Last Item' });
    const res = await request(app)
      .put(`/api/courses/${courseId}/sections/${sectionId}/items/reorder`)
      .send({ orderedIds: [i2.body.id, itemId] });
    expect(res.status).toBe(200);
    expect(res.body[0].id).toBe(i2.body.id);
  });

  it('DELETE item - deletes an item', async () => {
    const res = await request(app)
      .delete(`/api/courses/${courseId}/sections/${sectionId}/items/${itemId}`);
    expect(res.status).toBe(204);
  });
});
