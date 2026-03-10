const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { createQuiz, getQuiz, updateQuiz, deleteQuiz } = require('../controllers/quizController');

// Limit quiz operations to 30 requests per 15 minutes per IP
const quizRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many quiz requests, please try again later.' },
});

// POST /api/quizzes – create a new quiz
router.post('/', quizRateLimiter, authenticate, createQuiz);

// GET /api/quizzes/:id – retrieve a single quiz
router.get('/:id', quizRateLimiter, authenticate, getQuiz);

// PUT /api/quizzes/:id – update a quiz
router.put('/:id', quizRateLimiter, authenticate, updateQuiz);

// DELETE /api/quizzes/:id – delete a quiz
router.delete('/:id', quizRateLimiter, authenticate, deleteQuiz);

module.exports = router;
