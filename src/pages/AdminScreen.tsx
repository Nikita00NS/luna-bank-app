import React, { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { getRevenueStats } from '../lib/commission';
import { haptic, formatUsd } from '../lib/utils';
import { ChevronRightIcon, RefreshIcon } from '../components/Icons';

const ICONS = {
  users: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  support: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>,
  services: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></svg>,
  settings: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
  revenue: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>,
};

export default function AdminScreen() {
  const { go } = useStore();
  const [stats, setStats] = useState({ users: 0, txs: 0, tickets: 0, revenue: 0 });
  const [revenueStats, setRevenueStats] = useState<any>(null);
  const [loadingRevenue, setLoadingRevenue] = useState(false);

  useEffect(() => {
    supabase.from('users').select('*', { count: 'exact', head: true }).then(({ count }) => setStats(s => ({ ...s, users: count || 0 })));
    supabase.from('service_purchases').select('price_usd').then(({ data }) => {
      const revenue = data?.reduce((s, p) => s + Number(p.price_usd || 0), 0) || 0;
      setStats(s => ({ ...s, revenue }));
    });
    loadRevenueStats();
  }, []);

  const loadRevenueStats = async () => {
    setLoadingRevenue(true);
    const data = await getRevenueStats();
    setRevenueStats(data);
    setLoadingRevenue(false);
  };

  const items = [
    { icon: 'users', label: 'Users', desc: `${stats.users} users`, page: 'admin-users' as const },
    { icon: 'support', label: 'Support', desc: `${stats.tickets} tickets`, page: 'admin-support' as const },
    { icon: 'services', label: 'Services', desc: 'Events, maintenance, catalog', page: 'admin-services' as const },
    { icon: 'settings', label: 'Settings', desc: 'Commission, subscriptions', page: 'admin-settings' as const },
    { icon: 'revenue', label: 'Revenue', desc: revenueStats ? `${formatUsd(revenueStats.total_revenue_usd)} total` : 'Loading...', page: 'admin-revenue' as const },
  ];

  return (
    <div className="page safe-top">
      <div className="px-4 py-3 flex items-center justify-between">
        <p className="text-base font-semibold">Admin Panel</p>
        <button onClick={loadRevenueStats} disabled={loadingRevenue} className="w-9 h-9 rounded-lg flex items-center justify-center active:bg-[var(--bg-card)] transition-all">
          <RefreshIcon size={16} color={loadingRevenue ? 'var(--accent)' : 'var(--text-tertiary)'} className={loadingRevenue ? 'animate-spin' : ''} />
        </button>
      </div>
      <div className="px-4 mt-2 grid grid-cols-2 gap-3">
        <div className="card p-4"><p className="text-xs text-[var(--text-tertiary)]">Users</p><p className="text-2xl font-bold mono mt-1">{stats.users}</p></div>
        <div className="card p-4"><p className="text-xs text-[var(--text-tertiary)]">Revenue</p><p className="text-2xl font-bold mono mt-1 text-[var(--green)]">{revenueStats ? formatUsd(revenueStats.total_revenue_usd) : '$0.00'}</p></div>
      </div>
      <div className="px-4 mt-4 space-y-1">
        {items.map(item => (
          <button key={item.label} onClick={() => { haptic('light'); go(item.page); }}
            className="w-full card p-4 flex items-center gap-3 active:bg-[var(--bg-card-hover)] transition-all">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--bg-surface)] text-[var(--text-secondary)]">{ICONS[item.icon as keyof typeof ICONS]}</div>
            <div className="flex-1 text-left"><p className="text-sm font-medium">{item.label}</p><p className="text-xs text-[var(--text-tertiary)]">{item.desc}</p></div>
            <ChevronRightIcon size={16} color="var(--text-tertiary)" />
          </button>
        ))}
      </div>
    </div>
  );
}