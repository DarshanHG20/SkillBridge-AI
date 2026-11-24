import express from 'express';
import assessmentController from '../controllers/assessmentController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('', assessmentController.listAssessments);
router.post('/:id/start', authenticate, assessmentController.startAssessment);
router.post('/attempts/:id/submit', authenticate, assessmentController.submitAssessment);
router.get('/attempts/:id', authenticate, assessmentController.getAttemptDetails);
router.get('/my-history', authenticate, assessmentController.getMyHistory);

export default router;
