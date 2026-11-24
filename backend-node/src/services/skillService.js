import { Skill, SkillPrerequisite, SkillMastery } from '../models/Skill.js';
import { Course, CourseProgress } from '../models/Course.js';
import { LearnerActivity } from '../models/Governance.js';
import NotificationService from './notificationService.js';

export class SkillService {
  static async getAllSkills(category = null) {
    const query = {};
    if (category) {
      const escaped = String(category).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.category = { $regex: new RegExp(`^${escaped}$`, 'i') };
    }
    return Skill.find(query).sort({ category: 1, title: 1 });
  }

  static async getSkillBySlug(slug) {
    const skill = await Skill.findOne({ slug });
    if (!skill) return null;

    const prereqs = await SkillPrerequisite.find({ skill_id: skill.id });
    const prereqSkills = [];
    for (const p of prereqs) {
      const ps = await Skill.findOne({ id: p.prerequisite_skill_id });
      if (ps) {
        prereqSkills.push({
          id: ps.id,
          slug: ps.slug,
          title: ps.title,
          requirement_type: p.requirement_type,
        });
      }
    }

    const obj = skill.toJSON();
    obj.prerequisites = prereqSkills;
    return obj;
  }

  static async getTaxonomyTree(userId = null) {
    const skills = await Skill.find().sort({ category: 1, id: 1 });
    const prereqs = await SkillPrerequisite.find();
    const skillById = new Map(skills.map(sk => [sk.id, sk]));

    let userMasteryMap = {};
    if (userId) {
      const mastery = await SkillMastery.find({ user_id: userId });
      for (const m of mastery) {
        userMasteryMap[m.skill_id] = m;
      }
    }

    return skills.map(s => {
      const skillPrereqs = prereqs
        .filter(p => p.skill_id === s.id)
        .map(p => ({
          prerequisite_skill_id: p.prerequisite_skill_id,
          requirement_type: p.requirement_type,
        }));

      const prerequisiteSlugs = skillPrereqs
        .map(p => skillById.get(p.prerequisite_skill_id)?.slug)
        .filter(Boolean);

      // Unlock rule: All mandatory prerequisites must have mastery >= 0.70
      let isUnlocked = true;
      if (userId && skillPrereqs.length > 0) {
        for (const p of skillPrereqs) {
          if (p.requirement_type === 'mandatory') {
            const prereqMastery = userMasteryMap[p.prerequisite_skill_id];
            if (!prereqMastery || prereqMastery.mastery_score < 0.70) {
              isUnlocked = false;
              break;
            }
          }
        }
      }

      const masteryRecord = userMasteryMap[s.id];
      const masteryScore = masteryRecord ? masteryRecord.mastery_score : 0.0;
      let status = isUnlocked ? 'unlocked' : 'locked';
      if (masteryRecord) {
        status = masteryRecord.status || (masteryScore >= 0.85 ? 'mastered' : masteryScore > 0 ? 'in_progress' : 'unlocked');
      }

      return {
        id: s.id,
        slug: s.slug,
        title: s.title,
        category: s.category,
        difficulty_level: s.difficulty_level,
        description: s.description,
        prerequisites: skillPrereqs,
        prerequisite_slugs: prerequisiteSlugs,
        is_unlocked: isUnlocked,
        mastery_score: masteryScore,
        status: status,
      };
    });
  }

  static async masterAllSkills(userId) {
    const skills = await Skill.find();
    const courses = await Course.find();
    const now = new Date();

    // 1. Bulk update all skill masteries to 1.0 (100% Mastered)
    for (const skill of skills) {
      await SkillMastery.findOneAndUpdate(
        { user_id: userId, skill_id: skill.id },
        {
          user_id: userId,
          skill_id: skill.id,
          mastery_score: 1.0,
          confidence_score: 0.95,
          status: 'mastered',
          last_practiced_at: now,
        },
        { upsert: true, new: true }
      );
    }

    // 2. Bulk update all course progress records to 100% completed
    for (const course of courses) {
      const allLessonIds = [];
      for (const mod of course.modules || []) {
        for (const l of mod.lessons || []) {
          allLessonIds.push(l.lesson_id);
        }
      }

      await CourseProgress.findOneAndUpdate(
        { user_id: userId, course_id: course.id },
        {
          user_id: userId,
          course_id: course.id,
          unlocked: true,
          is_enrolled: true,
          status: 'completed',
          completed_lesson_ids: allLessonIds,
          completion_percentage: 100,
          last_lesson_id: allLessonIds.length > 0 ? allLessonIds[allLessonIds.length - 1] : null,
          enrolled_at: now,
          completed_at: now,
          last_accessed_at: now,
        },
        { upsert: true, new: true }
      );
    }

    await LearnerActivity.create({
      user_id: userId,
      activity_type: 'all_skills_mastered_100',
      metadata_json: {
        total_skills: skills.length,
        total_courses: courses.length,
        mastery_percentage: 100,
      },
    }).catch(() => {});

    await NotificationService.createNotification(
      userId,
      '⚡ All Skills & Courses Mastered 100%!',
      'All 32 technical skills and course curricula have been unlocked and set to 100% mastery.',
      'achievement'
    ).catch(() => {});

    return {
      message: 'All skills and courses unlocked and filled to 100%!',
      total_skills_mastered: skills.length,
      total_courses_completed: courses.length,
      mastery_percentage: 100,
    };
  }

  static async getMyMastery(userId) {
    const masteryRecords = await SkillMastery.find({ user_id: userId });
    const results = [];

    for (const m of masteryRecords) {
      const s = await Skill.findOne({ id: m.skill_id });
      if (!s) continue;

      results.push({
        id: m.id,
        skill_id: m.skill_id,
        skill_slug: s.slug,
        skill_title: s.title,
        category: s.category,
        difficulty_level: s.difficulty_level,
        mastery_score: m.mastery_score,
        confidence_score: m.confidence_score,
        status: m.status,
        last_practiced_at: m.last_practiced_at,
      });
    }

    return results;
  }
}

export default SkillService;
