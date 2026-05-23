const express = require('express');
const path = require('path');
const fs = require('fs');

const { requireAuth }       = require('../middleware/auth');
const resolveAssessment     = require('../middleware/resolveAssessment');
const Report                = require('../models/Report');
const UPLOAD_DIR            = require('../config/uploadDir');
const { generateCalculationSummary, generateReadinessReport } = require('../utils/pdfReport');
const { refreshSummary, refreshReadiness } = require('../services/assessmentService');

const router = express.Router();
router.use(requireAuth);

// Ensure upload directory exists before writing any PDF files
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function pdfFileName(orgName, kind) {
  const slug = (orgName || 'Organization').replace(/[^a-zA-Z0-9]+/g, '_');
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `EnSoGo_${kind}_${slug}_${date}.pdf`;
}

// Write the PDF buffer to disk, create a Report record, then stream back.
async function persistAndSend(res, buffer, fileName, assessmentId, type, userId) {
  const filePath = path.join(UPLOAD_DIR, fileName);
  await fs.promises.writeFile(filePath, buffer);
  await Report.create({ user: userId, assessment: assessmentId, type, filePath, fileName });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(buffer);
}

// GET /api/reports/:assessmentId/calculation-summary
router.get('/:assessmentId/calculation-summary', resolveAssessment('assessmentId'), async (req, res, next) => {
  try {
    const doc = req.assessment;
    const summary = doc.summary || await refreshSummary(doc);
    const buf = await generateCalculationSummary(summary, {
      organizationName: doc.organizationName,
      assessmentId: doc.ensogoId,   // use public ID in the report, not ObjectID
    });
    return persistAndSend(res, buf, pdfFileName(doc.organizationName, 'Calculation_Summary'), doc._id, 'CalculationSummary', req.user._id);
  } catch (err) { next(err); }
});

// GET /api/reports/:assessmentId/readiness
router.get('/:assessmentId/readiness', resolveAssessment('assessmentId'), async (req, res, next) => {
  try {
    const doc = req.assessment;
    const summary = doc.summary || await refreshSummary(doc);
    const readiness = doc.readiness || await refreshReadiness(doc);
    const buf = await generateReadinessReport(summary, readiness, {
      organizationName: doc.organizationName,
      assessmentId: doc.ensogoId,   // use public ID in the report, not ObjectID
    });
    return persistAndSend(res, buf, pdfFileName(doc.organizationName, 'Readiness_Report'), doc._id, 'FullReadiness', req.user._id);
  } catch (err) { next(err); }
});

// GET /api/reports/:assessmentId — list stored reports
router.get('/:assessmentId', resolveAssessment('assessmentId'), async (req, res, next) => {
  try {
    const items = await Report.find({ assessment: req.assessment._id }).sort({ generatedAt: -1 });
    res.json(items);
  } catch (err) { next(err); }
});

module.exports = router;
