// Organization Profile page.
//   * Shown after login if the user hasn't completed their profile yet.
//   * Also accessible via "Edit Profile" in the sidebar.
//   * Saved to the user (NOT the assessment) so it persists across logins.

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { sectorName } from '../lib/sectors.js';

const FIELDS = [
  { key: 'builtUpAreaSqft',      label: 'Built-up area',        unit: 'sqft',  required: true,  icon: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z' },
  { key: 'employees',             label: 'Employees (FTE)',      unit: 'people',required: true,  icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
  { key: 'avgDailyOccupancy',     label: 'Avg. daily occupancy', unit: 'people',required: false, icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z' },
  { key: 'operatingHoursPerDay',  label: 'Operating hours/day', unit: 'hrs',   required: true,  max: 24, icon: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2' },
  { key: 'numberOfFloors',        label: 'Number of floors',    unit: 'floors',required: false, icon: 'M2 20h20M4 20V8l8-6 8 6v12' },
  { key: 'yearEstablished',       label: 'Year established',    unit: 'year',  required: false, icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01' },
];

export default function OrgProfile() {
  const { user, saveOrgProfile } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const editMode = params.get('edit') === '1';

  const [form, setForm] = useState({
    builtUpAreaSqft:     user?.orgProfile?.builtUpAreaSqft ?? '',
    employees:           user?.orgProfile?.employees ?? '',
    avgDailyOccupancy:   user?.orgProfile?.avgDailyOccupancy ?? '',
    operatingHoursPerDay:user?.orgProfile?.operatingHoursPerDay ?? '',
    numberOfFloors:      user?.orgProfile?.numberOfFloors ?? '',
    yearEstablished:     user?.orgProfile?.yearEstablished ?? '',
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);

  function validate() {
    const errs = {};
    const requiredFields = FIELDS.filter(f => f.required);
    for (const f of requiredFields) {
      const val = form[f.key];
      if (val === '' || val === null || val === undefined) {
        errs[f.key] = `${f.label} must be entered`;
      } else if (isNaN(Number(val)) || Number(val) < 0) {
        errs[f.key] = `${f.label} must be a valid positive number`;
      }
    }
    return errs;
  }

  async function onSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setTimeout(() => {
        const el = document.querySelector('[data-field-error="true"]');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }
    setFieldErrors({});
    setError(''); setBusy(true);
    try {
      await saveOrgProfile(form);
      nav('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save profile.');
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-full" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 40%, #e8f4fd 70%, #dbeafe 100%)', position: 'relative' }}>
      {/* Ambient orbs */}
      <div style={{ position: 'fixed', top: '-60px', right: '-60px', width: '380px', height: '380px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.13) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '80px', left: '40px', width: '280px', height: '280px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,233,0.09) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', opacity: 0.04, pointerEvents: 'none', zIndex: 0 }}>
        <defs><pattern id="op-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0ea5e9" strokeWidth="1"/></pattern></defs>
        <rect width="100%" height="100%" fill="url(#op-grid)" />
      </svg>

      <div className="max-w-2xl mx-auto px-6 py-8" style={{ position: 'relative', zIndex: 1 }}>
        {/* Page header */}
        <div className="mb-6">
          {!editMode && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold mb-3"
                 style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#0ea5e9' }}/>
              Setup required
            </div>
          )}
          <h1 className="text-xl font-bold" style={{ color: '#0c4a6e' }}>
            {editMode ? 'Organization Profile' : 'Complete your profile'}
          </h1>
          <p className="text-[12px] mt-1" style={{ color: '#64748b' }}>
            {editMode
              ? 'Update your organization details. Changes apply to all future assessments.'
              : 'This information drives all intensity calculations (energy, water, emissions). Saved to your account.'}
          </p>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid rgba(186,230,255,0.6)', boxShadow: '0 8px 40px rgba(3,105,161,0.1), 0 2px 12px rgba(3,105,161,0.06)' }}>
          {/* Org info header */}
          <div className="flex items-center gap-3 pb-5 mb-5" style={{ borderBottom: '1px solid #e8f4fe' }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                 style={{ background: 'linear-gradient(135deg,#0369a1,#0284c7,#0ea5e9)' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <div>
              <div className="text-[13px] font-bold" style={{ color: '#0c4a6e' }}>{user?.organizationName || 'Your Organization'}</div>
              <div className="text-[11px]" style={{ color: '#64748b' }}>{sectorName(user?.sectorCode)} · {user?.email}</div>
            </div>
          </div>

          <form onSubmit={onSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              {FIELDS.map((f) => {
                const val = form[f.key];
                return (
                  <div key={f.key} data-field-error={fieldErrors[f.key] ? 'true' : undefined}>
                    <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider text-slate-500">
                      {f.label} <span className="text-slate-400 normal-case font-normal">({f.unit})</span>
                      {f.required && <span style={{ color: '#ef4444', marginLeft: '3px' }}>*</span>}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d={f.icon}/>
                        </svg>
                      </span>
                      <input
                        type="number" min={0} max={f.max}
                        value={val ?? ''}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-sm outline-none transition-all"
                        style={{
                          border: `1px solid ${fieldErrors[f.key] ? '#ef4444' : '#e2e8f0'}`,
                          color: '#334155',
                          background: fieldErrors[f.key] ? '#fff5f5' : '#fafafa',
                          boxShadow: fieldErrors[f.key] ? '0 0 0 3px rgba(239,68,68,0.1)' : 'none',
                        }}
                        onChange={(e) => {
                          setForm({ ...form, [f.key]: e.target.value === '' ? '' : parseFloat(e.target.value) });
                          if (fieldErrors[f.key]) setFieldErrors(p => ({ ...p, [f.key]: '' }));
                        }}
                        onFocus={(e) => { if (!fieldErrors[f.key]) { e.target.style.borderColor='#0ea5e9'; e.target.style.background='#fff'; e.target.style.boxShadow='0 0 0 3px rgba(14,165,233,0.12)'; } }}
                        onBlur={(e) => { if (!fieldErrors[f.key]) { e.target.style.borderColor='#e2e8f0'; e.target.style.background='#fafafa'; e.target.style.boxShadow='none'; } }}
                      />
                    </div>
                    {fieldErrors[f.key] && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round">
                          <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                        </svg>
                        <span className="text-[11px] font-medium" style={{ color: '#ef4444' }}>{fieldErrors[f.key]}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Info note */}
            <div className="p-3 rounded-xl mb-4 text-[11px]"
                 style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b' }}>
              <span className="font-semibold text-slate-600">Note:</span> Built-up area and employee count are required for energy and water intensity benchmarking. Operating hours affect annualization accuracy.
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl mb-4 text-[12px]"
                   style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                </svg>
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              {editMode && (
                <button type="button"
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-slate-100"
                  style={{ border: '1px solid #e2e8f0', color: '#475569' }}
                  onClick={() => nav('/')}>
                  Cancel
                </button>
              )}
              <button type="submit" disabled={busy}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all flex items-center gap-2 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)', boxShadow: '0 4px 12px rgba(14,165,233,0.25)' }}>
                {busy ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
                    Saving…
                  </>
                ) : editMode ? 'Save Changes' : (
                  <>
                    Save & Continue
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
