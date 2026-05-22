/**
 * adminLogger — writes an AuditLog entry for every mutating admin action.
 *
 * Usage:
 *   router.post('/users', requireAdminAuth, authorize(...), handler, auditLog('USER_CREATED', 'User'));
 *
 * Or call createAuditEntry() directly inside a controller for fine-grained control.
 */

const AuditLog = require('../models/AuditLog');

/**
 * Creates an audit log entry.
 * @param {Object} params
 */
async function createAuditEntry({
  adminUser,
  action,
  resource,
  resourceId = null,
  before = null,
  after = null,
  meta = null,
  req = null,
  success = true,
  errorMessage = null,
}) {
  try {
    await AuditLog.create({
      adminUser: adminUser?._id || null,
      adminEmail: adminUser?.email || 'system',
      adminRole: adminUser?.role || null,
      action,
      resource,
      resourceId: resourceId ? String(resourceId) : null,
      before,
      after,
      meta,
      ipAddress: req ? (req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.ip) : null,
      userAgent: req ? req.headers['user-agent'] : null,
      success,
      errorMessage,
    });
  } catch (err) {
    // Audit log failures must never crash the main request
    // eslint-disable-next-line no-console
    console.error('[AuditLog] Failed to write audit entry:', err.message);
  }
}

/**
 * Express middleware factory — logs after successful response.
 * Attach AFTER the handler.  Only fires on 2xx responses.
 */
function auditLog(action, resource) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function auditedJson(data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        createAuditEntry({
          adminUser: req.adminUser,
          action,
          resource,
          resourceId: req.params?.id || data?._id || data?.data?._id || null,
          meta: { method: req.method, path: req.path },
          req,
          success: true,
        });
      }
      return originalJson(data);
    };
    next();
  };
}

module.exports = { createAuditEntry, auditLog };
