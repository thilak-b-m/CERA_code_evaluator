import { getDatabase } from '../../config/database.js';
import { parseAnalyticsPeriod } from './analytics.schema.js';
import { getFacultyAnalytics, getStudentLeaderboard } from './analytics.service.js';

export async function getFacultyAnalyticsOverview(request, response, next) {
  try {
    const period = parseAnalyticsPeriod(request.query.period);
    const analytics = await getFacultyAnalytics(
      getDatabase(),
      request.user.id,
      period,
    );
    response.json({ analytics });
  } catch (error) {
    next(error);
  }

}

export async function getStudentLeaderboardData(request, response, next) {
  try {
    const leaderboard = await getStudentLeaderboard(getDatabase(), request.user.id);
    response.json({ leaderboard });
  } catch (error) {
    next(error);
  }
}
