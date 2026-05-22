/**
 * ConfirmModal — reusable confirmation dialog for destructive actions.
 */

import { useDarkMode } from './AdminLayout';

export default function ConfirmModal({ open, title, message, confirmLabel = 'Confirm', danger = true, onConfirm, onCancel, loading = false }) {
  const { dark } = useDarkMode();
  if (!open) return null;

  const bg = dark ? '#1e293b' : '#ffffff';
  const textColor = dark ? '#f1f5f9' : '#1e293b';
  const subColor = dark ? 'rgba(255,255,255,0.55)' : '#64748b';
  const border = dark ? 'rgba(255,255,255,0.1)' : '#e2e8f0';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)', padding: '16px',
    }}>
      <div style={{
        background: bg, borderRadius: '14px', padding: '28px', maxWidth: '420px', width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border: `1px solid ${border}`,
      }}>
        <div style={{ fontSize: '16px', fontWeight: 700, color: textColor, marginBottom: '8px' }}>
          {title}
        </div>
        <div style={{ fontSize: '14px', color: subColor, lineHeight: 1.6, marginBottom: '24px' }}>
          {message}
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} disabled={loading}
            style={{
              padding: '8px 18px', borderRadius: '8px', border: `1px solid ${border}`,
              background: 'transparent', color: textColor, cursor: 'pointer', fontSize: '13px',
            }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            style={{
              padding: '8px 18px', borderRadius: '8px', border: 'none',
              background: danger ? '#ef4444' : '#3b82f6',
              color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '13px', fontWeight: 600, opacity: loading ? 0.7 : 1,
            }}>
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
