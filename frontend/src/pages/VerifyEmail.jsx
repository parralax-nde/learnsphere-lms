import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { verifyEmail } from '../api/auth.js';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the URL.');
      return;
    }
    verifyEmail(token)
      .then(({ data }) => {
        setStatus('success');
        setMessage(data.message);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification failed.');
      });
  }, [searchParams]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'linear-gradient(135deg, #eff6ff, #f0fdf4)' }}>
      <div style={{ maxWidth: 400, width: '100%', background: '#fff', borderRadius: 12, padding: 40, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textAlign: 'center' }}>
        {status === 'loading' && <p>Verifying your email…</p>}
        {status === 'success' && (
          <>
            <div className="alert alert-success">{message}</div>
            <p style={{ marginTop: 16 }}><Link to="/login">Sign in</Link></p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="alert alert-error">{message}</div>
            <p style={{ marginTop: 16 }}><Link to="/register">Register again</Link></p>
          </>
        )}
      </div>
    </div>
  );
}
