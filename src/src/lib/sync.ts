/**
 * Supabase Sync Layer
 * Bridges local Zustand store ↔ Supabase database
 * All writes go to both local store AND Supabase
 * On app load, data is fetched from Supabase
 */

import { supabase } from './supabase';
import { useStore } from './store';
import type { User, Account, Transaction, Card, Notification, OwnedBusiness } from './store';

// ============ SYNC ON APP START ============

export async function syncFromSupabase(telegramId: number) {
  const store = useStore.getState();

  // 1. Fetch user
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();

  if (userData) {
    store.setUser(userData as User);
    store.setIsNew(false);
  }

  // 2. Fetch accounts
  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', telegramId)
    .order('created_at');

  if (accounts) {
    // Replace local accounts with DB accounts
    const s = useStore.getState();
    // Clear and re-add
    for (const acc of accounts) {
      if (!s.accounts.find(a => a.id === acc.id)) {
        store.addAccount(acc as Account);
      }
    }
  }

  // 3. Fetch transactions
  const { data: txs } = await supabase
    .from('transactions')
    .select('*')
    .or(`from_user_id.eq.${telegramId},to_user_id.eq.${telegramId}`)
    .order('created_at', { ascending: false })
    .limit(50);

  if (txs) {
    for (const tx of txs) {
      if (!useStore.getState().txs.find(t => t.id === tx.id)) {
        store.addTx(tx as Transaction);
      }
    }
  }

  // 4. Fetch cards
  const { data: cards } = await supabase
    .from('cards')
    .select('*');

  if (cards) {
    for (const card of cards) {
      if (!useStore.getState().cards.find(c => c.id === card.id)) {
        store.addCard(card as Card);
      }
    }
  }

  // 5. Fetch notifications
  const { data: notifs } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', telegramId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (notifs) {
    for (const n of notifs) {
      if (!useStore.getState().notifs.find(x => x.id === n.id)) {
        store.addNotif(n as Notification);
      }
    }
  }

  // 6. Fetch wallet
  const { data: wallet } = await supabase
    .from('wallet_connections')
    .select('*')
    .eq('user_id', telegramId)
    .single();

  if (wallet) {
    store.setTonWallet(wallet.address);
  }

  console.log('✅ Synced from Supabase');
}

// ============ WRITE-THROUGH HELPERS ============
// These write to Supabase AND return data for local store

export async function dbCreateUser(userData: any) {
  const { data, error } = await supabase
    .from('users')
    .upsert(userData, { onConflict: 'telegram_id' })
    .select()
    .single();

  if (error) console.error('dbCreateUser:', error);
  return data;
}

export async function dbUpdateUser(telegramId: number, updates: Record<string, any>) {
  const { error } = await supabase
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('telegram_id', telegramId);

  if (error) console.error('dbUpdateUser:', error);
}

export async function dbCreateAccount(account: any) {
  const { data, error } = await supabase
    .from('accounts')
    .insert(account)
    .select()
    .single();

  if (error) console.error('dbCreateAccount:', error);
  return data;
}

export async function dbUpdateBalance(accountId: string, delta: number) {
  // Read current, then update (atomic via RPC would be better)
  const { data: acc } = await supabase
    .from('accounts')
    .select('balance')
    .eq('id', accountId)
    .single();

  if (acc) {
    const newBal = Math.round((Number(acc.balance) + delta) * 100) / 100;
    const { error } = await supabase
      .from('accounts')
      .update({ balance: newBal })
      .eq('id', accountId);

    if (error) console.error('dbUpdateBalance:', error);
  }
}

export async function dbCreateTransaction(tx: any) {
  const { data, error } = await supabase
    .from('transactions')
    .insert(tx)
    .select()
    .single();

  if (error) console.error('dbCreateTransaction:', error);
  return data;
}

export async function dbCreateCard(card: any) {
  const { data, error } = await supabase
    .from('cards')
    .insert(card)
    .select()
    .single();

  if (error) console.error('dbCreateCard:', error);
  return data;
}

export async function dbCreateNotification(notif: any) {
  const { data, error } = await supabase
    .from('notifications')
    .insert(notif)
    .select()
    .single();

  if (error) console.error('dbCreateNotification:', error);
  return data;
}

export async function dbMarkNotifRead(id: string) {
  await supabase.from('notifications').update({ read: true }).eq('id', id);
}

export async function dbSaveWallet(userId: number, walletType: string, address: string) {
  await supabase
    .from('wallet_connections')
    .upsert({ user_id: userId, wallet_type: walletType, address }, { onConflict: 'user_id' });
}

export async function dbSearchUsers(query: string) {
  const { data } = await supabase
    .from('users')
    .select('telegram_id, username, first_name, last_name, photo_url, luna_id')
    .or(`username.ilike.%${query}%,luna_id.ilike.%${query}%,first_name.ilike.%${query}%`)
    .neq('telegram_id', useStore.getState().user?.telegram_id || 0)
    .limit(10);

  return data || [];
}

export async function dbGetUserAccounts(userId: number) {
  const { data } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId);
  return data || [];
}

export async function dbSubmitKYC(userId: number, kycData: any) {
  await supabase
    .from('kyc_requests')
    .upsert({ user_id: userId, ...kycData, status: 'pending' }, { onConflict: 'user_id' });

  await supabase
    .from('users')
    .update({ kyc_status: 'pending' })
    .eq('telegram_id', userId);
}

export async function dbGetAllUsers() {
  const { data } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  return data || [];
}

export async function dbGetPendingKYC() {
  const { data } = await supabase
    .from('kyc_requests')
    .select('*')
    .eq('status', 'pending');
  return data || [];
}

export async function dbApproveKYC(userId: number) {
  await supabase.from('kyc_requests').update({ status: 'approved' }).eq('user_id', userId);
  await supabase.from('users').update({ kyc_status: 'approved' }).eq('telegram_id', userId);
}

export async function dbRejectKYC(userId: number) {
  await supabase.from('kyc_requests').update({ status: 'rejected' }).eq('user_id', userId);
  await supabase.from('users').update({ kyc_status: 'rejected' }).eq('telegram_id', userId);
}

export async function dbGetAdminStats() {
  const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
  const { data: txs } = await supabase.from('transactions').select('amount, fee').limit(1000);

  return {
    userCount: userCount || 0,
    totalVolume: txs?.reduce((s, t) => s + Number(t.amount || 0), 0) || 0,
    totalFees: txs?.reduce((s, t) => s + Number(t.fee || 0), 0) || 0,
    totalTxs: txs?.length || 0,
  };
}

export async function dbSaveSupportChat(userId: number, messages: any[]) {
  await supabase
    .from('support_chats')
    .upsert({ user_id: userId, messages, status: 'open', updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
}
