import express from 'express';
import notificationController from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('', authenticate, notificationController.listNotifications);
router.get('/unread-count', authenticate, notificationController.getUnreadCount);
router.post('', authenticate, notificationController.createNotification);
router.patch('/read-all', authenticate, notificationController.markAllAsRead);
router.patch('/:id/read', authenticate, notificationController.markAsRead);
router.delete('/:id', authenticate, notificationController.deleteNotification);

export default router;
