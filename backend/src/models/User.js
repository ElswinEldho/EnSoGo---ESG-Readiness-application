const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const { isValidSector } = require('../data/sectors');

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, minlength: 2 },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    organizationName: { type: String, required: true, trim: true },
    sectorCode: {
      type: String,
      required: true,
      uppercase: true,
      validate: { validator: isValidSector, message: 'Invalid sector code' },
    },
    country: { type: String, required: true },
    stateRegion: { type: String, required: true },
    termsAccepted: { type: Boolean, required: true },
    listed: { type: Boolean, default: false }, // BRSR applicability
    accountStatus: { type: String, enum: ['PendingVerification', 'Active', 'Locked'], default: 'PendingVerification' },
    verificationToken: { type: String },
    verificationExpiresAt: { type: Date },
    passwordResetToken: { type: String },
    passwordResetExpiresAt: { type: Date },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
    lastLoginAt: { type: Date },

    // Organization profile (persistent across logins; editable from header)
    orgProfile: {
      builtUpAreaSqft: { type: Number, min: 0 },
      employees: { type: Number, min: 0 },
      avgDailyOccupancy: { type: Number, min: 0 },
      operatingHoursPerDay: { type: Number, min: 0, max: 24 },
      numberOfFloors: { type: Number, min: 0 },
      yearEstablished: { type: Number, min: 1800, max: 2100 },
      completedAt: { type: Date },
    },
  },
  { timestamps: true }
);

userSchema.virtual('orgProfileComplete').get(function () {
  const p = this.orgProfile || {};
  return Boolean(p.builtUpAreaSqft && p.employees && p.operatingHoursPerDay && p.completedAt);
});

userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, parseInt(env.BCRYPT_COST, 10) || 12);
};

userSchema.methods.verifyPassword = function verifyPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject({ virtuals: true });
  delete obj.passwordHash;
  delete obj.verificationToken;
  delete obj.passwordResetToken;
  return obj;
};

// ── Performance indexes ───────────────────────────────────────────────────────
// email already has unique:true index; add compound for admin search + filter
userSchema.index({ sectorCode: 1, accountStatus: 1 });
userSchema.index({ accountStatus: 1, createdAt: -1 });
// Sparse indexes for token lookups (sparse = only indexes docs that have the field)
userSchema.index({ verificationToken: 1 }, { sparse: true });
userSchema.index({ passwordResetToken: 1 }, { sparse: true });

module.exports = mongoose.model('User', userSchema);
