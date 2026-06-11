import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lffdzsbqnrjmhdneolrh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmZmR6c2JxbnJqbWhkbmVvbHJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NDQ5NjMsImV4cCI6MjA5NjMyMDk2M30.Sqa-diKgVKhPNEKEZYKNxFfkZIuPM5pXJxAZgddn_dc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============ USERS ============

export async function upsertUser(userData: {
  telegram_id: number;
  username: string;
  first_name: string;
  last_name: string;
  photo_url: string;
  pin_hash: string;
  role?: string;
  luna_id: string;
}) {
  const { data, error } = await supabase
    .from('users')
    .upsert({
      telegram_id: userData.telegram_id,
      username: userData.username,
      first_name: userData.first_name,
      last_name: userData.last_name,
      photo_url: userData.photo_url,
      pin_hash: userData.pin_hash,
      role: userData.role || 'user',
      luna_id: userData.luna_id,
      level: 1,
      xp: 0,
      kyc_status: 'none',
      subscription: 'free',
      display_currency: 'USD',
      biometrics_enabled: false,
    }, { onConflict: 'telegram_id' })
    .select()
    .single();

  if (error) console.error('upsertUser error:', error);
  return { data, error };
}

export async function getUser(telegram_id: number) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegram_id)
    .single();
  return { data, error };
}

export async function updateUser(telegram_id: number, updates: Record<string, any>) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('telegram_id', telegram_id)
    .select()
    .single();
  return { data, error };
}

export async function searchUsers(query: string) {
  const { data, error } = await supabase
    .from('users')
    .select('telegram_id, username, first_name, last_name, photo_url, luna_id')
    .or(`username.ilike.%${query}%,luna_id.ilike.%${query}%`)
    .limit(10);
  return { data: data || [], error };
}

export async function getAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

// ============ ACCOUNTS ============

export async function createAccount(account: {
  user_id: number;
  type: string;
  name: string;
  currency: string;
  account_number: string;
  iban: string;
  wallet_address?: string;
  contract_signed?: boolean;
  signature_data?: string;
}) {
  const { data, error } = await supabase
    .from('accounts')
    .insert({ ...account, balance: 0 })
    .select()
    .single();
  if (error) console.error('createAccount error:', error);
  return { data, error };
}

export async function getUserAccounts(user_id: number) {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: true });
  return { data: data || [], error };
}

export async function updateAccountBalance(account_id: string, delta: number) {
  // Use RPC for atomic balance update
  const { data, error } = await supabase.rpc('update_balance', {
    p_account_id: account_id,
    p_delta: delta,
  });
  if (error) {
    // Fallback: read + write
    console.error('RPC update_balance error, using fallback:', error);
    const { data: acc } = await supabase.from('accounts').select('balance').eq('id', account_id).single();
    if (acc) {
      const newBal = Math.round((acc.balance + delta) * 100) / 100;
      await supabase.from('accounts').update({ balance: newBal }).eq('id', account_id);
    }
  }
  return { data, error };
}

export async function getAccountById(account_id: string) {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', account_id)
    .single();
  return { data, error };
}

// ============ TRANSACTIONS ============

export async function createTransaction(tx: {
  from_user_id: number;
  to_user_id: number;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  fee: number;
  currency: string;
  type: string;
  status: string;
  note?: string;
}) {
  const { data, error } = await supabase
    .from('transactions')
    .insert(tx)
    .select()
    .single();
  if (error) console.error('createTransaction error:', error);
  return { data, error };
}

export async function getUserTransactions(user_id: number, limit = 50) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .or(`from_user_id.eq.${user_id},to_user_id.eq.${user_id}`)
    .order('created_at', { ascending: false })
    .limit(limit);
  return { data: data || [], error };
}

export async function getAccountTransactions(account_id: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .or(`from_account_id.eq.${account_id},to_account_id.eq.${account_id}`)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

// ============ CARDS ============

export async function createCard(card: {
  account_id: string;
  type: string;
  design: string;
  number: string;
  cvv: string;
  expiry: string;
  holder: string;
}) {
  const { data, error } = await supabase
    .from('cards')
    .insert(card)
    .select()
    .single();
  return { data, error };
}

export async function getUserCards(user_id: number) {
  const { data, error } = await supabase
    .from('cards')
    .select('*, accounts!inner(user_id)')
    .eq('accounts.user_id', user_id);
  return { data: data || [], error };
}

// ============ WALLET CONNECTIONS ============

export async function saveWalletConnection(user_id: number, wallet_type: string, address: string) {
  const { data, error } = await supabase
    .from('wallet_connections')
    .upsert({ user_id, wallet_type, address }, { onConflict: 'user_id' })
    .select()
    .single();
  return { data, error };
}

export async function getWalletConnection(user_id: number) {
  const { data, error } = await supabase
    .from('wallet_connections')
    .select('*')
    .eq('user_id', user_id)
    .single();
  return { data, error };
}

// ============ KYC ============

export async function submitKYC(user_id: number, kycData: {
  phone?: string;
  email?: string;
  birth_date?: string;
}) {
  const { data, error } = await supabase
    .from('kyc_requests')
    .upsert({ user_id, ...kycData, status: 'pending' }, { onConflict: 'user_id' })
    .select()
    .single();

  // Also update user's kyc_status
  await supabase.from('users').update({ kyc_status: 'pending' }).eq('telegram_id', user_id);

  return { data, error };
}

export async function uploadKYCDocument(user_id: number, file: File, docType: 'passport' | 'selfie') {
  const path = `kyc/${user_id}/${docType}_${Date.now()}.${file.name.split('.').pop()}`;
  const { data, error } = await supabase.storage
    .from('kyc-documents')
    .upload(path, file);

  if (!error) {
    const field = docType === 'passport' ? 'document_url' : 'selfie_url';
    await supabase.from('kyc_requests').update({ [field]: path }).eq('user_id', user_id);
  }

  return { data, error };
}

export async function getPendingKYC() {
  const { data, error } = await supabase
    .from('kyc_requests')
    .select('*, users(first_name, last_name, username)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  return { data: data || [], error };
}

export async function approveKYC(user_id: number) {
  await supabase.from('kyc_requests').update({ status: 'approved' }).eq('user_id', user_id);
  await supabase.from('users').update({ kyc_status: 'approved' }).eq('telegram_id', user_id);
}

export async function rejectKYC(user_id: number) {
  await supabase.from('kyc_requests').update({ status: 'rejected' }).eq('user_id', user_id);
  await supabase.from('users').update({ kyc_status: 'rejected' }).eq('telegram_id', user_id);
}

// ============ SUBSCRIPTIONS ============

export async function updateSubscription(user_id: number, plan: string) {
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('users')
    .update({ subscription: plan, subscription_expires: expires })
    .eq('telegram_id', user_id)
    .select()
    .single();
  return { data, error };
}

// ============ SUPPORT CHATS ============

export async function getSupportChat(user_id: number) {
  const { data, error } = await supabase
    .from('support_chats')
    .select('*')
    .eq('user_id', user_id)
    .single();
  return { data, error };
}

export async function upsertSupportChat(user_id: number, messages: any[]) {
  const { data, error } = await supabase
    .from('support_chats')
    .upsert({ user_id, messages, status: 'open' }, { onConflict: 'user_id' })
    .select()
    .single();
  return { data, error };
}

// ============ NOTIFICATIONS ============

export async function createNotification(notif: {
  user_id: number;
  title: string;
  message: string;
  type: string;
}) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({ ...notif, read: false })
    .select()
    .single();
  return { data, error };
}

export async function getUserNotifications(user_id: number) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })
    .limit(50);
  return { data: data || [], error };
}

export async function markNotificationRead(id: string) {
  await supabase.from('notifications').update({ read: true }).eq('id', id);
}

// ============ ADMIN STATS ============

export async function getAdminStats() {
  const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
  const { data: txs } = await supabase.from('transactions').select('amount, fee, type').limit(1000);

  const totalVolume = txs?.reduce((s, t) => s + (t.amount || 0), 0) || 0;
  const totalFees = txs?.reduce((s, t) => s + (t.fee || 0), 0) || 0;
  const totalTxs = txs?.length || 0;

  return { userCount: userCount || 0, totalVolume, totalFees, totalTxs };
}
