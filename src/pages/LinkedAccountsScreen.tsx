import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { haptic } from '../lib/utils';
import { dbSavePhone, dbUpdateUser } from '../lib/db';
import { ArrowLeftIcon } from '../components/Icons';
import { requestContact, formatPhone, isTelegramEnv } from '../lib/telegram';

export default function LinkedAccountsScreen() {
  const { user, go, patchUser } = useStore();
  const [linking, setLinking] = useState('');
  if (!user) return null;

  const inTG = isTelegramEnv();
  const tgLinked = !!user.username && user.username !== 'user_' + user.telegram_id;
  const phoneLinked = !!user.phone_number;

  const accounts = [
    {
      id: 'telegram',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="#2AABEE"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>,
      name: 'Telegram',
      linked: tgLinked,
      detail: tgLinked ? `@${user.username}` : 'Не привязан',
      color: 'bg-[#2AABEE]/15',
    },
    {
      id: 'phone',
      icon: <span className="text-xl">📱</span>,
      name: 'Телефон',
      linked: phoneLinked,
      detail: phoneLinked ? formatPhone(user.phone_number!) : 'Не привязан',
      color: 'bg-emerald-500/15',
    },
    {
      id: 'ton',
      icon: <span className="text-xl">💎</span>,
      name: 'TON Wallet',
      linked: !!user.phone_number, // placeholder
      detail: 'Подключите в разделе TON Connect',
      color: 'bg-blue-500/15',
    },
    {
      id: 'email',
      icon: <span className="text-xl">📧</span>,
      name: 'Email',
      linked: false,
      detail: 'Скоро',
      color: 'bg-purple-500/15',
    },
    {
      id: 'google',
      icon: <span className="text-xl">🔵</span>,
      name: 'Google',
      linked: false,
      detail: 'Скоро',
      color: 'bg-red-500/15',
    },
    {
      id: 'apple',
      icon: <span className="text-xl">🍎</span>,
      name: 'Apple ID',
      linked: false,
      detail: 'Скоро',
      color: 'bg-white/10',
    },
  ];

  const linkPhone = async () => {
    setLinking('phone');
    haptic('medium');
    const contact = await requestContact();
    if (contact) {
      await dbSavePhone(user.telegram_id, contact.phone_number);
      patchUser({ phone_number: contact.phone_number });
      haptic('success');
    }
    setLinking('');
  };

  const handleLink = (id: string) => {
    haptic('light');
    if (id === 'phone') linkPhone();
    else if (id === 'telegram') {
      if (!inTG) window.open('https://t.me/LunaBankBot', '_blank');
    }
    else if (id === 'ton') go('ton-connect');
  };

  return (
    <div className="h-full overflow-y-auto pb-24 safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('profile')} className="text-white/50"><ArrowLeftIcon size={20} /></button>
        <h1 className="font-bold flex-1">Привязанные аккаунты</h1>
      </div>

      <div className="px-5 mt-4 space-y-2">
        {accounts.map((acc) => (
          <button
            key={acc.id}
            onClick={() => !acc.linked && handleLink(acc.id)}
            disabled={acc.linked || acc.detail === 'Скоро'}
            className={`w-full glass p-4 flex items-center gap-4 rounded-2xl active:scale-[0.98] transition-all ${acc.linked ? 'opacity-100' : 'opacity-70'}`}
          >
            <div className={`w-11 h-11 rounded-xl ${acc.color} flex items-center justify-center`}>
              {acc.icon}
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold">{acc.name}</p>
              <p className="text-xs text-white/30">{acc.detail}</p>
            </div>
            {acc.linked ? (
              <span className="text-emerald-400 text-sm font-bold">✓</span>
            ) : acc.detail === 'Скоро' ? (
              <span className="text-white/15 text-xs">Скоро</span>
            ) : (
              <span className="text-blue-400 text-xs font-medium">Привязать</span>
            )}
          </button>
        ))}
      </div>

      <div className="px-5 mt-6">
        <div className="glass p-4 rounded-2xl">
          <p className="text-xs text-white/30 mb-2">💡 Зачем привязывать?</p>
          <ul className="space-y-1.5 text-xs text-white/50">
            <li>• Вход с любого устройства</li>
            <li>• Восстановление аккаунта</li>
            <li>• Переводы по телефону</li>
            <li>• Уведомления в Telegram</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
