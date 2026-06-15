import React, { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { haptic, timeAgo } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { ArrowLeftIcon } from '../components/Icons';
import AnimatedEmoji from '../components/AnimatedEmoji';

interface Achievement {
  id: string;
  icon: string;
  title: string;
  desc: string;
  xp: number;
  check: (s: any) => boolean;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_account', icon: '🏦', title: 'Первый счёт', desc: 'Откройте свой первый счёт', xp: 10, check: (s) => s.accounts.length >= 1 },
  { id: 'first_transfer', icon: '📤', title: 'Первый перевод', desc: 'Отправьте первый перевод', xp: 20, check: (s) => s.txs.some((t: any) => t.type === 'transfer') },
  { id: 'ton_connected', icon: '💎', title: 'TON Connected', desc: 'Подключите TON-кошелёк', xp: 30, check: (s) => !!s.tonWallet },
  { id: 'balance_100', icon: '💰', title: 'Сотня', desc: 'Накопите 100 LNC', xp: 25, check: (s) => s.accounts.some((a: any) => a.currency === 'LNC' && a.balance >= 100) },
  { id: 'balance_1000', icon: '🤑', title: 'Тысячник', desc: 'Накопите 1,000 LNC', xp: 50, check: (s) => s.accounts.some((a: any) => a.currency === 'LNC' && a.balance >= 1000) },
  { id: 'balance_10000', icon: '💎', title: 'Богач', desc: 'Накопите 10,000 LNC', xp: 100, check: (s) => s.accounts.some((a: any) => a.currency === 'LNC' && a.balance >= 10000) },
  { id: '5_transfers', icon: '🚀', title: 'Активист', desc: 'Совершите 5 переводов', xp: 30, check: (s) => s.txs.filter((t: any) => t.type === 'transfer').length >= 5 },
  { id: '10_transfers', icon: '⚡', title: 'Про-переводчик', desc: 'Совершите 10 переводов', xp: 50, check: (s) => s.txs.filter((t: any) => t.type === 'transfer').length >= 10 },
  { id: 'kyc_done', icon: '🛡️', title: 'Верифицирован', desc: 'Пройдите KYC-верификацию', xp: 40, check: (s) => s.user?.kyc_status === 'approved' },
  { id: 'subscription', icon: '⭐', title: 'Premium', desc: 'Купите подписку Plus или Cosmic', xp: 50, check: (s) => s.user?.subscription !== 'free' },
  { id: 'card_created', icon: '💳', title: 'Держатель карты', desc: 'Выпустите виртуальную карту', xp: 20, check: (s) => s.cards.length >= 1 },
  { id: '3_accounts', icon: '🏛️', title: 'Мультисчёт', desc: 'Откройте 3 счёта', xp: 35, check: (s) => s.accounts.length >= 3 },
  { id: 'level_5', icon: '🏅', title: 'Уровень 5', desc: 'Достигните 5-го уровня', xp: 0, check: (s) => s.user?.level >= 5 },
  { id: 'level_10', icon: '🏆', title: 'Уровень 10', desc: 'Достигните 10-го уровня', xp: 0, check: (s) => s.user?.level >= 10 },
  { id: 'job_done', icon: '💼', title: 'Работяга', desc: 'Выполните задание', xp: 15, check: (s) => s.txs.some((t: any) => t.type === 'job') },
  { id: 'game_won', icon: '🎮', title: 'Геймер', desc: 'Выиграйте в казино', xp: 15, check: (s) => s.txs.some((t: any) => t.note?.includes('WIN')) },
];

interface LeaderboardEntry {
  telegram_id: number;
  username: string;
  first_name: string;
  level: number;
  xp: number;
  subscription: string;
}

export default function AchievementsScreen() {
  const store = useStore();
  const { user, go, patchUser } = store;
  const [tab, setTab] = useState<'achievements' | 'leaderboard'>('achievements');
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaders, setLoadingLeaders] = useState(false);

  if (!user) return null;

  const completed = ACHIEVEMENTS.filter((a) => a.check(store));
  const pending = ACHIEVEMENTS.filter((a) => !a.check(store));
  const progress = Math.round((completed.length / ACHIEVEMENTS.length) * 100);

  useEffect(() => {
    if (tab === 'leaderboard') loadLeaderboard();
  }, [tab]);

  const loadLeaderboard = async () => {
    setLoadingLeaders(true);
    try {
      const { data } = await supabase
        .from('users')
        .select('telegram_id, username, first_name, level, xp, subscription')
        .order('level', { ascending: false })
        .order('xp', { ascending: false })
        .limit(50);
      setLeaders(data || []);
    } catch {}
    setLoadingLeaders(false);
  };

  const myRank = leaders.findIndex((l) => l.telegram_id === user.telegram_id) + 1;

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('home')} className="text-white/50"><ArrowLeftIcon size={20} /></button>
        <h1 className="font-bold flex-1">Достижения</h1>
      </div>

      {/* Progress */}
      <div className="px-5 mt-2">
        <div className="glass-accent p-4 rounded-2xl flex items-center gap-4">
          <AnimatedEmoji type="star" size={40} />
          <div className="flex-1">
            <p className="font-bold">{completed.length}/{ACHIEVEMENTS.length} ачивок</p>
            <div className="h-2 bg-white/[0.06] rounded-full mt-1.5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-yellow-400">{progress}%</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-5 mt-3 flex gap-2">
        {(['achievements', 'leaderboard'] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); haptic('light'); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === t ? 'bg-white text-black' : 'glass text-white/50'}`}>
            {t === 'achievements' ? `🏆 Ачивки (${completed.length})` : '📊 Рейтинг'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24 mt-3">
        {tab === 'achievements' && (
          <div className="space-y-2 animate-fade-in">
            {completed.length > 0 && (
              <>
                <p className="text-xs text-white/25 font-medium uppercase tracking-wide mb-2">Выполнено</p>
                {completed.map((a, i) => (
                  <div key={a.id} className="glass p-3 flex items-center gap-3 rounded-xl animate-slide-up border border-yellow-500/10" style={{ animationDelay: `${i * 0.03}s` }}>
                    <span className="text-2xl">{a.icon}</span>
                    <div className="flex-1">
                      <p className="font-bold text-sm">{a.title}</p>
                      <p className="text-[10px] text-white/25">{a.desc}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-yellow-400 font-bold">+{a.xp} XP</p>
                      <span className="text-emerald-400 text-[10px]">✓</span>
                    </div>
                  </div>
                ))}
              </>
            )}

            {pending.length > 0 && (
              <>
                <p className="text-xs text-white/25 font-medium uppercase tracking-wide mb-2 mt-4">В процессе</p>
                {pending.map((a, i) => (
                  <div key={a.id} className="glass p-3 flex items-center gap-3 rounded-xl opacity-50" style={{ animationDelay: `${i * 0.03}s` }}>
                    <span className="text-2xl grayscale">{a.icon}</span>
                    <div className="flex-1">
                      <p className="font-bold text-sm">{a.title}</p>
                      <p className="text-[10px] text-white/25">{a.desc}</p>
                    </div>
                    <p className="text-xs text-white/20 font-bold">+{a.xp} XP</p>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {tab === 'leaderboard' && (
          <div className="animate-fade-in">
            {loadingLeaders ? (
              <div className="text-center py-10">
                <AnimatedEmoji type="loading" size={32} />
                <p className="text-white/30 text-sm mt-3">Загрузка...</p>
              </div>
            ) : (
              <>
                {/* Top 3 podium */}
                {leaders.length >= 3 && (
                  <div className="flex items-end justify-center gap-2 mb-6 pt-4">
                    {[1, 0, 2].map((idx) => {
                      const l = leaders[idx];
                      if (!l) return null;
                      const isMe = l.telegram_id === user.telegram_id;
                      const medals = ['🥇', '🥈', '🥉'];
                      const heights = ['h-24', 'h-32', 'h-20'];
                      return (
                        <div key={l.telegram_id} className="flex flex-col items-center">
                          <span className="text-2xl mb-1">{medals[idx]}</span>
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${isMe ? 'bg-gradient-to-br from-yellow-400 to-orange-500 ring-2 ring-yellow-400/50' : 'bg-gradient-to-br from-violet-500 to-pink-500'}`}>
                            {l.first_name[0]}
                          </div>
                          <p className={`text-xs font-bold mt-1 ${isMe ? 'text-yellow-400' : ''}`}>{l.first_name}</p>
                          <p className="text-[9px] text-white/25">LVL {l.level}</p>
                          <div className={`w-16 ${heights[idx]} glass rounded-t-xl mt-1 flex items-center justify-center`}>
                            <p className="text-xs mono text-white/40">{l.xp}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Full list */}
                <div className="space-y-1.5">
                  {leaders.map((l, i) => {
                    const isMe = l.telegram_id === user.telegram_id;
                    return (
                      <div key={l.telegram_id} className={`glass p-3 flex items-center gap-3 rounded-xl ${isMe ? 'ring-1 ring-yellow-500/30 bg-yellow-500/5' : ''}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/[0.04] text-white/30'}`}>
                          {i + 1}
                        </div>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${isMe ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : 'bg-gradient-to-br from-violet-500 to-pink-500'}`}>
                          {l.first_name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-sm truncate ${isMe ? 'text-yellow-400' : ''}`}>{l.first_name} {isMe ? '(Вы)' : ''}</p>
                          <p className="text-[10px] text-white/20">@{l.username} · {l.subscription?.toUpperCase()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm">LVL {l.level}</p>
                          <p className="text-[9px] text-white/20 mono">{l.xp} XP</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {myRank > 0 && (
                  <p className="text-center text-xs text-white/25 mt-4">Ваше место: #{myRank} из {leaders.length}</p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
