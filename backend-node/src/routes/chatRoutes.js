import express from 'express';
import chatController from '../controllers/chatController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/conversations', chatController.createConversation);
router.get('/conversations', chatController.listConversations);
router.get('/conversations/:id', chatController.getConversation);
router.post('/conversations/:id/messages', chatController.sendMessage);
router.delete('/conversations/:id', chatController.deleteConversation);

export default router;
