import { ObjectId } from 'mongodb';
import { EvaluationValidationError, parseEvaluationInput } from './evaluations.schema.js';

export class EvaluationAccessError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EvaluationAccessError';
    this.statusCode = 404;
  }
}

export class EvaluationConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EvaluationConflictError';
    this.statusCode = 409;
  }
}

export async function initializeEvaluationCollections(database) {
  await database.collection('evaluations').createIndex({ submissionId: 1 }, { unique: true });
  await database.collection('evaluations').createIndex({ facultyId: 1, updatedAt: -1 });
}

function serializeEvaluation(record) {
  return {
    submissionId: record.submissionId.toString(),
    facultyId: record.facultyId.toString(),
    score: record.score,
    feedback: record.feedback,
    aiFeedback: record.aiFeedback || '',
    ...(record.guidance ? { guidance: record.guidance } : {}),
    source: record.source || 'faculty',
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

async function getFacultySubmission(database, submissionId, facultyId) {
  if (!ObjectId.isValid(submissionId)) {
    throw new EvaluationValidationError('Invalid submission id.');
  }
  const submission = await database.collection('submissions').findOne({
    _id: new ObjectId(submissionId),
    facultyId: new ObjectId(facultyId),
  });
  if (!submission) throw new EvaluationAccessError('Submission not found.');
  return submission;
}

export async function getEvaluation(database, submissionId, facultyId) {
  const submission = await getFacultySubmission(database, submissionId, facultyId);
  const evaluation = await database.collection('evaluations').findOne({
    submissionId: submission._id,
    facultyId: submission.facultyId,
  });
  return evaluation ? serializeEvaluation(evaluation) : null;
}

export async function saveEvaluation(
  database,
  submissionId,
  facultyId,
  input,
  { source = 'faculty' } = {},
) {
  const submission = await getFacultySubmission(database, submissionId, facultyId);
  const assignment = await database.collection('assignments').findOne({
    _id: submission.assignmentId,
    facultyId: submission.facultyId,
  });
  if (!assignment) throw new EvaluationAccessError('Assignment not found.');

  const parsed = parseEvaluationInput(input, assignment.points);
  const now = new Date();
  const collection = database.collection('evaluations');
  const previous = await collection.findOne({
    submissionId: submission._id,
    facultyId: submission.facultyId,
  });
  const record = {
    _id: previous?._id || new ObjectId(),
    submissionId: submission._id,
    facultyId: submission.facultyId,
    studentId: submission.studentId,
    assignmentId: submission.assignmentId,
    ...parsed,
    source,
    createdAt: previous?.createdAt || now,
    updatedAt: now,
  };
  if (previous) {
    const { _id, ...updates } = record;
    await collection.updateOne(
      { _id: previous._id },
      { $set: updates },
    );
  } else {
    await collection.insertOne(record);
  }
  return serializeEvaluation(record);
}

export async function saveAIEvaluation(database, submissionId, facultyId, input) {
  const submission = await getFacultySubmission(database, submissionId, facultyId);
  const assignment = await database.collection('assignments').findOne({
    _id: submission.assignmentId,
    facultyId: submission.facultyId,
  });
  if (!assignment) throw new EvaluationAccessError('Assignment not found.');

  const parsed = parseEvaluationInput(input, assignment.points);
  const collection = database.collection('evaluations');
  const key = { submissionId: submission._id, facultyId: submission.facultyId };
  const previous = await collection.findOne(key);
  if (previous && previous.source !== 'ollama') {
    throw new EvaluationConflictError('An existing faculty evaluation was kept unchanged.');
  }

  const now = new Date();
  const record = {
    _id: previous?._id || new ObjectId(),
    submissionId: submission._id,
    facultyId: submission.facultyId,
    studentId: submission.studentId,
    assignmentId: submission.assignmentId,
    ...parsed,
    source: 'ollama',
    createdAt: previous?.createdAt || now,
    updatedAt: now,
  };

  if (previous) {
    const { _id, ...updates } = record;
    const result = await collection.updateOne(
      { _id: previous._id, facultyId: submission.facultyId, source: 'ollama' },
      { $set: updates },
    );
    if (result.matchedCount !== 1) {
      throw new EvaluationConflictError('An existing faculty evaluation was kept unchanged.');
    }
  } else {
    try {
      await collection.insertOne(record);
    } catch (error) {
      if (error.code === 11000) {
        throw new EvaluationConflictError('An evaluation was saved while AI evaluation was running. Reload before trying again.');
      }
      throw error;
    }
  }

  return serializeEvaluation(record);
}

export async function getPublishedEvaluation(database, submissionId, studentId) {
  if (!ObjectId.isValid(submissionId)) {
    throw new EvaluationValidationError('Invalid submission id.');
  }
  const evaluation = await database.collection('evaluations').findOne({
    submissionId: new ObjectId(submissionId),
    studentId: new ObjectId(studentId),
    status: 'published',
  });
  return evaluation ? serializeEvaluation(evaluation) : null;
}
