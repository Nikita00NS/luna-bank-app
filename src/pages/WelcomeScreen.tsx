import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { getGreeting, hashPin, haptic } from '../lib/utils';
import { syncFromDB } from '../lib/db';
import PinPad from '../components/PinPad';
import Logo from '../components/Logo';
import AnimatedEmoji from '../components/AnimatedEmoji';

export default function WelcomeScreen() {
  const { user, go, setAuthed } = useStore();
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState(false);

  const greeting = getGreeting();

  if (!user) return null;

  const handleTap = () => {
    haptic('light');
    setShowPin(true);
  };

  const handlePin = async (pin: string) => {
    const hash = await hashPin(pin, String(user.telegram_id));

    if (hash === user.pin_hash) {
      haptic('success');
      setAuthed(true);

      // Sync data from Supabase on login
      syncFromDB(user.telegram_id).catch(() => {});

      go('home');
    } else {
      setPinError(true);
      setTimeout(() => setPinError(false), 600);
    }
  };

  // ===== PIN Entry =====
  if (showPin) {
    return (
      <div className="h-full bg-black">
        <PinPad
          title="Введите PIN-код"
          subtitle={`Добро пожаловать, ${user.first_name}`}
          onComplete={handlePin}
          error={pinError}
          onCancel={() => setShowPin(false)}
        />
      </div>
    );
  }

  // ===== Welcome Screen =====
  return (
    <div
      className={`
        h-full flex flex-col cursor-pointer safe-top
        bg-gradient-to-b ${greeting.gradient} to-black
      `}
      onClick={handleTap}
    >
      {/* Header */}
      <div className="px-6 pt-6 flex items-center gap-3 animate-fade-in">
        <Logo size={40} />
        <span className="font-black text-lg tracking-tight">Luna Bank</span>
        <AnimatedEmoji type="moon" size={24} />
      </div>

      {/* Center */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="animate-slide-up">
          {/* Avatar */}
          {user.photo_url ? (
            <img
              src={user.photo_url}
              alt=""
              className="w-28 h-28 rounded-full mb-6 mx-auto ring-2 ring-white/10 shadow-2xl"
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-5xl font-bold mb-6 mx-auto shadow-2xl">
              {user.first_name[0]}
            </div>
          )}

          {/* Greeting */}
          <h1 className="text-2xl font-bold text-center mb-1 text-white/60">
            {greeting.text},
          </h1>
          <h2 className="text-4xl font-extrabold text-center">
            {user.first_name}! {greeting.emoji}
          </h2>
        </div>
      </div>

      {/* Bottom hint */}
      <div
        className="px-6 pb-12 safe-bottom text-center animate-fade-in"
        style={{ animationDelay: '0.4s' }}
      >
        <div className="glass inline-flex items-center gap-2 px-6 py-3 text-white/40 text-sm">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Нажмите для входа
        </div>
      </div>
    </div>
  );
}
