import express from 'express';
import feedbackController from '../controllers/feedbackController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('', feedbackController.submitFeedback);
router.get('/my-feedback', feedbackController.listMyFeedback);

export default router;
