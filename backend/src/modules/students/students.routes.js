import { Router } from 'express';
import { authenticate, requireFaculty, requireStudent } from '../auth/auth.middleware.js';
import {
  createStudent,
  getOwnStudentProfile,
  getStudentRecord,
  getStudents,
  updateStudent,
  deactivateStudent,
  reactivateStudent,
  deleteStudent,
  bulkUpdateStudentStatus,
  getAcademicSessions,
  getCurrentSession,
  createAcademicSessionForFaculty,
  getPromotionPreviewForYear,
  getAllYearsPromotionPreviewForFaculty,
  executePromotionForYear,
  executeAllYearsPromotionForFaculty,
  getPromotionHistoryForFaculty,
  getPromotionRecord,
  updateOwnStudentProfile,
  getSelectedPromotionPreview,
  executeSelectedPromotionForFaculty,
  correctStudentYear,
} from './students.controller.js';

const router = Router();

router.get('/me', authenticate, requireStudent, getOwnStudentProfile);
router.patch('/me', authenticate, requireStudent, updateOwnStudentProfile);
router.use(authenticate, requireFaculty);
router.get('/', getStudents);
router.post('/', createStudent);
router.patch('/:usn/year-correction', correctStudentYear);
router.patch('/:usn', updateStudent);
router.post('/:usn/deactivate', deactivateStudent);
router.post('/:usn/reactivate', reactivateStudent);
router.delete('/:usn', deleteStudent);
router.post('/bulk-status', bulkUpdateStudentStatus);

router.get('/academic-sessions', getAcademicSessions);
router.get('/academic-sessions/current', getCurrentSession);
router.post('/academic-sessions', createAcademicSessionForFaculty);

router.post('/promotion/preview', getPromotionPreviewForYear);
router.post('/promotion/preview-all', getAllYearsPromotionPreviewForFaculty);
router.post('/promotion/execute', executePromotionForYear);
router.post('/promotion/execute-all', executeAllYearsPromotionForFaculty);
router.post('/promotion/preview-selected', getSelectedPromotionPreview);
router.post('/promotion/execute-selected', executeSelectedPromotionForFaculty);
router.get('/promotion-history', getPromotionHistoryForFaculty);
router.get('/promotion-history/:operationId', getPromotionRecord);
router.get('/:usn', getStudentRecord);

export default router;
