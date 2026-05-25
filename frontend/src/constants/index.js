/**
 * Frontend constants — single source of truth for all hardcoded values.
 * Import from here instead of scattering literals across components.
 */

// ── Upload categories ─────────────────────────────────────────────────────────
export const UPLOAD_CATEGORIES = Object.freeze([
  { key: 'electricity',  label: 'Electricity',  unit: 'kWh',   desc: 'Monthly bills, meter readings' },
  { key: 'water',        label: 'Water',        unit: 'KL',    desc: 'Municipal, tanker, borewell' },
  { key: 'fuel',         label: 'Fuel',         unit: 'Litres',desc: 'Diesel, PNG / CNG' },
  { key: 'waste',        label: 'Waste',        unit: 'kg',    desc: 'Wet, dry, hazardous, biomedical' },
  { key: 'refrigerants', label: 'Refrigerants', unit: 'kg',    desc: 'R-22, R-410A, R-32 — monthly top-up / leak' },
  { key: 'transport',    label: 'Transport',    unit: 't-km',  desc: 'Fleet & cargo logistics' },
]);

export const UPLOAD_CATEGORY_KEYS = UPLOAD_CATEGORIES.map((c) => c.key);

// ── Assessment statuses ───────────────────────────────────────────────────────
export const ASSESSMENT_STATUS = Object.freeze({
  DATA_LOAD:       'DataLoad',
  SUMMARY_READY:   'SummaryReady',
  READINESS_READY: 'ReadinessReady',
  ARCHIVED:        'Archived',
});

// ── Route helpers ─────────────────────────────────────────────────────────────
export function routeForStatus(status) {
  if (status === ASSESSMENT_STATUS.SUMMARY_READY)   return 'summary';
  if (status === ASSESSMENT_STATUS.READINESS_READY) return 'readiness';
  return 'data-load';
}

// ── Validation messages ───────────────────────────────────────────────────────
export const VALIDATION_MESSAGES = Object.freeze({
  FULL_NAME_REQUIRED:    'Full name is required (min 2 chars).',
  EMAIL_REQUIRED:        'Valid email is required.',
  PASSWORD_REQUIRED:     'Password must be ≥ 8 chars with 1 uppercase, 1 number, 1 symbol.',
  PASSWORDS_NO_MATCH:    'Passwords do not match.',
  ORG_NAME_REQUIRED:     'Organization name is required.',
  SECTOR_REQUIRED:       'Please select your industry / sector.',
  COUNTRY_REQUIRED:      'Country is required.',
  STATE_REQUIRED:        'State / region is required.',
  TERMS_REQUIRED:        'You must accept the terms.',
  BUILT_UP_AREA_REQUIRED:'Built-up area (sqft) is required and must be > 0.',
  EMPLOYEES_REQUIRED:    'Number of employees is required.',
  HOURS_REQUIRED:        'Operating hours per day is required.',
});

// ── Date formatting ───────────────────────────────────────────────────────────
/**
 * Format a date value for display using the Indian locale.
 * Returns '—' for null/undefined/falsy values.
 * Default format: "3 Jan 2025"  (day numeric, month short, year numeric)
 */
export function formatDate(value, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', opts);
}

// ── App meta ──────────────────────────────────────────────────────────────────
export const APP = Object.freeze({
  NAME:    'EnSoGo',
  VERSION: '1.0.0',
  STORAGE_KEY_TOKEN:  'sam_token',
  STORAGE_KEY_USER:   'sam_user',
  STORAGE_KEY_ADMIN:  'ensogo_admin_token',
});
