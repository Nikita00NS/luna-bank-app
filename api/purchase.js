// Luna Wallet — Purchase API endpoint
// Verifies payment and returns activation code

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id, service_name, tx_hash, amount, currency } = req.body;

  if (!user_id || !service_name || !tx_hash) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Verify transaction on TON blockchain
    const verifyResp = await fetch(
      `https://toncenter.com/api/v2/getTransaction?hash=${tx_hash}`,
      { headers: { Accept: 'application/json' } }
    );
    const txData = await verifyResp.json();

    if (!txData.ok) {
      return res.status(400).json({ error: 'Transaction not found on blockchain' });
    }

    // Verify amount
    const actualAmount = Number(txData.result?.in_msg?.value || 0) / 1e9;
    if (actualAmount < Number(amount || 0)) {
      return res.status(400).json({ error: 'Insufficient payment amount' });
    }

    // Generate activation code
    const activationCode = `${service_name.toUpperCase().replace(/\s/g, '_')}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

    // Save to Supabase
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL || 'https://lffdzsbqnrjmhdneolrh.supabase.co',
      process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmZmR6c2JxbnJqbWhkbmVvbHJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NDQ5NjMsImV4cCI6MjA5NjMyMDk2M30.Sqa-diKgVKhPNEKEZYKNxFfkZIuPM5pXJxAZgddn_dc'
    );

    const { data, error } = await supabase.from('service_purchases').insert({
      user_id,
      service_name,
      service_category: req.body.category || 'other',
      period: req.body.period || '1m',
      price_usd: Number(req.body.price_usd || 0),
      price_crypto: Number(amount || 0),
      crypto_currency: currency || 'TON',
      activation_code: activationCode,
      status: 'active',
      tx_hash,
    }).select().single();

    if (error) {
      console.error('[Purchase] Supabase error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    // Send notification via Telegram Bot
    const botToken = process.env.BOT_TOKEN || '8859860619:AAFwtBwOfpDUv565vUxZG32SI2Zo8BTolNU';
    const botMsg = `✅ <b>Покупка подтверждена!</b>\n\n🔹 ${service_name}\n💰 ${amount} ${currency}\n🔑 Код: <code>${activationCode}</code>\n\n💎 Luna Wallet`;

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: user_id, text: botMsg, parse_mode: 'HTML' }),
    }).catch(() => {});

    return res.status(200).json({ success: true, activation_code: activationCode, data });
  } catch (err) {
    console.error('[Purchase] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}