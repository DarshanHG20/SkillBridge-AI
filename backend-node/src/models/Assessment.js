import mongoose from 'mongoose';
import { attachAutoIncrement } from './Counter.js';

// 1. Assessment
const assessmentSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, sparse: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    skill_id: { type: Number, required: true, index: true },
    assessment_type: {
      type: String,
      enum: ['diagnostic', 'formative', 'summative'],
      default: 'formative',
    },
    pass_percentage: { type: Number, default: 75.0 },
    time_limit_minutes: { type: Number, default: null },
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

attachAutoIncrement(assessmentSchema, 'assessments');

export const Assessment =
  mongoose.models.Assessment || mongoose.model('Assessment', assessmentSchema);

// 2. Question
const questionSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, sparse: true, index: true },
    assessment_id: { type: Number, required: true, index: true },
    prompt: { type: String, required: true },
    question_type: {
      type: String,
      default: 'single_choice',
    },
    options_json: { type: Array, required: true }, // Array of option strings
    correct_answer_json: { type: mongoose.Schema.Types.Mixed, required: true }, // e.g. "A" or ["A"]
    explanation: { type: String, default: '' },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    points: { type: Number, default: 10 },
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

attachAutoIncrement(questionSchema, 'questions');

export const Question =
  mongoose.models.Question || mongoose.model('Question', questionSchema);

// 3. AssessmentAttempt
const assessmentAttemptSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, sparse: true, index: true },
    assessment_id: { type: Number, required: true, index: true },
    user_id: { type: Number, required: true, index: true },
    score_achieved: { type: Number, default: 0.0 },
    is_passed: { type: Boolean, default: false },
    is_grading: { type: Boolean, default: false },
    started_at: { type: Date, default: Date.now },
    completed_at: { type: Date, default: null },
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

attachAutoIncrement(assessmentAttemptSchema, 'assessment_attempts');

export const AssessmentAttempt =
  mongoose.models.AssessmentAttempt ||
  mongoose.model('AssessmentAttempt', assessmentAttemptSchema);

// 4. AssessmentResponse
const assessmentResponseSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, sparse: true },
    attempt_id: { type: Number, required: true, index: true },
    question_id: { type: Number, required: true, index: true },
    learner_response_json: { type: mongoose.Schema.Types.Mixed, required: true },
    is_correct: { type: Boolean, required: true },
    time_spent_seconds: { type: Number, default: 0 },
    diagnostic_feedback: { type: String, default: null },
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

attachAutoIncrement(assessmentResponseSchema, 'assessment_responses');

export const AssessmentResponse =
  mongoose.models.AssessmentResponse ||
  mongoose.model('AssessmentResponse', assessmentResponseSchema);

export default {
  Assessment,
  Question,
  AssessmentAttempt,
  AssessmentResponse,
};
