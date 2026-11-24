import express from 'express';
import multer from 'multer';
import ragController from '../controllers/ragController.js';
import { authenticate } from '../middleware/auth.js';
import config from '../config/index.js';

const router = express.Router();
const upload = multer({
  limits: { fileSize: config.ragMaxFileSizeBytes },
});

router.use(authenticate);

router.post('/documents/upload', upload.single('file'), ragController.uploadDocument);
router.get('/documents', ragController.listDocuments);
router.get('/documents/:id', ragController.getDocumentDetail);
router.delete('/documents/:id', ragController.deleteDocument);
router.post('/query', ragController.queryRAG);
router.post('/rebuild-index', ragController.rebuildIndex);

export default router;
