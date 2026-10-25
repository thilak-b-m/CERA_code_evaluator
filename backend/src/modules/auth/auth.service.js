import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import { ObjectId } from 'mongodb';
import { parseFacultyProfileInput } from './profile.schema.js';

const scrypt = promisify(scryptCallback);
const PASSWORD_BYTES = 64;
const PASSWORD_SALT_BYTES = 16;
const TOKEN_ISSUER = 'cera-api';
const TOKEN_AUDIENCE = 'cera-app';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_FACULTY_SETTINGS = Object.freeze({
  newSubmissions: true,
  assessmentDefaults: Object.freeze({
    points: 100,
    passingPercentage: 40,
    timeLimit: 0,
    languages: ['python', 'java', 'cpp', 'javascript'],
    secureLabEnabled: false,
    targetYears: [1, 2, 3, 4],
  }),
});

export class AuthError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

function normalizeEmail(email) {
  if (typeof email !== 'string') {
    throw new AuthError('Enter a valid email address.', 400);
  }

  const normalized = email.trim().toLowerCase();
  if (normalized.length > 254 || !EMAIL_PATTERN.test(normalized)) {
    throw new AuthError('Enter a valid email address.', 400);
  }

  return normalized;
}

async function hashPassword(password, salt = randomBytes(PASSWORD_SALT_BYTES)) {
  const hash = await scrypt(password, salt, PASSWORD_BYTES);
  return { salt: salt.toString('hex'), hash: hash.toString('hex') };
}

async function verifyPassword(password, saltHex, hashHex) {
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  if (salt.length !== PASSWORD_SALT_BYTES || expected.length !== PASSWORD_BYTES) return false;

  const actual = await scrypt(password, salt, PASSWORD_BYTES);
  return timingSafeEqual(actual, expected);
}

function publicUser(user) {
  const parts = user.name.trim().split(/\s+/);
  return {
    id: user._id.toString(),
    name: user.name,
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
    email: user.email,
    role: user.role,
    department: user.department || null,
    bio: user.bio || '',
    skills: user.skills || [],
    github: user.github || '',
    linkedin: user.linkedin || '',
  };
}

function signToken(user, secret, remember = true, now = Date.now()) {
  const expiresInSeconds = remember ? 30 * 24 * 60 * 60 : 8 * 60 * 60;
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
    ver: user.tokenVersion || 0,
    iss: TOKEN_ISSUER,
    aud: TOKEN_AUDIENCE,
    iat: Math.floor(now / 1000),
    exp: Math.floor(now / 1000) + expiresInSeconds,
  })).toString('base64url');
  const content = `${header}.${payload}`;
  const signature = createHmac('sha256', secret).update(content).digest('base64url');
  return `${content}.${signature}`;
}

export function verifyToken(token, secret, now = Date.now()) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerPart, payloadPart, signaturePart] = parts;
  const content = `${headerPart}.${payloadPart}`;
  const expected = createHmac('sha256', secret).update(content).digest();
  let actual;
  let header;
  let payload;
  try {
    actual = Buffer.from(signaturePart, 'base64url');
    header = JSON.parse(Buffer.from(headerPart, 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (
    header.alg !== 'HS256'
    || header.typ !== 'JWT'
    || actual.length !== expected.length
    || !timingSafeEqual(actual, expected)
    || payload.iss !== TOKEN_ISSUER
    || payload.aud !== TOKEN_AUDIENCE
    || typeof payload.sub !== 'string'
    || !Number.isInteger(payload.exp)
    || payload.exp <= Math.floor(now / 1000)
  ) {
    return null;
  }

  return payload;
}

export async function initializeAuthCollections(database) {
  await database.collection('users').createIndex({ email: 1 }, { unique: true });
  await database.collection('faculty_settings_audit').createIndex({ facultyId: 1, changedAt: -1 });
}

export async function getThemePreference(database, userId) {
  if (!ObjectId.isValid(userId)) {
    throw new AuthError('Account not found.', 404);
  }
  const user = await database.collection('users').findOne({ _id: new ObjectId(userId) });
  if (!user) throw new AuthError('Account not found.', 404);
  return ['light', 'dark'].includes(user.theme) ? user.theme : null;
}

export async function updateThemePreference(database, userId, theme) {
  if (!ObjectId.isValid(userId)) {
    throw new AuthError('Account not found.', 404);
  }
  if (!['light', 'dark'].includes(theme)) {
    throw new AuthError('Theme must be either light or dark.', 400);
  }
  const result = await database.collection('users').updateOne(
    { _id: new ObjectId(userId) },
    { $set: { theme, updatedAt: new Date() } },
  );
  if (!result.matchedCount) throw new AuthError('Account not found.', 404);
  return theme;
}

export async function getFacultySettings(database, faculty) {
  if (faculty?.role !== 'faculty' || !ObjectId.isValid(faculty.id)) throw new AuthError('Faculty account required.', 403);
  const user = await database.collection('users').findOne({ _id: new ObjectId(faculty.id) });
  if (!user) throw new AuthError('Account not found.', 404);
  return {
    ...DEFAULT_FACULTY_SETTINGS,
    ...(user.facultySettings || {}),
    assessmentDefaults: {
      ...DEFAULT_FACULTY_SETTINGS.assessmentDefaults,
      ...(user.facultySettings?.assessmentDefaults || {}),
    },
  };
}

export async function updateFacultySettings(database, faculty, input = {}) {
  if (faculty?.role !== 'faculty' || !ObjectId.isValid(faculty.id)) throw new AuthError('Faculty account required.', 403);
  const allowed = Object.keys(DEFAULT_FACULTY_SETTINGS);
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some((key) => !allowed.includes(key))) {
    throw new AuthError('Unsupported faculty setting.', 400);
  }
  const current = await getFacultySettings(database, faculty);
  const updated = { ...current, ...input };
  for (const key of ['newSubmissions']) {
    if (typeof updated[key] !== 'boolean') throw new AuthError(`${key} must be true or false.`, 400);
  }
  const defaults = updated.assessmentDefaults;
  if (!defaults || !Number.isInteger(Number(defaults.points)) || Number(defaults.points) < 1 || Number(defaults.points) > 10000
      || !Number.isInteger(Number(defaults.passingPercentage)) || Number(defaults.passingPercentage) < 0 || Number(defaults.passingPercentage) > 100
      || !Number.isInteger(Number(defaults.timeLimit)) || Number(defaults.timeLimit) < 0 || Number(defaults.timeLimit) > 600
      || typeof defaults.secureLabEnabled !== 'boolean'
      || !Array.isArray(defaults.targetYears) || !defaults.targetYears.length || defaults.targetYears.some((year) => ![1, 2, 3, 4].includes(Number(year)))
      || !Array.isArray(defaults.languages) || !defaults.languages.length || defaults.languages.some((language) => !['python', 'java', 'cpp', 'javascript'].includes(language))) {
    throw new AuthError('Assessment defaults contain an invalid value.', 400);
  }
  updated.assessmentDefaults = {
    points: Number(defaults.points),
    passingPercentage: Number(defaults.passingPercentage),
    timeLimit: Number(defaults.timeLimit),
    languages: [...new Set(defaults.languages)],
    secureLabEnabled: defaults.secureLabEnabled,
    targetYears: [...new Set(defaults.targetYears.map(Number))].sort(),
  };
  const changedFields = Object.keys(updated).filter((key) => JSON.stringify(updated[key]) !== JSON.stringify(current[key]));
  await database.collection('users').updateOne(
    { _id: new ObjectId(faculty.id), role: 'faculty' },
    { $set: { facultySettings: updated, updatedAt: new Date() } },
  );
  if (changedFields.length) {
    await database.collection('faculty_settings_audit').insertOne({
      facultyId: new ObjectId(faculty.id),
      changedAt: new Date(),
      changedFields,
    });
  }
  return updated;
}

function validateName(name) {
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) {
    throw new AuthError('Name must be between 1 and 120 characters.', 400);
  }
  return name.trim();
}

export function validateDepartment(department) {
  if (typeof department !== 'string' || !department.trim() || department.trim().length > 120) {
    throw new AuthError('Department or branch must be between 1 and 120 characters.', 400);
  }
  return department.trim();
}

export async function createUser(database, { email, password, name, role, department }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = validateName(name);
  if (typeof password !== 'string' || password.length < 8 || password.length > 256) {
    throw new AuthError('Password must be between 8 and 256 characters.', 400);
  }
  if (!['faculty', 'student'].includes(role)) {
    throw new AuthError('Role must be faculty or student.', 400);
  }
  const normalizedDepartment = role === 'faculty' || department !== undefined
    ? validateDepartment(department)
    : undefined;

  const passwordCredentials = await hashPassword(password);
  const user = {
    email: normalizedEmail,
    name: normalizedName,
    role,
    ...(normalizedDepartment ? { department: normalizedDepartment } : {}),
    status: 'active',
    passwordSalt: passwordCredentials.salt,
    passwordHash: passwordCredentials.hash,
    tokenVersion: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    const result = await database.collection('users').insertOne(user);
    return publicUser({ ...user, _id: result.insertedId });
  } catch (error) {
    if (error.code === 11000) {
      throw new AuthError('An account with this email already exists.', 409);
    }
    throw error;
  }
}

export async function inviteFaculty(database, { email, name, department, password }) {
  return createUser(database, {
    email,
    name,
    password,
    role: 'faculty',
    department: validateDepartment(department),
  });
}

export async function setAccountPassword(database, email, password) {
  const normalizedEmail = normalizeEmail(email);
  if (typeof password !== 'string' || password.length < 8 || password.length > 256) {
    throw new AuthError('Password must be between 8 and 256 characters.', 400);
  }
  const user = await database.collection('users').findOne({ email: normalizedEmail });
  if (!user) {
    throw new AuthError('No account exists with this email address.', 404);
  }

  const passwordCredentials = await hashPassword(password);
  const result = await database.collection('users').updateOne(
    { _id: user._id },
    {
      $set: {
        passwordSalt: passwordCredentials.salt,
        passwordHash: passwordCredentials.hash,
        status: 'active',
        updatedAt: new Date(),
      },
      $inc: { tokenVersion: 1 },
    },
  );
  if (!result.matchedCount) {
    throw new AuthError('No account exists with this email address.', 404);
  }
  return publicUser({ ...user, status: 'active' });
}

export async function login(database, { email, password, remember }, secret) {
  const normalizedEmail = normalizeEmail(email);
  if (typeof password !== 'string' || !password || password.length > 256) {
    throw new AuthError('Invalid email or password.', 401);
  }

  const user = await database.collection('users').findOne({ email: normalizedEmail });
  const matches = user?.status === 'active' && user.passwordSalt && user.passwordHash
    ? await verifyPassword(password, user.passwordSalt, user.passwordHash)
    : (await scrypt(password, Buffer.alloc(PASSWORD_SALT_BYTES), PASSWORD_BYTES), false);

  if (!user || !matches || user.status !== 'active') {
    throw new AuthError('Invalid email or password.', 401);
  }

  return {
    token: signToken(user, secret, remember !== false),
    user: publicUser(user),
  };
}

export async function getAuthenticatedUser(database, claims) {
  if (!ObjectId.isValid(claims.sub)) return null;
  const user = await database.collection('users').findOne({ _id: new ObjectId(claims.sub) });
  if (!user || user.status !== 'active' || (user.tokenVersion || 0) !== claims.ver) {
    return null;
  }
  return publicUser(user);
}

export async function changePassword(database, userId, currentPassword, newPassword) {
  if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 256) {
    throw new AuthError('Password must be between 8 and 256 characters.', 400);
  }
  if (currentPassword === newPassword) {
    throw new AuthError('New password must be different from the current password.', 400);
  }

  const user = await database.collection('users').findOne({ _id: new ObjectId(userId) });
  if (!user) {
    throw new AuthError('Account not found.', 404);
  }

  if (user.passwordSalt && user.passwordHash) {
    const matches = await verifyPassword(currentPassword, user.passwordSalt, user.passwordHash);
    if (!matches) {
      throw new AuthError('Current password is incorrect.', 401);
    }
  }

  const passwordCredentials = await hashPassword(newPassword);
  const result = await database.collection('users').updateOne(
    { _id: user._id },
    {
      $set: {
        passwordSalt: passwordCredentials.salt,
        passwordHash: passwordCredentials.hash,
        status: 'active',
        updatedAt: new Date(),
      },
      $inc: { tokenVersion: 1 },
    },
  );
  if (!result.matchedCount) {
    throw new AuthError('Account not found.', 404);
  }
  return publicUser({ ...user, status: 'active' });
}

export async function updateFacultyProfile(database, faculty, input) {
  if (faculty?.role !== 'faculty' || !ObjectId.isValid(faculty.id)) {
    throw new AuthError('Faculty profile not found.', 404);
  }

  const updateDocument = parseFacultyProfileInput(input);

  try {
    const result = await database.collection('users').updateOne(
      { _id: new ObjectId(faculty.id), role: 'faculty' },
      { $set: { ...updateDocument, updatedAt: new Date() } },
    );
    if (!result.matchedCount) {
      throw new AuthError('Faculty profile not found.', 404);
    }
  } catch (error) {
    if (error.code === 11000) {
      throw new AuthError('An account with this email already exists.', 409);
    }
    throw error;
  }

  const user = await database.collection('users').findOne({
    _id: new ObjectId(faculty.id),
  });
  if (!user) throw new AuthError('Faculty profile not found.', 404);
  return publicUser(user);
}
