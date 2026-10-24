import { getDatabase } from '../../config/database.js';
import { config } from '../../config/env.js';
import {
  getEvaluation,
  saveEvaluation,
  saveAIEvaluation,
} from './evaluations.service.js';
import { getFacultySubmission, collectExecutionEvidence } from '../submissions/submissions.service.js';
import { generateEvaluationWithOllama } from './ollama.service.js';
import { withOllamaLock } from './ollama.lock.js';
import {
  createEvaluationBatch,
  getEvaluationBatch,
  getLatestEvaluationBatch,
  retryFailedEvaluationJobs,
} from './evaluation-queue.service.js';

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
      const execution = await collectExecutionEvidence(database, submission);
      const generated = await withOllamaLock(() => generateEvaluationWithOllama({
        assignmentTitle: submission.assignmentTitle,
        assignmentDescription: submission.assignmentDescription,
        evaluationCriteria: submission.evaluationCriteria,
        language: submission.language,
        code: submission.code,
        maxScore: submission.maxScore,
        execution,
        baseUrl: config.ollamaBaseUrl,
        model: config.ollamaModel,
        timeoutMs: config.ollamaTimeoutMs,
      }));
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

    const execution = await collectExecutionEvidence(database, submission);
    const evaluation = await withOllamaLock(() => generateEvaluationWithOllama({
      assignmentTitle: submission.assignmentTitle,
      assignmentDescription: submission.assignmentDescription,
      evaluationCriteria: submission.evaluationCriteria,
      language: submission.language,
      code: submission.code,
      maxScore: submission.maxScore,
      execution,
      baseUrl: config.ollamaBaseUrl,
      model: config.ollamaModel,
      timeoutMs: config.ollamaTimeoutMs,
    }));
    const savedEvaluation = await saveAIEvaluation(
      database,
      request.params.submissionId,
      request.user.id,
      { ...evaluation, status: 'published' },
    );
    response.json({ evaluation: savedEvaluation });
  } catch (error) {
    next(error);
  }
}

export async function startFacultyEvaluationBatch(request, response, next) {
  try {
    const batch = await createEvaluationBatch(
      getDatabase(),
      request.user.id,
      request.body?.submissionIds,
    );
    response.status(202).json({ batch });
  } catch (error) {
    next(error);
  }
}

export async function getFacultyEvaluationBatch(request, response, next) {
  try {
    const batch = await getEvaluationBatch(getDatabase(), request.user.id, request.params.batchId);
    response.json({ batch });
  } catch (error) {
    next(error);
  }
}

export async function getLatestFacultyEvaluationBatch(request, response, next) {
  try {
    const batch = await getLatestEvaluationBatch(getDatabase(), request.user.id);
    response.json({ batch });
  } catch (error) {
    next(error);
  }
}

export async function retryFacultyEvaluationBatch(request, response, next) {
  try {
    const batch = await retryFailedEvaluationJobs(getDatabase(), request.user.id, request.params.batchId);
    response.status(202).json({ batch });
  } catch (error) {
    next(error);
  }
}
