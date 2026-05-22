/**
 * Backend constants — single source of truth for all hardcoded values.
 * Import from here instead of scattering literals across routes/services.
 */

// ── Upload categories ─────────────────────────────────────────────────────────
const UPLOAD_CATEGORIES = Object.freeze([
  'electricity',
  'water',
  'fuel',
  'waste',
  'refrigerants',
  'transport',
]);

// ── Assessment statuses ───────────────────────────────────────────────────────
const ASSESSMENT_STATUS = Object.freeze({
  DATA_LOAD:       'DataLoad',
  SUMMARY_READY:   'SummaryReady',
  READINESS_READY: 'ReadinessReady',
  ARCHIVED:        'Archived',
});

// ── Account statuses ──────────────────────────────────────────────────────────
const ACCOUNT_STATUS = Object.freeze({
  PENDING:  'PendingVerification',
  ACTIVE:   'Active',
  LOCKED:   'Locked',
});

// ── Upload log statuses ───────────────────────────────────────────────────────
const UPLOAD_STATUS = Object.freeze({
  UPLOADED:   'Uploaded',
  REPLACED:   'Replaced',
  PROCESSING: 'Processing',
  ERROR:      'Error',
});

// ── Validation patterns ───────────────────────────────────────────────────────
const VALIDATION = Object.freeze({
  PASSWORD_RE: /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/,
  EMAIL_RE:    /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
});

// ── Validation & error messages ───────────────────────────────────────────────
const MESSAGES = Object.freeze({
  // Auth
  EMAIL_REQUIRED:         'Email and password are required.',
  INVALID_EMAIL:          'Please enter a valid email address.',
  INVALID_PASSWORD:       'Password must be ≥ 8 chars with 1 uppercase, 1 number, 1 symbol.',
  PASSWORDS_NO_MATCH:     'Passwords do not match.',
  ACCOUNT_NOT_FOUND:      'No account found with this email address.',
  ACCOUNT_LOCKED:         'Account locked. Please try again later.',
  ACCOUNT_INACTIVE:       'Please verify your email before logging in.',
  INCORRECT_PASSWORD:     'Incorrect password.',
  EMAIL_EXISTS:           'An account with this email already exists. Please log in or use a different email.',

  // Assessment
  ASSESSMENT_NOT_FOUND:   'Assessment not found.',
  CATEGORY_UNKNOWN:       (cat) => `Unknown category: ${cat}`,
  NO_FILE_UPLOADED:       'No file uploaded.',

  // Upload / manual entry
  INVALID_DATA:           'Invalid data entered',
  INVALID_MONTH_FORMAT:   'Enter correct month format',
  INVALID_YEAR_FORMAT:    'Invalid year format. Data cannot be added.',
  MIXED_YEARS:            'Different years cannot be uploaded together.',
  NO_VALID_ROWS:          'No valid rows supplied. Each row needs month, year (yyyy), and value.',

  // General
  NOT_FOUND:              'Not found.',
  INTERNAL_ERROR:         'An unexpected error occurred. Please try again.',
  VALIDATION_FAILED:      'Validation failed.',
});

// ── Rate limits ───────────────────────────────────────────────────────────────
const RATE_LIMITS = Object.freeze({
  AUTH_WINDOW_MS:     15 * 60 * 1000, // 15 minutes
  AUTH_MAX_REQUESTS:  30,
  GLOBAL_WINDOW_MS:   60 * 1000,      // 1 minute
  GLOBAL_MAX_REQUESTS: 300,
  MAX_FAILED_LOGINS:  5,
  LOCK_DURATION_MS:   15 * 60 * 1000, // 15 minutes
});

// ── Security ──────────────────────────────────────────────────────────────────
const SECURITY = Object.freeze({
  BCRYPT_DEFAULT_COST:          12,
  VERIFICATION_EXPIRY_MS:       24 * 60 * 60 * 1000,  // 24 hours
  RESET_CODE_EXPIRY_MS:         10 * 60 * 1000,         // 10 minutes
  REPORT_EXPIRY_MS:             24 * 60 * 60 * 1000,  // 24 hours
  UPLOAD_MAX_SIZE_BYTES:        10 * 1024 * 1024,      // 10 MB
});

// ── Cache TTLs ────────────────────────────────────────────────────────────────
const CACHE_TTL = Object.freeze({
  CONVERSION_FACTORS_MS: 60 * 1000, // 60 seconds
});

module.exports = {
  UPLOAD_CATEGORIES,
  ASSESSMENT_STATUS,
  ACCOUNT_STATUS,
  UPLOAD_STATUS,
  VALIDATION,
  MESSAGES,
  RATE_LIMITS,
  SECURITY,
  CACHE_TTL,
};
