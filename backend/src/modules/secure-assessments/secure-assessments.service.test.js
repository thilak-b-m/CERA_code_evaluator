import assert from 'node:assert/strict';
import test from 'node:test';
import { ObjectId } from 'mongodb';
import {
  getCurrentSecureAttempt,
  getFacultySecureAttempt,
  initializeSecureAssessmentCollections,
  listFacultySecureAttempts,
  recordSecureAssessmentEvent,
  startSecureAssessment,
  assertSecureAttemptCanSubmit,
} from './secure-assessments.service.js';

function matches(document, query) {
  return Object.entries(query).every(([key, expected]) => {
    if (expected && typeof expected === 'object' && '$exists' in expected) {
      return (document[key] !== undefined) === expected.$exists;
    }
    if (expected && typeof expected === 'object' && '$gte' in expected) {
      return document[key] >= expected.$gte;
    }
    return String(document[key]) === String(expected);
  });
}

class MemoryCollection {
  documents = [];

  async createIndex() {}

  async insertOne(document) {
    if (this.documents.some((item) => (
      String(item.studentId) === String(document.studentId)
      && String(item.assignmentId) === String(document.assignmentId)
    ))) {
      const error = new Error('duplicate');
      error.code = 11000;
      throw error;
    }
    const saved = { ...document, _id: new ObjectId() };
    this.documents.push(saved);
    return { insertedId: saved._id };
  }

  async findOne(query) {
    return this.documents.find((document) => matches(document, query)) || null;
  }

  async updateOne(query, update) {
    const document = this.documents.find((item) => matches(item, query));
    if (!document) return { matchedCount: 0 };
    Object.assign(document, update.$set || {});
    if (update.$push?.events) {
      const { $each, $slice } = update.$push.events;
      document.events.push(...$each);
      if ($slice < 0) document.events = document.events.slice($slice);
    }
    if (update.$inc) {
      for (const [field, amount] of Object.entries(update.$inc)) {
        document[field] = (document[field] || 0) + amount;
      }
    }
    return { matchedCount: 1 };
  }

  find(query) {
    const records = this.documents.filter((document) => matches(document, query));
    return {
      sort: () => ({ toArray: async () => records }),
      toArray: async () => records,
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

test('Secure Lab attempts use server deadlines and reconnect to the existing attempt', async () => {
  const database = createDatabase();
  await initializeSecureAssessmentCollections(database);
  const facultyId = new ObjectId();
  const studentId = new ObjectId();
  const assignmentId = new ObjectId();
  const now = new Date('2026-10-16T08:00:00Z');
  database.collection('assignments').documents.push({
    _id: assignmentId,
    facultyId,
    title: 'Secure exercise',
    status: 'published',
    dueAt: new Date('2026-10-16T12:00:00Z'),
    timeLimit: 30,
    secureLab: {
      enabled: true,
      requireFullscreen: true,
      recordTabSwitches: true,
      recordFullscreenExits: true,
      warningThreshold: 1,
      maxViolations: 2,
    },
  });

  const student = { id: studentId.toString(), role: 'student', name: 'Student' };
  const attempt = await startSecureAssessment(database, student, assignmentId.toString(), now);
  assert.equal(attempt.deadlineAt, '2026-10-16T08:30:00.000Z');
  const resumed = await startSecureAssessment(database, student, assignmentId.toString(), now);
  assert.equal(resumed.id, attempt.id);
  const current = await getCurrentSecureAttempt(database, student, assignmentId.toString(), now);
  assert.equal(current.attempt.id, attempt.id);
});

test('Secure Lab logs unique violations, deduplicates incidents, and isolates attempts by student', async () => {
  const database = createDatabase();
  const facultyId = new ObjectId();
  const studentId = new ObjectId();
  const assignmentId = new ObjectId();
  const now = new Date('2026-10-16T08:00:00Z');
  database.collection('assignments').documents.push({
    _id: assignmentId,
    facultyId,
    title: 'Secure exercise',
    status: 'published',
    dueAt: new Date('2026-10-16T12:00:00Z'),
    timeLimit: 0,
    secureLab: {
      enabled: true,
      requireFullscreen: true,
      recordTabSwitches: true,
      recordFullscreenExits: true,
      warningThreshold: 1,
      maxViolations: 1,
    },
  });
  const student = { id: studentId.toString(), role: 'student', name: 'Student' };
  const attempt = await startSecureAssessment(database, student, assignmentId.toString(), now);
  const first = await recordSecureAssessmentEvent(database, student, attempt.id, {
    type: 'TAB_HIDDEN',
    incidentId: 'incident-1',
    clientEventId: 'event-1',
  }, new Date(now.getTime() + 1000));
  assert.equal(first.attempt.violationCount, 1);
  assert.equal(first.attempt.reviewRequired, true);

  const duplicate = await recordSecureAssessmentEvent(database, student, attempt.id, {
    type: 'FULLSCREEN_EXIT',
    incidentId: 'incident-1',
    clientEventId: 'event-2',
  }, new Date(now.getTime() + 1500));
  assert.equal(duplicate.attempt.violationCount, 1);

  await assert.rejects(
    recordSecureAssessmentEvent(
      database,
      { id: new ObjectId().toString(), role: 'student' },
      attempt.id,
      { type: 'TAB_HIDDEN' },
      new Date(now.getTime() + 2000),
    ),
    /not found/,
  );
});

test('Secure Lab deadlines expire attempts and block run or submission requests', async () => {
  const database = createDatabase();
  const facultyId = new ObjectId();
  const studentId = new ObjectId();
  const assignmentId = new ObjectId();
  const now = new Date('2026-10-16T08:00:00Z');
  database.collection('assignments').documents.push({
    _id: assignmentId,
    facultyId,
    title: 'Timed exercise',
    status: 'published',
    dueAt: new Date('2026-10-16T12:00:00Z'),
    timeLimit: 1,
    secureLab: {
      enabled: true,
      requireFullscreen: true,
      recordTabSwitches: true,
      recordFullscreenExits: true,
      warningThreshold: 1,
      maxViolations: 3,
    },
  });
  const student = { id: studentId.toString(), role: 'student', name: 'Student' };
  const attempt = await startSecureAssessment(database, student, assignmentId.toString(), now);
  const assignment = database.collection('assignments').documents[0];
  assert.equal(
    (await assertSecureAttemptCanSubmit(database, assignment, student.id, now))._id.toString(),
    attempt.id,
  );
  const expiredAt = new Date(now.getTime() + 60_001);
  await assert.rejects(
    assertSecureAttemptCanSubmit(database, assignment, student.id, expiredAt),
    /deadline has passed/,
  );
  assert.equal(
    (await getCurrentSecureAttempt(database, student, assignmentId.toString(), expiredAt)).attempt.status,
    'expired',
  );
});

test('faculty Secure Lab activity is scoped to the assignment owner and includes a timeline', async () => {
  const database = createDatabase();
  const facultyId = new ObjectId();
  const anotherFacultyId = new ObjectId();
  const studentId = new ObjectId();
  const assignmentId = new ObjectId();
  const now = new Date('2026-10-16T08:00:00Z');
  database.collection('assignments').documents.push({
    _id: assignmentId,
    facultyId,
    title: 'Review exercise',
    status: 'published',
    dueAt: new Date('2026-10-16T12:00:00Z'),
    timeLimit: 30,
    secureLab: {
      enabled: true,
      requireFullscreen: true,
      recordTabSwitches: true,
      recordFullscreenExits: true,
      warningThreshold: 1,
      maxViolations: 3,
    },
  });
  const student = { id: studentId.toString(), role: 'student', name: 'Student' };
  const attempt = await startSecureAssessment(database, student, assignmentId.toString(), now);
  const attempts = await listFacultySecureAttempts(database, facultyId.toString(), now);
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0].id, attempt.id);
  const activity = await getFacultySecureAttempt(database, facultyId.toString(), attempt.id);
  assert.equal(activity.events[0].type, 'ASSESSMENT_STARTED');
  await assert.rejects(
    getFacultySecureAttempt(database, anotherFacultyId.toString(), attempt.id),
    /not found/,
  );
});

test('Secure Lab activity rate limits are enforced atomically per attempt', async () => {
  const database = createDatabase();
  const facultyId = new ObjectId();
  const studentId = new ObjectId();
  const assignmentId = new ObjectId();
  const now = new Date('2026-10-16T08:00:00Z');
  database.collection('assignments').documents.push({
    _id: assignmentId,
    facultyId,
    title: 'Rate limited exercise',
    status: 'published',
    dueAt: new Date('2026-10-16T12:00:00Z'),
    timeLimit: 30,
    secureLab: {
      enabled: true,
      requireFullscreen: true,
      recordTabSwitches: true,
      recordFullscreenExits: true,
      warningThreshold: 1,
      maxViolations: 3,
    },
  });
  const student = { id: studentId.toString(), role: 'student', name: 'Student' };
  const attempt = await startSecureAssessment(database, student, assignmentId.toString(), now);
  for (let index = 0; index < 30; index += 1) {
    await recordSecureAssessmentEvent(database, student, attempt.id, {
      type: 'TAB_VISIBLE',
      clientEventId: `event-${index}`,
    }, new Date(now.getTime() + index));
  }
  await assert.rejects(
    recordSecureAssessmentEvent(database, student, attempt.id, {
      type: 'TAB_VISIBLE',
      clientEventId: 'event-over-limit',
    }, new Date(now.getTime() + 1000)),
    (error) => error.statusCode === 429,
  );
});

test('Secure Lab counts fullscreen exits and flags auto-submit at the configured maximum', async () => {
  const database = createDatabase();
  const facultyId = new ObjectId();
  const studentId = new ObjectId();
  const assignmentId = new ObjectId();
  const now = new Date('2026-10-16T08:00:00Z');
  database.collection('assignments').documents.push({
    _id: assignmentId,
    facultyId,
    title: 'Fullscreen exit exercise',
    status: 'published',
    dueAt: new Date('2026-10-16T12:00:00Z'),
    timeLimit: 0,
    secureLab: {
      enabled: true,
      requireFullscreen: true,
      recordTabSwitches: true,
      recordFullscreenExits: true,
      warningThreshold: 0,
      maxViolations: 0,
      maxFullscreenExits: 3,
    },
  });
  const student = { id: studentId.toString(), role: 'student', name: 'Student' };
  const attempt = await startSecureAssessment(database, student, assignmentId.toString(), now);

  const first = await recordSecureAssessmentEvent(database, student, attempt.id, {
    type: 'FULLSCREEN_EXIT',
    clientEventId: 'fs-1',
  }, new Date(now.getTime() + 3000));
  assert.equal(first.attempt.fullscreenExitCount, 1);
  assert.equal(first.attempt.autoSubmitRequired, false);

  await recordSecureAssessmentEvent(database, student, attempt.id, {
    type: 'FULLSCREEN_RESTORED',
    clientEventId: 'fs-1-restored',
  }, new Date(now.getTime() + 4000));

  const second = await recordSecureAssessmentEvent(database, student, attempt.id, {
    type: 'FULLSCREEN_EXIT',
    clientEventId: 'fs-2',
  }, new Date(now.getTime() + 8000));
  assert.equal(second.attempt.fullscreenExitCount, 2);
  assert.equal(second.attempt.autoSubmitRequired, false);

  const third = await recordSecureAssessmentEvent(database, student, attempt.id, {
    type: 'FULLSCREEN_EXIT',
    clientEventId: 'fs-3',
  }, new Date(now.getTime() + 13000));
  assert.equal(third.attempt.fullscreenExitCount, 3);
  assert.equal(third.attempt.autoSubmitRequired, true);
});
