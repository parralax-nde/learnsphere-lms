const request = require('supertest');
const app = require('../src/app');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

beforeEach(async () => {
  // Clean up in dependency order
  await prisma.studentAnswer.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.questionOption.deleteMany();
  await prisma.question.deleteMany();
  await prisma.quiz.deleteMany();
});

afterAll(async () => {
  await prisma.studentAnswer.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.questionOption.deleteMany();
  await prisma.question.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.$disconnect();
});

// Helper
async function createBasicQuiz(overrides = {}) {
  const res = await request(app).post('/api/quizzes').send({
    title: 'Test Quiz',
    description: 'A test quiz',
    ...overrides,
  });
  return res.body;
}

async function addTFQuestion(quizId, correctAnswer = 'true') {
  const res = await request(app)
    .post(`/api/quizzes/${quizId}/questions`)
    .send({ type: 'TRUE_FALSE', text: 'Is the sky blue?', points: 2, correctAnswer });
  return res.body;
}

async function addMCQuestion(quizId) {
  const res = await request(app)
    .post(`/api/quizzes/${quizId}/questions`)
    .send({
      type: 'MULTIPLE_CHOICE',
      text: 'What is 2+2?',
      points: 3,
      options: ['3', '4', '5'],
      correctAnswer: '4',
    });
  return res.body;
}

async function addSAQuestion(quizId) {
  const res = await request(app)
    .post(`/api/quizzes/${quizId}/questions`)
    .send({ type: 'SHORT_ANSWER', text: 'Explain photosynthesis.', points: 5 });
  return res.body;
}

// ─── Quiz CRUD ────────────────────────────────────────────────────────────────

describe('Quiz CRUD', () => {
  test('creates a quiz with default settings', async () => {
    const res = await request(app).post('/api/quizzes').send({ title: 'My Quiz' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('My Quiz');
    expect(res.body.timeLimitMinutes).toBeNull();
    expect(res.body.maxAttempts).toBeNull();
    expect(res.body.showAnswersAfterSubmission).toBe(true);
    expect(res.body.passingScore).toBe(0);
  });

  test('creates a quiz with all settings', async () => {
    const res = await request(app).post('/api/quizzes').send({
      title: 'Settings Quiz',
      timeLimitMinutes: 30,
      maxAttempts: 3,
      showAnswersAfterSubmission: false,
      passingScore: 70,
    });
    expect(res.status).toBe(201);
    expect(res.body.timeLimitMinutes).toBe(30);
    expect(res.body.maxAttempts).toBe(3);
    expect(res.body.showAnswersAfterSubmission).toBe(false);
    expect(res.body.passingScore).toBe(70);
  });

  test('rejects quiz without title', async () => {
    const res = await request(app).post('/api/quizzes').send({ description: 'no title' });
    expect(res.status).toBe(422);
  });

  test('lists quizzes', async () => {
    await createBasicQuiz();
    await createBasicQuiz({ title: 'Second Quiz' });
    const res = await request(app).get('/api/quizzes');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  test('gets quiz by id with questions', async () => {
    const quiz = await createBasicQuiz();
    await addTFQuestion(quiz.id);
    const res = await request(app).get(`/api/quizzes/${quiz.id}`);
    expect(res.status).toBe(200);
    expect(res.body.questions).toHaveLength(1);
  });

  test('returns 404 for missing quiz', async () => {
    const res = await request(app).get('/api/quizzes/nonexistent');
    expect(res.status).toBe(404);
  });

  test('updates quiz settings', async () => {
    const quiz = await createBasicQuiz();
    const res = await request(app).put(`/api/quizzes/${quiz.id}`).send({
      timeLimitMinutes: 45,
      maxAttempts: 2,
      showAnswersAfterSubmission: false,
      passingScore: 80,
    });
    expect(res.status).toBe(200);
    expect(res.body.timeLimitMinutes).toBe(45);
    expect(res.body.maxAttempts).toBe(2);
    expect(res.body.showAnswersAfterSubmission).toBe(false);
    expect(res.body.passingScore).toBe(80);
  });

  test('can clear timeLimitMinutes and maxAttempts by setting null', async () => {
    const quiz = await createBasicQuiz({ timeLimitMinutes: 30, maxAttempts: 3 });
    const res = await request(app).put(`/api/quizzes/${quiz.id}`).send({
      timeLimitMinutes: null,
      maxAttempts: null,
    });
    expect(res.status).toBe(200);
    expect(res.body.timeLimitMinutes).toBeNull();
    expect(res.body.maxAttempts).toBeNull();
  });

  test('deletes a quiz', async () => {
    const quiz = await createBasicQuiz();
    const del = await request(app).delete(`/api/quizzes/${quiz.id}`);
    expect(del.status).toBe(204);
    const get = await request(app).get(`/api/quizzes/${quiz.id}`);
    expect(get.status).toBe(404);
  });
});

// ─── Questions ────────────────────────────────────────────────────────────────

describe('Questions', () => {
  let quiz;
  beforeEach(async () => { quiz = await createBasicQuiz(); });

  test('adds TRUE_FALSE question', async () => {
    const q = await addTFQuestion(quiz.id);
    expect(q.type).toBe('TRUE_FALSE');
    expect(q.correctAnswer).toBe('true');
    expect(q.requiresManualGrading).toBe(false);
  });

  test('adds MULTIPLE_CHOICE question', async () => {
    const q = await addMCQuestion(quiz.id);
    expect(q.type).toBe('MULTIPLE_CHOICE');
    expect(q.options).toHaveLength(3);
  });

  test('adds SHORT_ANSWER question', async () => {
    const q = await addSAQuestion(quiz.id);
    expect(q.type).toBe('SHORT_ANSWER');
    expect(q.requiresManualGrading).toBe(true);
    expect(q.correctAnswer).toBeNull();
  });

  test('syncs quiz totalPoints', async () => {
    await addTFQuestion(quiz.id); // 2 pts
    await addMCQuestion(quiz.id); // 3 pts
    const res = await request(app).get(`/api/quizzes/${quiz.id}`);
    expect(res.body.totalPoints).toBe(5);
  });

  test('rejects MC with fewer than 2 options', async () => {
    const res = await request(app)
      .post(`/api/quizzes/${quiz.id}/questions`)
      .send({ type: 'MULTIPLE_CHOICE', text: 'Q?', options: ['Only one'] });
    expect(res.status).toBe(422);
  });

  test('rejects TRUE_FALSE with invalid correctAnswer', async () => {
    const res = await request(app)
      .post(`/api/quizzes/${quiz.id}/questions`)
      .send({ type: 'TRUE_FALSE', text: 'Q?', correctAnswer: 'maybe' });
    expect(res.status).toBe(422);
  });
});

// ─── Quiz Settings Enforcement ────────────────────────────────────────────────

describe('Quiz Settings - Max Attempts', () => {
  test('enforces maxAttempts limit', async () => {
    const quiz = await createBasicQuiz({ maxAttempts: 2 });
    const q = await addTFQuestion(quiz.id);

    // First attempt - OK
    const r1 = await request(app)
      .post(`/api/quizzes/${quiz.id}/attempts`)
      .send({ studentId: 'student1', answers: [{ questionId: q.id, answer: 'true' }] });
    expect(r1.status).toBe(201);

    // Second attempt - OK
    const r2 = await request(app)
      .post(`/api/quizzes/${quiz.id}/attempts`)
      .send({ studentId: 'student1', answers: [{ questionId: q.id, answer: 'true' }] });
    expect(r2.status).toBe(201);

    // Third attempt - blocked
    const r3 = await request(app)
      .post(`/api/quizzes/${quiz.id}/attempts`)
      .send({ studentId: 'student1', answers: [{ questionId: q.id, answer: 'true' }] });
    expect(r3.status).toBe(403);
    expect(r3.body.error).toContain('Maximum attempts');
  });

  test('maxAttempts is per-student (other students not affected)', async () => {
    const quiz = await createBasicQuiz({ maxAttempts: 1 });
    const q = await addTFQuestion(quiz.id);

    // student1 uses their attempt
    await request(app)
      .post(`/api/quizzes/${quiz.id}/attempts`)
      .send({ studentId: 'student1', answers: [{ questionId: q.id, answer: 'true' }] });

    // student2 can still attempt
    const r = await request(app)
      .post(`/api/quizzes/${quiz.id}/attempts`)
      .send({ studentId: 'student2', answers: [{ questionId: q.id, answer: 'true' }] });
    expect(r.status).toBe(201);
  });

  test('unlimited attempts when maxAttempts is null', async () => {
    const quiz = await createBasicQuiz(); // maxAttempts = null
    const q = await addTFQuestion(quiz.id);

    for (let i = 0; i < 5; i++) {
      const r = await request(app)
        .post(`/api/quizzes/${quiz.id}/attempts`)
        .send({ studentId: 'student1', answers: [{ questionId: q.id, answer: 'true' }] });
      expect(r.status).toBe(201);
    }
  });
});

describe('Quiz Settings - Passing Score', () => {
  test('marks attempt as passed when score >= passingScore', async () => {
    const quiz = await createBasicQuiz({ passingScore: 50 });
    const q = await addTFQuestion(quiz.id, 'true'); // 2 pts

    const r = await request(app)
      .post(`/api/quizzes/${quiz.id}/attempts`)
      .send({ studentId: 'student1', answers: [{ questionId: q.id, answer: 'true' }] });
    expect(r.status).toBe(201);
    expect(r.body.score).toBe(2);
    expect(r.body.isPassed).toBe(true); // 100% >= 50%
  });

  test('marks attempt as failed when score < passingScore', async () => {
    const quiz = await createBasicQuiz({ passingScore: 80 });
    const q = await addTFQuestion(quiz.id, 'true'); // 2 pts

    const r = await request(app)
      .post(`/api/quizzes/${quiz.id}/attempts`)
      .send({ studentId: 'student1', answers: [{ questionId: q.id, answer: 'false' }] }); // wrong
    expect(r.status).toBe(201);
    expect(r.body.score).toBe(0);
    expect(r.body.isPassed).toBe(false); // 0% < 80%
  });

  test('isPassed is null when quiz has ungraded short answer', async () => {
    const quiz = await createBasicQuiz({ passingScore: 50 });
    const q = await addSAQuestion(quiz.id);

    const r = await request(app)
      .post(`/api/quizzes/${quiz.id}/attempts`)
      .send({ studentId: 'student1', answers: [{ questionId: q.id, answer: 'photosynthesis is...' }] });
    expect(r.status).toBe(201);
    expect(r.body.isPassed).toBeNull();
  });

  test('isPassed is set after manual grading', async () => {
    const quiz = await createBasicQuiz({ passingScore: 60 });
    const q = await addSAQuestion(quiz.id); // 5 pts

    const attempt = await request(app)
      .post(`/api/quizzes/${quiz.id}/attempts`)
      .send({ studentId: 'student1', answers: [{ questionId: q.id, answer: 'some answer' }] });

    const answerId = attempt.body.answers[0].id;
    const graded = await request(app)
      .patch(`/api/quizzes/${quiz.id}/attempts/${attempt.body.id}/answers/${answerId}/grade`)
      .send({ pointsEarned: 4, feedback: 'Good effort' }); // 4/5 = 80% >= 60%

    expect(graded.status).toBe(200);
    expect(graded.body.isPassed).toBe(true);
  });
});

describe('Quiz Settings - Show Answers After Submission', () => {
  test('shows answer correctness when showAnswersAfterSubmission is true', async () => {
    const quiz = await createBasicQuiz({ showAnswersAfterSubmission: true });
    const q = await addTFQuestion(quiz.id, 'true');

    const r = await request(app)
      .post(`/api/quizzes/${quiz.id}/attempts`)
      .send({ studentId: 'student1', answers: [{ questionId: q.id, answer: 'true' }] });

    expect(r.status).toBe(201);
    expect(r.body.answers[0].isCorrect).toBe(true);
    expect(r.body.answers[0].pointsEarned).toBe(2);
  });

  test('hides answer correctness when showAnswersAfterSubmission is false', async () => {
    const quiz = await createBasicQuiz({ showAnswersAfterSubmission: false });
    const q = await addTFQuestion(quiz.id, 'true');

    const r = await request(app)
      .post(`/api/quizzes/${quiz.id}/attempts`)
      .send({ studentId: 'student1', answers: [{ questionId: q.id, answer: 'true' }] });

    expect(r.status).toBe(201);
    expect(r.body.answers[0].isCorrect).toBeUndefined();
    expect(r.body.answers[0].pointsEarned).toBeUndefined();
  });

  test('getAttempt also respects showAnswersAfterSubmission', async () => {
    const quiz = await createBasicQuiz({ showAnswersAfterSubmission: false });
    const q = await addTFQuestion(quiz.id, 'true');

    const submit = await request(app)
      .post(`/api/quizzes/${quiz.id}/attempts`)
      .send({ studentId: 'student1', answers: [{ questionId: q.id, answer: 'true' }] });

    const get = await request(app).get(
      `/api/quizzes/${quiz.id}/attempts/${submit.body.id}`
    );
    expect(get.status).toBe(200);
    expect(get.body.answers[0].isCorrect).toBeUndefined();
  });
});

describe('Auto-grading', () => {
  let quiz;
  beforeEach(async () => { quiz = await createBasicQuiz(); });

  test('correctly grades TRUE_FALSE', async () => {
    const q = await addTFQuestion(quiz.id, 'true');
    const r = await request(app)
      .post(`/api/quizzes/${quiz.id}/attempts`)
      .send({ studentId: 's1', answers: [{ questionId: q.id, answer: 'true' }] });
    expect(r.body.answers[0].isCorrect).toBe(true);
    expect(r.body.answers[0].pointsEarned).toBe(2);
  });

  test('awards 0 points for wrong answer', async () => {
    const q = await addTFQuestion(quiz.id, 'true');
    const r = await request(app)
      .post(`/api/quizzes/${quiz.id}/attempts`)
      .send({ studentId: 's1', answers: [{ questionId: q.id, answer: 'false' }] });
    expect(r.body.answers[0].isCorrect).toBe(false);
    expect(r.body.answers[0].pointsEarned).toBe(0);
  });

  test('leaves SHORT_ANSWER pending manual grading', async () => {
    const q = await addSAQuestion(quiz.id);
    const r = await request(app)
      .post(`/api/quizzes/${quiz.id}/attempts`)
      .send({ studentId: 's1', answers: [{ questionId: q.id, answer: 'my answer' }] });
    expect(r.body.isGraded).toBe(false);
    expect(r.body.score).toBeNull();
  });

  test('manual grading finalizes attempt', async () => {
    const q = await addSAQuestion(quiz.id);
    const attempt = await request(app)
      .post(`/api/quizzes/${quiz.id}/attempts`)
      .send({ studentId: 's1', answers: [{ questionId: q.id, answer: 'my answer' }] });

    const answerId = attempt.body.answers[0].id;
    const graded = await request(app)
      .patch(`/api/quizzes/${quiz.id}/attempts/${attempt.body.id}/answers/${answerId}/grade`)
      .send({ pointsEarned: 3 });

    expect(graded.status).toBe(200);
    expect(graded.body.isGraded).toBe(true);
    expect(graded.body.score).toBe(3);
  });
});
