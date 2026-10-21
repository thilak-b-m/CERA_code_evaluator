import assert from 'node:assert/strict';
import test from 'node:test';
import { ObjectId } from 'mongodb';
import { parseAssignmentInput, parseTestCaseInput } from '../assignments/assignments.schema.js';
import {
  AssignmentAccessError,
  createAssignment,
  createTestCase,
  initializeAssignmentCollections,
} from '../assignments/assignments.service.js';
import {
  collectExecutionEvidence,
  createSubmission,
  getStudentSubmission,
  initializeSubmissionCollections,
  listFacultySubmissions,
  listStudentSubmissions,
  runSubmission,
} from './submissions.service.js';
import { ExecutionUnavailableError } from './execution.worker.js';

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

test('students can submit source to published assignments and only read their own submissions', async () => {
  const database = createDatabase();
  await initializeAssignmentCollections(database);
  await initializeSubmissionCollections(database);

  const facultyId = new ObjectId().toString();
  const studentId = new ObjectId().toString();
  const otherStudentId = new ObjectId().toString();
  await database.collection('students').insertOne({ userId: new ObjectId(studentId), year: 2, status: 'active' });
  await database.collection('students').insertOne({ userId: new ObjectId(otherStudentId), year: 2, status: 'active' });
  const assignment = await createAssignment(database, facultyId, parseAssignmentInput({
    title: 'Two sum',
    course: 'CS101',
    description: 'Add two integers.',
    due: '2026-12-01',
    points: 10,
    languages: ['python'],
  }));

  const submission = await createSubmission(
    database,
    { id: studentId, role: 'student' },
    { assignmentId: assignment.id, language: 'python', code: 'print(1 + 2)' },
  );
  assert.equal(submission.status, 'submitted');
  assert.equal(submission.code, 'print(1 + 2)');
  assert.equal((await listStudentSubmissions(database, studentId)).length, 1);
  assert.equal((await listStudentSubmissions(database, otherStudentId)).length, 0);
  assert.equal((await listFacultySubmissions(database, facultyId)).length, 1);
  assert.equal((await getStudentSubmission(database, submission.id, studentId)).id, submission.id);
  await assert.rejects(
    getStudentSubmission(database, submission.id, otherStudentId),
    /Submission not found/,
  );
});

test('students cannot submit to drafts or use disabled languages', async () => {
  const database = createDatabase();
  await initializeAssignmentCollections(database);
  await initializeSubmissionCollections(database);
  const facultyId = new ObjectId().toString();
  const assignment = await createAssignment(database, facultyId, parseAssignmentInput({
    title: 'Draft exercise',
    course: 'CS101',
    description: 'Not published.',
    due: '2026-12-01',
    points: 10,
    languages: ['python'],
    status: 'draft',
  }));

  const draftStudentId = new ObjectId().toString();
  await database.collection('students').insertOne({ userId: new ObjectId(draftStudentId), year: 1, status: 'active' });
  await assert.rejects(
    createSubmission(
      database,
      { id: draftStudentId, role: 'student' },
      { assignmentId: assignment.id, language: 'python', code: 'print(1)' },
    ),
    AssignmentAccessError,
  );

  const published = await createAssignment(database, facultyId, parseAssignmentInput({
    title: 'Published exercise',
    course: 'CS101',
    description: 'Python only.',
    due: '2026-12-01',
    points: 10,
    languages: ['python'],
  }));
  const wrongLanguageStudentId = new ObjectId().toString();
  await database.collection('students').insertOne({ userId: new ObjectId(wrongLanguageStudentId), year: 1, status: 'active' });
  await assert.rejects(
    createSubmission(
      database,
      { id: wrongLanguageStudentId, role: 'student' },
      { assignmentId: published.id, language: 'java', code: 'class Main {}' },
    ),
    /language is not enabled/,
  );
});

test('submission and execution reject students outside assignment target years', async () => {
  const database = createDatabase();
  await initializeAssignmentCollections(database);
  await initializeSubmissionCollections(database);
  const facultyId = new ObjectId().toString();
  const firstYearStudent = { id: new ObjectId().toString(), role: 'student' };
  await database.collection('students').insertOne({ userId: new ObjectId(firstYearStudent.id), year: 1, status: 'active' });
  const assignment = await createAssignment(database, facultyId, parseAssignmentInput({
    title: 'Year two only', course: 'CS101', description: 'Targeted.', due: '2026-12-01', points: 10,
    targetYears: [2], languages: ['python'],
  }));
  await assert.rejects(createSubmission(database, firstYearStudent, {
    assignmentId: assignment.id, language: 'python', code: 'print(1)',
  }), AssignmentAccessError);
  await assert.rejects(runSubmission(database, {
    assignmentId: assignment.id, language: 'python', code: 'print(1)',
  }, undefined, firstYearStudent), AssignmentAccessError);
});

test('code runs only public executable cases for an enabled, published assignment', async () => {
  const database = createDatabase();
  await initializeAssignmentCollections(database);
  const facultyId = new ObjectId().toString();
  const assignment = await createAssignment(database, facultyId, parseAssignmentInput({
    title: 'Add two values',
    course: 'CS101',
    description: 'Print the sum of two integers.',
    due: '2026-12-01',
    points: 10,
    languages: ['python'],
  }));
  await createTestCase(
    database,
    assignment.id,
    facultyId,
    parseTestCaseInput({
      inputProfile: 'Two integers',
      input: '2 3\n',
      expectedOutput: '5\n',
      visibility: 'Public',
    }),
  );
  await createTestCase(
    database,
    assignment.id,
    facultyId,
    parseTestCaseInput({
      inputProfile: 'Hidden case',
      input: '4 7\n',
      expectedOutput: '11\n',
      visibility: 'Hidden',
    }),
  );

  const executedInputs = [];
  const run = await runSubmission(
    database,
    { assignmentId: assignment.id, language: 'python', code: 'print(2 + 3)' },
    async (testCase) => {
      executedInputs.push(testCase.input);
      return {
        status: 'Passed',
        actualOutput: '5\n',
        executionTimeMs: 12,
      };
    },
  );
  assert.deepEqual(executedInputs, ['2 3\n']);
  assert.equal(run.summary.status, 'Passed');
  assert.equal(run.summary.passed, 1);
  assert.equal(run.testCases[0].expectedOutput, '5\n');
});

test('code run rejects assignments without executable public cases', async () => {
  const database = createDatabase();
  await initializeAssignmentCollections(database);
  const facultyId = new ObjectId().toString();
  const assignment = await createAssignment(database, facultyId, parseAssignmentInput({
    title: 'No tests',
    course: 'CS101',
    description: 'Add test cases first.',
    due: '2026-12-01',
    points: 10,
  }));

  await assert.rejects(
    runSubmission(
      database,
      { assignmentId: assignment.id, language: 'python', code: 'print(1)' },
    ),
    /no public executable test cases/,
  );
});

test('code run explains when a public legacy case has no stdin/stdout', async () => {
  const database = createDatabase();
  await initializeAssignmentCollections(database);
  const facultyId = new ObjectId().toString();
  const assignment = await createAssignment(database, facultyId, parseAssignmentInput({
    title: 'Legacy exercise',
    course: 'CS101',
    description: 'Existing descriptive case.',
    due: '2026-12-01',
    points: 10,
  }));
  await database.collection('assignment_test_cases').insertOne({
    assignmentId: new ObjectId(assignment.id),
    visibility: 'Public',
  });

  await assert.rejects(
    runSubmission(database, {
      assignmentId: assignment.id,
      language: 'python',
      code: 'print(1)',
    }),
    /without executable stdin\/stdout/,
  );
});

// ---------------------------------------------------------------------------
// Execution evidence for AI grading.
//
// These tests cover deterministic execution behaviour only. The simulated
// executor reproduces exactly the contract of the Docker worker
// (`executeTestCase`): given language/code/input/expectedOutput it returns
// { status, actualOutput, diagnostic, executionTimeMs }, where status is
// 'Passed' | 'Failed' | 'Error' | 'Timeout'. No LLM is involved.
// ---------------------------------------------------------------------------

const BUGGY_LOOP_CODE = 'def reverse_string(s):\n    rev = ""\n    for i in range(len(s), 0, -1):\n        rev += s[i]\n    return rev\n';

const REVERSAL_CASES = [
  { inputProfile: 'Empty string', input: '\n', expectedOutput: '\n' },
  { inputProfile: 'Single character', input: 'a\n', expectedOutput: 'a\n' },
  { inputProfile: 'Mixed case', input: 'Trae\n', expectedOutput: 'earT\n' },
  { inputProfile: 'Embedded spaces', input: 'hi there\n', expectedOutput: 'ereht ih\n' },
];

function normalizeOutput(value) {
  return String(value).replace(/\r\n/g, '\n').trim();
}

function dockerResult(actualOutput, expectedOutput, { exitCode = 0, diagnostic = '', executionTimeMs = 5 } = {}) {
  const status = exitCode === 0 && normalizeOutput(actualOutput) === normalizeOutput(expectedOutput)
    ? 'Passed'
    : exitCode === 0
      ? 'Failed'
      : 'Error';
  return { status, actualOutput, diagnostic: status === 'Error' ? diagnostic : '', executionTimeMs };
}

const EXECUTION_VARIANTS = [
  {
    name: 'correct output is returned and printed',
    code: 'print(input()[::-1])\n',
    expectedByInput: { '': 'Passed', a: 'Passed', Trae: 'Passed', 'hi there': 'Passed' },
    run: ({ expectedOutput }) => dockerResult(expectedOutput, expectedOutput),
  },
  {
    name: 'incorrect loop bounds raise IndexError for every non-empty string',
    code: BUGGY_LOOP_CODE,
    expectedByInput: { '': 'Passed', a: 'Error', Trae: 'Error', 'hi there': 'Error' },
    expectedDiagnostic: 'IndexError: string index out of range',
    run: ({ input, expectedOutput }) => (normalizeOutput(input) === ''
      ? dockerResult('', expectedOutput)
      : dockerResult('', expectedOutput, { exitCode: 1, diagnostic: 'IndexError: string index out of range' })),
  },
  {
    name: 'correct value is returned but never printed',
    code: 'def reverse_string(s):\n    return s[::-1]\n\nreverse_string(input())\n',
    expectedByInput: { '': 'Passed', a: 'Failed', Trae: 'Failed', 'hi there': 'Failed' },
    run: ({ expectedOutput }) => dockerResult('', expectedOutput),
  },
  {
    name: 'incorrect output is produced for non-empty input',
    code: 'print("wrong")\n',
    expectedByInput: { '': 'Passed', a: 'Failed', Trae: 'Failed', 'hi there': 'Failed' },
    run: ({ input, expectedOutput }) => dockerResult(
      normalizeOutput(input) === '' ? '' : 'wrong',
      expectedOutput,
    ),
  },
  {
    name: 'a syntax error prevents execution',
    code: 'def reverse_string s\n',
    expectedByInput: { '': 'Error', a: 'Error', Trae: 'Error', 'hi there': 'Error' },
    expectedDiagnostic: 'SyntaxError: invalid syntax',
    run: ({ expectedOutput }) => dockerResult('', expectedOutput, {
      exitCode: 1,
      diagnostic: 'SyntaxError: invalid syntax',
    }),
  },
  {
    name: 'execution exceeds the time limit',
    code: 'while True:\n    pass\n',
    expectedByInput: { '': 'Timeout', a: 'Timeout', Trae: 'Timeout', 'hi there': 'Timeout' },
    expectedDiagnostic: 'Execution exceeded the time limit.',
    run: () => ({
      status: 'Timeout',
      actualOutput: '',
      diagnostic: 'Execution exceeded the time limit.',
      executionTimeMs: 5000,
    }),
  },
];

async function createReversalAssignment(database, facultyId) {
  const assignment = await createAssignment(database, facultyId, parseAssignmentInput({
    title: 'Reverse a string',
    course: 'CS101',
    description: 'Reverse the input string. Empty strings stay empty, single characters are unchanged, casing and spaces are preserved.',
    due: '2026-12-01',
    points: 10,
    languages: ['python'],
  }));
  for (const testCase of REVERSAL_CASES) {
    await createTestCase(
      database,
      assignment.id,
      facultyId,
      parseTestCaseInput({ ...testCase, visibility: 'Public' }),
    );
  }
  // A hidden case proves evidence never leaks non-public test data.
  await createTestCase(database, assignment.id, facultyId, parseTestCaseInput({
    inputProfile: 'Hidden case',
    input: 'hidden\n',
    expectedOutput: 'neddih\n',
    visibility: 'Hidden',
  }));
  return assignment;
}

test('execution evidence matches the real Docker outcome for every reversal scenario', async () => {
  const database = createDatabase();
  await initializeAssignmentCollections(database);
  const facultyId = new ObjectId().toString();
  const assignment = await createReversalAssignment(database, facultyId);

  for (const variant of EXECUTION_VARIANTS) {
    const evidence = await collectExecutionEvidence(
      database,
      { assignmentId: assignment.id, language: 'python', code: variant.code },
      async (testCase) => variant.run(testCase),
    );

    assert.equal(evidence.available, true, variant.name);
    assert.equal(evidence.summary.total, REVERSAL_CASES.length, variant.name);
    // Status is asserted per input rather than by position: the in-memory test
    // collection does not guarantee ordering for equal createdAt values.
    assert.deepEqual(
      Object.fromEntries(evidence.testCases.map((testCase) => [testCase.input, testCase.status])),
      variant.expectedByInput,
      variant.name,
    );
    // Hidden test cases must never be forwarded to the model.
    assert.equal(evidence.testCases.length, REVERSAL_CASES.length, variant.name);
    if (variant.expectedDiagnostic) {
      assert.ok(
        evidence.testCases.some((testCase) => testCase.diagnostic === variant.expectedDiagnostic),
        `${variant.name}: expected diagnostic ${variant.expectedDiagnostic}`,
      );
    }
  }
});

test('execution evidence reports the failing test detail for the buggy reversal loop', async () => {
  const database = createDatabase();
  await initializeAssignmentCollections(database);
  const facultyId = new ObjectId().toString();
  const assignment = await createReversalAssignment(database, facultyId);

  const evidence = await collectExecutionEvidence(
    database,
    { assignmentId: assignment.id, language: 'python', code: BUGGY_LOOP_CODE },
    async ({ input, expectedOutput }) => (normalizeOutput(input) === ''
      ? dockerResult('', expectedOutput)
      : dockerResult('', expectedOutput, { exitCode: 1, diagnostic: 'IndexError: string index out of range' })),
  );

  assert.equal(evidence.summary.status, 'Failed');
  assert.equal(evidence.summary.passed, 1);
  const emptyStringCase = evidence.testCases.find((testCase) => testCase.input === '');
  const singleCharacterCase = evidence.testCases.find((testCase) => testCase.input === 'a');
  assert.equal(emptyStringCase.status, 'Passed');
  assert.equal(singleCharacterCase.status, 'Error');
  assert.match(singleCharacterCase.diagnostic, /IndexError/);
  assert.equal(singleCharacterCase.expectedOutput, 'a');
  assert.equal(singleCharacterCase.actualOutput, '');
});

test('execution evidence reports unavailability instead of fabricating results', async () => {
  const database = createDatabase();
  await initializeAssignmentCollections(database);
  const facultyId = new ObjectId().toString();
  const assignment = await createAssignment(database, facultyId, parseAssignmentInput({
    title: 'No executable cases',
    course: 'CS101',
    description: 'Nothing to run yet.',
    due: '2026-12-01',
    points: 10,
  }));

  const evidence = await collectExecutionEvidence(database, {
    assignmentId: assignment.id,
    language: 'python',
    code: 'print(1)',
  });

  assert.equal(evidence.available, false);
  assert.match(evidence.reason, /no public executable test cases/);
  assert.equal(evidence.testCases, undefined);
});

test('execution evidence reports a Docker outage without throwing', async () => {
  const database = createDatabase();
  await initializeAssignmentCollections(database);
  const facultyId = new ObjectId().toString();
  const assignment = await createReversalAssignment(database, facultyId);

  const evidence = await collectExecutionEvidence(
    database,
    { assignmentId: assignment.id, language: 'python', code: BUGGY_LOOP_CODE },
    async () => {
      throw new ExecutionUnavailableError();
    },
  );

  assert.equal(evidence.available, false);
  assert.match(evidence.reason, /isolated execution worker is unavailable/);
});

test('execution evidence truncates oversized test output before it reaches the model', async () => {
  const database = createDatabase();
  await initializeAssignmentCollections(database);
  const facultyId = new ObjectId().toString();
  const assignment = await createAssignment(database, facultyId, parseAssignmentInput({
    title: 'Large output',
    course: 'CS101',
    description: 'Produce a lot of output.',
    due: '2026-12-01',
    points: 10,
    languages: ['python'],
  }));
  await createTestCase(database, assignment.id, facultyId, parseTestCaseInput({
    inputProfile: 'Large case',
    input: 'x\n',
    expectedOutput: 'y\n',
    visibility: 'Public',
  }));

  const evidence = await collectExecutionEvidence(
    database,
    { assignmentId: assignment.id, language: 'python', code: 'print("x" * 10000)' },
    async () => ({
      status: 'Failed',
      actualOutput: 'z'.repeat(50000),
      diagnostic: '',
      executionTimeMs: 20,
    }),
  );

  assert.equal(evidence.available, true);
  assert.ok(evidence.testCases[0].actualOutput.length < 500);
  assert.match(evidence.testCases[0].actualOutput, /…$/);
});
