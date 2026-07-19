import React, { useState, useEffect } from 'react';
import { useStore, uid, genLunaId } from '../lib/store';
import { haptic, hashPin } from '../lib/utils';
import { dbUpsertUser, syncFromDB, dbGetUser } from '../lib/db';
import { isTelegramEnv } from '../lib/telegram';
import Logo from '../components/Logo';
import PinPad from '../components/PinPad';
import { UserIcon, LockIcon, StarIcon, PlusIcon, ArrowLeftIcon, SparklesIcon } from '../components/Icons';

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
        <div className="w-12 h-12 border-3 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
        <p className="text-white/40 text-sm font-medium mt-4">Загрузка профиля...</p>
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
          <button onClick={() => setStep('welcome')} className="text-white/60 hover:text-white text-sm flex items-center gap-1.5 transition-colors"><ArrowLeftIcon size={18} /> Назад</button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-500/10">
            <SparklesIcon size={32} />
          </div>
          <h2 className="text-2xl font-extrabold mb-2 text-white">Регистрация в экосистеме</h2>
          <p className="text-white/40 text-xs mb-8 max-w-[260px] leading-relaxed">Создайте единый профиль для управления крипто-активами, P2P и счетами</p>

          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Ваше имя"
            className="w-full glass px-4 py-4 bg-transparent text-white outline-none rounded-2xl mb-3 text-center text-base font-semibold border border-white/10 focus:border-amber-500/50" autoFocus />

          <input type="text" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="Идентификатор или username (латиница)"
            className="w-full glass px-4 py-4 bg-transparent text-white outline-none rounded-2xl mb-4 text-center mono text-sm font-medium border border-white/10 focus:border-amber-500/50" />

          {error && <p className="text-red-400 text-xs font-bold mb-3">{error}</p>}

          <button onClick={handleRegister} disabled={!name.trim() || !username.trim()}
            className="btn-primary w-full text-base py-4 rounded-2xl font-bold shadow-lg shadow-amber-500/20 disabled:opacity-30">
            Продолжить создание →
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
          <button onClick={() => setStep('welcome')} className="text-white/60 hover:text-white text-sm flex items-center gap-1.5 transition-colors"><ArrowLeftIcon size={18} /> Назад</button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-3xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-amber-400 mb-4 shadow-xl">
            <LockIcon size={32} />
          </div>
          <h2 className="text-2xl font-extrabold mb-2 text-white">Авторизация</h2>
          <p className="text-white/40 text-xs mb-8 max-w-[260px]">Укажите ваш уникальный username для проверки доступа</p>

          <input type="text" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="username пользователя"
            className="w-full glass px-4 py-4 bg-transparent text-white outline-none rounded-2xl mb-4 text-center mono text-base font-medium border border-white/10 focus:border-amber-500/50" autoFocus />

          {error && <p className="text-red-400 text-xs font-bold mb-3">{error}</p>}

          <button onClick={handleLogin} disabled={!username.trim() || loading}
            className="btn-primary w-full text-base py-4 rounded-2xl font-bold shadow-lg shadow-amber-500/20 disabled:opacity-30">
            {loading ? 'Проверка профиля...' : 'Войти в кошелёк →'}
          </button>
        </div>
      </div>
    );
  }

  // ===== Welcome =====
  return (
    <div className="h-full flex flex-col bg-black safe-top relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-20 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center animate-fade-in">
        <div className="mb-6 relative">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-600/10 border border-amber-500/30 flex items-center justify-center shadow-2xl shadow-amber-500/15">
            <Logo size={64} glow />
          </div>
        </div>
        <h1 className="text-4xl font-black tracking-tight text-white drop-shadow-sm">Luna Bank</h1>
        <div className="flex items-center gap-2 mt-2 mb-3">
          <span className="px-2.5 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest">
            Neo-Banking & Crypto 2026
          </span>
        </div>
        <p className="text-white/50 text-xs leading-relaxed max-w-[280px]">
          Единая некастодиальная и банковская экосистема. Мгновенные переводы, P2P обмены, смарт-гарант и Merchant API.
        </p>
      </div>

      <div className="px-6 pb-8 safe-bottom space-y-3 relative z-10">
        {/* Telegram Login — only show if in Telegram */}
        {inTelegram && (
          <button onClick={autoLoginTelegram}
            className="w-full py-4 rounded-2xl font-bold text-[15px] bg-[#2AABEE] hover:bg-[#2298d6] text-white flex items-center justify-center gap-3 active:scale-[0.97] transition-all shadow-lg shadow-[#2AABEE]/25">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
            Быстрый вход через Telegram
          </button>
        )}

        {/* Register */}
        <button onClick={() => setStep('register')}
          className="w-full py-4 rounded-2xl font-bold text-[15px] bg-amber-500 hover:bg-amber-400 text-black flex items-center justify-center gap-2 active:scale-[0.97] transition-all shadow-xl shadow-amber-500/20">
          <PlusIcon size={18} color="#000" /> Создать новый аккаунт
        </button>

        {/* Login */}
        <button onClick={() => setStep('login')}
          className="w-full py-4 rounded-2xl font-bold text-[15px] glass border border-white/10 hover:border-white/20 text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-all">
          <UserIcon size={18} color="currentColor" /> Уже есть аккаунт? Войти
        </button>

        <p className="text-center text-white/30 font-mono text-[10px] mt-3">
          Luna Bank v1.3 · Безопасный некастодиальный шлюз
        </p>
      </div>
    </div>
  );
}
