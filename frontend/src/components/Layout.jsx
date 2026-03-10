import { useAuth } from '../contexts/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

const STATUS_COLORS = {
  DRAFT: { bg: '#EDF2F7', color: '#4A5568', label: 'Draft' },
  PENDING_REVIEW: { bg: '#FEFCBF', color: '#744210', label: 'Pending Review' },
  PUBLISHED: { bg: '#C6F6D5', color: '#22543D', label: 'Published' },
  REJECTED: { bg: '#FED7D7', color: '#742A2A', label: 'Rejected' },
};

export function StatusBadge({ status }) {
  const cfg = STATUS_COLORS[status] || STATUS_COLORS.DRAFT;
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}

export function Layout({ title, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <nav style={{
        background: '#5a4fcf', color: '#fff',
        padding: '0 2rem', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <span style={{ fontWeight: 800, fontSize: 20, cursor: 'pointer' }}
            onClick={() => navigate(user?.role === 'ADMIN' ? '/admin' : '/instructor')}>
            📚 LearnSphere
          </span>
          {title && (
            <>
              <span style={{ opacity: .5 }}>›</span>
              <span style={{ fontWeight: 600, fontSize: 15 }}>{title}</span>
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: 14, opacity: .9 }}>
            {user?.name} ({user?.role})
          </span>
          <button onClick={handleLogout} style={{
            background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)',
            color: '#fff', padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
          }}>
            Sign Out
          </button>
        </div>
      </nav>

      {/* Content */}
      <main style={{ flex: 1, padding: '2rem', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        {children}
      </main>
    </div>
  );
}
