/**
 * adminAuthorize — role-based access control middleware factory.
 *
 * Usage:
 *   router.delete('/users/:id', requireAdminAuth, authorize('users:delete'), handler);
 *   router.put('/config', requireAdminAuth, authorize(['systemconfig:write']), handler);
 *   router.get('/anything', requireAdminAuth, requireRole('SUPER_ADMIN', 'ADMIN'), handler);
 */

const { ROLE_PERMISSIONS } = require('../models/AdminUser');

/**
 * Checks that req.adminUser has ALL of the listed permissions.
 * SUPER_ADMIN always passes.
 * @param {string|string[]} permissions
 */
function authorize(permissions) {
  const required = Array.isArray(permissions) ? permissions : [permissions];
  return (req, res, next) => {
    if (!req.adminUser) {
      return res.status(401).json({ error: 'Unauthenticated.' });
    }
    const perms = ROLE_PERMISSIONS[req.adminUser.role] || [];
    const isSuperAdmin = perms.includes('*');
    if (isSuperAdmin) return next();

    const missing = required.filter((p) => !perms.includes(p));
    if (missing.length > 0) {
      return res.status(403).json({
        error: `Insufficient permissions. Required: ${missing.join(', ')}`,
      });
    }
    next();
  };
}

/**
 * Checks that req.adminUser.role is one of the allowed roles.
 * @param {...string} roles
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.adminUser) {
      return res.status(401).json({ error: 'Unauthenticated.' });
    }
    if (!roles.includes(req.adminUser.role)) {
      return res.status(403).json({
        error: `Access restricted to roles: ${roles.join(', ')}`,
      });
    }
    next();
  };
}

module.exports = { authorize, requireRole };
