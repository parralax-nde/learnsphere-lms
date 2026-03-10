import { Router } from 'express';
import {
  createQuiz,
  listQuizzes,
  getQuiz,
  updateQuiz,
  deleteQuiz,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  submitAttempt,
  getAttempt,
  listAttempts,
  gradeAnswer,
} from '../controllers/quizController.js';
import {
  createQuizValidation,
  updateQuizValidation,
  addQuestionValidation,
  updateQuestionValidation,
  submitAttemptValidation,
  gradeAnswerValidation,
} from '../middleware/validation.js';

const router = Router();

// ---------------------------------------------------------------------------
// Quiz CRUD
// ---------------------------------------------------------------------------

/** @route  POST /api/quizzes */
router.post('/', createQuizValidation, createQuiz);

/** @route  GET  /api/quizzes */
router.get('/', listQuizzes);

/** @route  GET  /api/quizzes/:id */
router.get('/:id', getQuiz);

/** @route  PUT  /api/quizzes/:id */
router.put('/:id', updateQuizValidation, updateQuiz);

/** @route  DELETE /api/quizzes/:id */
router.delete('/:id', deleteQuiz);

// ---------------------------------------------------------------------------
// Question management (answer key + scoring)
// ---------------------------------------------------------------------------

/** @route  POST   /api/quizzes/:id/questions */
router.post('/:id/questions', addQuestionValidation, addQuestion);

/** @route  PUT    /api/quizzes/:id/questions/:questionId */
router.put('/:id/questions/:questionId', updateQuestionValidation, updateQuestion);

/** @route  DELETE /api/quizzes/:id/questions/:questionId */
router.delete('/:id/questions/:questionId', deleteQuestion);

// ---------------------------------------------------------------------------
// Quiz attempts & scoring
// ---------------------------------------------------------------------------

/** @route  POST /api/quizzes/:id/attempts */
router.post('/:id/attempts', submitAttemptValidation, submitAttempt);

/** @route  GET  /api/quizzes/:id/attempts */
router.get('/:id/attempts', listAttempts);

/** @route  GET  /api/quizzes/:id/attempts/:attemptId */
router.get('/:id/attempts/:attemptId', getAttempt);

/** @route  PATCH /api/quizzes/:id/attempts/:attemptId/answers/:answerId/grade */
router.patch(
  '/:id/attempts/:attemptId/answers/:answerId/grade',
  gradeAnswerValidation,
  gradeAnswer,
);

export default router;
