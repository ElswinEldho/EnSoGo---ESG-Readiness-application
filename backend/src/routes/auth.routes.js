const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');

const User = require('../models/User');
const { issueToken } = require('../middleware/auth');
const { SECTORS, isValidSector } = require('../data/sectors');
const { sendResetCode } = require('../utils/mailer');
const Assessment = require('../models/Assessment');
const UploadLog = require('../models/UploadLog');
const UPLOAD_DIR = require('../config/uploadDir');

const router = express.Router();

// Stricter limits on auth endpoints
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
router.use(authLimiter);

// ── helpers ────────────────────────────────────────────────────────────────
const PWD_RE = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegistration(body) {
  const errors = {};
  if (!body.fullName || body.fullName.trim().length < 2) errors.fullName = 'Full name is required (min 2 chars).';
  if (!body.email || !EMAIL_RE.test(body.email)) errors.email = 'Valid email is required.';
  if (!body.password || !PWD_RE.test(body.password)) errors.password = 'Password must be ≥ 8 chars with 1 uppercase, 1 number, 1 symbol.';
  if (body.password !== body.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  if (!body.organizationName || body.organizationName.trim().length < 2) errors.organizationName = 'Organization name is required.';
  if (!body.sectorCode || !isValidSector(body.sectorCode)) errors.sectorCode = 'Choose a sector.';
  if (!body.country) errors.country = 'Country is required.';
  if (!body.stateRegion) errors.stateRegion = 'State / region is required.';
  if (!body.termsAccepted) errors.termsAccepted = 'You must accept the terms.';
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
    if (Object.keys(errors).length) return res.status(400).json({ error: 'Validation failed', fields: errors });

    const existing = await User.findOne({ email: req.body.email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'An account with this email already exists. Please log in or use a different email.' });

    const verificationToken = crypto.randomBytes(20).toString('hex');
    const user = new User({
      fullName: req.body.fullName.trim(),
      email: req.body.email.toLowerCase().trim(),
      organizationName: req.body.organizationName.trim(),
      sectorCode: req.body.sectorCode.toUpperCase(),
      country: req.body.country,
      stateRegion: req.body.stateRegion,
      listed: !!req.body.listed,
      termsAccepted: true,
      verificationToken,
      verificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
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
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: 'No account found with this email address.' });

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(423).json({ error: 'Account locked. Please try again later.' });
    }
    if (user.accountStatus !== 'Active') {
      return res.status(403).json({ error: 'Please verify your email before logging in.' });
    }

    const ok = await user.verifyPassword(password);
    if (!ok) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        user.failedLoginAttempts = 0;
      }
      await user.save();
      return res.status(401).json({ error: 'Incorrect password.' });
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
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Pretend success — don't leak whether an account exists
      return res.json({ message: 'If an account exists with that email, a code has been sent.' });
    }

    const code = generate6DigitCode();
    user.passwordResetToken = code;
    user.passwordResetExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
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
      email: email.toLowerCase(),
      passwordResetToken: String(code).trim(),
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
    if (!PWD_RE.test(newPassword || '')) {
      return res.status(400).json({ error: 'Password must be ≥ 8 chars with 1 uppercase, 1 number, 1 symbol.' });
    }
    if (!email || !code) return res.status(400).json({ error: 'Email and code are required.' });

    const user = await User.findOne({
      email: email.toLowerCase(),
      passwordResetToken: String(code).trim(),
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
const { requireAuth } = require('../middleware/auth');

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
      // Delete physical upload files from disk.
      const logs = await UploadLog.find({ assessment: { $in: assessmentIds } }).lean();
      for (const log of logs) {
        if (log.storedName && log.storedName !== '-') {
          try {
            fs.unlinkSync(path.join(UPLOAD_DIR, log.storedName));
          } catch (_e) { /* already gone — ignore */ }
        }
      }
      // Remove all UploadLog documents for this user's assessments.
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
    const next = { ...(req.user.orgProfile?.toObject?.() || req.user.orgProfile || {}) };
    for (const f of fields) {
      if (p[f] !== undefined && p[f] !== null && p[f] !== '') next[f] = Number(p[f]);
    }
    if (!Number.isFinite(next.builtUpAreaSqft) || next.builtUpAreaSqft <= 0) return res.status(400).json({ error: 'Built-up area (sqft) is required and must be > 0.' });
    if (!Number.isFinite(next.employees) || next.employees < 0) return res.status(400).json({ error: 'Number of employees is required.' });
    if (!Number.isFinite(next.operatingHoursPerDay) || next.operatingHoursPerDay <= 0) return res.status(400).json({ error: 'Operating hours per day is required.' });
    next.completedAt = new Date();
    req.user.orgProfile = next;
    await req.user.save();
    const u = req.user.toJSON();
    u.orgProfileComplete = req.user.orgProfileComplete;
    res.json({ user: u, message: 'Organization profile saved.' });
  } catch (err) { next(err); }
});

module.exports = router;
