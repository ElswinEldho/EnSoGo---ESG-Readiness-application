const express = require('express');
const { requireAuth }       = require('../middleware/auth');
const resolveAssessment     = require('../middleware/resolveAssessment');
const Assessment            = require('../models/Assessment');
const { MESSAGES }          = require('../constants');
const {
  buildSummary,
  refreshSummary,
  refreshReadiness,
} = require('../services/assessmentService');

const router = express.Router();
router.use(requireAuth);

// GET /api/assessments — list mine (returns ensogoId; never exposes raw _id)
// .lean() returns plain JS objects instead of Mongoose Documents — faster for
// JSON serialization since we don't call any instance methods on the results.
router.get('/', async (req, res, next) => {
  try {
    const items = await Assessment.find({ user: req.user._id })
      .select('ensogoId organizationName sectorCode status createdAt updatedAt summary.overview.overallCompletenessPct readiness.overall')
      .sort({ updatedAt: -1 })
      .lean();
    res.json(items);
  } catch (err) { next(err); }
});

// POST /api/assessments — create a new assessment
router.post('/', async (req, res, next) => {
  try {
    const userProfile = req.user.orgProfile?.toObject?.() || req.user.orgProfile || {};
    const doc = new Assessment({
      user: req.user._id,
      sectorCode: req.user.sectorCode,
      organizationName: req.body.organizationName || req.user.organizationName,
      orgProfile: { ...userProfile, ...(req.body.orgProfile || {}) },
      governance: req.body.governance || {},
      extras: req.body.extras || {},
    });
    await doc.save();
    res.status(201).json(doc);
  } catch (err) { next(err); }
});

// GET /api/assessments/:id — fetch one (accepts EnSoGo ID)
router.get('/:id', resolveAssessment(), async (req, res, next) => {
  try {
    res.json(req.assessment);
  } catch (err) { next(err); }
});

// PATCH /api/assessments/:id — update profile / governance / extras
router.patch('/:id', resolveAssessment(), async (req, res, next) => {
  try {
    const doc = req.assessment;
    if (req.body.organizationName) doc.organizationName = req.body.organizationName;
    if (req.body.orgProfile) doc.orgProfile = { ...(doc.orgProfile?.toObject?.() || {}), ...req.body.orgProfile };
    if (req.body.governance) doc.governance = { ...(doc.governance?.toObject?.() || {}), ...req.body.governance };
    if (req.body.extras) doc.extras = { ...(doc.extras?.toObject?.() || {}), ...req.body.extras };
    await doc.save();
    res.json(doc);
  } catch (err) { next(err); }
});

// POST /api/assessments/:id/summary — recompute Screen 2
router.post('/:id/summary', resolveAssessment(), async (req, res, next) => {
  try {
    const summary = await refreshSummary(req.assessment);
    res.json(summary);
  } catch (err) { next(err); }
});

// POST /api/assessments/:id/readiness — recompute Screen 3
router.post('/:id/readiness', resolveAssessment(), async (req, res, next) => {
  try {
    const doc = req.assessment;
    // Guard: run validation first; block if there are data errors.
    const tempSummary = await buildSummary(doc);
    if (tempSummary.validation?.hasBlocker) {
      return res.status(422).json({
        error: 'Validation errors found in uploaded data. Resolve all blocking issues (negative values, unit mismatches, cross-category inconsistencies) and re-upload before generating the readiness report.',
        hasBlocker: true,
        blockerCount: tempSummary.validation.summary?.failed || 0,
      });
    }
    const readiness = await refreshReadiness(doc);
    res.json(readiness);
  } catch (err) { next(err); }
});

// DELETE /api/assessments/:id
router.delete('/:id', resolveAssessment(), async (req, res, next) => {
  try {
    await req.assessment.deleteOne();
    res.json({ deleted: 1 });
  } catch (err) { next(err); }
});

module.exports = router;
