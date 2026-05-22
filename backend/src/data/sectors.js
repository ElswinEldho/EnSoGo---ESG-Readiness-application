// Sector master — BRD §3.1.2 and §13.2.
// All sectors that the platform supports. Update here to add/remove sectors.

const SECTORS = {
  HOSP: {
    code: 'HOSP',
    name: 'Hospital / Healthcare',
    primaryCerts: ['NABH', 'IGBC Healthcare', 'ISO 14001'],
    secondaryCerts: ['LEED Healthcare', 'WELL', 'BRSR', 'JCI'],
    requiredCategories: ['electricity', 'water', 'fuel', 'waste', 'governance'],
    sectorFields: ['biomedicalWaste', 'infectionControl', 'otAirQuality', 'dgBackup'],
  },
  BLDG: {
    code: 'BLDG',
    name: 'Commercial Building / Real Estate',
    primaryCerts: ['IGBC', 'LEED', 'ISO 14001'],
    secondaryCerts: ['GRIHA', 'EDGE', 'WELL', 'BRSR'],
    requiredCategories: ['electricity', 'water', 'waste', 'governance'],
    sectorFields: ['occupancyData', 'facadeType', 'glazingRatio', 'hvacType'],
  },
  MFGR: {
    code: 'MFGR',
    name: 'Manufacturing / Industrial',
    primaryCerts: ['ISO 14001', 'ISO 50001', 'ISO 45001'],
    secondaryCerts: ['EcoVadis', 'BRSR', 'GRI', 'ISSB'],
    requiredCategories: ['electricity', 'water', 'fuel', 'waste', 'governance', 'transport'],
    sectorFields: ['productionOutput', 'processEnergy', 'effluentData'],
  },
  TEXT: {
    code: 'TEXT',
    name: 'Textile Industry',
    primaryCerts: ['Higg Index', 'ZDHC', 'GOTS'],
    secondaryCerts: ['OEKO-TEX', 'Bluesign', 'SA8000', 'Sedex SMETA'],
    requiredCategories: ['electricity', 'water', 'fuel', 'waste', 'governance'],
    sectorFields: ['chemicalInventory', 'wastewaterTesting', 'casNumbers'],
  },
  ELEC: {
    code: 'ELEC',
    name: 'Electronics Industry',
    primaryCerts: ['RoHS', 'ISO 14001'],
    secondaryCerts: ['CE Marking', 'WEEE', 'ISO 27001', 'RBA', 'EPEAT'],
    requiredCategories: ['electricity', 'water', 'waste', 'governance'],
    sectorFields: ['materialDeclarations', 'restrictedSubstanceTests'],
  },
  FOOD: {
    code: 'FOOD',
    name: 'Food & Beverage',
    primaryCerts: ['FSSAI', 'HACCP', 'ISO 22000'],
    secondaryCerts: ['ISO 14001'],
    requiredCategories: ['electricity', 'water', 'fuel', 'waste', 'governance'],
    sectorFields: ['fssaiLicense', 'ccpDocumentation', 'coldChainLogs'],
  },
  LOGI: {
    code: 'LOGI',
    name: 'Logistics & Supply Chain',
    primaryCerts: ['ISO 14001', 'GLEC/Smart Freight'],
    secondaryCerts: ['EcoVadis', 'GRI'],
    requiredCategories: ['electricity', 'fuel', 'waste', 'governance', 'transport'],
    sectorFields: ['fleetFuel', 'logisticsKm', 'cargoTonnage'],
  },
  EDUC: {
    code: 'EDUC',
    name: 'Educational Institution',
    primaryCerts: ['IGBC', 'ISO 14001'],
    secondaryCerts: ['WELL', 'NAAC Sustainability', 'GRI'],
    requiredCategories: ['electricity', 'water', 'waste', 'governance'],
    sectorFields: ['campusArea', 'studentCount', 'greenCampusStatus'],
  },
  NGO: {
    code: 'NGO',
    name: 'NGO / Social Impact',
    primaryCerts: ['GRI (NGO)', 'SROI'],
    secondaryCerts: ['UN SDG Alignment'],
    requiredCategories: ['governance'],
    sectorFields: ['beneficiariesReached', 'programmeBudget', 'sdgTargets'],
  },
  GEN: {
    code: 'GEN',
    name: 'General (All Other Organizations)',
    primaryCerts: ['ISO 14001', 'BRSR'],
    secondaryCerts: ['GRI', 'CDP'],
    requiredCategories: ['electricity', 'water', 'waste', 'governance'],
    sectorFields: [],
  },
};

const isValidSector = (code) => Object.prototype.hasOwnProperty.call(SECTORS, code);

module.exports = { SECTORS, isValidSector };
