/**
 * Luna Bank — Telegram initData Verification
 *
 * POST /api/auth
 * Body: { initData: string }
 *
 * Validates Telegram WebApp initData using HMAC-SHA256.
 * Returns verified user data if valid.
 *
 * Security: This prevents spoofing — only Telegram can generate valid initData.
 */

import crypto from 'crypto';

const BOT_TOKEN = process.env.BOT_TOKEN || '8859860619:AAFwtBwOfpDUv565vUxZG32SI2Zo8BTolNU';

function verifyTelegramInitData(initData) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    // Remove hash from params
    params.delete('hash');

    // Sort params alphabetically and join
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // HMAC-SHA256 with "WebAppData" secret
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(BOT_TOKEN)
      .digest();

    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (computedHash !== hash) {
      return null; // Invalid signature
    }

    // Parse user data
    const userStr = params.get('user');
    if (!userStr) return null;

    const user = JSON.parse(userStr);

    return {
      user,
      auth_date: parseInt(params.get('auth_date') || '0'),
      query_id: params.get('query_id'),
      hash,
    };
  } catch (err) {
    console.error('[AUTH] Verification error:', err);
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { initData } = req.body || {};

  if (!initData) {
    return res.status(400).json({ ok: false, error: 'initData required' });
  }

  const result = verifyTelegramInitData(initData);

  if (!result) {
    return res.status(401).json({ ok: false, error: 'Invalid initData signature' });
  }

  // Check auth_date is not too old (5 minutes)
  const now = Math.floor(Date.now() / 1000);
  if (now - result.auth_date > 300) {
    return res.status(401).json({ ok: false, error: 'initData expired' });
  }

  return res.status(200).json({
    ok: true,
    user: result.user,
    auth_date: result.auth_date,
  });
}
