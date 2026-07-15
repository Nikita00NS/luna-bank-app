import React from 'react';
import { useStore } from '../lib/store';
import { haptic } from '../lib/utils';
import { HomeIcon, SwapIcon, PieChartIcon, UsersIcon, SettingsIcon } from './Icons';

const TABS = [
  { icon: HomeIcon, label: 'Wallet', page: 'home' as const },
  { icon: SwapIcon, label: 'Swap', page: 'swap' as const },
  { icon: PieChartIcon, label: 'Portfolio', page: 'portfolio' as const },
  { icon: UsersIcon, label: 'P2P', page: 'p2p' as const },
  { icon: SettingsIcon, label: 'Settings', page: 'settings' as const },
];

export default function BottomNav() {
  const { page, go } = useStore();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50" style={{ paddingBottom: 'var(--safe-bottom)', background: 'rgba(0,0,0,0.95)', borderTop: '1px solid var(--border)' }}>
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {TABS.map(t => {
          const isActive = page === t.page;
          const Icon = t.icon;
          return (
            <button key={t.page} onClick={() => { haptic('light'); go(t.page); }}
              className="flex flex-col items-center gap-0.5 py-2.5 px-4 transition-all" style={{ minWidth: 56 }}>
              <Icon size={20} color={isActive ? 'var(--text)' : 'var(--text-tertiary)'} />
              <span className="text-[9px] font-medium" style={{ color: isActive ? 'var(--text)' : 'var(--text-tertiary)' }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}