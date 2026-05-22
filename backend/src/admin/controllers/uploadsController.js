/**
 * Admin Uploads Controller — monitor upload activity.
 */

const UploadLog = require('../../models/UploadLog');

// GET /api/admin/uploads
async function listUploads(req, res, next) {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      category,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (search) {
      filter.originalName = new RegExp(search, 'i');
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (Number(page) - 1) * Number(limit);

    const [uploads, total] = await Promise.all([
      UploadLog.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .populate('assessment', 'organizationName sectorCode status')
        .lean(),
      UploadLog.countDocuments(filter),
    ]);

    res.json({
      data: uploads,
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
