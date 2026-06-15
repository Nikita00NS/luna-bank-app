import React, { useState, useRef } from 'react';
import { useStore, uid, genAccNum, genIBAN } from '../lib/store';
import { ACCOUNT_TYPES, LNC_RATE_USD } from '../lib/constants';
import { haptic } from '../lib/utils';
import { dbCreateAccount, dbCreateNotification } from '../lib/db';
import SignaturePad from '../components/SignaturePad';
import type { AccountType, Currency } from '../lib/store';

type Step = 1 | 2 | 3;

export default function OpenAccountScreen() {
  const { go, user, tonWallet, addAccount, addNotif } = useStore();

  const [step, setStep] = useState<Step>(1);
  const [selectedType, setSelectedType] = useState<(typeof ACCOUNT_TYPES)[number] | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
  const [agreed, setAgreed] = useState(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [showSignature, setShowSignature] = useState(false);

  if (!user) return null;

  // ===== Step 1: Select Type =====
  const handleSelectType = (type: (typeof ACCOUNT_TYPES)[number]) => {
    if (type.requiresWallet && !tonWallet) {
      haptic('error');
      go('ton-connect');
      return;
    }
    haptic('medium');
    setSelectedType(type);
    setFormData({
      name: `${user.first_name} ${user.last_name}`,
      phone: '',
      email: '',
    });
    setStep(2);
  };

  // ===== Step 2: Submit Form =====
  const handleFormSubmit = () => {
    if (!formData.name || !formData.phone || !formData.email) {
      haptic('error');
      return;
    }
    haptic('medium');
    setStep(3);
  };

  // ===== Step 3: Contract scroll =====
  const handleContractScroll = (e: React.UIEvent) => {
    const el = e.target as HTMLDivElement;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
      setScrolledToEnd(true);
    }
  };

  // ===== Signature completion =====
  const handleSignature = (dataUrl: string) => {
    if (!selectedType) return;
    haptic('success');
    setShowSignature(false);

    const account = {
      id: uid(),
      user_id: user.telegram_id,
      type: selectedType.id as AccountType,
      name: selectedType.name,
      currency: selectedType.currency as Currency,
      balance: 0,
      account_number: genAccNum(),
      iban: genIBAN(),
      created_at: new Date().toISOString(),
      wallet_address: tonWallet || undefined,
      contract_signed: true,
      signature_data: dataUrl,
    };

    // Save locally
    addAccount(account);

    // Save to Supabase
    dbCreateAccount(account).catch((err) =>
      console.warn('[DB] Account save failed:', err)
    );

    // Notification
    const notifData = {
      id: uid(),
      title: '✅ Счёт открыт',
      message: `${selectedType.name} (${selectedType.currency}) — договор подписан`,
      type: 'system' as const,
      read: false,
      created_at: new Date().toISOString(),
    };
    addNotif(notifData);
    dbCreateNotification({
      user_id: user.telegram_id,
      title: notifData.title,
      message: notifData.message,
      type: notifData.type,
    }).catch(() => {});

    go('cards');
  };

  // ===== Signature Mode =====
  if (showSignature) {
    return (
      <div className="h-full bg-black safe-top flex flex-col">
        <div className="px-5 pt-4 pb-2 flex items-center gap-4">
          <button
            onClick={() => setShowSignature(false)}
            className="text-white/50 text-sm"
          >
            ← Назад
          </button>
          <h1 className="font-bold flex-1">Подпись договора</h1>
        </div>
        <div className="flex-1 px-5 flex items-center">
          <div className="w-full">
            <SignaturePad
              signerName={formData.name}
              onSave={handleSignature}
              onCancel={() => setShowSignature(false)}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      {/* Header */}
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button
          onClick={() => (step > 1 ? setStep((step - 1) as Step) : go('cards'))}
          className="text-white/50 text-sm"
        >
          ← Назад
        </button>
        <h1 className="font-bold flex-1">Открытие счёта</h1>
        <span className="text-xs text-white/30 mono">{step}/3</span>
      </div>

      {/* Progress bar */}
      <div className="px-5 mb-4">
        <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full transition-all duration-500"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* ===== STEP 1: Choose Type ===== */}
      {step === 1 && (
        <div className="flex-1 overflow-y-auto px-5 pb-8">
          <h2 className="text-xl font-bold mb-1">Выберите тип счёта</h2>
          <p className="text-sm text-white/30 mb-5">6 типов для любых задач</p>

          <div className="space-y-2.5">
            {ACCOUNT_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => handleSelectType(type)}
                className="
                  w-full glass p-4 flex items-center gap-4 text-left
                  active:scale-[0.98] transition-all duration-200
                "
              >
                <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center text-2xl">
                  {type.icon}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{type.name}</p>
                  <p className="text-xs text-white/30 mt-0.5">{type.desc}</p>
                  <p className="text-[11px] text-white/20 mt-0.5">
                    Валюта: {type.currency}
                    {type.currency === 'LNC' ? ` (1 LNC = $${LNC_RATE_USD})` : ''}
                  </p>
                </div>
                {type.requiresWallet && (
                  <span className="text-[10px] text-white/25 bg-white/[0.04] px-2 py-1 rounded-lg">
                    🔗 TON
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ===== STEP 2: Form ===== */}
      {step === 2 && (
        <div className="flex-1 overflow-y-auto px-5 pb-8 animate-fade-in">
          <h2 className="text-xl font-bold mb-5">Данные владельца</h2>

          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="text-xs text-white/35 mb-1.5 block font-medium">
                ФИО
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="
                  w-full glass px-4 py-3.5 bg-transparent text-white outline-none
                  text-[15px] focus:ring-1 focus:ring-white/10 transition-all
                "
                placeholder="Иванов Иван Иванович"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="text-xs text-white/35 mb-1.5 block font-medium">
                Телефон
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="
                  w-full glass px-4 py-3.5 bg-transparent text-white outline-none
                  text-[15px] focus:ring-1 focus:ring-white/10 transition-all
                "
                placeholder="+7 (999) 123-45-67"
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-xs text-white/35 mb-1.5 block font-medium">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="
                  w-full glass px-4 py-3.5 bg-transparent text-white outline-none
                  text-[15px] focus:ring-1 focus:ring-white/10 transition-all
                "
                placeholder="user@example.com"
              />
            </div>
          </div>

          <button
            onClick={handleFormSubmit}
            disabled={!formData.name || !formData.phone || !formData.email}
            className="btn-primary w-full mt-6"
          >
            Продолжить
          </button>
        </div>
      )}

      {/* ===== STEP 3: Contract ===== */}
      {step === 3 && (
        <div className="flex-1 flex flex-col px-5 pb-8 overflow-hidden animate-fade-in">
          <h2 className="text-xl font-bold mb-1">
            Договор банковского обслуживания
          </h2>
          <p className="text-xs text-white/30 mb-3">
            Прочитайте и подпишите электронной подписью
          </p>

          {/* Contract text */}
          <div
            onScroll={handleContractScroll}
            className="
              flex-1 glass p-5 overflow-y-auto
              text-[13px] text-white/60 leading-relaxed mb-3
            "
          >
            <p className="text-white font-bold text-base mb-3">
              ДОГОВОР БАНКОВСКОГО ОБСЛУЖИВАНИЯ
            </p>
            <p className="mb-4">
              между Luna Bank («Банк») и {formData.name} («Клиент»)
            </p>

            <p className="text-white font-semibold mb-2">1. ПРЕДМЕТ ДОГОВОРА</p>
            <p className="mb-1">
              1.1. Банк открывает Клиенту счёт «{selectedType?.name}» в валюте{' '}
              {selectedType?.currency}.
            </p>
            <p className="mb-4">
              1.2. Валюта: {selectedType?.currency}
              {selectedType?.currency === 'LNC'
                ? ` (курс: 1 LNC = $${LNC_RATE_USD})`
                : ''}
            </p>

            <p className="text-white font-semibold mb-2">2. ОБЯЗАННОСТИ БАНКА</p>
            <p className="mb-1">2.1. Зачислять средства не позднее 1 рабочего дня.</p>
            <p className="mb-1">2.2. Выполнять распоряжения Клиента.</p>
            <p className="mb-1">2.3. Обеспечить сохранность средств.</p>
            <p className="mb-4">2.4. Предоставлять выписки по требованию.</p>

            <p className="text-white font-semibold mb-2">3. ОБЯЗАННОСТИ КЛИЕНТА</p>
            <p className="mb-1">3.1. Предоставить достоверные данные.</p>
            <p className="mb-1">3.2. Не передавать PIN-код третьим лицам.</p>
            <p className="mb-4">3.3. Уведомлять об изменении данных.</p>

            <p className="text-white font-semibold mb-2">4. ТАРИФЫ</p>
            <p className="mb-1">4.1. Обслуживание — бесплатно.</p>
            <p className="mb-1">4.2. Комиссии: Free 0.5%, Plus 0.3%, Cosmic 0%.</p>
            <p className="mb-4">
              4.3. 1 LNC = ${LNC_RATE_USD} — курс фиксированный.
            </p>

            <p className="text-white font-semibold mb-2">5. СРОК ДЕЙСТВИЯ</p>
            <p className="mb-1">5.1. Договор бессрочный.</p>
            <p className="mb-4">5.2. Расторжение — уведомление за 30 дней.</p>

            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-white/30">
                Дата: {new Date().toLocaleDateString('ru-RU')}
              </p>
              <p className="text-white/30">Клиент: {formData.name}</p>
            </div>
          </div>

          {/* Scroll hint */}
          {!scrolledToEnd && (
            <p className="text-[11px] text-white/25 text-center mb-2 animate-pulse">
              ↓ Прокрутите договор до конца
            </p>
          )}

          {/* Checkbox */}
          <label
            className={`
              flex items-center gap-3 mb-3 transition-opacity
              ${scrolledToEnd ? '' : 'opacity-25 pointer-events-none'}
            `}
          >
            <div
              className={`
                w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all
                ${agreed ? 'bg-white border-white' : 'border-white/20'}
              `}
              onClick={() => setAgreed(!agreed)}
            >
              {agreed && (
                <span className="text-black text-xs font-bold">✓</span>
              )}
            </div>
            <span className="text-[13px]">
              Я ознакомился и принимаю условия договора
            </span>
          </label>

          {/* Sign button */}
          <button
            onClick={() => {
              haptic('medium');
              setShowSignature(true);
            }}
            disabled={!agreed}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            ✍️ Подписать договор
          </button>
        </div>
      )}
    </div>
  );
}
