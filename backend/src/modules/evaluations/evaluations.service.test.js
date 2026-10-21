import assert from 'node:assert/strict';
import test from 'node:test';
import { ObjectId } from 'mongodb';
import { parseAssignmentInput } from '../assignments/assignments.schema.js';
import { createAssignment, initializeAssignmentCollections } from '../assignments/assignments.service.js';
import {
  createSubmission,
  getStudentSubmission,
  initializeSubmissionCollections,
  listStudentSubmissions,
} from '../submissions/submissions.service.js';
import {
  getEvaluation,
  getPublishedEvaluation,
  initializeEvaluationCollections,
  saveEvaluation,
} from './evaluations.service.js';

function matches(document, query) {
  return Object.entries(query).every(([key, value]) => {
    if (value && typeof value === 'object' && '$exists' in value) {
      return (key in document) === value.$exists;
    }
    return String(document[key]) === String(value);
  });
}

class MemoryCollection {
  documents = [];

  async createIndex() {}

  async insertOne(document) {
    const saved = { ...document, _id: document._id || new ObjectId() };
    this.documents.push(saved);
    return { insertedId: saved._id };
  }

  async findOne(query) {
    return this.documents.find((document) => matches(document, query)) || null;
  }

  find(query) {
    const documents = this.documents.filter((document) => matches(document, query));
    return {
      sort() {
        return this;
      },
      async toArray() {
        return documents;
      },
    };
  }

  async updateOne(query, update) {
    const document = this.documents.find((candidate) => matches(candidate, query));
    if (document) Object.assign(document, update.$set);
  }
}

function createDatabase() {
  const collections = new Map();
  return {
    collection(name) {
      if (!collections.has(name)) collections.set(name, new MemoryCollection());
      return collections.get(name);
    },
  };
}

test('faculty evaluations persist as drafts and become student-visible only when published', async () => {
  const database = createDatabase();
  await initializeAssignmentCollections(database);
  await initializeSubmissionCollections(database);
  await initializeEvaluationCollections(database);

  const facultyId = new ObjectId().toString();
  const otherFacultyId = new ObjectId().toString();
  const studentId = new ObjectId().toString();
  await database.collection('students').insertOne({ userId: new ObjectId(studentId), year: 1, status: 'active' });
  const assignment = await createAssignment(database, facultyId, parseAssignmentInput({
    title: 'Array sum',
    course: 'CS101',
    description: 'Return the sum.',
    due: '2026-12-01',
    points: 10,
  }));
  const submission = await createSubmission(
    database,
    { id: studentId, role: 'student' },
    { assignmentId: assignment.id, language: 'python', code: 'print(1 + 2)' },
  );

  const draft = await saveEvaluation(database, submission.id, facultyId, {
    score: 8,
    feedback: 'Good structure.',
    status: 'draft',
  });
  assert.equal(draft.status, 'draft');
  assert.equal(await getPublishedEvaluation(database, submission.id, studentId), null);
  assert.equal((await getStudentSubmission(database, submission.id, studentId)).evaluation, undefined);
  assert.equal((await listStudentSubmissions(database, studentId))[0].evaluation, undefined);
  assert.equal((await getEvaluation(database, submission.id, facultyId)).feedback, 'Good structure.');

  const aiDraft = await saveEvaluation(
    database,
    submission.id,
    facultyId,
    { score: 7, feedback: 'AI-generated feedback.', status: 'draft' },
    { source: 'ollama' },
  );
  assert.equal(aiDraft.source, 'ollama');
  assert.equal(await getPublishedEvaluation(database, submission.id, studentId), null);

  const published = await saveEvaluation(database, submission.id, facultyId, {
    score: 9,
    feedback: 'Correct and clear.',
    aiFeedback: 'The submitted code correctly handles the stated requirement.',
    status: 'published',
  });
  assert.equal(published.status, 'published');
  assert.equal(published.aiFeedback, 'The submitted code correctly handles the stated requirement.');
  assert.equal((await getPublishedEvaluation(database, submission.id, studentId)).score, 9);
  assert.equal((await getStudentSubmission(database, submission.id, studentId)).evaluation.aiFeedback, published.aiFeedback);
  assert.equal((await listStudentSubmissions(database, studentId))[0].evaluation.feedback, 'Correct and clear.');
  assert.equal((await listStudentSubmissions(database, studentId))[0].evaluation.aiFeedback, published.aiFeedback);

  const autoPublished = await saveEvaluation(
    database,
    submission.id,
    facultyId,
    {
      score: 10,
      feedback: 'AI judged this solution correct.',
      guidance: {
        category: 'none',
        issue: 'No clear error found.',
        explanation: 'The code appears to meet the stated requirement.',
        correctionSteps: ['Try additional edge cases.'],
        correctedCode: '',
      },
      status: 'published',
    },
    { source: 'ollama' },
  );
  assert.equal(autoPublished.status, 'published');
  assert.equal(autoPublished.source, 'ollama');
  assert.equal(autoPublished.guidance.category, 'none');
  assert.equal(
    (await getPublishedEvaluation(database, submission.id, studentId)).feedback,
    'AI judged this solution correct.',
  );
  assert.equal(
    (await getPublishedEvaluation(database, submission.id, studentId)).guidance.correctionSteps[0],
    'Try additional edge cases.',
  );
  assert.equal(
    (await getStudentSubmission(database, submission.id, studentId)).evaluation.guidance.category,
    'none',
  );
  assert.equal(
    (await listStudentSubmissions(database, studentId))[0].evaluation.guidance.issue,
    'No clear error found.',
  );
  assert.equal(
    (await getStudentSubmission(database, submission.id, studentId)).evaluation.source,
    'ollama',
  );
  await assert.rejects(
    getEvaluation(database, submission.id, otherFacultyId),
    /Submission not found/,
  );
});
