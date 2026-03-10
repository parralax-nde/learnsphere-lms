import { body } from 'express-validator';

/**
 * Validation rules for the registration endpoint.
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
 * Validation rules for creating/updating a course.
 */
export const courseValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required.')
    .isLength({ max: 200 }).withMessage('Title must be at most 200 characters.'),

  body('description')
    .trim()
    .notEmpty().withMessage('Description is required.'),

  body('category')
    .optional()
    .trim(),

  body('thumbnailUrl')
    .optional({ nullable: true, checkFalsy: true })
    .isURL().withMessage('Thumbnail URL must be a valid URL.'),
];
