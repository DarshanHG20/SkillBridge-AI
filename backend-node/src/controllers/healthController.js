import mongoose from 'mongoose';
import config from '../config/index.js';
import { checkDatabaseConnection } from '../config/database.js';

export function getHealth(req, res) {
  const isDbOk = checkDatabaseConnection();
  const overallStatus = isDbOk ? 'healthy' : 'degraded';

  return res.status(isDbOk ? 200 : 503).json({
    status: overallStatus,
    environment: config.environment,
    project_name: config.projectName,
    version: '1.0.0',
    database_connected: isDbOk,
    database: {
      status: isDbOk ? 'connected' : 'disconnected',
      readyState: mongoose.connection.readyState,
    },
    details: {
      debug: config.debug,
      adaptive_engine_enabled: config.aiAdaptiveEngineEnabled,
      api_version: config.apiV1Str,
    },
  });
}

export function getApiRoot(req, res) {
  const isDbOk = checkDatabaseConnection();
  return res.status(200).json({
    service: `${config.projectName} REST API`,
    version: '1.0.0',
    status: isDbOk ? 'operational' : 'degraded',
    health: `${config.apiV1Str}/health`,
    database_connected: isDbOk,
    endpoints: {
      auth: `${config.apiV1Str}/auth`,
      users: `${config.apiV1Str}/users`,
      skills: `${config.apiV1Str}/skills`,
      courses: `${config.apiV1Str}/courses`,
      assessments: `${config.apiV1Str}/assessments`,
      adaptive: `${config.apiV1Str}/adaptive`,
      careers: `${config.apiV1Str}/careers`,
      projects: `${config.apiV1Str}/projects`,
      coding: `${config.apiV1Str}/coding`,
      tutor: `${config.apiV1Str}/tutor`,
      rag: `${config.apiV1Str}/rag`,
      feedback: `${config.apiV1Str}/feedback`,
      admin: `${config.apiV1Str}/admin`,
    },
  });
}

export default {
  getHealth,
  getApiRoot,
};
