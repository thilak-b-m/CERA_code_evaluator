import { Router } from 'express';
import { authenticate, requireFaculty, requireStudent } from '../auth/auth.middleware.js';
import {
  getLiveLabSessions,
  getSecureAssessmentActivity,
  getSecureAssessmentSessions,
  getCurrentSecureAssessment,
  startSecureAssessmentAttempt,
  recordSecureAssessmentActivity,
  endSecureAssessmentAttempt,
  sendLiveLabHeartbeat,
  stopLiveLabSession,
} from './live-lab.controller.js';

const router = Router();

router.use(authenticate);
router.get('/sessions', requireFaculty, getLiveLabSessions);
router.post('/heartbeat', requireStudent, sendLiveLabHeartbeat);
router.delete('/sessions/:assignmentId', requireStudent, stopLiveLabSession);
router.get('/secure-assessments/sessions', requireFaculty, getSecureAssessmentSessions);
router.get('/secure-assessments/activity/:attemptId', requireFaculty, getSecureAssessmentActivity);
router.get('/secure-assessments/:assignmentId/current', requireStudent, getCurrentSecureAssessment);
router.post('/secure-assessments/:assignmentId/start', requireStudent, startSecureAssessmentAttempt);
router.post('/secure-assessments/attempts/:attemptId/events', requireStudent, recordSecureAssessmentActivity);
router.delete('/secure-assessments/attempts/:attemptId', requireStudent, endSecureAssessmentAttempt);

export default router;
