import React, { useState } from 'react';
import { useStore, uid } from '../lib/store';
import { haptic, formatMoney, timeAgo } from '../lib/utils';
import { dbUpdateBalance, dbCreateTransaction, dbCreateNotification } from '../lib/sync';
import { supabase } from '../lib/supabase';
import { notifyUser } from '../lib/telegram-bot';

interface EscrowDeal {
  id: string;
  title: string;
  description: string;
  amount: number;
  buyer_id: number;
  seller_username: string;
  status: 'pending' | 'funded' | 'delivered' | 'completed' | 'disputed' | 'cancelled';
  created_at: string;
  funded_at?: string;
  delivered_at?: string;
  completed_at?: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: 'Ожидание', color: 'bg-gray-400/10 text-gray-400', icon: '⏳' },
  funded: { label: 'Оплачено', color: 'bg-blue-400/10 text-blue-400', icon: '💰' },
  delivered: { label: 'Доставлено', color: 'bg-amber-400/10 text-amber-400', icon: '📦' },
  completed: { label: 'Завершено', color: 'bg-emerald-400/10 text-emerald-400', icon: '✅' },
  disputed: { label: 'Спор', color: 'bg-red-400/10 text-red-400', icon: '⚠️' },
  cancelled: { label: 'Отменено', color: 'bg-gray-400/10 text-gray-500', icon: '❌' },
};

export default function EscrowScreen() {
  const { user, accounts, go, updateBalance, addTx, addNotif } = useStore();
  const [tab, setTab] = useState<'info' | 'create' | 'deals'>('info');
  const [deals, setDeals] = useState<EscrowDeal[]>([]);
  const [selDeal, setSelDeal] = useState<EscrowDeal | null>(null);

  // Create form
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [sellerUsername, setSellerUsername] = useState('');

  if (!user) return null;
  const lncAcc = accounts.find(a => a.currency === 'LNC');
  const balance = lncAcc?.balance || 0;
  const val = parseFloat(amount) || 0;
  const escrowFee = val * 0.02; // 2% escrow fee
  const total = val + escrowFee;

  const createDeal = () => {
    if (!title || !sellerUsername || val <= 0 || !lncAcc || balance < total) { haptic('error'); return; }
    haptic('success');

    // Freeze funds
    updateBalance(lncAcc.id, -total);
    dbUpdateBalance(lncAcc.id, -total).catch(() => {});

    const deal: EscrowDeal = {
      id: uid(), title, description: desc, amount: val,
      buyer_id: user.telegram_id, seller_username: sellerUsername,
      status: 'funded', created_at: new Date().toISOString(),
      funded_at: new Date().toISOString(),
    };
    setDeals(prev => [deal, ...prev]);

    addTx({
      id: deal.id, from_user_id: user.telegram_id, to_user_id: 0,
      from_account_id: lncAcc.id, to_account_id: 'escrow',
      amount: total, fee: escrowFee, currency: 'LNC',
      type: 'withdrawal', status: 'completed',
      note: `Гарант: ${title} (@${sellerUsername})`,
      created_at: new Date().toISOString(),
    });

    addNotif({
      id: uid(), title: '🔒 Гарант создан',
      message: `◎${val} заморожено для @${sellerUsername}`,
      type: 'system', read: false, created_at: new Date().toISOString(),
    });

    setTitle(''); setDesc(''); setAmount(''); setSellerUsername('');
    setTab('deals');
  };

  const confirmDelivery = (deal: EscrowDeal) => {
    haptic('medium');
    setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, status: 'delivered' as const, delivered_at: new Date().toISOString() } : d));
  };

  const releaseFunds = (deal: EscrowDeal) => {
    haptic('success');
    setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, status: 'completed' as const, completed_at: new Date().toISOString() } : d));
    addNotif({
      id: uid(), title: '✅ Сделка завершена',
      message: `◎${deal.amount} отправлено @${deal.seller_username}`,
      type: 'transfer', read: false, created_at: new Date().toISOString(),
    });
  };

  const disputeDeal = (deal: EscrowDeal) => {
    haptic('error');
    setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, status: 'disputed' as const } : d));
    addNotif({
      id: uid(), title: '⚠️ Спор открыт',
      message: `Сделка "${deal.title}" — ожидает разрешения`,
      type: 'system', read: false, created_at: new Date().toISOString(),
    });
  };

  const cancelDeal = (deal: EscrowDeal) => {
    haptic('medium');
    // Refund
    if (lncAcc) {
      updateBalance(lncAcc.id, deal.amount);
      dbUpdateBalance(lncAcc.id, deal.amount).catch(() => {});
    }
    setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, status: 'cancelled' as const } : d));
    addNotif({
      id: uid(), title: '↩️ Возврат',
      message: `◎${deal.amount} возвращено (сделка отменена)`,
      type: 'deposit', read: false, created_at: new Date().toISOString(),
    });
  };

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('home')} className="text-white/50 text-sm">← Назад</button>
        <h1 className="font-bold flex-1">🔒 Гарант-сервис</h1>
      </div>

      <div className="px-5 flex gap-2 mb-3">
        {(['info', 'create', 'deals'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? 'bg-white text-black' : 'glass text-white/50'}`}>
            {t === 'info' ? '📖 Инфо' : t === 'create' ? '➕ Создать' : `📋 Сделки (${deals.length})`}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24">

        {/* INFO */}
        {tab === 'info' && (
          <div className="animate-fade-in">
            <div className="text-center py-6">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500/20 to-pink-500/10 flex items-center justify-center text-4xl mx-auto mb-4 animate-float">🔒</div>
              <h2 className="text-2xl font-extrabold mb-2">Безопасные сделки</h2>
              <p className="text-sm text-white/35 max-w-[300px] mx-auto">
                Гарант-сервис Luna Bank защищает покупателя и продавца при любых сделках
              </p>
            </div>

            <div className="space-y-3 mt-4">
              {[
                { step: '1', icon: '📝', title: 'Создание сделки', desc: 'Покупатель указывает товар, сумму и @username продавца' },
                { step: '2', icon: '💰', title: 'Заморозка средств', desc: 'LNC блокируются на эскроу-счёте Luna Bank' },
                { step: '3', icon: '📦', title: 'Доставка товара', desc: 'Продавец передаёт товар/услугу покупателю' },
                { step: '4', icon: '✅', title: 'Подтверждение', desc: 'Покупатель подтверждает — средства уходят продавцу' },
                { step: '5', icon: '⚠️', title: 'Спор (если нужно)', desc: 'Модератор рассматривает и выносит решение' },
              ].map((s, i) => (
                <div key={i} className="glass rounded-xl p-4 flex items-start gap-3 animate-slide-up" style={{ animationDelay: `${i * 0.08}s` }}>
                  <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center text-lg flex-shrink-0">{s.icon}</div>
                  <div>
                    <p className="font-bold text-sm">Шаг {s.step}: {s.title}</p>
                    <p className="text-xs text-white/30 mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="glass-accent rounded-2xl p-4 mt-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">💡</span>
                <p className="font-bold text-sm">Комиссия</p>
              </div>
              <p className="text-xs text-white/40">2% от суммы сделки оплачивает покупатель. Деньги замораживаются до подтверждения получения товара.</p>
            </div>

            <button onClick={() => setTab('create')} className="btn-primary w-full mt-5">
              ➕ Создать сделку
            </button>
          </div>
        )}

        {/* CREATE */}
        {tab === 'create' && (
          <div className="animate-fade-in">
            <div className="text-center mb-5">
              <span className="text-4xl block mb-2">🔒</span>
              <h3 className="font-extrabold text-lg">Новая сделка</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/30 mb-1.5 block font-medium">Название сделки</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="Покупка iPhone 15, дизайн логотипа..."
                  className="w-full glass rounded-xl px-4 py-3.5 bg-transparent text-white outline-none focus:ring-1 focus:ring-white/10" />
              </div>

              <div>
                <label className="text-xs text-white/30 mb-1.5 block font-medium">Описание (необязательно)</label>
                <textarea value={desc} onChange={e => setDesc(e.target.value)}
                  placeholder="Подробности сделки..."
                  rows={3}
                  className="w-full glass rounded-xl px-4 py-3 bg-transparent text-white outline-none resize-none focus:ring-1 focus:ring-white/10" />
              </div>

              <div>
                <label className="text-xs text-white/30 mb-1.5 block font-medium">@username продавца</label>
                <input type="text" value={sellerUsername} onChange={e => setSellerUsername(e.target.value)}
                  placeholder="@seller_username"
                  className="w-full glass rounded-xl px-4 py-3.5 bg-transparent text-white outline-none focus:ring-1 focus:ring-white/10" />
              </div>

              <div>
                <label className="text-xs text-white/30 mb-1.5 block font-medium">Сумма (LNC)</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full glass rounded-xl px-4 py-4 bg-transparent text-white text-2xl font-extrabold tabular-nums outline-none text-center" />
                <div className="flex gap-2 mt-2">
                  {[100, 500, 1000, 5000].map(v => (
                    <button key={v} onClick={() => setAmount(String(v))}
                      className="flex-1 glass rounded-lg py-1.5 text-xs tabular-nums active:scale-95 transition-transform">◎{v}</button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              {val > 0 && (
                <div className="glass rounded-xl p-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/35">Сумма сделки</span>
                    <span className="tabular-nums">◎{val.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/35">Комиссия (2%)</span>
                    <span className="tabular-nums">◎{escrowFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold pt-1 border-t border-white/[0.04]">
                    <span>Итого заморозится</span>
                    <span className="tabular-nums">◎{total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/20">Ваш баланс</span>
                    <span className={`tabular-nums ${balance >= total ? 'text-emerald-400/60' : 'text-red-400/60'}`}>◎{balance.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <button onClick={createDeal}
                disabled={!title || !sellerUsername || val <= 0 || balance < total}
                className="btn-primary w-full">
                🔒 Создать и заморозить ◎{total.toFixed(2)}
              </button>
            </div>
          </div>
        )}

        {/* DEALS */}
        {tab === 'deals' && (
          <div className="animate-fade-in">
            {deals.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-5xl mb-3">📋</p>
                <p className="text-white/35 mb-2">Нет сделок</p>
                <button onClick={() => setTab('create')} className="text-sm text-white/40 underline">Создать первую</button>
              </div>
            ) : (
              <div className="space-y-3">
                {deals.map((deal, i) => {
                  const st = STATUS_MAP[deal.status];
                  return (
                    <div key={deal.id} className="glass rounded-2xl p-4 animate-slide-up" style={{ animationDelay: `${i * 0.06}s` }}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center text-xl">{st.icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">{deal.title}</p>
                          <p className="text-[11px] text-white/25">@{deal.seller_username} · {timeAgo(deal.created_at)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-extrabold tabular-nums text-sm">◎{deal.amount}</p>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${st.color}`}>{st.label}</span>
                        </div>
                      </div>

                      {deal.description && <p className="text-xs text-white/25 mb-3 line-clamp-2">{deal.description}</p>}

                      {/* Progress */}
                      <div className="flex gap-1 mb-3">
                        {['funded', 'delivered', 'completed'].map((s, si) => (
                          <div key={s} className={`flex-1 h-1 rounded-full ${
                            (['funded','delivered','completed'].indexOf(deal.status) >= si || deal.status === 'completed')
                              ? 'bg-emerald-500' : 'bg-white/[0.06]'
                          }`} />
                        ))}
                      </div>

                      {/* Actions based on status */}
                      {deal.status === 'funded' && (
                        <div className="flex gap-2">
                          <button onClick={() => confirmDelivery(deal)}
                            className="flex-1 bg-blue-500 text-white py-2.5 rounded-xl text-xs font-bold active:scale-[0.97] transition-transform">
                            📦 Товар получен
                          </button>
                          <button onClick={() => cancelDeal(deal)}
                            className="flex-1 glass py-2.5 rounded-xl text-xs font-semibold text-red-400/70 active:scale-[0.97] transition-transform">
                            Отменить
                          </button>
                        </div>
                      )}

                      {deal.status === 'delivered' && (
                        <div className="flex gap-2">
                          <button onClick={() => releaseFunds(deal)}
                            className="flex-1 bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-bold active:scale-[0.97] transition-transform">
                            ✅ Подтвердить и оплатить
                          </button>
                          <button onClick={() => disputeDeal(deal)}
                            className="flex-1 glass py-2.5 rounded-xl text-xs font-semibold text-amber-400/70 active:scale-[0.97] transition-transform">
                            ⚠️ Спор
                          </button>
                        </div>
                      )}

                      {deal.status === 'disputed' && (
                        <div className="glass-accent rounded-xl p-3 flex items-center gap-2 border border-red-500/15">
                          <span>⚠️</span>
                          <p className="text-xs text-red-400/80">Спор на рассмотрении модератора. Среднее время: 24ч.</p>
                        </div>
                      )}

                      {deal.status === 'completed' && (
                        <div className="flex items-center gap-2 text-emerald-400/60 text-xs">
                          <span>✅</span>
                          <span>Сделка завершена · ◎{deal.amount} отправлено продавцу</span>
                        </div>
                      )}

                      {deal.status === 'cancelled' && (
                        <div className="flex items-center gap-2 text-white/25 text-xs">
                          <span>↩️</span>
                          <span>Отменено · ◎{deal.amount} возвращено</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
