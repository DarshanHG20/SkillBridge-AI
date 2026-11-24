import mongoose from 'mongoose';
import { attachAutoIncrement } from './Counter.js';

// 1. Project
const projectSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, sparse: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    rubric_json: { type: mongoose.Schema.Types.Mixed, required: true },
    milestones_json: { type: Array, required: true, default: [] },
    recommended_skills_json: { type: Array, default: [] },
    career_id: { type: Number, default: null },
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

attachAutoIncrement(projectSchema, 'projects');

export const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);

// 2. StudentProjectProgress
const studentProjectProgressSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, sparse: true, index: true },
    user_id: { type: Number, required: true, index: true },
    project_id: { type: Number, required: true, index: true },
    status: {
      type: String,
      enum: ['in_progress', 'submitted', 'completed'],
      default: 'in_progress',
    },
    completion_percentage: { type: Number, default: 0.0 },
    evidence_notes: { type: String, default: '' },
    submitted_at: { type: Date, default: null },
  },
  {
    id: false,
    timestamps: { createdAt: false, updatedAt: 'updated_at' },
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

studentProjectProgressSchema.index({ user_id: 1, project_id: 1 }, { unique: true });

attachAutoIncrement(studentProjectProgressSchema, 'student_project_progress');

export const StudentProjectProgress =
  mongoose.models.StudentProjectProgress ||
  mongoose.model('StudentProjectProgress', studentProjectProgressSchema);

export default {
  Project,
  StudentProjectProgress,
};
