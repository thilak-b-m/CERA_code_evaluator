import { getDatabase } from '../../config/database.js';
import {
  getStudentProfile,
  getDepartmentStudentRecord,
  inviteStudent,
  listDepartmentStudents,
  updateStudentFacultyRecord,
  setStudentAccountStatus,
  bulkSetStudentAccountStatus,
  deleteStudentAccount,
  updateStudentProfile,
  listAcademicSessions,
  getCurrentAcademicSession,
  createAcademicSession,
  getPromotionPreview,
  getAllYearsPromotionPreview,
  executePromotion,
  executeAllYearsPromotion,
  getPromotionHistory,
  getPromotionRecordById,
  previewSelectedPromotion,
  executeSelectedPromotion,
  correctStudentAcademicYear,
} from './students.service.js';

export async function getOwnStudentProfile(request, response, next) {
  try {
    const student = await getStudentProfile(getDatabase(), request.user);
    response.json({ student });
  } catch (error) {
    next(error);
  }
}

export async function updateOwnStudentProfile(request, response, next) {
  try {
    const student = await updateStudentProfile(
      getDatabase(),
      request.user,
      request.body || {},
    );
    response.json({ student, message: 'Student profile updated.' });
  } catch (error) {
    next(error);
  }
}

export async function getStudents(request, response, next) {
  try {
    const students = await listDepartmentStudents(getDatabase(), request.user, request.query || {});
    response.json(students);
  } catch (error) {
    next(error);
  }
}

export async function getStudentRecord(request, response, next) {
  try {
    const result = await getDepartmentStudentRecord(
      getDatabase(),
      request.user,
      request.params.usn,
    );
    response.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createStudent(request, response, next) {
  try {
    const student = await inviteStudent(
      getDatabase(),
      request.body || {},
      request.user,
    );
    response.status(201).json({
      student,
      message: `Student account created for ${student.email}.`,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateStudent(request, response, next) {
  try {
    const student = await updateStudentFacultyRecord(
      getDatabase(),
      request.user,
      request.params.usn,
      request.body || {},
    );
    response.json({ student, message: 'Student record updated.' });
  } catch (error) {
    next(error);
  }
}

export async function correctStudentYear(request, response, next) {
  try {
    const result = await correctStudentAcademicYear(getDatabase(), request.user, request.params.usn, request.body || {});
    response.json({ result, message: 'Academic year correction recorded.' });
  } catch (error) { next(error); }
}

export async function deactivateStudent(request, response, next) {
  try {
    const result = await setStudentAccountStatus(
      getDatabase(),
      request.user,
      request.params.usn,
      'inactive',
    );
    response.json(result);
  } catch (error) {
    next(error);
  }
}

export async function reactivateStudent(request, response, next) {
  try {
    const result = await setStudentAccountStatus(
      getDatabase(),
      request.user,
      request.params.usn,
      'active',
    );
    response.json(result);
  } catch (error) {
    next(error);
  }
}

export async function deleteStudent(request, response, next) {
  try {
    const result = await deleteStudentAccount(
      getDatabase(),
      request.user,
      request.params.usn,
    );
    response.json(result);
  } catch (error) {
    next(error);
  }
}

export async function bulkUpdateStudentStatus(request, response, next) {
  try {
    const { usns, status } = request.body || {};
    const result = await bulkSetStudentAccountStatus(
      getDatabase(),
      request.user,
      usns,
      status,
    );
    response.json({ results: result, message: 'Bulk status update completed.' });
  } catch (error) {
    next(error);
  }
}

export async function getAcademicSessions(request, response, next) {
  try {
    const sessions = await listAcademicSessions(getDatabase());
    response.json({ sessions });
  } catch (error) {
    next(error);
  }
}

export async function getCurrentSession(request, response, next) {
  try {
    const session = await getCurrentAcademicSession(getDatabase());
    response.json({ session });
  } catch (error) {
    next(error);
  }
}

export async function createAcademicSessionForFaculty(request, response, next) {
  try {
    const { sessionName, isCurrent } = request.body || {};
    const session = await createAcademicSession(
      getDatabase(),
      sessionName,
      isCurrent === true,
      request.user,
    );
    response.status(201).json({ session });
  } catch (error) {
    next(error);
  }
}

export async function getPromotionPreviewForYear(request, response, next) {
  try {
    const { sourceYear, destinationYear, sessionTransition } = request.body || {};
    const preview = await getPromotionPreview(
      getDatabase(),
      request.user,
      sourceYear,
      destinationYear,
      sessionTransition,
    );
    response.json({ preview });
  } catch (error) {
    next(error);
  }
}

export async function getAllYearsPromotionPreviewForFaculty(request, response, next) {
  try {
    const preview = await getAllYearsPromotionPreview(
      getDatabase(),
      request.user,
      request.body?.sessionTransition,
    );
    response.json({ preview });
  } catch (error) {
    next(error);
  }
}

export async function executePromotionForYear(request, response, next) {
  try {
    const { sourceYear, destinationYear, sessionTransition } = request.body || {};
    const result = await executePromotion(
      getDatabase(),
      request.user,
      sourceYear,
      destinationYear,
      sessionTransition,
    );
    response.json({ result });
  } catch (error) {
    next(error);
  }
}

export async function executeAllYearsPromotionForFaculty(request, response, next) {
  try {
    const { sessionTransition } = request.body || {};
    const result = await executeAllYearsPromotion(
      getDatabase(),
      request.user,
      sessionTransition,
    );
    response.json({ result });
  } catch (error) {
    next(error);
  }
}

export async function getPromotionHistoryForFaculty(request, response, next) {
  try {
    const { page = 1, limit = 20 } = request.query || {};
    const result = await getPromotionHistory(getDatabase(), request.user, {
      page: Number(page),
      limit: Number(limit),
    });
    response.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getPromotionRecord(request, response, next) {
  try {
    const result = await getPromotionRecordById(
      getDatabase(),
      request.user,
      request.params.operationId,
    );
    response.json({ record: result });
  } catch (error) {
    next(error);
  }
}

export async function getSelectedPromotionPreview(request, response, next) {
  try {
    const preview = await previewSelectedPromotion(getDatabase(), request.user, request.body?.usns, request.body?.sessionTransition);
    response.json({ preview });
  } catch (error) { next(error); }
}

export async function executeSelectedPromotionForFaculty(request, response, next) {
  try {
    const result = await executeSelectedPromotion(getDatabase(), request.user, request.body?.usns, request.body?.sessionTransition);
    response.json({ result });
  } catch (error) { next(error); }
}
