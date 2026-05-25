'use strict';
const express   = require('express');
const crypto    = require('crypto');
const rateLimit = require('express-rate-limit');

const User       = require('../models/User');
const Assessment = require('../models/Assessment');
const UploadLog  = require('../models/UploadLog');
const UPLOAD_DIR = require('../config/uploadDir');
const { issueToken, requireAuth }             = require('../middleware/auth');
const { deleteUploadFiles }                   = require('../utils/fileUtils');
const { SECTORS, isValidSector }              = require('../data/sectors');
const { sendResetCode }                       = require('../utils/mailer');
const { VALIDATION, MESSAGES, RATE_LIMITS, SECURITY } = require('../constants');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs:       RATE_LIMITS.AUTH_WINDOW_MS,
  max:            RATE_LIMITS.AUTH_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders:  false,
});
router.use(authLimiter);

// ── helpers ────────────────────────────────────────────────────────────────
const { PASSWORD_RE, EMAIL_RE } = VALIDATION;

function validateRegistration(body) {
  const errors = {};
  if (!body.fullName || body.fullName.trim().length < 2)                errors.fullName         = 'Full name is required (min 2 chars).';
  if (!body.email || !EMAIL_RE.test(body.email))                        errors.email            = 'Valid email is required.';
  if (!body.password || !PASSWORD_RE.test(body.password))               errors.password         = MESSAGES.INVALID_PASSWORD;
  if (body.password !== body.confirmPassword)                           errors.confirmPassword  = MESSAGES.PASSWORDS_NO_MATCH;
  if (!body.organizationName || body.organizationName.trim().length < 2) errors.organizationName = 'Organization name is required.';
  if (!body.sectorCode || !isValidSector(body.sectorCode))              errors.sectorCode       = 'Choose a sector.';
  if (!body.country)                                                    errors.country          = 'Country is required.';
  if (!body.stateRegion)                                                errors.stateRegion      = 'State / region is required.';
  if (!body.termsAccepted)                                              errors.termsAccepted    = 'You must accept the terms.';
  return errors;
}

// ── routes ─────────────────────────────────────────────────────────────────

// GET /api/auth/sectors — sector picklist for the registration form.
router.get('/sectors', (_req, res) => {
  res.json(Object.values(SECTORS).map((s) => ({
    code: s.code,
    name: s.name,
    primaryCerts: s.primaryCerts,
    secondaryCerts: s.secondaryCerts,
  })));
});

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const errors = validateRegistration(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ error: MESSAGES.VALIDATION_FAILED, fields: errors });

    const existing = await User.findOne({ email: req.body.email.toLowerCase() });
    if (existing) return res.status(409).json({ error: MESSAGES.EMAIL_EXISTS });

    const verificationToken = crypto.randomBytes(20).toString('hex');
    const user = new User({
      fullName:          req.body.fullName.trim(),
      email:             req.body.email.toLowerCase().trim(),
      organizationName:  req.body.organizationName.trim(),
      sectorCode:        req.body.sectorCode.toUpperCase(),
      country:           req.body.country,
      stateRegion:       req.body.stateRegion,
      listed:            !!req.body.listed,
      termsAccepted:     true,
      verificationToken,
      verificationExpiresAt: new Date(Date.now() + SECURITY.VERIFICATION_EXPIRY_MS),
      // For this MVP we auto-activate so the demo flow works end-to-end.
      // In production, set this to 'PendingVerification' and email the link.
      accountStatus: 'Active',
    });
    await user.setPassword(req.body.password);
    await user.save();

    // For dev convenience also return token; in prod gate behind email click.
    const token = issueToken(user, false);
    res.status(201).json({ user: user.toJSON(), token, verificationToken });
  } catch (err) { next(err); }
});

// GET /api/auth/verify/:token — completes registration when status is PendingVerification.
router.get('/verify/:token', async (req, res, next) => {
  try {
    const user = await User.findOne({ verificationToken: req.params.token, verificationExpiresAt: { $gt: new Date() } });
    if (!user) return res.status(400).json({ error: 'Verification link expired or invalid.' });
    user.accountStatus = 'Active';
    user.verificationToken = undefined;
    user.verificationExpiresAt = undefined;
    await user.save();
    res.json({ message: 'Your account has been verified. Please log in to continue.' });
  } catch (err) { next(err); }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password, remember } = req.body;
    if (!email || !password) return res.status(400).json({ error: MESSAGES.EMAIL_REQUIRED });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: MESSAGES.ACCOUNT_NOT_FOUND });

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(423).json({ error: MESSAGES.ACCOUNT_LOCKED });
    }
    if (user.accountStatus !== 'Active') {
      return res.status(403).json({ error: MESSAGES.ACCOUNT_INACTIVE });
    }

    const ok = await user.verifyPassword(password);
    if (!ok) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= RATE_LIMITS.MAX_FAILED_LOGINS) {
        user.lockedUntil = new Date(Date.now() + RATE_LIMITS.LOCK_DURATION_MS);
        user.failedLoginAttempts = 0;
      }
      await user.save();
      return res.status(401).json({ error: MESSAGES.INCORRECT_PASSWORD });
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    user.lastLoginAt = new Date();
    await user.save();

    const token = issueToken(user, !!remember);
    res.json({ user: user.toJSON(), token });
  } catch (err) { next(err); }
});

// Generates a cryptographically secure 6-digit numeric code (e.g., "043817").
function generate6DigitCode() {
  // Uniform distribution: random integer in [0, 999999]
  const n = crypto.randomInt(0, 1000000);
  return String(n).padStart(6, '0');
}

// POST /api/auth/forgot  (and alias /forgot-password for frontend compatibility)
// Issue a 6-digit reset code (valid 10 minutes) and email it to the user.
// Always returns 200 so attackers can't enumerate email accounts.
async function handleForgot(req, res, next) {
  try {
    const { email } = req.body;
    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: MESSAGES.INVALID_EMAIL });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Pretend success — don't leak whether an account exists
      return res.json({ message: 'If an account exists with that email, a code has been sent.' });
    }

    const code = generate6DigitCode();
    user.passwordResetToken = code;
    user.passwordResetExpiresAt = new Date(Date.now() + SECURITY.RESET_CODE_EXPIRY_MS);
    await user.save();

    // Send the email. If SMTP isn't configured we use an Ethereal test inbox
    // and surface a preview URL so dev can verify the email visually.
    let mailMeta = {};
    try {
      mailMeta = await sendResetCode(user.email, code);
    } catch (mailErr) {
      // eslint-disable-next-line no-console
      console.error('[auth/forgot] email send failed:', mailErr.message);
      return res.status(500).json({ error: 'Could not send the reset email. Please try again later.' });
    }

    const payload = { message: 'A reset code has been sent to your email.' };
    // Only expose Ethereal preview link in non-production for developer convenience
    if (process.env.NODE_ENV !== 'production' && mailMeta.source === 'ethereal' && mailMeta.previewUrl) {
      payload.previewUrl = mailMeta.previewUrl;
    }
    res.json(payload);
  } catch (err) { next(err); }
}
router.post('/forgot', handleForgot);
router.post('/forgot-password', handleForgot);  // alias used by the frontend

// POST /api/auth/verify-code — confirm the 6-digit code WITHOUT consuming it.
// Returned `resetTicket` is passed to /reset along with the new password.
router.post('/verify-code', async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code are required.' });
    const user = await User.findOne({
      email:                  email.toLowerCase(),
      passwordResetToken:     String(code).trim(),
      passwordResetExpiresAt: { $gt: new Date() },
    });
    if (!user) return res.status(400).json({ error: 'Invalid or expired code.' });

    // Issue a short-lived "ticket" the client uses to finalize the reset.
    // The ticket = sha256(code + userId) — server can recompute it later.
    const ticket = crypto.createHash('sha256').update(code + user._id.toString()).digest('hex');
    res.json({ message: 'Code verified.', resetTicket: ticket });
  } catch (err) { next(err); }
});

// POST /api/auth/reset — completes the forgotten-password flow.
// Accepts either:
//   { email, code, newPassword }              — legacy / direct
//   { email, resetTicket, code, newPassword } — from /verify-code
router.post('/reset', async (req, res, next) => {
  try {
    const { email, code, resetTicket, newPassword } = req.body;
    if (!PASSWORD_RE.test(newPassword || '')) {
      return res.status(400).json({ error: MESSAGES.INVALID_PASSWORD });
    }
    if (!email || !code) return res.status(400).json({ error: 'Email and code are required.' });

    const user = await User.findOne({
      email:                  email.toLowerCase(),
      passwordResetToken:     String(code).trim(),
      passwordResetExpiresAt: { $gt: new Date() },
    });
    if (!user) return res.status(400).json({ error: 'Code expired or invalid. Please request a new one.' });

    // Optional ticket double-check
    if (resetTicket) {
      const expected = crypto.createHash('sha256').update(String(code) + user._id.toString()).digest('hex');
      if (expected !== resetTicket) return res.status(400).json({ error: 'Reset ticket mismatch.' });
    }

    await user.setPassword(newPassword);
    user.passwordResetToken = undefined;
    user.passwordResetExpiresAt = undefined;
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    await user.save();

    res.json({ message: 'Password updated. Please log in.' });
  } catch (err) { next(err); }
});

// ── Logout ──────────────────────────────────────────────────────────────────

// POST /api/auth/logout
// Cleans up ephemeral upload artefacts (UploadLog documents + physical XLSX/CSV
// files on disk) so the uploads/ folder doesn't accumulate stale files.
// Assessment documents, summary calculations, readiness scores, and generated
// PDF reports are permanently retained in MongoDB — they must NOT be deleted
// here so users can re-login and resume or review previous assessments.
router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Find all assessments owned by this user (select _id only — no full load needed).
    const assessments = await Assessment.find({ user: userId }).select('_id').lean();
    const assessmentIds = assessments.map((a) => a._id);

    if (assessmentIds.length > 0) {
      // Delete physical upload files from disk and remove all UploadLog documents.
      const logs = await UploadLog.find({ assessment: { $in: assessmentIds } }).lean();
      deleteUploadFiles(logs, UPLOAD_DIR);
      await UploadLog.deleteMany({ assessment: { $in: assessmentIds } });
    }

    // Assessment and Report documents are deliberately NOT deleted — they persist
    // across sessions and are available immediately on re-login.
    res.json({ message: 'Logged out.' });
  } catch (err) { next(err); }
});

// ── Organization profile ────────────────────────────────────────────────────

// GET /api/auth/me — current user + profile completeness
router.get('/me', requireAuth, async (req, res) => {
  const u = req.user.toJSON();
  u.orgProfileComplete = req.user.orgProfileComplete;
  res.json({ user: u });
});

// PUT /api/auth/me/org-profile — create or update
router.put('/me/org-profile', requireAuth, async (req, res, next) => {
  try {
    const p = req.body || {};
    const fields = ['builtUpAreaSqft', 'employees', 'avgDailyOccupancy', 'operatingHoursPerDay', 'numberOfFloors', 'yearEstablished'];
    const updated = { ...(req.user.orgProfile?.toObject?.() || req.user.orgProfile || {}) };
    for (const f of fields) {
      if (p[f] !== undefined && p[f] !== null && p[f] !== '') updated[f] = Number(p[f]);
    }
    if (!Number.isFinite(updated.builtUpAreaSqft) || updated.builtUpAreaSqft <= 0) return res.status(400).json({ error: 'Built-up area (sqft) is required and must be > 0.' });
    if (!Number.isFinite(updated.employees) || updated.employees < 0)              return res.status(400).json({ error: 'Number of employees is required.' });
    if (!Number.isFinite(updated.operatingHoursPerDay) || updated.operatingHoursPerDay <= 0) return res.status(400).json({ error: 'Operating hours per day is required.' });
    updated.completedAt = new Date();
    req.user.orgProfile = updated;
    await req.user.save();
    const u = req.user.toJSON();
    u.orgProfileComplete = req.user.orgProfileComplete;
    res.json({ user: u, message: 'Organization profile saved.' });
  } catch (err) { next(err); }
});

module.exports = router;
