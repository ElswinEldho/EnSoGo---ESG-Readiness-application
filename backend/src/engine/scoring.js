// 4-layer scoring engine — BRD §10.
//   Layer 1: Raw parameter score (0 .. weight)
//   Layer 2: Confidence-adjusted = raw × modifier
//   Layer 3: Category score = Σ adjusted
//   Layer 4: Certification readiness = Σ (categoryScore × frameworkWeight%)
//
// The raw score for each parameter is computed by a small evaluator that takes a
// declarative "inputs" object (collected from the user) plus the parameter spec.
// Adding a new parameter ⇒ add a row to data/scoringRules.js and (if needed) a
// case in `rawScoreFor`.

const { CATEGORIES } = require('../data/scoringRules');
const { applyModifier } = require('./confidence');

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/**
 * Compute the raw 0..weight score for a single parameter, using the supplied
 * `inputs` object. `inputs` is the merged collection of facts (annualized
 * values, governance answers, benchmark statuses, etc).
 */
function rawScoreFor(paramKey, weight, inputs = {}) {
  switch (paramKey) {
    // ── ENERGY ────────────────────────────────────────────────────────────
    case 'energyMonthlyTracking': {
      // Proportional to months uploaded (≥ 6 → full).
      const m = clamp(inputs.electricityMonths || 0, 0, 12);
      return (m / 12) * weight;
    }
    case 'energyIntensityWithinBenchmark': {
      // benchmarkStatus.scoreFactor was set by benchmarking.intensityStatus().
      const f = inputs.energyIntensityScoreFactor;
      return Number.isFinite(f) ? f * weight : 0;
    }
    case 'ledCoverage': {
      const pct = inputs.ledCoveragePct;
      if (!Number.isFinite(pct)) return 0;
      if (pct >= 0.60) return weight;
      if (pct >= 0.40) return weight * 0.5;
      return 0;
    }
    case 'hvacEfficiency': {
      const t = inputs.hvacEfficiency;
      if (t === 'modern') return weight;
      if (t === 'moderate') return weight * 0.5;
      return 0;
    }
    case 'energyMonitoringSystem':
      return inputs.energyMonitoringSystem ? weight : 0;
    case 'renewableContribution': {
      const pct = inputs.renewablePct;
      if (!Number.isFinite(pct) || pct <= 0) return 0;
      return clamp((pct / 0.20) * weight, 0, weight); // BRD: (pct / 20) × 10 → here weight=10
    }
    case 'powerFactor': {
      const pf = inputs.powerFactor;
      if (!Number.isFinite(pf)) return 0;
      if (pf >= 0.85) return weight;
      if (pf >= 0.80) return weight * 0.5;
      return 0;
    }

    // ── WATER ─────────────────────────────────────────────────────────────
    case 'waterMonthlyTracking': {
      const m = clamp(inputs.waterMonths || 0, 0, 12);
      return (m / 12) * weight;
    }
    case 'sourceWiseSplit': {
      const n = inputs.waterSourceCount || 0; // distinct sources tracked: municipal, tanker, borewell, reuse, rainwater
      if (n >= 4) return weight;
      if (n >= 1) return weight * 0.5;
      return 0;
    }
    case 'stpEtpOperational': {
      if (inputs.stpOperational) return weight;
      if (inputs.stpAvailable) return weight * 0.5;
      return 0;
    }
    case 'waterReuse': {
      const pct = inputs.waterReusePct;
      if (!Number.isFinite(pct)) return 0;
      if (pct > 0.15) return weight;
      if (pct >= 0.05) return weight * 0.5;
      return 0;
    }
    case 'leakageMonitoring':
      return inputs.leakageMonitoring ? weight : 0;
    case 'rainwaterHarvesting':
      if (inputs.rainwaterHarvesting === 'operational') return weight;
      if (inputs.rainwaterHarvesting === 'present') return weight * 0.5;
      return 0;
    case 'waterQualityTesting':
      if (inputs.waterQualityTesting === 'reports') return weight;
      if (inputs.waterQualityTesting === 'conducted') return weight * 0.5;
      return 0;

    // ── WASTE ─────────────────────────────────────────────────────────────
    case 'wasteCategoryTracking':
      if (inputs.wasteAllCategoriesTracked) return weight;
      if (inputs.wasteTotalTracked) return weight * 0.5;
      return 0;
    case 'segregationAtSource': {
      const pct = inputs.segregationPct;
      if (!Number.isFinite(pct)) return 0;
      if (pct >= 0.95) return weight;
      if (pct >= 0.50) return weight * 0.5;
      return 0;
    }
    case 'recyclingRate': {
      const pct = inputs.recyclingPct;
      if (!Number.isFinite(pct)) return 0;
      if (pct > 0.60) return weight;
      if (pct >= 0.30) return weight * 0.5;
      return 0;
    }
    case 'authorizedVendor':
      if (inputs.authorizedVendorCoverage === 1) return weight;
      if (Number.isFinite(inputs.authorizedVendorCoverage) && inputs.authorizedVendorCoverage > 0) return weight * 0.5;
      return 0;
    case 'hazardousHandling':
      return inputs.hazardousHandlingDocumented ? weight : 0;
    case 'wasteAuditRecords':
      return inputs.wasteAuditRecords ? weight : 0;

    // ── GOVERNANCE ────────────────────────────────────────────────────────
    case 'sustainabilityPolicy':
      if (inputs.sustainabilityPolicyUploaded) return weight;
      if (inputs.sustainabilityPolicy) return weight * 0.5;
      return 0;
    case 'esgOwner':
      if (inputs.esgOwnerFormallyAssigned) return weight;
      if (inputs.esgOwner) return weight * 0.5;
      return 0;
    case 'monthlyUtilityReview':
      if (inputs.monthlyUtilityReviewRecords) return weight;
      if (inputs.monthlyUtilityReview) return weight * 0.5;
      return 0;
    case 'sopDocumentation':
      if (inputs.sopDocumentation === 'uploaded') return weight;
      if (inputs.sopDocumentation === 'mentioned') return weight * 0.5;
      return 0;
    case 'internalAudits':
      if (inputs.internalAuditsWithin12Mo) return weight;
      if (inputs.internalAuditsAny) return weight * 0.5;
      return 0;
    case 'complianceRegister':
      if (inputs.complianceRegisterUploaded) return weight;
      if (inputs.complianceRegister) return weight * 0.5;
      return 0;
    case 'trainingRecords':
      if (inputs.trainingRecords) return weight;
      if (inputs.trainingConducted) return weight * 0.5;
      return 0;

    default:
      return 0;
  }
}

/**
 * Score a single category. Returns { score, parameters: [{...}] }.
 */
function scoreCategory(categoryKey, inputs, modifiers) {
  const cat = CATEGORIES[categoryKey];
  if (!cat) return { score: 0, parameters: [] };
  const params = cat.parameters.map((p) => {
    const raw = rawScoreFor(p.key, p.weight, inputs);
    const adjusted = applyModifier(raw, p, modifiers);
    return {
      key: p.key,
      label: p.label,
      weight: p.weight,
      rawScore: Math.round(raw * 100) / 100,
      modifierUsed: p.useModifier === 'none' ? 1.0 : (modifiers[p.useModifier] ?? 1.0),
      finalScore: Math.round(adjusted * 100) / 100,
    };
  });
  const score = Math.round(params.reduce((s, p) => s + p.finalScore, 0) * 100) / 100;
  return { score, parameters: params };
}

/** Score every category at once. */
function scoreAll(inputs, modifiers) {
  const out = {};
  for (const k of Object.keys(CATEGORIES)) out[k] = scoreCategory(k, inputs, modifiers);
  return out;
}

module.exports = { rawScoreFor, scoreCategory, scoreAll };
