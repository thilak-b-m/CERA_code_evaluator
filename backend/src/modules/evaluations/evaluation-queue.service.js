import { ObjectId } from 'mongodb';
import { getFacultySubmission, collectExecutionEvidence } from '../submissions/submissions.service.js';
import { generateEvaluationWithOllama } from './ollama.service.js';
import { saveAIEvaluation } from './evaluations.service.js';
import { withOllamaLock } from './ollama.lock.js';

const MAX_BATCH_SIZE = 250;
let workerRunning = false;
let workerDatabase;
let workerDependencies = {};
let workerSettings = {
  baseUrl: 'http://127.0.0.1:11434',
  model: 'qwen2.5-coder:14b',
  timeoutMs: 300000,
  retryLimit: 1,
  retryDelayMs: 3000,
};

function publicFailure(error) {
  const statusCode = Number(error?.statusCode);
  if (statusCode === 504) return { category: 'timeout', message: 'Ollama did not finish within the configured time limit. You can retry this evaluation.' };
  if (statusCode === 503 && error?.retryable === false) return { category: 'model', message: 'The configured Ollama model is unavailable. Check the model name and installed model.' };
  if (statusCode === 503) return { category: 'unavailable', message: 'Ollama is unavailable. Check that the local model service is running, then retry.' };
  if (statusCode === 502 && error?.retryable === false) return { category: 'validation', message: 'Ollama returned an evaluation that did not pass validation. Review manually; automatic retry was skipped.' };
  if (statusCode === 502) return { category: 'generation', message: 'Ollama returned an unusable response. You can retry this evaluation.' };
  if (statusCode === 409) return { category: 'conflict', message: 'A faculty evaluation exists and was left unchanged.' };
  if (statusCode === 413) return { category: 'input', message: 'The assignment or submission is too large for AI evaluation.' };
  return { category: 'evaluation', message: 'This submission could not be evaluated. Review it manually or retry if the problem was temporary.' };
}

function isTransient(error) {
  if (typeof error?.retryable === 'boolean') return error.retryable;
  return [502, 503, 504].includes(Number(error?.statusCode))
    || ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN'].includes(error?.code);
}

function calculateBatchStatus(jobs) {
  if (jobs.some((job) => job.status === 'processing')) return 'processing';
  if (jobs.some((job) => job.status === 'pending')) return 'pending';
  if (jobs.some((job) => job.status === 'failed')) return 'failed';
  return 'completed';
}

function serializeJob(job) {
  return {
    id: job._id.toString(),
    submissionId: job.submissionId.toString(),
    status: job.status,
    attemptCount: job.attemptCount || 0,
    retryable: Boolean(job.retryable),
    ...(job.error ? { error: job.error } : {}),
    ...(job.evaluation ? { evaluation: job.evaluation } : {}),
    queuedAt: job.queuedAt?.toISOString?.() || null,
    ...(job.startedAt ? { startedAt: job.startedAt.toISOString() } : {}),
    ...(job.finishedAt ? { finishedAt: job.finishedAt.toISOString() } : {}),
  };
}

function serializeBatch(batch, jobs) {
  const completed = jobs.filter((job) => job.status === 'completed').length;
  const failedJobs = jobs.filter((job) => job.status === 'failed');
  const processingJob = jobs.find((job) => job.status === 'processing');
  return {
    id: batch._id.toString(),
    status: calculateBatchStatus(jobs),
    total: jobs.length,
    completed,
    pending: jobs.filter((job) => job.status === 'pending').length,
    failed: failedJobs.length,
    processingSubmissionId: processingJob?.submissionId.toString() || null,
    retryable: failedJobs.some((job) => job.retryable),
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
    jobs: jobs.map(serializeJob),
  };
}

export async function initializeEvaluationQueueCollections(database) {
  await database.collection('evaluation_batches').createIndex({ facultyId: 1, createdAt: -1 });
  await database.collection('evaluation_jobs').createIndex({ status: 1, queuedAt: 1 });
  await database.collection('evaluation_jobs').createIndex({ batchId: 1, facultyId: 1 });
  await database.collection('evaluation_job_locks').createIndex(
    { facultyId: 1, submissionId: 1 },
    { unique: true },
  );
}

export async function startEvaluationQueue(database, options = {}) {
  workerDatabase = database;
  workerDependencies = options.dependencies || {};
  workerSettings = {
    baseUrl: options.ollamaBaseUrl || workerSettings.baseUrl,
    model: options.ollamaModel || workerSettings.model,
    timeoutMs: options.ollamaTimeoutMs ?? workerSettings.timeoutMs,
    retryLimit: options.retryLimit ?? workerSettings.retryLimit,
    retryDelayMs: options.retryDelayMs ?? workerSettings.retryDelayMs,
  };
  const jobs = database.collection('evaluation_jobs');
  const recovered = await jobs.updateMany(
    { status: 'processing' },
    { $set: { status: 'pending', recoveredAt: new Date() } },
  );
  if (recovered.modifiedCount) {
    console.warn(`[AI queue] Recovered ${recovered.modifiedCount} interrupted evaluation job(s).`);
  }
  scheduleWorker();
}

function scheduleWorker() {
  if (workerRunning || !workerDatabase) return;
  workerRunning = true;
  void drainQueue(workerDatabase)
    .catch((error) => console.error(`[AI queue] Worker stopped unexpectedly: ${error.message}`))
    .finally(() => {
      workerRunning = false;
      void workerDatabase.collection('evaluation_jobs').findOne({ status: 'pending' })
        .then((pending) => { if (pending) scheduleWorker(); })
        .catch((error) => console.error(`[AI queue] Unable to check pending jobs: ${error.message}`));
    });
}

async function updateBatchSnapshots(database, job) {
  const batches = await database.collection('evaluation_batches')
    .find({ jobIds: job._id })
    .toArray();
  for (const batch of batches) {
    const jobs = await database.collection('evaluation_jobs')
      .find({ _id: { $in: batch.jobIds } })
      .toArray();
    const status = calculateBatchStatus(jobs);
    const updatedAt = new Date();
    await database.collection('evaluation_batches').updateOne(
      { _id: batch._id },
      { $set: { status, updatedAt } },
    );
    if (['completed', 'failed'].includes(status)) {
      console.info(`[AI queue] Batch ${batch._id} ${status}; total=${jobs.length}; completed=${jobs.filter((item) => item.status === 'completed').length}; failed=${jobs.filter((item) => item.status === 'failed').length}; elapsedMs=${updatedAt.getTime() - batch.createdAt.getTime()}.`);
    }
  }
}

async function setJobState(database, job, updates) {
  await database.collection('evaluation_jobs').updateOne(
    { _id: job._id },
    { $set: { ...updates, updatedAt: new Date() } },
  );
  const updated = await database.collection('evaluation_jobs').findOne({ _id: job._id });
  await updateBatchSnapshots(database, updated);
  return updated;
}

async function processJob(database, job) {
  const jobs = database.collection('evaluation_jobs');
  const startedAt = new Date();
  const attemptCount = (job.attemptCount || 0) + 1;
  const claimed = await jobs.updateOne(
    { _id: job._id, status: 'pending' },
    { $set: { status: 'processing', attemptCount, startedAt, error: null, updatedAt: startedAt } },
  );
  if (!claimed.modifiedCount) return;

  const queueWaitMs = Math.max(0, startedAt.getTime() - job.queuedAt.getTime());
  console.info(`[AI queue] Job ${job._id} started; queueWaitMs=${queueWaitMs}; attempt=${attemptCount}.`);
  let ollamaRequestStartedAt = null;
  let executionEvidenceMs = null;
  let ollamaLockWaitMs = null;
  let databaseMs = null;
  let ollamaMetrics = null;
  try {
    const submission = await (workerDependencies.getFacultySubmission || getFacultySubmission)(
      database,
      job.submissionId.toString(),
      job.facultyId.toString(),
    );
    if (!submission.code) {
      const error = new Error('Submitted code is missing.');
      error.statusCode = 400;
      throw error;
    }
    const prior = await database.collection('evaluations').findOne({
      submissionId: job.submissionId,
      facultyId: job.facultyId,
    });
    if (prior?.status === 'published') {
      await setJobState(database, job, {
        status: 'completed',
        evaluation: { score: prior.score, status: prior.status, source: prior.source || 'faculty' },
        finishedAt: new Date(),
        retryable: false,
        error: null,
      });
      await database.collection('evaluation_job_locks').deleteOne({ jobId: job._id });
      return;
    }
    if (prior && prior.source !== 'ollama') {
      const error = new Error('A faculty evaluation exists and was left unchanged.');
      error.statusCode = 409;
      throw error;
    }

    let execution;
    const evidenceStartedAt = Date.now();
    try {
      execution = await (workerDependencies.collectExecutionEvidence || collectExecutionEvidence)(database, submission);
    } finally {
      executionEvidenceMs = Date.now() - evidenceStartedAt;
    }

    const lockRequestedAt = Date.now();
    const generated = await (workerDependencies.withOllamaLock || withOllamaLock)(async () => {
      ollamaLockWaitMs = Date.now() - lockRequestedAt;
      console.info(`[AI queue] Ollama lock acquired for job ${job._id}; lockWaitMs=${ollamaLockWaitMs}.`);
      return (workerDependencies.generateEvaluationWithOllama || generateEvaluationWithOllama)({
        assignmentTitle: submission.assignmentTitle,
        assignmentDescription: submission.assignmentDescription,
        evaluationCriteria: submission.evaluationCriteria,
        language: submission.language,
        code: submission.code,
        maxScore: submission.maxScore,
        execution,
        baseUrl: workerSettings.baseUrl,
        model: workerSettings.model,
        timeoutMs: workerSettings.timeoutMs,
        includeMetrics: true,
        onRequestStart: (requestStartedAt) => {
          ollamaRequestStartedAt = requestStartedAt;
          console.info(`[AI queue] Ollama request started for job ${job._id}; model=${workerSettings.model}.`);
        },
        onMetrics: (metrics) => {
          ollamaMetrics = metrics;
          console.info(`[AI queue] Ollama request completed for job ${job._id}; durationMs=${metrics.totalDurationMs ?? 'unknown'}; loadDurationMs=${metrics.loadDurationMs ?? 'unknown'}; promptEvalDurationMs=${metrics.promptEvalDurationMs ?? 'unknown'}; evalDurationMs=${metrics.evalDurationMs ?? 'unknown'}; promptTokens=${metrics.promptTokens ?? 'unknown'}; generatedTokens=${metrics.generatedTokens ?? 'unknown'}; tokensPerSecond=${metrics.tokensPerSecond ?? 'unknown'}.`);
        },
      });
    });
    const ollamaMs = generated.metrics?.totalDurationMs ?? null;
    const persistenceStartedAt = Date.now();
    const evaluation = await (workerDependencies.saveAIEvaluation || saveAIEvaluation)(database, job.submissionId.toString(), job.facultyId.toString(), {
      ...generated,
      status: 'published',
    });
    databaseMs = Date.now() - persistenceStartedAt;
    const finishedAt = new Date();
    const totalMs = finishedAt.getTime() - startedAt.getTime();
    await setJobState(database, job, {
      status: 'completed',
      evaluation: { score: evaluation.score, status: evaluation.status, source: evaluation.source },
      finishedAt,
      retryable: false,
      error: null,
      timings: {
        queueWaitMs,
        executionEvidenceMs,
        ollamaLockWaitMs,
        ollamaMs,
        loadDurationMs: generated.metrics?.loadDurationMs ?? null,
        promptEvalDurationMs: generated.metrics?.promptEvalDurationMs ?? null,
        evalDurationMs: generated.metrics?.evalDurationMs ?? null,
        databaseMs,
        totalMs,
        ollamaRequestStartedAt,
        ollamaRequestCompletedAt: generated.metrics?.completedAt || null,
        promptTokens: generated.metrics?.promptTokens ?? null,
        generatedTokens: generated.metrics?.generatedTokens ?? null,
        tokensPerSecond: generated.metrics?.tokensPerSecond ?? null,
      },
    });
    await database.collection('evaluation_job_locks').deleteOne({ jobId: job._id });
    console.info(`[AI queue] Job ${job._id} completed; executionEvidenceMs=${executionEvidenceMs}; ollamaLockWaitMs=${ollamaLockWaitMs}; ollamaMs=${ollamaMs ?? 'unknown'}; dbMs=${databaseMs}; totalMs=${totalMs}; tokens=${generated.metrics?.generatedTokens ?? 'unknown'}; tokensPerSecond=${generated.metrics?.tokensPerSecond ?? 'unknown'}.`);
  } catch (error) {
    const failure = publicFailure(error);
    const retryable = isTransient(error);
    const retry = retryable && attemptCount <= workerSettings.retryLimit;
    const finishedAt = new Date();
    const safeFailure = { ...failure, retryable };
    await setJobState(database, job, {
      status: retry ? 'pending' : 'failed',
      error: safeFailure,
      retryable,
      finishedAt: retry ? null : finishedAt,
      ...(retry ? { retryScheduledAt: new Date(Date.now() + workerSettings.retryDelayMs) } : {}),
      timings: {
        queueWaitMs,
        executionEvidenceMs,
        ollamaLockWaitMs,
        ollamaMs: ollamaMetrics?.totalDurationMs ?? (ollamaRequestStartedAt
          ? finishedAt.getTime() - ollamaRequestStartedAt.getTime()
          : null),
        loadDurationMs: ollamaMetrics?.loadDurationMs ?? null,
        promptEvalDurationMs: ollamaMetrics?.promptEvalDurationMs ?? null,
        evalDurationMs: ollamaMetrics?.evalDurationMs ?? null,
        databaseMs,
        totalMs: finishedAt.getTime() - startedAt.getTime(),
        ollamaRequestStartedAt,
        ollamaRequestCompletedAt: ollamaMetrics?.completedAt || null,
        promptTokens: ollamaMetrics?.promptTokens ?? null,
        generatedTokens: ollamaMetrics?.generatedTokens ?? null,
        tokensPerSecond: ollamaMetrics?.tokensPerSecond ?? null,
      },
    });
    if (!retry) await database.collection('evaluation_job_locks').deleteOne({ jobId: job._id });
    console.error(`[AI queue] Job ${job._id} ${retry ? 'will retry' : 'failed'}; category=${failure.category}; attempt=${attemptCount}; queueWaitMs=${queueWaitMs}; executionEvidenceMs=${executionEvidenceMs ?? 'not-started'}; ollamaLockWaitMs=${ollamaLockWaitMs ?? 'not-started'}; ollamaMs=${ollamaRequestStartedAt ? finishedAt.getTime() - ollamaRequestStartedAt.getTime() : 'not-started'}; dbMs=${databaseMs ?? 'not-started'}; totalMs=${finishedAt.getTime() - startedAt.getTime()}.`);
    if (retry) await new Promise((resolve) => setTimeout(resolve, workerSettings.retryDelayMs));
  }
}

async function drainQueue(database) {
  const jobs = database.collection('evaluation_jobs');
  while (true) {
    const next = await jobs.findOne({ status: 'pending' }, { sort: { queuedAt: 1 } });
    if (!next) break;
    await processJob(database, next);
  }
}

export async function createEvaluationBatch(database, facultyId, submissionIds) {
  const uniqueIds = [...new Set(Array.isArray(submissionIds) ? submissionIds : [])];
  if (!uniqueIds.length) throw Object.assign(new Error('Select at least one submission.'), { statusCode: 400 });
  if (uniqueIds.length > MAX_BATCH_SIZE) throw Object.assign(new Error(`A batch can contain at most ${MAX_BATCH_SIZE} submissions.`), { statusCode: 400 });
  if (uniqueIds.some((id) => !ObjectId.isValid(id))) throw Object.assign(new Error('One or more submission ids are invalid.'), { statusCode: 400 });

  const facultyObjectId = new ObjectId(facultyId);
  const submissionObjectIds = uniqueIds.map((id) => new ObjectId(id));
  const submissions = await database.collection('submissions').find({
    _id: { $in: submissionObjectIds },
    facultyId: facultyObjectId,
  }).toArray();
  if (submissions.length !== submissionObjectIds.length) {
    throw Object.assign(new Error('One or more submissions were not found.'), { statusCode: 404 });
  }

  const now = new Date();
  const batch = {
    _id: new ObjectId(),
    facultyId: facultyObjectId,
    jobIds: [],
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
  await database.collection('evaluation_batches').insertOne(batch);
  for (const submission of submissions) {
    const prior = await database.collection('evaluations').findOne({
      submissionId: submission._id,
      facultyId: facultyObjectId,
    });
    const job = {
      _id: new ObjectId(),
      batchId: batch._id,
      facultyId: facultyObjectId,
      submissionId: submission._id,
      status: prior?.status === 'published' ? 'completed' : prior && prior.source !== 'ollama' ? 'failed' : 'pending',
      attemptCount: 0,
      retryable: false,
      queuedAt: now,
      createdAt: now,
      updatedAt: now,
      ...(prior?.status === 'published' ? {
        evaluation: { score: prior.score, status: prior.status, source: prior.source || 'faculty' },
        finishedAt: now,
      } : {}),
      ...(prior && prior.source !== 'ollama' && prior.status !== 'published' ? {
        error: { category: 'conflict', message: 'A faculty evaluation exists and was left unchanged.', retryable: false },
        finishedAt: now,
      } : {}),
    };

    if (job.status === 'pending') {
      await database.collection('evaluation_jobs').insertOne(job);
      try {
        await database.collection('evaluation_job_locks').insertOne({
          facultyId: facultyObjectId,
          submissionId: submission._id,
          jobId: job._id,
          createdAt: now,
        });
      } catch (error) {
        if (error.code !== 11000) throw error;
        await database.collection('evaluation_jobs').deleteOne({ _id: job._id });
        const existing = await database.collection('evaluation_job_locks').findOne({
          facultyId: facultyObjectId,
          submissionId: submission._id,
        });
        if (!existing) throw error;
        batch.jobIds.push(existing.jobId);
        continue;
      }
    } else {
      await database.collection('evaluation_jobs').insertOne(job);
    }
    batch.jobIds.push(job._id);
  }
  const jobs = await database.collection('evaluation_jobs').find({ _id: { $in: batch.jobIds } }).toArray();
  batch.status = calculateBatchStatus(jobs);
  batch.updatedAt = new Date();
  await database.collection('evaluation_batches').updateOne({ _id: batch._id }, { $set: { jobIds: batch.jobIds, status: batch.status, updatedAt: batch.updatedAt } });
  scheduleWorker();
  return serializeBatch(batch, jobs);
}

export async function getEvaluationBatch(database, facultyId, batchId) {
  if (!ObjectId.isValid(batchId)) throw Object.assign(new Error('Invalid evaluation batch id.'), { statusCode: 400 });
  const batch = await database.collection('evaluation_batches').findOne({
    _id: new ObjectId(batchId),
    facultyId: new ObjectId(facultyId),
  });
  if (!batch) throw Object.assign(new Error('Evaluation batch not found.'), { statusCode: 404 });
  const jobs = await database.collection('evaluation_jobs').find({ _id: { $in: batch.jobIds } }).toArray();
  const serialized = serializeBatch(batch, jobs);
  if (batch.status !== serialized.status) {
    await database.collection('evaluation_batches').updateOne(
      { _id: batch._id },
      { $set: { status: serialized.status, updatedAt: new Date() } },
    );
  }
  return serialized;
}

export async function getLatestEvaluationBatch(database, facultyId) {
  const batch = await database.collection('evaluation_batches').findOne(
    { facultyId: new ObjectId(facultyId) },
    { sort: { createdAt: -1 } },
  );
  if (!batch) return null;
  return getEvaluationBatch(database, facultyId, batch._id.toString());
}

export async function retryFailedEvaluationJobs(database, facultyId, batchId) {
  if (!ObjectId.isValid(batchId)) throw Object.assign(new Error('Invalid evaluation batch id.'), { statusCode: 400 });
  const batch = await database.collection('evaluation_batches').findOne({
    _id: new ObjectId(batchId),
    facultyId: new ObjectId(facultyId),
  });
  if (!batch) throw Object.assign(new Error('Evaluation batch not found.'), { statusCode: 404 });
  const jobs = await database.collection('evaluation_jobs').find({
    _id: { $in: batch.jobIds },
    status: 'failed',
    retryable: true,
  }).toArray();
  for (const job of jobs) {
    const evaluation = await database.collection('evaluations').findOne({ submissionId: job.submissionId, facultyId: job.facultyId });
    if (evaluation?.source === 'faculty') continue;
    await database.collection('evaluation_jobs').updateOne(
      { _id: job._id, status: 'failed', retryable: true },
      { $set: { status: 'pending', error: null, finishedAt: null, queuedAt: new Date(), updatedAt: new Date() } },
    );
    await database.collection('evaluation_job_locks').updateOne(
      { facultyId: job.facultyId, submissionId: job.submissionId },
      { $setOnInsert: { facultyId: job.facultyId, submissionId: job.submissionId, jobId: job._id, createdAt: new Date() } },
      { upsert: true },
    );
  }
  await database.collection('evaluation_batches').updateOne({ _id: batch._id }, { $set: { status: 'pending', updatedAt: new Date() } });
  scheduleWorker();
  return getEvaluationBatch(database, facultyId, batchId);
}
