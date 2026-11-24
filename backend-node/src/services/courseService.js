import { Course, CourseProgress } from '../models/Course.js';
import { User } from '../models/User.js';
import { Skill, SkillMastery } from '../models/Skill.js';
import { Assessment, Question } from '../models/Assessment.js';
import { LearnerActivity } from '../models/Governance.js';
import NotificationService from './notificationService.js';

function escapeRegex(str) {
  return String(str).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findCourseByParam(courseIdOrSlug) {
  const raw = String(courseIdOrSlug || '').trim();
  if (/^\d+$/.test(raw)) {
    const byId = await Course.findOne({ id: Number(raw) });
    if (byId) return byId;
  }
  return Course.findOne({ slug: raw.toLowerCase() });
}

function countCourseLessons(course) {
  const modules = Array.isArray(course.modules) ? course.modules : [];
  let totalLessons = 0;
  for (const mod of modules) {
    totalLessons += Array.isArray(mod.lessons) ? mod.lessons.length : 0;
  }
  return totalLessons;
}

export class CourseService {
  static async listCourses(userId = null, category = null, difficulty = null) {
    const query = {};
    if (category && category !== 'All') {
      query.category = { $regex: new RegExp(`^${escapeRegex(category)}$`, 'i') };
    }
    if (difficulty) {
      query.difficulty_level = String(difficulty).trim().toLowerCase();
    }

    const courses = await Course.find(query).sort({ id: 1 });
    const progressMap = new Map();

    if (userId) {
      const progressRecords = await CourseProgress.find({ user_id: userId });
      for (const p of progressRecords) {
        progressMap.set(p.course_id, p);
      }
    }

    const results = [];
    for (const course of courses) {
      const prog = progressMap.get(course.id);
      const totalLessons = countCourseLessons(course);
      const completedLessonIds = prog ? (prog.completed_lesson_ids || []) : [];
      const completionPct = prog
        ? (totalLessons > 0 ? Math.min(100, Math.round((completedLessonIds.length / totalLessons) * 100)) : prog.completion_percentage || 0)
        : 0;

      let questionCount = 0;
      if (course.assessment_id) {
        questionCount = await Question.countDocuments({ assessment_id: course.assessment_id });
      }

      results.push({
        id: course.id,
        slug: course.slug,
        title: course.title,
        subtitle: course.subtitle,
        description: course.description,
        category: course.category,
        difficulty_level: course.difficulty_level,
        estimated_hours: course.estimated_hours,
        skill_id: course.skill_id,
        assessment_id: course.assessment_id,
        quiz_question_count: questionCount,
        modules_count: Array.isArray(course.modules) ? course.modules.length : 0,
        total_lessons_count: totalLessons,
        // All courses are unlocked by default for registered learners
        is_unlocked: true,
        is_locked: false,
        is_enrolled: !!(prog && prog.is_enrolled),
        status: prog ? prog.status : 'unlocked',
        completion_percentage: completionPct,
        completed_lessons_count: completedLessonIds.length,
        completed_lesson_ids: completedLessonIds,
        last_lesson_id: prog ? prog.last_lesson_id : null,
        enrolled_at: prog ? prog.enrolled_at : null,
        completed_at: prog ? prog.completed_at : null,
      });
    }

    return results;
  }

  static async getCourseDetail(courseIdOrSlug, userId = null) {
    const course = await findCourseByParam(courseIdOrSlug);
    if (!course) {
      const err = new Error(`Course '${courseIdOrSlug}' not found.`);
      err.status = 404;
      throw err;
    }

    const prog = userId
      ? await CourseProgress.findOne({ user_id: userId, course_id: course.id })
      : null;

    const completedSet = new Set(prog ? (prog.completed_lesson_ids || []) : []);
    const rawModules = Array.isArray(course.modules) ? course.modules : [];
    let totalLessons = 0;

    const modules = rawModules.map(mod => {
      const lessons = (mod.lessons || []).map(l => {
        totalLessons += 1;
        return {
          lesson_id: l.lesson_id,
          title: l.title,
          order: l.order,
          duration_minutes: l.duration_minutes,
          content: l.content,
          code_example: l.code_example || '',
          key_takeaways: l.key_takeaways || [],
          is_completed: completedSet.has(l.lesson_id),
        };
      });

      const modCompleted = lessons.filter(l => l.is_completed).length;
      return {
        module_id: mod.module_id,
        title: mod.title,
        order: mod.order,
        description: mod.description || '',
        lessons_count: lessons.length,
        completed_lessons_count: modCompleted,
        lessons,
      };
    });

    const completionPct =
      totalLessons > 0 ? Math.min(100, Math.round((completedSet.size / totalLessons) * 100)) : 0;

    let linkedAssessment = null;
    if (course.assessment_id) {
      const asm = await Assessment.findOne({ id: course.assessment_id });
      if (asm) {
        const qCount = await Question.countDocuments({ assessment_id: asm.id });
        linkedAssessment = {
          id: asm.id,
          title: asm.title,
          description: asm.description,
          pass_percentage: asm.pass_percentage,
          time_limit_minutes: asm.time_limit_minutes,
          question_count: qCount,
        };
      }
    }

    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      subtitle: course.subtitle,
      description: course.description,
      category: course.category,
      difficulty_level: course.difficulty_level,
      estimated_hours: course.estimated_hours,
      skill_id: course.skill_id,
      assessment_id: course.assessment_id,
      assessment: linkedAssessment,
      is_unlocked: true,
      is_locked: false,
      is_enrolled: !!(prog && prog.is_enrolled),
      status: prog ? prog.status : 'unlocked',
      completion_percentage: prog ? completionPct : 0,
      completed_lessons_count: completedSet.size,
      total_lessons_count: totalLessons,
      completed_lesson_ids: Array.from(completedSet),
      last_lesson_id: prog ? prog.last_lesson_id : null,
      enrolled_at: prog ? prog.enrolled_at : null,
      completed_at: prog ? prog.completed_at : null,
      modules,
    };
  }

  static async enrollInCourse(userId, courseIdOrSlug) {
    const course = await findCourseByParam(courseIdOrSlug);
    if (!course) {
      const err = new Error(`Course '${courseIdOrSlug}' not found.`);
      err.status = 404;
      throw err;
    }

    const user = await User.findOne({ id: userId });
    let prog = await CourseProgress.findOne({ user_id: userId, course_id: course.id });

    if (!prog) {
      prog = new CourseProgress({
        user_id: userId,
        user_ref: user ? user._id : null,
        course_id: course.id,
        course_ref: course._id,
        unlocked: true,
        is_enrolled: true,
        status: 'in_progress',
        completed_lesson_ids: [],
        completion_percentage: 0,
        enrolled_at: new Date(),
        last_accessed_at: new Date(),
      });
      await prog.save();

      await LearnerActivity.create({
        user_id: userId,
        activity_type: 'course_enrolled',
        metadata_json: {
          course_id: course.id,
          course_title: course.title,
          category: course.category,
        },
      }).catch(() => {});
    } else {
      prog.unlocked = true;
      prog.is_enrolled = true;
      if (prog.status === 'unlocked') {
        prog.status = 'in_progress';
      }
      prog.last_accessed_at = new Date();
      await prog.save();
    }

    return this.getCourseDetail(course.id, userId);
  }

  static async completeLesson(userId, courseIdOrSlug, lessonId, completed = true) {
    const course = await findCourseByParam(courseIdOrSlug);
    if (!course) {
      const err = new Error(`Course '${courseIdOrSlug}' not found.`);
      err.status = 404;
      throw err;
    }

    const allLessons = [];
    for (const mod of course.modules || []) {
      for (const l of mod.lessons || []) {
        allLessons.push(l);
      }
    }

    const targetLesson = allLessons.find(l => l.lesson_id === lessonId);
    if (!targetLesson) {
      const err = new Error(`Lesson '${lessonId}' not found in course '${course.title}'.`);
      err.status = 404;
      throw err;
    }

    const user = await User.findOne({ id: userId });
    let prog = await CourseProgress.findOne({ user_id: userId, course_id: course.id });
    if (!prog) {
      prog = new CourseProgress({
        user_id: userId,
        user_ref: user ? user._id : null,
        course_id: course.id,
        course_ref: course._id,
        unlocked: true,
        is_enrolled: true,
        status: 'in_progress',
        completed_lesson_ids: [],
        enrolled_at: new Date(),
      });
    }

    const completedSet = new Set(prog.completed_lesson_ids || []);
    const wasCompleted = completedSet.has(lessonId);
    if (completed) {
      completedSet.add(lessonId);
    } else {
      completedSet.delete(lessonId);
    }

    const totalLessons = allLessons.length;
    const completionPct =
      totalLessons > 0 ? Math.min(100, Math.round((completedSet.size / totalLessons) * 100)) : 0;

    prog.unlocked = true;
    prog.is_enrolled = true;
    prog.completed_lesson_ids = Array.from(completedSet);
    prog.last_lesson_id = lessonId;
    prog.completion_percentage = completionPct;
    prog.last_accessed_at = new Date();
    if (completionPct >= 100) {
      prog.status = 'completed';
      prog.completed_at = prog.completed_at || new Date();
    } else {
      prog.status = 'in_progress';
      prog.completed_at = null;
    }

    await prog.save();

    // Update linked SkillMastery gently when completing lessons (never lowering existing mastery)
    if (completed && course.skill_id) {
      const targetMastery = Math.round(Math.min(0.85, (completionPct / 100) * 0.75) * 1000) / 1000;
      const existingMastery = await SkillMastery.findOne({ user_id: userId, skill_id: course.skill_id });
      if (!existingMastery) {
        const skillExists = await Skill.findOne({ id: course.skill_id });
        if (skillExists) {
          await SkillMastery.create({
            user_id: userId,
            skill_id: course.skill_id,
            mastery_score: targetMastery,
            confidence_score: 0.65,
            status: targetMastery >= 0.85 ? 'mastered' : 'in_progress',
            last_practiced_at: new Date(),
          });
        }
      } else if (existingMastery.mastery_score < targetMastery) {
        existingMastery.mastery_score = targetMastery;
        existingMastery.status = existingMastery.mastery_score >= 0.85 ? 'mastered' : 'in_progress';
        existingMastery.last_practiced_at = new Date();
        await existingMastery.save();
      }
    }

    if (completed && !wasCompleted) {
      await LearnerActivity.create({
        user_id: userId,
        activity_type: completionPct >= 100 ? 'course_completed' : 'lesson_completed',
        metadata_json: {
          course_id: course.id,
          course_title: course.title,
          lesson_id: lessonId,
          lesson_title: targetLesson.title,
          completion_percentage: completionPct,
        },
      }).catch(() => {});

      if (completionPct >= 100) {
        await NotificationService.createNotification(
          userId,
          `🏆 Course Completed: ${course.title}!`,
          `Congratulations! You completed 100% of the lessons in ${course.title}.`,
          'course_completed'
        ).catch(() => {});
      } else {
        await NotificationService.createNotification(
          userId,
          `📖 Lesson Completed: ${targetLesson.title}`,
          `Great progress! You completed "${targetLesson.title}" in ${course.title}.`,
          'lesson_completed'
        ).catch(() => {});
      }
    }

    return {
      course_id: course.id,
      slug: course.slug,
      title: course.title,
      lesson_id: lessonId,
      lesson_title: targetLesson.title,
      completed: completedSet.has(lessonId),
      is_unlocked: true,
      is_locked: false,
      is_enrolled: true,
      status: prog.status,
      completed_lesson_ids: prog.completed_lesson_ids,
      completed_lessons_count: prog.completed_lesson_ids.length,
      total_lessons_count: totalLessons,
      completion_percentage: completionPct,
      last_lesson_id: prog.last_lesson_id,
    };
  }
}

export default CourseService;

