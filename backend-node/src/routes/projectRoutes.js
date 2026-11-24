import express from 'express';
import projectController from '../controllers/projectController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('', optionalAuth, projectController.listProjects);
router.get('/my-portfolio', authenticate, projectController.getMyPortfolio);
router.get('/:id', optionalAuth, projectController.getProjectDetails);
router.post('/:id/progress', authenticate, projectController.updateProgress);

export default router;
