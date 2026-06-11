/**
 * Centralized notification dispatcher
 * Sends both: in-app notification (Supabase) + Telegram bot message
 */

import { useStore, uid } from './store';
import { dbCreateNotification } from './sync';
import { notifyUser, sendRatesUpdate } from './telegram-bot';

type NotifyParams = {
  userId: number;
  title: string;
  message: string;
  type: 'transfer' | 'deposit' | 'system' | 'promo';
  tgType: string;
  tgData: Record<string, any>;
};

/**
 * Send notification everywhere:
 * 1. Local store (instant UI update)
 * 2. Supabase DB (persistence)
 * 3. Telegram Bot (push notification)
 */
export function notify(params: NotifyParams) {
  const { userId, title, message, type, tgType, tgData } = params;

  // 1. Local store
  useStore.getState().addNotif({
    id: uid(),
    title,
    message,
    type,
    read: false,
    created_at: new Date().toISOString(),
  });

  // 2. Supabase (async, don't block)
  dbCreateNotification({
    user_id: userId,
    title,
    message,
    type,
  }).catch(() => {});

  // 3. Telegram Bot (async, don't block)
  notifyUser(userId, tgType as any, tgData);
}

// ===== CONVENIENCE FUNCTIONS =====

export function notifyTransfer(userId: number, amount: number, recipient: string, fee: number, txId: string) {
  notify({
    userId,
    title: '✅ Перевод',
    message: `◎${amount} → @${recipient}`,
    type: 'transfer',
    tgType: 'transfer',
    tgData: { amount, recipient, fee, txId },
  });
}

export function notifyDeposit(userId: number, amount: number, account: string) {
  notify({
    userId,
    title: '📥 Пополнение',
    message: `◎${amount} зачислено`,
    type: 'deposit',
    tgType: 'deposit',
    tgData: { amount, account },
  });
}

export function notifySwap(userId: number, fromAmount: number, fromCurrency: string, toAmount: number, toCurrency: string, rate: number) {
  notify({
    userId,
    title: '💱 Обмен',
    message: `${fromAmount} ${fromCurrency} → ${toAmount.toFixed(6)} ${toCurrency}`,
    type: 'system',
    tgType: 'swap',
    tgData: { fromAmount, fromCurrency, toAmount: toAmount.toFixed(6), toCurrency, rate: rate.toFixed(6) },
  });
}

export function notifyLogin(userId: number) {
  notifyUser(userId, 'login', {});
}

export function notifyKYC(userId: number, status: string) {
  notify({
    userId,
    title: '🔐 KYC',
    message: status === 'pending' ? 'Заявка отправлена' : status === 'approved' ? 'Верификация пройдена!' : 'Отклонено',
    type: 'system',
    tgType: 'kyc',
    tgData: { status },
  });
}

export function notifySubscription(userId: number, plan: string, price: number, commission: number, cashback: number) {
  notify({
    userId,
    title: '⭐ Подписка',
    message: `${plan} активирована`,
    type: 'system',
    tgType: 'subscription',
    tgData: { plan, price, commission, cashback },
  });
}

export function notifyCard(userId: number, cardType: string, design: string, lastFour: string) {
  notify({
    userId,
    title: '💳 Карта',
    message: `${cardType} карта выпущена`,
    type: 'system',
    tgType: 'card',
    tgData: { cardType, design, lastFour },
  });
}

export function notifyEscrow(userId: number, title: string, amount: number, seller: string, status: string) {
  notify({
    userId,
    title: '🔒 Гарант',
    message: `${title} — ${status}`,
    type: 'system',
    tgType: 'escrow',
    tgData: { title, amount, seller, status },
  });
}

export function notifyGameWin(userId: number, game: string, amount: number) {
  notify({
    userId,
    title: '🎮 Выигрыш!',
    message: `+◎${amount} в ${game}`,
    type: 'system',
    tgType: 'game_win',
    tgData: { game, amount },
  });
}

export function notifyEarn(userId: number, product: string, amount: number, apy: number, action: 'open' | 'close', earned?: number) {
  notify({
    userId,
    title: '💎 Вклад',
    message: action === 'open' ? `Открыт: ◎${amount} под ${apy}%` : `Закрыт: +◎${earned || 0}`,
    type: 'system',
    tgType: 'earn',
    tgData: { product, amount, apy, action, earned },
  });
}

export function notifySecurity(userId: number, message: string, action: string) {
  notify({
    userId,
    title: '🚨 Безопасность',
    message,
    type: 'system',
    tgType: 'security',
    tgData: { message, action },
  });
}

export function notifyRates(userId: number) {
  sendRatesUpdate(userId, { TON: 6.85, BTC: 71250, ETH: 3820 });
}
