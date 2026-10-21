import { Router } from 'express';
import { authenticate, requireFaculty, requireStudent } from '../auth/auth.middleware.js';
import {
  createStudentSubmission,
  getFacultySubmissionById,
  getFacultySubmissions,
  getStudentSubmissionById,
  getStudentSubmissions,
  runStudentCode,
} from './submissions.controller.js';

const router = Router();

router.use(authenticate);
router.post('/run', requireStudent, runStudentCode);
router.post('/', requireStudent, createStudentSubmission);
router.get('/me', requireStudent, getStudentSubmissions);
router.get('/faculty', requireFaculty, getFacultySubmissions);
router.get('/faculty/:id', requireFaculty, getFacultySubmissionById);
router.get('/:id', requireStudent, getStudentSubmissionById);

export default router;
