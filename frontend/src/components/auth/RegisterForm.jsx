import { useState } from 'react';
import { registerUser } from '../../api/auth.js';
import { usePasswordStrength } from '../../hooks/usePasswordStrength.js';

const styles = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  inputError: {
    border: '1px solid #ef4444',
  },
  fieldError: {
    fontSize: '13px',
    color: '#ef4444',
  },
  strengthBar: {
    height: '4px',
    borderRadius: '2px',
    marginTop: '6px',
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  strengthFill: (color, score) => ({
    height: '100%',
    width: `${(score / 5) * 100}%`,
    backgroundColor: color,
    transition: 'width 0.2s, background-color 0.2s',
  }),
  strengthLabel: (color) => ({
    fontSize: '12px',
    color,
    marginTop: '2px',
  }),
  checkList: {
    listStyle: 'none',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '2px',
    marginTop: '6px',
  },
  checkItem: (passed) => ({
    fontSize: '12px',
    color: passed ? '#16a34a' : '#6b7280',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  }),
  submitBtn: {
    padding: '11px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '4px',
  },
  submitBtnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fca5a5',
    borderRadius: '6px',
    padding: '10px 12px',
    fontSize: '14px',
    color: '#991b1b',
  },
};

/**
 * Registration form — collects email and password, validates client-side,
 * then submits to the backend registration endpoint.
 *
 * @param {function} onSuccess - called with the API response after successful registration
 */
export default function RegisterForm({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const { score, label, color, checks } = usePasswordStrength(password);

  function validateClient() {
    const errs = {};
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) errs.email = 'Email is required.';
    else if (!emailRe.test(email)) errs.email = 'Please enter a valid email address.';

    if (!password) errs.password = 'Password is required.';
    else if (score < 5) errs.password = 'Password does not meet all strength requirements.';

    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');
    const errs = validateClient();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const result = await registerUser(email, password);
      onSuccess({ ...result, email });
    } catch (err) {
      if (err.response?.data?.errors) {
        // Map backend field errors
        const mapped = {};
        err.response.data.errors.forEach(({ field, message }) => {
          mapped[field] = message;
        });
        setFieldErrors(mapped);
      } else {
        setServerError(err.response?.data?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  const requirementChecks = [
    { key: 'length', label: '8+ characters' },
    { key: 'uppercase', label: 'Uppercase letter' },
    { key: 'lowercase', label: 'Lowercase letter' },
    { key: 'number', label: 'Number' },
    { key: 'special', label: 'Special character' },
  ];

  return (
    <form onSubmit={handleSubmit} noValidate style={styles.form}>
      {serverError && (
        <div role="alert" style={styles.errorBox}>
          {serverError}
        </div>
      )}

      {/* Email */}
      <div style={styles.fieldGroup}>
        <label htmlFor="email" style={styles.label}>Email address</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: '' })); }}
          style={{ ...styles.input, ...(fieldErrors.email ? styles.inputError : {}) }}
          placeholder="you@example.com"
          disabled={loading}
        />
        {fieldErrors.email && (
          <span role="alert" style={styles.fieldError}>{fieldErrors.email}</span>
        )}
      </div>

      {/* Password */}
      <div style={styles.fieldGroup}>
        <label htmlFor="password" style={styles.label}>Password</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: '' })); }}
          style={{ ...styles.input, ...(fieldErrors.password ? styles.inputError : {}) }}
          placeholder="Create a strong password"
          disabled={loading}
        />
        {password && (
          <>
            <div style={styles.strengthBar}>
              <div style={styles.strengthFill(color, score)} />
            </div>
            <span style={styles.strengthLabel(color)}>{label}</span>
            <ul style={styles.checkList}>
              {requirementChecks.map(({ key, label: reqLabel }) => (
                <li key={key} style={styles.checkItem(checks[key])}>
                  {checks[key] ? '✓' : '○'} {reqLabel}
                </li>
              ))}
            </ul>
          </>
        )}
        {fieldErrors.password && (
          <span role="alert" style={styles.fieldError}>{fieldErrors.password}</span>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          ...styles.submitBtn,
          ...(loading ? styles.submitBtnDisabled : {}),
        }}
      >
        {loading ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}
