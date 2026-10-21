import assert from 'node:assert/strict';
import test from 'node:test';
import { ObjectId } from 'mongodb';
import {
  dismissNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './notifications.service.js';

function matches(document, query) {
  return Object.entries(query).every(([key, value]) => {
    if (value && typeof value === 'object' && '$gte' in value) {
      return document[key] >= value.$gte;
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
    let documents = this.documents.filter((document) => matches(document, query));
    const cursor = {
      sort: (sortSpec) => {
        const [[field, direction]] = Object.entries(sortSpec);
        documents = [...documents].sort(
          (left, right) => (left[field] > right[field] ? 1 : -1) * direction,
        );
        return cursor;
      },
      limit: (count) => {
        documents = documents.slice(0, count);
        return cursor;
      },
      toArray: async () => documents,
    };
    return cursor;
  }

  async updateOne(query, update, options = {}) {
    let document = this.documents.find((candidate) => matches(candidate, query));
    if (!document && options.upsert) {
      document = { ...query, ...update.$setOnInsert };
      this.documents.push(document);
    }
    if (document) Object.assign(document, update.$set);
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

test('notification state is durable and isolated to the authenticated recipient', async () => {
  const database = createDatabase();
  const facultyId = new ObjectId();
  const studentId = new ObjectId();
  const assignmentId = new ObjectId();
  const submissionId = new ObjectId();
  const now = new Date();
  await database.collection('users').insertOne({
    _id: studentId,
    name: 'Sam Student',
  });
  await database.collection('assignments').insertOne({
    _id: assignmentId,
    facultyId,
    title: 'Array sum',
    status: 'published',
    updatedAt: now,
  });
  await database.collection('students').insertOne({
    userId: studentId,
    facultyId,
  });
  await database.collection('submissions').insertOne({
    _id: submissionId,
    facultyId,
    studentId,
    assignmentId,
    createdAt: now,
  });
  await database.collection('evaluations').insertOne({
    studentId,
    assignmentId,
    submissionId,
    score: 8,
    status: 'published',
    updatedAt: now,
  });

  const faculty = { id: facultyId.toString(), role: 'faculty' };
  const student = { id: studentId.toString(), role: 'student' };
  const facultyNotifications = await listNotifications(database, faculty);
  assert.equal(facultyNotifications.length, 1);
  assert.match(facultyNotifications[0].message, /Sam Student submitted Array sum/);

  const studentNotifications = await listNotifications(database, student);
  assert.deepEqual(
    new Set(studentNotifications.map((notification) => notification.type)),
    new Set(['Assignment', 'Submission', 'Faculty Feedback']),
  );
  assert.ok(studentNotifications.every((notification) => !notification.read));

  await markNotificationRead(database, student, studentNotifications[0].id);
  assert.equal(
    (await listNotifications(database, student)).filter((notification) => notification.read).length,
    1,
  );
  assert.equal((await listNotifications(database, faculty))[0].read, false);

  await dismissNotification(database, student, studentNotifications[0].id);
  assert.equal((await listNotifications(database, student)).length, 2);
  await markAllNotificationsRead(database, student);
  assert.ok((await listNotifications(database, student)).every((notification) => notification.read));
});
