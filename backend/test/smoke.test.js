// End-to-end smoke: feed the calculation pipeline the BRD's worked example.
const test = require('node:test');
const assert = require('node:assert/strict');

const { countMonthsUploaded, categoryCompletenessPct, overallCompletenessPct } = require('../src/engine/completeness');
const { annualize } = require('../src/engine/annualization');
const { runAllChecks } = require('../src/engine/validation');
const { computeScope1, computeScope2, computeScope3, computeTotal } = require('../src/engine/emissions');
const benchmarking = require('../src/engine/benchmarking');
const { scoreAll } = require('../src/engine/scoring');
const { scoreAllApplicable } = require('../src/engine/certification');
const { generateStrengths, generateGaps, generateRoadmap } = require('../src/engine/strengthsGaps');

const fakeRecords = (values, unit) => values.map((v, i) => ({ month: i + 1, year: 2024, value: v, unit }));

test('end-to-end smoke — BRD hospital example', () => {
  const electricity = fakeRecords([10000, 11000, 12000, 13000, 15000, 14000, 13000], 'kWh');
  const water = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, year: 2024, value: 800, unit: 'KL' }));
  const fuel = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, year: 2024, value: 100, unit: 'litres' }));
  const waste = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, year: 2024, value: 1500, unit: 'kg' }));
  const extras = { renewableKwh: 20000, tankerKl: 200, reusedKl: 1500, recycledKg: 10500, hazardousKg: 1200, biomedicalKg: 600, wastewaterTreatedKl: 5000 };
  const area = 10000;

  const aE = annualize(electricity);
  const aW = annualize(water);
  const aF = annualize(fuel);
  const aWa = annualize(waste);

  assert.ok(Math.abs(aE.annualValue - 150857.14) < 1, 'electricity annualized to 150,857 kWh');
  assert.equal(aE.modifier, 0.85);
  assert.equal(countMonthsUploaded(electricity), 7);
  assert.equal(countMonthsUploaded(water), 12);
  assert.equal(categoryCompletenessPct(7), 58.3);
  assert.equal(overallCompletenessPct({ e: 58.3, w: 100, ws: 100, g: 100 }), 89.6);

  const v = runAllChecks({
    recordsByCategory: { electricity, water, fuel, waste },
    crossFacts: { totalElectricityKwh: aE.annualValue, renewableKwh: extras.renewableKwh, totalWaterKl: aW.annualValue, reusedKl: extras.reusedKl, totalWasteKg: aWa.annualValue, recycledKg: extras.recycledKg },
  });
  assert.equal(v.hasBlocker, false);

  const s1 = computeScope1({ dieselLitres: aF.annualValue, refrigerantLeaks: [{ type: 'R-22', kg: 1.5 }] });
  const s2 = computeScope2({ annualKwh: aE.annualValue, renewableKwh: extras.renewableKwh });
  const s3 = computeScope3({ wasteToLandfillKg: aWa.annualValue - extras.recycledKg, wastewaterTreatedKl: extras.wastewaterTreatedKl });
  const totals = computeTotal(s1, s2, s3, area);
  assert.ok(Math.abs(s2.tCO2e - 94.22) < 0.5, `scope2 = ${s2.tCO2e}, expected ~94.22`);

  const energyStatus = benchmarking.intensityStatus('energyIntensity', 'HOSP', aE.annualValue / area);

  const modifiers = { electricity: 0.85, water: 1.0, fuel: 1.0, waste: 1.0, governance: 1.0 };
  const inputs = {
    electricityMonths: 7, waterMonths: 12,
    energyIntensityScoreFactor: energyStatus.scoreFactor,
    ledCoveragePct: 0.65, hvacEfficiency: 'modern', energyMonitoringSystem: true,
    renewablePct: extras.renewableKwh / aE.annualValue, powerFactor: 0.88,
    waterSourceCount: 4, stpAvailable: true, stpOperational: true,
    waterReusePct: extras.reusedKl / aW.annualValue, leakageMonitoring: true,
    rainwaterHarvesting: 'operational', waterQualityTesting: 'reports',
    wasteAllCategoriesTracked: true, segregationPct: 0.95,
    recyclingPct: extras.recycledKg / aWa.annualValue, authorizedVendorCoverage: 1.0,
    hazardousHandlingDocumented: true, wasteAuditRecords: true,
    sustainabilityPolicy: true, sustainabilityPolicyUploaded: true,
    esgOwner: true, esgOwnerFormallyAssigned: true,
    monthlyUtilityReview: true, monthlyUtilityReviewRecords: true,
    sopDocumentation: 'uploaded', internalAuditsAny: true, internalAuditsWithin12Mo: true,
    complianceRegister: true, complianceRegisterUploaded: true,
    trainingConducted: true, trainingRecords: true,
  };
  const cats = scoreAll(inputs, modifiers);
  assert.ok(cats.energy.score > 50);
  assert.ok(cats.governance.score > 80);

  const certs = scoreAllApplicable('HOSP', {
    energy: cats.energy.score, water: cats.water.score, waste: cats.waste.score,
    governance: cats.governance.score, indoorEnv: 80, evidence: 89.6, other: 0,
  }, { cpcbBiomedicalVendor: true, infectionControlSOPs: true, dailyBiomedicalDisposal: true, energyTracking6mo: true, waterTracking6mo: true, energyMonitoringSystem: true, waterMeteringBySource: true, environmentalPolicy: true, esgOwner: true, complianceRegister: true, iaqMonitoring: true, scope1Data: true, scope2Data: true });

  assert.ok(certs.some((c) => c.framework === 'NABH'));
  assert.ok(certs.every((c) => c.finalScore >= 0 && c.finalScore <= 100));

  const metrics = {
    energyIntensityStatus: energyStatus.scoreFactor === 1 ? 'within' : 'partial',
    powerFactor: 0.88, electricityMonths: 7,
    renewablePct: extras.renewableKwh / aE.annualValue,
    waterMonths: 12, waterReusePct: extras.reusedKl / aW.annualValue,
    tankerDependencyPct: extras.tankerKl / aW.annualValue,
    segregationPct: 0.95, recyclingPct: extras.recycledKg / aWa.annualValue,
    authorizedVendorCoverage: 1, esgOwner: true, sustainabilityPolicy: true,
    internalAudits: true, biomedicalCompliance: true, stpOperational: true,
    energyMonitoringSystem: true, ledCoveragePct: 0.65,
  };
  const strengths = generateStrengths(metrics);
  const gaps = generateGaps(metrics);
  assert.ok(strengths.length > 0, 'at least one strength fires');
  const roadmap = generateRoadmap(gaps);
  assert.equal(Object.keys(roadmap).length, 5);

  console.log('Annual electricity:', aE.annualValue, 'kWh | Scope 2:', s2.tCO2e, 'tCO2e | Total:', totals.totalTCO2e, 'tCO2e');
  console.log('Energy:', cats.energy.score, '| Water:', cats.water.score, '| Waste:', cats.waste.score, '| Gov:', cats.governance.score);
  console.log('Top 3 certs:', certs.slice(0, 3).map((c) => `${c.framework}=${c.finalScore}%`).join(', '));
});
