// Annualization engine — BRD §6.
// Pure functions; no side effects.

const { lookupConfidence } = require('../data/confidence');

/**
 *  Annualize a partial monthly series.
 *  Returns { monthsUploaded, uploadedTotal, monthlyAverage, annualValue, isEstimated, modifier, level, message }
 */
function annualize(records = []) {
  // Aggregate per (year,month) to deduplicate.
  const monthly = new Map();
  for (const r of records) {
    if (!r || !Number.isFinite(r.value)) continue;
    const k = `${r.year}-${r.month}`;
    monthly.set(k, (monthly.get(k) || 0) + r.value);
  }
  const monthsUploaded = monthly.size;
  const uploadedTotal = Array.from(monthly.values()).reduce((a, b) => a + b, 0);
  const conf = lookupConfidence(monthsUploaded);

  if (monthsUploaded < 6) {
    return {
      monthsUploaded,
      uploadedTotal,
      monthlyAverage: 0,
      annualValue: 0,
      isEstimated: false,
      sufficient: false,
      modifier: 0,
      level: conf.level,
      message: 'Insufficient data — minimum 6 distinct months required for annual calculation.',
    };
  }

  const monthlyAverage = uploadedTotal / monthsUploaded;
  const annualValue = monthsUploaded === 12 ? uploadedTotal : monthlyAverage * 12;

  return {
    monthsUploaded,
    uploadedTotal: Math.round(uploadedTotal * 100) / 100,
    monthlyAverage: Math.round(monthlyAverage * 100) / 100,
    annualValue: Math.round(annualValue * 100) / 100,
    isEstimated: monthsUploaded !== 12,
    sufficient: true,
    modifier: conf.modifier,
    level: conf.level,
    message: conf.message,
  };
}

module.exports = { annualize };
