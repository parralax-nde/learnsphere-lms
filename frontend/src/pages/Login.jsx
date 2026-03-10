import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../api/auth.js';
import { useAuth } from '../contexts/AuthContext.jsx';

const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '2.5rem',
    width: '100%',
    maxWidth: 420,
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  logo: { textAlign: 'center', marginBottom: '1.5rem' },
  logoText: { fontSize: 28, fontWeight: 800, color: '#5a4fcf' },
  tagline: { fontSize: 13, color: '#718096', marginTop: 4 },
  tabs: { display: 'flex', gap: 4, marginBottom: '1.5rem', background: '#f4f4f8', borderRadius: 8, padding: 4 },
  tab: (active) => ({
    flex: 1, padding: '8px 0', border: 'none', borderRadius: 6,
    background: active ? '#5a4fcf' : 'transparent',
    color: active ? '#fff' : '#718096',
    fontWeight: 600, fontSize: 14, cursor: 'pointer',
    transition: 'all .2s',
  }),
  field: { marginBottom: '1rem' },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 4 },
  input: {
    width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0',
    borderRadius: 8, fontSize: 14, outline: 'none',
    transition: 'border-color .2s',
  },
  select: {
    width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0',
    borderRadius: 8, fontSize: 14, outline: 'none', background: '#fff',
  },
  btn: {
    width: '100%', padding: '12px', background: '#5a4fcf', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700,
    cursor: 'pointer', marginTop: '0.5rem',
  },
  error: {
    background: '#fff5f5', border: '1px solid #feb2b2', color: '#c53030',
    padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: '1rem',
  },
};

export default function Login() {
  const { saveAuth } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'INSTRUCTOR' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let result;
      if (tab === 'login') {
        result = await login(form.email, form.password);
      } else {
        result = await register(form.email, form.password, form.name, form.role);
      }
      saveAuth(result.token, result.user);
      navigate(result.user.role === 'ADMIN' ? '/admin' : '/instructor');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          <div style={s.logoText}>📚 LearnSphere</div>
          <div style={s.tagline}>Learning Management System</div>
        </div>

        <div style={s.tabs}>
          <button style={s.tab(tab === 'login')} onClick={() => setTab('login')}>Sign In</button>
          <button style={s.tab(tab === 'register')} onClick={() => setTab('register')}>Register</button>
        </div>

        {error && <div style={s.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {tab === 'register' && (
            <>
              <div style={s.field}>
                <label style={s.label}>Full Name</label>
                <input style={s.input} value={form.name} onChange={set('name')} placeholder="Jane Smith" required />
              </div>
              <div style={s.field}>
                <label style={s.label}>Role</label>
                <select style={s.select} value={form.role} onChange={set('role')}>
                  <option value="INSTRUCTOR">Instructor</option>
                  <option value="ADMIN">Administrator</option>
                  <option value="STUDENT">Student</option>
                </select>
              </div>
            </>
          )}
          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input style={s.input} type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required />
          </div>
          <div style={s.field}>
            <label style={s.label}>Password</label>
            <input style={s.input} type="password" value={form.password} onChange={set('password')} placeholder="••••••••" required />
          </div>
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Please wait…' : tab === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
