import React, { useState } from 'react';
import { useStore, uid } from '../lib/store';
import { haptic } from '../lib/utils';
import { dbUpdateBalance, dbCreateTransaction } from '../lib/db';
import { ArrowLeftIcon, ReceiptIcon } from '../components/Icons';

const CATS = [
  { id: 'mobile', name: 'Связь', icon: '📱', services: [{ n: 'МТС', i: '📶' }, { n: 'Билайн', i: '📡' }, { n: 'МегаФон', i: '📞' }, { n: 'Tele2', i: '📲' }] },
  { id: 'gaming', name: 'Игры', icon: '🎮', services: [{ n: 'Steam', i: '🎯' }, { n: 'PlayStation', i: '🎮' }, { n: 'Xbox', i: '🟢' }, { n: 'Roblox', i: '🧱' }] },
  { id: 'utils', name: 'ЖКХ', icon: '🏠', services: [{ n: 'Электричество', i: '⚡' }, { n: 'Газ', i: '🔥' }, { n: 'Вода', i: '💧' }] },
  { id: 'internet', name: 'Интернет', icon: '🌐', services: [{ n: 'Ростелеком', i: '🏢' }, { n: 'Дом.ру', i: '🏠' }] },
];

export default function PaymentsScreen() {
  const { user, accounts, go, updateBalance, addTx, addNotif } = useStore();
  const [step, setStep] = useState<'cats' | 'services' | 'pay' | 'success'>('cats');
  const [selCat, setSelCat] = useState<typeof CATS[0] | null>(null);
  const [selSvc, setSelSvc] = useState<any>(null);
  const [account, setAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [paying, setPaying] = useState(false);
  if (!user) return null;
  const lncAcc = accounts.find(a => a.currency === 'LNC');
  const balance = lncAcc?.balance || 0;
  const val = parseFloat(amount) || 0;

  const pay = () => {
    if (!lncAcc || val <= 0 || val > balance || !account) { haptic('error'); return; }
    haptic('medium'); setPaying(true);
    setTimeout(() => {
      haptic('success');
      updateBalance(lncAcc.id, -val);
      dbUpdateBalance(lncAcc.id, -val).catch(() => {});
      addTx({ id: uid(), from_user_id: user.telegram_id, to_user_id: 0, from_account_id: lncAcc.id, to_account_id: 'payment', amount: val, fee: 0, currency: 'LNC', type: 'withdrawal', status: 'completed', note: `Оплата: ${selSvc.n}`, created_at: new Date().toISOString() });
      addNotif({ id: uid(), title: '✅ Оплачено', message: `${selSvc.n}: ◎${val}`, type: 'system', read: false, created_at: new Date().toISOString() });
      setPaying(false); setStep('success');
    }, 2000);
  };

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => { if (step === 'cats') go('home'); else if (step === 'services') setStep('cats'); else if (step === 'pay') setStep('services'); else setStep('cats'); }} className="text-white/50"><ArrowLeftIcon size={20} /></button>
        <h1 className="font-bold flex-1">Платежи</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {step === 'cats' && <div className="space-y-2.5 mt-2 animate-fade-in">{CATS.map((cat, i) => (
          <button key={cat.id} onClick={() => { haptic('light'); setSelCat(cat); setStep('services'); }}
            className="w-full glass p-4 flex items-center gap-4 active:scale-[0.98] transition-all animate-slide-up" style={{ animationDelay: `${i * 0.06}s` }}>
            <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center text-2xl">{cat.icon}</div>
            <div className="flex-1 text-left"><p className="font-bold">{cat.name}</p><p className="text-xs text-white/25">{cat.services.length} провайдеров</p></div>
            <span className="text-white/15">›</span>
          </button>
        ))}</div>}
        {step === 'services' && selCat && <div className="animate-fade-in"><p className="text-xs text-white/30 mb-3 uppercase">{selCat.name}</p><div className="space-y-2">{selCat.services.map((svc, i) => (
          <button key={svc.n} onClick={() => { haptic('light'); setSelSvc(svc); setStep('pay'); }}
            className="w-full glass p-3.5 flex items-center gap-3 active:scale-[0.98] transition-all animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center text-xl">{svc.i}</div>
            <p className="flex-1 text-left font-semibold text-sm">{svc.n}</p>
            <span className="text-white/15">›</span>
          </button>
        ))}</div></div>}
        {step === 'pay' && selSvc && <div className="animate-fade-in mt-2">
          <div className="glass-accent p-4 flex items-center gap-3 mb-5"><div className="w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center text-2xl">{selSvc.i}</div><div><p className="font-bold">{selSvc.n}</p><p className="text-xs text-white/30">{selCat?.name}</p></div></div>
          <div className="space-y-4">
            <div><p className="text-xs text-white/35 mb-1.5 font-medium">Номер / счёт</p><input type="text" value={account} onChange={e => setAccount(e.target.value)} placeholder="Введите номер" className="w-full glass px-4 py-3.5 bg-transparent text-white outline-none focus:ring-1 focus:ring-white/10" /></div>
            <div><p className="text-xs text-white/35 mb-1.5 font-medium">Сумма (LNC)</p><input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full glass px-4 py-4 bg-transparent text-white text-2xl font-extrabold mono outline-none text-center" />
              <div className="flex gap-2 mt-2">{[100, 200, 500, 1000].map(v => <button key={v} onClick={() => setAmount(String(v))} className="flex-1 glass rounded-lg py-1.5 text-xs mono active:scale-95 transition-transform">◎{v}</button>)}</div></div>
          </div>
          <button onClick={pay} disabled={paying || val <= 0 || val > balance || !account} className="btn-primary w-full mt-6">
            {paying ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />Оплата...</span> : `Оплатить ◎${val || 0}`}
          </button>
        </div>}
        {step === 'success' && <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center animate-check-pop mb-6"><ReceiptIcon size={32} color="#34d399" /></div>
          <h2 className="text-xl font-extrabold mb-2">Оплачено!</h2>
          <p className="text-white/35 text-sm mb-6">{selSvc?.n} · ◎{amount}</p>
          <button onClick={() => { setStep('cats'); setAmount(''); setAccount(''); }} className="btn-primary px-8">Новый платёж</button>
        </div>}
      </div>
    </div>
  );
}
