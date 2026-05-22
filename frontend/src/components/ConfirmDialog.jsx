// Branded confirmation modal — replaces the browser `confirm()` popup.
//
// Usage in any page:
//   const [confirmState, setConfirmState] = useState(null);
//   const askConfirm = ({ title, message, confirmLabel, danger }) =>
//     new Promise((resolve) => setConfirmState({ title, message, confirmLabel, danger, resolve }));
//
//   <ConfirmDialog
//     state={confirmState}
//     onClose={(ok) => { confirmState?.resolve(ok); setConfirmState(null); }}
//   />
//
//   // call:
//   if (await askConfirm({ title: 'Clear data', message: 'Remove 12 months?', danger: true })) {
//     ...
//   }

export default function ConfirmDialog({ state, onClose }) {
  if (!state) return null;
  const { title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false } = state;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
         onClick={() => onClose(false)}>
      <div role="dialog" aria-modal="true"
           className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-ensogo-200"
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className={`shrink-0 w-10 h-10 rounded-full grid place-items-center
            ${danger ? 'bg-red-100 text-red-600' : 'bg-ensogo-100 text-ensogo-700'}`}>
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              {danger ? (
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-ensogo-900">{title}</h2>
            <p className="text-sm text-slate-600 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" className="btn-secondary" onClick={() => onClose(false)}>{cancelLabel}</button>
          <button type="button"
                  className={danger
                    ? 'btn inline-flex items-center justify-center font-medium rounded-lg px-4 py-2 transition bg-red-600 text-white hover:bg-red-700 shadow-sm'
                    : 'btn-primary'}
                  onClick={() => onClose(true)}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Tiny convenience hook for pages that just need yes/no confirmation
import { useState, useCallback } from 'react';
export function useConfirm() {
  const [state, setState] = useState(null);
  const ask = useCallback((opts) => new Promise((resolve) => setState({ ...opts, resolve })), []);
  const node = (
    <ConfirmDialog
      state={state}
      onClose={(ok) => { state?.resolve(ok); setState(null); }}
    />
  );
  return [ask, node];
}
