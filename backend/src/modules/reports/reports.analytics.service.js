import { ObjectId } from 'mongodb';
import { ReportValidationError } from './reports.schema.js';

/**
 * Faculty Reports & Analytics query service.
 *
 * All data is derived from records the requesting faculty already owns
 * (`facultyId` scoping is applied to every collection query). Nothing is
 * fabricated: a metric is only produced when the underlying record exists.
 *
 * Documented limitations (surfaced to the client in `limitations`):
 * - Code execution / test-case outcomes are NOT persisted on submissions, so no
 *   execution report is produced from historical data.
 * - No passing threshold is defined in the data model, so no pass rate is
 *   calculated.
 * - "Eligible students" for an assignment is the faculty roster, because the
 *   model has no per-assignment student allocation.
 */

export const REPORT_TYPES = ['assignments', 'students', 'submissions', 'evaluations'];

const REPORT_TYPE_SET = new Set(REPORT_TYPES);
const STATUS_VALUES = new Set(['pending', 'evaluated', 'published', 'draft']);
const SORT_DIRECTIONS = new Set(['asc', 'desc']);
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const TREND_WEEKS = 12;
const MAX_SEARCH_LENGTH = 80;

const SCORE_BUCKETS = ['0–20%', '21–40%', '41–60%', '61–80%', '81–100%'];

const BASE_LIMITATIONS = [
  'Code execution and test-case outcomes are not stored on submissions, so historical execution results are unavailable.',
  'No passing threshold is defined in the data model, so no pass rate is calculated.',
];

function parseDateBoundary(value, label) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ReportValidationError(`Invalid ${label} date. Use YYYY-MM-DD.`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new ReportValidationError(`Invalid ${label} date.`);
  }
  return date;
}

function parsePositiveInteger(value, fallback, max) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return max ? Math.min(parsed, max) : parsed;
}

export function parseReportQuery(query = {}) {
  const reportType = query.type;
  if (!REPORT_TYPE_SET.has(reportType)) {
    throw new ReportValidationError('Unsupported report type.');
  }

  const filters = {};
  if (query.assignmentId) {
    if (typeof query.assignmentId !== 'string' || !ObjectId.isValid(query.assignmentId)) {
      throw new ReportValidationError('Invalid assignment id.');
    }
    filters.assignmentId = new ObjectId(query.assignmentId);
  }
  if (query.student) {
    if (typeof query.student !== 'string' || query.student.length > 40) {
      throw new ReportValidationError('Invalid student filter.');
    }
    filters.student = query.student;
  }
  if (query.language) {
    if (typeof query.language !== 'string' || query.language.length > 24) {
      throw new ReportValidationError('Invalid language filter.');
    }
    filters.language = query.language;
  }
  if (query.status) {
    if (typeof query.status !== 'string' || !STATUS_VALUES.has(query.status)) {
      throw new ReportValidationError('Invalid status filter.');
    }
    filters.status = query.status;
  }

  const from = parseDateBoundary(query.from, 'start');
  const to = parseDateBoundary(query.to, 'end');
  if (from && to && from.getTime() > to.getTime()) {
    throw new ReportValidationError('The start date must be on or before the end date.');
  }
  filters.from = from;
  filters.to = to;

  return {
    reportType,
    filters,
    page: parsePositiveInteger(query.page, 1),
    pageSize: parsePositiveInteger(query.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
    search: typeof query.search === 'string' ? query.search.trim().slice(0, MAX_SEARCH_LENGTH) : '',
    sort: typeof query.sort === 'string' ? query.sort : '',
    sortDir: SORT_DIRECTIONS.has(query.sortDir) ? query.sortDir : 'asc',
  };
}

function withinRange(date, filters) {
  if (!date) return true;
  const time = date.getTime();
  if (filters.from && time < filters.from.getTime()) return false;
  if (filters.to && time > filters.to.getTime() + 86400000 - 1) return false;
  return true;
}

function averageOf(values) {
  if (!values.length) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round((total / values.length) * 10) / 10;
}

function publishedPercentage(submission, evaluationBySubmission, assignmentById) {
  const evaluation = evaluationBySubmission.get(submission._id.toString());
  if (!evaluation || evaluation.status !== 'published') return null;
  const assignment = assignmentById.get(submission.assignmentId.toString());
  const points = assignment?.points;
  if (!Number.isFinite(points) || points <= 0) return null;
  if (!Number.isFinite(evaluation.score)) return null;
  return Math.round(Math.max(0, Math.min(100, (evaluation.score / points) * 100)) * 10) / 10;
}

async function loadContext(database, facultyId, filters) {
  const facultyObjectId = new ObjectId(facultyId);
  const [assignments, studentRecords, submissions, evaluations] = await Promise.all([
    database.collection('assignments')
      .find({ facultyId: facultyObjectId, archivedAt: { $exists: false } })
      .sort({ createdAt: -1 })
      .toArray(),
    database.collection('students').find({ facultyId: facultyObjectId }).toArray(),
    database.collection('submissions').find({ facultyId: facultyObjectId }).toArray(),
    database.collection('evaluations').find({ facultyId: facultyObjectId }).toArray(),
  ]);

  const users = studentRecords.length
    ? await database.collection('users')
      .find({ _id: { $in: studentRecords.map((record) => record.userId) } })
      .toArray()
    : [];

  const assignmentById = new Map(assignments.map((item) => [item._id.toString(), item]));
  const studentByUserId = new Map(
    studentRecords.map((record) => [record.userId.toString(), record]),
  );
  const userNameById = new Map(users.map((user) => [user._id.toString(), user.name]));
  const evaluationBySubmission = new Map(
    evaluations.map((item) => [item.submissionId.toString(), item]),
  );
  const submissionById = new Map(submissions.map((item) => [item._id.toString(), item]));

  const scopedAssignments = filters.assignmentId
    ? assignments.filter((item) => item._id.equals(filters.assignmentId))
    : assignments;
  const scopedStudents = filters.student
    ? studentRecords.filter((record) => record.usn === filters.student)
    : studentRecords;

  const scopedSubmissions = submissions.filter((submission) => {
    if (filters.assignmentId && !submission.assignmentId.equals(filters.assignmentId)) return false;
    if (filters.language && submission.language !== filters.language) return false;
    if (!withinRange(submission.createdAt, filters)) return false;
    if (filters.student) {
      const record = studentByUserId.get(submission.studentId.toString());
      if (!record || record.usn !== filters.student) return false;
    }
    return true;
  });

  return {
    assignments,
    scopedAssignments,
    studentRecords,
    scopedStudents,
    submissions,
    scopedSubmissions,
    evaluations,
    assignmentById,
    submissionById,
    studentByUserId,
    userNameById,
    evaluationBySubmission,
    scopedSubmissionIds: new Set(scopedSubmissions.map((item) => item._id.toString())),
  };
}

function buildFilterOptions(context) {
  const languages = new Set();
  for (const assignment of context.assignments) {
    for (const language of assignment.languages || []) languages.add(language);
  }
  return {
    assignments: context.assignments.map((assignment) => ({
      value: assignment._id.toString(),
      label: assignment.title || 'Untitled assignment',
    })),
    languages: [...languages].sort().map((language) => ({
      value: language,
      label: language.charAt(0).toUpperCase() + language.slice(1),
    })),
    students: context.studentRecords
      .filter((record) => record.usn)
      .map((record) => ({
        value: record.usn,
        label: `${record.usn} · ${context.userNameById.get(record.userId.toString()) || 'Student'}`,
      })),
  };
}

function statusOptionsFor(reportType) {
  if (reportType === 'submissions') {
    return [
      { value: 'pending', label: 'Awaiting evaluation' },
      { value: 'draft', label: 'Draft evaluation' },
      { value: 'published', label: 'Published' },
    ];
  }
  if (reportType === 'evaluations') {
    return [
      { value: 'draft', label: 'Draft' },
      { value: 'published', label: 'Published' },
    ];
  }
  return [];
}

const AVAILABLE_FILTERS = {
  assignments: ['assignmentId', 'language', 'from', 'to'],
  students: ['student', 'assignmentId', 'from', 'to'],
  submissions: ['assignmentId', 'student', 'language', 'status', 'from', 'to'],
  evaluations: ['assignmentId', 'student', 'status', 'from', 'to'],
};

function buildAssignmentRows(context) {
  return context.scopedAssignments.map((assignment) => {
    const submissions = context.scopedSubmissions.filter(
      (submission) => submission.assignmentId.equals(assignment._id),
    );
    const submittedStudentIds = new Set(submissions.map((item) => item.studentId.toString()));
    const eligibleStudents = context.studentRecords.length;
    const evaluated = submissions.filter(
      (item) => context.evaluationBySubmission.get(item._id.toString()),
    ).length;
    const scores = submissions
      .map((item) => publishedPercentage(item, context.evaluationBySubmission, context.assignmentById))
      .filter((score) => score !== null);
    return {
      assignmentId: assignment._id.toString(),
      assignment: assignment.title || 'Untitled assignment',
      course: assignment.course || '—',
      points: Number.isFinite(assignment.points) ? assignment.points : null,
      eligibleStudents,
      submitted: submittedStudentIds.size,
      notSubmitted: Math.max(0, eligibleStudents - submittedStudentIds.size),
      evaluated,
      awaitingEvaluation: Math.max(0, submissions.length - evaluated),
      averagePercentage: averageOf(scores),
      highestPercentage: scores.length ? Math.max(...scores) : null,
      lowestPercentage: scores.length ? Math.min(...scores) : null,
      completionRate: eligibleStudents
        ? Math.round((submittedStudentIds.size / eligibleStudents) * 100)
        : 0,
    };
  });
}

function buildStudentRows(context) {
  const eligibleAssignments = context.scopedAssignments.length;
  return context.scopedStudents.map((record) => {
    const key = record.userId.toString();
    const submissions = context.scopedSubmissions.filter(
      (submission) => submission.studentId.toString() === key,
    );
    const submittedAssignmentIds = new Set(
      submissions.map((submission) => submission.assignmentId.toString()),
    );
    const scores = submissions
      .map((item) => publishedPercentage(item, context.evaluationBySubmission, context.assignmentById))
      .filter((score) => score !== null);
    const timestamps = submissions
      .map((submission) => submission.createdAt)
      .filter(Boolean)
      .sort((left, right) => right.getTime() - left.getTime());
    return {
      student: context.userNameById.get(key) || record.usn || 'Student',
      usn: record.usn || '—',
      eligibleAssignments,
      submitted: submittedAssignmentIds.size,
      notSubmitted: Math.max(0, eligibleAssignments - submittedAssignmentIds.size),
      publishedEvaluations: scores.length,
      averagePercentage: averageOf(scores),
      lastSubmissionAt: timestamps.length ? timestamps[0].toISOString() : null,
    };
  });
}

function evaluationStateFor(context, submissionId) {
  const evaluation = context.evaluationBySubmission.get(submissionId);
  if (!evaluation) return 'pending';
  return evaluation.status === 'published' ? 'published' : 'draft';
}

function buildSubmissionRows(context, statusFilter) {
  return context.scopedSubmissions
    .filter((submission) => {
      if (!statusFilter) return true;
      return evaluationStateFor(context, submission._id.toString()) === statusFilter;
    })
    .map((submission) => {
      const record = context.studentByUserId.get(submission.studentId.toString());
      const assignment = context.assignmentById.get(submission.assignmentId.toString());
      const evaluation = context.evaluationBySubmission.get(submission._id.toString());
      const published = publishedPercentage(
        submission,
        context.evaluationBySubmission,
        context.assignmentById,
      );
      return {
        submissionId: submission._id.toString(),
        student: context.userNameById.get(submission.studentId.toString()) || record?.usn || 'Student',
        usn: record?.usn || '—',
        assignment: assignment?.title || 'Untitled assignment',
        language: submission.language || '—',
        submittedAt: submission.createdAt ? submission.createdAt.toISOString() : null,
        evaluationStatus: !evaluation ? 'Not evaluated' : (evaluation.status === 'published' ? 'Published' : 'Draft'),
        score: published === null ? null : evaluation?.score ?? null,
        maxScore: Number.isFinite(assignment?.points) ? assignment.points : null,
        percentage: published,
      };
    });
}

function buildEvaluationRows(context, statusFilter) {
  return context.evaluations
    .filter((evaluation) => context.scopedSubmissionIds.has(evaluation.submissionId.toString()))
    .filter((evaluation) => (statusFilter ? evaluation.status === statusFilter : true))
    .map((evaluation) => {
      const submission = context.submissionById.get(evaluation.submissionId.toString());
      const record = submission
        ? context.studentByUserId.get(submission.studentId.toString())
        : null;
      const assignment = context.assignmentById.get(evaluation.assignmentId.toString())
        || (submission ? context.assignmentById.get(submission.assignmentId.toString()) : null);
      const points = assignment?.points;
      const percentage = evaluation.status === 'published'
        && Number.isFinite(points) && points > 0 && Number.isFinite(evaluation.score)
        ? Math.round(Math.max(0, Math.min(100, (evaluation.score / points) * 100)) * 10) / 10
        : null;
      return {
        submissionId: evaluation.submissionId.toString(),
        student: context.userNameById.get(evaluation.studentId.toString()) || record?.usn || 'Student',
        usn: record?.usn || '—',
        assignment: assignment?.title || 'Untitled assignment',
        source: evaluation.source === 'ollama' ? 'AI' : 'Faculty',
        status: evaluation.status === 'published' ? 'Published' : 'Draft',
        score: Number.isFinite(evaluation.score) ? evaluation.score : null,
        maxScore: Number.isFinite(points) ? points : null,
        percentage,
        updatedAt: evaluation.updatedAt ? evaluation.updatedAt.toISOString() : null,
      };
    });
}

function buildCharts(context, reportType) {
  const charts = [];

  const submissions = context.scopedSubmissions;
  const publishedScores = submissions
    .map((item) => publishedPercentage(item, context.evaluationBySubmission, context.assignmentById))
    .filter((score) => score !== null);

  const statusCounts = { pending: 0, draft: 0, published: 0 };
  for (const submission of submissions) {
    statusCounts[evaluationStateFor(context, submission._id.toString())] += 1;
  }

  charts.push({
    id: 'statusDistribution',
    title: 'Submission status distribution',
    type: 'donut',
    data: [
      { name: 'Awaiting evaluation', value: statusCounts.pending, color: 'var(--warning)' },
      { name: 'Draft evaluation', value: statusCounts.draft, color: 'var(--accent)' },
      { name: 'Published', value: statusCounts.published, color: 'var(--success)' },
    ],
  });

  const bucketCounts = SCORE_BUCKETS.map(() => 0);
  for (const score of publishedScores) {
    bucketCounts[Math.min(SCORE_BUCKETS.length - 1, Math.floor(score / 20.0001))] += 1;
  }
  charts.push({
    id: 'scoreDistribution',
    title: 'Published score distribution',
    type: 'bar',
    data: SCORE_BUCKETS.map((label, index) => ({
      name: label,
      value: bucketCounts[index],
    })),
  });

  const trend = Array(TREND_WEEKS).fill(0);
  const trendStart = Date.now() - TREND_WEEKS * WEEK_MS;
  for (const submission of submissions) {
    if (!submission.createdAt) continue;
    const week = Math.floor((submission.createdAt.getTime() - trendStart) / WEEK_MS);
    if (week >= 0 && week < TREND_WEEKS) trend[week] += 1;
  }
  charts.push({
    id: 'submissionTrend',
    title: 'Submissions over the last 12 weeks',
    type: 'line',
    data: trend.map((value, index) => ({ name: `W${index + 1}`, value })),
  });

  if (reportType === 'students') {
    const rows = buildStudentRows(context)
      .filter((row) => row.averagePercentage !== null)
      .sort((left, right) => right.averagePercentage - left.averagePercentage)
      .slice(0, 12)
      .map((row) => ({ name: row.usn, value: row.averagePercentage }));
    charts.push({
      id: 'studentAverages',
      title: 'Average published score by student',
      type: 'bar',
      data: rows,
    });
  } else if (reportType !== 'submissions' && reportType !== 'evaluations') {
    const rows = buildAssignmentRows(context)
      .filter((row) => row.averagePercentage !== null)
      .sort((left, right) => right.averagePercentage - left.averagePercentage)
      .slice(0, 12)
      .map((row) => ({ name: row.assignment, value: row.averagePercentage }));
    charts.push({
      id: 'assignmentAverages',
      title: 'Average published score by assignment',
      type: 'bar',
      data: rows,
    });
  }

  return charts;
}

function buildSummary(context, reportType, rows) {
  const submissions = context.scopedSubmissions;
  const publishedSubmissions = submissions.filter((item) => (
    publishedPercentage(item, context.evaluationBySubmission, context.assignmentById) !== null
  ));
  const evaluated = submissions.filter(
    (item) => context.evaluationBySubmission.get(item._id.toString()),
  );
  const publishedEvaluations = context.evaluations.filter((evaluation) => (
    evaluation.status === 'published'
    && context.scopedSubmissionIds.has(evaluation.submissionId.toString())
  ));
  const average = averageOf(
    publishedSubmissions.map(
      (item) => publishedPercentage(item, context.evaluationBySubmission, context.assignmentById),
    ),
  );

  const cards = [
    {
      key: 'submissions',
      label: 'Submissions',
      value: submissions.length,
      format: 'number',
      tone: 'primary',
    },
    {
      key: 'pending',
      label: 'Awaiting evaluation',
      value: Math.max(0, submissions.length - evaluated.length),
      format: 'number',
      tone: 'warning',
    },
    {
      key: 'published',
      label: 'Published results',
      value: publishedEvaluations.length,
      format: 'number',
      tone: 'success',
    },
    {
      key: 'average',
      label: 'Average published score',
      value: average,
      format: 'percent',
      tone: 'accent',
    },
  ];

  if (reportType === 'assignments') {
    return [
      {
        key: 'students',
        label: 'Eligible students',
        value: context.studentRecords.length,
        format: 'number',
        tone: 'primary',
      },
      {
        key: 'assignments',
        label: 'Assignments in scope',
        value: context.scopedAssignments.length,
        format: 'number',
        tone: 'accent',
      },
      ...cards,
    ];
  }

  if (reportType === 'students') {
    const inactive = rows.filter((row) => row.submitted === 0).length;
    return [
      {
        key: 'students',
        label: 'Students in scope',
        value: context.scopedStudents.length,
        format: 'number',
        tone: 'primary',
      },
      {
        key: 'inactive',
        label: 'Students with no submissions',
        value: inactive,
        format: 'number',
        tone: 'warning',
      },
      ...cards,
    ];
  }

  if (reportType === 'evaluations') {
    const aiCount = context.evaluations.filter(
      (evaluation) => evaluation.source === 'ollama'
        && context.scopedSubmissionIds.has(evaluation.submissionId.toString()),
    ).length;
    return [
      {
        key: 'evaluations',
        label: 'Evaluations',
        value: evaluated.length,
        format: 'number',
        tone: 'primary',
      },
      {
        key: 'ai',
        label: 'AI-generated',
        value: aiCount,
        format: 'number',
        tone: 'accent',
      },
      {
        key: 'faculty',
        label: 'Faculty-reviewed',
        value: evaluated.length - aiCount,
        format: 'number',
        tone: 'accent',
      },
      {
        key: 'pending',
        label: 'Awaiting review',
        value: Math.max(0, submissions.length - evaluated.length),
        format: 'number',
        tone: 'warning',
      },
      {
        key: 'published',
        label: 'Published results',
        value: publishedEvaluations.length,
        format: 'number',
        tone: 'success',
      },
      {
        key: 'average',
        label: 'Average published score',
        value: average,
        format: 'percent',
        tone: 'success',
      },
    ];
  }

  return cards;
}

const COLUMNS = {
  assignments: [
    { key: 'assignment', label: 'Assignment', align: 'left', format: 'text' },
    { key: 'course', label: 'Course', align: 'left', format: 'text' },
    { key: 'eligibleStudents', label: 'Eligible', align: 'right', format: 'number' },
    { key: 'submitted', label: 'Submitted', align: 'right', format: 'number' },
    { key: 'notSubmitted', label: 'Not submitted', align: 'right', format: 'number' },
    { key: 'evaluated', label: 'Evaluated', align: 'right', format: 'number' },
    { key: 'awaitingEvaluation', label: 'Awaiting', align: 'right', format: 'number' },
    { key: 'averagePercentage', label: 'Avg score', align: 'right', format: 'percent' },
    { key: 'completionRate', label: 'Completion', align: 'right', format: 'percent' },
  ],
  students: [
    { key: 'student', label: 'Student', align: 'left', format: 'text' },
    { key: 'usn', label: 'USN', align: 'left', format: 'text' },
    { key: 'eligibleAssignments', label: 'Eligible', align: 'right', format: 'number' },
    { key: 'submitted', label: 'Submitted', align: 'right', format: 'number' },
    { key: 'notSubmitted', label: 'Not submitted', align: 'right', format: 'number' },
    { key: 'publishedEvaluations', label: 'Published', align: 'right', format: 'number' },
    { key: 'averagePercentage', label: 'Avg score', align: 'right', format: 'percent' },
    { key: 'lastSubmissionAt', label: 'Last submission', align: 'left', format: 'text' },
  ],
  submissions: [
    { key: 'student', label: 'Student', align: 'left', format: 'text' },
    { key: 'usn', label: 'USN', align: 'left', format: 'text' },
    { key: 'assignment', label: 'Assignment', align: 'left', format: 'text' },
    { key: 'language', label: 'Language', align: 'left', format: 'text' },
    { key: 'submittedAt', label: 'Submitted', align: 'left', format: 'text' },
    { key: 'evaluationStatus', label: 'Evaluation', align: 'left', format: 'text' },
    { key: 'score', label: 'Score', align: 'right', format: 'number' },
    { key: 'maxScore', label: 'Max', align: 'right', format: 'number' },
  ],
  evaluations: [
    { key: 'student', label: 'Student', align: 'left', format: 'text' },
    { key: 'usn', label: 'USN', align: 'left', format: 'text' },
    { key: 'assignment', label: 'Assignment', align: 'left', format: 'text' },
    { key: 'source', label: 'Source', align: 'left', format: 'text' },
    { key: 'status', label: 'Status', align: 'left', format: 'text' },
    { key: 'score', label: 'Score', align: 'right', format: 'number' },
    { key: 'maxScore', label: 'Max', align: 'right', format: 'number' },
    { key: 'updatedAt', label: 'Last updated', align: 'left', format: 'text' },
  ],
};

const DEFAULT_SORT = {
  assignments: { sort: 'assignment', sortDir: 'asc' },
  students: { sort: 'student', sortDir: 'asc' },
  submissions: { sort: 'submittedAt', sortDir: 'desc' },
  evaluations: { sort: 'updatedAt', sortDir: 'desc' },
};

function searchRows(rows, search, columns) {
  if (!search) return rows;
  const needle = search.toLowerCase();
  const textKeys = columns.filter((column) => column.format === 'text').map((column) => column.key);
  return rows.filter((row) => textKeys.some((key) => (
    String(row[key] ?? '').toLowerCase().includes(needle)
  )));
}

function sortRows(rows, sortKey, sortDir, columns) {
  const column = columns.find((item) => item.key === sortKey) || columns[0];
  if (!column) return rows;
  const direction = sortDir === 'desc' ? -1 : 1;
  return [...rows].sort((left, right) => {
    const a = left[column.key];
    const b = right[column.key];
    if (a === null || a === undefined) return 1;
    if (b === null || b === undefined) return -1;
    if (typeof a === 'number' && typeof b === 'number') return (a - b) * direction;
    return String(a).localeCompare(String(b)) * direction;
  });
}

export async function buildFacultyReport(database, facultyId, query) {
  const parsed = parseReportQuery(query);
  const context = await loadContext(database, facultyId, parsed.filters);

  let rows;
  if (parsed.reportType === 'assignments') {
    rows = buildAssignmentRows(context);
  } else if (parsed.reportType === 'students') {
    rows = buildStudentRows(context);
  } else if (parsed.reportType === 'submissions') {
    rows = buildSubmissionRows(context, parsed.filters.status);
  } else {
    rows = buildEvaluationRows(context, parsed.filters.status);
  }

  const columns = COLUMNS[parsed.reportType];
  const summary = buildSummary(context, parsed.reportType, rows);
  const charts = buildCharts(context, parsed.reportType);

  const filtered = searchRows(rows, parsed.search, columns);
  const defaultSort = DEFAULT_SORT[parsed.reportType];
  const sortKey = columns.some((column) => column.key === parsed.sort)
    ? parsed.sort
    : defaultSort.sort;
  const sortDir = parsed.sort
    ? parsed.sortDir
    : defaultSort.sortDir;
  const sorted = sortRows(filtered, sortKey, sortDir, columns);
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / parsed.pageSize));
  const page = Math.min(parsed.page, totalPages);
  const pageRows = sorted.slice((page - 1) * parsed.pageSize, page * parsed.pageSize);

  const limitations = [...BASE_LIMITATIONS];
  if (parsed.reportType === 'assignments') {
    limitations.push('Eligible students is the faculty roster, since the data model has no per-assignment student allocation.');
  }

  return {
    reportType: parsed.reportType,
    generatedAt: new Date().toISOString(),
    filters: {
      assignmentId: parsed.filters.assignmentId ? parsed.filters.assignmentId.toString() : null,
      student: parsed.filters.student || null,
      language: parsed.filters.language || null,
      status: parsed.filters.status || null,
      from: parsed.filters.from ? parsed.filters.from.toISOString().slice(0, 10) : null,
      to: parsed.filters.to ? parsed.filters.to.toISOString().slice(0, 10) : null,
    },
    availableFilters: AVAILABLE_FILTERS[parsed.reportType],
    filterOptions: {
      ...buildFilterOptions(context),
      statuses: statusOptionsFor(parsed.reportType),
    },
    summary,
    charts,
    columns,
    rows: pageRows,
    pagination: { page, pageSize: parsed.pageSize, total, totalPages },
    limitations,
  };
}
