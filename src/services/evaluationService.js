const STORAGE_KEY = 'cera-evaluations';

function getStoredEvaluations() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.error('Error loading evaluations:', error);
    return {};
  }
}

function saveStoredEvaluations(evaluations) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(evaluations)
    );
    return true;
  } catch (error) {
    console.error('Error saving evaluations:', error);
    return false;
  }
}

export function getEvaluation(submissionId) {
  const evaluations = getStoredEvaluations();
  return evaluations[submissionId] || null;
}

export function saveDraft(submissionId, evaluation) {
  const evaluations = getStoredEvaluations();

  const savedEvaluation = {
    ...evaluations[submissionId],
    ...evaluation,
    submissionId,
    status: 'Draft',
  };

  evaluations[submissionId] = savedEvaluation;
  saveStoredEvaluations(evaluations);

  return savedEvaluation;
}

export function publishEvaluation(submissionId, evaluation) {
  const evaluations = getStoredEvaluations();

  const publishedEvaluation = {
    ...evaluations[submissionId],
    ...evaluation,
    submissionId,
    status: 'Published',
  };

  evaluations[submissionId] = publishedEvaluation;
  saveStoredEvaluations(evaluations);

  return publishedEvaluation;
}

export const evaluationService = {
  get: getEvaluation,
  saveDraft,
  publish: publishEvaluation,
};