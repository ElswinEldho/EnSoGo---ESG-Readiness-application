/**
 * Admin Users Controller — manage regular platform users (User model).
 */

const User       = require('../../models/User');
const Assessment = require('../../models/Assessment');
const Report     = require('../../models/Report');
const UploadLog  = require('../../models/UploadLog');
const UPLOAD_DIR = require('../../config/uploadDir');
const { createAuditEntry }               = require('../middleware/adminLogger');
const { parsePaginationParams, paginatedResponse } = require('../utils/pagination');
const { deleteFileSafely, deleteUploadFiles, daysAgo } = require('../../utils/fileUtils');

// GET /api/admin/users — paginated list with search/filter
async function listUsers(req, res, next) {
  try {
    const { search = '', status, sector } = req.query;
    const { page, limit, skip, sort } = parsePaginationParams(req.query);

    const filter = {};
    if (search) {
      const re = new RegExp(search, 'i');
      filter.$or = [{ fullName: re }, { email: re }, { organizationName: re }];
    }
    if (status) filter.accountStatus = status;
    if (sector) filter.sectorCode = sector.toUpperCase();

    const [users, total] = await Promise.all([
      User.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ]);

    res.json(paginatedResponse(users, total, page, limit));
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/users/:id
async function getUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const assessmentCount = await Assessment.countDocuments({ user: user._id });
    res.json({ data: { ...user, assessmentCount } });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/users/:id/status — activate / lock / suspend a user
async function updateUserStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!['Active', 'Locked', 'PendingVerification'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const before = { accountStatus: user.accountStatus };
    user.accountStatus = status;
    if (status === 'Active') {
      user.failedLoginAttempts = 0;
      user.lockedUntil = undefined;
    }
    await user.save();

    await createAuditEntry({
      adminUser: req.adminUser,
      action: 'USER_STATUS_CHANGED',
      resource: 'User',
      resourceId: user._id,
      before,
      after: { accountStatus: status },
      req,
    });

    res.json({ data: user.toJSON(), message: `User status updated to ${status}.` });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/users/:id — hard delete with all associated data
async function deleteUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const before = { email: user.email, organizationName: user.organizationName };

    // Remove reports (PDFs on disk)
    const reports = await Report.find({ user: user._id });
    for (const report of reports) {
      if (report.filePath) deleteFileSafely(report.filePath);
    }
    await Report.deleteMany({ user: user._id });

    // Remove upload files and logs
    const assessments = await Assessment.find({ user: user._id });
    for (const assessment of assessments) {
      const logs = await UploadLog.find({ assessment: assessment._id }).lean();
      deleteUploadFiles(logs, UPLOAD_DIR);
      await UploadLog.deleteMany({ assessment: assessment._id });
    }
    await Assessment.deleteMany({ user: user._id });
    await User.findByIdAndDelete(user._id);

    await createAuditEntry({
      adminUser: req.adminUser,
      action: 'USER_DELETED',
      resource: 'User',
      resourceId: user._id,
      before,
      req,
    });

    res.json({ message: 'User and all associated data deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/users/stats — summary stats
async function getUserStats(req, res, next) {
  try {
    const thirtyDaysAgo = daysAgo(30);

    const [total, active, locked, pending, newLast30Days] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ accountStatus: 'Active' }),
      User.countDocuments({ accountStatus: 'Locked' }),
      User.countDocuments({ accountStatus: 'PendingVerification' }),
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    ]);

    res.json({ data: { total, active, locked, pending, newLast30Days } });
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers, getUser, updateUserStatus, deleteUser, getUserStats };
