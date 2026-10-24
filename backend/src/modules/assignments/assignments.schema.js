const MAX_TITLE_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 20000;
const MAX_EVALUATION_CRITERIA_LENGTH = 5000;
const MAX_TEST_CASE_TEXT_LENGTH = 10000;
const ALLOWED_LANGUAGES = new Set(['python', 'java', 'cpp', 'javascript']);
const ALLOWED_DIFFICULTIES = new Set(['Beginner', 'Intermediate', 'Advanced']);
const ALLOWED_VISIBILITY = new Set(['Public', 'Hidden']);
const SECURE_LAB_DEFAULTS = Object.freeze({
  enabled: false,
  requireFullscreen: true,
  recordTabSwitches: true,
  recordFullscreenExits: true,
  warningThreshold: 1,
  maxViolations: 3,
  maxFullscreenExits: 0,
  fullscreenExitTimeoutSeconds: 15,
});

export class AssignmentValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AssignmentValidationError';
    this.statusCode = 400;
  }
}

function requiredText(value, label, maxLength) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new AssignmentValidationError(`${label} must be between 1 and ${maxLength} characters.`);
  }
  return value.trim();
}

function optionalText(value, label, maxLength) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string' || value.trim().length > maxLength) {
    throw new AssignmentValidationError(`${label} must be ${maxLength} characters or fewer.`);
  }
  return value.trim();
}

function parseDueDate(value) {
  if (typeof value !== 'string' || !value.trim() || Number.isNaN(Date.parse(value))) {
    throw new AssignmentValidationError('A valid due date is required.');
  }
  return new Date(value);
}

function parsePoints(value) {
  const points = Number(value);
  if (!Number.isFinite(points) || points < 1 || points > 10000) {
    throw new AssignmentValidationError('Points must be between 1 and 10000.');
  }
  return points;
}

function parsePassingPercentage(value) {
  const percentage = Number(value ?? 40);
  if (!Number.isInteger(percentage) || percentage < 0 || percentage > 100) {
    throw new AssignmentValidationError('Passing percentage must be between 0 and 100.');
  }
  return percentage;
}

function parseTimeLimit(value) {
  if (value === undefined || value === null || value === '') return 0;
  const timeLimit = Number(value);
  if (!Number.isInteger(timeLimit) || timeLimit < 0 || timeLimit > 600) {
    throw new AssignmentValidationError('Time limit must be between 0 and 600 minutes.');
  }
  return timeLimit;
}

function parseLanguages(value) {
  const languages = value === undefined ? ['python', 'java', 'cpp', 'javascript'] : value;
  if (!Array.isArray(languages) || languages.length === 0
      || languages.some((language) => !ALLOWED_LANGUAGES.has(language))) {
    throw new AssignmentValidationError('Select one or more supported languages.');
  }
  return [...new Set(languages)];
}

function parseTargetYears(value) {
  if (value === undefined) return [1, 2, 3, 4];
  if (!Array.isArray(value) || value.length === 0 || value.some((year) => ![1, 2, 3, 4].includes(Number(year)))) {
    throw new AssignmentValidationError('Target academic years must include one or more years from 1 to 4.');
  }
  return [...new Set(value.map(Number))].sort();
}

function parseStatus(value) {
  const status = value ?? 'published';
  if (!['draft', 'published'].includes(String(status).toLowerCase())) {
    throw new AssignmentValidationError('Status must be draft or published.');
  }
  return String(status).toLowerCase();
}

function parseSecureLabSettings(value) {
  if (value === undefined) return { ...SECURE_LAB_DEFAULTS };
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AssignmentValidationError('Secure Lab settings must be an object.');
  }
  const parsed = { ...SECURE_LAB_DEFAULTS };
  for (const field of ['enabled', 'requireFullscreen', 'recordTabSwitches', 'recordFullscreenExits']) {
    if (Object.hasOwn(value, field)) {
      if (typeof value[field] !== 'boolean') {
        throw new AssignmentValidationError(`Secure Lab ${field} must be true or false.`);
      }
      parsed[field] = value[field];
    }
  }
  for (const field of ['warningThreshold', 'maxViolations', 'maxFullscreenExits']) {
    if (Object.hasOwn(value, field)) {
      const limit = Number(value[field]);
      if (!Number.isInteger(limit) || limit < 0 || limit > 100) {
        throw new AssignmentValidationError(`Secure Lab ${field} must be a whole number between 0 and 100.`);
      }
      parsed[field] = limit;
    }
  }
  if (Object.hasOwn(value, 'fullscreenExitTimeoutSeconds')) {
    const timeout = Number(value.fullscreenExitTimeoutSeconds);
    if (!Number.isInteger(timeout) || timeout < 1 || timeout > 300) {
      throw new AssignmentValidationError('Secure Lab fullscreen exit timeout must be a whole number between 1 and 300 seconds.');
    }
    parsed.fullscreenExitTimeoutSeconds = timeout;
  }
  if (!parsed.enabled) parsed.fullscreenExitTimeoutSeconds = 15;
  return parsed;
}

export function parseAssignmentInput(input = {}, { partial = false } = {}) {
  const parsed = {};
  const requiredFields = ['title', 'course', 'description', 'due', 'points'];

  for (const field of requiredFields) {
    if (!partial || Object.hasOwn(input, field)) {
      if (field === 'due') parsed.dueAt = parseDueDate(input.due);
      else if (field === 'points') parsed.points = parsePoints(input.points);
      else parsed[field] = requiredText(
        input[field],
        field[0].toUpperCase() + field.slice(1),
        field === 'description' ? MAX_DESCRIPTION_LENGTH : MAX_TITLE_LENGTH,
      );
    }
  }

  if (!partial || Object.hasOwn(input, 'evaluationCriteria')) {
    parsed.evaluationCriteria = optionalText(
      input.evaluationCriteria,
      'Evaluation criteria',
      MAX_EVALUATION_CRITERIA_LENGTH,
    );
  }
  if (!partial || Object.hasOwn(input, 'passingPercentage')) {
    parsed.passingPercentage = parsePassingPercentage(input.passingPercentage);
  }
  if (!partial || Object.hasOwn(input, 'timeLimit')) {
    parsed.timeLimit = parseTimeLimit(input.timeLimit);
  }
  if (!partial || Object.hasOwn(input, 'languages')) {
    parsed.languages = parseLanguages(input.languages);
  }
  if (!partial || Object.hasOwn(input, 'difficulty')) {
    const difficulty = input.difficulty ?? 'Intermediate';
    if (!ALLOWED_DIFFICULTIES.has(difficulty)) {
      throw new AssignmentValidationError('Select a supported difficulty.');
    }
    parsed.difficulty = difficulty;
  }
  if (!partial || Object.hasOwn(input, 'status') || Object.hasOwn(input, 'visibility')) {
    parsed.status = parseStatus(input.status ?? input.visibility);
  }
  if (!partial || Object.hasOwn(input, 'color')) {
    parsed.color = optionalText(input.color, 'Color', 40) || 'var(--primary)';
  }
  if (!partial || Object.hasOwn(input, 'secureLab')) {
    parsed.secureLab = parseSecureLabSettings(input.secureLab);
  }
  if (!partial || Object.hasOwn(input, 'targetYears')) {
    parsed.targetYears = parseTargetYears(input.targetYears);
  }
  if (partial && Object.keys(parsed).length === 0) {
    throw new AssignmentValidationError('Provide at least one assignment field to update.');
  }

  return parsed;
}

export function parseTestCaseInput(input = {}, { partial = false } = {}) {
  const parsed = {};
  if (!partial || Object.hasOwn(input, 'inputProfile')) {
    parsed.inputProfile = requiredText(
      input.inputProfile,
      'Input profile',
      MAX_TEST_CASE_TEXT_LENGTH,
    );
  }
  for (const field of ['input', 'expectedOutput']) {
    if (partial && !Object.hasOwn(input, field)) continue;
    if (typeof input[field] !== 'string' || input[field].length > MAX_TEST_CASE_TEXT_LENGTH) {
      throw new AssignmentValidationError(`${field} must be text with at most ${MAX_TEST_CASE_TEXT_LENGTH} characters.`);
    }
    parsed[field] = input[field];
  }

  if (!partial || Object.hasOwn(input, 'visibility')) {
    const visibility = input.visibility ?? 'Public';
    if (!ALLOWED_VISIBILITY.has(visibility)) {
      throw new AssignmentValidationError('Test case visibility must be Public or Hidden.');
    }
    parsed.visibility = visibility;
  }
  if (!partial || Object.hasOwn(input, 'weight')) {
    const weight = Number(input.weight ?? 10);
    if (!Number.isFinite(weight) || weight <= 0 || weight > 10000) {
      throw new AssignmentValidationError('Test case weight must be greater than 0 and at most 10000.');
    }
    parsed.weight = weight;
  }
  if (partial && Object.keys(parsed).length === 0) {
    throw new AssignmentValidationError('Provide at least one test case field to update.');
  }

  return parsed;
}
