const request = require('supertest');
const jwt = require('jsonwebtoken');

// Set environment variables before requiring the app
process.env.JWT_SECRET = 'test-secret';

// Mock mongoose
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    connect: jest.fn().mockResolvedValue(undefined),
  };
});

const mockUser = {
  _id: '507f1f77bcf86cd799439011',
  email: 'instructor@example.com',
  role: 'instructor',
};

const mockOtherUser = {
  _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  email: 'other@example.com',
  role: 'instructor',
};

// Dynamic user store so individual tests can control which user is returned
const mockUserStore = {
  [mockUser._id]: mockUser,
  [mockOtherUser._id]: mockOtherUser,
};

jest.mock('../src/models/User', () => ({
  findById: jest.fn().mockImplementation((id) => ({
    select: jest.fn().mockResolvedValue(mockUserStore[id] || null),
  })),
}));

// --- Quiz model mock state ---
let mockQuizStore = {};
let mockQuizIdCounter = 0;

function makeMockQuiz(data) {
  const id = `quiz${++mockQuizIdCounter}`;
  const quiz = {
    _id: id,
    title: data.title,
    description: data.description || '',
    createdBy: data.createdBy,
    questions: data.questions || [],
    totalPoints: (data.questions || []).reduce((s, q) => s + (q.points || 1), 0),
    save: jest.fn().mockImplementation(function () {
      mockQuizStore[this._id] = this;
      return Promise.resolve(this);
    }),
    toObject: jest.fn().mockReturnThis(),
    toJSON: jest.fn().mockReturnThis(),
  };
  quiz.save.mockImplementation(function () {
    mockQuizStore[id] = this;
    return Promise.resolve(this);
  });
  mockQuizStore[id] = quiz;
  return quiz;
}

jest.mock('../src/models/Quiz', () => {
  function MockQuiz(data) {
    Object.assign(this, data);
    this._id = `quiz${++mockQuizIdCounter}`;
    this.totalPoints = (data.questions || []).reduce((s, q) => s + (q.points || 1), 0);
    this.save = jest.fn().mockImplementation(function () {
      mockQuizStore[this._id] = this;
      return Promise.resolve(this);
    });
  }

  MockQuiz.findById = jest.fn().mockImplementation((id) => {
    return Promise.resolve(mockQuizStore[id] || null);
  });

  MockQuiz.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

  return MockQuiz;
});

const app = require('../src/app');

function makeToken(userId = mockUser._id) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

function makeOtherToken() {
  return makeToken(mockOtherUser._id);
}

// Helpers for valid question shapes
function mcqSingle(overrides = {}) {
  return {
    text: 'What is 2 + 2?',
    type: 'multiple-choice-single',
    points: 1,
    choices: [
      { text: 'Three', isCorrect: false },
      { text: 'Four', isCorrect: true },
      { text: 'Five', isCorrect: false },
    ],
    ...overrides,
  };
}

function trueFalseQ(overrides = {}) {
  return {
    text: 'The sky is blue.',
    type: 'true-false',
    points: 1,
    choices: [
      { text: 'True', isCorrect: true },
      { text: 'False', isCorrect: false },
    ],
    ...overrides,
  };
}

function shortAnswerQ(overrides = {}) {
  return {
    text: 'Describe photosynthesis.',
    type: 'short-answer',
    points: 5,
    correctAnswer: 'Plants convert sunlight to energy.',
    ...overrides,
  };
}

// ────────────────────────────────────────────────────────────
describe('POST /api/quizzes', () => {
  beforeEach(() => {
    mockQuizStore = {};
    mockQuizIdCounter = 0;
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).post('/api/quizzes').send({ title: 'Test Quiz' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when title is missing', async () => {
    const token = makeToken();
    const res = await request(app)
      .post('/api/quizzes')
      .set('Authorization', `Bearer ${token}`)
      .send({ questions: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  it('creates a quiz with no questions', async () => {
    const token = makeToken();
    const res = await request(app)
      .post('/api/quizzes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Empty Quiz', description: 'A quiz with no questions yet' });
    expect(res.status).toBe(201);
    expect(res.body.quiz.title).toBe('Empty Quiz');
    expect(res.body.quiz.questions).toHaveLength(0);
  });

  it('creates a quiz with a multiple-choice-single question', async () => {
    const token = makeToken();
    const res = await request(app)
      .post('/api/quizzes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'MCQ Quiz', questions: [mcqSingle()] });
    expect(res.status).toBe(201);
    expect(res.body.quiz.questions).toHaveLength(1);
    expect(res.body.quiz.questions[0].type).toBe('multiple-choice-single');
  });

  it('creates a quiz with a true/false question', async () => {
    const token = makeToken();
    const res = await request(app)
      .post('/api/quizzes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'TF Quiz', questions: [trueFalseQ()] });
    expect(res.status).toBe(201);
    expect(res.body.quiz.questions[0].type).toBe('true-false');
  });

  it('creates a quiz with a short-answer question', async () => {
    const token = makeToken();
    const res = await request(app)
      .post('/api/quizzes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'SA Quiz', questions: [shortAnswerQ()] });
    expect(res.status).toBe(201);
    expect(res.body.quiz.questions[0].type).toBe('short-answer');
  });

  it('creates a quiz with mixed question types', async () => {
    const token = makeToken();
    const res = await request(app)
      .post('/api/quizzes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Mixed Quiz',
        questions: [mcqSingle(), trueFalseQ(), shortAnswerQ()],
      });
    expect(res.status).toBe(201);
    expect(res.body.quiz.questions).toHaveLength(3);
  });

  // ── Validation errors ──────────────────────────────────────

  it('returns 400 for an invalid question type', async () => {
    const token = makeToken();
    const res = await request(app)
      .post('/api/quizzes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Bad Quiz',
        questions: [{ text: 'Q1', type: 'essay', points: 1 }],
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid type/i);
  });

  it('returns 400 when MCQ has fewer than 2 choices', async () => {
    const token = makeToken();
    const res = await request(app)
      .post('/api/quizzes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Bad MCQ',
        questions: [
          {
            text: 'Q1',
            type: 'multiple-choice-single',
            points: 1,
            choices: [{ text: 'Only one', isCorrect: true }],
          },
        ],
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 2 choices/i);
  });

  it('returns 400 when MCQ single-answer has no correct choice', async () => {
    const token = makeToken();
    const res = await request(app)
      .post('/api/quizzes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Bad MCQ',
        questions: [
          {
            text: 'Q1',
            type: 'multiple-choice-single',
            points: 1,
            choices: [
              { text: 'A', isCorrect: false },
              { text: 'B', isCorrect: false },
            ],
          },
        ],
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/exactly one correct/i);
  });

  it('returns 400 when MCQ single-answer has more than one correct choice', async () => {
    const token = makeToken();
    const res = await request(app)
      .post('/api/quizzes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Bad MCQ',
        questions: [
          {
            text: 'Q1',
            type: 'multiple-choice-single',
            points: 1,
            choices: [
              { text: 'A', isCorrect: true },
              { text: 'B', isCorrect: true },
            ],
          },
        ],
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/exactly one correct/i);
  });

  it('returns 400 when points is negative', async () => {
    const token = makeToken();
    const res = await request(app)
      .post('/api/quizzes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Bad Points',
        questions: [mcqSingle({ points: -1 })],
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/non-negative/i);
  });

  it('returns 400 when question text is missing', async () => {
    const token = makeToken();
    const res = await request(app)
      .post('/api/quizzes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Bad Q',
        questions: [{ text: '', type: 'short-answer', points: 1 }],
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/text is required/i);
  });
});

// ────────────────────────────────────────────────────────────
describe('GET /api/quizzes/:id', () => {
  let createdQuizId;

  beforeEach(() => {
    mockQuizStore = {};
    mockQuizIdCounter = 0;

    const Quiz = require('../src/models/Quiz');
    const quiz = new Quiz({
      title: 'Stored Quiz',
      description: '',
      createdBy: mockUser._id,
      questions: [mcqSingle()],
    });
    quiz.save();
    createdQuizId = quiz._id;

    Quiz.findById.mockImplementation((id) => Promise.resolve(mockQuizStore[id] || null));
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).get(`/api/quizzes/${createdQuizId}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 for unknown quiz id', async () => {
    const token = makeToken();
    const Quiz = require('../src/models/Quiz');
    Quiz.findById.mockResolvedValueOnce(null);
    const res = await request(app)
      .get('/api/quizzes/unknownid')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('returns 200 with quiz data for a valid id', async () => {
    const token = makeToken();
    const res = await request(app)
      .get(`/api/quizzes/${createdQuizId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.quiz.title).toBe('Stored Quiz');
  });
});

// ────────────────────────────────────────────────────────────
describe('PUT /api/quizzes/:id', () => {
  let createdQuizId;

  beforeEach(() => {
    mockQuizStore = {};
    mockQuizIdCounter = 0;

    const Quiz = require('../src/models/Quiz');
    const quiz = new Quiz({
      title: 'Original Title',
      description: 'Original desc',
      createdBy: mockUser._id,
      questions: [],
    });
    quiz.save();
    createdQuizId = quiz._id;

    Quiz.findById.mockImplementation((id) => Promise.resolve(mockQuizStore[id] || null));
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app)
      .put(`/api/quizzes/${createdQuizId}`)
      .send({ title: 'New Title' });
    expect(res.status).toBe(401);
  });

  it('returns 404 for unknown quiz id', async () => {
    const token = makeToken();
    const Quiz = require('../src/models/Quiz');
    Quiz.findById.mockResolvedValueOnce(null);
    const res = await request(app)
      .put('/api/quizzes/unknownid')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'New Title' });
    expect(res.status).toBe(404);
  });

  it('returns 403 when a different user tries to update', async () => {
    const token = makeOtherToken();
    const res = await request(app)
      .put(`/api/quizzes/${createdQuizId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Hacked Title' });
    expect(res.status).toBe(403);
  });

  it('updates the quiz title', async () => {
    const token = makeToken();
    const res = await request(app)
      .put(`/api/quizzes/${createdQuizId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated Title' });
    expect(res.status).toBe(200);
    expect(res.body.quiz.title).toBe('Updated Title');
  });

  it('adds questions on update', async () => {
    const token = makeToken();
    const res = await request(app)
      .put(`/api/quizzes/${createdQuizId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ questions: [trueFalseQ()] });
    expect(res.status).toBe(200);
    expect(res.body.quiz.questions).toHaveLength(1);
  });

  it('returns 400 for invalid question in update', async () => {
    const token = makeToken();
    const res = await request(app)
      .put(`/api/quizzes/${createdQuizId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ questions: [{ text: 'Q1', type: 'invalid-type', points: 1 }] });
    expect(res.status).toBe(400);
  });
});

// ────────────────────────────────────────────────────────────
describe('DELETE /api/quizzes/:id', () => {
  let createdQuizId;

  beforeEach(() => {
    mockQuizStore = {};
    mockQuizIdCounter = 0;

    const Quiz = require('../src/models/Quiz');
    const quiz = new Quiz({
      title: 'To Delete',
      description: '',
      createdBy: mockUser._id,
      questions: [],
    });
    quiz.save();
    createdQuizId = quiz._id;

    Quiz.findById.mockImplementation((id) => Promise.resolve(mockQuizStore[id] || null));
    Quiz.deleteOne.mockResolvedValue({ deletedCount: 1 });
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).delete(`/api/quizzes/${createdQuizId}`);
    expect(res.status).toBe(401);
  });

  it('returns 403 when a different user tries to delete', async () => {
    const token = makeOtherToken();
    const res = await request(app)
      .delete(`/api/quizzes/${createdQuizId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('returns 404 for unknown quiz id', async () => {
    const token = makeToken();
    const Quiz = require('../src/models/Quiz');
    Quiz.findById.mockResolvedValueOnce(null);
    const res = await request(app)
      .delete('/api/quizzes/unknownid')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('successfully deletes a quiz', async () => {
    const token = makeToken();
    const res = await request(app)
      .delete(`/api/quizzes/${createdQuizId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });
});
