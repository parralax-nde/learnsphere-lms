import { useState } from 'react';
import RegisterForm from '../components/auth/RegisterForm.jsx';

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
  },
  logoRow: {
    textAlign: 'center',
    marginBottom: '8px',
  },
  logoText: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#3b82f6',
  },
  heading: {
    fontSize: '22px',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: '6px',
  },
  subheading: {
    fontSize: '14px',
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: '28px',
  },
  successBox: {
    backgroundColor: '#dcfce7',
    border: '1px solid #86efac',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center',
  },
  successIcon: {
    fontSize: '40px',
    marginBottom: '12px',
  },
  successTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#166534',
    marginBottom: '8px',
  },
  successText: {
    fontSize: '14px',
    color: '#166534',
    lineHeight: '1.5',
  },
};

export default function Register() {
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  function handleSuccess(result) {
    setRegisteredEmail(result.email || '');
    setRegistered(true);
  }

  return (
    <div style={styles.pageOuter}>
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.logoRow}>
          <span style={styles.logoText}>LearnSphere</span>
        </div>

        {registered ? (
          <div style={styles.successBox} role="status">
            <div style={styles.successIcon}>✉️</div>
            <p style={styles.successTitle}>Check your inbox!</p>
            <p style={styles.successText}>
              We&apos;ve sent a verification link to{' '}
              <strong>{registeredEmail}</strong>.
              <br />
              Click the link to activate your account.
            </p>
          </div>
        ) : (
          <>
            <h1 style={styles.heading}>Create your account</h1>
            <p style={styles.subheading}>
              Join LearnSphere and start learning today.
            </p>
            <RegisterForm onSuccess={handleSuccess} />
          </>
        )}
      </div>
    </div>
    </div>
  );
}
