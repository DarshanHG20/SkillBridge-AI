import express from 'express';
import healthController from '../controllers/healthController.js';

const router = express.Router();

router.get(['', '/'], healthController.getApiRoot);
router.get('/health', healthController.getHealth);

export default router;
