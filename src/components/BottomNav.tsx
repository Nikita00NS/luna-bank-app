import React from 'react';
import { useStore } from '../lib/store';
import { haptic } from '../lib/utils';
import { HomeIcon, WalletIcon, TrendingUpIcon, NewspaperIcon, MessageIcon } from './Icons';

const TABS = [
  { icon: HomeIcon, label: 'Главная' },
  { icon: WalletIcon, label: 'Счета' },
  { icon: TrendingUpIcon, label: 'Портфель' },
  { icon: NewspaperIcon, label: 'Витрина' },
  { icon: MessageIcon, label: 'Чаты' },
];

export default function BottomNav() {
  const { tab: activeTab, setTab } = useStore();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong safe-bottom">
      <div className="flex items-center justify-around py-2 max-w-lg mx-auto">
        {TABS.map((t, i) => {
          const isActive = activeTab === i;
          const Icon = t.icon;
          return (
            <button
              key={i}
              onClick={() => {
                haptic('light');
                setTab(i);
              }}
              className={`
                flex flex-col items-center gap-1 py-1.5 px-4 rounded-2xl
                transition-all duration-200
                ${isActive ? 'bg-white/[0.06]' : ''}
              `}
            >
              <Icon
                size={20}
                color={isActive ? '#ffffff' : 'rgba(255,255,255,0.3)'}
              />
              <span
                className={`
                  text-[10px] font-medium transition-colors
                  ${isActive ? 'text-white' : 'text-white/30'}
                `}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
