import { ApiError, api } from './api.js';

export async function getEvaluation(submissionId, token) {
  const result = await api.request(
    `/api/evaluations/${encodeURIComponent(submissionId)}`,
    { token },
  );
  return result.evaluation;
}

export async function autoEvaluate(submissionId, token) {
  let batch = await startEvaluationBatch([submissionId], token);
  while (['pending', 'processing'].includes(batch.status)) {
    await new Promise((resolve) => window.setTimeout(resolve, 2500));
    try {
      batch = await getEvaluationBatch(batch.id, token);
    } catch (error) {
      if (error.status && error.status < 500) throw error;
      // A dropped progress request does not cancel the persisted backend job.
      // Continue polling the same batch instead of starting it again.
    }
  }
  const job = batch.jobs.find((item) => item.submissionId === submissionId);
  if (job?.status !== 'completed') {
    throw new ApiError(job?.error?.message || 'AI evaluation failed. Open the evaluation queue to retry it.', 502);
  }
  const evaluation = await getEvaluation(submissionId, token);
  if (!evaluation) throw new ApiError('The evaluation completed but could not be loaded. Refresh and try again.', 500);
  return evaluation;
}

export async function startEvaluationBatch(submissionIds, token) {
  const result = await api.request('/api/evaluations/batches', {
    method: 'POST',
    token,
    body: { submissionIds },
  });
  return result.batch;
}

export async function getEvaluationBatch(batchId, token) {
  const result = await api.request(`/api/evaluations/batches/${encodeURIComponent(batchId)}`, { token });
  return result.batch;
}

export async function getLatestEvaluationBatch(token) {
  const result = await api.request('/api/evaluations/batches/latest', { token });
  return result.batch;
}

export async function retryEvaluationBatch(batchId, token) {
  const result = await api.request(`/api/evaluations/batches/${encodeURIComponent(batchId)}/retry`, {
    method: 'POST',
    token,
  });
  return result.batch;
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
  startBatch: startEvaluationBatch,
  getBatch: getEvaluationBatch,
  getLatestBatch: getLatestEvaluationBatch,
  retryBatch: retryEvaluationBatch,
  saveDraft,
  publish: publishEvaluation,
};
