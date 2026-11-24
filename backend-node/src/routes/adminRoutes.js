import express from 'express';
import adminController from '../controllers/adminController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate, requireAdmin);

// 1. Users
router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUserDetail);
router.patch('/users/:id/status', adminController.updateUserStatus);
router.patch('/users/:id/role', adminController.updateUserRole);

// 2. Taxonomy & Curriculum
router.post('/skills', adminController.createSkill);
router.delete('/skills/:id', adminController.deleteSkill);

router.post('/assessments', adminController.createAssessment);
router.delete('/assessments/:id', adminController.deleteAssessment);

router.post('/assessments/:id/questions', adminController.addQuestion);
router.delete('/questions/:id', adminController.deleteQuestion);

router.post('/careers', adminController.createCareer);
router.delete('/careers/:id', adminController.deleteCareer);

router.post('/projects', adminController.createProjectTemplate);
router.delete('/projects/:id', adminController.deleteProjectTemplate);

// 3. Document Approval
router.get('/documents', adminController.listDocuments);
router.patch('/documents/:id/approval', adminController.setDocumentApproval);

// 4. Feedback
router.get('/feedback', adminController.listFeedback);
router.patch('/feedback/:id/status', adminController.updateFeedbackStatus);

// 5. Analytics & Audit
router.get('/analytics', adminController.getAnalytics);
router.get('/audit-logs', adminController.getAuditLogs);

// 6. CSV Exports
router.get('/export/:type.csv', adminController.exportCsv);

export default router;
