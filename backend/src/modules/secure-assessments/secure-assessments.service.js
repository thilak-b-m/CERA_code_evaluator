import { ObjectId } from 'mongodb';
import { randomUUID } from 'node:crypto';

const MAX_EVENTS_PER_MINUTE = 30;
const MAX_STORED_EVENTS = 300;
const ALLOWED_EVENTS = new Set([
  'TAB_HIDDEN',
  'TAB_VISIBLE',
  'FULLSCREEN_EXIT',
  'FULLSCREEN_RESTORED',
  'PAGE_EXIT',
]);
const COUNTED_EVENTS = new Set(['TAB_HIDDEN', 'FULLSCREEN_EXIT', 'PAGE_EXIT']);

export class SecureAssessmentError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'SecureAssessmentError';
    this.statusCode = statusCode;
  }
}

export async function initializeSecureAssessmentCollections(database) {
  await database.collection('secure_assessment_attempts').createIndex(
    { studentId: 1, assignmentId: 1 },
    { unique: true },
  );
  await database.collection('secure_assessment_attempts').createIndex({ facultyId: 1, startedAt: -1 });
}

function serializeAttempt(attempt, includeEvents = false) {
  return {
    id: attempt._id.toString(),
    assignmentId: attempt.assignmentId.toString(),
    assignment: attempt.assignmentTitle,
    studentId: attempt.studentId.toString(),
    student: attempt.studentName,
    studentIdentifier: attempt.studentIdentifier || '',
    status: attempt.status,
    startedAt: attempt.startedAt.toISOString(),
    deadlineAt: attempt.deadlineAt.toISOString(),
    endedAt: attempt.endedAt?.toISOString() || null,
    violationCount: attempt.violationCount,
    fullscreenExitCount: attempt.fullscreenExitCount || 0,
    autoSubmitRequired: Boolean(attempt.autoSubmitRequired),
    reviewRequired: attempt.reviewRequired,
    lastActivityAt: attempt.lastActivityAt.toISOString(),
    ...(includeEvents ? {
      events: attempt.events.map((event) => ({
        type: event.type,
        receivedAt: event.receivedAt.toISOString(),
        clientTimestamp: event.clientTimestamp || null,
        incidentId: event.incidentId || null,
      })),
    } : {}),
  };
}

function validId(value) {
  return typeof value === 'string' && ObjectId.isValid(value);
}

function activeDeadline(attempt, now) {
  return attempt.status === 'active' && attempt.deadlineAt.getTime() <= now.getTime();
}

async function updateExpiredAttempt(database, attempt, now) {
  if (!activeDeadline(attempt, now)) return attempt;
  const endedAt = attempt.deadlineAt;
  await database.collection('secure_assessment_attempts').updateOne(
    { _id: attempt._id, status: 'active' },
    {
      $set: { status: 'expired', endedAt, lastActivityAt: now },
      $push: {
        events: {
          $each: [{ type: 'ASSESSMENT_EXPIRED', receivedAt: now, counted: false }],
          $slice: -MAX_STORED_EVENTS,
        },
      },
    },
  );
  return {
    ...attempt,
    status: 'expired',
    endedAt,
    lastActivityAt: now,
    events: [...attempt.events, { type: 'ASSESSMENT_EXPIRED', receivedAt: now, counted: false }]
      .slice(-MAX_STORED_EVENTS),
  };
}

async function findStudentAttempt(database, assignmentId, studentId, now = new Date()) {
  const attempt = await database.collection('secure_assessment_attempts').findOne({
    assignmentId: new ObjectId(assignmentId),
    studentId: new ObjectId(studentId),
  });
  return attempt ? updateExpiredAttempt(database, attempt, now) : null;
}

async function reserveEventRateSlot(attempts, attempt, now) {
  let current = attempt;
  for (let retry = 0; retry < 3; retry += 1) {
    const windowStartedAt = current.eventWindowStartedAt || current.startedAt;
    const windowCount = current.eventWindowCount || 0;
    const expiredWindow = now.getTime() - windowStartedAt.getTime() >= 60_000;
    if (!expiredWindow && windowCount >= MAX_EVENTS_PER_MINUTE) {
      throw new SecureAssessmentError('Too many activity events. Please wait before retrying.', 429);
    }
    const query = {
      _id: current._id,
      status: 'active',
      eventWindowStartedAt: windowStartedAt,
      eventWindowCount: windowCount,
    };
    const update = expiredWindow
      ? { $set: { eventWindowStartedAt: now, eventWindowCount: 1 } }
      : { $inc: { eventWindowCount: 1 } };
    const result = await attempts.updateOne(query, update);
    if (result.matchedCount) return;
    current = await attempts.findOne({ _id: attempt._id, status: 'active' });
    if (!current) throw new SecureAssessmentError('This assessment attempt is no longer active.', 409);
  }
  throw new SecureAssessmentError('Too many activity events. Please retry shortly.', 429);
}

export async function getCurrentSecureAttempt(database, student, assignmentId, now = new Date()) {
  if (student?.role !== 'student' || !validId(student.id)) {
    throw new SecureAssessmentError('Student authentication is required.', 403);
  }
  if (!validId(assignmentId)) throw new SecureAssessmentError('Select a valid assignment.');
  const assignment = await database.collection('assignments').findOne({
    _id: new ObjectId(assignmentId),
    status: 'published',
    archivedAt: { $exists: false },
  });
  if (!assignment) throw new SecureAssessmentError('Assignment not found.', 404);
  const attempt = await findStudentAttempt(database, assignmentId, student.id, now);
  const enabled = Boolean(assignment.secureLab?.enabled || attempt?.status === 'active');
  return {
    enabled,
    settings: attempt?.secureLab || assignment.secureLab || null,
    attempt: attempt ? serializeAttempt(attempt) : null,
  };
}

export async function startSecureAssessment(database, student, assignmentId, now = new Date()) {
  if (student?.role !== 'student' || !validId(student.id)) {
    throw new SecureAssessmentError('Student authentication is required.', 403);
  }
  if (!validId(assignmentId)) throw new SecureAssessmentError('Select a valid assignment.');
  const assignment = await database.collection('assignments').findOne({
    _id: new ObjectId(assignmentId),
    status: 'published',
    archivedAt: { $exists: false },
  });
  if (!assignment) throw new SecureAssessmentError('Assignment not found.', 404);
  if (!assignment.secureLab?.enabled) {
    throw new SecureAssessmentError('Secure Lab Mode is not enabled for this assignment.', 409);
  }
  if (!(assignment.dueAt instanceof Date) || assignment.dueAt <= now) {
    throw new SecureAssessmentError('The assignment deadline has passed.', 409);
  }

  const existing = await findStudentAttempt(database, assignmentId, student.id, now);
  if (existing) {
    if (existing.status === 'active') return serializeAttempt(existing);
    throw new SecureAssessmentError('This Secure Lab attempt has already ended.', 409);
  }

  const durationDeadline = assignment.timeLimit > 0
    ? new Date(now.getTime() + assignment.timeLimit * 60_000)
    : assignment.dueAt;
  const attempt = {
    assignmentId: assignment._id,
    facultyId: assignment.facultyId,
    studentId: new ObjectId(student.id),
    assignmentTitle: assignment.title,
    studentName: student.name || 'Student',
    studentIdentifier: '',
    status: 'active',
    startedAt: now,
    deadlineAt: new Date(Math.min(durationDeadline.getTime(), assignment.dueAt.getTime())),
    endedAt: null,
    violationCount: 0,
    fullscreenExitCount: 0,
    autoSubmitRequired: false,
    reviewRequired: false,
    eventWindowStartedAt: now,
    eventWindowCount: 0,
    secureLab: assignment.secureLab,
    events: [{ type: 'ASSESSMENT_STARTED', receivedAt: now, counted: false }],
    lastActivityAt: now,
  };
  const studentRecord = await database.collection('students').findOne({
    userId: new ObjectId(student.id),
  });
  if (studentRecord?.usn) attempt.studentIdentifier = studentRecord.usn;

  try {
    const result = await database.collection('secure_assessment_attempts').insertOne(attempt);
    return serializeAttempt({ ...attempt, _id: result.insertedId });
  } catch (error) {
    if (error.code !== 11000) throw error;
    const racedAttempt = await findStudentAttempt(database, assignmentId, student.id, now);
    if (racedAttempt?.status === 'active') return serializeAttempt(racedAttempt);
    throw new SecureAssessmentError('A Secure Lab attempt already exists and has ended.', 409);
  }
}

export async function recordSecureAssessmentEvent(database, student, attemptId, input = {}, now = new Date()) {
  if (student?.role !== 'student' || !validId(student.id)) {
    throw new SecureAssessmentError('Student authentication is required.', 403);
  }
  if (!validId(attemptId)) throw new SecureAssessmentError('Select a valid assessment attempt.');
  if (!ALLOWED_EVENTS.has(input.type)) throw new SecureAssessmentError('Unsupported Secure Lab activity event.');
  const clientTimestamp = input.clientTimestamp;
  if (clientTimestamp !== undefined
      && (typeof clientTimestamp !== 'string' || !Number.isFinite(Date.parse(clientTimestamp)))) {
    throw new SecureAssessmentError('Activity timestamp is invalid.');
  }

  const attempts = database.collection('secure_assessment_attempts');
  let attempt = await attempts.findOne({
    _id: new ObjectId(attemptId),
    studentId: new ObjectId(student.id),
  });
  if (!attempt) throw new SecureAssessmentError('Assessment attempt not found.', 404);
  attempt = await updateExpiredAttempt(database, attempt, now);
  if (attempt.status !== 'active') throw new SecureAssessmentError('This assessment attempt is no longer active.', 409);
  if (attempt.secureLab?.enabled !== true
      || (['TAB_HIDDEN', 'TAB_VISIBLE'].includes(input.type) && !attempt.secureLab.recordTabSwitches)
      || (['FULLSCREEN_EXIT', 'FULLSCREEN_RESTORED'].includes(input.type)
        && !attempt.secureLab.recordFullscreenExits)) {
    throw new SecureAssessmentError('This activity is not enabled for the assessment.', 409);
  }
  if (input.clientEventId !== undefined
      && (typeof input.clientEventId !== 'string' || input.clientEventId.length > 80)) {
    throw new SecureAssessmentError('Activity event id is invalid.');
  }
  if (input.clientEventId && attempt.events.some((event) => event.clientEventId === input.clientEventId)) {
    return { attempt: serializeAttempt(attempt), duplicate: true };
  }
  await reserveEventRateSlot(attempts, attempt, now);

  const counted = COUNTED_EVENTS.has(input.type);
  const duplicateIncident = counted
    && attempt.lastViolationAt
    && now.getTime() - attempt.lastViolationAt.getTime() <= 2500;
  const countCandidate = counted && !duplicateIncident;
  const violationCount = attempt.violationCount + (countCandidate ? 1 : 0);
  const reviewRequired = attempt.secureLab.maxViolations > 0
    ? violationCount >= attempt.secureLab.maxViolations
    : attempt.reviewRequired;
  const fullscreenExitCandidate = countCandidate && input.type === 'FULLSCREEN_EXIT';
  const fullscreenExitCount = (attempt.fullscreenExitCount || 0) + (fullscreenExitCandidate ? 1 : 0);
  const maxFullscreenExits = Number(attempt.secureLab.maxFullscreenExits) || 0;
  const autoSubmitRequired = attempt.autoSubmitRequired === true
    || (maxFullscreenExits > 0 && fullscreenExitCount >= maxFullscreenExits);
  const serverIncidentId = countCandidate
    ? randomUUID()
    : (attempt.events.findLast((event) => event.counted)?.incidentId || null);
  const event = {
    type: input.type,
    receivedAt: now,
    ...(clientTimestamp ? { clientTimestamp } : {}),
    ...(serverIncidentId ? { incidentId: serverIncidentId } : {}),
    ...(input.clientEventId ? { clientEventId: input.clientEventId } : {}),
    counted: Boolean(countCandidate),
  };
  const updateFilter = { _id: attempt._id, status: 'active' };
  if (countCandidate) {
    updateFilter.lastViolationAt = attempt.lastViolationAt
      ? attempt.lastViolationAt
      : { $exists: false };
  }
  const update = {
    $set: {
      lastActivityAt: now,
      ...(countCandidate ? {
        lastViolationAt: now,
        reviewRequired,
        fullscreenExitCount,
        ...(autoSubmitRequired ? { autoSubmitRequired: true } : {}),
      } : {}),
    },
    $push: { events: { $each: [event], $slice: -MAX_STORED_EVENTS } },
    ...(countCandidate ? { $inc: { violationCount: 1 } } : {}),
  };
  let updateResult = await attempts.updateOne(updateFilter, update);
  let countedThisEvent = countCandidate;
  if (countCandidate && !updateResult.matchedCount) {
    const latest = await attempts.findOne({ _id: attempt._id, status: 'active' });
    if (!latest) throw new SecureAssessmentError('This assessment attempt is no longer active.', 409);
    const duplicateEvent = input.clientEventId
      && latest.events.some((savedEvent) => savedEvent.clientEventId === input.clientEventId);
    if (duplicateEvent) return { attempt: serializeAttempt(latest), duplicate: true, counted: false };
    const latestIncidentId = latest.events.findLast((savedEvent) => savedEvent.counted)?.incidentId || null;
    const duplicateEventRecord = {
      ...event,
      counted: false,
      ...(latestIncidentId ? { incidentId: latestIncidentId } : {}),
    };
    updateResult = await attempts.updateOne(
      { _id: attempt._id, status: 'active' },
      {
        $set: { lastActivityAt: now },
        $push: { events: { $each: [duplicateEventRecord], $slice: -MAX_STORED_EVENTS } },
      },
    );
    if (!updateResult.matchedCount) {
      throw new SecureAssessmentError('This assessment attempt is no longer active.', 409);
    }
    countedThisEvent = false;
  }
  const latestAttempt = await attempts.findOne({ _id: attempt._id });
  if (!latestAttempt) throw new SecureAssessmentError('Assessment attempt not found.', 404);
  return {
    attempt: serializeAttempt(latestAttempt),
    duplicate: false,
    counted: Boolean(countedThisEvent),
  };
}

export async function endSecureAssessment(database, student, attemptId, now = new Date()) {
  if (student?.role !== 'student' || !validId(student.id) || !validId(attemptId)) {
    throw new SecureAssessmentError('A valid student assessment attempt is required.', 403);
  }
  const attempts = database.collection('secure_assessment_attempts');
  const attempt = await attempts.findOne({
    _id: new ObjectId(attemptId),
    studentId: new ObjectId(student.id),
    status: 'active',
  });
  if (!attempt) throw new SecureAssessmentError('Active assessment attempt not found.', 404);
  const status = now >= attempt.deadlineAt ? 'expired' : 'ended';
  await attempts.updateOne(
    { _id: attempt._id, studentId: new ObjectId(student.id), status: 'active' },
    {
      $set: { status, endedAt: now, lastActivityAt: now },
      $push: {
        events: {
          $each: [{
            type: status === 'expired' ? 'ASSESSMENT_EXPIRED' : 'ASSESSMENT_ENDED',
            receivedAt: now,
            counted: false,
          }],
          $slice: -MAX_STORED_EVENTS,
        },
      },
    },
  );
  return serializeAttempt({
    ...attempt,
    status,
    endedAt: now,
    lastActivityAt: now,
    events: [...attempt.events, {
      type: status === 'expired' ? 'ASSESSMENT_EXPIRED' : 'ASSESSMENT_ENDED',
      receivedAt: now,
      counted: false,
    }].slice(-MAX_STORED_EVENTS),
  });
}

export async function assertSecureAttemptCanSubmit(database, assignment, studentId, now = new Date()) {
  const attempt = await findStudentAttempt(database, assignment._id.toString(), studentId, now);
  if (!assignment.secureLab?.enabled && !attempt) return null;
  if (!attempt) {
    throw new SecureAssessmentError('Start an active Secure Lab attempt before running or submitting.', 409);
  }
  if (attempt.status === 'expired' || now >= attempt.deadlineAt) {
    throw new SecureAssessmentError('The Secure Lab assessment deadline has passed.', 409);
  }
  if (attempt.status !== 'active') {
    throw new SecureAssessmentError('This Secure Lab attempt has already ended.', 409);
  }
  return attempt;
}

export async function completeSecureAttempt(database, attemptId, submissionId, now = new Date()) {
  if (!attemptId) return;
  const attempts = database.collection('secure_assessment_attempts');
  const active = await attempts.findOne({ _id: attemptId, status: 'active' });
  const eventType = active?.autoSubmitRequired
    ? 'ASSESSMENT_AUTO_SUBMITTED'
    : 'ASSESSMENT_SUBMITTED';
  await attempts.updateOne(
    { _id: attemptId, status: 'active' },
    {
      $set: {
        status: 'submitted',
        submissionId,
        endedAt: now,
        lastActivityAt: now,
      },
      $push: {
        events: {
          $each: [{ type: eventType, receivedAt: now, counted: false }],
          $slice: -MAX_STORED_EVENTS,
        },
      },
    },
  );
}

export async function listFacultySecureAttempts(database, facultyId, now = new Date()) {
  const records = await database.collection('secure_assessment_attempts')
    .find({
      facultyId: new ObjectId(facultyId),
      startedAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
    })
    .sort({ lastActivityAt: -1 })
    .toArray();
  const attempts = [];
  for (const record of records) {
    const current = await updateExpiredAttempt(database, record, now);
    attempts.push(serializeAttempt(current));
  }
  return attempts;
}

export async function getFacultySecureAttempt(database, facultyId, attemptId) {
  if (!validId(attemptId)) throw new SecureAssessmentError('Select a valid assessment attempt.');
  const attempt = await database.collection('secure_assessment_attempts').findOne({
    _id: new ObjectId(attemptId),
    facultyId: new ObjectId(facultyId),
  });
  if (!attempt) throw new SecureAssessmentError('Assessment activity not found.', 404);
  return serializeAttempt(attempt, true);
}
