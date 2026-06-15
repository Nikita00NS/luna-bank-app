import React from 'react';
import { useStore } from '../lib/store';
import { haptic } from '../lib/utils';
import { ArrowLeftIcon, DownloadIcon } from '../components/Icons';
import Logo from '../components/Logo';
import { QRCodeSVG } from 'qrcode.react';

export default function ReceiveScreen() {
  const { user, accounts, selAccountId, go } = useStore();
  const account = accounts.find(a => a.id === selAccountId) || accounts[0];
  if (!user) return null;

  const copy = (text: string) => { navigator.clipboard.writeText(text); haptic('light'); };

  return (
    <div className="h-full overflow-y-auto pb-24 safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('home')} className="text-white/50"><ArrowLeftIcon size={20} /></button>
        <h1 className="font-bold flex-1">Получить перевод</h1>
      </div>
      <div className="px-5 mt-4 animate-fade-in">
        <div className="glass p-6 flex flex-col items-center mb-4">
          <div className="w-48 h-48 bg-white rounded-2xl p-3 flex items-center justify-center mb-4 shadow-xl">
            <QRCodeSVG
              value={JSON.stringify({ type: 'luna-transfer', luna_id: user.luna_id, username: user.username })}
              size={168}
              level="M"
              bgColor="#ffffff"
              fgColor="#000000"
              imageSettings={{ src: '/logo.png', height: 30, width: 30, excavate: true }}
            />
          </div>
          <p className="text-sm text-white/35">Покажите QR отправителю</p>
        </div>
        <div className="glass p-4 space-y-3">
          <h3 className="font-bold text-sm mb-2">Реквизиты</h3>
          {account && [['IBAN', account.iban], ['SWIFT', 'LUNABKXX'], ['Счёт', account.account_number]].map(([l, v]) => (
            <div key={l} className="flex justify-between items-center py-1">
              <span className="text-xs text-white/30">{l}</span>
              <button onClick={() => copy(v)} className="text-xs mono flex items-center gap-1 active:scale-95 transition-transform">
                {v.length > 20 ? v.slice(0, 20) + '…' : v} <span className="text-white/20">📋</span>
              </button>
            </div>
          ))}
          <div className="flex justify-between items-center py-1">
            <span className="text-xs text-white/30">Luna ID</span>
            <button onClick={() => copy(user.luna_id)} className="text-xs mono active:scale-95 transition-transform">{user.luna_id} <span className="text-white/20">📋</span></button>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-xs text-white/30">Username</span>
            <button onClick={() => copy(`@${user.username}`)} className="text-xs active:scale-95 transition-transform">@{user.username} <span className="text-white/20">📋</span></button>
          </div>
        </div>
      </div>
    </div>
  );
}
