import React, { useState, useRef } from 'react';
import { useStore, uid, genAccNum, genIBAN } from '../lib/store';
import { ACCOUNT_TYPES, LNC_RATE_USD } from '../lib/constants';
import { haptic } from '../lib/utils';
import { generateContract } from '../lib/pdf';
import { dbCreateAccount, dbCreateNotification } from '../lib/sync';
import SignaturePad from '../components/SignaturePad';
import type { AccountType, Currency } from '../lib/store';

export default function OpenAccountScreen() {
  const { go, user, tonWallet, addAccount, addNotif } = useStore();
  const [step, setStep] = useState(1);
  const [selType, setSelType] = useState<typeof ACCOUNT_TYPES[number]|null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [agreed, setAgreed] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showSig, setShowSig] = useState(false);
  const [sigData, setSigData] = useState<string|null>(null);
  const contractRef = useRef<HTMLDivElement>(null);

  if (!user) return null;

  const handleType = (t: typeof ACCOUNT_TYPES[number]) => {
    if (t.requiresWallet && !tonWallet) { haptic('error'); go('ton-connect'); return; }
    haptic('medium'); setSelType(t);
    setForm({ name: `${user.first_name} ${user.last_name}`, phone: '', email: '' });
    setStep(2);
  };

  const handleForm = () => {
    if (!form.name || !form.phone || !form.email) { haptic('error'); return; }
    haptic('medium'); setStep(3);
  };

  const handleScroll = (e: React.UIEvent) => {
    const el = e.target as HTMLDivElement;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) setScrolled(true);
  };

  const handleSignature = (dataUrl: string) => {
    setSigData(dataUrl);
    setShowSig(false);

    if (!selType) return;
    haptic('success');

    const account = {
      id: uid(), user_id: user.telegram_id,
      type: selType.id as AccountType, name: selType.name,
      currency: selType.currency as Currency, balance: 0,
      account_number: genAccNum(), iban: genIBAN(),
      created_at: new Date().toISOString(),
      wallet_address: tonWallet || undefined,
      contract_signed: true, signature_data: dataUrl,
    };

    addAccount(account);

    // Save to Supabase
    dbCreateAccount(account).catch(err => console.warn('DB account save failed:', err));

    // Generate PDF contract with real signature
    generateContract(user, account, form.name, dataUrl);

    addNotif({
      id: uid(), title: '✅ Счёт открыт',
      message: `${selType.name} (${selType.currency}) — договор подписан и скачан`,
      type: 'system', read: false, created_at: new Date().toISOString(),
    });
    go('cards');
  };

  if (showSig) {
    return (
      <div className="h-full bg-black safe-top flex flex-col">
        <div className="px-5 pt-4 pb-2 flex items-center gap-4">
          <button onClick={() => setShowSig(false)} className="text-white/50 text-sm">← Назад</button>
          <h1 className="font-bold flex-1">Подпись договора</h1>
        </div>
        <div className="flex-1 px-5 flex items-center">
          <div className="w-full">
            <SignaturePad signerName={form.name} onSave={handleSignature} onCancel={() => setShowSig(false)} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => step > 1 ? setStep(step-1) : go('cards')} className="text-white/50 text-sm">← Назад</button>
        <h1 className="font-bold flex-1">Открытие счёта</h1>
        <span className="text-xs text-white/30 tabular-nums">{step}/3</span>
      </div>

      <div className="px-5 mb-4">
        <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full transition-all duration-500" style={{width:`${(step/3)*100}%`}} />
        </div>
      </div>

      {step === 1 && (
        <div className="flex-1 overflow-y-auto px-5 pb-8">
          <h2 className="text-xl font-bold mb-1">Выберите тип счёта</h2>
          <p className="text-sm text-white/30 mb-5">6 типов для любых задач</p>
          <div className="space-y-2.5">
            {ACCOUNT_TYPES.map(t => (
              <button key={t.id} onClick={() => handleType(t)}
                className="w-full glass rounded-2xl p-4 flex items-center gap-4 text-left active:scale-[0.98] transition-all duration-200">
                <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center text-2xl">{t.icon}</div>
                <div className="flex-1">
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-xs text-white/30 mt-0.5">{t.desc}</p>
                  <p className="text-[11px] text-white/20 mt-0.5">Валюта: {t.currency}{t.currency==='LNC'?` (1 LNC = $${LNC_RATE_USD})`:''}</p>
                </div>
                {t.requiresWallet && <span className="text-[10px] text-white/25 bg-white/[0.04] px-2 py-1 rounded-lg">🔗 TON</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex-1 overflow-y-auto px-5 pb-8 animate-fade-in">
          <h2 className="text-xl font-bold mb-5">Данные владельца</h2>
          <div className="space-y-4">
            {[
              { label: 'ФИО', key: 'name', type: 'text', ph: 'Иванов Иван Иванович' },
              { label: 'Телефон', key: 'phone', type: 'tel', ph: '+7 (999) 123-45-67' },
              { label: 'Email', key: 'email', type: 'email', ph: 'user@example.com' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-white/35 mb-1.5 block font-medium">{f.label}</label>
                <input type={f.type} value={(form as any)[f.key]}
                  onChange={e => setForm({...form, [f.key]: e.target.value})}
                  className="w-full glass rounded-xl px-4 py-3.5 bg-transparent text-white outline-none text-[15px] focus:ring-1 focus:ring-white/10 transition-all"
                  placeholder={f.ph} />
              </div>
            ))}
          </div>
          <button onClick={handleForm} disabled={!form.name||!form.phone||!form.email} className="btn-primary w-full mt-6">Продолжить</button>
        </div>
      )}

      {step === 3 && (
        <div className="flex-1 flex flex-col px-5 pb-8 overflow-hidden animate-fade-in">
          <h2 className="text-xl font-bold mb-1">Договор банковского обслуживания</h2>
          <p className="text-xs text-white/30 mb-3">Прочитайте и подпишите электронной подписью</p>

          <div ref={contractRef} onScroll={handleScroll}
            className="flex-1 glass rounded-2xl p-5 overflow-y-auto text-[13px] text-white/60 leading-relaxed mb-3">
            <p className="text-white font-bold text-base mb-3">ДОГОВОР БАНКОВСКОГО ОБСЛУЖИВАНИЯ</p>
            <p className="mb-4">между Luna Bank («Банк») и {form.name} («Клиент»)</p>

            <p className="text-white font-semibold mb-2">1. ПРЕДМЕТ ДОГОВОРА</p>
            <p className="mb-1">1.1. Банк открывает Клиенту счёт типа «{selType?.name}» в валюте {selType?.currency}.</p>
            <p className="mb-1">1.2. Валюта: {selType?.currency}{selType?.currency==='LNC'?` (курс: 1 LNC = $${LNC_RATE_USD})`:''}</p>
            <p className="mb-4">1.3. Счёт предназначен для хранения средств, переводов, оплаты услуг.</p>

            <p className="text-white font-semibold mb-2">2. ОБЯЗАННОСТИ БАНКА</p>
            <p className="mb-1">2.1. Зачислять средства не позднее 1 рабочего дня.</p>
            <p className="mb-1">2.2. Выполнять распоряжения Клиента.</p>
            <p className="mb-1">2.3. Обеспечить сохранность средств.</p>
            <p className="mb-1">2.4. Предоставлять выписки по требованию.</p>
            <p className="mb-4">2.5. Уведомлять о всех операциях.</p>

            <p className="text-white font-semibold mb-2">3. ОБЯЗАННОСТИ КЛИЕНТА</p>
            <p className="mb-1">3.1. Предоставить достоверные данные.</p>
            <p className="mb-1">3.2. Не передавать PIN-код и seed-фразы третьим лицам.</p>
            <p className="mb-1">3.3. Уведомлять об изменении данных.</p>
            <p className="mb-4">3.4. Не использовать для незаконной деятельности.</p>

            <p className="text-white font-semibold mb-2">4. ТАРИФЫ</p>
            <p className="mb-1">4.1. Обслуживание — бесплатно.</p>
            <p className="mb-1">4.2. Комиссии: Free 0.5%, Plus 0.3%, Cosmic 0%.</p>
            <p className="mb-1">4.3. Карты: виртуальная $0, премиум $4.99, пластик $19.99.</p>
            <p className="mb-4">4.4. 1 LNC = $0.05 — курс фиксированный.</p>

            <p className="text-white font-semibold mb-2">5. ОТВЕТСТВЕННОСТЬ</p>
            <p className="mb-1">5.1. Банк не отвечает за неверные реквизиты Клиента.</p>
            <p className="mb-1">5.2. Данные защищены по международным стандартам.</p>
            <p className="mb-4">5.3. Клиент отвечает за сохранность PIN-кода.</p>

            <p className="text-white font-semibold mb-2">6. СРОК ДЕЙСТВИЯ</p>
            <p className="mb-1">6.1. Договор бессрочный, с момента электронной подписи.</p>
            <p className="mb-4">6.2. Расторжение — уведомление за 30 дней.</p>

            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-white/30">Дата: {new Date().toLocaleDateString('ru-RU')}</p>
              <p className="text-white/30">Клиент: {form.name}</p>
            </div>
          </div>

          {!scrolled && <p className="text-[11px] text-white/25 text-center mb-2 animate-pulse">↓ Прокрутите договор до конца</p>}

          <label className={`flex items-center gap-3 mb-3 transition-opacity ${scrolled?'':'opacity-25 pointer-events-none'}`}>
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${agreed?'bg-white border-white':'border-white/20'}`}
              onClick={() => setAgreed(!agreed)}>
              {agreed && <span className="text-black text-xs font-bold">✓</span>}
            </div>
            <span className="text-[13px]">Я ознакомился и принимаю условия договора</span>
          </label>

          <button onClick={() => { haptic('medium'); setShowSig(true); }} disabled={!agreed}
            className="btn-primary w-full flex items-center justify-center gap-2">
            ✍️ Подписать договор
          </button>
        </div>
      )}
    </div>
  );
}
