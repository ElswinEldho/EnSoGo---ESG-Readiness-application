'use strict';

/**
 * EnSoGo PDF Report Generator — PDFKit 0.15
 * Two report types:
 *   generateCalculationSummary  — Calculation Summary (Screen 2)
 *   generateReadinessReport     — Full Readiness Report (Screen 3)
 *
 * Sections in Calculation Summary:
 *   1. Upload Overview
 *   2. Annualized Calculations
 *   3. Key Performance Indicators
 *   4. Emissions Summary
 *   5. Confidence & Assumptions
 *
 * NOTE: Validation Results is intentionally omitted from the printed report.
 * All calculation values, emissions, KPI values, and confidence scores are
 * passed through unchanged from the summary/readiness data objects.
 */

const path        = require('path');
const PDFDocument = require('pdfkit');

const LOGO_PATH = path.join(__dirname, '../assets/logo.png');

const DISCLAIMER =
  'EnSoGo provides indicative sustainability and certification readiness ' +
  'intelligence. This platform does not replace official certification audits, ' +
  'regulatory reviews, accredited assessments, or legal compliance advice. All ' +
  'scores, ratings, and recommendations are indicative only and should not be ' +
  'relied upon as a substitute for professional advice.';

// Brand palette
const C = Object.freeze({
  brandDark:     '#0c4a6e',
  brand:         '#0284c7',
  sectionBg:     '#f0f9ff',
  textPrimary:   '#0f172a',
  textSecondary: '#1e293b',
  textMuted:     '#475569',
  textSubtle:    '#64748b',
  textFaint:     '#94a3b8',
  border:        '#e2e8f0',
  borderMid:     '#cbd5e1',
  white:         '#ffffff',
});

// Page geometry (A4 @ 72 dpi)
const PAGE_W   = 595.28;
const PAGE_H   = 841.89;
const MARGIN   = 50;
const USABLE_W = PAGE_W - MARGIN * 2;
const FOOTER_Y = PAGE_H - 34;

// kv layout: fixed key column, remaining for value
const KV_KEY_W = 175;
const KV_VAL_W = USABLE_W - KV_KEY_W - 6;

// Helpers
function streamToBuffer(doc) {
  return new Promise(function(resolve, reject) {
    var chunks = [];
    doc.on('data',  function(c) { chunks.push(c); });
    doc.on('end',   function()  { resolve(Buffer.concat(chunks)); });
    doc.on('error', reject);
  });
}

function fmtDate() {
  return new Date().toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

// Watermark — drawn per-page in the stampFooters pass (5% opacity, unobtrusive)
function drawWatermark(doc) {
  var WM = 200;
  var x  = (PAGE_W - WM) / 2;
  var y  = (PAGE_H - WM) / 2;
  try {
    doc.save();
    doc.opacity(0.05);
    doc.image(LOGO_PATH, x, y, { width: WM, height: WM });
    doc.restore();
  } catch (_) {
    // Fallback: faint brand text if logo is unavailable
    doc.save();
    doc.fillColor(C.brandDark, 0.04).fontSize(56).font('Helvetica-Bold')
      .text('EnSoGo', 0, (PAGE_H - 60) / 2, { width: PAGE_W, align: 'center', lineBreak: false });
    doc.restore();
  }
}

// Cover header (page 1 only)
function drawCoverHeader(doc, reportTitle, org) {
  var HEADER_H = 74;

  // Zero top margin so the full-bleed bar drawn at y=0 does not confuse
  // PDFKit's margin-enforcement logic.
  var savedTop = doc.page.margins.top;
  doc.page.margins.top = 0;

  // Dark branded bar — full bleed
  doc.rect(0, 0, PAGE_W, HEADER_H).fill(C.brandDark);

  // Logo
  try {
    doc.image(LOGO_PATH, MARGIN, 13, { width: 48, height: 48 });
  } catch (_) {
    doc.roundedRect(MARGIN, 14, 46, 46, 7).fill(C.brand);
    doc.fillColor(C.white).fontSize(18).font('Helvetica-Bold')
      .text('E', MARGIN + 14, 28, { lineBreak: false });
  }

  // Wordmark
  doc.fillColor(C.white).fontSize(17).font('Helvetica-Bold')
    .text('EnSoGo', MARGIN + 58, 18, { lineBreak: false });
  doc.fillColor('#bae6fd').fontSize(7.5).font('Helvetica')
    .text('ESG READINESS SUITE', MARGIN + 59, 40, { lineBreak: false, characterSpacing: 0.9 });

  // Date (top-right of bar)
  doc.fillColor(C.white, 0.65).fontSize(8).font('Helvetica')
    .text(fmtDate(), 0, 30, { width: PAGE_W - MARGIN, align: 'right', lineBreak: false });

  // Restore top margin before flowing body content
  doc.page.margins.top = savedTop;

  // Meta block
  doc.y = HEADER_H + 20;

  doc.fillColor(C.textPrimary).fontSize(15.5).font('Helvetica-Bold')
    .text(reportTitle, MARGIN, doc.y, { width: USABLE_W });
  doc.moveDown(0.55);

  // Only Organization is shown — Reference ID and Generated date are omitted
  doc.fontSize(9).font('Helvetica')
     .fillColor(C.textMuted).text('Organization:   ', { continued: true })
     .fillColor(C.textSecondary).font('Helvetica-Bold').text(org || '---')
     .font('Helvetica');

  doc.moveDown(0.8);
  doc.strokeColor(C.border).lineWidth(0.75)
    .moveTo(MARGIN, doc.y).lineTo(PAGE_W - MARGIN, doc.y).stroke();
  doc.moveDown(0.9);
}

// Compact top stripe for pages 2+
function drawSubpageHeader(doc) {
  // Zero top margin so the brand stripe drawn at y=0-10 does not confuse
  // PDFKit's margin-enforcement logic.
  var savedTop = doc.page.margins.top;
  doc.page.margins.top = 0;

  doc.rect(0, 0, PAGE_W, 5).fill(C.brandDark);
  doc.fillColor(C.textFaint).fontSize(7).font('Helvetica')
    .text('EnSoGo  |  ESG Readiness Suite', 0, 10, {
      width: PAGE_W - MARGIN, align: 'right', lineBreak: false,
    });

  doc.page.margins.top = savedTop;
  doc.y = 54;
}

// Section header tile
function drawSection(doc, label) {
  doc.moveDown(0.6);
  // Guard: if fewer than 80 pt remain before the bottom margin, force a clean
  // page break so the section tile is never orphaned at the very bottom.
  if (doc.y + 80 > PAGE_H - MARGIN) {
    doc.addPage();
    // drawSubpageHeader is invoked via the pageAdded event; doc.y is now 54
  }
  var y = doc.y;
  var H = 19;
  doc.rect(MARGIN, y, USABLE_W, H).fill(C.sectionBg);
  doc.rect(MARGIN, y, 4, H).fill(C.brand);
  doc.fillColor(C.brandDark).fontSize(10.5).font('Helvetica-Bold')
    .text(label, MARGIN + 12, y + 4, { lineBreak: false });
  doc.y = y + H + 9;
  doc.font('Helvetica').fontSize(9.5).fillColor(C.textMuted);
}

// Two-column key / value row
function kv(doc, key, value) {
  var y   = doc.y;
  var str = String(value != null ? value : '---');

  // Key column — muted, regular weight
  doc.fontSize(9.5).fillColor(C.textMuted).font('Helvetica')
    .text(String(key), MARGIN, y, { width: KV_KEY_W, lineBreak: false });

  // Value column — primary, bold, right of key; may wrap
  doc.fillColor(C.textPrimary).font('Helvetica-Bold')
    .text(str, MARGIN + KV_KEY_W + 6, y, { width: KV_VAL_W, align: 'left', lineGap: 1.5 });

  doc.font('Helvetica');
  doc.moveDown(0.08);
}

// Sub-category label
function subLabel(doc, label) {
  doc.moveDown(0.35);
  doc.fillColor(C.textSecondary).fontSize(9.5).font('Helvetica-Bold')
    .text(label, MARGIN, doc.y, { width: USABLE_W });
  doc.font('Helvetica').fillColor(C.textMuted);
  doc.moveDown(0.1);
}

// Bullet row — consistent '-' marker, justified text
function bullet(doc, text) {
  var INDENT = 14;
  doc.fontSize(9.5).fillColor(C.textMuted).font('Helvetica')
    .text('-', MARGIN, doc.y, { width: INDENT - 2, lineBreak: false })
    .text(String(text), MARGIN + INDENT, doc.y, {
      width: USABLE_W - INDENT, align: 'justify', lineGap: 1.5,
    });
  doc.moveDown(0.08);
}

// Stamp watermarks + footers on every buffered page
function stampFooters(doc, reportTitle) {
  var range = doc.bufferedPageRange();
  var total = range.count;
  var cap   = reportTitle.length > 44 ? reportTitle.slice(0, 42) + '...' : reportTitle;

  for (var i = 0; i < total; i++) {
    doc.switchToPage(range.start + i);

    // ── Critical: zero bottom margin before writing in the footer zone ─────────
    // FOOTER_Y (807.89) exceeds PDFKit's auto-break boundary (PAGE_H - MARGIN =
    // 791.89). Without this guard, every .text() call at FOOTER_Y triggers an
    // extra page break, roughly doubling the page count with blank pages.
    var savedBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    // Background watermark (drawn first so content is painted on top)
    drawWatermark(doc);

    // Footer separator line — path ops never trigger page breaks
    doc.strokeColor(C.borderMid).lineWidth(0.4)
      .moveTo(MARGIN, FOOTER_Y - 8).lineTo(PAGE_W - MARGIN, FOOTER_Y - 8).stroke();

    // Left — branding
    doc.fontSize(7).font('Helvetica').fillColor(C.textFaint)
      .text('EnSoGo  |  ESG Readiness Suite  |  Confidential', MARGIN, FOOTER_Y,
        { width: 220, lineBreak: false });

    // Centre — report title
    doc.fontSize(7).fillColor(C.textFaint)
      .text(cap, 0, FOOTER_Y, { width: PAGE_W, align: 'center', lineBreak: false });

    // Right — page number (omitted on cover page, i === 0)
    if (i > 0) {
      doc.fontSize(7).fillColor(C.textFaint)
        .text('Page ' + (i + 1) + ' of ' + total, 0, FOOTER_Y,
          { width: PAGE_W - MARGIN, align: 'right', lineBreak: false });
    }

    // Restore margin so subsequent PDFKit logic is unaffected
    doc.page.margins.bottom = savedBottom;
  }
  doc.flushPages();
}

// Disclaimer page
function addDisclaimerPage(doc) {
  // Only create a new page when the current page already has content.
  // If doc.y is very near the top (<=80 pt), the page was just auto-created by
  // PDFKit's own break logic and is still effectively blank — reuse it instead
  // of pushing another empty page before the disclaimer.
  if (doc.y > 80) {
    doc.addPage();
  }
  doc.moveDown(1.8);

  doc.fillColor(C.textSecondary).fontSize(11).font('Helvetica-Bold')
    .text('Disclaimer', MARGIN, doc.y, { width: USABLE_W });
  doc.moveDown(0.4);

  doc.strokeColor(C.border).lineWidth(0.6)
    .moveTo(MARGIN, doc.y).lineTo(PAGE_W - MARGIN, doc.y).stroke();
  doc.moveDown(0.7);

  doc.fontSize(9).fillColor(C.textSubtle).font('Helvetica')
    .text(DISCLAIMER, MARGIN, doc.y, { width: USABLE_W, align: 'justify', lineGap: 3 });

  doc.moveDown(1.4);
  doc.fontSize(8).fillColor(C.textFaint)
    .text('EnSoGo  |  ESG Readiness Suite', MARGIN, doc.y, { width: USABLE_W, align: 'center' });
}

// Calculation Summary
async function generateCalculationSummary(summary, meta) {
  if (!meta) meta = {};
  var doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true });
  var buf = streamToBuffer(doc);
  var firstPage = true;

  doc.on('pageAdded', function() {
    if (firstPage) { firstPage = false; return; }
    drawSubpageHeader(doc);
  });

  var title = 'Calculation Summary';
  drawCoverHeader(doc, title, meta.organizationName);

  // 1. Upload Overview
  drawSection(doc, '1   Upload Overview');
  var perCat = (summary.overview && summary.overview.perCategory) || {};
  Object.keys(perCat).forEach(function(cat) {
    var info = perCat[cat];
    kv(doc, cat,
      info.months + ' months  |  ' + info.pct + '%  |  ' +
      (info.confidence ? info.confidence.level + ' (' + info.confidence.modifier + ')' : ''));
  });
  kv(doc, 'Overall Completeness',
    ((summary.overview && summary.overview.overallCompletenessPct) || '---') + '%');

  // 2. Annualized Calculations
  drawSection(doc, '2   Annualized Calculations');
  var annualized = summary.annualized || {};
  var hasData = false;
  Object.keys(annualized).forEach(function(cat) {
    var a = annualized[cat];
    if (!a || !a.sufficient) return;
    hasData = true;
    kv(doc, cat,
      (a.isEstimated ? 'Estimated' : 'Actual') + '   ' + a.annualValue +
      '   (' + a.monthsUploaded + ' months uploaded)');
  });
  if (!hasData) {
    doc.fontSize(9.5).fillColor(C.textFaint)
      .text('No sufficient data for annualization.', MARGIN + 8, doc.y, { width: USABLE_W - 8 });
  }

  // 3. Key Performance Indicators
  drawSection(doc, '3   Key Performance Indicators');
  var kpis = summary.kpis || {};
  Object.keys(kpis).forEach(function(k) {
    var v = kpis[k];
    kv(doc, k, v.value + ' ' + v.unit + '   |   ' + (v.status ? v.status.status || '' : ''));
  });

  // 4. Emissions Summary
  drawSection(doc, '4   Emissions Summary');
  var em = summary.emissions || {};
  kv(doc, 'Scope 1  (Direct)',       ((em.scope1 && em.scope1.tCO2e) || '---') + ' tCO2e');
  kv(doc, 'Scope 2  (Electricity)',  ((em.scope2 && em.scope2.tCO2e) || '---') + ' tCO2e');
  kv(doc, 'Scope 3  (Value Chain)',  ((em.scope3 && em.scope3.tCO2e) || '---') + ' tCO2e');
  kv(doc, 'Total Emissions',          (em.totalTCO2e              || '---') + ' tCO2e');
  kv(doc, 'Emissions Intensity',      (em.intensityTCO2ePerSqft   || '---') + ' tCO2e / sqft');

  // 5. Confidence & Assumptions
  drawSection(doc, '5   Confidence & Assumptions');
  var confCat = (summary.confidence && summary.confidence.perCategory) || {};
  Object.keys(confCat).forEach(function(k) {
    var v = confCat[k];
    kv(doc, k, v.level + '  (modifier ' + v.modifier + ')  |  ' + v.message);
  });
  var assumptions = summary.assumptions || [];
  if (assumptions.length) {
    doc.moveDown(0.5);
    subLabel(doc, 'Assumptions');
    assumptions.forEach(function(a) { bullet(doc, a); });
  }

  addDisclaimerPage(doc);
  stampFooters(doc, title);
  doc.end();
  return buf;
}

// Full Readiness Report
async function generateReadinessReport(summary, readiness, meta) {
  if (!meta) meta = {};
  var doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true });
  var buf = streamToBuffer(doc);
  var firstPage = true;

  doc.on('pageAdded', function() {
    if (firstPage) { firstPage = false; return; }
    drawSubpageHeader(doc);
  });

  var title = 'Full Readiness Report';
  drawCoverHeader(doc, title, meta.organizationName);

  // 1. Overall Readiness
  drawSection(doc, '1   Overall Readiness');
  kv(doc, 'Readiness Score',  ((readiness.overall && readiness.overall.score) || '---') + ' / 100');
  kv(doc, 'Readiness Label',  (readiness.overall && readiness.overall.label)  || '---');
  kv(doc, 'Total Emissions',  ((summary.emissions && summary.emissions.totalTCO2e) || '---') + ' tCO2e');

  // 2. Certification Readiness Matrix
  drawSection(doc, '2   Certification Readiness Matrix');
  (readiness.certifications || []).forEach(function(c) {
    kv(doc, c.framework,
      'Score: ' + c.finalScore + '  |  ' + c.status +
      (c.capped ? '  (capped - missing prerequisites)' : '') +
      '  |  Timeline: ' + c.timeline);
  });

  // 3. Regulatory Readiness
  drawSection(doc, '3   Regulatory Readiness');
  (readiness.regulations || []).forEach(function(r) {
    kv(doc, r.name,
      r.readinessPct + '%  (' + r.readinessLabel + ')  |  Risk: ' + r.riskLevel + '  |  ' + r.note);
  });

  // 4. Operational Strengths
  drawSection(doc, '4   Operational Strengths');
  (readiness.strengths || []).forEach(function(s) { bullet(doc, s.text); });

  // 5. Critical Gaps
  drawSection(doc, '5   Critical Gaps');
  (readiness.gaps || []).forEach(function(g) {
    bullet(doc, '[' + g.severity + ']  ' + g.text);
  });

  // 6. Priority Action Roadmap
  drawSection(doc, '6   Priority Action Roadmap');
  var roadmap = readiness.roadmap || {};
  Object.keys(roadmap).forEach(function(bucket) {
    var items = roadmap[bucket];
    if (!items || !items.length) return;
    subLabel(doc, bucket);
    items.forEach(function(it) {
      bullet(doc, it.action + '  (impact: ' + it.impact + ')');
    });
  });

  // 7. Executive Summary
  drawSection(doc, '7   Executive Summary');
  doc.fontSize(9.5).fillColor(C.textPrimary).font('Helvetica')
    .text(readiness.executiveSummary || '', MARGIN, doc.y,
      { width: USABLE_W, align: 'justify', lineGap: 3 });

  addDisclaimerPage(doc);
  stampFooters(doc, title);
  doc.end();
  return buf;
}

module.exports = { generateCalculationSummary, generateReadinessReport, DISCLAIMER };
