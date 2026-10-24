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
  saveAIEvaluation,
  EvaluationConflictError,
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
    return { matchedCount: document ? 1 : 0 };
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

  await assert.rejects(
    saveAIEvaluation(database, submission.id, facultyId, {
      score: 7,
      feedback: 'AI-generated feedback.',
      status: 'published',
    }),
    (error) => error instanceof EvaluationConflictError && error.statusCode === 409,
  );
  assert.equal((await getEvaluation(database, submission.id, facultyId)).score, 8);
  assert.equal((await getEvaluation(database, submission.id, facultyId)).feedback, 'Good structure.');
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

  const aiSubmission = await createSubmission(
    database,
    { id: studentId, role: 'student' },
    { assignmentId: assignment.id, language: 'python', code: 'print(1 + 2)' },
  );
  const aiPublished = await saveAIEvaluation(database, aiSubmission.id, facultyId, {
    score: 10,
    feedback: 'AI judged this solution correct.',
    guidance: {
      category: 'none',
      issue: 'No clear error found.',
      explanation: 'The code appears to meet the stated requirement.',
      correctionSteps: [],
      correctedCode: '',
    },
    status: 'published',
  });
  const autoPublished = await saveAIEvaluation(database, aiSubmission.id, facultyId, {
    score: 9,
    feedback: 'The solution meets the requirement, with a small improvement available.',
    guidance: {
      category: 'logic',
      issue: 'A small improvement is available.',
      explanation: 'The submitted solution is correct, but could be clearer.',
      correctionSteps: ['Use a clearer expression.'],
      correctedCode: 'print(3)',
    },
    status: 'published',
  });
  assert.equal(autoPublished.status, 'published');
  assert.equal(autoPublished.source, 'ollama');
  assert.equal(autoPublished.guidance.category, 'logic');
  assert.equal(aiPublished.status, 'published');
  assert.equal(
    (await getPublishedEvaluation(database, aiSubmission.id, studentId)).feedback,
    'The solution meets the requirement, with a small improvement available.',
  );
  assert.equal(
    (await getPublishedEvaluation(database, aiSubmission.id, studentId)).guidance.correctionSteps[0],
    'Use a clearer expression.',
  );
  assert.equal(
    (await getStudentSubmission(database, aiSubmission.id, studentId)).evaluation.guidance.category,
    'logic',
  );
  assert.equal(
    (await listStudentSubmissions(database, studentId)).find((item) => item.id === aiSubmission.id).evaluation.guidance.issue,
    'A small improvement is available.',
  );
  assert.equal(
    (await getStudentSubmission(database, aiSubmission.id, studentId)).evaluation.source,
    'ollama',
  );
  await assert.rejects(
    getEvaluation(database, submission.id, otherFacultyId),
    /Submission not found/,
  );
});
