// Certification framework weights — BRD §13.3 + Sustainability Master sheet 5.
// Weights are percentages over the universal categories (Energy/Water/Waste/Governance)
// plus optional Indoor Environment and Evidence buckets.

// Categories used as weight keys: energy, water, waste, indoorEnv, governance, evidence, other
const FRAMEWORK_WEIGHTS = {
  'IGBC Healthcare': { energy: 30, water: 20, waste: 15, indoorEnv: 15, governance: 10, evidence: 10 },
  'LEED Healthcare': { energy: 30, water: 20, waste: 15, indoorEnv: 15, governance: 10, evidence: 10 },
  'IGBC': { energy: 35, water: 20, waste: 15, indoorEnv: 10, governance: 10, evidence: 10 },
  'LEED': { energy: 30, water: 15, waste: 15, indoorEnv: 15, governance: 10, evidence: 5, other: 10 },
  'NABH': { energy: 20, water: 15, waste: 20, indoorEnv: 20, governance: 15, evidence: 10 },
  'ISO 14001': { energy: 20, water: 15, waste: 15, indoorEnv: 10, governance: 30, evidence: 10 },
  'ISO 50001': { energy: 75, water: 0, waste: 0, indoorEnv: 0, governance: 20, evidence: 5 },
  'WELL': { energy: 15, water: 15, waste: 10, indoorEnv: 40, governance: 10, evidence: 10 },
  'BRSR': { energy: 15, water: 15, waste: 15, indoorEnv: 10, governance: 30, evidence: 15 },
  'GRI': { energy: 15, water: 15, waste: 15, indoorEnv: 10, governance: 25, evidence: 20 },
  'Higg Index': { energy: 30, water: 20, waste: 20, indoorEnv: 5, governance: 15, evidence: 10 },
  'HACCP / ISO 22000': { energy: 10, water: 15, waste: 20, indoorEnv: 15, governance: 30, evidence: 10 },
  'GRIHA': { energy: 30, water: 20, waste: 15, indoorEnv: 15, governance: 10, evidence: 10 },
  'EDGE': { energy: 40, water: 35, waste: 5, indoorEnv: 5, governance: 5, evidence: 10 },
  'CDP': { energy: 25, water: 20, waste: 15, indoorEnv: 5, governance: 25, evidence: 10 },
  'EcoVadis': { energy: 20, water: 15, waste: 15, indoorEnv: 5, governance: 30, evidence: 15 },
  'GOTS': { energy: 15, water: 25, waste: 15, indoorEnv: 5, governance: 25, evidence: 15 },
  'ZDHC': { energy: 10, water: 30, waste: 20, indoorEnv: 5, governance: 20, evidence: 15 },
  'OEKO-TEX': { energy: 10, water: 25, waste: 15, indoorEnv: 5, governance: 30, evidence: 15 },
  'RoHS': { energy: 10, water: 5, waste: 25, indoorEnv: 5, governance: 35, evidence: 20 },
  'FSSAI': { energy: 10, water: 15, waste: 20, indoorEnv: 15, governance: 30, evidence: 10 },
  'HACCP': { energy: 10, water: 15, waste: 20, indoorEnv: 15, governance: 30, evidence: 10 },
  'ISO 22000': { energy: 10, water: 15, waste: 20, indoorEnv: 15, governance: 30, evidence: 10 },
  'ISO 27001': { energy: 5, water: 5, waste: 10, indoorEnv: 5, governance: 60, evidence: 15 },
  'NAAC Sustainability': { energy: 25, water: 20, waste: 20, indoorEnv: 10, governance: 15, evidence: 10 },
  'GLEC/Smart Freight': { energy: 25, water: 5, waste: 10, indoorEnv: 5, governance: 30, evidence: 25 },
  'GRI (NGO)': { energy: 10, water: 10, waste: 10, indoorEnv: 5, governance: 40, evidence: 25 },
  'SROI': { energy: 5, water: 5, waste: 5, indoorEnv: 5, governance: 50, evidence: 30 },
  'UN SDG Alignment': { energy: 15, water: 15, waste: 15, indoorEnv: 5, governance: 35, evidence: 15 },
  'JCI': { energy: 15, water: 15, waste: 20, indoorEnv: 20, governance: 20, evidence: 10 },
  'LEED Healthcare': { energy: 30, water: 20, waste: 15, indoorEnv: 15, governance: 10, evidence: 10 },
  'WEEE': { energy: 5, water: 5, waste: 50, indoorEnv: 5, governance: 25, evidence: 10 },
  'CE Marking': { energy: 10, water: 5, waste: 15, indoorEnv: 5, governance: 45, evidence: 20 },
  'RBA': { energy: 10, water: 10, waste: 10, indoorEnv: 5, governance: 55, evidence: 10 },
  'EPEAT': { energy: 30, water: 10, waste: 20, indoorEnv: 5, governance: 25, evidence: 10 },
  'SA8000': { energy: 5, water: 5, waste: 5, indoorEnv: 5, governance: 65, evidence: 15 },
  'Sedex SMETA': { energy: 5, water: 10, waste: 10, indoorEnv: 5, governance: 60, evidence: 10 },
  'Bluesign': { energy: 25, water: 25, waste: 15, indoorEnv: 5, governance: 20, evidence: 10 },
};

// Prerequisites — BRD §13.4. Missing prerequisite caps the score at 74%.
const FRAMEWORK_PREREQS = {
  'NABH': {
    minScore: 75,
    requires: ['cpcbBiomedicalVendor', 'infectionControlSOPs', 'dailyBiomedicalDisposal'],
    capIfMissing: 74,
  },
  'IGBC': { minScore: 65, requires: ['energyTracking6mo', 'waterTracking6mo'], capIfMissing: 74 },
  'IGBC Healthcare': { minScore: 65, requires: ['energyTracking6mo', 'waterTracking6mo'], capIfMissing: 74 },
  'LEED Healthcare': { minScore: 65, requires: ['energyMonitoringSystem', 'waterMeteringBySource'], capIfMissing: 74 },
  'ISO 14001': { minScore: 70, requires: ['environmentalPolicy', 'esgOwner', 'complianceRegister'], capIfMissing: 74 },
  'WELL': { minScore: 55, requires: ['iaqMonitoring'], capIfMissing: 74 },
  'HACCP': { minScore: 70, requires: ['fssaiLicense', 'ccpsDocumented'], capIfMissing: 74 },
  'ISO 22000': { minScore: 75, requires: ['haccpPlan', 'foodTraceability'], capIfMissing: 74 },
  'Higg Index': { minScore: 65, requires: ['chemicalInventory', 'wastewaterTesting'], capIfMissing: 74 },
  'RoHS': { minScore: 70, requires: ['materialDeclarations', 'restrictedSubstanceTests'], capIfMissing: 74 },
  'BRSR': { minScore: 60, requires: ['esgOwner', 'scope1Data', 'scope2Data'], capIfMissing: 74 },
};

module.exports = { FRAMEWORK_WEIGHTS, FRAMEWORK_PREREQS };
