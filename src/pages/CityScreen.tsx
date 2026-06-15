import React, { useState, useEffect } from 'react';
import { useStore, uid } from '../lib/store';
import { haptic } from '../lib/utils';
import { dbUpdateBalance, dbCreateTransaction, dbCreateNotification } from '../lib/db';
import type { OwnedBusiness } from '../lib/store';

// ===== Game Data =====
const JOBS = [
  { id: 'courier', name: 'Курьер', icon: '🚴', pay: 5, xp: 10, cooldown: 60, level: 1 },
  { id: 'freelancer', name: 'Фрилансер', icon: '💻', pay: 15, xp: 25, cooldown: 120, level: 3 },
  { id: 'developer', name: 'Разработчик', icon: '👨‍💻', pay: 35, xp: 50, cooldown: 180, level: 5 },
  { id: 'manager', name: 'Менеджер', icon: '📊', pay: 60, xp: 80, cooldown: 240, level: 8 },
  { id: 'trader', name: 'Трейдер', icon: '📈', pay: 100, xp: 120, cooldown: 300, level: 12 },
];

const BUSINESSES = [
  { id: 'coffee', name: 'Кофейня', icon: '☕', cost: 500, income: 10, xp: 15, level: 2 },
  { id: 'shop', name: 'Магазин', icon: '🏪', cost: 2000, income: 35, xp: 40, level: 5 },
  { id: 'office', name: 'Офис', icon: '🏢', cost: 5000, income: 80, xp: 70, level: 8 },
  { id: 'restaurant', name: 'Ресторан', icon: '🍽️', cost: 15000, income: 200, xp: 150, level: 12 },
];

type Tab = 'jobs' | 'business' | 'leaderboard';

export default function CityScreen() {
  const {
    user, accounts, businesses, jobCooldowns,
    patchUser, updateBalance, addTx, addNotif, addBiz, setJobCD,
  } = useStore();

  const [tab, setTab] = useState<Tab>('jobs');
  const [, tick] = useState(0);

  // Tick every second for cooldown timers
  useEffect(() => {
    const interval = setInterval(() => tick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!user) return null;

  const personalAcc = accounts.find((a) => a.type === 'personal');
  const xpForNextLevel = user.level * 100;
  const xpPercent = Math.min((user.xp / xpForNextLevel) * 100, 100);

  // ===== Work a Job =====
  const doWork = (job: (typeof JOBS)[number]) => {
    const cooldownEnd = jobCooldowns[job.id] || 0;
    if (Date.now() < cooldownEnd || user.level < job.level || !personalAcc) {
      haptic('error');
      return;
    }

    haptic('success');

    // Update balance
    updateBalance(personalAcc.id, job.pay);
    dbUpdateBalance(personalAcc.id, job.pay).catch(() => {});

    // Update XP + Level
    const newXp = user.xp + job.xp;
    const levelUp = newXp >= xpForNextLevel;
    patchUser({
      xp: levelUp ? newXp - xpForNextLevel : newXp,
      level: levelUp ? user.level + 1 : user.level,
    });

    // Set cooldown
    setJobCD(job.id, Date.now() + job.cooldown * 1000);

    // Transaction
    addTx({
      id: uid(),
      from_user_id: 0,
      to_user_id: user.telegram_id,
      from_account_id: 'city',
      to_account_id: personalAcc.id,
      amount: job.pay,
      fee: 0,
      currency: 'LNC',
      type: 'job',
      status: 'completed',
      note: `Зарплата: ${job.name}`,
      created_at: new Date().toISOString(),
    });

    if (levelUp) {
      addNotif({
        id: uid(),
        title: '🎉 Level Up!',
        message: `Вы достигли LVL ${user.level + 1}!`,
        type: 'system',
        read: false,
        created_at: new Date().toISOString(),
      });
    }
  };

  // ===== Buy Business =====
  const buyBusiness = (biz: (typeof BUSINESSES)[number]) => {
    if (user.level < biz.level || !personalAcc || personalAcc.balance < biz.cost) {
      haptic('error');
      return;
    }

    haptic('success');
    updateBalance(personalAcc.id, -biz.cost);
    dbUpdateBalance(personalAcc.id, -biz.cost).catch(() => {});

    addBiz({ id: uid(), type: biz.id, name: biz.name, income: biz.income });

    addTx({
      id: uid(),
      from_user_id: user.telegram_id,
      to_user_id: 0,
      from_account_id: personalAcc.id,
      to_account_id: 'city',
      amount: biz.cost,
      fee: 0,
      currency: 'LNC',
      type: 'business',
      status: 'completed',
      note: `Покупка: ${biz.name}`,
      created_at: new Date().toISOString(),
    });
  };

  // ===== Collect Income =====
  const collectIncome = (biz: OwnedBusiness) => {
    if (!personalAcc) return;
    haptic('success');

    updateBalance(personalAcc.id, biz.income);
    dbUpdateBalance(personalAcc.id, biz.income).catch(() => {});

    addTx({
      id: uid(),
      from_user_id: 0,
      to_user_id: user.telegram_id,
      from_account_id: 'city',
      to_account_id: personalAcc.id,
      amount: biz.income,
      fee: 0,
      currency: 'LNC',
      type: 'business',
      status: 'completed',
      note: `Доход: ${biz.name}`,
      created_at: new Date().toISOString(),
    });
  };

  // ===== Leaderboard =====
  const leaderboard = [
    { name: 'CryptoKing', level: 25, xp: 12500 },
    { name: 'TON_Master', level: 22, xp: 11000 },
    { name: 'Luna_Pro', level: 19, xp: 9500 },
    { name: user.first_name, level: user.level, xp: user.xp },
    { name: 'DeFi_Lord', level: 15, xp: 7500 },
  ].sort((a, b) => b.level - a.level || b.xp - a.xp);

  return (
    <div className="h-full overflow-y-auto pb-24 safe-top">
      <div className="px-5 pt-6">
        {/* Header */}
        <h1 className="text-2xl font-extrabold mb-1">🏙️ Luna City</h1>
        <p className="text-sm text-white/30 mb-4">Зарабатывайте реальные LNC</p>

        {/* XP Bar */}
        <div className="glass-accent p-4 mb-4 animate-slide-up">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold">LVL {user.level}</span>
            <span className="text-xs text-white/30 mono">
              {user.xp}/{xpForNextLevel} XP
            </span>
          </div>
          <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full transition-all duration-500"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(['jobs', 'business', 'leaderboard'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`
                flex-1 py-2 rounded-xl text-sm font-semibold transition-all
                ${tab === t ? 'bg-white text-black' : 'glass text-white/50'}
              `}
            >
              {t === 'jobs' ? '💼 Работы' : t === 'business' ? '🏪 Бизнес' : '🏆 Рейтинг'}
            </button>
          ))}
        </div>

        {/* ===== JOBS TAB ===== */}
        {tab === 'jobs' && (
          <div className="space-y-2.5 animate-fade-in">
            {/* Link to interactive games */}
            <button
              onClick={() => { haptic('medium'); useStore.getState().go('job-game'); }}
              className="
                w-full glass-accent p-4 flex items-center gap-4 text-left
                active:scale-[0.98] transition-all mb-2
              "
            >
              <div className="w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center text-2xl">
                🎮
              </div>
              <div className="flex-1">
                <p className="font-bold">Играть и зарабатывать</p>
                <p className="text-xs text-white/35">
                  5 уникальных мини-игр для каждой профессии
                </p>
              </div>
              <span className="text-emerald-400 text-sm font-semibold">→</span>
            </button>

            {JOBS.map((job) => {
              const cooldownEnd = jobCooldowns[job.id] || 0;
              const isOnCooldown = Date.now() < cooldownEnd;
              const remaining = Math.ceil((cooldownEnd - Date.now()) / 1000);
              const isLocked = user.level < job.level;

              return (
                <div
                  key={job.id}
                  className={`glass p-4 ${isLocked ? 'opacity-30' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{job.icon}</span>
                    <div className="flex-1">
                      <p className="font-bold">{job.name}</p>
                      <p className="text-xs text-white/30">
                        +🌙{job.pay} · +{job.xp} XP · LVL {job.level}+
                      </p>
                    </div>
                    <button
                      onClick={() => doWork(job)}
                      disabled={isOnCooldown || isLocked}
                      className={`
                        px-4 py-2 rounded-xl text-sm font-semibold transition-all
                        ${
                          isOnCooldown || isLocked
                            ? 'bg-white/5 text-white/25'
                            : 'bg-white text-black active:scale-95'
                        }
                      `}
                    >
                      {isLocked
                        ? `🔒 LVL ${job.level}`
                        : isOnCooldown
                        ? `${remaining}с`
                        : 'Быстро'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ===== BUSINESS TAB ===== */}
        {tab === 'business' && (
          <div className="space-y-2.5 animate-fade-in">
            {/* Owned businesses */}
            {businesses.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-white/30 mb-2 font-medium uppercase">
                  Мои бизнесы
                </p>
                {businesses.map((biz) => {
                  const bizData = BUSINESSES.find((b) => b.id === biz.type);
                  return (
                    <div key={biz.id} className="glass p-4 flex items-center gap-3 mb-2">
                      <span className="text-2xl">{bizData?.icon || '🏪'}</span>
                      <div className="flex-1">
                        <p className="font-bold">{biz.name}</p>
                        <p className="text-xs text-white/30">🌙{biz.income}/сбор</p>
                      </div>
                      <button
                        onClick={() => collectIncome(biz)}
                        className="bg-white text-black px-4 py-2 rounded-xl text-sm font-semibold active:scale-95 transition-transform"
                      >
                        Собрать
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Available to buy */}
            <p className="text-xs text-white/30 mb-2 font-medium uppercase">
              Доступные
            </p>
            {BUSINESSES.map((biz) => {
              const isLocked = user.level < biz.level;
              const isOwned = businesses.some((b) => b.type === biz.id);

              return (
                <div
                  key={biz.id}
                  className={`glass p-4 ${isLocked || isOwned ? 'opacity-30' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{biz.icon}</span>
                    <div className="flex-1">
                      <p className="font-bold">{biz.name}</p>
                      <p className="text-xs text-white/30">
                        🌙{biz.cost} · 🌙{biz.income}/сбор · LVL {biz.level}+
                      </p>
                    </div>
                    <button
                      onClick={() => buyBusiness(biz)}
                      disabled={isLocked || isOwned}
                      className={`
                        px-4 py-2 rounded-xl text-sm font-semibold transition-all
                        ${
                          isOwned
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : isLocked
                            ? 'bg-white/5 text-white/25'
                            : 'bg-white text-black active:scale-95'
                        }
                      `}
                    >
                      {isOwned ? '✓' : isLocked ? `🔒 ${biz.level}` : 'Купить'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ===== LEADERBOARD TAB ===== */}
        {tab === 'leaderboard' && (
          <div className="space-y-2 animate-fade-in">
            {leaderboard.map((entry, i) => (
              <div
                key={i}
                className={`
                  glass p-3 flex items-center gap-3
                  ${entry.name === user.first_name ? 'ring-1 ring-violet-500/25' : ''}
                `}
              >
                <span className="text-lg font-bold w-8 text-center mono">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                </span>
                <p className="flex-1 font-medium text-sm">{entry.name}</p>
                <div className="text-right">
                  <p className="text-sm font-bold">LVL {entry.level}</p>
                  <p className="text-[11px] text-white/30">{entry.xp} XP</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
