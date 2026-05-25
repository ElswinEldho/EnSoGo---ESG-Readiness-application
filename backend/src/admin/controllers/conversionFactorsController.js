/**
 * Conversion Factors Controller — CRUD for emission/conversion factors.
 * Changes are reflected immediately in the ESG engine via cache invalidation.
 * Existing assessment summaries are also cleared so they recalculate on next access.
 */

const ConversionFactor = require('../models/ConversionFactor');
const Assessment       = require('../../models/Assessment');
const { createAuditEntry }  = require('../middleware/adminLogger');
const { invalidateCache }   = require('../../services/conversionFactorsService');
const { refreshSummary }    = require('../../services/assessmentService');

/**
 * Clears the persisted `summary` from all assessments that have one,
 * so the next time a user views their summary it recalculates using
 * the updated emission factors.
 * Status is kept intact — only the cached summary blob is wiped.
 */
async function _invalidateAssessmentSummaries() {
  try {
    await Assessment.updateMany(
      { summary: { $exists: true, $ne: null } },
      { $unset: { summary: '' } }
    );
  } catch (err) {
    // Non-fatal — calculations will still use new factors, summaries will
    // just remain stale until the user manually triggers recalculation.
    console.error('[conversionFactorsController] Failed to clear stale summaries:', err.message);
  }
}

/**
 * Actively recalculates summaries for all assessments that have records
 * (status SummaryReady or ReadinessReady). Called via the admin panel
 * "Recalculate All" button. Runs serially to avoid overloading the server.
 */
async function recalculateAllAssessments(req, res, next) {
  try {
    const assessments = await Assessment.find({
      status: { $in: ['SummaryReady', 'ReadinessReady', 'DataLoad'] },
      'records': { $exists: true },
    });

    let success = 0;
    let failed = 0;
    const errors = [];

    for (const assessment of assessments) {
      try {
        await refreshSummary(assessment);
        success++;
      } catch (err) {
        failed++;
        errors.push({ id: assessment.ensogoId, error: err.message });
      }
    }

    await createAuditEntry({
      adminUser: req.adminUser,
      action: 'CONVERSION_FACTOR_BULK_RECALCULATE',
      resource: 'Assessment',
      after: { totalProcessed: assessments.length, success, failed },
      req,
    });

    res.json({
      message: `Recalculation complete. ${success} assessments updated, ${failed} failed.`,
      total: assessments.length,
      success,
      failed,
      errors: errors.slice(0, 10), // Return at most 10 errors to avoid huge responses
    });
  } catch (err) { next(err); }
}

async function listConversionFactors(req, res, next) {
  try {
    const { category, search, includeInactive } = req.query;
    const filter = {};
    if (!includeInactive || includeInactive === 'false') filter.isActive = true;
    if (category) filter.category = category;
    if (search) {
      const re = new RegExp(search, 'i');
      filter.$or = [{ key: re }, { label: re }, { unit: re }];
    }
    const factors = await ConversionFactor.find(filter).sort({ category: 1, key: 1 }).lean();
    res.json({ data: factors });
  } catch (err) { next(err); }
}

async function getConversionFactor(req, res, next) {
  try {
    const factor = await ConversionFactor.findById(req.params.id).lean();
    if (!factor) return res.status(404).json({ error: 'Conversion factor not found.' });
    res.json({ data: factor });
  } catch (err) { next(err); }
}

async function createConversionFactor(req, res, next) {
  try {
    const { key, label, value, unit, basis, category, overridable } = req.body;
    const existing = await ConversionFactor.findOne({ key: key.trim() });
    if (existing) return res.status(409).json({ error: 'A factor with this key already exists.' });
    const factor = await ConversionFactor.create({
      key: key.trim(), label: label.trim(), value: Number(value),
      unit: unit.trim(), basis: basis || '', category: category || 'other',
      overridable: overridable !== false,
      lastModifiedBy: req.adminUser._id, lastModifiedByEmail: req.adminUser.email,
    });
    invalidateCache();
    await _invalidateAssessmentSummaries();
    await createAuditEntry({ adminUser: req.adminUser, action: 'CONVERSION_FACTOR_CREATED',
      resource: 'ConversionFactor', resourceId: factor._id,
      after: { key: factor.key, value: factor.value, unit: factor.unit }, req });
    res.status(201).json({ data: factor, message: 'Conversion factor created. Existing assessment summaries will recalculate on next access.' });
  } catch (err) { next(err); }
}

async function updateConversionFactor(req, res, next) {
  try {
    const factor = await ConversionFactor.findById(req.params.id);
    if (!factor) return res.status(404).json({ error: 'Conversion factor not found.' });
    const before = { value: factor.value, unit: factor.unit, label: factor.label };
    const allowed = ['label', 'value', 'unit', 'basis', 'category', 'overridable', 'isActive'];
    for (const f of allowed) {
      if (req.body[f] !== undefined) factor[f] = f === 'value' ? Number(req.body[f]) : req.body[f];
    }
    factor.lastModifiedBy = req.adminUser._id;
    factor.lastModifiedByEmail = req.adminUser.email;
    await factor.save();
    invalidateCache();
    await _invalidateAssessmentSummaries();
    await createAuditEntry({ adminUser: req.adminUser, action: 'CONVERSION_FACTOR_UPDATED',
      resource: 'ConversionFactor', resourceId: factor._id, before,
      after: { value: factor.value, unit: factor.unit, label: factor.label }, req });
    res.json({ data: factor, message: 'Conversion factor updated. Existing assessment summaries will recalculate on next access.' });
  } catch (err) { next(err); }
}

async function deleteConversionFactor(req, res, next) {
  try {
    const factor = await ConversionFactor.findById(req.params.id);
    if (!factor) return res.status(404).json({ error: 'Conversion factor not found.' });
    factor.isActive = false;
    factor.lastModifiedBy = req.adminUser._id;
    factor.lastModifiedByEmail = req.adminUser.email;
    await factor.save();
    invalidateCache();
    await _invalidateAssessmentSummaries();
    await createAuditEntry({ adminUser: req.adminUser, action: 'CONVERSION_FACTOR_DEACTIVATED',
      resource: 'ConversionFactor', resourceId: factor._id,
      before: { key: factor.key, isActive: true }, req });
    res.json({ message: 'Conversion factor deactivated. Existing assessment summaries will recalculate on next access.' });
  } catch (err) { next(err); }
}

module.exports = { listConversionFactors, getConversionFactor, createConversionFactor, updateConversionFactor, deleteConversionFactor, recalculateAllAssessments };
