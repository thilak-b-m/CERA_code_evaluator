import { Router } from 'express';
import { authenticate, requireFaculty, requireStudent } from '../auth/auth.middleware.js';
import {
  getFacultyAnalyticsOverview,
  getStudentLeaderboardData,
} from './analytics.controller.js';

const router = Router();

router.use(authenticate);
router.get('/faculty/overview', requireFaculty, getFacultyAnalyticsOverview);
router.get('/student/leaderboard', requireStudent, getStudentLeaderboardData);

export default router;
