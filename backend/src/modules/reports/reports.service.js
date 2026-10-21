import { ObjectId } from 'mongodb';
import { getFacultyAnalytics } from '../analytics/analytics.service.js';
import { listFacultySubmissions } from '../submissions/submissions.service.js';
import { REPORT_SECTIONS, ReportValidationError } from './reports.schema.js';

const MAX_EXPORTS = 20;

export async function initializeReportCollections(database) {
  await database.collection('report_templates').createIndex({ facultyId: 1 }, { unique: true });
  await database.collection('report_exports').createIndex({ facultyId: 1, createdAt: -1 });
}

function serializeExport(record) {
  const daysAgo = Math.max(0, Math.floor((Date.now() - record.createdAt.getTime()) / 86400000));
  return {
    id: record._id.toString(),
    title: 'CERA Course Report',
    daysAgo,
    format: record.format === 'CSV workbook' ? 'CSV' : 'PDF',
    size: 'Available',
    selectedSectionIds: record.selectedSectionIds,
    generatedAt: record.createdAt.toISOString(),
  };
}

function normalizedScore(submission) {
  if (
    submission.evaluation?.status !== 'published'
    || !Number.isFinite(submission.maxScore)
    || submission.maxScore <= 0
  ) return null;
  return Math.max(0, Math.min(100, (submission.evaluation.score / submission.maxScore) * 100));
}

async function buildReportSections(database, facultyId, selectedSectionIds) {
  const facultyObjectId = new ObjectId(facultyId);
  const [assignments, students, submissions, analytics] = await Promise.all([
    database.collection('assignments')
      .find({ facultyId: facultyObjectId, archivedAt: { $exists: false } })
      .sort({ createdAt: -1 })
      .toArray(),
    database.collection('students').find({ facultyId: facultyObjectId }).toArray(),
    listFacultySubmissions(database, facultyId),
    getFacultyAnalytics(database, facultyId, 'current'),
  ]);
  const selected = new Set(selectedSectionIds);
  const sectionRows = new Map();

  if (selected.has('course-performance')) {
    const scores = submissions.map(normalizedScore).filter((score) => score !== null);
    sectionRows.set('course-performance', [{
      metric: 'Enrolled students',
      value: students.length,
    }, {
      metric: 'Active assignments',
      value: assignments.length,
    }, {
      metric: 'Submissions',
      value: submissions.length,
    }, {
      metric: 'Published evaluations',
      value: scores.length,
    }, {
      metric: 'Average published score',
      value: scores.length
        ? `${(scores.reduce((total, score) => total + score, 0) / scores.length).toFixed(1)}%`
        : 'No published evaluations',
    }]);
  }

  if (selected.has('assignment-results')) {
    sectionRows.set('assignment-results', assignments.map((assignment) => {
      const assignmentSubmissions = submissions.filter(
        (submission) => submission.assignmentId === assignment._id.toString(),
      );
      const scores = assignmentSubmissions
        .map(normalizedScore)
        .filter((score) => score !== null);
      return {
        assignment: assignment.title,
        course: assignment.course,
        status: assignment.status,
        points: assignment.points,
        submissions: assignmentSubmissions.length,
        averagePublishedScore: scores.length
          ? `${(scores.reduce((total, score) => total + score, 0) / scores.length).toFixed(1)}%`
          : 'Not evaluated',
      };
    }));
  }

  if (selected.has('student-progress')) {
    const users = await Promise.all(students.map((student) => (
      database.collection('users').findOne({ _id: student.userId })
    )));
    sectionRows.set('student-progress', students.map((student, index) => {
      const studentSubmissions = submissions.filter(
        (submission) => submission.studentId === student.userId.toString(),
      );
      const scores = studentSubmissions
        .map(normalizedScore)
        .filter((score) => score !== null);
      return {
        student: users[index]?.name || student.usn,
        usn: student.usn,
        submissions: studentSubmissions.length,
        publishedEvaluations: scores.length,
        averagePublishedScore: scores.length
          ? `${(scores.reduce((total, score) => total + score, 0) / scores.length).toFixed(1)}%`
          : 'Not evaluated',
      };
    }));
  }

  if (selected.has('submission-trends')) {
    sectionRows.set('submission-trends', analytics.submissionCounts.map((count, index) => {
      const weekStart = new Date(
        new Date(analytics.period.start).getTime() + index * 7 * 24 * 60 * 60 * 1000,
      );
      return { weekStarting: weekStart.toISOString().slice(0, 10), submissions: count };
    }));
  }

  return REPORT_SECTIONS
    .filter((section) => selected.has(section.id))
    .map((section) => ({
      id: section.id,
      label: section.label,
      rows: sectionRows.get(section.id) || [],
    }));
}

export async function getReportSettings(database, facultyId) {
  const facultyObjectId = new ObjectId(facultyId);
  const [template, exports] = await Promise.all([
    database.collection('report_templates').findOne({ facultyId: facultyObjectId }),
    database.collection('report_exports')
      .find({ facultyId: facultyObjectId })
      .sort({ createdAt: -1 })
      .limit(MAX_EXPORTS)
      .toArray(),
  ]);
  return {
    sections: REPORT_SECTIONS,
    savedTemplate: template ? {
      selectedSectionIds: template.selectedSectionIds,
      format: template.format,
    } : null,
    recentExports: exports.map(serializeExport),
  };
}

export async function saveReportTemplate(database, facultyId, parsed) {
  const now = new Date();
  await database.collection('report_templates').updateOne(
    { facultyId: new ObjectId(facultyId) },
    {
      $set: { ...parsed, updatedAt: now },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
  return { ...parsed, savedAt: now.toISOString() };
}

export async function createReportExport(database, facultyId, parsed) {
  const sections = await buildReportSections(database, facultyId, parsed.selectedSectionIds);
  const record = {
    facultyId: new ObjectId(facultyId),
    ...parsed,
    createdAt: new Date(),
  };
  const result = await database.collection('report_exports').insertOne(record);
  return {
    sections,
    exportRecord: serializeExport({ ...record, _id: result.insertedId }),
  };
}

export async function getReportExport(database, facultyId, exportId) {
  if (!ObjectId.isValid(exportId)) {
    throw new ReportValidationError('Invalid report export id.');
  }
  const record = await database.collection('report_exports').findOne({
    _id: new ObjectId(exportId),
    facultyId: new ObjectId(facultyId),
  });
  if (!record) {
    const error = new Error('Report export not found.');
    error.statusCode = 404;
    throw error;
  }
  return {
    sections: await buildReportSections(database, facultyId, record.selectedSectionIds),
    exportRecord: serializeExport(record),
  };
}

export async function previewReportSections(database, facultyId, selectedSectionIds) {
  const sections = await buildReportSections(database, facultyId, selectedSectionIds);
  return sections.map((section) => ({
    id: section.id,
    label: section.label,
    recordCount: section.rows.length,
    rows: section.rows,
  }));
}
