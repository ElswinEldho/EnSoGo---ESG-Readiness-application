// Data Load page — redesigned with new design system

import { useEffect, useRef, useState, memo, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { useUpload } from '../lib/uploadContext.jsx';
import { sectorName } from '../lib/sectors.js';
import { formatDate } from '../constants/index.js';

const CATEGORIES = [
  { key: 'electricity',  label: 'Electricity',  unit: 'kWh',    desc: 'Monthly bills, meter readings',
    icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z' },
  { key: 'water',        label: 'Water',        unit: 'KL',     desc: 'Municipal, tanker, borewell',
    icon: 'M12 2.69l5.66 5.66a8 8 0 11-11.31 0z' },
  { key: 'fuel',         label: 'Fuel',    unit: 'Litres', desc: 'Diesel, PNG / CNG',
    icon: 'M3 22V8l9-6 9 6v14H3zM9 22V12h6v10' },
  { key: 'waste',        label: 'Waste',        unit: 'kg',     desc: 'Wet, dry, hazardous, biomedical',
    icon: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6' },
  { key: 'refrigerants', label: 'Refrigerants', unit: 'kg',     desc: 'R-22, R-410A, R-32 — monthly top-up / leak',
    icon: 'M12 2v20M4.93 4.93l14.14 14.14M2 12h20M4.93 19.07l14.14-14.14' },
  { key: 'transport',    label: 'Transport',    unit: 't-km',   desc: 'Fleet & cargo logistics',
    icon: 'M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM18.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3z' },
];

const CAT_COLOURS = {
  electricity: '#f59e0b', water: '#3b82f6', fuel: '#ef4444',
  waste: '#8b5cf6', refrigerants: '#06b6d4', transport: '#10b981',
};

/** Returns the human-readable label for a category key. */
const catLabel = (key) => CATEGORIES.find((c) => c.key === key)?.label || key;

// Supplementary data fields that live inside Electricity and Water cards.
// These map to assessment.extras and feed the cross-category consistency checks.
const CARD_EXTRAS_CONFIG = {
  electricity: {
    key: 'renewableKwh',
    label: 'Renewable Energy',
    unit: 'kWh',
    hint: 'Must be ≤ total electricity kWh',
  },
  water: {
    key: 'reusedKl',
    label: 'Reused / STP Water',
    unit: 'KL',
    hint: 'Must be ≤ total water KL',
  },
};

const STRICT_MONTH_MAP = {
  january:1,jan:1,february:2,feb:2,march:3,mar:3,april:4,apr:4,may:5,june:6,jun:6,
  july:7,jul:7,august:8,aug:8,september:9,sept:9,october:10,oct:10,november:11,nov:11,december:12,dec:12,
};
function parseMonthStrict(raw) {
  if (!raw && raw !== 0) return { value: null, invalid: false };
  const str = String(raw).trim();
  if (!str) return { value: null, invalid: false };
  const n = STRICT_MONTH_MAP[str.toLowerCase()];
  if (n !== undefined) return { value: n, invalid: false };
  return { value: null, invalid: true };
}
function parseYearStrict(raw) {
  if (!raw && raw !== 0) return { value: null, invalid: false };
  const str = String(raw).trim();
  if (!str) return { value: null, invalid: false };
  if (/^\d{4}$/.test(str)) {
    const n = parseInt(str, 10);
    if (n >= 1000 && n <= 9999) return { value: n, invalid: false };
  }
  return { value: null, invalid: true };
}

// ── Modal: validation popup ───────────────────────────────────────────────────
const PopupModal = memo(function PopupModal({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#fef2f2' }}>
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#ef4444" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800 mb-1">Validation Error</div>
            <p className="text-sm text-slate-600">{message}</p>
          </div>
        </div>
        <button className="w-full py-2 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)' }} onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
}); // end memo(PopupModal)

// ── Helpers: strict numeric check for calculation fields ─────────────────────
// Returns true only for strings that represent a finite number (integer or decimal).
// Empty / null / undefined → valid (blank row, will be skipped).
function isValidNumeric(v) {
  if (v === '' || v == null) return true;
  const s = String(v).trim();
  if (!s) return true;
  return /^[+-]?\d*\.?\d+([eE][+-]?\d+)?$/.test(s) && Number.isFinite(parseFloat(s));
}

// ── Modal: manual entry — editable table ─────────────────────────────────────
function ManualModal({ cat, onClose, onSave, showToast }) {
  const nextId = useRef(1);
  const mkRow  = () => ({ id: nextId.current++, month: '', year: '', value: '' });
  const [rows, setRows]             = useState(() => [mkRow(), mkRow(), mkRow()]);
  const [valueErrors, setValueErrors] = useState({}); // { [rowId]: true }

  if (!cat) return null;
  const colour = CAT_COLOURS[cat.key] || '#0ea5e9';
  const hasInvalid = Object.keys(valueErrors).length > 0;

  function updateRow(id, field, val) {
    setRows((r) => r.map((row) => row.id === id ? { ...row, [field]: val } : row));
    if (field === 'value') {
      if (val !== '' && !isValidNumeric(val)) {
        setValueErrors((e) => ({ ...e, [id]: true }));
        showToast('Invalid data entered');
      } else {
        setValueErrors((e) => { const n = { ...e }; delete n[id]; return n; });
      }
    }
  }

  function addRow() { setRows((r) => [...r, mkRow()]); }

  function removeRow(id) {
    setRows((r) => r.filter((row) => row.id !== id));
    setValueErrors((e) => { const n = { ...e }; delete n[id]; return n; });
  }

  function handleSave() {
    // Re-validate all non-empty value cells before submitting
    const errs = {};
    rows.forEach((row) => { if (row.value !== '' && !isValidNumeric(row.value)) errs[row.id] = true; });
    if (Object.keys(errs).length) { setValueErrors(errs); showToast('Invalid data entered'); return; }
    const filled = rows.filter((r) => r.month || r.year || r.value);
    if (!filled.length) { showToast('Please enter at least one row of data.'); return; }
    onSave(filled);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
         style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-lg mx-4 flex flex-col"
           style={{ maxHeight: '85vh' }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
               style={{ background: colour + '22' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={colour} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={cat.icon} />
            </svg>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800">Manual Entry — {cat.label}</div>
            <div className="text-xs text-slate-500">One row per month. <span className="font-semibold">Value must be numeric.</span></div>
          </div>
          <button className="ml-auto text-slate-400 hover:text-slate-600" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Editable table */}
        <div className="overflow-y-auto flex-1 mb-3">
          <table className="w-full text-[12px] border-collapse">
            <thead className="sticky top-0 bg-white z-10">
              <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                <th className="text-left pb-2 pr-2 font-semibold text-slate-500 text-[11px] w-[36%]">Month</th>
                <th className="text-left pb-2 pr-2 font-semibold text-slate-500 text-[11px] w-[24%]">Year</th>
                <th className="text-left pb-2 pr-2 font-semibold text-slate-500 text-[11px] w-[32%]">
                  Value <span style={{ color: colour }}>({cat.unit})</span>
                </th>
                <th className="pb-2 w-8"/>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const valErr = !!valueErrors[row.id];
                return (
                  <tr key={row.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td className="py-1 pr-2">
                      <input
                        className="w-full rounded-lg border px-2 py-1.5 text-[12px] focus:outline-none"
                        style={{ borderColor: '#e2e8f0' }}
                        onFocus={(e) => { e.target.style.borderColor = colour; e.target.style.boxShadow = `0 0 0 1.5px ${colour}55`; }}
                        onBlur={(e)  => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                        placeholder="January"
                        value={row.month}
                        onChange={(e) => updateRow(row.id, 'month', e.target.value)}
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        className="w-full rounded-lg border px-2 py-1.5 text-[12px] focus:outline-none"
                        style={{ borderColor: '#e2e8f0' }}
                        onFocus={(e) => { e.target.style.borderColor = colour; e.target.style.boxShadow = `0 0 0 1.5px ${colour}55`; }}
                        onBlur={(e)  => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                        placeholder="2024"
                        value={row.year}
                        onChange={(e) => updateRow(row.id, 'year', e.target.value)}
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <input
                        className="w-full rounded-lg border px-2 py-1.5 text-[12px] font-mono focus:outline-none"
                        style={{
                          borderColor: valErr ? '#ef4444' : '#e2e8f0',
                          background:  valErr ? '#fef2f2' : '#fff',
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = valErr ? '#ef4444' : colour;
                          e.target.style.boxShadow   = valErr ? '0 0 0 1.5px #ef444455' : `0 0 0 1.5px ${colour}55`;
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = valErr ? '#ef4444' : '#e2e8f0';
                          e.target.style.boxShadow   = 'none';
                        }}
                        placeholder="0"
                        value={row.value}
                        onChange={(e) => updateRow(row.id, 'value', e.target.value)}
                      />
                    </td>
                    <td className="py-1 pl-1 text-center">
                      <button
                        className="w-5 h-5 flex items-center justify-center rounded text-slate-300 hover:text-red-400 transition-colors"
                        onClick={() => removeRow(row.id)}>
                        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <button
            className="mt-2 ml-0.5 flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: colour, background: colour + '0f', border: `1px dashed ${colour}55` }}
            onClick={addRow}>
            <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Add row
          </button>
        </div>

        {/* Validation banner */}
        {hasInvalid && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] mb-3 shrink-0"
               style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
            </svg>
            <span>Value fields highlighted in red contain non-numeric data. Correct them before saving.</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 shrink-0">
          <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                  onClick={onClose}>
            Cancel
          </button>
          <button
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: hasInvalid ? '#cbd5e1' : 'linear-gradient(135deg,#0ea5e9,#0369a1)', cursor: hasInvalid ? 'not-allowed' : 'pointer' }}
            onClick={handleSave}>
            Save {cat.label}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Category card ─────────────────────────────────────────────────────────────
const CategoryCard = memo(function CategoryCard({ cat, months, onFile, onManual, onClear, onDownload }) {
  const [hovered, setHovered] = useState(false);
  const colour = CAT_COLOURS[cat.key] || '#0ea5e9';
  const pct = Math.min(100, Math.round((months / 12) * 100));
  const statusLabel = months >= 12 ? 'Complete' : months >= 6 ? 'Sufficient' : months > 0 ? 'Partial' : 'No Data';
  const statusColour = months >= 12 ? '#0ea5e9' : months >= 6 ? '#f59e0b' : months > 0 ? '#f97316' : '#94a3b8';
  const statusBg = months >= 12 ? '#f0f9ff' : months >= 6 ? '#fefce8' : months > 0 ? '#fff7ed' : '#f8fafc';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-2xl flex flex-col overflow-hidden"
      style={{
        background: '#ffffff',
        border: `1px solid ${hovered ? colour + '55' : 'rgba(186,230,253,0.55)'}`,
        boxShadow: hovered
          ? `0 8px 30px ${colour}22, 0 2px 8px rgba(0,0,0,0.06)`
          : '0 2px 8px rgba(0,0,0,0.05)',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
      }}>
      {/* Colour accent bar */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${colour}, ${colour}88)` }} />

      {/* Content — flex-1 so it fills the CSS-grid cell height, enabling mt-auto below */}
      <div className="p-4 flex flex-col flex-1 gap-3">

        {/* ── Header row ── */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative"
                 style={{
                   background: `linear-gradient(135deg, ${colour}22, ${colour}11)`,
                   border: `1px solid ${colour}33`,
                   boxShadow: hovered ? `0 0 12px ${colour}44` : 'none',
                   transition: 'box-shadow 0.3s ease',
                 }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={colour} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                   style={{ transform: hovered ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.25s ease' }}>
                <path d={cat.icon} />
              </svg>
            </div>
            <div>
              <div className="text-[13px] font-bold text-slate-800">{cat.label}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{cat.desc}</div>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5"
                style={{ background: statusBg, color: statusColour, border: `1px solid ${statusColour}44` }}>
            {statusLabel}
          </span>
        </div>

        {/* ── Coverage progress ── */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] text-slate-400">Coverage</span>
            <span className="text-[11px] font-bold" style={{ color: colour }}>{months}/12 mo</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
            <div className="h-full rounded-full relative overflow-hidden"
                 style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${colour}, ${colour}bb)`, transition: 'width 0.6s ease' }}>
              <div className="absolute inset-0 opacity-40"
                   style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
                            animation: 'shimmer 2s infinite', backgroundSize: '200% 100%' }} />
            </div>
          </div>
        </div>

        {/* ── Meta info ── */}
        <div className="flex items-center justify-between -mt-1">
          <span className="text-[10px] text-slate-400">
            Unit: <span className="font-semibold text-slate-500">{cat.unit}</span> · XLSX · CSV · PDF
          </span>
          <button className="flex items-center gap-1 text-[10px] font-medium transition-colors"
                  style={{ color: hovered ? colour : '#94a3b8' }}
                  onClick={() => onDownload(cat.key, cat.label)}>
            <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Template
          </button>
        </div>

        {/* ── Action area — mt-auto pins this block to the card bottom ── */}
        <div className="mt-auto flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center justify-center gap-1.5 rounded-xl text-[12px] font-semibold cursor-pointer transition-all relative overflow-hidden py-2"
                   style={{ background: `linear-gradient(135deg, ${colour}, ${colour}cc)`, color: '#fff',
                            boxShadow: hovered ? `0 4px 12px ${colour}55` : `0 2px 6px ${colour}33` }}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
              Upload
              <input type="file" className="hidden" accept=".csv,.xlsx,.xls,.xlsm,.pdf"
                     onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onFile(cat.key, f); }} />
            </label>
            <button className="flex items-center justify-center rounded-xl text-[12px] font-semibold transition-all py-2"
                    style={{ border: `1px solid ${colour}44`, color: colour, background: `${colour}0a` }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = `${colour}18`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = `${colour}0a`; }}
                    onClick={() => onManual(cat)}>
              Manual Entry
            </button>
          </div>

          {months > 0 && (
            <button className="text-[11px] font-medium py-0.5 flex items-center gap-1 mx-auto transition-colors"
                    style={{ color: '#ef4444' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#b91c1c'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                    onClick={() => onClear(cat.key)}>
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
              </svg>
              Clear data ({months} months)
            </button>
          )}
        </div>

      </div>
    </div>
  );
}); // end memo(CategoryCard)

// ── Supplementary data panel ──────────────────────────────────────────────────
const SUPP_FIELDS = [
  {
    catKey: 'electricity',
    key: 'renewableKwh',
    label: 'Renewable Energy',
    unit: 'kWh',
    hint: 'Must be ≤ total electricity kWh',
    icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  },
  {
    catKey: 'water',
    key: 'reusedKl',
    label: 'Reused / STP Water',
    unit: 'KL',
    hint: 'Must be ≤ total water KL',
    icon: 'M12 2.69l5.66 5.66a8 8 0 11-11.31 0z',
  },
];

function SupplementaryDataSection({ extras, onExtrasChange, invalidExtras }) {
  return (
    <div className="rounded-2xl p-4 mb-5"
         style={{ background: '#ffffff', border: '1px solid rgba(186,230,253,0.6)', boxShadow: '0 4px 24px rgba(3,105,161,0.08)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
             style={{ background: 'linear-gradient(135deg,#e0f2fe,#bae6fd)' }}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#0369a1" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
          </svg>
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Supplementary Data</div>
          <div className="text-[10px] text-slate-400">Cross-category consistency fields — saved automatically</div>
        </div>
      </div>

      {/* Two field cards side by side */}
      <div className="grid grid-cols-2 gap-4">
        {SUPP_FIELDS.map((field) => {
          const colour  = CAT_COLOURS[field.catKey];
          const val     = extras?.[field.key] ?? '';
          const isInvalid = invalidExtras?.has(field.key);
          return (
            <div key={field.key} className="rounded-xl p-3"
                 style={{
                   background: isInvalid ? '#fef2f2' : `${colour}07`,
                   border: `1px solid ${isInvalid ? '#fecaca' : colour + '28'}`,
                   transition: 'background 0.2s, border-color 0.2s',
                 }}>
              {/* Field header */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                     style={{ background: `${colour}22`, border: `1px solid ${colour}33` }}>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke={colour} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={field.icon} />
                  </svg>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-700">{field.label}</div>
                  <div className="text-[9px] text-slate-400 capitalize">{field.catKey}</div>
                </div>
              </div>

              {/* Input row — type="text" so we can detect non-numeric pastes */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  className="flex-1 min-w-0 rounded-lg border px-3 py-1.5 text-[12px] font-mono focus:outline-none"
                  style={{
                    borderColor: isInvalid ? '#ef4444' : `${colour}55`,
                    background:  isInvalid ? '#fff5f5' : '#ffffff',
                    boxShadow:   'none',
                  }}
                  onFocus={(e) => { e.target.style.boxShadow = isInvalid ? '0 0 0 1.5px #ef444488' : `0 0 0 1.5px ${colour}88`; }}
                  onBlur={(e)  => { e.target.style.boxShadow = 'none'; }}
                  value={val}
                  onChange={(e) => onExtrasChange(field.key, e.target.value)}
                  placeholder="0"
                />
                <span className="text-[11px] font-semibold shrink-0" style={{ color: isInvalid ? '#ef4444' : colour }}>
                  {field.unit}
                </span>
              </div>

              {/* Hint / error */}
              {isInvalid
                ? <p className="text-[9px] font-semibold mt-1.5 leading-tight" style={{ color: '#dc2626' }}>⚠ Must be a numeric value</p>
                : <p className="text-[9px] text-slate-400 mt-1.5 leading-tight">{field.hint}</p>
              }
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Completeness panel ────────────────────────────────────────────────────────
const CompletenessPanel = memo(function CompletenessPanel({ doc }) {
  // useMemo: expensive Set-based month deduplication only re-runs when doc changes
  const { totalMonths, loaded } = useMemo(() => {
    let total = 0, cats = 0;
    for (const c of CATEGORIES) {
      const months = new Set((doc?.records?.[c.key] || []).map((r) => `${r.year}-${r.month}`)).size;
      total += Math.min(12, months);
      if (months > 0) cats++;
    }
    return { totalMonths: total, loaded: cats };
  }, [doc?.records]);
  const maxMonths = CATEGORIES.length * 12;
  const pct = Math.round((totalMonths / maxMonths) * 100);
  const gaugeColour = pct >= 80 ? '#0ea5e9' : pct >= 50 ? '#f59e0b' : pct > 0 ? '#f97316' : '#e2e8f0';
  const r = 34, circ = 2 * Math.PI * r;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl overflow-hidden"
           style={{ background: '#ffffff', border: '1px solid rgba(186,230,253,0.7)', boxShadow: '0 4px 20px rgba(3,105,161,0.10)' }}>
        <div className="px-4 pt-4 pb-1">
          <div className="text-[9px] font-bold uppercase tracking-[0.15em] mb-3" style={{ color: '#38bdf8' }}>Data Completeness</div>
          {/* Donut */}
          <div className="flex items-center justify-center mb-2">
            <div className="relative w-28 h-28">
              <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                <circle cx="40" cy="40" r={r} fill="none" stroke="#bae6fd" strokeWidth="7"/>
                <circle cx="40" cy="40" r={r} fill="none" stroke={gaugeColour} strokeWidth="7"
                  strokeDasharray={circ}
                  strokeDashoffset={circ * (1 - pct / 100)}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1), stroke 0.5s ease' }}/>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-800">{pct}%</span>
                <span className="text-[9px] font-medium text-slate-400">complete</span>
              </div>
            </div>
          </div>
          <div className="text-center mb-3">
            <span className="text-[11px] font-semibold" style={{ color: gaugeColour }}>{loaded}/6 categories</span>
            <span className="text-[11px] text-slate-400 mx-1">·</span>
            <span className="text-[11px] text-slate-500">{totalMonths} months</span>
          </div>
        </div>

        {/* Per-category bars */}
        <div className="px-4 pb-4 space-y-2.5">
          {CATEGORIES.map((c) => {
            const months = new Set((doc?.records?.[c.key] || []).map((r) => `${r.year}-${r.month}`)).size;
            const cpct = Math.min(100, Math.round((months / 12) * 100));
            const colour = CAT_COLOURS[c.key];
            return (
              <div key={c.key}>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: colour }}/>
                    <span className="text-[11px] font-medium text-slate-600">{c.label}</span>
                  </div>
                  <span className="text-[10px] font-bold" style={{ color: months > 0 ? colour : '#94a3b8' }}>{months}/12</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#e0f2fe' }}>
                  <div className="h-full rounded-full" style={{ width: `${cpct}%`, background: `linear-gradient(90deg, ${colour}, ${colour}99)`, transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)' }}/>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recommendation hint */}
        <div className="mx-3 mb-3 p-2.5 rounded-xl" style={{ background: 'rgba(224,242,254,0.6)', border: '1px solid #bae6fd' }}>
          <p className="text-[10px] text-slate-500 leading-relaxed text-center">
            {pct === 0 ? 'Upload data to begin your assessment'
              : pct < 50 ? 'Upload more data for better accuracy'
              : pct < 80 ? '12 months recommended for full readiness'
              : 'Great coverage — ready for analysis'}
          </p>
        </div>
      </div>
    </div>
  );
}); // end memo(CompletenessPanel)

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DataLoad() {
  const { id } = useParams();
  const nav = useNavigate();
  const { setHasUpload } = useUpload();
  const [doc, setDoc]             = useState(null);
  const [uploads, setUploads]     = useState([]);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [busy, setBusy]           = useState(false);
  const [manualCat, setManualCat] = useState(null);
  const [popup, setPopup]         = useState(null);
  const [proceedError, setProceedError] = useState(false);
  const [askConfirm, confirmNode] = useConfirm();

  // Supplementary extras fields (cross-category consistency inputs)
  const [extras, setExtras]               = useState({});
  const [invalidExtras, setInvalidExtras] = useState(new Set());
  const extrasInitialized                 = useRef(false);
  const extrasSaveTimer                   = useRef(null);

  // Toast for "Invalid data entered" — auto-dismisses after 3 s
  const [toast, setToast]     = useState('');
  const toastTimer            = useRef(null);
  function showToast(msg) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3000);
  }

  const POPUP_ERRORS = new Set([
    'Enter correct month format',
    'Invalid year format. Data cannot be added.',
    'Different years cannot be uploaded together.',
    'Please use a valid month name (e.g. January, February).',
    'Please enter a valid 4-digit year (e.g. 2023).',
    'All data in one upload must be from the same year.',
  ]);
  const friendlyPopup = (msg) => {
    if (msg === 'Enter correct month format') return 'Please use a valid month name (e.g. January, February, March).';
    if (msg === 'Invalid year format. Data cannot be added.') return 'Please enter a valid 4-digit year (e.g. 2023).';
    if (msg === 'Different years cannot be uploaded together.') return 'All rows in one upload must be from the same year. Please split them into separate uploads.';
    return msg;
  };
  function handleError(msg) {
    if (POPUP_ERRORS.has(msg)) setPopup(friendlyPopup(msg)); else setError(msg);
  }

  // Client-side ID format guard — catches any malformed IDs before hitting the API.
  // IDs like "ENSOGO-undefine" (from the old generator bug) fail here immediately.
  const ENSOGO_ID_RE = /^ENSOGO-[A-Z2-9]{8}$/;

  async function load() {
    try {
      const r = await api.get(`/assessments/${id}`);
      setDoc(r.data);
      const u = await api.get(`/uploads/${id}`);
      setUploads(u.data);
      // Update upload context: check if any category has records
      const anyUploaded = CATEGORIES.some(c => (r.data?.records?.[c.key] || []).length > 0);
      setHasUpload(id, anyUploaded);
    } catch (err) {
      // Only handle the initial load (doc not yet set).
      // Post-upload reloads are handled by the caller's own try/catch.
      if (!doc) {
        // Redirect to dashboard — the assessment either doesn't exist or has a bad ID.
        // Using replace so the broken URL doesn't stay in browser history.
        nav('/', { replace: true });
      }
    }
  }
  useEffect(() => {
    // Validate ID format before even making an API call.
    // Old assessments created with a buggy generator may have IDs like "ENSOGO-undefine".
    if (!ENSOGO_ID_RE.test(id)) {
      nav('/', { replace: true });
      return;
    }
    load();
  }, [id]);

  // Initialise extras from doc on first successful load (don't re-init on re-loads
  // caused by file uploads so the user's in-progress edits are preserved).
  useEffect(() => {
    if (doc && !extrasInitialized.current) {
      const ex = doc.extras || {};
      const toInput = (v) => (v === 0 || v == null) ? '' : String(v);
      setExtras({
        renewableKwh: toInput(ex.renewableKwh),
        reusedKl:     toInput(ex.reusedKl),
      });
      extrasInitialized.current = true;
    }
  }, [doc]);

  function onExtrasChange(key, rawValue) {
    const newExtras = { ...extras, [key]: rawValue };
    setExtras(newExtras);

    // Validate: must be empty OR a finite positive number
    const valid = isValidNumeric(rawValue);
    const newInvalid = new Set(invalidExtras);
    if (!valid) {
      newInvalid.add(key);
      showToast('Invalid data entered');
    } else {
      newInvalid.delete(key);
    }
    setInvalidExtras(newInvalid);

    if (!valid) return; // Don't PATCH invalid values to the backend

    // Debounced PATCH — fires 800 ms after the last valid keystroke
    if (extrasSaveTimer.current) clearTimeout(extrasSaveTimer.current);
    extrasSaveTimer.current = setTimeout(async () => {
      const patchExtras = {};
      for (const [k, v] of Object.entries(newExtras)) {
        if (newInvalid.has(k)) continue; // skip any still-invalid fields
        const n = v === '' ? 0 : parseFloat(v);
        patchExtras[k] = Number.isFinite(n) ? n : 0;
      }
      try { await api.patch(`/assessments/${id}`, { extras: patchExtras }); }
      catch (_err) { /* silently ignore — server-side save is best-effort */ }
    }, 800);
  }

  const countMonths = (cat) =>
    new Set((doc?.records?.[cat] || []).map((r) => `${r.year}-${r.month}`)).size;

  async function onFile(cat, file) {
    setError(''); setSuccess('');
    if (countMonths(cat) > 0) {
      const ok = await askConfirm({
        title: `Replace ${cat} data?`,
        message: `Uploading replaces the ${countMonths(cat)} existing month(s) for ${cat}.`,
        confirmLabel: 'Replace', danger: true,
      });
      if (!ok) return;
    }
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await api.post(`/uploads/${id}/${cat}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSuccess(r.data.message || `${cat}: file accepted.`);
      setProceedError(false);
      await load();
    } catch (err) { handleError(err.response?.data?.error || `${catLabel(cat)}: File upload failed. Please check the file format and try again.`); }
  }

  async function submitManual(cat, rowObjects) {
    setError(''); setSuccess('');
    if (!rowObjects || !rowObjects.length) { setError(`${catLabel(cat)}: Please enter some data before saving.`); return; }

    let hasInvalidMonth = false, hasInvalidYear = false, hasInvalidValue = false;
    const rows = [];

    for (const r of rowObjects) {
      // Skip completely empty rows
      if (!r.month && !r.year && !r.value) continue;

      const mr = parseMonthStrict(r.month);
      const yr = parseYearStrict(r.year);
      const valueStr = String(r.value ?? '').trim();

      if (mr.invalid) { hasInvalidMonth = true; continue; }
      if (yr.invalid) { hasInvalidYear  = true; continue; }

      // Value must be a finite number — any non-numeric text is an error
      if (valueStr !== '') {
        if (!isValidNumeric(valueStr)) { hasInvalidValue = true; continue; }
        if (mr.value === null || yr.value === null) continue;
        rows.push({ month: mr.value, year: yr.value, value: parseFloat(valueStr) });
      }
      // Rows where value is blank are treated as incomplete and silently skipped
    }

    if (hasInvalidValue)  { setPopup('Invalid data entered'); return; }
    if (hasInvalidMonth)  { setPopup('Please use a valid month name (e.g. January, February, March).'); return; }
    if (hasInvalidYear)   { setPopup('Please enter a valid 4-digit year (e.g. 2023).'); return; }

    const yearSet = [...new Set(rows.map((r) => r.year))];
    if (yearSet.length > 1) { setPopup('All rows in one upload must be from the same year. Please split them into separate uploads.'); return; }
    if (!rows.length) { setError(`${catLabel(cat)}: No valid rows found. Each row needs a month name, 4-digit year, and a numeric value.`); return; }

    if (countMonths(cat) > 0) {
      const ok = await askConfirm({
        title: `Replace ${cat} data?`,
        message: `Saving will replace ${countMonths(cat)} existing month(s).`,
        confirmLabel: 'Replace', danger: true,
      });
      if (!ok) return;
    }
    try {
      const r = await api.post(`/uploads/${id}/${cat}/manual`, { rows });
      setSuccess(r.data.message || `Saved ${rows.length} row(s) for ${cat}.`);
      setManualCat(null);
      await load();
    } catch (err) { handleError(err.response?.data?.error || `${catLabel(cat)}: Data could not be saved. Please check your entries and try again.`); }
  }

  async function clearCategory(cat) {
    setError(''); setSuccess('');
    const ok = await askConfirm({
      title: `Clear ${cat} data?`,
      message: `Removes all ${countMonths(cat)} uploaded months for ${cat}.`,
      confirmLabel: 'Clear data', danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/uploads/${id}/${cat}`);
      setSuccess(`Cleared ${cat} data.`);
      await load();
    } catch (err) { setError(err.response?.data?.error || `${catLabel(cat)}: Could not clear this category. Please try again.`); }
  }

  async function clearAll() {
    setError(''); setSuccess('');
    const ok = await askConfirm({
      title: 'Clear ALL uploaded data?',
      message: 'Removes every category and all upload history. Cannot be undone.',
      confirmLabel: 'Clear everything', danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/uploads/${id}`);
      setSuccess('All data cleared.');
      await load();
    } catch (err) { setError(err.response?.data?.error || 'Could not clear all data. Please try again.'); }
  }

  async function saveAll() {
    setBusy(true); setError(''); setSuccess('');
    if (invalidExtras.size > 0) {
      setError('Please correct the invalid supplementary data fields (highlighted in red) before proceeding.');
      setBusy(false); return;
    }
    try {
      await api.post(`/assessments/${id}/summary`);
      nav(`/assessment/${id}/summary`);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not generate your summary. Please make sure all required data is uploaded and try again.');
    } finally { setBusy(false); }
  }

  async function downloadTemplate(cat, label) {
    try {
      const r = await api.get(`/uploads/templates/${cat}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `EnSoGo_${label.replace(/[^A-Za-z0-9]/g, '_')}_Template.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) { setError(err.response?.data?.error || `${label} template could not be downloaded. Please try again.`); }
  }

  if (!doc) return (
    <div className="flex items-center justify-center h-full" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 40%, #e8f4fd 70%, #dbeafe 100%)' }}>
      <div className="flex items-center gap-2 text-slate-400">
        <div className="w-5 h-5 border-2 border-slate-300 border-t-sky-500 rounded-full animate-spin"/>
        Loading…
      </div>
    </div>
  );

  return (
    // Outer div has NO overflow:hidden so position:sticky works against the
    // real scroll container (.flex-1.overflow-y-auto in AssessmentShell).
    <div className="min-h-full" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 40%, #e8f4fd 70%, #dbeafe 100%)', position: 'relative' }}>

      {/* Page header — sticky; must be a direct child of the non-overflow div */}
      <div className="no-print sticky top-0 z-10 px-6 pt-5 pb-4"
           style={{ background: 'rgba(224,242,254,0.95)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', boxShadow: '0 1px 12px rgba(3,105,161,0.10)' }}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                    style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc' }}>Step 1 of 3</span>
              <span className="text-[10px] text-slate-400">·</span>
              <span className="text-[10px] text-slate-400 font-medium">{sectorName(doc.sectorCode)}</span>
            </div>
            <h1 className="text-xl font-bold" style={{ color: '#0c4a6e' }}>Data Load</h1>
            <p className="text-[12px] text-slate-500 mt-0.5">Upload monthly operational data. Minimum 6 months required; 12 months recommended.</p>
          </div>
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all hover:opacity-90"
            style={{ border: '1px solid #fecaca', color: '#ef4444', background: '#fef2f2' }}
            onClick={clearAll}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
            </svg>
            Clear all
          </button>
        </div>

        {/* Toast messages */}
        {error && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-xl text-[12px]"
               style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
            </svg>
            {error}
          </div>
        )}
        {success && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-xl text-[12px]"
               style={{ background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0369a1' }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
            </svg>
            {success}
          </div>
        )}
      </div>

      {/* Inner wrapper — overflow:hidden here clips the decorative orbs without
          breaking the sticky header above */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Gradient bridge from sidebar */}
        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '80px', pointerEvents: 'none', zIndex: 0, background: 'linear-gradient(90deg, rgba(2,132,199,0.20) 0%, rgba(14,165,233,0.07) 60%, transparent 100%)' }} />
        {/* Ambient orbs */}
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '380px', height: '380px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.13) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', bottom: '80px', left: '40px', width: '280px', height: '280px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,233,0.09) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
        {/* Grid texture */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.04, pointerEvents: 'none', zIndex: 0 }}>
          <defs><pattern id="dl-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0ea5e9" strokeWidth="1"/></pattern></defs>
          <rect width="100%" height="100%" fill="url(#dl-grid)" />
        </svg>

      {/* Main layout: grid left + right panel */}
      <div className="px-6 pt-6 pb-6 flex gap-5 items-start" style={{ position: 'relative', zIndex: 1 }}>
        {/* Left: category cards */}
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-5">
            {CATEGORIES.map((c) => (
              <CategoryCard
                key={c.key}
                cat={c}
                months={countMonths(c.key)}
                onFile={onFile}
                onManual={(cat) => setManualCat(cat)}
                onClear={clearCategory}
                onDownload={downloadTemplate}
              />
            ))}
          </div>

          {/* Supplementary data */}
          <SupplementaryDataSection extras={extras} onExtrasChange={onExtrasChange} invalidExtras={invalidExtras} />

          {/* Recent uploads */}
          <div className="rounded-2xl p-4" style={{ background: '#ffffff', border: '1px solid rgba(186,230,253,0.6)', boxShadow: '0 4px 24px rgba(3,105,161,0.08)' }}>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">Recent Uploads</div>
            {uploads.length === 0 ? (
              <div className="text-[12px] text-slate-400 text-center py-4">No files uploaded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      {['File', 'Category', 'Months', 'Uploaded Time', 'Status'].map((h) => (
                        <th key={h} className="pb-2 text-left font-semibold text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {uploads.map((u) => {
                      const colour = u.status === 'Error' ? '#ef4444' : '#0ea5e9';
                      const bg = u.status === 'Error' ? '#fef2f2' : '#f0f9ff';
                      return (
                        <tr key={u._id} style={{ borderBottom: '1px solid #f8fafc' }}>
                          <td className="py-2 pr-3 font-medium text-slate-700 truncate max-w-[160px]">{u.fileName}</td>
                          <td className="py-2 pr-3 capitalize text-slate-600">{u.category}</td>
                          <td className="py-2 pr-3 text-slate-600">{u.monthsAdded?.length || 0}</td>
                          <td className="py-2 pr-3 text-slate-500 whitespace-nowrap">
                            <div>{formatDate(u.createdAt)}</div>
                            <div className="text-[10px] text-slate-400">{new Date(u.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          </td>
                          <td className="py-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                  style={{ background: bg, color: colour }}>
                              {u.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Proceed button */}
          {(() => {
            const anyUploaded = CATEGORIES.some(c => (doc?.records?.[c.key] || []).length > 0);
            return (
              <div className="flex flex-col items-end mt-4 gap-1.5">
                {proceedError && !anyUploaded && (
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" className="shrink-0">
                      <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                    </svg>
                    <span className="text-[11px] font-semibold" style={{ color: '#dc2626' }}>Please upload at least one data category before proceeding</span>
                  </div>
                )}
                {!anyUploaded && !proceedError && (
                  <p className="text-[11px] text-slate-400 italic">Upload at least one category to proceed</p>
                )}
                <button
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)', boxShadow: anyUploaded ? '0 4px 12px rgba(14,165,233,0.3)' : 'none' }}
                  onClick={() => { saveAll(); }} disabled={busy || !anyUploaded}>
                  {busy ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
                      Computing…
                    </>
                  ) : (
                    <>
                      Proceed to Summary
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </>
                  )}
                </button>
              </div>
            );
          })()}
        </div>

        {/* Right: completeness panel */}
        <div className="w-56 shrink-0">
          <CompletenessPanel doc={doc} />
        </div>
      </div>

      </div>{/* end inner overflow:hidden wrapper */}

      {confirmNode}
      <PopupModal message={popup} onClose={() => setPopup(null)} />
      <ManualModal cat={manualCat} onClose={() => setManualCat(null)} showToast={showToast}
                   onSave={(rows) => { submitManual(manualCat.key, rows); }} />

      {/* Global toast — "Invalid data entered" (auto-dismisses) */}
      {toast && (
        <div className="fixed top-5 right-5 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl text-[13px] font-semibold text-white shadow-xl pointer-events-none"
             style={{ background: '#ef4444', animation: 'slideInRight 0.2s ease' }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
          </svg>
          {toast}
        </div>
      )}
    </div>
  );
}
