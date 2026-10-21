import { getDatabase } from '../../config/database.js';
import {
  getCurrentSecureAttempt,
  getFacultySecureAttempt,
  listFacultySecureAttempts,
  recordSecureAssessmentEvent,
  startSecureAssessment,
  endSecureAssessment,
} from '../secure-assessments/secure-assessments.service.js';
import {
  endLiveLabSession,
  listLiveLabSessions,
  recordLiveLabHeartbeat,
} from './live-lab.service.js';

export async function sendLiveLabHeartbeat(request, response, next) {
  try {
    const session = await recordLiveLabHeartbeat(
      getDatabase(),
      request.user,
      request.body || {},
    );
    response.json({ session });
  } catch (error) {
    next(error);
  }
}

export async function stopLiveLabSession(request, response, next) {
  try {
    await endLiveLabSession(getDatabase(), request.user, request.params.assignmentId);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
}

export async function getLiveLabSessions(request, response, next) {
  try {
    const sessions = await listLiveLabSessions(getDatabase(), request.user.id);
    response.json({ sessions });
  } catch (error) {
    next(error);
  }
}

export async function getSecureAssessmentSessions(request, response, next) {
  try {
    const attempts = await listFacultySecureAttempts(getDatabase(), request.user.id);
    response.json({ attempts });
  } catch (error) {
    next(error);
  }
}

export async function getSecureAssessmentActivity(request, response, next) {
  try {
    const attempt = await getFacultySecureAttempt(
      getDatabase(),
      request.user.id,
      request.params.attemptId,
    );
    response.json({ attempt });
  } catch (error) {
    next(error);
  }
}

export async function getCurrentSecureAssessment(request, response, next) {
  try {
    const result = await getCurrentSecureAttempt(
      getDatabase(),
      request.user,
      request.params.assignmentId,
    );
    response.json(result);
  } catch (error) {
    next(error);
  }
}

export async function startSecureAssessmentAttempt(request, response, next) {
  try {
    const attempt = await startSecureAssessment(
      getDatabase(),
      request.user,
      request.params.assignmentId,
    );
    response.status(201).json({ attempt });
  } catch (error) {
    next(error);
  }
}

export async function recordSecureAssessmentActivity(request, response, next) {
  try {
    const result = await recordSecureAssessmentEvent(
      getDatabase(),
      request.user,
      request.params.attemptId,
      request.body || {},
    );
    response.json(result);
  } catch (error) {
    next(error);
  }
}

export async function endSecureAssessmentAttempt(request, response, next) {
  try {
    const attempt = await endSecureAssessment(
      getDatabase(),
      request.user,
      request.params.attemptId,
    );
    response.json({ attempt });
  } catch (error) {
    next(error);
  }
}
