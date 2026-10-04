import { MongoClient, ServerApiVersion } from 'mongodb';
import { config } from './env.js';

let client;
let database;

export async function connectToDatabase() {
  if (database) return database;

  client = new MongoClient(config.mongoUri, {
    appName: 'cera-api',
    maxPoolSize: 10,
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    serverSelectionTimeoutMS: 8000,
  });

  try {
    await client.connect();
    database = client.db(config.databaseName);
    await database.command({ ping: 1 });
    console.info(`[OK] MongoDB connected successfully (database: ${config.databaseName}).`);
    return database;
  } catch (error) {
    await client.close().catch(() => {});
    client = undefined;
    database = undefined;
    throw error;
  }
}

export function getDatabase() {
  if (!database) {
    throw new Error('MongoDB is not connected.');
  }

  return database;
}

export async function closeDatabaseConnection() {
  if (!client) return;

  await client.close();
  client = undefined;
  database = undefined;
}