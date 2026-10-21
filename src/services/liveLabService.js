import { api } from './api.js';

export const liveLabService = {
  async listSessions(token) {
    const result = await api.request('/api/live-lab/sessions', { token });
    return result.sessions;
  },

  heartbeat(activity, token) {
    return api.request('/api/live-lab/heartbeat', {
      method: 'POST',
      token,
      body: activity,
    });
  },

  stopSession(assignmentId, token) {
    return api.request(`/api/live-lab/sessions/${encodeURIComponent(assignmentId)}`, {
      method: 'DELETE',
      token,
    });
  },

  async listSecureAssessments(token) {
    const result = await api.request('/api/live-lab/secure-assessments/sessions', { token });
    return result.attempts;
  },

  async getSecureAssessmentActivity(attemptId, token) {
    const result = await api.request(
      `/api/live-lab/secure-assessments/activity/${encodeURIComponent(attemptId)}`,
      { token },
    );
    return result.attempt;
  },

  async getCurrentSecureAttempt(assignmentId, token) {
    return api.request(
      `/api/live-lab/secure-assessments/${encodeURIComponent(assignmentId)}/current`,
      { token },
    );
  },

  async startSecureAttempt(assignmentId, token) {
    const result = await api.request(
      `/api/live-lab/secure-assessments/${encodeURIComponent(assignmentId)}/start`,
      { method: 'POST', token },
    );
    return result.attempt;
  },

  async recordSecureActivity(attemptId, activity, token, options = {}) {
    return api.request(
      `/api/live-lab/secure-assessments/attempts/${encodeURIComponent(attemptId)}/events`,
      { method: 'POST', token, body: activity, ...options },
    );
  },

  async endSecureAttempt(attemptId, token) {
    return api.request(
      `/api/live-lab/secure-assessments/attempts/${encodeURIComponent(attemptId)}`,
      { method: 'DELETE', token },
    );
  },
};
