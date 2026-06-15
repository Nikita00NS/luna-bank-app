/**
 * Luna Bank — Bot Notification Client
 *
 * Sends push notifications to users via Telegram Bot.
 * Calls /api/notify serverless function on Vercel.
 * Bot token is NEVER exposed to the client.
 */

const NOTIFY_URL = 'https://luna-bank-app.vercel.app/api/notify';

type NotifyType = 'transfer_in' | 'transfer_out' | 'kyc' | 'system';

interface NotifyResult {
  ok: boolean;
  message_id?: number;
  error?: string;
}

/**
 * Send a push notification via Telegram Bot
 */
async function sendBotNotification(
  chatId: number,
  text: string,
  type: NotifyType = 'system'
): Promise<NotifyResult> {
  try {
    const resp = await fetch(NOTIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chat_id: chatId, text, type }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      return { ok: false, error: err.error || `HTTP ${resp.status}` };
    }

    return await resp.json();
  } catch (err: any) {
    console.warn('[BOT] Notification failed:', err.message);
    return { ok: false, error: err.message };
  }
}

// ===== Typed notification helpers =====

/**
 * Notify recipient about incoming transfer
 */
export function notifyTransferReceived(
  recipientTgId: number,
  amount: number,
  currency: string,
  senderName: string,
  note?: string
) {
  const text =
    `💰 Сумма: \`${amount} ${currency}\`\n` +
    `👤 От: *${senderName}*` +
    (note ? `\n📝 ${note}` : '') +
    `\n\n✅ Зачислено на баланс`;

  return sendBotNotification(recipientTgId, text, 'transfer_in');
}

/**
 * Notify sender about completed transfer
 */
export function notifyTransferSent(
  senderTgId: number,
  amount: number,
  currency: string,
  recipientName: string
) {
  const text =
    `💰 Сумма: \`${amount} ${currency}\`\n` +
    `👤 Кому: *${recipientName}*\n\n` +
    `✅ Перевод выполнен`;

  return sendBotNotification(senderTgId, text, 'transfer_out');
}

/**
 * Notify about KYC status change
 */
export function notifyKycStatus(
  userId: number,
  status: 'pending' | 'approved' | 'rejected'
) {
  const messages: Record<string, string> = {
    pending: '⏳ *KYC на проверке*\nОбычно 1-2 рабочих дня.',
    approved: '✅ *KYC одобрен!*\n🚀 Лимиты увеличены до $50,000/мес.',
    rejected: '❌ *KYC отклонён*\nПопробуйте снова с корректными данными.',
  };

  return sendBotNotification(userId, messages[status] || '', 'kyc');
}

/**
 * Notify about subscription change
 */
export function notifySubscription(
  userId: number,
  plan: string,
  price: number
) {
  const text =
    `⭐ *Подписка ${plan} активирована!*\n` +
    `💰 Списано: $${price.toFixed(2)}/мес\n\n` +
    `Спасибо за доверие! 🎉`;

  return sendBotNotification(userId, text, 'system');
}

/**
 * Admin: send custom notification
 */
export function notifyCustom(userId: number, text: string) {
  return sendBotNotification(userId, text, 'system');
}
