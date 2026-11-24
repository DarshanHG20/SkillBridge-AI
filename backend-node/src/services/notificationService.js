import { Notification } from '../models/Governance.js';

export class NotificationService {
  static async listNotifications(userId, skip = 0, limit = 20) {
    const skipNum = Math.max(0, parseInt(skip, 10) || 0);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const total = await Notification.countDocuments({ user_id: userId });
    const items = await Notification.find({ user_id: userId })
      .sort({ id: -1 })
      .skip(skipNum)
      .limit(limitNum);

    const unreadCount = await Notification.countDocuments({ user_id: userId, is_read: false });

    return {
      items,
      total,
      unread_count: unreadCount,
      skip: skipNum,
      limit: limitNum,
    };
  }

  static async getUnreadCount(userId) {
    const unreadCount = await Notification.countDocuments({ user_id: userId, is_read: false });
    return { unread_count: unreadCount };
  }

  static async createNotification(userId, title, message, type = 'general') {
    const notification = new Notification({
      user_id: userId,
      title: title.trim(),
      message: message.trim(),
      type: type || 'general',
      is_read: false,
    });
    await notification.save();
    return notification;
  }

  static async markAsRead(userId, notificationId) {
    const notif = await Notification.findOne({ id: Number(notificationId), user_id: userId });
    if (!notif) {
      const err = new Error('Notification not found or access denied.');
      err.status = 404;
      throw err;
    }
    notif.is_read = true;
    await notif.save();
    return notif;
  }

  static async markAllAsRead(userId) {
    await Notification.updateMany({ user_id: userId, is_read: false }, { $set: { is_read: true } });
    return { message: 'All notifications marked as read.' };
  }

  static async deleteNotification(userId, notificationId) {
    const notif = await Notification.findOneAndDelete({ id: Number(notificationId), user_id: userId });
    if (!notif) {
      const err = new Error('Notification not found or access denied.');
      err.status = 404;
      throw err;
    }
    return { message: 'Notification deleted successfully.', id: Number(notificationId) };
  }
}

export default NotificationService;
