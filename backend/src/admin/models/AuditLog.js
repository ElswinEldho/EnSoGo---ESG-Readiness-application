/**
 * AuditLog model — immutable record of every admin action.
 * Never updated or deleted. Append-only.
 */

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    // Who performed the action
    adminUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUser',
      index: true,
    },
    adminEmail: { type: String }, // denormalized for fast display even if admin deleted
    adminRole: { type: String },

    // What action
    action: {
      type: String,
      required: true,
      index: true,
      // e.g. 'USER_CREATED', 'CONVERSION_FACTOR_UPDATED', 'ASSESSMENT_DELETED'
    },
    resource: {
      type: String,
      required: true,
      index: true,
      // e.g. 'User', 'ConversionFactor', 'Assessment'
    },
    resourceId: { type: String, index: true },

    // Change details
    before: { type: mongoose.Schema.Types.Mixed }, // snapshot before change
    after: { type: mongoose.Schema.Types.Mixed },  // snapshot after change
    meta: { type: mongoose.Schema.Types.Mixed },   // extra context

    // Request context
    ipAddress: { type: String },
    userAgent: { type: String },

    // Outcome
    success: { type: Boolean, default: true, index: true },
    errorMessage: { type: String },
  },
  {
    timestamps: true,
    // Prevent accidental updates/deletes
    statics: {},
  }
);

// Compound index for common queries
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1, createdAt: -1 });
auditLogSchema.index({ adminUser: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
