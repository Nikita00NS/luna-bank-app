import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lffdzsbqnrjmhdneolrh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmZmR6c2JxbnJqbWhkbmVvbHJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NDQ5NjMsImV4cCI6MjA5NjMyMDk2M30.Sqa-diKgVKhPNEKEZYKNxFfkZIuPM5pXJxAZgddn_dc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== Users =====
export async function dbUpsertUser(user: {
  id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
}) {
  const { data, error } = await supabase
    .from('users')
    .upsert(user, { onConflict: 'id' })
    .select()
    .single();
  if (error) console.error('[DB] upsertUser:', error.message);
  return data;
}

export async function dbGetUser(id: string) {
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  return data;
}

// ===== Wallet =====
export async function dbSaveWallet(userId: string, walletType: string, address: string) {
  await supabase
    .from('wallet_connections')
    .upsert(
      { user_id: userId, wallet_type: walletType, address },
      { onConflict: 'user_id' }
    );
}

export async function dbGetWallet(userId: string) {
  const { data } = await supabase
    .from('wallet_connections')
    .select('*')
    .eq('user_id', userId)
    .single();
  return data;
}

// ===== P2P Offers =====
export async function dbCreateP2POffer(offer: Record<string, any>) {
  const { data, error } = await supabase.from('p2p_offers').insert(offer).select().single();
  if (error) console.error('[DB] createP2POffer:', error.message);
  return data;
}

export async function dbGetP2POffers(type: 'buy' | 'sell', excludeUserId: string) {
  const { data } = await supabase
    .from('p2p_offers')
    .select('*')
    .eq('status', 'active')
    .eq('type', type)
    .neq('user_id', excludeUserId)
    .order('created_at', { ascending: false })
    .limit(30);
  return data || [];
}

export async function dbGetMyP2POffers(userId: string) {
  const { data } = await supabase
    .from('p2p_offers')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function dbUpdateP2POffer(id: string, updates: Record<string, any>) {
  await supabase.from('p2p_offers').update(updates).eq('id', id);
}

// ===== Notifications =====
export async function dbCreateNotification(notif: {
  user_id: string;
  title: string;
  message: string;
  type: string;
}) {
  await supabase.from('notifications').insert({ ...notif, read: false });
}

export async function dbGetNotifications(userId: string) {
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  return data || [];
}