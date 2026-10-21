import { api } from './api.js';

export const submissionService = {
  listForFaculty: async (token, assignmentId) => {
    const query = assignmentId ? `?assignmentId=${encodeURIComponent(assignmentId)}` : '';
    const result = await api.request(`/api/submissions/faculty${query}`, { token });
    return result.submissions.map((submission) => ({
      ...submission,
      student: submission.studentName || 'Unknown student',
      assignment: submission.assignmentTitle || 'Untitled assignment',
      submitted: submission.submittedAt,
      lang: submission.language,
      hasSubmittedCode: Boolean(submission.code),
      score: submission.evaluation?.score,
      result: submission.evaluation?.status || 'Needs review',
      evidence: { submittedCode: submission.code },
    }));
  },

  getForFaculty: async (id, token) => {
    const result = await api.request(
      `/api/submissions/faculty/${encodeURIComponent(id)}`,
      { token },
    );
    const submission = result.submission;
    return {
      ...submission,
      student: submission.studentName || 'Unknown student',
      assignment: submission.assignmentTitle || 'Untitled assignment',
      submitted: submission.submittedAt,
      lang: submission.language,
      hasSubmittedCode: Boolean(submission.code),
      score: submission.evaluation?.score,
      result: submission.evaluation?.status || 'Needs review',
      evidence: { submittedCode: submission.code },
    };
  },
};
