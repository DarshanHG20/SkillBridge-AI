import assessmentService from '../services/assessmentService.js';

export async function listAssessments(req, res, next) {
  try {
    const skillId = req.query.skill_id || null;
    const items = await assessmentService.listAssessments(skillId);
    return res.status(200).json(items);
  } catch (err) {
    next(err);
  }
}

export async function startAssessment(req, res, next) {
  try {
    const assessmentId = Number(req.params.id);
    if (!Number.isInteger(assessmentId) || assessmentId <= 0) {
      return res.status(400).json({ detail: 'Invalid assessment ID.' });
    }
    const session = await assessmentService.startAssessment(req.user.id, assessmentId);
    return res.status(200).json(session);
  } catch (err) {
    next(err);
  }
}

export async function submitAssessment(req, res, next) {
  try {
    const attemptId = Number(req.params.id);
    if (!Number.isInteger(attemptId) || attemptId <= 0) {
      return res.status(400).json({ detail: 'Invalid attempt ID.' });
    }
    const result = await assessmentService.submitAssessment(req.user.id, attemptId, req.body);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getAttemptDetails(req, res, next) {
  try {
    const attemptId = Number(req.params.id);
    if (!Number.isInteger(attemptId) || attemptId <= 0) {
      return res.status(400).json({ detail: 'Invalid attempt ID.' });
    }
    const details = await assessmentService.getAttemptDetails(req.user.id, attemptId);
    return res.status(200).json(details);
  } catch (err) {
    next(err);
  }
}

export async function getMyHistory(req, res, next) {
  try {
    const history = await assessmentService.getUserAttemptHistory(req.user.id);
    return res.status(200).json(history);
  } catch (err) {
    next(err);
  }
}

export default {
  listAssessments,
  startAssessment,
  submitAssessment,
  getAttemptDetails,
  getMyHistory,
};
