/**
 * conversionFactorsService — loads active conversion factors from MongoDB
 * and provides them to the ESG engine.
 *
 * Uses a 60-second in-memory cache so every calculation doesn't hit the DB,
 * but changes from the admin panel reflect within at most 60 seconds.
 * Call invalidateCache() from the admin controller after any save to make
 * changes reflect immediately.
 *
 * Only the 9 factors actively consumed by the Scope 1 / 2 / 3 engine are
 * mapped here. Factors that are seeded but never referenced by buildSummary
 * (petrol, lpg, gridElectricity_India_Master) are intentionally excluded.
 */

const { EMISSION_FACTORS } = require('../data/emissionFactors');

let _cache = null;
let _cacheAt = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Force the next call to getFactorsMap() to re-query the DB.
 * Called by the admin conversion-factors controller after every save.
 */
function invalidateCache() {
  _cache = null;
  _cacheAt = 0;
}

/**
 * Returns a flat key→value map of all active conversion factors.
 * Falls back to the hardcoded EMISSION_FACTORS if MongoDB is unavailable
 * or the collection is empty (safe for cold-start / tests).
 *
 * Keys in the returned object match the parameter names used by the engine:
 *   Scope 1 : diesel, pngCng, 'R-22', 'R-410A', 'R-32'
 *   Scope 2 : grid
 *   Scope 3 : wasteLandfill, wastewaterTreatment, roadFreight, fleetFuel
 */
async function getFactorsMap() {
  // Return cache if still fresh
  if (_cache && Date.now() - _cacheAt < CACHE_TTL_MS) {
    return _cache;
  }

  try {
    // Lazy-require to avoid circular deps at module load time
    const ConversionFactor = require('../admin/models/ConversionFactor');
    const docs = await ConversionFactor.find({ isActive: true }).lean();

    if (!docs || docs.length === 0) {
      // Collection not seeded yet — fall back to hardcoded values
      return buildHardcodedMap();
    }

    // Build key→value map from DB documents
    const map = {};
    for (const doc of docs) {
      map[doc.key] = doc.value;
    }

    // Map DB keys → engine parameter names.
    // Only the 9 factors actually consumed by the calculation workflow are listed.
    const factors = {
      // ── Scope 1 — Fuel combustion ────────────────────────────────────────
      diesel:              map['diesel']                         ?? EMISSION_FACTORS.diesel.value,
      pngCng:              map['pngCng']                         ?? EMISSION_FACTORS.pngCng.value,
      // ── Scope 1 — Refrigerant leakage (engine looks up by type string) ──
      'R-22':              map['refrigerant_R22']                ?? EMISSION_FACTORS.refrigerant_R22.value,
      'R-410A':            map['refrigerant_R410A']              ?? EMISSION_FACTORS.refrigerant_R410A.value,
      'R-32':              map['refrigerant_R32']                ?? EMISSION_FACTORS.refrigerant_R32.value,
      // ── Scope 2 — Grid electricity ───────────────────────────────────────
      grid:                map['gridElectricity_India_National'] ?? EMISSION_FACTORS.gridElectricity_India_National.value,
      // ── Scope 3 — Waste, wastewater, transport ───────────────────────────
      wasteLandfill:       map['wasteLandfill']                  ?? EMISSION_FACTORS.wasteLandfill.value,
      wastewaterTreatment: map['wastewaterTreatment']            ?? EMISSION_FACTORS.wastewaterTreatment.value,
      roadFreight:         map['roadFreight']                    ?? EMISSION_FACTORS.roadFreight.value,
      // fleet fuel (transport template) uses diesel factor as proxy
      fleetFuel:           map['diesel']                         ?? EMISSION_FACTORS.diesel.value,
    };

    _cache = factors;
    _cacheAt = Date.now();
    return factors;

  } catch (err) {
    // DB unavailable — fall back to hardcoded values silently
    // eslint-disable-next-line no-console
    console.error('[conversionFactorsService] DB read failed, using hardcoded factors:', err.message);
    return buildHardcodedMap();
  }
}

/** Builds the factors map from hardcoded emissionFactors.js as a fallback. */
function buildHardcodedMap() {
  return {
    // Scope 1
    diesel:              EMISSION_FACTORS.diesel.value,
    pngCng:              EMISSION_FACTORS.pngCng.value,
    'R-22':              EMISSION_FACTORS.refrigerant_R22.value,
    'R-410A':            EMISSION_FACTORS.refrigerant_R410A.value,
    'R-32':              EMISSION_FACTORS.refrigerant_R32.value,
    // Scope 2
    grid:                EMISSION_FACTORS.gridElectricity_India_National.value,
    // Scope 3
    wasteLandfill:       EMISSION_FACTORS.wasteLandfill.value,
    wastewaterTreatment: EMISSION_FACTORS.wastewaterTreatment.value,
    roadFreight:         EMISSION_FACTORS.roadFreight.value,
    fleetFuel:           EMISSION_FACTORS.diesel.value,
  };
}

module.exports = { getFactorsMap, invalidateCache };
