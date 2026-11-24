import crypto from 'crypto';
import config from '../config/index.js';
import { Document, DocumentChunk } from '../models/Document.js';
import { LLMAdapter } from './aiAdapter.js';

class TFIDFVectorIndex {
  constructor() {
    this.chunks = []; // Array<{ chunk_id, text, termFreqs, norm }>
    this.vocab = new Set();
    this.idf = new Map();
  }

  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);
  }

  buildIndex(chunkList) {
    this.chunks = [];
    this.vocab = new Set();
    this.idf = new Map();

    const docCount = chunkList.length;
    if (docCount === 0) return;

    const docFreq = new Map();

    for (const item of chunkList) {
      const tokens = this.tokenize(item.text);
      const tf = new Map();
      const uniqueTokensInDoc = new Set(tokens);

      for (const t of tokens) {
        tf.set(t, (tf.get(t) || 0) + 1);
        this.vocab.add(t);
      }

      for (const t of uniqueTokensInDoc) {
        docFreq.set(t, (docFreq.get(t) || 0) + 1);
      }

      this.chunks.push({
        chunk_id: item.chunk_id,
        document_id: item.document_id,
        document_title: item.document_title,
        page_number: item.page_number,
        text_content: item.text,
        termFreqs: tf,
      });
    }

    // Compute IDF
    for (const [term, count] of docFreq.entries()) {
      this.idf.set(term, Math.log((1 + docCount) / (1 + count)) + 1);
    }

    // Compute norms
    for (const c of this.chunks) {
      let sumSq = 0;
      for (const [term, freq] of c.termFreqs.entries()) {
        const idfVal = this.idf.get(term) || 1.0;
        const weight = freq * idfVal;
        sumSq += weight * weight;
      }
      c.norm = Math.sqrt(sumSq) || 1.0;
    }
  }

  search(query, topK = 3, minSimilarity = 0.1) {
    if (this.chunks.length === 0) return [];

    const queryTokens = this.tokenize(query);
    const qTf = new Map();
    for (const t of queryTokens) {
      qTf.set(t, (qTf.get(t) || 0) + 1);
    }

    let qSumSq = 0;
    for (const [t, freq] of qTf.entries()) {
      const idfVal = this.idf.get(t) || 1.0;
      const weight = freq * idfVal;
      qSumSq += weight * weight;
    }
    const qNorm = Math.sqrt(qSumSq) || 1.0;

    const scored = [];
    for (const c of this.chunks) {
      let dotProduct = 0;
      for (const [t, qFreq] of qTf.entries()) {
        if (c.termFreqs.has(t)) {
          const cFreq = c.termFreqs.get(t);
          const idfVal = this.idf.get(t) || 1.0;
          dotProduct += (qFreq * idfVal) * (cFreq * idfVal);
        }
      }

      const sim = dotProduct / (qNorm * c.norm);
      if (sim >= minSimilarity) {
        scored.push({
          chunk_id: c.chunk_id,
          document_id: c.document_id,
          document_title: c.document_title,
          page_number: c.page_number,
          text_content: c.text_content,
          similarity_score: Math.round(sim * 1000) / 1000,
        });
      }
    }

    scored.sort((a, b) => b.similarity_score - a.similarity_score);
    return scored.slice(0, topK);
  }
}

export class RAGService {
  static vectorIndex = new TFIDFVectorIndex();
  static isIndexInitialized = false;

  static computeHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  static validateFile(filename, buffer) {
    const ext = filename.split('.').pop().toLowerCase();
    if (!['pdf', 'txt', 'md'].includes(ext)) {
      const err = new Error(`Unsupported file type '.${ext}'. Allowed types are PDF, TXT, and MD.`);
      err.status = 400;
      throw err;
    }
    return ext;
  }

  static chunkText(text, chunkSize = config.ragChunkSize, overlap = config.ragChunkOverlap) {
    const chunks = [];
    const safeChunkSize = Math.max(50, chunkSize);
    const step = Math.max(1, safeChunkSize - Math.max(0, overlap));
    let start = 0;
    const len = text.length;

    while (start < len) {
      const end = Math.min(start + safeChunkSize, len);
      const chunkText = text.slice(start, end).trim();
      if (chunkText.length > 0) {
        chunks.push({
          char_start: start,
          char_end: end,
          text_content: chunkText,
        });
      }
      if (end >= len) break;
      start += step;
    }

    return chunks;
  }

  static async initIndexIfNeeded() {
    if (!this.isIndexInitialized) {
      await this.rebuildIndex();
      this.isIndexInitialized = true;
    }
  }

  static async rebuildIndex() {
    const approvedDocs = await Document.find({ is_approved: true });
    const approvedDocIds = approvedDocs.map(d => d.id);
    const docMap = new Map(approvedDocs.map(d => [d.id, d.title]));

    const chunks = await DocumentChunk.find({ document_id: { $in: approvedDocIds } });

    const chunkItems = chunks.map(c => ({
      chunk_id: c.id,
      document_id: c.document_id,
      document_title: docMap.get(c.document_id) || 'Educational Document',
      page_number: c.page_number,
      text: c.text_content,
    }));

    this.vectorIndex.buildIndex(chunkItems);
    this.isIndexInitialized = true;
    return chunkItems.length;
  }

  static async uploadAndIndexDocument(userId, title, filename, contentBuffer, isApproved = true) {
    const fileType = this.validateFile(filename, contentBuffer);
    const contentHash = this.computeHash(contentBuffer);

    // Check duplicate
    const existing = await Document.findOne({ content_hash: contentHash });
    if (existing) {
      const err = new Error(`This document has already been uploaded as '${existing.title}'.`);
      err.status = 409;
      throw err;
    }

    // Extract text (for TXT / MD, buffer to string; for PDF extract readable text segments)
    let extractedText = '';
    if (fileType === 'txt' || fileType === 'md') {
      extractedText = contentBuffer.toString('utf-8');
    } else {
      const rawLatin = contentBuffer.toString('latin1');
      // Extract PDF text operator literals e.g. (Hello world) Tj / TJ
      const textLiterals = [];
      const litRegex = /\(([^()\\]{3,}(?:\\.[^()\\]*)*)\)\s*(?:Tj|'|")/g;
      let m;
      while ((m = litRegex.exec(rawLatin)) !== null) {
        const cleaned = m[1].replace(/\\([()\\])/g, '$1').replace(/[^\x20-\x7E]/g, ' ').trim();
        if (cleaned.length >= 3) textLiterals.push(cleaned);
      }
      if (textLiterals.length > 0) {
        extractedText = textLiterals.join(' ');
      } else {
        extractedText = rawLatin
          .replace(/%PDF-[\d.]+/g, ' ')
          .replace(/\b\d+\s+\d+\s+obj\b|\bendobj\b|\bstream\b[\s\S]*?\bendstream\b|\bxref\b|\btrailer\b/g, ' ')
          .replace(/[^\x20-\x7E\n]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
      if (extractedText.trim().length < 20) {
        extractedText = `Extracted educational document: ${title || filename}. Foundational pedagogical reference.`;
      }
    }

    const doc = new Document({
      user_id: userId,
      title: title || filename,
      filename: filename,
      file_type: fileType,
      file_size_bytes: contentBuffer.length,
      content_hash: contentHash,
      is_approved: isApproved,
    });
    await doc.save();

    const rawChunks = this.chunkText(extractedText);
    let chunkIndex = 0;
    for (const c of rawChunks) {
      const chunkDoc = new DocumentChunk({
        document_id: doc.id,
        chunk_index: chunkIndex++,
        page_number: 1,
        char_start: c.char_start,
        char_end: c.char_end,
        text_content: c.text_content,
      });
      await chunkDoc.save();
    }

    doc.chunk_count = rawChunks.length;
    await doc.save();

    // Refresh vector index
    await this.rebuildIndex();

    return doc;
  }

  static async retrieveRelevantChunks(query, topK = config.ragTopK) {
    await this.initIndexIfNeeded();
    const matches = this.vectorIndex.search(query, topK, config.ragMinSimilarity);
    return {
      chunks: matches,
      evidence_sufficient: matches.length > 0,
    };
  }

  static async generateGroundedAnswer(userQuery, userId) {
    const retrieval = await this.retrieveRelevantChunks(userQuery, config.ragTopK);
    const chunks = retrieval.chunks;

    let systemPrompt =
      'You are SkillBridge AI Tutor. Synthesize an accurate, grounded pedagogical response based strictly ' +
      'on the provided educational documents. Cite relevant sources.';

    if (chunks.length > 0) {
      systemPrompt +=
        '\n\n<document_context>\n' +
        chunks.map(c => `[Doc: ${c.document_title}, Page: ${c.page_number || 1}]: ${c.text_content}`).join('\n\n') +
        '\n</document_context>';
    }

    const messages = [{ role: 'user', content: userQuery }];
    const completion = await LLMAdapter.completeChat(messages, systemPrompt, userId);

    const sources = chunks.map(c => ({
      document_id: c.document_id,
      document_title: c.document_title,
      page_number: c.page_number,
      snippet: c.text_content.slice(0, 200) + '...',
      relevance_score: c.similarity_score,
    }));

    return {
      query: userQuery,
      answer: completion.content,
      evidence_sufficient: chunks.length > 0,
      is_fallback: completion.is_fallback,
      provider: completion.provider,
      model: completion.model,
      sources,
    };
  }

  static async deleteDocument(documentId, currentUser) {
    const doc = await Document.findOne({ id: documentId });
    if (!doc) {
      const err = new Error(`Document #${documentId} not found.`);
      err.status = 404;
      throw err;
    }

    if (currentUser.role !== 'admin' && currentUser.role !== 'superadmin' && doc.user_id !== currentUser.id) {
      const err = new Error('You do not have permission to delete this document.');
      err.status = 403;
      throw err;
    }

    await DocumentChunk.deleteMany({ document_id: documentId });
    await Document.deleteOne({ id: documentId });
    await this.rebuildIndex();
    return true;
  }
}

export default RAGService;
