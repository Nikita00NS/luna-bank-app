import React, { useState, useEffect } from 'react';
import { useStore, uid } from '../lib/store';
import { haptic } from '../lib/utils';
import { LNC_RATE_USD } from '../lib/constants';
import { dbUpdateBalance, dbCreateTransaction, dbCreateEarnDeposit, dbGetEarnDeposits, dbUpdateEarnDeposit } from '../lib/db';
import { ArrowLeftIcon, DiamondIcon } from '../components/Icons';
import AnimatedEmoji from '../components/AnimatedEmoji';
import LncIcon from '../components/LncIcon';
import Modal from '../components/Modal';

const PRODUCTS = [
  { id: 'flex', name: 'Гибкий вклад', icon: '💰', apy: 5, minDays: 0, minAmt: 100, desc: 'Вывод в любой момент', cur: 'LNC' },
  { id: 'month', name: 'На 30 дней', icon: '📅', apy: 8, minDays: 30, minAmt: 500, desc: 'Повышенная ставка', cur: 'LNC' },
  { id: 'quarter', name: 'На 90 дней', icon: '🗓️', apy: 12, minDays: 90, minAmt: 1000, desc: 'Максимальный доход', cur: 'LNC' },
  { id: 'ton_stake', name: 'Стейкинг TON', icon: '💎', apy: 7, minDays: 14, minAmt: 10, desc: 'Стейкинг Toncoin', cur: 'TON' },
];

interface Deposit { id: string; user_id: number; product: string; amount: number; currency: string; apy: number; start_date: string; status: string; }

export default function EarnScreen() {
  const { user, accounts, go, updateBalance, addTx, addNotif } = useStore();
  const [tab, setTab] = useState<'products' | 'active'>('products');
  const [selProd, setSelProd] = useState<typeof PRODUCTS[0] | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [amount, setAmount] = useState('');
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(false);
  if (!user) return null;

  const lncAcc = accounts.find(a => a.currency === 'LNC');
  const tonAcc = accounts.find(a => a.currency === 'TON');
  const val = parseFloat(amount) || 0;

  useEffect(() => { loadDeposits(); }, []);

  const loadDeposits = async () => {
    setLoading(true);
    const data = await dbGetEarnDeposits(user.telegram_id);
    setDeposits(data as Deposit[]);
    setLoading(false);
  };

  const totalEarning = deposits.filter(d => d.status === 'active').reduce((s, d) => {
    const days = (Date.now() - new Date(d.start_date).getTime()) / 86400000;
    return s + (d.amount * d.apy / 100 / 365 * Math.max(0, days));
  }, 0);

  const goConfirm = () => {
    if (!selProd || val <= 0 || val < selProd.minAmt) { haptic('error'); return; }
    const acc = selProd.cur === 'TON' ? tonAcc : lncAcc;
    if (!acc || acc.balance < val) { haptic('error'); return; }
    haptic('medium');
    setShowModal(false);
    setShowConfirm(true);
  };

  const openDeposit = async () => {
    if (!selProd) return;
    const acc = selProd.cur === 'TON' ? tonAcc : lncAcc;
    if (!acc || acc.balance < val) { haptic('error'); return; }
    haptic('success');

    updateBalance(acc.id, -val);
    dbUpdateBalance(acc.id, -val).catch(() => {});

    await dbCreateEarnDeposit({
      user_id: user.telegram_id,
      product: selProd.id,
      amount: val,
      currency: selProd.cur,
      apy: selProd.apy,
      start_date: new Date().toISOString(),
      status: 'active',
    });

    addTx({ id: uid(), from_user_id: user.telegram_id, to_user_id: user.telegram_id, from_account_id: acc.id, to_account_id: 'earn', amount: val, fee: 0, currency: selProd.cur as any, type: 'deposit', status: 'completed', note: `Вклад: ${selProd.name} (${selProd.apy}% APY)`, created_at: new Date().toISOString() });
    addNotif({ id: uid(), title: '📈 Вклад открыт', message: `${selProd.name}: 🌙{val} · ${selProd.apy}% годовых`, type: 'deposit', read: false, created_at: new Date().toISOString() });

    setShowConfirm(false);
    setAmount('');
    loadDeposits();
    setTab('active');
  };

  const closeDeposit = async (dep: Deposit) => {
    const acc = dep.currency === 'TON' ? tonAcc : lncAcc;
    if (!acc) return;
    haptic('success');

    const days = (Date.now() - new Date(dep.start_date).getTime()) / 86400000;
    const earned = Math.round(dep.amount * dep.apy / 100 / 365 * Math.max(0, days) * 100) / 100;
    const total = dep.amount + earned;

    updateBalance(acc.id, total);
    dbUpdateBalance(acc.id, total).catch(() => {});
    await dbUpdateEarnDeposit(dep.id, { status: 'done' });

    addNotif({ id: uid(), title: '💰 Вклад закрыт', message: `Получено: 🌙{total.toFixed(2)} (прибыль: 🌙{earned.toFixed(2)})`, type: 'deposit', read: false, created_at: new Date().toISOString() });
    loadDeposits();
  };

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('home')} className="text-white/50"><ArrowLeftIcon size={20} /></button>
        <h1 className="font-bold flex-1">Earn</h1>
      </div>

      {/* Earnings banner */}
      <div className="px-5 mt-1">
        <div className="glass-accent p-4 rounded-2xl flex items-center gap-3">
          <AnimatedEmoji type="coin" size={36} />
          <div className="flex-1">
            <p className="text-xs text-white/35">Начислено процентов</p>
            <p className="text-xl font-extrabold mono text-emerald-400">+🌙{totalEarning.toFixed(2)}</p>
          </div>
          <p className="text-xs text-white/20">{deposits.filter(d => d.status === 'active').length} вкладов</p>
        </div>
      </div>

      <div className="px-5 mt-3 flex gap-2">
        {(['products', 'active'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); haptic('light'); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === t ? 'bg-white text-black' : 'glass text-white/50'}`}>
            {t === 'products' ? '📦 Продукты' : `📊 Активные (${deposits.filter(d => d.status === 'active').length})`}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24 mt-3">
        {tab === 'products' && (
          <div className="space-y-3 animate-fade-in">
            {PRODUCTS.map((p, i) => (
              <button key={p.id} onClick={() => { setSelProd(p); setShowModal(true); haptic('light'); }}
                className="w-full glass p-4 rounded-2xl text-left active:scale-[0.98] transition-all animate-slide-up" style={{ animationDelay: `${i * 0.06}s` }}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{p.icon}</span>
                  <div className="flex-1"><p className="font-bold">{p.name}</p><p className="text-[10px] text-white/25">{p.desc}</p></div>
                  <div className="text-right">
                    <p className="text-lg font-extrabold text-emerald-400">{p.apy}%</p>
                    <p className="text-[9px] text-white/20">APY</p>
                  </div>
                </div>
                <div className="flex gap-3 text-[10px] text-white/20">
                  <span>Мин: {p.minAmt} {p.cur}</span>
                  {p.minDays > 0 && <span>Срок: {p.minDays}д</span>}
                </div>
              </button>
            ))}
          </div>
        )}

        {tab === 'active' && (
          <div className="animate-fade-in">
            {loading ? <div className="text-center py-10"><AnimatedEmoji type="loading" size={32} /></div> :
             deposits.filter(d => d.status === 'active').length === 0 ? (
              <div className="text-center py-14"><p className="text-white/30 text-sm">Нет активных вкладов</p></div>
            ) : (
              <div className="space-y-2">
                {deposits.filter(d => d.status === 'active').map((d, i) => {
                  const days = Math.max(0, (Date.now() - new Date(d.start_date).getTime()) / 86400000);
                  const earned = d.amount * d.apy / 100 / 365 * days;
                  const prod = PRODUCTS.find(p => p.id === d.product);
                  return (
                    <div key={d.id} className="glass p-4 rounded-2xl animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xl">{prod?.icon || '💰'}</span>
                        <div className="flex-1"><p className="font-bold text-sm">{prod?.name || d.product}</p><p className="text-[10px] text-white/25">{d.apy}% APY · {Math.floor(days)}д</p></div>
                        <div className="text-right"><p className="font-bold mono text-sm"> 🌙{d.amount}</p><p className="text-[10px] text-emerald-400 mono">+🌙{earned.toFixed(2)}</p></div>
                      </div>
                      <button onClick={() => closeDeposit(d)} className="w-full glass py-2 rounded-xl text-xs text-white/50 active:scale-95 mt-1">📤 Закрыть и забрать 🌙{(d.amount + earned).toFixed(2)}</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Open deposit modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={selProd?.name || ''}>
        {selProd && (
          <div className="space-y-4">
            <div className="text-center"><span className="text-4xl">{selProd.icon}</span><p className="text-emerald-400 font-bold text-xl mt-2">{selProd.apy}% годовых</p><p className="text-xs text-white/30">{selProd.desc}</p></div>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder={`Мин: ${selProd.minAmt} ${selProd.cur}`}
              className="w-full glass px-4 py-3.5 bg-transparent text-white text-xl mono outline-none text-center rounded-xl" />
            <button onClick={goConfirm} disabled={val < selProd.minAmt} className="btn-primary w-full">Открыть вклад</button>
          </div>
        )}
      </Modal>

      {/* Confirm modal */}
      <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title="Подтверждение">
        {selProd && (
          <div className="space-y-4">
            <div className="glass p-4 rounded-xl space-y-2 text-sm">
              {[['📦 Продукт', selProd.name], ['💰 Сумма', `🌙${val} ${selProd.cur}`], ['📈 Ставка', `${selProd.apy}% годовых`], ...(selProd.minDays > 0 ? [['📅 Срок', `${selProd.minDays} дней`]] : [])].map(([l, v]) => (
                <div key={l} className="flex justify-between"><span className="text-white/35">{l}</span><span className="mono font-medium">{v}</span></div>
              ))}
            </div>
            <button onClick={openDeposit} className="btn-primary w-full">✅ Подтвердить</button>
            <button onClick={() => { setShowConfirm(false); setShowModal(true); }} className="btn-ghost w-full">← Назад</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
