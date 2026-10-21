import assert from 'node:assert/strict';
import test from 'node:test';
import { ObjectId } from 'mongodb';
import { getFacultyAnalytics, getStudentLeaderboard } from './analytics.service.js';

function matches(document, query) {
  return Object.entries(query).every(([key, value]) => {
    if (value && typeof value === 'object' && '$in' in value) {
      return value.$in.some((item) => String(item) === String(document[key]));
    }
    if (value && typeof value === 'object' && '$exists' in value) {
      return (document[key] !== undefined) === value.$exists;
    }
    if (value && typeof value === 'object' && '$gte' in value) {
      return document[key] >= value.$gte && document[key] < value.$lt;
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
    return {
      toArray: async () => this.documents.filter((document) => matches(document, query)),
    };
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

test('faculty analytics uses only scoped submissions and published evaluations in each 12-week period', async () => {
  const database = createDatabase();
  const facultyId = new ObjectId();
  const otherFacultyId = new ObjectId();
  const students = [new ObjectId(), new ObjectId()];
  const assignmentId = new ObjectId();
  const now = Date.now();
  const createSubmission = async (studentId, ageDays, ownerId = facultyId) => {
    await database.collection('submissions').insertOne({
      facultyId: ownerId,
      studentId,
      assignmentId,
      createdAt: new Date(now - ageDays * 24 * 60 * 60 * 1000),
    });

  };

  await database.collection('students').insertOne({ facultyId, userId: students[0] });
  await database.collection('students').insertOne({ facultyId, userId: students[1] });
  await database.collection('assignments').insertOne({
    _id: assignmentId,
    facultyId,
    points: 20,
  });

  await createSubmission(students[0], 7);
  await createSubmission(students[0], 21);
  await createSubmission(students[1], 98);
  await createSubmission(new ObjectId(), 14, otherFacultyId);

  const submissions = database.collection('submissions').documents;
  for (const [index, score] of [[0, 18], [1, 10], [2, 17]]) {
    await database.collection('evaluations').insertOne({
      facultyId,
      studentId: submissions[index].studentId,
      assignmentId,
      submissionId: submissions[index]._id,
      score,
      status: 'published',
    });
  }
  await database.collection('evaluations').insertOne({
    facultyId,
    studentId: students[0],
    assignmentId,
    submissionId: new ObjectId(),
    score: 20,
    status: 'draft',
  });

  const current = await getFacultyAnalytics(database, facultyId.toString(), 'current');
  assert.equal(current.kpis.enrolledStudents.value, 2);
  assert.equal(current.kpis.averageScore.value, '70.0%');
  assert.equal(current.kpis.engagementRate.value, '50%');
  assert.equal(current.kpis.atRiskStudents.value, 1);
  assert.equal(current.marksDistribution[0][1], 50);
  assert.equal(current.marksDistribution[3][1], 50);
  assert.equal(Math.max(...current.submissionVolume), 100);

  assert.deepEqual(current.totals, {
    students: 2,
    assignments: 1,
    submissions: 2,
    evaluated: 2,
    pending: 0,
  });
  assert.equal(current.reviewCoverage.percentage, 100);
  assert.equal(current.passRate, 100);

  assert.equal(current.assignmentPerformance.length, 1);
  assert.equal(current.assignmentPerformance[0].submissions, 2);
  assert.equal(current.assignmentPerformance[0].evaluated, 2);
  assert.equal(current.assignmentPerformance[0].completionRate, 100);
  assert.equal(current.assignmentPerformance[0].averagePercentage, 70);

  assert.equal(current.studentPerformance.length, 2);
  assert.equal(current.studentPerformance[0].averagePercentage, 70);
  assert.equal(current.studentPerformance[0].submissions, 2);
  assert.equal(current.studentPerformance[0].standing, 'On track');
  assert.equal(current.studentPerformance[1].standing, 'No activity');
  assert.equal(current.atRiskStudents.length, 1);

  const previous = await getFacultyAnalytics(database, facultyId.toString(), 'previous');
  assert.equal(previous.kpis.averageScore.value, '85.0%');
  assert.equal(previous.kpis.engagementRate.value, '50%');
});

test('student leaderboard ranks department learners using only published evaluations', async () => {
  const database = createDatabase();
  const facultyId = new ObjectId();
  const studentIds = [new ObjectId(), new ObjectId()];
  const assignmentId = new ObjectId();
  await database.collection('users').insertOne({
    _id: facultyId,
    role: 'faculty',
    department: 'Computer Science',
    name: 'Faculty',
  });
  await database.collection('users').insertOne({
    _id: studentIds[0],
    role: 'student',
    name: 'Asha',
  });
  await database.collection('users').insertOne({
    _id: studentIds[1],
    role: 'student',
    name: 'Bala',
  });
  await database.collection('students').insertOne({
    userId: studentIds[0],
    department: 'Computer Science',
  });
  await database.collection('students').insertOne({
    userId: studentIds[1],
    department: 'Computer Science',
  });
  await database.collection('assignments').insertOne({
    _id: assignmentId,
    facultyId,
    points: 20,
  });
  await database.collection('evaluations').insertOne({
    studentId: studentIds[0],
    assignmentId,
    score: 16,
    status: 'published',
  });
  await database.collection('evaluations').insertOne({
    studentId: studentIds[1],
    assignmentId,
    score: 20,
    status: 'draft',
  });

  const result = await getStudentLeaderboard(database, studentIds[0].toString());
  assert.equal(result.rankings[0].name, 'Asha');
  assert.equal(result.rankings[0].average, 80);
  assert.equal(result.rankings[0].isCurrentUser, true);
  assert.equal(result.rankings[1].name, 'Bala');
  assert.equal(result.rankings[1].average, 0);
  assert.equal(result.rankings[1].evaluatedAssignments, 0);
  assert.equal('id' in result.rankings[0], false);
});
