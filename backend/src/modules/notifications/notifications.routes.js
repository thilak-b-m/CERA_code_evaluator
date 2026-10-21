import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware.js';
import {
  dismissNotificationById,
  getNotifications,
  readAllNotifications,
  readNotification,
} from './notifications.controller.js';

const router = Router();

router.use(authenticate);
router.get('/', getNotifications);
router.patch('/read-all', readAllNotifications);
router.patch('/:id/read', readNotification);
router.delete('/:id', dismissNotificationById);

export default router;
