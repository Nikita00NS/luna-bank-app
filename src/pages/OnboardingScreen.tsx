import React, { useState } from 'react';
import { useStore, genLunaId } from '../lib/store';
import { hashPin, haptic } from '../lib/utils';
import { dbUpsertUser } from '../lib/db';
import PinPad from '../components/PinPad';
import Logo from '../components/Logo';
import AnimatedEmoji from '../components/AnimatedEmoji';

type Step = 'welcome' | 'pin-create' | 'pin-confirm';

export default function OnboardingScreen() {
  const { setUser, setAuthed, setIsNew, go } = useStore();
  const [step, setStep] = useState<Step>('welcome');
  const [firstPin, setFirstPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // Get Telegram user data (or defaults for browser testing)
  const tg = (window as any).Telegram?.WebApp;
  const tgUser = tg?.initDataUnsafe?.user;

  const userData = {
    telegram_id: tgUser?.id || Math.floor(Math.random() * 999999999),
    username: tgUser?.username || 'luna_user',
    first_name: tgUser?.first_name || 'Luna',
    last_name: tgUser?.last_name || 'User',
    photo_url: tgUser?.photo_url || '',
  };

  const handlePinCreate = (pin: string) => {
    setFirstPin(pin);
    setStep('pin-confirm');
  };

  const handlePinConfirm = async (pin: string) => {
    if (pin !== firstPin) {
      setPinError(true);
      setTimeout(() => {
        setPinError(false);
        setStep('pin-create');
        setFirstPin('');
      }, 800);
      return;
    }

    haptic('success');

    const pinHash = await hashPin(pin, String(userData.telegram_id));

    const user = {
      ...userData,
      pin_hash: pinHash,
      role: 'owner' as const,
      luna_id: genLunaId(),
      level: 1,
      xp: 0,
      kyc_status: 'none' as const,
      subscription: 'free' as const,
      created_at: new Date().toISOString(),
      display_currency: 'USD',
      biometrics_enabled: false,
    };

    // Save to local store
    setUser(user);
    setIsNew(false);
    setAuthed(true);

    // Save to Supabase (async, don't block)
    dbUpsertUser(user).catch((err) =>
      console.warn('[DB] User save failed:', err)
    );

    go('home');
  };

  // ===== PIN Create Step =====
  if (step === 'pin-create') {
    return (
      <div className="h-full bg-black">
        <PinPad
          title="Создайте PIN-код"
          subtitle="4 цифры для входа в приложение"
          onComplete={handlePinCreate}
        />
      </div>
    );
  }

  // ===== PIN Confirm Step =====
  if (step === 'pin-confirm') {
    return (
      <div className="h-full bg-black">
        <PinPad
          title="Повторите PIN-код"
          subtitle="Подтвердите ваш PIN"
          onComplete={handlePinConfirm}
          error={pinError}
        />
      </div>
    );
  }

  // ===== Welcome Step =====
  return (
    <div className="h-full flex flex-col bg-black safe-top">
      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {/* Logo with animated moon */}
        <div className="mb-4">
          <AnimatedEmoji type="moon" size={64} />
        </div>
        <div className="animate-float mb-6">
          <Logo size={96} glow />
        </div>

        {/* Title */}
        <h1 className="text-4xl font-extrabold mb-3 animate-slide-up">
          Luna Bank
        </h1>

        <p
          className="text-white/40 text-center leading-relaxed text-[15px] animate-slide-up"
          style={{ animationDelay: '0.1s' }}
        >
          Крипто-финансовая экосистема нового поколения.
          Счета, переводы, крипта — всё в Telegram.
        </p>

        {/* User card */}
        <div
          className="mt-8 glass-accent p-4 w-full max-w-sm animate-slide-up"
          style={{ animationDelay: '0.2s' }}
        >
          <div className="flex items-center gap-4">
            {userData.photo_url ? (
              <img
                src={userData.photo_url}
                alt=""
                className="w-12 h-12 rounded-full"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-xl font-bold">
                {userData.first_name[0]}
              </div>
            )}
            <div>
              <p className="font-semibold">
                {userData.first_name} {userData.last_name}
              </p>
              <p className="text-sm text-white/35">@{userData.username}</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 pb-8 safe-bottom">
        <button
          onClick={() => {
            haptic('medium');
            setStep('pin-create');
          }}
          className="btn-primary w-full text-lg py-[18px]"
        >
          Начать
        </button>
        <p className="text-center text-white/20 text-xs mt-4">
          Нажимая «Начать», вы принимаете условия использования
        </p>
      </div>
    </div>
  );
}
