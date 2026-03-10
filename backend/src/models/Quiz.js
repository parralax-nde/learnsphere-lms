const mongoose = require('mongoose');

const choiceSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    isCorrect: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const QUESTION_TYPES = [
  'multiple-choice-single',
  'multiple-choice-multiple',
  'true-false',
  'short-answer',
];

const questionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: QUESTION_TYPES,
      required: true,
    },
    points: {
      type: Number,
      default: 1,
      min: 0,
    },
    // Used for multiple-choice-single, multiple-choice-multiple, and true-false
    choices: {
      type: [choiceSchema],
      default: [],
    },
    // Used for short-answer questions (optional model answer)
    correctAnswer: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: true }
);

const quizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    questions: {
      type: [questionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

quizSchema.virtual('totalPoints').get(function () {
  return this.questions.reduce((sum, q) => sum + (q.points || 0), 0);
});

const Quiz = mongoose.model('Quiz', quizSchema);

module.exports = Quiz;
module.exports.QUESTION_TYPES = QUESTION_TYPES;
