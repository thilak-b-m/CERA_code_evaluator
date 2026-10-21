import assert from 'node:assert/strict';
import test from 'node:test';
import { ObjectId } from 'mongodb';
import { buildFacultyReport } from './reports.analytics.service.js';

function matches(document, query = {}) {
  return Object.entries(query).every(([key, value]) => {
    if (value && typeof value === 'object' && '$in' in value) {
      return value.$in.some((candidate) => String(candidate) === String(document[key]));
    }
    if (value && typeof value === 'object' && '$exists' in value) {
      return (document[key] !== undefined) === value.$exists;
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

  find(query = {}) {
    let documents = this.documents.filter((document) => matches(document, query));
    const cursor = {
      sort: (spec) => {
        const [[field, direction]] = Object.entries(spec);
        documents = [...documents].sort((left, right) => {
          const a = left[field];
          const b = right[field];
          if (a === b) return 0;
          return (a > b ? 1 : -1) * direction;
        });
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

/*
 * Two assignments with different maximum scores plus one draft and one
 * un-evaluated submission, so averages, normalization and the pending buckets
 * can all be checked from a single fixture.
 */
async function seedWorkspace(database, facultyId) {
  const students = [
    { userId: new ObjectId(), usn: 'S1', user: 'Asha' },
    { userId: new ObjectId(), usn: 'S2', user: 'Bala' },
    { userId: new ObjectId(), usn: 'S3', user: 'Chitra' },
  ];

  for (const student of students) {
    await database.collection('students').insertOne({ facultyId, userId: student.userId, usn: student.usn });
    await database.collection('users').insertOne({ _id: student.userId, name: student.user, role: 'student' });
  }

  const assignment1 = new ObjectId();
  const assignment2 = new ObjectId();
  await database.collection('assignments').insertOne({
    _id: assignment1,
    facultyId,
    title: 'Array sum',
    course: 'CS101',
    points: 20,
    languages: ['python', 'java'],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  });
  await database.collection('assignments').insertOne({
    _id: assignment2,
    facultyId,
    title: 'Binary search',
    course: 'CS102',
    points: 50,
    languages: ['python'],
    createdAt: new Date('2026-01-02T00:00:00.000Z'),
  });

  const submissionA = new ObjectId();
  const submissionB = new ObjectId();
  const submissionC = new ObjectId();
  const submissionD = new ObjectId();

  await database.collection('submissions').insertOne({
    _id: submissionA,
    facultyId,
    studentId: students[0].userId,
    assignmentId: assignment1,
    language: 'python',
    status: 'submitted',
    createdAt: new Date('2026-01-15T12:00:00.000Z'),
  });
  await database.collection('submissions').insertOne({
    _id: submissionB,
    facultyId,
    studentId: students[1].userId,
    assignmentId: assignment1,
    language: 'java',
    status: 'submitted',
    createdAt: new Date('2026-01-20T09:00:00.000Z'),
  });
  await database.collection('submissions').insertOne({
    _id: submissionC,
    facultyId,
    studentId: students[0].userId,
    assignmentId: assignment2,
    language: 'python',
    status: 'submitted',
    createdAt: new Date('2026-02-05T10:00:00.000Z'),
  });
  await database.collection('submissions').insertOne({
    _id: submissionD,
    facultyId,
    studentId: students[1].userId,
    assignmentId: assignment2,
    language: 'python',
    status: 'submitted',
    createdAt: new Date('2026-02-10T10:00:00.000Z'),
  });

  await database.collection('evaluations').insertOne({
    facultyId,
    studentId: students[0].userId,
    assignmentId: assignment1,
    submissionId: submissionA,
    score: 18,
    status: 'published',
    source: 'faculty',
    updatedAt: new Date('2026-01-16T10:00:00.000Z'),
  });
  await database.collection('evaluations').insertOne({
    facultyId,
    studentId: students[1].userId,
    assignmentId: assignment1,
    submissionId: submissionB,
    score: 10,
    status: 'published',
    source: 'faculty',
    updatedAt: new Date('2026-01-21T10:00:00.000Z'),
  });
  await database.collection('evaluations').insertOne({
    facultyId,
    studentId: students[0].userId,
    assignmentId: assignment2,
    submissionId: submissionC,
    score: 40,
    status: 'draft',
    source: 'ollama',
    updatedAt: new Date('2026-02-06T10:00:00.000Z'),
  });

  return { students, assignment1, assignment2 };
}

test('assignment report derives completion and published-score statistics', async () => {
  const database = createDatabase();
  const facultyId = new ObjectId();
  const { assignment1, assignment2 } = await seedWorkspace(database, facultyId);

  const report = await buildFacultyReport(database, facultyId.toString(), { type: 'assignments' });

  const first = report.rows.find((row) => row.assignmentId === assignment1.toString());
  assert.deepEqual(
    {
      eligible: first.eligibleStudents,
      submitted: first.submitted,
      notSubmitted: first.notSubmitted,
      evaluated: first.evaluated,
      awaiting: first.awaitingEvaluation,
      average: first.averagePercentage,
      highest: first.highestPercentage,
      lowest: first.lowestPercentage,
      completion: first.completionRate,
    },
    {
      eligible: 3,
      submitted: 2,
      notSubmitted: 1,
      evaluated: 2,
      awaiting: 0,
      average: 70,
      highest: 90,
      lowest: 50,
      completion: 67,
    },
  );

  const second = report.rows.find((row) => row.assignmentId === assignment2.toString());
  assert.equal(second.submitted, 2);
  assert.equal(second.notSubmitted, 1);
  assert.equal(second.evaluated, 1);
  assert.equal(second.awaitingEvaluation, 1);
  /* The only evaluation for this assignment is a draft, so it is excluded. */
  assert.equal(second.averagePercentage, null);
  assert.equal(second.highestPercentage, null);
  assert.equal(second.completionRate, 67);

  /* Averages normalise by the assignment's own maximum score (20 and 50). */
  const summary = Object.fromEntries(report.summary.map((card) => [card.key, card.value]));
  assert.equal(summary.students, 3);
  assert.equal(summary.assignments, 2);
  assert.equal(summary.submissions, 4);
  assert.equal(summary.pending, 1);
  assert.equal(summary.published, 2);
  assert.equal(summary.average, 70);
});

test('student report counts eligible assignments, missing submissions, and published scores', async () => {
  const database = createDatabase();
  const facultyId = new ObjectId();
  await seedWorkspace(database, facultyId);

  const report = await buildFacultyReport(database, facultyId.toString(), { type: 'students' });

  const asha = report.rows.find((row) => row.usn === 'S1');
  assert.deepEqual(
    {
      eligible: asha.eligibleAssignments,
      submitted: asha.submitted,
      notSubmitted: asha.notSubmitted,
      published: asha.publishedEvaluations,
      average: asha.averagePercentage,
    },
    { eligible: 2, submitted: 2, notSubmitted: 0, published: 1, average: 90 },
  );

  const bala = report.rows.find((row) => row.usn === 'S2');
  assert.equal(bala.submitted, 2);
  assert.equal(bala.publishedEvaluations, 1);
  assert.equal(bala.averagePercentage, 50);

  const chitra = report.rows.find((row) => row.usn === 'S3');
  assert.equal(chitra.submitted, 0);
  assert.equal(chitra.notSubmitted, 2);
  assert.equal(chitra.publishedEvaluations, 0);
  assert.equal(chitra.averagePercentage, null);
  assert.equal(chitra.lastSubmissionAt, null);

  const summary = Object.fromEntries(report.summary.map((card) => [card.key, card.value]));
  assert.equal(summary.students, 3);
  assert.equal(summary.inactive, 1);
  assert.equal(summary.average, 70);
});

test('filters scope the report by assignment, student, language, status, and date', async () => {
  const database = createDatabase();
  const facultyId = new ObjectId();
  const { assignment1 } = await seedWorkspace(database, facultyId);
  const faculty = facultyId.toString();

  const byAssignment = await buildFacultyReport(database, faculty, {
    type: 'submissions',
    assignmentId: assignment1.toString(),
  });
  assert.equal(byAssignment.pagination.total, 2);

  const byStudent = await buildFacultyReport(database, faculty, { type: 'submissions', student: 'S1' });
  assert.equal(byStudent.pagination.total, 2);
  assert.ok(byStudent.rows.every((row) => row.usn === 'S1'));

  const byLanguage = await buildFacultyReport(database, faculty, { type: 'submissions', language: 'java' });
  assert.equal(byLanguage.pagination.total, 1);
  assert.equal(byLanguage.rows[0].language, 'java');

  const pending = await buildFacultyReport(database, faculty, { type: 'submissions', status: 'pending' });
  assert.equal(pending.pagination.total, 1);
  assert.equal(pending.rows[0].evaluationStatus, 'Not evaluated');

  const draft = await buildFacultyReport(database, faculty, { type: 'submissions', status: 'draft' });
  assert.equal(draft.pagination.total, 1);

  const published = await buildFacultyReport(database, faculty, { type: 'evaluations', status: 'published' });
  assert.equal(published.pagination.total, 2);
  assert.ok(published.rows.every((row) => row.status === 'Published'));

  const january = await buildFacultyReport(database, faculty, {
    type: 'submissions',
    from: '2026-01-01',
    to: '2026-01-31',
  });
  assert.equal(january.pagination.total, 2);

  const fromFebruary = await buildFacultyReport(database, faculty, {
    type: 'submissions',
    from: '2026-02-01',
  });
  assert.equal(fromFebruary.pagination.total, 2);
  assert.deepEqual(fromFebruary.filters, {
    assignmentId: null,
    student: null,
    language: null,
    status: null,
    from: '2026-02-01',
    to: null,
  });

  /* The end boundary is inclusive for the whole selected day. */
  const singleDay = await buildFacultyReport(database, faculty, {
    type: 'submissions',
    from: '2026-01-15',
    to: '2026-01-15',
  });
  assert.equal(singleDay.pagination.total, 1);
});

test('pagination, sorting, and search operate on the filtered row set', async () => {
  const database = createDatabase();
  const facultyId = new ObjectId();

  for (let index = 1; index <= 5; index += 1) {
    await database.collection('assignments').insertOne({
      _id: new ObjectId(),
      facultyId,
      title: `Assignment ${index}`,
      course: 'CS101',
      points: 10,
      createdAt: new Date(2026, 0, index),
    });
  }

  const faculty = facultyId.toString();

  const firstPage = await buildFacultyReport(database, faculty, { type: 'assignments', pageSize: 2 });
  assert.deepEqual(firstPage.rows.map((row) => row.assignment), ['Assignment 1', 'Assignment 2']);
  assert.deepEqual(firstPage.pagination, { page: 1, pageSize: 2, total: 5, totalPages: 3 });

  const lastPage = await buildFacultyReport(database, faculty, { type: 'assignments', pageSize: 2, page: 3 });
  assert.deepEqual(lastPage.rows.map((row) => row.assignment), ['Assignment 5']);

  const descending = await buildFacultyReport(database, faculty, {
    type: 'assignments',
    pageSize: 2,
    sort: 'assignment',
    sortDir: 'desc',
  });
  assert.deepEqual(descending.rows.map((row) => row.assignment), ['Assignment 5', 'Assignment 4']);

  const searched = await buildFacultyReport(database, faculty, { type: 'assignments', search: 'Assignment 3' });
  assert.equal(searched.pagination.total, 1);
  assert.equal(searched.rows[0].assignment, 'Assignment 3');

  /* A page beyond the last page clamps to the final page instead of erroring. */
  const clamped = await buildFacultyReport(database, faculty, { type: 'assignments', pageSize: 2, page: 99 });
  assert.equal(clamped.pagination.page, 3);
});

test('invalid report parameters are rejected with a validation error', async () => {
  const database = createDatabase();
  const facultyId = new ObjectId().toString();
  const isValidationError = (error) => error.statusCode === 400;

  await assert.rejects(() => buildFacultyReport(database, facultyId, { type: 'unknown' }), isValidationError);
  await assert.rejects(() => buildFacultyReport(database, facultyId, {}), isValidationError);
  await assert.rejects(
    () => buildFacultyReport(database, facultyId, { type: 'assignments', assignmentId: 'not-an-id' }),
    isValidationError,
  );
  await assert.rejects(
    () => buildFacultyReport(database, facultyId, { type: 'assignments', from: '2026-13-01' }),
    isValidationError,
  );
  await assert.rejects(
    () => buildFacultyReport(database, facultyId, { type: 'assignments', from: '2026-05-01', to: '2026-01-01' }),
    isValidationError,
  );
  await assert.rejects(
    () => buildFacultyReport(database, facultyId, { type: 'submissions', status: 'nope' }),
    isValidationError,
  );

  /* Unsafe page sizes fall back to a bounded default rather than failing. */
  const report = await buildFacultyReport(database, facultyId, { type: 'assignments', pageSize: 100000 });
  assert.equal(report.pagination.pageSize, 100);
});

test('reports never fabricate execution statistics and document their limitations', async () => {
  const database = createDatabase();
  const facultyId = new ObjectId();
  await seedWorkspace(database, facultyId);

  const report = await buildFacultyReport(database, facultyId.toString(), { type: 'submissions' });

  assert.ok(report.limitations.some((note) => note.toLowerCase().includes('execution')));
  assert.ok(report.limitations.some((note) => note.toLowerCase().includes('pass')));

  for (const row of report.rows) {
    for (const forbidden of ['executionStatus', 'testCases', 'passed', 'failed', 'executionTimeMs']) {
      assert.equal(forbidden in row, false, `submissions report must not expose ${forbidden}`);
    }
  }

  const chartIds = report.charts.map((chart) => chart.id);
  assert.ok(chartIds.includes('statusDistribution'));
  assert.ok(chartIds.includes('scoreDistribution'));
  assert.ok(chartIds.includes('submissionTrend'));
  assert.equal(chartIds.some((id) => id.toLowerCase().includes('testcase')), false);

  const statusChart = report.charts.find((chart) => chart.id === 'statusDistribution');
  const counts = Object.fromEntries(statusChart.data.map((point) => [point.name, point.value]));
  assert.deepEqual(counts, { 'Awaiting evaluation': 1, 'Draft evaluation': 1, Published: 2 });
});

test('an empty workspace returns a valid zero-filled report', async () => {
  const database = createDatabase();
  const facultyId = new ObjectId().toString();

  const report = await buildFacultyReport(database, facultyId, { type: 'assignments' });

  assert.deepEqual(report.rows, []);
  assert.deepEqual(report.pagination, { page: 1, pageSize: 25, total: 0, totalPages: 1 });
  assert.ok(report.summary.every((card) => card.value === 0 || card.value === null));
  assert.ok(report.charts.every((chart) => chart.data.every((point) => point.value === 0)));
  assert.deepEqual(report.filterOptions.assignments, []);
  assert.deepEqual(report.filterOptions.students, []);
});

test('faculty reports exclude other faculties department data', async () => {
  const database = createDatabase();
  const ownFaculty = new ObjectId();
  const otherFaculty = new ObjectId();

  await seedWorkspace(database, ownFaculty);

  const otherStudent = new ObjectId();
  await database.collection('students').insertOne({ facultyId: otherFaculty, userId: otherStudent, usn: 'X1' });
  await database.collection('users').insertOne({ _id: otherStudent, name: 'Intruder', role: 'student' });
  const otherAssignment = new ObjectId();
  await database.collection('assignments').insertOne({
    _id: otherAssignment,
    facultyId: otherFaculty,
    title: 'Secret task',
    course: 'CS999',
    points: 10,
    createdAt: new Date('2026-01-03T00:00:00.000Z'),
  });
  await database.collection('submissions').insertOne({
    _id: new ObjectId(),
    facultyId: otherFaculty,
    studentId: otherStudent,
    assignmentId: otherAssignment,
    language: 'python',
    createdAt: new Date('2026-01-04T00:00:00.000Z'),
  });

  const report = await buildFacultyReport(database, ownFaculty.toString(), { type: 'assignments' });
  const titles = report.rows.map((row) => row.assignment);
  assert.equal(titles.includes('Secret task'), false);
  assert.equal(report.pagination.total, 2);
  assert.equal(report.filterOptions.students.some((option) => option.value === 'X1'), false);

  const otherReport = await buildFacultyReport(database, otherFaculty.toString(), { type: 'submissions' });
  assert.equal(otherReport.pagination.total, 1);
  assert.ok(otherReport.rows.every((row) => row.usn === 'X1'));
});
