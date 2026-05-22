// Sector benchmarks — BRD §11.2.
// Format: { metric, sectorCode, efficientMax, acceptableMin, acceptableMax, unit }
// Compare a metric to its row:
//   value < efficientMax           → 'Within Benchmark / Efficient'
//   value within [acceptableMin, acceptableMax] → 'Within Benchmark / Acceptable'
//   value > acceptableMax          → 'Above Benchmark / Needs Attention'

const ENERGY_INTENSITY = [
  { metric: 'energyIntensity', sector: 'HOSP', efficientMax: 15.0, acceptableMin: 15.0, acceptableMax: 22.0, unit: 'kWh/sqft/year' },
  { metric: 'energyIntensity', sector: 'BLDG', efficientMax: 10.0, acceptableMin: 10.0, acceptableMax: 18.0, unit: 'kWh/sqft/year' },
  { metric: 'energyIntensity', sector: 'EDUC', efficientMax: 8.0, acceptableMin: 8.0, acceptableMax: 14.0, unit: 'kWh/sqft/year' },
  { metric: 'energyIntensity', sector: 'FOOD', efficientMax: 18.0, acceptableMin: 18.0, acceptableMax: 28.0, unit: 'kWh/sqft/year' },
  { metric: 'energyIntensity', sector: 'LOGI', efficientMax: 5.0, acceptableMin: 5.0, acceptableMax: 12.0, unit: 'kWh/sqft/year' },
  { metric: 'energyIntensity', sector: 'NGO', efficientMax: 8.0, acceptableMin: 8.0, acceptableMax: 15.0, unit: 'kWh/sqft/year' },
  { metric: 'energyIntensity', sector: 'GEN', efficientMax: 8.0, acceptableMin: 8.0, acceptableMax: 15.0, unit: 'kWh/sqft/year' },
];

const WATER_INTENSITY = [
  { metric: 'waterIntensity', sector: 'HOSP', efficientMax: 0.20, acceptableMin: 0.20, acceptableMax: 0.35, unit: 'KL/sqft/year' },
  { metric: 'waterIntensity', sector: 'BLDG', efficientMax: 0.10, acceptableMin: 0.10, acceptableMax: 0.25, unit: 'KL/sqft/year' },
  { metric: 'waterIntensity', sector: 'EDUC', efficientMax: 0.08, acceptableMin: 0.08, acceptableMax: 0.18, unit: 'KL/sqft/year' },
  { metric: 'waterIntensity', sector: 'FOOD', efficientMax: 0.30, acceptableMin: 0.30, acceptableMax: 0.55, unit: 'KL/sqft/year' },
  { metric: 'waterIntensity', sector: 'NGO', efficientMax: 0.08, acceptableMin: 0.08, acceptableMax: 0.18, unit: 'KL/sqft/year' },
  { metric: 'waterIntensity', sector: 'GEN', efficientMax: 0.08, acceptableMin: 0.08, acceptableMax: 0.18, unit: 'KL/sqft/year' },
];

// Universal thresholds (BRD §11.2.3)
const UNIVERSAL = {
  recyclingRate: { needsAttention: 0.40, partial: 0.60, target: 0.60 },
  wasteSegregation: { critical: 0.70, partial: 0.95, target: 1.0 },
  renewableContribution: { needsAttention: 0.05, partial: 0.10, target: 0.10 },
  tankerDependency: { good: 0.10, slightlyHigh: 0.20 }, // ascending
  waterReuse: { needsAttention: 0.05, moderate: 0.15, target: 0.15 },
  powerFactor: { critical: 0.80, target: 0.85, strong: 0.90 },
  dgDependency: { good: 0.05, moderate: 0.15 }, // ascending = bad
};

const BENCHMARKS = [...ENERGY_INTENSITY, ...WATER_INTENSITY];

function findBenchmark(metric, sector) {
  return BENCHMARKS.find((b) => b.metric === metric && b.sector === sector) || null;
}

module.exports = { BENCHMARKS, UNIVERSAL, findBenchmark };
