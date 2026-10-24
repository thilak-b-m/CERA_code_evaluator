import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AssignmentValidationError,
  parseAssignmentInput,
  parseTestCaseInput,
} from './assignments.schema.js';

test('assignment input validates and normalizes publish status', () => {
  const assignment = parseAssignmentInput({
    title: '  Arrays  ',
    course: 'CS101',
    description: 'Solve the problem',
    due: '2026-12-01',
    points: '100',
    visibility: 'draft',
  });

  assert.equal(assignment.title, 'Arrays');
  assert.equal(assignment.points, 100);
  assert.equal(assignment.status, 'draft');
  assert.deepEqual(assignment.languages, ['python', 'java', 'cpp', 'javascript']);
});

test('assignment input rejects unsupported languages and invalid points', () => {
  assert.throws(
    () => parseAssignmentInput({
      title: 'Arrays',
      course: 'CS101',
      description: 'Solve',
      due: '2026-12-01',
      points: 0,
    }),
    AssignmentValidationError,
  );
  assert.throws(
    () => parseAssignmentInput({
      title: 'Arrays',
      course: 'CS101',
      description: 'Solve',
      due: '2026-12-01',
      points: 10,
      languages: ['bash'],
    }),
    AssignmentValidationError,
  );
});

test('assignment targeting and passing defaults are validated and normalized', () => {
  const assignment = parseAssignmentInput({
    title: 'Year scoped', course: 'CS101', description: 'Only year 2.', due: '2026-12-01', points: 20,
    targetYears: ['2', 2], passingPercentage: '45',
  });
  assert.deepEqual(assignment.targetYears, [2]);
  assert.equal(assignment.passingPercentage, 45);
  assert.throws(() => parseAssignmentInput({
    title: 'Bad target', course: 'CS101', description: 'Invalid.', due: '2026-12-01', points: 20, targetYears: [5],
  }), AssignmentValidationError);
});

test('Secure Lab settings are normalized and validated', () => {
  const defaults = parseAssignmentInput(assignmentWithDefaults()).secureLab;
  assert.deepEqual(defaults, {
    enabled: false,
    requireFullscreen: true,
    recordTabSwitches: true,
    recordFullscreenExits: true,
    warningThreshold: 1,
    maxViolations: 3,
    maxFullscreenExits: 0,
    fullscreenExitTimeoutSeconds: 15,
  });
  assert.equal(
    parseAssignmentInput({
      ...assignmentWithDefaults(),
      secureLab: { enabled: false, fullscreenExitTimeoutSeconds: 45 },
    }).secureLab.fullscreenExitTimeoutSeconds,
    15,
  );
  assert.deepEqual(
    parseAssignmentInput({
      ...assignmentWithDefaults(),
      secureLab: { enabled: true, warningThreshold: 2, maxViolations: 5, maxFullscreenExits: 3 },
    }).secureLab,
    {
      enabled: true,
      requireFullscreen: true,
      recordTabSwitches: true,
      recordFullscreenExits: true,
      warningThreshold: 2,
      maxViolations: 5,
      maxFullscreenExits: 3,
      fullscreenExitTimeoutSeconds: 15,
    },
  );
  assert.throws(
    () => parseAssignmentInput({
      ...assignmentWithDefaults(),
      secureLab: { enabled: 'true' },
    }),
    AssignmentValidationError,
  );
  assert.throws(
    () => parseAssignmentInput({
      ...assignmentWithDefaults(),
      secureLab: { maxViolations: 101 },
    }),
    AssignmentValidationError,
  );
  assert.throws(
    () => parseAssignmentInput({
      ...assignmentWithDefaults(),
      secureLab: { maxFullscreenExits: 101 },
    }),
    AssignmentValidationError,
  );
  assert.throws(
    () => parseAssignmentInput({
      ...assignmentWithDefaults(),
      secureLab: { fullscreenExitTimeoutSeconds: 0 },
    }),
    AssignmentValidationError,
  );
  assert.throws(
    () => parseAssignmentInput({
      ...assignmentWithDefaults(),
      secureLab: { fullscreenExitTimeoutSeconds: 301 },
    }),
    AssignmentValidationError,
  );
});

function assignmentWithDefaults() {
  return {
    title: 'Secure test',
    course: 'CS101',
    description: 'Test secure settings.',
    due: '2026-12-01',
    points: 10,
  };
}

test('test cases validate executable stdin and expected stdout', () => {
  assert.deepEqual(
    parseTestCaseInput({
      inputProfile: '1 2',
      input: '1 2\n',
      expectedOutput: '3\n',
      visibility: 'Hidden',
      weight: '2',
    }),
    {
      inputProfile: '1 2',
      input: '1 2\n',
      expectedOutput: '3\n',
      visibility: 'Hidden',
      weight: 2,
    },
  );
  assert.deepEqual(
    parseTestCaseInput({
      inputProfile: 'No stdin',
      input: '',
      expectedOutput: '',
    }).input,
    '',
  );
  assert.throws(
    () => parseTestCaseInput({
      inputProfile: '1 2',
      input: '1 2',
      expectedOutput: '3',
      visibility: 'Private',
    }),
    AssignmentValidationError,
  );
  assert.throws(
    () => parseTestCaseInput({
      inputProfile: 'Invalid',
      input: 42,
      expectedOutput: '',
    }),
    AssignmentValidationError,
  );
});
