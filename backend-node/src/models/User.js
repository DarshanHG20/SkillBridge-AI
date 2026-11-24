import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { attachAutoIncrement } from './Counter.js';

const studentProfileSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, sparse: true },
    user_id: { type: Number, required: true, index: true },
    headline: { type: String, default: 'Aspiring Learner' },
    bio: { type: String, default: '' },
    target_role: { type: String, default: 'Software Engineer' },
    education_level: { type: String, default: 'Self-taught / University' },
    target_hours_per_week: { type: Number, default: 10 },
    preferred_learning_style: { type: String, default: 'visual' },
    xp_points: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    streak_days: { type: Number, default: 0 },
    badges: { type: [String], default: [] },
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

attachAutoIncrement(studentProfileSchema, 'student_profiles');

export const StudentProfile =
  mongoose.models.StudentProfile || mongoose.model('StudentProfile', studentProfileSchema);

const userSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, sparse: true, index: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    hashed_password: { type: String, required: true },
    full_name: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ['student', 'instructor', 'admin', 'superadmin'],
      default: 'student',
      index: true,
    },
    is_active: { type: Boolean, default: true },
    is_verified: { type: Boolean, default: false },
  },
  {
    id: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.hashed_password;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

attachAutoIncrement(userSchema, 'users');

userSchema.methods.comparePassword = async function (plainPassword) {
  // Python bcrypt truncates to 72 bytes
  const truncated = plainPassword.slice(0, 72);
  return bcrypt.compare(truncated, this.hashed_password);
};

export const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
