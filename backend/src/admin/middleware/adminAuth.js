/**
 * adminAuth middleware — verifies the admin JWT and attaches req.adminUser.
 * Admin tokens use a separate secret (ADMIN_JWT_SECRET) so they cannot be
 * confused with regular user tokens.
 */

const jwt = require('jsonwebtoken');
const AdminUser = require('../models/AdminUser');

const ADMIN_JWT_SECRET =
  process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'admin-dev-secret-change-me';
const ADMIN_JWT_EXPIRES_IN = process.env.ADMIN_JWT_EXPIRES_IN || '8h';

function issueAdminToken(adminUser) {
  return jwt.sign(
    {
      sub: adminUser._id.toString(),
      email: adminUser.email,
      role: adminUser.role,
      type: 'admin',
    },
    ADMIN_JWT_SECRET,
    { expiresIn: ADMIN_JWT_EXPIRES_IN }
  );
}

async function requireAdminAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [, token] = header.split(' ');
    if (!token) {
      return res.status(401).json({ error: 'Admin authorization token missing.' });
    }

    let payload;
    try {
      payload = jwt.verify(token, ADMIN_JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Admin session expired. Please log in again.' });
      }
      return res.status(401).json({ error: 'Invalid admin token.' });
    }

    // Ensure this is an admin token (not a regular user token)
    if (payload.type !== 'admin') {
      return res.status(403).json({ error: 'Access denied: not an admin token.' });
    }

    const adminUser = await AdminUser.findById(payload.sub);
    if (!adminUser) {
      return res.status(401).json({ error: 'Admin account not found.' });
    }
    if (!adminUser.isActive) {
      return res.status(403).json({ error: 'Admin account is deactivated.' });
    }
    if (adminUser.lockedUntil && adminUser.lockedUntil > new Date()) {
      return res.status(423).json({ error: 'Admin account is temporarily locked.' });
    }

    req.adminUser = adminUser;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAdminAuth, issueAdminToken };
