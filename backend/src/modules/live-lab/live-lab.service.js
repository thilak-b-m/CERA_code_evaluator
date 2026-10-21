import { ObjectId } from 'mongodb';

const ACTIVE_WINDOW_MS = 45_000;
const ALLOWED_STATUSES = new Set(['editing', 'running']);

export class LiveLabValidationError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'LiveLabValidationError';
    this.statusCode = statusCode;
  }
}

export async function initializeLiveLabCollections(database) {
  await database.collection('live_lab_sessions').createIndex(
    { studentId: 1, assignmentId: 1 },
    { unique: true },
  );
  await database.collection('live_lab_sessions').createIndex(
    { lastSeenAt: 1 },
    { expireAfterSeconds: 60 },
  );
  await database.collection('live_lab_sessions').createIndex({ facultyId: 1, lastSeenAt: -1 });
}

function parseHeartbeat(input) {
  if (!ObjectId.isValid(input.assignmentId)) {
    throw new LiveLabValidationError('Select a valid assignment before joining the live lab.');
  }
  if (typeof input.language !== 'string' || input.language.length > 32) {
    throw new LiveLabValidationError('Select a supported programming language.');
  }
  if (!ALLOWED_STATUSES.has(input.status)) {
    throw new LiveLabValidationError('Live lab activity must be editing or running.');
  }
  return {
    assignmentId: new ObjectId(input.assignmentId),
    language: input.language,
    status: input.status,
  };
}

export async function recordLiveLabHeartbeat(database, student, input, now = new Date()) {
  if (student?.role !== 'student' || !ObjectId.isValid(student.id)) {
    throw new LiveLabValidationError('Student authentication is required.', 403);
  }
  const parsed = parseHeartbeat(input);
  const assignment = await database.collection('assignments').findOne({
    _id: parsed.assignmentId,
    status: 'published',
    archivedAt: { $exists: false },
  });
  if (!assignment) {
    throw new LiveLabValidationError('This assignment is not available in the live lab.', 404);
  }
  if (!assignment.languages.includes(parsed.language)) {
    throw new LiveLabValidationError('This language is not enabled for the assignment.');
  }

  const studentId = new ObjectId(student.id);
  await database.collection('live_lab_sessions').updateOne(
    { studentId, assignmentId: assignment._id },
    {
      $set: {
        facultyId: assignment.facultyId,
        studentId,
        assignmentId: assignment._id,
        assignmentTitle: assignment.title,
        studentName: student.name,
        language: parsed.language,
        status: parsed.status,
        lastSeenAt: now,
      },
      $setOnInsert: { startedAt: now },
    },
    { upsert: true },
  );
  return { status: 'active', lastSeenAt: now.toISOString() };
}

export async function endLiveLabSession(database, student, assignmentId) {
  if (!ObjectId.isValid(assignmentId)) {
    throw new LiveLabValidationError('Select a valid assignment.');
  }
  await database.collection('live_lab_sessions').deleteOne({
    studentId: new ObjectId(student.id),
    assignmentId: new ObjectId(assignmentId),
  });
}

export async function listLiveLabSessions(database, facultyId, now = Date.now()) {
  const sessions = await database.collection('live_lab_sessions')
    .find({
      facultyId: new ObjectId(facultyId),
      lastSeenAt: { $gte: new Date(now - ACTIVE_WINDOW_MS) },
    })
    .sort({ lastSeenAt: -1 })
    .toArray();
  return sessions.map((session) => ({
    student: session.studentName,
    assignment: session.assignmentTitle,
    language: session.language,
    status: session.status,
    startedAt: session.startedAt.toISOString(),
    lastSeenAt: session.lastSeenAt.toISOString(),
  }));
}
