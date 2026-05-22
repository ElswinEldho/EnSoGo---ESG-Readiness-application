// Strength rules, gap rules, and action library — BRD §12 and §15.4.

// Operators used in rules: 'gte', 'gt', 'lte', 'lt', 'eq', 'within_benchmark', 'above_benchmark'
const STRENGTH_RULES = [
  // ── High-impact strengths (Strong / exemplary performance) ──
  { area: 'Energy',         metric: 'energyIntensityStatus',  op: 'eq',  threshold: 'within', text: 'Efficient energy performance — within sector benchmark.',                      strength: 'Strong' },
  { area: 'Energy',         metric: 'powerFactor',            op: 'gte', threshold: 0.90,     text: 'Healthy power factor maintained — strong grid efficiency and no utility penalty.', strength: 'Strong' },
  { area: 'Energy',         metric: 'renewablePct',           op: 'gt',  threshold: 0.20,     text: 'Strong renewable energy integration — significant clean energy contribution.',   strength: 'Strong' },
  { area: 'Water',          metric: 'waterReusePct',          op: 'gt',  threshold: 0.15,     text: 'Strong water reuse practices — meaningfully reducing freshwater dependency.',    strength: 'Strong' },
  { area: 'Waste',          metric: 'segregationPct',         op: 'gte', threshold: 0.95,     text: 'Strong waste segregation and tracking — fully implemented at source.',          strength: 'Strong' },
  { area: 'Waste',          metric: 'recyclingPct',           op: 'gt',  threshold: 0.60,     text: 'Strong recycling maturity — above the minimum sector benchmark.',              strength: 'Strong' },
  { area: 'Governance',     metric: 'esgOwner',               op: 'eq',  threshold: true,     text: 'Governance accountability established — designated ESG owner in place.',        strength: 'Strong' },
  { area: 'Governance',     metric: 'sustainabilityPolicy',   op: 'eq',  threshold: true,     text: 'Sustainability governance established — formal policy document in place.',      strength: 'Strong' },
  { area: 'Compliance',     metric: 'biomedicalCompliance',   op: 'eq',  threshold: true,     text: 'Biomedical waste compliance strong — CPCB vendor engaged and tracking active.', strength: 'Strong' },
  { area: 'Infrastructure', metric: 'energyMonitoringSystem', op: 'eq',  threshold: true,     text: 'Centralized energy monitoring operational — EMS/BMS providing real-time data.', strength: 'Strong' },
  { area: 'Infrastructure', metric: 'stpOperational',         op: 'eq',  threshold: true,     text: 'Water treatment infrastructure in place — STP operational and functional.',     strength: 'Strong' },

  // ── Medium-impact strengths (Good / above-average performance) ──
  { area: 'Energy',         metric: 'electricityMonths',      op: 'gte', threshold: 10,       text: 'Structured utility data tracking — consistent electricity records available.',  strength: 'Good' },
  { area: 'Energy',         metric: 'ledCoveragePct',         op: 'gte', threshold: 0.80,     text: 'High LED coverage — strong energy efficiency across lighting infrastructure.',  strength: 'Good' },
  { area: 'Water',          metric: 'waterMonths',            op: 'eq',  threshold: 12,       text: 'Full-year water monitoring data available — complete consumption picture.',     strength: 'Good' },
  { area: 'Water',          metric: 'tankerDependencyPct',    op: 'lt',  threshold: 0.10,     text: 'Low external water dependency — strong municipal/borewell coverage.',           strength: 'Good' },
  { area: 'Water',          metric: 'leakageMonitoring',      op: 'eq',  threshold: true,     text: 'Water leakage monitoring system operational — non-revenue water losses tracked.', strength: 'Good' },
  { area: 'Waste',          metric: 'authorizedVendorCoverage', op: 'eq', threshold: 1.0,    text: 'Full waste compliance maturity — all waste streams handled via authorized vendors.', strength: 'Good' },
  { area: 'Governance',     metric: 'internalAudits',         op: 'eq',  threshold: true,     text: 'Structured operational governance — internal audit cycle active and documented.', strength: 'Good' },
  { area: 'Governance',     metric: 'capaTracking',           op: 'eq',  threshold: true,     text: 'Corrective action tracking in place — CAPA system supports ISO 14001 readiness.', strength: 'Good' },
  { area: 'Compliance',     metric: 'iaqMonitoring',          op: 'eq',  threshold: true,     text: 'Indoor air quality monitoring deployed — supports WELL certification readiness.', strength: 'Good' },
  { area: 'ESG',            metric: 'scope3Complete',         op: 'eq',  threshold: true,     text: 'Scope 3 emissions tracking complete — strong ESG disclosure maturity.',          strength: 'Good' },

  // ── Foundational strengths (baseline hygiene / data availability) ──
  { area: 'Infrastructure', metric: 'emsImplemented',         op: 'eq',  threshold: true,     text: 'Environmental Management System implemented — ISO 14001 alignment in progress.', strength: 'Foundational' },
  { area: 'Energy',         metric: 'renewablePct',           op: 'gt',  threshold: 0.05,     text: 'Initial renewable energy adoption underway — foundation for further scale-up.',  strength: 'Foundational' },
  { area: 'Water',          metric: 'waterReusePct',          op: 'gt',  threshold: 0.05,     text: 'Water reuse programme initiated — early-stage freshwater demand reduction.',     strength: 'Foundational' },
  { area: 'Waste',          metric: 'recyclingPct',           op: 'gt',  threshold: 0.30,     text: 'Waste recycling underway — partial diversion from landfill achieved.',           strength: 'Foundational' },
];

const GAP_RULES = [
  { area: 'Energy', metric: 'renewablePct', op: 'eq', threshold: 0, text: 'No renewable energy integration — weakens IGBC/LEED/WELL scores.', severity: 'High', actionTrigger: 'noRenewable' },
  { area: 'Energy', metric: 'energyMonitoringSystem', op: 'eq', threshold: false, text: 'No centralized energy monitoring system — impacts energy governance.', severity: 'High', actionTrigger: 'noEMS' },
  { area: 'Energy', metric: 'ledCoveragePct', op: 'lt', threshold: 0.60, text: 'Low LED conversion maturity — electricity efficiency below target.', severity: 'Medium', actionTrigger: 'lowLED' },
  { area: 'Energy', metric: 'energyIntensityStatus', op: 'eq', threshold: 'above', text: 'High operational energy consumption — above sector benchmark.', severity: 'High', actionTrigger: 'highEnergyIntensity' },
  { area: 'Energy', metric: 'powerFactor', op: 'lt', threshold: 0.80, text: 'Poor power factor — grid efficiency risk and potential utility penalty.', severity: 'Medium', actionTrigger: 'lowPowerFactor' },
  { area: 'Water', metric: 'waterReusePct', op: 'lt', threshold: 0.10, text: 'Limited water reuse practices — freshwater dependency is high.', severity: 'Medium', actionTrigger: 'lowWaterReuse' },
  { area: 'Water', metric: 'tankerDependencyPct', op: 'gte', threshold: 0.20, text: 'High external water dependency — tanker usage above recommended level.', severity: 'Medium', actionTrigger: 'highTanker' },
  { area: 'Water', metric: 'leakageMonitoring', op: 'eq', threshold: false, text: 'No water leakage monitoring system in place.', severity: 'Medium', actionTrigger: 'noLeakageMonitoring' },
  { area: 'Water', metric: 'stpAvailable', op: 'eq', threshold: false, text: 'No sewage treatment plant — water treatment gap.', severity: 'Medium', actionTrigger: 'noSTP' },
  { area: 'Waste', metric: 'segregationPct', op: 'lt', threshold: 0.70, text: 'Weak waste segregation practices — certification blocker for most frameworks.', severity: 'High', actionTrigger: 'lowSegregation' },
  { area: 'Waste', metric: 'recyclingPct', op: 'lt', threshold: 0.40, text: 'Low recycling maturity — below minimum benchmark.', severity: 'Medium', actionTrigger: 'lowRecycling' },
  { area: 'Governance', metric: 'esgOwner', op: 'eq', threshold: false, text: 'No sustainability governance owner — ESG accountability gap.', severity: 'High', actionTrigger: 'noESGOwner' },
  { area: 'Governance', metric: 'sustainabilityPolicy', op: 'eq', threshold: false, text: 'Sustainability policy missing — governance formalization required.', severity: 'Medium', actionTrigger: 'noPolicy' },
  { area: 'Governance', metric: 'capaTracking', op: 'eq', threshold: false, text: 'No corrective action (CAPA) tracking — ISO 14001 readiness impacted.', severity: 'Medium', actionTrigger: 'noCAPA' },
  { area: 'Compliance', metric: 'biomedicalCompliance', op: 'eq', threshold: false, text: 'Biomedical waste compliance risk — CPCB tracking not in place.', severity: 'High', actionTrigger: 'biomedicalRisk' },
  { area: 'Compliance', metric: 'iaqMonitoring', op: 'eq', threshold: false, text: 'Indoor air quality monitoring absent — WELL readiness impacted.', severity: 'Medium', actionTrigger: 'noIAQ' },
  { area: 'ESG', metric: 'scope3Complete', op: 'eq', threshold: false, text: 'Scope 3 emissions tracking incomplete — ESG maturity limited.', severity: 'Medium', actionTrigger: 'scope3Gap' },
  { area: 'Certification', metric: 'emsImplemented', op: 'eq', threshold: false, text: 'Environmental Management System not implemented — ISO 14001 gap.', severity: 'Medium', actionTrigger: 'noEMS_ISO' },

  // ── 3–6 Month baseline actions (Low severity → mapped to 3–6 Months bucket) ──
  { area: 'Energy', metric: 'renewablePct', op: 'lt', threshold: 0.30, text: 'Renewable energy share below 30% — optimization opportunity.', severity: 'Low', actionTrigger: 'renewableOptimization' },
  { area: 'Waste', metric: 'recyclingPct', op: 'lt', threshold: 0.70, text: 'Waste tracking automation not fully deployed — manual gaps remain.', severity: 'Low', actionTrigger: 'wasteTrackingAutomation' },
  { area: 'Governance', metric: 'sustainabilityPolicy', op: 'eq', threshold: false, text: 'ESG policy not formally implemented across all departments.', severity: 'Low', actionTrigger: 'esgPolicyImplementation' },
  { area: 'Energy', metric: 'energyMonitoringSystem', op: 'eq', threshold: false, text: 'Smart monitoring coverage incomplete — IoT gaps in facility.', severity: 'Low', actionTrigger: 'smartMonitoringUpgrade' },

  // ── 12+ Month strategic actions (always eligible for long-term bucket) ──
  { area: 'ESG', metric: 'scope3Complete', op: 'eq', threshold: false, text: 'Net-zero roadmap not yet formalized — long-term strategy required.', severity: 'Low', actionTrigger: 'netZeroRoadmap' },
  { area: 'Compliance', metric: 'iaqMonitoring', op: 'eq', threshold: false, text: 'Advanced ESG analytics and reporting not implemented.', severity: 'Low', actionTrigger: 'advancedESGAnalytics' },
  { area: 'Certification', metric: 'emsImplemented', op: 'eq', threshold: false, text: 'Green building or sustainability certification targets not set.', severity: 'Low', actionTrigger: 'greenCertificationTargets' },
  { area: 'Energy', metric: 'renewablePct', op: 'lt', threshold: 0.50, text: 'Long-term carbon reduction strategy not documented.', severity: 'Low', actionTrigger: 'carbonReductionStrategy' },
];

const ACTION_LIBRARY = {
  noESGOwner: { text: 'Appoint sustainability governance owner and formally document the role.', timeline: 'Immediate', impact: 'Improves ESG governance score; prerequisite for BRSR and ISO 14001.' },
  noPolicy: { text: 'Develop and formalize a sustainability / environmental policy document.', timeline: 'Immediate', impact: 'Improves governance score by 20 points; prerequisite for ISO 14001.' },
  lowLED: { text: 'Increase LED coverage to > 80% — audit current fixtures and replace.', timeline: '0–3 Months', impact: '8–15% electricity reduction; improves energy parameter score.' },
  lowRecycling: { text: 'Improve waste segregation training and engage recycling vendor contracts.', timeline: '0–3 Months', impact: 'Improves waste score; supports recycling rate above 60% benchmark.' },
  noEMS: { text: 'Implement centralized energy monitoring system (EMS/BMS or IoT-based).', timeline: '3–6 Months', impact: 'Improves IGBC and ISO 14001 energy governance score.' },
  noCAPA: { text: 'Implement corrective and preventive action (CAPA) tracking process.', timeline: '3–6 Months', impact: 'ISO 14001 readiness improvement; governance score impact.' },
  lowWaterReuse: { text: 'Expand STP-treated water reuse for flushing, cooling, and landscape.', timeline: '6–12 Months', impact: '15–25% freshwater demand reduction.' },
  noRenewable: { text: 'Install rooftop solar or procure renewable energy certificate (REC).', timeline: '6–12 Months', impact: '20–35% Scope 2 emissions reduction; improves IGBC/LEED scores.' },
  noIAQ: { text: 'Deploy indoor air quality monitoring system (CO₂, PM2.5, TVOC, humidity).', timeline: '12+ Months', impact: 'Required for WELL certification. Improves occupant health indicators.' },
  noLeakageMonitoring: { text: 'Install water flow meters and leakage detection system.', timeline: '3–6 Months', impact: 'Reduces non-revenue water loss; improves water score.' },
  highTanker: { text: 'Explore borewell deepening, rainwater harvesting, or STP reuse expansion.', timeline: '6–12 Months', impact: 'Reduces tanker dependency and operational water cost.' },
  scope3Gap: { text: 'Implement logistics tracking; engage waste vendor for emission data.', timeline: '6–12 Months', impact: 'Improves ESG disclosure readiness and BRSR Scope 3 reporting.' },
  noEMS_ISO: { text: 'Develop Environmental Management System aligned with ISO 14001 structure.', timeline: '6–12 Months', impact: 'ISO 14001 certification enabler.' },
  highEnergyIntensity: { text: 'Conduct detailed energy audit; identify and address high-consumption equipment.', timeline: '3–6 Months', impact: 'Reduces energy intensity towards sector benchmark; improves IGBC/LEED.' },
  lowPowerFactor: { text: 'Install capacitor bank to raise power factor above 0.90.', timeline: '0–3 Months', impact: 'Eliminates utility penalty; improves energy score.' },
  lowSegregation: { text: 'Roll out colour-coded bin segregation across the facility and train all staff.', timeline: '0–3 Months', impact: 'Unblocks waste compliance; improves recycling rate downstream.' },
  noSTP: { text: 'Evaluate STP feasibility and engage treatment plant vendor.', timeline: '6–12 Months', impact: 'Required for IGBC/LEED Healthcare; enables water reuse.' },
  biomedicalRisk: { text: 'Engage CPCB-authorized biomedical waste vendor and implement daily disposal log.', timeline: 'Immediate', impact: 'Removes NABH certification blocker.' },

  // ── 3–6 Month actions ──
  renewableOptimization: { text: 'Optimize existing renewable energy assets and evaluate solar PV expansion opportunities.', timeline: '3–6 Months', impact: 'Increases renewable share towards 30%; reduces Scope 2 emissions by 10–20%.' },
  wasteTrackingAutomation: { text: 'Deploy automated waste tracking system with digital logs and real-time dashboards.', timeline: '3–6 Months', impact: 'Reduces manual tracking errors; improves waste recycling rate by 15–25%.' },
  esgPolicyImplementation: { text: 'Roll out formal ESG policy across all departments with designated champions and KPIs.', timeline: '3–6 Months', impact: 'Strengthens governance score; enables BRSR and GRI disclosure readiness.' },
  smartMonitoringUpgrade: { text: 'Expand IoT-based smart meters to all major utility points — energy, water, and HVAC.', timeline: '3–6 Months', impact: 'Real-time monitoring closes data gaps; improves ISO 14001 compliance posture.' },

  // ── 12+ Month strategic actions ──
  netZeroRoadmap: { text: 'Develop a formal net-zero roadmap with interim emission reduction targets for 2030 and 2040.', timeline: '12+ Months', impact: 'Positions facility for long-term decarbonization; improves CDP and BRSR climate disclosure score.' },
  advancedESGAnalytics: { text: 'Implement advanced ESG analytics platform with automated KPI benchmarking and stakeholder reporting.', timeline: '12+ Months', impact: 'Enables data-driven sustainability decisions; reduces reporting effort by 40%.' },
  greenCertificationTargets: { text: 'Set targets for IGBC/LEED Healthcare or WELL certification and initiate pre-assessment.', timeline: '12+ Months', impact: 'Formal certification improves market positioning, patient trust, and regulatory standing.' },
  carbonReductionStrategy: { text: 'Document a long-term carbon reduction strategy covering Scope 1, 2, and 3 with annual milestones.', timeline: '12+ Months', impact: 'Supports science-based targets (SBTi) alignment; strengthens climate risk governance.' },
};

const REGULATIONS = [
  {
    code: 'BRSR',
    name: 'BRSR (SEBI)',
    applicabilityCondition: { listed: true },
    inputs: ['esgOwner', 'governanceScore', 'scope1Data', 'scope2Data', 'sustainabilityPolicy'],
    riskIfLow: 'High — mandatory for listed entities.',
  },
  {
    code: 'BMW',
    name: 'Biomedical Waste (BMW) Rules 2016',
    applicabilityCondition: { sector: 'HOSP' },
    inputs: ['biomedicalKg', 'cpcbVendor', 'biomedicalTracking', 'disposalFrequency'],
    riskIfLow: 'High — legal obligation for healthcare.',
  },
  {
    code: 'EWASTE',
    name: 'E-Waste Management Rules 2022',
    applicabilityCondition: { sectorOrEwasteGenerated: ['ELEC'] },
    inputs: ['ewasteKg', 'authorizedRecycler', 'ewasteTracking'],
    riskIfLow: 'Medium — non-compliance attracts penalties.',
  },
  {
    code: 'HAZWASTE',
    name: 'Hazardous Waste Management Rules',
    applicabilityCondition: { hazardousWasteThreshold: true },
    inputs: ['hazardousKg', 'authorizedVendor', 'manifestRecords'],
    riskIfLow: 'High — legal obligation.',
  },
  {
    code: 'ECA',
    name: 'Energy Conservation Act (BEE)',
    applicabilityCondition: { connectedLoadKW: 500, sectors: ['MFGR'] },
    inputs: ['energyMonitoringSystem', 'energyAuditRecords', 'designatedEnergyManager'],
    riskIfLow: 'Medium — mandatory for large consumers.',
  },
  {
    code: 'EPA',
    name: 'Environment Protection Act (MoEFCC)',
    applicabilityCondition: { sectors: ['MFGR', 'TEXT', 'FOOD'] },
    inputs: ['environmentalPolicy', 'complianceRegister', 'consentToOperate'],
    riskIfLow: 'High — mandatory operating requirement.',
  },
  {
    code: 'WCESS',
    name: 'Water Cess Act',
    applicabilityCondition: { sectors: ['MFGR', 'FOOD', 'TEXT'] },
    inputs: ['waterMeter', 'cessPayment'],
    riskIfLow: 'Medium.',
  },
  {
    code: 'ESG_DISC',
    name: 'ESG Disclosure (Voluntary / Emerging)',
    applicabilityCondition: { allSectors: true },
    inputs: ['governanceScore', 'scope1Data', 'scope2Data', 'scope3Data', 'griAlignment'],
    riskIfLow: 'Medium-High — emerging for all entities.',
  },
  {
    code: 'FSSAI',
    name: 'FSSAI Regulations',
    applicabilityCondition: { sector: 'FOOD' },
    inputs: ['fssaiLicense', 'hygieneRecords', 'auditReports'],
    riskIfLow: 'High — mandatory for food businesses.',
  },
  {
    code: 'CDP',
    name: 'Carbon Reporting / CDP',
    applicabilityCondition: { allSectors: true },
    inputs: ['scope1Data', 'scope2Data', 'scope3Data', 'emissionsIntensity'],
    riskIfLow: 'Medium — reputational risk.',
  },
  {
    code: 'PWM',
    name: 'Plastic Waste Management Rules',
    applicabilityCondition: { allSectors: true },
    inputs: ['plasticWasteKg', 'eprRegistration'],
    riskIfLow: 'Medium — enforcement increasing.',
  },
];

const READINESS_LEVELS = [
  { min: 75, max: 100, label: 'Strong' },
  { min: 50, max: 74.999, label: 'Moderate' },
  { min: 30, max: 49.999, label: 'Foundational' },
  { min: 0, max: 29.999, label: 'Not Started' },
];

function getReadinessLevel(score) {
  return READINESS_LEVELS.find((l) => score >= l.min && score <= l.max) || READINESS_LEVELS[READINESS_LEVELS.length - 1];
}

module.exports = {
  STRENGTH_RULES, GAP_RULES, ACTION_LIBRARY, REGULATIONS, READINESS_LEVELS, getReadinessLevel,
};
