/**
 * Admin Uploads Controller — monitor upload activity.
 */

const UploadLog = require('../../models/UploadLog');
const { parsePaginationParams, paginatedResponse } = require('../utils/pagination');

// GET /api/admin/uploads
async function listUploads(req, res, next) {
  try {
    const { search = '', category, status } = req.query;
    const { page, limit, skip, sort } = parsePaginationParams(req.query);

    const filter = {};
    if (category) filter.category = category;
    if (status)   filter.status   = status;
    if (search)   filter.originalName = new RegExp(search, 'i');

    const [uploads, total] = await Promise.all([
      UploadLog.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('assessment', 'organizationName sectorCode status')
        .lean(),
      UploadLog.countDocuments(filter),
    ]);

    res.json(paginatedResponse(uploads, total, page, limit));
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/uploads/stats
async function getUploadStats(req, res, next) {
  try {
    const total = await UploadLog.countDocuments();
    const byCategory = await UploadLog.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({ data: { total, byCategory } });
  } catch (err) {
    next(err);
  }
}

module.exports = { listUploads, getUploadStats };
