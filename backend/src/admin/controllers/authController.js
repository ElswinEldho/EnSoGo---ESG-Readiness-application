/**
 * Admin Auth Controller
 */

const AdminUser = require('../models/AdminUser');
const { issueAdminToken } = require('../middleware/adminAuth');
const { createAuditEntry } = require('../middleware/adminLogger');

// POST /api/admin/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const admin = await AdminUser.findOne({ email: email.toLowerCase().trim() });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!admin.isActive) {
      return res.status(403).json({ error: 'This admin account has been deactivated.' });
    }

    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((admin.lockedUntil - Date.now()) / 60000);
      return res.status(423).json({
        error: `Account locked. Try again in ${minutesLeft} minute(s).`,
      });
    }

    const ok = await admin.verifyPassword(password);
    if (!ok) {
      admin.failedLoginAttempts = (admin.failedLoginAttempts || 0) + 1;
      if (admin.failedLoginAttempts >= 5) {
        admin.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 min lock
        admin.failedLoginAttempts = 0;
        await admin.save();
        return res.status(423).json({ error: 'Too many failed attempts. Account locked for 30 minutes.' });
      }
      await admin.save();
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Successful login
    admin.failedLoginAttempts = 0;
    admin.lockedUntil = undefined;
    admin.lastLoginAt = new Date();
    await admin.save();

    const token = issueAdminToken(admin);

    await createAuditEntry({
      adminUser: admin,
      action: 'ADMIN_LOGIN',
      resource: 'AdminUser',
      resourceId: admin._id,
      req,
    });

    res.json({ admin: admin.toJSON(), token });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/auth/me
async function getMe(req, res) {
  const admin = req.adminUser;
  res.json({ admin: admin.toJSON() });
}

// POST /api/admin/auth/logout
async function logout(req, res, next) {
  try {
    await createAuditEntry({
      adminUser: req.adminUser,
      action: 'ADMIN_LOGOUT',
      resource: 'AdminUser',
      resourceId: req.adminUser._id,
      req,
    });
    res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, getMe, logout };
