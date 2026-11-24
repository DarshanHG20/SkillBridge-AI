import { ChatService } from '../services/tutorService.js';

export async function createConversation(req, res, next) {
  try {
    const { title, topic } = req.body;
    const conv = await ChatService.createConversation(req.user.id, title, topic);
    return res.status(200).json(conv);
  } catch (err) {
    next(err);
  }
}

export async function listConversations(req, res, next) {
  try {
    const list = await ChatService.listConversations(req.user.id);
    return res.status(200).json(list);
  } catch (err) {
    next(err);
  }
}

export async function getConversation(req, res, next) {
  try {
    const convId = Number(req.params.id);
    if (!Number.isInteger(convId) || convId <= 0) {
      return res.status(400).json({ detail: 'Invalid conversation ID.' });
    }
    const conv = await ChatService.getConversationWithMessages(req.user.id, convId);
    return res.status(200).json(conv);
  } catch (err) {
    next(err);
  }
}

export async function sendMessage(req, res, next) {
  try {
    const convId = Number(req.params.id);
    if (!Number.isInteger(convId) || convId <= 0) {
      return res.status(400).json({ detail: 'Invalid conversation ID.' });
    }
    const { content, use_rag } = req.body;
    if (!content) {
      return res.status(422).json({ detail: 'Message content is required.' });
    }
    const msg = await ChatService.sendMessage(req.user.id, convId, content, !!use_rag);
    return res.status(200).json(msg);
  } catch (err) {
    next(err);
  }
}

export async function deleteConversation(req, res, next) {
  try {
    const convId = Number(req.params.id);
    if (!Number.isInteger(convId) || convId <= 0) {
      return res.status(400).json({ detail: 'Invalid conversation ID.' });
    }
    await ChatService.deleteConversation(req.user.id, convId);
    return res.status(200).json({ message: `Conversation #${convId} deleted successfully.` });
  } catch (err) {
    next(err);
  }
}

export default {
  createConversation,
  listConversations,
  getConversation,
  sendMessage,
  deleteConversation,
};
