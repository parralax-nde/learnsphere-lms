import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { verifyEmail } from '../api/auth.js';

const styles = {
  pageOuter: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrapper: {
    width: '100%',
    maxWidth: '440px',
    margin: '0 auto',
    padding: '16px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
    padding: '40px 36px',
    textAlign: 'center',
  },
  logoText: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#3b82f6',
    marginBottom: '24px',
    display: 'block',
  },
  icon: { fontSize: '48px', marginBottom: '16px' },
  title: { fontSize: '20px', fontWeight: '700', marginBottom: '10px' },
  message: { fontSize: '14px', color: '#6b7280', lineHeight: '1.6' },
  successMessage: { fontSize: '14px', color: '#166534', lineHeight: '1.6' },
  errorMessage: { fontSize: '14px', color: '#991b1b', lineHeight: '1.6' },
  spinner: {
    width: '36px',
    height: '36px',
    border: '3px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto 16px',
  },
};

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('No verification token found. Please use the link from your email.');
      return;
    }

    verifyEmail(token)
      .then((data) => {
        setStatus('success');
        setMessage(data.message || 'Your email has been verified.');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(
          err.response?.data?.message ||
            'Verification failed. The link may have expired or already been used.',
        );
      });
  }, [searchParams]);

  return (
    <div style={styles.pageOuter}>
    <div style={styles.wrapper}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={styles.card}>
        <span style={styles.logoText}>LearnSphere</span>

        {status === 'verifying' && (
          <>
            <div style={styles.spinner} aria-label="Loading" />
            <h1 style={styles.title}>Verifying your email…</h1>
            <p style={styles.message}>Please wait a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={styles.icon}>✅</div>
            <h1 style={styles.title}>Email verified!</h1>
            <p style={styles.successMessage}>{message}</p>
            <p style={{ ...styles.message, marginTop: '16px' }}>
              You can now close this tab and log in to LearnSphere.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={styles.icon}>❌</div>
            <h1 style={styles.title}>Verification failed</h1>
            <p style={styles.errorMessage}>{message}</p>
            <p style={{ ...styles.message, marginTop: '16px' }}>
              Please try registering again or contact support.
            </p>
          </>
        )}
      </div>
    </div>
    </div>
  );
}
