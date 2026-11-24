import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const baseMongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skillbridge_db';

function resolveMongoUri(env, uri) {
  if (env !== 'test') return uri;
  if (process.env.MONGODB_TEST_URI) return process.env.MONGODB_TEST_URI;
  // Isolate test runs from the development/production database
  return uri.replace(/\/([^/?]+)(\?|$)/, '/$1_test$2');
}

export const config = {
  // General
  environment: nodeEnv,
  nodeEnv,
  debug: nodeEnv !== 'production',
  projectName: process.env.PROJECT_NAME || 'SkillBridge AI',
  apiV1Str: process.env.API_V1_STR || '/api/v1',
  port: parseInt(process.env.PORT || '5001', 10),
  host: process.env.HOST || '0.0.0.0',

  // Security & Tokens
  jwtSecret: process.env.JWT_SECRET || 'skillbridge_super_secret_jwt_key_2026_dev_env_minimum_32_chars',
  jwtAccessExpiresMinutes: parseInt(process.env.JWT_ACCESS_EXPIRES_MINUTES || '60', 10),
  jwtRefreshExpiresDays: parseInt(process.env.JWT_REFRESH_EXPIRES_DAYS || '7', 10),

  // Database
  mongoUri: resolveMongoUri(nodeEnv, baseMongoUri),
  useMemoryDbFallback: process.env.USE_MEMORY_DB_FALLBACK !== 'false',
  sqliteDbPath: process.env.SQLITE_DB_PATH || path.resolve(__dirname, '../../../backend/skillbridge_dev.db'),

  // CORS
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173,http://localhost:8080,http://127.0.0.1:8080')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean),

  // Adaptive Learning Engine
  aiAdaptiveEngineEnabled: process.env.AI_ADAPTIVE_ENGINE_ENABLED !== 'false',
  defaultMasteryThreshold: parseFloat(process.env.DEFAULT_MASTERY_THRESHOLD || '0.75'),

  // AI Tutor & LLM Providers
  aiProvider: (process.env.AI_PROVIDER || 'none').toLowerCase(),
  openaiApiKey: process.env.OPENAI_API_KEY || null,
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  geminiApiKey: process.env.GEMINI_API_KEY || null,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  llmTimeoutSeconds: parseFloat(process.env.LLM_TIMEOUT_SECONDS || '10.0'),
  llmMaxTokens: parseInt(process.env.LLM_MAX_TOKENS || '1000', 10),
  llmTemperature: parseFloat(process.env.LLM_TEMPERATURE || '0.3'),
  tutorDailyRateLimit: parseInt(process.env.TUTOR_DAILY_RATE_LIMIT || '100', 10),

  // RAG Pipeline
  ragMaxFileSizeBytes: parseInt(process.env.RAG_MAX_FILE_SIZE_BYTES || '10485760', 10),
  ragChunkSize: parseInt(process.env.RAG_CHUNK_SIZE || '500', 10),
  ragChunkOverlap: parseInt(process.env.RAG_CHUNK_OVERLAP || '100', 10),
  ragMinSimilarity: parseFloat(process.env.RAG_MIN_SIMILARITY || '0.15'),
  ragTopK: parseInt(process.env.RAG_TOP_K || '3', 10),

  // Safe Coding Sandbox
  codingSandboxEnabled: process.env.CODING_SANDBOX_ENABLED === 'true',
  codingExecutionTimeoutSeconds: parseFloat(process.env.CODING_EXECUTION_TIMEOUT_SECONDS || '2.0'),
};

export default config;
