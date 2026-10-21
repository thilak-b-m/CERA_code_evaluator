const MAX_SOURCE_LENGTH = 100000;
const ALLOWED_LANGUAGES = new Set(['python', 'java', 'cpp', 'javascript']);

export class SubmissionValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SubmissionValidationError';
    this.statusCode = 400;
  }
}

export function parseSubmissionInput(input = {}) {
  if (typeof input.assignmentId !== 'string' || !input.assignmentId.trim()) {
    throw new SubmissionValidationError('Assignment id is required.');
  }
  if (typeof input.language !== 'string' || !ALLOWED_LANGUAGES.has(input.language)) {
    throw new SubmissionValidationError('Select a supported programming language.');
  }
  if (typeof input.code !== 'string' || !input.code.trim()) {
    throw new SubmissionValidationError('Source code cannot be empty.');
  }
  if (Buffer.byteLength(input.code, 'utf8') > MAX_SOURCE_LENGTH) {
    throw new SubmissionValidationError('Source code must be 100 KB or smaller.');
  }

  return {
    assignmentId: input.assignmentId.trim(),
    language: input.language,
    code: input.code,
  };
}

export function parseRunInput(input = {}) {
  return parseSubmissionInput(input);
}
