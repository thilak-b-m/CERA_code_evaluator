import { getDatabase } from '../../config/database.js';
import {
  dismissNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './notifications.service.js';

export async function getNotifications(request, response, next) {
  try {
    const notifications = await listNotifications(getDatabase(), request.user);
    response.json({ notifications });
  } catch (error) {
    next(error);
  }
}

export async function readNotification(request, response, next) {
  try {
    const notifications = await markNotificationRead(
      getDatabase(),
      request.user,
      request.params.id,
    );
    response.json({ notifications });
  } catch (error) {
    next(error);
  }
}

export async function readAllNotifications(request, response, next) {
  try {
    const notifications = await markAllNotificationsRead(getDatabase(), request.user);
    response.json({ notifications });
  } catch (error) {
    next(error);
  }
}

export async function dismissNotificationById(request, response, next) {
  try {
    const notifications = await dismissNotification(
      getDatabase(),
      request.user,
      request.params.id,
    );
    response.json({ notifications });
  } catch (error) {
    next(error);
  }
}
