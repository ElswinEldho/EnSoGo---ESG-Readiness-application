/**
 * Typography & design-token system — single source of truth for all
 * typographic values used across the EnSoGo frontend.
 *
 * Usage:
 *   import { TYPE, FONT, COLOR } from '../styles/typography';
 *   <div style={{ ...TYPE.bodyBase, color: COLOR.textPrimary }}>…</div>
 *
 * DO NOT scatter raw px values / hex codes across components — import here.
 */

// ── Font family ────────────────────────────────────────────────────────────────
export const FONT = Object.freeze({
  FAMILY: "'DM Sans', 'Segoe UI', sans-serif",
  MONO:   "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
});

// ── Font-size scale ────────────────────────────────────────────────────────────
export const FONT_SIZE = Object.freeze({
  micro:        '9px',   // tiny badges, footnotes
  xs:           '10px',  // dates, secondary meta
  sm:           '11px',  // captions, error labels
  base:         '12px',  // small body text
  md:           '13px',  // primary body text
  lg:           '14px',  // button text, form fields
  xl:           '15px',  // small headings
  '2xl':        '16px',  // card headings
  '3xl':        '17px',  // section headings
  '4xl':        '18px',  // page subheadings
  '5xl':        '22px',  // modal / card titles
  display:      '24px',  // page titles
  displayLg:    '32px',  // hero / stat numbers
});

// ── Font-weight scale ──────────────────────────────────────────────────────────
export const FONT_WEIGHT = Object.freeze({
  regular:   '400',
  medium:    '500',
  semibold:  '600',
  bold:      '700',
  extrabold: '800',
});

// ── Line-height scale ──────────────────────────────────────────────────────────
export const LINE_HEIGHT = Object.freeze({
  tight:   1,
  snug:    1.2,
  normal:  1.4,
  relaxed: 1.6,
  loose:   1.8,
});

// ── Letter-spacing scale ───────────────────────────────────────────────────────
export const LETTER_SPACING = Object.freeze({
  tight:    '-0.3px',
  normal:   '0',
  wide:     '0.5px',
  wider:    '0.8px',
  widest:   '1.5px',
  caps:     '2px',
});

// ── Colour palette ─────────────────────────────────────────────────────────────
export const COLOR = Object.freeze({
  // Text
  textPrimary:   '#0f172a',
  textSecondary: '#1e293b',
  textMuted:     '#475569',
  textSubtle:    '#64748b',
  textPlaceholder:'#94a3b8',

  // Brand blues
  brandDark:    '#0c4a6e',
  brand:        '#0369a1',
  brandMid:     '#0284c7',
  brandLight:   '#0ea5e9',

  // Semantic
  success:      '#16a34a',
  successLight: '#dcfce7',
  warning:      '#d97706',
  warningLight: '#fef3c7',
  danger:       '#dc2626',
  dangerLight:  '#fee2e2',
  info:         '#0284c7',
  infoLight:    '#e0f2fe',

  // Surface / background
  surface:      '#ffffff',
  surfaceAlt:   '#f8fafc',
  surfaceMuted:  '#f1f5f9',
  border:       '#e2e8f0',
  borderMuted:  '#cbd5e1',

  // Misc
  white:        '#ffffff',
  black:        '#000000',
  transparent:  'transparent',
});

// ── Pre-composed text-style objects ──────────────────────────────────────────
// Each object can be spread directly into a React inline style prop.

export const TYPE = Object.freeze({
  // ── Display / Hero ────────────────────────────────────────────────────────
  displayHero: {
    fontFamily:    FONT.FAMILY,
    fontSize:      FONT_SIZE.displayLg,
    fontWeight:    FONT_WEIGHT.extrabold,
    lineHeight:    LINE_HEIGHT.tight,
    letterSpacing: LETTER_SPACING.tight,
    color:         COLOR.textPrimary,
  },
  displayTitle: {
    fontFamily:    FONT.FAMILY,
    fontSize:      FONT_SIZE.display,
    fontWeight:    FONT_WEIGHT.extrabold,
    lineHeight:    LINE_HEIGHT.snug,
    letterSpacing: LETTER_SPACING.tight,
    color:         COLOR.textPrimary,
  },

  // ── Headings ──────────────────────────────────────────────────────────────
  h1: {
    fontFamily: FONT.FAMILY,
    fontSize:   FONT_SIZE['5xl'],
    fontWeight: FONT_WEIGHT.extrabold,
    lineHeight: LINE_HEIGHT.snug,
    color:      COLOR.textPrimary,
  },
  h2: {
    fontFamily: FONT.FAMILY,
    fontSize:   FONT_SIZE['4xl'],
    fontWeight: FONT_WEIGHT.extrabold,
    lineHeight: LINE_HEIGHT.snug,
    color:      COLOR.textPrimary,
  },
  h3: {
    fontFamily: FONT.FAMILY,
    fontSize:   FONT_SIZE['3xl'],
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: LINE_HEIGHT.snug,
    color:      COLOR.textPrimary,
  },
  h4: {
    fontFamily: FONT.FAMILY,
    fontSize:   FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: LINE_HEIGHT.normal,
    color:      COLOR.textPrimary,
  },
  h5: {
    fontFamily: FONT.FAMILY,
    fontSize:   FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: LINE_HEIGHT.normal,
    color:      COLOR.textPrimary,
  },

  // ── Body ──────────────────────────────────────────────────────────────────
  bodyLg: {
    fontFamily: FONT.FAMILY,
    fontSize:   FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.regular,
    lineHeight: LINE_HEIGHT.normal,
    color:      COLOR.textPrimary,
  },
  bodyBase: {
    fontFamily: FONT.FAMILY,
    fontSize:   FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    lineHeight: LINE_HEIGHT.normal,
    color:      COLOR.textPrimary,
  },
  bodySm: {
    fontFamily: FONT.FAMILY,
    fontSize:   FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.regular,
    lineHeight: LINE_HEIGHT.relaxed,
    color:      COLOR.textMuted,
  },

  // ── Labels / meta ─────────────────────────────────────────────────────────
  labelSm: {
    fontFamily:    FONT.FAMILY,
    fontSize:      FONT_SIZE.sm,
    fontWeight:    FONT_WEIGHT.bold,
    lineHeight:    LINE_HEIGHT.tight,
    textTransform: 'uppercase',
    letterSpacing: LETTER_SPACING.wider,
    color:         COLOR.textMuted,
  },
  labelXs: {
    fontFamily:    FONT.FAMILY,
    fontSize:      FONT_SIZE.xs,
    fontWeight:    FONT_WEIGHT.extrabold,
    lineHeight:    LINE_HEIGHT.tight,
    textTransform: 'uppercase',
    letterSpacing: LETTER_SPACING.wide,
    color:         COLOR.textPlaceholder,
  },
  labelMicro: {
    fontFamily:    FONT.FAMILY,
    fontSize:      FONT_SIZE.micro,
    fontWeight:    FONT_WEIGHT.extrabold,
    lineHeight:    LINE_HEIGHT.tight,
    textTransform: 'uppercase',
    letterSpacing: LETTER_SPACING.wide,
    color:         COLOR.textPlaceholder,
  },

  // ── Captions ──────────────────────────────────────────────────────────────
  caption: {
    fontFamily: FONT.FAMILY,
    fontSize:   FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.regular,
    lineHeight: LINE_HEIGHT.normal,
    color:      COLOR.textPlaceholder,
  },
  captionSm: {
    fontFamily: FONT.FAMILY,
    fontSize:   FONT_SIZE.micro,
    fontWeight: FONT_WEIGHT.regular,
    lineHeight: LINE_HEIGHT.normal,
    color:      COLOR.textPlaceholder,
  },

  // ── Button ────────────────────────────────────────────────────────────────
  buttonBase: {
    fontFamily: FONT.FAMILY,
    fontSize:   FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: LINE_HEIGHT.tight,
  },
  buttonSm: {
    fontFamily: FONT.FAMILY,
    fontSize:   FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: LINE_HEIGHT.tight,
  },

  // ── Form ──────────────────────────────────────────────────────────────────
  formLabel: {
    fontFamily:    FONT.FAMILY,
    fontSize:      FONT_SIZE.sm,
    fontWeight:    FONT_WEIGHT.bold,
    textTransform: 'uppercase',
    letterSpacing: LETTER_SPACING.wider,
    color:         COLOR.textMuted,
  },
  formInput: {
    fontFamily: FONT.FAMILY,
    fontSize:   FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.regular,
    color:      COLOR.textPrimary,
  },
  formError: {
    fontFamily: FONT.FAMILY,
    fontSize:   FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color:      COLOR.danger,
  },

  // ── Stat / KPI ────────────────────────────────────────────────────────────
  statValue: {
    fontFamily:          FONT.FAMILY,
    fontSize:            FONT_SIZE.displayLg,
    fontWeight:          FONT_WEIGHT.extrabold,
    lineHeight:          LINE_HEIGHT.tight,
    color:               COLOR.textPrimary,
    fontVariantNumeric: 'tabular-nums',
  },
  statLabel: {
    fontFamily: FONT.FAMILY,
    fontSize:   FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    color:      COLOR.textSubtle,
  },
  statSubtitle: {
    fontFamily: FONT.FAMILY,
    fontSize:   FONT_SIZE.xs,
    color:      COLOR.textPlaceholder,
    marginTop:  '3px',
  },

  // ── Brand / Logo ──────────────────────────────────────────────────────────
  logoName: {
    fontFamily:    FONT.FAMILY,
    fontSize:      FONT_SIZE['2xl'],
    fontWeight:    FONT_WEIGHT.extrabold,
    color:         COLOR.brandDark,
    letterSpacing: LETTER_SPACING.tight,
  },
  logoTagline: {
    fontFamily:    FONT.FAMILY,
    fontSize:      FONT_SIZE.xs,
    fontWeight:    FONT_WEIGHT.bold,
    textTransform: 'uppercase',
    letterSpacing: LETTER_SPACING.caps,
    color:         COLOR.brandMid,
  },
});

// ── Convenience: global font-family reset string (for inline root styles) ─────
export const GLOBAL_FONT_STYLE = { fontFamily: FONT.FAMILY };
