import adaptiveEngine from '../services/adaptiveEngine.js';

export async function getNextActivity(req, res, next) {
  try {
    const rec = await adaptiveEngine.selectNextActivity(req.user.id);
    return res.status(200).json(rec);
  } catch (err) {
    next(err);
  }
}

export async function getWeakConcepts(req, res, next) {
  try {
    const weak = await adaptiveEngine.identifyWeakConcepts(req.user.id);
    return res.status(200).json(weak);
  } catch (err) {
    next(err);
  }
}

export async function getOverview(req, res, next) {
  try {
    const overview = await adaptiveEngine.getLearnerMasteryOverview(req.user.id);
    return res.status(200).json(overview);
  } catch (err) {
    next(err);
  }
}

export function predictMastery(req, res, next) {
  try {
    const features = req.body || {};
    const prediction = adaptiveEngine.predictMastery(features);
    return res.status(200).json(prediction);
  } catch (err) {
    next(err);
  }
}

export default {
  getNextActivity,
  getWeakConcepts,
  getOverview,
  predictMastery,
};
