import notificationService from '../services/notificationService.js';

export async function listNotifications(req, res, next) {
  try {
    const { skip, limit } = req.query;
    const result = await notificationService.listNotifications(req.user.id, skip, limit);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getUnreadCount(req, res, next) {
  try {
    const result = await notificationService.getUnreadCount(req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function createNotification(req, res, next) {
  try {
    const { title, message, type } = req.body;
    if (!title || !message) {
      return res.status(422).json({ detail: 'Title and message are required.' });
    }
    const notification = await notificationService.createNotification(
      req.user.id,
      title,
      message,
      type
    );
    return res.status(201).json(notification);
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(req, res, next) {
  try {
    const notification = await notificationService.markAsRead(req.user.id, req.params.id);
    return res.status(200).json(notification);
  } catch (err) {
    next(err);
  }
}

export async function markAllAsRead(req, res, next) {
  try {
    const result = await notificationService.markAllAsRead(req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function deleteNotification(req, res, next) {
  try {
    const result = await notificationService.deleteNotification(req.user.id, req.params.id);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export default {
  listNotifications,
  getUnreadCount,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
