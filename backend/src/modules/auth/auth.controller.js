import { getDatabase } from '../../config/database.js';
import { config } from '../../config/env.js';
import {
  login,
  getThemePreference,
  updateThemePreference,
  updateFacultyProfile,
  getFacultySettings,
  updateFacultySettings,
} from './auth.service.js';

export async function loginUser(request, response, next) {
  try {
    const result = await login(
      getDatabase(),
      request.body || {},
      config.jwtSecret,
    );
    response.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getCurrentUser(request, response) {
  response.json({ user: request.user });
}

export async function getCurrentThemePreference(request, response, next) {
  try {
    const theme = await getThemePreference(getDatabase(), request.user.id);
    response.json({ theme });
  } catch (error) {
    next(error);
  }
}

export async function updateCurrentThemePreference(request, response, next) {
  try {
    const theme = await updateThemePreference(
      getDatabase(),
      request.user.id,
      request.body?.theme,
    );
    response.json({ theme });
  } catch (error) {
    next(error);
  }
}

export async function updateCurrentUser(request, response, next) {
  try {
    const user = await updateFacultyProfile(
      getDatabase(),
      request.user,
      request.body || {},
    );
    response.json({ user, message: 'Faculty profile updated.' });
  } catch (error) {
    next(error);
  }
}

export async function getCurrentFacultySettings(request, response, next) {
  try { response.json({ settings: await getFacultySettings(getDatabase(), request.user) }); } catch (error) { next(error); }
}

export async function saveCurrentFacultySettings(request, response, next) {
  try { response.json({ settings: await updateFacultySettings(getDatabase(), request.user, request.body || {}) }); } catch (error) { next(error); }
}
