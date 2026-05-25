// Benchmarking engine — BRD §11. Status assignment with 10% tolerance band.

const { findBenchmark, UNIVERSAL } = require('../../data/benchmarks');

/**
 * Assign benchmark status for energy / water intensity (lower = better).
 * Returns: { value, benchmark, status, colour, scoreFactor }
 *  - 'Within Benchmark' → scoreFactor 1.0 (full points)
 *  - 'Slightly Below'  → scoreFactor 0.5 (partial — within +10% of ceiling)
 *  - 'Above Benchmark' → scoreFactor 0   (zero)
 *  - 'Below Benchmark' → scoreFactor 1.0 + note (better than benchmark)
 */
function intensityStatus(metric, sector, value) {
  const bench = findBenchmark(metric, sector);
  if (!bench || !Number.isFinite(value)) {
    return { value, benchmark: null, status: 'Insufficient Data', colour: 'grey', scoreFactor: 0 };
  }
  if (value < bench.efficientMax) {
    return { value, benchmark: bench, status: 'Within Benchmark / Efficient', colour: 'green', scoreFactor: 1.0 };
  }
  if (value >= bench.acceptableMin && value <= bench.acceptableMax) {
    return { value, benchmark: bench, status: 'Within Benchmark / Acceptable', colour: 'green', scoreFactor: 1.0 };
  }
  const tolerance = bench.acceptableMax * 1.10;
  if (value > bench.acceptableMax && value <= tolerance) {
    return { value, benchmark: bench, status: 'Slightly Above Benchmark', colour: 'amber', scoreFactor: 0.5 };
  }
  return { value, benchmark: bench, status: 'Above Benchmark / Needs Attention', colour: 'red', scoreFactor: 0 };
}

/** Universal ratio status helpers (lower-is-better OR higher-is-better). */
function recyclingStatus(pct) {
  const u = UNIVERSAL.recyclingRate;
  if (!Number.isFinite(pct)) return { status: 'Insufficient Data', colour: 'grey' };
  if (pct >= u.target) return { status: 'Within Benchmark', colour: 'green' };
  if (pct >= u.needsAttention) return { status: 'Slightly Below', colour: 'amber' };
  return { status: 'Needs Attention', colour: 'red' };
}

function renewableStatus(pct) {
  const u = UNIVERSAL.renewableContribution;
  if (!Number.isFinite(pct)) return { status: 'Insufficient Data', colour: 'grey' };
  if (pct >= u.target) return { status: 'Within Benchmark', colour: 'green' };
  if (pct >= u.needsAttention) return { status: 'Developing', colour: 'amber' };
  return { status: 'Improvement Needed', colour: 'red' };
}

function powerFactorStatus(pf) {
  const u = UNIVERSAL.powerFactor;
  if (!Number.isFinite(pf)) return { status: 'Insufficient Data', colour: 'grey' };
  if (pf >= u.strong) return { status: 'Strong', colour: 'green' };
  if (pf >= u.target) return { status: 'Good', colour: 'green' };
  if (pf >= u.critical) return { status: 'Moderate', colour: 'amber' };
  return { status: 'Needs Attention', colour: 'red' };
}

function tankerStatus(pct) {
  const u = UNIVERSAL.tankerDependency;
  if (!Number.isFinite(pct)) return { status: 'Insufficient Data', colour: 'grey' };
  if (pct < u.good) return { status: 'Good', colour: 'green' };
  if (pct < u.slightlyHigh) return { status: 'Slightly High', colour: 'amber' };
  return { status: 'Needs Attention', colour: 'red' };
}

function waterReuseStatus(pct) {
  const u = UNIVERSAL.waterReuse;
  if (!Number.isFinite(pct)) return { status: 'Insufficient Data', colour: 'grey' };
  if (pct >= u.target) return { status: 'Within Benchmark', colour: 'green' };
  if (pct >= u.needsAttention) return { status: 'Moderate', colour: 'amber' };
  return { status: 'Needs Attention', colour: 'red' };
}

module.exports = {
  intensityStatus,
  recyclingStatus,
  renewableStatus,
  powerFactorStatus,
  tankerStatus,
  waterReuseStatus,
};
