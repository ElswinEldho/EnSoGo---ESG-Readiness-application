// Verification suite — every assertion maps to a worked example in the BRD.
const test = require('node:test');
const assert = require('node:assert/strict');

const { countMonthsUploaded, categoryCompletenessPct, overallCompletenessPct } = require('../src/utils/engine/completeness');
const { confidenceFor } = require('../src/utils/engine/confidence');
const { annualize } = require('../src/utils/engine/annualization');
const { runAllChecks } = require('../src/utils/engine/validation');
const { computeScope1, computeScope2, computeScope3, computeTotal } = require('../src/utils/engine/emissions');
const { scoreCategory, scoreAll } = require('../src/utils/engine/scoring');
const { scoreFramework } = require('../src/utils/engine/certification');
const { generateStrengths, generateGaps } = require('../src/utils/engine/strengthsGaps');

// --- BRD §5.1: 7 months ÷ 12 = 58.3% ---
test('completeness — 7 months → 58.3%', () => {
  assert.equal(categoryCompletenessPct(7), 58.3);
});

test('overall completeness — average of (58.3, 100, 100, 100) = 89.575 → 89.6', () => {
  assert.equal(overallCompletenessPct({ e: 58.3, w: 100, ws: 100, g: 100 }), 89.6);
});

// --- BRD §5.2: confidence lookup ---
test('confidence — 7 months → 0.85 modifier (Medium)', () => {
  const c = confidenceFor(7);
  assert.equal(c.modifier, 0.85);
  assert.equal(c.level, 'Medium');
});

test('confidence — 12 months → 1.00 modifier (High)', () => {
  assert.equal(confidenceFor(12).modifier, 1.0);
});

// --- BRD §6: 88,000 ÷ 7 × 12 = 150,857 ---
test('annualization — 88,000 ÷ 7 × 12 ≈ 150,857', () => {
  const recs = [10, 11, 12, 13, 15, 14, 13].map((v, i) => ({ month: i + 1, year: 2024, value: v * 1000 }));
  const a = annualize(recs);
  assert.equal(a.monthsUploaded, 7);
  assert.equal(a.uploadedTotal, 88000);
  assert.ok(Math.abs(a.annualValue - 150857.14) < 1, `expected ~150857.14, got ${a.annualValue}`);
  assert.equal(a.modifier, 0.85);
  assert.equal(a.isEstimated, true);
});

test('annualization — < 3 months → not annualized', () => {
  const recs = [{ month: 1, year: 2024, value: 5000 }, { month: 2, year: 2024, value: 6000 }];
  const a = annualize(recs);
  assert.equal(a.sufficient, false);
  assert.equal(a.annualValue, 0);
});

// --- BRD §7: validation ---
test('validation — negative values blocker triggers', () => {
  const r = runAllChecks({ recordsByCategory: { electricity: [{ month: 1, year: 2024, value: -50 }] }, crossFacts: {} });
  assert.equal(r.hasBlocker, true);
});

// --- BRD §9: emissions worked numbers ---
test('emissions — Scope 1: 1200 L diesel → 3.22 tCO2e', () => {
  const r = computeScope1({ dieselLitres: 1200 });
  assert.equal(r.tCO2e, 3.22);
});

test('emissions — Scope 2: 150857 kWh × 0.72 = 108.62 tCO2e', () => {
  const r = computeScope2({ annualKwh: 150857 });
  assert.equal(r.tCO2e, 108.62);
});

test('emissions — Scope 3 example: 7500 kg landfill × 0.46 = 3.45 tCO2e', () => {
  const r = computeScope3({ wasteToLandfillKg: 7500 });
  assert.equal(r.tCO2e, 3.45);
});

test('emissions — Total: 3.22 + 108.62 + 12.80 = 124.64 (approx 127.85 incl refrigerants)', () => {
  const s1 = computeScope1({ dieselLitres: 1200, refrigerantLeaks: [{ type: 'R-22', kg: 1.5 }] });
  const s2 = computeScope2({ annualKwh: 150857 });
  // Build s3 to total 12.80 — components from BRD: waste 3.45 + water 4.20 + transport 5.15
  const s3 = { tCO2e: 12.80, breakdown: [], partial: false };
  const t = computeTotal(s1, s2, s3, 10000);
  // BRD has internal rounding inconsistency: refrigerant step 3 says 2.72, step 4 uses 3.21.
  // Our math is exact, so total comes in at ~127.35 vs BRD's stated 127.85. Allow 1 tCO2e.
  assert.ok(Math.abs(t.totalTCO2e - 127.85) < 1.0, `got ${t.totalTCO2e}`);
});

// --- BRD §10: scoring ---
test('scoring — monthly electricity tracking: 7 months / 12 × 20 = 11.67 raw', () => {
  const r = scoreCategory('energy', {
    electricityMonths: 7,
    energyIntensityScoreFactor: 0,
    ledCoveragePct: 0,
    hvacEfficiency: 'old',
    energyMonitoringSystem: false,
    renewablePct: 0,
    powerFactor: 0,
  }, { electricity: 0.85 });
  const p = r.parameters.find((x) => x.key === 'energyMonthlyTracking');
  // raw 11.67, adjusted 11.67 × 0.85 = 9.92
  assert.ok(Math.abs(p.rawScore - 11.67) < 0.01, `raw=${p.rawScore}`);
  assert.ok(Math.abs(p.finalScore - 9.92) < 0.02, `final=${p.finalScore}`);
});

// --- BRD §13: IGBC weighting ---
test('certification — IGBC sums 6 categories with given weights', () => {
  const result = scoreFramework('IGBC', { energy: 50, water: 60, waste: 40, indoorEnv: 30, governance: 70, evidence: 80 });
  // Expected: 50*0.35 + 60*0.20 + 40*0.15 + 30*0.10 + 70*0.10 + 80*0.10 = 17.5+12+6+3+7+8 = 53.5
  assert.equal(result.weightedScore, 53.5);
});

// --- BRD §12: strengths/gaps fire ---
test('strengths/gaps — high renewable triggers strength, missing ESG owner triggers gap', () => {
  const metrics = {
    renewablePct: 0.25,
    esgOwner: false,
    energyMonitoringSystem: false,
  };
  const s = generateStrengths(metrics);
  const g = generateGaps(metrics);
  assert.ok(s.some((x) => x.text.includes('renewable')));
  assert.ok(g.some((x) => x.text.includes('ESG accountability gap')));
});
engths(metrics);
  const g = generateGaps(metrics);
  assert.ok(s.some((x) => x.text.includes('renewable')));
  assert.ok(g.some((x) => x.text.includes('ESG accountability gap')));
});
