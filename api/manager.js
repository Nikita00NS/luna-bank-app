/**
 * Luna Bank — External Manager API
 *
 * REST API for integration with external management systems.
 * All endpoints require X-Manager-Key header.
 *
 * GET  /api/manager?action=stats       — dashboard stats
 * GET  /api/manager?action=users       — list all users
 * GET  /api/manager?action=user&id=TG_ID — user details + accounts
 * POST /api/manager { action: "set_balance", account_id, amount }
 * POST /api/manager { action: "send_notification", user_id, title, message }
 * POST /api/manager { action: "block_user", user_id }
 * POST /api/manager { action: "approve_kyc", user_id }
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lffdzsbqnrjmhdneolrh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmZmR6c2JxbnJqbWhkbmVvbHJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NDQ5NjMsImV4cCI6MjA5NjMyMDk2M30.Sqa-diKgVKhPNEKEZYKNxFfkZIuPM5pXJxAZgddn_dc';
const MANAGER_KEY = process.env.MANAGER_KEY || 'luna-manager-2026';
const BOT_TOKEN = process.env.BOT_TOKEN || '8859860619:AAFwtBwOfpDUv565vUxZG32SI2Zo8BTolNU';

async function supabaseQuery(path, options = {}) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });
  return resp.json();
}

async function sendTgMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Manager-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Auth check
  const key = req.headers['x-manager-key'] || req.query.key;
  if (key !== MANAGER_KEY) {
    return res.status(401).json({ error: 'Invalid manager key' });
  }

  const action = req.query.action || req.body?.action;

  try {
    // ===== GET: Stats =====
    if (action === 'stats') {
      const users = await supabaseQuery('users?select=telegram_id', { headers: { Prefer: 'count=exact' } });
      const txs = await supabaseQuery('transactions?select=amount,fee&limit=1000');
      return res.json({
        ok: true,
        stats: {
          totalUsers: Array.isArray(users) ? users.length : 0,
          totalTransactions: Array.isArray(txs) ? txs.length : 0,
          totalVolume: Array.isArray(txs) ? txs.reduce((s, t) => s + Number(t.amount || 0), 0) : 0,
          totalFees: Array.isArray(txs) ? txs.reduce((s, t) => s + Number(t.fee || 0), 0) : 0,
        },
      });
    }

    // ===== GET: Users =====
    if (action === 'users') {
      const data = await supabaseQuery('users?select=telegram_id,username,first_name,last_name,subscription,level,xp,kyc_status,created_at&order=created_at.desc&limit=100');
      return res.json({ ok: true, users: data });
    }

    // ===== GET: User details =====
    if (action === 'user') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'id required' });
      const user = await supabaseQuery(`users?telegram_id=eq.${id}&select=*`);
      const accounts = await supabaseQuery(`accounts?user_id=eq.${id}&select=*`);
      const txs = await supabaseQuery(`transactions?or=(from_user_id.eq.${id},to_user_id.eq.${id})&select=*&order=created_at.desc&limit=50`);
      return res.json({ ok: true, user: user?.[0] || null, accounts, transactions: txs });
    }

    // ===== POST: Set balance =====
    if (action === 'set_balance' && req.method === 'POST') {
      const { account_id, amount } = req.body;
      if (!account_id || amount === undefined) return res.status(400).json({ error: 'account_id and amount required' });
      await supabaseQuery(`accounts?id=eq.${account_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ balance: amount }),
        headers: { Prefer: 'return=minimal' },
      });
      return res.json({ ok: true });
    }

    // ===== POST: Send notification =====
    if (action === 'send_notification' && req.method === 'POST') {
      const { user_id, title, message } = req.body;
      if (!user_id || !message) return res.status(400).json({ error: 'user_id and message required' });
      await sendTgMessage(user_id, `🌙 *${title || 'Luna Bank'}*\n━━━━━━━━━━━\n\n${message}\n\n━━━━━━━━━━━`);
      await supabaseQuery('notifications', {
        method: 'POST',
        body: JSON.stringify({ user_id, title: title || 'System', message, type: 'system', read: false }),
      });
      return res.json({ ok: true });
    }

    // ===== POST: Approve KYC =====
    if (action === 'approve_kyc' && req.method === 'POST') {
      const { user_id } = req.body;
      if (!user_id) return res.status(400).json({ error: 'user_id required' });
      await supabaseQuery(`users?telegram_id=eq.${user_id}`, { method: 'PATCH', body: JSON.stringify({ kyc_status: 'approved' }), headers: { Prefer: 'return=minimal' } });
      await supabaseQuery(`kyc_requests?user_id=eq.${user_id}`, { method: 'PATCH', body: JSON.stringify({ status: 'approved' }), headers: { Prefer: 'return=minimal' } });
      await sendTgMessage(user_id, '🌙 *Luna Bank*\n━━━━━━━━━━━\n\n✅ *KYC одобрен!*\nЛимиты увеличены.\n\n━━━━━━━━━━━');
      return res.json({ ok: true });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (err) {
    console.error('[MANAGER]', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
