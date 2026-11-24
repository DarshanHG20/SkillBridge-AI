import express from 'express';
import codingController from '../controllers/codingController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/problems', codingController.listProblems);
router.get('/problems/:slug', codingController.getProblem);
router.post('/problems/:id/submit', codingController.submitSolution);
router.get('/my-submissions', codingController.getMySubmissions);
router.get('/submissions/:id', codingController.getSubmissionDetail);
router.get('/recommendations', codingController.getRecommendations);

export default router;
