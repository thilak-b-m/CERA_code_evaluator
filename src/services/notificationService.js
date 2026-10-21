import { api } from './api.js';

async function requestNotifications(path, token, options = {}) {
  const result = await api.request(path, { ...options, token });
  return result.notifications;
}

export const notificationService = {
  list: (token) => requestNotifications('/api/notifications', token),
  markRead: (id, token) => requestNotifications(
    `/api/notifications/${encodeURIComponent(id)}/read`,
    token,
    { method: 'PATCH' },
  ),
  markAllAsRead: (token) => requestNotifications(
    '/api/notifications/read-all',
    token,
    { method: 'PATCH' },
  ),
  dismiss: (id, token) => requestNotifications(
    `/api/notifications/${encodeURIComponent(id)}`,
    token,
    { method: 'DELETE' },
  ),
};
