import express from 'express';
import skillController from '../controllers/skillController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('', skillController.listSkills);
router.get('/taxonomy/tree', optionalAuth, skillController.getTaxonomyTree);
router.get('/my-mastery', authenticate, skillController.getMyMastery);
router.post('/unlock-all-100', authenticate, skillController.masterAllSkills);
router.get('/:slug', skillController.getSkillBySlug);

export default router;
