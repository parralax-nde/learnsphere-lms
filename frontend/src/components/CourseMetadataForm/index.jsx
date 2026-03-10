import { useState, useCallback } from 'react';
import axios from 'axios';
import { CheckCircle2, ChevronLeft, ChevronRight, Save, Send } from 'lucide-react';
import { BasicInfoStep } from './steps/BasicInfoStep';
import { DescriptionStep } from './steps/DescriptionStep';
import { PrerequisitesStep } from './steps/PrerequisitesStep';
import { CoverImageStep } from './steps/CoverImageStep';
import { useAuth } from '../../contexts/AuthContext';
import './CourseMetadataForm.css';

// ─── Step definitions ────────────────────────────────────────────────────────

const STEPS = [
  { id: 'basic', label: 'Basic Info' },
  { id: 'description', label: 'Description' },
  { id: 'prerequisites', label: 'Prerequisites' },
  { id: 'cover', label: 'Cover Image' },
];

// ─── Validation ──────────────────────────────────────────────────────────────

function validateStep(stepIndex, values) {
  const errors = {};

  if (stepIndex === 0) {
    if (!values.title.trim()) {
      errors.title = 'Course title is required.';
    } else if (values.title.trim().length < 5) {
      errors.title = 'Title must be at least 5 characters.';
    } else if (values.title.trim().length > 120) {
      errors.title = 'Title must be at most 120 characters.';
    }

    if (!values.category) {
      errors.category = 'Please select a category.';
    }

    if (!values.difficulty) {
      errors.difficulty = 'Please select a difficulty level.';
    }
  }

  if (stepIndex === 1) {
    if (!values.shortDescription.trim()) {
      errors.shortDescription = 'Short description is required.';
    } else if (values.shortDescription.trim().length < 20) {
      errors.shortDescription = 'Short description must be at least 20 characters.';
    } else if (values.shortDescription.trim().length > 200) {
      errors.shortDescription = 'Short description must be at most 200 characters.';
    }

    if (!values.fullDescription.trim()) {
      errors.fullDescription = 'Full description is required.';
    } else if (values.fullDescription.trim().length < 50) {
      errors.fullDescription = 'Full description must be at least 50 characters.';
    }
  }

  // Step 2 (prerequisites) has no required fields

  if (stepIndex === 3) {
    if (values._coverImageFileError) {
      errors.coverImageUrl = values._coverImageFileError;
    }
    // cover image is optional, but if provided must look like a URL or data URL
    if (
      values.coverImageUrl &&
      !values.coverImageUrl.startsWith('data:') &&
      !/^https?:\/\/.+\..+/.test(values.coverImageUrl)
    ) {
      errors.coverImageUrl = 'Please enter a valid image URL (must start with http:// or https://).';
    }
  }

  return errors;
}

function validateAll(values) {
  let allErrors = {};
  for (let i = 0; i < STEPS.length; i++) {
    allErrors = { ...allErrors, ...validateStep(i, values) };
  }
  return allErrors;
}

// ─── Component ───────────────────────────────────────────────────────────────

const INITIAL_VALUES = {
  title: '',
  category: '',
  difficulty: 'beginner',
  shortDescription: '',
  fullDescription: '',
  prerequisites: [],
  coverImageUrl: '',
  _coverImageFileError: '',
};

/**
 * CourseMetadataForm
 *
 * A multi-step wizard that lets instructors define core course metadata:
 * title, description, category, difficulty, prerequisites, and cover image.
 *
 * Props:
 *  - courseId: string | null — if set, the form edits an existing course
 *  - initialValues: object | null — pre-populate form fields
 *  - onSuccess: (course) => void — called after a successful save/publish
 */
export function CourseMetadataForm({ courseId, initialValues, onSuccess }) {
  const { accessToken } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [values, setValues] = useState({ ...INITIAL_VALUES, ...initialValues });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [apiError, setApiError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleChange = useCallback((field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Clear error for the field when user starts editing
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setDraftSaved(false);
    setSuccessMessage('');
    setApiError('');
  }, []);

  const goToStep = (step) => {
    // Validate current step before advancing
    if (step > currentStep) {
      const stepErrors = validateStep(currentStep, values);
      if (Object.keys(stepErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...stepErrors }));
        return;
      }
    }
    setCurrentStep(step);
    setErrors({});
  };

  const handleNext = () => goToStep(currentStep + 1);
  const handleBack = () => setCurrentStep((prev) => Math.max(0, prev - 1));

  // ─── API calls ────────────────────────────────────────────────────────────

  const buildPayload = (status) => ({
    title: values.title.trim(),
    shortDescription: values.shortDescription.trim(),
    fullDescription: values.fullDescription.trim(),
    category: values.category,
    difficulty: values.difficulty,
    prerequisites: values.prerequisites,
    coverImageUrl: values.coverImageUrl.startsWith('data:') ? '' : values.coverImageUrl.trim(),
    status,
  });

  const saveCourse = async (status) => {
    const allErrors = validateAll(values);
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      // Jump to the first step that has errors
      for (let i = 0; i < STEPS.length; i++) {
        const stepErrors = validateStep(i, values);
        if (Object.keys(stepErrors).length > 0) {
          setCurrentStep(i);
          break;
        }
      }
      return;
    }

    setSaving(true);
    setApiError('');
    setSuccessMessage('');

    try {
      const payload = buildPayload(status);
      const headers = { Authorization: `Bearer ${accessToken}` };
      let response;

      if (courseId) {
        response = await axios.put(`/api/instructor/courses/${courseId}`, payload, { headers });
      } else {
        response = await axios.post('/api/instructor/courses', payload, { headers });
      }

      if (status === 'draft') {
        setDraftSaved(true);
        setSuccessMessage('Draft saved successfully!');
      } else {
        setSuccessMessage('Course published successfully!');
      }

      if (onSuccess) onSuccess(response.data);
    } catch (err) {
      const msg = err.response?.data?.error || 'An error occurred. Please try again.';
      setApiError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = () => saveCourse('draft');
  const handlePublish = () => saveCourse('published');

  // ─── Render ───────────────────────────────────────────────────────────────

  const isLastStep = currentStep === STEPS.length - 1;

  const stepComponents = [
    <BasicInfoStep key="basic" values={values} errors={errors} onChange={handleChange} />,
    <DescriptionStep key="description" values={values} errors={errors} onChange={handleChange} />,
    <PrerequisitesStep key="prerequisites" values={values} errors={errors} onChange={handleChange} />,
    <CoverImageStep key="cover" values={values} errors={errors} onChange={handleChange} />,
  ];

  return (
    <div className="cmf-wrapper">
      {/* ── Step indicator ── */}
      <nav className="cmf-stepper" aria-label="Form progress">
        {STEPS.map((step, index) => {
          const isDone = index < currentStep;
          const isActive = index === currentStep;
          return (
            <button
              key={step.id}
              type="button"
              className={`cmf-step ${isActive ? 'cmf-step--active' : ''} ${isDone ? 'cmf-step--done' : ''}`}
              onClick={() => goToStep(index)}
              aria-current={isActive ? 'step' : undefined}
              aria-label={`Step ${index + 1}: ${step.label}${isDone ? ' (completed)' : ''}`}
            >
              <span className="cmf-step-number" aria-hidden="true">
                {isDone ? <CheckCircle2 size={18} /> : index + 1}
              </span>
              <span className="cmf-step-label">{step.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Status messages ── */}
      {apiError && (
        <div className="cmf-alert cmf-alert--error" role="alert">
          {apiError}
        </div>
      )}
      {successMessage && !apiError && (
        <div className="cmf-alert cmf-alert--success" role="status">
          <CheckCircle2 size={18} />
          {successMessage}
        </div>
      )}

      {/* ── Step content ── */}
      <div className="cmf-body">
        {stepComponents[currentStep]}
      </div>

      {/* ── Navigation footer ── */}
      <div className="cmf-footer">
        <div className="cmf-footer-left">
          {currentStep > 0 && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={handleBack}
              disabled={saving}
            >
              <ChevronLeft size={18} />
              Back
            </button>
          )}
        </div>

        <div className="cmf-footer-right">
          <button
            type="button"
            className={`btn btn--outline ${draftSaved ? 'btn--saved' : ''}`}
            onClick={handleSaveDraft}
            disabled={saving}
            aria-label="Save as draft"
          >
            <Save size={18} />
            {saving ? 'Saving…' : draftSaved ? 'Saved!' : 'Save Draft'}
          </button>

          {isLastStep ? (
            <button
              type="button"
              className="btn btn--primary"
              onClick={handlePublish}
              disabled={saving}
            >
              <Send size={18} />
              {saving ? 'Publishing…' : 'Publish Course'}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleNext}
              disabled={saving}
            >
              Next
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


