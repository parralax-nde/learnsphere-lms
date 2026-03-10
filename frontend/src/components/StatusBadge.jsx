const STATUS_STYLES = {
  DRAFT: { bg: '#e2e8f0', color: '#475569', label: 'Draft' },
  PENDING_REVIEW: { bg: '#fef3c7', color: '#92400e', label: 'Pending Review' },
  PUBLISHED: { bg: '#dcfce7', color: '#15803d', label: 'Published' },
  REJECTED: { bg: '#fee2e2', color: '#b91c1c', label: 'Rejected' },
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.DRAFT;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        background: style.bg,
        color: style.color,
      }}
    >
      {style.label}
    </span>
  );
}
