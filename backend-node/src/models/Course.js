import mongoose from 'mongoose';
import { attachAutoIncrement } from './Counter.js';

const lessonSubSchema = new mongoose.Schema(
  {
    lesson_id: { type: String, required: true },
    title: { type: String, required: true },
    order: { type: Number, default: 1 },
    duration_minutes: { type: Number, default: 15 },
    content: { type: String, required: true },
    code_example: { type: String, default: '' },
    key_takeaways: { type: [String], default: [] },
  },
  { _id: false }
);

const moduleSubSchema = new mongoose.Schema(
  {
    module_id: { type: String, required: true },
    title: { type: String, required: true },
    order: { type: Number, default: 1 },
    description: { type: String, default: '' },
    lessons: { type: [lessonSubSchema], default: [] },
  },
  { _id: false }
);

const courseSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, sparse: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    description: { type: String, default: '' },
    category: { type: String, required: true, index: true },
    difficulty_level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      default: 'beginner',
    },
    estimated_hours: { type: Number, default: 6 },
    is_unlocked: { type: Boolean, default: true },
    skill_id: { type: Number, default: null, index: true },
    skill_ref: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill', default: null },
    assessment_id: { type: Number, default: null, index: true },
    assessment_ref: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', default: null },
    modules: { type: [moduleSubSchema], default: [] },
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

attachAutoIncrement(courseSchema, 'courses');

export const Course = mongoose.models.Course || mongoose.model('Course', courseSchema);

const courseProgressSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, sparse: true, index: true },
    user_id: { type: Number, required: true, index: true },
    user_ref: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    course_id: { type: Number, required: true, index: true },
    course_ref: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
    unlocked: { type: Boolean, default: true },
    is_enrolled: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['unlocked', 'in_progress', 'completed'],
      default: 'in_progress',
    },
    completed_lesson_ids: { type: [String], default: [] },
    last_lesson_id: { type: String, default: null },
    completion_percentage: { type: Number, default: 0 },
    enrolled_at: { type: Date, default: Date.now },
    completed_at: { type: Date, default: null },
    last_accessed_at: { type: Date, default: Date.now },
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

courseProgressSchema.index({ user_id: 1, course_id: 1 }, { unique: true });

attachAutoIncrement(courseProgressSchema, 'course_progress');

export const CourseProgress =
  mongoose.models.CourseProgress || mongoose.model('CourseProgress', courseProgressSchema);

export default {
  Course,
  CourseProgress,
};

