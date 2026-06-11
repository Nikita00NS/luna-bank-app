import React, { useState } from 'react';
import { useStore, uid } from '../lib/store';
import { haptic, formatMoney, balanceInUsd } from '../lib/utils';
import { LNC_RATE_USD } from '../lib/constants';
import { dbUpdateBalance, dbCreateTransaction, dbCreateNotification } from '../lib/sync';
import { notifyUser } from '../lib/telegram-bot';
import Modal from '../components/Modal';

const PRODUCTS = [
  { id: 'flex', name: 'Гибкий вклад', icon: '💰', apy: 5, minDays: 0, minAmount: 100, desc: 'Вывод в любой момент' },
  { id: 'month', name: 'На 30 дней', icon: '📅', apy: 8, minDays: 30, minAmount: 500, desc: 'Повышенная ставка' },
  { id: 'quarter', name: 'На 90 дней', icon: '🗓️', apy: 12, minDays: 90, minAmount: 1000, desc: 'Максимальный доход' },
  { id: 'stake_ton', name: 'Стейкинг TON', icon: '💎', apy: 7, minDays: 14, minAmount: 10, desc: 'Стейкинг Toncoin', currency: 'TON' },
  { id: 'piggy', name: 'Копилка', icon: '🐷', apy: 3, minDays: 0, minAmount: 0, desc: 'Автосбережения с округлением' },
];

interface Deposit {
  id: string;
  product: string;
  amount: number;
  currency: string;
  apy: number;
  startDate: string;
  endDate: string | null;
  earned: number;
  status: 'active' | 'completed';
}

export default function EarnScreen() {
  const { user, accounts, go, updateBalance, addTx, addNotif } = useStore();
  const [tab, setTab] = useState<'products' | 'active'>('products');
  const [selProduct, setSelProduct] = useState<typeof PRODUCTS[0] | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [deposits, setDeposits] = useState<Deposit[]>([]);

  if (!user) return null;

  const lncAcc = accounts.find(a => a.currency === 'LNC');
  const tonAcc = accounts.find(a => a.currency === 'TON');
  const val = parseFloat(amount) || 0;

  const totalEarning = deposits.filter(d => d.status === 'active').reduce((s, d) => {
    const days = (Date.now() - new Date(d.startDate).getTime()) / (1000 * 60 * 60 * 24);
    return s + (d.amount * d.apy / 100 / 365 * days);
  }, 0);

  const handleDeposit = () => {
    if (!selProduct || val <= 0) return;
    const isLNC = selProduct.currency !== 'TON';
    const acc = isLNC ? lncAcc : tonAcc;
    if (!acc || acc.balance < val) { haptic('error'); return; }

    haptic('success');
    updateBalance(acc.id, -val);
    dbUpdateBalance(acc.id, -val).catch(() => {});

    const endDate = selProduct.minDays > 0
      ? new Date(Date.now() + selProduct.minDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const dep: Deposit = {
      id: uid(), product: selProduct.id, amount: val,
      currency: isLNC ? 'LNC' : 'TON', apy: selProduct.apy,
      startDate: new Date().toISOString(), endDate, earned: 0, status: 'active',
    };
    setDeposits(prev => [dep, ...prev]);

    addTx({
      id: dep.id, from_user_id: user.telegram_id, to_user_id: 0,
      from_account_id: acc.id, to_account_id: 'earn',
      amount: val, fee: 0, currency: dep.currency as any,
      type: 'deposit', status: 'completed',
      note: `Вклад: ${selProduct.name}`,
      created_at: new Date().toISOString(),
    });

    addNotif({
      id: uid(), title: '💎 Вклад открыт',
      message: `${selProduct.name}: ${val} ${dep.currency} под ${selProduct.apy}% годовых`,
      type: 'system', read: false, created_at: new Date().toISOString(),
    });

    setShowModal(false);
    setAmount('');
    setTab('active');
  };

  const withdrawDeposit = (dep: Deposit) => {
    haptic('success');
    const days = (Date.now() - new Date(dep.startDate).getTime()) / (1000 * 60 * 60 * 24);
    const earned = dep.amount * dep.apy / 100 / 365 * days;
    const total = dep.amount + earned;
    const acc = dep.currency === 'LNC' ? lncAcc : tonAcc;
    if (!acc) return;

    updateBalance(acc.id, total);
    dbUpdateBalance(acc.id, total).catch(() => {});

    setDeposits(prev => prev.map(d => d.id === dep.id ? { ...d, status: 'completed' as const, earned } : d));

    addNotif({
      id: uid(), title: '💰 Вклад закрыт',
      message: `Получено: ${total.toFixed(2)} ${dep.currency} (доход: ${earned.toFixed(2)})`,
      type: 'deposit', read: false, created_at: new Date().toISOString(),
    });
  };

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('home')} className="text-white/50 text-sm">← Назад</button>
        <h1 className="font-bold flex-1">💎 Earn / Вклады</h1>
      </div>

      {/* Summary card */}
      <div className="mx-5 mt-2 glass-accent rounded-2xl p-4 mb-4">
        <p className="text-xs text-white/35 uppercase font-medium">Общий доход</p>
        <p className="text-3xl font-extrabold tabular-nums text-emerald-400 mt-1">
          +◎{totalEarning.toFixed(2)} <span className="text-base text-white/30">LNC</span>
        </p>
        <p className="text-xs text-white/25 mt-1">
          {deposits.filter(d => d.status === 'active').length} активных вкладов · ≈${(totalEarning * LNC_RATE_USD).toFixed(2)}
        </p>
      </div>

      {/* Tabs */}
      <div className="px-5 flex gap-2 mb-3">
        {(['products', 'active'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? 'bg-white text-black' : 'glass text-white/50'}`}>
            {t === 'products' ? '📦 Продукты' : `📊 Мои (${deposits.filter(d => d.status === 'active').length})`}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {tab === 'products' && (
          <div className="space-y-3 animate-fade-in">
            {PRODUCTS.map((p, i) => (
              <button key={p.id} onClick={() => { setSelProduct(p); setShowModal(true); haptic('light'); }}
                className="w-full glass rounded-2xl p-4 flex items-center gap-4 text-left animate-slide-up active:scale-[0.98] transition-all"
                style={{ animationDelay: `${i * 0.06}s` }}>
                <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center text-2xl">{p.icon}</div>
                <div className="flex-1">
                  <p className="font-bold">{p.name}</p>
                  <p className="text-xs text-white/30 mt-0.5">{p.desc}</p>
                  <p className="text-[11px] text-white/20 mt-0.5">
                    Мин: {p.minAmount} {p.currency || 'LNC'} · {p.minDays > 0 ? `Срок: ${p.minDays} дн.` : 'Без срока'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-emerald-400">{p.apy}%</p>
                  <p className="text-[10px] text-white/25">годовых</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {tab === 'active' && (
          <div className="animate-fade-in">
            {deposits.filter(d => d.status === 'active').length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">💎</p>
                <p className="text-white/35 mb-2">Нет активных вкладов</p>
                <button onClick={() => setTab('products')} className="text-sm text-white/40 underline">Открыть вклад</button>
              </div>
            ) : (
              <div className="space-y-3">
                {deposits.filter(d => d.status === 'active').map((dep, i) => {
                  const prod = PRODUCTS.find(p => p.id === dep.product);
                  const days = (Date.now() - new Date(dep.startDate).getTime()) / (1000 * 60 * 60 * 24);
                  const earned = dep.amount * dep.apy / 100 / 365 * days;
                  const canWithdraw = !dep.endDate || new Date(dep.endDate) <= new Date();

                  return (
                    <div key={dep.id} className="glass rounded-2xl p-4 animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">{prod?.icon || '💰'}</span>
                        <div className="flex-1">
                          <p className="font-bold">{prod?.name}</p>
                          <p className="text-[11px] text-white/25">{dep.apy}% годовых · {Math.floor(days)} дн.</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold tabular-nums">{dep.amount} {dep.currency}</p>
                          <p className="text-emerald-400 text-xs tabular-nums">+{earned.toFixed(4)}</p>
                        </div>
                      </div>
                      {/* Progress bar */}
                      {dep.endDate && (
                        <div className="mb-3">
                          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-violet-500 to-emerald-400 rounded-full transition-all"
                              style={{ width: `${Math.min(days / (PRODUCTS.find(p => p.id === dep.product)?.minDays || 30) * 100, 100)}%` }} />
                          </div>
                          <p className="text-[10px] text-white/20 mt-1">До снятия: {dep.endDate ? new Date(dep.endDate).toLocaleDateString('ru-RU') : '—'}</p>
                        </div>
                      )}
                      <button onClick={() => withdrawDeposit(dep)} disabled={!canWithdraw}
                        className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                          canWithdraw ? 'bg-white text-black active:scale-[0.97]' : 'bg-white/5 text-white/25'
                        }`}>
                        {canWithdraw ? `Забрать ${(dep.amount + earned).toFixed(2)} ${dep.currency}` : '🔒 Заблокировано'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Completed deposits */}
            {deposits.filter(d => d.status === 'completed').length > 0 && (
              <div className="mt-6">
                <p className="text-xs text-white/25 font-medium mb-2 uppercase">Завершённые</p>
                {deposits.filter(d => d.status === 'completed').map(dep => (
                  <div key={dep.id} className="glass rounded-xl p-3 mb-2 opacity-50">
                    <div className="flex justify-between">
                      <span className="text-sm">{PRODUCTS.find(p => p.id === dep.product)?.name}</span>
                      <span className="text-sm tabular-nums text-emerald-400">+{dep.earned.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Deposit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={selProduct?.name || ''}>
        {selProduct && (
          <div className="space-y-4">
            <div className="glass-accent rounded-xl p-4 text-center">
              <span className="text-4xl block mb-2">{selProduct.icon}</span>
              <p className="text-3xl font-extrabold text-emerald-400">{selProduct.apy}%</p>
              <p className="text-xs text-white/35">годовых</p>
            </div>

            <div className="space-y-2 text-sm">
              {[
                ['Минимум', `${selProduct.minAmount} ${selProduct.currency || 'LNC'}`],
                ['Срок', selProduct.minDays > 0 ? `${selProduct.minDays} дней` : 'Без срока'],
                ['Баланс', `${(selProduct.currency === 'TON' ? tonAcc : lncAcc)?.balance.toFixed(2) || '0'} ${selProduct.currency || 'LNC'}`],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between">
                  <span className="text-white/35">{l}</span>
                  <span className="font-medium tabular-nums">{v}</span>
                </div>
              ))}
            </div>

            <div>
              <p className="text-xs text-white/35 mb-1.5 font-medium">Сумма вклада</p>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder={`Мин. ${selProduct.minAmount}`}
                className="w-full glass rounded-xl px-4 py-3.5 bg-transparent text-white text-xl font-bold tabular-nums outline-none text-center" />
            </div>

            {val > 0 && (
              <div className="glass rounded-xl p-3 text-center">
                <p className="text-xs text-white/35">Ежедневный доход</p>
                <p className="text-lg font-bold text-emerald-400 tabular-nums">
                  +{(val * selProduct.apy / 100 / 365).toFixed(4)} {selProduct.currency || 'LNC'}
                </p>
                <p className="text-[11px] text-white/20">≈ ${(val * selProduct.apy / 100 / 365 * LNC_RATE_USD).toFixed(4)}/день</p>
              </div>
            )}

            <button onClick={handleDeposit}
              disabled={val < selProduct.minAmount}
              className="btn-primary w-full">
              Открыть вклад
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
