import express from 'express';
import tutorController from '../controllers/tutorController.js';
import { authenticate } from '../middleware/auth.js';
import { tutorLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(authenticate);

router.get('/status', tutorController.getStatus);
router.post('/query', tutorLimiter, tutorController.queryTutor);

export default router;
