import express from 'express';
import courseController from '../controllers/courseController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', optionalAuth, courseController.listCourses);
router.get('/:id', optionalAuth, courseController.getCourseDetail);
router.post('/:id/enroll', authenticate, courseController.enrollInCourse);
router.post('/:id/lessons/:lessonId/complete', authenticate, courseController.completeLesson);

export default router;

