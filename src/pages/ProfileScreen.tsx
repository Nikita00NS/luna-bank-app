import React, { useState } from 'react';
import { useStore, type Page } from '../lib/store';
import { haptic, shortAddr } from '../lib/utils';
import {
  UserIcon, StarIcon, WalletIcon, LinkIcon, BellIcon,
  LockIcon, MessageIcon, ShieldIcon, SettingsIcon,
  ChevronRightIcon, QrCodeIcon, PaletteIcon, PhoneIcon,
} from '../components/Icons';
import { isOwner } from '../lib/admin';
import { requestContact, formatPhone, showAlert } from '../lib/telegram';
import { dbSavePhone } from '../lib/db';

export default function ProfileScreen() {
  const { user, tonWallet, go, logout, accounts, patchUser } = useStore();
  const [linkingPhone, setLinkingPhone] = useState(false);

  if (!user) return null;

  const xpMax = user.level * 100;
  const xpPercent = Math.min((user.xp / xpMax) * 100, 100);

  // ===== Link phone via Telegram requestContact =====
  const handleLinkPhone = async () => {
    setLinkingPhone(true);
    haptic('medium');

    const contact = await requestContact();
    if (contact) {
      // Save to Supabase & local store
      await dbSavePhone(user.telegram_id, contact.phone_number);
      patchUser({ phone_number: contact.phone_number });
      haptic('success');
      await showAlert(`✅ Номер ${formatPhone(contact.phone_number)} привязан!`);
    }
    setLinkingPhone(false);
  };

  // Menu items with SVG icons
  const menuItems: { icon: React.ComponentType<any>; label: string; desc: string; page: Page; action?: () => void }[] = [
    { icon: StarIcon, label: 'Подписка', desc: user.subscription.toUpperCase(), page: 'subscription' },
    { icon: WalletIcon, label: 'Счета', desc: `${accounts.length}`, page: 'cards' },
    { icon: QrCodeIcon, label: 'Мой QR', desc: user.luna_id, page: 'qr' },
    { icon: LinkIcon, label: 'TON-кошелёк', desc: tonWallet ? shortAddr(tonWallet) : 'Не подключён', page: 'ton-connect' },
    { icon: BellIcon, label: 'Уведомления', desc: '', page: 'notifications' },
    { icon: LockIcon, label: 'Безопасность', desc: '', page: 'settings' },
    { icon: MessageIcon, label: 'Поддержка', desc: '', page: 'chat' },
    { icon: PaletteIcon, label: 'Оформление', desc: '', page: 'themes' },
    { icon: ShieldIcon, label: 'FAQ', desc: '', page: 'faq' },
  ];

  // Admin panel — ONLY for owner (Telegram ID: 7320418026)
  if (isOwner(user.telegram_id)) {
    menuItems.push({ icon: SettingsIcon, label: 'Админ-панель', desc: 'Owner', page: 'admin' });
  }

  return (
    <div className="h-full overflow-y-auto pb-24 safe-top">
      {/* Header */}
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('home')} className="text-white/50 text-sm">
          ← Назад
        </button>
        <h1 className="font-bold flex-1">Профиль</h1>
      </div>

      {/* User Card */}
      <div className="px-5 mt-4 animate-slide-up">
        <div className="glass-accent p-5 flex items-center gap-4">
          {user.photo_url ? (
            <img src={user.photo_url} alt="" className="w-16 h-16 rounded-full" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-2xl font-bold">
              {user.first_name[0]}
            </div>
          )}
          <div className="flex-1">
            <p className="font-extrabold text-lg">
              {user.first_name} {user.last_name}
            </p>
            <p className="text-sm text-white/35">@{user.username}</p>
            <p className="text-xs text-white/20">{user.luna_id}</p>
          </div>
        </div>
      </div>

      {/* Phone Link Card */}
      <div className="px-5 mt-3 animate-slide-up" style={{ animationDelay: '0.05s' }}>
        {user.phone_number ? (
          <div className="glass p-4 flex items-center gap-3 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <PhoneIcon size={18} color="#10b981" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Телефон привязан</p>
              <p className="text-xs text-white/35 mono">{formatPhone(user.phone_number)}</p>
            </div>
            <span className="text-emerald-400 text-xs">✓</span>
          </div>
        ) : (
          <button
            onClick={handleLinkPhone}
            disabled={linkingPhone}
            className="w-full glass p-4 flex items-center gap-3 rounded-2xl active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <PhoneIcon size={18} color="#3b82f6" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">Привязать телефон</p>
              <p className="text-[10px] text-white/25">Для переводов по номеру телефона</p>
            </div>
            {linkingPhone ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-blue-400 rounded-full animate-spin" />
            ) : (
              <ChevronRightIcon size={16} color="rgba(255,255,255,0.2)" />
            )}
          </button>
        )}
      </div>

      {/* Stats Row */}
      <div className="px-5 mt-4 flex gap-3">
        {/* Level */}
        <div className="flex-1 glass p-3">
          <p className="text-[10px] text-white/35 uppercase tracking-wide">Level</p>
          <p className="font-extrabold text-lg">LVL {user.level}</p>
          <div className="h-1.5 bg-white/[0.06] rounded-full mt-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
          <p className="text-[9px] text-white/20 mt-1 mono">
            {user.xp}/{xpMax} XP
          </p>
        </div>

        {/* Cashback */}
        <div className="flex-1 glass p-3">
          <p className="text-[10px] text-white/35 uppercase tracking-wide">Кэшбэк</p>
          <p className="font-extrabold text-lg">
            {user.subscription === 'free' ? '0%' : user.subscription === 'plus' ? '1%' : '3%'}
          </p>
          <p className="text-[9px] text-white/20 mt-1">
            {user.subscription.toUpperCase()}
          </p>
        </div>

        {/* KYC */}
        <div className="flex-1 glass p-3">
          <p className="text-[10px] text-white/35 uppercase tracking-wide">KYC</p>
          <p className="font-bold text-sm mt-1">
            {user.kyc_status === 'none' ? '❌' :
             user.kyc_status === 'pending' ? '⏳' :
             user.kyc_status === 'approved' ? '✅' : '🚫'}
          </p>
          <button
            onClick={() => go('kyc')}
            className="text-[9px] text-white/25 mt-1"
          >
            {user.kyc_status === 'none' ? 'Пройти →' : user.kyc_status}
          </button>
        </div>
      </div>

      {/* Menu */}
      <div className="px-5 mt-6 space-y-0.5">
        {menuItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <button
              key={i}
              onClick={() => {
                haptic('light');
                if (item.action) {
                  item.action();
                } else {
                  go(item.page);
                }
              }}
              className="
                w-full flex items-center gap-4 py-3.5 px-1
                border-b border-white/[0.04]
                active:bg-white/[0.03] transition-colors
              "
            >
              <div className="w-8 flex items-center justify-center">
                <Icon size={20} color="rgba(255,255,255,0.4)" />
              </div>
              <span className="flex-1 text-left text-[14px]">{item.label}</span>
              {item.desc && (
                <span className="text-xs text-white/20">{item.desc}</span>
              )}
              <ChevronRightIcon size={16} color="rgba(255,255,255,0.15)" />
            </button>
          );
        })}
      </div>

      {/* Logout */}
      <div className="px-5 mt-6 mb-8">
        <button
          onClick={() => {
            haptic('medium');
            logout();
          }}
          className="
            w-full glass py-4 text-red-400 font-semibold
            active:scale-[0.98] transition-transform
          "
        >
          Выйти из аккаунта
        </button>
      </div>
    </div>
  );
}
