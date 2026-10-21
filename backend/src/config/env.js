import 'dotenv/config';
import { setServers } from 'node:dns';

function required(name, value) {
  if (!value) {
    throw new Error(`${name} is required. Configure it in backend/.env.`);
  }

  return value;
}

const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

const jwtSecret = process.env.JWT_SECRET || '';
if (jwtSecret && Buffer.byteLength(jwtSecret, 'utf8') < 32) {
  throw new Error('JWT_SECRET must be at least 32 bytes long.');
}

const mongoUri = required('MONGODB_URI', process.env.MONGODB_URI);
if (mongoUri.includes('<') || mongoUri.includes('>')) {
  throw new Error('Replace the MONGODB_URI password placeholder in backend/.env.');
}

let parsedMongoUri;
try {
  parsedMongoUri = new URL(mongoUri);
} catch {
  throw new Error('MONGODB_URI must be a valid MongoDB connection URI.');
}

if (!['mongodb:', 'mongodb+srv:'].includes(parsedMongoUri.protocol)) {
  throw new Error('MONGODB_URI must use mongodb:// or mongodb+srv://.');
}

const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
let parsedOllamaBaseUrl;
try {
  parsedOllamaBaseUrl = new URL(ollamaBaseUrl);
} catch {
  throw new Error('OLLAMA_BASE_URL must be a valid HTTP or HTTPS URL.');
}
if (!['http:', 'https:'].includes(parsedOllamaBaseUrl.protocol)
    || parsedOllamaBaseUrl.username || parsedOllamaBaseUrl.password) {
  throw new Error('OLLAMA_BASE_URL must be an HTTP or HTTPS URL without credentials.');
}
const ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5-coder:3b';
if (ollamaModel.length > 120 || !ollamaModel.trim()) {
  throw new Error('OLLAMA_MODEL must be a model name of 1 to 120 characters.');
}

const mongoDnsServers = (process.env.MONGODB_DNS_SERVERS || '')
  .split(',')
  .map((server) => server.trim())
  .filter(Boolean);

if (mongoDnsServers.length) {
  try {
    setServers(mongoDnsServers);
  } catch {
    throw new Error('MONGODB_DNS_SERVERS must contain comma-separated DNS server IP addresses.');
  }
}

export const config = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port,
  mongoUri,
  databaseName: process.env.MONGODB_DB_NAME || 'cera',
  mongoDnsServers,
  jwtSecret,
  ollamaBaseUrl: parsedOllamaBaseUrl.toString().replace(/\/$/, ''),
  ollamaModel,
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
});