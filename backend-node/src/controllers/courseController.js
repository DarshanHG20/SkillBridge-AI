import CourseService from '../services/courseService.js';

export async function listCourses(req, res, next) {
  try {
    const userId = req.user ? req.user.id : null;
    const { category, difficulty } = req.query;
    const courses = await CourseService.listCourses(userId, category || null, difficulty || null);
    return res.status(200).json(courses);
  } catch (err) {
    next(err);
  }
}

export async function getCourseDetail(req, res, next) {
  try {
    const userId = req.user ? req.user.id : null;
    const course = await CourseService.getCourseDetail(req.params.id, userId);
    return res.status(200).json(course);
  } catch (err) {
    next(err);
  }
}

export async function enrollInCourse(req, res, next) {
  try {
    const course = await CourseService.enrollInCourse(req.user.id, req.params.id);
    return res.status(200).json(course);
  } catch (err) {
    next(err);
  }
}

export async function completeLesson(req, res, next) {
  try {
    const completed = req.body?.completed !== undefined ? Boolean(req.body.completed) : true;
    const result = await CourseService.completeLesson(
      req.user.id,
      req.params.id,
      req.params.lessonId,
      completed
    );
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export default {
  listCourses,
  getCourseDetail,
  enrollInCourse,
  completeLesson,
};

