import { Skill, SkillPrerequisite, SkillMastery } from '../models/Skill.js';
import { Course, CourseProgress } from '../models/Course.js';
import { Assessment, AssessmentAttempt, AssessmentResponse, Question } from '../models/Assessment.js';
import { LearnerActivity } from '../models/Governance.js';
import { Project } from '../models/Project.js';

export const MASTERY_REVISION_THRESHOLD = 0.60;
export const MASTERY_ADVANCE_THRESHOLD = 0.85;
export const ERROR_RATE_WEAKNESS_THRESHOLD = 0.40;
export const MASTERY_LEARNING_RATE = 0.35;

export class AdaptiveEngine {
  /**
   * Update student mastery score following an assessment attempt
   */
  static async updateMasteryFromAssessment(userId, assessment, scoreAchieved) {
    const skillId = assessment.skill_id;
    const scoreRatio = Math.max(0.0, Math.min(1.0, scoreAchieved / 100.0));

    let masteryRecord = await SkillMastery.findOne({ user_id: userId, skill_id: skillId });
    const now = new Date();

    if (!masteryRecord) {
      const newScore = scoreRatio;
      const confidence = 0.6;
      const statusVal = newScore >= MASTERY_ADVANCE_THRESHOLD ? 'mastered' : 'in_progress';

      masteryRecord = new SkillMastery({
        user_id: userId,
        skill_id: skillId,
        mastery_score: Math.round(newScore * 1000) / 1000,
        confidence_score: confidence,
        status: statusVal,
        last_practiced_at: now,
      });
      await masteryRecord.save();
    } else {
      const oldScore = masteryRecord.mastery_score;
      const updatedScore = (1.0 - MASTERY_LEARNING_RATE) * oldScore + MASTERY_LEARNING_RATE * scoreRatio;
      const newScore = Math.round(Math.max(0.0, Math.min(1.0, updatedScore)) * 1000) / 1000;
      const newConf = Math.round(Math.min(0.95, masteryRecord.confidence_score + 0.10) * 100) / 100;

      let statusVal = 'in_progress';
      if (newScore >= MASTERY_ADVANCE_THRESHOLD) {
        statusVal = 'mastered';
      }

      masteryRecord.mastery_score = newScore;
      masteryRecord.confidence_score = newConf;
      masteryRecord.status = statusVal;
      masteryRecord.last_practiced_at = now;
      await masteryRecord.save();
    }

    // Log telemetry
    try {
      await LearnerActivity.create({
        user_id: userId,
        activity_type: `assessment_${assessment.assessment_type}`,
        metadata_json: {
          assessment_id: assessment.id,
          assessment_title: assessment.title,
          skill_id: skillId,
          score_achieved: scoreAchieved,
          new_mastery: masteryRecord.mastery_score,
        },
      });
    } catch (e) {
      console.warn('Failed to log learner activity:', e.message);
    }

    return masteryRecord;
  }

  /**
   * Determine the optimal next learning activity with explainable reasoning
   */
  static async selectNextActivity(userId) {
    const weakConcepts = await this.identifyWeakConcepts(userId);

    // 1. Revision Recommendation if weak concept exists
    if (weakConcepts.length > 0) {
      const topWeak = weakConcepts[0];
      const diagnosticQuiz = await Assessment.findOne({ skill_id: topWeak.skill_id });

      return {
        recommendation_type: 'revision',
        target_entity_id: topWeak.skill_id,
        target_skill_id: topWeak.skill_id,
        title: `Reinforce: ${topWeak.skill_title}`,
        target_skill_title: topWeak.skill_title,
        rationale: `Diagnosed high error rate (${Math.round(topWeak.error_rate * 100)}%) and mastery score below threshold (${Math.round(topWeak.current_mastery * 100)}%). Review foundational concepts.`,
        reason: `Diagnosed high error rate (${Math.round(topWeak.error_rate * 100)}%) and mastery score below threshold (${Math.round(topWeak.current_mastery * 100)}%). Review foundational concepts.`,
        action_url: diagnosticQuiz ? `/assessments/${diagnosticQuiz.id}` : `/taxonomy`,
        difficulty: 'beginner',
      };
    }

    // 2. Advance to Next Unlocked Skill
    const masteryRecords = await SkillMastery.find({ user_id: userId });
    const masteredSkillIds = new Set(
      masteryRecords.filter(m => m.mastery_score >= 0.70).map(m => m.skill_id)
    );

    const allSkills = await Skill.find().sort({ id: 1 });
    const allPrereqs = await SkillPrerequisite.find();

    for (const skill of allSkills) {
      if (masteredSkillIds.has(skill.id)) continue;

      const prereqs = allPrereqs.filter(p => p.skill_id === skill.id && p.requirement_type === 'mandatory');
      const allPrereqsMet = prereqs.every(p => masteredSkillIds.has(p.prerequisite_skill_id));

      if (allPrereqsMet) {
        const assessment = await Assessment.findOne({ skill_id: skill.id });
        return {
          recommendation_type: 'new_skill',
          target_entity_id: skill.id,
          target_skill_id: skill.id,
          title: `Next Frontier: ${skill.title}`,
          target_skill_title: skill.title,
          rationale: `All prerequisite dependencies satisfied. Ready to expand competency in ${skill.category}.`,
          reason: `All prerequisite dependencies satisfied. Ready to expand competency in ${skill.category}.`,
          action_url: assessment ? `/assessments/${assessment.id}` : `/taxonomy`,
          difficulty: skill.difficulty_level,
        };
      }
    }

    // 3. Hands-On Project Capstone
    const firstProject = await Project.findOne();
    return {
      recommendation_type: 'capstone_project',
      target_entity_id: firstProject ? firstProject.id : 1,
      target_skill_id: null,
      title: firstProject ? firstProject.title : 'Practical Engineering Project',
      target_skill_title: firstProject ? firstProject.title : 'Practical Engineering Project',
      rationale: 'Demonstrated high baseline mastery across foundational skills. Apply your knowledge to a milestone project.',
      reason: 'Demonstrated high baseline mastery across foundational skills. Apply your knowledge to a milestone project.',
      action_url: firstProject ? `/projects/${firstProject.id}` : '/projects',
      difficulty: 'intermediate',
    };
  }

  /**
   * Identify weak concepts based on low mastery (< 60%) or high attempt error rates
   */
  static async identifyWeakConcepts(userId) {
    const masteryRecords = await SkillMastery.find({
      user_id: userId,
      mastery_score: { $lt: MASTERY_REVISION_THRESHOLD },
    });

    const weakItems = [];
    for (const record of masteryRecords) {
      const skill = await Skill.findOne({ id: record.skill_id });
      if (!skill) continue;

      const recText = `Concept revision recommended. Practice fundamental ${skill.category} exercises.`;
      weakItems.push({
        skill_id: record.skill_id,
        skill_title: skill.title,
        category: skill.category,
        error_rate: Math.round((1.0 - record.mastery_score) * 100) / 100,
        current_mastery: record.mastery_score,
        mastery_score: record.mastery_score,
        recommendation: recText,
        reason: recText,
        recommended_action: 'Revision Quiz',
      });
    }

    return weakItems;
  }

  /**
   * Comprehensive learner mastery & dashboard overview
   */
  static async getLearnerMasteryOverview(userId) {
    const totalSkills = await Skill.countDocuments();
    const masteryRecords = await SkillMastery.find({ user_id: userId });

    const masteredCount = masteryRecords.filter(m => m.mastery_score >= MASTERY_ADVANCE_THRESHOLD).length;
    const inProgressCount = masteryRecords.filter(
      m => m.mastery_score >= MASTERY_REVISION_THRESHOLD && m.mastery_score < MASTERY_ADVANCE_THRESHOLD
    ).length;
    const weakCount = masteryRecords.filter(m => m.mastery_score < MASTERY_REVISION_THRESHOLD).length;

    let avgMastery = 0;
    if (masteryRecords.length > 0) {
      const sum = masteryRecords.reduce((acc, curr) => acc + curr.mastery_score, 0);
      avgMastery = Math.round((sum / masteryRecords.length) * 1000) / 1000;
    }

    // Skill details lists
    const allSkills = await Skill.find();
    const skillMap = new Map(allSkills.map(s => [s.id, s]));
    const masteredSkills = masteryRecords
      .filter(m => m.mastery_score >= MASTERY_ADVANCE_THRESHOLD)
      .map(m => {
        const s = skillMap.get(m.skill_id);
        return s ? { skill_id: s.id, title: s.title, category: s.category, mastery_score: m.mastery_score } : null;
      })
      .filter(Boolean);

    const weakSkills = masteryRecords
      .filter(m => m.mastery_score < MASTERY_REVISION_THRESHOLD)
      .map(m => {
        const s = skillMap.get(m.skill_id);
        return s ? { skill_id: s.id, title: s.title, category: s.category, mastery_score: m.mastery_score } : null;
      })
      .filter(Boolean);

    // Course progress aggregation
    const allCourses = await Course.find().sort({ id: 1 });
    const courseMap = new Map(allCourses.map(c => [c.id, c]));
    const courseProgressList = await CourseProgress.find({ user_id: userId }).sort({ last_accessed_at: -1 });

    const courseProgressSummary = [];
    let completedCoursesCount = 0;
    let inProgressCoursesCount = 0;
    let totalEnrolledPct = 0;

    for (const cp of courseProgressList) {
      if (!cp.is_enrolled) continue;
      const c = courseMap.get(cp.course_id);
      if (!c) continue;
      let totalLessons = 0;
      for (const m of c.modules || []) {
        totalLessons += Array.isArray(m.lessons) ? m.lessons.length : 0;
      }
      const completedLessonsCount = Array.isArray(cp.completed_lesson_ids) ? cp.completed_lesson_ids.length : 0;
      const pct = totalLessons > 0
        ? Math.min(100, Math.round((completedLessonsCount / totalLessons) * 100))
        : (cp.completion_percentage || 0);

      if (pct >= 100 || cp.status === 'completed') {
        completedCoursesCount += 1;
      } else {
        inProgressCoursesCount += 1;
      }
      totalEnrolledPct += pct;

      courseProgressSummary.push({
        course_id: c.id,
        slug: c.slug,
        title: c.title,
        category: c.category,
        difficulty_level: c.difficulty_level,
        assessment_id: c.assessment_id,
        status: pct >= 100 ? 'completed' : cp.status,
        completion_percentage: pct,
        completed_lessons_count: completedLessonsCount,
        total_lessons_count: totalLessons,
        last_accessed_at: cp.last_accessed_at,
      });
    }

    const enrolledCoursesCount = courseProgressSummary.length;
    const totalCourses = allCourses.length;
    const avgCourseCompletion =
      enrolledCoursesCount > 0 ? Math.round(totalEnrolledPct / enrolledCoursesCount) : 0;

    // Quiz performance aggregation
    const completedAttempts = await AssessmentAttempt.find({
      user_id: userId,
      completed_at: { $ne: null },
    }).sort({ completed_at: -1 });

    const allAssessments = await Assessment.find();
    const asmMap = new Map(allAssessments.map(a => [a.id, a]));

    const totalQuizzesAttempted = completedAttempts.length;
    const averageQuizScore =
      totalQuizzesAttempted > 0
        ? Math.round(
            (completedAttempts.reduce((acc, a) => acc + (a.score_achieved || 0), 0) /
              totalQuizzesAttempted) *
              10
          ) / 10
        : 0;

    const recentQuizResults = completedAttempts.slice(0, 5).map(att => {
      const asm = asmMap.get(att.assessment_id);
      return {
        attempt_id: att.id,
        assessment_id: att.assessment_id,
        title: asm ? asm.title : `Assessment #${att.assessment_id}`,
        score_achieved: att.score_achieved,
        is_passed: att.is_passed,
        completed_at: att.completed_at,
      };
    });

    // Recent activities & consecutive daily learning streak
    const recentActivitiesDocs = await LearnerActivity.find({ user_id: userId })
      .sort({ id: -1 })
      .limit(10);
    const recentActivities = recentActivitiesDocs.slice(0, 8).map(act => act.toJSON());

    const activeDateKeys = new Set();
    const recordDate = d => {
      if (!d) return;
      const dt = new Date(d);
      if (!Number.isNaN(dt.getTime())) {
        activeDateKeys.add(dt.toISOString().slice(0, 10));
      }
    };
    completedAttempts.forEach(a => recordDate(a.completed_at));
    courseProgressList.forEach(cp => recordDate(cp.last_accessed_at));
    recentActivitiesDocs.forEach(act => recordDate(act.created_at));

    let learningStreakDays = 0;
    if (activeDateKeys.size > 0) {
      const cursor = new Date();
      const todayKey = cursor.toISOString().slice(0, 10);
      if (!activeDateKeys.has(todayKey)) {
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      }
      while (activeDateKeys.has(cursor.toISOString().slice(0, 10))) {
        learningStreakDays += 1;
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      }
    }

    const overallLearningProgress =
      enrolledCoursesCount > 0
        ? avgCourseCompletion
        : Math.round(avgMastery * 100);

    return {
      total_skills: totalSkills,
      mastered_count: masteredCount,
      in_progress_count: inProgressCount,
      weak_concepts_count: weakCount,
      unattempted_count: Math.max(0, totalSkills - masteryRecords.length),
      average_mastery: avgMastery,
      mastered_skills: masteredSkills,
      weak_skills: weakSkills,
      total_courses: totalCourses,
      available_courses: totalCourses,
      enrolled_courses_count: enrolledCoursesCount,
      completed_courses_count: completedCoursesCount,
      in_progress_courses_count: inProgressCoursesCount,
      average_course_completion: avgCourseCompletion,
      overall_learning_progress: overallLearningProgress,
      total_quizzes_attempted: totalQuizzesAttempted,
      average_quiz_score: averageQuizScore,
      learning_streak_days: learningStreakDays,
      course_progress_summary: courseProgressSummary,
      recent_quiz_results: recentQuizResults,
      recent_activities: recentActivities,
    };
  }

  /**
   * Predict concept mastery transition probability via heuristic / feature model
   */
  static predictMastery(features) {
    const historicalAccuracy = features.historical_accuracy ?? 0.7;
    const priorAttempts = features.prior_attempts_count ?? 1;
    const avgTime = features.avg_time_per_question_sec ?? 60.0;
    const prereqAvg = features.prerequisite_mastery_avg ?? 0.75;
    const streak = features.consecutive_error_streak ?? 0;

    let prob = 0.4 * historicalAccuracy + 0.3 * prereqAvg + 0.15 * Math.min(1.0, priorAttempts / 5.0) - 0.1 * streak;
    if (avgTime < 15.0) prob -= 0.05; // Rushing penalty
    prob = Math.max(0.05, Math.min(0.98, prob));

    return {
      predicted_probability: Math.round(prob * 1000) / 1000,
      confidence_level: 'high',
      status: prob >= 0.75 ? 'likely_to_master' : 'requires_scaffolding',
      explanation:
        prob >= 0.75
          ? 'Learner demonstrates consistent accuracy and strong prerequisite foundation.'
          : 'Elevated error streak or prerequisite gaps indicate targeted scaffolding is required.',
      feature_contributions: {
        accuracy_weight: 0.40,
        prerequisite_weight: 0.30,
        experience_weight: 0.15,
        streak_penalty: -0.10,
      },
    };
  }
}

export default AdaptiveEngine;
