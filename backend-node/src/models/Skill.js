import mongoose from 'mongoose';
import { attachAutoIncrement } from './Counter.js';

// 1. Skill
const skillSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, sparse: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    category: { type: String, required: true, index: true },
    description: { type: String, default: '' },
    difficulty_level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      default: 'beginner',
    },
  },
  {
    id: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

attachAutoIncrement(skillSchema, 'skills');

export const Skill = mongoose.models.Skill || mongoose.model('Skill', skillSchema);

// 2. SkillPrerequisite
const skillPrerequisiteSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, sparse: true },
    skill_id: { type: Number, required: true, index: true },
    prerequisite_skill_id: { type: Number, required: true, index: true },
    requirement_type: {
      type: String,
      enum: ['mandatory', 'recommended'],
      default: 'mandatory',
    },
  },
  {
    id: false,
    timestamps: { createdAt: 'created_at', updatedAt: false },
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

skillPrerequisiteSchema.index({ skill_id: 1, prerequisite_skill_id: 1 }, { unique: true });

attachAutoIncrement(skillPrerequisiteSchema, 'skill_prerequisites');

export const SkillPrerequisite =
  mongoose.models.SkillPrerequisite ||
  mongoose.model('SkillPrerequisite', skillPrerequisiteSchema);

// 3. SkillMastery
const skillMasterySchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, sparse: true },
    user_id: { type: Number, required: true, index: true },
    skill_id: { type: Number, required: true, index: true },
    mastery_score: { type: Number, default: 0.0 }, // 0.0 to 1.0
    confidence_score: { type: Number, default: 0.5 },
    status: {
      type: String,
      enum: ['locked', 'unlocked', 'in_progress', 'mastered'],
      default: 'unlocked',
    },
    last_practiced_at: { type: Date, default: null },
  },
  {
    id: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

skillMasterySchema.index({ user_id: 1, skill_id: 1 }, { unique: true });

attachAutoIncrement(skillMasterySchema, 'skill_mastery');

export const SkillMastery =
  mongoose.models.SkillMastery || mongoose.model('SkillMastery', skillMasterySchema);

export default {
  Skill,
  SkillPrerequisite,
  SkillMastery,
};
