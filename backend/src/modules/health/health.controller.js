import { getDatabase } from '../../config/database.js';

export async function getHealth(request, response, next) {
  try {
    await getDatabase().command({ ping: 1 });
    response.json({ status: 'ok', database: 'connected' });
  } catch {
    const error = new Error('Database unavailable.');
    error.statusCode = 503;
    next(error);
  }
}