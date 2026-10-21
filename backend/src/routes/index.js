import { Router } from 'express';
import healthRoutes from '../modules/health/health.routes.js';
import authRoutes from '../modules/auth/auth.routes.js';
import studentRoutes from '../modules/students/students.routes.js';
import assignmentRoutes from '../modules/assignments/assignments.routes.js';
import submissionRoutes from '../modules/submissions/submissions.routes.js';
import evaluationRoutes from '../modules/evaluations/evaluations.routes.js';
import analyticsRoutes from '../modules/analytics/analytics.routes.js';
import notificationRoutes from '../modules/notifications/notifications.routes.js';
import reportRoutes from '../modules/reports/reports.routes.js';
import liveLabRoutes from '../modules/live-lab/live-lab.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/students', studentRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/submissions', submissionRoutes);
router.use('/evaluations', evaluationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reports', reportRoutes);
router.use('/live-lab', liveLabRoutes);

export default router;