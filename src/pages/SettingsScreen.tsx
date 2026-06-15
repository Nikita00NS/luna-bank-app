import React, { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { haptic, hashPin } from '../lib/utils';
import { dbUpdateUser } from '../lib/db';
import PinPad from '../components/PinPad';
import AnimatedEmoji from '../components/AnimatedEmoji';
import { ArrowLeftIcon, LockIcon } from '../components/Icons';
import {
  checkBiometricsAvailability,
  registerBiometrics,
  clearCredential,
  hasStoredCredential,
} from '../lib/webauthn';

type PinStep = 'current' | 'new1' | 'new2';

export default function SettingsScreen() {
  const { user, go, patchUser } = useStore();
  const [changingPin, setChangingPin] = useState(false);
  const [pinStep, setPinStep] = useState<PinStep>('current');
  const [newPin, setNewPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // Biometrics state
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioType, setBioType] = useState<'webauthn' | 'telegram' | 'none'>('none');
  const [bioLabel, setBioLabel] = useState('Биометрия');
  const [bioRegistering, setBioRegistering] = useState(false);
  const [bioMessage, setBioMessage] = useState('');

  if (!user) return null;

  // Check biometrics availability on mount
  useEffect(() => {
    checkBiometricsAvailability().then((result) => {
      setBioAvailable(result.available);
      setBioType(result.type);
      setBioLabel(result.label);
    });
  }, []);

  // ===== PIN Change Handlers =====
  const handleCurrentPin = async (pin: string) => {
    const hash = await hashPin(pin, String(user.telegram_id));
    if (hash === user.pin_hash) {
      haptic('success');
      setPinStep('new1');
    } else {
      setPinError(true);
      setTimeout(() => setPinError(false), 600);
    }
  };

  const handleNewPin1 = (pin: string) => {
    setNewPin(pin);
    setPinStep('new2');
  };

  const handleNewPin2 = async (pin: string) => {
    if (pin !== newPin) {
      setPinError(true);
      setTimeout(() => {
        setPinError(false);
        setPinStep('new1');
        setNewPin('');
      }, 1000);
      return;
    }

    haptic('success');
    const hash = await hashPin(pin, String(user.telegram_id));
    patchUser({ pin_hash: hash });
    dbUpdateUser(user.telegram_id, { pin_hash: hash }).catch(() => {});
    setChangingPin(false);
    setPinStep('current');
  };

  // ===== Biometrics Toggle =====
  const toggleBiometrics = async () => {
    if (!bioAvailable) {
      haptic('error');
      setBioMessage('Биометрия не поддерживается на этом устройстве');
      setTimeout(() => setBioMessage(''), 3000);
      return;
    }

    if (user.biometrics_enabled) {
      // Disable
      haptic('medium');
      clearCredential();
      patchUser({ biometrics_enabled: false });
      dbUpdateUser(user.telegram_id, { biometrics_enabled: false }).catch(() => {});
      setBioMessage('Биометрия отключена');
      setTimeout(() => setBioMessage(''), 2000);
      return;
    }

    // Enable — register
    haptic('medium');
    setBioRegistering(true);
    setBioMessage('Подтвердите биометрию...');

    try {
      const success = await registerBiometrics(
        user.telegram_id,
        user.username || user.luna_id,
        `${user.first_name} ${user.last_name}`
      );

      if (success) {
        haptic('success');
        patchUser({ biometrics_enabled: true });
        dbUpdateUser(user.telegram_id, { biometrics_enabled: true }).catch(() => {});
        setBioMessage('✅ Биометрия активирована!');
      } else {
        haptic('error');
        setBioMessage('Не удалось активировать биометрию');
      }
    } catch (err: any) {
      haptic('error');
      setBioMessage(`Ошибка: ${err?.message || 'unknown'}`);
    }

    setBioRegistering(false);
    setTimeout(() => setBioMessage(''), 3000);
  };

  // ===== PIN Change Mode =====
  if (changingPin) {
    return (
      <div className="h-full bg-black safe-top">
        <div className="px-5 pt-4 pb-2 flex items-center gap-4">
          <button
            onClick={() => {
              setChangingPin(false);
              setPinStep('current');
            }}
            className="text-white/50"
          >
            <ArrowLeftIcon size={20} />
          </button>
          <h1 className="font-bold flex-1">Смена PIN</h1>
        </div>
        <PinPad
          title={
            pinStep === 'current' ? 'Текущий PIN' :
            pinStep === 'new1' ? 'Новый PIN' :
            'Повторите PIN'
          }
          onComplete={
            pinStep === 'current' ? handleCurrentPin :
            pinStep === 'new1' ? handleNewPin1 :
            handleNewPin2
          }
          error={pinError}
        />
      </div>
    );
  }

  // ===== Settings List =====
  return (
    <div className="h-full overflow-y-auto pb-24 safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('profile')} className="text-white/50">
          <ArrowLeftIcon size={20} />
        </button>
        <h1 className="font-bold flex-1">Безопасность</h1>
      </div>

      <div className="px-5 mt-4 space-y-3">
        {/* Change PIN */}
        <button
          onClick={() => {
            haptic('light');
            setChangingPin(true);
          }}
          className="w-full glass p-4 flex items-center gap-4 text-left active:scale-[0.98] transition-transform rounded-2xl"
        >
          <div className="w-11 h-11 rounded-xl bg-violet-500/15 flex items-center justify-center">
            <AnimatedEmoji type="lock" size={24} />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Сменить PIN-код</p>
            <p className="text-xs text-white/30">Изменить 4-значный код входа</p>
          </div>
        </button>

        {/* Biometrics */}
        <button
          onClick={toggleBiometrics}
          disabled={bioRegistering}
          className="w-full glass p-4 flex items-center gap-4 text-left active:scale-[0.98] transition-transform rounded-2xl"
        >
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
            user.biometrics_enabled ? 'bg-emerald-500/15' : 'bg-white/[0.04]'
          }`}>
            {bioRegistering ? (
              <AnimatedEmoji type="loading" size={22} />
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={user.biometrics_enabled ? '#10b981' : 'rgba(255,255,255,0.4)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {/* Fingerprint icon */}
                <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4" />
                <path d="M5 19.5C5.5 18 6 15 6 12c0-3.5 2.5-6 6-6 2 0 3.8 1 5 2.5" />
                <path d="M22 12c0 3-1 5.5-2.5 7.5" />
                <path d="M18 12c0 4-2 7-5 8.5" />
                <path d="M14 12c0 2.5-1 4.5-2.5 6" />
                <path d="M10 12c0 1-.5 2-1 3" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <p className="font-semibold">{bioLabel}</p>
            <p className="text-xs text-white/30">
              {!bioAvailable
                ? 'Не поддерживается'
                : user.biometrics_enabled
                  ? 'Включена · Вход без PIN'
                  : 'Быстрый вход без PIN-кода'}
            </p>
          </div>
          <div
            className={`
              w-12 h-7 rounded-full flex items-center px-1 transition-all
              ${user.biometrics_enabled ? 'bg-emerald-500' : 'bg-white/10'}
            `}
          >
            <div
              className={`
                w-5 h-5 rounded-full bg-white shadow transition-transform
                ${user.biometrics_enabled ? 'translate-x-5' : ''}
              `}
            />
          </div>
        </button>

        {/* Biometrics status message */}
        {bioMessage && (
          <div className={`glass p-3 text-sm animate-fade-in rounded-xl ${
            bioMessage.includes('✅') ? 'text-emerald-400' :
            bioMessage.includes('Ошибка') || bioMessage.includes('Не удалось') ? 'text-red-400' :
            'text-white/50'
          }`}>
            {bioMessage}
          </div>
        )}

        {/* Info cards */}
        <div className="mt-4 glass p-4 space-y-3 rounded-2xl">
          <h4 className="text-xs text-white/35 font-medium uppercase tracking-wide">Информация</h4>

          <div className="space-y-2.5 text-sm">
            <div className="flex items-start gap-3">
              <span className="text-base mt-0.5">🔐</span>
              <div>
                <p className="font-medium">PIN-код</p>
                <p className="text-xs text-white/25">4-значный код для каждого входа</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-base mt-0.5">👆</span>
              <div>
                <p className="font-medium">{bioLabel}</p>
                <p className="text-xs text-white/25">
                  {bioType === 'telegram'
                    ? 'Нативная биометрия через Telegram'
                    : bioType === 'webauthn'
                      ? 'Web Authentication API (Face ID / Touch ID)'
                      : 'Недоступно на этом устройстве'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-base mt-0.5">🛡️</span>
              <div>
                <p className="font-medium">Безопасность</p>
                <p className="text-xs text-white/25">Биометрические данные не покидают устройство</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
