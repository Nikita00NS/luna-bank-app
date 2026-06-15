import React, { useState } from 'react';
import { useStore, uid } from '../lib/store';
import { haptic } from '../lib/utils';
import { dbUpdateBalance, dbCreateTransaction } from '../lib/db';
import { ArrowLeftIcon, ReceiptIcon } from '../components/Icons';
import AnimatedEmoji from '../components/AnimatedEmoji';
import { notifyCustom } from '../lib/bot';

const CATS = [
  { id: 'mobile', name: 'Связь', icon: '📱', services: [{ n: 'МТС', i: '📶' }, { n: 'Билайн', i: '📡' }, { n: 'МегаФон', i: '📞' }, { n: 'Tele2', i: '📲' }] },
  { id: 'gaming', name: 'Игры', icon: '🎮', services: [{ n: 'Steam', i: '🎯' }, { n: 'PlayStation', i: '🎮' }, { n: 'Xbox', i: '🟢' }, { n: 'Roblox', i: '🧱' }] },
  { id: 'utils', name: 'ЖКХ', icon: '🏠', services: [{ n: 'Электричество', i: '⚡' }, { n: 'Газ', i: '🔥' }, { n: 'Вода', i: '💧' }] },
  { id: 'internet', name: 'Интернет', icon: '🌐', services: [{ n: 'Ростелеком', i: '🏢' }, { n: 'Дом.ру', i: '🏠' }] },
];

type Step = 'cats' | 'services' | 'pay' | 'confirm' | 'success';

export default function PaymentsScreen() {
  const { user, accounts, go, updateBalance, addTx, addNotif } = useStore();
  const [step, setStep] = useState<Step>('cats');
  const [selCat, setSelCat] = useState<typeof CATS[0] | null>(null);
  const [selSvc, setSelSvc] = useState<any>(null);
  const [account, setAccount] = useState('');
  const [amount, setAmount] = useState('');
  if (!user) return null;
  const lncAcc = accounts.find(a => a.currency === 'LNC');
  const balance = lncAcc?.balance || 0;
  const val = parseFloat(amount) || 0;

  const goBack = () => {
    if (step === 'cats') go('home');
    else if (step === 'services') setStep('cats');
    else if (step === 'pay') setStep('services');
    else if (step === 'confirm') setStep('pay');
    else setStep('cats');
  };

  const confirmPay = () => {
    if (!lncAcc || val <= 0 || val > balance || !account) { haptic('error'); return; }
    haptic('medium');
    setStep('confirm');
  };

  const executePay = () => {
    if (!lncAcc || val <= 0) return;
    haptic('success');
    updateBalance(lncAcc.id, -val);
    dbUpdateBalance(lncAcc.id, -val).catch(() => {});
    const txData = { id: uid(), from_user_id: user.telegram_id, to_user_id: 0, from_account_id: lncAcc.id, to_account_id: 'payment', amount: val, fee: 0, currency: 'LNC' as const, type: 'withdrawal' as const, status: 'completed' as const, note: `Оплата: ${selSvc.n} (${account})`, created_at: new Date().toISOString() };
    addTx(txData);
    dbCreateTransaction(txData).catch(() => {});
    addNotif({ id: uid(), title: '✅ Оплачено', message: `${selSvc.n}: ◎${val}`, type: 'system', read: false, created_at: new Date().toISOString() });
    notifyCustom(user.telegram_id, `✅ *Оплата выполнена*\n${selSvc.n}: ◎${val} LNC\nСчёт: ${account}`).catch(() => {});
    setStep('success');
  };

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={goBack} className="text-white/50"><ArrowLeftIcon size={20} /></button>
        <h1 className="font-bold flex-1">Платежи</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {step === 'cats' && <div className="space-y-2.5 mt-2 animate-fade-in">{CATS.map((cat, i) => (
          <button key={cat.id} onClick={() => { haptic('light'); setSelCat(cat); setStep('services'); }}
            className="w-full glass p-4 flex items-center gap-4 active:scale-[0.98] transition-all rounded-2xl animate-slide-up" style={{ animationDelay: `${i * 0.06}s` }}>
            <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center text-2xl">{cat.icon}</div>
            <div className="flex-1 text-left"><p className="font-bold">{cat.name}</p><p className="text-xs text-white/25">{cat.services.length} провайдеров</p></div>
            <span className="text-white/15">›</span>
          </button>
        ))}</div>}

        {step === 'services' && selCat && <div className="animate-fade-in"><p className="text-xs text-white/30 mb-3 uppercase">{selCat.name}</p><div className="space-y-2">{selCat.services.map((svc, i) => (
          <button key={svc.n} onClick={() => { haptic('light'); setSelSvc(svc); setStep('pay'); }}
            className="w-full glass p-3.5 flex items-center gap-3 active:scale-[0.98] transition-all rounded-xl animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center text-xl">{svc.i}</div>
            <p className="flex-1 text-left font-semibold text-sm">{svc.n}</p>
            <span className="text-white/15">›</span>
          </button>
        ))}</div></div>}

        {step === 'pay' && selSvc && <div className="animate-fade-in mt-2">
          <div className="glass-accent p-4 flex items-center gap-3 mb-5 rounded-2xl"><div className="w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center text-2xl">{selSvc.i}</div><div><p className="font-bold">{selSvc.n}</p><p className="text-xs text-white/30">{selCat?.name}</p></div></div>
          <div className="space-y-4">
            <div><p className="text-xs text-white/35 mb-1.5">Номер / лицевой счёт</p><input type="text" value={account} onChange={e => setAccount(e.target.value)} placeholder="Введите номер" className="w-full glass px-4 py-3.5 bg-transparent text-white outline-none rounded-xl" /></div>
            <div><p className="text-xs text-white/35 mb-1.5">Сумма (LNC)</p><input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full glass px-4 py-4 bg-transparent text-white text-2xl font-extrabold mono outline-none text-center rounded-xl" />
              <div className="flex gap-2 mt-2">{[100, 200, 500, 1000].map(v => <button key={v} onClick={() => setAmount(String(v))} className={`flex-1 glass rounded-lg py-1.5 text-xs mono active:scale-95 ${amount === String(v) ? 'ring-1 ring-white/20' : ''}`}>◎{v}</button>)}</div></div>
          </div>
          <button onClick={confirmPay} disabled={val <= 0 || val > balance || !account} className="btn-primary w-full mt-6">
            Продолжить →
          </button>
        </div>}

        {step === 'confirm' && selSvc && (
          <div className="animate-fade-in mt-2">
            <div className="glass p-5 space-y-3 rounded-2xl mb-6">
              <div className="text-center mb-3">
                <AnimatedEmoji type="coin" size={48} />
                <h3 className="font-bold text-lg mt-2">Подтверждение оплаты</h3>
              </div>
              {[
                [`${selSvc.i} Услуга`, selSvc.n],
                ['📁 Категория', selCat?.name || ''],
                ['📝 Счёт/номер', account],
                ['💰 Сумма', `◎${val.toFixed(2)} LNC`],
                ['💳 Со счёта', lncAcc ? `◎${lncAcc.balance.toFixed(2)}` : '—'],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between py-1.5 border-b border-white/[0.04] last:border-0 last:font-bold">
                  <span className="text-white/35 text-sm">{l}</span>
                  <span className="text-sm mono">{v}</span>
                </div>
              ))}
            </div>
            <button onClick={executePay} className="btn-primary w-full">✅ Оплатить ◎{val.toFixed(2)}</button>
            <button onClick={() => setStep('pay')} className="btn-ghost w-full mt-2">← Изменить</button>
          </div>
        )}

        {step === 'success' && <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
          <AnimatedEmoji type="success" size={72} loop={false} />
          <h2 className="text-xl font-extrabold mt-4 mb-2">Оплачено!</h2>
          <p className="text-white/35 text-sm mb-6">{selSvc?.n} · ◎{amount}</p>
          <button onClick={() => { setStep('cats'); setAmount(''); setAccount(''); }} className="btn-primary px-8">Новый платёж</button>
          <button onClick={() => go('home')} className="btn-ghost mt-2">На главную</button>
        </div>}
      </div>
    </div>
  );
}
