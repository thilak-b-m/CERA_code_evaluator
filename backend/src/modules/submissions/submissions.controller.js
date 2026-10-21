import { getDatabase } from '../../config/database.js';
import {
  parseRunInput,
  parseSubmissionInput,
} from './submissions.schema.js';
import {
  createSubmission,
  getFacultySubmission,
  getStudentSubmission,
  listFacultySubmissions,
  listStudentSubmissions,
  runSubmission,
} from './submissions.service.js';

export async function createStudentSubmission(request, response, next) {
  try {
    const submission = await createSubmission(
      getDatabase(),
      request.user,
      parseSubmissionInput(request.body || {}),
    );
    response.status(201).json({ submission });
  } catch (error) {
    next(error);
  }
}

export async function getStudentSubmissions(request, response, next) {
  try {
    const submissions = await listStudentSubmissions(getDatabase(), request.user.id);
    response.json({ submissions });
  } catch (error) {
    next(error);
  }
}

export async function getStudentSubmissionById(request, response, next) {
  try {
    const submission = await getStudentSubmission(
      getDatabase(),
      request.params.id,
      request.user.id,
    );
    response.json({ submission });
  } catch (error) {
    next(error);
  }
}

export async function getFacultySubmissionById(request, response, next) {
  try {
    const submission = await getFacultySubmission(
      getDatabase(),
      request.params.id,
      request.user.id,
    );
    response.json({ submission });
  } catch (error) {
    next(error);
  }
}

export async function getFacultySubmissions(request, response, next) {
  try {
    const submissions = await listFacultySubmissions(
      getDatabase(),
      request.user.id,
      request.query.assignmentId,
    );
    response.json({ submissions });
  } catch (error) {
    next(error);
  }
}

export async function runStudentCode(request, response, next) {
  try {
    const run = await runSubmission(
      getDatabase(),
      parseRunInput(request.body || {}),
      undefined,
      request.user,
    );
    response.json({ run });
  } catch (error) {
    next(error);
  }
}
