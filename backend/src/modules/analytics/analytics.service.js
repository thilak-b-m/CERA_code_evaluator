import { ObjectId } from 'mongodb';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const PERIOD_WEEKS = 12;

export async function initializeAnalyticsCollections(database) {
  await database.collection('students').createIndex({ facultyId: 1 });
  await database.collection('evaluations').createIndex({
    facultyId: 1,
    submissionId: 1,
    status: 1,
  });
}

function scoreBand(score) {
  if (score >= 90) return 0;
  if (score >= 80) return 1;
  if (score >= 70) return 2;
  return 3;
}

export async function getFacultyAnalytics(database, facultyId, period = 'current') {
  const now = Date.now();
  const end = new Date(now - (period === 'previous' ? PERIOD_WEEKS * WEEK_MS : 0));
  const start = new Date(end.getTime() - PERIOD_WEEKS * WEEK_MS);
  const facultyObjectId = new ObjectId(facultyId);

  const [students, assignments, submissions] = await Promise.all([
    database.collection('students').find({ facultyId: facultyObjectId }).toArray(),
    database.collection('assignments')
      .find({ facultyId: facultyObjectId })
      .toArray(),
    database.collection('submissions')
      .find({
        facultyId: facultyObjectId,
        createdAt: { $gte: start, $lt: end },
      })
      .toArray(),
  ]);

  const visibleAssignments = assignments.filter((assignment) => !assignment.archivedAt);
  const studentIds = new Set(students.map((student) => student.userId.toString()));
  const engagedStudentIds = new Set();
  const weeklyCounts = Array(PERIOD_WEEKS).fill(0);
  const submissionIds = [];
  const submissionsByStudent = new Map();
  const submissionsByAssignment = new Map();

  for (const submission of submissions) {
    const submittedAt = submission.createdAt.getTime();
    const week = Math.floor((submittedAt - start.getTime()) / WEEK_MS);
    if (week >= 0 && week < PERIOD_WEEKS) weeklyCounts[week] += 1;

    const studentKey = submission.studentId.toString();
    if (studentIds.has(studentKey)) engagedStudentIds.add(studentKey);
    submissionsByStudent.set(studentKey, (submissionsByStudent.get(studentKey) || 0) + 1);

    const assignmentKey = submission.assignmentId.toString();
    submissionsByAssignment.set(
      assignmentKey,
      (submissionsByAssignment.get(assignmentKey) || 0) + 1,
    );

    submissionIds.push(submission._id);
  }

  const evaluations = submissionIds.length
    ? await database.collection('evaluations').find({
      facultyId: facultyObjectId,
      submissionId: { $in: submissionIds },
      status: 'published',
    }).toArray()
    : [];
  const assignmentsById = new Map(
    assignments.map((assignment) => [assignment._id.toString(), assignment]),
  );
  const submissionsById = new Map(
    submissions.map((submission) => [submission._id.toString(), submission]),
  );

  const normalizedScores = [];
  const evaluatedSubmissionIds = new Set();
  const scoresByStudent = new Map();
  const scoresByAssignment = new Map();

  for (const evaluation of evaluations) {
    const assignment = assignmentsById.get(evaluation.assignmentId.toString());
    if (!assignment || !Number.isFinite(assignment.points) || assignment.points <= 0) continue;

    const percentage = Math.max(0, Math.min(100, (evaluation.score / assignment.points) * 100));
    normalizedScores.push(percentage);
    evaluatedSubmissionIds.add(evaluation.submissionId.toString());

    const studentKey = (
      evaluation.studentId
      || submissionsById.get(evaluation.submissionId.toString())?.studentId
    )?.toString();
    if (studentKey) {
      const studentBucket = scoresByStudent.get(studentKey) || { total: 0, count: 0 };
      studentBucket.total += percentage;
      studentBucket.count += 1;
      scoresByStudent.set(studentKey, studentBucket);
    }

    const assignmentKey = evaluation.assignmentId.toString();
    const assignmentBucket = scoresByAssignment.get(assignmentKey) || { total: 0, count: 0 };
    assignmentBucket.total += percentage;
    assignmentBucket.count += 1;
    scoresByAssignment.set(assignmentKey, assignmentBucket);
  }

  const averageScore = normalizedScores.length
    ? normalizedScores.reduce((total, score) => total + score, 0) / normalizedScores.length
    : null;
  const bands = [0, 0, 0, 0];
  for (const score of normalizedScores) bands[scoreBand(score)] += 1;
  const maxWeeklyCount = Math.max(...weeklyCounts);
  const submissionVolume = weeklyCounts.map((count) => (
    maxWeeklyCount === 0 ? 0 : Math.round((count / maxWeeklyCount) * 100)
  ));
  const engagementRate = students.length
    ? Math.round((engagedStudentIds.size / students.length) * 100)
    : 0;

  const studentUsers = students.length
    ? await database.collection('users')
      .find({ _id: { $in: students.map((student) => student.userId) } })
      .toArray()
    : [];
  const userNameById = new Map(
    studentUsers.map((user) => [user._id.toString(), user.name]),
  );

  const averageFromBucket = (bucket) => (
    bucket && bucket.count
      ? Math.round((bucket.total / bucket.count) * 10) / 10
      : null
  );

  const studentPerformance = students.map((student) => {
    const key = student.userId.toString();
    const average = averageFromBucket(scoresByStudent.get(key));
    const submitted = submissionsByStudent.get(key) || 0;
    let standing = 'On track';
    if (!submitted) standing = 'No activity';
    else if (average === null) standing = 'Awaiting review';
    else if (average < 50) standing = 'At risk';
    else if (average < 70) standing = 'Watch';

    return {
      usn: student.usn || '',
      name: userNameById.get(key) || student.usn || 'Student',
      submissions: submitted,
      evaluated: scoresByStudent.get(key)?.count || 0,
      averagePercentage: average,
      standing,
    };
  }).sort((left, right) => {
    if (left.averagePercentage === null && right.averagePercentage === null) {
      return left.name.localeCompare(right.name);
    }
    if (left.averagePercentage === null) return 1;
    if (right.averagePercentage === null) return -1;
    return right.averagePercentage - left.averagePercentage
      || left.name.localeCompare(right.name);
  });

  const scoredStudents = studentPerformance.filter((student) => student.averagePercentage !== null);
  const passRate = scoredStudents.length
    ? Math.round(
      (scoredStudents.filter((student) => student.averagePercentage >= 50).length
        / scoredStudents.length) * 100,
    )
    : null;

  const assignmentPerformance = visibleAssignments.map((assignment) => {
    const key = assignment._id.toString();
    const submitted = submissionsByAssignment.get(key) || 0;
    return {
      assignmentId: key,
      title: assignment.title || 'Untitled assignment',
      course: assignment.course || '',
      points: Number.isFinite(assignment.points) ? assignment.points : null,
      submissions: submitted,
      evaluated: scoresByAssignment.get(key)?.count || 0,
      averagePercentage: averageFromBucket(scoresByAssignment.get(key)),
      completionRate: students.length
        ? Math.round((submitted / students.length) * 100)
        : 0,
    };
  }).sort((left, right) => (
    right.submissions - left.submissions || left.title.localeCompare(right.title)
  ));

  const evaluatedSubmissions = evaluatedSubmissionIds.size;

  return {
    period: { start: start.toISOString(), end: end.toISOString() },
    kpis: {
      enrolledStudents: {
        value: students.length,
        trend: 'Students in your roster',
      },
      averageScore: {
        value: averageScore === null ? '—' : `${averageScore.toFixed(1)}%`,
        trend: normalizedScores.length
          ? `${normalizedScores.length} published evaluations`
          : 'No published evaluations in this period',
      },
      engagementRate: {
        value: `${engagementRate}%`,
        trend: 'Students who submitted during this period',
      },
      atRiskStudents: {
        value: Math.max(0, students.length - engagedStudentIds.size),
        trend: 'No submissions during this period',
      },
    },
    submissionVolume,
    submissionCounts: weeklyCounts,
    marksDistribution: [
      ['90–100', bands[0], 'var(--success)'],
      ['80–89', bands[1], 'var(--accent)'],
      ['70–79', bands[2], 'var(--primary)'],
      ['Below 70', bands[3], 'var(--warning)'],
    ].map(([label, count, tone]) => [
      label,
      normalizedScores.length ? Math.round((count / normalizedScores.length) * 100) : 0,
      tone,
    ]),
    totals: {
      students: students.length,
      assignments: visibleAssignments.length,
      submissions: submissions.length,
      evaluated: evaluatedSubmissions,
      pending: Math.max(0, submissions.length - evaluatedSubmissions),
    },
    reviewCoverage: {
      evaluated: evaluatedSubmissions,
      pending: Math.max(0, submissions.length - evaluatedSubmissions),
      percentage: submissions.length
        ? Math.round((evaluatedSubmissions / submissions.length) * 100)
        : 0,
    },
    passRate,
    assignmentPerformance,
    studentPerformance,
    atRiskStudents: studentPerformance.filter((student) => (
      student.standing === 'At risk' || student.standing === 'No activity'
    )),
  };
}

export async function getStudentLeaderboard(database, currentUserId) {
  const currentUserObjectId = new ObjectId(currentUserId);
  const currentProfile = await database.collection('students').findOne({
    userId: currentUserObjectId,
  });
  if (!currentProfile) {
    const error = new Error('Student enrollment record not found.');
    error.statusCode = 404;
    throw error;
  }

  const [students, faculty] = await Promise.all([
    database.collection('students').find({ department: currentProfile.department }).toArray(),
    database.collection('users').find({
      role: 'faculty',
      department: currentProfile.department,
    }).toArray(),
  ]);
  const studentIds = students.map((student) => student.userId);
  const facultyIds = faculty.map((member) => member._id);
  const assignments = facultyIds.length
    ? await database.collection('assignments').find({
      facultyId: { $in: facultyIds },
      archivedAt: { $exists: false },
    }).toArray()
    : [];
  const assignmentById = new Map(assignments.map((assignment) => (
    [assignment._id.toString(), assignment]
  )));
  const evaluations = studentIds.length && assignmentById.size
    ? await database.collection('evaluations').find({
      studentId: { $in: studentIds },
      assignmentId: { $in: assignments.map((assignment) => assignment._id) },
      status: 'published',
    }).toArray()
    : [];

  const scoreByStudent = new Map(studentIds.map((id) => [
    id.toString(),
    { totalPercentage: 0, totalMarks: 0, count: 0 },
  ]));
  evaluations.forEach((evaluation) => {
    const assignment = assignmentById.get(evaluation.assignmentId.toString());
    const score = scoreByStudent.get(evaluation.studentId.toString());
    if (!assignment || !score || !Number.isFinite(evaluation.score) || assignment.points <= 0) return;
    score.totalPercentage += Math.max(0, Math.min(100, (evaluation.score / assignment.points) * 100));
    score.totalMarks += evaluation.score;
    score.count += 1;
  });

  const users = await database.collection('users').find({
    _id: { $in: studentIds },
  }).toArray();
  const userById = new Map(users.map((user) => [user._id.toString(), user]));
  const rankings = students.map((student) => {
    const id = student.userId.toString();
    const score = scoreByStudent.get(id);
    return {
      name: userById.get(id)?.name || 'Student',
      average: score.count ? Math.round((score.totalPercentage / score.count) * 10) / 10 : 0,
      totalMarks: Math.round(score.totalMarks * 100) / 100,
      evaluatedAssignments: score.count,
      isCurrentUser: id === currentUserId,
    };
  }).sort((left, right) => (
    right.average - left.average
    || right.totalMarks - left.totalMarks
    || right.evaluatedAssignments - left.evaluatedAssignments
    || left.name.localeCompare(right.name)
  ));

  return {
    rankings: rankings.slice(0, 100).map((entry, index) => ({
      ...entry,
      rank: index + 1,
    })),
    totalStudents: students.length,
    metric: 'Average percentage across published evaluations',
  };
}
