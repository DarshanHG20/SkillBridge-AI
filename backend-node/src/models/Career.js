import mongoose from 'mongoose';
import { attachAutoIncrement } from './Counter.js';

// 1. Career
const careerSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, sparse: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    average_salary_range: { type: String, default: '' },
    industry: { type: String, default: '' },
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

attachAutoIncrement(careerSchema, 'careers');

export const Career = mongoose.models.Career || mongoose.model('Career', careerSchema);

// 2. CareerRequirement
const careerRequirementSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, sparse: true },
    career_id: { type: Number, required: true, index: true },
    skill_id: { type: Number, required: true, index: true },
    minimum_mastery_level: { type: Number, default: 0.8 },
    weight: { type: Number, default: 1.0 },
  },
  {
    id: false,
    timestamps: false,
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

careerRequirementSchema.index({ career_id: 1, skill_id: 1 }, { unique: true });

attachAutoIncrement(careerRequirementSchema, 'career_requirements');

export const CareerRequirement =
  mongoose.models.CareerRequirement ||
  mongoose.model('CareerRequirement', careerRequirementSchema);

// 3. Roadmap
const roadmapSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, sparse: true, index: true },
    user_id: { type: Number, required: true, index: true },
    career_id: { type: Number, default: null, index: true },
    title: { type: String, required: true },
    plan_type: {
      type: String,
      enum: ['30_day', '60_day', '90_day'],
      default: '90_day',
    },
    milestones_json: { type: Array, required: true, default: [] },
    completion_percentage: { type: Number, default: 0.0 },
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

attachAutoIncrement(roadmapSchema, 'roadmaps');

export const Roadmap = mongoose.models.Roadmap || mongoose.model('Roadmap', roadmapSchema);

export default {
  Career,
  CareerRequirement,
  Roadmap,
};
