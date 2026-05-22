/**
 * AdminBadge — colored status/role badge.
 */

const COLORS = {
  // Status
  Active: { bg: '#dcfce7', text: '#166534', darkBg: 'rgba(34,197,94,0.15)', darkText: '#86efac' },
  Locked: { bg: '#fee2e2', text: '#991b1b', darkBg: 'rgba(239,68,68,0.15)', darkText: '#fca5a5' },
  PendingVerification: { bg: '#fef3c7', text: '#92400e', darkBg: 'rgba(245,158,11,0.15)', darkText: '#fcd34d' },
  // Roles
  SUPER_ADMIN: { bg: '#ede9fe', text: '#5b21b6', darkBg: 'rgba(139,92,246,0.15)', darkText: '#c4b5fd' },
  ADMIN: { bg: '#dbeafe', text: '#1e40af', darkBg: 'rgba(59,130,246,0.15)', darkText: '#93c5fd' },
  ANALYST: { bg: '#e0f2fe', text: '#0369a1', darkBg: 'rgba(14,165,233,0.15)', darkText: '#7dd3fc' },
  AUDITOR: { bg: '#f0fdf4', text: '#166534', darkBg: 'rgba(34,197,94,0.15)', darkText: '#86efac' },
  SUPPORT: { bg: '#f1f5f9', text: '#475569', darkBg: 'rgba(100,116,139,0.15)', darkText: '#94a3b8' },
  // Assessment status
  DataLoad: { bg: '#f1f5f9', text: '#475569', darkBg: 'rgba(100,116,139,0.15)', darkText: '#94a3b8' },
  SummaryReady: { bg: '#dbeafe', text: '#1e40af', darkBg: 'rgba(59,130,246,0.15)', darkText: '#93c5fd' },
  ReadinessReady: { bg: '#dcfce7', text: '#166534', darkBg: 'rgba(34,197,94,0.15)', darkText: '#86efac' },
  Archived: { bg: '#f1f5f9', text: '#475569', darkBg: 'rgba(100,116,139,0.15)', darkText: '#94a3b8' },
};

export default function AdminBadge({ value, dark = false }) {
  if (!value) return <span style={{ color: '#94a3b8' }}>—</span>;
  const c = COLORS[value];
  if (!c) return <span style={{ fontSize: '12px', color: dark ? '#cbd5e1' : '#475569' }}>{value}</span>;
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: 600,
      background: dark ? c.darkBg : c.bg,
      color: dark ? c.darkText : c.text,
      letterSpacing: '0.03em',
    }}>
      {value}
    </span>
  );
}
