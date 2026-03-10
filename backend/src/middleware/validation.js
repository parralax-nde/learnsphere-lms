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

/**
 * Validation rules for the login endpoint.
 */
export const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please enter a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.'),
];

/**
 * Validation rules for creating or updating a lesson.
 */
export const lessonValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Lesson title is required.')
    .isLength({ max: 255 }).withMessage('Title must not exceed 255 characters.'),

  body('content')
    .optional()
    .isString().withMessage('Content must be a string.'),

  body('order')
    .optional()
    .isInt({ min: 0 }).withMessage('Order must be a non-negative integer.'),
];

/**
 * Validation rules for creating or updating a course.
 */
export const courseValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Course title is required.')
    .isLength({ max: 255 }).withMessage('Title must not exceed 255 characters.'),

  body('description')
    .optional()
    .isString().withMessage('Description must be a string.'),
];
