/**
 * Admin Assessments Controller — read-only monitoring of ESG assessments.
 */

const Assessment = require('../../models/Assessment');
const { parsePaginationParams, paginatedResponse } = require('../utils/pagination');

// GET /api/admin/assessments
async function listAssessments(req, res, next) {
  try {
    const { search = '', status, sector } = req.query;
    const { page, limit, skip, sort } = parsePaginationParams(req.query);

    const filter = {};
    if (status) filter.status = status;
    if (sector) filter.sectorCode = sector.toUpperCase();
    if (search) filter.organizationName = new RegExp(search, 'i');

    const [assessments, total] = await Promise.all([
      Assessment.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('user', 'fullName email organizationName sectorCode')
        .lean(),
      Assessment.countDocuments(filter),
    ]);

    res.json(paginatedResponse(assessments, total, page, limit));
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/assessments/:id
async function getAssessment(req, res, next) {
  try {
    const assessment = await Assessment.findById(req.params.id)
      .populate('user', 'fullName email organizationName sectorCode country')
      .lean();
    if (!assessment) return res.status(404).json({ error: 'Assessment not found.' });
    res.json({ data: assessment });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/assessments/stats
async function getAssessmentStats(req, res, next) {
  try {
    const [total, dataLoad, summaryReady, readinessReady, archived] = await Promise.all([
      Assessment.countDocuments(),
      Assessment.countDocuments({ status: 'DataLoad' }),
      Assessment.countDocuments({ status: 'SummaryReady' }),
      Assessment.countDocuments({ status: 'ReadinessReady' }),
      Assessment.countDocuments({ status: 'Archived' }),
    ]);

    res.json({ data: { total, dataLoad, summaryReady, readinessReady, archived } });
  } catch (err) {
    next(err);
  }
}

module.exports = { listAssessments, getAssessment, getAssessmentStats };
