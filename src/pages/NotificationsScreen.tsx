import React from 'react';
import { useStore } from '../lib/store';
import { timeAgo, haptic } from '../lib/utils';
import { dbMarkNotifRead } from '../lib/db';
import { ArrowLeftIcon, SendIcon, DownloadIcon, BellIcon, StarIcon } from '../components/Icons';

const TYPE_ICONS: Record<string, React.ComponentType<any>> = {
  transfer: SendIcon,
  deposit: DownloadIcon,
  system: BellIcon,
  promo: StarIcon,
};

export default function NotificationsScreen() {
  const { notifs, readNotif, go } = useStore();

  const handleRead = (id: string) => {
    haptic('light');
    readNotif(id);
    dbMarkNotifRead(id).catch(() => {});
  };

  return (
    <div className="h-full overflow-y-auto pb-24 safe-top">
      {/* Header */}
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('home')} className="text-white/50">
          <ArrowLeftIcon size={20} />
        </button>
        <h1 className="font-bold flex-1">Уведомления</h1>
      </div>

      <div className="px-5 mt-4">
        {notifs.length === 0 ? (
          /* Empty state */
          <div className="text-center py-20 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mx-auto mb-4">
              <BellIcon size={28} color="rgba(255,255,255,0.3)" />
            </div>
            <p className="text-white/35 font-medium">Нет уведомлений</p>
            <p className="text-xs text-white/20 mt-1">
              Здесь будут появляться переводы, пополнения и другие события
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifs.map((notif, i) => {
              const Icon = TYPE_ICONS[notif.type] || BellIcon;
              return (
                <button
                  key={notif.id}
                  onClick={() => handleRead(notif.id)}
                  className={`
                    w-full glass p-4 flex items-start gap-3 text-left
                    animate-slide-up transition-all
                    ${notif.read ? 'opacity-50' : ''}
                  `}
                  style={{ animationDelay: `${i * 0.03}s` }}
                >
                  {/* Icon */}
                  <div className={`
                    w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                    ${notif.type === 'transfer' ? 'bg-blue-500/10' :
                      notif.type === 'deposit' ? 'bg-emerald-500/10' :
                      notif.type === 'promo' ? 'bg-yellow-500/10' :
                      'bg-white/5'}
                  `}>
                    <Icon
                      size={18}
                      color={
                        notif.type === 'transfer' ? '#60a5fa' :
                        notif.type === 'deposit' ? '#34d399' :
                        notif.type === 'promo' ? '#fbbf24' :
                        'rgba(255,255,255,0.4)'
                      }
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{notif.title}</p>
                    <p className="text-[11px] text-white/30 mt-0.5 truncate">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-white/20 mt-1">
                      {timeAgo(notif.created_at)}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!notif.read && (
                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
