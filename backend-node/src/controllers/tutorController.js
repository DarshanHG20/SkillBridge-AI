import { TutorService } from '../services/tutorService.js';

export function getStatus(req, res, next) {
  try {
    const status = TutorService.getStatus();
    return res.status(200).json(status);
  } catch (err) {
    next(err);
  }
}

export async function queryTutor(req, res, next) {
  try {
    const { prompt, skill_context } = req.body;
    if (!prompt) {
      return res.status(422).json({ detail: 'Field "prompt" is required' });
    }
    const response = await TutorService.queryTutor(req.user.id, prompt, skill_context);
    return res.status(200).json(response);
  } catch (err) {
    next(err);
  }
}

export default {
  getStatus,
  queryTutor,
};
