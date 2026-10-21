import assert from 'node:assert/strict';
import test from 'node:test';
import { parseSubmissionInput, SubmissionValidationError } from './submissions.schema.js';

test('submission input validates code, language, and assignment id', () => {
  assert.deepEqual(
    parseSubmissionInput({
      assignmentId: 'assignment-1',
      language: 'python',
      code: 'print("hello")',
    }),
    {
      assignmentId: 'assignment-1',
      language: 'python',
      code: 'print("hello")',
    },
  );
  assert.throws(
    () => parseSubmissionInput({
      assignmentId: 'assignment-1',
      language: 'bash',
      code: 'echo unsafe',
    }),
    SubmissionValidationError,
  );
});

test('submission input rejects blank and oversized code', () => {
  assert.throws(
    () => parseSubmissionInput({
      assignmentId: 'assignment-1',
      language: 'python',
      code: ' ',
    }),
    SubmissionValidationError,
  );
  assert.throws(
    () => parseSubmissionInput({
      assignmentId: 'assignment-1',
      language: 'python',
      code: 'x'.repeat(100001),
    }),
    SubmissionValidationError,
  );
});
