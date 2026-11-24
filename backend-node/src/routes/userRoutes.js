import express from 'express';
import userController from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/me', userController.getMe);
router.put('/me', userController.updateMe);
router.put('/me/profile', userController.updateProfile);
router.get('/:id', userController.getUserById);

export default router;
