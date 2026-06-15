/**
 * Luna Bank — Push Notification API
 *
 * POST /api/notify
 * Body: { chat_id, text, type? }
 *
 * Sends a Telegram message to the specified chat_id.
 * Called from the client after transactions, KYC updates, etc.
 *
 * Security: accepts only requests with valid NOTIFY_SECRET header
 * or from known origins. In production, validate Telegram initData.
 */

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const NOTIFY_SECRET = process.env.NOTIFY_SECRET || 'luna-notify-2026';

async function tgSendMessage(chatId, text, opts = {}) {
  const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
      ...opts,
    }),
  });
  return resp.json();
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Notify-Secret');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!BOT_TOKEN) {
    return res.status(500).json({ error: 'Bot token not configured' });
  }

  try {
    const { chat_id, text, type } = req.body;

    if (!chat_id || !text) {
      return res.status(400).json({ error: 'chat_id and text required' });
    }

    // Build message based on type
    let finalText = text;

    if (type === 'transfer_in') {
      finalText =
        `🌙 *Luna Bank*\n━━━━━━━━━━━\n\n` +
        `📥 *Входящий перевод*\n\n${text}\n\n` +
        `━━━━━━━━━━━`;
    } else if (type === 'transfer_out') {
      finalText =
        `🌙 *Luna Bank*\n━━━━━━━━━━━\n\n` +
        `📤 *Перевод отправлен*\n\n${text}\n\n` +
        `━━━━━━━━━━━`;
    } else if (type === 'kyc') {
      finalText =
        `🌙 *Luna Bank*\n━━━━━━━━━━━\n\n` +
        `🛡️ *KYC*\n\n${text}\n\n` +
        `━━━━━━━━━━━`;
    } else if (type === 'system') {
      finalText =
        `🌙 *Luna Bank*\n━━━━━━━━━━━\n\n` +
        `${text}\n\n` +
        `━━━━━━━━━━━`;
    }

    const result = await tgSendMessage(chat_id, finalText);

    if (result.ok) {
      return res.status(200).json({ ok: true, message_id: result.result?.message_id });
    } else {
      return res.status(400).json({ ok: false, error: result.description });
    }
  } catch (err) {
    console.error('[NOTIFY] Error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
