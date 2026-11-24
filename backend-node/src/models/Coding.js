import mongoose from 'mongoose';
import { attachAutoIncrement } from './Counter.js';

// 1. CodingProblem
const codingProblemSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, sparse: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'easy',
    },
    skill_slug: { type: String, required: true, index: true },
    starter_code: { type: String, required: true },
    solution_template: { type: String, default: null },
    test_cases_json: { type: Array, required: true, default: [] },
    hints_json: { type: Array, default: [] },
    rubric_json: { type: mongoose.Schema.Types.Mixed, default: null },
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

attachAutoIncrement(codingProblemSchema, 'coding_problems');

export const CodingProblem =
  mongoose.models.CodingProblem || mongoose.model('CodingProblem', codingProblemSchema);

// 2. CodingSubmission
const codingSubmissionSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, sparse: true, index: true },
    user_id: { type: Number, required: true, index: true },
    problem_id: { type: Number, required: true, index: true },
    submitted_code: { type: String, required: true },
    status: {
      type: String,
      enum: ['passed', 'failed', 'syntax_error', 'security_violation', 'time_limit_exceeded', 'pending'],
      default: 'pending',
    },
    tests_passed: { type: Number, default: 0 },
    total_tests: { type: Number, default: 0 },
    test_results_json: { type: Array, default: [] },
    static_analysis_feedback_json: { type: mongoose.Schema.Types.Mixed, default: null },
    execution_mode: { type: String, default: 'safe_static_analysis' },
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

attachAutoIncrement(codingSubmissionSchema, 'coding_submissions');

export const CodingSubmission =
  mongoose.models.CodingSubmission ||
  mongoose.model('CodingSubmission', codingSubmissionSchema);

export default {
  CodingProblem,
  CodingSubmission,
};
