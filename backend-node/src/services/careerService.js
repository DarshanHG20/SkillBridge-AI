import { Career, CareerRequirement, Roadmap } from '../models/Career.js';
import { Skill, SkillMastery } from '../models/Skill.js';

export const CAREER_DISCLAIMER =
  'SkillBridge AI provides skills assessment, learning pathways, and career readiness roadmaps based on standard industry competencies. It does not guarantee employment, hiring outcomes, or compensation levels.';

export class CareerService {
  static async listCareers() {
    const careers = await Career.find().sort({ id: 1 });
    const results = [];

    for (const c of careers) {
      const reqs = await CareerRequirement.find({ career_id: c.id });
      const reqSkills = [];
      for (const r of reqs) {
        const s = await Skill.findOne({ id: r.skill_id });
        if (s) {
          reqSkills.push({
            skill_id: s.id,
            skill_slug: s.slug,
            skill_title: s.title,
            minimum_mastery_level: r.minimum_mastery_level,
            weight: r.weight,
          });
        }
      }

      results.push({
        id: c.id,
        slug: c.slug,
        title: c.title,
        description: c.description,
        average_salary_range: c.average_salary_range,
        industry: c.industry,
        requirements: reqSkills,
      });
    }

    return results;
  }

  static async getCareerBySlug(slug) {
    const career = await Career.findOne({ slug });
    if (!career) return null;

    const reqs = await CareerRequirement.find({ career_id: career.id });
    const reqSkills = [];
    for (const r of reqs) {
      const s = await Skill.findOne({ id: r.skill_id });
      if (s) {
        reqSkills.push({
          skill_id: s.id,
          skill_slug: s.slug,
          skill_title: s.title,
          minimum_mastery_level: r.minimum_mastery_level,
          weight: r.weight,
        });
      }
    }

    return {
      id: career.id,
      slug: career.slug,
      title: career.title,
      description: career.description,
      average_salary_range: career.average_salary_range,
      industry: career.industry,
      requirements: reqSkills,
    };
  }

  static async analyzeCareerGap(userId, careerSlug) {
    const career = await Career.findOne({ slug: careerSlug });
    if (!career) {
      const err = new Error(`Career pathway '${careerSlug}' not found.`);
      err.status = 404;
      throw err;
    }

    const requirements = await CareerRequirement.find({ career_id: career.id });
    const userMastery = await SkillMastery.find({ user_id: userId });
    const masteryMap = new Map(userMastery.map(m => [m.skill_id, m.mastery_score]));

    let totalWeight = 0;
    let earnedWeight = 0;
    const skillGaps = [];

    for (const req of requirements) {
      const s = await Skill.findOne({ id: req.skill_id });
      const currentScore = masteryMap.get(req.skill_id) || 0.0;
      const targetScore = req.minimum_mastery_level;
      const gapScore = Math.max(0.0, Math.round((targetScore - currentScore) * 1000) / 1000);

      totalWeight += req.weight;
      const completionRatio = targetScore > 0 ? Math.min(1.0, currentScore / targetScore) : 1.0;
      earnedWeight += completionRatio * req.weight;

      skillGaps.push({
        skill_id: req.skill_id,
        skill_slug: s ? s.slug : `skill-${req.skill_id}`,
        skill_title: s ? s.title : `Skill #${req.skill_id}`,
        category: s ? s.category : 'General',
        current_mastery: currentScore,
        target_mastery: targetScore,
        minimum_mastery_level: targetScore,
        gap_score: gapScore,
        gap: gapScore,
        priority: gapScore > 0.4 ? 'high' : (gapScore > 0.15 ? 'medium' : 'low'),
      });
    }

    // Sort gaps by highest gap first
    skillGaps.sort((a, b) => b.gap_score - a.gap_score);

    const readinessPct = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 10000) / 100 : 0.0;
    const onlyGaps = skillGaps.filter(g => g.gap_score > 0);
    const strengths = skillGaps.filter(g => g.gap_score === 0);

    return {
      career_id: career.id,
      career_slug: career.slug,
      career_title: career.title,
      readiness_percentage: readinessPct,
      overall_readiness_percentage: readinessPct,
      skills_analyzed_count: requirements.length,
      skill_gaps: skillGaps,
      top_skill_gaps: onlyGaps,
      strengths,
      disclaimer: CAREER_DISCLAIMER,
    };
  }

  static async generateRoadmap(userId, careerSlug, planType = '90_day') {
    if (!['30_day', '60_day', '90_day'].includes(planType)) {
      const err = new Error("Invalid plan_type. Allowed values are '30_day', '60_day', or '90_day'.");
      err.status = 422;
      throw err;
    }

    const gapAnalysis = await this.analyzeCareerGap(userId, careerSlug);
    const milestones = [];

    const durationDays = planType === '30_day' ? 30 : (planType === '60_day' ? 60 : 90);
    const numMilestones = planType === '30_day' ? 3 : (planType === '60_day' ? 5 : 6);

    const gaps = gapAnalysis.skill_gaps;
    for (let i = 0; i < numMilestones; i++) {
      const targetSkill = gaps.length > 0 ? gaps[i % gaps.length] : null;
      const startDay = Math.floor((i * durationDays) / numMilestones) + 1;
      const endDay = Math.floor(((i + 1) * durationDays) / numMilestones);
      const periodLabel = `Day ${startDay} - Day ${endDay}`;
      const phaseTitle = `Phase ${i + 1}: Master ${targetSkill ? targetSkill.skill_title : 'Foundational Practice'}`;
      const phaseDesc = `Dedicated milestone focusing on closing competency gap in ${targetSkill ? targetSkill.skill_title : 'core skills'}. Complete diagnostic assessments and milestone tasks.`;

      milestones.push({
        milestone_index: i + 1,
        title: phaseTitle,
        focus_area: phaseTitle,
        description: phaseDesc,
        target_skill_slug: targetSkill ? targetSkill.skill_slug : null,
        target_skills: targetSkill ? [targetSkill.skill_title] : [],
        target_mastery: 0.80,
        timeline_days: periodLabel,
        period: periodLabel,
        action_items: [phaseDesc],
        is_completed: false,
      });
    }

    // Upsert or create roadmap
    let roadmap = await Roadmap.findOne({ user_id: userId, career_id: gapAnalysis.career_id, plan_type: planType });
    if (!roadmap) {
      roadmap = new Roadmap({
        user_id: userId,
        career_id: gapAnalysis.career_id,
        title: `${gapAnalysis.career_title} (${planType.replace('_', ' ').toUpperCase()}) Roadmap`,
        plan_type: planType,
        milestones_json: milestones,
        completion_percentage: 0.0,
      });
    } else {
      roadmap.milestones_json = milestones;
    }
    await roadmap.save();

    return {
      id: roadmap.id,
      career_id: roadmap.career_id,
      career_title: gapAnalysis.career_title,
      title: roadmap.title,
      plan_type: roadmap.plan_type,
      milestones: roadmap.milestones_json,
      completion_percentage: roadmap.completion_percentage,
      created_at: roadmap.created_at,
    };
  }

  static async getMyRoadmaps(userId) {
    const roadmaps = await Roadmap.find({ user_id: userId }).sort({ id: -1 });
    const results = [];

    for (const r of roadmaps) {
      const career = r.career_id ? await Career.findOne({ id: r.career_id }) : null;
      results.push({
        id: r.id,
        career_id: r.career_id,
        career_title: career ? career.title : 'Custom Pathway',
        title: r.title,
        plan_type: r.plan_type,
        milestones: r.milestones_json,
        completion_percentage: r.completion_percentage,
        created_at: r.created_at,
      });
    }

    return results;
  }
}

export default CareerService;
