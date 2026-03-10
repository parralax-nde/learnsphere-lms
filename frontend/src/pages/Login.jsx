import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../api/auth.js';

const styles = {
  wrapper: { width: '100%', maxWidth: '440px', margin: '0 auto', padding: '16px' },
  card: { backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', padding: '40px 36px' },
  logoRow: { textAlign: 'center', marginBottom: '8px' },
  logoText: { fontSize: '24px', fontWeight: '700', color: '#3b82f6' },
  heading: { fontSize: '22px', fontWeight: '700', textAlign: 'center', marginBottom: '6px' },
  subheading: { fontSize: '14px', color: '#6b7280', textAlign: 'center', marginBottom: '28px' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '14px', fontWeight: '600', color: '#374151' },
  input: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '15px', outline: 'none' },
  inputError: { border: '1px solid #ef4444' },
  fieldError: { fontSize: '13px', color: '#ef4444' },
  submitBtn: {
    padding: '11px', backgroundColor: '#3b82f6', color: '#fff', border: 'none',
    borderRadius: '6px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginTop: '4px',
  },
  submitBtnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  errorBox: {
    backgroundColor: '#fee2e2', border: '1px solid #fca5a5',
    borderRadius: '6px', padding: '10px 12px', fontSize: '14px', color: '#991b1b',
  },
  footer: { marginTop: '20px', textAlign: 'center', fontSize: '14px', color: '#6b7280' },
};

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { accessToken, user } = await loginUser(email, password);
      sessionStorage.setItem('accessToken', accessToken);
      sessionStorage.setItem('user', JSON.stringify(user));

      // Redirect based on role
      if (user.role === 'ADMIN') {
        navigate('/admin/review');
      } else {
        navigate('/courses');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.logoRow}><span style={styles.logoText}>LearnSphere</span></div>
        <h1 style={styles.heading}>Sign in to your account</h1>
        <p style={styles.subheading}>Welcome back!</p>
        <form onSubmit={handleSubmit} noValidate style={styles.form}>
          {error && <div role="alert" style={styles.errorBox}>{error}</div>}
          <div style={styles.fieldGroup}>
            <label htmlFor="email" style={styles.label}>Email address</label>
            <input
              id="email" type="email" autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input} placeholder="you@example.com" disabled={loading} required
            />
          </div>
          <div style={styles.fieldGroup}>
            <label htmlFor="password" style={styles.label}>Password</label>
            <input
              id="password" type="password" autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input} placeholder="Your password" disabled={loading} required
            />
          </div>
          <button type="submit" disabled={loading} style={{ ...styles.submitBtn, ...(loading ? styles.submitBtnDisabled : {}) }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p style={styles.footer}>
          Don&apos;t have an account? <a href="/register">Register</a>
        </p>
      </div>
    </div>
  );
}
