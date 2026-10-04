import app from './app.js';
import { closeDatabaseConnection, connectToDatabase } from './config/database.js';
import { config } from './config/env.js';

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
    await connectToDatabase();
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