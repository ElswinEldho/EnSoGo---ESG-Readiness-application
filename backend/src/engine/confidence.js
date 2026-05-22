// Confidence engine — BRD §5.2.
const { lookupConfidence } = require('../data/confidence');

/**
 * Confidence modifier for a category given its uploaded-month count.
 * @returns {{ modifier:number, level:string, message:string }}
 */
function confidenceFor(monthsUploaded) {
  const t = lookupConfidence(monthsUploaded);
  return { modifier: t.modifier, level: t.level, message: t.message };
}

/**
 * Apply per-category confidence modifiers to a parameter score map.
 *   - paramSpec.useModifier:'electricity'|'water'|'fuel'|'waste'|'governance'|'none'
 *   - modifiers is a flat lookup keyed by category name returning the modifier number.
 */
function applyModifier(rawScore, paramSpec, modifiers = {}) {
  const key = paramSpec && paramSpec.useModifier;
  if (!key || key === 'none') return rawScore;
  const m = Number.isFinite(modifiers[key]) ? modifiers[key] : 1.0;
  return rawScore * m;
}

module.exports = { confidenceFor, applyModifier };
