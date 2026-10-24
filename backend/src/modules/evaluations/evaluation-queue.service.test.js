import assert from 'node:assert/strict';
import test from 'node:test';
import { ObjectId } from 'mongodb';
import {
  createEvaluationBatch,
  getEvaluationBatch,
  initializeEvaluationQueueCollections,
  retryFailedEvaluationJobs,
  startEvaluationQueue,
} from './evaluation-queue.service.js';

function same(left, right) {
  return String(left) === String(right);
}

function matches(document, query = {}) {
  return Object.entries(query).every(([key, expected]) => {
    const actual = document[key];
    if (expected && typeof expected === 'object' && '$in' in expected) {
      return expected.$in.some((item) => same(actual, item) || (Array.isArray(actual) && actual.some((value) => same(value, item))));
    }
    if (expected && typeof expected === 'object' && '$ne' in expected) return !same(actual, expected.$ne);
    if (Array.isArray(actual) && !(Array.isArray(expected))) return actual.some((value) => same(value, expected));
    return same(actual, expected);
  });
}

class MemoryCollection {
  documents = [];

  constructor(name) { this.name = name; }

  async createIndex() {}

  async insertOne(document) {
    if (!document._id) document._id = new ObjectId();
    if (this.documents.some((candidate) => matches(candidate, { _id: document._id }))) {
      const error = new Error('duplicate id');
      error.code = 11000;
      throw error;
    }
    if (this.name === 'evaluation_job_locks' && this.documents.some((candidate) => document.submissionId && matches(candidate, {
      facultyId: document.facultyId,
      submissionId: document.submissionId,
    }))) {
      const error = new Error('duplicate lock');
      error.code = 11000;
      throw error;
    }
    this.documents.push({ ...document });
    return { insertedId: document._id };
  }

  find(query = {}) {
    const collection = this;
    const cursor = {
      sort(sortSpec) {
        const [[field, direction]] = Object.entries(sortSpec || {});
        this.records.sort((left, right) => (left[field] - right[field]) * direction);
        return this;
      },
      async toArray() { return this.records; },
      records: collection.documents.filter((document) => matches(document, query)),
    };
    return cursor;
  }

  async findOne(query = {}, options = {}) {
    const records = this.documents.filter((document) => matches(document, query));
    const sort = options.sort;
    if (sort) {
      const [[field, direction]] = Object.entries(sort);
      records.sort((left, right) => (left[field] - right[field]) * direction);
    }
    return records[0] || null;
  }

  async updateOne(query, update, options = {}) {
    let document = this.documents.find((candidate) => matches(candidate, query));
    if (!document && options.upsert) {
      document = Object.fromEntries(Object.entries(query).filter(([, value]) => !(value && typeof value === 'object')));
      Object.assign(document, update.$setOnInsert || {});
      this.documents.push(document);
    }
    if (!document) return { matchedCount: 0, modifiedCount: 0 };
    Object.assign(document, update.$set || {});
    return { matchedCount: 1, modifiedCount: 1 };
  }

  async updateMany(query, update) {
    const documents = this.documents.filter((candidate) => matches(candidate, query));
    documents.forEach((document) => Object.assign(document, update.$set || {}));
    return { matchedCount: documents.length, modifiedCount: documents.length };
  }

  async deleteOne(query) {
    const index = this.documents.findIndex((document) => matches(document, query));
    if (index >= 0) this.documents.splice(index, 1);
    return { deletedCount: index >= 0 ? 1 : 0 };
  }

  async deleteMany(query) {
    const before = this.documents.length;
    this.documents = this.documents.filter((document) => !matches(document, query));
    return { deletedCount: before - this.documents.length };
  }
}

function createDatabase() {
  const collections = new Map();
  return {
    collection(name) {
      if (!collections.has(name)) collections.set(name, new MemoryCollection(name));
      return collections.get(name);
    },
  };
}

async function waitForBatch(database, facultyId, batchId) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const batch = await getEvaluationBatch(database, facultyId, batchId);
    if (['completed', 'failed'].includes(batch.status)) return batch;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error('Evaluation queue did not finish in time.');
}

test('batch jobs run sequentially, isolate failures, retry transient errors, and deduplicate active work', async () => {
  const database = createDatabase();
  const facultyId = new ObjectId();
  const ids = [new ObjectId(), new ObjectId(), new ObjectId(), new ObjectId(), new ObjectId()];
  database.collection('submissions').documents = ids.map((id, index) => ({ _id: id, facultyId, code: `code-${index}` }));
  await initializeEvaluationQueueCollections(database);

  let active = 0;
  let maxActive = 0;
  const callCount = new Map();
  let releaseHeldJob;
  let heldJobStarted;
  const heldStarted = new Promise((resolve) => { heldJobStarted = resolve; });
  const holdJob = new Promise((resolve) => { releaseHeldJob = resolve; });

  await startEvaluationQueue(database, {
    retryLimit: 1,
    retryDelayMs: 1,
    dependencies: {
      getFacultySubmission: async (_database, submissionId) => {
        const index = ids.findIndex((id) => same(id, submissionId));
        return {
          code: `code-${index}`,
          assignmentTitle: 'Queue test',
          assignmentDescription: 'Exercise queue behavior.',
          evaluationCriteria: '',
          language: 'python',
          maxScore: 10,
        };
      },
      collectExecutionEvidence: async () => ({ available: false }),
      withOllamaLock: (task) => task(),
      generateEvaluationWithOllama: async ({ code, onRequestStart, onMetrics }) => {
        onRequestStart?.(new Date());
        active += 1;
        maxActive = Math.max(maxActive, active);
        const count = (callCount.get(code) || 0) + 1;
        callCount.set(code, count);
        try {
          await new Promise((resolve) => setTimeout(resolve, 2));
          if (code === 'code-0') {
            const error = new Error('permanent validation failure');
            error.statusCode = 400;
            throw error;
          }
          if (code === 'code-1' && count === 1) {
            const error = new Error('temporary Ollama outage');
            error.statusCode = 503;
            throw error;
          }
          if (code === 'code-4' && count <= 2) {
            const error = new Error('temporary Ollama outage');
            error.statusCode = 503;
            throw error;
          }
          if (code === 'code-3') {
            heldJobStarted();
            await holdJob;
          }
          const metrics = {
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            totalDurationMs: 2,
            loadDurationMs: 1,
            promptEvalDurationMs: 0.5,
            evalDurationMs: 1,
            promptTokens: 20,
            generatedTokens: 10,
            tokensPerSecond: 10_000,
          };
          onMetrics?.(metrics);
          return { score: 8, feedback: 'A sufficiently detailed test evaluation.', status: 'draft', metrics };
        } finally {
          active -= 1;
        }
      },
      saveAIEvaluation: async (db, submissionId, ownerId) => {
        await db.collection('evaluations').insertOne({
          submissionId: new ObjectId(submissionId),
          facultyId: new ObjectId(ownerId),
          score: 8,
          status: 'published',
          source: 'ollama',
        });
        return { score: 8, status: 'published', source: 'ollama', submissionId };
      },
    },
  });

  const firstBatch = await createEvaluationBatch(database, facultyId.toString(), [ids[0], ids[1], ids[2], ids[4]].map(String));
  const firstResult = await waitForBatch(database, facultyId.toString(), firstBatch.id);
  assert.equal(firstResult.status, 'failed');
  assert.deepEqual(firstResult.jobs.map((job) => job.status), ['failed', 'completed', 'completed', 'failed']);
  const completedJob = database.collection('evaluation_jobs').documents.find(
    (job) => same(job._id, new ObjectId(firstResult.jobs[1].id)),
  );
  assert.equal(typeof completedJob.timings.queueWaitMs, 'number');
  assert.equal(typeof completedJob.timings.executionEvidenceMs, 'number');
  assert.equal(typeof completedJob.timings.ollamaLockWaitMs, 'number');
  assert.equal(completedJob.timings.ollamaMs, 2);
  assert.equal(completedJob.timings.loadDurationMs, 1);
  assert.equal(completedJob.timings.promptEvalDurationMs, 0.5);
  assert.equal(completedJob.timings.evalDurationMs, 1);
  assert.equal(completedJob.timings.promptTokens, 20);
  assert.equal(completedJob.timings.generatedTokens, 10);
  assert.equal(typeof completedJob.timings.tokensPerSecond, 'number');
  assert.equal(typeof completedJob.timings.databaseMs, 'number');
  assert.equal(typeof completedJob.timings.totalMs, 'number');
  assert.equal(firstResult.jobs[0].retryable, false);
  assert.equal(firstResult.jobs[1].attemptCount, 2);
  assert.equal(callCount.get('code-1'), 2);
  assert.equal(firstResult.jobs[3].retryable, true);
  assert.equal(firstResult.jobs[3].attemptCount, 2);
  assert.equal(maxActive, 1);
  const completedSubmissionBatch = await createEvaluationBatch(database, facultyId.toString(), [String(ids[2])]);
  assert.equal(completedSubmissionBatch.status, 'completed');
  assert.equal(completedSubmissionBatch.jobs[0].evaluation.source, 'ollama');
  assert.equal(callCount.get('code-2'), 1);
  await assert.rejects(
    getEvaluationBatch(database, new ObjectId().toString(), firstBatch.id),
    (error) => error.statusCode === 404,
  );

  await retryFailedEvaluationJobs(database, facultyId.toString(), firstBatch.id);
  const retriedResult = await waitForBatch(database, facultyId.toString(), firstBatch.id);
  assert.equal(retriedResult.jobs[3].status, 'completed');
  assert.equal(retriedResult.jobs[3].attemptCount, 3);

  const heldBatch = await createEvaluationBatch(database, facultyId.toString(), [String(ids[3])]);
  await heldStarted;
  const duplicateBatch = await createEvaluationBatch(database, facultyId.toString(), [String(ids[3])]);
  assert.equal(database.collection('evaluation_jobs').documents.filter((job) => same(job.submissionId, ids[3])).length, 1);
  assert.equal(duplicateBatch.jobs[0].id, heldBatch.jobs[0].id);
  releaseHeldJob();
  const heldResult = await waitForBatch(database, facultyId.toString(), heldBatch.id);
  const duplicateResult = await waitForBatch(database, facultyId.toString(), duplicateBatch.id);
  assert.equal(heldResult.status, 'completed');
  assert.equal(duplicateResult.status, 'completed');
  assert.equal(callCount.get('code-3'), 1);
});
