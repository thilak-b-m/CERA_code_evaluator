import {
  dashboardMetrics,
  dashboardSubmissions,
  dashboardSubmissionTrend,
  dashboardQuickActions,
  languageUsage,
  liveStudents,
  recentActivity,
} from '../data/facultyMockData.js';

export const dashboardService = {
  getOverview: () => ({
    metrics: dashboardMetrics,
    submissions: dashboardSubmissions,
    submissionTrend: dashboardSubmissionTrend,
    quickActions: dashboardQuickActions,
    languageUsage,
    liveStudents,
    recentActivity,
  }),
};