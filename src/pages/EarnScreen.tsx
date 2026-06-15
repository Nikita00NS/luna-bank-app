import React, { useState } from 'react';
import { useStore, uid } from '../lib/store';
import { haptic } from '../lib/utils';
import { LNC_RATE_USD } from '../lib/constants';
import { dbUpdateBalance, dbCreateTransaction } from '../lib/db';
import { ArrowLeftIcon, DiamondIcon } from '../components/Icons';
import Modal from '../components/Modal';

const PRODUCTS = [
  { id: 'flex', name: 'Гибкий вклад', icon: '💰', apy: 5, minDays: 0, minAmt: 100, desc: 'Вывод в любой момент' },
  { id: 'month', name: 'На 30 дней', icon: '📅', apy: 8, minDays: 30, minAmt: 500, desc: 'Повышенная ставка' },
  { id: 'quarter', name: 'На 90 дней', icon: '🗓️', apy: 12, minDays: 90, minAmt: 1000, desc: 'Максимальный доход' },
  { id: 'ton_stake', name: 'Стейкинг TON', icon: '💎', apy: 7, minDays: 14, minAmt: 10, desc: 'Стейкинг Toncoin', cur: 'TON' },
];

interface Deposit { id: string; product: string; amount: number; currency: string; apy: number; startDate: string; status: 'active' | 'done'; }

export default function EarnScreen() {
  const { user, accounts, go, updateBalance, addTx, addNotif } = useStore();
  const [tab, setTab] = useState<'products' | 'active'>('products');
  const [selProd, setSelProd] = useState<typeof PRODUCTS[0] | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  if (!user) return null;

  const lncAcc = accounts.find(a => a.currency === 'LNC');
  const tonAcc = accounts.find(a => a.currency === 'TON');
  const val = parseFloat(amount) || 0;

  const totalEarning = deposits.filter(d => d.status === 'active').reduce((s, d) => {
    const days = (Date.now() - new Date(d.startDate).getTime()) / 86400000;
    return s + (d.amount * d.apy / 100 / 365 * days);
  }, 0);

  const openDeposit = () => {
    if (!selProd || val <= 0) return;
    const isLNC = selProd.cur !== 'TON';
    const acc = isLNC ? lncAcc : tonAcc;
    if (!acc || acc.balance < val) { haptic('error'); return; }
    haptic('success');
    updateBalance(acc.id, -val);
    dbUpdateBalance(acc.id, -val).catch(() => {});
    const dep: Deposit = { id: uid(), product: selProd.id, amount: val, currency: isLNC ? 'LNC' : 'TON', apy: selProd.apy, startDate: new Date().toISOString(), status: 'active' };
    setDeposits(prev => [dep, ...prev]);
    addTx({ id: dep.id, from_user_id: user.telegram_id, to_user_id: 0, from_account_id: acc.id, to_account_id: 'earn', amount: val, fee: 0, currency: dep.currency as any, type: 'deposit', status: 'completed', note: `Вклад: ${selProd.name}`, created_at: new Date().toISOString() });
    addNotif({ id: uid(), title: '💎 Вклад открыт', message: `${selProd.name}: ${val} ${dep.currency} под ${selProd.apy}%`, type: 'system', read: false, created_at: new Date().toISOString() });
    setShowModal(false); setAmount(''); setTab('active');
  };

  const withdraw = (dep: Deposit) => {
    haptic('success');
    const days = (Date.now() - new Date(dep.startDate).getTime()) / 86400000;
    const earned = dep.amount * dep.apy / 100 / 365 * days;
    const total = dep.amount + earned;
    const acc = dep.currency === 'LNC' ? lncAcc : tonAcc;
    if (!acc) return;
    updateBalance(acc.id, total);
    dbUpdateBalance(acc.id, total).catch(() => {});
    setDeposits(prev => prev.map(d => d.id === dep.id ? { ...d, status: 'done' as const } : d));
    addNotif({ id: uid(), title: '💰 Вклад закрыт', message: `+${earned.toFixed(2)} ${dep.currency}`, type: 'deposit', read: false, created_at: new Date().toISOString() });
  };

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('home')} className="text-white/50"><ArrowLeftIcon size={20} /></button>
        <h1 className="font-bold flex-1">Earn / Вклады</h1>
      </div>
      <div className="mx-5 mt-2 glass-accent p-4 mb-4">
        <p className="text-xs text-white/35 uppercase font-medium">Общий доход</p>
        <p className="text-3xl font-extrabold mono text-emerald-400 mt-1">+◎{totalEarning.toFixed(2)}</p>
        <p className="text-xs text-white/25 mt-1">{deposits.filter(d => d.status === 'active').length} активных · ≈${(totalEarning * LNC_RATE_USD).toFixed(2)}</p>
      </div>
      <div className="px-5 flex gap-2 mb-3">
        {(['products', 'active'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? 'bg-white text-black' : 'glass text-white/50'}`}>
            {t === 'products' ? '📦 Продукты' : `📊 Мои (${deposits.filter(d => d.status === 'active').length})`}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {tab === 'products' && <div className="space-y-3 animate-fade-in">{PRODUCTS.map((p, i) => (
          <button key={p.id} onClick={() => { setSelProd(p); setShowModal(true); haptic('light'); }}
            className="w-full glass p-4 flex items-center gap-4 text-left animate-slide-up active:scale-[0.98] transition-all" style={{ animationDelay: `${i * 0.06}s` }}>
            <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center text-2xl">{p.icon}</div>
            <div className="flex-1"><p className="font-bold">{p.name}</p><p className="text-xs text-white/30 mt-0.5">{p.desc}</p>
              <p className="text-[11px] text-white/20">Мин: {p.minAmt} {p.cur || 'LNC'} · {p.minDays > 0 ? `${p.minDays} дн.` : 'Без срока'}</p></div>
            <div className="text-right"><p className="text-2xl font-extrabold text-emerald-400">{p.apy}%</p><p className="text-[10px] text-white/25">годовых</p></div>
          </button>
        ))}</div>}
        {tab === 'active' && <div className="animate-fade-in">
          {deposits.filter(d => d.status === 'active').length === 0 ? <div className="text-center py-16"><DiamondIcon size={32} color="rgba(255,255,255,0.2)" className="mx-auto mb-3" /><p className="text-white/35">Нет вкладов</p></div>
          : <div className="space-y-3">{deposits.filter(d => d.status === 'active').map((dep, i) => {
            const prod = PRODUCTS.find(p => p.id === dep.product);
            const days = (Date.now() - new Date(dep.startDate).getTime()) / 86400000;
            const earned = dep.amount * dep.apy / 100 / 365 * days;
            return (
              <div key={dep.id} className="glass p-4 animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{prod?.icon || '💰'}</span>
                  <div className="flex-1"><p className="font-bold">{prod?.name}</p><p className="text-[11px] text-white/25">{dep.apy}% · {Math.floor(days)} дн.</p></div>
                  <div className="text-right"><p className="font-bold mono">{dep.amount} {dep.currency}</p><p className="text-emerald-400 text-xs mono">+{earned.toFixed(4)}</p></div>
                </div>
                <button onClick={() => withdraw(dep)} className="w-full bg-white text-black py-2.5 rounded-xl text-sm font-semibold active:scale-[0.97] transition-transform">
                  Забрать {(dep.amount + earned).toFixed(2)} {dep.currency}
                </button>
              </div>
            );
          })}</div>}
        </div>}
      </div>
      <Modal open={showModal} onClose={() => setShowModal(false)} title={selProd?.name || ''}>
        {selProd && <div className="space-y-4">
          <div className="glass-accent p-4 text-center"><span className="text-4xl block mb-2">{selProd.icon}</span><p className="text-3xl font-extrabold text-emerald-400">{selProd.apy}%</p><p className="text-xs text-white/35">годовых</p></div>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder={`Мин. ${selProd.minAmt}`} className="w-full glass px-4 py-3.5 bg-transparent text-white text-xl font-bold mono outline-none text-center" />
          {val > 0 && <div className="glass p-3 text-center"><p className="text-xs text-white/35">Доход/день</p><p className="text-lg font-bold text-emerald-400 mono">+{(val * selProd.apy / 100 / 365).toFixed(4)} {selProd.cur || 'LNC'}</p></div>}
          <button onClick={openDeposit} disabled={val < selProd.minAmt} className="btn-primary w-full">Открыть вклад</button>
        </div>}
      </Modal>
    </div>
  );
}
