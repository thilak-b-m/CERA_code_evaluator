import assert from 'node:assert/strict';
import test from 'node:test';
import { ObjectId } from 'mongodb';
import { getDepartmentStudentRecord } from './students.service.js';

function matches(document, query) {
  return Object.entries(query).every(([key, expected]) => {
    if (expected && typeof expected === 'object' && '$exists' in expected) {
      return (document[key] !== undefined) === expected.$exists;
    }
    return String(document[key]) === String(expected);
  });
}

class MemoryCollection {
  constructor(documents = []) {
    this.documents = documents;
  }

  async findOne(query) {
    return this.documents.find((document) => matches(document, query)) || null;
  }

  find(query) {
    let documents = this.documents.filter((document) => matches(document, query));
    const cursor = {
      sort: (fields) => {
        const [[key, direction]] = Object.entries(fields);
        documents = documents.sort((left, right) => (
          (left[key] > right[key] ? 1 : left[key] < right[key] ? -1 : 0) * direction
        ));
        return cursor;
      },
      toArray: async () => documents,
    };
    return cursor;
  }
}

function createDatabase(records) {
  return {
    collection(name) {
      return new MemoryCollection(records[name] || []);
    },
  };
}

test('faculty student record joins roster assignments, submissions, and evaluation marks', async () => {
  const facultyId = new ObjectId();
  const studentId = new ObjectId();
  const assignmentId = new ObjectId();
  const submissionId = new ObjectId();
  const createdAt = new Date('2026-10-10T10:00:00.000Z');
  const database = createDatabase({
    students: [{
      _id: new ObjectId(),
      userId: studentId,
      usn: '1CS23CS001',
      department: 'Computer Science',
      year: 3,
      createdAt,
    }],
    users: [{ _id: studentId, name: 'Asha Student', email: 'asha@example.edu' }],
    assignments: [{
      _id: assignmentId,
      facultyId,
      title: 'Array search',
      course: 'Data Structures',
      points: 20,
      createdAt,
    }],
    submissions: [{
      _id: submissionId,
      facultyId,
      studentId,
      assignmentId,
      createdAt,
    }],
    evaluations: [{
      submissionId,
      facultyId,
      score: 17,
      status: 'published',
    }],
  });

  const result = await getDepartmentStudentRecord(database, {
    id: facultyId.toString(),
    role: 'faculty',
    department: 'Computer Science',
  }, '1CS23CS001');
  assert.equal(result.student.name, 'Asha Student');
  assert.equal(result.student.submittedAssignments, 1);
  assert.equal(result.student.averagePercentage, 85);
  assert.equal(result.student.assignments[0].score, 17);
  assert.equal(result.student.assignments[0].evaluationStatus, 'published');
});

test('faculty cannot retrieve a student record from a different department', async () => {
  const studentId = new ObjectId();
  const database = createDatabase({
    students: [{
      _id: new ObjectId(),
      userId: studentId,
      usn: '1EC23EC001',
      department: 'Electronics',
      year: 2,
      createdAt: new Date(),
    }],
  });
  await assert.rejects(
    getDepartmentStudentRecord(database, {
      id: new ObjectId().toString(),
      role: 'faculty',
      department: 'Computer Science',
    }, '1EC23EC001'),
    { statusCode: 404 },
  );
});
