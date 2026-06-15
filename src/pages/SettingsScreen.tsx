import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { haptic, hashPin } from '../lib/utils';
import { dbUpdateUser } from '../lib/db';
import PinPad from '../components/PinPad';
import { ArrowLeftIcon, LockIcon } from '../components/Icons';

type PinStep = 'current' | 'new1' | 'new2';

export default function SettingsScreen() {
  const { user, go, patchUser } = useStore();
  const [changingPin, setChangingPin] = useState(false);
  const [pinStep, setPinStep] = useState<PinStep>('current');
  const [newPin, setNewPin] = useState('');
  const [pinError, setPinError] = useState(false);

  if (!user) return null;

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
          className="w-full glass p-4 flex items-center gap-4 text-left active:scale-[0.98] transition-transform"
        >
          <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center">
            <LockIcon size={20} color="rgba(255,255,255,0.5)" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Сменить PIN-код</p>
            <p className="text-xs text-white/30">Изменить 4-значный код входа</p>
          </div>
        </button>

        {/* Biometrics toggle */}
        <button
          onClick={() => {
            haptic('light');
            const newVal = !user.biometrics_enabled;
            patchUser({ biometrics_enabled: newVal });
            dbUpdateUser(user.telegram_id, { biometrics_enabled: newVal }).catch(() => {});
          }}
          className="w-full glass p-4 flex items-center gap-4 text-left active:scale-[0.98] transition-transform"
        >
          <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center text-xl">
            🔒
          </div>
          <div className="flex-1">
            <p className="font-semibold">Биометрия</p>
            <p className="text-xs text-white/30">
              {user.biometrics_enabled ? 'Включена' : 'Выключена'}
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
                w-5 h-5 rounded-full bg-white transition-transform
                ${user.biometrics_enabled ? 'translate-x-5' : ''}
              `}
            />
          </div>
        </button>
      </div>
    </div>
  );
}
