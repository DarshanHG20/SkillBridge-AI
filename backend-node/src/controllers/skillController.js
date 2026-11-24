import skillService from '../services/skillService.js';

export async function listSkills(req, res, next) {
  try {
    const category = req.query.category || null;
    const skills = await skillService.getAllSkills(category);
    return res.status(200).json(skills);
  } catch (err) {
    next(err);
  }
}

export async function getTaxonomyTree(req, res, next) {
  try {
    const userId = req.user ? req.user.id : null;
    const tree = await skillService.getTaxonomyTree(userId);
    return res.status(200).json(tree);
  } catch (err) {
    next(err);
  }
}

export async function getMyMastery(req, res, next) {
  try {
    const mastery = await skillService.getMyMastery(req.user.id);
    return res.status(200).json(mastery);
  } catch (err) {
    next(err);
  }
}

export async function getSkillBySlug(req, res, next) {
  try {
    const skill = await skillService.getSkillBySlug(req.params.slug);
    if (!skill) {
      return res.status(404).json({ detail: `Skill '${req.params.slug}' not found` });
    }
    return res.status(200).json(skill);
  } catch (err) {
    next(err);
  }
}

export async function masterAllSkills(req, res, next) {
  try {
    const result = await skillService.masterAllSkills(req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export default {
  listSkills,
  getTaxonomyTree,
  getMyMastery,
  getSkillBySlug,
  masterAllSkills,
};
