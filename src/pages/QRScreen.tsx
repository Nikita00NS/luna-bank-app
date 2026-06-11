import React from 'react';
import { useStore } from '../lib/store';
import { haptic } from '../lib/utils';
import { ArrowLeftIcon } from '../components/Icons';
import Logo from '../components/Logo';

export default function QRScreen() {
  const { user, go } = useStore();

  if (!user) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    haptic('light');
  };

  return (
    <div className="h-full flex flex-col items-center justify-center px-5 safe-top">
      {/* Back button */}
      <button
        onClick={() => go('profile')}
        className="absolute top-4 left-5 text-white/50"
      >
        <ArrowLeftIcon size={20} />
      </button>

      <div className="animate-slide-up text-center">
        <h2 className="text-xl font-bold mb-6">Мой QR-код</h2>

        {/* QR card */}
        <div className="w-64 h-64 bg-white rounded-3xl p-6 mx-auto mb-6 flex items-center justify-center shadow-2xl">
          <div className="text-center">
            <Logo size={64} className="mx-auto mb-3" />
            <p className="text-black font-extrabold text-lg">Luna Bank</p>
            <p className="text-black/40 text-xs font-mono mt-1">{user.luna_id}</p>
            <p className="text-black/30 text-xs mt-1">@{user.username}</p>
          </div>
        </div>

        {/* Copy buttons */}
        <div className="glass p-4 w-full max-w-sm space-y-3">
          {[
            ['Luna ID', user.luna_id],
            ['Username', `@${user.username}`],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-sm text-white/35">{label}</span>
              <button
                onClick={() => copyToClipboard(value)}
                className="text-sm flex items-center gap-1 active:scale-95 transition-transform"
              >
                {value}
                <span className="text-white/30 text-xs">📋</span>
              </button>
            </div>
          ))}
        </div>

        <p className="text-xs text-white/20 mt-4">
          Покажите этот QR-код для получения перевода
        </p>
      </div>
    </div>
  );
}
