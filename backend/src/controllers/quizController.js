const Quiz = require('../models/Quiz');

const MAX_QUESTIONS = 100;
const MAX_CHOICES = 10;

/**
 * Validate the question payload.
 * Returns an error string or null if valid.
 */
function validateQuestion(question, index) {
  const prefix = `Question ${index + 1}`;

  if (!question.text || !question.text.trim()) {
    return `${prefix}: text is required`;
  }

  const validTypes = [
    'multiple-choice-single',
    'multiple-choice-multiple',
    'true-false',
    'short-answer',
  ];
  if (!validTypes.includes(question.type)) {
    return `${prefix}: invalid type "${question.type}". Must be one of: ${validTypes.join(', ')}`;
  }

  if (question.points !== undefined) {
    const pts = Number(question.points);
    if (!Number.isFinite(pts) || pts < 0) {
      return `${prefix}: points must be a non-negative number`;
    }
  }

  if (question.type === 'multiple-choice-single' || question.type === 'multiple-choice-multiple') {
    const choices = question.choices;
    if (!Array.isArray(choices) || choices.length < 2) {
      return `${prefix}: multiple-choice questions require at least 2 choices`;
    }
    if (choices.length > MAX_CHOICES) {
      return `${prefix}: a question may have at most ${MAX_CHOICES} choices`;
    }
    for (let i = 0; i < choices.length; i++) {
      if (!choices[i].text || !choices[i].text.trim()) {
        return `${prefix}: choice ${i + 1} text is required`;
      }
    }
    const correctCount = choices.filter((c) => c.isCorrect).length;
    if (question.type === 'multiple-choice-single' && correctCount !== 1) {
      return `${prefix}: single-answer questions must have exactly one correct choice`;
    }
    if (question.type === 'multiple-choice-multiple' && correctCount < 1) {
      return `${prefix}: multiple-answer questions must have at least one correct choice`;
    }
  }

  if (question.type === 'true-false') {
    const choices = question.choices;
    if (!Array.isArray(choices) || choices.length !== 2) {
      return `${prefix}: true/false questions must have exactly 2 choices`;
    }
    const correctCount = choices.filter((c) => c.isCorrect).length;
    if (correctCount !== 1) {
      return `${prefix}: true/false questions must have exactly one correct choice`;
    }
  }

  return null;
}

/**
 * POST /api/quizzes
 * Create a new quiz.
 */
async function createQuiz(req, res) {
  const { title, description, questions } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Quiz title is required' });
  }

  const questionsArray = Array.isArray(questions) ? questions : [];

  if (questionsArray.length > MAX_QUESTIONS) {
    return res.status(400).json({ error: `A quiz may have at most ${MAX_QUESTIONS} questions` });
  }

  for (let i = 0; i < questionsArray.length; i++) {
    const err = validateQuestion(questionsArray[i], i);
    if (err) return res.status(400).json({ error: err });
  }

  try {
    const quiz = new Quiz({
      title: title.trim(),
      description: description ? description.trim() : '',
      createdBy: req.user._id,
      questions: questionsArray,
    });
    await quiz.save();
    return res.status(201).json({ message: 'Quiz created successfully', quiz });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create quiz' });
  }
}

/**
 * GET /api/quizzes/:id
 * Get a single quiz by ID.
 */
async function getQuiz(req, res) {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    return res.status(200).json({ quiz });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    return res.status(500).json({ error: 'Failed to retrieve quiz' });
  }
}

/**
 * PUT /api/quizzes/:id
 * Update a quiz (only the creator may update).
 */
async function updateQuiz(req, res) {
  let quiz;
  try {
    quiz = await Quiz.findById(req.params.id);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    return res.status(500).json({ error: 'Failed to retrieve quiz' });
  }

  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  if (quiz.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Not authorised to update this quiz' });
  }

  const { title, description, questions } = req.body;

  if (title !== undefined) {
    if (!title.trim()) {
      return res.status(400).json({ error: 'Quiz title cannot be empty' });
    }
    quiz.title = title.trim();
  }

  if (description !== undefined) {
    quiz.description = description.trim();
  }

  if (questions !== undefined) {
    if (!Array.isArray(questions)) {
      return res.status(400).json({ error: 'questions must be an array' });
    }
    if (questions.length > MAX_QUESTIONS) {
      return res.status(400).json({ error: `A quiz may have at most ${MAX_QUESTIONS} questions` });
    }
    for (let i = 0; i < questions.length; i++) {
      const err = validateQuestion(questions[i], i);
      if (err) return res.status(400).json({ error: err });
    }
    quiz.questions = questions;
  }

  try {
    await quiz.save();
    return res.status(200).json({ message: 'Quiz updated successfully', quiz });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update quiz' });
  }
}

/**
 * DELETE /api/quizzes/:id
 * Delete a quiz (only the creator may delete).
 */
async function deleteQuiz(req, res) {
  let quiz;
  try {
    quiz = await Quiz.findById(req.params.id);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    return res.status(500).json({ error: 'Failed to retrieve quiz' });
  }

  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  if (quiz.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Not authorised to delete this quiz' });
  }

  try {
    await Quiz.deleteOne({ _id: quiz._id });
    return res.status(200).json({ message: 'Quiz deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete quiz' });
  }
}

module.exports = { createQuiz, getQuiz, updateQuiz, deleteQuiz };
