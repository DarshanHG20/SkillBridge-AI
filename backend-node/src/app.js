
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import config from './config/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';

// Route imports
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import skillRoutes from './routes/skillRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import assessmentRoutes from './routes/assessmentRoutes.js';
import adaptiveRoutes from './routes/adaptiveRoutes.js';
import careerRoutes from './routes/careerRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import tutorRoutes from './routes/tutorRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import ragRoutes from './routes/ragRoutes.js';
import codingRoutes from './routes/codingRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

const app = express();

// Render reverse proxy configuration
app.set('trust proxy', 1);

// Security & Logging Middlewares
app.use(helmet({ crossOriginResourcePolicy: false }));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, native clients)
      if (!origin) return callback(null, true);

      if (
        config.corsOrigins.includes(origin) ||
        config.corsOrigins.includes('*')
      ) {
        return callback(null, true);
      }

      // Allow development origins
      if (config.environment !== 'production') {
        return callback(null, true);
      }

      // Production fallback for private subnet patterns
      if (
        /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/i.test(origin)
      ) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Root health & discovery endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    service: config.projectName,
    version: '1.0.0',
    status: 'operational',
    documentation: '/docs',
    api_v1: config.apiV1Str,
    health_check: `${config.apiV1Str}/health`,
  });
});

// Mount V1 API Routers
const v1 = express.Router();

v1.use('', healthRoutes);
v1.use('/auth', authRoutes);
v1.use('/users', userRoutes);
v1.use('/skills', skillRoutes);
v1.use('/courses', courseRoutes);
v1.use('/assessments', assessmentRoutes);
v1.use('/adaptive', adaptiveRoutes);
v1.use('/careers', careerRoutes);
v1.use('/projects', projectRoutes);
v1.use('/tutor', tutorRoutes);
v1.use('/chat', chatRoutes);
v1.use('/rag', ragRoutes);
v1.use('/coding', codingRoutes);
v1.use('/feedback', feedbackRoutes);
v1.use('/admin', adminRoutes);
v1.use('/notifications', notificationRoutes);

app.use(config.apiV1Str, apiLimiter, v1);

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
