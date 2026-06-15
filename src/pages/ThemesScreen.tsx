import React, { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { haptic } from '../lib/utils';
import { ArrowLeftIcon } from '../components/Icons';

const THEMES = [
  { id: 'default', name: 'Default', desc: 'Чёрный + фиолетовый', accent: '#8b5cf6', bg: '#000000' },
  { id: 'gold', name: 'Gold', desc: 'Чёрный + золотой', accent: '#ffc300', bg: '#000000' },
  { id: 'neon', name: 'Neon', desc: 'Неоновый зелёный', accent: '#00ff88', bg: '#000500' },
  { id: 'ocean', name: 'Ocean', desc: 'Глубокий океан', accent: '#0ea5e9', bg: '#000510' },
  { id: 'rose', name: 'Rose Gold', desc: 'Розовое золото', accent: '#f472b6', bg: '#0a0505' },
  { id: 'matrix', name: 'Matrix', desc: 'Зелёный код', accent: '#22c55e', bg: '#000500' },
  { id: 'sunset', name: 'Sunset', desc: 'Тёплый закат', accent: '#f97316', bg: '#0a0500' },
  { id: 'ice', name: 'Ice', desc: 'Ледяной', accent: '#67e8f9', bg: '#000510' },
];

function applyTheme(themeId: string) {
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
  const root = document.documentElement;

  // Convert hex to RGB
  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r} ${g} ${b}`;
  };

  root.style.setProperty('--color-accent', hexToRgb(theme.accent));
  document.body.style.backgroundColor = theme.bg;

  // Save to localStorage
  localStorage.setItem('luna-theme', themeId);
}

export default function ThemesScreen() {
  const { go } = useStore();
  const [selTheme, setSelTheme] = useState(() =>
    localStorage.getItem('luna-theme') || 'default'
  );

  // Apply on mount
  useEffect(() => {
    applyTheme(selTheme);
  }, []);

  const selectTheme = (id: string) => {
    haptic('medium');
    setSelTheme(id);
    applyTheme(id);
  };

  return (
    <div className="h-full overflow-y-auto pb-24 safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('profile')} className="text-white/50">
          <ArrowLeftIcon size={20} />
        </button>
        <h1 className="font-bold flex-1">Оформление</h1>
      </div>

      <div className="px-5 mt-4">
        <p className="text-xs text-white/30 mb-3">Выберите тему — применится мгновенно</p>

        <div className="space-y-3">
          {THEMES.map((theme, i) => {
            const isActive = selTheme === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => selectTheme(theme.id)}
                className={`
                  w-full rounded-2xl p-4 flex items-center gap-4 text-left
                  transition-all animate-slide-up
                  ${isActive ? 'ring-2 ring-white' : 'glass'}
                `}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                {/* Color preview */}
                <div
                  className="w-14 h-14 rounded-xl border border-white/10 flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${theme.accent}33, ${theme.accent}11)` }}
                >
                  <div
                    className="w-6 h-6 rounded-full shadow-lg"
                    style={{ background: theme.accent, boxShadow: `0 0 15px ${theme.accent}66` }}
                  />
                </div>

                {/* Name + Description */}
                <div className="flex-1">
                  <p className="font-bold">{theme.name}</p>
                  <p className="text-xs text-white/30">{theme.desc}</p>
                </div>

                {/* Active indicator */}
                {isActive && (
                  <span className="text-emerald-400 text-sm font-bold">✓ Активна</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Apply saved theme on app load
export function initTheme() {
  const saved = localStorage.getItem('luna-theme');
  if (saved) {
    const theme = THEMES.find(t => t.id === saved);
    if (theme) {
      const hexToRgb = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `${r} ${g} ${b}`;
      };
      document.documentElement.style.setProperty('--color-accent', hexToRgb(theme.accent));
      document.body.style.backgroundColor = theme.bg;
    }
  }
}
