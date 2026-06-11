import React, { useState } from 'react';
import { useStore, uid } from '../lib/store';
import { haptic } from '../lib/utils';
import { dbUpdateBalance, dbCreateTransaction, dbCreateNotification } from '../lib/sync';

const CATEGORIES = [
  { id: 'mobile', name: 'Мобильная связь', icon: '📱', services: [
    { id: 'm1', name: 'МТС', icon: '📶', min: 10 },
    { id: 'm2', name: 'Билайн', icon: '📡', min: 10 },
    { id: 'm3', name: 'МегаФон', icon: '📞', min: 10 },
    { id: 'm4', name: 'Tele2', icon: '📲', min: 10 },
    { id: 'm5', name: 'Yota', icon: '🌐', min: 10 },
  ]},
  { id: 'internet', name: 'Интернет', icon: '🌐', services: [
    { id: 'i1', name: 'Ростелеком', icon: '🏢', min: 100 },
    { id: 'i2', name: 'Дом.ру', icon: '🏠', min: 100 },
    { id: 'i3', name: 'ТТК', icon: '🔌', min: 100 },
  ]},
  { id: 'gaming', name: 'Игры', icon: '🎮', services: [
    { id: 'g1', name: 'Steam', icon: '🎯', min: 50 },
    { id: 'g2', name: 'PlayStation', icon: '🎮', min: 100 },
    { id: 'g3', name: 'Xbox', icon: '🟢', min: 100 },
    { id: 'g4', name: 'Roblox', icon: '🧱', min: 50 },
    { id: 'g5', name: 'Minecraft', icon: '⛏️', min: 50 },
  ]},
  { id: 'utils', name: 'ЖКХ', icon: '🏠', services: [
    { id: 'u1', name: 'Электричество', icon: '⚡', min: 100 },
    { id: 'u2', name: 'Газ', icon: '🔥', min: 100 },
    { id: 'u3', name: 'Вода', icon: '💧', min: 100 },
    { id: 'u4', name: 'Отопление', icon: '🌡️', min: 200 },
  ]},
  { id: 'travel', name: 'Путешествия', icon: '✈️', services: [
    { id: 't1', name: 'Авиабилеты', icon: '✈️', min: 500 },
    { id: 't2', name: 'Отели', icon: '🏨', min: 300 },
    { id: 't3', name: 'Ж/Д билеты', icon: '🚆', min: 200 },
  ]},
];

export default function PaymentsScreen() {
  const { user, accounts, go, updateBalance, addTx, addNotif } = useStore();
  const [step, setStep] = useState<'cats' | 'services' | 'pay' | 'success'>('cats');
  const [selCat, setSelCat] = useState<typeof CATEGORIES[0] | null>(null);
  const [selService, setSelService] = useState<any>(null);
  const [account, setAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [paying, setPaying] = useState(false);

  if (!user) return null;
  const lncAcc = accounts.find(a => a.currency === 'LNC');
  const balance = lncAcc?.balance || 0;
  const val = parseFloat(amount) || 0;

  const pay = () => {
    if (!lncAcc || val <= 0 || val > balance || !account) { haptic('error'); return; }
    haptic('medium');
    setPaying(true);
    setTimeout(() => {
      haptic('success');
      updateBalance(lncAcc.id, -val);
      dbUpdateBalance(lncAcc.id, -val).catch(() => {});
      addTx({ id: uid(), from_user_id: user.telegram_id, to_user_id: 0, from_account_id: lncAcc.id, to_account_id: 'payment', amount: val, fee: 0, currency: 'LNC', type: 'withdrawal', status: 'completed', note: `Оплата: ${selService.name} (${account})`, created_at: new Date().toISOString() });
      addNotif({ id: uid(), title: '✅ Оплачено', message: `${selService.name}: ◎${val} LNC`, type: 'system', read: false, created_at: new Date().toISOString() });
      setPaying(false);
      setStep('success');
    }, 2000);
  };

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => { if (step === 'cats') go('home'); else if (step === 'services') setStep('cats'); else if (step === 'pay') setStep('services'); else setStep('cats'); }}
          className="text-white/50 text-sm">← Назад</button>
        <h1 className="font-bold flex-1">🧾 Платежи</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {step === 'cats' && (
          <div className="space-y-2.5 mt-2 animate-fade-in">
            <p className="text-xs text-white/30 font-medium uppercase mb-1">Категории</p>
            {CATEGORIES.map((cat, i) => (
              <button key={cat.id} onClick={() => { haptic('light'); setSelCat(cat); setStep('services'); }}
                className="w-full glass rounded-2xl p-4 flex items-center gap-4 active:scale-[0.98] transition-all animate-slide-up"
                style={{ animationDelay: `${i * 0.06}s` }}>
                <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center text-2xl">{cat.icon}</div>
                <div className="flex-1 text-left">
                  <p className="font-bold">{cat.name}</p>
                  <p className="text-xs text-white/25">{cat.services.length} провайдеров</p>
                </div>
                <span className="text-white/15">›</span>
              </button>
            ))}
          </div>
        )}

        {step === 'services' && selCat && (
          <div className="animate-fade-in">
            <p className="text-xs text-white/30 font-medium uppercase mb-3">{selCat.name}</p>
            <div className="space-y-2">
              {selCat.services.map((svc, i) => (
                <button key={svc.id} onClick={() => { haptic('light'); setSelService(svc); setStep('pay'); }}
                  className="w-full glass rounded-xl p-3.5 flex items-center gap-3 active:scale-[0.98] transition-all animate-slide-up"
                  style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center text-xl">{svc.icon}</div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-sm">{svc.name}</p>
                    <p className="text-[11px] text-white/20">Мин: ◎{svc.min} LNC</p>
                  </div>
                  <span className="text-white/15">›</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'pay' && selService && (
          <div className="animate-fade-in mt-2">
            <div className="glass-accent rounded-2xl p-4 flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center text-2xl">{selService.icon}</div>
              <div><p className="font-bold">{selService.name}</p><p className="text-xs text-white/30">{selCat?.name}</p></div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-white/35 mb-1.5 font-medium">Номер счёта / телефон</p>
                <input type="text" value={account} onChange={e => setAccount(e.target.value)} placeholder="Введите номер"
                  className="w-full glass rounded-xl px-4 py-3.5 bg-transparent text-white outline-none" />
              </div>
              <div>
                <p className="text-xs text-white/35 mb-1.5 font-medium">Сумма (LNC)</p>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder={`Мин: ◎${selService.min}`}
                  className="w-full glass rounded-xl px-4 py-4 bg-transparent text-white text-2xl font-extrabold tabular-nums outline-none text-center" />
                <div className="flex gap-2 mt-2">
                  {[100, 200, 500, 1000].map(v => (
                    <button key={v} onClick={() => setAmount(String(v))} className="flex-1 glass rounded-lg py-1.5 text-xs tabular-nums active:scale-95 transition-transform">◎{v}</button>
                  ))}
                </div>
              </div>
              <div className="glass rounded-xl p-3 flex justify-between text-sm">
                <span className="text-white/35">Баланс</span>
                <span className={`tabular-nums font-bold ${balance >= val && val > 0 ? 'text-emerald-400' : 'text-white/50'}`}>◎{balance.toFixed(2)}</span>
              </div>
            </div>

            <button onClick={pay} disabled={paying || val < (selService.min || 1) || val > balance || !account}
              className="btn-primary w-full mt-6">
              {paying ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />Оплата...</span>
                : `Оплатить ◎${val || 0}`}
            </button>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center animate-check-pop mb-6"><span className="text-4xl">✅</span></div>
            <h2 className="text-xl font-extrabold mb-2">Оплачено!</h2>
            <p className="text-white/35 text-sm mb-1">{selService?.name}</p>
            <p className="text-white/25 text-xs mb-6">◎{amount} LNC · {account}</p>
            <button onClick={() => { setStep('cats'); setAmount(''); setAccount(''); }} className="btn-primary px-8">Новый платёж</button>
          </div>
        )}
      </div>
    </div>
  );
}
