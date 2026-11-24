import codingService from '../services/codingService.js';

export async function listProblems(req, res, next) {
  try {
    const { skill_slug, difficulty } = req.query;
    const problems = await codingService.listProblems(skill_slug, difficulty);
    return res.status(200).json(problems);
  } catch (err) {
    next(err);
  }
}

export async function getProblem(req, res, next) {
  try {
    const problem = await codingService.getProblemBySlug(req.params.slug);
    if (!problem) {
      return res.status(404).json({ detail: `Coding problem '${req.params.slug}' not found.` });
    }
    return res.status(200).json(problem);
  } catch (err) {
    next(err);
  }
}

export async function submitSolution(req, res, next) {
  try {
    const problemId = Number(req.params.id);
    if (!Number.isInteger(problemId) || problemId <= 0) {
      return res.status(400).json({ detail: 'Invalid problem ID.' });
    }
    const { submitted_code } = req.body;
    if (!submitted_code || !String(submitted_code).trim()) {
      return res.status(422).json({ detail: 'Code submission cannot be empty.' });
    }
    const submission = await codingService.submitSolution(req.user.id, problemId, String(submitted_code));
    return res.status(200).json(submission);
  } catch (err) {
    next(err);
  }
}

export async function getMySubmissions(req, res, next) {
  try {
    const { problem_id } = req.query;
    const submissions = await codingService.getUserSubmissions(req.user.id, problem_id);
    return res.status(200).json(submissions);
  } catch (err) {
    next(err);
  }
}

export async function getSubmissionDetail(req, res, next) {
  try {
    const submissionId = Number(req.params.id);
    if (!Number.isInteger(submissionId) || submissionId <= 0) {
      return res.status(400).json({ detail: 'Invalid submission ID.' });
    }
    const submission = await codingService.getSubmissionById(submissionId, req.user.id);
    if (!submission) {
      return res.status(404).json({ detail: `Submission #${submissionId} not found.` });
    }
    return res.status(200).json(submission);
  } catch (err) {
    next(err);
  }
}

export async function getRecommendations(req, res, next) {
  try {
    const recs = await codingService.getRecommendationsBasedOnMistakes(req.user.id);
    return res.status(200).json(recs);
  } catch (err) {
    next(err);
  }
}

export default {
  listProblems,
  getProblem,
  submitSolution,
  getMySubmissions,
  getSubmissionDetail,
  getRecommendations,
};
