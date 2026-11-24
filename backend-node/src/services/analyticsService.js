import config from '../config/index.js';
import { User } from '../models/User.js';
import { Assessment, AssessmentAttempt } from '../models/Assessment.js';
import { Skill, SkillMastery } from '../models/Skill.js';
import { Career, Roadmap } from '../models/Career.js';
import { Document } from '../models/Document.js';
import { CodingProblem } from '../models/Coding.js';
import { AdminAuditLog, LearnerActivity } from '../models/Governance.js';

export class AnalyticsService {
  static async getAdminAnalytics() {
    const [
      totalUsers,
      studentCount,
      instructorCount,
      adminCount,
      activeUsers,
      totalAssessments,
      completedAttempts,
      totalRoadmaps,
      totalCareers,
      approvedDocuments,
      totalDocuments,
      codingProblems,
      totalActivities,
      skills,
      masteries,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'instructor' }),
      User.countDocuments({ role: { $in: ['admin', 'superadmin'] } }),
      User.countDocuments({ is_active: true }),
      Assessment.countDocuments(),
      AssessmentAttempt.find({ completed_at: { $ne: null } }),
      Roadmap.countDocuments(),
      Career.countDocuments(),
      Document.countDocuments({ is_approved: true }),
      Document.countDocuments(),
      CodingProblem.countDocuments(),
      LearnerActivity.countDocuments(),
      Skill.find(),
      SkillMastery.find(),
    ]);

    const totalAttempts = completedAttempts.length;
    const passedAttempts = completedAttempts.filter(a => a.is_passed).length;
    const passRate = totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 10000) / 100 : 0.0;
    const avgScorePct =
      totalAttempts > 0
        ? Math.round(
            (completedAttempts.reduce((sum, a) => sum + (a.score_achieved || 0), 0) / totalAttempts) * 100
          ) / 100
        : 0.0;

    // Domain mastery breakdown
    const domainMap = new Map();
    for (const s of skills) {
      if (!domainMap.has(s.category)) {
        domainMap.set(s.category, { category: s.category, skills_count: 0, total_mastery: 0, mastery_entries: 0 });
      }
      const entry = domainMap.get(s.category);
      entry.skills_count++;
    }

    const skillById = new Map(skills.map(sk => [sk.id, sk]));
    for (const m of masteries) {
      const s = skillById.get(m.skill_id);
      if (s && domainMap.has(s.category)) {
        const entry = domainMap.get(s.category);
        entry.total_mastery += m.mastery_score;
        entry.mastery_entries++;
      }
    }

    const domainBreakdown = [];
    for (const entry of domainMap.values()) {
      const avg = entry.mastery_entries > 0 ? Math.round((entry.total_mastery / entry.mastery_entries) * 100) / 100 : 0.0;
      domainBreakdown.push({
        category: entry.category,
        skills_count: entry.skills_count,
        average_mastery: avg,
      });
    }

    const isLiveLlm =
      (config.aiProvider === 'gemini' && Boolean(config.geminiApiKey)) ||
      (config.aiProvider === 'openai' && Boolean(config.openaiApiKey));

    return {
      // Flat top-level metrics (React Admin & API parity)
      total_users: totalUsers,
      total_students: studentCount,
      active_users: activeUsers,
      total_skills: skills.length,
      total_documents: approvedDocuments,
      total_assessments_taken: totalAttempts,
      pass_rate: passRate,
      average_score_pct: avgScorePct,
      domain_mastery_breakdown: domainBreakdown,
      data_verification: 'verified',

      // Structured metrics (Flutter Admin Dashboard parity)
      user_metrics: {
        total_users: totalUsers,
        active_users: activeUsers,
        inactive_users: Math.max(0, totalUsers - activeUsers),
        students_count: studentCount,
        instructors_count: instructorCount,
        admins_count: adminCount,
      },
      assessment_metrics: {
        total_assessments: totalAssessments,
        total_attempts: totalAttempts,
        passed_attempts: passedAttempts,
        pass_rate_percentage: passRate,
        average_score: avgScorePct,
        is_insufficient_data: totalAttempts < 3,
      },
      skill_metrics: {
        total_skills: skills.length,
        total_mastery_records: masteries.length,
        is_insufficient_data: masteries.length < 3,
      },
      career_metrics: {
        total_careers: totalCareers,
        total_roadmaps_generated: totalRoadmaps,
      },
      content_metrics: {
        total_documents: totalDocuments,
        approved_documents: approvedDocuments,
        coding_problems: codingProblems,
      },
      activity_metrics: {
        total_learner_activities: totalActivities,
      },
      ai_metrics: {
        ai_provider: config.aiProvider,
        is_live_llm: isLiveLlm,
        coding_sandbox_enabled: config.codingSandboxEnabled,
      },
    };
  }

  static async exportUsersCsv() {
    const users = await User.find().sort({ id: 1 });
    const lines = ['id,email,full_name,role,is_active,is_verified,created_at'];

    for (const u of users) {
      const safeName = `"${(u.full_name || '').replace(/"/g, '""')}"`;
      lines.push(`${u.id},${u.email},${safeName},${u.role},${u.is_active},${u.is_verified},${u.created_at?.toISOString() || ''}`);
    }

    return lines.join('\n');
  }

  static async exportAssessmentAttemptsCsv() {
    const attempts = await AssessmentAttempt.find().sort({ id: 1 });
    const lines = ['id,assessment_id,user_id,score_achieved,is_passed,started_at,completed_at'];

    for (const a of attempts) {
      lines.push(`${a.id},${a.assessment_id},${a.user_id},${a.score_achieved},${a.is_passed},${a.started_at?.toISOString() || ''},${a.completed_at?.toISOString() || ''}`);
    }

    return lines.join('\n');
  }

  static async exportAuditLogsCsv() {
    const logs = await AdminAuditLog.find().sort({ id: 1 });
    const lines = ['id,admin_id,action,entity_type,entity_id,ip_address,created_at'];

    for (const l of logs) {
      lines.push(`${l.id},${l.admin_id},${l.action},${l.entity_type},${l.entity_id || ''},${l.ip_address || ''},${l.created_at?.toISOString() || ''}`);
    }

    return lines.join('\n');
  }
}

export default AnalyticsService;
