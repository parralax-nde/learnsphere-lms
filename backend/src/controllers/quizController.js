import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';

const prisma = new PrismaClient();

const VALID_QUESTION_TYPES = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER'];

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/**
 * Auto-grade a student's answer for objective question types.
 * Returns { isCorrect, pointsEarned }.
 * SHORT_ANSWER returns { isCorrect: null, pointsEarned: null } (manual grading needed).
 */
function autoGradeAnswer(question, answer) {
  if (question.type === 'SHORT_ANSWER') {
    return { isCorrect: null, pointsEarned: null };
  }

  const normalise = (val) => String(val ?? '').trim().toLowerCase();
  const isCorrect = normalise(answer) === normalise(question.correctAnswer);
  return { isCorrect, pointsEarned: isCorrect ? question.points : 0 };
}

/**
 * (Re)compute and persist the totalPoints of a quiz from its questions.
 */
async function syncQuizTotalPoints(quizId) {
  const agg = await prisma.question.aggregate({
    where: { quizId },
    _sum: { points: true },
  });
  await prisma.quiz.update({
    where: { id: quizId },
    data: { totalPoints: agg._sum.points ?? 0 },
  });
}

// ---------------------------------------------------------------------------
// Quiz CRUD
// ---------------------------------------------------------------------------

/**
 * POST /api/quizzes
 * Create a new quiz.
 */
export async function createQuiz(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      message: 'Validation failed.',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  const { title, description } = req.body;

  try {
    const quiz = await prisma.quiz.create({
      data: { title, description },
    });
    return res.status(201).json(quiz);
  } catch (err) {
    console.error('createQuiz error:', err);
    return res.status(500).json({ message: 'An unexpected error occurred.' });
  }
}

/**
 * GET /api/quizzes
 * List all quizzes (summary view – no questions).
 */
export async function listQuizzes(_req, res) {
  try {
    const quizzes = await prisma.quiz.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return res.json(quizzes);
  } catch (err) {
    console.error('listQuizzes error:', err);
    return res.status(500).json({ message: 'An unexpected error occurred.' });
  }
}

/**
 * GET /api/quizzes/:id
 * Get a single quiz with all questions and their options.
 */
export async function getQuiz(req, res) {
  const { id } = req.params;

  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: { options: { orderBy: { order: 'asc' } } },
        },
      },
    });

    if (!quiz) return res.status(404).json({ message: 'Quiz not found.' });

    return res.json(quiz);
  } catch (err) {
    console.error('getQuiz error:', err);
    return res.status(500).json({ message: 'An unexpected error occurred.' });
  }
}

/**
 * PUT /api/quizzes/:id
 * Update quiz title / description.
 */
export async function updateQuiz(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      message: 'Validation failed.',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  const { id } = req.params;
  const { title, description } = req.body;

  try {
    const existing = await prisma.quiz.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Quiz not found.' });

    const quiz = await prisma.quiz.update({
      where: { id },
      data: { title, description },
    });
    return res.json(quiz);
  } catch (err) {
    console.error('updateQuiz error:', err);
    return res.status(500).json({ message: 'An unexpected error occurred.' });
  }
}

/**
 * DELETE /api/quizzes/:id
 * Delete a quiz (cascades to questions, options, attempts, answers).
 */
export async function deleteQuiz(req, res) {
  const { id } = req.params;

  try {
    const existing = await prisma.quiz.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Quiz not found.' });

    await prisma.quiz.delete({ where: { id } });
    return res.status(204).send();
  } catch (err) {
    console.error('deleteQuiz error:', err);
    return res.status(500).json({ message: 'An unexpected error occurred.' });
  }
}

// ---------------------------------------------------------------------------
// Question management (answer key + scoring rules)
// ---------------------------------------------------------------------------

/**
 * POST /api/quizzes/:id/questions
 * Add a question to a quiz with its answer key and point value.
 *
 * Body:
 *   type            – MULTIPLE_CHOICE | TRUE_FALSE | SHORT_ANSWER
 *   text            – question prompt
 *   points          – point value (≥ 1)
 *   correctAnswer   – required for MULTIPLE_CHOICE/TRUE_FALSE; omit for SHORT_ANSWER
 *   options         – array of { text } for MULTIPLE_CHOICE
 *   order           – display order (optional)
 */
export async function addQuestion(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      message: 'Validation failed.',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  const { id: quizId } = req.params;
  const { type, text, points = 1, correctAnswer, options = [], order = 0 } = req.body;

  try {
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found.' });

    // Validate type-specific rules
    if (!VALID_QUESTION_TYPES.includes(type)) {
      return res.status(422).json({ message: `Invalid question type: ${type}` });
    }

    if (type === 'TRUE_FALSE' && !['true', 'false'].includes(String(correctAnswer).toLowerCase())) {
      return res.status(422).json({ message: 'TRUE_FALSE questions require correctAnswer to be "true" or "false".' });
    }

    if (type === 'MULTIPLE_CHOICE') {
      if (!Array.isArray(options) || options.length < 2) {
        return res.status(422).json({ message: 'MULTIPLE_CHOICE questions require at least 2 options.' });
      }
    }

    const requiresManualGrading = type === 'SHORT_ANSWER';

    const question = await prisma.question.create({
      data: {
        quizId,
        type,
        text,
        points: Number(points),
        // For MULTIPLE_CHOICE, we resolve the correctAnswer to an option id after
        // the options are created; set to null for now.
        correctAnswer: requiresManualGrading || type === 'MULTIPLE_CHOICE'
          ? null
          : String(correctAnswer ?? ''),
        requiresManualGrading,
        order: Number(order),
        options: type === 'MULTIPLE_CHOICE'
          ? { create: options.map((opt, idx) => ({ text: opt.text, order: idx })) }
          : undefined,
      },
      include: { options: { orderBy: { order: 'asc' } } },
    });

    // For MULTIPLE_CHOICE, resolve correctAnswer to the actual option id.
    // The caller may pass either an option id (string) or a 0-based index (number).
    if (type === 'MULTIPLE_CHOICE' && correctAnswer !== undefined) {
      const corrStr = String(correctAnswer);
      const resolvedCorrectAnswer =
        question.options.find((o) => o.id === corrStr)
          ? corrStr
          : question.options[Number(correctAnswer)]?.id ?? corrStr;

      await prisma.question.update({
        where: { id: question.id },
        data: { correctAnswer: resolvedCorrectAnswer },
      });
      question.correctAnswer = resolvedCorrectAnswer;
    }

    await syncQuizTotalPoints(quizId);

    return res.status(201).json(question);
  } catch (err) {
    console.error('addQuestion error:', err);
    return res.status(500).json({ message: 'An unexpected error occurred.' });
  }
}

/**
 * PUT /api/quizzes/:id/questions/:questionId
 * Update a question's text, points, correct answer, or options.
 */
export async function updateQuestion(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      message: 'Validation failed.',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  const { id: quizId, questionId } = req.params;
  const { text, points, correctAnswer, order } = req.body;

  try {
    const question = await prisma.question.findFirst({
      where: { id: questionId, quizId },
    });
    if (!question) return res.status(404).json({ message: 'Question not found.' });

    const updated = await prisma.question.update({
      where: { id: questionId },
      data: {
        ...(text !== undefined && { text }),
        ...(points !== undefined && { points: Number(points) }),
        ...(correctAnswer !== undefined && !question.requiresManualGrading && { correctAnswer }),
        ...(order !== undefined && { order: Number(order) }),
      },
      include: { options: { orderBy: { order: 'asc' } } },
    });

    await syncQuizTotalPoints(quizId);

    return res.json(updated);
  } catch (err) {
    console.error('updateQuestion error:', err);
    return res.status(500).json({ message: 'An unexpected error occurred.' });
  }
}

/**
 * DELETE /api/quizzes/:id/questions/:questionId
 * Remove a question from a quiz.
 */
export async function deleteQuestion(req, res) {
  const { id: quizId, questionId } = req.params;

  try {
    const question = await prisma.question.findFirst({
      where: { id: questionId, quizId },
    });
    if (!question) return res.status(404).json({ message: 'Question not found.' });

    await prisma.question.delete({ where: { id: questionId } });
    await syncQuizTotalPoints(quizId);

    return res.status(204).send();
  } catch (err) {
    console.error('deleteQuestion error:', err);
    return res.status(500).json({ message: 'An unexpected error occurred.' });
  }
}

// ---------------------------------------------------------------------------
// Quiz attempts & scoring
// ---------------------------------------------------------------------------

/**
 * POST /api/quizzes/:id/attempts
 * Submit a quiz attempt and auto-grade objective questions.
 *
 * Body:
 *   studentId – the submitting student's user id
 *   answers   – array of { questionId, answer }
 *
 * Auto-grades MULTIPLE_CHOICE and TRUE_FALSE.
 * SHORT_ANSWER answers are stored and marked as pending manual grading.
 */
export async function submitAttempt(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      message: 'Validation failed.',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  const { id: quizId } = req.params;
  const { studentId, answers } = req.body;

  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: { include: { options: true } } },
    });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found.' });

    // Map questions by id for fast lookup
    const questionMap = new Map(quiz.questions.map((q) => [q.id, q]));

    // Grade each submitted answer
    let autoScore = 0;
    let hasManualPending = false;
    const answerRecords = [];

    for (const { questionId, answer } of answers) {
      const question = questionMap.get(questionId);
      if (!question) continue; // skip unknown questions

      const { isCorrect, pointsEarned } = autoGradeAnswer(question, answer);
      if (isCorrect === null) hasManualPending = true;
      if (pointsEarned) autoScore += pointsEarned;

      answerRecords.push({
        questionId,
        answer: answer ?? null,
        isCorrect,
        pointsEarned,
      });
    }

    // Create the attempt with all answers
    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId,
        studentId,
        score: hasManualPending ? null : autoScore,
        maxScore: quiz.totalPoints,
        isGraded: !hasManualPending,
        answers: { create: answerRecords },
      },
      include: {
        answers: {
          include: { question: { select: { text: true, points: true, type: true } } },
        },
      },
    });

    return res.status(201).json(attempt);
  } catch (err) {
    console.error('submitAttempt error:', err);
    return res.status(500).json({ message: 'An unexpected error occurred.' });
  }
}

/**
 * GET /api/quizzes/:id/attempts/:attemptId
 * Retrieve a specific quiz attempt with grading details.
 */
export async function getAttempt(req, res) {
  const { id: quizId, attemptId } = req.params;

  try {
    const attempt = await prisma.quizAttempt.findFirst({
      where: { id: attemptId, quizId },
      include: {
        quiz: { select: { title: true, totalPoints: true } },
        answers: {
          include: {
            question: {
              select: { text: true, points: true, type: true, correctAnswer: true },
            },
          },
        },
      },
    });

    if (!attempt) return res.status(404).json({ message: 'Attempt not found.' });

    return res.json(attempt);
  } catch (err) {
    console.error('getAttempt error:', err);
    return res.status(500).json({ message: 'An unexpected error occurred.' });
  }
}

/**
 * GET /api/quizzes/:id/attempts
 * List all attempts for a quiz (for instructor grading view).
 */
export async function listAttempts(req, res) {
  const { id: quizId } = req.params;

  try {
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found.' });

    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId },
      orderBy: { submittedAt: 'desc' },
      include: {
        answers: {
          include: {
            question: { select: { text: true, type: true, points: true } },
          },
        },
      },
    });

    return res.json(attempts);
  } catch (err) {
    console.error('listAttempts error:', err);
    return res.status(500).json({ message: 'An unexpected error occurred.' });
  }
}

/**
 * PATCH /api/quizzes/:id/attempts/:attemptId/answers/:answerId/grade
 * Manually grade a SHORT_ANSWER student answer and (re)compute total attempt score.
 *
 * Body:
 *   pointsEarned – 0 to question.points
 *   feedback     – optional text feedback
 */
export async function gradeAnswer(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      message: 'Validation failed.',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  const { id: quizId, attemptId, answerId } = req.params;
  const { pointsEarned, feedback } = req.body;

  try {
    // Verify attempt belongs to quiz
    const attempt = await prisma.quizAttempt.findFirst({
      where: { id: attemptId, quizId },
      include: { answers: { include: { question: true } } },
    });
    if (!attempt) return res.status(404).json({ message: 'Attempt not found.' });

    const studentAnswer = attempt.answers.find((a) => a.id === answerId);
    if (!studentAnswer) return res.status(404).json({ message: 'Answer not found.' });

    if (studentAnswer.question.type !== 'SHORT_ANSWER') {
      return res.status(400).json({ message: 'Only SHORT_ANSWER questions require manual grading.' });
    }

    const maxPoints = studentAnswer.question.points;
    if (pointsEarned < 0 || pointsEarned > maxPoints) {
      return res.status(422).json({
        message: `pointsEarned must be between 0 and ${maxPoints}.`,
      });
    }

    // Update the individual answer
    await prisma.studentAnswer.update({
      where: { id: answerId },
      data: {
        pointsEarned: Number(pointsEarned),
        isCorrect: pointsEarned > 0,
        feedback: feedback ?? null,
      },
    });

    // Refresh all answers to recalculate the attempt total
    const updatedAnswers = await prisma.studentAnswer.findMany({
      where: { attemptId },
    });

    const allGraded = updatedAnswers.every((a) => a.pointsEarned !== null);
    const totalScore = updatedAnswers.reduce((sum, a) => sum + (a.pointsEarned ?? 0), 0);

    const updatedAttempt = await prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        score: allGraded ? totalScore : null,
        isGraded: allGraded,
        gradedAt: allGraded ? new Date() : null,
      },
      include: {
        answers: {
          include: {
            question: { select: { text: true, points: true, type: true } },
          },
        },
      },
    });

    return res.json(updatedAttempt);
  } catch (err) {
    console.error('gradeAnswer error:', err);
    return res.status(500).json({ message: 'An unexpected error occurred.' });
  }
}
