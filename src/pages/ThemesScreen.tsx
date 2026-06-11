import React from 'react';
import { useStore } from '../lib/store';
import { ArrowLeftIcon, PaletteIcon } from '../components/Icons';

export default function ThemesScreen() {
  const { go } = useStore();
  return (
    <div className="h-full overflow-y-auto pb-24 safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('profile')} className="text-white/50"><ArrowLeftIcon size={20} /></button>
        <h1 className="font-bold flex-1">Оформление</h1>
      </div>
      <div className="px-5 mt-4 text-center py-16 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mx-auto mb-4">
          <PaletteIcon size={28} color="rgba(255,255,255,0.3)" />
        </div>
        <h3 className="font-bold text-lg mb-2">Скоро</h3>
        <p className="text-sm text-white/30 max-w-[260px] mx-auto">
          8 тем оформления и 12 аватаров — в следующем обновлении
        </p>
      </div>
    </div>
  );
}
