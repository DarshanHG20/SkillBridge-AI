import { Project, StudentProjectProgress } from '../models/Project.js';
import { Career } from '../models/Career.js';

export class ProjectService {
  static async listProjects(userId = null) {
    const projects = await Project.find().sort({ id: 1 });
    const userProgressMap = new Map();

    if (userId) {
      const progressRecords = await StudentProjectProgress.find({ user_id: userId });
      for (const p of progressRecords) {
        userProgressMap.set(p.project_id, p);
      }
    }

    const results = [];
    for (const proj of projects) {
      const userProg = userProgressMap.get(proj.id);
      const career = proj.career_id ? await Career.findOne({ id: proj.career_id }) : null;

      results.push({
        id: proj.id,
        title: proj.title,
        description: proj.description,
        difficulty: proj.difficulty,
        rubric_json: proj.rubric_json,
        milestones_json: proj.milestones_json,
        recommended_skills_json: proj.recommended_skills_json,
        career_id: proj.career_id,
        career_title: career ? career.title : null,
        created_at: proj.created_at,
        is_enrolled: !!userProg,
        user_status: userProg ? userProg.status : 'not_started',
        current_status: userProg ? userProg.status : 'not_started',
        completion_percentage: userProg ? userProg.completion_percentage : 0.0,
        current_completion: userProg ? userProg.completion_percentage : 0.0,
      });
    }

    return results;
  }

  static async getProjectById(projectId, userId = null) {
    const proj = await Project.findOne({ id: projectId });
    if (!proj) {
      const err = new Error(`Project #${projectId} not found.`);
      err.status = 404;
      throw err;
    }

    let userProg = null;
    if (userId) {
      userProg = await StudentProjectProgress.findOne({ user_id: userId, project_id: projectId });
    }

    const career = proj.career_id ? await Career.findOne({ id: proj.career_id }) : null;

    return {
      id: proj.id,
      title: proj.title,
      description: proj.description,
      difficulty: proj.difficulty,
      rubric_json: proj.rubric_json,
      milestones_json: proj.milestones_json,
      recommended_skills_json: proj.recommended_skills_json,
      career_id: proj.career_id,
      career_title: career ? career.title : null,
      created_at: proj.created_at,
      is_enrolled: !!userProg,
      user_status: userProg ? userProg.status : 'not_started',
      current_status: userProg ? userProg.status : 'not_started',
      completion_percentage: userProg ? userProg.completion_percentage : 0.0,
      current_completion: userProg ? userProg.completion_percentage : 0.0,
      evidence_notes: userProg ? userProg.evidence_notes : '',
    };
  }

  static async updateProjectProgress(userId, projectId, payload) {
    const project = await Project.findOne({ id: projectId });
    if (!project) {
      const err = new Error(`Project #${projectId} not found.`);
      err.status = 404;
      throw err;
    }

    let progress = await StudentProjectProgress.findOne({ user_id: userId, project_id: projectId });
    if (!progress) {
      progress = new StudentProjectProgress({
        user_id: userId,
        project_id: projectId,
        status: payload.status || 'in_progress',
        completion_percentage: payload.completion_percentage || 0.0,
        evidence_notes: payload.evidence_notes || '',
      });
    } else {
      if (payload.status) progress.status = payload.status;
      if (payload.completion_percentage !== undefined) progress.completion_percentage = payload.completion_percentage;
      if (payload.evidence_notes !== undefined) progress.evidence_notes = payload.evidence_notes;
    }

    if (progress.status === 'completed' || progress.completion_percentage >= 100.0) {
      progress.status = 'completed';
      progress.submitted_at = new Date();
    }

    await progress.save();

    return {
      id: progress.id,
      user_id: progress.user_id,
      project_id: progress.project_id,
      project_title: project.title,
      status: progress.status,
      completion_percentage: progress.completion_percentage,
      evidence_notes: progress.evidence_notes,
      submitted_at: progress.submitted_at,
      updated_at: progress.updated_at,
    };
  }

  static async getUserPortfolio(userId) {
    const progressList = await StudentProjectProgress.find({ user_id: userId }).sort({ updated_at: -1 });
    const results = [];

    for (const p of progressList) {
      const proj = await Project.findOne({ id: p.project_id });
      results.push({
        id: p.id,
        user_id: p.user_id,
        project_id: p.project_id,
        project_title: proj ? proj.title : `Project #${p.project_id}`,
        status: p.status,
        user_status: p.status,
        current_status: p.status,
        completion_percentage: p.completion_percentage,
        current_completion: p.completion_percentage,
        evidence_notes: p.evidence_notes,
        submitted_at: p.submitted_at,
        updated_at: p.updated_at,
      });
    }

    return results;
  }
}

export default ProjectService;
