import React from 'react';
import { useStore, type Page } from '../lib/store';
import { haptic } from '../lib/utils';

/**
 * Placeholder screen for pages not yet rewritten.
 * Shows page name and back button.
 * Will be replaced in Phases 2-4.
 */
interface Props {
  name: string;
  icon: string;
  backTo?: Page;
}

export default function PlaceholderScreen({ name, icon, backTo = 'home' }: Props) {
  const { go } = useStore();

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button
          onClick={() => { haptic('light'); go(backTo); }}
          className="text-white/50 text-sm"
        >
          ← Назад
        </button>
        <h1 className="font-bold flex-1">{icon} {name}</h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <span className="text-6xl mb-4 animate-float">{icon}</span>
        <h2 className="text-xl font-extrabold mb-2">{name}</h2>
        <p className="text-sm text-white/30 text-center">
          Этот экран будет переписан в следующей фазе
        </p>
      </div>
    </div>
  );
}
