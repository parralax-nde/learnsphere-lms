import request from 'supertest';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import app from '../src/app.js';

const prisma = new PrismaClient();

// Migrate the test database before running tests
beforeAll(() => {
  execSync('npx prisma db push --force-reset', {
    env: { ...process.env, DATABASE_URL: 'file:./tests/test.db' },
    stdio: 'pipe',
  });
});

// Clean up between tests
beforeEach(async () => {
  await prisma.studentAnswer.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.questionOption.deleteMany();
  await prisma.question.deleteMany();
  await prisma.quiz.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createQuiz(overrides = {}) {
  const res = await request(app)
    .post('/api/quizzes')
    .send({ title: 'Test Quiz', description: 'A quiz for tests', ...overrides });
  return res;
}

async function addMCQuestion(quizId, overrides = {}) {
  return request(app)
    .post(`/api/quizzes/${quizId}/questions`)
    .send({
      type: 'MULTIPLE_CHOICE',
      text: 'What is 2 + 2?',
      points: 2,
      options: [{ text: '3' }, { text: '4' }, { text: '5' }],
      correctAnswer: 1, // index → resolved to option id
      ...overrides,
    });
}

async function addTFQuestion(quizId, overrides = {}) {
  return request(app)
    .post(`/api/quizzes/${quizId}/questions`)
    .send({
      type: 'TRUE_FALSE',
      text: 'The sky is blue.',
      points: 1,
      correctAnswer: 'true',
      ...overrides,
    });
}

async function addSAQuestion(quizId, overrides = {}) {
  return request(app)
    .post(`/api/quizzes/${quizId}/questions`)
    .send({
      type: 'SHORT_ANSWER',
      text: 'Explain photosynthesis.',
      points: 5,
      ...overrides,
    });
}

// ---------------------------------------------------------------------------
// Quiz CRUD
// ---------------------------------------------------------------------------

describe('POST /api/quizzes', () => {
  it('creates a quiz and returns 201', async () => {
    const res = await createQuiz();
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Test Quiz');
    expect(res.body.id).toBeDefined();
  });

  it('returns 422 when title is missing', async () => {
    const res = await request(app).post('/api/quizzes').send({});
    expect(res.status).toBe(422);
    expect(res.body.errors.some((e) => e.field === 'title')).toBe(true);
  });
});

describe('GET /api/quizzes', () => {
  it('lists all quizzes', async () => {
    await createQuiz({ title: 'Q1' });
    await createQuiz({ title: 'Q2' });
    const res = await request(app).get('/api/quizzes');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });
});

describe('GET /api/quizzes/:id', () => {
  it('returns quiz with questions and options', async () => {
    const { body: quiz } = await createQuiz();
    await addMCQuestion(quiz.id);

    const res = await request(app).get(`/api/quizzes/${quiz.id}`);
    expect(res.status).toBe(200);
    expect(res.body.questions.length).toBe(1);
    expect(res.body.questions[0].options.length).toBe(3);
  });

  it('returns 404 for unknown quiz', async () => {
    const res = await request(app).get('/api/quizzes/nonexistent');
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/quizzes/:id', () => {
  it('updates the quiz title', async () => {
    const { body: quiz } = await createQuiz();
    const res = await request(app)
      .put(`/api/quizzes/${quiz.id}`)
      .send({ title: 'Updated Title' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated Title');
  });
});

describe('DELETE /api/quizzes/:id', () => {
  it('deletes a quiz and returns 204', async () => {
    const { body: quiz } = await createQuiz();
    const res = await request(app).delete(`/api/quizzes/${quiz.id}`);
    expect(res.status).toBe(204);

    const check = await request(app).get(`/api/quizzes/${quiz.id}`);
    expect(check.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Question management – answer key & scoring rules
// ---------------------------------------------------------------------------

describe('POST /api/quizzes/:id/questions – MULTIPLE_CHOICE', () => {
  it('creates an MC question with options and correctAnswer', async () => {
    const { body: quiz } = await createQuiz();
    const res = await addMCQuestion(quiz.id);

    expect(res.status).toBe(201);
    expect(res.body.type).toBe('MULTIPLE_CHOICE');
    expect(res.body.points).toBe(2);
    expect(res.body.options.length).toBe(3);
    // correctAnswer should be set (to an option id)
    expect(res.body.correctAnswer).toBeTruthy();
    expect(res.body.requiresManualGrading).toBe(false);
  });

  it('updates quiz totalPoints when a question is added', async () => {
    const { body: quiz } = await createQuiz();
    await addMCQuestion(quiz.id); // 2 points

    const updated = await request(app).get(`/api/quizzes/${quiz.id}`);
    expect(updated.body.totalPoints).toBe(2);
  });

  it('returns 422 when fewer than 2 options are given', async () => {
    const { body: quiz } = await createQuiz();
    const res = await request(app)
      .post(`/api/quizzes/${quiz.id}/questions`)
      .send({
        type: 'MULTIPLE_CHOICE',
        text: 'Pick one',
        options: [{ text: 'Only option' }],
        correctAnswer: 0,
      });
    expect(res.status).toBe(422);
  });
});

describe('POST /api/quizzes/:id/questions – TRUE_FALSE', () => {
  it('creates a true/false question', async () => {
    const { body: quiz } = await createQuiz();
    const res = await addTFQuestion(quiz.id);

    expect(res.status).toBe(201);
    expect(res.body.type).toBe('TRUE_FALSE');
    expect(res.body.correctAnswer).toBe('true');
    expect(res.body.requiresManualGrading).toBe(false);
  });

  it('returns 422 for invalid TRUE_FALSE correctAnswer', async () => {
    const { body: quiz } = await createQuiz();
    const res = await addTFQuestion(quiz.id, { correctAnswer: 'maybe' });
    expect(res.status).toBe(422);
  });
});

describe('POST /api/quizzes/:id/questions – SHORT_ANSWER', () => {
  it('creates a short-answer question flagged for manual grading', async () => {
    const { body: quiz } = await createQuiz();
    const res = await addSAQuestion(quiz.id);

    expect(res.status).toBe(201);
    expect(res.body.type).toBe('SHORT_ANSWER');
    expect(res.body.requiresManualGrading).toBe(true);
    expect(res.body.correctAnswer).toBeNull();
  });
});

describe('PUT /api/quizzes/:id/questions/:questionId', () => {
  it('updates question text and points and syncs totalPoints', async () => {
    const { body: quiz } = await createQuiz();
    const { body: q } = await addTFQuestion(quiz.id); // 1 point

    const res = await request(app)
      .put(`/api/quizzes/${quiz.id}/questions/${q.id}`)
      .send({ points: 3 });

    expect(res.status).toBe(200);
    expect(res.body.points).toBe(3);

    const updated = await request(app).get(`/api/quizzes/${quiz.id}`);
    expect(updated.body.totalPoints).toBe(3);
  });
});

describe('DELETE /api/quizzes/:id/questions/:questionId', () => {
  it('removes a question and updates totalPoints', async () => {
    const { body: quiz } = await createQuiz();
    const { body: q } = await addTFQuestion(quiz.id); // 1 point

    const res = await request(app).delete(`/api/quizzes/${quiz.id}/questions/${q.id}`);
    expect(res.status).toBe(204);

    const updated = await request(app).get(`/api/quizzes/${quiz.id}`);
    expect(updated.body.totalPoints).toBe(0);
    expect(updated.body.questions.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Quiz attempts & auto-scoring
// ---------------------------------------------------------------------------

describe('POST /api/quizzes/:id/attempts – auto-scoring', () => {
  it('auto-grades TRUE_FALSE answers correctly', async () => {
    const { body: quiz } = await createQuiz();
    const { body: q } = await addTFQuestion(quiz.id); // correctAnswer: "true", 1pt

    const res = await request(app)
      .post(`/api/quizzes/${quiz.id}/attempts`)
      .send({
        studentId: 'student-1',
        answers: [{ questionId: q.id, answer: 'true' }],
      });

    expect(res.status).toBe(201);
    expect(res.body.isGraded).toBe(true);
    expect(res.body.score).toBe(1);
    expect(res.body.maxScore).toBe(1);
    expect(res.body.answers[0].isCorrect).toBe(true);
    expect(res.body.answers[0].pointsEarned).toBe(1);
  });

  it('awards 0 points for a wrong TRUE_FALSE answer', async () => {
    const { body: quiz } = await createQuiz();
    const { body: q } = await addTFQuestion(quiz.id);

    const res = await request(app)
      .post(`/api/quizzes/${quiz.id}/attempts`)
      .send({
        studentId: 'student-1',
        answers: [{ questionId: q.id, answer: 'false' }],
      });

    expect(res.status).toBe(201);
    expect(res.body.score).toBe(0);
    expect(res.body.answers[0].isCorrect).toBe(false);
    expect(res.body.answers[0].pointsEarned).toBe(0);
  });

  it('auto-grades MULTIPLE_CHOICE by matching option id', async () => {
    const { body: quiz } = await createQuiz();
    const { body: q } = await addMCQuestion(quiz.id); // 2 pts, correctAnswer = option[1].id

    const correctOptionId = q.correctAnswer;
    const res = await request(app)
      .post(`/api/quizzes/${quiz.id}/attempts`)
      .send({
        studentId: 'student-1',
        answers: [{ questionId: q.id, answer: correctOptionId }],
      });

    expect(res.status).toBe(201);
    expect(res.body.score).toBe(2);
    expect(res.body.answers[0].isCorrect).toBe(true);
  });

  it('leaves SHORT_ANSWER answers ungraded (pending manual grading)', async () => {
    const { body: quiz } = await createQuiz();
    const { body: q } = await addSAQuestion(quiz.id);

    const res = await request(app)
      .post(`/api/quizzes/${quiz.id}/attempts`)
      .send({
        studentId: 'student-1',
        answers: [{ questionId: q.id, answer: 'Photosynthesis converts light into sugar.' }],
      });

    expect(res.status).toBe(201);
    expect(res.body.isGraded).toBe(false);
    expect(res.body.score).toBeNull();
    expect(res.body.answers[0].isCorrect).toBeNull();
    expect(res.body.answers[0].pointsEarned).toBeNull();
  });

  it('calculates total score across multiple question types', async () => {
    const { body: quiz } = await createQuiz();
    const { body: tf } = await addTFQuestion(quiz.id);  // 1 pt
    const { body: mc } = await addMCQuestion(quiz.id);  // 2 pts

    const res = await request(app)
      .post(`/api/quizzes/${quiz.id}/attempts`)
      .send({
        studentId: 'student-1',
        answers: [
          { questionId: tf.id, answer: 'true' },           // correct
          { questionId: mc.id, answer: mc.correctAnswer },  // correct
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.score).toBe(3);
    expect(res.body.maxScore).toBe(3);
    expect(res.body.isGraded).toBe(true);
  });

  it('returns 422 when studentId is missing', async () => {
    const { body: quiz } = await createQuiz();
    const res = await request(app)
      .post(`/api/quizzes/${quiz.id}/attempts`)
      .send({ answers: [] });
    expect(res.status).toBe(422);
  });
});

// ---------------------------------------------------------------------------
// Manual grading
// ---------------------------------------------------------------------------

describe('PATCH /api/quizzes/:id/attempts/:attemptId/answers/:answerId/grade', () => {
  it('grades a SHORT_ANSWER and finalises the attempt score', async () => {
    const { body: quiz } = await createQuiz();
    const { body: sa } = await addSAQuestion(quiz.id); // 5 pts

    const { body: attempt } = await request(app)
      .post(`/api/quizzes/${quiz.id}/attempts`)
      .send({
        studentId: 'student-2',
        answers: [{ questionId: sa.id, answer: 'A student answer.' }],
      });

    expect(attempt.isGraded).toBe(false);
    const answerId = attempt.answers[0].id;

    const res = await request(app)
      .patch(`/api/quizzes/${quiz.id}/attempts/${attempt.id}/answers/${answerId}/grade`)
      .send({ pointsEarned: 4, feedback: 'Good explanation, minor gaps.' });

    expect(res.status).toBe(200);
    expect(res.body.isGraded).toBe(true);
    expect(res.body.score).toBe(4);
    expect(res.body.gradedAt).not.toBeNull();

    const graded = res.body.answers.find((a) => a.id === answerId);
    expect(graded.pointsEarned).toBe(4);
    expect(graded.feedback).toBe('Good explanation, minor gaps.');
    expect(graded.isCorrect).toBe(true);
  });

  it('marks isCorrect=false when pointsEarned=0', async () => {
    const { body: quiz } = await createQuiz();
    const { body: sa } = await addSAQuestion(quiz.id);

    const { body: attempt } = await request(app)
      .post(`/api/quizzes/${quiz.id}/attempts`)
      .send({ studentId: 'student-3', answers: [{ questionId: sa.id, answer: 'Wrong' }] });

    const answerId = attempt.answers[0].id;
    const res = await request(app)
      .patch(`/api/quizzes/${quiz.id}/attempts/${attempt.id}/answers/${answerId}/grade`)
      .send({ pointsEarned: 0 });

    expect(res.status).toBe(200);
    expect(res.body.score).toBe(0);
    const graded = res.body.answers.find((a) => a.id === answerId);
    expect(graded.isCorrect).toBe(false);
  });

  it('rejects grading a non-SHORT_ANSWER question', async () => {
    const { body: quiz } = await createQuiz();
    const { body: tf } = await addTFQuestion(quiz.id);

    const { body: attempt } = await request(app)
      .post(`/api/quizzes/${quiz.id}/attempts`)
      .send({ studentId: 'student-4', answers: [{ questionId: tf.id, answer: 'true' }] });

    const answerId = attempt.answers[0].id;
    const res = await request(app)
      .patch(`/api/quizzes/${quiz.id}/attempts/${attempt.id}/answers/${answerId}/grade`)
      .send({ pointsEarned: 1 });

    expect(res.status).toBe(400);
  });

  it('returns 422 when pointsEarned exceeds question max points', async () => {
    const { body: quiz } = await createQuiz();
    const { body: sa } = await addSAQuestion(quiz.id); // 5 pts

    const { body: attempt } = await request(app)
      .post(`/api/quizzes/${quiz.id}/attempts`)
      .send({ studentId: 'student-5', answers: [{ questionId: sa.id, answer: 'x' }] });

    const answerId = attempt.answers[0].id;
    const res = await request(app)
      .patch(`/api/quizzes/${quiz.id}/attempts/${attempt.id}/answers/${answerId}/grade`)
      .send({ pointsEarned: 10 });

    expect(res.status).toBe(422);
  });

  it('keeps score null when multiple short-answer answers exist and only one is graded', async () => {
    const { body: quiz } = await createQuiz();
    const { body: sa1 } = await addSAQuestion(quiz.id); // 5 pts
    const { body: sa2 } = await addSAQuestion(quiz.id, { text: 'Second SA', points: 3 });

    const { body: attempt } = await request(app)
      .post(`/api/quizzes/${quiz.id}/attempts`)
      .send({
        studentId: 'student-6',
        answers: [
          { questionId: sa1.id, answer: 'Answer 1' },
          { questionId: sa2.id, answer: 'Answer 2' },
        ],
      });

    const answerId1 = attempt.answers.find((a) => a.questionId === sa1.id).id;

    // Grade only sa1
    const res = await request(app)
      .patch(`/api/quizzes/${quiz.id}/attempts/${attempt.id}/answers/${answerId1}/grade`)
      .send({ pointsEarned: 5 });

    expect(res.status).toBe(200);
    expect(res.body.isGraded).toBe(false);
    expect(res.body.score).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// GET attempt endpoints
// ---------------------------------------------------------------------------

describe('GET /api/quizzes/:id/attempts/:attemptId', () => {
  it('returns attempt details with answer breakdown', async () => {
    const { body: quiz } = await createQuiz();
    const { body: tf } = await addTFQuestion(quiz.id);

    const { body: attempt } = await request(app)
      .post(`/api/quizzes/${quiz.id}/attempts`)
      .send({ studentId: 'student-7', answers: [{ questionId: tf.id, answer: 'true' }] });

    const res = await request(app).get(`/api/quizzes/${quiz.id}/attempts/${attempt.id}`);
    expect(res.status).toBe(200);
    expect(res.body.score).toBe(1);
    expect(res.body.quiz.title).toBe('Test Quiz');
  });
});

describe('GET /api/quizzes/:id/attempts', () => {
  it('lists all attempts for a quiz', async () => {
    const { body: quiz } = await createQuiz();
    const { body: tf } = await addTFQuestion(quiz.id);

    await request(app)
      .post(`/api/quizzes/${quiz.id}/attempts`)
      .send({ studentId: 'student-a', answers: [{ questionId: tf.id, answer: 'true' }] });
    await request(app)
      .post(`/api/quizzes/${quiz.id}/attempts`)
      .send({ studentId: 'student-b', answers: [{ questionId: tf.id, answer: 'false' }] });

    const res = await request(app).get(`/api/quizzes/${quiz.id}/attempts`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });
});
