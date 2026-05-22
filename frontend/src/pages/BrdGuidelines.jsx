// Guidelines — crisp reference for the five core areas.

const CARD = { background: '#fff', border: '1px solid #e8f0ec', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' };

const Section = ({ title, icon, children }) => (
  <section className="bg-white rounded-2xl p-5" style={CARD}>
    <div className="flex items-center gap-2.5 mb-4 pb-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
           style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)' }}>
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="white"
             strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
      </div>
      <h2 className="text-[13px] font-bold text-slate-800">{title}</h2>
    </div>
    {children}
  </section>
);

const Pill = ({ text, colour = 'slate' }) => {
  const c = {
    green:  'bg-emerald-100 text-emerald-700',
    amber:  'bg-amber-100   text-amber-700',
    red:    'bg-red-100     text-red-700',
    blue:   'bg-blue-100    text-blue-700',
    slate:  'bg-slate-100   text-slate-600',
    orange: 'bg-orange-100  text-orange-700',
    purple: 'bg-purple-100  text-purple-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${c[colour] || c.slate}`}>
      {text}
    </span>
  );
};

export default function Guidelines() {
  return (
    <div className="min-h-full" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 40%, #e8f4fd 70%, #dbeafe 100%)', position: 'relative' }}>
      {/* Ambient orbs */}
      <div style={{ position: 'fixed', top: '-60px', right: '-60px', width: '380px', height: '380px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.13) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '80px', left: '40px', width: '280px', height: '280px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,233,0.09) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', opacity: 0.04, pointerEvents: 'none', zIndex: 0 }}>
        <defs><pattern id="gl-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0ea5e9" strokeWidth="1"/></pattern></defs>
        <rect width="100%" height="100%" fill="url(#gl-grid)" />
      </svg>

      <div className="px-6 pt-6 pb-4" style={{ position: 'relative', zIndex: 1 }}>
        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full inline-block mb-1"
              style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc' }}>Reference</span>
        <h1 className="text-xl font-bold" style={{ color: '#0c4a6e' }}>Guidelines</h1>
        <p className="text-[12px] mt-0.5" style={{ color: '#64748b' }}>Upload rules, validation checks, annualization logic, regulations and emission methodology.</p>
      </div>

      <div className="px-6 pb-10 space-y-4" style={{ position: 'relative', zIndex: 1 }}>

        {/* 1. Data Upload Requirements */}
        <Section title="Data Upload Requirements" icon="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
            {[
              { cat: 'Electricity', unit: 'kWh',       col: '#f59e0b' },
              { cat: 'Water',       unit: 'KL',         col: '#3b82f6' },
              { cat: 'Fuel',        unit: 'Litres',     col: '#ef4444' },
              { cat: 'Waste',       unit: 'kg',         col: '#8b5cf6' },
              { cat: 'Refrigerants',unit: 'kg',          col: '#06b6d4' },
              { cat: 'Transport',   unit: 'Tonne-km',   col: '#10b981' },
            ].map(({ cat, unit, col }) => (
              <div key={cat} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-100 bg-slate-50">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: col }} />
                <div>
                  <div className="text-[11px] font-semibold text-slate-700">{cat}</div>
                  <div className="text-[10px] text-slate-400">{unit}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-slate-600 space-y-3 mt-1">
            <div className="flex gap-2"><span className="text-slate-400 shrink-0">·</span>Each row must include <strong>Month, Year, Value</strong> in the category's unit.</div>
            <div className="flex gap-2"><span className="text-slate-400 shrink-0">·</span>Mixed units within a category will fail unit consistency validation.</div>

            {/* Month format */}
            <div>
              <div className="font-semibold text-slate-700 mb-1.5">Month — accepted formats</div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                {[
                  ['Jan','January'],['Feb','February'],['Mar','March'],
                  ['Apr','April'],['May','May'],['Jun','June'],
                  ['Jul','July'],['Aug','August'],['Sep','September'],
                  ['Oct','October'],['Nov','November'],['Dec','December'],
                ].map(([short, full]) => (
                  <div key={short} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50">
                    <span className="text-[11px] font-bold text-emerald-700 w-7 shrink-0">{short}</span>
                    <span className="text-[10px] text-slate-400">{full}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Year format */}
            <div>
              <div className="font-semibold text-slate-700 mb-1.5">Year — accepted format</div>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-[11px]">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                  <span className="font-semibold text-emerald-700">YYYY</span>
                  <span className="text-slate-500">e.g. <strong>2024</strong></span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {['24','2024-25','Jan-2024'].map((ex) => (
                  <div key={ex} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-[11px]">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    <span className="font-semibold text-red-600">{ex}</span>
                    <span className="text-slate-400">invalid</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* 2. Annualization Rules */}
        <Section title="Annualization Rules" icon="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {[
              { range: '< 3 mo',  label: 'Insufficient', col: 'red',   mod: '—' },
              { range: '3–8 mo',  label: 'Estimated',    col: 'amber', mod: '0.70–0.85' },
              { range: '9–11 mo', label: 'Estimated',    col: 'blue',  mod: '0.92' },
              { range: '12 mo',   label: 'Actual',       col: 'green', mod: '1.00' },
            ].map(({ range, label, col, mod }) => (
              <div key={range} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-center">
                <div className="text-[12px] font-bold text-slate-800">{range}</div>
                <Pill text={label} colour={col} />
                <div className="text-[10px] text-slate-400 mt-1">Modifier: <strong className="text-slate-600">{mod}</strong></div>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-slate-600 space-y-1">
            <div className="flex gap-2"><span className="text-slate-400 shrink-0">·</span>Estimated annual = monthly average × 12. Actual = sum of all 12 months.</div>
            <div className="flex gap-2"><span className="text-slate-400 shrink-0">·</span>Duplicate month entries are <strong>summed</strong>, not averaged or dropped.</div>
          </div>
        </Section>

        {/* 3. Data Validation Checks */}
        <Section title="Data Validation Checks" icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z">
          <div className="space-y-2 mb-3">
            {[
              { check: 'Negative Values',         blocker: true,  rule: 'Any value < 0 fails.', note: 'Must be corrected and re-uploaded before calculations can proceed.' },
              { check: 'Missing Months (< 6)',    blocker: true,  rule: 'Fewer than 6 distinct months uploaded for a category — applies to all categories including refrigerants.', note: 'Duplicate months count as one. Upload more different months to unblock.' },
              { check: 'Unit Consistency',        blocker: true,  rule: 'All records must use the category\'s mandated unit.', note: 'Standardize and re-upload if mismatched.' },
              { check: 'Abnormal Spikes',         blocker: false, rule: '>100% spike up or >70% drop month-over-month.', note: 'Flagged as a warning for review; does not block calculations.' },
              { check: 'Duplicate Entries',       blocker: false, rule: 'Same Month + Year appears more than once.', note: 'Values are automatically summed and shown as Passed.' },
            ].map(({ check, blocker, rule, note }) => (
              <div key={check} className="flex items-start gap-3 p-3 rounded-xl border"
                   style={{ borderColor: blocker ? '#fecaca' : '#e2e8f0', background: blocker ? '#fff7f7' : '#f8fafc' }}>
                <div className="flex flex-col gap-1 shrink-0 mt-0.5">
                  <Pill text={check} colour={blocker ? 'red' : 'slate'} />
                  {blocker && <Pill text="Blocker" colour="red" />}
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-700">{rule}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{note}</div>
                </div>
              </div>
            ))}
          </div>
          {/* Cross-category */}
          <div className="p-3 rounded-xl border border-blue-200 bg-blue-50">
            <div className="flex items-center gap-2 mb-1.5">
              <Pill text="Cross-Category Consistency" colour="blue" />
              <Pill text="Blocker" colour="red" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-700">
              {[
                'Renewable kWh  ≤  Total Electricity kWh',
                'Reused Water KL  ≤  Total Water KL',
                'Recycled Waste kg  ≤  Total Waste kg',
                'Authorized Vendor Waste  ≤  Total Hazardous + Biomedical Waste',
              ].map((r) => (
                <div key={r} className="flex items-start gap-1.5">
                  <span className="text-blue-400 mt-0.5 shrink-0">·</span>{r}
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* 4. Regulatory & Compliance Frameworks */}
        <Section title="Regulatory & Compliance Frameworks" icon="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z">
          <div className="space-y-2">
            {[
              { code: 'BRSR',     name: 'BRSR (SEBI)',                       risk: 'High',   risk_col: 'red',    applies: 'Listed companies', desc: 'Mandatory ESG disclosure. Requires Scope 1+2 data and governance structure.' },
              { code: 'BMW',      name: 'Biomedical Waste Rules 2016',        risk: 'High',   risk_col: 'red',    applies: 'Healthcare',       desc: 'CPCB-authorized vendor, daily disposal tracking, and waste segregation required.' },
              { code: 'HAZWASTE', name: 'Hazardous Waste Management Rules',  risk: 'High',   risk_col: 'red',    applies: 'Hazardous waste generators', desc: 'Authorized vendor, manifest records, and storage compliance.' },
              { code: 'EPA',      name: 'Environment Protection Act (MoEFCC)',risk: 'High',   risk_col: 'red',    applies: 'Mfg, Textiles, Food', desc: 'Environmental policy, compliance register, and consent to operate.' },
              { code: 'FSSAI',    name: 'FSSAI Regulations',                 risk: 'High',   risk_col: 'red',    applies: 'Food & Beverage',  desc: 'FSSAI license, hygiene records, and audit reports mandatory.' },
              { code: 'ECA',      name: 'Energy Conservation Act (BEE)',      risk: 'Medium', risk_col: 'amber',  applies: 'Load ≥ 500 kW',    desc: 'Energy monitoring, audit records, and designated energy manager.' },
              { code: 'EWASTE',   name: 'E-Waste Management Rules 2022',      risk: 'Medium', risk_col: 'amber',  applies: 'Electronics sector', desc: 'Authorized recycler engagement and e-waste tracking (kg).' },
              { code: 'PWM',      name: 'Plastic Waste Management Rules',     risk: 'Medium', risk_col: 'amber',  applies: 'All sectors',      desc: 'EPR registration and plastic waste tracking.' },
              { code: 'CDP',      name: 'Carbon Disclosure / CDP',            risk: 'Medium', risk_col: 'blue',   applies: 'All (voluntary)',  desc: 'Scope 1, 2, 3 reporting. Reputational risk for non-disclosure.' },
              { code: 'ESG_DISC', name: 'ESG Disclosure (Voluntary)',         risk: 'Medium', risk_col: 'blue',   applies: 'All sectors',      desc: 'GRI-aligned reporting and Scope 1–3 data for investor scrutiny.' },
            ].map(({ code, name, risk, risk_col, applies, desc }) => (
              <div key={code} className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
                <div className="shrink-0 flex flex-col gap-1 pt-0.5">
                  <Pill text={code} colour="slate" />
                  <Pill text={risk} colour={risk_col} />
                </div>
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-slate-800 leading-tight">{name}</div>
                  <div className="text-[10px] text-slate-400 mb-0.5">Applies to: {applies}</div>
                  <div className="text-[11px] text-slate-600">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* 5. GHG Emissions Methodology */}
        <Section title="GHG Emissions Methodology" icon="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            {[
              { scope: '1', label: 'Direct',         col: 'border-t-orange-500 bg-orange-50', tc: 'text-orange-700',
                items: ['Diesel: 3.17 kgCO₂e / litre', 'Refrigerants: gas-specific GWP'] },
              { scope: '2', label: 'Indirect Energy', col: 'border-t-blue-500 bg-blue-50',   tc: 'text-blue-700',
                items: ['Grid: 0.72 kgCO₂e / kWh (CEA India)', 'Renewable offsets Scope 2 proportionally'] },
              { scope: '3', label: 'Value Chain',    col: 'border-t-purple-500 bg-purple-50',tc: 'text-purple-700',
                items: ['Waste to landfill: 0.5 kgCO₂e / kg', 'Wastewater: 0.35 kgCO₂e / KL', 'Transport: 0.12 kgCO₂e / tonne-km'] },
            ].map(({ scope, label, col, tc, items }) => (
              <div key={scope} className={`rounded-xl border border-t-4 border-slate-200 ${col} p-3`}>
                <div className={`text-[10px] font-bold uppercase tracking-widest ${tc}`}>Scope {scope}</div>
                <div className="text-[12px] font-semibold text-slate-800 mb-2">{label}</div>
                {items.map((s) => (
                  <div key={s} className="text-[11px] text-slate-600 flex gap-1.5 mb-1">
                    <span className="shrink-0">·</span>{s}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="text-[11px] text-slate-500 px-1">
            Protocol: <strong className="text-slate-700">GHG Protocol Corporate Standard</strong> (WRI/WBCSD).
            Grid factor from CEA India. All values are annualized from monthly data before emission conversion.
          </div>
        </Section>

      </div>
    </div>
  );
}
