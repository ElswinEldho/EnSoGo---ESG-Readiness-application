/**
 * AdminLogin — standalone admin login page (no sidebar).
 * Shows a session conflict screen if a Main App session is already active
 * in this browser profile.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../lib/adminAuth';

export default function AdminLogin() {
  const { login, sessionConflict, clearUserSession } = useAdminAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/admin');
    } catch (err) {
      if (err.isSessionConflict) return; // conflict screen already shown
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Session conflict screen ────────────────────────────────────────────────
  if (sessionConflict) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f172a 100%)',
        padding: '24px', fontFamily: "'DM Sans','Segoe UI',sans-serif",
      }}>
        <div style={{ position:'fixed', top:'-10%', right:'-10%', width:'400px', height:'400px', borderRadius:'50%', background:'rgba(59,130,246,0.08)', pointerEvents:'none' }} />
        <div style={{ position:'fixed', bottom:'-10%', left:'-10%', width:'300px', height:'300px', borderRadius:'50%', background:'rgba(99,102,241,0.06)', pointerEvents:'none' }} />

        <div style={{
          background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px',
          padding: '40px', width: '100%', maxWidth: '420px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)', textAlign: 'center', position: 'relative', zIndex: 10,
        }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '16px', margin: '0 auto 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
          }}>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none"
                 stroke="#fca5a5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          </div>

          <div style={{ color: '#f1f5f9', fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>
            Admin Panel Blocked
          </div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', lineHeight: '1.65', marginBottom: '28px' }}>
            The Admin Panel cannot be opened while a Main App session is active in this browser.
            Use a different browser or incognito window, or sign out of the Main App first.
          </div>

          <button
            onClick={clearUserSession}
            style={{
              width: '100%', padding: '12px', borderRadius: '12px', border: 'none',
              background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
              color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(59,130,246,0.3)', marginBottom: '14px',
            }}
          >
            Sign Out of Main App &amp; Continue
          </button>

          <div style={{ marginTop: '4px', textAlign: 'center' }}>
            <a href="/" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', textDecoration: 'none' }}>
              ← Back to main application
            </a>
          </div>
          <div style={{ marginTop: '16px', fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>
            This browser profile can only run one session type at a time.
          </div>
        </div>
      </div>
    );
  }

  // ── Normal login form ─────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f172a 100%)',
      padding: '24px',
    }}>
      {/* Decorative orbs */}
      <div style={{ position:'fixed', top:'-10%', right:'-10%', width:'400px', height:'400px', borderRadius:'50%', background:'rgba(59,130,246,0.08)', pointerEvents:'none' }} />
      <div style={{ position:'fixed', bottom:'-10%', left:'-10%', width:'300px', height:'300px', borderRadius:'50%', background:'rgba(99,102,241,0.06)', pointerEvents:'none' }} />

      <div style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '20px',
        padding: '40px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        position: 'relative', zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img src="/EnSoGo%20Logo.png" alt="EnSoGo" width="56" height="56"
               style={{ borderRadius: '14px', marginBottom: '14px', background: 'rgba(255,255,255,0.1)', padding: '4px' }} />
          <div style={{ color: '#f1f5f9', fontSize: '20px', fontWeight: 700 }}>EnSoGo Admin</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginTop: '4px' }}>
            Secure Administration Portal
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#fca5a5', borderRadius: '10px', padding: '12px 14px', fontSize: '13px',
            }}>
              {error}
            </div>
          )}

          <div>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '6px', fontWeight: 500 }}>
              Admin Email
            </label>
            <input
              type="email" required autoComplete="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="admin@ensogo.com"
              style={{
                width: '100%', padding: '11px 14px', borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.07)', color: '#f1f5f9',
                fontSize: '14px', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '6px', fontWeight: 500 }}>
              Password
            </label>
            <input
              type="password" required autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
              style={{
                width: '100%', padding: '11px 14px', borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.07)', color: '#f1f5f9',
                fontSize: '14px', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit" disabled={loading}
            style={{
              padding: '12px', borderRadius: '10px', border: 'none',
              background: loading ? 'rgba(59,130,246,0.5)' : 'linear-gradient(135deg,#3b82f6,#6366f1)',
              color: '#fff', fontSize: '14px', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '4px',
              boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
              transition: 'all 0.15s',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in to Admin Panel'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <a href="/" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', textDecoration: 'none' }}>
            ← Back to main application
          </a>
        </div>
      </div>
    </div>
  );
}
