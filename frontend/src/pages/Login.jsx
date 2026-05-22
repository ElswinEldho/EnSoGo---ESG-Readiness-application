import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';

export default function Login() {
  const { login, sessionConflict, clearAdminSession } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', remember: false });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    const fe = {};
    if (!form.email.trim())   fe.email    = 'Email address must be entered';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) fe.email = 'Please enter a valid email address';
    if (!form.password)        fe.password = 'Password must be entered';
    if (Object.keys(fe).length) {
      setFieldErrors(fe);
      return;
    }
    setFieldErrors({});
    setError(''); setBusy(true);
    try {
      await login(form.email, form.password, form.remember);
      nav('/');
    } catch (err) {
      const status = err.response?.status;
      const serverMsg = err.response?.data?.error;
      if (serverMsg) {
        setError(serverMsg);
      } else if (status === 401) {
        setError('Incorrect email or password. Please try again.');
      } else if (status === 404) {
        setError('No account found with this email. Please check or sign up.');
      } else if (status === 429) {
        setError('Too many login attempts. Please wait a few minutes and try again.');
      } else if (!navigator.onLine) {
        setError('You appear to be offline. Please check your internet connection.');
      } else {
        setError('Something went wrong. Please try again in a moment.');
      }
    } finally { setBusy(false); }
  }

  // ── Session conflict screen ─────────────────────────────────────────────────
  if (sessionConflict) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 40%, #e8f4fd 70%, #dbeafe 100%)',
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        padding: '24px', position: 'relative',
      }}>
        {/* Background decorative elements */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
          <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.18) 0%, transparent 70%)' }} />
          <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '320px', height: '320px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)' }} />
        </div>

        <div style={{
          width: '100%', maxWidth: '420px', position: 'relative', zIndex: 10,
          background: '#ffffff', borderRadius: '24px', padding: '40px',
          border: '1px solid rgba(186,230,255,0.6)',
          boxShadow: '0 8px 40px rgba(3,105,161,0.1), 0 2px 12px rgba(3,105,161,0.06)',
          textAlign: 'center',
        }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '16px', margin: '0 auto 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          }}>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none"
                 stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          </div>

          <div style={{ fontSize: '18px', fontWeight: 800, color: '#0c4a6e', marginBottom: '10px' }}>
            Main App Blocked
          </div>
          <div style={{ fontSize: '13px', lineHeight: '1.65', color: '#64748b', marginBottom: '28px' }}>
            The Main App cannot be opened while an Admin Panel session is active in this browser.
            Use a different browser or incognito window, or sign out of the Admin Panel first.
          </div>

          <button
            onClick={clearAdminSession}
            style={{
              width: '100%', padding: '13px', borderRadius: '14px', border: 'none',
              background: 'linear-gradient(135deg, #0369a1 0%, #0284c7 50%, #0ea5e9 100%)',
              color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(3,105,161,0.35)', marginBottom: '14px',
            }}
          >
            Sign Out of Admin Panel &amp; Continue
          </button>

          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
            This browser profile can only run one session type at a time.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 40%, #e8f4fd 70%, #dbeafe 100%)',
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      position: 'relative'
    }}>

      {/* Background decorative elements */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.18) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '320px', height: '320px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)' }} />
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.04 }}>
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0ea5e9" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Left Branding Panel */}
      <div style={{
        display: 'none',
        width: '460px', flexShrink: 0, padding: '40px',
        position: 'relative', zIndex: 10,
        background: 'linear-gradient(160deg, #0369a1 0%, #0284c7 40%, #0ea5e9 100%)',
        boxShadow: '4px 0 40px rgba(3,105,161,0.2)',
        flexDirection: 'column', justifyContent: 'space-between'
      }} className="lg-panel">
        {/* This panel is shown via CSS for lg screens */}
      </div>

      {/* Left Branding Panel (proper) */}
      <div className="hidden lg:flex flex-col justify-between" style={{
        width: '460px', flexShrink: 0, padding: '40px',
        position: 'relative', zIndex: 10,
        background: 'linear-gradient(160deg, #0369a1 0%, #0284c7 40%, #0ea5e9 100%)',
        boxShadow: '4px 0 40px rgba(3,105,161,0.2)'
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '60px', left: '-30px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative', zIndex: 10 }}>
          <div style={{
            background: 'rgba(255,255,255,0.15)', borderRadius: '14px', padding: '8px',
            border: '1px solid rgba(255,255,255,0.25)'
          }}>
            <img src="/EnSoGo%20Logo.png" alt="EnSoGo" style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }} />
          </div>
          <div>
            <div style={{ fontSize: '17px', fontWeight: '800', color: '#fff', letterSpacing: '-0.3px' }}>EnSoGo</div>
            <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px', color: 'rgba(255,255,255,0.65)' }}>Readiness Suite</div>
          </div>
        </div>

        {/* Hero text */}
        <div style={{ position: 'relative', zIndex: 10 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '100px', padding: '5px 14px', marginBottom: '20px'
          }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#86efac', boxShadow: '0 0 8px rgba(134,239,172,0.8)' }} />
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.85)', letterSpacing: '0.5px' }}>Sustainability Intelligence</span>
          </div>

          <h2 style={{ fontSize: '34px', fontWeight: '800', color: '#fff', lineHeight: '1.15', letterSpacing: '-0.5px', marginBottom: '14px' }}>
            Measure what<br />
            <span style={{ color: '#bfdbfe' }}>truly matters.</span>
          </h2>
          <p style={{ fontSize: '13px', lineHeight: '1.7', color: 'rgba(255,255,255,0.65)', maxWidth: '320px', marginBottom: '32px' }}>
            A comprehensive ESG assessment platform aligned with global sustainability standards.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: 'GHG Protocol Scope 1, 2 & 3', d: 'M12 2a10 10 0 100 20A10 10 0 0012 2zM2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20' },
              { label: 'Sector Benchmark Standards', d: 'M18 20V10M12 20V4M6 20v-6' },
              { label: 'LEED · IGBC · BRSR Ready', d: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
              { label: 'Annualized Monthly Estimates', d: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01' },
            ].map((item) => (
              <div key={item.label} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '12px', padding: '10px 14px'
              }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d={item.d} />
                  </svg>
                </div>
                <span style={{ fontSize: '12px', fontWeight: '500', color: 'rgba(255,255,255,0.8)' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: '11px', fontStyle: 'italic', color: 'rgba(255,255,255,0.3)', position: 'relative', zIndex: 10 }}>
          "Improve what counts." — EnSoGo
        </div>
      </div>

      {/* Right Login Form */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px', position: 'relative', zIndex: 10
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>

          {/* Mobile logo */}
          <div className="lg:hidden" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px', justifyContent: 'center' }}>
            <img src="/EnSoGo%20Logo.png" alt="EnSoGo" style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'cover', background: '#0284c7' }} />
            <span style={{ fontSize: '16px', fontWeight: '800', color: '#0369a1' }}>EnSoGo</span>
          </div>

          {/* Card */}
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '36px',
            border: '1px solid rgba(186,230,255,0.6)',
            boxShadow: '0 8px 40px rgba(3,105,161,0.1), 0 2px 12px rgba(3,105,161,0.06)'
          }}>

            {/* Header */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: '#e0f2fe', border: '1px solid #bae6fd',
                borderRadius: '100px', padding: '4px 12px', marginBottom: '14px'
              }}>
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#0284c7', letterSpacing: '0.5px' }}>Secure Login</span>
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0c4a6e', letterSpacing: '-0.3px', marginBottom: '4px', margin: '0 0 4px 0' }}>Welcome back</h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Sign in to your organization account</p>
            </div>

            <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Email */}
              <div>
                <label style={{
                  display: 'block', fontSize: '11px', fontWeight: '700',
                  marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#475569'
                }}>Email address</label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke={focusedField === 'email' ? '#0284c7' : '#94a3b8'} strokeWidth="1.8" strokeLinecap="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </div>
                  <input
                    style={{
                      width: '100%', padding: '11px 14px 11px 38px',
                      borderRadius: '12px', fontSize: '14px', outline: 'none',
                      background: fieldErrors.email ? '#fff5f5' : focusedField === 'email' ? '#f0f9ff' : '#f8fafc',
                      border: `1.5px solid ${fieldErrors.email ? '#ef4444' : focusedField === 'email' ? '#0284c7' : '#e2e8f0'}`,
                      color: '#0f172a', transition: 'all 0.2s',
                      boxShadow: fieldErrors.email ? '0 0 0 3px rgba(239,68,68,0.12)' : focusedField === 'email' ? '0 0 0 3px rgba(2,132,199,0.1)' : 'none',
                      boxSizing: 'border-box'
                    }}
                    type="email" value={form.email} autoComplete="email"
                    onChange={(e) => { setForm({ ...form, email: e.target.value }); if (fieldErrors.email) setFieldErrors(p=>({...p,email:''})); }}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="you@organization.com"
                  />
                </div>
                {fieldErrors.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                    </svg>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: '#ef4444' }}>{fieldErrors.email}</span>
                  </div>
                )}
              </div>

              {/* Password */}
              <div>
                <label style={{
                  display: 'block', fontSize: '11px', fontWeight: '700',
                  marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#475569'
                }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke={focusedField === 'password' ? '#0284c7' : '#94a3b8'} strokeWidth="1.8" strokeLinecap="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                  </div>
                  <input
                    style={{
                      width: '100%', padding: '11px 14px 11px 38px',
                      borderRadius: '12px', fontSize: '14px', outline: 'none',
                      background: fieldErrors.password ? '#fff5f5' : focusedField === 'password' ? '#f0f9ff' : '#f8fafc',
                      border: `1.5px solid ${fieldErrors.password ? '#ef4444' : focusedField === 'password' ? '#0284c7' : '#e2e8f0'}`,
                      color: '#0f172a', transition: 'all 0.2s',
                      boxShadow: fieldErrors.password ? '0 0 0 3px rgba(239,68,68,0.12)' : focusedField === 'password' ? '0 0 0 3px rgba(2,132,199,0.1)' : 'none',
                      boxSizing: 'border-box'
                    }}
                    type="password" value={form.password} autoComplete="current-password"
                    onChange={(e) => { setForm({ ...form, password: e.target.value }); if (fieldErrors.password) setFieldErrors(p=>({...p,password:''})); }}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Enter your password"
                  />
                </div>
                {fieldErrors.password && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                    </svg>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: '#ef4444' }}>{fieldErrors.password}</span>
                  </div>
                )}
              </div>

              {/* Remember + Forgot */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer', color: '#64748b' }}>
                  <input type="checkbox" checked={form.remember}
                    onChange={(e) => setForm({ ...form, remember: e.target.checked })}
                    style={{ accentColor: '#0284c7', width: '14px', height: '14px' }}
                  />
                  Remember me for 30 days
                </label>
                <Link to="/forgot-password" style={{ fontSize: '12px', fontWeight: '600', color: '#0284c7', textDecoration: 'none' }}>
                  Forgot password?
                </Link>
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 14px',
                  borderRadius: '12px', fontSize: '12px',
                  background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', color: '#dc2626'
                }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                  </svg>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                style={{
                  width: '100%', padding: '13px',
                  borderRadius: '14px', fontSize: '14px', fontWeight: '700',
                  color: '#fff', border: 'none', cursor: busy ? 'not-allowed' : 'pointer',
                  background: busy ? '#94a3b8' : 'linear-gradient(135deg, #0369a1 0%, #0284c7 50%, #0ea5e9 100%)',
                  boxShadow: busy ? 'none' : '0 4px 16px rgba(3,105,161,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'all 0.2s', opacity: busy ? 0.75 : 1
                }}
                disabled={busy}
              >
                {busy ? (
                  <>
                    <div style={{
                      width: '16px', height: '16px',
                      border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff',
                      borderRadius: '50%', animation: 'ensogo-spin 0.7s linear infinite'
                    }} />
                    Signing in…
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/>
                    </svg>
                    Log In to Dashboard
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div style={{
              marginTop: '22px', paddingTop: '18px',
              borderTop: '1px solid #e8f4fe',
              textAlign: 'center', fontSize: '12px', color: '#64748b'
            }}>
              Don't have an account?{' '}
              <Link to="/register" style={{ fontWeight: '700', color: '#0284c7', textDecoration: 'none' }}>
                Create one →
              </Link>
            </div>
          </div>

          {/* Trust indicators */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginTop: '20px' }}>
            {[
              { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', label: 'SSL Secured' },
              { d: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', label: 'SOC 2' },
              { d: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9', label: 'ISO 27001' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round">
                  <path d={item.d} />
                </svg>
                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ensogo-spin { to { transform: rotate(360deg); } }
        @keyframes ensogo-fade-in { from { opacity:0; transform:translate(-50%,-48%) scale(0.96); } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }
      `}</style>
    </div>
  );
}
