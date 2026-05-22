/**
 * HospitalKpiDashboard.jsx
 * Full healthcare ESG analytics dashboard.
 * Renders only when sector === 'HOSP'.
 *
 * recharts chart components (EmissionsDonut, ElectricityTrend, WaterSourceChart)
 * are in HospitalCharts.jsx — lazy-loaded only when rendered, so recharts
 * (1,235 KiB) is NOT on this file's static dependency chain.
 * Formula rendering: inline SVG math — no KaTeX/MathJax needed.
 */

import { useState } from 'react';
// recharts is NOT statically imported here — the chart components that use it
// (EmissionsDonut, ElectricityTrend, WaterSourceChart) have been moved to
// HospitalCharts.jsx and are lazy-loaded only when rendered.  This removes
// recharts (1,235 KiB) from the static dependency chain of this file.

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  teal:    '#0d9488',
  tealLt:  '#ccfbf1',
  tealMid: '#5eead4',
  sky:     '#0ea5e9',
  skyLt:   '#e0f2fe',
  skyMid:  '#7dd3fc',
  rose:    '#e11d48',
  roseLt:  '#ffe4e6',
  amber:   '#d97706',
  amberLt: '#fef3c7',
  green:   '#059669',
  greenLt: '#d1fae5',
  slate:   '#334155',
  slate4:  '#64748b',
  slate2:  '#f1f5f9',
  white:   '#ffffff',
  scope1:  '#f97316',
  scope2:  '#3b82f6',
  scope3:  '#8b5cf6',
};

const STATUS_META = {
  Efficient:       { bg: C.greenLt, text: C.green,  icon: '✓', label: 'Efficient' },
  Acceptable:      { bg: C.amberLt, text: C.amber,  icon: '~', label: 'Acceptable' },
  'Needs Attention': { bg: C.roseLt,  text: C.rose,  icon: '!', label: 'Needs Attention' },
  'Above Benchmark': { bg: C.roseLt,  text: C.rose,  icon: '!', label: 'Above Benchmark' },
  'Within Benchmark': { bg: C.greenLt, text: C.green, icon: '✓', label: 'Within Benchmark' },
  High:            { bg: C.roseLt,  text: C.rose,  icon: '⚠', label: 'High' },
  Moderate:        { bg: C.amberLt, text: C.amber,  icon: '~', label: 'Moderate' },
  Low:             { bg: C.greenLt, text: C.green,  icon: '✓', label: 'Low' },
  'Slightly Below': { bg: C.amberLt, text: C.amber, icon: '~', label: 'Slightly Below' },
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] || { bg: '#f1f5f9', text: '#64748b', icon: '–', label: status || 'N/A' };
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
          style={{ background: m.bg, color: m.text, border: `1px solid ${m.text}33` }}>
      <span>{m.icon}</span>
      {m.label}
    </span>
  );
}

// ─── Formula Display ──────────────────────────────────────────────────────────
function FormulaBlock({ latex, numerator, denominator, result, unit }) {
  return (
    <div className="rounded-xl px-4 py-3 mt-2"
         style={{ background: 'rgba(13,148,136,0.06)', border: '1px solid rgba(13,148,136,0.18)' }}>
      <div className="text-[9px] font-bold uppercase tracking-widest text-teal-600 mb-1.5">Formula</div>
      <div className="font-mono text-[12px] text-slate-700 mb-2">{latex}</div>
      {(numerator !== undefined && denominator !== undefined) && (
        <div className="text-[11px] text-slate-500 mb-1">
          = <span className="font-semibold text-slate-700">{numerator?.toLocaleString()}</span>
          {' '}÷{' '}
          <span className="font-semibold text-slate-700">{denominator?.toLocaleString()}</span>
          {result !== null && result !== undefined && (
            <> = <span className="font-bold text-teal-700">{result} {unit}</span></>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Benchmark Progress Bar ───────────────────────────────────────────────────
function BenchmarkBar({ value, min, max, efficientMax, label, unit }) {
  if (value === null || value === undefined) return null;
  const scale = max * 1.3;
  const pct = Math.min(100, (value / scale) * 100);
  const ePct = (efficientMax / scale) * 100;
  const aPct = (max / scale) * 100;
  const isEfficient = value <= efficientMax;
  const isAcceptable = value > efficientMax && value <= max;
  const barColor = isEfficient ? C.green : isAcceptable ? C.amber : C.rose;

  return (
    <div>
      <div className="flex justify-between text-[9px] text-slate-400 mb-1">
        <span>{label}</span>
        <span>{value} {unit}</span>
      </div>
      <div className="relative h-2.5 rounded-full overflow-visible" style={{ background: '#e2e8f0' }}>
        {/* Zones */}
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${ePct}%`, background: `${C.green}33` }} />
        <div className="absolute inset-y-0 rounded-full"
             style={{ left: `${ePct}%`, width: `${aPct - ePct}%`, background: `${C.amber}33` }} />
        <div className="absolute inset-y-0 right-0 rounded-full"
             style={{ left: `${aPct}%`, background: `${C.rose}22` }} />
        {/* Value marker */}
        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-sm"
             style={{ left: `calc(${pct}% - 6px)`, background: barColor, zIndex: 2 }} />
        {/* Threshold ticks */}
        <div className="absolute top-0 bottom-0 w-px" style={{ left: `${ePct}%`, background: C.green, opacity: 0.6 }} />
        <div className="absolute top-0 bottom-0 w-px" style={{ left: `${aPct}%`, background: C.rose, opacity: 0.6 }} />
      </div>
      <div className="flex justify-between text-[8px] text-slate-400 mt-0.5">
        <span style={{ color: C.green }}>Efficient &lt;{efficientMax}</span>
        <span style={{ color: C.amber }}>Acceptable ≤{max}</span>
        <span style={{ color: C.rose }}>&gt;{max}</span>
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon, title, kpi, formulaLatex, confidence, benchmark }) {
  const [open, setOpen] = useState(false);
  const hasValue = kpi?.value !== null && kpi?.value !== undefined;

  const accentColor = {
    green: C.green, amber: C.amber, red: C.rose, blue: C.sky, grey: '#94a3b8',
  }[kpi?.colour] || '#94a3b8';

  return (
    <div className="rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
         style={{
           background: C.white,
           border: `1px solid ${accentColor}33`,
           boxShadow: `0 2px 12px ${accentColor}18, 0 1px 3px rgba(0,0,0,0.06)`,
         }}>
      {/* Top accent stripe */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${accentColor}, ${accentColor}55)` }} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
                 style={{ background: `${accentColor}15` }}>
              {icon}
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-700 leading-tight">{title}</div>
              {kpi?.unit && <div className="text-[9px] text-slate-400">{kpi.unit}</div>}
            </div>
          </div>
          {hasValue && <StatusBadge status={kpi.status} />}
        </div>

        {/* Value */}
        <div className="flex items-end gap-1 mb-3">
          <span className="text-3xl font-black leading-none" style={{ color: hasValue ? accentColor : '#cbd5e1' }}>
            {hasValue ? kpi.value : '—'}
          </span>
          {hasValue && kpi.unit && (
            <span className="text-[11px] font-semibold pb-1 leading-none" style={{ color: accentColor + 'bb' }}>
              {kpi.unit}
            </span>
          )}
        </div>

        {/* Formula button */}
        <button
          onClick={() => setOpen((p) => !p)}
          className="text-[9px] font-semibold flex items-center gap-1 mb-3 transition-opacity hover:opacity-80"
          style={{ color: accentColor }}>
          <span>{open ? '▾' : '▸'}</span>
          {open ? 'Hide formula' : 'Show formula & substitution'}
        </button>

        {/* Formula detail */}
        {open && (
          <FormulaBlock
            latex={formulaLatex}
            numerator={kpi?.rawNumerator}
            denominator={kpi?.rawDenominator}
            result={kpi?.value}
            unit={kpi?.unit}
          />
        )}

        {/* Benchmark row */}
        {kpi?.benchmarkText && (
          <div className="mt-3 text-[9px] text-slate-400 leading-relaxed border-t border-slate-100 pt-2">
            {kpi.benchmarkText}
          </div>
        )}

        {/* Benchmark bar (intensity KPIs) */}
        {benchmark && hasValue && (
          <div className="mt-3">
            <BenchmarkBar
              value={kpi.value}
              efficientMax={benchmark.efficientMax}
              min={benchmark.acceptableMin}
              max={benchmark.acceptableMax}
              label=""
              unit={kpi.unit}
            />
          </div>
        )}

        {/* Confidence pill */}
        {confidence && (
          <div className="mt-2 flex items-center gap-1">
            <div className="text-[9px] text-slate-400">Confidence:</div>
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: '#f1f5f9', color: '#475569' }}>
              {confidence}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Biomedical Waste Visual ──────────────────────────────────────────────────
function BiomedicalChart({ biomedical, recycled, total }) {
  const other = Math.max(0, total - biomedical - recycled);
  const data = [
    { name: 'Biomedical', value: biomedical, color: C.rose },
    { name: 'Recycled', value: recycled, color: C.green },
    { name: 'General', value: other, color: '#94a3b8' },
  ].filter((d) => d.value > 0);

  if (!data.length) return <div className="text-xs text-slate-400 text-center py-4">No waste data</div>;

  const totalVal = data.reduce((s, d) => s + d.value, 0);
  return (
    <div>
      {data.map((d) => {
        const pct = totalVal > 0 ? (d.value / totalVal) * 100 : 0;
        return (
          <div key={d.name} className="mb-2.5">
            <div className="flex justify-between text-[9px] mb-1">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-sm" style={{ background: d.color }} />
                <span className="text-slate-600">{d.name}</span>
              </div>
              <span className="font-semibold text-slate-700">{d.value.toLocaleString()} kg ({pct.toFixed(1)}%)</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-2 rounded-full transition-all duration-700"
                   style={{ width: `${pct}%`, background: d.color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Auto Insights ────────────────────────────────────────────────────────────
function generateInsights(kpis, emissions, hospitalExtras) {
  const insights = [];
  const ei = kpis?.energyIntensity;
  const wi = kpis?.waterIntensity;
  const rr = kpis?.recyclingRate;
  const bm = kpis?.biomedicalWasteRatio;
  const total = emissions?.totalTCO2e || 0;
  const area  = hospitalExtras?.builtUpAreaSqft || 0;

  if (ei?.value !== null && ei?.value !== undefined) {
    if (ei.colour === 'green') insights.push({ type: 'positive', msg: `Energy performance is within the IGBC Healthcare benchmark (< 15 kWh/sqft/yr). Current: ${ei.value} kWh/sqft/yr.` });
    else if (ei.colour === 'amber') insights.push({ type: 'warning', msg: `Energy intensity is in the acceptable range (15–22 kWh/sqft/yr). Targeting LED retrofits or HVAC tuning could push into efficient zone.` });
    else insights.push({ type: 'critical', msg: `Energy intensity (${ei.value} kWh/sqft/yr) is above the healthcare benchmark. Priority action: HVAC audit and LED conversion.` });
  }
  if (wi?.value !== null && wi?.value !== undefined) {
    if (wi.colour === 'green') insights.push({ type: 'positive', msg: `Water intensity is within healthcare benchmark (< 0.20 kL/sqft/yr). Efficient water management practices in place.` });
    else if (wi.colour === 'amber') insights.push({ type: 'warning', msg: `Water intensity is in the acceptable range. Review tanker dependency and explore STP-treated water reuse for flushing.` });
    else insights.push({ type: 'critical', msg: `Water intensity is above the healthcare benchmark (> 0.35 kL/sqft/yr). Immediate review of leakage, landscaping use, and RO/STP reuse is recommended.` });
  }
  if (rr?.value !== null && rr?.value !== undefined) {
    if (rr.value >= 60) insights.push({ type: 'positive', msg: `Recycling rate (${rr.value}%) meets the ≥ 60% IGBC Healthcare threshold. Strong waste diversion performance.` });
    else if (rr.value >= 40) insights.push({ type: 'warning', msg: `Recycling rate (${rr.value}%) is below the 60% benchmark. Waste segregation training and recycler empanelment recommended.` });
    else insights.push({ type: 'critical', msg: `Recycling rate (${rr.value}%) is critically below benchmark. Implement waste segregation at source and engage authorized recyclers.` });
  }
  if (bm?.value !== null && bm?.value !== undefined) {
    if (bm.value > 20) insights.push({ type: 'critical', msg: `Biomedical waste generation is high (${bm.value}% of total waste). CPCB Bio-Medical Waste Rules mandate CBWTF disposal — verify current compliance.` });
    else if (bm.value > 10) insights.push({ type: 'warning', msg: `Biomedical waste ratio (${bm.value}%) is moderate. Ensure CPCB-authorised vendor tracking and yellow/red bag segregation compliance.` });
    else insights.push({ type: 'positive', msg: `Biomedical waste ratio (${bm.value}%) is within the low range. Continue current segregation and CBWTF vendor practices.` });
  }
  if (total > 0 && area > 0) {
    const intensity = (total / area).toFixed(4);
    insights.push({ type: 'info', msg: `Total emissions intensity is ${intensity} tCO₂e/sqft/yr. Scope 2 (grid electricity) is typically the dominant source for hospitals — renewable energy procurement can significantly reduce this.` });
  }
  if ((hospitalExtras?.tankerKl || 0) > 0) {
    const tankerPct = ((hospitalExtras.tankerKl / (hospitalExtras.totalWaterKl || 1)) * 100).toFixed(1);
    if (parseFloat(tankerPct) > 20) insights.push({ type: 'warning', msg: `Tanker water dependency is ${tankerPct}% of total water use — above the 20% advisory threshold. Explore borewell/STP treated water to reduce costs and supply risk.` });
  }
  return insights;
}

// ─── Scope Card ───────────────────────────────────────────────────────────────
function ScopeStrip({ label, tCO2e, total, color, title, subtitle }) {
  const pct = total > 0 ? Math.min(100, (tCO2e / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
      <div className="w-14 shrink-0">
        <div className="text-[9px] font-bold uppercase" style={{ color }}>{label}</div>
        <div className="text-[9px] text-slate-400 truncate">{subtitle}</div>
      </div>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: `${color}22` }}>
        <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="text-[11px] font-bold text-slate-700 w-16 text-right shrink-0">
        {tCO2e} <span className="text-[9px] text-slate-400 font-normal">t</span>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function HospitalKpiDashboard({ kpis, emissions, hospitalExtras, confidence }) {
  if (!kpis) return null;

  const insights = generateInsights(kpis, emissions, hospitalExtras);
  const confLevel = (() => {
    const vals = Object.values(confidence?.perCategory || {}).filter(Boolean);
    if (!vals.length) return null;
    const pcts = vals.map((c) => (c.level === 'Full' ? 100 : c.level === 'Partial' ? 60 : 30));
    return Math.round(pcts.reduce((s, v) => s + v, 0) / pcts.length);
  })();

  const extras = hospitalExtras || {};

  return (
    <section style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Section Header */}
      <h2 className="font-semibold mb-3 text-slate-800">Healthcare KPI Analytics</h2>

      {/* ── Intensity KPI Cards only ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <KpiCard
          icon="⚡"
          title="Energy Intensity"
          kpi={kpis.energyIntensity}
          formulaLatex="Annual Electricity (kWh) ÷ Built-up Area (sqft)"
          confidence={confLevel ? `${confLevel}%` : null}
          benchmark={kpis.energyIntensity?.benchmark}
        />
        <KpiCard
          icon="💧"
          title="Water Intensity"
          kpi={kpis.waterIntensity}
          formulaLatex="Annual Water (kL) ÷ Built-up Area (sqft)"
          confidence={confLevel ? `${confLevel}%` : null}
          benchmark={kpis.waterIntensity?.benchmark}
        />
        <KpiCard
          icon="🌡️"
          title="Emissions Intensity"
          kpi={{
            value: emissions?.intensityTCO2ePerSqft || null,
            unit: 'tCO₂e/sqft/yr',
            label: 'Emissions Intensity',
            status: null,
            colour: 'blue',
            rawNumerator: emissions?.totalTCO2e,
            rawDenominator: extras?.builtUpAreaSqft,
            benchmarkText: 'Total tCO₂e ÷ Built-up Area — lower is better',
          }}
          formulaLatex="Total tCO₂e ÷ Built-up Area (sqft)"
          confidence={confLevel ? `${confLevel}%` : null}
          benchmark={null}
        />
      </div>
    </section>
  );
}
