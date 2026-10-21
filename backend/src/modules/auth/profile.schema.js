export class ProfileValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProfileValidationError';
    this.statusCode = 400;
  }
}

export function parseFacultyProfileInput(input = {}) {
  const updates = {};

  if (Object.hasOwn(input, 'name')) {
    if (typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 120) {
      throw new ProfileValidationError('Name must be between 1 and 120 characters.');
    }
    updates.name = input.name.trim();
  }

  if (Object.hasOwn(input, 'email')) {
    if (typeof input.email !== 'string') {
      throw new ProfileValidationError('Enter a valid email address.');
    }
    const email = input.email.trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ProfileValidationError('Enter a valid email address.');
    }
    updates.email = email;
  }

  if (Object.hasOwn(input, 'bio')) {
    if (typeof input.bio !== 'string' || input.bio.trim().length > 1000) {
      throw new ProfileValidationError('Bio must be 1000 characters or fewer.');
    }
    updates.bio = input.bio.trim();
  }

  if (Object.hasOwn(input, 'skills')) {
    if (!Array.isArray(input.skills) || input.skills.length > 30) {
      throw new ProfileValidationError('Skills must be a list of up to 30 items.');
    }
    if (input.skills.some((skill) => (
      typeof skill !== 'string' || !skill.trim() || skill.trim().length > 60
    ))) {
      throw new ProfileValidationError('Each skill must be between 1 and 60 characters.');
    }
    updates.skills = [...new Set(input.skills.map((skill) => skill.trim()))];
  }

  for (const field of ['github', 'linkedin']) {
    if (Object.hasOwn(input, field)) {
      if (typeof input[field] !== 'string' || input[field].trim().length > 200) {
        throw new ProfileValidationError(`${field} must be 200 characters or fewer.`);
      }
      updates[field] = input[field].trim();
    }
  }

  if (!Object.keys(updates).length) {
    throw new ProfileValidationError('Provide at least one profile field to update.');
  }

  return updates;
}
