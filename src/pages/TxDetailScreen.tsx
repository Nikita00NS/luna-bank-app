import React from 'react';
import { useStore } from '../lib/store';
import { formatMoney, balanceInUsd, haptic } from '../lib/utils';
import { ArrowLeftIcon } from '../components/Icons';
import AnimatedEmoji from '../components/AnimatedEmoji';
import LncIcon from '../components/LncIcon';

const TX_ICONS: Record<string, string> = {
  transfer: '📤', deposit: '📥', withdrawal: '📤',
  subscription: '⭐', job: '💼', business: '🏪', card: '💳',
};
const TX_LABELS: Record<string, string> = {
  transfer: 'Перевод', deposit: 'Пополнение', withdrawal: 'Оплата/Платёж',
  subscription: 'Подписка', job: 'Заработок', business: 'Бизнес', card: 'Карта',
};
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  completed: { label: 'Выполнено', color: 'text-emerald-400 bg-emerald-400/10' },
  pending: { label: 'В обработке', color: 'text-yellow-400 bg-yellow-400/10' },
  failed: { label: 'Ошибка', color: 'text-red-400 bg-red-400/10' },
};

export default function TxDetailScreen() {
  const { user, txs, selTxId, go } = useStore();
  if (!user) return null;

  const tx = txs.find((t) => t.id === selTxId);
  if (!tx) {
    return (
      <div className="h-full flex flex-col bg-black safe-top">
        <div className="px-5 pt-4 pb-2 flex items-center gap-4">
          <button onClick={() => go('history')} className="text-white/50"><ArrowLeftIcon size={20} /></button>
          <h1 className="font-bold flex-1">Операция</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-white/30">Операция не найдена</p>
        </div>
      </div>
    );
  }

  const isOut = tx.from_user_id === user.telegram_id;
  const usdVal = balanceInUsd(tx.amount, tx.currency);
  const feeUsd = balanceInUsd(tx.fee, tx.currency);
  const status = STATUS_LABELS[tx.status] || STATUS_LABELS.completed;
  const date = new Date(tx.created_at);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    haptic('light');
  };

  // Generate receipt-like detail rows
  const details: [string, string][] = [
    ['📋 Тип', TX_LABELS[tx.type] || tx.type],
    ['📅 Дата', date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })],
    ['🕐 Время', date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })],
    ['💰 Сумма', `${tx.amount} ${tx.currency}`],
    ['💵 В USD', formatMoney(usdVal, 'USD')],
  ];

  if (tx.fee > 0) {
    details.push(['📊 Комиссия', `${tx.fee} ${tx.currency} (${formatMoney(feeUsd, 'USD')})`]);
    details.push(['📋 Итого', `${(tx.amount + tx.fee).toFixed(2)} ${tx.currency}`]);
  }

  if (isOut) {
    details.push(['👤 Отправитель', 'Вы']);
    if (tx.to_user_id && tx.to_user_id !== user.telegram_id && tx.to_user_id !== 0) {
      details.push(['👤 Получатель', `ID: ${tx.to_user_id}`]);
    }
  } else {
    if (tx.from_user_id && tx.from_user_id !== 0) {
      details.push(['👤 Отправитель', `ID: ${tx.from_user_id}`]);
    }
    details.push(['👤 Получатель', 'Вы']);
  }

  if (tx.note) {
    details.push(['💬 Описание', tx.note]);
  }

  details.push(['🔗 ID транзакции', tx.id]);

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('history')} className="text-white/50"><ArrowLeftIcon size={20} /></button>
        <h1 className="font-bold flex-1">Детали операции</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {/* Hero */}
        <div className="mt-4 glass-accent p-6 rounded-2xl text-center animate-slide-up">
          {/* Status icon */}
          <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl ${
            isOut ? 'bg-red-500/10' : 'bg-emerald-500/10'
          }`}>
            {tx.status === 'completed' ? (
              <AnimatedEmoji type="success" size={48} loop={false} />
            ) : (
              <span>{TX_ICONS[tx.type] || '💰'}</span>
            )}
          </div>

          {/* Amount */}
          <p className={`text-3xl font-extrabold mono ${isOut ? 'text-red-400' : 'text-emerald-400'}`}>
            {isOut ? '-' : '+'}
            <LncIcon size={22} animate={false} />
            {tx.amount.toFixed(2)}
          </p>
          <p className="text-white/30 text-sm mt-1">
            {formatMoney(usdVal, 'USD')} · {tx.currency}
          </p>

          {/* Status badge */}
          <span className={`inline-block mt-3 text-xs px-3 py-1 rounded-full font-medium ${status.color}`}>
            {status.label}
          </span>
        </div>

        {/* Note card */}
        {tx.note && (
          <div className="mt-3 glass p-4 rounded-2xl animate-slide-up" style={{ animationDelay: '0.05s' }}>
            <p className="text-xs text-white/30 mb-1">Описание</p>
            <p className="text-sm text-white/70">{tx.note}</p>
          </div>
        )}

        {/* Detail rows */}
        <div className="mt-3 glass p-4 rounded-2xl space-y-3 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {details.map(([label, value], i) => {
            const isLast = i === details.length - 1;
            const isTxId = label.includes('ID транзакции');
            return (
              <div key={label} className={`flex justify-between items-start gap-3 ${
                !isLast ? 'pb-3 border-b border-white/[0.04]' : ''
              }`}>
                <span className="text-xs text-white/35 shrink-0">{label}</span>
                {isTxId ? (
                  <button
                    onClick={() => copy(value)}
                    className="text-[10px] mono text-white/40 truncate max-w-[180px] text-right active:scale-95"
                  >
                    {value.slice(0, 16)}… 📋
                  </button>
                ) : (
                  <span className="text-sm mono text-right truncate max-w-[200px]">{value}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Time info */}
        <div className="mt-3 glass p-4 rounded-2xl animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <div className="flex items-center gap-3 text-xs text-white/25">
            <span>🕐</span>
            <span>{date.toLocaleString('ru-RU', {
              day: 'numeric', month: 'long', year: 'numeric',
              hour: '2-digit', minute: '2-digit', second: '2-digit',
            })}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => copy(JSON.stringify(tx, null, 2))}
            className="flex-1 glass py-3 rounded-xl text-xs text-white/40 active:scale-95 transition-transform"
          >
            📋 Копировать данные
          </button>
          <button
            onClick={() => { haptic('light'); go('home'); }}
            className="flex-1 glass py-3 rounded-xl text-xs text-white/40 active:scale-95 transition-transform"
          >
            🏠 На главную
          </button>
        </div>
      </div>
    </div>
  );
}
