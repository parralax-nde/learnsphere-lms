const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function autoGradeAnswer(question, answer) {
  if (question.requiresManualGrading) {
    return { isCorrect: null, pointsEarned: null };
  }
  const correct = (question.correctAnswer ?? '').trim().toLowerCase();
  const given = (answer ?? '').trim().toLowerCase();
  const isCorrect = correct === given;
  return { isCorrect, pointsEarned: isCorrect ? question.points : 0 };
}

function computePassedStatus(score, maxScore, passingScore) {
  if (score === null || score === undefined) return null;
  if (maxScore === 0) return null; // zero-point quiz: passing status is indeterminate
  const pct = (score / maxScore) * 100;
  return pct >= passingScore;
}

// ─── Quiz CRUD ─────────────────────────────────────────────────────────────────

async function createQuiz(req, res) {
  try {
    const {
      title,
      description,
      timeLimitMinutes,
      maxAttempts,
      showAnswersAfterSubmission,
      passingScore,
    } = req.body;

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description: description ?? null,
        timeLimitMinutes: timeLimitMinutes ?? null,
        maxAttempts: maxAttempts ?? null,
        showAnswersAfterSubmission: showAnswersAfterSubmission ?? true,
        passingScore: passingScore ?? 0,
      },
    });

    return res.status(201).json(quiz);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function listQuizzes(_req, res) {
  try {
    const quizzes = await prisma.quiz.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { questions: true, attempts: true } } },
    });
    return res.json(quizzes);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getQuiz(req, res) {
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: req.params.id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: { options: { orderBy: { order: 'asc' } } },
        },
      },
    });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    return res.json(quiz);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateQuiz(req, res) {
  try {
    const {
      title,
      description,
      timeLimitMinutes,
      maxAttempts,
      showAnswersAfterSubmission,
      passingScore,
    } = req.body;

    const data = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (timeLimitMinutes !== undefined) data.timeLimitMinutes = timeLimitMinutes;
    if (maxAttempts !== undefined) data.maxAttempts = maxAttempts;
    if (showAnswersAfterSubmission !== undefined)
      data.showAnswersAfterSubmission = showAnswersAfterSubmission;
    if (passingScore !== undefined) data.passingScore = passingScore;

    const quiz = await prisma.quiz.update({
      where: { id: req.params.id },
      data,
    });
    return res.json(quiz);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Quiz not found' });
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteQuiz(req, res) {
  try {
    await prisma.quiz.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Quiz not found' });
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── Questions ─────────────────────────────────────────────────────────────────

async function addQuestion(req, res) {
  try {
    const { type, text, points = 1, order = 0, correctAnswer, options = [] } = req.body;

    const quiz = await prisma.quiz.findUnique({ where: { id: req.params.id } });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const requiresManualGrading = type === 'SHORT_ANSWER';

    // Validation
    if (type === 'MULTIPLE_CHOICE') {
      if (!Array.isArray(options) || options.length < 2) {
        return res.status(422).json({ error: 'MULTIPLE_CHOICE questions require at least 2 options' });
      }
    }
    if (type === 'TRUE_FALSE') {
      const ca = (correctAnswer ?? '').toLowerCase();
      if (ca !== 'true' && ca !== 'false') {
        return res.status(422).json({ error: 'TRUE_FALSE correctAnswer must be "true" or "false" (case-insensitive)' });
      }
    }

    const question = await prisma.question.create({
      data: {
        quizId: req.params.id,
        type,
        text,
        points,
        order,
        requiresManualGrading,
        correctAnswer: requiresManualGrading ? null : (correctAnswer ?? null),
        options: {
          create: options.map((opt, idx) => ({
            text: typeof opt === 'string' ? opt : opt.text,
            order: idx,
          })),
        },
      },
      include: { options: { orderBy: { order: 'asc' } } },
    });

    await syncQuizTotalPoints(req.params.id);
    return res.status(201).json(question);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateQuestion(req, res) {
  try {
    const { text, points, order, correctAnswer } = req.body;
    const data = {};
    if (text !== undefined) data.text = text;
    if (points !== undefined) data.points = points;
    if (order !== undefined) data.order = order;
    if (correctAnswer !== undefined) data.correctAnswer = correctAnswer;

    const question = await prisma.question.update({
      where: { id: req.params.questionId },
      data,
      include: { options: { orderBy: { order: 'asc' } } },
    });

    await syncQuizTotalPoints(req.params.id);
    return res.json(question);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Question not found' });
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteQuestion(req, res) {
  try {
    await prisma.question.delete({ where: { id: req.params.questionId } });
    await syncQuizTotalPoints(req.params.id);
    return res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Question not found' });
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── Attempts ─────────────────────────────────────────────────────────────────

async function startOrSubmitAttempt(req, res) {
  try {
    const { studentId, answers } = req.body;

    const quiz = await prisma.quiz.findUnique({
      where: { id: req.params.id },
      include: {
        questions: { include: { options: true } },
      },
    });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    // Enforce maxAttempts
    if (quiz.maxAttempts != null) {
      const attemptCount = await prisma.quizAttempt.count({
        where: { quizId: quiz.id, studentId },
      });
      if (attemptCount >= quiz.maxAttempts) {
        return res.status(403).json({
          error: `Maximum attempts (${quiz.maxAttempts}) reached for this quiz`,
        });
      }
    }

    const now = new Date();
    const maxScore = quiz.totalPoints;

    // Build a Map for O(1) question lookups
    const questionMap = new Map(quiz.questions.map((q) => [q.id, q]));

    // Grade answers — validate all question IDs first
    const invalidId = answers.find(({ questionId }) => !questionMap.has(questionId));
    if (invalidId) {
      return res.status(400).json({ error: `Question ${invalidId.questionId} not found in this quiz` });
    }

    const gradedAnswers = answers.map(({ questionId, answer }) => {
      const question = questionMap.get(questionId);
      const { isCorrect, pointsEarned } = autoGradeAnswer(question, answer);
      return { questionId, answer: answer ?? null, isCorrect, pointsEarned };
    });

    const allGraded = gradedAnswers.every((a) => a.pointsEarned !== null);
    const score = allGraded
      ? gradedAnswers.reduce((sum, a) => sum + (a.pointsEarned ?? 0), 0)
      : null;

    const isPassed = allGraded ? computePassedStatus(score, maxScore, quiz.passingScore) : null;

    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId: quiz.id,
        studentId,
        score,
        maxScore,
        isPassed,
        isGraded: allGraded,
        submittedAt: now,
        answers: {
          create: gradedAnswers,
        },
      },
      include: {
        answers: {
          include: { question: { include: { options: true } } },
        },
      },
    });

    // Filter answer details if showAnswersAfterSubmission is false
    const responseAttempt = formatAttemptResponse(attempt, quiz.showAnswersAfterSubmission);
    return res.status(201).json(responseAttempt);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function formatAttemptResponse(attempt, showAnswers) {
  if (showAnswers) return attempt;
  // Hide correctness info but keep score
  return {
    ...attempt,
    answers: attempt.answers.map((a) => ({
      id: a.id,
      attemptId: a.attemptId,
      questionId: a.questionId,
      answer: a.answer,
      // Hide: isCorrect, pointsEarned, feedback
    })),
  };
}

async function listAttempts(req, res) {
  try {
    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId: req.params.id },
      orderBy: { submittedAt: 'desc' },
      include: { _count: { select: { answers: true } } },
    });
    return res.json(attempts);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getAttempt(req, res) {
  try {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: req.params.attemptId },
      include: {
        quiz: true,
        answers: {
          include: { question: { include: { options: true } } },
        },
      },
    });
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
    if (attempt.quizId !== req.params.id)
      return res.status(404).json({ error: 'Attempt not found' });

    const responseAttempt = formatAttemptResponse(attempt, attempt.quiz.showAnswersAfterSubmission);
    return res.json(responseAttempt);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function gradeAnswer(req, res) {
  try {
    const { pointsEarned, feedback } = req.body;

    const answer = await prisma.studentAnswer.findUnique({
      where: { id: req.params.answerId },
      include: { question: true, attempt: { include: { quiz: true } } },
    });
    if (!answer) return res.status(404).json({ error: 'Answer not found' });
    if (!answer.question.requiresManualGrading) {
      return res.status(400).json({ error: 'This answer does not require manual grading' });
    }
    if (pointsEarned > answer.question.points) {
      return res.status(422).json({
        error: `pointsEarned cannot exceed question max of ${answer.question.points}`,
      });
    }

    await prisma.studentAnswer.update({
      where: { id: req.params.answerId },
      data: {
        pointsEarned,
        isCorrect: pointsEarned > 0,
        feedback: feedback ?? null,
      },
    });

    // Re-compute attempt score
    const allAnswers = await prisma.studentAnswer.findMany({
      where: { attemptId: answer.attemptId },
    });
    const allGraded = allAnswers.every((a) => a.pointsEarned !== null);
    const newScore = allGraded ? allAnswers.reduce((s, a) => s + (a.pointsEarned ?? 0), 0) : null;
    const isPassed = allGraded
      ? computePassedStatus(newScore, answer.attempt.maxScore, answer.attempt.quiz.passingScore)
      : null;

    const updatedAttempt = await prisma.quizAttempt.update({
      where: { id: answer.attemptId },
      data: {
        score: newScore,
        isPassed,
        isGraded: allGraded,
        gradedAt: allGraded ? new Date() : null,
      },
      include: {
        answers: { include: { question: { include: { options: true } } } },
      },
    });

    return res.json(updatedAttempt);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  createQuiz,
  listQuizzes,
  getQuiz,
  updateQuiz,
  deleteQuiz,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  startOrSubmitAttempt,
  listAttempts,
  getAttempt,
  gradeAnswer,
};
