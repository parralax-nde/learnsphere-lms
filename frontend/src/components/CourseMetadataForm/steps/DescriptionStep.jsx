import { Tooltip } from '../Tooltip';

export function DescriptionStep({ values, errors, onChange }) {
  return (
    <div className="step-content">
      <h2 className="step-heading">Course Description</h2>
      <p className="step-subheading">
        Help learners understand what they will gain from your course.
      </p>

      {/* Short description */}
      <div className="form-field">
        <label className="form-label" htmlFor="shortDescription">
          Short Description
          <Tooltip text="A punchy, one-to-two sentence summary shown on course cards and search results (20–200 characters)." />
          <span className="required-mark" aria-hidden="true">*</span>
        </label>
        <textarea
          id="shortDescription"
          className={`form-textarea form-textarea--short ${errors.shortDescription ? 'input-error' : ''}`}
          rows={2}
          value={values.shortDescription}
          onChange={(e) => onChange('shortDescription', e.target.value)}
          placeholder="e.g. Master Python from scratch with hands-on projects and real-world applications."
          maxLength={200}
          aria-required="true"
          aria-describedby={errors.shortDescription ? 'short-desc-error' : undefined}
        />
        <div className="input-meta">
          {errors.shortDescription && (
            <span id="short-desc-error" className="field-error" role="alert">
              {errors.shortDescription}
            </span>
          )}
          <span className="char-count">{values.shortDescription.length}/200</span>
        </div>
      </div>

      {/* Full description */}
      <div className="form-field">
        <label className="form-label" htmlFor="fullDescription">
          Full Description
          <Tooltip text="Provide a detailed overview covering what learners will learn, who it's for, and what makes your course unique. Minimum 50 characters." />
          <span className="required-mark" aria-hidden="true">*</span>
        </label>
        <textarea
          id="fullDescription"
          className={`form-textarea ${errors.fullDescription ? 'input-error' : ''}`}
          rows={8}
          value={values.fullDescription}
          onChange={(e) => onChange('fullDescription', e.target.value)}
          placeholder="Describe your course in detail. What will learners be able to do after completing it? Who is this course for? What makes it special?"
          aria-required="true"
          aria-describedby={errors.fullDescription ? 'full-desc-error' : undefined}
        />
        <div className="input-meta">
          {errors.fullDescription && (
            <span id="full-desc-error" className="field-error" role="alert">
              {errors.fullDescription}
            </span>
          )}
          <span className="char-count">{values.fullDescription.length} chars</span>
        </div>
      </div>
    </div>
  );
}


