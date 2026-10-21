import assert from 'node:assert/strict';
import test from 'node:test';
import { ObjectId } from 'mongodb';
import {
  createReportExport,
  getReportExport,
  getReportSettings,
  initializeReportCollections,
  previewReportSections,
  saveReportTemplate,
} from './reports.service.js';

function matches(document, query) {
  return Object.entries(query).every(([key, value]) => {
    if (value && typeof value === 'object' && '$exists' in value) {
      return (key in document) === value.$exists;
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

test('reports use faculty-owned records and persist templates and export metadata', async () => {
  const database = createDatabase();
  await initializeReportCollections(database);
  const facultyId = new ObjectId();
  const otherFacultyId = new ObjectId();
  const studentId = new ObjectId();
  const assignmentId = new ObjectId();
  const submissionId = new ObjectId();
  const now = new Date();

  await database.collection('students').insertOne({ facultyId, userId: studentId, usn: 'STU1' });
  await database.collection('users').insertOne({ _id: studentId, name: 'Sam Student' });
  await database.collection('assignments').insertOne({
    _id: assignmentId,
    facultyId,
    title: 'Array sum',
    course: 'CS101',
    status: 'published',
    points: 20,
    dueAt: now,
    createdAt: now,
  });
  await database.collection('submissions').insertOne({
    _id: submissionId,
    facultyId,
    studentId,
    assignmentId,
    language: 'python',
    code: 'print(1 + 2)',
    status: 'submitted',
    createdAt: now,
    updatedAt: now,
  });
  await database.collection('evaluations').insertOne({
    facultyId,
    studentId,
    assignmentId,
    submissionId,
    score: 18,
    feedback: 'Correct.',
    status: 'published',
    createdAt: now,
    updatedAt: now,
  });

  const reportInput = {
    selectedSectionIds: ['course-performance', 'assignment-results', 'student-progress'],
    format: 'CSV workbook',
  };
  await saveReportTemplate(database, facultyId.toString(), reportInput);
  const settings = await getReportSettings(database, facultyId.toString());
  assert.deepEqual(settings.savedTemplate.selectedSectionIds, reportInput.selectedSectionIds);
  assert.equal(settings.recentExports.length, 0);

  const created = await createReportExport(database, facultyId.toString(), reportInput);
  assert.equal(created.sections[0].rows[0].value, 1);
  assert.equal(created.sections[1].rows[0].assignment, 'Array sum');
  assert.equal(created.sections[2].rows[0].student, 'Sam Student');

  const preview = await previewReportSections(
    database,
    facultyId.toString(),
    ['assignment-results', 'student-progress'],
  );
  assert.equal(preview.length, 2);
  assert.equal(preview[0].id, 'assignment-results');
  assert.equal(preview[0].recordCount, 1);
  assert.equal(preview[0].rows[0].assignment, 'Array sum');
  assert.equal(preview[1].id, 'student-progress');
  assert.equal(preview[1].rows[0].student, 'Sam Student');

  const download = await getReportExport(
    database,
    facultyId.toString(),
    created.exportRecord.id,
  );
  assert.equal(download.sections.length, 3);
  assert.equal(
    (await getReportSettings(database, facultyId.toString())).recentExports.length,
    1,
  );
  await assert.rejects(
    getReportExport(database, otherFacultyId.toString(), created.exportRecord.id),
    /Report export not found/,
  );
});
