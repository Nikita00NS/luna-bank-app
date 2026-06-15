/**
 * Luna Bank — Telegram Bot Webhook Handler
 *
 * Deployed as Vercel Serverless Function at /api/bot
 * Handles: /start, /help, /balance, /id, /app
 *
 * Environment Variables (set in Vercel):
 *   BOT_TOKEN — Telegram Bot API token
 *   SUPABASE_URL — Supabase project URL
 *   SUPABASE_KEY — Supabase anon key
 */

const BOT_TOKEN = process.env.BOT_TOKEN || '8859860619:AAFwtBwOfpDUv565vUxZG32SI2Zo8BTolNU';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lffdzsbqnrjmhdneolrh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmZmR6c2JxbnJqbWhkbmVvbHJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NDQ5NjMsImV4cCI6MjA5NjMyMDk2M30.Sqa-diKgVKhPNEKEZYKNxFfkZIuPM5pXJxAZgddn_dc';
const APP_URL = 'https://t.me/LunaBankBot/app';

// ===== Telegram API helper =====

async function tgApi(method, body) {
  const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return resp.json();
}

async function sendMessage(chatId, text, opts = {}) {
  return tgApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
    ...opts,
  });
}

// ===== Supabase helper =====

async function supabaseGet(table, query) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
  const resp = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  return resp.json();
}

// ===== Command handlers =====

async function handleStart(chatId, user) {
  const name = user?.first_name || 'друг';

  const text =
    `🌙 *Luna Bank*\n` +
    `━━━━━━━━━━━\n\n` +
    `Привет, *${name}*! 👋\n\n` +
    `Добро пожаловать в *Luna Bank* — крипто-финансовую экосистему нового поколения.\n\n` +
    `🏦 Счета и переводы\n` +
    `💎 TON, BTC, ETH, USDT\n` +
    `💳 Виртуальные карты\n` +
    `🎮 Мини-игры и заработок\n` +
    `🤖 AI-ассистент\n\n` +
    `Нажмите кнопку ниже, чтобы открыть приложение 👇`;

  await sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🚀 Открыть Luna Bank', web_app: { url: 'https://luna-bank-app.vercel.app' } }],
        [{ text: '📖 Помощь', callback_data: 'help' }],
      ],
    },
  });
}

async function handleHelp(chatId) {
  const text =
    `🌙 *Luna Bank — Помощь*\n` +
    `━━━━━━━━━━━\n\n` +
    `*Команды:*\n` +
    `/start — Главное меню\n` +
    `/balance — Проверить баланс\n` +
    `/id — Ваш Telegram ID\n` +
    `/app — Открыть приложение\n` +
    `/help — Эта справка\n\n` +
    `*Контакты:*\n` +
    `📧 support@lunabank.app\n` +
    `💬 AI-чат внутри приложения\n\n` +
    `━━━━━━━━━━━\n` +
    `_Luna Bank v1.3_`;

  await sendMessage(chatId, text);
}

async function handleBalance(chatId, tgUserId) {
  try {
    // Get user from Supabase
    const users = await supabaseGet('users', `telegram_id=eq.${tgUserId}&select=username,first_name,subscription`);
    if (!users || users.length === 0) {
      await sendMessage(chatId,
        `🌙 *Luna Bank*\n━━━━━━━━━━━\n\n` +
        `Аккаунт не найден.\nОткройте приложение для регистрации.`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🚀 Открыть Luna Bank', web_app: { url: 'https://luna-bank-app.vercel.app' } }],
            ],
          },
        }
      );
      return;
    }

    // Get accounts
    const accounts = await supabaseGet('accounts', `user_id=eq.${tgUserId}&select=name,currency,balance`);

    let balanceText = '';
    let totalUsd = 0;
    const prices = { LNC: 0.05, TON: 6.85, BTC: 71250, ETH: 3820, USDT: 1 };

    if (accounts && accounts.length > 0) {
      for (const acc of accounts) {
        const bal = Number(acc.balance) || 0;
        const usd = bal * (prices[acc.currency] || 0);
        totalUsd += usd;
        balanceText += `  ${acc.name}: \`${bal.toFixed(2)} ${acc.currency}\` ($${usd.toFixed(2)})\n`;
      }
    } else {
      balanceText = '  _Нет открытых счетов_\n';
    }

    const text =
      `🌙 *Luna Bank — Баланс*\n` +
      `━━━━━━━━━━━\n\n` +
      `👤 *${users[0].first_name}* (@${users[0].username})\n` +
      `⭐ Подписка: ${users[0].subscription?.toUpperCase() || 'FREE'}\n\n` +
      `💰 *Счета:*\n` +
      balanceText + `\n` +
      `📊 *Итого:* \`$${totalUsd.toFixed(2)}\`\n` +
      `━━━━━━━━━━━`;

    await sendMessage(chatId, text);
  } catch (err) {
    await sendMessage(chatId, `❌ Ошибка при получении баланса.`);
    console.error('[BOT] Balance error:', err);
  }
}

async function handleId(chatId, tgUserId) {
  await sendMessage(chatId,
    `🌙 *Luna Bank*\n━━━━━━━━━━━\n\n` +
    `Ваш Telegram ID:\n\`${tgUserId}\`\n\n` +
    `━━━━━━━━━━━`
  );
}

async function handleCallback(chatId, data) {
  if (data === 'help') {
    await handleHelp(chatId);
  }
}

// ===== Main handler =====

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      bot: 'Luna Bank Bot',
      version: '1.3',
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const update = req.body;

    // Handle messages
    if (update.message) {
      const msg = update.message;
      const chatId = msg.chat.id;
      const text = msg.text || '';
      const user = msg.from;
      const tgUserId = user?.id;

      if (text === '/start' || text.startsWith('/start ')) {
        await handleStart(chatId, user);
      } else if (text === '/help') {
        await handleHelp(chatId);
      } else if (text === '/balance') {
        await handleBalance(chatId, tgUserId);
      } else if (text === '/id') {
        await handleId(chatId, tgUserId);
      } else if (text === '/app') {
        await sendMessage(chatId, '🌙 Нажмите кнопку ниже 👇', {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🚀 Открыть Luna Bank', web_app: { url: 'https://luna-bank-app.vercel.app' } }],
            ],
          },
        });
      } else {
        // Unknown command — respond with menu
        await sendMessage(chatId,
          `🌙 Используйте /help для списка команд\nили откройте приложение 👇`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🚀 Открыть Luna Bank', web_app: { url: 'https://luna-bank-app.vercel.app' } }],
              ],
            },
          }
        );
      }
    }

    // Handle callback queries
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message?.chat?.id;
      const data = cb.data;

      if (chatId && data) {
        await handleCallback(chatId, data);
      }

      // Answer callback to remove loading state
      await tgApi('answerCallbackQuery', {
        callback_query_id: cb.id,
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[BOT] Error:', err);
    return res.status(200).json({ ok: true }); // Always 200 to prevent retries
  }
}
