import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Tooltip } from '../Tooltip';

export function PrerequisitesStep({ values, errors, onChange }) {
  const [inputValue, setInputValue] = useState('');

  const addPrerequisite = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (values.prerequisites.includes(trimmed)) return;
    onChange('prerequisites', [...values.prerequisites, trimmed]);
    setInputValue('');
  };

  const removePrerequisite = (index) => {
    onChange(
      'prerequisites',
      values.prerequisites.filter((_, i) => i !== index)
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addPrerequisite();
    }
  };

  return (
    <div className="step-content">
      <h2 className="step-heading">Prerequisites</h2>
      <p className="step-subheading">
        List what learners should know or have before starting this course.
      </p>

      <div className="form-field">
        <label className="form-label" htmlFor="prereq-input">
          Add a Prerequisite
          <Tooltip text="List skills, tools, or knowledge learners need before taking this course. Press Enter or click Add after each one. Leave empty if there are none." />
        </label>

        <div className="prereq-input-row">
          <input
            id="prereq-input"
            type="text"
            className="form-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Basic knowledge of HTML and CSS"
            maxLength={150}
          />
          <button
            type="button"
            className="btn btn--secondary btn--icon"
            onClick={addPrerequisite}
            aria-label="Add prerequisite"
          >
            <Plus size={18} />
            Add
          </button>
        </div>

        {errors.prerequisites && (
          <span className="field-error" role="alert">{errors.prerequisites}</span>
        )}

        {values.prerequisites.length === 0 ? (
          <p className="prereq-empty">
            No prerequisites added yet. Leave empty if anyone can take this course.
          </p>
        ) : (
          <ul className="prereq-list" aria-label="Prerequisites list">
            {values.prerequisites.map((item, index) => (
              <li key={index} className="prereq-item">
                <span className="prereq-text">{item}</span>
                <button
                  type="button"
                  className="prereq-remove"
                  onClick={() => removePrerequisite(index)}
                  aria-label={`Remove prerequisite: ${item}`}
                >
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}


