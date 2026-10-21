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

export default formatDate;