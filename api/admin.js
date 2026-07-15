// Luna Wallet — Admin API
// User management, events, settings

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://lffdzsbqnrjmhdneolrh.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmZmR6c2JxbnJqbWhkbmVvbHJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NDQ5NjMsImV4cCI6MjA5NjMyMDk2M30.Sqa-diKgVKhPNEKEZYKNxFfkZIuPM5pXJxAZgddn_dc'
);

export default async function handler(req, res) {
  const { method, query } = req;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') return res.status(200).end();

  try {
    switch (method) {
      // GET /api/admin?action=stats
      case 'GET': {
        const { action } = query;
        if (action === 'stats') {
          const [{ count: users }, { count: txs }, { count: tickets }, { data: purchases }] = await Promise.all([
            supabase.from('users').select('*', { count: 'exact', head: true }),
            supabase.from('transactions').select('*', { count: 'exact', head: true }),
            supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
            supabase.from('service_purchases').select('price_usd'),
          ]);
          const revenue = purchases?.reduce((s, p) => s + Number(p.price_usd || 0), 0) || 0;
          return res.status(200).json({ users: users || 0, txs: txs || 0, tickets: tickets || 0, revenue });
        }
        if (action === 'users') {
          const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false }).limit(100);
          return res.status(200).json(data || []);
        }
        if (action === 'tickets') {
          const { data } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false }).limit(50);
          return res.status(200).json(data || []);
        }
        if (action === 'events') {
          const { data } = await supabase.from('app_events').select('*').order('date', { ascending: false });
          return res.status(200).json(data || []);
        }
        return res.status(400).json({ error: 'Unknown action' });
      }

      // POST /api/admin
      case 'POST': {
        const { action, ...body } = req.body;
        if (action === 'update_user') {
          const { error } = await supabase.from('users').update(body.updates).eq('telegram_id', body.telegram_id);
          if (error) return res.status(500).json({ error: error.message });
          return res.status(200).json({ success: true });
        }
        if (action === 'create_event') {
          const { error } = await supabase.from('app_events').insert(body.event);
          if (error) return res.status(500).json({ error: error.message });
          return res.status(200).json({ success: true });
        }
        if (action === 'reply_ticket') {
          const { error } = await supabase.from('support_tickets')
            .update({ admin_response: body.response, status: 'answered', updated_at: new Date().toISOString() })
            .eq('id', body.ticket_id);
          if (error) return res.status(500).json({ error: error.message });
          return res.status(200).json({ success: true });
        }
        if (action === 'send_notification') {
          const { error } = await supabase.from('notifications').insert({
            user_id: body.user_id, title: body.title, message: body.message, type: 'system', read: false,
          });
          if (error) return res.status(500).json({ error: error.message });
          return res.status(200).json({ success: true });
        }
        return res.status(400).json({ error: 'Unknown action' });
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    console.error('[Admin API] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}