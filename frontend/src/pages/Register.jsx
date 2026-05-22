import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';

// Defined outside Register so React never unmounts/remounts it on re-render
function F({ label, children, error: fe, required: req }) {
  return (
    <div data-error={fe ? 'true' : undefined}>
      <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#64748b' }}>
        {label}{req !== false && <span style={{ color: '#ef4444', marginLeft: '3px' }}>*</span>}
      </label>
      {children}
      {fe && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" className="shrink-0">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
          </svg>
          <p className="text-[11px] font-medium" style={{ color: '#ef4444' }}>{fe}</p>
        </div>
      )}
    </div>
  );
}

const INDIA_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  '— Union Territories —',
  'Andaman & Nicobar Islands','Chandigarh','Dadra & Nagar Haveli and Daman & Diu',
  'Delhi (NCT)','Jammu & Kashmir','Ladakh','Lakshadweep','Puducherry',
];

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [sectors, setSectors] = useState([]);
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', confirmPassword: '',
    organizationName: '', sectorCode: '', country: 'India', stateRegion: '',
    listed: false, termsAccepted: false,
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get('/auth/sectors').then((r) => setSectors(r.data)).catch(() => {}); }, []);

  function validate() {
    const errs = {};
    if (!form.fullName.trim())         errs.fullName         = 'Full name must be entered';
    if (!form.email.trim())            errs.email            = 'Email address must be entered';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
                                       errs.email            = 'Please enter a valid email address';
    if (!form.organizationName.trim()) errs.organizationName = 'Organization name must be entered';
    if (!form.password)                errs.password         = 'Password must be entered';
    else if (form.password.length < 8) errs.password         = 'Password must be at least 8 characters';
    else if (!/[A-Z]/.test(form.password)) errs.password     = 'Password must contain at least one uppercase letter';
    else if (!/[0-9]/.test(form.password)) errs.password     = 'Password must contain at least one number';
    else if (!/[^A-Za-z0-9]/.test(form.password)) errs.password = 'Password must contain at least one special character';
    if (!form.confirmPassword)         errs.confirmPassword  = 'Please confirm your password';
    else if (form.password && form.confirmPassword !== form.password)
                                       errs.confirmPassword  = 'Passwords do not match';
    if (!form.sectorCode)              errs.sectorCode       = 'Please select your industry / sector';
    if (!form.country.trim())          errs.country          = 'Country must be entered';
    if (!form.stateRegion)             errs.stateRegion      = 'Please select your state / region';
    if (!form.termsAccepted)           errs.termsAccepted    = 'You must accept the terms to continue';
    return errs;
  }

  async function onSubmit(e) {
    e.preventDefault();
    const clientErrs = validate();
    if (Object.keys(clientErrs).length > 0) {
      setErrors(clientErrs);
      // Scroll to the first error field
      setTimeout(() => {
        const el = document.querySelector('[data-error="true"]');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }
    setErrors({}); setBusy(true);
    try {
      await register(form);
      nav('/');
    } catch (err) {
      const status = err.response?.status;
      const fields = err.response?.data?.fields;
      const serverMsg = err.response?.data?.error;
      if (fields) {
        setErrors(fields);
      } else if (status === 409) {
        setErrors({ _global: 'An account with this email already exists. Try logging in instead.' });
      } else if (status === 400) {
        setErrors({ _global: serverMsg || 'Some information is missing or incorrect. Please review the form.' });
      } else if (!navigator.onLine) {
        setErrors({ _global: 'You appear to be offline. Please check your internet connection.' });
      } else {
        setErrors({ _global: serverMsg || 'Registration failed. Please try again in a moment.' });
      }
    } finally { setBusy(false); }
  }

  const inputStyle = { background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#0f172a' };
  const inputCls = "w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all";

  return (
    <div className="min-h-screen flex items-start justify-center py-10 px-4" style={{
      background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 40%, #e8f4fd 70%, #dbeafe 100%)',
      position: 'relative', fontFamily: "'DM Sans','Segoe UI',sans-serif"
    }}>
      {/* Background decorative elements */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.18) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '320px', height: '320px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)' }} />
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.04 }}>
          <defs><pattern id="reg-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0ea5e9" strokeWidth="1"/></pattern></defs>
          <rect width="100%" height="100%" fill="url(#reg-grid)" />
        </svg>
      </div>

      <div className="w-full max-w-xl" style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 justify-center">
          <div style={{ background: 'linear-gradient(135deg,#0369a1,#0ea5e9)', borderRadius: '14px', padding: '8px' }}>
            <img src="/EnSoGo%20Logo.png" alt="EnSoGo" className="w-8 h-8 rounded-lg object-cover" />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0c4a6e', letterSpacing: '-0.3px' }}>EnSoGo</div>
            <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px', color: '#0284c7' }}>Readiness Suite</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '24px', padding: '36px', border: '1px solid rgba(186,230,255,0.6)', boxShadow: '0 8px 40px rgba(3,105,161,0.1), 0 2px 12px rgba(3,105,161,0.06)' }}>
          <div className="mb-6">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '100px', padding: '4px 12px', marginBottom: '12px' }}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/>
              </svg>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#0284c7', letterSpacing: '0.5px' }}>New Account</span>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0c4a6e', letterSpacing: '-0.3px', margin: '0 0 4px 0' }}>Create your account</h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              Sector selected now determines applicable benchmarks, certification frameworks, and governance questions.
            </p>
          </div>

          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full name */}
            <div className="md:col-span-2">
              <F label="Full name" error={errors.fullName} required>
                <input className={inputCls} style={{ ...inputStyle, borderColor: errors.fullName ? '#ef4444' : '#e2e8f0', boxShadow: errors.fullName ? '0 0 0 3px rgba(239,68,68,0.1)' : 'none' }} value={form.fullName}
                       autoComplete="name" placeholder="Your full name"
                       onChange={(e) => { setForm({ ...form, fullName: e.target.value }); if (errors.fullName) setErrors(p=>({...p,fullName:''})); }}
                       onFocus={(e) => { e.target.style.borderColor = errors.fullName ? '#ef4444' : '#0ea5e9'; e.target.style.boxShadow = errors.fullName ? '0 0 0 3px rgba(239,68,68,0.1)' : '0 0 0 3px rgba(14,165,233,0.12)'; }}
                       onBlur={(e) => { e.target.style.borderColor = errors.fullName ? '#ef4444' : '#e2e8f0'; e.target.style.boxShadow = errors.fullName ? '0 0 0 3px rgba(239,68,68,0.1)' : 'none'; }} />
              </F>
            </div>

            {/* Email */}
            <F label="Email" error={errors.email} required>
              <input className={inputCls} style={{ ...inputStyle, borderColor: errors.email ? '#ef4444' : '#e2e8f0', boxShadow: errors.email ? '0 0 0 3px rgba(239,68,68,0.1)' : 'none' }} type="email" value={form.email}
                     autoComplete="email" placeholder="you@organization.com"
                     onChange={(e) => { setForm({ ...form, email: e.target.value }); if (errors.email) setErrors(p=>({...p,email:''})); }}
                     onFocus={(e) => { e.target.style.borderColor = errors.email ? '#ef4444' : '#0ea5e9'; e.target.style.boxShadow = errors.email ? '0 0 0 3px rgba(239,68,68,0.1)' : '0 0 0 3px rgba(14,165,233,0.12)'; }}
                     onBlur={(e) => { e.target.style.borderColor = errors.email ? '#ef4444' : '#e2e8f0'; e.target.style.boxShadow = errors.email ? '0 0 0 3px rgba(239,68,68,0.1)' : 'none'; }} />
            </F>

            {/* Organization */}
            <F label="Organization name" error={errors.organizationName} required>
              <input className={inputCls} style={{ ...inputStyle, borderColor: errors.organizationName ? '#ef4444' : '#e2e8f0', boxShadow: errors.organizationName ? '0 0 0 3px rgba(239,68,68,0.1)' : 'none' }} value={form.organizationName}
                     autoComplete="organization" placeholder="Your organization name"
                     onChange={(e) => { setForm({ ...form, organizationName: e.target.value.replace(/[^A-Za-z\s]/g, '') }); if (errors.organizationName) setErrors(p=>({...p,organizationName:''})); }}
                     onFocus={(e) => { e.target.style.borderColor = errors.organizationName ? '#ef4444' : '#0ea5e9'; e.target.style.boxShadow = errors.organizationName ? '0 0 0 3px rgba(239,68,68,0.1)' : '0 0 0 3px rgba(14,165,233,0.12)'; }}
                     onBlur={(e) => { e.target.style.borderColor = errors.organizationName ? '#ef4444' : '#e2e8f0'; e.target.style.boxShadow = errors.organizationName ? '0 0 0 3px rgba(239,68,68,0.1)' : 'none'; }} />
            </F>

            {/* Password */}
            <F label="Password" error={errors.password} required>
              <input className={inputCls} style={{ ...inputStyle, borderColor: errors.password ? '#ef4444' : '#e2e8f0', boxShadow: errors.password ? '0 0 0 3px rgba(239,68,68,0.1)' : 'none' }} type="password" value={form.password}
                     autoComplete="new-password" placeholder="Min 8 chars, uppercase, number, symbol"
                     onChange={(e) => { setForm({ ...form, password: e.target.value }); if (errors.password) setErrors(p=>({...p,password:''})); }}
                     onFocus={(e) => { e.target.style.borderColor = errors.password ? '#ef4444' : '#0ea5e9'; e.target.style.boxShadow = errors.password ? '0 0 0 3px rgba(239,68,68,0.1)' : '0 0 0 3px rgba(14,165,233,0.12)'; }}
                     onBlur={(e) => { e.target.style.borderColor = errors.password ? '#ef4444' : '#e2e8f0'; e.target.style.boxShadow = errors.password ? '0 0 0 3px rgba(239,68,68,0.1)' : 'none'; }} />
              <p className="text-[11px] mt-1" style={{ color: '#475569' }}>Min 8 chars, 1 uppercase, 1 number, 1 symbol</p>
            </F>

            {/* Confirm password */}
            <F label="Confirm password" error={errors.confirmPassword} required>
              <input className={inputCls} style={{ ...inputStyle, borderColor: errors.confirmPassword ? '#ef4444' : '#e2e8f0', boxShadow: errors.confirmPassword ? '0 0 0 3px rgba(239,68,68,0.1)' : 'none' }} type="password" value={form.confirmPassword}
                     autoComplete="new-password" placeholder="Re-enter your password"
                     onChange={(e) => { setForm({ ...form, confirmPassword: e.target.value }); if (errors.confirmPassword) setErrors(p=>({...p,confirmPassword:''})); }}
                     onFocus={(e) => { e.target.style.borderColor = errors.confirmPassword ? '#ef4444' : '#0ea5e9'; e.target.style.boxShadow = errors.confirmPassword ? '0 0 0 3px rgba(239,68,68,0.1)' : '0 0 0 3px rgba(14,165,233,0.12)'; }}
                     onBlur={(e) => { e.target.style.borderColor = errors.confirmPassword ? '#ef4444' : '#e2e8f0'; e.target.style.boxShadow = errors.confirmPassword ? '0 0 0 3px rgba(239,68,68,0.1)' : 'none'; }} />
            </F>

            {/* Sector */}
            <div className="md:col-span-2">
              <F label="Industry / Sector" error={errors.sectorCode} required>
                <select className={inputCls} style={{ ...inputStyle, cursor: 'pointer', borderColor: errors.sectorCode ? '#ef4444' : '#e2e8f0' }} value={form.sectorCode}
                        onChange={(e) => { setForm({ ...form, sectorCode: e.target.value }); if (errors.sectorCode) setErrors(p=>({...p,sectorCode:''})); }}
                        onFocus={(e) => { e.target.style.borderColor = errors.sectorCode ? '#ef4444' : '#0ea5e9'; e.target.style.boxShadow = errors.sectorCode ? '0 0 0 3px rgba(239,68,68,0.1)' : '0 0 0 3px rgba(14,165,233,0.12)'; }}
                        onBlur={(e) => { e.target.style.borderColor = errors.sectorCode ? '#ef4444' : '#e2e8f0'; e.target.style.boxShadow = errors.sectorCode ? '0 0 0 3px rgba(239,68,68,0.1)' : 'none'; }}>
                  <option value="">Choose your sector</option>
                  {sectors.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
                </select>
              </F>
            </div>

            {/* Country */}
            <F label="Country" error={errors.country} required>
              <input className={inputCls}
                     style={{ ...inputStyle, borderColor: errors.country ? '#ef4444' : '#e2e8f0',
                              boxShadow: errors.country ? '0 0 0 3px rgba(239,68,68,0.1)' : 'none' }}
                     value={form.country}
                     autoComplete="country-name" placeholder="e.g. India"
                     onChange={(e) => { setForm({ ...form, country: e.target.value }); if (errors.country) setErrors(p=>({...p,country:''})); }}
                     onFocus={(e) => { e.target.style.borderColor = errors.country ? '#ef4444' : '#0ea5e9'; e.target.style.boxShadow = errors.country ? '0 0 0 3px rgba(239,68,68,0.1)' : '0 0 0 3px rgba(14,165,233,0.12)'; }}
                     onBlur={(e) => { e.target.style.borderColor = errors.country ? '#ef4444' : '#e2e8f0'; e.target.style.boxShadow = errors.country ? '0 0 0 3px rgba(239,68,68,0.1)' : 'none'; }} />
            </F>

            {/* State / Region */}
            <F label="State / Region" error={errors.stateRegion} required>
              <select className={inputCls} style={{ ...inputStyle, cursor: 'pointer', borderColor: errors.stateRegion ? '#ef4444' : '#e2e8f0', boxShadow: errors.stateRegion ? '0 0 0 3px rgba(239,68,68,0.1)' : 'none' }} value={form.stateRegion}
                      onChange={(e) => { setForm({ ...form, stateRegion: e.target.value }); if (errors.stateRegion) setErrors(p=>({...p,stateRegion:''})); }}
                      onFocus={(e) => { e.target.style.borderColor = errors.stateRegion ? '#ef4444' : '#0ea5e9'; e.target.style.boxShadow = errors.stateRegion ? '0 0 0 3px rgba(239,68,68,0.1)' : '0 0 0 3px rgba(14,165,233,0.12)'; }}
                      onBlur={(e) => { e.target.style.borderColor = errors.stateRegion ? '#ef4444' : '#e2e8f0'; e.target.style.boxShadow = errors.stateRegion ? '0 0 0 3px rgba(239,68,68,0.1)' : 'none'; }}>
                <option value="">Select state / UT</option>
                {INDIA_STATES.map((s) =>
                  s.startsWith('—')
                    ? <option key={s} disabled style={{ color: '#64748b', fontStyle: 'italic' }}>{s}</option>
                    : <option key={s} value={s}>{s}</option>
                )}
              </select>
            </F>

            {/* Listed */}
            <label className="md:col-span-2 flex items-start gap-2.5 cursor-pointer">
              <input type="checkbox" className="mt-0.5 rounded accent-sky-500" checked={form.listed}
                     onChange={(e) => setForm({ ...form, listed: e.target.checked })} />
              <span className="text-[12px]" style={{ color: '#94a3b8' }}>
                Listed on NSE/BSE — enables BRSR (SEBI) regulatory readiness scoring.
              </span>
            </label>

            {/* Terms */}
            <div className="md:col-span-2">
              <label className="flex items-start gap-2.5 cursor-pointer"
                     style={{ padding: '10px 12px', borderRadius: '12px', border: `1.5px solid ${errors.termsAccepted ? '#ef4444' : '#e2e8f0'}`, background: errors.termsAccepted ? 'rgba(239,68,68,0.04)' : 'transparent', transition: 'border-color 0.2s, background 0.2s' }}>
                <input
                  type="checkbox"
                  className="mt-0.5 rounded accent-sky-500 shrink-0"
                  checked={form.termsAccepted}
                  onChange={(e) => {
                    setForm({ ...form, termsAccepted: e.target.checked });
                    if (errors.termsAccepted) setErrors(p => ({ ...p, termsAccepted: '' }));
                  }}
                />
                <span className="text-[12px]" style={{ color: errors.termsAccepted ? '#dc2626' : '#94a3b8', transition: 'color 0.2s' }}>
                  I accept the terms and acknowledge that the EnSoGo platform provides indicative readiness intelligence only.
                </span>
              </label>
              {errors.termsAccepted && (
                <div className="flex items-center gap-1.5 mt-1.5 ml-1">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" className="shrink-0">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                  </svg>
                  <p className="text-[11px] font-medium" style={{ color: '#ef4444' }}>{errors.termsAccepted}</p>
                </div>
              )}
            </div>

            {/* Global error */}
            {errors._global && (
              <div className="md:col-span-2 flex items-center gap-2 p-3 rounded-xl text-[12px]"
                   style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                </svg>
                {errors._global}
              </div>
            )}

            {/* Actions */}
            <div className="md:col-span-2 flex items-center justify-between gap-3 mt-1">
              <Link to="/login" className="text-[12px] transition-colors" style={{ color: '#0284c7', fontWeight: '600' }}>
                Already have an account? Log in
              </Link>
              <button
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all flex items-center gap-2 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#0369a1,#0284c7,#0ea5e9)', boxShadow: '0 4px 16px rgba(3,105,161,0.35)' }}
                disabled={busy}>
                {busy ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
                    Creating…
                  </>
                ) : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
