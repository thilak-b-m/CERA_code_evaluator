import { ObjectId } from 'mongodb';
import { AssignmentAccessError } from '../assignments/assignments.service.js';
import {
  assertSecureAttemptCanSubmit,
  completeSecureAttempt,
} from '../secure-assessments/secure-assessments.service.js';
import { executeTestCase } from './execution.worker.js';
import { SubmissionValidationError } from './submissions.schema.js';

export class SubmissionAccessError extends Error {
  constructor(message, statusCode = 404) {
    super(message);
    this.name = 'SubmissionAccessError';
    this.statusCode = statusCode;
  }
}

const MAX_EVIDENCE_CASES = 20;
const MAX_EVIDENCE_TEXT_LENGTH = 400;

export async function initializeSubmissionCollections(database) {
  await database.collection('submissions').createIndex({ studentId: 1, createdAt: -1 });
  await database.collection('submissions').createIndex({ assignmentId: 1, createdAt: -1 });
  await database.collection('submissions').createIndex({ facultyId: 1, createdAt: -1 });
}

function serializeSubmission(submission) {
  return {
    id: submission._id.toString(),
    assignmentId: submission.assignmentId.toString(),
    studentId: submission.studentId.toString(),
    language: submission.language,
    code: submission.code,
    status: submission.status,
    submittedAt: submission.createdAt.toISOString(),
    updatedAt: submission.updatedAt.toISOString(),
    ...(submission.evaluation ? { evaluation: submission.evaluation } : {}),
  };
}

function serializePublishedEvaluation(evaluation) {
  return {
    score: evaluation.score,
    feedback: evaluation.feedback,
    aiFeedback: evaluation.aiFeedback || '',
    ...(evaluation.guidance ? { guidance: evaluation.guidance } : {}),
    source: evaluation.source || 'faculty',
    status: evaluation.status,
    createdAt: evaluation.createdAt.toISOString(),
    updatedAt: evaluation.updatedAt.toISOString(),
  };
}

async function getPublishedEvaluation(database, submission) {
  const evaluation = await database.collection('evaluations').findOne({
    submissionId: submission._id,
    studentId: submission.studentId,
    status: 'published',
  });
  return evaluation ? serializePublishedEvaluation(evaluation) : null;
}

async function getPublishedAssignment(database, assignmentId, student = null) {
  if (!ObjectId.isValid(assignmentId)) {
    throw new SubmissionValidationError('Invalid assignment id.');
  }
  const assignment = await database.collection('assignments').findOne({
    _id: new ObjectId(assignmentId),
    status: 'published',
    archivedAt: { $exists: false },
  });
  if (!assignment) throw new AssignmentAccessError('Assignment not found.');
  if (student) {
    const studentRecord = await database.collection('students').findOne({ userId: new ObjectId(student.id) });
    if (!studentRecord || studentRecord.status === 'inactive'
        || (assignment.department && assignment.department !== studentRecord.department)
        || (assignment.targetYears && !assignment.targetYears.includes(studentRecord.year))) {
      throw new AssignmentAccessError('Assignment not found.');
    }
  }
  return assignment;
}

export async function createSubmission(database, student, input) {
  const assignment = await getPublishedAssignment(database, input.assignmentId, student);
  if (!assignment.languages.includes(input.language)) {
    throw new SubmissionValidationError('This language is not enabled for the assignment.');
  }
  const secureAttempt = await assertSecureAttemptCanSubmit(
    database,
    assignment,
    student.id,
  );

  const now = new Date();
  const submission = {
    assignmentId: assignment._id,
    facultyId: assignment.facultyId,
    studentId: new ObjectId(student.id),
    language: input.language,
    code: input.code,
    status: 'submitted',
    createdAt: now,
    updatedAt: now,
  };
  const result = await database.collection('submissions').insertOne(submission);
  await completeSecureAttempt(database, secureAttempt?._id, result.insertedId, now);
  return serializeSubmission({ ...submission, _id: result.insertedId });
}

export async function runSubmission(database, input, executeCase = executeTestCase, student = null) {
  const assignment = await getPublishedAssignment(database, input.assignmentId, student);
  if (student) {
    await assertSecureAttemptCanSubmit(database, assignment, student.id);
  }
  if (!assignment.languages.includes(input.language)) {
    throw new SubmissionValidationError('This language is not enabled for the assignment.');
  }

  const testCases = await database.collection('assignment_test_cases')
    .find({ assignmentId: assignment._id, visibility: 'Public' })
    .sort({ createdAt: 1 })
    .toArray();
  if (testCases.length === 0) {
    throw new SubmissionValidationError('This assignment has no public executable test cases.');
  }

  if (testCases.length > 20) {
    throw new SubmissionValidationError('Assignment exceeds the maximum of 20 public test cases.');
  }
  if (testCases.some((testCase) => (
    typeof testCase.input !== 'string' || typeof testCase.expectedOutput !== 'string'
  ))) {
    throw new SubmissionValidationError(
      'This assignment has test cases without executable stdin/stdout. Update them before running code.',
    );
  }

  const results = [];
  for (const [index, testCase] of testCases.entries()) {
    const result = await executeCase({
      language: input.language,
      code: input.code,
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      timeoutMs: 5000,
    });
    results.push({
      id: testCase._id.toString(),
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      actualOutput: result.actualOutput,
      diagnostic: result.diagnostic,
      status: result.status,
      executionTimeMs: result.executionTimeMs,
      order: index,
    });
  }

  const passed = results.filter((result) => result.status === 'Passed').length;
  return {
    testCases: results,
    summary: {
      status: passed === results.length ? 'Passed' : 'Failed',
      total: results.length,
      passed,
      executionTimeMs: results.reduce((total, result) => total + result.executionTimeMs, 0),
    },
  };
}

function truncateEvidence(value) {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  return text.length > MAX_EVIDENCE_TEXT_LENGTH
    ? `${text.slice(0, MAX_EVIDENCE_TEXT_LENGTH)}…`
    : text;
}

/**
 * Produce server-owned execution evidence for AI grading.
 *
 * Reuses the existing Docker execution pipeline (`runSubmission`) so there is a
 * single code runner. Results are always generated on the server from the stored
 * submission; nothing supplied by the student frontend is trusted. Hidden test
 * cases are never included, because `runSubmission` only executes public cases.
 *
 * Never throws: when execution is unavailable the caller receives an explicit
 * `available: false` record so evidence is never fabricated.
 */
export async function collectExecutionEvidence(
  database,
  submission,
  executeCase = executeTestCase,
) {
  try {
    const run = await runSubmission(database, {
      assignmentId: String(submission.assignmentId),
      language: submission.language,
      code: submission.code,
    }, executeCase);

    return {
      available: true,
      source: 'server',
      summary: {
        status: run.summary.status,
        total: run.summary.total,
        passed: run.summary.passed,
        executionTimeMs: run.summary.executionTimeMs,
      },
      testCases: run.testCases.slice(0, MAX_EVIDENCE_CASES).map((testCase) => ({
        status: testCase.status,
        input: truncateEvidence(testCase.input),
        expectedOutput: truncateEvidence(testCase.expectedOutput),
        actualOutput: truncateEvidence(testCase.actualOutput),
        diagnostic: truncateEvidence(testCase.diagnostic),
        executionTimeMs: testCase.executionTimeMs,
      })),
    };
  } catch (error) {
    return {
      available: false,
      source: 'server',
      reason: truncateEvidence(
        error?.message || 'Execution results are unavailable for this submission.',
      ) || 'Execution results are unavailable for this submission.',
    };
  }
}

export async function listStudentSubmissions(database, studentId) {
  const records = await database.collection('submissions')
    .find({ studentId: new ObjectId(studentId) })
    .sort({ createdAt: -1 })
    .toArray();
  return Promise.all(records.map(async (record) => {
    const [assignment, evaluation] = await Promise.all([
      database.collection('assignments').findOne({
        _id: record.assignmentId,
        facultyId: record.facultyId,
      }),
      getPublishedEvaluation(database, record),
    ]);
    return {
      ...serializeSubmission(record),
      assignmentTitle: assignment?.title || 'Untitled assignment',
      course: assignment?.course || null,
      maxScore: assignment?.points ?? null,
      ...(evaluation ? { evaluation } : {}),
    };
  }));
}

export async function getStudentSubmission(database, submissionId, studentId) {
  if (!ObjectId.isValid(submissionId)) {
    throw new SubmissionValidationError('Invalid submission id.');
  }
  const record = await database.collection('submissions').findOne({
    _id: new ObjectId(submissionId),
    studentId: new ObjectId(studentId),
  });
  if (!record) throw new SubmissionAccessError('Submission not found.');
  const [assignment, student, evaluation] = await Promise.all([
    database.collection('assignments').findOne({
      _id: record.assignmentId,
      facultyId: record.facultyId,
    }),
    database.collection('users').findOne({ _id: record.studentId }),
    getPublishedEvaluation(database, record),
  ]);
  return {
    ...serializeSubmission(record),
    maxScore: assignment?.points ?? null,
    assignmentTitle: assignment?.title || 'Untitled assignment',
    course: assignment?.course || null,
    studentName: student?.name || 'Unknown student',
    ...(evaluation ? { evaluation } : {}),
  };
}

export async function getFacultySubmission(database, submissionId, facultyId) {
  if (!ObjectId.isValid(submissionId)) {
    throw new SubmissionValidationError('Invalid submission id.');
  }
  const record = await database.collection('submissions').findOne({
    _id: new ObjectId(submissionId),
    facultyId: new ObjectId(facultyId),
  });
  if (!record) throw new SubmissionAccessError('Submission not found.');
  const [assignment, student] = await Promise.all([
    database.collection('assignments').findOne({
      _id: record.assignmentId,
      facultyId: record.facultyId,
    }),
    database.collection('users').findOne({ _id: record.studentId }),
  ]);
  return {
    ...serializeSubmission(record),
    studentName: student?.name || 'Unknown student',
    assignmentTitle: assignment?.title || 'Untitled assignment',
    assignmentDescription: assignment?.description || '',
    evaluationCriteria: assignment?.evaluationCriteria || '',
    maxScore: assignment?.points ?? null,
  };
}

export async function listFacultySubmissions(database, facultyId, assignmentId) {
  const query = { facultyId: new ObjectId(facultyId) };
  if (assignmentId !== undefined) {
    if (!ObjectId.isValid(assignmentId)) {
      throw new SubmissionValidationError('Invalid assignment id.');
    }
    query.assignmentId = new ObjectId(assignmentId);
  }
  const records = await database.collection('submissions')
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();
  return Promise.all(records.map(async (record) => {
    const [evaluation, student, assignment] = await Promise.all([
      database.collection('evaluations').findOne({
        submissionId: record._id,
        facultyId: record.facultyId,
      }),
      database.collection('users').findOne({ _id: record.studentId }),
      database.collection('assignments').findOne({ _id: record.assignmentId }),
    ]);
    return {
      ...serializeSubmission(record),
      studentName: student?.name || 'Unknown student',
      assignmentTitle: assignment?.title || 'Untitled assignment',
      maxScore: assignment?.points ?? null,
      ...(evaluation ? {
        evaluation: {
          score: evaluation.score,
          feedback: evaluation.feedback,
          aiFeedback: evaluation.aiFeedback || '',
          ...(evaluation.guidance ? { guidance: evaluation.guidance } : {}),
          source: evaluation.source || 'faculty',
          status: evaluation.status,
        },
      } : {}),
    };
  }));
}
