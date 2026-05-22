// Regulatory readiness engine — BRD §14.

const { REGULATIONS, getReadinessLevel } = require('../data/rules');

/** Compute a 0-100 score for a regulation based on its declared inputs map. */
function scoreRegulation(reg, factsMap = {}) {
  // Each input contributes equally unless customized.
  const inputs = reg.inputs || [];
  if (!inputs.length) return 0;
  const presentCount = inputs.reduce((n, k) => n + (factsMap[k] ? 1 : 0), 0);
  return Math.round((presentCount / inputs.length) * 100);
}

function isApplicable(reg, profile = {}) {
  const cond = reg.applicabilityCondition || {};
  if (cond.allSectors) return true;
  if (cond.sector && profile.sector === cond.sector) return true;
  if (cond.sectors && cond.sectors.includes(profile.sector)) return true;
  if (cond.sectorOrEwasteGenerated && (cond.sectorOrEwasteGenerated.includes(profile.sector) || profile.ewasteGenerated)) return true;
  if (cond.listed && profile.listed) return true;
  if (cond.hazardousWasteThreshold && profile.hazardousWasteKg > 0) return true;
  if (cond.connectedLoadKW && profile.connectedLoadKW >= cond.connectedLoadKW) return true;
  return false;
}

function assignRisk(reg, readinessLabel, profile, factsMap) {
  // BRD §14.3
  const readiness = readinessLabel;
  const mandatory = ['BMW', 'HAZWASTE', 'EPA', 'FSSAI'].includes(reg.code);
  const emerging = ['ESG_DISC', 'CDP'].includes(reg.code);

  // Critical prerequisites override
  if (reg.code === 'BMW' && !factsMap.cpcbVendor) return { level: 'High', note: 'No CPCB vendor for biomedical waste.' };

  if (readiness === 'Strong') return { level: 'Low', note: mandatory ? 'Maintain compliance; document annually.' : 'Monitor; no immediate action required.' };
  if (readiness === 'Moderate') return { level: 'Medium', note: 'Targeted improvement plan within 6 months.' };
  if (readiness === 'Foundational') return { level: emerging ? 'Medium-High' : 'Medium-High', note: 'Priority improvement; immediate gap closure actions.' };
  return { level: mandatory ? 'High' : 'Medium', note: 'Critical — immediate compliance action required.' };
}

/**
 * Score every regulation applicable to the profile.
 * @param profile  { sector, listed, ewasteGenerated, hazardousWasteKg, connectedLoadKW }
 * @param factsMap flat object: boolean/numeric values keyed by input name (must include the inputs each reg.uses)
 */
function evaluateAll(profile = {}, factsMap = {}) {
  const out = [];
  for (const reg of REGULATIONS) {
    if (!isApplicable(reg, profile)) continue;
    const score = scoreRegulation(reg, factsMap);
    const level = getReadinessLevel(score);
    const risk = assignRisk(reg, level.label, profile, factsMap);
    out.push({
      code: reg.code,
      name: reg.name,
      readinessPct: score,
      readinessLabel: level.label,
      riskLevel: risk.level,
      note: risk.note,
      riskIfLow: reg.riskIfLow,
    });
  }
  return out;
}

module.exports = { evaluateAll, scoreRegulation, isApplicable };
