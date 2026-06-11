import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { haptic } from '../lib/utils';

const THEMES = [
  { id: 'default', name: 'Default', desc: 'Чёрный + фиолетовый', bg: '#000', accent: '#8b5cf6', preview: 'from-violet-500/20 to-pink-500/10' },
  { id: 'gold', name: 'Gold', desc: 'Чёрный + золотой', bg: '#000', accent: '#ffc300', preview: 'from-yellow-500/20 to-amber-500/10' },
  { id: 'neon', name: 'Neon', desc: 'Кислотный неон', bg: '#000', accent: '#00ff88', preview: 'from-green-400/20 to-cyan-400/10' },
  { id: 'ocean', name: 'Ocean', desc: 'Глубокий океан', bg: '#0a0a1a', accent: '#0ea5e9', preview: 'from-sky-500/20 to-blue-500/10' },
  { id: 'rose', name: 'Rose Gold', desc: 'Розовое золото', bg: '#0a0505', accent: '#f472b6', preview: 'from-pink-400/20 to-rose-500/10' },
  { id: 'matrix', name: 'Matrix', desc: 'Зелёный код', bg: '#000500', accent: '#22c55e', preview: 'from-green-500/20 to-emerald-500/10' },
  { id: 'sunset', name: 'Sunset', desc: 'Тёплый закат', bg: '#0a0500', accent: '#f97316', preview: 'from-orange-500/20 to-red-500/10' },
  { id: 'ice', name: 'Ice', desc: 'Ледяной минимализм', bg: '#000510', accent: '#67e8f9', preview: 'from-cyan-400/20 to-sky-300/10' },
];

const AVATARS = [
  { id: 'a1', emoji: '🧑‍💼', name: 'Бизнесмен', price: 0 },
  { id: 'a2', emoji: '👨‍🚀', name: 'Космонавт', price: 100 },
  { id: 'a3', emoji: '🧑‍💻', name: 'Хакер', price: 200 },
  { id: 'a4', emoji: '👑', name: 'Король', price: 500 },
  { id: 'a5', emoji: '🤖', name: 'Робот', price: 300 },
  { id: 'a6', emoji: '🦊', name: 'Лиса', price: 150 },
  { id: 'a7', emoji: '🐉', name: 'Дракон', price: 1000 },
  { id: 'a8', emoji: '💀', name: 'Skull', price: 400 },
  { id: 'a9', emoji: '🌙', name: 'Luna', price: 0 },
  { id: 'a10', emoji: '🔮', name: 'Кристалл', price: 250 },
  { id: 'a11', emoji: '🎭', name: 'Маска', price: 350 },
  { id: 'a12', emoji: '⚡', name: 'Молния', price: 200 },
];

export default function ThemesScreen() {
  const { user, go } = useStore();
  const [tab, setTab] = useState<'themes' | 'avatars'>('themes');
  const [selTheme, setSelTheme] = useState('default');
  const [selAvatar, setSelAvatar] = useState('a1');

  if (!user) return null;

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('profile')} className="text-white/50 text-sm">← Назад</button>
        <h1 className="font-bold flex-1">🎨 Кастомизация</h1>
      </div>

      <div className="px-5 flex gap-2 mb-4">
        {(['themes', 'avatars'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? 'bg-white text-black' : 'glass text-white/50'}`}>
            {t === 'themes' ? '🎨 Темы' : '👤 Аватары'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {tab === 'themes' && (
          <div className="space-y-3 animate-fade-in">
            {THEMES.map((theme, i) => (
              <button key={theme.id} onClick={() => { haptic('medium'); setSelTheme(theme.id); }}
                className={`w-full rounded-2xl p-4 flex items-center gap-4 text-left transition-all animate-slide-up ${
                  selTheme === theme.id ? 'ring-2 ring-white' : 'glass'
                }`}
                style={{ animationDelay: `${i * 0.05}s` }}>
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${theme.preview} border border-white/10 flex items-center justify-center`}>
                  <div className="w-6 h-6 rounded-full" style={{ background: theme.accent }} />
                </div>
                <div className="flex-1">
                  <p className="font-bold">{theme.name}</p>
                  <p className="text-xs text-white/30">{theme.desc}</p>
                </div>
                {selTheme === theme.id && <span className="text-emerald-400 font-bold text-sm">✓ Активна</span>}
              </button>
            ))}
          </div>
        )}

        {tab === 'avatars' && (
          <div className="animate-fade-in">
            <p className="text-xs text-white/30 mb-3">Выберите аватар для профиля</p>
            <div className="grid grid-cols-4 gap-3">
              {AVATARS.map((av, i) => (
                <button key={av.id} onClick={() => { haptic('light'); setSelAvatar(av.id); }}
                  className={`rounded-2xl p-3 text-center transition-all animate-scale-in ${
                    selAvatar === av.id ? 'ring-2 ring-white bg-white/10' : 'glass'
                  }`}
                  style={{ animationDelay: `${i * 0.04}s` }}>
                  <p className="text-3xl mb-1">{av.emoji}</p>
                  <p className="text-[9px] text-white/40 truncate">{av.name}</p>
                  {av.price > 0 && <p className="text-[9px] text-yellow-400/60 tabular-nums">◎{av.price}</p>}
                  {av.price === 0 && <p className="text-[9px] text-emerald-400/60">Free</p>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
