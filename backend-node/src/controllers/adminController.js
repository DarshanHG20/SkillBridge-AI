import { User, StudentProfile } from '../models/User.js';
import { Skill, SkillPrerequisite } from '../models/Skill.js';
import { Assessment, Question } from '../models/Assessment.js';
import { Career, CareerRequirement } from '../models/Career.js';
import { Project } from '../models/Project.js';
import { Document } from '../models/Document.js';
import { Feedback, AdminAuditLog } from '../models/Governance.js';
import analyticsService from '../services/analyticsService.js';
import ragService from '../services/ragService.js';

const VALID_ROLES = new Set(['student', 'instructor', 'admin', 'superadmin']);
const VALID_DIFFICULTIES = new Set(['beginner', 'intermediate', 'advanced', 'expert']);
const VALID_FEEDBACK_STATUSES = new Set(['pending', 'reviewed', 'resolved']);

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parsePositiveInt(value) {
  const num = Number(value);
  return Number.isInteger(num) && num > 0 ? num : null;
}

export class AdminController {
  // 1. Users
  static async listUsers(req, res, next) {
    try {
      const search = req.query.search || null;
      const role = req.query.role || null;
      const isActive = req.query.is_active !== undefined ? req.query.is_active === 'true' : null;
      const skip = Math.max(0, parseInt(req.query.skip || '0', 10) || 0);
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '20', 10) || 20));

      const query = {};
      if (role) query.role = role;
      if (isActive !== null) query.is_active = isActive;
      if (search && String(search).trim()) {
        const regex = new RegExp(escapeRegex(String(search).trim()), 'i');
        query.$or = [{ email: regex }, { full_name: regex }];
      }

      const total = await User.countDocuments(query);
      const users = await User.find(query).sort({ id: -1 }).skip(skip).limit(limit);

      const items = [];
      for (const u of users) {
        const profile = await StudentProfile.findOne({ user_id: u.id });
        const obj = u.toJSON();
        if (profile) obj.profile = profile.toJSON();
        items.push(obj);
      }

      return res.status(200).json({
        items,
        total,
        skip,
        limit,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getUserDetail(req, res, next) {
    try {
      const userId = parsePositiveInt(req.params.id);
      if (!userId) return res.status(400).json({ detail: 'Invalid user ID' });
      const user = await User.findOne({ id: userId });
      if (!user) return res.status(404).json({ detail: 'User not found' });

      const profile = await StudentProfile.findOne({ user_id: user.id });
      const obj = user.toJSON();
      if (profile) obj.profile = profile.toJSON();
      return res.status(200).json(obj);
    } catch (err) {
      next(err);
    }
  }

  static async updateUserStatus(req, res, next) {
    try {
      const userId = parsePositiveInt(req.params.id);
      if (!userId) return res.status(400).json({ detail: 'Invalid user ID' });
      const { is_active } = req.body;
      if (typeof is_active !== 'boolean') {
        return res.status(422).json({ detail: 'Field "is_active" must be a boolean.' });
      }

      if (req.user.id === userId && !is_active) {
        return res.status(400).json({ detail: 'You cannot deactivate your own administrative account.' });
      }

      const user = await User.findOne({ id: userId });
      if (!user) return res.status(404).json({ detail: 'User not found' });

      const prevStatus = user.is_active;
      user.is_active = is_active;
      await user.save();

      await AdminAuditLog.create({
        admin_id: req.user.id,
        action: 'user_status_changed',
        entity_type: 'user',
        entity_id: String(user.id),
        details_json: { previous_status: prevStatus, new_status: is_active, target_email: user.email },
        ip_address: req.ip || null,
      });

      return res.status(200).json(user.toJSON());
    } catch (err) {
      next(err);
    }
  }

  static async updateUserRole(req, res, next) {
    try {
      const userId = parsePositiveInt(req.params.id);
      if (!userId) return res.status(400).json({ detail: 'Invalid user ID' });
      const { role } = req.body;
      if (!role || !VALID_ROLES.has(role)) {
        return res.status(422).json({ detail: 'Role must be one of: student, instructor, admin, superadmin.' });
      }

      if (req.user.id === userId && !['admin', 'superadmin'].includes(role)) {
        return res.status(400).json({ detail: 'You cannot revoke your own administrator role.' });
      }

      const user = await User.findOne({ id: userId });
      if (!user) return res.status(404).json({ detail: 'User not found' });

      const oldRole = user.role;
      user.role = role;
      await user.save();

      await AdminAuditLog.create({
        admin_id: req.user.id,
        action: 'user_role_changed',
        entity_type: 'user',
        entity_id: String(user.id),
        details_json: { old_role: oldRole, new_role: role, target_email: user.email },
        ip_address: req.ip || null,
      });

      return res.status(200).json(user.toJSON());
    } catch (err) {
      next(err);
    }
  }

  // 2. Learning Content Management
  static async createSkill(req, res, next) {
    try {
      const { slug, category, description } = req.body;
      const title = req.body.title ?? req.body.name;
      const difficulty_level = req.body.difficulty_level || 'beginner';

      if (!slug || !title || !category) {
        return res.status(422).json({ detail: 'Fields slug, title, and category are required.' });
      }
      if (!VALID_DIFFICULTIES.has(difficulty_level)) {
        return res.status(422).json({ detail: 'difficulty_level must be beginner, intermediate, advanced, or expert.' });
      }

      const cleanSlug = String(slug).trim().toLowerCase();
      const existing = await Skill.findOne({ slug: cleanSlug });
      if (existing) {
        return res.status(409).json({ detail: `Skill with slug '${cleanSlug}' already exists.` });
      }

      const skill = new Skill({
        slug: cleanSlug,
        title: String(title).trim(),
        category: String(category).trim(),
        description: description || '',
        difficulty_level,
      });
      await skill.save();

      await AdminAuditLog.create({
        admin_id: req.user.id,
        action: 'skill_created',
        entity_type: 'skill',
        entity_id: String(skill.id),
        details_json: { slug: cleanSlug, title: skill.title },
        ip_address: req.ip || null,
      });

      return res.status(201).json({ message: 'Skill created successfully', skill_id: skill.id, slug: skill.slug });
    } catch (err) {
      next(err);
    }
  }

  static async deleteSkill(req, res, next) {
    try {
      const skillId = parsePositiveInt(req.params.id);
      if (!skillId) return res.status(400).json({ detail: 'Invalid skill ID' });
      const skill = await Skill.findOne({ id: skillId });
      if (!skill) return res.status(404).json({ detail: 'Skill not found' });

      const slug = skill.slug;
      await Skill.deleteOne({ id: skillId });

      await AdminAuditLog.create({
        admin_id: req.user.id,
        action: 'skill_deleted',
        entity_type: 'skill',
        entity_id: String(skillId),
        details_json: { slug },
        ip_address: req.ip || null,
      });

      return res.status(200).json({ message: `Skill '${slug}' deleted successfully.` });
    } catch (err) {
      next(err);
    }
  }

  static async createAssessment(req, res, next) {
    try {
      const { title, description, skill_id, assessment_type, time_limit_minutes } = req.body;
      const pass_percentage = req.body.pass_percentage ?? req.body.passing_score_pct ?? 70.0;
      const parsedSkillId = parsePositiveInt(skill_id);
      if (!title || !parsedSkillId) {
        return res.status(422).json({ detail: 'Assessment title and valid skill_id are required.' });
      }
      const skill = await Skill.findOne({ id: parsedSkillId });
      if (!skill) return res.status(404).json({ detail: 'Skill associated with assessment not found' });

      const assessment = new Assessment({
        title: String(title).trim(),
        description: description || '',
        skill_id: parsedSkillId,
        assessment_type: assessment_type || 'diagnostic',
        pass_percentage: Number(pass_percentage),
        time_limit_minutes: time_limit_minutes ? Number(time_limit_minutes) : null,
      });
      await assessment.save();

      await AdminAuditLog.create({
        admin_id: req.user.id,
        action: 'assessment_created',
        entity_type: 'assessment',
        entity_id: String(assessment.id),
        details_json: { title: assessment.title, skill_id: parsedSkillId },
        ip_address: req.ip || null,
      });

      return res.status(201).json({ message: 'Assessment created successfully', assessment_id: assessment.id });
    } catch (err) {
      next(err);
    }
  }

  static async deleteAssessment(req, res, next) {
    try {
      const assessmentId = parsePositiveInt(req.params.id);
      if (!assessmentId) return res.status(400).json({ detail: 'Invalid assessment ID' });
      const assessment = await Assessment.findOne({ id: assessmentId });
      if (!assessment) return res.status(404).json({ detail: 'Assessment not found' });

      await Question.deleteMany({ assessment_id: assessmentId });
      await Assessment.deleteOne({ id: assessmentId });

      await AdminAuditLog.create({
        admin_id: req.user.id,
        action: 'assessment_deleted',
        entity_type: 'assessment',
        entity_id: String(assessmentId),
        ip_address: req.ip || null,
      });

      return res.status(200).json({ message: `Assessment #${assessmentId} deleted successfully.` });
    } catch (err) {
      next(err);
    }
  }

  static async addQuestion(req, res, next) {
    try {
      const assessmentId = parsePositiveInt(req.params.id);
      if (!assessmentId) return res.status(400).json({ detail: 'Invalid assessment ID' });
      const assessment = await Assessment.findOne({ id: assessmentId });
      if (!assessment) return res.status(404).json({ detail: 'Assessment not found' });

      const prompt = req.body.prompt ?? req.body.question_text;
      const options_json = req.body.options_json ?? req.body.options;
      const correct_answer_json = req.body.correct_answer_json ?? req.body.correct_answer;
      const { question_type, explanation, difficulty, points } = req.body;

      if (!prompt || !Array.isArray(options_json) || options_json.length < 2 || correct_answer_json === undefined || correct_answer_json === '') {
        return res.status(422).json({ detail: 'Question prompt, at least 2 options, and correct answer are required.' });
      }

      const cleanPrompt = String(prompt).trim();
      const question = new Question({
        assessment_id: assessmentId,
        prompt: cleanPrompt,
        question_type: question_type || 'single_choice',
        options_json,
        correct_answer_json,
        explanation: explanation || '',
        difficulty: difficulty || 'medium',
        points: points ? Number(points) : 10,
      });
      await question.save();

      await AdminAuditLog.create({
        admin_id: req.user.id,
        action: 'question_created',
        entity_type: 'question',
        entity_id: String(question.id),
        details_json: { assessment_id: assessmentId, prompt_snippet: cleanPrompt.slice(0, 50) },
        ip_address: req.ip || null,
      });

      return res.status(201).json({ message: 'Question created successfully', question_id: question.id });
    } catch (err) {
      next(err);
    }
  }

  static async deleteQuestion(req, res, next) {
    try {
      const questionId = parsePositiveInt(req.params.id);
      if (!questionId) return res.status(400).json({ detail: 'Invalid question ID' });
      const question = await Question.findOne({ id: questionId });
      if (!question) return res.status(404).json({ detail: 'Question not found' });

      const assessmentId = question.assessment_id;
      await Question.deleteOne({ id: questionId });

      await AdminAuditLog.create({
        admin_id: req.user.id,
        action: 'question_deleted',
        entity_type: 'question',
        entity_id: String(questionId),
        details_json: { assessment_id: assessmentId },
        ip_address: req.ip || null,
      });

      return res.status(200).json({ message: `Question #${questionId} deleted successfully.` });
    } catch (err) {
      next(err);
    }
  }

  static async createCareer(req, res, next) {
    try {
      const { slug, title, description, average_salary_range, industry } = req.body;
      if (!slug || !title) {
        return res.status(422).json({ detail: 'Career slug and title are required.' });
      }
      const cleanSlug = String(slug).trim().toLowerCase();
      const existing = await Career.findOne({ slug: cleanSlug });
      if (existing) return res.status(409).json({ detail: `Career with slug '${cleanSlug}' already exists.` });

      const career = new Career({
        slug: cleanSlug,
        title: String(title).trim(),
        description: description || '',
        average_salary_range: average_salary_range || '',
        industry: industry || '',
      });
      await career.save();

      await AdminAuditLog.create({
        admin_id: req.user.id,
        action: 'career_created',
        entity_type: 'career',
        entity_id: String(career.id),
        details_json: { slug: cleanSlug, title: career.title },
        ip_address: req.ip || null,
      });

      return res.status(201).json({ message: 'Career pathway created successfully', career_id: career.id, slug: career.slug });
    } catch (err) {
      next(err);
    }
  }

  static async deleteCareer(req, res, next) {
    try {
      const careerId = parsePositiveInt(req.params.id);
      if (!careerId) return res.status(400).json({ detail: 'Invalid career ID' });
      const career = await Career.findOne({ id: careerId });
      if (!career) return res.status(404).json({ detail: 'Career not found' });

      const slug = career.slug;
      await Career.deleteOne({ id: careerId });

      await AdminAuditLog.create({
        admin_id: req.user.id,
        action: 'career_deleted',
        entity_type: 'career',
        entity_id: String(careerId),
        details_json: { slug },
        ip_address: req.ip || null,
      });

      return res.status(200).json({ message: `Career '${slug}' deleted successfully.` });
    } catch (err) {
      next(err);
    }
  }

  static async createProjectTemplate(req, res, next) {
    try {
      const { title, description, difficulty, rubric_json, milestones_json, recommended_skills_json, career_id } = req.body;
      if (!title || !description) {
        return res.status(422).json({ detail: 'Project title and description are required.' });
      }
      const project = new Project({
        title: String(title).trim(),
        description: String(description).trim(),
        difficulty: difficulty || 'beginner',
        rubric_json: rubric_json || { criteria: 'Completeness & code quality' },
        milestones_json: Array.isArray(milestones_json) ? milestones_json : [],
        recommended_skills_json: recommended_skills_json || [],
        career_id: career_id ? Number(career_id) : null,
      });
      await project.save();

      await AdminAuditLog.create({
        admin_id: req.user.id,
        action: 'project_created',
        entity_type: 'project',
        entity_id: String(project.id),
        details_json: { title: project.title, difficulty: project.difficulty },
        ip_address: req.ip || null,
      });

      return res.status(201).json({ message: 'Project template created successfully', project_id: project.id });
    } catch (err) {
      next(err);
    }
  }

  static async deleteProjectTemplate(req, res, next) {
    try {
      const projectId = parsePositiveInt(req.params.id);
      if (!projectId) return res.status(400).json({ detail: 'Invalid project ID' });
      const project = await Project.findOne({ id: projectId });
      if (!project) return res.status(404).json({ detail: 'Project template not found' });

      const title = project.title;
      await Project.deleteOne({ id: projectId });

      await AdminAuditLog.create({
        admin_id: req.user.id,
        action: 'project_deleted',
        entity_type: 'project',
        entity_id: String(projectId),
        details_json: { title },
        ip_address: req.ip || null,
      });

      return res.status(200).json({ message: `Project template '${title}' deleted successfully.` });
    } catch (err) {
      next(err);
    }
  }

  // 3. Document Approval
  static async listDocuments(req, res, next) {
    try {
      const docs = await Document.find().sort({ id: -1 });
      return res.status(200).json(docs);
    } catch (err) {
      next(err);
    }
  }

  static async setDocumentApproval(req, res, next) {
    try {
      const docId = parsePositiveInt(req.params.id);
      if (!docId) return res.status(400).json({ detail: 'Invalid document ID' });
      const { is_approved } = req.body;
      if (typeof is_approved !== 'boolean') {
        return res.status(422).json({ detail: 'Field "is_approved" must be a boolean.' });
      }
      const doc = await Document.findOne({ id: docId });
      if (!doc) return res.status(404).json({ detail: 'Document not found' });

      doc.is_approved = is_approved;
      await doc.save();

      await AdminAuditLog.create({
        admin_id: req.user.id,
        action: 'document_approval_changed',
        entity_type: 'document',
        entity_id: String(doc.id),
        details_json: { title: doc.title, is_approved },
        ip_address: req.ip || null,
      });

      await ragService.rebuildIndex();

      return res.status(200).json({ message: `Document #${docId} approval set to ${is_approved}.` });
    } catch (err) {
      next(err);
    }
  }

  // 4. Feedback
  static async listFeedback(req, res, next) {
    try {
      const category = req.query.category || null;
      const statusFilter = req.query.status || null;
      const skip = Math.max(0, parseInt(req.query.skip || '0', 10) || 0);
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10) || 50));

      const query = {};
      if (category) query.category = category;
      if (statusFilter) query.status = statusFilter;

      const total = await Feedback.countDocuments(query);
      const items = await Feedback.find(query).sort({ created_at: -1 }).skip(skip).limit(limit);

      return res.status(200).json({
        items,
        total,
        skip,
        limit,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateFeedbackStatus(req, res, next) {
    try {
      const feedbackId = parsePositiveInt(req.params.id);
      if (!feedbackId) return res.status(400).json({ detail: 'Invalid feedback ID' });
      const { status, admin_notes } = req.body;
      if (!status || !VALID_FEEDBACK_STATUSES.has(status)) {
        return res.status(422).json({ detail: 'Status must be one of: pending, reviewed, resolved.' });
      }

      const fb = await Feedback.findOne({ id: feedbackId });
      if (!fb) return res.status(404).json({ detail: 'Feedback item not found' });

      fb.status = status;
      if (admin_notes !== undefined) fb.admin_notes = admin_notes;
      await fb.save();

      await AdminAuditLog.create({
        admin_id: req.user.id,
        action: 'feedback_status_updated',
        entity_type: 'feedback',
        entity_id: String(fb.id),
        details_json: { status },
        ip_address: req.ip || null,
      });

      return res.status(200).json(fb);
    } catch (err) {
      next(err);
    }
  }

  // 5. Analytics & Audit
  static async getAnalytics(req, res, next) {
    try {
      const analytics = await analyticsService.getAdminAnalytics();
      return res.status(200).json(analytics);
    } catch (err) {
      next(err);
    }
  }

  static async getAuditLogs(req, res, next) {
    try {
      const action = req.query.action || null;
      const entityType = req.query.entity_type || null;
      const skip = Math.max(0, parseInt(req.query.skip || '0', 10) || 0);
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10) || 50));

      const query = {};
      if (action) query.action = action;
      if (entityType) query.entity_type = entityType;

      const total = await AdminAuditLog.countDocuments(query);
      const logs = await AdminAuditLog.find(query).sort({ id: -1 }).skip(skip).limit(limit);

      const items = [];
      for (const l of logs) {
        const adminUser = await User.findOne({ id: l.admin_id });
        const obj = l.toJSON();
        obj.admin_email = adminUser ? adminUser.email : null;
        items.push(obj);
      }

      return res.status(200).json({
        items,
        total,
        skip,
        limit,
      });
    } catch (err) {
      next(err);
    }
  }

  // 6. CSV Exports
  static async exportCsv(req, res, next) {
    try {
      const { type } = req.params;
      let csvContent = '';
      let filename = `skillbridge_${type}.csv`;

      if (type === 'users') {
        csvContent = await analyticsService.exportUsersCsv();
      } else if (type === 'assessment-attempts') {
        csvContent = await analyticsService.exportAssessmentAttemptsCsv();
      } else if (type === 'audit-logs') {
        csvContent = await analyticsService.exportAuditLogsCsv();
      } else {
        return res.status(404).json({ detail: `Unknown export type '${type}'.` });
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      return res.status(200).send(csvContent);
    } catch (err) {
      next(err);
    }
  }
}

export default AdminController;
