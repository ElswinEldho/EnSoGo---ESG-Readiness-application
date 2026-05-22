// Confidence modifier lookup — BRD §5.2.
// Months uploaded → modifier, level, and user-facing report message.

const CONFIDENCE_THRESHOLDS = [
  {
    min: 12, max: 12, modifier: 1.0, level: 'High',
    message: 'Full-year data available. Assessment is fully accurate.',
  },
  {
    min: 9, max: 11, modifier: 0.95, level: 'High',
    message: 'Annual value estimated with high confidence.',
  },
  {
    min: 6, max: 8, modifier: 0.85, level: 'Medium',
    message: 'Annual value estimated with medium confidence.',
  },
  {
    min: 3, max: 5, modifier: 0.7, level: 'Low',
    message: 'Low confidence due to limited data. Treat results as indicative only.',
  },
  {
    min: 1, max: 2, modifier: 0, level: 'Insufficient',
    message: 'Insufficient data for annual readiness calculation. Score = 0 for all dependent parameters.',
  },
  {
    min: 0, max: 0, modifier: 0, level: 'Missing',
    message: 'Required data missing. Score = 0 for all dependent parameters.',
  },
];

function lookupConfidence(monthsUploaded) {
  const m = Math.max(0, Math.min(12, Math.floor(monthsUploaded || 0)));
  return CONFIDENCE_THRESHOLDS.find((t) => m >= t.min && m <= t.max) || CONFIDENCE_THRESHOLDS[CONFIDENCE_THRESHOLDS.length - 1];
}

module.exports = { CONFIDENCE_THRESHOLDS, lookupConfidence };
