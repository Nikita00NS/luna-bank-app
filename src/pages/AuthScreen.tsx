import React, { useState, useEffect } from 'react';
import { useStore, uid, genLunaId } from '../lib/store';
import { haptic, hashPin } from '../lib/utils';
import { dbUpsertUser, syncFromDB } from '../lib/db';
import { requestContact, formatPhone, isTelegramEnv } from '../lib/telegram';
import Logo from '../components/Logo';
import AnimatedEmoji from '../components/AnimatedEmoji';
import PinPad from '../components/PinPad';

type Step = 'welcome' | 'telegram-login' | 'phone-login' | 'otp-verify' | 'pin-create' | 'pin-confirm' | 'link-accounts' | 'ready';

export default function AuthScreen() {
  const { setUser, setAuthed, setIsNew, go } = useStore();
  const [step, setStep] = useState<Step>('welcome');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [tgUser, setTgUser] = useState<any>(null);
  const [linkedAccounts, setLinkedAccounts] = useState<string[]>([]);

  // Check if in Telegram environment
  const inTelegram = isTelegramEnv();
  const tg = (window as any).Telegram?.WebApp;
  const tgUserData = tg?.initDataUnsafe?.user;

  // Auto-detect Telegram user
  useEffect(() => {
    if (tgUserData) {
      setTgUser(tgUserData);
      setLinkedAccounts(prev => prev.includes('telegram') ? prev : [...prev, 'telegram']);
    }
  }, []);

  // ===== Telegram Login =====
  const loginWithTelegram = () => {
    haptic('medium');
    if (tgUserData) {
      setTgUser(tgUserData);
      setLinkedAccounts(prev => [...prev, 'telegram']);
      setStep('pin-create');
    } else {
      // Not in Telegram — redirect to bot
      window.open('https://t.me/LunaBankBot', '_blank');
    }
  };

  // ===== Phone Login =====
  const sendOTP = async () => {
    if (phone.length < 10) { haptic('error'); return; }
    setOtpSending(true);
    setOtpError('');
    try {
      const digits = phone.replace(/\D/g, '');
      // We use our bot to send OTP instead of SMS (free!)
      const resp = await fetch('https://luna-bank-app.vercel.app/api/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', chat_id: tgUserData?.id || 0, phone: digits }),
      });
      const data = await resp.json();
      if (data.ok) {
        haptic('success');
        setStep('otp-verify');
      } else {
        setOtpError('Не удалось отправить код. Войдите через Telegram.');
      }
    } catch {
      setOtpError('Ошибка сети');
    }
    setOtpSending(false);
  };

  const verifyOTP = async () => {
    if (otpCode.length !== 6) { haptic('error'); return; }
    try {
      const resp = await fetch('https://luna-bank-app.vercel.app/api/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', chat_id: tgUserData?.id || 0, code: otpCode }),
      });
      const data = await resp.json();
      if (data.ok && data.verified) {
        haptic('success');
        setLinkedAccounts(prev => [...prev, 'phone']);
        setStep('pin-create');
      } else {
        haptic('error');
        setOtpError(data.error || 'Неверный код');
      }
    } catch {
      setOtpError('Ошибка сети');
    }
  };

  // ===== PIN =====
  const handlePinCreate = (pin: string) => {
    setFirstPin(pin);
    setStep('pin-confirm');
  };

  const handlePinConfirm = async (pin: string) => {
    if (pin !== firstPin) {
      setPinError(true);
      setTimeout(() => { setPinError(false); setStep('pin-create'); setFirstPin(''); }, 800);
      return;
    }
    haptic('success');

    const pinHash = await hashPin(pin, String(tgUser?.id || Date.now()));
    const userData = {
      telegram_id: tgUser?.id || Math.floor(Math.random() * 999999999),
      username: tgUser?.username || 'user_' + Date.now(),
      first_name: tgUser?.first_name || 'User',
      last_name: tgUser?.last_name || '',
      photo_url: tgUser?.photo_url || '',
      pin_hash: pinHash,
      role: 'user' as const,
      luna_id: genLunaId(),
      level: 1,
      xp: 0,
      kyc_status: 'none' as const,
      subscription: 'free' as const,
      created_at: new Date().toISOString(),
      display_currency: 'USD',
      biometrics_enabled: false,
      phone_number: phone || undefined,
    };

    setUser(userData);
    setIsNew(false);
    setAuthed(true);
    dbUpsertUser(userData).catch(() => {});
    syncFromDB(userData.telegram_id).catch(() => {});
    go('home');
  };

  // ===== Request phone from Telegram =====
  const requestPhoneFromTG = async () => {
    haptic('medium');
    const contact = await requestContact();
    if (contact) {
      setPhone(contact.phone_number);
      setLinkedAccounts(prev => [...prev, 'phone']);
      haptic('success');
    }
  };

  // ===== WELCOME =====
  if (step === 'welcome') {
    return (
      <div className="h-full flex flex-col bg-black safe-top">
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <AnimatedEmoji type="moon" size={80} />
          <div className="mt-4 mb-3">
            <Logo size={72} glow />
          </div>
          <h1 className="text-3xl font-extrabold">Luna Bank</h1>
          <p className="text-white/40 text-sm mt-2 text-center max-w-[280px]">
            Крипто-финансовая экосистема. Управляйте кошельками, переводите крипту, торгуйте.
          </p>
        </div>

        <div className="px-6 pb-8 safe-bottom space-y-3">
          {/* Telegram Login — primary */}
          <button onClick={loginWithTelegram}
            className="w-full py-4 rounded-2xl font-bold text-base bg-[#2AABEE] text-white flex items-center justify-center gap-3 active:scale-[0.97] transition-transform">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
            Войти через Telegram
          </button>

          {/* Phone Login — secondary */}
          <button onClick={() => setStep('phone-login')}
            className="w-full py-4 rounded-2xl font-bold text-base glass text-white flex items-center justify-center gap-3 active:scale-[0.97] transition-transform">
            📱 Войти по номеру телефона
          </button>

          <p className="text-center text-white/15 text-xs mt-4">
            Нажимая «Войти», вы принимаете условия использования
          </p>
        </div>
      </div>
    );
  }

  // ===== PHONE LOGIN =====
  if (step === 'phone-login') {
    return (
      <div className="h-full flex flex-col bg-black safe-top">
        <div className="px-5 pt-4 pb-2 flex items-center gap-4">
          <button onClick={() => setStep('welcome')} className="text-white/50 text-sm">← Назад</button>
          <h1 className="font-bold flex-1">Вход по телефону</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <AnimatedEmoji type="lock" size={56} />
          <h2 className="text-xl font-bold mt-4 mb-2">Введите номер</h2>
          <p className="text-white/35 text-sm text-center mb-6">Отправим код подтверждения в Telegram</p>

          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder="+7 (999) 123-45-67"
            className="w-full glass px-4 py-4 bg-transparent text-white text-xl mono outline-none text-center rounded-2xl mb-4" autoFocus />

          {inTelegram && (
            <button onClick={requestPhoneFromTG}
              className="glass px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 mb-4 active:scale-95">
              📲 Получить из Telegram
            </button>
          )}

          {otpError && <p className="text-red-400 text-xs mb-3">{otpError}</p>}

          <button onClick={sendOTP} disabled={phone.length < 10 || otpSending}
            className="btn-primary w-full">
            {otpSending ? 'Отправка...' : 'Получить код'}
          </button>
        </div>
      </div>
    );
  }

  // ===== OTP VERIFY =====
  if (step === 'otp-verify') {
    return (
      <div className="h-full flex flex-col bg-black safe-top">
        <div className="px-5 pt-4 pb-2 flex items-center gap-4">
          <button onClick={() => setStep('phone-login')} className="text-white/50 text-sm">← Назад</button>
          <h1 className="font-bold flex-1">Подтверждение</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <AnimatedEmoji type="bell" size={48} />
          <h2 className="text-xl font-bold mt-4 mb-2">Введите код</h2>
          <p className="text-white/35 text-sm text-center mb-6">Код отправлен в Telegram бот</p>

          <input type="text" value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000" maxLength={6}
            className="w-full glass px-4 py-4 bg-transparent text-white text-3xl mono outline-none text-center rounded-2xl tracking-[0.5em] mb-4" autoFocus />

          {otpError && <p className="text-red-400 text-xs mb-3">{otpError}</p>}

          <button onClick={verifyOTP} disabled={otpCode.length !== 6}
            className="btn-primary w-full">
            Подтвердить
          </button>

          <button onClick={sendOTP} className="text-white/30 text-xs mt-4 active:scale-95">
            Отправить код повторно
          </button>
        </div>
      </div>
    );
  }

  // ===== PIN CREATE =====
  if (step === 'pin-create') {
    return (
      <div className="h-full bg-black">
        <PinPad title="Создайте PIN-код" subtitle="4 цифры для входа" onComplete={handlePinCreate} />
      </div>
    );
  }

  // ===== PIN CONFIRM =====
  if (step === 'pin-confirm') {
    return (
      <div className="h-full bg-black">
        <PinPad title="Повторите PIN-код" subtitle="Подтвердите ваш PIN" onComplete={handlePinConfirm} error={pinError} />
      </div>
    );
  }

  return null;
}
