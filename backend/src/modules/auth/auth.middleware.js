import { getDatabase } from '../../config/database.js';
import { config } from '../../config/env.js';
import { getAuthenticatedUser, verifyToken } from './auth.service.js';

export async function authenticate(request, response, next) {
  const authorization = request.get('authorization') || '';
  const match = /^Bearer ([^\s]+)$/.exec(authorization);
  const claims = match ? verifyToken(match[1], config.jwtSecret) : null;
  if (!claims) {
    response.status(401).json({ error: 'Authentication required.' });
    return;
  }

  try {
    const user = await getAuthenticatedUser(getDatabase(), claims);
    if (!user) {
      response.status(401).json({ error: 'Authentication required.' });
      return;
    }
    request.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireFaculty(request, response, next) {
  if (request.user?.role !== 'faculty') {
    response.status(403).json({ error: 'Faculty access required.' });
    return;
  }
  next();
}

export function requireStudent(request, response, next) {
  if (request.user?.role !== 'student') {
    response.status(403).json({ error: 'Student access required.' });
    return;
  }
  next();
}
