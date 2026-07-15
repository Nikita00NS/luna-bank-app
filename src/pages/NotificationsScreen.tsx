import React from 'react';
import { useStore } from '../lib/store';
import { haptic, formatTimeAgo } from '../lib/utils';
import { ArrowLeftIcon } from '../components/Icons';

const getIcon = (type: string) => {
  switch (type) {
    case 'transaction': return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>;
    case 'system': return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>;
    case 'service': return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>;
    case 'support': return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>;
    default: return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>;
  }
};

export default function NotificationsScreen() {
  const { go, back, notifications, markRead } = useStore();

  const handleMarkAllRead = () => { notifications.forEach(n => { if (!n.read) markRead(n.id); }); haptic('light'); };

  return (
    <div className="page safe-top">
      <div className="header">
        <button onClick={() => { haptic('light'); back(); }} className="back-btn"><ArrowLeftIcon size={18} color="var(--text)" /></button>
        <p className="header-title">Notifications</p>
        {notifications.some(n => !n.read) && <button onClick={handleMarkAllRead} className="text-xs text-[var(--accent)] ml-auto">Mark all read</button>}
      </div>
      <div className="px-4 mt-4 space-y-1">
        {notifications.length === 0 ? (
          <div className="py-16 text-center"><p className="text-sm text-[var(--text-tertiary)]">No notifications</p></div>
        ) : notifications.map(n => (
          <button key={n.id} onClick={() => { markRead(n.id); haptic('light'); }}
            className={`w-full flex items-start gap-3 p-3.5 rounded-xl transition-all text-left ${!n.read ? 'bg-[var(--accent)]/5' : 'active:bg-[var(--bg-card)]'}`}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--bg-surface)] text-[var(--text-secondary)]">{getIcon(n.type)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{n.title}</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{n.message}</p>
            </div>
            {!n.read && <div className="w-2 h-2 rounded-full bg-[var(--accent)] mt-1.5 shrink-0" />}
          </button>
        ))}
      </div>
    </div>
  );
}