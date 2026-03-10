import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuizBuilder from '../src/components/QuizBuilder/QuizBuilder';

// Mock the quiz service
jest.mock('../src/services/quizService', () => ({
  createQuiz: jest.fn(),
}));

import { createQuiz } from '../src/services/quizService';

const DEFAULT_PROPS = {
  authToken: 'fake-jwt-token',
  onSave: jest.fn(),
};

function renderComponent(props = {}) {
  return render(<QuizBuilder {...DEFAULT_PROPS} {...props} />);
}

describe('QuizBuilder component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Initial render ──────────────────────────────────────────
  describe('Initial render', () => {
    it('renders the Quiz Builder heading', () => {
      renderComponent();
      expect(screen.getByRole('heading', { name: /quiz builder/i })).toBeInTheDocument();
    });

    it('renders a quiz title input', () => {
      renderComponent();
      expect(screen.getByLabelText(/quiz title/i)).toBeInTheDocument();
    });

    it('renders a description textarea', () => {
      renderComponent();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    it('renders the Add Question button', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /add question/i })).toBeInTheDocument();
    });

    it('renders the Save Quiz button', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /save quiz/i })).toBeInTheDocument();
    });

    it('shows empty-state message when no questions exist', () => {
      renderComponent();
      expect(screen.getByText(/no questions yet/i)).toBeInTheDocument();
    });

    it('shows total points as 0 when no questions', () => {
      renderComponent();
      expect(screen.getByText(/total points: 0/i)).toBeInTheDocument();
    });
  });

  // ── Adding questions ────────────────────────────────────────
  describe('Adding questions', () => {
    it('adds a question card when Add Question is clicked', async () => {
      renderComponent();
      await userEvent.click(screen.getByRole('button', { name: /add question/i }));
      expect(screen.getByTestId('question-card-0')).toBeInTheDocument();
    });

    it('shows a question type selector for each question', async () => {
      renderComponent();
      await userEvent.click(screen.getByRole('button', { name: /add question/i }));
      const card = screen.getByTestId('question-card-0');
      expect(within(card).getByRole('combobox', { name: /question type/i })).toBeInTheDocument();
    });

    it('shows a points input for each question', async () => {
      renderComponent();
      await userEvent.click(screen.getByRole('button', { name: /add question/i }));
      const card = screen.getByTestId('question-card-0');
      expect(within(card).getByLabelText(/^points$/i)).toBeInTheDocument();
    });

    it('defaults new question type to multiple-choice-single', async () => {
      renderComponent();
      await userEvent.click(screen.getByRole('button', { name: /add question/i }));
      const card = screen.getByTestId('question-card-0');
      const select = within(card).getByRole('combobox', { name: /question type/i });
      expect(select.value).toBe('multiple-choice-single');
    });

    it('adds multiple questions', async () => {
      renderComponent();
      await userEvent.click(screen.getByRole('button', { name: /add question/i }));
      await userEvent.click(screen.getByRole('button', { name: /add question/i }));
      expect(screen.getByTestId('question-card-0')).toBeInTheDocument();
      expect(screen.getByTestId('question-card-1')).toBeInTheDocument();
    });

    it('removes a question when the remove button is clicked', async () => {
      renderComponent();
      await userEvent.click(screen.getByRole('button', { name: /add question/i }));
      expect(screen.getByTestId('question-card-0')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: /remove question 1/i }));
      expect(screen.queryByTestId('question-card-0')).not.toBeInTheDocument();
    });
  });

  // ── Question types ──────────────────────────────────────────
  describe('Question type selector', () => {
    async function addAndSelectType(type) {
      renderComponent();
      await userEvent.click(screen.getByRole('button', { name: /add question/i }));
      const card = screen.getByTestId('question-card-0');
      const select = within(card).getByRole('combobox', { name: /question type/i });
      await userEvent.selectOptions(select, type);
      return card;
    }

    it('shows choice inputs for multiple-choice-single', async () => {
      const card = await addAndSelectType('multiple-choice-single');
      expect(within(card).getByText(/choices/i)).toBeInTheDocument();
      // Expect at least 2 choice text inputs
      const choiceInputs = within(card).getAllByRole('textbox', { name: /choice \d+ text/i });
      expect(choiceInputs.length).toBeGreaterThanOrEqual(2);
    });

    it('shows radio buttons for single-answer MCQ', async () => {
      const card = await addAndSelectType('multiple-choice-single');
      const radios = within(card).getAllByRole('radio', { name: /mark choice/i });
      expect(radios.length).toBeGreaterThanOrEqual(2);
    });

    it('shows checkboxes for multiple-answer MCQ', async () => {
      const card = await addAndSelectType('multiple-choice-multiple');
      const checkboxes = within(card).getAllByRole('checkbox', { name: /mark choice/i });
      expect(checkboxes.length).toBeGreaterThanOrEqual(2);
    });

    it('shows True/False options when type is true-false', async () => {
      const card = await addAndSelectType('true-false');
      expect(within(card).getByLabelText('True')).toBeInTheDocument();
      expect(within(card).getByLabelText('False')).toBeInTheDocument();
    });

    it('shows model answer input for short-answer type', async () => {
      const card = await addAndSelectType('short-answer');
      expect(within(card).getByLabelText(/model answer/i)).toBeInTheDocument();
    });

    it('hides choice list when switching to short-answer', async () => {
      const card = await addAndSelectType('short-answer');
      expect(within(card).queryByText(/choices/i)).not.toBeInTheDocument();
    });

    it('allows adding a new choice with the Add Choice button', async () => {
      const card = await addAndSelectType('multiple-choice-single');
      const addChoiceBtn = within(card).getByRole('button', { name: /add choice/i });
      await userEvent.click(addChoiceBtn);
      const choiceInputs = within(card).getAllByRole('textbox', { name: /choice \d+ text/i });
      expect(choiceInputs.length).toBe(3);
    });
  });

  // ── Points ──────────────────────────────────────────────────
  describe('Points', () => {
    it('updates total points when question points are changed', async () => {
      renderComponent();
      await userEvent.click(screen.getByRole('button', { name: /add question/i }));

      const card = screen.getByTestId('question-card-0');
      const pointsInput = within(card).getByLabelText(/^points$/i);

      await userEvent.clear(pointsInput);
      await userEvent.type(pointsInput, '5');

      expect(screen.getByText(/total points: 5/i)).toBeInTheDocument();
    });

    it('sums points across multiple questions', async () => {
      renderComponent();
      await userEvent.click(screen.getByRole('button', { name: /add question/i }));
      await userEvent.click(screen.getByRole('button', { name: /add question/i }));

      const cards = [screen.getByTestId('question-card-0'), screen.getByTestId('question-card-1')];

      for (const card of cards) {
        const input = within(card).getByLabelText(/^points$/i);
        await userEvent.clear(input);
        await userEvent.type(input, '3');
      }

      expect(screen.getByText(/total points: 6/i)).toBeInTheDocument();
    });
  });

  // ── Save / submit ───────────────────────────────────────────
  describe('Save quiz', () => {
    it('shows an error when title is empty and save is clicked', async () => {
      renderComponent();
      await userEvent.click(screen.getByRole('button', { name: /save quiz/i }));
      expect(screen.getByRole('alert')).toHaveTextContent(/title is required/i);
    });

    it('calls createQuiz with the correct payload on save', async () => {
      createQuiz.mockResolvedValue({ quiz: { _id: 'q1', title: 'My Quiz', questions: [] } });

      renderComponent();

      await userEvent.type(screen.getByLabelText(/quiz title/i), 'My Quiz');
      await userEvent.type(screen.getByLabelText(/description/i), 'A test quiz');
      await userEvent.click(screen.getByRole('button', { name: /save quiz/i }));

      await waitFor(() => {
        expect(createQuiz).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'My Quiz', description: 'A test quiz' }),
          'fake-jwt-token'
        );
      });
    });

    it('shows success message after saving', async () => {
      createQuiz.mockResolvedValue({ quiz: { _id: 'q1', title: 'My Quiz', questions: [] } });

      renderComponent();

      await userEvent.type(screen.getByLabelText(/quiz title/i), 'My Quiz');
      await userEvent.click(screen.getByRole('button', { name: /save quiz/i }));

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(/saved successfully/i);
      });
    });

    it('calls onSave callback with quiz data', async () => {
      const savedQuiz = { _id: 'q1', title: 'My Quiz', questions: [] };
      createQuiz.mockResolvedValue({ quiz: savedQuiz });

      renderComponent();

      await userEvent.type(screen.getByLabelText(/quiz title/i), 'My Quiz');
      await userEvent.click(screen.getByRole('button', { name: /save quiz/i }));

      await waitFor(() => {
        expect(DEFAULT_PROPS.onSave).toHaveBeenCalledWith(savedQuiz);
      });
    });

    it('shows error message when save fails', async () => {
      createQuiz.mockRejectedValue({
        response: { data: { error: 'Quiz title is required' } },
      });

      renderComponent();

      await userEvent.type(screen.getByLabelText(/quiz title/i), 'Q');
      await userEvent.click(screen.getByRole('button', { name: /save quiz/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/quiz title is required/i);
      });
    });

    it('shows generic error message when save fails with no response body', async () => {
      createQuiz.mockRejectedValue(new Error('Network Error'));

      renderComponent();

      await userEvent.type(screen.getByLabelText(/quiz title/i), 'Q');
      await userEvent.click(screen.getByRole('button', { name: /save quiz/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/failed to save/i);
      });
    });

    it('disables buttons while saving', async () => {
      let resolve;
      createQuiz.mockReturnValue(new Promise((r) => { resolve = r; }));

      renderComponent();
      await userEvent.type(screen.getByLabelText(/quiz title/i), 'My Quiz');
      await userEvent.click(screen.getByRole('button', { name: /save quiz/i }));

      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /add question/i })).toBeDisabled();

      // Resolve to avoid act() warnings
      resolve({ quiz: { _id: 'q1', title: 'My Quiz', questions: [] } });
      await waitFor(() => expect(createQuiz).toHaveBeenCalled());
    });

    it('sends questions in the payload', async () => {
      createQuiz.mockResolvedValue({ quiz: { _id: 'q1', title: 'Q', questions: [] } });

      renderComponent();
      await userEvent.type(screen.getByLabelText(/quiz title/i), 'Q');

      // Add a short-answer question
      await userEvent.click(screen.getByRole('button', { name: /add question/i }));
      const card = screen.getByTestId('question-card-0');
      const typeSelect = within(card).getByRole('combobox', { name: /question type/i });
      await userEvent.selectOptions(typeSelect, 'short-answer');
      await userEvent.type(within(card).getByRole('textbox', { name: /question text/i }), 'What is AI?');

      await userEvent.click(screen.getByRole('button', { name: /save quiz/i }));

      await waitFor(() => {
        expect(createQuiz).toHaveBeenCalledWith(
          expect.objectContaining({
            questions: expect.arrayContaining([
              expect.objectContaining({ type: 'short-answer', text: 'What is AI?' }),
            ]),
          }),
          'fake-jwt-token'
        );
      });
    });
  });
});
