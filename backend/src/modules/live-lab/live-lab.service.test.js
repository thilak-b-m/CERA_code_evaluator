import assert from 'node:assert/strict';
import test from 'node:test';
import { ObjectId } from 'mongodb';
import {
  endLiveLabSession,
  initializeLiveLabCollections,
  listLiveLabSessions,
  recordLiveLabHeartbeat,
} from './live-lab.service.js';

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

  async findOne(query) {
    return this.documents.find((document) => matches(document, query)) || null;
  }

  async updateOne(query, update, options = {}) {
    let document = this.documents.find((item) => matches(item, query));
    if (!document && options.upsert) {
      document = { ...query, ...update.$setOnInsert };
      this.documents.push(document);
    }
    if (document) Object.assign(document, update.$set);
  }

  async deleteOne(query) {
    this.documents = this.documents.filter((document) => !matches(document, query));
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

test('live lab presence is persisted, scoped to a faculty member, and expires when heartbeats stop', async () => {
  const database = createDatabase();
  await initializeLiveLabCollections(database);
  const facultyId = new ObjectId();
  const studentId = new ObjectId();
  const assignmentId = new ObjectId();
  await database.collection('assignments').documents.push({
    _id: assignmentId,
    facultyId,
    status: 'published',
    title: 'Array traversal',
    languages: ['python'],
  });

  const now = new Date('2026-10-15T12:00:00.000Z');
  await recordLiveLabHeartbeat(
    database,
    { id: studentId.toString(), name: 'A Student', role: 'student' },
    { assignmentId: assignmentId.toString(), language: 'python', status: 'editing' },
    now,
  );

  const active = await listLiveLabSessions(database, facultyId.toString(), now.getTime() + 10_000);
  assert.deepEqual(active.map(({ student, assignment, status }) => (
    { student, assignment, status }
  )), [{ student: 'A Student', assignment: 'Array traversal', status: 'editing' }]);
  const expired = await listLiveLabSessions(database, facultyId.toString(), now.getTime() + 46_000);
  assert.equal(expired.length, 0);

  await endLiveLabSession(database, { id: studentId.toString() }, assignmentId.toString());
  assert.equal(database.collection('live_lab_sessions').documents.length, 0);
});

test('live lab rejects unavailable assignments and unsupported activity', async () => {
  const database = createDatabase();
  const student = { id: new ObjectId().toString(), role: 'student' };
  await assert.rejects(
    recordLiveLabHeartbeat(database, student, {
      assignmentId: new ObjectId().toString(),
      language: 'python',
      status: 'editing',
    }),
    /not available/,
  );
  await assert.rejects(
    recordLiveLabHeartbeat(database, student, {
      assignmentId: 'invalid',
      language: 'python',
      status: 'editing',
    }),
    /valid assignment/,
  );
});
