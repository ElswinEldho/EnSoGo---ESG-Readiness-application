import React, { useEffect, useState, useMemo, memo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useUpload } from '../lib/uploadContext.jsx';
import { sectorName } from '../lib/sectors.js';
import { routeForStatus } from '../constants/index.js';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
// ReadinessReady = fully completed; anything else = in progress
const statusColour = (s) => s === 'ReadinessReady' ? '#059669' : '#d97706';
const statusLabel  = (s) => s === 'ReadinessReady' ? 'Completed'  : 'In Progress';

/* ─── Score Arc ───────────────────────────────────────────────────────────── */
const ScoreArc = memo(function ScoreArc({ score = 0, size = 80 }) {
  const r = 28, stroke = 6;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(1, score / 100) * circ;
  const col = score >= 75 ? '#059669' : score >= 50 ? '#d97706' : '#ef4444';
  return (
    <svg width={size} height={size} viewBox="0 0 70 70">
      <circle cx="35" cy="35" r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
      <circle cx="35" cy="35" r={r} fill="none" stroke={col} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
        transform="rotate(-90 35 35)" style={{ transition: 'stroke-dasharray 1s ease' }} />
      <text x="35" y="39" textAnchor="middle" fontSize="13" fontWeight="700" fill="#0f172a">{score}</text>
    </svg>
  );
}); // end memo(ScoreArc)

/* ─── Assessment detail popup ────────────────────────────────────────────── */
function AssessmentPopup({ item, onClose, onOpen }) {
  if (!item) return null;
  const [downloading, setDownloading] = React.useState(false);
  const [dlError, setDlError] = React.useState('');
  const isCompleted = item.status === 'ReadinessReady';
  const score = item.readiness?.overall?.score;
  const completeness = item.summary?.overview?.overallCompletenessPct;

  async function handleDownload() {
    setDlError('');
    setDownloading(true);
    try {
      const response = await api.get(`/reports/${item.ensogoId}/readiness`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const disposition = response.headers['content-disposition'] || '';
      const nameMatch = disposition.match(/filename="?([^"]+)"?/);
      a.download = nameMatch ? nameMatch[1] : `EnSoGo_Readiness_Report_${item.organizationName || 'Report'}.pdf`;
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
    } catch (_err) {
      setDlError('Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  }
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(8px)' }}
         onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        width: '100%', maxWidth: '440px', margin: '16px', overflow: 'hidden',
        border: '1px solid #e2e8f0'
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', marginBottom: '4px' }}>Assessment Details</div>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#0f172a', margin: 0 }}>{item.organizationName || 'Untitled'}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '100px', background: '#f1f5f9', color: '#64748b' }}>{sectorName(item.sectorCode)}</span>
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>{new Date(item.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: '#f8fafc', cursor: 'pointer', color: '#94a3b8' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
            {[
              { label: 'Status', value: statusLabel(item.status), color: statusColour(item.status) },
              completeness !== undefined && { label: 'Data', value: `${completeness}%`, color: '#0284c7' },
              score !== undefined && { label: 'Score', value: `${score}/100`, color: score >= 75 ? '#059669' : score >= 50 ? '#d97706' : '#ef4444' },
            ].filter(Boolean).map((c, i) => (
              <div key={i} style={{ borderRadius: '12px', padding: '12px', textAlign: 'center', background: '#f8fafc', border: '1px solid #e8f0ec' }}>
                <div style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#94a3b8', marginBottom: '4px' }}>{c.label}</div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: c.color }}>{c.value}</div>
              </div>
            ))}
          </div>
          {score !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '14px', background: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)', border: '1px solid #bae6fd' }}>
              <ScoreArc score={score} size={64} />
              <div>
                <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>Overall Readiness</div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>{item.readiness?.overall?.label || '—'}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>Readiness scoring</div>
              </div>
            </div>
          )}
        </div>
        {/* Download error */}
        {dlError && (
          <div style={{ margin: '0 16px', padding: '8px 12px', borderRadius: '10px', fontSize: '12px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca' }}>
            {dlError}
          </div>
        )}

        <div style={{ padding: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '8px' }}>
          {isCompleted ? (
            /* Completed — direct PDF download, no navigation into assessment pages */
            <button
              onClick={handleDownload}
              disabled={downloading}
              style={{
                flex: 1, padding: '10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700',
                color: '#fff', border: 'none', cursor: downloading ? 'not-allowed' : 'pointer',
                background: downloading ? '#94a3b8' : 'linear-gradient(135deg,#059669,#10b981)',
                boxShadow: downloading ? 'none' : '0 4px 12px rgba(5,150,105,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                transition: 'all 0.15s',
              }}
            >
              {downloading ? (
                <>
                  <div style={{ width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'dashboard-spin 0.7s linear infinite' }} />
                  Generating…
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/>
                  </svg>
                  Download Paper Report
                </>
              )}
            </button>
          ) : (
            /* In-progress — resume at the correct workflow step */
            <button onClick={() => onOpen(item)} style={{
              flex: 1, padding: '10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700',
              color: '#fff', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#d97706,#f59e0b)',
              boxShadow: '0 4px 12px rgba(217,119,6,0.3)',
            }}>Resume →</button>
          )}
          <button onClick={onClose} style={{
            padding: '10px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: '600',
            color: '#64748b', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer',
          }}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Assessment History popup ───────────────────────────────────────────── */
function AssessmentHistoryPopup({ items, onClose, onSelect }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)' }}
         onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
        width: '100%', maxWidth: '640px', margin: '16px', display: 'flex', flexDirection: 'column',
        maxHeight: '80vh', border: '1px solid #e2e8f0'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Assessment History</h2>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>{items.length} record{items.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: '#f8fafc', cursor: 'pointer', color: '#94a3b8' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {items.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 0', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="1.6" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M12 11v6M9 14h6"/></svg>
              </div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>No assessments yet</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Start a new assessment from the dashboard</div>
            </div>
          ) : items.map((a) => {
            const score = a.readiness?.overall?.score;
            const completeness = a.summary?.overview?.overallCompletenessPct;
            const col = statusColour(a.status);
            return (
              <button key={a.ensogoId} onClick={() => onSelect(a)} style={{
                width: '100%', textAlign: 'left', borderRadius: '14px', padding: '14px 16px',
                border: '1px solid #e8f0ec', background: '#fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)', cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'none'; }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ flexShrink: 0 }}>
                    {score !== undefined ? <ScoreArc score={score} size={48} /> : (
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', border: '2px solid #e2e8f0' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6"/></svg>
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{a.organizationName || 'Untitled'}</span>
                      <span style={{ fontSize: '9px', fontWeight: '800', padding: '2px 7px', borderRadius: '100px', background: col + '18', color: col, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{statusLabel(a.status)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>{new Date(a.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: '6px' }}>{sectorName(a.sectorCode)}</span>
                    </div>
                    {completeness !== undefined && (
                      <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '4px', borderRadius: '100px', background: '#f1f5f9', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: '100px', width: `${completeness}%`, background: completeness >= 75 ? '#059669' : completeness >= 50 ? '#d97706' : '#ef4444', transition: 'width 0.8s ease' }} />
                        </div>
                        <span style={{ fontSize: '10px', color: '#94a3b8', flexShrink: 0 }}>{completeness}%</span>
                      </div>
                    )}
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5" style={{ flexShrink: 0 }}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Stat Card ──────────────────────────────────────────────────────────── */
const StatCard = memo(function StatCard({ label, value, subtitle, iconPath, accent, bg, onClick, clickable, badge }) {
  return (
    <button
      onClick={onClick}
      disabled={!clickable}
      style={{
        position: 'relative', display: 'flex', flexDirection: 'column',
        padding: '22px', borderRadius: '20px', textAlign: 'left',
        width: '100%', border: `1px solid ${accent}22`,
        background: bg || '#fff',
        boxShadow: `0 2px 16px ${accent}0f`,
        cursor: clickable ? 'pointer' : 'default',
        transition: 'all 0.25s', overflow: 'hidden'
      }}
      onMouseEnter={e => { if (clickable) { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 28px ${accent}22`; }}}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 2px 16px ${accent}0f`; }}
    >
      {/* Background glow blob */}
      <div style={{
        position: 'absolute', top: '-20px', right: '-20px',
        width: '100px', height: '100px', borderRadius: '50%',
        background: `radial-gradient(circle, ${accent}20 0%, transparent 70%)`,
        pointerEvents: 'none'
      }} />

      {/* Icon row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', width: '100%' }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `linear-gradient(135deg, ${accent}22, ${accent}12)`,
          border: `1px solid ${accent}20`
        }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d={iconPath} />
          </svg>
        </div>
        {badge && (
          <span style={{ fontSize: '9px', fontWeight: '800', padding: '3px 8px', borderRadius: '100px', background: accent + '18', color: accent, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{badge}</span>
        )}
        {clickable && (
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: accent + '12' }}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        )}
      </div>

      <div style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a', lineHeight: 1, marginBottom: '6px' }}>{value}</div>
      <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>{label}</div>
      {subtitle && <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '3px' }}>{subtitle}</div>}

      {/* Bottom accent line */}
      <div style={{
        position: 'absolute', bottom: 0, left: '20%', right: '20%', height: '3px',
        borderRadius: '3px 3px 0 0',
        background: `linear-gradient(90deg, transparent, ${accent}55, transparent)`,
        opacity: clickable ? 1 : 0.4
      }} />
    </button>
  );
}); // end memo(StatCard)

/* ─── Main Dashboard ─────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { user } = useAuth();
  const { setHasUpload } = useUpload();
  const nav = useNavigate();
  const [items, setItems]             = useState([]);
  const [busy, setBusy]               = useState(false);
  const [selected, setSelected]       = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  // Ref-based lock: prevents double-clicks that fire before React re-renders
  // the button as disabled. Unlike state, ref reads are synchronous.
  const creatingRef = useRef(false);

  const [createError, setCreateError] = useState('');

  useEffect(() => {
    api.get('/assessments').then(r => {
      setItems(r.data);
      // Re-seed the upload context so the sidebar nav (Summary / Readiness) stays
      // enabled for assessments that already have processed uploads — this is
      // essential after a logout → re-login since the context resets to empty.
      r.data.forEach(a => {
        // An assessment has uploads if its summary has been computed at least once.
        if (a.summary) setHasUpload(a.ensogoId, true);
      });
    }).catch(() => {});
  }, [setHasUpload]);

  async function createNew() {
    // Synchronous guard — state updates are async so disabled={busy} alone
    // cannot block a second click that lands before the first re-render.
    if (creatingRef.current) return;
    creatingRef.current = true;
    setBusy(true); setCreateError('');
    try {
      const r = await api.post('/assessments');
      nav(`/assessment/${r.data.ensogoId}/data-load`);
      // Note: nav() unmounts this component, so no need to reset refs on success.
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Could not create assessment. Please check your connection and try again.');
      creatingRef.current = false;
    } finally { setBusy(false); }
  }

  function openItem(a) {
    setSelected(null); setShowHistory(false);
    nav(`/assessment/${a.ensogoId}/${routeForStatus(a.status)}`);
  }

  const { completed, avgScore, inProgress } = useMemo(() => {
    const comp = items.filter(a => a.status === 'ReadinessReady').length;
    const scored = items.filter(a => a.readiness?.overall?.score !== undefined);
    const avg = scored.length
      ? Math.round(scored.reduce((s, a) => s + a.readiness.overall.score, 0) / scored.length)
      : null;
    const inProg = items.filter(a => a.status !== 'ReadinessReady').length;
    return { completed: comp, avgScore: avg, inProgress: inProg };
  }, [items]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    // overflow:hidden clips ambient orbs that extend beyond bounds — prevents CLS
    <div style={{
      minHeight: '100%',
      background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 40%, #e8f4fd 70%, #dbeafe 100%)',
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* ── Gradient bridge: bleeds from sidebar blue into page ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0, width: '80px', pointerEvents: 'none', zIndex: 0,
        background: 'linear-gradient(90deg, rgba(2,132,199,0.22) 0%, rgba(14,165,233,0.08) 60%, transparent 100%)',
      }} />
      {/* Ambient radial orbs matching login */}
      <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '420px', height: '420px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.15) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '60px', left: '60px', width: '320px', height: '320px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,233,0.10) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Subtle dot grid matching login left panel */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.045, pointerEvents: 'none', zIndex: 0 }}>
        <defs>
          <pattern id="dash-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0ea5e9" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dash-grid)" />
      </svg>

      {/* ── Hero Banner ── */}
      <div style={{ padding: '28px 28px 0', position: 'relative', zIndex: 1 }}>
        <div style={{
          borderRadius: '24px', padding: '28px 32px', position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(160deg, #0369a1 0%, #0284c7 40%, #0ea5e9 100%)',
          boxShadow: '0 8px 40px rgba(3,105,161,0.30)',
        }}>
          {/* Decorative orbs — same as login card */}
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '220px', height: '220px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-50px', right: '120px', width: '170px', height: '170px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: '280px', top: '-20px', width: '90px', height: '90px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

          {/* Grid texture matching login panel */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06, pointerEvents: 'none' }}>
            <defs>
              <pattern id="hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#fff" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-grid)" />
          </svg>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#86efac', boxShadow: '0 0 8px rgba(134,239,172,0.8)' }} />
                <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.65)' }}>ESG Readiness Suite · Live</span>
              </div>
              <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', lineHeight: 1.2, margin: '0 0 6px', letterSpacing: '-0.3px' }}>
                {greeting}{user?.organizationName ? `, ${user.organizationName}` : ''}
              </h1>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', margin: 0 }}>
                {user?.sectorCode ? `Sector: ${sectorName(user.sectorCode)} · ` : ''}Track, measure, and improve your ESG performance
              </p>
            </div>

            <button onClick={createNew} disabled={busy} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '13px 24px', borderRadius: '14px', fontSize: '14px', fontWeight: '700',
              color: '#fff', border: '2px solid rgba(255,255,255,0.25)', cursor: busy ? 'not-allowed' : 'pointer',
              background: busy
                ? 'rgba(255,255,255,0.15)'
                : 'linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #ec4899 100%)',
              boxShadow: busy ? 'none' : '0 4px 20px rgba(245,158,11,0.45), 0 2px 8px rgba(0,0,0,0.2)',
              transition: 'all 0.25s', flexShrink: 0, letterSpacing: '0.2px'
            }}
            onMouseEnter={e => { if (!busy) { e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(245,158,11,0.5), 0 4px 12px rgba(0,0,0,0.25)'; }}}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(245,158,11,0.45), 0 2px 8px rgba(0,0,0,0.2)'; }}>
              {busy ? (
                <>
                  <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'dashboard-spin 0.7s linear infinite' }} />
                  Creating…
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                  Start Assessment
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Assessment creation error */}
      {createError && (
        <div style={{ margin: '12px 28px 0', position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '14px', fontSize: '13px', background: 'rgba(254,242,242,0.92)', border: '1px solid #fecaca', color: '#dc2626' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
          </svg>
          <span style={{ flex: 1 }}>{createError}</span>
          <button onClick={() => setCreateError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '0 2px', fontSize: '16px', lineHeight: 1 }}>x</button>
        </div>
      )}

      <div style={{ padding: '20px 28px 28px', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', zIndex: 1 }}>

        {/* ── Stat Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <StatCard
            label="Total Assessments"
            value={items.length}
            subtitle="Click to view all history"
            iconPath="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            accent="#0284c7"
            bg="rgba(255,255,255,0.82)"
            clickable={items.length > 0}
            onClick={() => items.length > 0 && setShowHistory(true)}
            badge={items.length > 0 ? 'View All' : null}
          />
          <StatCard
            label="Assessments Completed"
            value={completed}
            subtitle={`${inProgress} in progress`}
            iconPath="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            accent="#059669"
            bg="rgba(255,255,255,0.82)"
            clickable={false}
            badge={completed > 0 ? `${Math.round((completed / Math.max(items.length, 1)) * 100)}%` : null}
          />
          <StatCard
            label="Avg Readiness Score"
            value={avgScore !== null ? avgScore : '—'}
            subtitle={avgScore !== null ? (avgScore >= 75 ? 'Excellent performance' : avgScore >= 50 ? 'Moderate performance' : 'Needs improvement') : 'No scored assessments yet'}
            iconPath="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
            accent="#d97706"
            bg="rgba(255,255,255,0.82)"
            clickable={false}
            badge={avgScore !== null ? (avgScore >= 75 ? '🟢 High' : avgScore >= 50 ? '🟡 Mid' : '🔴 Low') : null}
          />
        </div>

        {/* ── Main Content Area ── */}
        {items.length === 0 ? (
          /* Empty State */
          <div style={{
            background: '#ffffff', borderRadius: '20px', padding: '56px 32px',
            textAlign: 'center', border: '1px solid rgba(186,230,253,0.6)',
            boxShadow: '0 4px 24px rgba(3,105,161,0.08)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'linear-gradient(135deg,#e0f2fe,#bae6fd)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #7dd3fc' }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M12 11v6M9 14h6"/>
                  </svg>
                </div>
                <div style={{ position: 'absolute', top: '-6px', right: '-6px', width: '24px', height: '24px', borderRadius: '50%', background: 'linear-gradient(135deg,#0284c7,#0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                </div>
              </div>
            </div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#0c4a6e', marginBottom: '8px' }}>Start your ESG journey</div>
            <div style={{ fontSize: '13px', color: '#475569', maxWidth: '360px', margin: '0 auto 24px', lineHeight: 1.6 }}>
              Create your first ESG readiness assessment to benchmark your organization’s sustainability performance.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '28px' }}>
              {['GHG Protocol', 'ISO 14001', 'LEED', 'IGBC', 'BRSR'].map(tag => (
                <span key={tag} style={{ fontSize: '11px', fontWeight: '700', padding: '4px 12px', borderRadius: '100px', background: '#e0f2fe', border: '1px solid #7dd3fc', color: '#0369a1' }}>{tag}</span>
              ))}
            </div>
            <button onClick={createNew} style={{
              padding: '14px 32px', borderRadius: '16px', fontSize: '15px', fontWeight: '800',
              color: '#fff', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #ec4899 100%)',
              boxShadow: '0 6px 24px rgba(245,158,11,0.4), 0 2px 8px rgba(0,0,0,0.10)',
              display: 'inline-flex', alignItems: 'center', gap: '10px',
              letterSpacing: '0.2px', transition: 'all 0.25s'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(245,158,11,0.5), 0 4px 12px rgba(0,0,0,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(245,158,11,0.4), 0 2px 8px rgba(0,0,0,0.10)'; }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              Start Your Assessment
            </button>
          </div>
        ) : null}
      </div>

      {/* ── Popups ── */}
      {showHistory && (
        <AssessmentHistoryPopup items={items} onClose={() => setShowHistory(false)} onSelect={(a) => { setShowHistory(false); setSelected(a); }} />
      )}
      {selected && (
        <AssessmentPopup item={selected} onClose={() => setSelected(null)} onOpen={openItem} />
      )}

      <style>{`
        @keyframes dashboard-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
