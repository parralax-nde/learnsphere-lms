import { Tooltip } from '../Tooltip';

const CATEGORIES = [
  'Development',
  'Business',
  'Finance & Accounting',
  'IT & Software',
  'Office Productivity',
  'Personal Development',
  'Design',
  'Marketing',
  'Lifestyle',
  'Photography & Video',
  'Health & Fitness',
  'Music',
  'Teaching & Academics',
];

const DIFFICULTIES = [
  { value: 'beginner', label: 'Beginner', description: 'No prior knowledge required' },
  { value: 'intermediate', label: 'Intermediate', description: 'Some experience helpful' },
  { value: 'advanced', label: 'Advanced', description: 'In-depth expertise expected' },
  { value: 'all_levels', label: 'All Levels', description: 'Suitable for everyone' },
];

export function BasicInfoStep({ values, errors, onChange }) {
  return (
    <div className="step-content">
      <h2 className="step-heading">Basic Information</h2>
      <p className="step-subheading">Give your course a clear, compelling identity.</p>

      {/* Title */}
      <div className="form-field">
        <label className="form-label" htmlFor="title">
          Course Title
          <Tooltip text="A concise, attention-grabbing title (5–120 characters). Tip: include the main skill or outcome." />
          <span className="required-mark" aria-hidden="true">*</span>
        </label>
        <input
          id="title"
          type="text"
          className={`form-input ${errors.title ? 'input-error' : ''}`}
          value={values.title}
          onChange={(e) => onChange('title', e.target.value)}
          placeholder="e.g. Complete Python Bootcamp: From Zero to Hero"
          maxLength={120}
          aria-required="true"
          aria-describedby={errors.title ? 'title-error' : undefined}
        />
        <div className="input-meta">
          {errors.title && <span id="title-error" className="field-error" role="alert">{errors.title}</span>}
          <span className="char-count">{values.title.length}/120</span>
        </div>
      </div>

      {/* Category */}
      <div className="form-field">
        <label className="form-label" htmlFor="category">
          Category
          <Tooltip text="Choose the category that best describes your course content. This helps learners discover it." />
          <span className="required-mark" aria-hidden="true">*</span>
        </label>
        <select
          id="category"
          className={`form-select ${errors.category ? 'input-error' : ''}`}
          value={values.category}
          onChange={(e) => onChange('category', e.target.value)}
          aria-required="true"
          aria-describedby={errors.category ? 'category-error' : undefined}
        >
          <option value="">— Select a category —</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        {errors.category && (
          <span id="category-error" className="field-error" role="alert">{errors.category}</span>
        )}
      </div>

      {/* Difficulty */}
      <div className="form-field">
        <label className="form-label">
          Difficulty Level
          <Tooltip text="Select the experience level required. This sets learner expectations before they enroll." />
          <span className="required-mark" aria-hidden="true">*</span>
        </label>
        <div className="difficulty-grid" role="radiogroup" aria-label="Difficulty level">
          {DIFFICULTIES.map(({ value, label, description }) => (
            <label
              key={value}
              className={`difficulty-card ${values.difficulty === value ? 'difficulty-card--selected' : ''}`}
            >
              <input
                type="radio"
                name="difficulty"
                value={value}
                checked={values.difficulty === value}
                onChange={() => onChange('difficulty', value)}
                className="sr-only"
              />
              <span className="difficulty-label">{label}</span>
              <span className="difficulty-desc">{description}</span>
            </label>
          ))}
        </div>
        {errors.difficulty && (
          <span className="field-error" role="alert">{errors.difficulty}</span>
        )}
      </div>
    </div>
  );
}


