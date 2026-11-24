import { Assessment, Question, AssessmentAttempt, AssessmentResponse } from '../models/Assessment.js';
import { Skill } from '../models/Skill.js';
import { AdaptiveEngine } from './adaptiveEngine.js';
import NotificationService from './notificationService.js';

export class AssessmentService {
  static async listAssessments(skillId = null) {
    const query = {};
    if (skillId) {
      query.skill_id = Number(skillId);
    }
    const assessments = await Assessment.find(query).sort({ id: 1 });
    const results = [];

    for (const a of assessments) {
      const qCount = await Question.countDocuments({ assessment_id: a.id });
      const skill = await Skill.findOne({ id: a.skill_id });

      results.push({
        id: a.id,
        title: a.title,
        description: a.description,
        skill_id: a.skill_id,
        skill_title: skill ? skill.title : '',
        assessment_type: a.assessment_type,
        pass_percentage: a.pass_percentage,
        time_limit_minutes: a.time_limit_minutes,
        question_count: qCount,
      });
    }

    return results;
  }

  static async startAssessment(userId, assessmentId) {
    const assessment = await Assessment.findOne({ id: assessmentId });
    if (!assessment) {
      const err = new Error('Assessment not found');
      err.status = 404;
      throw err;
    }

    const questions = await Question.find({ assessment_id: assessmentId }).sort({ id: 1 });

    // Create new attempt record
    const attempt = new AssessmentAttempt({
      assessment_id: assessmentId,
      user_id: userId,
      started_at: new Date(),
    });
    await attempt.save();

    // Strip out correct answers and explanations for secure delivery while providing options & options_json
    const sanitizedQuestions = questions.map(q => {
      let opts = q.options_json;
      if (typeof opts === 'string') {
        try {
          opts = JSON.parse(opts);
        } catch {
          opts = opts.split(',').map(s => s.trim()).filter(Boolean);
        }
      }
      if (!Array.isArray(opts)) opts = [];
      return {
        id: q.id,
        prompt: q.prompt,
        question_type: q.question_type,
        options: opts,
        options_json: opts,
        difficulty: q.difficulty,
        points: q.points,
      };
    });

    return {
      attempt_id: attempt.id,
      assessment_id: assessment.id,
      title: assessment.title,
      time_limit_minutes: assessment.time_limit_minutes,
      questions: sanitizedQuestions,
    };
  }

  static async submitAssessment(userId, attemptId, payload) {
    const attempt = await AssessmentAttempt.findOne({ id: attemptId, user_id: userId });
    if (!attempt) {
      const err = new Error('Assessment attempt not found or not owned by caller.');
      err.status = 404;
      throw err;
    }

    if (attempt.completed_at) {
      const err = new Error('This assessment attempt has already been submitted and scored.');
      err.status = 400;
      throw err;
    }

    // Atomic concurrency lock prevents duplicate scoring if client fires parallel submissions
    const lockedAttempt = await AssessmentAttempt.findOneAndUpdate(
      { id: attemptId, user_id: userId, completed_at: null, is_grading: { $ne: true } },
      { $set: { is_grading: true } },
      { new: true }
    );
    if (!lockedAttempt) {
      const err = new Error('This assessment attempt has already been submitted and scored.');
      err.status = 400;
      throw err;
    }

    try {
      const assessment = await Assessment.findOne({ id: lockedAttempt.assessment_id });
      if (!assessment) {
        const err = new Error('Associated assessment no longer exists.');
        err.status = 404;
        throw err;
      }

      const questions = await Question.find({ assessment_id: lockedAttempt.assessment_id }).sort({ id: 1 });
      const totalPoints = questions.reduce((sum, q) => sum + (q.points || 10), 0);

      // Map deduplicated learner responses by question_id (supporting both selected_option & learner_response_json)
      const submissionMap = new Map();
      const submissions = Array.isArray(payload?.responses) ? payload.responses : [];
      for (const sub of submissions) {
        if (sub && sub.question_id !== undefined) {
          submissionMap.set(Number(sub.question_id), sub);
        }
      }

      let earnedPoints = 0;
      let correctCount = 0;
      const responseBreakdowns = [];

      for (const q of questions) {
        const sub = submissionMap.get(q.id);
        const rawSelection = sub
          ? (sub.selected_option !== undefined ? sub.selected_option : sub.learner_response_json)
          : '';
        const hasAnswer = rawSelection !== null && rawSelection !== undefined && String(rawSelection).trim() !== '';

        const isCorrect =
          hasAnswer &&
          String(rawSelection).trim().toLowerCase() === String(q.correct_answer_json).trim().toLowerCase();

        const pointsWorth = q.points || 10;
        if (isCorrect) {
          earnedPoints += pointsWorth;
          correctCount += 1;
        }

        const storedAnswer = hasAnswer ? rawSelection : '';
        const responseDoc = new AssessmentResponse({
          attempt_id: attemptId,
          question_id: q.id,
          learner_response_json: storedAnswer,
          is_correct: isCorrect,
          time_spent_seconds: sub?.time_spent_seconds || 0,
          diagnostic_feedback: isCorrect
            ? 'Correct! Strong understanding demonstrated.'
            : (q.explanation || 'Review concept principles.'),
        });
        await responseDoc.save();

        responseBreakdowns.push({
          question_id: q.id,
          prompt: q.prompt,
          learner_response: storedAnswer,
          learner_response_json: storedAnswer,
          correct_answer: q.correct_answer_json,
          correct_answer_json: q.correct_answer_json,
          is_correct: isCorrect,
          explanation: q.explanation,
          points: pointsWorth,
          points_earned: isCorrect ? pointsWorth : 0,
        });
      }

      const scoreAchieved = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 10000) / 100 : 0.0;
      const isPassed = scoreAchieved >= assessment.pass_percentage;

      lockedAttempt.score_achieved = scoreAchieved;
      lockedAttempt.is_passed = isPassed;
      lockedAttempt.is_grading = false;
      lockedAttempt.completed_at = new Date();
      await lockedAttempt.save();

      // Trigger Adaptive Learning Engine update
      await AdaptiveEngine.updateMasteryFromAssessment(userId, assessment, scoreAchieved);

      await NotificationService.createNotification(
        userId,
        isPassed ? `🎉 Assessment Passed: ${assessment.title}` : `📝 Assessment Result: ${assessment.title}`,
        `You scored ${scoreAchieved}% on ${assessment.title}. Status: ${isPassed ? 'PASSED' : 'NEEDS REVISION'}.`,
        'quiz_result'
      ).catch(() => {});

      const adaptiveFeedback = isPassed
        ? `Great job! You achieved ${scoreAchieved}%, exceeding the ${assessment.pass_percentage}% mastery benchmark.`
        : `You scored ${scoreAchieved}% (passing threshold: ${assessment.pass_percentage}%). Review the missed concept explanations below and reinforce weak areas.`;

      return {
        attempt_id: lockedAttempt.id,
        assessment_id: assessment.id,
        title: assessment.title,
        assessment_title: assessment.title,
        score_achieved: scoreAchieved,
        pass_percentage: assessment.pass_percentage,
        is_passed: isPassed,
        correct_count: correctCount,
        incorrect_count: Math.max(0, questions.length - correctCount),
        total_questions: questions.length,
        total_points_earned: earnedPoints,
        total_points_possible: totalPoints,
        adaptive_feedback: adaptiveFeedback,
        questions_breakdown: responseBreakdowns,
        question_results: responseBreakdowns,
      };
    } catch (err) {
      await AssessmentAttempt.updateOne(
        { id: attemptId, user_id: userId, completed_at: null },
        { $set: { is_grading: false } }
      ).catch(() => {});
      throw err;
    }
  }

  static async getAttemptDetails(userId, attemptId) {
    const attempt = await AssessmentAttempt.findOne({ id: attemptId, user_id: userId });
    if (!attempt) {
      const err = new Error('Attempt not found');
      err.status = 404;
      throw err;
    }

    const assessment = await Assessment.findOne({ id: attempt.assessment_id });
    const responses = await AssessmentResponse.find({ attempt_id: attemptId }).sort({ id: 1 });

    let totalPoints = 0;
    let earnedPoints = 0;
    const breakdowns = [];
    for (const r of responses) {
      const q = await Question.findOne({ id: r.question_id });
      const pts = q?.points || 10;
      totalPoints += pts;
      if (r.is_correct) earnedPoints += pts;
      breakdowns.push({
        question_id: r.question_id,
        prompt: q ? q.prompt : '',
        learner_response: r.learner_response_json,
        learner_response_json: r.learner_response_json,
        correct_answer: q ? q.correct_answer_json : null,
        correct_answer_json: q ? q.correct_answer_json : null,
        is_correct: r.is_correct,
        explanation: q ? q.explanation : null,
        points: pts,
        points_earned: r.is_correct ? pts : 0,
      });
    }

    const correctCount = breakdowns.filter(b => b.is_correct).length;
    return {
      attempt_id: attempt.id,
      assessment_id: assessment ? assessment.id : attempt.assessment_id,
      title: assessment ? assessment.title : 'Assessment',
      assessment_title: assessment ? assessment.title : 'Assessment',
      score_achieved: attempt.score_achieved,
      pass_percentage: assessment ? assessment.pass_percentage : 75.0,
      is_passed: attempt.is_passed,
      correct_count: correctCount,
      incorrect_count: Math.max(0, breakdowns.length - correctCount),
      total_questions: breakdowns.length,
      total_points_earned: earnedPoints,
      total_points_possible: totalPoints,
      adaptive_feedback: attempt.is_passed
        ? 'Passing benchmark achieved.'
        : 'Review incorrect responses for targeted remediation.',
      questions_breakdown: breakdowns,
      question_results: breakdowns,
    };
  }

  static async getUserAttemptHistory(userId) {
    const attempts = await AssessmentAttempt.find({ user_id: userId, completed_at: { $ne: null } }).sort({ completed_at: -1 });
    const results = [];

    for (const att of attempts) {
      const a = await Assessment.findOne({ id: att.assessment_id });
      results.push({
        id: att.id,
        assessment_id: att.assessment_id,
        title: a ? a.title : 'Assessment',
        assessment_type: a ? a.assessment_type : 'formative',
        score_achieved: att.score_achieved,
        is_passed: att.is_passed,
        started_at: att.started_at,
        completed_at: att.completed_at,
      });
    }

    return results;
  }
}

export default AssessmentService;
