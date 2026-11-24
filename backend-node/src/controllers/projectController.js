import projectService from '../services/projectService.js';

export async function listProjects(req, res, next) {
  try {
    const userId = req.user ? req.user.id : null;
    const projects = await projectService.listProjects(userId);
    return res.status(200).json(projects);
  } catch (err) {
    next(err);
  }
}

export async function getProjectDetails(req, res, next) {
  try {
    const projectId = Number(req.params.id);
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return res.status(400).json({ detail: 'Invalid project ID.' });
    }
    const userId = req.user ? req.user.id : null;
    const project = await projectService.getProjectById(projectId, userId);
    return res.status(200).json(project);
  } catch (err) {
    next(err);
  }
}

export async function updateProgress(req, res, next) {
  try {
    const projectId = Number(req.params.id);
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return res.status(400).json({ detail: 'Invalid project ID.' });
    }
    const progress = await projectService.updateProjectProgress(req.user.id, projectId, req.body);
    return res.status(200).json(progress);
  } catch (err) {
    next(err);
  }
}

export async function getMyPortfolio(req, res, next) {
  try {
    const portfolio = await projectService.getUserPortfolio(req.user.id);
    return res.status(200).json(portfolio);
  } catch (err) {
    next(err);
  }
}

export default {
  listProjects,
  getProjectDetails,
  updateProgress,
  getMyPortfolio,
};
