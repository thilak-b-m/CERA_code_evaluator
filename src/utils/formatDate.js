export function formatDate(value, options = {}) {
  const date = value instanceof Date ? value : new Date(value);
  if (!value || !Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options,
  }).format(date);
}

export function formatDateTime(value) {
  return formatDate(value, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatTimeAgo(timestamp) {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now - past;
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  const diffD = Math.floor(diffH / 24);

  if (diffD > 0) return `${diffD}d ago`;
  if (diffH > 0) return `${diffH}h ago`;
  const diffM = Math.floor(diffMs / (1000 * 60));
  return diffM > 0 ? `${diffM}m ago` : 'Just now';
}

export default formatDate;