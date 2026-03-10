/**
 * StatusBadge — displays a coloured pill representing a course's publication status.
 *
 * Statuses:
 *  DRAFT          — grey
 *  PENDING_REVIEW — amber
 *  PUBLISHED      — green
 *  REJECTED       — red
 */
const STATUS_CONFIG = {
  DRAFT: { label: 'Draft', bg: '#f3f4f6', color: '#374151', border: '#d1d5db' },
  PENDING_REVIEW: { label: 'Pending Review', bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
  PUBLISHED: { label: 'Published', bg: '#dcfce7', color: '#166534', border: '#86efac' },
  REJECTED: { label: 'Rejected', bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
};

export default function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        backgroundColor: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        letterSpacing: '0.02em',
      }}
    >
      {cfg.label}
    </span>
  );
}
