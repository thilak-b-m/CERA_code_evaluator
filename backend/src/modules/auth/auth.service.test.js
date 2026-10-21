import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import test from 'node:test';
import {
  createUser,
  getAuthenticatedUser,
  getThemePreference,
  inviteFaculty,
  initializeAuthCollections,
  login,
  setAccountPassword,
  updateThemePreference,
  updateFacultyProfile,
  getFacultySettings,
  updateFacultySettings,
  verifyToken,
} from './auth.service.js';
import { parseFacultyProfileInput } from './profile.schema.js';
import {
  initializeStudentCollections,
  getStudentProfile,
  inviteStudent,
  listDepartmentStudents,
  updateStudentProfile,
  setStudentAccountStatus,
} from '../students/students.service.js';
import { parseStudentInput } from '../students/students.schema.js';
import { parseStudentProfileInput } from '../students/students.schema.js';

const secret = randomBytes(32).toString('hex');

class MemoryCollection {
  constructor() {
    this.documents = [];
  }

  async createIndex() {}

  async insertOne(document) {
    if (this.documents.some((item) => (
      (document.email && item.email === document.email)
      || (document.usn && item.usn === document.usn)
    ))) {
      const error = new Error('duplicate key');
      error.code = 11000;
      error.keyPattern = document.usn ? { usn: 1 } : { email: 1 };
      throw error;
    }
    const saved = { ...document, _id: randomBytes(12).toString('hex') };
    this.documents.push(saved);
    return { insertedId: saved._id };
  }

  async findOne(query) {
    return this.documents.find((document) => Object.entries(query).every(([key, value]) => {
      if (key === 'expiresAt' && value?.$gt) return document.expiresAt > value.$gt;
      return String(document[key]) === String(value);
    })) || null;
  }

  async countDocuments(query = {}) {
    return this.documents.filter((document) => Object.entries(query).every(([key, value]) => String(document[key]) === String(value))).length;
  }

  find(query = {}) {
    let documents = this.documents.filter((document) => Object.entries(query).every(([key, value]) => (
      String(document[key]) === String(value)
    )));
    const cursor = {
      sort: (sortOrder) => {
        const [[key, direction]] = Object.entries(sortOrder);
        documents = documents.sort((left, right) => (
          (left[key] > right[key] ? 1 : left[key] < right[key] ? -1 : 0) * direction
        ));
        return cursor;
      },
      skip: (count) => { documents = documents.slice(count); return cursor; },
      limit: (count) => { documents = documents.slice(0, count); return cursor; },
      toArray: async () => documents,
    };
    return cursor;
  }

  async deleteOne(query) {
    const index = this.documents.findIndex((document) => Object.entries(query).every(([key, value]) => (
      String(document[key]) === String(value)
    )));
    if (index < 0) return { deletedCount: 0 };
    this.documents.splice(index, 1);
    return { deletedCount: 1 };
  }

  async updateOne(query, update) {
    const document = await this.findOne(query);
    if (!document) return { matchedCount: 0 };
    Object.assign(document, update.$set);
    for (const [key, amount] of Object.entries(update.$inc || {})) {
      document[key] = (document[key] || 0) + amount;
    }
    return { matchedCount: 1 };
  }
}

function createDatabase() {
  const collections = new Map();
  return {
    collection(name) {
      if (!collections.has(name)) collections.set(name, new MemoryCollection());
      return collections.get(name);
    },
  };
}

test('provisions and authenticates faculty and student accounts with role-specific JWTs', async () => {
  const database = createDatabase();
  await initializeAuthCollections(database);

  for (const role of ['faculty', 'student']) {
    const email = `${role}@university.edu`;
    const provisioned = await createUser(database, {
      email,
      name: `Test ${role}`,
      password: 'correct-horse-battery',
      role,
      ...(role === 'faculty' ? { department: 'Computer Science' } : {}),
    });

    assert.equal(provisioned.role, role);

    const result = await login(database, {
      email: email.toUpperCase(),
      password: 'correct-horse-battery',
      remember: false,
    }, secret);
    const claims = verifyToken(result.token, secret);
    assert.equal(result.user.role, role);
    assert.equal(claims.role, role);
    assert.equal((await getAuthenticatedUser(database, claims)).role, role);
    assert.equal(claims.exp - claims.iat, 8 * 60 * 60);
  }
});

test('account theme preference is validated and isolated on the authenticated user record', async () => {
  const database = createDatabase();
  const user = await createUser(database, {
    email: 'theme@student.edu',
    name: 'Theme Student',
    password: 'correct-horse-battery',
    role: 'student',
  });
  assert.equal(await getThemePreference(database, user.id), null);
  assert.equal(await updateThemePreference(database, user.id, 'light'), 'light');
  assert.equal(await getThemePreference(database, user.id), 'light');
  const otherUser = await createUser(database, {
    email: 'other@student.edu',
    name: 'Other Student',
    password: 'correct-horse-battery',
    role: 'student',
  });
  assert.equal(await getThemePreference(database, otherUser.id), null);
  await assert.rejects(updateThemePreference(database, user.id, 'system'), /light or dark/);
  assert.equal(await getThemePreference(database, user.id), 'light');
});

test('faculty settings persist per account and validate assessment defaults', async () => {
  const database = createDatabase();
  await initializeAuthCollections(database);
  const faculty = await createUser(database, {
    email: 'settings@university.edu', name: 'Settings Faculty', password: 'faculty-password',
    role: 'faculty', department: 'Computer Science',
  });
  const defaults = await getFacultySettings(database, faculty);
  assert.equal(defaults.assessmentDefaults.points, 100);
  const updated = await updateFacultySettings(database, faculty, {
    newSubmissions: false,
    assessmentDefaults: { ...defaults.assessmentDefaults, points: 50, targetYears: [2] },
  });
  assert.equal(updated.newSubmissions, false);
  assert.equal((await getFacultySettings(database, faculty)).assessmentDefaults.points, 50);
  assert.equal((await database.collection('faculty_settings_audit').find({}).toArray()).length, 1);
  await assert.rejects(updateFacultySettings(database, faculty, {
    assessmentDefaults: { ...defaults.assessmentDefaults, targetYears: [5] },
  }), { statusCode: 400 });
});

test('rejects incorrect credentials, duplicate users, and tampered JWTs', async () => {
  const database = createDatabase();
  const user = await createUser(database, {
    email: 'student@university.edu',
    name: 'Test Student',
    password: 'correct-horse-battery',
    role: 'student',
  });

  await assert.rejects(
    createUser(database, {
      email: user.email,
      name: 'Duplicate Student',
      password: 'correct-horse-battery',
      role: 'student',
    }),
    { statusCode: 409 },
  );
  await assert.rejects(
    login(database, { email: user.email, password: 'wrong-password' }, secret),
    { statusCode: 401 },
  );

  const valid = await login(database, { email: user.email, password: 'correct-horse-battery' }, secret);
  const [header, payload, signature] = valid.token.split('.');
  const changedSignature = `${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`;
  const tampered = `${header}.${payload}.${changedSignature}`;
  assert.equal(verifyToken(tampered, secret), null);
});

test('creates faculty accounts with their department and chosen password', async () => {
  const database = createDatabase();
  await initializeAuthCollections(database);
  const faculty = await inviteFaculty(database, {
    name: 'Test Faculty',
    email: 'faculty@university.edu',
    department: 'Computer Science',
    password: 'new-faculty-password',
  });

  assert.equal(faculty.role, 'faculty');
  assert.equal(faculty.department, 'Computer Science');
  assert.equal(database.collection('users').documents[0].status, 'active');
  const signedIn = await login(database, {
    email: faculty.email,
    password: 'new-faculty-password',
  }, secret);
  assert.equal(signedIn.user.department, 'Computer Science');

  const updatedProfile = await updateFacultyProfile(database, faculty, {
    name: 'Updated Faculty',
    email: 'updated.faculty@university.edu',
    bio: 'Teaching software design and algorithms.',
    skills: ['Algorithms', ' Java ', 'Algorithms'],
    github: 'github.com/faculty',
    linkedin: '',
  });
  assert.equal(updatedProfile.name, 'Updated Faculty');
  assert.equal(updatedProfile.email, 'updated.faculty@university.edu');
  assert.equal(updatedProfile.department, 'Computer Science');
  assert.equal(updatedProfile.bio, 'Teaching software design and algorithms.');
  assert.deepEqual(updatedProfile.skills, ['Algorithms', 'Java']);
  assert.equal(updatedProfile.github, 'github.com/faculty');
  assert.equal(updatedProfile.linkedin, '');
  await assert.rejects(
    updateFacultyProfile(database, { ...faculty, role: 'student' }, { bio: 'not allowed' }),
    { statusCode: 404 },
  );
});

test('faculty profile validation rejects invalid input', async () => {
  assert.throws(() => parseFacultyProfileInput({ skills: 'Python' }), {
    statusCode: 400,
  });
  assert.throws(() => parseFacultyProfileInput({ email: 'invalid' }), {
    statusCode: 400,
  });
  assert.throws(() => parseFacultyProfileInput({}), {
    statusCode: 400,
  });
});

test('faculty create students with passwords only in their own department roster', async () => {
  const database = createDatabase();
  await initializeAuthCollections(database);
  await initializeStudentCollections(database);
  const faculty = await createUser(database, {
    email: 'faculty@university.edu',
    name: 'Test Faculty',
    password: 'faculty-password',
    role: 'faculty',
    department: 'Computer Science',
  });
  const invited = await inviteStudent(database, {
    name: 'Test Student',
    email: 'student@university.edu',
    password: 'student-password',
    usn: '1xx23cs001',
    year: '2',
  }, faculty);

  assert.equal(invited.role, 'student');
  assert.equal(invited.department, 'Computer Science');
  assert.equal(database.collection('users').documents[1].status, 'active');
  const studentLogin = await login(database, {
    email: invited.email,
    password: 'student-password',
  }, secret);
  assert.equal(studentLogin.user.role, 'student');
  const ownProfile = await getStudentProfile(database, studentLogin.user);
  assert.equal(ownProfile.name, 'Test Student');
  assert.equal(ownProfile.email, 'student@university.edu');
  assert.equal(ownProfile.usn, '1XX23CS001');
  assert.equal(ownProfile.year, 2);
  assert.equal(ownProfile.department, 'Computer Science');
  const updatedProfile = await updateStudentProfile(database, studentLogin.user, {
    name: 'Updated Student',
    email: 'updated.student@university.edu',
    bio: 'Interested in backend development.',
    skills: ['JavaScript', ' MongoDB ', 'JavaScript'],
    github: 'github.com/updated-student',
    linkedin: '',
  });
  assert.equal(updatedProfile.name, 'Updated Student');
  assert.equal(updatedProfile.email, 'updated.student@university.edu');
  assert.equal(updatedProfile.bio, 'Interested in backend development.');
  assert.deepEqual(updatedProfile.skills, ['JavaScript', 'MongoDB']);
  assert.equal(updatedProfile.github, 'github.com/updated-student');
  assert.equal(updatedProfile.linkedin, '');
  assert.equal((await listDepartmentStudents(database, faculty)).students[0].name, 'Updated Student');
  await assert.rejects(
    getStudentProfile(database, { ...studentLogin.user, id: '000000000000000000000001' }),
    { statusCode: 404 },
  );
  const roster = await listDepartmentStudents(database, faculty);
  assert.equal(roster.students.length, 1);
  assert.equal(roster.students[0].usn, '1XX23CS001');
  assert.equal(roster.students[0].year, 2);
  assert.equal(roster.students[0].department, 'Computer Science');
  assert.equal(roster.students[0].email, 'updated.student@university.edu');
  assert.equal('score' in roster.students[0], false);
  assert.equal(roster.students[0].status, 'active');

  const otherFaculty = await createUser(database, {
    email: 'other-faculty@university.edu',
    name: 'Other Faculty',
    password: 'faculty-password',
    role: 'faculty',
    department: 'Mathematics',
  });
  assert.deepEqual((await listDepartmentStudents(database, otherFaculty)).students, []);
  await assert.rejects(
    inviteStudent(database, {
      name: 'Duplicate Student',
      email: 'duplicate@university.edu',
      password: 'another-student-password',
      usn: '1XX23CS001',
      year: 1,
    }, faculty),
    { statusCode: 409 },
  );
});

test('student deactivation and reactivation invalidate existing access tokens', async () => {
  const database = createDatabase();
  await initializeAuthCollections(database);
  await initializeStudentCollections(database);
  const faculty = await createUser(database, {
    email: 'status-faculty@university.edu', name: 'Status Faculty', password: 'faculty-password',
    role: 'faculty', department: 'Computer Science',
  });
  const student = await inviteStudent(database, {
    name: 'Status Student', email: 'status-student@university.edu', password: 'student-password', usn: '1CS23CS777', year: 1,
  }, faculty);
  const session = await login(database, { email: student.email, password: 'student-password' }, secret);
  const claims = verifyToken(session.token, secret);
  await setStudentAccountStatus(database, faculty, student.usn, 'inactive');
  assert.equal(await getAuthenticatedUser(database, claims), null);
  await setStudentAccountStatus(database, faculty, student.usn, 'active');
  assert.equal(await getAuthenticatedUser(database, claims), null);
});

test('student profile updates reject invalid or empty values', async () => {
  assert.throws(() => parseStudentProfileInput({ skills: 'Python' }), {
    statusCode: 400,
  });
  assert.throws(() => parseStudentProfileInput({ email: 'not-an-email' }), {
    statusCode: 400,
  });
  assert.throws(() => parseStudentProfileInput({}), {
    statusCode: 400,
  });
});

test('student schema normalizes USNs and rejects invalid enrollment years', async () => {
  assert.deepEqual(parseStudentInput({ usn: ' 1xx23cs001 ', year: '2' }), {
    usn: '1XX23CS001',
    year: 2,
  });
  assert.throws(() => parseStudentInput({ usn: '1XX23CS001', year: 5 }), {
    statusCode: 400,
  });
  assert.throws(() => parseStudentInput({ usn: ' ', year: 1 }), {
    statusCode: 400,
  });
});

test('requires valid passwords and a department for faculty accounts', async () => {
  const database = createDatabase();
  await initializeAuthCollections(database);

  await assert.rejects(
    inviteFaculty(database, {
      name: 'Test Faculty',
      email: 'faculty@university.edu',
      department: 'Computer Science',
      password: 'short',
    }),
    { statusCode: 400 },
  );
  await assert.rejects(createUser(database, {
    email: 'faculty@university.edu',
    name: 'Test Faculty',
    password: 'valid-password',
    role: 'faculty',
  }), { statusCode: 400 });
  assert.equal(database.collection('users').documents.length, 0);
});

test('administrator can set a new password and invalidate existing sessions', async () => {
  const database = createDatabase();
  const user = await createUser(database, {
    email: 'faculty@university.edu',
    name: 'Test Faculty',
    password: 'old-faculty-password',
    role: 'faculty',
    department: 'Computer Science',
  });
  const oldSession = await login(database, {
    email: user.email,
    password: 'old-faculty-password',
  }, secret);

  await setAccountPassword(database, user.email, 'new-faculty-password');
  assert.equal(await getAuthenticatedUser(database, verifyToken(oldSession.token, secret)), null);
  const newSession = await login(database, {
    email: user.email,
    password: 'new-faculty-password',
  }, secret);
  assert.equal(newSession.user.email, user.email);
  await assert.rejects(
    setAccountPassword(database, 'missing@university.edu', 'new-password'),
    { statusCode: 404 },
  );
});
