// Orchestrates the calculation pipeline. The route layer should only call this
// service — all data fetching + engine wiring lives here.

const Assessment = require('../models/Assessment');
const { SECTORS } = require('../data/sectors');
const { getFactorsMap } = require('./conversionFactorsService');
const { countMonthsUploaded, categoryCompletenessPct, overallCompletenessPct, statusForCategory } = require('../utils/engine/completeness');
const { confidenceFor } = require('../utils/engine/confidence');
const { annualize } = require('../utils/engine/annualization');
const { runAllChecks } = require('../utils/engine/validation');
const { computeScope1, computeScope2, computeScope3, computeTotal } = require('../utils/engine/emissions');
const benchmarking = require('../utils/engine/benchmarking');
const { scoreAll } = require('../utils/engine/scoring');
const { scoreAllApplicable, recommendedTimeline } = require('../utils/engine/certification');
const { generateStrengths, generateGaps, generateRoadmap } = require('../utils/engine/strengthsGaps');
const { evaluateAll: evalRegs } = require('../utils/engine/regulatory');

const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const ratio = (num, denom) => (Number.isFinite(num) && Number.isFinite(denom) && denom > 0 ? num / denom : 0);

// Module-scope constant — allocated once per process startup, not per request
const MONTH_ORDER = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/**
 * Annualize a specific sub-field from a record array.
 * e.g. annualizeSubfield(transportRecs, 'fleetFuel') treats r.fleetFuel as the value.
 * Falls back to parsing the notes string for legacy records that stored sub-fields
 * only in notes (e.g. "Fleet fuel: 520 L; Cargo: 12800 t-km") before the schema
 * explicitly persisted them as dedicated fields.
 */
function annualizeSubfield(records, field) {
  // Notes-field keywords to try as fallback per sub-field
  const notesKeyword = { fleetFuel: 'fleet fuel', cargo: 'cargo' };
  const derived = (records || []).reduce((acc, r) => {
    let val = r[field];
    // Primary: dedicated schema field
    if (!Number.isFinite(val) || val <= 0) {
      // Fallback: parse from notes string e.g. "Fleet fuel: 520 L; Cargo: 12800 t-km"
      const kw = notesKeyword[field];
      if (kw && r.notes) {
        const m = r.notes.toLowerCase().match(new RegExp(kw + '[^0-9]*(\d+(?:\.\d+)?)'));
        if (m) val = parseFloat(m[1]);
      }
    }
    if (Number.isFinite(val) && val > 0) {
      acc.push({ year: r.year, month: r.month, value: val });
    }
    return acc;
  }, []);
  return annualize(derived);
}

/**
 * Annualize all transport sub-categories and compute the combined total.
 * Returns { vehicleKm, fleetFuel, cargo, total } — all annualized result objects.
 */
function annualizeTransportSubcategories(transportRecs, annualTransport) {
  const vehicleKm = annualTransport; // value field = vehicle km
  const fleetFuel = annualizeSubfield(transportRecs, 'fleetFuel');
  const cargo     = annualizeSubfield(transportRecs, 'cargo');

  // Combined total: sum ALL transport sub-fields per month so the Total Transport
  // figure reflects every uploaded value regardless of which sub-field has sufficient
  // months on its own.
  const combinedRecords = (transportRecs || []).reduce((acc, r) => {
    const vkm      = Number.isFinite(r.value)     && r.value     > 0 ? r.value     : 0;
    const ff       = Number.isFinite(r.fleetFuel) && r.fleetFuel > 0 ? r.fleetFuel : 0;
    const cg       = Number.isFinite(r.cargo)     && r.cargo     > 0 ? r.cargo     : 0;
    const combined = vkm + ff + cg;
    if (combined > 0) acc.push({ year: r.year, month: r.month, value: combined });
    return acc;
  }, []);

  return { vehicleKm, fleetFuel, cargo, total: annualize(combinedRecords) };
}

/**
 * Annualize fuel sub-categories (diesel is the primary value; pngCng is a sub-field).
 * Returns { diesel, pngCng } — both annualized result objects.
 */
function annualizeFuelSubcategories(fuelRecs, annualFuel) {
  return {
    diesel: annualFuel,                              // value field = diesel litres
    pngCng: annualizeSubfield(fuelRecs, 'pngCng'),
  };
}

/**
 * Compute per-category and overall completeness + upload status.
 * Returns { completeness, status, overallPct }.
 */
function computeCompletenessData(assessmentRecords, required) {
  const UPLOAD_CATS = ['electricity', 'water', 'fuel', 'waste', 'transport', 'refrigerants'];
  const completeness = {};
  const status = {};

  for (const cat of UPLOAD_CATS) {
    const recs   = assessmentRecords?.[cat] || [];
    const months = countMonthsUploaded(recs);
    const pct    = categoryCompletenessPct(months);
    completeness[cat] = { months, pct, confidence: confidenceFor(months) };
    // Always treat upload categories as applicable. 'Missing' when pct === 0.
    status[cat] = statusForCategory(pct, { sectorApplicable: true });
  }

  const requiredCats = UPLOAD_CATS.filter((c) => required.includes(c));
  const overallPct   = overallCompletenessPct(
    Object.fromEntries(requiredCats.map((c) => [c, completeness[c]?.pct ?? 0]))
  );

  return { completeness, status, overallPct };
}

/**
 * Build the cross-category facts object used by the validation engine.
 * Prefer the directly entered authorizedVendorKg from extras (entered via the Waste card UI).
 * Falls back to the legacy computed value (hazardous+biomedical × governance coverage fraction).
 */
function buildValidationCrossFacts(annual, extras, govData) {
  const totalElectricityKwh   = annual.electricity.annualValue;
  const totalWaterKl          = annual.water.annualValue;
  const totalWasteKg          = annual.waste.annualValue;
  const totalHazAndBiomedKg   = (extras.hazardousKg || 0) + (extras.biomedicalKg || 0);
  const authorizedVendorKgFact = Number.isFinite(extras.authorizedVendorKg) && extras.authorizedVendorKg > 0
    ? extras.authorizedVendorKg
    : totalHazAndBiomedKg * (govData.authorizedVendorCoverage || 0);

  return {
    totalElectricityKwh,
    renewableKwh: extras.renewableKwh || 0,
    totalWaterKl,
    reusedKl: extras.reusedKl || 0,
    totalWasteKg,
    recycledKg: extras.recycledKg || 0,
    totalHazardousAndBiomedicalKg: totalHazAndBiomedKg,
    authorizedVendorKg: authorizedVendorKgFact,
  };
}

/**
 * Build display-ready KPI objects for the Screen 2 response.
 * All ratio calculations are already done; this function only assembles
 * the display objects with labels, units, statuses, and benchmark text.
 */
function buildKpiDisplayObjects(kpiValues, kpiStatuses, area) {
  const formatValue   = (n) => (Number.isFinite(n) && n > 0 ? round(n, 2) : null);
  const formatPercent = (n) => (Number.isFinite(n) && n >= 0 ? round(n * 100, 1) : null);
  const energyBenchmark = kpiStatuses.energy.benchmark;
  const waterBenchmark  = kpiStatuses.water.benchmark;

  const {
    energyIntensity, waterIntensity, renewablePct, recyclingPct,
    tankerPct, waterReusePct, avgPowerFactor,
    totalElectricityKwh, totalWaterKl, totalWasteKg,
    biomedicalKg, recycledKg, biomedicalRatioPct,
  } = kpiValues;

  return {
    energyIntensity: {
      value: formatValue(energyIntensity),
      unit: 'kWh/sqft/yr',
      label: 'Energy Intensity',
      status: kpiStatuses.energy.status,
      colour: kpiStatuses.energy.colour,
      scoreFactor: kpiStatuses.energy.scoreFactor,
      rawNumerator: round(totalElectricityKwh, 0),
      rawDenominator: area,
      benchmarkText: energyBenchmark
        ? `Efficient < ${energyBenchmark.efficientMax} · Acceptable ${energyBenchmark.acceptableMin}–${energyBenchmark.acceptableMax} ${energyBenchmark.unit}`
        : 'No benchmark defined for this sector',
      benchmark: energyBenchmark || null,
    },
    waterIntensity: {
      value: formatValue(waterIntensity),
      unit: 'KL/sqft/yr',
      label: 'Water Intensity',
      status: kpiStatuses.water.status,
      colour: kpiStatuses.water.colour,
      scoreFactor: kpiStatuses.water.scoreFactor,
      rawNumerator: round(totalWaterKl, 0),
      rawDenominator: area,
      benchmarkText: waterBenchmark
        ? `Efficient < ${waterBenchmark.efficientMax} · Acceptable ${waterBenchmark.acceptableMin}–${waterBenchmark.acceptableMax} ${waterBenchmark.unit}`
        : 'No benchmark defined for this sector',
      benchmark: waterBenchmark || null,
    },
    renewableContribution: {
      value: formatPercent(renewablePct),
      unit: '%',
      label: 'Renewable Energy',
      status: kpiStatuses.renewable.status,
      colour: kpiStatuses.renewable.colour,
      benchmarkText: '0% = Improvement Needed · 1–9% = Developing · ≥ 10% = Within Benchmark',
    },
    recyclingRate: {
      value: formatPercent(recyclingPct),
      unit: '%',
      label: 'Recycling Rate',
      status: kpiStatuses.recycling.status,
      colour: kpiStatuses.recycling.colour,
      rawNumerator: round(recycledKg, 0),
      rawDenominator: round(totalWasteKg, 0),
      benchmarkText: '< 40% = Needs Attention · 40–59% = Slightly Below · ≥ 60% = Within Benchmark',
    },
    biomedicalWasteRatio: {
      value: biomedicalRatioPct,
      unit: '%',
      label: 'Biomedical Waste Ratio',
      status: biomedicalRatioPct === null ? null : biomedicalRatioPct > 20 ? 'High' : biomedicalRatioPct > 10 ? 'Moderate' : 'Low',
      colour: biomedicalRatioPct === null ? 'grey' : biomedicalRatioPct > 20 ? 'red' : biomedicalRatioPct > 10 ? 'amber' : 'green',
      rawNumerator: round(biomedicalKg, 0),
      rawDenominator: round(totalWasteKg, 0),
      benchmarkText: '< 10% = Low · 10–20% = Moderate · > 20% = High — CPCB mandate: segregate & track biomedical waste',
    },
    tankerDependency: {
      value: formatPercent(tankerPct),
      unit: '%',
      label: 'Tanker Water Dependency',
      status: kpiStatuses.tanker.status,
      colour: kpiStatuses.tanker.colour,
      benchmarkText: '< 10% = Good · 10–20% = Slightly High · > 20% = Needs Attention',
    },
    waterReuse: {
      value: formatPercent(waterReusePct),
      unit: '%',
      label: 'Water Reuse',
      status: kpiStatuses.waterReuse.status,
      colour: kpiStatuses.waterReuse.colour,
      benchmarkText: '< 5% = Needs Attention · 5–14% = Moderate · ≥ 15% = Within Benchmark',
    },
    powerFactor: {
      value: formatValue(avgPowerFactor),
      unit: '',
      label: 'Power Factor',
      status: kpiStatuses.powerFactor.status,
      colour: kpiStatuses.powerFactor.colour,
      benchmarkText: '< 0.80 = Needs Attention · 0.80–0.84 = Moderate · ≥ 0.85 = Good',
    },
  };
}

/** Build the Screen 2 payload. */
async function buildSummary(assessment) {
  const sector   = SECTORS[assessment.sectorCode];
  const required = sector?.requiredCategories || [];

  // 1. Annualize each upload-driven category (refrigerants is annual-only, not monthly)
  const annual = {};
  for (const cat of ['electricity', 'water', 'fuel', 'waste', 'transport', 'refrigerants']) {
    annual[cat] = annualize(assessment.records?.[cat] || []);
  }

  // 1b. Subcategory annualization
  const transportRecs          = assessment.records?.transport || [];
  const fuelRecs               = assessment.records?.fuel      || [];
  const transportSubcategories = annualizeTransportSubcategories(transportRecs, annual.transport);
  const transportTotal         = transportSubcategories.total;
  const fuelSubcategories      = annualizeFuelSubcategories(fuelRecs, annual.fuel);

  // 2. Completeness + status
  const { completeness, status, overallPct } = computeCompletenessData(
    assessment.records, required
  );

  // 3. Validation
  const extras  = assessment.extras || {};
  const govData = assessment.governance?.toObject ? assessment.governance.toObject() : (assessment.governance || {});
  const recordsByCategory = Object.fromEntries(
    Object.entries(assessment.records || {}).map(([k, v]) => [k, (v || []).map((x) => x.toObject ? x.toObject() : x)])
  );
  const crossFacts = buildValidationCrossFacts(annual, extras, govData);
  const validation = runAllChecks({ recordsByCategory, crossFacts });

  // 4. Emissions — load factors from DB (admin-managed), fall back to hardcoded if unavailable
  const dbFactors      = await getFactorsMap();
  const refrigerantLeaks = (assessment.records?.refrigerants || []).map((r) => ({
    type: r.source || r.notes || 'R-22',
    kg: r.value,
  }));
  const scope1 = computeScope1({
    dieselLitres:  annual.fuel.annualValue,
    pngCngLitres:  fuelSubcategories.pngCng?.sufficient ? (fuelSubcategories.pngCng.annualValue || 0) : 0,
    refrigerantLeaks,
  }, dbFactors);
  const scope2 = computeScope2({
    annualKwh:    crossFacts.totalElectricityKwh,
    renewableKwh: extras.renewableKwh || 0,
  }, dbFactors);
  const scope3 = computeScope3({
    wasteToLandfillKg:   Math.max(0, crossFacts.totalWasteKg - (extras.recycledKg || 0)),
    wastewaterTreatedKl: extras.wastewaterTreatedKl || 0,
    vehicleKmTonneKm:    transportSubcategories.vehicleKm?.sufficient ? (transportSubcategories.vehicleKm.annualValue || 0) : 0,
    fleetFuelLitres:     transportSubcategories.fleetFuel?.sufficient  ? (transportSubcategories.fleetFuel.annualValue  || 0) : 0,
    cargoTonneKm:        transportSubcategories.cargo?.sufficient      ? (transportSubcategories.cargo.annualValue      || 0) : (extras.cargoTonneKm || 0),
  }, dbFactors);
  const totals = computeTotal(scope1, scope2, scope3, assessment.orgProfile?.builtUpAreaSqft || 0);

  // 5. KPI ratios
  const area              = assessment.orgProfile?.builtUpAreaSqft || 0;
  const energyIntensity   = ratio(crossFacts.totalElectricityKwh, area);
  const waterIntensity    = ratio(crossFacts.totalWaterKl, area);
  const renewablePct      = ratio(extras.renewableKwh || 0, crossFacts.totalElectricityKwh);
  const recyclingPct      = ratio(extras.recycledKg || 0, crossFacts.totalWasteKg);
  const tankerPct         = ratio(extras.tankerKl || 0, crossFacts.totalWaterKl);
  const waterReusePct     = ratio(extras.reusedKl || 0, crossFacts.totalWaterKl);
  const pfRecs            = (assessment.records?.electricity || []).filter((r) => Number.isFinite(r.powerFactor) && r.powerFactor > 0);
  const avgPowerFactor    = pfRecs.length ? pfRecs.reduce((s, r) => s + r.powerFactor, 0) / pfRecs.length : NaN;

  // 5b. Benchmark statuses (BRD §11.2)
  const kpiStatuses = {
    energy:      benchmarking.intensityStatus('energyIntensity', assessment.sectorCode, energyIntensity),
    water:       benchmarking.intensityStatus('waterIntensity',  assessment.sectorCode, waterIntensity),
    renewable:   benchmarking.renewableStatus(renewablePct),
    recycling:   benchmarking.recyclingStatus(recyclingPct),
    tanker:      benchmarking.tankerStatus(tankerPct),
    waterReuse:  benchmarking.waterReuseStatus(waterReusePct),
    powerFactor: benchmarking.powerFactorStatus(avgPowerFactor),
  };

  // Hospital-specific derived values
  const biomedicalKg     = extras.biomedicalKg  || 0;
  const recycledKg       = extras.recycledKg    || 0;
  const tankerKl         = extras.tankerKl      || 0;
  const reusedKl         = extras.reusedKl      || 0;
  const rainwaterKl      = extras.rainwaterKl   || 0;
  const biomedicalRatio  = ratio(biomedicalKg, crossFacts.totalWasteKg);
  const biomedicalRatioPct = Number.isFinite(biomedicalRatio) && biomedicalRatio >= 0 ? round(biomedicalRatio * 100, 1) : null;

  // Monthly electricity data for trend chart (sorted by calendar month)
  const monthlyElectricity = (assessment.records?.electricity || [])
    .filter((r) => r.month && Number.isFinite(r.kwhTotal) && r.kwhTotal > 0)
    .sort((a, b) => MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month))
    .map((r) => ({ month: (r.month || '').slice(0, 3), kwh: round(r.kwhTotal, 0) }));

  // Water source breakdown for hospital pie chart
  const waterSources = [];
  const borewellKl   = crossFacts.totalWaterKl - tankerKl - rainwaterKl - reusedKl;
  if (tankerKl   > 0) waterSources.push({ name: 'Tanker',        kl: round(tankerKl,   0) });
  if (rainwaterKl > 0) waterSources.push({ name: 'Rainwater',    kl: round(rainwaterKl, 0) });
  if (reusedKl   > 0) waterSources.push({ name: 'Reused/STP',   kl: round(reusedKl,   0) });
  if (borewellKl  > 0) waterSources.push({ name: 'Borewell/Grid', kl: round(borewellKl,  0) });

  // 6. Build display-ready KPI objects
  const kpis = buildKpiDisplayObjects(
    {
      energyIntensity, waterIntensity, renewablePct, recyclingPct,
      tankerPct, waterReusePct, avgPowerFactor,
      totalElectricityKwh: crossFacts.totalElectricityKwh,
      totalWaterKl: crossFacts.totalWaterKl,
      totalWasteKg: crossFacts.totalWasteKg,
      biomedicalKg, recycledKg, biomedicalRatioPct,
    },
    kpiStatuses,
    area
  );

  return {
    sector: { code: assessment.sectorCode, name: sector?.name },
    organization: { name: assessment.organizationName, profile: assessment.orgProfile },
    overview: {
      overallCompletenessPct: overallPct,
      perCategory: completeness,
      status,
    },
    validation,
    annualized: {
      energy: annual.electricity,
      water: annual.water,
      fuel: annual.fuel,
      waste: annual.waste,
      transport: annual.transport,
      refrigerants: annual.refrigerants,
      transportSubcategories: {
        vehicleKm: transportSubcategories.vehicleKm,
        fleetFuel: transportSubcategories.fleetFuel,
        cargo:     transportSubcategories.cargo,
      },
      transportTotal,
      fuelSubcategories,
    },
    emissions: {
      scope1, scope2, scope3,
      totalTCO2e: totals.totalTCO2e,
      intensityTCO2ePerSqft: totals.intensityTCO2ePerSqft,
    },
    confidence: {
      perCategory: Object.fromEntries(Object.entries(completeness).map(([k, v]) => [k, v.confidence])),
    },
    assumptions: [
      `Grid emission factor used: 0.72 kgCO2e/kWh (CEA India national average).`,
      `Diesel emission factor: 2.68 kgCO2e/litre (DEFRA / MoEFCC).`,
      `Refrigerant GWP factors per IPCC AR6 (R-22: 1810, R-410A: 2088, R-32: 675 kgCO2e/kg).`,
      `Built-up area (sqft) provided in organization profile drives all intensity calculations.`,
      `Annualized values labelled 'Estimated' use uploaded total ÷ months × 12 (monthly data annualized).`,
    ],
    readinessPreCheck: {
      energy: status.electricity,
      water: status.water,
      fuel: status.fuel,
      waste: status.waste,
      refrigerants: status.refrigerants,
      transport: status.transport,
      dataReliability: overallPct >= 75 ? { label: 'Reliable', colour: 'green' } : overallPct >= 50 ? { label: 'Partial', colour: 'amber' } : { label: 'Limited', colour: 'red' },
    },
    kpis,
    hospitalExtras: {
      totalElectricityKwh: round(crossFacts.totalElectricityKwh, 0),
      totalWaterKl:        round(crossFacts.totalWaterKl, 0),
      totalWasteKg:        round(crossFacts.totalWasteKg, 0),
      biomedicalKg:        round(biomedicalKg, 0),
      recycledKg:          round(recycledKg, 0),
      tankerKl:            round(tankerKl, 0),
      reusedKl:            round(reusedKl, 0),
      rainwaterKl:         round(rainwaterKl, 0),
      builtUpAreaSqft: area,
      monthlyElectricity,
      waterSources,
    },
    // Kept internally for cert scoring
    _internal: {
      kpis: {
        energyIntensity, waterIntensity, renewablePct, recyclingPct, tankerPct, waterReusePct,
        energyStatus: kpiStatuses.energy,
        waterStatus:  kpiStatuses.water,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// buildReadiness helpers — each extracts one self-contained concern
// ---------------------------------------------------------------------------

/**
 * Build the inputs object for the category scoring engine.
 * Derives missing governance flags from uploaded data where possible.
 */
function buildScoringInputs(govData, internalKpis, summary) {
  return {
    ...govData,
    electricityMonths: summary.overview.perCategory.electricity?.months || 0,
    waterMonths:       summary.overview.perCategory.water?.months || 0,
    wasteMonths:       summary.overview.perCategory.waste?.months || 0,
    powerFactor:       govData.powerFactor ?? 0,
    ledCoveragePct:    govData.ledCoveragePct ?? 0,
    renewablePct:      internalKpis.renewablePct ?? 0,
    waterReusePct:     internalKpis.waterReusePct ?? 0,
    segregationPct:    govData.segregationPct ?? 0,
    recyclingPct:      internalKpis.recyclingPct ?? 0,
    tankerDependencyPct: internalKpis.tankerPct ?? 0,
    waterSourceCount:  govData.waterSourceCount ?? 0,
    energyIntensityScoreFactor: internalKpis.energyStatus?.scoreFactor ?? 0,
    // Waste scoring inputs derived from uploaded data
    wasteAllCategoriesTracked: govData.wasteAllCategoriesTracked ?? ((summary.overview.perCategory.waste?.months || 0) >= 6),
    wasteTotalTracked:         govData.wasteTotalTracked ?? ((summary.overview.perCategory.waste?.months || 0) > 0),
    // authorizedVendorCoverage: ensure it's a proper 0–1 number; default 1 if any biomedical vendor set
    authorizedVendorCoverage: Number.isFinite(govData.authorizedVendorCoverage) && govData.authorizedVendorCoverage > 0
      ? govData.authorizedVendorCoverage
      : (govData.cpcbVendor ? 1 : 0),
    // hazardousHandlingDocumented: true if CPCB vendor + biomedical tracking are in place
    hazardousHandlingDocumented: govData.hazardousHandlingDocumented ??
      (!!(govData.cpcbVendor && govData.biomedicalTracking)),
    // wasteAuditRecords: true if explicitly set or internal audits conducted
    wasteAuditRecords: govData.wasteAuditRecords ?? !!(govData.internalAuditsAny || govData.internalAuditsWithin12Mo),
  };
}

/**
 * Build the confidence modifiers map for the scoring engine.
 */
function buildModifiers(summary) {
  return {
    electricity: summary.confidence.perCategory.electricity?.modifier ?? 1.0,
    water:       summary.confidence.perCategory.water?.modifier ?? 1.0,
    fuel:        summary.confidence.perCategory.fuel?.modifier ?? 1.0,
    waste:       summary.confidence.perCategory.waste?.modifier ?? 1.0,
    governance:  summary.confidence.perCategory.governance?.modifier ?? 1.0,
  };
}

/**
 * Build the certification prerequisites map.
 */
function buildPrerequisitesMap(govData, summary) {
  return {
    cpcbBiomedicalVendor:    !!govData.cpcbVendor,
    infectionControlSOPs:    !!govData.infectionControlSOPs,
    dailyBiomedicalDisposal: !!govData.dailyBiomedicalDisposal,
    energyTracking6mo:       (summary.overview.perCategory.electricity?.months || 0) >= 6,
    waterTracking6mo:        (summary.overview.perCategory.water?.months || 0) >= 6,
    energyMonitoringSystem:  !!govData.energyMonitoringSystem,
    waterMeteringBySource:   (govData.waterSourceCount || 0) >= 2,
    environmentalPolicy:     !!govData.sustainabilityPolicyUploaded,
    esgOwner:                !!govData.esgOwnerFormallyAssigned,
    complianceRegister:      !!govData.complianceRegisterUploaded,
    iaqMonitoring:           !!govData.iaqMonitoring,
    fssaiLicense:            !!govData.fssaiLicense,
    ccpsDocumented:          !!govData.ccpsDocumented,
    haccpPlan:               !!govData.haccpPlan,
    foodTraceability:        !!govData.foodTraceability,
    chemicalInventory:       !!govData.chemicalInventory,
    wastewaterTesting:       !!govData.wastewaterTesting,
    materialDeclarations:    !!govData.materialDeclarations,
    restrictedSubstanceTests: !!govData.restrictedSubstanceTests,
    scope1Data: (summary.emissions.scope1?.tCO2e || 0) > 0,
    scope2Data: (summary.emissions.scope2?.tCO2e || 0) > 0,
  };
}

/**
 * Build the metrics object used by the strengths/gaps engine.
 */
function buildMetricsMap(govData, internalKpis, summary, categoryScores) {
  return {
    energyIntensityStatus: internalKpis.energyStatus?.scoreFactor === 1 ? 'within' : (internalKpis.energyStatus?.scoreFactor === 0 ? 'above' : 'partial'),
    powerFactor:           govData.powerFactor ?? 0,
    electricityMonths:     summary.overview.perCategory.electricity?.months || 0,
    renewablePct:          internalKpis.renewablePct ?? 0,
    waterMonths:           summary.overview.perCategory.water?.months || 0,
    waterReusePct:         internalKpis.waterReusePct ?? 0,
    tankerDependencyPct:   internalKpis.tankerPct ?? 0,
    segregationPct:        govData.segregationPct ?? 0,
    recyclingPct:          internalKpis.recyclingPct ?? 0,
    authorizedVendorCoverage: govData.authorizedVendorCoverage ?? 0,
    esgOwner:              !!govData.esgOwner,
    sustainabilityPolicy:  !!govData.sustainabilityPolicy,
    internalAudits:        !!govData.internalAuditsAny,
    biomedicalCompliance:  !!govData.cpcbVendor && !!govData.biomedicalTracking,
    stpOperational:        !!govData.stpOperational,
    stpAvailable:          !!govData.stpAvailable,
    energyMonitoringSystem: !!govData.energyMonitoringSystem,
    ledCoveragePct:        govData.ledCoveragePct ?? 0,
    leakageMonitoring:     !!govData.leakageMonitoring,
    capaTracking:          !!govData.capaTracking,
    iaqMonitoring:         !!govData.iaqMonitoring,
    emsImplemented:        !!govData.energyMonitoringSystem,
    scope3Complete:        (summary.emissions.scope3?.tCO2e || 0) > 0 && !(summary.emissions.scope3?.partial),
  };
}

/**
 * Build the flat facts object consumed by the regulatory engine.
 */
function buildRegulationFacts(govData, extras, summary, categoryScores) {
  return {
    esgOwner:              !!govData.esgOwner,
    governanceScore:       categoryScores.governance > 50,
    scope1Data:            (summary.emissions.scope1?.tCO2e || 0) > 0,
    scope2Data:            (summary.emissions.scope2?.tCO2e || 0) > 0,
    scope3Data:            (summary.emissions.scope3?.tCO2e || 0) > 0,
    sustainabilityPolicy:  !!govData.sustainabilityPolicy,
    biomedicalKg:          (extras.biomedicalKg || 0) > 0,
    cpcbVendor:            !!govData.cpcbVendor,
    biomedicalTracking:    !!govData.biomedicalTracking,
    disposalFrequency:     !!govData.dailyBiomedicalDisposal,
    ewasteKg:              (extras.ewasteKg || 0) > 0,
    authorizedRecycler:    !!govData.authorizedVendorCoverage,
    ewasteTracking:        !!govData.wasteAuditRecords,
    hazardousKg:           (extras.hazardousKg || 0) > 0,
    authorizedVendor:      !!govData.authorizedVendorCoverage,
    manifestRecords:       !!govData.wasteAuditRecords,
    energyMonitoringSystem:  !!govData.energyMonitoringSystem,
    energyAuditRecords:    !!govData.internalAuditsAny,
    designatedEnergyManager: !!govData.esgOwnerFormallyAssigned,
    environmentalPolicy:   !!govData.sustainabilityPolicyUploaded,
    complianceRegister:    !!govData.complianceRegister,
    consentToOperate:      !!govData.complianceRegister,
    waterMeter:            (govData.waterSourceCount || 0) > 0,
    cessPayment:           false,
    griAlignment:          !!govData.complianceRegister,
    fssaiLicense:          !!govData.fssaiLicense,
    hygieneRecords:        !!govData.sopDocumentation,
    auditReports:          !!govData.internalAuditsWithin12Mo,
    emissionsIntensity:    (summary.emissions.intensityTCO2ePerSqft || 0) > 0,
    plasticWasteKg:        false,
    eprRegistration:       false,
  };
}

/** Build the Screen 3 payload — assumes summary has already been computed. */
async function buildReadiness(assessment, summary) {
  const extras     = assessment.extras || {};
  const govData    = assessment.governance?.toObject ? assessment.governance.toObject() : (assessment.governance || {});
  const internalKpis = summary._internal?.kpis || {};

  // 1. Inputs for the scoring engine
  const inputs = buildScoringInputs(govData, internalKpis, summary);

  // 2. Confidence modifiers
  const modifiers = buildModifiers(summary);

  // 3. Category scores
  const categoryResults = scoreAll(inputs, modifiers);
  const categoryScores = {
    energy:     categoryResults.energy.score,
    water:      categoryResults.water.score,
    waste:      categoryResults.waste.score,
    governance: categoryResults.governance.score,
    indoorEnv:  govData.iaqMonitoring ? 80 : 0,
    evidence:   Math.min(100, (summary.overview.overallCompletenessPct ?? 0)),
    other:      0,
  };

  // 4. Certification readiness
  const prereqs        = buildPrerequisitesMap(govData, summary);
  const certifications = scoreAllApplicable(assessment.sectorCode, categoryScores, prereqs);

  // 5. Strengths & gaps
  const metrics  = buildMetricsMap(govData, internalKpis, summary, categoryScores);
  const strengths = generateStrengths(metrics);
  const gaps      = generateGaps(metrics);
  const roadmap   = generateRoadmap(gaps);

  // 6. Regulatory readiness
  const regulationFacts = buildRegulationFacts(govData, extras, summary, categoryScores);
  const regulations     = evalRegs({
    sector:          assessment.sectorCode,
    listed:          assessment.user?.listed,
    ewasteGenerated: (extras.ewasteKg || 0) > 0,
    hazardousWasteKg: extras.hazardousKg || 0,
    connectedLoadKW: govData.connectedLoadKW || 0,
  }, regulationFacts);

  // 7. Overall readiness score (Master sheet 5: 50% certification avg, 30% universal sustainability, 10% governance, 10% confidence)
  const certificationAvg = certifications.length ? certifications.reduce((s, c) => s + c.finalScore, 0) / certifications.length : 0;
  const universalAvg     = (categoryScores.energy + categoryScores.water + categoryScores.waste) / 3;
  const overall          = (certificationAvg * 0.5) + (universalAvg * 0.3) + (categoryScores.governance * 0.1) + ((summary.overview.overallCompletenessPct || 0) * 0.1);

  const executive = buildExecutiveSummary(
    assessment.organizationName || 'Your organization',
    overall,
    summary,
    categoryScores,
    certifications,
    strengths,
    gaps
  );

  // Per-category readiness scores for all 6 upload categories.
  // electricity/water/waste use the full scoring engine.
  // fuel/transport/refrigerants use completeness as readiness proxy.
  const completenessScore = (pct) => Math.min(80, round((pct || 0) * 0.80, 1));

  return {
    overall: { score: round(overall, 1), label: round(overall, 1) >= 75 ? 'Strong' : round(overall, 1) >= 60 ? 'Structured' : round(overall, 1) >= 40 ? 'Foundational' : 'Not Ready' },
    radar: {
      electricity: round(categoryScores.energy, 1),
      water:       round(categoryScores.water, 1),
      waste:       round(categoryScores.waste, 1),
      governance:  round(categoryScores.governance, 1),
      fuel:         completenessScore(summary.overview.perCategory.fuel?.pct),
      transport:    completenessScore(summary.overview.perCategory.transport?.pct),
      refrigerants: completenessScore(summary.overview.perCategory.refrigerants?.pct),
      energy:    round(categoryScores.energy, 1),
      emissions: round(Math.max(0, 100 - (summary.emissions.intensityTCO2ePerSqft * 100)), 1),
    },
    categoryResults,
    certifications: certifications.map((c) => ({
      ...c,
      timeline: recommendedTimeline(c.finalScore, gaps[0]?.severity),
    })),
    regulations,
    strengths,
    gaps,
    roadmap,
    executiveSummary: executive,
    emissions: summary.emissions,
    confidence: summary.confidence,
    assumptions: summary.assumptions,
  };
}

/**
 * Dynamically builds an executive-level summary from actual calculation outputs.
 * Every sentence adapts to the real values — score, emissions, completeness,
 * confidence, certification alignment and gap severity — so different assessments
 * always produce meaningfully different paragraphs.
 *
 * @param {string}   orgName        - Organization name
 * @param {number}   overall        - Computed overall readiness score (0-100)
 * @param {object}   summary        - Full Screen-2 payload (emissions, overview, confidence…)
 * @param {object}   categoryScores - { energy, water, waste, governance, … }
 * @param {Array}    certifications - Scored certification array
 * @param {Array}    strengths      - { text } array from strengthsGaps engine
 * @param {Array}    gaps           - { text, severity } array from strengthsGaps engine
 */
function buildExecutiveSummary(orgName, overall, summary, categoryScores, certifications, strengths, gaps) {
  const score        = Math.round(overall);
  const completeness = Math.round(summary.overview?.overallCompletenessPct || 0);
  const perCat       = summary.overview?.perCategory || {};
  const emissions    = summary.emissions || {};
  const confCats     = summary.confidence?.perCategory || {};

  // Max months uploaded across any upload category
  const maxMonths = Object.values(perCat).reduce((m, c) => Math.max(m, c.months || 0), 0);

  // Confidence tallies
  const confLevels    = Object.values(confCats).map((c) => c.level || '');
  const highConfCount = confLevels.filter((l) => l === 'High').length;
  const lowConfCount  = confLevels.filter((l) => l === 'Low').length;

  // Readiness tier label
  const tier =
    score >= 75 ? 'strong' :
    score >= 60 ? 'progressing' :
    score >= 40 ? 'developing' :
    'early-stage';

  // Data quality descriptor
  const dataQuality =
    completeness >= 80 ? 'comprehensive' :
    completeness >= 60 ? 'substantial' :
    completeness >= 40 ? 'partial' :
    'limited';

  // Top strengths and gaps (cleaned up trailing punctuation)
  const clean    = (s) => (s || '').replace(/\.+$/g, '').trim();
  const topStr   = strengths.slice(0, 2).map((s) => clean(s.text));
  const critGaps = gaps.filter((g) => g.severity === 'High').slice(0, 2).map((g) => clean(g.text));
  const topGaps  = critGaps.length ? critGaps : gaps.slice(0, 2).map((g) => clean(g.text));
  const topCert  = certifications && certifications.length ? certifications[0] : null;

  const parts = [];

  // ── Sentence 1: Performance overview ───────────────────────────────────────
  const dataNote = maxMonths > 0
    ? `${maxMonths} month${maxMonths !== 1 ? 's' : ''} of uploaded operational data`
    : 'available operational data';
  parts.push(
    `Based on ${dataNote} (${completeness}% dataset completeness), ` +
    `${orgName} demonstrates ${tier} ESG fundamentals with an overall readiness score of ${score}/100.`
  );

  // ── Sentence 2: Emissions (only when data exists) ──────────────────────────
  const totalCO2 = emissions.totalTCO2e || 0;
  if (totalCO2 > 0) {
    const s1 = emissions.scope1?.tCO2e || 0;
    const s2 = emissions.scope2?.tCO2e || 0;
    const s3 = emissions.scope3?.tCO2e || 0;
    const primaryScope =
      s2 >= s1 && s2 >= s3 ? 'electricity consumption (Scope 2)' :
      s1 >= s3              ? 'direct operations (Scope 1)'       :
                              'value-chain activities (Scope 3)';
    const intensityClause = emissions.intensityTCO2ePerSqft > 0
      ? `, at an intensity of ${emissions.intensityTCO2ePerSqft} tCO2e per sqft`
      : '';
    parts.push(
      `Total GHG emissions stand at ${totalCO2} tCO2e${intensityClause}, ` +
      `with ${primaryScope} representing the primary contributor.`
    );
  }

  // ── Sentence 3: Operational strengths ──────────────────────────────────────
  if (topStr.length > 0) {
    const sList = topStr.length === 1 ? topStr[0] : `${topStr[0]} and ${topStr[1]}`;
    parts.push(`Notable operational strengths include ${sList}.`);
  }

  // ── Sentence 4: Critical gaps / risk areas ─────────────────────────────────
  if (topGaps.length > 0) {
    const gList   = topGaps.length === 1 ? topGaps[0] : `${topGaps[0]} and ${topGaps[1]}`;
    const urgency = critGaps.length > 0 ? 'Critical' : 'Primary';
    parts.push(`${urgency} improvement areas include ${gList}.`);
  }

  // ── Sentence 5: Top certification outlook ──────────────────────────────────
  if (topCert) {
    const capNote = topCert.capped ? ', pending fulfilment of prerequisite requirements,' : '';
    parts.push(
      `The strongest certification alignment is with ${topCert.framework} ` +
      `(score: ${topCert.finalScore}/100)${capNote}, ` +
      `with an estimated readiness timeline of ${topCert.timeline}.`
    );
  }

  // ── Sentence 6: Confidence-driven closing ──────────────────────────────────
  if (completeness < 50 || lowConfCount >= 3) {
    parts.push(
      `Extending data collection to cover additional months and categories will materially ` +
      `strengthen the reliability and breadth of this assessment.`
    );
  } else if (score >= 65 && highConfCount >= 2) {
    parts.push(
      `With strong data confidence across key categories, ${orgName} is well-positioned ` +
      `to advance structured ESG certification initiatives.`
    );
  } else if (score < 40) {
    parts.push(
      `Establishing foundational ESG practices — particularly governance documentation, ` +
      `emissions tracking, and resource monitoring — will be essential to improving the ` +
      `overall readiness profile.`
    );
  } else {
    parts.push(
      `A focused effort on the identified priority actions, combined with consistent data ` +
      `monitoring, will drive measurable improvement in the overall ESG readiness profile.`
    );
  }

  return parts.join(' ');
}

/** Save summary back to the assessment doc. */
async function refreshSummary(assessment) {
  const summary = await buildSummary(assessment);
  assessment.summary = summary;
  if (assessment.status === 'DataLoad') assessment.status = 'SummaryReady';
  await assessment.save();
  return summary;
}

async function refreshReadiness(assessment) {
  // Always recalculate summary fresh so emission factors are up to date
  const summary   = await buildSummary(assessment);
  const readiness = await buildReadiness(assessment, summary);
  assessment.summary  = summary;
  assessment.readiness = readiness;
  assessment.status   = 'ReadinessReady';
  await assessment.save();
  return readiness;
}

module.exports = { buildSummary, buildReadiness, refreshSummary, refreshReadiness };
