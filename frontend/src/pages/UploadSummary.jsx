// Screen 2 — Upload Summary & Calculations.
// Strictly contains:
//   1. Upload Overview (incl. refrigerants)
//   2. Validation Results (per uploaded category + cross-category + summary)
//   3. Annualized Calculations (incl. refrigerants)
//   4. (KPI section deliberately removed per requirements)
//   5. Emissions Summary
//   6. Confidence & Assumptions (incl. refrigerants)
//   7. Readiness Pre-Check (incl. refrigerants)
//
// Action bar (Back to Upload / Paper Reports / View Readiness) is fixed and
// stays visible while only the content sections scroll.

import { useEffect, useState, useRef, memo, lazy, Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatDate } from '../constants/index.js';
// Lazy-load HospitalKpiDashboard — it is only needed for HOSP-sector users and
// adds ~107 KiB to the bundle.  Loading it on-demand keeps the initial chunk lean.
const HospitalKpiDashboard = lazy(() => import('../components/HospitalKpiDashboard.jsx'));
// pdfCapture is NOT statically imported — it is lazy-loaded on demand inside
// downloadPdf() so its 54 KiB is never on the critical path for initial load.

const CATEGORY_ORDER = ['electricity', 'water', 'fuel', 'waste', 'transport', 'refrigerants'];
const UNIT_FOR = { energy: 'kWh', electricity: 'kWh', water: 'KL', fuel: 'L', waste: 'kg', transport: 't-km', refrigerants: 'kg' };
const STATUS_BADGE_COLOUR = (s) => s === 'Passed' ? 'green' : s === 'Partial' ? 'amber' : s === 'Missing' ? 'grey' : 'red';

// Module-scope constant — allocated once, not re-created on every render
const CAT_META = {
  energy:       { label: 'Energy',       icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',                                                           accent: '#f59e0b', accentLight: '#fef3c7', accentBorder: '#fde68a', accentText: '#92400e' },
  water:        { label: 'Water',        icon: 'M12 2.69l5.66 5.66a8 8 0 11-11.31 0z',                                                      accent: '#0284c7', accentLight: '#e0f2fe', accentBorder: '#7dd3fc', accentText: '#0c4a6e' },
  waste:        { label: 'Waste',        icon: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',                                                        accent: '#7c3aed', accentLight: '#ede9fe', accentBorder: '#c4b5fd', accentText: '#4c1d95' },
  refrigerants: { label: 'Refrigerants', icon: 'M12 2v20M4.93 4.93l14.14 14.14M2 12h20M4.93 19.07L19.07 4.93',                              accent: '#0891b2', accentLight: '#ecfeff', accentBorder: '#a5f3fc', accentText: '#164e63' },
  fuel:         { label: 'Fuel',    icon: 'M3 22V8l9-6 9 6v14H3zM9 22V12h6v10',                                                        accent: '#d97706', accentLight: '#fffbeb', accentBorder: '#fde68a', accentText: '#78350f' },
  transport:    { label: 'Transport',    icon: 'M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM18.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3z', accent: '#059669', accentLight: '#ecfdf5', accentBorder: '#6ee7b7', accentText: '#064e3b' },
};

// Pre-check icon paths (SVG d= strings) and metadata
const PRE_CHECK_META = {
  energy:          { label: 'Energy',           desc: 'Electricity data',    d: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z' },
  water:           { label: 'Water',            desc: 'Water consumption',   d: 'M12 2.69l5.66 5.66a8 8 0 11-11.31 0z' },
  fuel:            { label: 'Fuel',             desc: 'Fuel combustion',     d: 'M17.66 11.2c-.23-.3-.51-.56-.77-.82-.67-.6-1.43-1.03-2.07-1.66C13.33 7.26 13 4.85 13.95 3c-1 .23-1.97.8-2.72 1.7-.65.8-1.06 1.74-1.18 2.7-.09.69-.08 1.38.04 2.06-.07-.06-.14-.13-.21-.21-.33-.37-.59-.8-.75-1.27C8.96 7.57 9 6.14 9.63 5c-1.1.53-2.02 1.46-2.55 2.67-.42.98-.56 2.04-.44 3.08-.37-.61-.62-1.3-.72-2.04-.07-.6-.01-1.21.15-1.78C4.42 8.22 3 10.4 3 12.77a9 9 0 0018 0c0-3.31-2.13-6.19-3.34-1.57z' },
  waste:           { label: 'Waste',            desc: 'Waste generation',    d: 'M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2' },
  refrigerants:    { label: 'Refrigerants',     desc: 'Cooling systems',     d: 'M12 2v20M4.93 4.93l14.14 14.14M2 12h20M4.93 19.07L19.07 4.93' },
  transport:       { label: 'Transport',        desc: 'Logistics & travel',  d: 'M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM18.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3z' },
  dataReliability: { label: 'Data Reliability', desc: 'Aggregate confidence', d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
};
const PRE_CHECK_COLOUR = {
  green: { border: 'border-emerald-200', bg: 'rgba(236,253,245,0.75)', iconBg: 'bg-emerald-100', icon: '#059669' },
  amber: { border: 'border-amber-200',   bg: 'rgba(255,251,235,0.75)', iconBg: 'bg-amber-100',   icon: '#d97706' },
  red:   { border: 'border-red-200',     bg: 'rgba(254,242,242,0.75)', iconBg: 'bg-red-100',     icon: '#ef4444' },
  grey:  { border: 'border-slate-200',   bg: 'rgba(248,250,252,0.75)', iconBg: 'bg-slate-100',   icon: '#94a3b8' },
};

export default function UploadSummary() {
  const { id } = useParams();
  const nav = useNavigate();
  const [summary, setSummary] = useState(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState('');
  // Ref-based debounce: prevents queueing multiple expensive html2canvas
  // operations when the user clicks Paper Reports rapidly before the first
  // state update re-renders the button as disabled.
  const downloadingRef = useRef(false);

  async function compute() {
    setBusy(true); setError('');
    try {
      const r = await api.post(`/assessments/${id}/summary`);
      setSummary(r.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to compute summary');
    } finally { setBusy(false); }
  }
  useEffect(() => { compute(); }, [id]);

  // Post-paint prefetch: kick off background import() calls for heavy chunks
  // that will be needed as the user scrolls.  These fire AFTER the first paint
  // so they never delay LCP, but the chunks are warm in the module cache by the
  // time the user reaches the KPI or Emissions sections.
  useEffect(() => {
    // requestIdleCallback (or setTimeout fallback) ensures this only runs when
    // the main thread is idle — well after the critical rendering path.
    const schedule = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
    const id = schedule(() => {
      // Prefetch HospitalKpiDashboard + recharts (1,235 KiB chunk)
      import('../components/HospitalKpiDashboard.jsx').catch(() => {});
      // Prefetch pdfCapture so it's warm if user clicks Paper Reports
      import('../lib/pdfCapture.js').catch(() => {});
    });
    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(id);
    };
  }, []);

  async function proceed() {
    setBusy(true);
    try {
      await api.post(`/assessments/${id}/readiness`);
      nav(`/assessment/${id}/readiness`);
    } finally { setBusy(false); }
  }

  async function downloadPdf() {
    if (downloadingRef.current) return;
    downloadingRef.current = true;
    setDownloading(true);
    try {
      // POST to the backend: persists a Report record in MongoDB (linked to this
      // user) and returns the PDF buffer. On logout, all such records + files are
      // automatically deleted from MongoDB and disk.
      const response = await api.get(`/reports/${id}/calculation-summary`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const disposition = response.headers['content-disposition'] || '';
      const nameMatch = disposition.match(/filename="?([^"]+)"?/);
      a.download = nameMatch ? nameMatch[1] : 'EnSoGo_Calculation_Summary.pdf';
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
    } catch (_err) {
      // Fallback: client-side DOM capture if the backend PDF route is unreachable.
      // Dynamic import keeps pdfCapture.js (54 KiB) off the initial module graph —
      // it only loads if the network request actually fails.
      try {
        const { captureAsPdf } = await import('../lib/pdfCapture.js');
        await captureAsPdf('pdf-content', 'EnSoGo_Calculation_Summary.pdf');
      } catch (_e) {}
    } finally {
      setDownloading(false);
      downloadingRef.current = false;
    }
  }

  async function printPdf() {
    if (printing) return;
    setPrinting(true);
    try {
      const { printAsPdf } = await import('../lib/pdfCapture.js');
      await printAsPdf('pdf-content');
    } catch (_e) {
      window.print();
    } finally { setPrinting(false); }
  }

  return (
    // Outer div has NO overflow:hidden so position:sticky works against the
    // real scroll container (.flex-1.overflow-y-auto in AssessmentShell).
    <div className="min-h-full" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 40%, #e8f4fd 70%, #dbeafe 100%)', position: 'relative' }}>

      {/* Page header + action bar — sticky; must be a direct child of the non-overflow div */}
      <div className="no-print sticky top-0 z-10 px-6 pt-5 pb-4"
           style={{ background: 'rgba(224,242,254,0.95)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', boxShadow: '0 1px 12px rgba(3,105,161,0.10)' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                    style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc' }}>Step 2 of 3</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                   style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)', boxShadow: '0 4px 12px rgba(14,165,233,0.28)' }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </div>
              <h1 className="text-xl font-bold" style={{ color: '#0c4a6e' }}>Upload Summary &amp; Calculations</h1>
            </div>
            <p className="text-[12px] text-slate-500 mt-0.5">Annualized figures, validation checks, KPIs and emissions breakdown.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all hover:bg-slate-100"
              style={{ border: '1px solid #e2e8f0', color: '#475569', background: '#fff' }}
              onClick={() => nav(`/assessment/${id}/data-load`)}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
              Back
            </button>
            <button
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ border: '1px solid #e2e8f0', color: '#475569', background: '#fff' }}
              disabled={downloading || !summary} onClick={downloadPdf}>
              {downloading
                ? <><div className="w-3 h-3 border-2 border-slate-400 border-t-slate-700 rounded-full animate-spin"/>Capturing…</>
                : <><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/></svg>Paper Reports</>
              }
            </button>
            <button
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ border: '1px solid #e2e8f0', color: '#475569', background: '#fff' }}
              disabled={printing || !summary} onClick={printPdf}>
              {printing
                ? <><div className="w-3 h-3 border-2 border-slate-400 border-t-slate-700 rounded-full animate-spin"/>Preparing…</>
                : <><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>Print</>
              }
            </button>
            <div className="relative group">
              <button
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)', boxShadow: '0 4px 12px rgba(14,165,233,0.25)' }}
                disabled={busy || !summary || !!summary?.validation?.hasBlocker} onClick={proceed}>
                {busy ? (
                  <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"/>Computing…</>
                ) : (
                  <>View Readiness <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>
                )}
              </button>
              {summary?.validation?.hasBlocker && (
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-slate-800 text-white text-[10px] rounded-lg px-3 py-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                  Resolve validation errors first — fix your data and re-upload
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-xl text-[12px]"
               style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
            </svg>
            {error}
          </div>
        )}
      </div>

      {/* Inner wrapper — overflow:hidden clips the decorative orbs without
          breaking the sticky header above */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Gradient bridge from sidebar */}
        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '80px', pointerEvents: 'none', zIndex: 0, background: 'linear-gradient(90deg, rgba(2,132,199,0.20) 0%, rgba(14,165,233,0.07) 60%, transparent 100%)' }} />
        {/* Ambient orbs */}
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '380px', height: '380px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.13) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', bottom: '80px', left: '40px', width: '280px', height: '280px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,233,0.09) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
        {/* Grid texture */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.04, pointerEvents: 'none', zIndex: 0 }}>
          <defs><pattern id="us-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0ea5e9" strokeWidth="1"/></pattern></defs>
          <rect width="100%" height="100%" fill="url(#us-grid)" />
        </svg>

      {/* Content — id used by html2canvas PDF capture */}
      <div id="pdf-content" className="px-6 pb-8" style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* ── PDF Report Header (logo + name) ─────────────────────────────── */}
        <div className="pdf-section flex items-center gap-3 rounded-2xl px-5 py-3"
             style={{ background: '#ffffff', border: '1px solid #dbeafe', boxShadow: '0 1px 4px rgba(3,105,161,0.06)' }}>
          <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
               style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(186,230,253,0.6)' }}>
            <img src="/EnSoGo%20Logo.png" alt="EnSoGo" className="w-full h-full object-cover rounded-xl" />
          </div>
          <div>
            <div className="text-[15px] font-bold text-slate-800 leading-tight">EnSoGo</div>
            <div className="text-[9px] text-slate-400 uppercase tracking-widest">Sustainability Readiness Suite</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-[12px] font-semibold text-slate-700">Upload Summary &amp; Calculations</div>
            <div className="text-[10px] text-slate-400">{formatDate(new Date(), { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          </div>
        </div>

        {!summary ? (
          // minHeight reserves approximately the height of the full content so the
          // viewport-visible area does not visually "jump" when the API resolves and
          // SummaryContent replaces the spinner — prevents CLS from content-load shift.
          <div className="flex items-center justify-center py-16"
               style={{ minHeight: 'calc(100vh - 140px)' }}>
            <div className="flex items-center gap-2 text-slate-400">
              <div className="w-5 h-5 border-2 border-slate-300 border-t-sky-500 rounded-full animate-spin"/>
              {busy ? 'Computing summary…' : 'Loading…'}
            </div>
          </div>
        ) : (
          <SummaryContent summary={summary} />
        )}
      </div>
      </div>{/* end inner overflow:hidden wrapper */}
    </div>
  );
}

// memo: SummaryContent only re-renders when the summary object itself changes,
// not when parent state like busy/downloading toggles.
const SummaryContent = memo(function SummaryContent({ summary }) {
  const { overview, validation, annualized, emissions, confidence, assumptions, readinessPreCheck } = summary;
  const hasBlocker = !!validation?.hasBlocker;

  // Build the list of categories to display — only those present in perCategory map.
  const cats = CATEGORY_ORDER.filter((c) => overview.perCategory[c]);

  return (
    <>
      {/* 1. Upload Overview */}
      <section className="pdf-section rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid #dbeafe', boxShadow: '0 1px 4px rgba(3,105,161,0.06)' }}>
        <h2 className="font-semibold mb-3" style={{ color: '#0c4a6e' }}>1. Upload Overview</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              <th className="py-2">Category</th>
              <th>Months</th>
              <th>Completeness</th>
              <th>Confidence</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {cats.map((cat) => {
              const info = overview.perCategory[cat];
              const st = overview.status[cat];
              return (
                <tr key={cat} className="border-b border-slate-100">
                  <td className="py-2 capitalize">{cat}</td>
                  <td>{info.months}/12</td>
                  <td>{info.pct}%</td>
                  <td>{info.confidence?.level} ({info.confidence?.modifier})</td>
                  <td><StatusBadge label={st?.label} colour={st?.colour} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="text-sm text-slate-500 mt-2">
          Overall data completeness: <strong className="text-slate-800">{overview.overallCompletenessPct}%</strong>
        </p>
      </section>

      {/* 2. Validation Results */}
      <section className="pdf-section rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid #dbeafe', boxShadow: '0 1px 4px rgba(3,105,161,0.06)' }}>
        <h2 className="font-semibold mb-3" style={{ color: '#0c4a6e' }}>2. Validation Results</h2>
        <div className="grid grid-cols-2 gap-4">
          {cats.map((cat) => {
            const checks = validation.perCategory?.[cat] || [];
            const isAllMissing = checks.every((c) => c.status === 'Missing');
            return (
              <div key={cat} className={`p-3 rounded-lg border ${isAllMissing ? 'border-slate-200 bg-slate-50' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium capitalize text-sm text-slate-800">{cat}</h3>
                  {isAllMissing && <StatusBadge label="No data uploaded" colour="grey" />}
                </div>
                <ul className="space-y-1">
                  {checks.map((c) => (
                    <li key={c.check} className="flex justify-between text-sm">
                      <span className="text-slate-600">{c.check}</span>
                      <StatusBadge label={c.status} colour={STATUS_BADGE_COLOUR(c.status)} />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-200">
          <span className="text-sm font-medium text-slate-700">Cross-Category Consistency</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{validation.cross?.message}</span>
            <StatusBadge label={validation.cross?.status} colour={STATUS_BADGE_COLOUR(validation.cross?.status)} />
          </div>
        </div>
        {validation.summary && (
          <div className={`mt-3 p-3 rounded border text-sm ${hasBlocker ? 'bg-red-50/80 border-red-200' : 'bg-white/50 border-slate-200'}`}>
            <div className="font-medium text-slate-700 mb-1">Validation Summary</div>
            <div className="text-slate-700">{validation.summary.overall}</div>
            <div className="text-xs text-slate-700 mt-1">
              {validation.summary.passed} passed · {validation.summary.partial} partial ·{' '}
              {validation.summary.failed} failed · {validation.summary.missing} missing{' '}
              (of {validation.summary.totalChecks} total)
            </div>
            {hasBlocker && (
              <div className="mt-2 text-xs text-red-700 font-medium">
                Go back to Data Load, fix the issues in the failing categories, and re-upload. Calculations will unlock once all errors are resolved.
              </div>
            )}
          </div>
        )}
      </section>

      {/* Sections 3–7 gated behind validation — only shown when no blockers */}
      {hasBlocker ? (
        <section className="pdf-section rounded-2xl p-6 text-center" style={{ border: '1.5px dashed #fca5a5', background: 'rgba(254,242,242,0.6)' }}>
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4m0 4h.01"/>
            </svg>
          </div>
          <div className="text-[14px] font-bold text-red-700 mb-1">Calculations Locked</div>
          <div className="text-[12px] text-red-600 max-w-md mx-auto">
            Annualized calculations, KPIs, emissions, and readiness analysis are unavailable until all validation errors are resolved. Fix the highlighted issues above, re-upload the affected categories, and return here.
          </div>
        </section>
      ) : (
        <>
          {/* 3. Annualized Calculations */}
          <section className="pdf-section rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid #dbeafe', boxShadow: '0 1px 4px rgba(3,105,161,0.06)', contentVisibility: 'auto', containIntrinsicSize: 'auto 800px' }}>
            {/* Section Header */}
            <div className="flex items-center gap-3 mb-5">
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#0369a1,#0284c7,#0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(3,105,161,0.25)' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 20V10M12 20V4M6 20v-6"/>
                </svg>
              </div>
              <div>
                <h2 className="font-bold text-[15px]" style={{ color: '#0c4a6e' }}>3. Annualized Calculations</h2>
                <p className="text-[11px]" style={{ color: '#64748b' }}>Projected full-year figures based on uploaded monthly data</p>
              </div>
            </div>

            {(() => {

              const entries = cats.map((c) => [c === 'electricity' ? 'energy' : c, annualized[c === 'electricity' ? 'energy' : c]]);
              if (!entries.find(([k]) => k === 'refrigerants')) entries.push(['refrigerants', annualized.refrigerants]);
              const hasAny = entries.some(([, a]) => a?.sufficient);

              if (!hasAny) {
                return (
                  <div style={{ padding: '16px 20px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                    </div>
                    <div className="text-sm" style={{ color: '#92400e' }}>No monthly data uploaded yet. Annualized values appear once at least 3 months are uploaded.</div>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-3 gap-4">
                  {entries.map(([cat, a]) => {
                    const meta = CAT_META[cat] || { label: cat, icon: 'M12 2a10 10 0 100 20A10 10 0 0012 2z', accent: '#0284c7', accentLight: '#e0f2fe', accentBorder: '#7dd3fc', accentText: '#0c4a6e' };

                    // ── Transport: breakdown card ──────────────────────────
                    if (cat === 'transport') {
                      const sub  = annualized.transportSubcategories || {};
                      const tot  = annualized.transportTotal || {};
                      const vkm  = sub.vehicleKm || a;
                      const ffl  = sub.fleetFuel || {};
                      const cg   = sub.cargo || {};
                      const hasAnySub = vkm?.sufficient || ffl?.sufficient || cg?.sufficient || tot?.sufficient;
                      const totalVal = tot?.sufficient ? (tot.annualValue || 0)
                        : (vkm?.sufficient ? (vkm.annualValue || 0) : 0) +
                          (ffl?.sufficient ? (ffl.annualValue || 0) : 0) +
                          (cg?.sufficient  ? (cg.annualValue  || 0) : 0);
                      const isEst = tot?.sufficient ? tot.isEstimated : (vkm?.isEstimated || ffl?.isEstimated || cg?.isEstimated);
                      const moUploaded = tot?.sufficient ? tot.monthsUploaded : (vkm?.monthsUploaded || 0);
                      return (
                        <div key={cat} style={{ borderRadius: '16px', border: `1px solid ${hasAnySub ? meta.accentBorder : '#e2e8f0'}`, boxShadow: hasAnySub ? `0 4px 20px ${meta.accent}18` : '0 2px 8px rgba(0,0,0,0.04)', background: '#fff', display: 'flex', flexDirection: 'column' }}>
                          {/* Coloured top bar */}
                          <div style={{ height: '4px', background: hasAnySub ? `linear-gradient(90deg, ${meta.accent}, ${meta.accent}88)` : '#e2e8f0' }} />
                          <div style={{ padding: '16px' }}>
                            {/* Header row */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: hasAnySub ? meta.accentLight : '#f8fafc', border: `1px solid ${hasAnySub ? meta.accentBorder : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={hasAnySub ? meta.accent : '#94a3b8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={meta.icon}/></svg>
                                </div>
                                <span style={{ fontSize: '12px', fontWeight: '800', color: hasAnySub ? '#1e293b' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{meta.label}</span>
                              </div>
                              <span style={{ fontSize: '9px', fontWeight: '700', padding: '3px 8px', borderRadius: '100px', background: hasAnySub ? meta.accentLight : '#f8fafc', color: hasAnySub ? meta.accentText : '#94a3b8', border: `1px solid ${hasAnySub ? meta.accentBorder : '#e2e8f0'}`, letterSpacing: '0.3px' }}>t-km / L</span>
                            </div>
                            {/* Subcategory rows */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                              {[
                                { dot: '#059669', label: 'Vehicle KM', val: vkm, unit: 't-km' },
                                { dot: '#d97706', label: 'Fleet Fuel',  val: ffl, unit: 'L' },
                                { dot: '#0284c7', label: 'Cargo',       val: cg,  unit: 't-km' },
                              ].map(({ dot, label, val, unit }) => (
                                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderRadius: '9px', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                                  <span style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '7px' }}>
                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: dot, flexShrink: 0, boxShadow: `0 0 6px ${dot}80` }}/>
                                    {label}
                                  </span>
                                  <span style={{ fontSize: '12px', fontWeight: '600', color: val?.sufficient ? '#1e293b' : '#94a3b8' }}>
                                    {val?.sufficient ? `${Number(val.annualValue).toLocaleString()} ${unit}` : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                            {/* Total footer */}
                            <div style={{ borderTop: `1px dashed ${hasAnySub ? meta.accentBorder : '#e2e8f0'}`, paddingTop: '12px' }}>
                              {hasAnySub ? (
                                <>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>Total Transport</span>
                                    <span style={{ fontSize: '20px', fontWeight: '800', color: meta.accent, letterSpacing: '-0.5px' }}>
                                      {Number(totalVal).toLocaleString()}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isEst ? '#f59e0b' : '#10b981', flexShrink: 0 }}/>
                                    {isEst ? `Estimated · ${moUploaded} month(s)` : 'Actual · 12 months'}
                                  </div>
                                </>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 0', textAlign: 'center' }}>
                                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f8fafc', border: '1px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px' }}>
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#cbd5e1" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                                  </div>
                                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8' }}>No data</div>
                                  <div style={{ fontSize: '10px', color: '#cbd5e1', marginTop: '3px' }}>Not uploaded</div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // ── Fuel: breakdown card ──────────────────────────
                    if (cat === 'fuel') {
                      const sub    = annualized.fuelSubcategories || {};
                      const diesel = sub.diesel || a;
                      const pngCng = sub.pngCng || {};
                      const hasAnySub = diesel?.sufficient || pngCng?.sufficient;
                      const totalVal =
                        (diesel?.sufficient ? (diesel.annualValue || 0) : 0) +
                        (pngCng?.sufficient ? (pngCng.annualValue || 0) : 0);
                      const isEst = diesel?.isEstimated || pngCng?.isEstimated;
                      const moUploaded = diesel?.monthsUploaded || 0;
                      return (
                        <div key={cat} style={{ borderRadius: '16px', border: `1px solid ${hasAnySub ? meta.accentBorder : '#e2e8f0'}`, boxShadow: hasAnySub ? `0 4px 20px ${meta.accent}18` : '0 2px 8px rgba(0,0,0,0.04)', background: '#fff', display: 'flex', flexDirection: 'column' }}>
                          <div style={{ height: '4px', background: hasAnySub ? `linear-gradient(90deg, ${meta.accent}, ${meta.accent}88)` : '#e2e8f0' }} />
                          <div style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: hasAnySub ? meta.accentLight : '#f8fafc', border: `1px solid ${hasAnySub ? meta.accentBorder : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={hasAnySub ? meta.accent : '#94a3b8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={meta.icon}/></svg>
                                </div>
                                <span style={{ fontSize: '12px', fontWeight: '800', color: hasAnySub ? '#1e293b' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{meta.label}</span>
                              </div>
                              <span style={{ fontSize: '9px', fontWeight: '700', padding: '3px 8px', borderRadius: '100px', background: hasAnySub ? meta.accentLight : '#f8fafc', color: hasAnySub ? meta.accentText : '#94a3b8', border: `1px solid ${hasAnySub ? meta.accentBorder : '#e2e8f0'}`, letterSpacing: '0.3px' }}>Litres / m³</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                              {[
                                { dot: '#d97706', label: 'Diesel',    val: diesel, unit: 'L' },
                                { dot: '#f59e0b', label: 'PNG / CNG', val: pngCng, unit: 'm³' },
                              ].map(({ dot, label, val, unit }) => (
                                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderRadius: '9px', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                                  <span style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '7px' }}>
                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: dot, flexShrink: 0, boxShadow: `0 0 6px ${dot}80` }}/>
                                    {label}
                                  </span>
                                  <span style={{ fontSize: '12px', fontWeight: '600', color: val?.sufficient ? '#1e293b' : '#94a3b8' }}>
                                    {val?.sufficient ? `${Number(val.annualValue).toLocaleString()} ${unit}` : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div style={{ borderTop: `1px dashed ${hasAnySub ? meta.accentBorder : '#e2e8f0'}`, paddingTop: '12px' }}>
                              {hasAnySub ? (
                                <>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>Total Fuel</span>
                                    <span style={{ fontSize: '20px', fontWeight: '800', color: meta.accent, letterSpacing: '-0.5px' }}>
                                      {Number(totalVal).toLocaleString()}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isEst ? '#f59e0b' : '#10b981', flexShrink: 0 }}/>
                                    {isEst ? `Estimated · ${moUploaded} month(s)` : 'Actual · 12 months'}
                                  </div>
                                </>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 0', textAlign: 'center' }}>
                                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f8fafc', border: '1px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px' }}>
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#cbd5e1" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                                  </div>
                                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8' }}>No data</div>
                                  <div style={{ fontSize: '10px', color: '#cbd5e1', marginTop: '3px' }}>Not uploaded</div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // ── Generic category card ─────────────────────────────
                    return (
                      <div key={cat} style={{ borderRadius: '16px', border: `1px solid ${a?.sufficient ? meta.accentBorder : '#e2e8f0'}`, boxShadow: a?.sufficient ? `0 4px 20px ${meta.accent}15` : '0 2px 8px rgba(0,0,0,0.04)', background: '#fff', display: 'flex', flexDirection: 'column' }}>
                        {/* Top accent bar */}
                        <div style={{ height: '4px', background: a?.sufficient ? `linear-gradient(90deg, ${meta.accent}, ${meta.accent}88)` : '#e2e8f0' }} />
                        <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          {/* Icon + label */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: a?.sufficient ? meta.accentLight : '#f8fafc', border: `1px solid ${a?.sufficient ? meta.accentBorder : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={a?.sufficient ? meta.accent : '#94a3b8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={meta.icon}/></svg>
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: a?.sufficient ? '#64748b' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{meta.label}</span>
                          </div>
                          {a?.sufficient ? (
                            <>
                              {/* Big value */}
                              <div style={{ marginBottom: '10px' }}>
                                <div style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.8px', lineHeight: 1.1 }}>
                                  {Number(a.annualValue).toLocaleString()}
                                </div>
                                <div style={{ fontSize: '12px', fontWeight: '600', color: meta.accent, marginTop: '2px' }}>{UNIT_FOR[cat]}</div>
                              </div>
                              {/* Progress bar */}
                              <div style={{ marginBottom: '10px' }}>
                                <div className="pdf-progress-bar" style={{ height: '4px', borderRadius: '100px', background: '#f1f5f9', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${Math.min(100, Math.round((a.modifier || 1) * 100))}%`, background: `linear-gradient(90deg, ${meta.accent}, ${meta.accent}cc)`, borderRadius: '100px', transition: 'width 0.8s ease' }} />
                                </div>
                              </div>
                              {/* Footer meta */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px dashed ${meta.accentBorder}`, paddingTop: '10px', marginTop: '2px' }}>
                                <div style={{ fontSize: '10px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: a.isEstimated ? '#f59e0b' : '#10b981', flexShrink: 0 }}/>
                                  {a.isEstimated ? `Estimated · ${a.monthsUploaded} mo.` : 'Actual · 12 months'}
                                </div>
                                <span style={{ fontSize: '9px', fontWeight: '700', padding: '2px 7px', borderRadius: '100px', background: meta.accentLight, color: meta.accentText, border: `1px solid ${meta.accentBorder}` }}>
                                  Mod {a.modifier} · {a.level}
                                </span>
                              </div>
                            </>
                          ) : (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 0', textAlign: 'center' }}>
                              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f8fafc', border: '1px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#cbd5e1" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                              </div>
                              <div style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8' }}>No data</div>
                              <div style={{ fontSize: '10px', color: '#cbd5e1', marginTop: '3px' }}>{a?.monthsUploaded ? `${a.monthsUploaded} mo. uploaded · need ≥ 3` : 'Not uploaded'}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </section>

          {/* 4. Key Performance Indicators */}
          {summary.sector?.code === 'HOSP'
            ? (
              <section className="pdf-section rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid #dbeafe', boxShadow: '0 1px 4px rgba(3,105,161,0.06)', contentVisibility: 'auto', containIntrinsicSize: 'auto 800px' }}>
                <Suspense fallback={<div className="flex items-center justify-center py-8 text-slate-400 text-sm">Loading KPI dashboard…</div>}>
                  <HospitalKpiDashboard
                    kpis={summary.kpis}
                    emissions={summary.emissions}
                    hospitalExtras={summary.hospitalExtras}
                    confidence={summary.confidence}
                  />
                </Suspense>
              </section>
            )
            : summary.kpis && <KpiSection kpis={summary.kpis} sector={summary.sector} />
          }

          {/* 5. Emissions Summary */}
          <EmissionsSection emissions={emissions} />

          {/* 6. Confidence & Assumptions */}
          <section className="pdf-section rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid #dbeafe', boxShadow: '0 1px 4px rgba(3,105,161,0.06)', contentVisibility: 'auto', containIntrinsicSize: 'auto 800px' }}>
            <h2 className="font-semibold mb-3" style={{ color: '#0c4a6e' }}>6. Confidence &amp; Assumptions</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                {cats.map((cat) => {
                  const c = confidence.perCategory[cat];
                  if (!c) return null;
                  return (
                    <div key={cat} className="text-sm py-1">
                      <div className="flex justify-between">
                        <span className="capitalize">{cat}</span>
                        <span className="text-slate-600">{c.level} ({c.modifier})</span>
                      </div>
                      <div className="pdf-progress-bar w-full h-1.5 bg-slate-200 rounded">
                        <div className={`h-1.5 rounded ${c.modifier === 1 ? 'bg-sky-600' : c.modifier >= 0.85 ? 'bg-sky-500' : c.modifier >= 0.7 ? 'bg-amber-400' : 'bg-red-400'}`}
                             style={{ width: `${Math.round(c.modifier * 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-800 mb-1">Assumptions used</h3>
                <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
                  {(assumptions || []).map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            </div>
          </section>

          {/* 7. Readiness Pre-Check */}
          <section className="pdf-section rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid #dbeafe', boxShadow: '0 1px 4px rgba(3,105,161,0.06)', contentVisibility: 'auto', containIntrinsicSize: 'auto 800px' }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-semibold text-slate-800">7. Readiness Pre-Check</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Data completeness verification before generating readiness report</p>
              </div>
            </div>

            {/* Category pre-checks grid */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              {Object.entries(readinessPreCheck || {})
                .filter(([k]) => k !== 'dataReliability')
                .map(([k, v]) => {
                  const meta = PRE_CHECK_META[k] || { label: k, desc: '', d: 'M12 12h.01' };
                  const col  = PRE_CHECK_COLOUR[v?.colour] || PRE_CHECK_COLOUR.grey;
                  return (
                    <div key={k}
                         className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${col.border}`}
                         style={{ background: col.bg }}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${col.iconBg}`}>
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke={col.icon}
                             strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d={meta.d} />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-semibold text-slate-700 leading-tight">{meta.label}</div>
                        <div className="text-[10px] text-slate-400">{meta.desc}</div>
                      </div>
                      <div className="shrink-0">
                        <StatusBadge label={v?.label} colour={v?.colour} />
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Data Reliability summary row */}
            {readinessPreCheck?.dataReliability && (() => {
              const v   = readinessPreCheck.dataReliability;
              const col = PRE_CHECK_COLOUR[v?.colour] || PRE_CHECK_COLOUR.grey;
              return (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${col.border}`}
                     style={{ background: col.bg }}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${col.iconBg}`}>
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke={col.icon}
                         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d={PRE_CHECK_META.dataReliability.d} />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-[12px] font-semibold text-slate-700">Overall Data Reliability</div>
                    <div className="text-[10px] text-slate-400">Aggregate confidence across all uploaded categories</div>
                  </div>
                  <StatusBadge label={v?.label} colour={v?.colour} />
                </div>
              );
            })()}
          </section>
        </>
      )}
    </>
  );
}); // end memo(SummaryContent)


// ── Status colour tokens ─────────────────────────────────────────────────────
const STATUS_BORDER = {
  green: 'border-l-emerald-500',
  amber: 'border-l-amber-400',
  red:   'border-l-red-500',
  blue:  'border-l-blue-500',
  grey:  'border-l-slate-400',
};
const STATUS_BG = {
  green: 'bg-emerald-50',
  amber: 'bg-amber-50',
  red:   'bg-red-50',
  blue:  'bg-blue-50',
  grey:  'bg-slate-50',
};
const STATUS_VALUE_COLOUR = {
  green: 'text-emerald-700',
  amber: 'text-amber-700',
  red:   'text-red-700',
  blue:  'text-blue-700',
  grey:  'text-slate-400',
};
const STATUS_BADGE_TEXT = {
  green: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  amber: 'bg-amber-100  text-amber-800  border-amber-300',
  red:   'bg-red-100    text-red-800    border-red-300',
  blue:  'bg-blue-100   text-blue-800   border-blue-300',
  grey:  'bg-slate-100  text-slate-600  border-slate-300',
};

// Module-scope color maps — allocated once, not re-created on every KpiCard render
const KPI_ACCENT = { green: '#059669', amber: '#d97706', red: '#dc2626', blue: '#3b82f6', grey: '#94a3b8' };
const KPI_BG     = { green: '#f0f9ff', amber: '#fefce8', red: '#fef2f2', blue: '#eff6ff', grey: '#f8fafc' };
const KPI_BORDER = { green: '#6ee7b7', amber: '#fcd34d', red: '#fca5a5', blue: '#93c5fd', grey: '#e2e8f0' };

const KpiCard = memo(function KpiCard({ kpi }) {
  const { label, value, unit, status, colour, benchmarkText } = kpi;
  const hasValue = value !== null && value !== undefined;
  const displayValue = hasValue ? value : '';
  const c = colour || 'grey';

  const accent = KPI_ACCENT[c] || KPI_ACCENT.grey;
  const bg     = KPI_BG[c]     || KPI_BG.grey;
  const border = KPI_BORDER[c] || KPI_BORDER.grey;

  return (
    <div className="rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
         style={{ background: bg, border: `1px solid ${border}`, boxShadow: `0 2px 8px ${accent}18` }}>
      {/* Top accent bar */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, ${accent}88)` }} />
      <div className="p-3">
        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2 leading-tight" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{label}</div>
        <div className="flex items-end gap-1 mb-1.5 flex-wrap">
          <span className="text-[22px] font-black leading-none" style={{ color: hasValue ? accent : '#cbd5e1' }}>
            {displayValue}
          </span>
          {hasValue && unit && (
            <span className="text-[10px] font-semibold pb-0.5 leading-none" style={{ color: accent + 'bb', wordBreak: 'break-all' }}>
              {unit}
            </span>
          )}
        </div>
        {status && (
          <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: accent + '18', color: accent, border: `1px solid ${accent}44` }}>
            {status}
          </span>
        )}
      </div>
    </div>
  );
}); // end memo(KpiCard)

const KpiSection = memo(function KpiSection({ kpis, sector }) {
  if (!kpis) return null;

  const primary   = ['energyIntensity', 'waterIntensity', 'renewableContribution', 'recyclingRate'];
  const secondary = ['tankerDependency', 'waterReuse', 'powerFactor'];
  const hasSecondary = secondary.some((k) => kpis[k]?.value !== null && kpis[k]?.value !== undefined);

  return (
    <section className="pdf-section rounded-2xl p-4" style={{ background: '#ffffff', border: '1px solid #dbeafe', boxShadow: '0 1px 4px rgba(3,105,161,0.06)', contentVisibility: 'auto', containIntrinsicSize: 'auto 800px' }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-slate-800 text-sm">4. Key Performance Indicators</h2>
        {sector?.name && (
          <span className="text-[10px] text-slate-500 bg-slate-100 border border-slate-200 rounded px-2 py-0.5">
            {sector.name}
          </span>
        )}
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {primary.map((k) => kpis[k] && <KpiCard key={k} kpi={kpis[k]} />)}
      </div>

      {/* Secondary KPIs — only rendered individually when they carry a real value */}
      {hasSecondary && (
        <>
          <div className="mt-3 mb-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <span>Operational Metrics</span>
            <div className="flex-1 h-px" style={{ background: '#e8f0ec' }} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {secondary
              .filter((k) => kpis[k]?.value !== null && kpis[k]?.value !== undefined)
              .map((k) => <KpiCard key={k} kpi={kpis[k]} />)}
          </div>
        </>
      )}
    </section>
  );
}); // end memo(KpiSection)


// ── Emissions Section ────────────────────────────────────────────────────────
// SourceIcon removed — emoji rendering adds unnecessary glyph-resolution overhead

const ScopeRow = memo(function ScopeRow({ source, tCO2e, barPct, barColour }) {
  return (
    <div className="py-1.5 border-b border-slate-100 last:border-0">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="text-[11px] text-slate-600 flex-1" style={{wordBreak:"break-word",overflowWrap:"anywhere"}}>
          {source}
        </div>
        <div className="text-[11px] font-semibold text-slate-800 shrink-0">
          {tCO2e} <span className="text-[10px] font-normal text-slate-400">t</span>
        </div>
      </div>
      <div className="pdf-progress-bar h-1 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-1 rounded-full ${barColour}`} style={{ width: `${Math.min(100, barPct)}%` }} />
      </div>
    </div>
  );
}); // end memo(ScopeRow)

// Initial rows shown before "Show more" for alwaysExpand scopes (Scope 1 & 3)
const SCOPE_INITIAL_ROWS = 5;

function ScopeCard({ scopeNum, title, subtitle, tCO2e, breakdown, totalTCO2e, accent, emptyMsg, alwaysExpand }) {
  const [showAll, setShowAll] = useState(false);
  // Progressive row count for alwaysExpand scopes — avoids painting 20+ rows at once
  const [expandedRows, setExpandedRows] = useState(SCOPE_INITIAL_ROWS);
  // Ref for the popover wrapper so we can detect outside clicks
  const popoverRef = useRef(null);

  // Close popover on outside click
  useEffect(() => {
    if (!showAll) return;
    const handle = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) setShowAll(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showAll]);

  // Close popover on ESC
  useEffect(() => {
    if (!showAll) return;
    const onKey = (e) => { if (e.key === 'Escape') setShowAll(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showAll]);

  const pct = totalTCO2e > 0 ? (tCO2e / totalTCO2e) * 100 : 0;
  const hasData = breakdown && breakdown.length > 0;
  // Scope 1 & 3 (alwaysExpand): start with SCOPE_INITIAL_ROWS, reveal more on demand
  // Scope 2 (!alwaysExpand): cap at 3, overflow goes to modal popup
  const visibleRows = alwaysExpand ? (breakdown || []).slice(0, expandedRows) : (breakdown || []).slice(0, 3);
  const hasMore = !alwaysExpand && breakdown && breakdown.length > 3;
  const hasMoreExpand = alwaysExpand && breakdown && breakdown.length > expandedRows;
  const barColours = {
    orange: 'bg-orange-400',
    blue:   'bg-blue-400',
    purple: 'bg-purple-400',
  };
  const accentBorder = {
    orange: 'border-t-orange-500',
    blue:   'border-t-blue-500',
    purple: 'border-t-purple-500',
  };
  const accentText = {
    orange: 'text-orange-600',
    blue:   'text-blue-600',
    purple: 'text-purple-600',
  };
  const accentBg = {
    orange: 'bg-orange-50',
    blue:   'bg-blue-50',
    purple: 'bg-purple-50',
  };

  return (
    <div className={`rounded-xl border border-slate-200 border-t-4 ${accentBorder[accent]} flex flex-col`}>
      {/* Header */}
      <div className={`px-3 pt-3 pb-2.5 ${accentBg[accent]} rounded-t-xl`}>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className={`text-[10px] font-bold uppercase tracking-widest ${accentText[accent]}`}>Scope {scopeNum}</div>
            <div className="text-[13px] font-semibold text-slate-800 leading-tight mt-0.5">{title}</div>
            <div className="text-[10px] text-slate-500">{subtitle}</div>
          </div>
          <div className="text-right shrink-0">
            <div className={`text-xl font-bold leading-none ${accentText[accent]}`}>{tCO2e}</div>
            <div className="text-[10px] text-slate-500">tCO₂e/yr</div>
          </div>
        </div>
        {/* Share bar */}
        {totalTCO2e > 0 && (
          <div className="mt-2">
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span>Share</span>
              <span className={`font-semibold ${accentText[accent]}`}>{pct.toFixed(1)}%</span>
            </div>
            <div className="pdf-progress-bar h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className={`h-1.5 rounded-full ${barColours[accent]}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Breakdown rows */}
      <div className="px-3 py-2 flex-1">
        {hasData ? (
          <>
            {visibleRows.map((b, i) => {
              const rowPct = tCO2e > 0 ? (b.tCO2e / tCO2e) * 100 : 0;
              return (
                <ScopeRow key={i} source={b.source} tCO2e={b.tCO2e}
                  barPct={rowPct} barColour={barColours[accent]} />
              );
            })}
            {hasMore && (() => {
              const popAccent = accent === 'orange' ? '#ea580c' : accent === 'blue' ? '#2563eb' : '#7c3aed';
              const popBorder = accent === 'orange' ? '#fdba74' : accent === 'blue' ? '#93c5fd' : '#c4b5fd';
              const popBg     = accent === 'orange' ? 'rgba(254,215,170,0.35)' : accent === 'blue' ? 'rgba(191,219,254,0.35)' : 'rgba(221,214,254,0.35)';
              const popBarHex = accent === 'orange' ? '#fb923c' : accent === 'blue' ? '#60a5fa' : '#a78bfa';
              return (
                <div className="relative mt-1.5" ref={popoverRef}>
                  {/* Toggle button */}
                  <button
                    onClick={() => setShowAll((v) => !v)}
                    className="px-2.5 py-1 text-[10px] font-bold rounded-full transition-all hover:opacity-80 active:scale-95 flex items-center gap-1"
                    style={{ color: popAccent, background: popBg, border: `1px solid ${popBorder}` }}>
                    +{breakdown.length - 3} more {showAll ? '▲' : '↗'}
                  </button>

                  {/* Compact inline popover — no backdrop, no extra window */}
                  {showAll && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 'calc(100% + 5px)',
                        left: 0,
                        zIndex: 40,
                        width: '248px',
                        maxHeight: '212px',
                        overflowY: 'auto',
                        background: '#ffffff',
                        border: `1px solid ${popBorder}`,
                        borderRadius: '12px',
                        boxShadow: `0 8px 28px rgba(0,0,0,0.12), 0 2px 8px ${popAccent}1a`,
                        overscrollBehavior: 'contain',
                      }}>
                      {/* Sticky mini-header */}
                      <div style={{
                        position: 'sticky', top: 0, zIndex: 1,
                        background: '#fff',
                        padding: '7px 12px 5px',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                        <span style={{ fontSize: '10px', fontWeight: '700', color: popAccent, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {breakdown.length - 3} more sources
                        </span>
                        <button
                          onClick={() => setShowAll(false)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M18 6L6 18M6 6l12 12"/>
                          </svg>
                        </button>
                      </div>
                      {/* Overflow items */}
                      {breakdown.slice(3).map((b, i) => {
                        const rowPct = tCO2e > 0 ? (b.tCO2e / tCO2e) * 100 : 0;
                        return (
                          <div key={i} style={{ padding: '5px 12px', borderBottom: '1px solid #f8fafc' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px', marginBottom: '3px' }}>
                              <span style={{ fontSize: '11px', color: '#475569', flex: 1, lineHeight: 1.35 }}>{b.source}</span>
                              <span style={{ fontSize: '11px', fontWeight: '600', color: '#1e293b', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                                {b.tCO2e} <span style={{ fontSize: '9px', fontWeight: '400', color: '#94a3b8' }}>t</span>
                              </span>
                            </div>
                            <div style={{ height: '3px', background: '#f1f5f9', borderRadius: '100px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${Math.min(100, rowPct)}%`, background: popBarHex, borderRadius: '100px' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
            {hasMoreExpand && (
              <button
                onClick={() => setExpandedRows((n) => n + 5)}
                className="mt-1.5 px-2.5 py-1 text-[10px] font-bold rounded-full transition-all hover:opacity-80 active:scale-95 flex items-center gap-1"
                style={{ color: accent === 'orange' ? '#ea580c' : accent === 'blue' ? '#2563eb' : '#7c3aed',
                         background: accent === 'orange' ? 'rgba(254,215,170,0.5)' : accent === 'blue' ? 'rgba(191,219,254,0.5)' : 'rgba(221,214,254,0.5)',
                         border: `1px solid ${accent === 'orange' ? '#fdba74' : accent === 'blue' ? '#93c5fd' : '#c4b5fd'}` }}>
                Show {Math.min(5, breakdown.length - expandedRows)} more
              </button>
            )}
          </>
        ) : (
          <div className="py-3 text-center text-[11px] text-slate-400 italic">{emptyMsg}</div>
        )}
      </div>

    </div>
  );
}

const EmissionsSection = memo(function EmissionsSection({ emissions }) {
  const { scope1, scope2, scope3, totalTCO2e, intensityTCO2ePerSqft } = emissions;

  return (
    <section className="pdf-section rounded-2xl p-5" style={{ background: '#ffffff', border: '1px solid #dbeafe', boxShadow: '0 1px 4px rgba(3,105,161,0.06)', contentVisibility: 'auto', containIntrinsicSize: 'auto 800px' }}>
      <h2 className="font-semibold mb-1 text-slate-800">5. Emissions Summary</h2>
      <p className="text-xs text-slate-500 mb-4">GHG emissions across all three scopes (tCO₂e / year, annualized)</p>

      {/* Total banner */}
      <div className="flex flex-row gap-3 mb-5">
        <div className="flex-1 rounded-xl px-5 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #0369a1 0%, #0284c7 50%, #0ea5e9 100%)', color: 'white' }}>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-sky-300">Total GHG Emissions</div>
            <div className="text-4xl font-bold mt-1 leading-none">{totalTCO2e}</div>
            <div className="text-sm text-sky-300 mt-1">tCO₂e / year</div>
          </div>
          {totalTCO2e > 0 && (
            <div className="flex flex-col gap-1.5 text-xs text-sky-300 min-w-[120px]">
              {[
                { label: 'S1', val: scope1.tCO2e, colour: 'bg-orange-400' },
                { label: 'S2', val: scope2.tCO2e, colour: 'bg-blue-400' },
                { label: 'S3', val: scope3.tCO2e, colour: 'bg-purple-400' },
              ].map(({ label, val, colour }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="w-5 shrink-0">{label}</span>
                  <div className="flex-1 h-1.5 bg-sky-700 rounded-full overflow-hidden">
                    <div className={`h-1.5 rounded-full ${colour}`}
                         style={{ width: `${totalTCO2e > 0 ? (val / totalTCO2e * 100) : 0}%` }} />
                  </div>
                  <span className="w-16 text-right">{val} t</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {intensityTCO2ePerSqft > 0 && (
          <div className="sm:w-44 rounded-xl px-4 py-4 flex flex-col justify-center text-center" style={{ background: '#ffffff', border: '1px solid #dbeafe' }}>
            <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Emission Intensity</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{intensityTCO2ePerSqft}</div>
            <div className="text-xs text-slate-400 mt-0.5">tCO₂e / sqft / yr</div>
          </div>
        )}
      </div>

      {/* Scope cards — all scopes cap at 3 rows and show "+N popup" for overflow */}
      <div className="grid grid-cols-3 gap-4">
        <ScopeCard
          scopeNum={1}
          title="Direct Emissions"
          subtitle="Diesel · PNG/CNG · Refrigerant leaks"
          tCO2e={scope1.tCO2e}
          breakdown={scope1.breakdown}
          totalTCO2e={totalTCO2e}
          accent="orange"
          emptyMsg="No fuel or refrigerant data uploaded"
          alwaysExpand={false}
        />
        <ScopeCard
          scopeNum={2}
          title="Indirect — Energy"
          subtitle="Purchased electricity (grid)"
          tCO2e={scope2.tCO2e}
          breakdown={scope2.breakdown}
          totalTCO2e={totalTCO2e}
          accent="blue"
          emptyMsg="No electricity data uploaded"
          alwaysExpand={false}
        />
        <ScopeCard
          scopeNum={3}
          title="Value Chain"
          subtitle="Waste · Wastewater · Vehicle KM · Fleet Fuel · Cargo"
          tCO2e={scope3.tCO2e}
          breakdown={scope3.breakdown}
          totalTCO2e={totalTCO2e}
          accent="purple"
          emptyMsg="No waste / transport data uploaded"
          alwaysExpand={false}
        />
      </div>

      {/* Emission factor note */}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
        <span>Grid factor: {scope2.factorUsed} kgCO₂e/kWh (CEA India)</span>
        {scope2.renewableOffsetKwh > 0 && (
          <span className="text-emerald-600">
            ✓ {scope2.renewableOffsetKwh.toLocaleString()} kWh renewable offset applied
          </span>
        )}
        {scope3.partial && <span className="text-amber-600">⚠ Scope 3 partial — not all sources uploaded</span>}
      </div>
    </section>
  );
}); // end memo(EmissionsSection)

const Tile = memo(function Tile({ label, value, sub, highlight }) {
  return (
    <div className={`p-3 rounded-lg border ${highlight ? 'border-sky-100' : 'bg-white/60 border-slate-200'}`}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-xl font-bold text-slate-800">{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
}); // end memo(Tile)
