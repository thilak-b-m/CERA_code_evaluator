import { ObjectId } from 'mongodb';
import { createHash } from 'node:crypto';
import { AuthError, createUser, validateDepartment } from '../auth/auth.service.js';
import {
  createStudentDocument,
  parseStudentInput,
  parseStudentProfileInput,
  parseStudentFacultyUpdateInput,
  parsePaginationInput,
  parseAccountStatus,
  parseAcademicYear,
  parseStudentYearCorrectionInput,
  ALLOWED_YEARS,
  ALLOWED_STATUSES,
} from './students.schema.js';

export async function initializeStudentCollections(database) {
  await database.collection('students').createIndex({ userId: 1 }, { unique: true });
  await database.collection('students').createIndex({ usn: 1 }, { unique: true });
  await database.collection('students').createIndex({ department: 1, createdAt: -1 });
  await database.collection('students').createIndex({ department: 1, status: 1 });
  await database.collection('students').createIndex({ department: 1, year: 1 });
}

export async function inviteStudent(database, studentInput, faculty) {
  if (faculty?.role !== 'faculty' || !faculty.id) {
    throw new AuthError('Only faculty members can add students.', 403);
  }

  const { usn, year } = parseStudentInput(studentInput);
  const department = validateDepartment(faculty.department);
  const user = await createUser(database, {
    email: studentInput.email,
    name: studentInput.name,
    password: studentInput.password,
    role: 'student',
    department,
  });

  const userId = new ObjectId(user.id);
  try {
    const document = createStudentDocument({
      usn,
      year,
      department,
      facultyId: faculty.id,
      userId,
    });
    await database.collection('students').insertOne(document);
  } catch (error) {
    await database.collection('users').deleteOne({ _id: userId });

    if (error.code === 11000) {
      if (error.keyPattern?.usn || error.keyValue?.usn) {
        throw new AuthError('A student with this USN already exists.', 409);
      }
      throw new AuthError('An account with this email already exists.', 409);
    }
    throw error;
  }

  return { ...user, usn, year, department, status: 'active' };
}

export async function listDepartmentStudents(database, faculty, { page = 1, limit = 20, search, year, status } = {}) {
  if (faculty?.role !== 'faculty') {
    throw new AuthError('Only faculty members can view students.', 403);
  }

  const department = validateDepartment(faculty.department);
  const query = { department };
  const parsedPagination = parsePaginationInput({ page, limit });

  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const users = await database.collection('users')
      .find({ $or: [{ name: regex }, { email: regex }] }, { projection: { _id: 1 } })
      .toArray();
    query.$or = [
      { usn: { $regex: regex } },
      { userId: { $in: users.map((user) => user._id) } },
    ];
  }

  if (year !== undefined && year !== '' && year !== 'all') {
    const numericYear = parseAcademicYear(year);
    query.year = numericYear;
  }

  if (status !== undefined && status !== '' && status !== 'all') {
    const parsedStatus = parseAccountStatus(status);
    query.status = parsedStatus;
  }

  const [records, total] = await Promise.all([
    database.collection('students')
      .find(query)
      .sort({ createdAt: -1 })
      .skip(parsedPagination.skip)
      .limit(parsedPagination.limit)
      .toArray(),
    database.collection('students').countDocuments(query),
  ]);

  const students = await Promise.all(records.map(async (record) => {
    const user = await database.collection('users').findOne({ _id: record.userId });
    if (!user) {
      throw new Error(`Student record ${record._id} has no matching user account.`);
    }

    return {
      id: record.usn,
      _id: record._id.toString(),
      usn: record.usn,
      name: user.name,
      email: user.email,
      year: record.year,
      department: record.department,
      status: record.status || 'active',
      completedAt: record.completedAt || null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }));

  return {
    students,
    pagination: {
      page: parsedPagination.page,
      limit: parsedPagination.limit,
      total,
      totalPages: Math.ceil(total / parsedPagination.limit),
    },
  };
}

export async function getDepartmentStudentRecord(database, faculty, usn) {
  if (faculty?.role !== 'faculty') {
    throw new AuthError('Only faculty members can view student records.', 403);
  }
  const department = validateDepartment(faculty.department);
  const studentRecord = await database.collection('students').findOne({
    usn,
    department,
  });
  if (!studentRecord) throw new AuthError('Student record not found.', 404);

  const [user, assignments, submissions] = await Promise.all([
    database.collection('users').findOne({ _id: studentRecord.userId }),
    database.collection('assignments').find({
      facultyId: new ObjectId(faculty.id),
      archivedAt: { $exists: false },
    }).sort({ createdAt: -1 }).toArray(),
    database.collection('submissions').find({
      facultyId: new ObjectId(faculty.id),
      studentId: studentRecord.userId,
    }).sort({ createdAt: -1 }).toArray(),
  ]);
  if (!user) throw new Error(`Student record ${studentRecord._id} has no matching user account.`);

  const submissionsByAssignment = new Map();
  for (const submission of submissions) {
    const key = submission.assignmentId.toString();
    if (!submissionsByAssignment.has(key)) submissionsByAssignment.set(key, submission);
  }

  const records = await Promise.all(assignments.map(async (assignment) => {
    const submission = submissionsByAssignment.get(assignment._id.toString());
    const evaluation = submission
      ? await database.collection('evaluations').findOne({
        submissionId: submission._id,
        facultyId: new ObjectId(faculty.id),
      })
      : null;
    return {
      assignmentId: assignment._id.toString(),
      title: assignment.title,
      course: assignment.course || '',
      due: assignment.due || null,
      points: assignment.points,
      status: submission ? 'Submitted' : 'Not Started',
      submissionId: submission?._id.toString() || null,
      submittedAt: submission?.createdAt.toISOString() || null,
      evaluationStatus: evaluation?.status || null,
      score: evaluation?.score ?? null,
    };
  }));
  const publishedRecords = records.filter((record) => (
    record.evaluationStatus === 'published' && Number.isFinite(record.score)
  ));
  const totalPublishedMarks = publishedRecords.reduce((total, record) => total + record.score, 0);
  const totalPublishedPoints = publishedRecords.reduce((total, record) => total + record.points, 0);

  return {
    student: {
      name: user.name,
      email: user.email,
      usn: studentRecord.usn,
      year: studentRecord.year,
      department: studentRecord.department,
      createdAt: studentRecord.createdAt.toISOString(),
      totalAssignments: records.length,
      submittedAssignments: records.filter((record) => record.submissionId).length,
      publishedEvaluations: publishedRecords.length,
      averagePercentage: totalPublishedPoints
        ? Math.round((totalPublishedMarks / totalPublishedPoints) * 1000) / 10
        : null,
      assignments: records,
    },
  };
}

export async function updateStudentFacultyRecord(database, faculty, usn, input) {
  if (faculty?.role !== 'faculty') {
    throw new AuthError('Only faculty members can update student records.', 403);
  }

  const department = validateDepartment(faculty.department);
  const updates = parseStudentFacultyUpdateInput(input);

  const studentRecord = await database.collection('students').findOne({
    usn,
    department,
  });
  if (!studentRecord) throw new AuthError('Student record not found.', 404);

  const userId = studentRecord.userId;
  const userUpdates = {};
  const studentUpdates = {};

  if (updates.usn !== undefined && updates.usn !== studentRecord.usn) {
    const duplicate = await database.collection('students').findOne({ usn: updates.usn });
    if (duplicate && !duplicate._id.equals(studentRecord._id)) throw new AuthError('A student with this USN already exists.', 409);
    studentUpdates.usn = updates.usn;
  }

  if (updates.name !== undefined) userUpdates.name = updates.name;
  if (updates.email !== undefined) userUpdates.email = updates.email;

  if (Object.keys(userUpdates).length > 0) {
    try {
      const result = await database.collection('users').updateOne(
        { _id: userId },
        { $set: { ...userUpdates, updatedAt: new Date() } },
      );
      if (!result.matchedCount) {
        throw new AuthError('Student account not found.', 404);
      }
    } catch (error) {
      if (error.code === 11000) {
        throw new AuthError('An account with this email already exists.', 409);
      }
      throw error;
    }
  }

  if (Object.keys(studentUpdates).length > 0) {
    try {
      await database.collection('students').updateOne(
        { _id: studentRecord._id },
        { $set: { ...studentUpdates, updatedAt: new Date() } },
      );
    } catch (error) {
      if (error.code === 11000) throw new AuthError('A student with this USN already exists.', 409);
      throw error;
    }
  }

  const user = await database.collection('users').findOne({ _id: userId });
  const updatedRecord = await database.collection('students').findOne({ _id: studentRecord._id });

  return {
    id: updatedRecord.usn,
    _id: updatedRecord._id.toString(),
    usn: updatedRecord.usn,
    name: user.name,
    email: user.email,
    year: updatedRecord.year,
    department: updatedRecord.department,
    status: updatedRecord.status || 'active',
    completedAt: updatedRecord.completedAt || null,
    academicHistory: updatedRecord.academicHistory || [],
    createdAt: updatedRecord.createdAt,
    updatedAt: updatedRecord.updatedAt,
  };
}

export async function correctStudentAcademicYear(database, faculty, usn, input) {
  if (faculty?.role !== 'faculty') throw new AuthError('Only faculty members can correct student academic years.', 403);
  const department = validateDepartment(faculty.department);
  const correction = parseStudentYearCorrectionInput(input);
  const studentRecord = await database.collection('students').findOne({ usn, department });
  if (!studentRecord) throw new AuthError('Student record not found.', 404);
  if (studentRecord.year === correction.year) throw new AuthError('Student is already in the selected academic year.', 400);
  const now = new Date();
  const entry = {
    previousYear: studentRecord.year,
    newYear: correction.year,
    changedBy: faculty.id,
    changedAt: now,
    reason: 'authorized_correction',
    explanation: correction.reason,
  };
  const result = await database.collection('students').updateOne(
    { _id: studentRecord._id, department, year: studentRecord.year },
    {
      $set: { year: correction.year, updatedAt: now },
      $unset: { completedAt: '', completedSession: '' },
      $push: { academicHistory: entry, auditHistory: { action: 'academic_year_correction', ...entry } },
    },
  );
  if (!result.modifiedCount) throw new AuthError('Student record changed; reload before correcting the year.', 409);
  return { usn: studentRecord.usn, previousYear: studentRecord.year, year: correction.year, academicHistory: [...(studentRecord.academicHistory || []), entry] };
}

export async function setStudentAccountStatus(database, faculty, usn, status) {
  if (faculty?.role !== 'faculty') {
    throw new AuthError('Only faculty members can modify student accounts.', 403);
  }

  const parsedStatus = parseAccountStatus(status);
  const department = validateDepartment(faculty.department);

  const studentRecord = await database.collection('students').findOne({
    usn,
    department,
  });
  if (!studentRecord) throw new AuthError('Student record not found.', 404);

  if (studentRecord.status === parsedStatus) {
    return {
      id: studentRecord.usn,
      usn: studentRecord.usn,
      status: studentRecord.status,
      message: `Account is already ${parsedStatus}.`,
    };
  }

  const userResult = await database.collection('users').updateOne(
    { _id: studentRecord.userId },
    { $set: { status: parsedStatus, updatedAt: new Date() }, $inc: { tokenVersion: 1 } },
  );
  if (!userResult.matchedCount) throw new AuthError('Student account not found.', 404);
  await database.collection('students').updateOne(
    { _id: studentRecord._id },
    { $set: { status: parsedStatus, updatedAt: new Date() }, $push: { statusHistory: { status: parsedStatus, changedBy: faculty.id, changedAt: new Date(), reason: 'faculty_account_action' } } },
  );

  const user = await database.collection('users').findOne({ _id: studentRecord.userId });
  return {
    id: studentRecord.usn,
    usn: studentRecord.usn,
    name: user.name,
    email: user.email,
    status: parsedStatus,
    message: `Student account ${parsedStatus === 'inactive' ? 'deactivated' : 'reactivated'} successfully.`,
  };
}

export async function bulkSetStudentAccountStatus(database, faculty, usns, status) {
  if (faculty?.role !== 'faculty') {
    throw new AuthError('Only faculty members can modify student accounts.', 403);
  }

  const parsedStatus = parseAccountStatus(status);
  const department = validateDepartment(faculty.department);
  if (!Array.isArray(usns) || usns.length === 0 || usns.length > 1000
      || usns.some((usn) => typeof usn !== 'string' || !usn.trim() || usn.trim().length > 40)) {
    throw new AuthError('Select between 1 and 1000 valid student identifiers.', 400);
  }

  const results = { successful: [], skipped: [], failed: [] };

  for (const usn of [...new Set(usns.map((value) => value.trim().toUpperCase()))]) {
    try {
      const studentRecord = await database.collection('students').findOne({
        usn,
        department,
      });
      if (!studentRecord) {
        results.failed.push({ usn, reason: 'Student record not found.' });
        continue;
      }

      if (studentRecord.status === parsedStatus) {
        results.skipped.push({ usn, reason: `Already ${parsedStatus}.` });
        continue;
      }

      const userResult = await database.collection('users').updateOne(
        { _id: studentRecord.userId },
        { $set: { status: parsedStatus, updatedAt: new Date() }, $inc: { tokenVersion: 1 } },
      );
      if (!userResult.matchedCount) {
        results.failed.push({ usn, reason: 'Student account not found.' });
        continue;
      }
      await database.collection('students').updateOne(
        { _id: studentRecord._id },
        { $set: { status: parsedStatus, updatedAt: new Date() }, $push: { statusHistory: { status: parsedStatus, changedBy: faculty.id, changedAt: new Date(), reason: 'bulk_account_action' } } },
      );

      results.successful.push({ usn, status: parsedStatus });
    } catch (error) {
      results.failed.push({ usn, reason: error.message });
    }
  }

  return results;
}

export async function deleteStudentAccount(database, faculty, usn) {
  if (faculty?.role !== 'faculty') {
    throw new AuthError('Only faculty members can delete student accounts.', 403);
  }

  const department = validateDepartment(faculty.department);

  const studentRecord = await database.collection('students').findOne({
    usn,
    department,
  });
  if (!studentRecord) throw new AuthError('Student record not found.', 404);

  const userResult = await database.collection('users').updateOne(
    { _id: studentRecord.userId },
    { $set: { status: 'inactive', updatedAt: new Date() }, $inc: { tokenVersion: 1 } },
  );
  if (!userResult.matchedCount) throw new AuthError('Student account not found.', 404);
  await database.collection('students').updateOne(
    { _id: studentRecord._id },
    {
      $set: { status: 'inactive', deletedAt: new Date(), deletedBy: faculty.id, updatedAt: new Date() },
      $push: { statusHistory: { status: 'inactive', changedBy: faculty.id, changedAt: new Date(), reason: 'soft_delete' } },
    },
  );

  return {
    id: studentRecord.usn,
    usn: studentRecord.usn,
    status: 'inactive',
    message: 'Student account deactivated (soft delete). Academic records preserved.',
  };
}

export async function getStudentProfile(database, student) {
  if (student?.role !== 'student' || !ObjectId.isValid(student.id)) {
    throw new AuthError('Student profile not found.', 404);
  }

  const record = await database.collection('students').findOne({
    userId: new ObjectId(student.id),
  });
  if (!record) {
    throw new AuthError('Student profile not found.', 404);
  }

  return {
    id: student.id,
    name: student.name,
    email: student.email,
    department: record.department,
    usn: record.usn,
    year: record.year,
    bio: record.bio || '',
    skills: record.skills || [],
    github: record.github || '',
    linkedin: record.linkedin || '',
    createdAt: record.createdAt,
  };
}

export async function updateStudentProfile(database, student, input) {
  if (student?.role !== 'student' || !ObjectId.isValid(student.id)) {
    throw new AuthError('Student profile not found.', 404);
  }

  const updates = parseStudentProfileInput(input);
  const userId = new ObjectId(student.id);
  const record = await database.collection('students').findOne({ userId });
  if (!record) {
    throw new AuthError('Student profile not found.', 404);
  }

  const userUpdates = {};
  if (updates.name !== undefined) userUpdates.name = updates.name;
  if (updates.email !== undefined) userUpdates.email = updates.email;

  if (Object.keys(userUpdates).length > 0) {
    try {
      const result = await database.collection('users').updateOne(
        { _id: userId },
        { $set: { ...userUpdates, updatedAt: new Date() } },
      );
      if (!result.matchedCount) {
        throw new AuthError('Student account not found.', 404);
      }
    } catch (error) {
      if (error.code === 11000) {
        throw new AuthError('An account with this email already exists.', 409);
      }
      throw error;
    }
  }

  const { name, email, ...studentUpdates } = updates;
  if (Object.keys(studentUpdates).length > 0) {
    await database.collection('students').updateOne(
      { _id: record._id },
      { $set: { ...studentUpdates, updatedAt: new Date() } },
    );
  }

  return getStudentProfile(database, {
    ...student,
    ...(name ? { name } : {}),
    ...(email ? { email } : {}),
  });
}

const YEAR_DESTINATIONS = new Map([
  [1, 2],
  [2, 3],
  [3, 4],
]);

export function getPromotionDestination(sourceYear) {
  return YEAR_DESTINATIONS.get(sourceYear);
}

export function isValidPromotionTransition(sourceYear, destinationYear) {
  const expected = YEAR_DESTINATIONS.get(sourceYear);
  return expected !== undefined && destinationYear === expected;
}

export async function initializePromotionCollections(database) {
  await database.collection('academic_sessions').createIndex(
    { sessionName: 1 },
    { unique: true },
  );
  await database.collection('academic_sessions').createIndex({ isCurrent: 1 });
  await database.collection('promotion_history').createIndex({
    facultyId: 1,
    createdAt: -1,
  });
  await database.collection('promotion_history').createIndex({
    department: 1,
    createdAt: -1,
  });
  await database.collection('promotion_history').createIndex(
    { idempotencyKey: 1 },
    { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } },
  );
  await database.collection('academic_session_history').createIndex({ changedAt: -1 });
}

export async function listAcademicSessions(database) {
  const sessions = await database.collection('academic_sessions')
    .find({})
    .sort({ createdAt: -1 })
    .toArray();
  return sessions.map((session) => ({
    id: session._id.toString(),
    sessionName: session.sessionName,
    isCurrent: Boolean(session.isCurrent),
    createdAt: session.createdAt,
  }));
}

export async function getCurrentAcademicSession(database) {
  const session = await database.collection('academic_sessions').findOne({
    isCurrent: true,
  });
  if (!session) {
    const sessions = await listAcademicSessions(database);
    if (sessions.length > 0) return sessions[0];
    return null;
  }
  return {
    id: session._id.toString(),
    sessionName: session.sessionName,
    isCurrent: Boolean(session.isCurrent),
    createdAt: session.createdAt,
  };
}

export async function createAcademicSession(database, sessionName, isCurrent = false, faculty = null) {
  if (typeof sessionName !== 'string' || !sessionName.trim()) {
    throw new AuthError('Session name is required.', 400);
  }

  const trimmed = sessionName.trim();
  const existing = await database.collection('academic_sessions').findOne({ sessionName: trimmed });
  if (existing) {
    if (isCurrent) {
      await database.collection('academic_sessions').updateMany({ isCurrent: true }, { $set: { isCurrent: false, updatedAt: new Date() } });
      await database.collection('academic_sessions').updateOne({ _id: existing._id }, { $set: { isCurrent: true, updatedAt: new Date() } });
    }
    if (isCurrent && existing.isCurrent !== true) {
      await database.collection('academic_session_history').insertOne({
        sessionName: trimmed, changedBy: faculty?.id || null, changedAt: new Date(), action: 'set_current',
      });
    }
    return { id: existing._id.toString(), sessionName: trimmed, isCurrent: isCurrent || Boolean(existing.isCurrent), createdAt: existing.createdAt };
  }
  if (isCurrent) {
    await database.collection('academic_sessions').updateMany(
      { isCurrent: true },
      { $set: { isCurrent: false, updatedAt: new Date() } },
    );
  }

  const now = new Date();
  const record = {
    sessionName: trimmed,
    isCurrent,
    createdAt: now,
    updatedAt: now,
  };
  const result = await database.collection('academic_sessions').insertOne(record);
  if (isCurrent) {
    await database.collection('academic_session_history').insertOne({
      sessionName: trimmed, changedBy: faculty?.id || null, changedAt: now, action: 'created_current',
    });
  }
  return {
    id: result.insertedId.toString(),
    sessionName: trimmed,
    isCurrent,
    createdAt: now,
  };
}

export async function getPromotionPreview(database, faculty, sourceYear, destinationYear, sessionTransition = '') {
  if (faculty?.role !== 'faculty') {
    throw new AuthError('Only faculty members can preview promotions.', 403);
  }

  const department = validateDepartment(faculty.department);
  const numericSource = parseAcademicYear(sourceYear);
  const numericDest = parseAcademicYear(destinationYear);

  if (!isValidPromotionTransition(numericSource, numericDest)) {
    throw new AuthError(
      `Invalid promotion transition: ${numericSource} year to ${numericDest} year.`,
      400,
    );
  }

  const currentSession = await getCurrentAcademicSession(database);
  const transition = sessionTransition ? validateSessionTransition(sessionTransition, currentSession?.sessionName) : null;

  const eligibleStudents = await database.collection('students')
    .find({
      department,
      year: numericSource,
      status: 'active',
    })
    .sort({ usn: 1 })
    .toArray();

  const excludedStudents = await database.collection('students')
    .find({
      department,
      year: numericSource,
      status: { $ne: 'active' },
    })
    .sort({ usn: 1 })
    .toArray();

  const studentIds = eligibleStudents.map((s) => s.userId);
  const users = await database.collection('users')
    .find({ _id: { $in: studentIds } })
    .toArray();
  const usersById = new Map(users.map((u) => [u._id.toString(), u]));

  const alreadyProcessed = transition
    ? eligibleStudents.filter((record) => (record.academicHistory || []).some((entry) => entry.sessionTransition === transition))
    : [];
  const previewStudents = eligibleStudents.filter((record) => !alreadyProcessed.includes(record)).map((record) => {
    const user = usersById.get(record.userId.toString());
    return {
      usn: record.usn,
      name: user?.name || 'Unknown',
      email: user?.email || '',
      sourceYear: record.year,
      destinationYear: numericDest,
    };
  });

  const excludedDetails = [
    ...excludedStudents.map((record) => ({
    usn: record.usn,
    reason: `Account is ${record.status || 'inactive'}`,
    })),
    ...alreadyProcessed.map((record) => ({ usn: record.usn, reason: 'Already processed during this session transition.' })),
  ];

  return {
    currentSession: currentSession?.sessionName || 'Not configured',
    sourceYear: numericSource,
    destinationYear: numericDest,
    department,
    eligibleCount: previewStudents.length,
    excludedCount: excludedDetails.length,
    students: previewStudents,
    excluded: excludedDetails,
    graduationCount: numericSource === 4 ? previewStudents.length : 0,
  };
}

export async function getAllYearsPromotionPreview(database, faculty, sessionTransition = '') {
  if (faculty?.role !== 'faculty') {
    throw new AuthError('Only faculty members can preview promotions.', 403);
  }

  const department = validateDepartment(faculty.department);
  const currentSession = await getCurrentAcademicSession(database);
  const transition = sessionTransition ? validateSessionTransition(sessionTransition, currentSession?.sessionName) : null;

  const transitions = [
    { source: 1, destination: 2 },
    { source: 2, destination: 3 },
    { source: 3, destination: 4 },
    { source: 4, destination: null },
  ];

  const transitionPreviews = [];
  let totalPromoted = 0;
  let totalGraduated = 0;
  let totalExcluded = 0;

  for (const { source, destination } of transitions) {
    const eligible = await database.collection('students')
      .find({
        department,
        year: source,
        status: 'active',
        ...(source === 4 ? { completedAt: { $exists: false } } : {}),
      })
      .sort({ usn: 1 })
      .toArray();

    const excluded = await database.collection('students')
      .find({
        department,
        year: source,
        $or: [{ status: { $ne: 'active' } }, { completedAt: { $exists: true } }],
      })
      .toArray();

    const studentIds = eligible.map((s) => s.userId);
    const users = studentIds.length
      ? await database.collection('users')
        .find({ _id: { $in: studentIds } })
        .toArray()
      : [];
    const usersById = new Map(users.map((u) => [u._id.toString(), u]));

    const alreadyProcessed = transition
      ? eligible.filter((record) => (record.academicHistory || []).some((entry) => entry.sessionTransition === transition))
      : [];
    const visibleEligible = eligible.filter((record) => !alreadyProcessed.includes(record));
    const students = visibleEligible.map((record) => {
      const user = usersById.get(record.userId.toString());
      return {
        usn: record.usn,
        name: user?.name || 'Unknown',
        sourceYear: record.year,
        destinationYear: destination,
      };
    });

    const graduated = source === 4 ? visibleEligible.length : 0;
    totalPromoted += source === 4 ? 0 : visibleEligible.length;
    totalGraduated += graduated;
    totalExcluded += excluded.length + alreadyProcessed.length;

    transitionPreviews.push({
      sourceYear: source,
      destinationYear: destination,
      studentCount: visibleEligible.length,
      graduatedCount: graduated,
      excludedCount: excluded.length + alreadyProcessed.length,
      excluded: [
        ...excluded.map((record) => ({ usn: record.usn, reason: record.completedAt ? 'Already completed.' : `Account is ${record.status || 'inactive'}` })),
        ...alreadyProcessed.map((record) => ({ usn: record.usn, reason: 'Already processed during this session transition.' })),
      ],
      students,
    });
  }

  return {
    currentSession: currentSession?.sessionName || 'Not configured',
    department,
    transitions: transitionPreviews,
    totalPromoted,
    totalGraduated,
    totalExcluded,
  };
}

function createPromotionSession(database) {
  // A standalone MongoDB server reports the Single topology and cannot run
  // multi-document transactions. Promotion writes remain individually atomic
  // there, while replica set and sharded deployments keep transaction support.
  if (database.client.topology?.description?.type === 'Single') return null;
  const session = database.client.startSession();
  session.startTransaction();
  return session;
}

function promotionSessionOptions(session) {
  return session ? { session } : {};
}

function validateSessionTransition(value, currentSession) {
  if (typeof value !== 'string' || value.length > 120) {
    throw new AuthError('Provide the academic session transition being applied.', 400);
  }
  const [from, to] = value.split('->').map((part) => part.trim());
  if (!from || !to || from !== currentSession || from === to) {
    throw new AuthError(`Session transition must start with ${currentSession} and include a different new session.`, 400);
  }
  return `${from} -> ${to}`;
}

async function activateAcademicSession(database, sessionName, now, dbSession) {
  const sessions = database.collection('academic_sessions');
  const options = promotionSessionOptions(dbSession);
  await sessions.updateMany({ isCurrent: true }, { $set: { isCurrent: false, updatedAt: now } }, options);
  await sessions.updateOne(
    { sessionName },
    { $set: { isCurrent: true, updatedAt: now }, $setOnInsert: { sessionName, createdAt: now } },
    { upsert: true, ...options },
  );
}

export async function executePromotion(database, faculty, sourceYear, destinationYear, sessionTransition) {
  if (faculty?.role !== 'faculty') {
    throw new AuthError('Only faculty members can execute promotions.', 403);
  }

  const department = validateDepartment(faculty.department);
  const numericSource = parseAcademicYear(sourceYear);
  const numericDest = parseAcademicYear(destinationYear);

  if (!isValidPromotionTransition(numericSource, numericDest)) {
    throw new AuthError(
      `Invalid promotion transition: ${numericSource} year to ${numericDest} year.`,
      400,
    );
  }

  const currentSession = await getCurrentAcademicSession(database);
  if (!currentSession) {
    throw new AuthError('No current academic session configured. Please set one in Faculty Settings.', 400);
  }
  const transition = validateSessionTransition(sessionTransition, currentSession.sessionName);
  const idempotencyKey = `${department}:${transition}:${numericSource}`;
  const previousOperation = await database.collection('promotion_history').findOne({ idempotencyKey });
  if (previousOperation) {
    // Recover operations that were written before the API response failed. Older
    // single-year promotions did not advance the current session.
    const [fromSession, toSession] = transition.split(' -> ');
    if (previousOperation.promotedCount > 0 && currentSession.sessionName === fromSession) {
      await activateAcademicSession(database, toSession, new Date(), null);
    }
    return {
      operationId: previousOperation.operationId,
      sessionTransition: transition,
      sourceYear: numericSource,
      destinationYear: numericDest,
      department,
      promoted: previousOperation.students || [],
      skipped: [],
      failed: [],
      summary: {
        promoted: previousOperation.promotedCount || 0,
        skipped: previousOperation.skippedCount || 0,
        failed: previousOperation.failedCount || 0,
        graduated: 0,
      },
    };
  }

  const studentRecords = await database.collection('students')
    .find({
      department,
      year: numericSource,
      status: 'active',
    })
    .toArray();

  const now = new Date();
  const promotionId = new ObjectId();

  const promoted = [];
  const skipped = [];
  const failed = [];

  let dbSession = null;
  try {
    dbSession = createPromotionSession(database);

    for (const record of studentRecords) {
      try {
        if ((record.academicHistory || []).some((entry) => entry.sessionTransition === transition)) {
          skipped.push({ usn: record.usn, reason: 'Student was already promoted during this session transition.' });
          continue;
        }
        const user = await database.collection('users').findOne({
          _id: record.userId,
        });
        if (!user) {
          skipped.push({ usn: record.usn, reason: 'User account not found.' });
          continue;
        }

        const academicHistoryEntry = {
          previousYear: record.year,
          newYear: numericDest,
          changedBy: faculty.id,
          changedAt: now,
          reason: 'promotion',
          sessionTransition: transition,
        };

        const updateResult = await database.collection('students').updateOne(
          { _id: record._id, department, year: numericSource, status: 'active' },
          {
            $set: {
              year: numericDest,
              updatedAt: now,
            },
            $push: {
              academicHistory: academicHistoryEntry,
            },
          },
          promotionSessionOptions(dbSession),
        );
        if (!updateResult.modifiedCount) {
          skipped.push({ usn: record.usn, reason: 'Student record changed after promotion preview.' });
          continue;
        }

        promoted.push({
          usn: record.usn,
          name: user.name,
          sourceYear: record.year,
          destinationYear: numericDest,
        });
      } catch (error) {
        failed.push({ usn: record.usn, reason: error.message });
      }
    }

    const historyRecord = {
      _id: promotionId,
      operationId: `PROMO-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${promotionId.toString().slice(-6)}`,
      facultyId: new ObjectId(faculty.id),
      facultyName: faculty.name,
      department,
      sessionTransition: transition,
      idempotencyKey,
      sourceYear: numericSource,
      destinationYear: numericDest,
      promotedCount: promoted.length,
      skippedCount: skipped.length,
      failedCount: failed.length,
      status: failed.length > 0 ? 'completed_with_errors' : 'completed',
      createdAt: now,
      students: promoted.map((p) => ({ usn: p.usn, name: p.name })),
    };

    await database.collection('promotion_history').insertOne(historyRecord, promotionSessionOptions(dbSession));
    if (promoted.length > 0) {
      await activateAcademicSession(database, transition.split(' -> ')[1], now, dbSession);
    }

    if (dbSession) await dbSession.commitTransaction();
  } catch (error) {
    if (dbSession) {
      await dbSession.abortTransaction().catch(() => {});
    }
    if (error?.code === 11000) {
      throw new AuthError('This promotion was already recorded for the selected session transition.', 409);
    }
    throw error;
  } finally {
    if (dbSession) {
      dbSession.endSession();
    }
  }

  return {
    operationId: `PROMO-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${promotionId.toString().slice(-6)}`,
    sessionTransition: transition,
    sourceYear: numericSource,
    destinationYear: numericDest,
    department,
    promoted,
    skipped,
    failed,
    summary: {
      promoted: promoted.length,
      skipped: skipped.length,
      failed: failed.length,
      graduated: numericSource === 4 ? promoted.length : 0,
    },
  };
}

export async function executeAllYearsPromotion(database, faculty, sessionTransition) {
  if (faculty?.role !== 'faculty') {
    throw new AuthError('Only faculty members can execute promotions.', 403);
  }

  const department = validateDepartment(faculty.department);
  const currentSession = await getCurrentAcademicSession(database);
  if (!currentSession) {
    throw new AuthError('No current academic session configured.', 400);
  }
  const transition = validateSessionTransition(sessionTransition, currentSession.sessionName);
  const idempotencyKey = `${department}:${transition}:all`;
  if (await database.collection('promotion_history').findOne({ idempotencyKey })) {
    throw new AuthError('All years have already been promoted for that academic session transition.', 409);
  }

  const now = new Date();
  const promotionId = new ObjectId();

  const allPromoted = [];
  const allSkipped = [];
  const allFailed = [];
  let totalGraduated = 0;

  const transitions = [
    { source: 1, destination: 2 },
    { source: 2, destination: 3 },
    { source: 3, destination: 4 },
        { source: 4, destination: null },
  ];

  let dbSession = null;
  try {
    dbSession = createPromotionSession(database);

    const originalRecords = await database.collection('students')
      .find({ department, year: { $in: [1, 2, 3, 4] }, status: 'active', completedAt: { $exists: false } })
      .toArray();
    for (const { source, destination } of transitions) {
      const studentRecords = originalRecords.filter((record) => record.year === source);

      for (const record of studentRecords) {
        try {
          if ((record.academicHistory || []).some((entry) => entry.sessionTransition === transition)) {
            allSkipped.push({ usn: record.usn, reason: 'Student was already processed during this session transition.' });
            continue;
          }
          const user = await database.collection('users').findOne({
            _id: record.userId,
          });
          if (!user) {
            allSkipped.push({ usn: record.usn, reason: 'User account not found.' });
            continue;
          }

          const isGraduation = source === 4;
          const academicHistoryEntry = {
            previousYear: record.year,
            newYear: isGraduation ? null : destination,
            changedBy: faculty.id,
            changedAt: now,
            reason: isGraduation ? 'graduation' : 'promotion',
            sessionTransition: transition,
          };

          const updateOps = {
            $set: { updatedAt: now },
            $push: { academicHistory: academicHistoryEntry },
          };

          if (!isGraduation) {
            updateOps.$set.year = destination;
          } else {
            updateOps.$set.completedAt = now;
            updateOps.$set.completedSession = transition.split(' -> ')[1];
          }

          const updateResult = await database.collection('students').updateOne(
            { _id: record._id, department, year: source, status: 'active', ...(isGraduation ? { completedAt: { $exists: false } } : {}) },
            updateOps,
            promotionSessionOptions(dbSession),
          );
          if (!updateResult.modifiedCount) {
            allSkipped.push({ usn: record.usn, reason: 'Student record changed after promotion preview.' });
            continue;
          }

          if (isGraduation) {
            totalGraduated++;
            allPromoted.push({
              usn: record.usn,
              name: user.name,
              sourceYear: record.year,
              destinationYear: 'Graduated',
              graduated: true,
            });
          } else {
            allPromoted.push({
              usn: record.usn,
              name: user.name,
              sourceYear: record.year,
              destinationYear: destination,
              graduated: false,
            });
          }
        } catch (error) {
          allFailed.push({ usn: record.usn, reason: error.message });
        }
      }
    }

    const historyRecord = {
      _id: promotionId,
      operationId: `ALLPROMO-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${promotionId.toString().slice(-6)}`,
      facultyId: new ObjectId(faculty.id),
      facultyName: faculty.name,
      department,
      sessionTransition: transition,
      idempotencyKey,
      sourceYear: 'all',
      destinationYear: 'all',
      promotedCount: allPromoted.length,
      graduatedCount: totalGraduated,
      skippedCount: allSkipped.length,
      failedCount: allFailed.length,
      status: allFailed.length > 0 ? 'completed_with_errors' : 'completed',
      createdAt: now,
      students: allPromoted.map((p) => ({ usn: p.usn, name: p.name, graduated: p.graduated })),
    };

    await database.collection('promotion_history').insertOne(historyRecord, promotionSessionOptions(dbSession));
    await activateAcademicSession(database, transition.split(' -> ')[1], now, dbSession);

    if (dbSession) await dbSession.commitTransaction();
  } catch (error) {
    if (dbSession) {
      await dbSession.abortTransaction().catch(() => {});
    }
    if (error?.code === 11000) {
      throw new AuthError('All years were already promoted for the selected session transition.', 409);
    }
    throw error;
  } finally {
    if (dbSession) {
      dbSession.endSession();
    }
  }

  return {
    operationId: `ALLPROMO-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${promotionId.toString().slice(-6)}`,
    sessionTransition: transition,
    department,
    promoted: allPromoted,
    skipped: allSkipped,
    failed: allFailed,
    summary: {
      promoted: allPromoted.filter((p) => !p.graduated).length,
      graduated: totalGraduated,
      skipped: allSkipped.length,
      failed: allFailed.length,
    },
  };
}

export async function previewSelectedPromotion(database, faculty, usns = [], sessionTransition = '') {
  if (faculty?.role !== 'faculty') throw new AuthError('Only faculty members can preview promotions.', 403);
  if (!Array.isArray(usns) || usns.length === 0 || usns.length > 100) throw new AuthError('Select between 1 and 100 students.', 400);
  const department = validateDepartment(faculty.department);
  const currentSession = await getCurrentAcademicSession(database);
  const transition = sessionTransition ? validateSessionTransition(sessionTransition, currentSession?.sessionName) : null;
  const uniqueUsns = [...new Set(usns.map((value) => String(value).trim().toUpperCase()).filter(Boolean))];
  const records = await database.collection('students').find({ department, usn: { $in: uniqueUsns } }).toArray();
  const recordsByUsn = new Map(records.map((record) => [record.usn, record]));
  const userIds = records.map((record) => record.userId);
  const users = userIds.length ? await database.collection('users').find({ _id: { $in: userIds } }).toArray() : [];
  const usersById = new Map(users.map((user) => [user._id.toString(), user]));
  const students = [];
  const excluded = [];
  for (const usn of uniqueUsns) {
    const record = recordsByUsn.get(usn);
    if (!record) { excluded.push({ usn, reason: 'Student not found in your department.' }); continue; }
    if (record.status !== 'active') { excluded.push({ usn, reason: 'Account is inactive.' }); continue; }
    if (record.year < 1 || record.year > 3) { excluded.push({ usn, reason: 'Fourth-year students must be processed with the graduation policy.' }); continue; }
    if (transition && (record.academicHistory || []).some((entry) => entry.sessionTransition === transition)) { excluded.push({ usn, reason: 'Already processed during this session transition.' }); continue; }
    students.push({ usn, name: usersById.get(record.userId.toString())?.name || 'Unknown', sourceYear: record.year, destinationYear: record.year + 1 });
  }
  return { department, students, excluded, eligibleCount: students.length, excludedCount: excluded.length };
}

export async function executeSelectedPromotion(database, faculty, usns = [], sessionTransition) {
  if (faculty?.role !== 'faculty') throw new AuthError('Only faculty members can execute promotions.', 403);
  const department = validateDepartment(faculty.department);
  const currentSession = await getCurrentAcademicSession(database);
  if (!currentSession) throw new AuthError('No current academic session configured.', 400);
  const transition = validateSessionTransition(sessionTransition, currentSession.sessionName);
  const preview = await previewSelectedPromotion(database, faculty, usns, transition);
  if (!preview.eligibleCount) throw new AuthError('There are no eligible selected students to promote.', 400);
  const key = createHash('sha256').update(`${department}:${transition}:selected:${preview.students.map((student) => student.usn).sort().join(',')}`).digest('hex');
  if (await database.collection('promotion_history').findOne({ idempotencyKey: key })) throw new AuthError('This selected-student promotion was already completed.', 409);
  const now = new Date();
  const operationObjectId = new ObjectId();
  const promoted = [];
  const skipped = [...preview.excluded];
  let dbSession;
  try {
    dbSession = createPromotionSession(database);
    for (const student of preview.students) {
      const current = await database.collection('students').findOne({ usn: student.usn, department });
      if ((current?.academicHistory || []).some((entry) => entry.sessionTransition === transition)) {
        skipped.push({ usn: student.usn, reason: 'Student was already promoted during this session transition.' });
        continue;
      }
      const updated = await database.collection('students').updateOne(
        { usn: student.usn, department, year: student.sourceYear, status: 'active' },
        { $set: { year: student.destinationYear, updatedAt: now }, $push: { academicHistory: { previousYear: student.sourceYear, newYear: student.destinationYear, changedBy: faculty.id, changedAt: now, reason: 'promotion', sessionTransition: transition } } },
        promotionSessionOptions(dbSession),
      );
      if (!updated.modifiedCount) { skipped.push({ usn: student.usn, reason: 'Student record changed after preview.' }); continue; }
      promoted.push(student);
    }
    const operationId = `SELPROMO-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${operationObjectId.toString().slice(-6)}`;
    await database.collection('promotion_history').insertOne({ _id: operationObjectId, operationId, idempotencyKey: key, facultyId: new ObjectId(faculty.id), facultyName: faculty.name, department, sessionTransition: transition, sourceYear: 'selected', destinationYear: 'next year', promotedCount: promoted.length, graduatedCount: 0, skippedCount: skipped.length, failedCount: 0, status: skipped.length ? 'completed_with_skips' : 'completed', createdAt: now, students: promoted }, promotionSessionOptions(dbSession));
    if (promoted.length > 0) {
      await activateAcademicSession(database, transition.split(' -> ')[1], now, dbSession);
    }
    if (dbSession) await dbSession.commitTransaction();
    return { operationId, sessionTransition: transition, promoted, skipped, failed: [], summary: { promoted: promoted.length, skipped: skipped.length, failed: 0, graduated: 0 } };
  } catch (error) {
    if (dbSession) await dbSession.abortTransaction().catch(() => {});
    if (error?.code === 11000) {
      throw new AuthError('This selected-student promotion was already recorded for the selected session transition.', 409);
    }
    throw error;
  } finally { if (dbSession) dbSession.endSession(); }
}

export async function getPromotionHistory(database, faculty, { page = 1, limit = 20 } = {}) {
  if (faculty?.role !== 'faculty') {
    throw new AuthError('Only faculty members can view promotion history.', 403);
  }

  const department = validateDepartment(faculty.department);
  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    database.collection('promotion_history')
      .find({ department })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    database.collection('promotion_history').countDocuments({ department }),
  ]);

  return {
    history: records.map((record) => ({
      id: record.operationId,
      operationId: record.operationId,
      sessionTransition: record.sessionTransition,
      sourceYear: record.sourceYear,
      destinationYear: record.destinationYear,
      promotedCount: record.promotedCount,
      graduatedCount: record.graduatedCount || 0,
      skippedCount: record.skippedCount,
      failedCount: record.failedCount,
      facultyName: record.facultyName,
      facultyId: record.facultyId.toString(),
      timestamp: record.createdAt.toISOString(),
      status: record.status,
      students: record.students || [],
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getPromotionRecordById(database, faculty, operationId) {
  if (faculty?.role !== 'faculty') {
    throw new AuthError('Only faculty members can view promotion records.', 403);
  }

  const department = validateDepartment(faculty.department);
  const record = await database.collection('promotion_history').findOne({
    operationId,
    department,
  });
  if (!record) throw new AuthError('Promotion record not found.', 404);

  return {
    id: record.operationId,
    operationId: record.operationId,
    sessionTransition: record.sessionTransition,
    sourceYear: record.sourceYear,
    destinationYear: record.destinationYear,
    promotedCount: record.promotedCount,
    graduatedCount: record.graduatedCount || 0,
    skippedCount: record.skippedCount,
    failedCount: record.failedCount,
    facultyName: record.facultyName,
    facultyId: record.facultyId.toString(),
    timestamp: record.createdAt.toISOString(),
    status: record.status,
    students: record.students || [],
  };
}
