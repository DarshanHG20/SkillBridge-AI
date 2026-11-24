import express from 'express';
import careerController from '../controllers/careerController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('', careerController.listCareers);
router.get('/my-roadmaps/all', authenticate, careerController.getMyRoadmaps);
router.get('/:slug', careerController.getCareerDetails);
router.get('/:slug/gap-analysis', authenticate, careerController.getGapAnalysis);
router.post('/:slug/generate-roadmap', authenticate, careerController.generateRoadmap);

export default router;
