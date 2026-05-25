/**
 * Admin Reports Controller.
 */

const Report     = require('../../models/Report');
const { createAuditEntry }               = require('../middleware/adminLogger');
const { parsePaginationParams, paginatedResponse } = require('../utils/pagination');
const { deleteFileSafely, daysAgo }      = require('../../utils/fileUtils');

// GET /api/admin/reports
async function listReports(req, res, next) {
  try {
    const { search = '' } = req.query;
    const { page, limit, skip, sort } = parsePaginationParams(req.query);

    const filter = {};
    if (search) {
      filter.$or = [
        { 'meta.orgName': new RegExp(search, 'i') },
        { type: new RegExp(search, 'i') },
      ];
    }

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('user', 'fullName email organizationName')
        .lean(),
      Report.countDocuments(filter),
    ]);

    res.json(paginatedResponse(reports, total, page, limit));
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

    if (report.filePath) deleteFileSafely(report.filePath);
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
    const [total, last30Days] = await Promise.all([
      Report.countDocuments(),
      Report.countDocuments({ createdAt: { $gte: daysAgo(30) } }),
    ]);
    res.json({ data: { total, last30Days } });
  } catch (err) {
    next(err);
  }
}

module.exports = { listReports, deleteReport, getReportStats };
