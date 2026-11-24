import mongoose from 'mongoose';
import { attachAutoIncrement } from './Counter.js';

// 1. Document
const documentSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, sparse: true, index: true },
    user_id: { type: Number, default: null, index: true },
    title: { type: String, required: true, index: true },
    filename: { type: String, required: true },
    file_type: { type: String, required: true }, // 'pdf', 'txt', 'md'
    file_size_bytes: { type: Number, required: true },
    content_hash: { type: String, required: true, index: true },
    is_approved: { type: Boolean, default: true },
    chunk_count: { type: Number, default: 0 },
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

attachAutoIncrement(documentSchema, 'documents');

export const Document =
  mongoose.models.Document || mongoose.model('Document', documentSchema);

// 2. DocumentChunk
const documentChunkSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, sparse: true, index: true },
    document_id: { type: Number, required: true, index: true },
    chunk_index: { type: Number, required: true },
    page_number: { type: Number, default: null },
    char_start: { type: Number, required: true },
    char_end: { type: Number, required: true },
    text_content: { type: String, required: true },
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

attachAutoIncrement(documentChunkSchema, 'document_chunks');

export const DocumentChunk =
  mongoose.models.DocumentChunk || mongoose.model('DocumentChunk', documentChunkSchema);

export default {
  Document,
  DocumentChunk,
};
