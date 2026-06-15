/**
 * Luna Bank — 2FA OTP via Telegram Bot
 *
 * POST /api/otp/send — sends 6-digit code to user via bot
 * POST /api/otp/verify — verifies the code
 *
 * Codes stored in memory (serverless = ephemeral).
 * For production, use Redis or Supabase table.
 */

const BOT_TOKEN = process.env.BOT_TOKEN || '8859860619:AAFwtBwOfpDUv565vUxZG32SI2Zo8BTolNU';

// In-memory OTP store (per serverless instance — OK for demo)
// Production: use Supabase table or Redis
const otpStore = new Map();

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendTelegramMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    }),
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, chat_id, code } = req.body || {};

  if (action === 'send') {
    if (!chat_id) return res.status(400).json({ error: 'chat_id required' });

    const otp = generateOTP();
    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes

    otpStore.set(String(chat_id), { code: otp, expires, attempts: 0 });

    await sendTelegramMessage(chat_id,
      `🌙 *Luna Bank — Код подтверждения*\n━━━━━━━━━━━\n\n` +
      `🔐 Ваш код: \`${otp}\`\n\n` +
      `⏳ Действителен 5 минут.\n` +
      `⚠️ Не сообщайте код третьим лицам!\n\n` +
      `━━━━━━━━━━━`
    );

    return res.status(200).json({ ok: true, message: 'OTP sent' });
  }

  if (action === 'verify') {
    if (!chat_id || !code) return res.status(400).json({ error: 'chat_id and code required' });

    const stored = otpStore.get(String(chat_id));

    if (!stored) {
      return res.status(400).json({ ok: false, error: 'No OTP found. Request a new one.' });
    }

    if (Date.now() > stored.expires) {
      otpStore.delete(String(chat_id));
      return res.status(400).json({ ok: false, error: 'OTP expired' });
    }

    if (stored.attempts >= 3) {
      otpStore.delete(String(chat_id));
      return res.status(400).json({ ok: false, error: 'Too many attempts' });
    }

    stored.attempts++;

    if (stored.code !== String(code)) {
      return res.status(400).json({ ok: false, error: 'Wrong code', attemptsLeft: 3 - stored.attempts });
    }

    // Success — delete OTP
    otpStore.delete(String(chat_id));

    return res.status(200).json({ ok: true, verified: true });
  }

  return res.status(400).json({ error: 'Invalid action. Use "send" or "verify".' });
}
