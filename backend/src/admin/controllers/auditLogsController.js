/**
 * Admin Audit Logs Controller.
 */

const AuditLog = require('../models/AuditLog');
const { parsePaginationParams, paginatedResponse } = require('../utils/pagination');

// GET /api/admin/audit-logs
async function listAuditLogs(req, res, next) {
  try {
    const { search = '', action, resource, adminEmail, from, to, sortOrder = 'desc' } = req.query;

    // Audit logs always sort by createdAt — sortBy is not user-configurable here.
    const { page, limit, skip } = parsePaginationParams(req.query, { limit: 50 });
    const sort = { createdAt: sortOrder === 'asc' ? 1 : -1 };

    const filter = {};
    if (action)     filter.action     = action;
    if (resource)   filter.resource   = resource;
    if (adminEmail) filter.adminEmail = new RegExp(adminEmail, 'i');
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(to);
    }
    if (search) {
      const re = new RegExp(search, 'i');
      filter.$or = [{ action: re }, { resource: re }, { adminEmail: re }, { resourceId: re }];
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.json(paginatedResponse(logs, total, page, limit));
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
