/**
 * Admin Audit Logs Controller.
 */

const AuditLog = require('../models/AuditLog');

// GET /api/admin/audit-logs
async function listAuditLogs(req, res, next) {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      action,
      resource,
      adminEmail,
      from,
      to,
      sortOrder = 'desc',
    } = req.query;

    const filter = {};
    if (action) filter.action = action;
    if (resource) filter.resource = resource;
    if (adminEmail) filter.adminEmail = new RegExp(adminEmail, 'i');
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    if (search) {
      const re = new RegExp(search, 'i');
      filter.$or = [
        { action: re },
        { resource: re },
        { adminEmail: re },
        { resourceId: re },
      ];
    }

    const sort = { createdAt: sortOrder === 'asc' ? 1 : -1 };
    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort(sort).skip(skip).limit(Number(limit)).lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      data: logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/audit-logs/actions — distinct action types for filter dropdown
async function getActionTypes(req, res, next) {
  try {
    const actions = await AuditLog.distinct('action');
    res.json({ data: actions.sort() });
  } catch (err) {
    next(err);
  }
}

module.exports = { listAuditLogs, getActionTypes };
