import assert from 'node:assert/strict';
import test from 'node:test';
import { ObjectId } from 'mongodb';
import {
  parseAssignmentInput,
  parseTestCaseInput,
} from './assignments.schema.js';
import {
  AssignmentAccessError,
  createAssignment,
  createTestCase,
  getAssignment,
  initializeAssignmentCollections,
  listAssignments,
  listTestCases,
} from './assignments.service.js';

function matches(document, query) {
  return Object.entries(query).every(([key, value]) => {
    if (key === '$or') return value.some((condition) => matches(document, condition));
    if (Array.isArray(document[key])) return document[key].some((item) => String(item) === String(value));
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
    const saved = { ...document, _id: new ObjectId() };
    this.documents.push(saved);
    return { insertedId: saved._id };
  }

  async findOne(query) {
    return this.documents.find((document) => matches(document, query)) || null;
  }

  find(query) {
    let documents = this.documents.filter((document) => matches(document, query));
    const cursor = {
      sort: (sortSpec) => {
        const [[field, direction]] = Object.entries(sortSpec);
        documents = [...documents].sort(
          (left, right) => (left[field] > right[field] ? 1 : -1) * direction,
        );
        return cursor;
      },
      toArray: async () => documents,
    };
    return cursor;
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

const assignmentInput = {
  title: 'Array sum',
  course: 'CS101',
  description: 'Return the sum of two values.',
  evaluationCriteria: 'Use O(1) extra space and handle negative values.',
  due: '2026-12-01',
  points: 20,
};

test('assignment APIs scope faculty records and expose only published work to students', async () => {
  const database = createDatabase();
  await initializeAssignmentCollections(database);
  const facultyId = new ObjectId().toString();
  const otherFacultyId = new ObjectId().toString();
  const student = { id: new ObjectId().toString(), role: 'student' };
  await database.collection('students').insertOne({ userId: new ObjectId(student.id), year: 2, status: 'active' });

  const published = await createAssignment(
    database,
    facultyId,
    parseAssignmentInput(assignmentInput),
  );
  assert.equal(published.evaluationCriteria, assignmentInput.evaluationCriteria);
  const draft = await createAssignment(
    database,
    facultyId,
    parseAssignmentInput({ ...assignmentInput, title: 'Draft', status: 'draft' }),
  );

  assert.equal((await listAssignments(database, { id: facultyId, role: 'faculty' })).length, 2);
  assert.equal((await listAssignments(database, { id: otherFacultyId, role: 'faculty' })).length, 0);
  assert.deepEqual(
    (await listAssignments(database, student)).map((assignment) => assignment.id),
    [published.id],
  );
  await assert.rejects(
    getAssignment(database, draft.id, student),
    AssignmentAccessError,
  );
});

test('students can only discover and open assignments targeted to their academic year', async () => {
  const database = createDatabase();
  const facultyId = new ObjectId().toString();
  const yearTwoStudent = { id: new ObjectId().toString(), role: 'student' };
  const yearOneStudent = { id: new ObjectId().toString(), role: 'student' };
  await database.collection('students').insertOne({ userId: new ObjectId(yearTwoStudent.id), year: 2, status: 'active' });
  await database.collection('students').insertOne({ userId: new ObjectId(yearOneStudent.id), year: 1, status: 'active' });
  const assignment = await createAssignment(database, facultyId, parseAssignmentInput({
    ...assignmentInput, targetYears: [2],
  }));
  assert.deepEqual((await listAssignments(database, yearTwoStudent)).map((item) => item.id), [assignment.id]);
  assert.deepEqual(await listAssignments(database, yearOneStudent), []);
  assert.equal((await getAssignment(database, assignment.id, yearTwoStudent)).id, assignment.id);
  await assert.rejects(getAssignment(database, assignment.id, yearOneStudent), AssignmentAccessError);
});

test('evaluation criteria are optional, bounded, and can be cleared during a partial update', () => {
  const withoutCriteria = parseAssignmentInput({
    ...assignmentInput,
    evaluationCriteria: undefined,
  });
  assert.equal(withoutCriteria.evaluationCriteria, '');

  assert.throws(
    () => parseAssignmentInput({
      ...assignmentInput,
      evaluationCriteria: 'x'.repeat(5001),
    }),
    /Evaluation criteria must be 5000 characters or fewer/,
  );
  assert.equal(
    parseAssignmentInput({ evaluationCriteria: '' }, { partial: true }).evaluationCriteria,
    '',
  );
});

test('student test-case queries never include hidden cases', async () => {
  const database = createDatabase();
  await initializeAssignmentCollections(database);
  const faculty = { id: new ObjectId().toString(), role: 'faculty' };
  const student = { id: new ObjectId().toString(), role: 'student' };
  const assignment = await createAssignment(
    database,
    faculty.id,
    parseAssignmentInput(assignmentInput),
  );

  await createTestCase(
    database,
    assignment.id,
    faculty.id,
    parseTestCaseInput({
      inputProfile: 'Sum two values',
      input: '1 2\n',
      expectedOutput: '3\n',
      visibility: 'Public',
    }),
  );
  await createTestCase(
    database,
    assignment.id,
    faculty.id,
    parseTestCaseInput({
      inputProfile: 'Hidden sum case',
      input: '2 3\n',
      expectedOutput: '5\n',
      visibility: 'Hidden',
    }),
  );

  const visibleCases = await listTestCases(database, assignment.id, student);
  assert.equal(visibleCases.length, 1);
  assert.equal(visibleCases[0].visibility, 'Public');
  assert.equal(visibleCases[0].input, '1 2\n');
  assert.equal(visibleCases[0].expectedOutput, '3\n');
  assert.equal('input' in (await listTestCases(database, assignment.id, student))[0], true);
  assert.deepEqual(
    new Set((await listTestCases(database, assignment.id, faculty)).map((testCase) => testCase.visibility)),
    new Set(['Public', 'Hidden']),
  );
});
