const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const quizController = require('../controllers/quizController');
const { validate } = require('../middleware/validation');

const quizRules = [
  body('title').optional().notEmpty().isString().trim().isLength({ max: 255 }),
  body('description').optional().isString(),
  body('timeLimitMinutes').optional({ nullable: true }).isInt({ min: 1 }),
  body('maxAttempts').optional({ nullable: true }).isInt({ min: 1 }),
  body('showAnswersAfterSubmission').optional().isBoolean(),
  body('passingScore').optional().isFloat({ min: 0, max: 100 }),
];

const createQuizRules = [
  body('title').notEmpty().withMessage('Title is required').isString().trim().isLength({ max: 255 }),
  ...quizRules.slice(1),
];

const questionRules = [
  body('type').notEmpty().isIn(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER']),
  body('text').notEmpty().isString(),
  body('points').optional().isInt({ min: 1 }),
  body('order').optional().isInt({ min: 0 }),
];

const attemptRules = [
  body('studentId').notEmpty().isString(),
  body('answers').isArray(),
  body('answers.*.questionId').notEmpty().isString(),
];

const gradeRules = [
  body('pointsEarned').notEmpty().isFloat({ min: 0 }),
  body('feedback').optional().isString(),
];

router.post('/', createQuizRules, validate, quizController.createQuiz);
router.get('/', quizController.listQuizzes);
router.get('/:id', quizController.getQuiz);
router.put('/:id', quizRules, validate, quizController.updateQuiz);
router.delete('/:id', quizController.deleteQuiz);

router.post('/:id/questions', questionRules, validate, quizController.addQuestion);
router.put('/:id/questions/:questionId', validate, quizController.updateQuestion);
router.delete('/:id/questions/:questionId', quizController.deleteQuestion);

router.post('/:id/attempts', attemptRules, validate, quizController.startOrSubmitAttempt);
router.get('/:id/attempts', quizController.listAttempts);
router.get('/:id/attempts/:attemptId', quizController.getAttempt);
router.patch('/:id/attempts/:attemptId/answers/:answerId/grade', gradeRules, validate, quizController.gradeAnswer);

module.exports = router;
