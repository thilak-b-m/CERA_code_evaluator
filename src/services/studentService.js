import { codeTemplates } from '../data/codeTemplates.js';
import { api } from './api.js';

function draftStorageKey(assignmentId, accountId) {
  return `cera-draft:${accountId || 'guest'}:${assignmentId}`;
}

function getCodeDraft(assignmentId, accountId) {
  if (!accountId) return null;
  const value = localStorage.getItem(draftStorageKey(assignmentId, accountId));
  if (!value) return null;
  try {
    const draft = JSON.parse(value);
    return typeof draft.code === 'string' && typeof draft.language === 'string'
      ? draft
      : null;
  } catch (error) {
    console.error('Unable to read saved assignment draft:', error);
    return null;
  }
}

async function requestStudents(path, token, options = {}) {
  return api.request(path, { ...options, token });
}

async function listStudentAssignments(token) {
  const result = await api.request('/api/assignments', { token });
  return result.assignments;
}

function mapStudentAssignment(assignment, submissionsByAssignmentId, accountId) {
  const submission = submissionsByAssignmentId.get(assignment.id);
  const submitted = Boolean(submission);
  const draft = submitted ? null : getCodeDraft(assignment.id, accountId);
  return {
    ...assignment,
    subject: assignment.course,
    dueDate: assignment.due,
    status: submitted ? 'Submitted' : draft ? 'In Progress' : 'Not Started',
    progress: submitted ? 100 : draft ? 50 : 0,
    submissionId: submission?.id || null,
    marks: assignment.points,
  };
}

function toPublishedResult(submission) {
  const score = Number(submission.evaluation?.score);
  const totalMarks = Number(submission.maxScore);
  if (
    submission.evaluation?.status !== 'published'
    || !Number.isFinite(score)
    || !Number.isFinite(totalMarks)
    || totalMarks <= 0
  ) {
    return null;
  }

  return {
    id: submission.id,
    assignment: submission.assignment,
    subject: submission.course || 'Course not specified',
    obtainedMarks: score,
    totalMarks,
    percentage: Math.round((score / totalMarks) * 1000) / 10,
    submittedAt: submission.submittedAt,
    feedback: submission.evaluation.feedback,
    guidance: submission.evaluation.guidance || null,
    aiFeedback: submission.evaluation.aiFeedback || (
      submission.evaluation.source === 'ollama'
        ? submission.evaluation.feedback
        : ''
    ),
    feedbackSource: submission.evaluation.source || 'faculty',
  };
}

export const studentService = {
  async list(token, { page = 1, limit = 20, search, year, status } = {}) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (search) params.set('search', search);
    if (year) params.set('year', year);
    if (status) params.set('status', status);
    const result = await requestStudents(`/api/students?${params.toString()}`, token);
    return result;
  },

  async getDepartmentRecord(usn, token) {
    const result = await requestStudents(`/api/students/${encodeURIComponent(usn)}`, token);
    return result.student;
  },

  async addStudent(student, token) {
    return requestStudents('/api/students', token, {
      method: 'POST',
      body: JSON.stringify(student),
    });
  },

  async updateStudent(usn, student, token) {
    return requestStudents(`/api/students/${encodeURIComponent(usn)}`, token, {
      method: 'PATCH',
      body: JSON.stringify(student),
    });
  },

  async correctAcademicYear(usn, year, reason, token) {
    return requestStudents(`/api/students/${encodeURIComponent(usn)}/year-correction`, token, {
      method: 'PATCH', body: { year, reason },
    });
  },

  async deactivateStudent(usn, token) {
    return requestStudents(`/api/students/${encodeURIComponent(usn)}/deactivate`, token, {
      method: 'POST',
    });
  },

  async reactivateStudent(usn, token) {
    return requestStudents(`/api/students/${encodeURIComponent(usn)}/reactivate`, token, {
      method: 'POST',
    });
  },

  async deleteStudent(usn, token) {
    return requestStudents(`/api/students/${encodeURIComponent(usn)}`, token, {
      method: 'DELETE',
    });
  },

  async bulkUpdateStudentStatus(usns, status, token) {
    const result = await requestStudents('/api/students/bulk-status', token, {
      method: 'POST',
      body: JSON.stringify({ usns, status }),
    });
    return result.results;
  },

  async getCurrentAcademicSession(token) {
    const result = await requestStudents('/api/students/academic-sessions/current', token);
    return result.session;
  },

  async setCurrentAcademicSession(sessionName, token) {
    const result = await requestStudents('/api/students/academic-sessions', token, {
      method: 'POST', body: { sessionName, isCurrent: true },
    });
    return result.session;
  },

  async previewPromotion(sourceYear, destinationYear, token, sessionTransition) {
    const result = await requestStudents('/api/students/promotion/preview', token, {
      method: 'POST', body: { sourceYear, destinationYear, sessionTransition },
    });
    return result.preview;
  },

  async previewAllPromotion(token, sessionTransition) {
    const result = await requestStudents('/api/students/promotion/preview-all', token, { method: 'POST', body: { sessionTransition } });
    return result.preview;
  },

  async previewSelectedPromotion(usns, token, sessionTransition) {
    const result = await requestStudents('/api/students/promotion/preview-selected', token, { method: 'POST', body: { usns, sessionTransition } });
    return result.preview;
  },

  async executePromotion(sourceYear, destinationYear, sessionTransition, token) {
    const result = await requestStudents('/api/students/promotion/execute', token, {
      method: 'POST', body: { sourceYear, destinationYear, sessionTransition },
    });
    return result.result;
  },

  async executeAllPromotion(sessionTransition, token) {
    const result = await requestStudents('/api/students/promotion/execute-all', token, {
      method: 'POST', body: { sessionTransition },
    });
    return result.result;
  },

  async executeSelectedPromotion(usns, sessionTransition, token) {
    const result = await requestStudents('/api/students/promotion/execute-selected', token, { method: 'POST', body: { usns, sessionTransition } });
    return result.result;
  },

  async getPromotionHistory(token) {
    return requestStudents('/api/students/promotion-history', token);
  },

  async getAssignments(token, accountId) {
    const [assignments, submissions] = await Promise.all([
      listStudentAssignments(token),
      this.getSubmissions(token),
    ]);
    const submissionsByAssignmentId = new Map();
    submissions.forEach((submission) => {
      if (!submissionsByAssignmentId.has(submission.assignmentId)) {
        submissionsByAssignmentId.set(submission.assignmentId, submission);
      }
    });
    return assignments.map((assignment) => mapStudentAssignment(assignment, submissionsByAssignmentId, accountId));
  },

  async getAssignmentById(id, token, accountId) {
    const [result, submissions] = await Promise.all([
      api.request(`/api/assignments/${encodeURIComponent(id)}`, { token }),
      this.getSubmissions(token),
    ]);
    const submission = submissions.find((item) => item.assignmentId === id);
    const assignment = result.assignment;
    const draft = submission ? null : getCodeDraft(id, accountId);
    return {
      ...assignment,
      subject: assignment.course,
      dueDate: assignment.due,
      status: submission ? 'Submitted' : draft ? 'In Progress' : 'Not Started',
      progress: submission ? 100 : draft ? 50 : 0,
      submissionId: submission?.id || null,
      marks: assignment.points,
    };
  },

  async getAssignmentTestCases(id, token) {
    const result = await api.request(
      `/api/assignments/${encodeURIComponent(id)}/test-cases`,
      { token },
    );
    return result.testCases;
  },

  async getSubmissions(token) {
    const result = await api.request('/api/submissions/me', { token });
    return result.submissions.map((submission) => ({
      ...submission,
      assignment: submission.assignmentTitle || 'Untitled assignment',
      course: submission.course,
      status: submission.status === 'submitted' ? 'Submitted' : submission.status,
      submittedAt: submission.submittedAt,
    }));
  },

  async getDashboardOverview(token, accountId) {
    const [assignmentRecords, submissions] = await Promise.all([
      listStudentAssignments(token),
      this.getSubmissions(token),
    ]);
    const submissionsByAssignmentId = new Map();
    submissions.forEach((submission) => {
      if (!submissionsByAssignmentId.has(submission.assignmentId)) {
        submissionsByAssignmentId.set(submission.assignmentId, submission);
      }
    });
    const assignments = assignmentRecords.map((assignment) => (
      mapStudentAssignment(assignment, submissionsByAssignmentId, accountId)
    ));
    const publishedResults = submissions.filter((submission) => (
      submission.evaluation?.status === 'published'
      && Number.isFinite(Number(submission.maxScore))
      && Number(submission.maxScore) > 0
    ));
    const averageScore = publishedResults.length
      ? publishedResults.reduce(
        (sum, submission) => sum + (Number(submission.evaluation.score) / Number(submission.maxScore)) * 100,
        0,
      ) / publishedResults.length
      : null;
    return {
      stats: [
        {
          id: 'assignments',
          label: 'Available Assignments',
          value: assignments.length,
          icon: 'Code',
          color: 'primary',
        },
        {
          id: 'submissions',
          label: 'Submissions Sent',
          value: submissions.length,
          icon: 'CheckCircle',
          color: 'highlight',
        },
        {
          id: 'results',
          label: 'Published Results',
          value: publishedResults.length,
          icon: 'Trophy',
          color: 'success',
        },
        {
          id: 'average',
          label: 'Average Published Score',
          value: averageScore === null ? '—' : averageScore.toFixed(1),
          suffix: averageScore === null ? '' : '%',
          icon: 'Target',
          color: 'secondary',
        },
      ],
      upcoming: assignments
        .sort((left, right) => new Date(left.dueDate) - new Date(right.dueDate))
        .slice(0, 3),
      recentSubmissions: submissions.slice(0, 5),
    };
  },

  async getSubmissionById(id, token) {
    const result = await api.request(
      `/api/submissions/${encodeURIComponent(id)}`,
      { token },
    );
    return {
      ...result.submission,
      assignment: result.submission.assignmentTitle || 'Untitled assignment',
      course: result.submission.course,
      status: result.submission.status === 'submitted' ? 'Submitted' : result.submission.status,
      submittedAt: result.submission.submittedAt,
      maxScore: result.submission.maxScore,
    };
  },

  async getResults(token) {
    const submissions = await this.getSubmissions(token);
    return submissions
      .map(toPublishedResult)
      .filter(Boolean);
  },

  async getResultById(id, token) {
    const submission = await this.getSubmissionById(id, token);
    return toPublishedResult(submission);
  },

  async getProfile(token) {
    const result = await requestStudents('/api/students/me', token);
    return result.student;
  },

  async updateProfile(updatedData, token) {
    const result = await requestStudents('/api/students/me', token, {
      method: 'PATCH',
      body: JSON.stringify(updatedData),
    });
    return result.student;
  },

  getCodeTemplate(language) {
    return codeTemplates[language] || codeTemplates.python;
  },

  getCodeDraft,

  saveCodeDraft(assignmentId, accountId, language, code) {
    if (!accountId) return;
    localStorage.setItem(
      draftStorageKey(assignmentId, accountId),
      JSON.stringify({ language, code, updatedAt: new Date().toISOString() }),
    );
  },

  clearCodeDraft(assignmentId, accountId) {
    if (!accountId) return;
    localStorage.removeItem(draftStorageKey(assignmentId, accountId));
  },

  getTestCases(token, assignmentId) {
    return this.getAssignmentTestCases(assignmentId, token);
  },

  async runCode(assignmentId, language, code, token) {
    return api.request('/api/submissions/run', {
      method: 'POST',
      token,
      body: { assignmentId, language, code },
    });
  },

  async submitCode(assignmentId, language, code, token) {
    const result = await api.request('/api/submissions', {
      method: 'POST',
      token,
      body: { assignmentId, language, code },
    });
    return result.submission;
  },
};
