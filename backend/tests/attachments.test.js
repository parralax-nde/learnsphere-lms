import { jest, describe, it, expect, beforeAll, afterEach } from '@jest/globals';
import jwt from 'jsonwebtoken';

// ── Mock S3 before any module that depends on it is loaded ──────────────────
jest.unstable_mockModule('../src/services/s3Service.js', () => ({
  uploadFile: jest.fn().mockResolvedValue(
    'https://test-bucket.s3.us-east-1.amazonaws.com/test-key',
  ),
  deleteFile: jest.fn().mockResolvedValue(undefined),
  getPresignedDownloadUrl: jest
    .fn()
    .mockResolvedValue('https://signed-url.example.com/download'),
  setS3Client: jest.fn(),
}));

// Dynamic imports must come AFTER unstable_mockModule calls
const { default: request } = await import('supertest');
const { default: app } = await import('../src/app.js');
const { PrismaClient } = await import('@prisma/client');
const s3Service = await import('../src/services/s3Service.js');

const prisma = new PrismaClient();

// ── Helpers ─────────────────────────────────────────────────────────────────

const TEST_SECRET = process.env.JWT_SECRET || 'test-secret';

function makeToken(role = 'INSTRUCTOR') {
  return jwt.sign({ sub: 'user-1', role }, TEST_SECRET, { expiresIn: '1h' });
}

const INSTRUCTOR_TOKEN = makeToken('INSTRUCTOR');
const STUDENT_TOKEN = makeToken('STUDENT');
const ADMIN_TOKEN = makeToken('ADMIN');

async function createTestLesson() {
  const user = await prisma.user.upsert({
    where: { email: 'instructor@test.com' },
    update: {},
    create: {
      email: 'instructor@test.com',
      passwordHash: 'hashed',
      name: 'Test Instructor',
      role: 'INSTRUCTOR',
    },
  });

  const course = await prisma.course.create({
    data: {
      title: 'Test Course',
      instructorId: user.id,
    },
  });

  const lesson = await prisma.lesson.create({
    data: {
      title: 'Test Lesson',
      courseId: course.id,
    },
  });

  return lesson;
}

// ── Shared test state ────────────────────────────────────────────────────────

let lessonId;
let attachmentId;

beforeAll(async () => {
  const lesson = await createTestLesson();
  lessonId = lesson.id;
});

afterEach(() => {
  jest.clearAllMocks();
});

// ── Health check ─────────────────────────────────────────────────────────────

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

// ── Authentication guard ─────────────────────────────────────────────────────

describe('Auth middleware', () => {
  it('rejects requests without a token (401)', async () => {
    const res = await request(app)
      .post(`/api/lessons/${lessonId}/attachments`)
      .attach('file', Buffer.from('hello'), 'test.txt');
    expect(res.status).toBe(401);
  });

  it('rejects requests with an invalid token (401)', async () => {
    const res = await request(app)
      .post(`/api/lessons/${lessonId}/attachments`)
      .set('Authorization', 'Bearer bad-token')
      .attach('file', Buffer.from('hello'), 'test.txt');
    expect(res.status).toBe(401);
  });

  it('rejects students from uploading (403)', async () => {
    const res = await request(app)
      .post(`/api/lessons/${lessonId}/attachments`)
      .set('Authorization', `Bearer ${STUDENT_TOKEN}`)
      .attach('file', Buffer.from('hello'), { filename: 'test.txt', contentType: 'text/plain' });
    expect(res.status).toBe(403);
  });
});

// ── POST /api/lessons/:lessonId/attachments ──────────────────────────────────

describe('POST /api/lessons/:lessonId/attachments', () => {
  it('uploads a PDF and returns 201 with attachment metadata', async () => {
    const pdfBuffer = Buffer.from('%PDF-1.4 test content');
    s3Service.uploadFile.mockResolvedValueOnce(
      'https://test-bucket.s3.us-east-1.amazonaws.com/lessons/test/file.pdf',
    );

    const res = await request(app)
      .post(`/api/lessons/${lessonId}/attachments`)
      .set('Authorization', `Bearer ${INSTRUCTOR_TOKEN}`)
      .attach('file', pdfBuffer, { filename: 'lecture.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      originalName: 'lecture.pdf',
      mimeType: 'application/pdf',
      lessonId,
    });
    expect(res.body.id).toBeDefined();
    expect(res.body.s3Key).toContain(lessonId);
    expect(s3Service.uploadFile).toHaveBeenCalledTimes(1);

    attachmentId = res.body.id;
  });

  it('uploads a plain-text code file and returns 201', async () => {
    const res = await request(app)
      .post(`/api/lessons/${lessonId}/attachments`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .attach('file', Buffer.from('console.log("hello")'), {
        filename: 'example.js',
        contentType: 'text/javascript',
      });

    expect(res.status).toBe(201);
    expect(res.body.mimeType).toBe('text/javascript');
  });

  it('rejects a file with a disallowed MIME type (400)', async () => {
    const res = await request(app)
      .post(`/api/lessons/${lessonId}/attachments`)
      .set('Authorization', `Bearer ${INSTRUCTOR_TOKEN}`)
      .attach('file', Buffer.from('binary data'), {
        filename: 'malware.exe',
        contentType: 'application/x-msdownload',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not allowed/i);
    expect(s3Service.uploadFile).not.toHaveBeenCalled();
  });

  it('returns 400 when no file is included in the request', async () => {
    const res = await request(app)
      .post(`/api/lessons/${lessonId}/attachments`)
      .set('Authorization', `Bearer ${INSTRUCTOR_TOKEN}`)
      .field('description', 'no file here');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no file/i);
  });

  it('returns 404 when the lesson does not exist', async () => {
    const res = await request(app)
      .post('/api/lessons/nonexistent-lesson-id/attachments')
      .set('Authorization', `Bearer ${INSTRUCTOR_TOKEN}`)
      .attach('file', Buffer.from('hello'), {
        filename: 'test.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/lesson not found/i);
  });

  it('returns 502 when S3 upload fails', async () => {
    s3Service.uploadFile.mockRejectedValueOnce(new Error('S3 unavailable'));

    const res = await request(app)
      .post(`/api/lessons/${lessonId}/attachments`)
      .set('Authorization', `Bearer ${INSTRUCTOR_TOKEN}`)
      .attach('file', Buffer.from('data'), {
        filename: 'test.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/failed to upload/i);
  });

  it('rejects a file exceeding the size limit (413)', async () => {
    // Create a buffer slightly larger than 10 MB
    const bigBuffer = Buffer.alloc(11 * 1024 * 1024, 'x');

    const res = await request(app)
      .post(`/api/lessons/${lessonId}/attachments`)
      .set('Authorization', `Bearer ${INSTRUCTOR_TOKEN}`)
      .attach('file', bigBuffer, { filename: 'big.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(413);
    expect(res.body.error).toMatch(/too large/i);
    expect(s3Service.uploadFile).not.toHaveBeenCalled();
  });
});

// ── GET /api/lessons/:lessonId/attachments ───────────────────────────────────

describe('GET /api/lessons/:lessonId/attachments', () => {
  it('returns the list of attachments for a lesson', async () => {
    const res = await request(app)
      .get(`/api/lessons/${lessonId}/attachments`)
      .set('Authorization', `Bearer ${STUDENT_TOKEN}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // At least the PDF we uploaded in a previous test
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toMatchObject({ lessonId });
  });

  it('returns 404 for a non-existent lesson', async () => {
    const res = await request(app)
      .get('/api/lessons/does-not-exist/attachments')
      .set('Authorization', `Bearer ${STUDENT_TOKEN}`);

    expect(res.status).toBe(404);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get(`/api/lessons/${lessonId}/attachments`);
    expect(res.status).toBe(401);
  });
});

// ── GET /api/attachments/:id/download ───────────────────────────────────────

describe('GET /api/attachments/:id/download', () => {
  it('returns a presigned download URL', async () => {
    s3Service.getPresignedDownloadUrl.mockResolvedValueOnce(
      'https://signed.example.com/download?token=abc',
    );

    const res = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set('Authorization', `Bearer ${STUDENT_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.url).toMatch(/https:\/\/signed\.example\.com/);
    expect(res.body.expiresIn).toBe(3600);
    expect(s3Service.getPresignedDownloadUrl).toHaveBeenCalledTimes(1);
  });

  it('returns 404 for a non-existent attachment', async () => {
    const res = await request(app)
      .get('/api/attachments/does-not-exist/download')
      .set('Authorization', `Bearer ${STUDENT_TOKEN}`);

    expect(res.status).toBe(404);
  });

  it('returns 502 when presigning fails', async () => {
    s3Service.getPresignedDownloadUrl.mockRejectedValueOnce(new Error('S3 error'));

    const res = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set('Authorization', `Bearer ${STUDENT_TOKEN}`);

    expect(res.status).toBe(502);
  });
});

// ── DELETE /api/attachments/:id ──────────────────────────────────────────────

describe('DELETE /api/attachments/:id', () => {
  it('deletes an attachment and returns 204', async () => {
    const res = await request(app)
      .delete(`/api/attachments/${attachmentId}`)
      .set('Authorization', `Bearer ${INSTRUCTOR_TOKEN}`);

    expect(res.status).toBe(204);
    expect(s3Service.deleteFile).toHaveBeenCalledTimes(1);
  });

  it('returns 404 when the attachment is already deleted', async () => {
    const res = await request(app)
      .delete(`/api/attachments/${attachmentId}`)
      .set('Authorization', `Bearer ${INSTRUCTOR_TOKEN}`);

    expect(res.status).toBe(404);
  });

  it('returns 403 when a student tries to delete (403)', async () => {
    // Create a fresh attachment for this test
    s3Service.uploadFile.mockResolvedValueOnce('https://test-bucket.s3.us-east-1.amazonaws.com/x');
    const uploadRes = await request(app)
      .post(`/api/lessons/${lessonId}/attachments`)
      .set('Authorization', `Bearer ${INSTRUCTOR_TOKEN}`)
      .attach('file', Buffer.from('data'), { filename: 'del-test.txt', contentType: 'text/plain' });
    expect(uploadRes.status).toBe(201);

    const newId = uploadRes.body.id;
    const res = await request(app)
      .delete(`/api/attachments/${newId}`)
      .set('Authorization', `Bearer ${STUDENT_TOKEN}`);

    expect(res.status).toBe(403);
  });

  it('returns 502 when S3 deletion fails', async () => {
    s3Service.uploadFile.mockResolvedValueOnce('https://test-bucket.s3.us-east-1.amazonaws.com/x');
    const uploadRes = await request(app)
      .post(`/api/lessons/${lessonId}/attachments`)
      .set('Authorization', `Bearer ${INSTRUCTOR_TOKEN}`)
      .attach('file', Buffer.from('data'), { filename: 'fail-del.txt', contentType: 'text/plain' });
    expect(uploadRes.status).toBe(201);

    s3Service.deleteFile.mockRejectedValueOnce(new Error('S3 gone'));
    const res = await request(app)
      .delete(`/api/attachments/${uploadRes.body.id}`)
      .set('Authorization', `Bearer ${INSTRUCTOR_TOKEN}`);

    expect(res.status).toBe(502);
  });
});
