import { getDatabase } from '../../config/database.js';
import {
  parseAssignmentInput,
  parseTestCaseInput,
} from './assignments.schema.js';
import {
  archiveAssignment,
  createAssignment,
  createTestCase,
  deleteTestCase,
  getAssignment,
  listAssignments,
  listTestCases,
  restoreAssignment,
  updateAssignment,
  updateTestCase,
} from './assignments.service.js';

export async function getAssignments(request, response, next) {
  try {
    if (!['faculty', 'student'].includes(request.user?.role)) {
      response.status(403).json({ message: 'Workspace access required.' });
      return;
    }
    const assignments = await listAssignments(getDatabase(), request.user);
    response.json({ assignments });
  } catch (error) {
    next(error);
  }
}

export async function getAssignmentById(request, response, next) {
  try {
    const assignment = await getAssignment(
      getDatabase(),
      request.params.id,
      request.user,
    );
    response.json({ assignment });
  } catch (error) {
    next(error);
  }
}

export async function createAssignmentForFaculty(request, response, next) {
  try {
    const assignment = await createAssignment(
      getDatabase(),
      request.user.id,
      parseAssignmentInput(request.body || {}),
      request.user.department,
    );
    response.status(201).json({ assignment });
  } catch (error) {
    next(error);
  }
}

export async function updateAssignmentForFaculty(request, response, next) {
  try {
    const assignment = await updateAssignment(
      getDatabase(),
      request.params.id,
      request.user.id,
      parseAssignmentInput(request.body || {}, { partial: true }),
    );
    response.json({ assignment });
  } catch (error) {
    next(error);
  }
}

export async function archiveAssignmentForFaculty(request, response, next) {
  try {
    await archiveAssignment(getDatabase(), request.params.id, request.user.id);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
}

export async function restoreAssignmentForFaculty(request, response, next) {
  try {
    await restoreAssignment(getDatabase(), request.params.id, request.user.id);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
}

export async function getAssignmentTestCases(request, response, next) {
  try {
    if (!['faculty', 'student'].includes(request.user?.role)) {
      response.status(403).json({ message: 'Workspace access required.' });
      return;
    }
    const testCases = await listTestCases(
      getDatabase(),
      request.params.id,
      request.user,
    );
    response.json({ testCases });
  } catch (error) {
    next(error);
  }
}

export async function createAssignmentTestCase(request, response, next) {
  try {
    const testCase = await createTestCase(
      getDatabase(),
      request.params.id,
      request.user.id,
      parseTestCaseInput(request.body || {}),
    );
    response.status(201).json({ testCase });
  } catch (error) {
    next(error);
  }
}

export async function updateAssignmentTestCase(request, response, next) {
  try {
    const testCase = await updateTestCase(
      getDatabase(),
      request.params.id,
      request.params.testCaseId,
      request.user.id,
      parseTestCaseInput(request.body || {}, { partial: true }),
    );
    response.json({ testCase });
  } catch (error) {
    next(error);
  }
}

export async function deleteAssignmentTestCase(request, response, next) {
  try {
    await deleteTestCase(
      getDatabase(),
      request.params.id,
      request.params.testCaseId,
      request.user.id,
    );
    response.status(204).end();
  } catch (error) {
    next(error);
  }
}
