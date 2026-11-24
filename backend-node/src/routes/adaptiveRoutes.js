import express from 'express';
import adaptiveController from '../controllers/adaptiveController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/next-activity', adaptiveController.getNextActivity);
router.get('/weak-concepts', adaptiveController.getWeakConcepts);
router.get('/overview', adaptiveController.getOverview);
router.post('/predict-mastery', adaptiveController.predictMastery);

export default router;
