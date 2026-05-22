/**
 * AdminToast — lightweight toast notification system.
 */

import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

let toastId = 0;

export function AdminToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, type = 'success', duration = 3500) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  const colors = {
    success: { bg: '#22c55e', text: '#fff' },
    error: { bg: '#ef4444', text: '#fff' },
    info: { bg: '#3b82f6', text: '#fff' },
    warning: { bg: '#f59e0b', text: '#fff' },
  };

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div style={{
        position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end',
      }}>
        {toasts.map((t) => (
          <div key={t.id} style={{
            padding: '12px 18px',
            borderRadius: '10px',
            background: colors[t.type]?.bg || '#1e293b',
            color: colors[t.type]?.text || '#fff',
            fontSize: '13px', fontWeight: 500,
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            animation: 'slideIn 0.2s ease',
            maxWidth: '340px',
          }}>
            {t.message}
          </div>
        ))}
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(20px); opacity:0; } to { transform: translateX(0); opacity:1; } }`}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within AdminToastProvider');
  return ctx.show;
}
