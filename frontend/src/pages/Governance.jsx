// Governance Questionnaire — regulatory compliance checklist (India ESG frameworks)
// Sections: Policy/BRSR · Electricity/Energy · Water · Refrigerants · Fuel · Transport · Waste
// Score shown at the bottom only. Nothing pre-selected on load.

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api.js';

/* ─── Section & question definitions ─────────────────────────────────────── */
const SECTIONS = [
  {
    id: 'electricity',
    label: 'Electricity & Energy',
    framework: 'Energy Conservation Act 2001 (Amended 2022) · BEE · PAT Scheme',
    colour: '#d97706',
    lightBg: '#fffbeb',
    borderColour: '#fde68a',
    iconD: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
    questions: [
      { field: 'energyMonitoringSystem',      text: 'Is the facility registered with the Bureau of Energy Efficiency (BEE) as a Designated Consumer (DC) under the Energy Conservation Act, 2001 (if threshold is met)?', ref: 'Energy Conservation Act 2001, Section 14' },
      { field: 'monthlyUtilityReview',        text: 'Are energy consumption records maintained and reported in the prescribed format as per the Energy Conservation (Amendment) Act, 2022?', ref: 'EC Amendment Act 2022' },
      { field: 'monthlyUtilityReviewRecords', text: 'Has the organisation conducted or commissioned a mandatory energy audit through a BEE-accredited energy auditor (if applicable under EC Act)?', ref: 'Energy Conservation Act 2001, Section 16' },
      { field: 'iaqMonitoring',               text: 'Does the facility comply with the Perform, Achieve & Trade (PAT) scheme obligations or renewable energy procurement norms under the EC Amendment Act, 2022?', ref: 'EC Amendment Act 2022 · PAT Scheme' },
    ],
  },
  {
    id: 'water',
    label: 'Water',
    framework: 'Water (Prevention & Control of Pollution) Act 1974 · CPCB · CGWB',
    colour: '#0284c7',
    lightBg: '#f0f9ff',
    borderColour: '#bae6fd',
    iconD: 'M12 2.69l5.66 5.66a8 8 0 11-11.31 0z',
    questions: [
      { field: 'stpAvailable',   text: 'Does the organisation hold a valid Consent to Operate (CTO) under the Water (Prevention & Control of Pollution) Act, 1974 from the State Pollution Control Board?', ref: 'Water Act 1974, Section 25' },
      { field: 'stpOperational', text: 'Is the treated effluent / wastewater discharge compliant with CPCB / SPCB prescribed standards and discharge limits?', ref: 'Water Act 1974 · EPA 1986 Schedule VI' },
      { field: 'leakageMonitoring', text: 'Has the organisation obtained a No Objection Certificate (NOC) from CGWB / SPCB for groundwater extraction, if groundwater sources are used?', ref: 'CGWB Regulation 2017 · NGT Order' },
    ],
  },
  {
    id: 'refrigerants',
    label: 'Refrigerants',
    framework: 'ODS (Regulation & Control) Rules 2000 · India HPMP · CPCB',
    colour: '#06b6d4',
    lightBg: '#ecfeff',
    borderColour: '#a5f3fc',
    iconD: 'M12 2v20M4.93 4.93l14.14 14.14M2 12h20M4.93 19.07L19.07 4.93',
    questions: [
      { field: 'chemicalInventory',      text: 'Does the organisation maintain a refrigerant inventory log (type, quantity, top-ups, leaks) as required under the Ozone Depleting Substances (Regulation & Control) Rules, 2000?', ref: 'ODS Rules 2000' },
      { field: 'materialDeclarations',   text: "Is the organisation complying with India's HCFC Phase-Out Management Plan (HPMP) by transitioning away from HCFC-22 (R-22) refrigerants?", ref: 'MoEFCC HPMP · Montreal Protocol' },
      { field: 'restrictedSubstanceTests', text: 'Is refrigerant handling, recovery, and disposal performed by certified technicians in accordance with CPCB guidelines and ODS Rules?', ref: 'ODS Rules 2000 · CPCB Guidelines' },
    ],
  },
  {
    id: 'fuel',
    label: 'Fuel',
    framework: 'Air (Prevention & Control of Pollution) Act 1981 · CPCB-IV+ Norms · EPA 1986',
    colour: '#dc2626',
    lightBg: '#fef2f2',
    borderColour: '#fecaca',
    iconD: 'M17.66 11.2c-.23-.3-.51-.56-.77-.82-.67-.6-1.43-1.03-2.07-1.66C13.33 7.26 13 4.85 13.95 3c-1 .23-1.97.8-2.72 1.7-.65.8-1.06 1.74-1.18 2.7-.09.69-.08 1.38.04 2.06-.07-.06-.14-.13-.21-.21-.33-.37-.59-.8-.75-1.27C8.96 7.57 9 6.14 9.63 5c-1.1.53-2.02 1.46-2.55 2.67-.42.98-.56 2.04-.44 3.08-.37-.61-.62-1.3-.72-2.04-.07-.6-.01-1.21.15-1.78C4.42 8.22 3 10.4 3 12.77a9 9 0 0018 0c0-3.31-2.13-6.19-3.34-1.57z',
    questions: [
      { field: 'sustainabilityPolicyUploaded', text: 'Do all DG sets installed at the facility comply with CPCB-IV+ (or applicable CPCB-II/III) emission norms under the Air (Prevention & Control of Pollution) Act, 1981?', ref: 'Air Act 1981 · CPCB DG Norms' },
      { field: 'esgOwnerFormallyAssigned',     text: 'Does the organisation hold a valid Consent to Operate (CTO) under the Air Act from the SPCB for DG sets, boilers, or other emission-generating equipment?', ref: 'Air Act 1981, Section 21' },
      { field: 'wastewaterTesting',            text: 'Are stack emission monitoring reports for DG sets / boilers submitted to the SPCB at the prescribed frequency as mandated under the Air Act?', ref: 'Air Act 1981 · EPA Schedule' },
    ],
  },
  {
    id: 'transport',
    label: 'Transport',
    framework: 'Central Motor Vehicles Rules 1989 · BS-VI Norms · BRSR Principle 6',
    colour: '#7c3aed',
    lightBg: '#f5f3ff',
    borderColour: '#ddd6fe',
    iconD: 'M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM18.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
    questions: [
      { field: 'internalAuditsWithin12Mo', text: "Do all organisation-owned or leased vehicles comply with Bharat Stage VI (BS-VI) emission norms under the Central Motor Vehicles Rules, 1989?", ref: 'CMVR 1989 · MoRTH BS-VI Notification' },
      { field: 'complianceRegisterUploaded', text: "Are valid Pollution Under Control (PUC) certificates maintained and current for all vehicles in the organisation's fleet?", ref: 'Motor Vehicles Act 1988, Section 115' },
      { field: 'trainingRecords',           text: 'Does the organisation track and disclose Scope 3 transport-related GHG emissions as required under BRSR Principle 6 (environmental responsibility)?', ref: 'SEBI BRSR Principle 6' },
    ],
  },
  {
    id: 'waste',
    label: 'Waste',
    framework: 'SWM Rules 2016 · HWM Rules 2016 · BMW Rules 2016 · CPCB',
    colour: '#64748b',
    lightBg: '#f8fafc',
    borderColour: '#e2e8f0',
    iconD: 'M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2',
    questions: [
      { field: 'wasteAllCategoriesTracked',  text: 'Does the organisation comply with the Solid Waste Management Rules, 2016 — including source segregation, colour-coded bins, and authorised disposal channels?', ref: 'SWM Rules 2016, Rule 4' },
      { field: 'wasteTotalTracked',          text: 'Is hazardous waste disposed exclusively through CPCB-authorised vendors as mandated by the Hazardous & Other Wastes (Management & Transboundary Movement) Rules, 2016?', ref: 'HWM Rules 2016, Rule 20' },
      { field: 'hazardousHandlingDocumented', text: 'Does the organisation hold a valid SPCB authorisation for hazardous waste generation, storage, and disposal as required under HWM Rules, 2016?', ref: 'HWM Rules 2016, Rule 6' },
      { field: 'wasteAuditRecords',          text: 'Has the organisation filed the annual hazardous waste return (Form 4) with the SPCB within the prescribed timeline?', ref: 'HWM Rules 2016, Rule 22' },
      { field: 'cpcbVendor',                 text: 'Is biomedical / clinical waste managed and disposed through CPCB-authorised Common Bio-Medical Waste Treatment Facilities (CBMWTFs) as per the Biomedical Waste Management Rules, 2016 (if applicable)?', ref: 'BMW Rules 2016, Rule 4' },
    ],
  },
];

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const ALL_FIELDS = SECTIONS.flatMap(s => s.questions.map(q => q.field));

const GOV_SCORE_FIELDS = ALL_FIELDS;

function computeScore(answers) {
  const answered = GOV_SCORE_FIELDS.filter(f => typeof answers[f] === 'boolean').length;
  const yes      = GOV_SCORE_FIELDS.filter(f => answers[f] === true).length;
  if (answered === 0) return { pct: null, answered: 0, yes: 0, total: GOV_SCORE_FIELDS.length };
  return { pct: yes / GOV_SCORE_FIELDS.length, answered, yes, total: GOV_SCORE_FIELDS.length };
}

/* ─── YesNoToggle ─────────────────────────────────────────────────────────── */
function YesNoToggle({ value, onChange }) {
  return (
    <div className="flex gap-2 shrink-0">
      {[true, false].map(v => (
        <button
          key={String(v)}
          onClick={() => onChange(value === v ? null : v)}
          className={
            'px-4 py-1.5 rounded-xl text-[12px] font-medium border transition-all duration-150 ' +
            (value === v
              ? v
                ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                : 'bg-red-400 border-red-400 text-white shadow-sm'
              : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-800')
          }
        >
          {v ? 'Yes' : 'No'}
        </button>
      ))}
    </div>
  );
}

/* ─── ScoreSummary (bottom card) ─────────────────────────────────────────── */
function ScoreSummary({ answers }) {
  const { pct, answered, yes, total } = computeScore(answers);

  const colour   = pct === null ? '#94a3b8' : pct >= 0.6 ? '#0284c7' : pct >= 0.3 ? '#d97706' : '#ef4444';
  const bgClass  = pct === null
    ? 'bg-slate-50 border-slate-200'
    : pct >= 0.6 ? 'bg-sky-50 border-sky-200'
    : pct >= 0.3 ? 'bg-amber-50 border-amber-200'
    : 'bg-red-50 border-red-200';
  const label    = pct === null ? 'Not Filled' : pct >= 0.6 ? 'Good' : pct >= 0.3 ? 'Partial' : 'Low';
  const scoreNum = pct === null ? '—' : Math.round(pct * 100);

  const breakdown = SECTIONS.map(s => {
    const fields   = s.questions.map(q => q.field).filter(f => GOV_SCORE_FIELDS.includes(f));
    const secYes   = fields.filter(f => answers[f] === true).length;
    const secTotal = fields.length;
    const unanswered = fields.filter(f => typeof answers[f] !== 'boolean').length;
    return { ...s, secYes, secTotal, unanswered };
  }).filter(s => s.secTotal > 0);

  return (
    <div className={'rounded-2xl border p-5 ' + bgClass} style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-bold text-slate-800 text-[15px]">Governance Regulatory Readiness Score</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Based on {total} India ESG regulatory compliance indicators across all categories
          </p>
        </div>
        <div className="text-right shrink-0 ml-4">
          <div className="text-[26px] font-bold leading-none" style={{ color: colour }}>
            {scoreNum}
            {pct !== null && <span className="text-[14px] font-medium text-slate-400">/100</span>}
          </div>
          <div className="text-[11px] font-semibold mt-1" style={{ color: colour }}>{label}</div>
          {pct !== null && (
            <div className="text-[10px] text-slate-400">{yes} of {total} compliant</div>
          )}
        </div>
      </div>

      {pct !== null && (
        <div className="h-2.5 rounded-full bg-white/70 overflow-hidden mb-4 border border-white">
          <div className="h-full rounded-full transition-all duration-700"
               style={{ width: (Math.round(pct * 100)) + '%', background: colour }} />
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {breakdown.map(s => {
          const sPct = s.secTotal > 0 ? s.secYes / s.secTotal : 0;
          const sCol = sPct >= 0.6 ? '#0284c7' : sPct >= 0.3 ? '#d97706' : '#ef4444';
          return (
            <div key={s.id} className="bg-white/80 rounded-xl px-3 py-2.5 border border-white">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-slate-700">{s.label}</span>
                <span className="text-[11px] font-bold" style={{ color: s.unanswered > 0 ? '#94a3b8' : sCol }}>
                  {s.unanswered > 0 ? (s.unanswered + ' left') : (s.secYes + '/' + s.secTotal)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                     style={{ width: (Math.round(sPct * 100)) + '%', background: sCol }} />
              </div>
            </div>
          );
        })}
      </div>

      {pct === null && (
        <p className="text-[12px] text-slate-400 italic text-center mt-2">
          Answer the questions above to generate your regulatory readiness score
        </p>
      )}
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────────────── */
export default function Governance() {
  const { id } = useParams();
  const [answers, setAnswers] = useState({});
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    async function load() {
      try {
        const r   = await api.get('/assessments/' + id);
        const gov = r.data && r.data.governance ? r.data.governance : {};
        const init = {};
        for (const f of ALL_FIELDS) {
          if (typeof gov[f] === 'boolean') init[f] = gov[f];
        }
        setAnswers(init);
      } catch (e) {
        setError('Unable to load your saved answers. Please refresh the page to try again.');
      } finally { setLoading(false); }
    }
    load();
  }, [id]);

  const handleChange = useCallback((field, value) => {
    setAnswers(prev => {
      const next = Object.assign({}, prev);
      if (value === null) delete next[field];
      else next[field] = value;
      return next;
    });
    setSaved(false);
  }, []);

  async function handleSave() {
    setSaving(true); setError('');
    try {
      await api.patch('/assessments/' + id, { governance: answers });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(!navigator.onLine ? 'You appear to be offline. Reconnect and try saving again.' : 'Your answers could not be saved. Please try again.');
    } finally { setSaving(false); }
  }

  if (loading) return (
    <div className="min-h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 40%, #e8f4fd 70%, #dbeafe 100%)' }}>
      <div className="text-[13px]" style={{ color: '#0369a1' }}>Loading questionnaire...</div>
    </div>
  );

  const totalQ    = ALL_FIELDS.length;
  const answeredQ = ALL_FIELDS.filter(f => typeof answers[f] === 'boolean').length;

  return (
    <div className="min-h-full pb-12" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 40%, #e8f4fd 70%, #dbeafe 100%)', position: 'relative', overflow: 'hidden' }}>
      {/* Ambient orbs */}
      <div style={{ position: 'fixed', top: '-60px', right: '-60px', width: '380px', height: '380px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.13) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '80px', left: '40px', width: '280px', height: '280px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,233,0.09) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', opacity: 0.04, pointerEvents: 'none', zIndex: 0 }}>
        <defs><pattern id="gov-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0ea5e9" strokeWidth="1"/></pattern></defs>
        <rect width="100%" height="100%" fill="url(#gov-grid)" />
      </svg>

      <div className="sticky top-0 z-10 px-6 pt-5 pb-4 no-print"
           style={{ background: 'rgba(224,242,254,0.98)', borderBottom: '1px solid rgba(186,230,255,0.6)' }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full inline-block mb-1"
                  style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc' }}>Governance</span>
            <h1 className="text-[17px] font-bold tracking-tight" style={{ color: '#0c4a6e' }}>Governance Questionnaire</h1>
            <p className="text-[11px] mt-0.5" style={{ color: '#64748b' }}>
              India ESG regulatory compliance — Energy Conservation Act · Water Act · ODS Rules · Air Act · Motor Vehicles Act · SWM/HWM Rules
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[11px]" style={{ color: '#64748b' }}>{answeredQ}/{totalQ} answered</span>
            {error && <span className="text-[11px] text-red-500">{error}</span>}
            {saved && <span className="text-[11px] font-medium" style={{ color: '#059669' }}>Saved</span>}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-[12px] font-semibold text-white transition-all"
              style={{ background: saving ? '#94a3b8' : 'linear-gradient(135deg,#0369a1,#0284c7,#0ea5e9)', boxShadow: saving ? 'none' : '0 4px 12px rgba(3,105,161,0.3)' }}
            >
              {saving ? 'Saving...' : 'Save Answers'}
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 pt-5 space-y-4" style={{ position: 'relative', zIndex: 1 }}>

        {SECTIONS.map(section => {
          const answeredInSection = section.questions.filter(q => typeof answers[q.field] === 'boolean').length;
          const yesInSection      = section.questions.filter(q => answers[q.field] === true).length;
          return (
            <div key={section.id} className="bg-white rounded-2xl overflow-hidden"
                 style={{ border: '1px solid ' + section.borderColour, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <div className="px-5 py-3.5 flex items-start justify-between gap-3"
                   style={{ background: section.lightBg, borderBottom: '1px solid ' + section.borderColour }}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                       style={{ background: section.colour }}>
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#fff"
                         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d={section.iconD} />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-slate-800">{section.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{section.framework}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[12px] font-bold" style={{ color: section.colour }}>
                    {answeredInSection}/{section.questions.length}
                  </div>
                  <div className="text-[10px] text-slate-400">{yesInSection} yes</div>
                </div>
              </div>

              <div className="divide-y divide-slate-50/80">
                {section.questions.map((q, i) => {
                  const val = typeof answers[q.field] === 'boolean' ? answers[q.field] : null;
                  return (
                    <div key={q.field}
                         className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-slate-300 mt-0.5 shrink-0 w-5 text-right">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] text-slate-700 leading-relaxed">{q.text}</p>
                          <p className="text-[10px] text-slate-400 mt-1 font-medium">{q.ref}</p>
                        </div>
                      </div>
                      <YesNoToggle value={val} onChange={(v) => handleChange(q.field, v)} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <ScoreSummary answers={answers} />

      </div>
    </div>
  );
}
