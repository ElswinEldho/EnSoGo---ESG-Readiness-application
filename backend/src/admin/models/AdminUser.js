/**
 * AdminUser model — enterprise admin accounts separate from regular User accounts.
 * Roles: SUPER_ADMIN > ADMIN > ANALYST > AUDITOR > SUPPORT
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'ANALYST', 'AUDITOR', 'SUPPORT'];

const ROLE_PERMISSIONS = {
  SUPER_ADMIN: ['*'], // full access
  ADMIN: [
    'users:read', 'users:write', 'users:delete',
    'organizations:read', 'organizations:write',
    'assessments:read', 'assessments:write',
    'uploads:read',
    'reports:read', 'reports:delete',
    'auditlogs:read',
    'analytics:read',
    'conversionfactors:read', 'conversionfactors:write',
    'systemconfig:read', 'systemconfig:write',
  ],
  ANALYST: [
    'users:read',
    'organizations:read',
    'assessments:read',
    'uploads:read',
    'reports:read',
    'auditlogs:read',
    'analytics:read',
    'conversionfactors:read',
    'systemconfig:read',
  ],
  AUDITOR: [
    'users:read',
    'organizations:read',
    'assessments:read',
    'uploads:read',
    'reports:read',
    'auditlogs:read',
    'analytics:read',
    'conversionfactors:read',
  ],
  SUPPORT: [
    'users:read',
    'organizations:read',
    'assessments:read',
    'uploads:read',
    'reports:read',
  ],
};

const adminUserSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, minlength: 2 },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ADMIN_ROLES,
      required: true,
      default: 'SUPPORT',
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

adminUserSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, 12);
};

adminUserSchema.methods.verifyPassword = function verifyPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

adminUserSchema.methods.hasPermission = function hasPermission(permission) {
  const perms = ROLE_PERMISSIONS[this.role] || [];
  return perms.includes('*') || perms.includes(permission);
};

adminUserSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject({ virtuals: true });
  delete obj.passwordHash;
  return obj;
};

module.exports = mongoose.model('AdminUser', adminUserSchema);
module.exports.ADMIN_ROLES = ADMIN_ROLES;
module.exports.ROLE_PERMISSIONS = ROLE_PERMISSIONS;
