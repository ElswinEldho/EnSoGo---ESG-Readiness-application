// Strengths & critical gaps engine — BRD §12.

const { STRENGTH_RULES, GAP_RULES, ACTION_LIBRARY } = require('../data/rules');

const AREA_RANK = { Energy: 1, Water: 2, Waste: 3, Governance: 4, Compliance: 5, Infrastructure: 6, ESG: 7, Certification: 8 };
const SEVERITY_RANK = { High: 1, Medium: 2, Low: 3 };

function evalRule(metricValue, op, threshold) {
  if (metricValue === undefined || metricValue === null) return false;
  switch (op) {
    case 'gte': return metricValue >= threshold;
    case 'gt':  return metricValue >  threshold;
    case 'lte': return metricValue <= threshold;
    case 'lt':  return metricValue <  threshold;
    case 'eq':  return metricValue === threshold;
    default:    return false;
  }
}

/**
 * Evaluate all strength rules against the facility metrics map.
 *   metrics: flat object — keys must match the .metric field of each rule.
 * Returns up to 8 strengths, ranked by area then order of definition.
 */
function generateStrengths(metrics) {
  const matches = STRENGTH_RULES.filter((r) => evalRule(metrics[r.metric], r.op, r.threshold));
  matches.sort((a, b) => {
    const tierOrder = { Strong: 0, Good: 1, Foundational: 2 };
    return (tierOrder[a.strength] ?? 9) - (tierOrder[b.strength] ?? 9)
        || (AREA_RANK[a.area] || 99) - (AREA_RANK[b.area] || 99);
  });
  // Deduplicate same text only (allow multiple per area since tiers differ)
  const seen = new Set();
  const unique = [];
  for (const m of matches) {
    if (seen.has(m.text)) continue;
    seen.add(m.text);
    unique.push(m);
  }
  return unique.slice(0, 16);
}

/**
 * Evaluate gap rules. Each triggered gap includes the matching action from the library.
 */
function generateGaps(metrics) {
  const matches = GAP_RULES.filter((r) => evalRule(metrics[r.metric], r.op, r.threshold));
  // Rank by severity → area → order
  matches.sort((a, b) => (SEVERITY_RANK[a.severity] || 9) - (SEVERITY_RANK[b.severity] || 9)
                       || (AREA_RANK[a.area] || 99) - (AREA_RANK[b.area] || 99));
  return matches.slice(0, 16).map((g) => ({
    ...g,
    action: ACTION_LIBRARY[g.actionTrigger] || null,
  }));
}

/**
 * Convert generated gaps into a Priority Action Roadmap (BRD §15).
 * Buckets: Immediate, 0–3M, 3–6M, 6–12M, 12+M.
 */
function generateRoadmap(gaps = []) {
  const buckets = { Immediate: [], '0–3 Months': [], '3–6 Months': [], '6–12 Months': [], '12+ Months': [] };
  for (const g of gaps) {
    if (!g.action) continue;
    const bucket = (() => {
      // Severity overrides per BRD §15.3 step 2
      if (g.severity === 'High') return g.action.timeline === 'Immediate' ? 'Immediate' : '0–3 Months';
      if (g.severity === 'Medium') return g.action.timeline.includes('3–6') ? '3–6 Months' : '6–12 Months';
      // Low severity: use action's own timeline as-is
      if (g.action.timeline === '3–6 Months') return '3–6 Months';
      if (g.action.timeline === '12+ Months') return '12+ Months';
      return '12+ Months';
    })();
    buckets[bucket].push({ gap: g.text, action: g.action.text, impact: g.action.impact });
  }

  // Always ensure 12+ Months has at least one strategic item
  if (buckets['12+ Months'].length === 0) {
    buckets['12+ Months'].push({
      gap: 'Long-term sustainability strategy not yet formalized.',
      action: 'Develop a formal net-zero roadmap with interim emission reduction targets for 2030 and 2040.',
      impact: 'Positions facility for long-term decarbonization; improves CDP and BRSR climate disclosure score.',
    });
  }

  return buckets;
}

module.exports = { generateStrengths, generateGaps, generateRoadmap };
