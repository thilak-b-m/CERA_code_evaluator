import { api } from './api.js';

export async function getEvaluation(submissionId, token) {
  const result = await api.request(
    `/api/evaluations/${encodeURIComponent(submissionId)}`,
    { token },
  );
  return result.evaluation;
}

export async function autoEvaluate(submissionId, token) {
  const result = await api.request(
    `/api/evaluations/${encodeURIComponent(submissionId)}/auto`,
    { method: 'POST', token },
  );
  return result.evaluation;
}

async function saveEvaluation(submissionId, evaluation, status, token) {
  const result = await api.request(
    `/api/evaluations/${encodeURIComponent(submissionId)}`,
    {
      method: 'PUT',
      token,
      body: { ...evaluation, status },
    },
  );
  return result.evaluation;
}

export const saveDraft = (submissionId, evaluation, token) => (
  saveEvaluation(submissionId, evaluation, 'draft', token)
);

export const publishEvaluation = (submissionId, evaluation, token) => (
  saveEvaluation(submissionId, evaluation, 'published', token)
);

export const evaluationService = {
  get: getEvaluation,
  autoEvaluate,
  saveDraft,
  publish: publishEvaluation,
};