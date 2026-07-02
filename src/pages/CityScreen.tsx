import React from 'react';
import { useStore } from '../lib/store';
import { haptic } from '../lib/utils';
import AnimatedEmoji from '../components/AnimatedEmoji';
import LncIcon from '../components/LncIcon';
import { UsersIcon, StarIcon, ShieldIcon } from '../components/Icons';

export default function CityScreen() {
  const { user, accounts, go } = useStore();
  if (!user) return null;
  const lncAcc = accounts.find((a) => a.currency === 'LNC');

  const sections = [
    {
      title: 'Заработок',
      items: [
        { icon: '🏆', label: 'Ачивки', desc: 'Достижения и XP', page: 'achievements' as const },
        { icon: '👥', label: 'Рефералы', desc: 'Приглашай друзей', page: 'referral' as const },
        { icon: '📰', label: 'Stories', desc: 'Новости и акции', page: 'stories' as const },
      ],
    },
    {
      title: 'Маркетплейс',
      items: [
        { icon: '🛒', label: 'Маркетплейс', desc: 'Товары за LNC', page: 'marketplace' as const },
        { icon: '💬', label: 'Сообщество', desc: 'Друзья и чаевые', page: 'social' as const },
      ],
    },
    {
      title: 'Подписка',
      items: [
        { icon: '⭐', label: 'Подписка', desc: user.subscription.toUpperCase(), page: 'subscription' as const },
        { icon: '🎨', label: 'Оформление', desc: 'Темы и стиль', page: 'themes' as const },
      ],
    },
  ];

  return (
    <div className="h-full overflow-y-auto pb-24 safe-top">
      {/* Header */}
      <div className="px-5 pt-6 mb-4">
        <h1 className="text-2xl font-extrabold">Город</h1>
        <p className="text-white/35 text-sm mt-1">Развлечения, сообщество и бонусы</p>
      </div>

      {/* LNC Balance Card */}
      <div className="px-5 mb-6">
        <div className="glass-accent p-5 rounded-2xl flex items-center gap-4">
          <AnimatedEmoji type="moon" size={44} />
          <div className="flex-1">
            <p className="text-xs text-white/35">Luna Coin</p>
            <p className="text-2xl font-extrabold mono">
              <LncIcon size={18} />{lncAcc?.balance.toFixed(2) || '0.00'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/25">1 LNC = $0.05</p>
            <p className="text-sm mono text-white/40">${((lncAcc?.balance || 0) * 0.05).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Sections */}
      {sections.map((section) => (
        <div key={section.title} className="px-5 mb-5">
          <h3 className="font-bold text-sm mb-2.5 text-white/50">{section.title}</h3>
          <div className="space-y-2">
            {section.items.map((item, i) => (
              <button key={item.label} onClick={() => { haptic('light'); go(item.page); }}
                className="w-full glass p-4 flex items-center gap-4 rounded-2xl active:scale-[0.98] transition-all animate-slide-up"
                style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="w-11 h-11 rounded-xl bg-white/[0.04] flex items-center justify-center text-xl">
                  {item.icon}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-sm">{item.label}</p>
                  <p className="text-[10px] text-white/25">{item.desc}</p>
                </div>
                <span className="text-white/15">›</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
