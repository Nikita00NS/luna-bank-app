import React, { useState, useEffect } from 'react';
import { useStore, uid } from '../lib/store';
import { haptic, timeAgo } from '../lib/utils';
import { dbUpdateBalance, dbCreateTransaction, dbCreateEscrow, dbGetEscrowDeals, dbUpdateEscrow } from '../lib/db';
import { ArrowLeftIcon, ShieldIcon } from '../components/Icons';
import AnimatedEmoji from '../components/AnimatedEmoji';
import { notifyCustom } from '../lib/bot';

interface Deal { id: string; buyer_id: number; seller_username: string; title: string; description: string; amount: number; fee: number; status: string; created_at: string; }

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
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [seller, setSeller] = useState('');
  const [step, setStep] = useState<'form' | 'confirm' | 'success'>('form');
  if (!user) return null;

  const lncAcc = accounts.find(a => a.currency === 'LNC');
  const balance = lncAcc?.balance || 0;
  const val = parseFloat(amount) || 0;
  const fee = Math.round(val * 0.02 * 100) / 100;
  const total = val + fee;

  useEffect(() => { loadDeals(); }, []);

  const loadDeals = async () => {
    setLoading(true);
    const data = await dbGetEscrowDeals(user.telegram_id);
    setDeals(data as Deal[]);
    setLoading(false);
  };

  const goConfirm = () => {
    if (!title || !seller || val <= 0 || !lncAcc || balance < total) { haptic('error'); return; }
    haptic('medium');
    setStep('confirm');
  };

  const create = async () => {
    if (!lncAcc) return;
    haptic('success');
    updateBalance(lncAcc.id, -total);
    dbUpdateBalance(lncAcc.id, -total).catch(() => {});

    const deal = { buyer_id: user.telegram_id, seller_username: seller, title, description: desc, amount: val, fee, status: 'funded' };
    await dbCreateEscrow(deal);

    addTx({ id: uid(), from_user_id: user.telegram_id, to_user_id: 0, from_account_id: lncAcc.id, to_account_id: 'escrow', amount: total, fee, currency: 'LNC', type: 'withdrawal', status: 'completed', note: `Гарант: ${title}`, created_at: new Date().toISOString() });
    addNotif({ id: uid(), title: '🛡️ Гарант-сделка', message: `◎${val} → @${seller}`, type: 'system', read: false, created_at: new Date().toISOString() });
    notifyCustom(user.telegram_id, `🛡️ *Гарант-сделка создана*\n${title}: ◎${val} LNC\nПродавец: @${seller}`).catch(() => {});

    setStep('success');
    loadDeals();
  };

  const updateStatus = async (dealId: string, newStatus: string) => {
    haptic('medium');
    await dbUpdateEscrow(dealId, { status: newStatus });
    if (newStatus === 'completed' && lncAcc) {
      // release funds (simplified — return fee to buyer, send amount to seller concept)
    }
    loadDeals();
  };

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => step !== 'form' ? setStep('form') : go('home')} className="text-white/50"><ArrowLeftIcon size={20} /></button>
        <h1 className="font-bold flex-1">Гарант-сервис</h1>
      </div>
      <div className="px-5 flex gap-1.5 mb-3 p-1 glass rounded-2xl">
        {(['info', 'create', 'deals'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setStep('form'); haptic('light'); }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${tab === t ? 'bg-white text-black' : 'text-white/40'}`}>
            {t === 'info' ? '📖 Инфо' : t === 'create' ? '➕ Создать' : `📋 Сделки (${deals.length})`}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {tab === 'info' && (
          <div className="animate-fade-in">
            <div className="text-center py-6">
              <AnimatedEmoji type="lock" size={56} />
              <h2 className="text-xl font-extrabold mt-3">Безопасные сделки</h2>
              <p className="text-white/35 text-sm mt-2 max-w-[280px] mx-auto">Деньги замораживаются до подтверждения обеими сторонами</p>
            </div>
            <div className="space-y-2">
              {[
                { s: '1', t: 'Покупатель создаёт сделку', d: 'Средства замораживаются' },
                { s: '2', t: 'Продавец отправляет товар', d: 'Отмечает как "доставлено"' },
                { s: '3', t: 'Покупатель подтверждает', d: 'Средства уходят продавцу' },
              ].map(i => (
                <div key={i.s} className="glass p-3 flex items-center gap-3 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-xs font-bold">{i.s}</div>
                  <div><p className="text-sm font-medium">{i.t}</p><p className="text-[10px] text-white/25">{i.d}</p></div>
                </div>
              ))}
            </div>
            <p className="text-center text-[10px] text-white/20 mt-4">Комиссия: 2% от суммы сделки</p>
          </div>
        )}

        {tab === 'create' && step === 'form' && (
          <div className="space-y-4 animate-fade-in">
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Название сделки" className="w-full glass px-4 py-3 bg-transparent text-white outline-none rounded-xl" />
            <input type="text" value={seller} onChange={e => setSeller(e.target.value)} placeholder="@username продавца" className="w-full glass px-4 py-3 bg-transparent text-white outline-none rounded-xl" />
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Описание (необязательно)" className="w-full glass px-4 py-3 bg-transparent text-white outline-none rounded-xl resize-none h-20" />
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Сумма (LNC)" className="w-full glass px-4 py-3 bg-transparent text-white mono outline-none rounded-xl text-center text-xl" />
            {val > 0 && <div className="glass p-3 rounded-xl space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-white/35">Сумма</span><span className="mono">◎{val}</span></div>
              <div className="flex justify-between"><span className="text-white/35">Комиссия 2%</span><span className="mono">◎{fee}</span></div>
              <div className="flex justify-between font-bold border-t border-white/[0.04] pt-1"><span>Итого</span><span className="mono">◎{total}</span></div>
            </div>}
            <button onClick={goConfirm} disabled={!title || !seller || val <= 0 || balance < total} className="btn-primary w-full">Продолжить →</button>
          </div>
        )}

        {tab === 'create' && step === 'confirm' && (
          <div className="animate-fade-in">
            <div className="glass p-5 space-y-3 rounded-2xl mb-6">
              <div className="text-center mb-3"><AnimatedEmoji type="lock" size={40} /><h3 className="font-bold text-lg mt-2">Подтверждение</h3></div>
              {[['🏷 Сделка', title], ['👤 Продавец', `@${seller}`], ['💰 Сумма', `◎${val}`], ['📊 Комиссия', `◎${fee}`], ['📋 Итого', `◎${total}`]].map(([l, v]) => (
                <div key={l} className="flex justify-between py-1.5 border-b border-white/[0.04] last:border-0 last:font-bold"><span className="text-white/35 text-sm">{l}</span><span className="text-sm mono">{v}</span></div>
              ))}
            </div>
            <button onClick={create} className="btn-primary w-full">✅ Создать сделку</button>
            <button onClick={() => setStep('form')} className="btn-ghost w-full mt-2">← Назад</button>
          </div>
        )}

        {tab === 'create' && step === 'success' && (
          <div className="text-center py-10 animate-fade-in">
            <AnimatedEmoji type="success" size={64} loop={false} />
            <h3 className="font-bold text-lg mt-4">Сделка создана!</h3>
            <p className="text-white/35 text-sm mt-1">◎{val} заморожено</p>
            <button onClick={() => { setStep('form'); setTitle(''); setDesc(''); setAmount(''); setSeller(''); setTab('deals'); }} className="btn-primary mt-6 px-8">К сделкам</button>
          </div>
        )}

        {tab === 'deals' && (
          <div className="animate-fade-in">
            {loading ? <div className="text-center py-10"><AnimatedEmoji type="loading" size={32} /></div> :
             deals.length === 0 ? <div className="text-center py-14"><p className="text-white/30">Нет сделок</p></div> :
             <div className="space-y-2">{deals.map((d, i) => {
              const st = ST[d.status] || ST.funded;
              return (
                <div key={d.id} className="glass p-4 rounded-2xl animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="flex items-center gap-3 mb-2">
                    <ShieldIcon size={18} color="rgba(255,255,255,0.3)" />
                    <div className="flex-1"><p className="font-bold text-sm">{d.title}</p><p className="text-[10px] text-white/25">@{d.seller_username} · {timeAgo(d.created_at)}</p></div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-lg ${st.color}`}>{st.label}</span>
                  </div>
                  <div className="flex justify-between text-xs text-white/30 mb-2">
                    <span>◎{d.amount} LNC</span><span>Комиссия: ◎{d.fee}</span>
                  </div>
                  {d.status === 'funded' && (
                    <div className="flex gap-2">
                      <button onClick={() => updateStatus(d.id, 'delivered')} className="flex-1 glass py-2 rounded-xl text-xs active:scale-95">📦 Доставлено</button>
                      <button onClick={() => updateStatus(d.id, 'cancelled')} className="glass py-2 px-3 rounded-xl text-xs text-red-400/60 active:scale-95">Отмена</button>
                    </div>
                  )}
                  {d.status === 'delivered' && (
                    <button onClick={() => updateStatus(d.id, 'completed')} className="w-full glass py-2 rounded-xl text-xs text-emerald-400 active:scale-95">✅ Подтвердить получение</button>
                  )}
                </div>
              );
            })}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
