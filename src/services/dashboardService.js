import { getAssignments } from './assignmentService.js';
import { analyticsService } from './analyticsService.js';
import { submissionService } from './submissionService.js';
import { liveLabService } from './liveLabService.js';

const languageColors = {
  python: '#6366F1',
  java: '#22D3EE',
  cpp: '#8B5CF6',
  javascript: '#F59E0B',
};

function formatLanguage(language) {
  return {
    python: 'Python',
    java: 'Java',
    cpp: 'C++',
    javascript: 'JavaScript',
  }[language] || language;
}

function timeAgo(value) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export const dashboardService = {
  async getOverview(token) {
    const [analytics, submissions, assignments, liveSessions] = await Promise.all([
      analyticsService.get('current', token),
      submissionService.listForFaculty(token),
      getAssignments(token),
      liveLabService.listSessions(token),
    ]);
    const pendingEvaluations = submissions.filter((submission) => (
      submission.hasSubmittedCode && submission.evaluation?.status !== 'published'
    )).length;
    const languageCounts = submissions.reduce((counts, submission) => {
      counts[submission.language] = (counts[submission.language] || 0) + 1;
      return counts;
    }, {});
    const languageUsage = Object.entries(languageCounts)
      .map(([language, count]) => ({
        name: formatLanguage(language),
        value: Math.round((count / submissions.length) * 100),
        color: languageColors[language] || '#6366F1',
      }))
      .sort((left, right) => right.value - left.value);
    const submissionTotal = analytics.submissionCounts.reduce((total, count) => total + count, 0);
    const maxCount = Math.max(0, ...analytics.submissionCounts);

    return {
      metrics: {
        activeLabs: {
          value: liveSessions.length,
          trend: 'Students currently active in coding sessions',
        },
        pendingEvaluations: {
          value: pendingEvaluations,
          trend: 'Submitted code awaiting publication',
        },
        averagePassRate: {
          value: analytics.kpis.averageScore.value,
          trend: analytics.kpis.averageScore.trend,
        },
        activeAssignments: {
          value: assignments.filter((assignment) => assignment.status === 'published').length,
          trend: 'Published assignments',
        },
      },
      submissions: {
        total: submissionTotal,
        label: 'submissions in the last 12 weeks',
      },
      submissionTrend: {
        points: analytics.submissionCounts.map((count) => (
          maxCount ? Math.round((count / maxCount) * 90) : 0
        )),
        labels: analytics.submissionCounts.map((_, index) => `Week ${index + 1}`),
      },
      languageUsage,
      quickActions: {
        evaluationQueue: {
          label: 'Review evaluation queue',
          detail: `${pendingEvaluations} awaiting review`,
          href: '/evaluation-queue',
        },
        courseReport: {
          label: 'Generate course report',
          detail: 'Export current course records',
          href: '/reports',
        },
      },
      recentActivity: submissions.slice(0, 5).map((submission) => ({
        id: submission.id,
        title: `${submission.student} submitted ${submission.assignment}`,
        time: timeAgo(submission.submitted),
      })),
    };
  },
};
