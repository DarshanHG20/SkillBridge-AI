import mongoose from 'mongoose';
import { attachAutoIncrement } from './Counter.js';

// 1. Feedback
const feedbackSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, sparse: true, index: true },
    user_id: { type: Number, required: true, index: true },
    category: {
      type: String,
      enum: ['content', 'bug', 'suggestion', 'general', 'content_issue', 'feature_request', 'content_quality', 'ui_ux'],
      default: 'general',
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5, default: null },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved'],
      default: 'pending',
    },
    admin_notes: { type: String, default: null },
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

attachAutoIncrement(feedbackSchema, 'feedbacks');

export const Feedback =
  mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema);

// 2. LearnerActivity
const learnerActivitySchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, sparse: true, index: true },
    user_id: { type: Number, required: true, index: true },
    activity_type: { type: String, required: true, index: true },
    metadata_json: { type: mongoose.Schema.Types.Mixed, default: null },
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

attachAutoIncrement(learnerActivitySchema, 'learner_activity');

export const LearnerActivity =
  mongoose.models.LearnerActivity ||
  mongoose.model('LearnerActivity', learnerActivitySchema);

// 3. AdminAuditLog
const adminAuditLogSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, sparse: true, index: true },
    admin_id: { type: Number, required: true, index: true },
    action: { type: String, required: true, index: true },
    entity_type: { type: String, required: true },
    entity_id: { type: String, default: null },
    details_json: { type: mongoose.Schema.Types.Mixed, default: null },
    ip_address: { type: String, default: null },
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

attachAutoIncrement(adminAuditLogSchema, 'admin_audit_logs');

export const AdminAuditLog =
  mongoose.models.AdminAuditLog || mongoose.model('AdminAuditLog', adminAuditLogSchema);

// 4. Notification
const notificationSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, sparse: true, index: true },
    user_id: { type: Number, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    is_read: { type: Boolean, default: false },
    type: { type: String, default: 'general' },
  },
  {
    id: false,
    timestamps: { createdAt: 'created_at', updatedAt: false },
    toJSON: { virtuals: true, transform: (doc, ret) => { delete ret._id; delete ret.__v; return ret; } },
  }
);
attachAutoIncrement(notificationSchema, 'notifications');
export const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

// 5. Certificate
const certificateSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, sparse: true, index: true },
    user_id: { type: Number, required: true, index: true },
    course_id: { type: Number, required: true, index: true },
    certificate_url: { type: String, required: true },
    issue_date: { type: Date, default: Date.now },
  },
  {
    id: false,
    timestamps: { createdAt: 'created_at', updatedAt: false },
    toJSON: { virtuals: true, transform: (doc, ret) => { delete ret._id; delete ret.__v; return ret; } },
  }
);
attachAutoIncrement(certificateSchema, 'certificates');
export const Certificate = mongoose.models.Certificate || mongoose.model('Certificate', certificateSchema);


export default {
  Feedback,
  LearnerActivity,
  AdminAuditLog,
  Notification,
  Certificate
};
