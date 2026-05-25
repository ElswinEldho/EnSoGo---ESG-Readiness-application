/**
 * Admin Analytics Controller — dashboard KPIs and chart data.
 */

const User       = require('../../models/User');
const Assessment = require('../../models/Assessment');
const Report     = require('../../models/Report');
const UploadLog  = require('../../models/UploadLog');
const AuditLog   = require('../models/AuditLog');
const { SECTORS } = require('../../data/sectors');
const { daysAgo } = require('../../utils/fileUtils');

// GET /api/admin/analytics/dashboard — main dashboard KPIs
async function getDashboardStats(req, res, next) {
  try {
    const thirtyDaysAgo = daysAgo(30);

    const [
      totalUsers,
      activeUsers,
      newUsersLast30Days,
      totalAssessments,
      assessmentsLast30Days,
      completedAssessments,
      totalReports,
      reportsLast30Days,
      totalUploads,
      recentAuditLogs,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ accountStatus: 'Active' }),
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Assessment.countDocuments(),
      Assessment.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Assessment.countDocuments({ status: { $in: ['ReadinessReady', 'SummaryReady'] } }),
      Report.countDocuments(),
      Report.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      UploadLog.countDocuments(),
      AuditLog.find().sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    res.json({
      data: {
        kpis: {
          totalUsers,
          activeUsers,
          newUsersLast30Days,
          totalAssessments,
          assessmentsLast30Days,
          completedAssessments,
          totalReports,
          reportsLast30Days,
          totalUploads,
        },
        recentActivity: recentAuditLogs,
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/analytics/user-growth — user registrations over time
async function getUserGrowth(req, res, next) {
  try {
    const { days = 30 } = req.query;

    const result = await User.aggregate([
      { $match: { createdAt: { $gte: daysAgo(Number(days)) } } },
      {
        $group: {
          _id: {
            year:  { $year:       '$createdAt' },
            month: { $month:      '$createdAt' },
            day:   { $dayOfMonth: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    const data = result.map((r) => ({
      date:  `${r._id.year}-${String(r._id.month).padStart(2, '0')}-${String(r._id.day).padStart(2, '0')}`,
      count: r.count,
    }));

    res.json({ data });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/analytics/assessments-by-status — pie/donut chart data
async function getAssessmentsByStatus(req, res, next) {
  try {
    const result = await Assessment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const data = result.map((r) => ({ status: r._id, count: r.count }));
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/analytics/assessments-by-sector
async function getAssessmentsBySector(req, res, next) {
  try {
    const result = await Assessment.aggregate([
      { $group: { _id: '$sectorCode', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
    const data = result.map((r) => ({
      sector: (SECTORS[r._id] && SECTORS[r._id].name) || r._id,
      code:   r._id,
      count:  r.count,
    }));
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/analytics/upload-activity — uploads per day
async function getUploadActivity(req, res, next) {
  try {
    const { days = 14 } = req.query;

    const result = await UploadLog.aggregate([
      { $match: { createdAt: { $gte: daysAgo(Number(days)) } } },
      {
        $group: {
          _id: {
            year:     { $year:       '$createdAt' },
            month:    { $month:      '$createdAt' },
            day:      { $dayOfMonth: '$createdAt' },
            category: '$category',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardStats,
  getUserGrowth,
  getAssessmentsByStatus,
  getAssessmentsBySector,
  getUploadActivity,
};
