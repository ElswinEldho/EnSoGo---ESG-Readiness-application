// Emissions engine — BRD §9. Scope 1 / 2 / 3 calculation.
// All inputs are already annualized (call annualize first). Pure functions.

const { EMISSION_FACTORS } = require('../../data/emissionFactors');

const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

/**
 * Compute Scope 1 (direct combustion + refrigerant leaks).
 *   inputs: { dieselLitres, pngCngKg, lpgLitres, petrolLitres,
 *             refrigerantLeaks: [{ type: 'R-22'|'R-410A'|'R-32', kg: number }] }
 *   factors: optional overrides (object matching EMISSION_FACTORS keys)
 *   returns: { tCO2e, breakdown: [{source, kgCO2e, tCO2e}] }
 */
function computeScope1(inputs = {}, factors = {}) {
  const breakdown = [];

  const dieselFactor = (factors.diesel ?? EMISSION_FACTORS.diesel.value);
  if (Number.isFinite(inputs.dieselLitres) && inputs.dieselLitres > 0) {
    const kg = inputs.dieselLitres * dieselFactor;
    breakdown.push({ source: 'Diesel / HSD', kgCO2e: round(kg), tCO2e: round(kg / 1000, 3) });
  }
  const pngFactor = (factors.pngCng ?? EMISSION_FACTORS.pngCng.value);
  // Accept pngCngLitres (primary) or legacy pngCngKg
  const pngQty = Number.isFinite(inputs.pngCngLitres) && inputs.pngCngLitres > 0
    ? inputs.pngCngLitres
    : (Number.isFinite(inputs.pngCngKg) && inputs.pngCngKg > 0 ? inputs.pngCngKg : null);
  if (pngQty !== null) {
    const kg = pngQty * pngFactor;
    breakdown.push({ source: 'PNG / CNG', kgCO2e: round(kg), tCO2e: round(kg / 1000, 3) });
  }
  const lpgFactor = (factors.lpg ?? EMISSION_FACTORS.lpg.value);
  if (Number.isFinite(inputs.lpgLitres) && inputs.lpgLitres > 0) {
    const kg = inputs.lpgLitres * lpgFactor;
    breakdown.push({ source: 'LPG', kgCO2e: round(kg), tCO2e: round(kg / 1000, 3) });
  }
  const petrolFactor = (factors.petrol ?? EMISSION_FACTORS.petrol.value);
  if (Number.isFinite(inputs.petrolLitres) && inputs.petrolLitres > 0) {
    const kg = inputs.petrolLitres * petrolFactor;
    breakdown.push({ source: 'Petrol', kgCO2e: round(kg), tCO2e: round(kg / 1000, 3) });
  }
  for (const leak of inputs.refrigerantLeaks || []) {
    if (!leak || !Number.isFinite(leak.kg) || leak.kg <= 0) continue;
    const factorKey = { 'R-22': 'refrigerant_R22', 'R-410A': 'refrigerant_R410A', 'R-32': 'refrigerant_R32' }[leak.type];
    if (!factorKey) continue;
    const f = factors[leak.type] ?? EMISSION_FACTORS[factorKey].value;
    const kg = leak.kg * f;
    breakdown.push({ source: `Refrigerant ${leak.type} leakage`, kgCO2e: round(kg), tCO2e: round(kg / 1000, 3) });
  }

  const tCO2e = round(breakdown.reduce((sum, b) => sum + b.tCO2e, 0), 2);
  return { tCO2e, breakdown };
}

/**
 * Scope 2 — purchased electricity.
 *   inputs: { annualKwh, renewableKwh? }
 *   factors.grid (kgCO2e/kWh)
 */
function computeScope2(inputs = {}, factors = {}) {
  const gridFactor = (factors.grid ?? EMISSION_FACTORS.gridElectricity_India_National.value);
  if (!Number.isFinite(inputs.annualKwh) || inputs.annualKwh <= 0) {
    return { tCO2e: 0, breakdown: [], factorUsed: gridFactor };
  }
  const renewable = Math.max(0, inputs.renewableKwh || 0);
  const netKwh = Math.max(0, inputs.annualKwh - renewable);
  const kg = netKwh * gridFactor;
  return {
    tCO2e: round(kg / 1000, 2),
    breakdown: [{ source: 'Grid Electricity', kgCO2e: round(kg), tCO2e: round(kg / 1000, 3), kwhBase: netKwh, factor: gridFactor }],
    factorUsed: gridFactor,
    renewableOffsetKwh: renewable,
  };
}

/**
 * Scope 3 — waste, water treatment, transport.
 *   inputs: { wasteToLandfillKg, wastewaterTreatedKl, cargoTonneKm }
 */
function computeScope3(inputs = {}, factors = {}) {
  const breakdown = [];

  const wasteFactor = (factors.wasteLandfill ?? EMISSION_FACTORS.wasteLandfill.value);
  if (Number.isFinite(inputs.wasteToLandfillKg) && inputs.wasteToLandfillKg > 0) {
    const kg = inputs.wasteToLandfillKg * wasteFactor;
    breakdown.push({ source: 'Waste to landfill', kgCO2e: round(kg), tCO2e: round(kg / 1000, 3) });
  }
  const wwFactor = (factors.wastewaterTreatment ?? EMISSION_FACTORS.wastewaterTreatment.value);
  if (Number.isFinite(inputs.wastewaterTreatedKl) && inputs.wastewaterTreatedKl > 0) {
    const kg = inputs.wastewaterTreatedKl * wwFactor;
    breakdown.push({ source: 'Wastewater / STP treatment', kgCO2e: round(kg), tCO2e: round(kg / 1000, 3) });
  }
  const freightFactor = (factors.roadFreight ?? EMISSION_FACTORS.roadFreight.value);
  // Vehicle KM (tonne-km) — from transport template "Vehicle KM" column
  if (Number.isFinite(inputs.vehicleKmTonneKm) && inputs.vehicleKmTonneKm > 0) {
    const kg = inputs.vehicleKmTonneKm * freightFactor;
    breakdown.push({ source: 'Vehicle KM (road freight)', kgCO2e: round(kg), tCO2e: round(kg / 1000, 3) });
  }
  // Fleet Fuel (litres) — use diesel factor as proxy for fleet fuel combustion emissions
  const fleetFuelFactor = (factors.fleetFuel ?? EMISSION_FACTORS.diesel.value);
  if (Number.isFinite(inputs.fleetFuelLitres) && inputs.fleetFuelLitres > 0) {
    const kg = inputs.fleetFuelLitres * fleetFuelFactor;
    breakdown.push({ source: 'Fleet Fuel combustion', kgCO2e: round(kg), tCO2e: round(kg / 1000, 3) });
  }
  // Cargo (tonne-km) — from transport template "Cargo" column
  if (Number.isFinite(inputs.cargoTonneKm) && inputs.cargoTonneKm > 0) {
    const kg = inputs.cargoTonneKm * freightFactor;
    breakdown.push({ source: 'Cargo transport (road freight)', kgCO2e: round(kg), tCO2e: round(kg / 1000, 3) });
  }
  const tCO2e = round(breakdown.reduce((sum, b) => sum + b.tCO2e, 0), 2);
  return { tCO2e, breakdown, partial: breakdown.length === 0 };
}

/** Combine all three scopes + intensity. */
function computeTotal(scope1, scope2, scope3, builtUpAreaSqft) {
  const total = round(scope1.tCO2e + scope2.tCO2e + scope3.tCO2e, 2);
  const intensity = (Number.isFinite(builtUpAreaSqft) && builtUpAreaSqft > 0) ? round(total / builtUpAreaSqft, 4) : 0;
  return { totalTCO2e: total, intensityTCO2ePerSqft: intensity };
}

module.exports = { computeScope1, computeScope2, computeScope3, computeTotal };
