import React from 'react';
import { useStore } from '../lib/store';
import { haptic } from '../lib/utils';
import { ArrowLeftIcon } from '../components/Icons';
import Logo from '../components/Logo';
import { QRCodeSVG } from 'qrcode.react';

export default function QRScreen() {
  const { user, go } = useStore();

  if (!user) return null;

  const qrData = JSON.stringify({
    type: 'luna-bank',
    luna_id: user.luna_id,
    username: user.username,
    telegram_id: user.telegram_id,
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    haptic('light');
  };

  return (
    <div className="h-full flex flex-col items-center justify-center px-5 safe-top">
      {/* Back */}
      <button
        onClick={() => go('profile')}
        className="absolute top-4 left-5 text-white/50"
      >
        <ArrowLeftIcon size={20} />
      </button>

      <div className="animate-slide-up text-center">
        <h2 className="text-xl font-bold mb-6">Мой QR-код</h2>

        {/* Real QR Code */}
        <div className="w-64 h-64 bg-white rounded-3xl p-4 mx-auto mb-6 flex items-center justify-center shadow-2xl">
          <QRCodeSVG
            value={qrData}
            size={220}
            level="M"
            bgColor="#ffffff"
            fgColor="#000000"
            imageSettings={{
              src: '/logo.png',
              height: 40,
              width: 40,
              excavate: true,
            }}
          />
        </div>

        {/* Info */}
        <p className="text-sm text-white/40 mb-4">
          Покажите QR-код отправителю
        </p>

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
      </div>
    </div>
  );
}
