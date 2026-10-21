import { Router } from 'express';
import { authenticate, requireFaculty } from '../auth/auth.middleware.js';
import {
  createFacultyReportExport,
  downloadFacultyReportExport,
  getFacultyReport,
  getFacultyReportSettings,
  previewFacultyReport,
  saveFacultyReportTemplate,
} from './reports.controller.js';

const router = Router();

router.use(authenticate, requireFaculty);
router.get('/faculty', getFacultyReportSettings);
router.get('/faculty/assignments', getFacultyReport('assignments'));
router.get('/faculty/students', getFacultyReport('students'));
router.get('/faculty/submissions', getFacultyReport('submissions'));
router.get('/faculty/evaluations', getFacultyReport('evaluations'));
router.put('/faculty/template', saveFacultyReportTemplate);
router.post('/faculty/preview', previewFacultyReport);
router.post('/faculty/exports', createFacultyReportExport);
router.get('/faculty/exports/:id', downloadFacultyReportExport);

export default router;
