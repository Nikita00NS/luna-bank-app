import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { getGreeting, hashPin, haptic } from '../lib/utils';
import { notifyUser } from '../lib/telegram-bot';
import PinPad from '../components/PinPad';

export default function WelcomeScreen() {
  const { user, go, setAuthed } = useStore();
  const [showPin, setShowPin] = useState(false);
  const [pinErr, setPinErr] = useState(false);
  const g = getGreeting();
  if (!user) return null;

  const handlePin = async (pin: string) => {
    const hash = await hashPin(pin, String(user.telegram_id));
    if (hash === user.pin_hash) { haptic('success'); setAuthed(true); go('home'); }
    else { setPinErr(true); setTimeout(() => setPinErr(false), 600); }
  };

  if (showPin) return <div className="h-full bg-black"><PinPad title="Введите PIN-код" subtitle={`Добро пожаловать, ${user.first_name}`} onComplete={handlePin} error={pinErr} onCancel={() => setShowPin(false)} /></div>;

  return (
    <div className={`h-full flex flex-col bg-gradient-to-b ${g.gradient} to-black safe-top cursor-pointer`} onClick={() => { haptic('light'); setShowPin(true); }}>
      <div className="px-6 pt-6 flex items-center gap-3 animate-fade-in">
        <img src="/logo.png" alt="Luna Bank" className="w-10 h-10 object-contain rounded-xl" style={{filter:"drop-shadow(0 0 8px rgba(255,200,0,0.3))"}} />
        <span className="font-black text-lg tracking-tight">Luna Bank</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="animate-slide-up">
          {user.photo_url ? <img src={user.photo_url} className="w-28 h-28 rounded-full mb-6 mx-auto ring-2 ring-white/10 shadow-2xl" alt="" /> :
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-5xl font-bold mb-6 mx-auto shadow-2xl">{user.first_name[0]}</div>}
          <h1 className="text-2xl font-bold text-center mb-1 text-white/60">{g.text},</h1>
          <h2 className="text-4xl font-extrabold text-center">{user.first_name}! {g.emoji}</h2>
        </div>
      </div>
      <div className="px-6 pb-12 safe-bottom text-center animate-fade-in" style={{animationDelay:'0.4s'}}>
        <div className="glass rounded-2xl py-3 px-6 inline-flex items-center gap-2 text-white/40 text-sm">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Нажмите для входа
        </div>
      </div>
    </div>
  );
}
