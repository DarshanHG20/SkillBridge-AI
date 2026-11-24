import React from 'react';

export function StatusBadge({ status, label = null }) {
  const normalized = (status || '').toLowerCase();
  let badgeClass = 'badge-secondary';
  let displayLabel = label || status;

  switch (normalized) {
    case 'mastered':
    case 'passed':
    case 'completed':
    case 'healthy':
    case 'resolved':
      badgeClass = 'badge-success';
      break;
    case 'in_progress':
    case 'unlocked':
    case 'reviewed':
    case 'intermediate':
      badgeClass = 'badge-primary';
      break;
    case 'locked':
    case 'beginner':
    case 'pending':
      badgeClass = 'badge-warning';
      break;
    case 'failed':
    case 'advanced':
    case 'expert':
    case 'security_violation':
    case 'degraded':
      badgeClass = 'badge-danger';
      break;
    default:
      badgeClass = 'badge-secondary';
  }

  return <span className={`badge ${badgeClass}`}>{displayLabel}</span>;
}

export function ProgressBar({ percentage, color = null, height = 8 }) {
  const safePct = Math.max(0, Math.min(100, Math.round(percentage || 0)));
  const barStyle = {
    width: `${safePct}%`,
    height: `${height}px`,
    ...(color ? { background: color } : {}),
  };

  return (
    <div className="progress-container" style={{ height: `${height}px` }}>
      <div className="progress-bar" style={barStyle} />
    </div>
  );
}

StatusBadge.ProgressBar = ProgressBar;
export default StatusBadge;

