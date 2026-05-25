// Shown when this browser already has the opposite session type active.
// mode="admin"  → Admin Panel is blocked because Main App session exists
// mode="user"   → Main App is blocked because Admin Panel session exists
export default function SessionConflictScreen({ mode, onClear }) {
  const isAdmin = mode === 'admin';
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
      background: isAdmin
        ? 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f172a 100%)'
        : 'linear-gradient(135deg,#e0f2fe 0%,#f0f9ff 40%,#e8f4fd 70%,#dbeafe 100%)',
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
    }}>
      <div style={{
        width: '100%', maxWidth: '420px',
        background: isAdmin ? 'rgba(255,255,255,0.05)' : '#ffffff',
        backdropFilter: isAdmin ? 'blur(12px)' : 'none',
        border: isAdmin ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(186,230,255,0.6)',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: isAdmin
          ? '0 24px 80px rgba(0,0,0,0.5)'
          : '0 8px 40px rgba(3,105,161,0.1)',
        textAlign: 'center',
      }}>
        {/* Icon */}
        <div style={{
          width: '60px', height: '60px', borderRadius: '16px', margin: '0 auto 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isAdmin ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)',
          border: isAdmin ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(239,68,68,0.2)',
        }}>
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none"
               stroke={isAdmin ? '#fca5a5' : '#ef4444'} strokeWidth="1.8"
               strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
        </div>

        {/* Title */}
        <div style={{
          fontSize: '18px', fontWeight: 700, marginBottom: '10px',
          color: isAdmin ? '#f1f5f9' : '#0c4a6e',
        }}>
          {isAdmin ? 'Admin Panel Blocked' : 'Main App Blocked'}
        </div>

        {/* Message */}
        <div style={{
          fontSize: '13px', lineHeight: '1.65', marginBottom: '28px',
          color: isAdmin ? 'rgba(255,255,255,0.55)' : '#64748b',
        }}>
          {isAdmin
            ? 'The Admin Panel cannot be opened while a Main App session is active in this browser. Please use a different browser or incognito window, or sign out of the Main App first.'
            : 'The Main App cannot be opened while an Admin Panel session is active in this browser. Please use a different browser or incognito window, or sign out of the Admin Panel first.'}
        </div>

        {/* Clear session button */}
        <button
          onClick={onClear}
          style={{
            width: '100%', padding: '12px',
            borderRadius: '12px', border: 'none',
            background: isAdmin
              ? 'linear-gradient(135deg,#3b82f6,#6366f1)'
              : 'linear-gradient(135deg,#0369a1,#0284c7,#0ea5e9)',
            color: '#fff', fontSize: '14px', fontWeight: 600,
            cursor: 'pointer',
            boxShadow: isAdmin
              ? '0 4px 16px rgba(59,130,246,0.3)'
              : '0 4px 16px rgba(3,105,161,0.35)',
          }}
        >
          {isAdmin
            ? 'Sign Out of Main App & Continue'
            : 'Sign Out of Admin Panel & Continue'}
        </button>

        <div style={{ marginTop: '16px', fontSize: '11px', color: isAdmin ? 'rgba(255,255,255,0.25)' : '#94a3b8' }}>
          This browser profile can only run one session at a time.
        </div>
      </div>
    </div>
  );
}
