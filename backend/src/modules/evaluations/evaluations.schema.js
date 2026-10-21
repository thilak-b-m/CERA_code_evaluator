export class EvaluationValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EvaluationValidationError';
    this.statusCode = 400;
  }
}

export function parseEvaluationInput(input = {}, maxScore) {
  if (input.score === '' || input.score == null) {
    throw new EvaluationValidationError('A score is required.');
  }
  const score = Number(input.score);
  if (!Number.isFinite(score) || score < 0 || score > maxScore) {
    throw new EvaluationValidationError(`Score must be between 0 and ${maxScore}.`);
  }
  if (typeof input.feedback !== 'string' || input.feedback.trim().length > 5000) {
    throw new EvaluationValidationError('Feedback must be 5000 characters or fewer.');
  }
  if (
    input.aiFeedback !== undefined
    && (typeof input.aiFeedback !== 'string' || input.aiFeedback.trim().length > 5000)
  ) {
    throw new EvaluationValidationError('AI feedback must be 5000 characters or fewer.');
  }
  if (input.guidance !== undefined) {
    const { guidance } = input;
    if (
      !guidance
      || !['syntax', 'logic', 'requirements', 'none'].includes(guidance.category)
      || typeof guidance.issue !== 'string'
      || !guidance.issue.trim()
      || guidance.issue.trim().length > 500
      || typeof guidance.explanation !== 'string'
      || !guidance.explanation.trim()
      || guidance.explanation.trim().length > 1000
      || !Array.isArray(guidance.correctionSteps)
      || guidance.correctionSteps.length < 1
      || guidance.correctionSteps.length > 6
      || guidance.correctionSteps.some(
        (step) => typeof step !== 'string' || !step.trim() || step.trim().length > 300,
      )
      || typeof guidance.correctedCode !== 'string'
      || guidance.correctedCode.length > 4000
    ) {
      throw new EvaluationValidationError('AI correction guidance is invalid.');
    }
  }
  const status = input.status ?? 'draft';
  if (!['draft', 'published'].includes(status)) {
    throw new EvaluationValidationError('Evaluation status must be draft or published.');
  }
  if (status === 'published' && input.feedback.trim().length === 0) {
    throw new EvaluationValidationError('Feedback is required to publish an evaluation.');
  }
  return {
    score,
    feedback: input.feedback.trim(),
    ...(input.aiFeedback === undefined ? {} : { aiFeedback: input.aiFeedback.trim() }),
    ...(input.guidance === undefined ? {} : {
      guidance: {
        category: input.guidance.category,
        issue: input.guidance.issue.trim(),
        explanation: input.guidance.explanation.trim(),
        correctionSteps: input.guidance.correctionSteps.map((step) => step.trim()),
        correctedCode: input.guidance.correctedCode,
      },
    }),
    status,
  };
}
