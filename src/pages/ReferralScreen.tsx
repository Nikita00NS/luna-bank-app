import React, { useState, useEffect } from 'react';
import { useStore, uid } from '../lib/store';
import { haptic } from '../lib/utils';
import { dbCountReferrals, dbGetReferrals, dbUpdateBalance } from '../lib/db';
import { ArrowLeftIcon, UsersIcon } from '../components/Icons';
import AnimatedEmoji from '../components/AnimatedEmoji';

const REFERRAL_REWARD = 50; // 50 LNC per referral

export default function ReferralScreen() {
  const { user, accounts, go } = useStore();
  const [count, setCount] = useState(0);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  if (!user) return null;

  const refCode = `REF_${user.telegram_id}`;
  const refLink = `https://t.me/LunaBankBot?start=${refCode}`;
  const totalEarned = count * REFERRAL_REWARD;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [c, refs] = await Promise.all([
        dbCountReferrals(user.telegram_id),
        dbGetReferrals(user.telegram_id),
      ]);
      setCount(c);
      setReferrals(refs);
    } catch {}
    setLoading(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(refLink);
    haptic('success');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = () => {
    haptic('medium');
    const tg = (window as any).Telegram?.WebApp;
    const text = `🌙 Присоединяйся к Luna Bank!\n\nКрипто-банк прямо в Telegram. Бонус ${REFERRAL_REWARD} LNC за регистрацию!\n\n${refLink}`;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(text)}`);
    } else {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  return (
    <div className="h-full overflow-y-auto pb-24 safe-top">
      {/* Header */}
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('profile')} className="text-white/50">
          <ArrowLeftIcon size={20} />
        </button>
        <h1 className="font-bold flex-1">Реферальная программа</h1>
      </div>

      {/* Hero card */}
      <div className="px-5 mt-4">
        <div className="glass-accent p-6 rounded-2xl text-center animate-slide-up">
          <AnimatedEmoji type="party" size={56} />
          <h2 className="text-2xl font-extrabold mt-3">
            Приглашай друзей
          </h2>
          <p className="text-white/40 text-sm mt-2 max-w-[250px] mx-auto">
            Получай <span className="text-yellow-400 font-bold">🌙{REFERRAL_REWARD} LNC</span> за каждого друга, который зарегистрируется по вашей ссылке
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 mt-4 flex gap-3">
        <div className="flex-1 glass p-4 rounded-2xl text-center">
          <p className="text-3xl font-extrabold">{count}</p>
          <p className="text-[10px] text-white/30 uppercase tracking-wide mt-1">Приглашений</p>
        </div>
        <div className="flex-1 glass p-4 rounded-2xl text-center">
          <p className="text-3xl font-extrabold text-yellow-400">🌙{totalEarned}</p>
          <p className="text-[10px] text-white/30 uppercase tracking-wide mt-1">Заработано LNC</p>
        </div>
      </div>

      {/* Referral link */}
      <div className="px-5 mt-4">
        <p className="text-xs text-white/35 mb-2 font-medium">Ваша ссылка</p>
        <div className="glass p-3 rounded-2xl flex items-center gap-2">
          <p className="flex-1 text-xs text-white/50 mono truncate">{refLink}</p>
          <button
            onClick={copyLink}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
              copied ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/60'
            }`}
          >
            {copied ? '✓ Скопировано' : '📋 Копировать'}
          </button>
        </div>
      </div>

      {/* Share button */}
      <div className="px-5 mt-4">
        <button
          onClick={shareLink}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          📨 Поделиться ссылкой
        </button>
      </div>

      {/* How it works */}
      <div className="px-5 mt-6">
        <h3 className="font-bold text-sm mb-3">Как это работает</h3>
        <div className="space-y-2">
          {[
            { step: '1', icon: '📤', text: 'Отправьте ссылку другу' },
            { step: '2', icon: '📱', text: 'Друг открывает Luna Bank и регистрируется' },
            { step: '3', icon: '🎁', text: `Вы оба получаете 🌙${REFERRAL_REWARD} LNC` },
          ].map((item) => (
            <div key={item.step} className="glass p-3 flex items-center gap-3 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-xs font-bold">
                {item.step}
              </div>
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm text-white/60">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Referrals list */}
      {referrals.length > 0 && (
        <div className="px-5 mt-6">
          <h3 className="font-bold text-sm mb-3">Ваши рефералы ({referrals.length})</h3>
          <div className="space-y-2">
            {referrals.map((ref, i) => (
              <div key={ref.id} className="glass p-3 flex items-center gap-3 rounded-xl animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-sm font-bold">
                  {ref.referred?.first_name?.[0] || '?'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{ref.referred?.first_name || 'User'}</p>
                  <p className="text-[10px] text-white/25">@{ref.referred?.username || '—'}</p>
                </div>
                <span className="text-xs text-yellow-400/70 font-bold mono">+🌙{ref.reward || REFERRAL_REWARD}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
