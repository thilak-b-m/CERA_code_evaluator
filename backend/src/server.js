import app from './app.js';
import { closeDatabaseConnection, connectToDatabase } from './config/database.js';
import { config } from './config/env.js';
import { initializeAuthCollections } from './modules/auth/auth.service.js';
import { initializeStudentCollections } from './modules/students/students.service.js';
import { initializePromotionCollections } from './modules/students/students.service.js';
import { initializeAssignmentCollections } from './modules/assignments/assignments.service.js';
import { initializeSubmissionCollections } from './modules/submissions/submissions.service.js';
import { initializeEvaluationCollections } from './modules/evaluations/evaluations.service.js';
import { initializeEvaluationQueueCollections, startEvaluationQueue } from './modules/evaluations/evaluation-queue.service.js';
import { initializeAnalyticsCollections } from './modules/analytics/analytics.service.js';
import { initializeNotificationCollections } from './modules/notifications/notifications.service.js';
import { initializeReportCollections } from './modules/reports/reports.service.js';
import { initializeLiveLabCollections } from './modules/live-lab/live-lab.service.js';
import { initializeSecureAssessmentCollections } from './modules/secure-assessments/secure-assessments.service.js';

function listen(port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port);
    const handleError = (error) => reject(error);

    server.once('error', handleError);
    server.once('listening', () => {
      server.removeListener('error', handleError);
      resolve(server);
    });
  });
}

async function isExistingApiHealthy(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/health`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return false;

    const health = await response.json();
    return health.status === 'ok' && health.database === 'connected';
  } catch {
    return false;
  }
}

async function startServer() {
  if (Buffer.byteLength(config.jwtSecret, 'utf8') < 32) {
    throw new Error('JWT_SECRET is required and must be at least 32 bytes long. Configure it in backend/.env.');
  }

  let server;
  try {
    server = await listen(config.port);
  } catch (error) {
    if (error.code === 'EADDRINUSE' && await isExistingApiHealthy(config.port)) {
      console.info(`[OK] MongoDB connection verified by the API already running at http://localhost:${config.port}.`);
      return;
    }

    throw error;
  }

  try {
    const database = await connectToDatabase();
    await initializeAuthCollections(database);
    await initializeStudentCollections(database);
    await initializePromotionCollections(database);
    await initializeAssignmentCollections(database);
    await initializeSubmissionCollections(database);
    await initializeEvaluationCollections(database);
    await initializeEvaluationQueueCollections(database);
    await initializeAnalyticsCollections(database);
    await initializeNotificationCollections(database);
    await initializeReportCollections(database);
    await initializeLiveLabCollections(database);
    await initializeSecureAssessmentCollections(database);
    await startEvaluationQueue(database, {
      ollamaBaseUrl: config.ollamaBaseUrl,
      ollamaModel: config.ollamaModel,
      ollamaTimeoutMs: config.ollamaTimeoutMs,
      retryLimit: config.ollamaRetryLimit,
      retryDelayMs: config.ollamaRetryDelayMs,
    });
  } catch (error) {
    await new Promise((resolve) => server.close(resolve));
    throw error;
  }

  console.info(`CERA API listening on http://localhost:${config.port}.`);

  const shutdown = (signal) => {
    console.info(`${signal} received. Shutting down CERA API.`);
    server.close(async (error) => {
      if (error) console.error('HTTP server shutdown error:', error.message);
      await closeDatabaseConnection();
      process.exit(error ? 1 : 0);
    });
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

startServer().catch((error) => {
  console.error(`CERA API startup failed: ${error.message}`);
  process.exitCode = 1;
});
