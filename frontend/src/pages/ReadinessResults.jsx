// Screen 3 — McKinsey-style ESG readiness dashboard.
//   * Sticky top action bar (Back / Download / Dashboard)
//   * Big readiness gauge + emission donut + category radar
//   * Certification cards with confidence + timeline + major-gap line
//   * Regulatory table with risk badges
//   * Strengths / Critical gaps with severity dots
//   * Horizontal roadmap timeline
//   * Executive summary card

import { useEffect, useState, useRef, memo, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip,
} from 'recharts';
import { api } from '../lib/api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import { captureAsPdf, printAsPdf } from '../lib/pdfCapture.js';

const RISK_COLOUR = (level) =>
  level === 'High' ? 'red' : level === 'Medium-High' ? 'orange' : level === 'Medium' ? 'amber' : 'green';

// ── Module-scope constants (defined once, never re-created on re-render) ───────
const stageColour = (v) =>
  v >= 90 ? '#0369a1' :
  v >= 75 ? '#0284c7' :
  v >= 60 ? '#0ea5e9' :
  v >= 40 ? '#f59e0b' :
            '#dc2626';

const stageLabel = (v) =>
  v >= 90 ? 'Advanced' :
  v >= 75 ? 'Strong' :
  v >= 60 ? 'Possible' :
  v >= 40 ? 'Foundational' :
            'Not Ready';

const CATEGORY_META = {
  electricity:  { label: 'Electricity',  icon: '⚡' },
  water:        { label: 'Water',         icon: '💧' },
  fuel:         { label: 'Fuel',          icon: '🔥' },
  waste:        { label: 'Waste',         icon: '♻️' },
  transport:    { label: 'Transport',     icon: '🚚' },
  refrigerants: { label: 'Refrigerants',  icon: '❄️' },
};
const CATEGORY_KEYS = ['electricity', 'water', 'fuel', 'waste', 'transport', 'refrigerants'];

export default function ReadinessResults() {
  const { id } = useParams();
  const nav = useNavigate();
  const [readiness, setReadiness] = useState(null);
  const [summary, setSummary] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [r1, r2] = await Promise.all([
          api.post(`/assessments/${id}/readiness`),
          api.post(`/assessments/${id}/summary`),
        ]);
        setReadiness(r1.data);
        setSummary(r2.data);
      } catch (e) { setErr(e.response?.data?.error || 'Failed to compute'); }
    })();
  }, [id]);

  async function downloadPdf() {
    setDownloading(true);
    try {
      // GET from the backend: generates the PDF, persists a Report record in
      // MongoDB linked to this user, and streams the buffer back for download.
      // Reports are permanently retained and remain available after re-login.
      const response = await api.get(`/reports/${id}/readiness`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const disposition = response.headers['content-disposition'] || '';
      const nameMatch = disposition.match(/filename="?([^"]+)"?/);
      a.download = nameMatch ? nameMatch[1] : 'EnSoGo_Readiness_Report.pdf';
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
    } catch (_err) {
      // Fallback: client-side capture if backend is unreachable
      try { await captureAsPdf('pdf-content', 'EnSoGo_Readiness_Report.pdf'); } catch (_e) {}
    } finally { setDownloading(false); }
  }

  async function printPdf() {
    setPrinting(true);
    try {
      await printAsPdf('pdf-content');
    } catch (_e) {
      // If canvas capture fails, try native browser print as last resort
      window.print();
    } finally { setPrinting(false); }
  }

  return (
    // Outer div has NO overflow:hidden so position:sticky works against the
    // real scroll container. ReadinessResults orbs use position:fixed so they
    // don't need a clipping wrapper.
    <div className="min-h-full" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 40%, #e8f4fd 70%, #dbeafe 100%)', position: 'relative' }}>
      {/* Ambient orbs */}
      <div style={{ position: 'fixed', top: '-60px', right: '-60px', width: '380px', height: '380px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.13) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '80px', left: '40px', width: '280px', height: '280px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,233,0.09) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', opacity: 0.04, pointerEvents: 'none', zIndex: 0 }}>
        <defs><pattern id="rr-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0ea5e9" strokeWidth="1"/></pattern></defs>
        <rect width="100%" height="100%" fill="url(#rr-grid)" />
      </svg>

      {/* Page header + action bar — sticky so nav stays visible while scrolling */}
      <div className="no-print sticky top-0 z-10 px-6 pt-5 pb-4"
           style={{ background: 'rgba(224,242,254,0.95)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', boxShadow: '0 1px 12px rgba(3,105,161,0.10)' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                    style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc' }}>Step 3 of 3</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                   style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 4px 12px rgba(16,185,129,0.28)' }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="M9 12l2 2 4-4"/>
                </svg>
              </div>
              <h1 className="text-xl font-bold" style={{ color: '#0c4a6e' }}>Sustainability Readiness Overview</h1>
            </div>
            <p className="text-[12px] mt-0.5" style={{ color: '#64748b' }}>Certification scores, regulatory readiness, action roadmap and executive summary.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all"
              style={{ border: '1px solid rgba(186,230,255,0.8)', color: '#475569', background: 'rgba(255,255,255,0.7)' }}
              onClick={() => nav(`/assessment/${id}/summary`)}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
              Back
            </button>
            <button
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all disabled:opacity-50"
              style={{ border: '1px solid rgba(186,230,255,0.8)', color: '#475569', background: 'rgba(255,255,255,0.7)' }}
              disabled={downloading || !readiness} onClick={downloadPdf}>
              {downloading
                ? <><div className="w-3 h-3 border-2 border-slate-400 border-t-slate-700 rounded-full animate-spin"/>Capturing…</>
                : <><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/></svg>Paper Reports</>
              }
            </button>
            <button
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all disabled:opacity-50"
              style={{ border: '1px solid rgba(186,230,255,0.8)', color: '#475569', background: 'rgba(255,255,255,0.7)' }}
              disabled={printing || !readiness} onClick={printPdf}>
              {printing
                ? <><div className="w-3 h-3 border-2 border-slate-400 border-t-slate-700 rounded-full animate-spin"/>Preparing…</>
                : <><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>Print</>
              }
            </button>
            <button
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#0369a1,#0284c7,#0ea5e9)', boxShadow: '0 4px 12px rgba(3,105,161,0.3)' }}
              onClick={() => nav('/')}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              </svg>
              Dashboard
            </button>
          </div>
        </div>

        {err && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-xl text-[12px]"
               style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
            </svg>
            {err}
          </div>
        )}
      </div>

      <div id="pdf-content" className="px-6 pb-8" style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* ── PDF Report Header (logo + name) ─────────────────────────────── */}
        <div className="flex items-center gap-3 bg-white rounded-2xl px-5 py-3 mb-5"
             style={{ border: '1px solid #e8f0ec', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
               style={{ background: '#fff', border: '1px solid #e8f0ec' }}>
            <img src="/EnSoGo%20Logo.png" alt="EnSoGo" className="w-full h-full object-cover rounded-xl" />
          </div>
          <div>
            <div className="text-[15px] font-bold text-slate-800 leading-tight">EnSoGo</div>
            <div className="text-[9px] text-slate-400 uppercase tracking-widest">Sustainability Readiness Suite</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-[12px] font-semibold text-slate-700">Sustainability Readiness Report</div>
            <div className="text-[10px] text-slate-400">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          </div>
        </div>

        {!readiness && !err ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-2 text-slate-400">
              <div className="w-5 h-5 border-2 border-slate-300 border-t-sky-500 rounded-full animate-spin"/>
              Computing readiness…
            </div>
          </div>
        ) : readiness ? (
          <div className="space-y-5">
            <Dashboard readiness={readiness} summary={summary} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const Dashboard = memo(function Dashboard({ readiness, summary }) {
  const radar = readiness.radar || {};

  const benchmarkData = useMemo(() =>
    CATEGORY_KEYS
      .map(k => {
        const raw = radar[k];
        const score = Number.isFinite(raw) ? raw : 0;
        const hasData = Number.isFinite(raw) && raw > 0;
        return {
          category: CATEGORY_META[k]?.label ?? k.charAt(0).toUpperCase() + k.slice(1),
          icon: CATEGORY_META[k]?.icon ?? '',
          score,
          hasData,
          stage: hasData ? stageLabel(score) : 'No Data',
          fill: hasData ? stageColour(score) : '#94a3b8',
        };
      })
      .sort((a, b) => b.score - a.score),
  [radar]);

  const emissions = readiness.emissions || {};

  const donutData = useMemo(() => [
    { name: 'Scope 1', value: emissions.scope1?.tCO2e || 0, fill: '#0369a1' },
    { name: 'Scope 2', value: emissions.scope2?.tCO2e || 0, fill: '#0ea5e9' },
    { name: 'Scope 3', value: emissions.scope3?.tCO2e || 0, fill: '#7dd3fc' },
  ].filter((d) => d.value > 0), [emissions.scope1?.tCO2e, emissions.scope2?.tCO2e, emissions.scope3?.tCO2e]);

  const { avgConfidence, monthsTotal } = useMemo(() => {
    const conf = readiness.confidence?.perCategory || {};
    const confMods = Object.values(conf).map((c) => c?.modifier).filter(Number.isFinite);
    const avg = confMods.length ? Math.round((confMods.reduce((a, b) => a + b, 0) / confMods.length) * 100) : 0;
    const annual = summary?.annualized || {};
    const used = Object.values(annual).filter((a) => a?.sufficient).map((a) => a.monthsUploaded || 0);
    return { avgConfidence: avg, monthsTotal: used.length ? Math.max(...used) : 0 };
  }, [readiness.confidence, summary?.annualized]);

  return (
    <>
      {/* HERO */}
      <section className="pdf-section rounded-2xl overflow-hidden" style={{ border: "1px solid #e8f0ec", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
        {/* Top gradient banner */}
        <div className="px-5 py-3 flex items-center gap-2"
             style={{ background: 'linear-gradient(135deg,#0B1D2E 0%,#0f3460 100%)', borderBottom: '1px solid #1E3A52' }}>
          <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)' }}>
            ESG Readiness Score
          </span>
          <span className="ml-auto text-[10px] text-slate-500">Based on uploaded operational data</span>
        </div>
        <div className="bg-white p-5 grid grid-cols-3 gap-6">
          {/* Gauge */}
          <div className="flex flex-col items-center justify-center">
            <ReadinessGauge score={readiness.overall.score} label={readiness.overall.label} />
            <div className="mt-3 flex justify-center">
              <ConfidenceBadge avg={avgConfidence} months={monthsTotal} />
            </div>
          </div>

          {/* Category bars */}
          <div className="flex flex-col">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-[13px] font-bold text-slate-800">Category Performance</h3>
              <span className="flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full"
                    style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-sky-600 inline-block"/>Target ≥ 75
              </span>
            </div>
            <div className="flex-1 space-y-2.5" style={{ minHeight: 210 }}>
              {benchmarkData.map((d, i) => (
                <div key={i} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                      <span className="text-[10px]">{d.icon}</span>{d.category}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: d.fill + '18', color: d.fill, border: `1px solid ${d.fill}44` }}>
                        {d.stage}
                      </span>
                      <span className="text-[12px] font-bold" style={{ color: d.fill }}>
                        {d.hasData ? `${d.score}%` : ''}
                      </span>
                    </div>
                  </div>
                  <div className="relative h-3 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
                    {/* Target line at 75 */}
                    <div className="absolute top-0 bottom-0 w-px z-10" style={{ left: '75%', background: '#0ea5e9', opacity: 0.7 }} />
                    {/* Bar */}
                    {d.hasData ? (
                      <div className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                           style={{ width: `${d.score}%`, background: `linear-gradient(90deg, ${d.fill}cc, ${d.fill})` }}>
                        <div className="absolute inset-0 opacity-30"
                             style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 100%)' }} />
                      </div>
                    ) : (
                      <div className="h-full rounded-full" style={{ width: '4%', background: '#e2e8f0' }} />
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-3 pt-2" style={{ borderTop: '1px solid #f1f5f9' }}>
              <Legend swatch="#0369a1" label="Advanced" />
              <Legend swatch="#0284c7" label="Strong" />
              <Legend swatch="#0ea5e9" label="Possible" />
              <Legend swatch="#f59e0b" label="Foundational" />
              <Legend swatch="#dc2626" label="Not Ready" />
              <Legend swatch="#94a3b8" label="No Data" />
            </div>
          </div>

          {/* Emissions donut */}
          <div className="flex flex-col">
            <h3 className="text-[13px] font-bold text-slate-800 mb-2">GHG Emissions</h3>
            {donutData.length ? (
              <>
                <div className="flex-1 relative" style={{ minHeight: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        <linearGradient id="scope1Grad" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#0284c7" />
                          <stop offset="100%" stopColor="#0369a1" />
                        </linearGradient>
                        <linearGradient id="scope2Grad" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#38bdf8" />
                          <stop offset="100%" stopColor="#0ea5e9" />
                        </linearGradient>
                        <linearGradient id="scope3Grad" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#bae6fd" />
                          <stop offset="100%" stopColor="#7dd3fc" />
                        </linearGradient>
                      </defs>
                      <Pie
                        data={donutData}
                        cx="50%" cy="50%"
                        innerRadius={52} outerRadius={82}
                        dataKey="value"
                        stroke="white"
                        strokeWidth={2}
                        paddingAngle={4}
                        isAnimationActive={true}
                        animationBegin={200}
                        animationDuration={1200}>
                        <Cell fill="url(#scope1Grad)" />
                        <Cell fill="url(#scope2Grad)" />
                        <Cell fill="url(#scope3Grad)" />
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid #d2ecd7', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: '8px 12px' }}
                        formatter={(v, n) => [`${v.toLocaleString()} tCO₂e`, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Total</div>
                    <div className="text-3xl font-black text-slate-800">{emissions.totalTCO2e}</div>
                    <div className="text-[10px] text-slate-500">tCO₂e</div>
                  </div>
                </div>
                <Scope1BreakdownRow emissions={emissions} />
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/><path d="M9 10h.01M15 10h.01M9.5 15.5s1.5 2 3 0"/>
                </svg>
                <span className="text-sm">No emissions data</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CERTIFICATION CARDS */}
      <section className="bg-white rounded-2xl p-5" style={{ border: "1px solid #e8f0ec", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] font-bold text-slate-800">Certification Readiness</h2>
          <span className="text-[10px] text-slate-400">{(readiness.certifications || []).length} frameworks assessed</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(readiness.certifications || []).map((c) => {
            const isGood = c.colour === 'green-dark' || c.colour === 'green';
            const isAmber = c.colour === 'amber';
            const isRed = c.colour === 'red';
            // Change 3: replace red with pastel periwinkle/lavender
            const accent = isGood ? '#0284c7' : isAmber ? '#d97706' : c.colour === 'orange' ? '#ea580c' : isRed ? '#7c6bd6' : '#7c6bd6';
            const bg = isGood ? 'linear-gradient(135deg,#e0f2fe,#bae6fd)' : isAmber ? 'linear-gradient(135deg,#fefce8,#fef9c3)' : c.colour === 'orange' ? 'linear-gradient(135deg,#fff7ed,#ffedd5)' : isRed ? 'linear-gradient(135deg,#f3f0ff,#ede8ff)' : 'linear-gradient(135deg,#f3f0ff,#ede8ff)';
            const borderCol = isGood ? '#7dd3fc' : isAmber ? '#fde68a' : c.colour === 'orange' ? '#fed7aa' : isRed ? '#c4b5fd' : '#c4b5fd';
            const scoreWidth = `${Math.min(100, c.finalScore)}%`;
            return (
              <div key={c.framework}
                   className="rounded-2xl group transition-all duration-200 hover:-translate-y-1"
                   style={{ background: bg, border: `1px solid ${borderCol}`, boxShadow: `0 2px 8px ${accent}18` }}>
                {/* Score bar accent */}
                <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, ${accent}66)`, width: scoreWidth, transition: 'width 1s ease' }} />
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[12px] font-bold text-slate-800 leading-tight">{c.framework}</span>
                    <StatusBadge label={c.status} colour={c.colour} />
                  </div>
                  <div className="flex items-end gap-1 mb-2">
                    <span className="text-4xl font-black leading-none" style={{ color: accent }}>{c.finalScore}</span>
                    <span className="text-lg font-bold mb-1" style={{ color: accent + 'aa' }}>%</span>
                  </div>
                  {c.capped && (
                    <div className="flex items-center gap-1 text-[11px] font-medium text-amber-700 mb-1">
                      <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01"/>
                      </svg>
                      Capped — prerequisite missing
                    </div>
                  )}
                  <div className="text-[11px] text-slate-600">
                    <span className="text-slate-400">Timeline:</span> {c.timeline}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* REGULATORY */}
      <section className="bg-white rounded-2xl p-5" style={{ border: "1px solid #e8f0ec", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] font-bold text-slate-800">Regulatory Readiness</h2>
          <span className="text-[10px] text-slate-400">{(readiness.regulations || []).length} regulations assessed</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] min-w-[600px]">
            <thead>
              <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                {['Regulation', 'Readiness', 'Level', 'Risk', 'Notes'].map(h => (
                  <th key={h} className="pb-2.5 pr-4 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(readiness.regulations || []).map((r, i) => (
                <tr key={r.code}
                    className="group transition-colors"
                    style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
                  <td className="py-3 pr-4 font-semibold text-slate-800">{r.name}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
                        <div className="h-full rounded-full"
                             style={{ width: `${r.readinessPct}%`, background: r.readinessPct >= 75 ? '#0ea5e9' : r.readinessPct >= 50 ? '#f59e0b' : '#ef4444' }}/>
                      </div>
                      <span className="font-bold text-slate-700">{r.readinessPct}%</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{r.readinessLabel}</td>
                  <td className="py-3 pr-4"><StatusBadge label={r.riskLevel} colour={RISK_COLOUR(r.riskLevel)} /></td>
                  <td className="py-3 text-[11px] text-slate-500 max-w-[200px]">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* STRENGTHS + GAPS */}
      <section className="pdf-section grid grid-cols-2 gap-4">
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #bae6fd", boxShadow: "0 4px 20px rgba(14,165,233,0.08)" }}>
          <div className="px-5 py-3 flex items-center gap-2" style={{ background: 'linear-gradient(135deg,#e0f2fe,#bae6fd)', borderBottom: '1px solid #bae6fd' }}>
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: '#0284c7' }}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
              </svg>
            </div>
            <h2 className="text-[13px] font-bold text-sky-900">Operational Strengths</h2>
            <span className="ml-auto text-[10px] font-semibold text-sky-700">{readiness.strengths?.length || 0} identified</span>
          </div>
          <div className="bg-white p-5">
            {(() => {
              const tierOrder = { Strong: 0, Good: 1, Foundational: 2 };
              const tierColors = {
                Strong:      { bg: '#f0fdf4', border: '#86efac', text: '#14532d', label: 'STRONG PERFORMANCE' },
                Good:        { bg: '#f0f9ff', border: '#7dd3fc', text: '#0c4a6e', label: 'GOOD PERFORMANCE' },
                Foundational:{ bg: '#fefce8', border: '#fde047', text: '#713f12', label: 'FOUNDATIONAL STRENGTHS' },
              };
              const strengths = readiness.strengths || [];
              if (!strengths.length) return <p className="text-slate-400 italic text-sm">No standout strengths detected yet.</p>;
              const grouped = strengths.reduce((acc, s) => {
                const tier = s.strength || 'Good';
                if (!acc[tier]) acc[tier] = [];
                acc[tier].push(s);
                return acc;
              }, {});
              const orderedKeys = ['Strong', 'Good', 'Foundational'].filter(k => grouped[k]?.length);
              return orderedKeys.map(tier => (
                <div key={tier} className="mb-4 last:mb-0">
                  <div className="text-[10px] font-bold uppercase tracking-widest mb-2 px-2 py-1 rounded-md"
                       style={{ background: tierColors[tier].bg, color: tierColors[tier].text, border: `1px solid ${tierColors[tier].border}` }}>
                    {tierColors[tier].label}
                  </div>
                  <ul className="space-y-1.5">
                    {grouped[tier].map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12px] py-1.5 px-2 rounded-lg" style={{ background: '#f8fafc' }}>
                        <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: tierColors[tier].border }} />
                        <span className="text-slate-700 leading-relaxed">{s.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ));
            })()}
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #fca5a5", boxShadow: "0 4px 20px rgba(239,68,68,0.08)" }}>
          <div className="px-5 py-3 flex items-center gap-2" style={{ background: 'linear-gradient(135deg,#fef2f2,#fee2e2)', borderBottom: '1px solid #fca5a5' }}>
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: '#dc2626' }}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
              </svg>
            </div>
            <h2 className="text-[13px] font-bold text-red-900">Critical Gaps</h2>
            <span className="ml-auto text-[10px] font-semibold text-red-700">{readiness.gaps?.length || 0} found</span>
          </div>
          <div className="bg-white p-5">
            {(() => {
              const severityOrder = { Low: 0, Medium: 1, High: 2 };
              const severityColors = { Low: { bg: '#fef9c3', border: '#fde047', text: '#854d0e', label: 'LOW PRIORITY GAPS' }, Medium: { bg: '#fff7ed', border: '#fdba74', text: '#9a3412', label: 'MEDIUM PRIORITY GAPS' }, High: { bg: '#fef2f2', border: '#fca5a5', text: '#7f1d1d', label: 'HIGH PRIORITY GAPS' } };
              const sorted = [...(readiness.gaps || [])].sort((a, b) => (severityOrder[a.severity] ?? 0) - (severityOrder[b.severity] ?? 0));
              const grouped = sorted.reduce((acc, g) => { const s = g.severity || 'High'; if (!acc[s]) acc[s] = []; acc[s].push(g); return acc; }, {});
              const orderedKeys = ['Low', 'Medium', 'High'].filter(k => grouped[k]?.length);
              if (!orderedKeys.length) return <p className="text-slate-400 italic text-sm">No critical gaps detected.</p>;
              return orderedKeys.map(sev => (
                <div key={sev} className="mb-4 last:mb-0">
                  <div className="text-[10px] font-bold uppercase tracking-widest mb-2 px-2 py-1 rounded-md" style={{ background: severityColors[sev].bg, color: severityColors[sev].text, border: `1px solid ${severityColors[sev].border}` }}>
                    {severityColors[sev].label}
                  </div>
                  <ul className="space-y-1.5">
                    {grouped[sev].map((g, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12px] py-1.5 px-2 rounded-lg" style={{ background: '#f8fafc' }}>
                        <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: severityColors[sev].border }} />
                        <span className="text-slate-700 leading-relaxed">{g.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ));
            })()}
          </div>
        </div>
      </section>

      {/* ROADMAP TIMELINE */}
      <section className="bg-white rounded-2xl p-5" style={{ border: "1px solid #e8f0ec", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
               style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)' }}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
          </div>
          <h2 className="text-[14px] font-bold text-slate-800">Priority Action Roadmap</h2>
        </div>
        <Timeline buckets={readiness.roadmap || {}} />
      </section>

      {/* EXECUTIVE SUMMARY */}
      <section className="pdf-section rounded-2xl overflow-hidden" style={{ border: '1px solid #bae6fd', boxShadow: '0 4px 20px rgba(14,165,233,0.08)' }}>
        <div className="px-5 py-3 flex items-center gap-2"
             style={{ background: 'linear-gradient(135deg,#0B1D2E,#0f3460)', borderBottom: '1px solid #1E3A52' }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
          </svg>
          <h2 className="text-[13px] font-bold text-white">Executive Summary</h2>
        </div>
        <div className="p-5" style={{ background: 'linear-gradient(135deg,#e0f2fe,#f8fafc)' }}>
          <p className="text-slate-700 leading-relaxed text-[13px]">{readiness.executiveSummary}</p>
        </div>
      </section>
    </>
  );
}); // end memo(Dashboard)

// ── Readiness gauge (SVG arc) ──────────────────────────────────────────────
const ReadinessGauge = memo(function ReadinessGauge({ score, label }) {
  const clamped = Math.max(0, Math.min(100, score || 0));
  const radius = 78, stroke = 13;
  const circumference = Math.PI * radius;
  const dash = (clamped / 100) * circumference;
  const colour = clamped >= 90 ? '#0369a1' : clamped >= 75 ? '#0284c7' : clamped >= 60 ? '#0ea5e9' : clamped >= 40 ? '#f59e0b' : '#dc2626';

  return (
    <div className="inline-flex flex-col items-center">
      <div className="relative w-64 h-44">
        <svg viewBox="0 0 200 110" className="w-full h-full">
          <defs>
            <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <path d="M20,102 A80,80 0 0,1 180,102" stroke="#f1f5f9" strokeWidth={stroke + 2} fill="none" strokeLinecap="round" />
          {[25, 50, 75].map(pct => {
            const angle = Math.PI * (pct / 100);
            const x1 = 100 - 80 * Math.cos(angle);
            const y1 = 102 - 80 * Math.sin(angle);
            const x2 = 100 - 70 * Math.cos(angle);
            const y2 = 102 - 70 * Math.sin(angle);
            return <line key={pct} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"/>;
          })}
          <path
            d="M20,102 A80,80 0 0,1 180,102"
            stroke={colour}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            filter="url(#gaugeGlow)"
            style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1), stroke 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-4">
          <div className="text-3xl font-black leading-none" style={{ color: colour }}>{clamped}</div>
          <div className="text-base font-bold -mt-1" style={{ color: colour + 'aa' }}>%</div>
          <div className="text-[11px] text-slate-400 mt-1 uppercase tracking-wider">Overall Readiness</div>
        </div>
      </div>
      <div className="text-[13px] font-bold mt-1 px-3 py-1 rounded-full"
           style={{ color: colour, background: colour + '18', border: `1px solid ${colour}44` }}>
        {label}
      </div>
    </div>
  );
}); // end memo(ReadinessGauge)

const Legend = memo(function Legend({ swatch, label }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-slate-600">
      <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: swatch }} />{label}
    </span>
  );
}); // end memo(Legend)

const ConfidenceBadge = memo(function ConfidenceBadge({ avg, months }) {
  const label = avg >= 95 ? 'High Confidence' : avg >= 80 ? 'Medium Confidence' : avg >= 60 ? 'Low Confidence' : 'Limited';
  const col = avg >= 95 ? 'green' : avg >= 80 ? 'amber' : 'orange';
  return (
    <div className="flex flex-col items-center gap-0.5">
      <StatusBadge label={`${avg}% · ${label}`} colour={col} />
      {months > 0 && months < 12 && (
        <span className="text-[10px] text-amber-700">Estimated — based on {months} month(s)</span>
      )}
    </div>
  );
}); // end memo(ConfidenceBadge)

// ── Scope 1 breakdown row with inline popover ────────────────────────────────
function Scope1BreakdownRow({ emissions }) {
  const [showAll, setShowAll] = useState(false);
  const popoverRef = useRef(null);
  const scope1 = emissions?.scope1 || {};
  const scope2 = emissions?.scope2 || {};
  const scope3 = emissions?.scope3 || {};
  const donutData = [
    { name: 'Scope 1', value: scope1?.tCO2e || 0, fill: '#0369a1' },
    { name: 'Scope 2', value: scope2?.tCO2e || 0, fill: '#0ea5e9' },
    { name: 'Scope 3', value: scope3?.tCO2e || 0, fill: '#7dd3fc' },
  ].filter(d => d.value > 0);
  const breakdown = scope1?.breakdown || [];
  const hasBreakdown = breakdown.length > 0;
  const totalScope1 = scope1?.tCO2e || 0;

  // Outside-click dismiss
  useEffect(() => {
    if (!showAll) return;
    const handle = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) setShowAll(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showAll]);

  // ESC dismiss
  useEffect(() => {
    if (!showAll) return;
    const onKey = (e) => { if (e.key === 'Escape') setShowAll(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showAll]);

  const popAccent = '#0369a1';
  const popBorder = '#93c5fd';
  const popBg     = 'rgba(191,219,254,0.35)';
  const popBarHex = '#60a5fa';

  return (
    <div className="flex justify-center gap-3 mt-2 pt-2 flex-wrap" style={{ borderTop: '1px solid #f1f5f9' }}>
      {donutData.map((d) => {
        const isClickableScope1 = d.name === 'Scope 1' && hasBreakdown;

        if (isClickableScope1) {
          // Scope 1 item — same visual layout as Scope 2 / Scope 3,
          // but the whole item is the popover trigger.
          return (
            <div key={d.name} className="relative" ref={popoverRef}>
              <button
                onClick={() => setShowAll((v) => !v)}
                className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-slate-800 transition-colors active:scale-95"
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.fill }} />
                <div>
                  <div className="font-semibold text-slate-700 flex items-center gap-0.5">
                    {d.name}
                    <span style={{ fontSize: '8px', color: popAccent, marginLeft: '2px' }}>
                      {showAll ? '▲' : '▾'}
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-400">{d.value.toLocaleString()} t</div>
                </div>
              </button>

              {/* Inline popover — identical to original, no backdrop */}
              {showAll && (
                <div style={{
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
                      {breakdown.length} source{breakdown.length !== 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={() => setShowAll(false)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M18 6L6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                  {/* Breakdown items */}
                  {breakdown.map((b, i) => {
                    const rowPct = totalScope1 > 0 ? (b.tCO2e / totalScope1) * 100 : 0;
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
        }

        // Scope 2 and Scope 3 — plain legend items, same style as before
        return (
          <div key={d.name} className="flex items-center gap-1.5 text-[11px] text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.fill }} />
            <div>
              <div className="font-semibold text-slate-700">{d.name}</div>
              <div className="text-[9px] text-slate-400">{d.value.toLocaleString()} t</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Single bucket column with its own inline popover ─────────────────────────
function BucketColumn({ bucketKey, colour, items, maxVisible }) {
  const [showAll, setShowAll] = useState(false);
  const popoverRef = useRef(null);
  const hasItems = items.length > 0;
  const overflow = items.length - maxVisible;

  // Outside-click dismiss
  useEffect(() => {
    if (!showAll) return;
    const handle = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) setShowAll(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showAll]);

  // ESC dismiss
  useEffect(() => {
    if (!showAll) return;
    const onKey = (e) => { if (e.key === 'Escape') setShowAll(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showAll]);

  return (
    <div className="relative">
      <div className="flex flex-col items-center mb-3">
        <div className="relative z-10 w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-transform hover:scale-110"
             style={{
               background: hasItems ? colour : '#f1f5f9',
               color: hasItems ? '#fff' : '#94a3b8',
               border: `2px solid ${hasItems ? colour : '#e2e8f0'}`,
               boxShadow: hasItems ? `0 0 12px ${colour}44` : 'none',
             }}>
          {items.length || '0'}
        </div>
        <div className="text-[11px] font-bold text-slate-700 mt-1.5 text-center leading-tight">{bucketKey}</div>
      </div>
      <ul className="space-y-1.5">
        {items.length === 0 && (
          <li className="rounded-xl p-2.5 text-center"
              style={{ background: '#f8fafc', border: '1px dashed #e2e8f0' }}>
            <div className="text-[10px] text-slate-400 italic">Pending assessment data</div>
          </li>
        )}
        {items.slice(0, maxVisible).map((it, i) => (
          <li key={i} className="rounded-xl p-2.5 transition-all hover:-translate-y-0.5"
              style={{ background: colour + '0c', border: `1px solid ${colour}22` }}>
            <div className="text-[11px] font-semibold text-slate-800 leading-snug">{it.action}</div>
            <div className="text-[10px] mt-0.5" style={{ color: colour + 'cc' }}>{it.impact}</div>
          </li>
        ))}
        {overflow > 0 && (
          <li style={{ position: 'relative' }} ref={popoverRef}>
            {/* Toggle button */}
            <button
              onClick={() => setShowAll((v) => !v)}
              className="mt-1 text-[10px] font-bold px-2.5 py-1 rounded-full transition-all hover:opacity-80 active:scale-95 flex items-center gap-1"
              style={{ background: colour + '22', color: colour, border: `1px solid ${colour}44` }}>
              +{overflow} more {showAll ? '▲' : '↗'}
            </button>

            {/* Inline popover — no backdrop */}
            {showAll && (
              <div style={{
                position: 'absolute',
                bottom: 'calc(100% + 5px)',
                left: 0,
                zIndex: 40,
                width: '248px',
                maxHeight: '212px',
                overflowY: 'auto',
                background: '#ffffff',
                border: `1px solid ${colour}44`,
                borderRadius: '12px',
                boxShadow: `0 8px 28px rgba(0,0,0,0.12), 0 2px 8px ${colour}1a`,
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
                  <span style={{ fontSize: '10px', fontWeight: '700', color: colour, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {overflow} more action{overflow !== 1 ? 's' : ''}
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
                {items.slice(maxVisible).map((it, i) => (
                  <div key={i} style={{ padding: '5px 12px', borderBottom: '1px solid #f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px', marginBottom: '3px' }}>
                      <span style={{ fontSize: '11px', color: '#475569', flex: 1, lineHeight: 1.35 }}>{it.action}</span>
                    </div>
                    {it.impact && (
                      <div style={{ fontSize: '10px', color: colour + 'cc', marginBottom: '3px' }}>{it.impact}</div>
                    )}
                    <div style={{ height: '3px', background: '#f1f5f9', borderRadius: '100px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: '55%', background: colour, borderRadius: '100px', opacity: 0.5 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </li>
        )}
      </ul>
    </div>
  );
}

const BUCKET_ORDER   = ['Immediate', '0–3 Months', '3–6 Months', '6–12 Months', '12+ Months'];
const BUCKET_COLOURS = ['#dc2626', '#ea580c', '#f59e0b', '#0ea5e9', '#0369a1'];
const MAX_VISIBLE    = 4;

// ── Timeline with per-bucket inline popovers ──────────────────────────────────
const Timeline = memo(function Timeline({ buckets }) {

  return (
    <div className="relative">
      <div className="hidden md:block absolute top-[18px] left-10 right-10 h-0.5"
           style={{ background: 'linear-gradient(90deg, #dc2626, #ea580c, #f59e0b, #0ea5e9, #0369a1)' }} />
      <div className="grid grid-cols-5 gap-3 relative">
        {BUCKET_ORDER.map((key, idx) => (
          <BucketColumn
            key={key}
            bucketKey={key}
            colour={BUCKET_COLOURS[idx]}
            items={buckets[key] || []}
            maxVisible={MAX_VISIBLE}
          />
        ))}
      </div>
    </div>
  );
}); // end memo(Timeline)
