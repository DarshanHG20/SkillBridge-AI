import careerService from '../services/careerService.js';

export async function listCareers(req, res, next) {
  try {
    const careers = await careerService.listCareers();
    return res.status(200).json(careers);
  } catch (err) {
    next(err);
  }
}

export async function getCareerDetails(req, res, next) {
  try {
    const career = await careerService.getCareerBySlug(req.params.slug);
    if (!career) {
      return res.status(404).json({ detail: `Career pathway '${req.params.slug}' not found` });
    }
    return res.status(200).json(career);
  } catch (err) {
    next(err);
  }
}

export async function getGapAnalysis(req, res, next) {
  try {
    const analysis = await careerService.analyzeCareerGap(req.user.id, req.params.slug);
    return res.status(200).json(analysis);
  } catch (err) {
    next(err);
  }
}

export async function generateRoadmap(req, res, next) {
  try {
    const planType = req.body.plan_type || '90_day';
    const roadmap = await careerService.generateRoadmap(req.user.id, req.params.slug, planType);
    return res.status(200).json(roadmap);
  } catch (err) {
    next(err);
  }
}

export async function getMyRoadmaps(req, res, next) {
  try {
    const roadmaps = await careerService.getMyRoadmaps(req.user.id);
    return res.status(200).json(roadmaps);
  } catch (err) {
    next(err);
  }
}

export default {
  listCareers,
  getCareerDetails,
  getGapAnalysis,
  generateRoadmap,
  getMyRoadmaps,
};
