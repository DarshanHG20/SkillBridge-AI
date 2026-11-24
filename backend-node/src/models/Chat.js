import mongoose from 'mongoose';
import { attachAutoIncrement } from './Counter.js';

// 1. ChatConversation
const chatConversationSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, sparse: true, index: true },
    user_id: { type: Number, required: true, index: true },
    title: { type: String, default: 'New Tutoring Session' },
    topic: { type: String, default: 'general' },
  },
  {
    id: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

attachAutoIncrement(chatConversationSchema, 'chat_conversations');

export const ChatConversation =
  mongoose.models.ChatConversation ||
  mongoose.model('ChatConversation', chatConversationSchema);

// 2. ChatMessage
const chatMessageSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, sparse: true, index: true },
    conversation_id: { type: Number, required: true, index: true },
    sender: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    message_text: { type: String, required: true },
    sources_json: { type: Array, default: null },
    is_fallback: { type: Boolean, default: false },
  },
  {
    id: false,
    timestamps: { createdAt: 'created_at', updatedAt: false },
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

attachAutoIncrement(chatMessageSchema, 'chat_messages');

export const ChatMessage =
  mongoose.models.ChatMessage || mongoose.model('ChatMessage', chatMessageSchema);

export default {
  ChatConversation,
  ChatMessage,
};
