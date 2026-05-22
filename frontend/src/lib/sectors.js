/**
 * Sector code → full display name map.
 * Mirrors backend/src/data/sectors.js — update both if adding sectors.
 */
export const SECTOR_NAMES = {
  HOSP: 'Hospital / Healthcare',
  BLDG: 'Commercial Building / Real Estate',
  MFGR: 'Manufacturing / Industrial',
  TEXT: 'Textile Industry',
  ELEC: 'Electronics Industry',
  FOOD: 'Food & Beverage',
  LOGI: 'Logistics & Supply Chain',
  EDUC: 'Educational Institution',
  NGO:  'NGO / Social Impact',
  GEN:  'General (All Other Organizations)',
};

/**
 * Returns the full sector name for a given code.
 * Falls back to the code itself if not found (safe for unknown future sectors).
 *
 * @param {string} code  e.g. 'HOSP'
 * @returns {string}     e.g. 'Hospital / Healthcare'
 */
export function sectorName(code) {
  if (!code) return '';
  return SECTOR_NAMES[code] || code;
}
