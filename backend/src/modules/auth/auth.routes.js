import { Router } from 'express';
import {
  getCurrentUser,
  getCurrentThemePreference,
  loginUser,
  updateCurrentThemePreference,
  updateCurrentUser,
  getCurrentFacultySettings,
  saveCurrentFacultySettings,
} from './auth.controller.js';
import { authenticate, requireFaculty } from './auth.middleware.js';

const router = Router();

router.post('/login', loginUser);
router.get('/me', authenticate, getCurrentUser);
router.get('/preferences/theme', authenticate, getCurrentThemePreference);
router.put('/preferences/theme', authenticate, updateCurrentThemePreference);
router.patch('/me', authenticate, updateCurrentUser);
router.get('/faculty-settings', authenticate, requireFaculty, getCurrentFacultySettings);
router.put('/faculty-settings', authenticate, requireFaculty, saveCurrentFacultySettings);

export default router;
