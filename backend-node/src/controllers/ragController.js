import RAGService from '../services/ragService.js';
import { Document, DocumentChunk } from '../models/Document.js';

export async function uploadDocument(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ detail: 'No file uploaded.' });
    }

    const title = req.body.title || req.file.originalname;
    const doc = await RAGService.uploadAndIndexDocument(
      req.user.id,
      title,
      req.file.originalname,
      req.file.buffer,
      true
    );

    return res.status(200).json({
      document_id: doc.id,
      title: doc.title,
      filename: doc.filename,
      file_size_bytes: doc.file_size_bytes,
      chunk_count: doc.chunk_count,
      message: 'Document successfully uploaded, processed, and added to the educational index.',
    });
  } catch (err) {
    next(err);
  }
}

export async function listDocuments(req, res, next) {
  try {
    const docs = await Document.find({ is_approved: true }).sort({ id: -1 });
    return res.status(200).json(docs);
  } catch (err) {
    next(err);
  }
}

export async function getDocumentDetail(req, res, next) {
  try {
    const docId = Number(req.params.id);
    if (!Number.isInteger(docId) || docId <= 0) {
      return res.status(400).json({ detail: 'Invalid document ID.' });
    }
    const doc = await Document.findOne({ id: docId });
    if (!doc) {
      return res.status(404).json({ detail: `Document #${docId} not found.` });
    }
    const chunks = await DocumentChunk.find({ document_id: docId }).sort({ chunk_index: 1 });
    const docObj = doc.toJSON();
    docObj.chunks = chunks.map(c => c.toJSON());
    return res.status(200).json(docObj);
  } catch (err) {
    next(err);
  }
}

export async function deleteDocument(req, res, next) {
  try {
    const docId = Number(req.params.id);
    if (!Number.isInteger(docId) || docId <= 0) {
      return res.status(400).json({ detail: 'Invalid document ID.' });
    }
    await RAGService.deleteDocument(docId, req.user);
    return res.status(200).json({ message: `Document #${docId} and its associated index entries have been deleted.` });
  } catch (err) {
    next(err);
  }
}

export async function queryRAG(req, res, next) {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(422).json({ detail: 'Query text is required.' });
    }
    const result = await RAGService.generateGroundedAnswer(query, req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function rebuildIndex(req, res, next) {
  try {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ detail: 'Administrator privileges required.' });
    }
    const count = await RAGService.rebuildIndex();
    return res.status(200).json({ message: `Vector index successfully rebuilt from ${count} database chunks.` });
  } catch (err) {
    next(err);
  }
}

export default {
  uploadDocument,
  listDocuments,
  getDocumentDetail,
  deleteDocument,
  queryRAG,
  rebuildIndex,
};
