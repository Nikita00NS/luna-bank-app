import React, { useState } from 'react';
import { useStore, uid } from '../lib/store';
import { haptic, timeAgo } from '../lib/utils';
import { dbUpdateBalance, dbCreateTransaction } from '../lib/db';
import { ArrowLeftIcon, ShieldIcon } from '../components/Icons';

interface Deal { id: string; title: string; desc: string; amount: number; seller: string; status: 'funded' | 'delivered' | 'completed' | 'disputed' | 'cancelled'; created_at: string; }

const ST: Record<string, { label: string; color: string }> = {
  funded: { label: 'Оплачено', color: 'text-blue-400 bg-blue-400/10' },
  delivered: { label: 'Доставлено', color: 'text-amber-400 bg-amber-400/10' },
  completed: { label: 'Завершено', color: 'text-emerald-400 bg-emerald-400/10' },
  disputed: { label: 'Спор', color: 'text-red-400 bg-red-400/10' },
  cancelled: { label: 'Отменено', color: 'text-gray-400 bg-gray-400/10' },
};

export default function EscrowScreen() {
  const { user, accounts, go, updateBalance, addTx, addNotif } = useStore();
  const [tab, setTab] = useState<'info' | 'create' | 'deals'>('info');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [seller, setSeller] = useState('');
  if (!user) return null;

  const lncAcc = accounts.find(a => a.currency === 'LNC');
  const balance = lncAcc?.balance || 0;
  const val = parseFloat(amount) || 0;
  const fee = val * 0.02;
  const total = val + fee;

  const create = () => {
    if (!title || !seller || val <= 0 || !lncAcc || balance < total) { haptic('error'); return; }
    haptic('success');
    updateBalance(lncAcc.id, -total);
    dbUpdateBalance(lncAcc.id, -total).catch(() => {});
    const deal: Deal = { id: uid(), title, desc, amount: val, seller, status: 'funded', created_at: new Date().toISOString() };
    setDeals(prev => [deal, ...prev]);
    addTx({ id: deal.id, from_user_id: user.telegram_id, to_user_id: 0, from_account_id: lncAcc.id, to_account_id: 'escrow', amount: total, fee, currency: 'LNC', type: 'withdrawal', status: 'completed', note: `Гарант: ${title}`, created_at: new Date().toISOString() });
    addNotif({ id: uid(), title: '🔒 Гарант создан', message: `◎${val} заморожено`, type: 'system', read: false, created_at: new Date().toISOString() });
    setTitle(''); setDesc(''); setAmount(''); setSeller(''); setTab('deals');
  };

  const confirm = (deal: Deal) => { haptic('medium'); setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, status: 'delivered' } : d)); };
  const release = (deal: Deal) => { haptic('success'); setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, status: 'completed' } : d)); addNotif({ id: uid(), title: '✅ Сделка завершена', message: `◎${deal.amount} → @${deal.seller}`, type: 'transfer', read: false, created_at: new Date().toISOString() }); };
  const dispute = (deal: Deal) => { haptic('error'); setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, status: 'disputed' } : d)); };
  const cancel = (deal: Deal) => { haptic('medium'); if (lncAcc) { updateBalance(lncAcc.id, deal.amount); dbUpdateBalance(lncAcc.id, deal.amount).catch(() => {}); } setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, status: 'cancelled' } : d)); };

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('home')} className="text-white/50"><ArrowLeftIcon size={20} /></button>
        <h1 className="font-bold flex-1">Гарант-сервис</h1>
      </div>
      <div className="px-5 flex gap-2 mb-3">
        {(['info', 'create', 'deals'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? 'bg-white text-black' : 'glass text-white/50'}`}>
            {t === 'info' ? '📖 Инфо' : t === 'create' ? '➕ Создать' : `📋 (${deals.length})`}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {tab === 'info' && <div className="animate-fade-in text-center py-6">
          <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mx-auto mb-4 animate-float"><ShieldIcon size={28} color="rgba(255,255,255,0.4)" /></div>
          <h2 className="text-xl font-extrabold mb-2">Безопасные сделки</h2>
          <p className="text-sm text-white/35 max-w-[280px] mx-auto mb-6">Средства замораживаются до подтверждения обеих сторон</p>
          <div className="space-y-3 text-left">
            {[['1. Создание', 'Укажите товар, сумму и @продавца'],['2. Заморозка', 'LNC блокируются на эскроу'],['3. Доставка', 'Продавец передаёт товар'],['4. Подтверждение', 'Покупатель подтверждает → деньги продавцу']].map(([t, d], i) => (
              <div key={i} className="glass p-3 flex items-start gap-3"><span className="text-lg mt-0.5">{'📝💰📦✅'[i]}</span><div><p className="font-semibold text-sm">{t}</p><p className="text-xs text-white/30">{d}</p></div></div>
            ))}
          </div>
          <button onClick={() => setTab('create')} className="btn-primary w-full mt-5">➕ Создать сделку</button>
        </div>}
        {tab === 'create' && <div className="animate-fade-in space-y-4">
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Название сделки" className="w-full glass px-4 py-3.5 bg-transparent text-white outline-none focus:ring-1 focus:ring-white/10" />
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Описание" rows={2} className="w-full glass px-4 py-3 bg-transparent text-white outline-none resize-none focus:ring-1 focus:ring-white/10" />
          <input type="text" value={seller} onChange={e => setSeller(e.target.value)} placeholder="@username продавца" className="w-full glass px-4 py-3.5 bg-transparent text-white outline-none focus:ring-1 focus:ring-white/10" />
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Сумма (LNC)" className="w-full glass px-4 py-4 bg-transparent text-white text-2xl font-extrabold mono outline-none text-center" />
          {val > 0 && <div className="glass p-3 space-y-1.5">
            <div className="flex justify-between text-sm"><span className="text-white/35">Сумма</span><span className="mono">◎{val.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-white/35">Комиссия (2%)</span><span className="mono">◎{fee.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm font-bold pt-1 border-t border-white/5"><span>Итого</span><span className="mono">◎{total.toFixed(2)}</span></div>
          </div>}
          <button onClick={create} disabled={!title || !seller || val <= 0 || balance < total} className="btn-primary w-full">🔒 Создать и заморозить</button>
        </div>}
        {tab === 'deals' && <div className="animate-fade-in">
          {deals.length === 0 ? <div className="text-center py-16"><p className="text-white/35">Нет сделок</p></div>
          : <div className="space-y-3">{deals.map((deal, i) => {
            const st = ST[deal.status];
            return (
              <div key={deal.id} className="glass p-4 animate-slide-up" style={{ animationDelay: `${i * 0.06}s` }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1"><p className="font-bold text-sm">{deal.title}</p><p className="text-[11px] text-white/25">@{deal.seller} · {timeAgo(deal.created_at)}</p></div>
                  <div className="text-right"><p className="font-extrabold mono text-sm">◎{deal.amount}</p><span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${st.color}`}>{st.label}</span></div>
                </div>
                <div className="flex gap-1 mb-3">{['funded', 'delivered', 'completed'].map((s, si) => <div key={s} className={`flex-1 h-1 rounded-full ${['funded', 'delivered', 'completed'].indexOf(deal.status) >= si ? 'bg-emerald-500' : 'bg-white/[0.06]'}`} />)}</div>
                {deal.status === 'funded' && <div className="flex gap-2"><button onClick={() => confirm(deal)} className="flex-1 bg-blue-500 text-white py-2.5 rounded-xl text-xs font-bold active:scale-[0.97]">📦 Получен</button><button onClick={() => cancel(deal)} className="flex-1 glass py-2.5 rounded-xl text-xs text-red-400/70 active:scale-[0.97]">Отмена</button></div>}
                {deal.status === 'delivered' && <div className="flex gap-2"><button onClick={() => release(deal)} className="flex-1 bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-bold active:scale-[0.97]">✅ Оплатить</button><button onClick={() => dispute(deal)} className="flex-1 glass py-2.5 rounded-xl text-xs text-amber-400/70 active:scale-[0.97]">⚠️ Спор</button></div>}
                {deal.status === 'completed' && <p className="text-xs text-emerald-400/60">✅ Сделка завершена</p>}
                {deal.status === 'cancelled' && <p className="text-xs text-white/25">↩️ Отменено · возврат ◎{deal.amount}</p>}
                {deal.status === 'disputed' && <p className="text-xs text-red-400/60">⚠️ Спор на рассмотрении</p>}
              </div>
            );
          })}</div>}
        </div>}
      </div>
    </div>
  );
}
