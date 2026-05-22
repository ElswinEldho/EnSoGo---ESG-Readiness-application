// Scoring engine — BRD §10.2 + Sustainability Master sheet 5.
// All parameters are defined declaratively so the engine module is generic.
//
// Each parameter:
//   key:          stable identifier (used by code that supplies inputs)
//   label:        human-readable label
//   weight:       points contributed to the category (sums to 100 per category)
//   useModifier:  which data-source confidence modifier to apply
//                 ('electricity' | 'water' | 'fuel' | 'waste' | 'governance' | 'none')

const ENERGY_PARAMETERS = [
  { key: 'energyMonthlyTracking', label: 'Monthly electricity tracking available', weight: 20, useModifier: 'electricity' },
  { key: 'energyIntensityWithinBenchmark', label: 'Energy intensity within sector benchmark', weight: 20, useModifier: 'electricity' },
  { key: 'ledCoverage', label: 'LED coverage ≥ 60%', weight: 15, useModifier: 'none' },
  { key: 'hvacEfficiency', label: 'HVAC / major equipment efficiency', weight: 15, useModifier: 'none' },
  { key: 'energyMonitoringSystem', label: 'Energy monitoring system in place', weight: 15, useModifier: 'none' },
  { key: 'renewableContribution', label: 'Renewable energy contribution > 0%', weight: 10, useModifier: 'none' },
  { key: 'powerFactor', label: 'Power factor ≥ 0.85', weight: 5, useModifier: 'none' },
];

const WATER_PARAMETERS = [
  { key: 'waterMonthlyTracking', label: 'Monthly water tracking available', weight: 20, useModifier: 'water' },
  { key: 'sourceWiseSplit', label: 'Source-wise water split documented', weight: 15, useModifier: 'water' },
  { key: 'stpEtpOperational', label: 'STP / ETP available and operational', weight: 15, useModifier: 'none' },
  { key: 'waterReuse', label: 'Water reuse system in place', weight: 20, useModifier: 'water' },
  { key: 'leakageMonitoring', label: 'Leakage monitoring system', weight: 10, useModifier: 'none' },
  { key: 'rainwaterHarvesting', label: 'Rainwater harvesting system', weight: 10, useModifier: 'none' },
  { key: 'waterQualityTesting', label: 'Water quality testing conducted', weight: 10, useModifier: 'none' },
];

const WASTE_PARAMETERS = [
  { key: 'wasteCategoryTracking', label: 'Waste quantity tracking by category', weight: 15, useModifier: 'waste' },
  { key: 'segregationAtSource', label: 'Waste segregation at source', weight: 25, useModifier: 'waste' },
  { key: 'recyclingRate', label: 'Recycling / recovery rate', weight: 20, useModifier: 'waste' },
  { key: 'authorizedVendor', label: 'Authorized vendor disposal', weight: 20, useModifier: 'none' },
  { key: 'hazardousHandling', label: 'Hazardous / biomedical / e-waste handling', weight: 10, useModifier: 'none' },
  { key: 'wasteAuditRecords', label: 'Waste audit records maintained', weight: 10, useModifier: 'none' },
];

const GOVERNANCE_PARAMETERS = [
  { key: 'sustainabilityPolicy', label: 'Sustainability / environmental policy in place', weight: 20, useModifier: 'none' },
  { key: 'esgOwner', label: 'ESG owner / designated responsible person', weight: 20, useModifier: 'none' },
  { key: 'monthlyUtilityReview', label: 'Monthly utility review conducted', weight: 15, useModifier: 'none' },
  { key: 'sopDocumentation', label: 'SOP documentation', weight: 15, useModifier: 'none' },
  { key: 'internalAudits', label: 'Internal audits conducted', weight: 15, useModifier: 'none' },
  { key: 'complianceRegister', label: 'Compliance register maintained', weight: 10, useModifier: 'none' },
  { key: 'trainingRecords', label: 'Training & awareness records', weight: 5, useModifier: 'none' },
];

const CATEGORIES = {
  energy: { label: 'Energy', parameters: ENERGY_PARAMETERS },
  water: { label: 'Water', parameters: WATER_PARAMETERS },
  waste: { label: 'Waste', parameters: WASTE_PARAMETERS },
  governance: { label: 'Governance', parameters: GOVERNANCE_PARAMETERS },
};

// Readiness stage thresholds — BRD §10.5
const READINESS_STAGES = [
  { min: 90, max: 100, stage: 'Advanced Readiness', color: 'green-dark' },
  { min: 75, max: 89.999, stage: 'Strong Readiness', color: 'green' },
  { min: 60, max: 74.999, stage: 'Certification Possible', color: 'amber' },
  { min: 40, max: 59.999, stage: 'Foundational', color: 'orange' },
  { min: 0, max: 39.999, stage: 'Not Ready', color: 'red' },
];

function getReadinessStage(score) {
  return READINESS_STAGES.find((s) => score >= s.min && score <= s.max) || READINESS_STAGES[READINESS_STAGES.length - 1];
}

module.exports = {
  CATEGORIES,
  ENERGY_PARAMETERS,
  WATER_PARAMETERS,
  WASTE_PARAMETERS,
  GOVERNANCE_PARAMETERS,
  READINESS_STAGES,
  getReadinessStage,
};
