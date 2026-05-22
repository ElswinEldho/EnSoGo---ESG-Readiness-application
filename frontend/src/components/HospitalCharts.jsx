/**
 * HospitalCharts.jsx
 *
 * Recharts-dependent chart components for HospitalKpiDashboard.
 * Isolated in this file so recharts (1,235 KiB) is NOT in the static
 * dependency chain of HospitalKpiDashboard.jsx — it is only downloaded
 * when these chart components are actually rendered.
 *
 * All component logic is preserved exactly as originally written.
 */

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

// Scope colours (kept local — avoids a cross-file import of the C palette)
const SCOPE1 = '#f97316';
const SCOPE2 = '#3b82f6';
const SCOPE3 = '#8b5cf6';
const TEAL   = '#0d9488';

// ─── Donut Chart ──────────────────────────────────────────────────────────────
export function EmissionsDonut({ scope1, scope2, scope3, total }) {
  const data = [
    { name: 'Scope 1 – Direct',       value: scope1?.tCO2e || 0, color: SCOPE1 },
    { name: 'Scope 2 – Grid Energy',  value: scope2?.tCO2e || 0, color: SCOPE2 },
    { name: 'Scope 3 – Value Chain',  value: scope3?.tCO2e || 0, color: SCOPE3 },
  ].filter((d) => d.value > 0);

  if (!data.length) return <div className="text-xs text-slate-400 text-center py-4">No emissions data</div>;

  return (
    <div>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value">
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
          <Tooltip formatter={(v) => [`${v} tCO₂e`, '']} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-1.5 mt-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color }} />
              <span className="text-[10px] text-slate-600">{d.name}</span>
            </div>
            <span className="text-[10px] font-bold text-slate-700">{d.value} t</span>
          </div>
        ))}
      </div>
      {total > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between text-[10px]">
          <span className="text-slate-500 font-medium">Total</span>
          <span className="font-bold text-slate-800">{total} tCO₂e/yr</span>
        </div>
      )}
    </div>
  );
}

// ─── Monthly Electricity Trend ────────────────────────────────────────────────
export function ElectricityTrend({ data }) {
  if (!data || data.length < 2)
    return <div className="text-xs text-slate-400 text-center py-4">Monthly data unavailable (need ≥ 2 months)</div>;
  return (
    <ResponsiveContainer width="100%" height={150}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v) => [`${v.toLocaleString()} kWh`, 'Electricity']} />
        <Bar dataKey="kwh" fill={TEAL} radius={[3, 3, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Water Source Pie ─────────────────────────────────────────────────────────
const WATER_COLORS = ['#3b82f6', '#0d9488', '#8b5cf6', '#64748b'];
export function WaterSourceChart({ sources }) {
  if (!sources || sources.length === 0)
    return <div className="text-xs text-slate-400 text-center py-4">No water source data</div>;
  return (
    <div>
      <ResponsiveContainer width="100%" height={150}>
        <PieChart>
          <Pie data={sources} dataKey="kl" nameKey="name" cx="50%" cy="50%" outerRadius={60} paddingAngle={2}>
            {sources.map((_, i) => <Cell key={i} fill={WATER_COLORS[i % WATER_COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v) => [`${v.toLocaleString()} kL`, '']} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-1 mt-1">
        {sources.map((s, i) => (
          <div key={s.name} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: WATER_COLORS[i % WATER_COLORS.length] }} />
              <span className="text-[9px] text-slate-600">{s.name}</span>
            </div>
            <span className="text-[9px] font-semibold text-slate-700">{s.kl.toLocaleString()} kL</span>
          </div>
        ))}
      </div>
    </div>
  );
}
