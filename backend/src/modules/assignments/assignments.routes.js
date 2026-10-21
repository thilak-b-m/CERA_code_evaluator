import { Router } from 'express';
import { authenticate, requireFaculty } from '../auth/auth.middleware.js';
import {
  archiveAssignmentForFaculty,
  createAssignmentForFaculty,
  createAssignmentTestCase,
  deleteAssignmentTestCase,
  getAssignmentById,
  getAssignmentTestCases,
  getAssignments,
  restoreAssignmentForFaculty,
  updateAssignmentForFaculty,
  updateAssignmentTestCase,
} from './assignments.controller.js';

const router = Router();

router.use(authenticate);
router.get('/', getAssignments);
router.post('/', requireFaculty, createAssignmentForFaculty);
router.get('/:id/test-cases', getAssignmentTestCases);
router.post('/:id/test-cases', requireFaculty, createAssignmentTestCase);
router.patch('/:id/test-cases/:testCaseId', requireFaculty, updateAssignmentTestCase);
router.delete('/:id/test-cases/:testCaseId', requireFaculty, deleteAssignmentTestCase);
router.post('/:id/restore', requireFaculty, restoreAssignmentForFaculty);
router.get('/:id', getAssignmentById);
router.patch('/:id', requireFaculty, updateAssignmentForFaculty);
router.delete('/:id', requireFaculty, archiveAssignmentForFaculty);

export default router;
