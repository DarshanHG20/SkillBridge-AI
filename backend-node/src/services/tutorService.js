import config from '../config/index.js';
import { LLMAdapter } from './aiAdapter.js';
import { ChatConversation, ChatMessage } from '../models/Chat.js';
import { RAGService } from './ragService.js';

export class TutorService {
  static getStatus() {
    const isGeminiLive = config.aiProvider === 'gemini' && Boolean(config.geminiApiKey);
    const isOpenAiLive = config.aiProvider === 'openai' && Boolean(config.openaiApiKey);
    const isLive = isGeminiLive || isOpenAiLive;
    return {
      ai_provider: config.aiProvider,
      is_live_llm: isLive,
      fallback_available: true,
      model_name: isGeminiLive
        ? config.geminiModel
        : (isOpenAiLive ? config.openaiModel : 'deterministic_fallback'),
      daily_rate_limit: config.tutorDailyRateLimit,
    };
  }

  static async queryTutor(userId, prompt, skillContext = null) {
    let systemPrompt =
      'You are SkillBridge AI Tutor, a patient, encouraging educational mentor. ' +
      'Explain concepts clearly, provide practical examples, and guide students with constructive hints.';
    if (skillContext) {
      systemPrompt += ` The current study context is '${skillContext}'.`;
    }

    const messages = [{ role: 'user', content: prompt }];
    return LLMAdapter.completeChat(messages, systemPrompt, userId);
  }
}

export class ChatService {
  static async createConversation(userId, title = 'New Tutoring Session', topic = 'general') {
    const conv = new ChatConversation({
      user_id: userId,
      title: title || 'New Tutoring Session',
      topic: topic || 'general',
    });
    await conv.save();
    return conv;
  }

  static async listConversations(userId) {
    return ChatConversation.find({ user_id: userId }).sort({ updated_at: -1 });
  }

  static async getConversationWithMessages(userId, conversationId) {
    const conv = await ChatConversation.findOne({ id: conversationId, user_id: userId });
    if (!conv) {
      const err = new Error(`Conversation #${conversationId} not found.`);
      err.status = 404;
      throw err;
    }

    const messages = await ChatMessage.find({ conversation_id: conversationId }).sort({ id: 1 });
    const convObj = conv.toJSON();
    convObj.messages = messages;
    return convObj;
  }

  static async sendMessage(userId, conversationId, messageText, useRag = false) {
    const conv = await ChatConversation.findOne({ id: conversationId, user_id: userId });
    if (!conv) {
      const err = new Error(`Conversation #${conversationId} not found.`);
      err.status = 404;
      throw err;
    }

    // Save user message
    const userMsg = new ChatMessage({
      conversation_id: conversationId,
      sender: 'user',
      message_text: messageText,
    });
    await userMsg.save();

    // Grounding / Context
    let ragCitations = null;
    let systemPrompt =
      'You are SkillBridge AI Tutor, an adaptive, encouraging pedagogical tutor. ' +
      'Guide the learner towards deep understanding without giving away direct answers immediately.';

    if (useRag) {
      const ragResult = await RAGService.retrieveRelevantChunks(messageText, 3);
      if (ragResult.chunks && ragResult.chunks.length > 0) {
        systemPrompt +=
          '\n\nUse the following verified educational document excerpts to ground your pedagogical response:\n' +
          ragResult.chunks
            .map(c => `<document_context title="${c.document_title}">\n${c.text_content}\n</document_context>`)
            .join('\n\n');
        ragCitations = ragResult.chunks.map(c => ({
          document_id: c.document_id,
          document_title: c.document_title,
          page_number: c.page_number,
          snippet: c.text_content.slice(0, 200) + '...',
          relevance_score: c.similarity_score,
        }));
      }
    }

    // Fetch conversation message history (latest 10 messages in chronological order)
    const recentDesc = await ChatMessage.find({ conversation_id: conversationId })
      .sort({ id: -1 })
      .limit(10);
    const history = recentDesc.reverse();
    const messages = history.map(h => ({
      role: h.sender === 'assistant' ? 'assistant' : 'user',
      content: h.message_text,
    }));

    // Complete chat
    const completion = await LLMAdapter.completeChat(messages, systemPrompt, userId);

    // Save assistant reply
    const assistantMsg = new ChatMessage({
      conversation_id: conversationId,
      sender: 'assistant',
      message_text: completion.content,
      sources_json: ragCitations,
      is_fallback: completion.is_fallback,
    });
    await assistantMsg.save();

    // Update conversation timestamp
    conv.updated_at = new Date();
    await conv.save();

    return assistantMsg;
  }

  static async deleteConversation(userId, conversationId) {
    const conv = await ChatConversation.findOne({ id: conversationId, user_id: userId });
    if (!conv) {
      const err = new Error(`Conversation #${conversationId} not found.`);
      err.status = 404;
      throw err;
    }

    await ChatMessage.deleteMany({ conversation_id: conversationId });
    await ChatConversation.deleteOne({ id: conversationId });
    return true;
  }
}

export default {
  TutorService,
  ChatService,
};
