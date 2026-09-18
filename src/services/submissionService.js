import {
  submissions,
  submissionEvaluationData,
  submissionExecutionData,
  submissionQualityData,
} from '../data/facultyMockData.js';

function enrichSubmission(submission) {
  if (!submission) {
    return null;
  }

  const evaluationData =
    submissionEvaluationData[submission.id] || null;

  const executionData =
    submissionExecutionData[submission.id] || null;

  const qualityData =
    submissionQualityData[submission.id] || null;

  const hasSubmittedCode =
    Boolean(evaluationData?.submittedCode);

  return {
    ...submission,

    evidence: {
      submittedCode:
        evaluationData?.submittedCode || null,

      aiSignal:
        evaluationData?.aiSignal || null,

      execution:
        executionData,

      quality:
        qualityData,
    },

    hasSubmittedCode,

    aiScore:
      hasSubmittedCode
        ? submission.score
        : null,
  };
}

export function getSubmissions() {
  return submissions.map(
    enrichSubmission
  );
}

export function getSubmissionById(id) {
  const submission =
    submissions.find(
      (item) => item.id === id
    );

  return enrichSubmission(
    submission
  );
}

export const submissionService = {
  list: async () =>
    getSubmissions(),

  get: async (id) =>
    getSubmissionById(id),
};