/**
 * Admin Reports Controller.
 */

const Report = require('../../models/Report');
const { createAuditEntry } = require('../middleware/adminLogger');
const fs = require('fs');

// GET /api/admin/reports
async function listReports(req, res, next) {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const filter = {};
    if (search) {
      filter.$or = [
        { 'meta.orgName': new RegExp(search, 'i') },
        { type: new RegExp(search, 'i') },
      ];
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (Number(page) - 1) * Number(limit);

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .populate('user', 'fullName email organizationName')
        .lean(),
      Report.countDocuments(filter),
    ]);

    res.json({
      data: reports,
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

// DELETE /api/admin/reports/:id
async function deleteReport(req, res, next) {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found.' });

    const before = { type: report.type, filePath: report.filePath };

    if (report.filePath) {
      try { fs.unlinkSync(report.filePath); } catch (_) { /* already gone */ }
    }
    await Report.findByIdAndDelete(report._id);

    await createAuditEntry({
      adminUser: req.adminUser,
      action: 'REPORT_DELETED',
      resource: 'Report',
      resourceId: report._id,
      before,
      req,
    });

    res.json({ message: 'Report deleted.' });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/reports/stats
async function getReportStats(req, res, next) {
  try {
    const total = await Report.countDocuments();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const last30Days = await Report.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    res.json({ data: { total, last30Days } });
  } catch (err) {
    next(err);
  }
}

module.exports = { listReports, deleteReport, getReportStats };
