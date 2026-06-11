import React from 'react';
import { useStore } from '../lib/store';
import { haptic } from '../lib/utils';

const tabs = [
  { icon: '🏠', activeIcon: '🏠', label: 'Главная' },
  { icon: '💳', activeIcon: '💳', label: 'Счета' },
  { icon: '🏙️', activeIcon: '🏙️', label: 'Город' },
  { icon: '📰', activeIcon: '📰', label: 'Витрина' },
  { icon: '💬', activeIcon: '💬', label: 'Чаты' },
];

export default function BottomNav() {
  const { tab: activeTab, setTab } = useStore();
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 glass-strong bottom-nav-pad">
      <div className="flex items-center justify-around py-1.5 max-w-lg mx-auto">
        {tabs.map((t, i) => (
          <button
            key={i}
            onClick={() => { haptic('light'); setTab(i); }}
            className="flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-2xl transition-all duration-200"
            style={activeTab === i ? { background: 'rgba(255,255,255,0.06)' } : {}}
          >
            <span className={`text-lg transition-transform duration-200 ${activeTab === i ? 'scale-110' : ''}`}>
              {activeTab === i ? t.activeIcon : t.icon}
            </span>
            <span className={`text-[10px] font-medium transition-colors ${activeTab === i ? 'text-white' : 'text-white/35'}`}>
              {t.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
