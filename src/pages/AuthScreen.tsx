import React, { useState, useEffect } from 'react';
import { useStore, uid, genLunaId } from '../lib/store';
import { haptic, hashPin } from '../lib/utils';
import { dbUpsertUser, syncFromDB, dbGetUser } from '../lib/db';
import { isTelegramEnv } from '../lib/telegram';
import Logo from '../components/Logo';
import AnimatedEmoji from '../components/AnimatedEmoji';
import PinPad from '../components/PinPad';

type Step = 'welcome' | 'register' | 'login' | 'pin-create' | 'pin-confirm' | 'pin-login';

export default function AuthScreen() {
  const { setUser, setAuthed, setIsNew, go, user } = useStore();
  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const inTelegram = isTelegramEnv();
  const tg = (window as any).Telegram?.WebApp;
  const tgUser = tg?.initDataUnsafe?.user;

  // Auto-login if in Telegram
  useEffect(() => {
    if (tgUser) {
      autoLoginTelegram();
    }
  }, []);

  const autoLoginTelegram = async () => {
    if (!tgUser) return;
    setLoading(true);
    try {
      const existing = await dbGetUser(tgUser.id);
      if (existing) {
        // User exists — go to PIN login
        setUser(existing as any);
        setStep('pin-login');
      } else {
        // New user — auto-fill and create
        setName(tgUser.first_name || '');
        setUsername(tgUser.username || '');
        setStep('pin-create');
      }
    } catch {
      setStep('welcome');
    }
    setLoading(false);
  };

  // ===== Register (native app) =====
  const handleRegister = () => {
    if (!name.trim()) { setError('Введите имя'); return; }
    if (!username.trim()) { setError('Введите username'); return; }
    setError('');
    setStep('pin-create');
  };

  // ===== Login (native app) =====
  const handleLogin = async () => {
    if (!username.trim()) { setError('Введите username'); return; }
    setLoading(true);
    setError('');
    try {
      // Search user by username in Supabase
      const { data } = await (await import('../lib/supabase')).supabase
        .from('users')
        .select('*')
        .eq('username', username.trim())
        .single();

      if (data) {
        setUser(data as any);
        setStep('pin-login');
      } else {
        setError('Пользователь не найден');
      }
    } catch {
      setError('Пользователь не найден');
    }
    setLoading(false);
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

    const tgId = tgUser?.id || Math.floor(100000000 + Math.random() * 899999999);
    const pinHash = await hashPin(pin, String(tgId));

    const userData = {
      telegram_id: tgId,
      username: username.trim() || tgUser?.username || 'user_' + Date.now(),
      first_name: name.trim() || tgUser?.first_name || 'User',
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
    };

    setUser(userData);
    setIsNew(false);
    setAuthed(true);
    dbUpsertUser(userData).catch(() => {});
    syncFromDB(userData.telegram_id).catch(() => {});
    go('home');
  };

  const handlePinLogin = async (pin: string) => {
    if (!user) return;
    const hash = await hashPin(pin, String(user.telegram_id));
    if (hash === user.pin_hash) {
      setAuthed(true);
      syncFromDB(user.telegram_id).catch(() => {});
      go('home');
    } else {
      setPinError(true);
      setTimeout(() => setPinError(false), 600);
    }
  };

  // ===== Loading =====
  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black">
        <AnimatedEmoji type="loading" size={48} />
        <p className="text-white/40 text-sm mt-4">Загрузка...</p>
      </div>
    );
  }

  // ===== PIN Create =====
  if (step === 'pin-create') {
    return (
      <div className="h-full bg-black">
        <PinPad title="Создайте PIN-код" subtitle="4 цифры для входа" onComplete={handlePinCreate} />
      </div>
    );
  }

  // ===== PIN Confirm =====
  if (step === 'pin-confirm') {
    return (
      <div className="h-full bg-black">
        <PinPad title="Повторите PIN" subtitle="Подтвердите код" onComplete={handlePinConfirm} error={pinError} />
      </div>
    );
  }

  // ===== PIN Login =====
  if (step === 'pin-login') {
    return (
      <div className="h-full bg-black">
        <PinPad
          title="Введите PIN"
          subtitle={`С возвращением, ${user?.first_name || 'User'}!`}
          onComplete={handlePinLogin}
          error={pinError}
        />
      </div>
    );
  }

  // ===== Register Form =====
  if (step === 'register') {
    return (
      <div className="h-full flex flex-col bg-black safe-top">
        <div className="px-5 pt-4">
          <button onClick={() => setStep('welcome')} className="text-white/50 text-sm">← Назад</button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <AnimatedEmoji type="star" size={56} />
          <h2 className="text-2xl font-extrabold mt-4 mb-2">Регистрация</h2>
          <p className="text-white/35 text-sm text-center mb-8">Создайте аккаунт Luna Bank</p>

          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Ваше имя"
            className="w-full glass px-4 py-4 bg-transparent text-white outline-none rounded-2xl mb-3 text-center text-lg" autoFocus />

          <input type="text" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="username (латиница)"
            className="w-full glass px-4 py-4 bg-transparent text-white outline-none rounded-2xl mb-4 text-center mono" />

          {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

          <button onClick={handleRegister} disabled={!name.trim() || !username.trim()}
            className="btn-primary w-full text-lg py-4">
            Продолжить →
          </button>
        </div>
      </div>
    );
  }

  // ===== Login Form =====
  if (step === 'login') {
    return (
      <div className="h-full flex flex-col bg-black safe-top">
        <div className="px-5 pt-4">
          <button onClick={() => setStep('welcome')} className="text-white/50 text-sm">← Назад</button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <AnimatedEmoji type="lock" size={56} />
          <h2 className="text-2xl font-extrabold mt-4 mb-2">Вход</h2>
          <p className="text-white/35 text-sm text-center mb-8">Введите username вашего аккаунта</p>

          <input type="text" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="username"
            className="w-full glass px-4 py-4 bg-transparent text-white outline-none rounded-2xl mb-4 text-center mono text-lg" autoFocus />

          {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

          <button onClick={handleLogin} disabled={!username.trim() || loading}
            className="btn-primary w-full text-lg py-4">
            {loading ? 'Поиск...' : 'Войти →'}
          </button>
        </div>
      </div>
    );
  }

  // ===== Welcome =====
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
        {/* Telegram Login — only show if in Telegram */}
        {inTelegram && (
          <button onClick={autoLoginTelegram}
            className="w-full py-4 rounded-2xl font-bold text-base bg-[#2AABEE] text-white flex items-center justify-center gap-3 active:scale-[0.97] transition-transform">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
            Войти через Telegram
          </button>
        )}

        {/* Register */}
        <button onClick={() => setStep('register')}
          className="w-full py-4 rounded-2xl font-bold text-base bg-white text-black flex items-center justify-center gap-2 active:scale-[0.97] transition-transform">
          🚀 Создать аккаунт
        </button>

        {/* Login */}
        <button onClick={() => setStep('login')}
          className="w-full py-4 rounded-2xl font-bold text-base glass text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-transform">
          Уже есть аккаунт? Войти
        </button>

        <p className="text-center text-white/15 text-xs mt-2">
          Luna Bank v1.3 · Crypto Banking
        </p>
      </div>
    </div>
  );
}
