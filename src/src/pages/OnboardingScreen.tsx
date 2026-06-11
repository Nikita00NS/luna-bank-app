import React, { useState } from 'react';
import { useStore, genLunaId } from '../lib/store';
import { hashPin, haptic } from '../lib/utils';
import { dbCreateUser } from '../lib/sync';
import PinPad from '../components/PinPad';

export default function OnboardingScreen() {
  const { setUser, setAuthed, setIsNew, go } = useStore();
  const [step, setStep] = useState<'info'|'pin1'|'pin2'>('info');
  const [firstPin, setFirstPin] = useState('');
  const [err, setErr] = useState(false);

  const tg = (window as any).Telegram?.WebApp;
  const tu = tg?.initDataUnsafe?.user;
  const u = {
    telegram_id: tu?.id || Math.floor(Math.random()*999999999),
    username: tu?.username || 'luna_user',
    first_name: tu?.first_name || 'Luna',
    last_name: tu?.last_name || 'User',
    photo_url: tu?.photo_url || '',
  };

  const handlePin2 = async (pin: string) => {
    if (pin !== firstPin) {
      setErr(true);
      setTimeout(() => { setErr(false); setStep('pin1'); setFirstPin(''); }, 800);
      return;
    }
    haptic('success');
    const hash = await hashPin(pin, String(u.telegram_id));
    const userData = {
      ...u, pin_hash: hash, role: 'owner' as const, luna_id: genLunaId(),
      level: 1, xp: 0, kyc_status: 'none' as const, subscription: 'free' as const,
      created_at: new Date().toISOString(), display_currency: 'USD',
      biometrics_enabled: false,
    };
    // Save to Supabase
    dbCreateUser(userData).catch(err => console.warn('DB save failed:', err));
    setUser(userData);
    setIsNew(false); setAuthed(true); go('home');
  };

  if (step === 'pin1') return <div className="h-full bg-black"><PinPad title="Создайте PIN-код" subtitle="4 цифры для входа" onComplete={p => { setFirstPin(p); setStep('pin2'); }} /></div>;
  if (step === 'pin2') return <div className="h-full bg-black"><PinPad title="Повторите PIN-код" subtitle="Подтвердите" onComplete={handlePin2} error={err} /></div>;

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="animate-float mb-10"><img src="/logo.png" alt="Luna Bank" className="w-28 h-28 object-contain" style={{filter:"drop-shadow(0 0 20px rgba(255,200,0,0.4))"}} /></div>
        <h1 className="text-4xl font-extrabold mb-3 animate-slide-up">Luna Bank</h1>
        <p className="text-white/40 text-center leading-relaxed animate-slide-up text-[15px]" style={{animationDelay:'0.1s'}}>
          Крипто-финансовая экосистема нового поколения. Счета, переводы, крипта — всё в Telegram.
        </p>
        <div className="mt-8 glass-accent rounded-2xl p-4 w-full max-w-sm animate-slide-up" style={{animationDelay:'0.2s'}}>
          <div className="flex items-center gap-4">
            {u.photo_url ? <img src={u.photo_url} className="w-12 h-12 rounded-full" alt="" /> :
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-xl font-bold">{u.first_name[0]}</div>}
            <div>
              <p className="font-semibold">{u.first_name} {u.last_name}</p>
              <p className="text-sm text-white/35">@{u.username}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="px-6 pb-8 safe-bottom">
        <button onClick={() => { haptic('medium'); setStep('pin1'); }} className="btn-primary w-full text-lg py-[18px]">Начать</button>
        <p className="text-center text-white/20 text-xs mt-4">Нажимая «Начать», вы принимаете условия использования</p>
      </div>
    </div>
  );
}
