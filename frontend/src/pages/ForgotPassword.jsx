import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function ForgotPassword() {
  const [email, setEmail]         = useState('');
  const [sent, setSent]           = useState(false);
  const [error, setError]         = useState('');
  const [fieldError, setFieldError] = useState('');
  const [busy, setBusy]           = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    // Client-side validation — must run before touching the API
    if (!email.trim()) {
      setFieldError('Email address must be entered');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFieldError('Please enter a valid email address');
      return;
    }
    setFieldError('');
    setError(''); setBusy(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) {
        setError('No account found with this email address. Please check and try again.');
      } else if (status === 429) {
        setError('Too many requests. Please wait a few minutes before trying again.');
      } else if (!navigator.onLine) {
        setError('You appear to be offline. Please check your internet connection.');
      } else {
        setError(err.response?.data?.error || 'Could not send the reset email. Please try again shortly.');
      }
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{
      background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 40%, #e8f4fd 70%, #dbeafe 100%)',
      position: 'relative', fontFamily: "'DM Sans','Segoe UI',sans-serif"
    }}>
      {/* Background decorative elements */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.18) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '320px', height: '320px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)' }} />
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.04 }}>
          <defs><pattern id="fp-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0ea5e9" strokeWidth="1"/></pattern></defs>
          <rect width="100%" height="100%" fill="url(#fp-grid)" />
        </svg>
      </div>

      <div className="w-full max-w-[400px]" style={{ position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div className="flex items-center gap-3 mb-7 justify-center">
          <div style={{ background: 'linear-gradient(135deg,#0369a1,#0ea5e9)', borderRadius: '14px', padding: '8px' }}>
            <img src="/EnSoGo%20Logo.png" alt="EnSoGo" className="w-8 h-8 rounded-lg object-cover" />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0c4a6e', letterSpacing: '-0.3px' }}>EnSoGo</div>
            <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px', color: '#0284c7' }}>Readiness Suite</div>
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: '24px', padding: '36px',
          border: '1px solid rgba(186,230,255,0.6)',
          boxShadow: '0 8px 40px rgba(3,105,161,0.1), 0 2px 12px rgba(3,105,161,0.06)'
        }}>
          {sent ? (
            <div className="text-center">
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', background: 'linear-gradient(135deg,#e0f2fe,#bae6fd)', border: '1px solid #7dd3fc' }}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#0369a1" strokeWidth="2" strokeLinecap="round">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
                </svg>
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0c4a6e', marginBottom: '8px' }}>Check your inbox</h2>
              <p style={{ fontSize: '12px', marginBottom: '20px', color: '#64748b', lineHeight: '1.6' }}>
                If an account exists for <span style={{ fontWeight: '600', color: '#0369a1' }}>{email}</span>, you'll receive a password reset link shortly.
              </p>
              <Link to="/login" className="block w-full py-2.5 rounded-xl text-sm font-semibold text-white text-center transition-all"
                    style={{ background: 'linear-gradient(135deg,#0369a1,#0284c7,#0ea5e9)', boxShadow: '0 4px 16px rgba(3,105,161,0.35)' }}>
                Back to Login
              </Link>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '100px', padding: '4px 12px', marginBottom: '12px' }}>
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#0284c7', letterSpacing: '0.5px' }}>Password Reset</span>
                </div>
                <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0c4a6e', letterSpacing: '-0.3px', margin: '0 0 4px 0' }}>Forgot password?</h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Enter your email and we'll send you a reset link.</p>
              </div>
              <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#475569' }}>
                    Email address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                      </svg>
                    </div>
                    <input
                      style={{ width: '100%', padding: '11px 14px 11px 38px', borderRadius: '12px', fontSize: '14px', outline: 'none', background: fieldError ? '#fff5f5' : '#f8fafc', border: `1.5px solid ${fieldError ? '#ef4444' : '#e2e8f0'}`, color: '#0f172a', transition: 'all 0.2s', boxSizing: 'border-box', boxShadow: fieldError ? '0 0 0 3px rgba(239,68,68,0.1)' : 'none' }}
                      type="email" value={email}
                      onChange={(e) => { setEmail(e.target.value); if (fieldError) setFieldError(''); }}
                      onFocus={(e) => { e.target.style.borderColor='#0284c7'; e.target.style.background='#f0f9ff'; e.target.style.boxShadow='0 0 0 3px rgba(2,132,199,0.1)'; }}
                      onBlur={(e) => {
                        if (fieldError) {
                          e.target.style.borderColor = '#ef4444';
                          e.target.style.background  = '#fff5f5';
                          e.target.style.boxShadow   = '0 0 0 3px rgba(239,68,68,0.1)';
                        } else {
                          e.target.style.borderColor = '#e2e8f0';
                          e.target.style.background  = '#f8fafc';
                          e.target.style.boxShadow   = 'none';
                        }
                      }}
                      placeholder="you@organization.com"
                    />
                  </div>
                  {fieldError && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round">
                        <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                      </svg>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#ef4444' }}>{fieldError}</span>
                    </div>
                  )}
                </div>

                {error && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 14px', borderRadius: '12px', fontSize: '12px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', color: '#dc2626' }}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
                      <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                    </svg>
                    {error}
                  </div>
                )}

                <button
                  style={{ width: '100%', padding: '13px', borderRadius: '14px', fontSize: '14px', fontWeight: '700', color: '#fff', border: 'none', cursor: busy ? 'not-allowed' : 'pointer', background: busy ? '#94a3b8' : 'linear-gradient(135deg,#0369a1,#0284c7,#0ea5e9)', boxShadow: busy ? 'none' : '0 4px 16px rgba(3,105,161,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', opacity: busy ? 0.75 : 1 }}
                  disabled={busy}>
                  {busy ? (
                    <>
                      <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'fp-spin 0.7s linear infinite' }} />
                      Sending…
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                        <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
                      </svg>
                      Send Reset Link
                    </>
                  )}
                </button>

                <div style={{ textAlign: 'center', paddingTop: '4px', borderTop: '1px solid #e8f4fe' }}>
                  <Link to="/login" style={{ fontSize: '12px', fontWeight: '600', color: '#0284c7', textDecoration: 'none' }}>
                    ← Back to Login
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes fp-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
