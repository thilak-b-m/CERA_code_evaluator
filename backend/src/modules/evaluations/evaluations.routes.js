import { Router } from 'express';
import { authenticate, requireFaculty } from '../auth/auth.middleware.js';
import {
  getFacultyEvaluation,
  generateFacultyEvaluation,
  saveFacultyEvaluation,
  startFacultyEvaluationBatch,
  getFacultyEvaluationBatch,
  getLatestFacultyEvaluationBatch,
  retryFacultyEvaluationBatch,
} from './evaluations.controller.js';

const router = Router();

router.use(authenticate, requireFaculty);
router.post('/batches', startFacultyEvaluationBatch);
router.get('/batches/latest', getLatestFacultyEvaluationBatch);
router.get('/batches/:batchId', getFacultyEvaluationBatch);
router.post('/batches/:batchId/retry', retryFacultyEvaluationBatch);
router.post('/:submissionId/auto', generateFacultyEvaluation);
router.get('/:submissionId', getFacultyEvaluation);
router.put('/:submissionId', saveFacultyEvaluation);

export default router;
