import { getDatabase } from '../../config/database.js';
import { config } from '../../config/env.js';
import {
  getEvaluation,
  saveEvaluation,
} from './evaluations.service.js';
import { getFacultySubmission, collectExecutionEvidence } from '../submissions/submissions.service.js';
import { generateEvaluationWithOllama } from './ollama.service.js';

export async function getFacultyEvaluation(request, response, next) {
  try {
    const evaluation = await getEvaluation(
      getDatabase(),
      request.params.submissionId,
      request.user.id,
    );
    response.json({ evaluation });
  } catch (error) {
    next(error);
  }
}

export async function saveFacultyEvaluation(request, response, next) {
  try {
    const database = getDatabase();
    const input = request.body || {};
    let aiFeedback;
    let guidance;

    if (input.status === 'published') {
      const submission = await getFacultySubmission(
        database,
        request.params.submissionId,
        request.user.id,
      );
      if (!submission.code) {
        const error = new Error('AI feedback cannot be generated because submitted code is missing.');
        error.statusCode = 400;
        throw error;
      }
      const generated = await generateEvaluationWithOllama({
        assignmentTitle: submission.assignmentTitle,
        assignmentDescription: submission.assignmentDescription,
        evaluationCriteria: submission.evaluationCriteria,
        language: submission.language,
        code: submission.code,
        maxScore: submission.maxScore,
        execution: await collectExecutionEvidence(database, submission),
        baseUrl: config.ollamaBaseUrl,
        model: config.ollamaModel,
      });
      aiFeedback = generated.feedback;
      guidance = generated.guidance;
    }

    const evaluation = await saveEvaluation(
      database,
      request.params.submissionId,
      request.user.id,
      {
        ...input,
        ...(aiFeedback === undefined ? {} : { aiFeedback }),
        ...(guidance === undefined ? {} : { guidance }),
      },
    );
    response.json({ evaluation });
  } catch (error) {
    next(error);
  }
}

export async function generateFacultyEvaluation(request, response, next) {
  try {
    const database = getDatabase();
    const submission = await getFacultySubmission(
      database,
      request.params.submissionId,
      request.user.id,
    );
    if (!submission.code) {
      const error = new Error('AI evaluation is unavailable because submitted code is missing.');
      error.statusCode = 400;
      throw error;
    }

    const evaluation = await generateEvaluationWithOllama({
      assignmentTitle: submission.assignmentTitle,
      assignmentDescription: submission.assignmentDescription,
      evaluationCriteria: submission.evaluationCriteria,
      language: submission.language,
      code: submission.code,
      maxScore: submission.maxScore,
      execution: await collectExecutionEvidence(database, submission),
      baseUrl: config.ollamaBaseUrl,
      model: config.ollamaModel,
    });
    const savedEvaluation = await saveEvaluation(
      database,
      request.params.submissionId,
      request.user.id,
      { ...evaluation, status: 'published' },
      { source: 'ollama' },
    );
    response.json({ evaluation: savedEvaluation });
  } catch (error) {
    next(error);
  }
}
