import assert from 'node:assert/strict';
import test from 'node:test';
import { ObjectId } from 'mongodb';
import { executeAllYearsPromotion, executePromotion, executeSelectedPromotion } from './students.service.js';

function matches(document, query) {
  return Object.entries(query).every(([key, expected]) => {
    if (key === '$or') return expected.some((condition) => matches(document, condition));
    const actual = document[key];
    if (expected && typeof expected === 'object' && !(expected instanceof ObjectId)) {
      if ('$in' in expected) return expected.$in.some((value) => String(value) === String(actual));
      if ('$exists' in expected) return (actual !== undefined) === expected.$exists;
      if ('$ne' in expected) return String(actual) !== String(expected.$ne);
    }
    return String(actual) === String(expected);
  });
}

class MemoryCollection {
  constructor(documents = []) { this.documents = documents; }
  findOne(query) { return Promise.resolve(this.documents.find((document) => matches(document, query)) || null); }
  find(query) {
    let documents = this.documents.filter((document) => matches(document, query));
    const cursor = {
      sort: (fields) => {
        const [[key, direction]] = Object.entries(fields);
        documents = [...documents].sort((left, right) => ((left[key] > right[key] ? 1 : -1) * direction));
        return cursor;
      },
      toArray: async () => documents,
    };
    return cursor;
  }
  async updateOne(query, update, options = {}) {
    let document = this.documents.find((item) => matches(item, query));
    if (!document && options.upsert) {
      document = { ...query, _id: new ObjectId() };
      this.documents.push(document);
    }
    if (!document) return { matchedCount: 0, modifiedCount: 0 };
    Object.assign(document, update.$set || {}, update.$setOnInsert && options.upsert ? update.$setOnInsert : {});
    for (const [key, value] of Object.entries(update.$push || {})) (document[key] ||= []).push(value);
    return { matchedCount: 1, modifiedCount: 1 };
  }
  async updateMany(query, update) {
    const matched = this.documents.filter((document) => matches(document, query));
    matched.forEach((document) => Object.assign(document, update.$set || {}));
    return { matchedCount: matched.length, modifiedCount: matched.length };
  }
  async insertOne(document) {
    const saved = { ...document, _id: document._id || new ObjectId() };
    this.documents.push(saved);
    return { insertedId: saved._id };
  }
}

function makeDatabase(topologyType = 'ReplicaSetWithPrimary') {
  const facultyId = new ObjectId();
  const records = [1, 2, 3, 4].map((year, index) => ({
    _id: new ObjectId(), userId: new ObjectId(), usn: `STUDENT${index + 1}`,
    department: 'Computer Science', year, status: 'active',
  }));
  const collections = new Map([
    ['students', new MemoryCollection(records)],
    ['users', new MemoryCollection(records.map((record, index) => ({ _id: record.userId, name: `Student ${index + 1}` })))],
    ['academic_sessions', new MemoryCollection([{ _id: new ObjectId(), sessionName: '2026-27', isCurrent: true }])],
    ['promotion_history', new MemoryCollection()],
  ]);
  return {
    facultyId,
    records,
    collection(name) {
      if (!collections.has(name)) collections.set(name, new MemoryCollection());
      return collections.get(name);
    },
    client: {
      topology: { description: { type: topologyType } },
      startSession: () => ({ startTransaction() {}, async commitTransaction() {}, async abortTransaction() {}, endSession() {} }),
    },
  };
}

test('all-year promotion uses each student’s original year and completes fourth-years once', async () => {
  const database = makeDatabase();
  const faculty = { id: database.facultyId.toString(), name: 'Faculty', role: 'faculty', department: 'Computer Science' };
  const result = await executeAllYearsPromotion(database, faculty, '2026-27 -> 2027-28');
  const [first, second, third, fourth] = database.records;
  assert.equal(first.year, 2);
  assert.equal(second.year, 3);
  assert.equal(third.year, 4);
  assert.equal(fourth.year, 4);
  assert.ok(fourth.completedAt);
  assert.equal(result.summary.promoted, 3);
  assert.equal(result.summary.graduated, 1);
  assert.equal(result.failed.length, 0);
  assert.equal(database.collection('academic_sessions').documents.find((session) => session.isCurrent)?.sessionName, '2027-28');
  await assert.rejects(executeAllYearsPromotion(database, faculty, '2026-27 -> 2027-28'), { statusCode: 400 });
});

test('single-year promotion advances the session and supports the next academic year on standalone MongoDB', async () => {
  const database = makeDatabase('Single');
  const faculty = { id: database.facultyId.toString(), name: 'Faculty', role: 'faculty', department: 'Computer Science' };

  const firstOperation = await executePromotion(database, faculty, 1, 2, '2026-27 -> 2027-28');
  assert.equal(firstOperation.summary.promoted, 1);
  assert.equal(database.records[0].year, 2);
  assert.equal(database.collection('academic_sessions').documents.find((session) => session.isCurrent)?.sessionName, '2027-28');

  const nextOperation = await executePromotion(database, faculty, 2, 3, '2027-28 -> 2028-29');
  assert.equal(nextOperation.summary.promoted, 2);
  assert.deepEqual(database.records.slice(0, 2).map((student) => student.year), [3, 3]);
  assert.equal(database.collection('academic_sessions').documents.find((session) => session.isCurrent)?.sessionName, '2028-29');
});

test('selected promotion advances the academic session', async () => {
  const database = makeDatabase('Single');
  const faculty = { id: database.facultyId.toString(), name: 'Faculty', role: 'faculty', department: 'Computer Science' };

  const result = await executeSelectedPromotion(database, faculty, ['STUDENT1'], '2026-27 -> 2027-28');

  assert.equal(result.summary.promoted, 1);
  assert.equal(database.records[0].year, 2);
  assert.equal(database.collection('academic_sessions').documents.find((session) => session.isCurrent)?.sessionName, '2027-28');
});

test('a retry recovers a previously recorded promotion whose response failed', async () => {
  const database = makeDatabase('Single');
  const faculty = { id: database.facultyId.toString(), name: 'Faculty', role: 'faculty', department: 'Computer Science' };
  database.records[0].year = 2;
  await database.collection('promotion_history').insertOne({
    operationId: 'PROMO-2026-01-ABC123',
    idempotencyKey: 'Computer Science:2026-27 -> 2027-28:1',
    promotedCount: 1,
    skippedCount: 0,
    failedCount: 0,
    students: [{ usn: 'STUDENT1', name: 'Student 1' }],
  });

  const result = await executePromotion(database, faculty, 1, 2, '2026-27 -> 2027-28');

  assert.equal(result.operationId, 'PROMO-2026-01-ABC123');
  assert.equal(result.summary.promoted, 1);
  assert.equal(database.records[0].year, 2);
  assert.equal(database.collection('academic_sessions').documents.find((session) => session.isCurrent)?.sessionName, '2027-28');
});
