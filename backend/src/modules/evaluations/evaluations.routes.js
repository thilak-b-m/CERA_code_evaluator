import { Router } from 'express';
import { authenticate, requireFaculty } from '../auth/auth.middleware.js';
import {
  getFacultyEvaluation,
  generateFacultyEvaluation,
  saveFacultyEvaluation,
} from './evaluations.controller.js';

const router = Router();

router.use(authenticate, requireFaculty);
router.post('/:submissionId/auto', generateFacultyEvaluation);
router.get('/:submissionId', getFacultyEvaluation);
router.put('/:submissionId', saveFacultyEvaluation);

export default router;
