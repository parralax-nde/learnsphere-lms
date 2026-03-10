const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { createQuiz, getQuiz, updateQuiz, deleteQuiz } = require('../controllers/quizController');

// POST /api/quizzes – create a new quiz
router.post('/', authenticate, createQuiz);

// GET /api/quizzes/:id – retrieve a single quiz
router.get('/:id', authenticate, getQuiz);

// PUT /api/quizzes/:id – update a quiz
router.put('/:id', authenticate, updateQuiz);

// DELETE /api/quizzes/:id – delete a quiz
router.delete('/:id', authenticate, deleteQuiz);

module.exports = router;
