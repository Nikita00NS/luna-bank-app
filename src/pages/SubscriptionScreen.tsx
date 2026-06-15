import React, { useState } from 'react';
import { useStore, uid } from '../lib/store';
import { formatMoney, balanceInUsd, haptic } from '../lib/utils';
import { SUBSCRIPTION_PLANS, LNC_RATE_USD } from '../lib/constants';
import { dbUpdateUser, dbUpdateBalance, dbCreateTransaction, dbCreateNotification } from '../lib/db';
import { ArrowLeftIcon, StarIcon, CheckIcon } from '../components/Icons';
import AnimatedEmoji from '../components/AnimatedEmoji';
import Modal from '../components/Modal';

export default function SubscriptionScreen() {
  const { user, accounts, go, patchUser, updateBalance, addTx, addNotif } = useStore();
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<(typeof SUBSCRIPTION_PLANS)[number] | null>(null);

  if (!user) return null;

  const personalAcc = accounts.find((a) => a.type === 'personal');

  const handleSelect = (plan: (typeof SUBSCRIPTION_PLANS)[number]) => {
    if (plan.id === user.subscription) return;
    if (plan.price === 0) {
      haptic('medium');
      patchUser({ subscription: 'free' });
      dbUpdateUser(user.telegram_id, { subscription: 'free' }).catch(() => {});
      return;
    }
    haptic('medium');
    setSelectedPlan(plan);
    setShowConfirm(true);
  };

  const handlePurchase = () => {
    if (!selectedPlan || !personalAcc) return;

    // Cost in LNC = price_usd / lnc_rate
    const lncCost = selectedPlan.price / LNC_RATE_USD;

    if (personalAcc.balance < lncCost) {
      haptic('error');
      return;
    }

    haptic('success');

    // Debit balance
    updateBalance(personalAcc.id, -lncCost);
    dbUpdateBalance(personalAcc.id, -lncCost).catch(() => {});

    // Update subscription
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    patchUser({ subscription: selectedPlan.id as any, subscription_expires: expires });
    dbUpdateUser(user.telegram_id, {
      subscription: selectedPlan.id,
      subscription_expires: expires,
    }).catch(() => {});

    // Transaction
    addTx({
      id: uid(),
      from_user_id: user.telegram_id,
      to_user_id: 0,
      from_account_id: personalAcc.id,
      to_account_id: 'platform',
      amount: lncCost,
      fee: 0,
      currency: 'LNC',
      type: 'subscription',
      status: 'completed',
      note: `Подписка ${selectedPlan.name}`,
      created_at: new Date().toISOString(),
    });

    // Notification
    addNotif({
      id: uid(),
      title: '⭐ Подписка активирована',
      message: `${selectedPlan.name} — $${selectedPlan.price}/мес`,
      type: 'system',
      read: false,
      created_at: new Date().toISOString(),
    });

    setShowConfirm(false);
  };

  return (
    <div className="h-full overflow-y-auto pb-24 safe-top">
      {/* Header */}
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('profile')} className="text-white/50">
          <ArrowLeftIcon size={20} />
        </button>
        <h1 className="font-bold flex-1">Подписка</h1>
      </div>

      {/* Plans */}
      <div className="px-5 mt-4 space-y-4">
        {SUBSCRIPTION_PLANS.map((plan, i) => {
          const isCurrent = plan.id === user.subscription;

          return (
            <button
              key={plan.id}
              onClick={() => handleSelect(plan)}
              className={`
                w-full rounded-2xl p-5 text-left transition-all animate-slide-up
                ${isCurrent ? 'bg-white text-black' : 'glass'}
              `}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {/* Top: Icon + Name + Price */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{plan.icon}</span>
                  <h3 className="text-xl font-extrabold">{plan.name}</h3>
                </div>
                <div className="text-right">
                  <p className="text-lg font-extrabold">
                    {plan.price === 0 ? 'Бесплатно' : `$${plan.price}`}
                  </p>
                  {plan.price > 0 && (
                    <p className={`text-[11px] ${isCurrent ? 'text-black/35' : 'text-white/30'}`}>
                      /мес
                    </p>
                  )}
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2">
                {[
                  ['Комиссия', `${plan.commission}%`],
                  ['Кэшбэк', `${plan.cashback}%`],
                  ['Лимит/день', plan.dailyLimit === Infinity ? '∞' : `$${plan.dailyLimit.toLocaleString()}`],
                  ['Поддержка', plan.support],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className={isCurrent ? 'text-black/50' : 'text-white/35'}>
                      {label}
                    </span>
                    <span className="font-semibold">{value}</span>
                  </div>
                ))}
              </div>

              {/* Current badge */}
              {isCurrent && (
                <div className="mt-3 text-center text-sm font-bold bg-black/10 rounded-xl py-2 flex items-center justify-center gap-1">
                  <CheckIcon size={14} /> Текущий план
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Confirm Modal */}
      <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title="Подтверждение покупки">
        {selectedPlan && (
          <div className="space-y-4">
            {/* Animated header */}
            <div className="text-center">
              <AnimatedEmoji type={selectedPlan.id === 'cosmic' ? 'rocket' : 'star'} size={48} />
              <h3 className="font-bold text-lg mt-2">{selectedPlan.name}</h3>
              <p className="text-xs text-white/30">{selectedPlan.icon} Ежемесячная подписка</p>
            </div>

            {/* Details */}
            <div className="glass p-4 rounded-xl space-y-2.5">
              {[
                ['📋 Тариф', selectedPlan.name],
                ['💰 Цена', `$${selectedPlan.price}/мес`],
                ['◎ В Luna Coin', `◎${(selectedPlan.price / LNC_RATE_USD).toFixed(0)} LNC`],
                ['📊 Комиссия', `${selectedPlan.commission}%`],
                ['🎁 Кэшбэк', `${selectedPlan.cashback}%`],
                ['💳 Баланс', personalAcc ? `◎${personalAcc.balance.toFixed(2)}` : 'Нет счёта'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm py-0.5">
                  <span className="text-white/35">{label}</span>
                  <span className="font-medium mono">{value}</span>
                </div>
              ))}
            </div>

            {/* Insufficient funds warning */}
            {personalAcc && personalAcc.balance < selectedPlan.price / LNC_RATE_USD && (
              <div className="bg-red-500/10 border border-red-500/15 rounded-xl p-3 text-sm text-red-400">
                ⚠️ Недостаточно средств на счёте
              </div>
            )}

            {/* After purchase info */}
            {personalAcc && personalAcc.balance >= selectedPlan.price / LNC_RATE_USD && (
              <div className="text-[10px] text-white/20 text-center">
                Остаток после покупки: ◎{(personalAcc.balance - selectedPlan.price / LNC_RATE_USD).toFixed(2)} LNC
              </div>
            )}

            <button
              onClick={handlePurchase}
              disabled={!personalAcc || personalAcc.balance < selectedPlan.price / LNC_RATE_USD}
              className="btn-primary w-full"
            >
              ✅ Оплатить ◎{(selectedPlan.price / LNC_RATE_USD).toFixed(0)} LNC
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="btn-ghost w-full"
            >
              Отмена
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
