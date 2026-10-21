import { api } from './api.js';

export const analyticsService = {
  async get(period, token) {
    const result = await api.request(
      `/api/analytics/faculty/overview?period=${encodeURIComponent(period)}`,
      { token },
    );
    return result.analytics;
  },

  async getStudentLeaderboard(token) {
    const result = await api.request('/api/analytics/student/leaderboard', { token });
    return result.leaderboard;
  },
};
