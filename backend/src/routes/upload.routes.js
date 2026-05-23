const express = require('express');
const fs      = require('fs');
const path    = require('path');

const { requireAuth }       = require('../middleware/auth');
const resolveAssessment     = require('../middleware/resolveAssessment');
const upload                = require('../middleware/upload');
const Assessment            = require('../models/Assessment');
const UploadLog             = require('../models/UploadLog');
const UPLOAD_DIR            = require('../config/uploadDir');
const { parseFile, parseMonthStrict, parseYearStrict } = require('../utils/fileParser');
const { UPLOAD_CATEGORIES, MESSAGES } = require('../constants');

const router = express.Router();
router.use(requireAuth);

const ALLOWED_CATEGORIES = UPLOAD_CATEGORIES;

// ── Helpers ──────────────────────────────────────────────────────────────────

// Hard-delete logs + physical files for one category (used on replace and on clear).
async function archivePreviousFiles(assessmentId, category) {
  const old = await UploadLog.find({ assessment: assessmentId, category });
  for (const log of old) {
    if (log.storedName && log.storedName !== '-') {
      try { fs.unlinkSync(path.join(UPLOAD_DIR, log.storedName)); } catch (_e) { /* already gone */ }
    }
  }
  await UploadLog.deleteMany({ assessment: assessmentId, category });
}

// Alias used by explicit clear operations — same behaviour.
async function purgeAllLogs(assessmentId, category) {
  const old = await UploadLog.find({ assessment: assessmentId, category });
  for (const log of old) {
    if (log.storedName && log.storedName !== '-') {
      try { fs.unlinkSync(path.join(UPLOAD_DIR, log.storedName)); } catch (_e) { /* ignore */ }
    }
  }
  const r = await UploadLog.deleteMany({ assessment: assessmentId, category });
  return r.deletedCount;
}

// Consolidate duplicate (year, month) entries by summing their values.
// Returns one record per unique (year, month) pair.
function consolidateDuplicates(records) {
  const map = new Map();
  for (const r of records) {
    const k = `${r.year}-${r.month}`;
    if (map.has(k)) {
      const existing = map.get(k);
      existing.value = Math.round((existing.value + r.value) * 100) / 100;
      // Preserve and accumulate transport sub-fields across duplicate month entries
      if (r.fleetFuel > 0) existing.fleetFuel = Math.round(((existing.fleetFuel || 0) + r.fleetFuel) * 100) / 100;
      if (r.cargo     > 0) existing.cargo     = Math.round(((existing.cargo     || 0) + r.cargo)     * 100) / 100;
      if (r.pngCng    > 0) existing.pngCng    = Math.round(((existing.pngCng    || 0) + r.pngCng)    * 100) / 100;
    } else {
      map.set(k, { ...r });
    }
  }
  return Array.from(map.values());
}

// ── POST /:assessmentId/:category  (file upload) ─────────────────────────────
router.post('/:assessmentId/:category', resolveAssessment('assessmentId'), upload.single('file'), async (req, res, next) => {
  try {
    const { category } = req.params;
    if (!ALLOWED_CATEGORIES.includes(category))
      return res.status(400).json({ error: MESSAGES.CATEGORY_UNKNOWN(category) });

    const assessment = req.assessment;
    if (!req.file)   return res.status(400).json({ error: MESSAGES.NO_FILE_UPLOADED });

    const { records, invalidValueRows } = await parseFile(req.file.path, category);

    // Reject the entire upload when any data row has a non-numeric value in a
    // calculation field.  Surface the first few offenders so the user can fix them.
    if (invalidValueRows && invalidValueRows.length > 0) {
      try { fs.unlinkSync(req.file.path); } catch (_e) { /* ignore */ }
      const sample = invalidValueRows.slice(0, 3)
        .map((r) => `${r.month}/${r.year} — ${r.column}: "${r.rawValue}"`)
        .join('; ');
      return res.status(400).json({
        error: 'Invalid data entered',
        detail: `${invalidValueRows.length} row(s) contain non-numeric values in calculation field(s). ${sample}`,
        invalidValueRows,
      });
    }

    if (!records.length) {
      try { fs.unlinkSync(req.file.path); } catch (_e) { /* ignore */ }
      const ext  = (req.file.originalname.split('.').pop() || '').toLowerCase();
      const hint = ext === 'pdf'
        ? 'No monthly figures could be extracted from this PDF. Try the official EnSoGo template (XLSX/CSV) or Manual Entry.'
        : ['jpg','jpeg','png'].includes(ext)
          ? 'Images cannot be parsed. Upload a CSV/XLSX/PDF template, or use Manual Entry.'
          : 'No monthly rows detected. Use the EnSoGo template, or columns "month,year,value" in CSV/XLSX.';
      return res.status(400).json({ error: hint, monthsAdded: 0 });
    }

    const consolidated = consolidateDuplicates(records);
    const previousMonths = (assessment.records?.[category] || []).length;

    // Archive old files first, then atomically replace records via $set
    // to avoid Mongoose change-tracking issues with nested arrays.
    await archivePreviousFiles(assessment._id, category);
    await Assessment.findOneAndUpdate(
      { _id: assessment._id },
      { $set: { [`records.${category}`]: consolidated } },
      { strict: false }
    );

    const monthsAdded = consolidated.map((r) => `${r.year}-${String(r.month).padStart(2, '0')}`);
    await UploadLog.create({ assessment: assessment._id, category,
      fileName: req.file.originalname, storedName: req.file.filename,
      size: req.file.size, status: 'Uploaded', monthsAdded });
    res.json({
      message: `Replaced ${category} data with ${consolidated.length} record(s) from ${req.file.originalname}. Previous: ${previousMonths} record(s).`,
      monthsAdded, totalMonths: consolidated.length, replaced: previousMonths,
    });
  } catch (err) {
    if (req.file && req.file.path) try { fs.unlinkSync(req.file.path); } catch (_e) { /* ignore */ }
    next(err);
  }
});

// ── POST /:assessmentId/:category/manual  (manual entry) ─────────────────────
router.post('/:assessmentId/:category/manual', resolveAssessment('assessmentId'), express.json(), async (req, res, next) => {
  try {
    const { category } = req.params;
    if (!ALLOWED_CATEGORIES.includes(category))
      return res.status(400).json({ error: MESSAGES.CATEGORY_UNKNOWN(category) });

    const assessment = req.assessment;
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

    const rawRows = Array.isArray(req.body.rows) ? req.body.rows : [];

    // Validate each row's month, year, and value using the same strict rules as file upload.
    // value must be a finite number — reject the whole request if any provided value is not.
    let hasInvalidMonth = false;
    let hasInvalidYear  = false;
    let hasInvalidValue = false;
    const cleaned = [];

    for (const r of rawRows) {
      // Month: accept string name or numeric 1-12
      let monthNum;
      if (typeof r.month === 'string') {
        const mr = parseMonthStrict(r.month);
        if (mr.invalid) { hasInvalidMonth = true; continue; }
        if (mr.value === null) continue;
        monthNum = mr.value;
      } else if (Number.isInteger(r.month) && r.month >= 1 && r.month <= 12) {
        monthNum = r.month;
      } else { continue; }

      // Year: must be 4-digit integer
      let yearNum;
      if (typeof r.year === 'string') {
        const yr = parseYearStrict(r.year);
        if (yr.invalid) { hasInvalidYear = true; continue; }
        if (yr.value === null) continue;
        yearNum = yr.value;
      } else if (Number.isInteger(r.year) && r.year >= 1000 && r.year <= 9999) {
        yearNum = r.year;
      } else { hasInvalidYear = true; continue; }

      // Value: must be a finite number — null (JSON-serialised NaN) or non-finite = invalid
      if (r.value === null || r.value === undefined || !Number.isFinite(Number(r.value))) {
        hasInvalidValue = true; continue;
      }
      cleaned.push({ month: monthNum, year: yearNum, value: Number(r.value) });
    }

    if (hasInvalidValue)
      return res.status(400).json({ error: 'Invalid data entered' });
    if (hasInvalidMonth)
      return res.status(400).json({ error: 'Enter correct month format' });
    if (hasInvalidYear)
      return res.status(400).json({ error: 'Invalid year format. Data cannot be added.' });

    // Multiple-year check
    const yearSet = [...new Set(cleaned.map((r) => r.year))];
    if (yearSet.length > 1)
      return res.status(400).json({ error: 'Different years cannot be uploaded together.' });

    if (!cleaned.length)
      return res.status(400).json({ error: 'No valid rows supplied. Each row needs month, year (yyyy), and value.' });

    const consolidated = consolidateDuplicates(cleaned);
    const previousMonths = (assessment.records?.[category] || []).length;

    // Archive old logs, then atomically replace records via $set.
    await archivePreviousFiles(assessment._id, category);
    await Assessment.findOneAndUpdate(
      { _id: assessment._id },
      { $set: { [`records.${category}`]: consolidated } },
      { strict: false }
    );

    const monthsAdded = consolidated.map((r) => `${r.year}-${String(r.month).padStart(2, '0')}`);
    await UploadLog.create({ assessment: assessment._id, category,
      fileName: 'Manual entry', storedName: '-', size: 0, status: 'Uploaded', monthsAdded });
    res.json({
      message: `Saved ${consolidated.length} record(s); previous ${previousMonths} record(s) replaced.`,
      totalMonths: assessment.records[category].length,
    });
  } catch (err) { next(err); }
});

// ── DELETE /:assessmentId  (clear ALL categories — atomic single save) ────────
router.delete('/:assessmentId', resolveAssessment('assessmentId'), async (req, res, next) => {
  try {
    const assessment = req.assessment;
    let totalPurged = 0;
    const clearSet = {};
    for (const cat of ALLOWED_CATEGORIES) {
      clearSet[`records.${cat}`] = [];
      totalPurged += await purgeAllLogs(assessment._id, cat);
    }
    await Assessment.findOneAndUpdate(
      { _id: assessment._id },
      { $set: clearSet },
      { strict: false }
    );
    res.json({ message: `All category data cleared. Removed ${totalPurged} log entry(ies).` });
  } catch (err) { next(err); }
});

// ── DELETE /:assessmentId/:category  (clear one category) ────────────────────
router.delete('/:assessmentId/:category', resolveAssessment('assessmentId'), async (req, res, next) => {
  try {
    const { category } = req.params;
    if (!ALLOWED_CATEGORIES.includes(category))
      return res.status(400).json({ error: MESSAGES.CATEGORY_UNKNOWN(category) });

    const assessment = req.assessment;
    const purgedLogs = await purgeAllLogs(assessment._id, category);
    await Assessment.findOneAndUpdate(
      { _id: assessment._id },
      { $set: { [`records.${category}`]: [] } },
      { strict: false }
    );
    res.json({ message: `Cleared ${category} data. Removed ${purgedLogs} log entry(ies).`, totalMonths: 0 });
  } catch (err) { next(err); }
});

// ── GET /:assessmentId  (recent upload log) ───────────────────────────────────
router.get('/:assessmentId', resolveAssessment('assessmentId'), async (req, res, next) => {
  try {
    const assessment = req.assessment;
    const items = await UploadLog.find({ assessment: assessment._id, status: { $ne: 'Replaced' } })
      .sort({ createdAt: -1 }).limit(20).lean();
    res.json(items);
  } catch (err) { next(err); }
});

// ── GET /templates/:category  (download official template) ───────────────────
router.get('/templates/:category', (req, res) => {
  const { category } = req.params;
  if (!ALLOWED_CATEGORIES.includes(category))
    return res.status(404).json({ error: `No template for category: ${category}` });
  const filePath = path.join(__dirname, '..', '..', 'templates', `${category}.xlsx`);
  if (!fs.existsSync(filePath))
    return res.status(404).json({ error: `Template file missing on server: ${category}.xlsx` });
  res.download(filePath, `EnSoGo_${category.charAt(0).toUpperCase() + category.slice(1)}_Template.xlsx`);
});

module.exports = router;
