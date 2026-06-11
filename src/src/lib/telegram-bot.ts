/**
 * Luna Bank — Telegram Bot Notifications
 * Отправляет уведомления пользователю через Telegram Bot API
 */

const BOT_TOKEN = '8859860619:AAFwtBwOfpDUv565vUxZG32SI2Zo8BTolNU';
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

type NotifType = 'transfer' | 'deposit' | 'swap' | 'login' | 'kyc' | 'subscription' |
  'card' | 'escrow' | 'game_win' | 'earn' | 'security' | 'system' | 'rates';

interface TgNotification {
  chatId: number;
  type: NotifType;
  data: Record<string, any>;
}

function formatMessage(type: NotifType, data: Record<string, any>): string {
  const header = '🌙 *Luna Bank*\n';
  const line = '─────────────────';

  switch (type) {
    case 'transfer':
      return `${header}${line}\n📤 *Перевод выполнен*\n\n` +
        `💰 Сумма: \`◎${data.amount}\` LNC\n` +
        `👤 Получатель: @${data.recipient}\n` +
        `💳 Со счёта: ${data.fromAccount || '—'}\n` +
        `📝 Комиссия: \`◎${data.fee || '0'}\`\n` +
        `🆔 TX: \`${data.txId || '—'}\`\n` +
        `${line}\n⏰ ${new Date().toLocaleString('ru-RU')}`;

    case 'deposit':
      return `${header}${line}\n📥 *Пополнение*\n\n` +
        `💰 Сумма: \`◎${data.amount}\` LNC\n` +
        `💳 Счёт: ${data.account || '—'}\n` +
        `📋 Способ: ${data.method || 'TON Wallet'}\n` +
        `${line}\n✅ Зачислено на баланс`;

    case 'swap':
      return `${header}${line}\n💱 *Обмен выполнен*\n\n` +
        `📤 Отдано: \`${data.fromAmount} ${data.fromCurrency}\`\n` +
        `📥 Получено: \`${data.toAmount} ${data.toCurrency}\`\n` +
        `📊 Курс: \`1 ${data.fromCurrency} = ${data.rate} ${data.toCurrency}\`\n` +
        `💰 Комиссия: \`${data.fee || '0'}\`\n` +
        `${line}\n⏰ ${new Date().toLocaleString('ru-RU')}`;

    case 'login':
      return `${header}${line}\n🔐 *Вход в аккаунт*\n\n` +
        `✅ Успешная авторизация\n` +
        `📱 Устройство: Telegram WebApp\n` +
        `⏰ ${new Date().toLocaleString('ru-RU')}\n` +
        `${line}\n⚠️ Если это не вы — смените PIN`;

    case 'kyc':
      return `${header}${line}\n🔐 *KYC Верификация*\n\n` +
        `📋 Статус: ${data.status === 'pending' ? '⏳ На проверке' : data.status === 'approved' ? '✅ Одобрено' : '❌ Отклонено'}\n` +
        (data.status === 'approved' ? `🚀 Лимиты: до $50,000/мес\n` : '') +
        `${line}\n⏰ ${new Date().toLocaleString('ru-RU')}`;

    case 'subscription':
      return `${header}${line}\n⭐ *Подписка активирована*\n\n` +
        `📦 Тариф: *${data.plan}*\n` +
        `💰 Цена: $${data.price}/мес\n` +
        `📊 Комиссия: ${data.commission}%\n` +
        `💎 Кэшбэк: ${data.cashback}%\n` +
        `${line}\n✅ Действует до ${data.expires || '—'}`;

    case 'card':
      return `${header}${line}\n💳 *Карта выпущена*\n\n` +
        `📋 Тип: ${data.cardType}\n` +
        `🎨 Дизайн: ${data.design}\n` +
        `🔢 Номер: •••• ${data.lastFour}\n` +
        `${line}\n✅ Карта готова к использованию`;

    case 'escrow':
      const escStatus: Record<string, string> = {
        funded: '💰 Средства заморожены',
        delivered: '📦 Товар доставлен',
        completed: '✅ Сделка завершена',
        disputed: '⚠️ Открыт спор',
        cancelled: '❌ Сделка отменена',
      };
      return `${header}${line}\n🔒 *Гарант-сервис*\n\n` +
        `📝 Сделка: ${data.title}\n` +
        `💰 Сумма: \`◎${data.amount}\` LNC\n` +
        `📋 Статус: ${escStatus[data.status] || data.status}\n` +
        `👤 Продавец: @${data.seller}\n` +
        `${line}\n⏰ ${new Date().toLocaleString('ru-RU')}`;

    case 'game_win':
      return `${header}${line}\n🎮 *Выигрыш!*\n\n` +
        `🎰 Игра: ${data.game}\n` +
        `💰 Выигрыш: \`+◎${data.amount}\` LNC\n` +
        `${line}\n🎉 Поздравляем!`;

    case 'earn':
      return `${header}${line}\n💎 *Earn / Вклады*\n\n` +
        `📦 Продукт: ${data.product}\n` +
        `💰 Сумма: \`◎${data.amount}\` ${data.currency || 'LNC'}\n` +
        `📊 Ставка: ${data.apy}% годовых\n` +
        `📋 Действие: ${data.action === 'open' ? '🔓 Вклад открыт' : '💰 Вклад закрыт (+◎' + (data.earned || 0) + ')'}\n` +
        `${line}\n⏰ ${new Date().toLocaleString('ru-RU')}`;

    case 'security':
      return `${header}${line}\n🚨 *Безопасность*\n\n` +
        `⚠️ ${data.message}\n` +
        `📱 Действие: ${data.action || '—'}\n` +
        `${line}\n⏰ ${new Date().toLocaleString('ru-RU')}\n` +
        `\n❗ Если это не вы — немедленно смените PIN`;

    case 'rates':
      return `${header}${line}\n📊 *Курсы криптовалют*\n\n` +
        `💎 TON: \`$${data.TON}\` ${data.TON_change || ''}\n` +
        `₿ BTC: \`$${data.BTC}\` ${data.BTC_change || ''}\n` +
        `Ξ ETH: \`$${data.ETH}\` ${data.ETH_change || ''}\n` +
        `💵 USDT: \`$${data.USDT}\`\n` +
        `◎ LNC: \`$${data.LNC}\`\n` +
        `${line}\n⏰ ${new Date().toLocaleString('ru-RU')}`;

    case 'system':
      return `${header}${line}\n🔔 *Уведомление*\n\n` +
        `${data.message || data.title || '—'}\n` +
        `${line}\n⏰ ${new Date().toLocaleString('ru-RU')}`;

    default:
      return `${header}${line}\n🔔 ${data.message || '—'}`;
  }
}

/**
 * Send notification to Telegram user via Bot API
 */
export async function sendTgNotification(notif: TgNotification): Promise<boolean> {
  const text = formatMessage(notif.type, notif.data);

  try {
    const res = await fetch(`${API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: notif.chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });

    const result = await res.json();
    if (!result.ok) {
      console.warn('Telegram notification failed:', result.description);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Telegram notification error:', err);
    return false;
  }
}

/**
 * Shortcut: send notification to current user
 */
export function notifyUser(telegramId: number, type: NotifType, data: Record<string, any>) {
  // Fire and forget — don't block UI
  sendTgNotification({ chatId: telegramId, type, data }).catch(() => {});
}

/**
 * Send daily rates update
 */
export function sendRatesUpdate(telegramId: number, rates: Record<string, number>) {
  notifyUser(telegramId, 'rates', {
    TON: rates.TON?.toFixed(2) || '6.85',
    BTC: rates.BTC?.toLocaleString() || '71,250',
    ETH: rates.ETH?.toLocaleString() || '3,820',
    USDT: '1.00',
    LNC: '0.05',
    TON_change: '📈 +5.2%',
    BTC_change: '📈 +2.1%',
    ETH_change: '📉 -1.3%',
  });
}
