import { ObjectId } from 'mongodb';
import { AssignmentValidationError } from './assignments.schema.js';

export class AssignmentAccessError extends Error {
  constructor(message, statusCode = 404) {
    super(message);
    this.name = 'AssignmentAccessError';
    this.statusCode = statusCode;
  }
}

export async function initializeAssignmentCollections(database) {
  await database.collection('assignments').createIndex({ facultyId: 1, createdAt: -1 });
  await database.collection('assignments').createIndex({ status: 1, dueAt: 1 });
  await database.collection('assignment_test_cases').createIndex({ assignmentId: 1, createdAt: 1 });
  await database.collection('assignment_target_audit').createIndex({ assignmentId: 1, changedAt: -1 });
}

function serializeAssignment(record) {
  return {
    id: record._id.toString(),
    title: record.title,
    course: record.course,
    description: record.description,
    evaluationCriteria: record.evaluationCriteria || '',
    due: record.dueAt.toISOString(),
    timeLimit: record.timeLimit,
    points: record.points,
    passingPercentage: record.passingPercentage ?? 40,
    difficulty: record.difficulty,
    languages: record.languages,
    targetYears: record.targetYears || [1, 2, 3, 4],
    secureLab: {
      enabled: false,
      requireFullscreen: true,
      recordTabSwitches: true,
      recordFullscreenExits: true,
      warningThreshold: 1,
      maxViolations: 3,
      maxFullscreenExits: 0,
      fullscreenExitTimeoutSeconds: 15,
      ...(record.secureLab || {}),
      ...(!record.secureLab?.enabled ? { fullscreenExitTimeoutSeconds: 15 } : {}),
    },
    status: record.status,
    visibility: record.status,
    published: record.status === 'published',
    color: record.color,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function serializeTestCase(record) {
  return {
    id: record._id.toString(),
    assignmentId: record.assignmentId.toString(),
    inputProfile: record.inputProfile,
    input: record.input,
    expectedOutput: record.expectedOutput,
    visibility: record.visibility,
    weight: record.weight,
  };
}

function validObjectId(value) {
  return typeof value === 'string' && ObjectId.isValid(value);
}

async function getOwnedAssignment(database, assignmentId, facultyId) {
  if (!validObjectId(assignmentId)) {
    throw new AssignmentValidationError('Invalid assignment id.');
  }
  const assignment = await database.collection('assignments').findOne({
    _id: new ObjectId(assignmentId),
    facultyId: new ObjectId(facultyId),
    archivedAt: { $exists: false },
  });
  if (!assignment) throw new AssignmentAccessError('Assignment not found.');
  return assignment;
}

export async function listAssignments(database, user) {
  const query = user.role === 'faculty'
    ? { facultyId: new ObjectId(user.id), archivedAt: { $exists: false } }
    : { status: 'published', archivedAt: { $exists: false } };
  let student = null;
  if (user.role === 'student') {
    student = await database.collection('students').findOne({ userId: new ObjectId(user.id) });
    if (!student || student.status === 'inactive') return [];
  }
  const records = await database.collection('assignments')
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();
  return records
    .filter((record) => !student || (
      (!record.department || record.department === student.department)
      && (!record.targetYears || record.targetYears.includes(student.year))
    ))
    .map(serializeAssignment);
}

export async function getAssignment(database, assignmentId, user) {
  if (!validObjectId(assignmentId)) {
    throw new AssignmentValidationError('Invalid assignment id.');
  }
  const query = user.role === 'faculty'
    ? { _id: new ObjectId(assignmentId), facultyId: new ObjectId(user.id), archivedAt: { $exists: false } }
    : { _id: new ObjectId(assignmentId), status: 'published', archivedAt: { $exists: false } };
  const assignment = await database.collection('assignments').findOne(query);
  if (!assignment) throw new AssignmentAccessError('Assignment not found.');
  if (user.role === 'student') {
    const student = await database.collection('students').findOne({ userId: new ObjectId(user.id) });
    if (!student || student.status === 'inactive'
        || (assignment.department && assignment.department !== student.department)
        || (assignment.targetYears && !assignment.targetYears.includes(student.year))) {
      throw new AssignmentAccessError('Assignment not found.');
    }
  }
  return serializeAssignment(assignment);
}

export async function createAssignment(database, facultyId, parsed, department) {
  const now = new Date();
  const record = {
    ...parsed,
    facultyId: new ObjectId(facultyId),
    ...(typeof department === 'string' && department.trim() ? { department: department.trim() } : {}),
    createdAt: now,
    updatedAt: now,
  };
  const result = await database.collection('assignments').insertOne(record);
  return serializeAssignment({ ...record, _id: result.insertedId });
}

export async function updateAssignment(database, assignmentId, facultyId, updates) {
  const assignment = await getOwnedAssignment(database, assignmentId, facultyId);
  if (assignment.secureLab?.enabled && updates.secureLab?.enabled === false) {
    const activeAttempt = await database.collection('secure_assessment_attempts').findOne({
      assignmentId: assignment._id,
      status: 'active',
    });
    if (activeAttempt) {
      throw new AssignmentAccessError('Secure Lab Mode cannot be disabled while an assessment attempt is active.', 409);
    }
  }
  const updatedAt = new Date();
  await database.collection('assignments').updateOne(
    { _id: assignment._id, facultyId: assignment.facultyId },
    { $set: { ...updates, updatedAt } },
  );
  if (Object.hasOwn(updates, 'targetYears')
      && JSON.stringify(assignment.targetYears || [1, 2, 3, 4]) !== JSON.stringify(updates.targetYears)) {
    await database.collection('assignment_target_audit').insertOne({
      assignmentId: assignment._id,
      facultyId: assignment.facultyId,
      previousTargetYears: assignment.targetYears || [1, 2, 3, 4],
      targetYears: updates.targetYears,
      changedAt: updatedAt,
    });
  }
  return serializeAssignment({ ...assignment, ...updates, updatedAt });
}

export async function archiveAssignment(database, assignmentId, facultyId) {
  const assignment = await getOwnedAssignment(database, assignmentId, facultyId);
  const now = new Date();
  await database.collection('assignments').updateOne(
    { _id: assignment._id, facultyId: assignment.facultyId },
    { $set: { archivedAt: now, updatedAt: now } },
  );
}

export async function restoreAssignment(database, assignmentId, facultyId) {
  if (!validObjectId(assignmentId)) {
    throw new AssignmentValidationError('Invalid assignment id.');
  }
  const result = await database.collection('assignments').updateOne(
    { _id: new ObjectId(assignmentId), facultyId: new ObjectId(facultyId), archivedAt: { $exists: true } },
    { $unset: { archivedAt: '' }, $set: { updatedAt: new Date() } },
  );
  if (!result.matchedCount) throw new AssignmentAccessError('Archived assignment not found.');
}

export async function listTestCases(database, assignmentId, user) {
  let assignment;
  if (user.role === 'faculty') {
    assignment = await getOwnedAssignment(database, assignmentId, user.id);
  } else if (validObjectId(assignmentId)) {
    assignment = await database.collection('assignments').findOne({
      _id: new ObjectId(assignmentId),
      status: 'published',
      archivedAt: { $exists: false },
    });
  }
  if (!assignment) throw new AssignmentAccessError('Assignment not found.');

  const query = { assignmentId: assignment._id };
  if (user.role === 'student') query.visibility = 'Public';
  const cases = await database.collection('assignment_test_cases')
    .find(query)
    .sort({ createdAt: 1 })
    .toArray();
  return cases.map(serializeTestCase);
}

export async function createTestCase(database, assignmentId, facultyId, parsed) {
  const assignment = await getOwnedAssignment(database, assignmentId, facultyId);
  const record = {
    ...parsed,
    assignmentId: assignment._id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const result = await database.collection('assignment_test_cases').insertOne(record);
  return serializeTestCase({ ...record, _id: result.insertedId });
}

export async function updateTestCase(database, assignmentId, testCaseId, facultyId, updates) {
  const assignment = await getOwnedAssignment(database, assignmentId, facultyId);
  if (!validObjectId(testCaseId)) throw new AssignmentValidationError('Invalid test case id.');
  const testCases = database.collection('assignment_test_cases');
  const testCase = await testCases.findOne({
    _id: new ObjectId(testCaseId),
    assignmentId: assignment._id,
  });
  if (!testCase) throw new AssignmentAccessError('Test case not found.');
  const updatedAt = new Date();
  await testCases.updateOne(
    { _id: testCase._id, assignmentId: assignment._id },
    { $set: { ...updates, updatedAt } },
  );
  return serializeTestCase({ ...testCase, ...updates, updatedAt });
}

export async function deleteTestCase(database, assignmentId, testCaseId, facultyId) {
  const assignment = await getOwnedAssignment(database, assignmentId, facultyId);
  if (!validObjectId(testCaseId)) throw new AssignmentValidationError('Invalid test case id.');
  const result = await database.collection('assignment_test_cases').deleteOne({
    _id: new ObjectId(testCaseId),
    assignmentId: assignment._id,
  });
  if (!result.deletedCount) throw new AssignmentAccessError('Test case not found.');
}
