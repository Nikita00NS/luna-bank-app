import React, { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { getGreeting, hashPin, haptic } from '../lib/utils';
import { syncFromDB } from '../lib/db';
import PinPad from '../components/PinPad';
import Logo from '../components/Logo';
import {
  authenticateBiometrics,
  hasStoredCredential,
  checkBiometricsAvailability,
} from '../lib/webauthn';

export default function WelcomeScreen() {
  const { user, go, setAuthed } = useStore();
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioAuthenticating, setBioAuthenticating] = useState(false);
  const [bioFailed, setBioFailed] = useState(false);

  const greeting = getGreeting();

  if (!user) return null;

  // Check if biometrics are available & enabled
  useEffect(() => {
    if (user.biometrics_enabled && hasStoredCredential()) {
      setBioAvailable(true);
    }
  }, [user.biometrics_enabled]);

  // ===== Login success handler =====
  const loginSuccess = () => {
    haptic('success');
    setAuthed(true);
    syncFromDB(user.telegram_id).catch(() => {});
    go('home');
  };

  // ===== Biometric auth =====
  const handleBioAuth = async () => {
    setBioAuthenticating(true);
    setBioFailed(false);
    haptic('medium');

    try {
      const success = await authenticateBiometrics();
      if (success) {
        loginSuccess();
      } else {
        setBioFailed(true);
        haptic('error');
        setTimeout(() => setBioFailed(false), 2000);
      }
    } catch {
      setBioFailed(true);
      haptic('error');
      setTimeout(() => setBioFailed(false), 2000);
    }

    setBioAuthenticating(false);
  };

  // Auto-trigger biometrics on load (if enabled)
  useEffect(() => {
    if (bioAvailable && !showPin) {
      // Small delay for UI to render
      const timer = setTimeout(() => handleBioAuth(), 500);
      return () => clearTimeout(timer);
    }
  }, [bioAvailable]);

  const handleTap = () => {
    haptic('light');
    if (bioAvailable && !bioFailed) {
      handleBioAuth();
    } else {
      setShowPin(true);
    }
  };

  const handlePin = async (pin: string) => {
    const hash = await hashPin(pin, String(user.telegram_id));

    if (hash === user.pin_hash) {
      loginSuccess();
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
        {/* Biometric button on PIN screen */}
        {bioAvailable && (
          <div className="absolute bottom-28 left-0 right-0 flex justify-center">
            <button
              onClick={() => { setShowPin(false); handleBioAuth(); }}
              className="glass px-5 py-2.5 rounded-2xl flex items-center gap-2 active:scale-95 transition-transform"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4" />
                <path d="M5 19.5C5.5 18 6 15 6 12c0-3.5 2.5-6 6-6 2 0 3.8 1 5 2.5" />
                <path d="M22 12c0 3-1 5.5-2.5 7.5" />
                <path d="M18 12c0 4-2 7-5 8.5" />
                <path d="M14 12c0 2.5-1 4.5-2.5 6" />
                <path d="M10 12c0 1-.5 2-1 3" />
              </svg>
              <span className="text-sm text-emerald-400 font-medium">Биометрия</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // ===== Welcome Screen =====
  return (
    <div
      className="h-full flex flex-col cursor-pointer safe-top bg-gradient-to-b from-amber-500/10 via-black to-black relative overflow-hidden"
      onClick={handleTap}
    >
      {/* Background ambient glow */}
      <div className="absolute top-10 right-10 w-48 h-48 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="px-6 pt-6 flex items-center gap-3 animate-fade-in relative z-10">
        <Logo size={40} glow />
        <span className="font-black text-lg tracking-tight text-white">Luna Bank</span>
      </div>

      {/* Center */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10">
        <div className="animate-slide-up text-center">
          {/* Avatar */}
          {user.photo_url ? (
            <img
              src={user.photo_url}
              alt=""
              className="w-28 h-28 rounded-3xl mb-6 mx-auto ring-1 ring-white/15 shadow-2xl"
            />
          ) : (
            <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-violet-600 to-pink-600 border border-white/10 flex items-center justify-center text-5xl font-black mb-6 mx-auto shadow-2xl shadow-violet-500/20 text-white">
              {user.first_name[0]}
            </div>
          )}

          {/* Greeting */}
          <p className="text-sm font-bold uppercase tracking-widest text-amber-400 mb-1">
            {greeting.text}
          </p>
          <h2 className="text-3xl font-black text-white tracking-tight">
            {user.first_name} {user.last_name || ''}
          </h2>
        </div>
      </div>

      {/* Bottom */}
      <div
        className="px-6 pb-12 safe-bottom text-center animate-fade-in"
        style={{ animationDelay: '0.4s' }}
      >
        {bioAuthenticating ? (
          <div className="glass inline-flex items-center gap-3 px-6 py-3 text-white/70 text-sm font-medium rounded-2xl border border-white/10">
            <div className="w-4 h-4 border-2 border-white/20 border-t-amber-400 rounded-full animate-spin" />
            Подтвердите биометрию...
          </div>
        ) : bioFailed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="glass inline-flex items-center gap-2 px-6 py-3 text-red-400/70 text-sm">
              Биометрия не прошла
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setShowPin(true); }}
              className="text-white/25 text-xs underline"
            >
              Войти по PIN
            </button>
          </div>
        ) : bioAvailable ? (
          <div className="glass inline-flex items-center gap-3 px-6 py-3 text-white/40 text-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(16,185,129,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4" />
              <path d="M5 19.5C5.5 18 6 15 6 12c0-3.5 2.5-6 6-6 2 0 3.8 1 5 2.5" />
              <path d="M22 12c0 3-1 5.5-2.5 7.5" />
              <path d="M18 12c0 4-2 7-5 8.5" />
              <path d="M14 12c0 2.5-1 4.5-2.5 6" />
            </svg>
            Нажмите для биометрии
          </div>
        ) : (
          <div className="glass inline-flex items-center gap-2 px-6 py-3 text-white/40 text-sm">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Нажмите для входа
          </div>
        )}
      </div>
    </div>
  );
}
