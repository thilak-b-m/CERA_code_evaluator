import { notificationsData } from '../data/facultyMockData.js';

const READ_STORAGE_KEY = 'cera-notification-read';
const DISMISSED_STORAGE_KEY = 'cera-notification-dismissed';

function readStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (error) {
    console.error(`Error reading ${key}:`, error);
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error writing ${key}:`, error);
    return false;
  }
}

function getReadIds() {
  return readStorage(READ_STORAGE_KEY, []);
}

function getDismissedIds() {
  return readStorage(DISMISSED_STORAGE_KEY, []);
}

function getNotifications() {
  const readIds = getReadIds();
  const dismissedIds = getDismissedIds();

  return notificationsData
    .filter(
      (notification) =>
        !dismissedIds.includes(notification.id)
    )
    .map((notification) => ({
      ...notification,
      read: readIds.includes(notification.id),
    }));
}

function markAsRead(id) {
  const readIds = getReadIds();

  if (!readIds.includes(id)) {
    readIds.push(id);
    writeStorage(READ_STORAGE_KEY, readIds);
  }

  return getNotifications();
}

function markAllAsRead() {
  const dismissedIds = getDismissedIds();

  const allIds = notificationsData
    .filter(
      (notification) =>
        !dismissedIds.includes(notification.id)
    )
    .map((notification) => notification.id);

  writeStorage(READ_STORAGE_KEY, allIds);

  return getNotifications();
}

function dismiss(id) {
  const dismissedIds = getDismissedIds();

  if (!dismissedIds.includes(id)) {
    dismissedIds.push(id);
    writeStorage(
      DISMISSED_STORAGE_KEY,
      dismissedIds
    );
  }

  return getNotifications();
}

function getUnreadCount() {
  return getNotifications().filter(
    (notification) => !notification.read
  ).length;
}

export const notificationService = {
  list: async () => getNotifications(),

  getUnreadCount: async () =>
    getUnreadCount(),

  markRead: async (id) =>
    markAsRead(id),

  markAllAsRead: async () =>
    markAllAsRead(),

  dismiss: async (id) =>
    dismiss(id),
};