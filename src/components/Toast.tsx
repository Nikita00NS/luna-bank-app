import React, { useEffect, useState } from 'react';
import { subscribeToasts, removeToast, type Toast } from '../lib/toast';

const ICONS: Record<string, string> = {
  success: '✅',
  error: '❌',
  info: 'ℹ️',
  warning: '⚠️',
};

const COLORS: Record<string, { bg: string; border: string }> = {
  success: { bg: 'rgba(0,210,160,0.1)', border: 'rgba(0,210,160,0.3)' },
  error: { bg: 'rgba(255,71,87,0.1)', border: 'rgba(255,71,87,0.3)' },
  info: { bg: 'rgba(85,163,255,0.1)', border: 'rgba(85,163,255,0.3)' },
  warning: { bg: 'rgba(255,211,42,0.1)', border: 'rgba(255,211,42,0.3)' },
};

export default function ToastContainer() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    const unsub = subscribeToasts(setItems);
    return unsub;
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
      style={{ paddingTop: 'var(--safe-top)' }}>
      {items.map((toast, i) => {
        const c = COLORS[toast.type] || COLORS.info;
        return (
          <div key={toast.id}
            className="p-4 rounded-2xl shadow-2xl backdrop-blur-xl pointer-events-auto animate-slide-down"
            style={{ background: c.bg, border: `1px solid ${c.border}` }}>
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5">{ICONS[toast.type] || 'ℹ️'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-white">{toast.title}</p>
                {toast.message && (
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>{toast.message}</p>
                )}
                {toast.action && (
                  <button onClick={toast.action.onClick}
                    className="text-xs font-medium mt-1.5" style={{ color: 'var(--accent)' }}>
                    {toast.action.label}
                  </button>
                )}
              </div>
              <button onClick={() => removeToast(toast.id)}
                className="text-white/30 hover:text-white/60 active:scale-90">
                ✕
              </button>
            </div>
          </div>
        );
      })}
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-slide-down {
          animation: slideDown 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>
    </div>
  );
}