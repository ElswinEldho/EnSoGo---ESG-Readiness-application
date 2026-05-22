// Emission factors — BRD §9.2.
// kgCO2e per unit listed. All are user-overridable except where marked.

const EMISSION_FACTORS = {
  gridElectricity_India_National: { value: 0.72, unit: 'kgCO2e/kWh', basis: 'CEA India Grid Factor', override: true },
  gridElectricity_India_Master: { value: 0.82, unit: 'kgCO2e/kWh', basis: 'Alternative regulatory reference', override: true },
  diesel: { value: 2.68, unit: 'kgCO2e/litre', basis: 'DEFRA / MoEFCC', override: true },
  petrol: { value: 2.31, unit: 'kgCO2e/litre', basis: 'DEFRA', override: true },
  pngCng: { value: 2.04, unit: 'kgCO2e/kg', basis: 'DEFRA', override: true },
  lpg: { value: 2.98, unit: 'kgCO2e/litre', basis: 'DEFRA', override: true },
  refrigerant_R22: { value: 1810, unit: 'kgCO2e/kg', basis: 'IPCC AR6 GWP', override: true },
  refrigerant_R410A: { value: 2088, unit: 'kgCO2e/kg', basis: 'IPCC AR6 GWP', override: true },
  refrigerant_R32: { value: 675, unit: 'kgCO2e/kg', basis: 'IPCC AR6 GWP', override: true },
  wasteLandfill: { value: 0.46, unit: 'kgCO2e/kg', basis: 'DEFRA / IPCC', override: true },
  wastewaterTreatment: { value: 0.71, unit: 'kgCO2e/KL', basis: 'IPCC', override: true },
  roadFreight: { value: 0.092, unit: 'kgCO2e/tonne-km', basis: 'GLEC Framework', override: true },
};

module.exports = { EMISSION_FACTORS };
