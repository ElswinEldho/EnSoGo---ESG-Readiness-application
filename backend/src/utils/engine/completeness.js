// Completeness engine — BRD §5.
// Pure functions. Takes already-validated monthly arrays and returns category /
// overall completeness scores.

/**
 * Count distinct months that have at least one valid non-zero value.
 *  @param {Array<{month:number,year:number,value:number}>} records
 *  @returns {number} months 0-12 (capped at 12 for purposes of completeness %)
 */
function countMonthsUploaded(records = []) {
  const months = new Set();
  for (const r of records) {
    if (r && Number.isFinite(r.value) && r.value !== 0 && Number.isInteger(r.month) && Number.isInteger(r.year)) {
      months.add(`${r.year}-${r.month}`);
    }
  }
  return Math.min(12, months.size);
}

/**
 * Category completeness % (BRD §5.1).
 *  @returns {number} 0-100, rounded to one decimal place
 */
function categoryCompletenessPct(monthsUploaded) {
  const m = Math.min(12, Math.max(0, monthsUploaded || 0));
  return Math.round((m / 12) * 100 * 10) / 10;
}

/**
 * Overall completeness % across the supplied category completeness map.
 *  @param {Object<string,number>} categoryPctMap e.g. { electricity: 58.3, water: 100, waste: 100, governance: 100 }
 *  @returns {number}
 */
function overallCompletenessPct(categoryPctMap) {
  const values = Object.values(categoryPctMap || {}).filter((v) => Number.isFinite(v));
  if (!values.length) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round(avg * 10) / 10;
}

/**
 * Status assignment — BRD §5.3.
 *  @param {number} pct
 *  @param {{ hasBlockingError?:boolean, sectorApplicable?:boolean }} flags
 */
function statusForCategory(pct, flags = {}) {
  if (flags.sectorApplicable === false) return { label: 'Not Applicable', colour: 'grey' };
  if (flags.hasBlockingError) return { label: 'Error', colour: 'red' };
  if (pct === 0) return { label: 'Missing', colour: 'grey' };
  if (pct < 25) return { label: 'Insufficient', colour: 'red' };
  if (pct < 50) return { label: 'Low Data', colour: 'orange' };
  if (pct < 100) return { label: 'Partial', colour: 'amber' };
  return { label: 'Complete', colour: 'green' };
}

module.exports = {
  countMonthsUploaded,
  categoryCompletenessPct,
  overallCompletenessPct,
  statusForCategory,
};
