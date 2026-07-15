import React from 'react';
import { useStore } from '../lib/store';
import { haptic, formatDate } from '../lib/utils';
import { ArrowLeftIcon } from '../components/Icons';
import { toastSuccess } from '../lib/toast';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  streaming: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>,
  gaming: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="2" x2="6.01" y2="2" /><line x1="10" y1="2" x2="10.01" y2="2" /><line x1="14" y1="2" x2="14.01" y2="2" /><line x1="18" y1="2" x2="18.01" y2="2" /><line x1="2" y1="6" x2="2.01" y2="6" /><line x1="18" y1="6" x2="18.01" y2="6" /><line x1="2" y1="10" x2="2.01" y2="10" /><line x1="6" y1="10" x2="6.01" y2="10" /><line x1="10" y1="10" x2="10.01" y2="10" /><line x1="14" y1="10" x2="14.01" y2="10" /><line x1="2" y1="14" x2="2.01" y2="14" /><line x1="6" y1="14" x2="6.01" y2="14" /><line x1="10" y1="14" x2="10.01" y2="14" /><line x1="14" y1="14" x2="14.01" y2="14" /><line x1="18" y1="14" x2="18.01" y2="14" /><line x1="2" y1="18" x2="2.01" y2="18" /><line x1="18" y1="18" x2="18.01" y2="18" /><line x1="2" y1="22" x2="2.01" y2="22" /><line x1="6" y1="22" x2="6.01" y2="22" /><line x1="10" y1="22" x2="10.01" y2="22" /><line x1="14" y1="22" x2="14.01" y2="22" /><line x1="18" y1="22" x2="18.01" y2="22" /></svg>,
  software: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></svg>,
  social: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>,
  cloud: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" /></svg>,
  vpn: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></svg>,
};

export default function ServiceHistoryScreen() {
  const { go, back, purchases } = useStore();

  return (
    <div className="page safe-top">
      <div className="header">
        <button onClick={() => { haptic('light'); back(); }} className="back-btn"><ArrowLeftIcon size={18} color="var(--text)" /></button>
        <p className="header-title">Purchase History</p>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {purchases.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-card)] flex items-center justify-center mx-auto mb-3 border border-[var(--border)]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </div>
            <p className="font-semibold">No purchases</p>
            <p className="text-sm text-[var(--text-tertiary)] mt-1">Paid services will appear here</p>
            <button onClick={() => go('services')} className="btn btn-primary mt-4 max-w-[200px]">Browse Services</button>
          </div>
        ) : (
          purchases.map((p) => {
            const isActive = p.status === 'active';
            const daysLeft = p.expires_at ? Math.ceil((new Date(p.expires_at).getTime() - Date.now()) / 86400000) : 0;
            return (
              <div key={p.id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-secondary)]">
                      {CATEGORY_ICONS[p.service_category] || CATEGORY_ICONS.software}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{p.service_name}</p>
                      <p className="text-[10px] text-[var(--text-tertiary)]">{p.period}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${isActive ? 'text-[var(--green)]' : 'text-[var(--text-tertiary)]'}`}
                    style={{ background: isActive ? 'var(--green)/10' : 'var(--bg-card)' }}>
                    {isActive ? 'Active' : 'Expired'}
                  </span>
                </div>

                <div className="text-xs space-y-1 mb-3 text-[var(--text-tertiary)]">
                  <div className="flex justify-between"><span>Amount</span><span>${p.price_usd.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Code</span><span className="font-mono font-bold">{p.activation_code}</span></div>
                  {daysLeft > 0 && (
                    <div className="flex justify-between"><span>Expires in</span><span className="text-[var(--green)]">{daysLeft} days</span></div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button onClick={() => { navigator.clipboard.writeText(p.activation_code); haptic('success'); toastSuccess('Copied'); }}
                    className="flex-1 py-2 rounded-lg text-[10px] font-medium bg-[var(--bg-card)] text-[var(--text-secondary)]">
                    Copy Code
                  </button>
                  <button onClick={() => {
                    (window as any).__luna_service = { id: p.service_name.toLowerCase(), name: p.service_name, cat: p.service_category, price: p.price_usd / 1.05, desc: 'Renew' };
                    go('service-pay');
                  }}
                    className="flex-1 py-2 rounded-lg text-[10px] font-medium bg-[var(--accent)] text-white">
                    Renew
                  </button>
                  <button onClick={() => { window.open(`https://tonviewer.com/transaction/${p.tx_hash}`, '_blank'); }}
                    className="py-2 px-3 rounded-lg text-[10px] font-medium bg-[var(--bg-card)] text-[var(--text-tertiary)]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}