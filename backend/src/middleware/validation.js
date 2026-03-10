import { body } from 'express-validator';

/**
 * Validation rules for the registration endpoint.
 * - email: must be a valid email format, normalised to lowercase
 * - password: 8+ chars, at least one uppercase, one lowercase, one digit, one special char
 */
export const registerValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please enter a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter.')
    .matches(/[0-9]/).withMessage('Password must contain at least one number.')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one special character.'),
];

// ---------------------------------------------------------------------------
// Quiz validation rules
// ---------------------------------------------------------------------------

export const createQuizValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Quiz title is required.')
    .isLength({ max: 255 }).withMessage('Title must not exceed 255 characters.'),
  body('description')
    .optional()
    .isString().withMessage('Description must be a string.'),
];

export const updateQuizValidation = [
  body('title')
    .optional()
    .trim()
    .notEmpty().withMessage('Title must not be empty.')
    .isLength({ max: 255 }).withMessage('Title must not exceed 255 characters.'),
  body('description')
    .optional()
    .isString().withMessage('Description must be a string.'),
];

export const addQuestionValidation = [
  body('type')
    .trim()
    .notEmpty().withMessage('Question type is required.')
    .isIn(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER'])
    .withMessage('type must be MULTIPLE_CHOICE, TRUE_FALSE, or SHORT_ANSWER.'),
  body('text')
    .trim()
    .notEmpty().withMessage('Question text is required.'),
  body('points')
    .optional()
    .isInt({ min: 1 }).withMessage('Points must be a positive integer.'),
  body('options')
    .optional()
    .isArray().withMessage('options must be an array.'),
  body('options.*.text')
    .optional()
    .trim()
    .notEmpty().withMessage('Each option must have non-empty text.'),
];

export const updateQuestionValidation = [
  body('text')
    .optional()
    .trim()
    .notEmpty().withMessage('Question text must not be empty.'),
  body('points')
    .optional()
    .isInt({ min: 1 }).withMessage('Points must be a positive integer.'),
  body('order')
    .optional()
    .isInt({ min: 0 }).withMessage('Order must be a non-negative integer.'),
];

export const submitAttemptValidation = [
  body('studentId')
    .trim()
    .notEmpty().withMessage('studentId is required.'),
  body('answers')
    .isArray({ min: 0 }).withMessage('answers must be an array.'),
  body('answers.*.questionId')
    .notEmpty().withMessage('Each answer must have a questionId.'),
];

export const gradeAnswerValidation = [
  body('pointsEarned')
    .notEmpty().withMessage('pointsEarned is required.')
    .isInt({ min: 0 }).withMessage('pointsEarned must be a non-negative integer.'),
  body('feedback')
    .optional()
    .isString().withMessage('feedback must be a string.'),
];

