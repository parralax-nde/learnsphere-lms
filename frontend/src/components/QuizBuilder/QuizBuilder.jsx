import { useState, useCallback } from 'react';
import { createQuiz } from '../../services/quizService';
import './QuizBuilder.css';

const QUESTION_TYPES = [
  { value: 'multiple-choice-single', label: 'Multiple Choice (Single Answer)' },
  { value: 'multiple-choice-multiple', label: 'Multiple Choice (Multiple Answers)' },
  { value: 'true-false', label: 'True / False' },
  { value: 'short-answer', label: 'Short Answer' },
];

const DEFAULT_TRUE_FALSE_CHOICES = [
  { text: 'True', isCorrect: true },
  { text: 'False', isCorrect: false },
];

let _idCounter = 0;
function uid() {
  return `id-${++_idCounter}`;
}

function createDefaultQuestion() {
  return {
    id: uid(),
    text: '',
    type: 'multiple-choice-single',
    points: 1,
    choices: [
      { id: uid(), text: '', isCorrect: true },
      { id: uid(), text: '', isCorrect: false },
    ],
    correctAnswer: '',
  };
}

/**
 * QuizBuilder component
 *
 * Props:
 *   authToken   {string}       - JWT token for authenticated requests
 *   onSave      {function}     - Callback invoked with the saved quiz object
 */
export default function QuizBuilder({ authToken, onSave }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ─── Question helpers ──────────────────────────────────────

  function addQuestion() {
    setQuestions((prev) => [...prev, createDefaultQuestion()]);
    setError('');
    setSuccess('');
  }

  function removeQuestion(qId) {
    setQuestions((prev) => prev.filter((q) => q.id !== qId));
  }

  function updateQuestion(qId, field, value) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId) return q;

        if (field === 'type') {
          // Reset choices / correctAnswer when type changes
          if (value === 'true-false') {
            return {
              ...q,
              type: value,
              choices: DEFAULT_TRUE_FALSE_CHOICES.map((c) => ({ ...c, id: uid() })),
              correctAnswer: '',
            };
          }
          if (value === 'short-answer') {
            return { ...q, type: value, choices: [], correctAnswer: '' };
          }
          // multiple-choice-single or multiple-choice-multiple
          return {
            ...q,
            type: value,
            choices:
              q.type === 'short-answer' || q.type === 'true-false'
                ? [
                    { id: uid(), text: '', isCorrect: true },
                    { id: uid(), text: '', isCorrect: false },
                  ]
                : q.choices,
            correctAnswer: '',
          };
        }

        return { ...q, [field]: value };
      })
    );
  }

  // ─── Choice helpers ────────────────────────────────────────

  function addChoice(qId) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qId
          ? { ...q, choices: [...q.choices, { id: uid(), text: '', isCorrect: false }] }
          : q
      )
    );
  }

  function removeChoice(qId, choiceId) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qId ? { ...q, choices: q.choices.filter((c) => c.id !== choiceId) } : q
      )
    );
  }

  function updateChoiceText(qId, choiceId, text) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qId
          ? {
              ...q,
              choices: q.choices.map((c) => (c.id === choiceId ? { ...c, text } : c)),
            }
          : q
      )
    );
  }

  function toggleChoiceCorrect(qId, choiceId, type) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId) return q;
        const choices =
          type === 'multiple-choice-single' || type === 'true-false'
            ? // Single correct: deselect all others
              q.choices.map((c) => ({ ...c, isCorrect: c.id === choiceId }))
            : // Multiple correct: toggle the clicked one
              q.choices.map((c) => (c.id === choiceId ? { ...c, isCorrect: !c.isCorrect } : c));
        return { ...q, choices };
      })
    );
  }

  // ─── Serialise for API ─────────────────────────────────────

  function serialiseQuestions() {
    return questions.map(({ text, type, points, choices, correctAnswer }) => ({
      text,
      type,
      points: Number(points),
      choices: choices.map(({ text: t, isCorrect }) => ({ text: t, isCorrect })),
      correctAnswer,
    }));
  }

  // ─── Submit ────────────────────────────────────────────────

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError('');
      setSuccess('');

      if (!title.trim()) {
        setError('Quiz title is required.');
        return;
      }

      setSaving(true);
      try {
        const result = await createQuiz(
          { title: title.trim(), description: description.trim(), questions: serialiseQuestions() },
          authToken
        );
        setSuccess('Quiz saved successfully!');
        onSave && onSave(result.quiz);
      } catch (err) {
        const message = err?.response?.data?.error || 'Failed to save quiz. Please try again.';
        setError(message);
      } finally {
        setSaving(false);
      }
    },
    [title, description, questions, authToken, onSave] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ─── Computed ──────────────────────────────────────────────

  const totalPoints = questions.reduce((sum, q) => sum + Number(q.points || 0), 0);

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="quiz-builder">
      <h2 className="quiz-builder__heading">Quiz Builder</h2>

      <form onSubmit={handleSubmit} noValidate>
        {/* ── Quiz metadata ── */}
        <section className="quiz-builder__section">
          <div className="quiz-builder__field">
            <label className="quiz-builder__label" htmlFor="quiz-title">
              Quiz Title <span aria-hidden="true">*</span>
            </label>
            <input
              id="quiz-title"
              className="quiz-builder__input"
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError(''); setSuccess(''); }}
              placeholder="Enter quiz title"
              disabled={saving}
              aria-required="true"
            />
          </div>

          <div className="quiz-builder__field">
            <label className="quiz-builder__label" htmlFor="quiz-description">
              Description
            </label>
            <textarea
              id="quiz-description"
              className="quiz-builder__textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional quiz description"
              rows={3}
              disabled={saving}
            />
          </div>
        </section>

        {/* ── Questions list ── */}
        <section className="quiz-builder__section">
          <div className="quiz-builder__questions-header">
            <h3 className="quiz-builder__subheading">
              Questions{questions.length > 0 ? ` (${questions.length})` : ''}
            </h3>
            <span className="quiz-builder__total-points" aria-live="polite">
              Total points: {totalPoints}
            </span>
          </div>

          {questions.length === 0 && (
            <p className="quiz-builder__empty-state">
              No questions yet. Click &ldquo;Add Question&rdquo; to get started.
            </p>
          )}

          {questions.map((q, index) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={index}
              saving={saving}
              onUpdate={updateQuestion}
              onRemove={removeQuestion}
              onAddChoice={addChoice}
              onRemoveChoice={removeChoice}
              onUpdateChoiceText={updateChoiceText}
              onToggleChoiceCorrect={toggleChoiceCorrect}
            />
          ))}

          <button
            type="button"
            className="quiz-builder__btn quiz-builder__btn--secondary"
            onClick={addQuestion}
            disabled={saving}
          >
            + Add Question
          </button>
        </section>

        {/* ── Messages ── */}
        {error && (
          <p className="quiz-builder__error" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="quiz-builder__success" role="status">
            {success}
          </p>
        )}

        {/* ── Submit ── */}
        <div className="quiz-builder__actions">
          <button
            type="submit"
            className="quiz-builder__btn quiz-builder__btn--primary"
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save Quiz'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// QuestionCard sub-component
// ─────────────────────────────────────────────────────────────

function QuestionCard({
  question,
  index,
  saving,
  onUpdate,
  onRemove,
  onAddChoice,
  onRemoveChoice,
  onUpdateChoiceText,
  onToggleChoiceCorrect,
}) {
  const { id, text, type, points, choices, correctAnswer } = question;
  const labelPrefix = `q-${id}`;

  return (
    <div className="quiz-builder__question-card" data-testid={`question-card-${index}`}>
      <div className="quiz-builder__question-header">
        <span className="quiz-builder__question-number">Question {index + 1}</span>
        <button
          type="button"
          className="quiz-builder__remove-btn"
          onClick={() => onRemove(id)}
          disabled={saving}
          aria-label={`Remove question ${index + 1}`}
        >
          ✕
        </button>
      </div>

      {/* ── Question text ── */}
      <div className="quiz-builder__field">
        <label className="quiz-builder__label" htmlFor={`${labelPrefix}-text`}>
          Question Text <span aria-hidden="true">*</span>
        </label>
        <textarea
          id={`${labelPrefix}-text`}
          className="quiz-builder__textarea"
          value={text}
          onChange={(e) => onUpdate(id, 'text', e.target.value)}
          placeholder="Enter your question"
          rows={2}
          disabled={saving}
          aria-required="true"
        />
      </div>

      {/* ── Type selector ── */}
      <div className="quiz-builder__row">
        <div className="quiz-builder__field quiz-builder__field--grow">
          <label className="quiz-builder__label" htmlFor={`${labelPrefix}-type`}>
            Question Type
          </label>
          <select
            id={`${labelPrefix}-type`}
            className="quiz-builder__select"
            value={type}
            onChange={(e) => onUpdate(id, 'type', e.target.value)}
            disabled={saving}
            aria-label="Question type"
          >
            {QUESTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* ── Points ── */}
        <div className="quiz-builder__field quiz-builder__field--narrow">
          <label className="quiz-builder__label" htmlFor={`${labelPrefix}-points`}>
            Points
          </label>
          <input
            id={`${labelPrefix}-points`}
            className="quiz-builder__input"
            type="number"
            min="0"
            step="1"
            value={points}
            onChange={(e) => onUpdate(id, 'points', e.target.value)}
            disabled={saving}
            aria-label="Points"
          />
        </div>
      </div>

      {/* ── Type-specific answer configuration ── */}
      {(type === 'multiple-choice-single' || type === 'multiple-choice-multiple') && (
        <ChoiceList
          questionId={id}
          choices={choices}
          questionType={type}
          saving={saving}
          onAddChoice={onAddChoice}
          onRemoveChoice={onRemoveChoice}
          onUpdateChoiceText={onUpdateChoiceText}
          onToggleChoiceCorrect={onToggleChoiceCorrect}
        />
      )}

      {type === 'true-false' && (
        <TrueFalseSelector
          questionId={id}
          choices={choices}
          saving={saving}
          onToggle={onToggleChoiceCorrect}
        />
      )}

      {type === 'short-answer' && (
        <div className="quiz-builder__field">
          <label className="quiz-builder__label" htmlFor={`${labelPrefix}-answer`}>
            Model Answer <span className="quiz-builder__hint">(optional, for reference)</span>
          </label>
          <input
            id={`${labelPrefix}-answer`}
            className="quiz-builder__input"
            type="text"
            value={correctAnswer}
            onChange={(e) => onUpdate(id, 'correctAnswer', e.target.value)}
            placeholder="Enter a model answer"
            disabled={saving}
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ChoiceList sub-component
// ─────────────────────────────────────────────────────────────

function ChoiceList({
  questionId,
  choices,
  questionType,
  saving,
  onAddChoice,
  onRemoveChoice,
  onUpdateChoiceText,
  onToggleChoiceCorrect,
}) {
  const isSingle = questionType === 'multiple-choice-single';

  return (
    <fieldset className="quiz-builder__choices" disabled={saving}>
      <legend className="quiz-builder__label">
        {isSingle ? 'Choices (select the correct answer)' : 'Choices (select all correct answers)'}
      </legend>

      {choices.map((choice, idx) => (
        <div key={choice.id} className="quiz-builder__choice-row">
          <input
            type={isSingle ? 'radio' : 'checkbox'}
            id={`choice-${choice.id}`}
            name={isSingle ? `correct-${questionId}` : undefined}
            checked={choice.isCorrect}
            onChange={() => onToggleChoiceCorrect(questionId, choice.id, questionType)}
            aria-label={`Mark choice ${idx + 1} as correct`}
          />
          <input
            className="quiz-builder__input quiz-builder__choice-text"
            type="text"
            value={choice.text}
            onChange={(e) => onUpdateChoiceText(questionId, choice.id, e.target.value)}
            placeholder={`Choice ${idx + 1}`}
            aria-label={`Choice ${idx + 1} text`}
          />
          {choices.length > 2 && (
            <button
              type="button"
              className="quiz-builder__remove-btn quiz-builder__remove-btn--sm"
              onClick={() => onRemoveChoice(questionId, choice.id)}
              aria-label={`Remove choice ${idx + 1}`}
            >
              ✕
            </button>
          )}
        </div>
      ))}

      {choices.length < 10 && (
        <button
          type="button"
          className="quiz-builder__btn quiz-builder__btn--ghost"
          onClick={() => onAddChoice(questionId)}
        >
          + Add Choice
        </button>
      )}
    </fieldset>
  );
}

// ─────────────────────────────────────────────────────────────
// TrueFalseSelector sub-component
// ─────────────────────────────────────────────────────────────

function TrueFalseSelector({ questionId, choices, saving, onToggle }) {
  return (
    <fieldset className="quiz-builder__choices" disabled={saving}>
      <legend className="quiz-builder__label">Correct Answer</legend>
      {choices.map((choice) => (
        <label key={choice.id} className="quiz-builder__tf-option">
          <input
            type="radio"
            name={`tf-${questionId}`}
            checked={choice.isCorrect}
            onChange={() => onToggle(questionId, choice.id, 'true-false')}
            aria-label={choice.text}
          />
          {choice.text}
        </label>
      ))}
    </fieldset>
  );
}
