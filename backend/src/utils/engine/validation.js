// Validation engine — BRD §7. All six checks defined as pure helpers.
// Returns a structured result that maps directly to the Validation Results table on Screen 2.

const UNIT_STANDARDS = {
  electricity: 'kWh',
  water: 'KL',
  fuel: 'litres',
  diesel: 'litres',
  waste: 'kg',
  refrigerants: 'kg',
  transport: 'tonne-km',
};

function negativeCheck(records, category) {
  const failures = [];
  for (const r of records || []) {
    if (Number.isFinite(r.value) && r.value < 0) {
      failures.push({ month: r.month, year: r.year, value: r.value });
    }
  }
  return {
    check: 'Negative Values',
    status: failures.length ? 'Fail' : 'Passed',
    blocker: failures.length > 0,
    message: failures.length
      ? `Negative consumption value detected in ${category} for ${failures.length} month(s). Please re-upload corrected data.`
      : 'No negative values detected.',
    failures,
  };
}

// All upload categories require monthly data including refrigerants.
const MONTHLY_CATEGORIES = ['electricity', 'water', 'fuel', 'waste', 'transport', 'refrigerants'];

function missingMonthsCheck(records, category) {
  const seen = new Set();
  for (const r of records || []) {
    if (Number.isFinite(r.value) && Number.isInteger(r.month) && Number.isInteger(r.year)) {
      seen.add(`${r.year}-${r.month}`);
    }
  }
  const distinctMonths = seen.size;
  const missing = 12 - distinctMonths;

  // Minimum 6 DISTINCT months required for monthly categories (BRD §6).
  // Duplicate month entries count as one — e.g. January uploaded twice = 1 distinct month.
  // Refrigerants is annual data and is exempt from this minimum.
  const needsMonthlyMin = MONTHLY_CATEGORIES.includes(category);
  const belowMinimum    = needsMonthlyMin && distinctMonths < 6;

  return {
    check: 'Missing Months',
    status: distinctMonths === 12 ? 'Passed' : (belowMinimum ? 'Fail' : 'Partial'),
    blocker: belowMinimum,
    message: distinctMonths === 12
      ? 'All 12 months present.'
      : belowMinimum
        ? `Only ${distinctMonths} distinct month(s) found — minimum 6 required. Duplicate months count as one; upload ${6 - distinctMonths} more different month(s).`
        : `${distinctMonths} distinct month(s) uploaded — ${missing} month(s) missing, will be annualized.`,
    missingCount: missing,
    distinctMonths,
  };
}

function abnormalSpikeCheck(records, category) {
  const sorted = (records || [])
    .filter((r) => Number.isFinite(r.value) && Number.isInteger(r.month) && Number.isInteger(r.year))
    .sort((a, b) => (a.year - b.year) || (a.month - b.month));

  const spikes = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1].value;
    const cur = sorted[i].value;
    if (prev === 0) continue;
    const changePct = Math.abs((cur - prev) / prev) * 100;
    // BRD: > 100% spike up OR > 70% drop = abnormal.
    if (changePct > 100 || (cur < prev && changePct > 70)) {
      spikes.push({ month: sorted[i].month, year: sorted[i].year, changePct: Math.round(changePct * 10) / 10 });
    }
  }
  return {
    check: 'Abnormal Spikes',
    status: spikes.length ? 'Partial' : 'Passed',
    blocker: false,
    message: spikes.length
      ? `Abnormal spike detected in ${category} for ${spikes.length} month(s). Please review or confirm this value.`
      : 'No abnormal spikes detected.',
    spikes,
  };
}

function duplicateCheck(records, category) {
  const counts = new Map();
  for (const r of records || []) {
    if (!Number.isInteger(r.month) || !Number.isInteger(r.year)) continue;
    const k = `${r.year}-${r.month}`;
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const dupes = [...counts.entries()].filter(([, c]) => c > 1).map(([k]) => k);
  return {
    check: 'Duplicate Entries',
    status: 'Passed',
    blocker: false,
    message: dupes.length
      ? `Duplicate entry detected for ${dupes.join(', ')} in ${category}. Values have been consolidated by summing.`
      : 'No duplicate entries detected.',
    duplicates: dupes,
  };
}

function unitConsistencyCheck(records, category) {
  const expected = UNIT_STANDARDS[category];
  if (!expected) return { check: 'Unit Consistency', status: 'Passed', blocker: false, message: 'No unit constraint defined.' };
  const wrong = (records || []).filter((r) => r.unit && r.unit !== expected);
  return {
    check: 'Unit Consistency',
    status: wrong.length ? 'Fail' : 'Passed',
    blocker: wrong.length > 0,
    message: wrong.length
      ? `Unit mismatch detected. Standardize all ${category} data to ${expected} and re-upload.`
      : `All ${category} records use ${expected}.`,
    expected,
  };
}

/**
 * Cross-category sanity (BRD §7 Step 7).
 *   facts: { totalElectricityKwh, renewableKwh, totalWaterKl, reusedKl, totalWasteKg, recycledKg,
 *            totalHazardousAndBiomedicalKg, authorizedVendorKg }
 */
function crossCategoryCheck(facts = {}) {
  const errs = [];
  if (Number.isFinite(facts.renewableKwh) && Number.isFinite(facts.totalElectricityKwh)
      && facts.renewableKwh > facts.totalElectricityKwh) {
    errs.push('Renewable kWh exceeds total electricity kWh.');
  }
  if (Number.isFinite(facts.reusedKl) && Number.isFinite(facts.totalWaterKl)
      && facts.reusedKl > facts.totalWaterKl) {
    errs.push('Reused water KL exceeds total water KL.');
  }
  if (Number.isFinite(facts.recycledKg) && Number.isFinite(facts.totalWasteKg)
      && facts.recycledKg > facts.totalWasteKg) {
    errs.push('Recycled waste kg exceeds total waste kg.');
  }
  if (Number.isFinite(facts.authorizedVendorKg) && Number.isFinite(facts.totalHazardousAndBiomedicalKg)
      && facts.authorizedVendorKg > facts.totalHazardousAndBiomedicalKg) {
    errs.push('Authorized vendor waste exceeds total hazardous + biomedical waste.');
  }
  return {
    check: 'Cross-Category Consistency',
    status: errs.length ? 'Fail' : 'Passed',
    blocker: errs.length > 0,
    message: errs.length ? errs.join(' ') : 'All cross-category checks passed.',
    errors: errs,
  };
}

/** Run every per-category check + cross-category.
 *  Categories with zero uploaded records are marked "Missing" (no checks run). */
function runAllChecks({ recordsByCategory = {}, crossFacts = {} }) {
  const perCategory = {};
  for (const [cat, recs] of Object.entries(recordsByCategory)) {
    if (!recs || recs.length === 0) {
      perCategory[cat] = [
        { check: 'Negative Values', status: 'Missing', blocker: false, message: 'No data uploaded.' },
        { check: 'Missing Months', status: 'Missing', blocker: false, message: 'No data uploaded.' },
        { check: 'Abnormal Spikes', status: 'Missing', blocker: false, message: 'No data uploaded.' },
        { check: 'Duplicate Entries', status: 'Missing', blocker: false, message: 'No data uploaded.' },
        { check: 'Unit Consistency', status: 'Missing', blocker: false, message: 'No data uploaded.' },
      ];
      continue;
    }
    perCategory[cat] = [
      negativeCheck(recs, cat),
      missingMonthsCheck(recs, cat),
      abnormalSpikeCheck(recs, cat),
      duplicateCheck(recs, cat),
      unitConsistencyCheck(recs, cat),
    ];
  }
  const cross = crossCategoryCheck(crossFacts);

  // Validation summary across every check
  const flat = Object.values(perCategory).flat().concat(cross);
  const counts = { Passed: 0, Partial: 0, Fail: 0, Missing: 0 };
  for (const c of flat) counts[c.status] = (counts[c.status] || 0) + 1;
  const hasBlocker = flat.some((c) => c.blocker);
  const summary = {
    totalChecks: flat.length,
    passed: counts.Passed,
    partial: counts.Partial,
    failed: counts.Fail,
    missing: counts.Missing,
    overall: hasBlocker
      ? 'Errors found — must be resolved before proceeding.'
      : counts.Missing === flat.length
        ? 'No data validated yet. Upload monthly data to run validation.'
        : counts.Partial > 0
          ? 'Validation completed with warnings (partial / missing months handled by annualization).'
          : 'All uploaded data passed validation.',
  };

  return { perCategory, cross, hasBlocker, summary };
}

module.exports = {
  negativeCheck,
  missingMonthsCheck,
  abnormalSpikeCheck,
  duplicateCheck,
  unitConsistencyCheck,
  crossCategoryCheck,
  runAllChecks,
};
