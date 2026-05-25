// Certification readiness engine — BRD §13.

const { FRAMEWORK_WEIGHTS, FRAMEWORK_PREREQS } = require('../../data/certifications');
const { SECTORS } = require('../../data/sectors');
const { getReadinessStage } = require('../../data/scoringRules');

/**
 * @param categoryScores {{energy:number, water:number, waste:number, governance:number, indoorEnv?:number, evidence?:number, other?:number}}
 * @param framework      e.g. 'IGBC Healthcare'
 * @param prerequisitesMet {{}} keyed by prereq id booleans
 * @returns {{ framework, weightedScore, finalScore, status, capped, prerequisites: {missing: string[]} }}
 */
function scoreFramework(framework, categoryScores = {}, prerequisitesMet = {}) {
  const weights = FRAMEWORK_WEIGHTS[framework];
  if (!weights) return null;

  // Sum of weights divided by 100 → produces 0-100 output assuming weights total 100.
  let total = 0;
  let weightTotal = 0;
  const breakdown = [];
  for (const [cat, w] of Object.entries(weights)) {
    const catScore = Number.isFinite(categoryScores[cat]) ? categoryScores[cat] : 0;
    const contribution = (catScore * w) / 100;
    breakdown.push({ category: cat, categoryScore: catScore, weight: w, contribution: Math.round(contribution * 100) / 100 });
    total += contribution;
    weightTotal += w;
  }
  // Normalise if weights don't sum exactly to 100.
  if (weightTotal > 0 && weightTotal !== 100) total = (total * 100) / weightTotal;
  const weightedScore = Math.round(total * 10) / 10;

  // Prerequisite cap
  let finalScore = weightedScore;
  let capped = false;
  let missing = [];
  const prereq = FRAMEWORK_PREREQS[framework];
  if (prereq) {
    missing = prereq.requires.filter((req) => !prerequisitesMet[req]);
    if (missing.length && weightedScore > prereq.capIfMissing) {
      finalScore = prereq.capIfMissing;
      capped = true;
    }
  }

  const stage = getReadinessStage(finalScore);
  return {
    framework,
    weightedScore,
    finalScore,
    status: stage.stage,
    colour: stage.color,
    capped,
    prerequisites: { missing },
    breakdown,
  };
}

/** Filter and score frameworks applicable to a given sector. */
function scoreAllApplicable(sectorCode, categoryScores, prerequisitesMet) {
  const s = SECTORS[sectorCode];
  if (!s) return [];
  const applicable = Array.from(new Set([...(s.primaryCerts || []), ...(s.secondaryCerts || [])]));
  return applicable
    .map((f) => scoreFramework(f, categoryScores, prerequisitesMet))
    .filter(Boolean)
    .sort((a, b) => b.finalScore - a.finalScore);
}

/**
 * Recommended timeline given score+gap severity (BRD §13.1 step 7).
 */
function recommendedTimeline(score, highestGapSeverity) {
  if (score < 40) return '12+ Months';
  if (score < 60) return '12–18 Months';
  if (score < 75) return '6–12 Months';
  if (highestGapSeverity === 'High') return '3–6 Months';
  return '< 3 Months';
}

module.exports = { scoreFramework, scoreAllApplicable, recommendedTimeline };
