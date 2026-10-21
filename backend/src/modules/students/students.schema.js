import { ObjectId } from 'mongodb';

export class StudentValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StudentValidationError';
    this.statusCode = 400;
  }
}

export function parseStudentInput({ usn, year } = {}) {
  if (typeof usn !== 'string' || !usn.trim() || usn.trim().length > 40) {
    throw new StudentValidationError('USN must be between 1 and 40 characters.');
  }

  const numericYear = Number(year);
  if (!Number.isInteger(numericYear) || numericYear < 1 || numericYear > 4) {
    throw new StudentValidationError('Year must be between 1 and 4.');
  }

  return {
    usn: usn.trim().toUpperCase(),
    year: numericYear,
  };
}

export function parseStudentProfileInput(input = {}) {
  const updates = {};

  if (Object.hasOwn(input, 'name')) {
    if (typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 120) {
      throw new StudentValidationError('Name must be between 1 and 120 characters.');
    }
    updates.name = input.name.trim();
  }

  if (Object.hasOwn(input, 'email')) {
    if (typeof input.email !== 'string') {
      throw new StudentValidationError('Enter a valid email address.');
    }
    const email = input.email.trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new StudentValidationError('Enter a valid email address.');
    }
    updates.email = email;
  }

  if (Object.hasOwn(input, 'bio')) {
    if (typeof input.bio !== 'string' || input.bio.trim().length > 1000) {
      throw new StudentValidationError('Bio must be 1000 characters or fewer.');
    }
    updates.bio = input.bio.trim();
  }

  if (Object.hasOwn(input, 'skills')) {
    if (!Array.isArray(input.skills) || input.skills.length > 30) {
      throw new StudentValidationError('Skills must be a list of up to 30 items.');
    }
    if (input.skills.some((skill) => (
      typeof skill !== 'string' || !skill.trim() || skill.trim().length > 60
    ))) {
      throw new StudentValidationError('Each skill must be between 1 and 60 characters.');
    }
    updates.skills = [...new Set(input.skills.map((skill) => skill.trim()))];
  }

  for (const field of ['github', 'linkedin']) {
    if (Object.hasOwn(input, field)) {
      if (typeof input[field] !== 'string' || input[field].trim().length > 200) {
        throw new StudentValidationError(`${field} must be 200 characters or fewer.`);
      }
      updates[field] = input[field].trim();
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new StudentValidationError('Provide at least one profile field to update.');
  }

  return updates;
}

export const ALLOWED_YEARS = new Set([1, 2, 3, 4]);
export const ALLOWED_STATUSES = new Set(['active', 'inactive']);

export function parseAcademicYear(value) {
  const numericYear = Number(value);
  if (!Number.isInteger(numericYear) || numericYear < 1 || numericYear > 4) {
    throw new StudentValidationError('Year must be between 1 and 4.');
  }
  return numericYear;
}

export function parseAccountStatus(value) {
  if (typeof value !== 'string' || !ALLOWED_STATUSES.has(value)) {
    throw new StudentValidationError('Status must be either active or inactive.');
  }
  return value;
}

export function parsePaginationInput(input = {}) {
  const page = Math.max(1, Number(input.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(input.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function parseStudentFacultyUpdateInput(input = {}) {
  const updates = {};

  if (Object.hasOwn(input, 'usn')) {
    if (typeof input.usn !== 'string' || !input.usn.trim() || input.usn.trim().length > 40) {
      throw new StudentValidationError('USN must be between 1 and 40 characters.');
    }
    updates.usn = input.usn.trim().toUpperCase();
  }

  if (Object.hasOwn(input, 'name')) {
    if (typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 120) {
      throw new StudentValidationError('Name must be between 1 and 120 characters.');
    }
    updates.name = input.name.trim();
  }

  if (Object.hasOwn(input, 'email')) {
    if (typeof input.email !== 'string') {
      throw new StudentValidationError('Enter a valid email address.');
    }
    const email = input.email.trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new StudentValidationError('Enter a valid email address.');
    }
    updates.email = email;
  }

  if (Object.keys(updates).length === 0) {
    throw new StudentValidationError('Provide at least one field to update.');
  }

  return updates;
}

export function parseStudentYearCorrectionInput(input = {}) {
  const year = parseAcademicYear(input.year);
  if (typeof input.reason !== 'string' || input.reason.trim().length < 10 || input.reason.trim().length > 500) {
    throw new StudentValidationError('Correction reason must be between 10 and 500 characters.');
  }
  return { year, reason: input.reason.trim() };
}

export function createStudentDocument({
  usn,
  year,
  department,
  facultyId,
  userId,
}, now = new Date()) {
  return {
    usn,
    year,
    department,
    status: 'active',
    facultyId: new ObjectId(facultyId),
    userId: new ObjectId(userId),
    createdAt: now,
    updatedAt: now,
  };
}
