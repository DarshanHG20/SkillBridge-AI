import { Feedback } from '../models/Governance.js';

const ALLOWED_CATEGORIES = new Set([
  'content',
  'bug',
  'suggestion',
  'general',
  'content_issue',
  'feature_request',
  'content_quality',
  'ui_ux',
]);

export async function submitFeedback(req, res, next) {
  try {
    const rawTitle = req.body.title ?? req.body.subject;
    const { category, message, rating } = req.body;
    if (!rawTitle || !String(rawTitle).trim() || !message || !String(message).trim()) {
      return res.status(422).json({ detail: 'Title and message are required.' });
    }

    const cat = category ? String(category).trim() : 'general';
    if (!ALLOWED_CATEGORIES.has(cat)) {
      return res.status(422).json({ detail: `Unsupported feedback category '${cat}'.` });
    }

    const feedback = new Feedback({
      user_id: req.user.id,
      category: cat,
      title: String(rawTitle).trim(),
      message: String(message).trim(),
      rating: rating !== undefined && rating !== null ? Number(rating) : null,
      status: 'pending',
    });
    await feedback.save();

    return res.status(201).json(feedback);
  } catch (err) {
    next(err);
  }
}

export async function listMyFeedback(req, res, next) {
  try {
    const items = await Feedback.find({ user_id: req.user.id }).sort({ created_at: -1 });
    return res.status(200).json(items);
  } catch (err) {
    next(err);
  }
}

export default {
  submitFeedback,
  listMyFeedback,
};
