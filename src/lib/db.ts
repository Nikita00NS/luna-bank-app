/**
 * Luna Bank — Database Layer
 *
 * All Supabase operations centralized here.
 * Every write goes to both local store AND Supabase.
 * Reads fall back to local store if Supabase is unreachable.
 */

import { supabase } from './supabase';
import { useStore } from './store';
import type { User, Account, Transaction } from './store';
import { fetchTonBalance, fetchJettonBalances } from './ton';

// ===== USERS =====

export async function dbUpsertUser(user: Partial<User> & { telegram_id: number }) {
  const { data, error } = await supabase
    .from('users')
    .upsert(user, { onConflict: 'telegram_id' })
    .select()
    .single();

  if (error) console.error('[DB] upsertUser:', error.message);
  return data;
}

export async function dbGetUser(telegramId: number) {
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();
  return data;
}

export async function dbUpdateUser(telegramId: number, updates: Record<string, any>) {
  const { error } = await supabase
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('telegram_id', telegramId);

  if (error) console.error('[DB] updateUser:', error.message);
}

export async function dbSearchUsers(query: string, excludeId: number) {
  const { data } = await supabase
    .from('users')
    .select('telegram_id, username, first_name, last_name, photo_url, luna_id')
    .or(`username.ilike.%${query}%,luna_id.ilike.%${query}%,first_name.ilike.%${query}%`)
    .neq('telegram_id', excludeId)
    .limit(10);

  return data || [];
}

export async function dbGetAllUsers() {
  const { data } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  return data || [];
}

// ===== PHONE =====

export async function dbSavePhone(telegramId: number, phone: string) {
  const { error } = await supabase
    .from('users')
    .update({ phone_number: phone, updated_at: new Date().toISOString() })
    .eq('telegram_id', telegramId);

  if (error) console.error('[DB] savePhone:', error.message);
}

export async function dbSearchByPhone(phone: string, excludeId: number) {
  // Normalize: strip non-digits
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return [];

  const { data } = await supabase
    .from('users')
    .select('telegram_id, username, first_name, last_name, photo_url, luna_id, phone_number')
    .neq('telegram_id', excludeId)
    .not('phone_number', 'is', null)
    .ilike('phone_number', `%${digits}%`)
    .limit(10);

  return data || [];
}

// ===== ACCOUNTS =====

export async function dbCreateAccount(account: Omit<Account, 'id'> & { id?: string }) {
  const { data, error } = await supabase
    .from('accounts')
    .insert({ ...account, balance: account.balance || 0 })
    .select()
    .single();

  if (error) console.error('[DB] createAccount:', error.message);
  return data;
}

export async function dbGetUserAccounts(userId: number) {
  const { data } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at');

  return data || [];
}

export async function dbUpdateBalance(accountId: string, delta: number) {
  // Read current balance
  const { data: acc } = await supabase
    .from('accounts')
    .select('balance')
    .eq('id', accountId)
    .single();

  if (acc) {
    const newBal = Math.round((Number(acc.balance) + delta) * 100) / 100;
    await supabase
      .from('accounts')
      .update({ balance: newBal })
      .eq('id', accountId);
  }
}

// ===== TRANSACTIONS =====

export async function dbCreateTransaction(tx: Omit<Transaction, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('transactions')
    .insert(tx)
    .select()
    .single();

  if (error) console.error('[DB] createTransaction:', error.message);
  return data;
}

export async function dbGetUserTransactions(userId: number, limit = 50) {
  const { data } = await supabase
    .from('transactions')
    .select('*')
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(limit);

  return data || [];
}

// ===== CARDS =====

export async function dbCreateCard(card: Record<string, any>) {
  const { data, error } = await supabase
    .from('cards')
    .insert(card)
    .select()
    .single();

  if (error) console.error('[DB] createCard:', error.message);
  return data;
}

export async function dbGetUserCards(userId: number) {
  const { data } = await supabase
    .from('cards')
    .select('*')
    .eq('account_id', userId.toString())
    .order('created_at');
  return data || [];
}

export async function dbGetCardsByAccountIds(accountIds: string[]) {
  if (accountIds.length === 0) return [];
  const { data } = await supabase
    .from('cards')
    .select('*')
    .in('account_id', accountIds)
    .order('created_at');
  return data || [];
}

// ===== EXCHANGE ORDERS =====

export async function dbCreateOrder(order: {
  user_id: number;
  coin: string;
  side: string;
  amount: number;
  price: number;
  total_lnc: number;
}) {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      from_user_id: order.user_id,
      to_user_id: order.user_id,
      from_account_id: 'exchange',
      to_account_id: 'exchange',
      amount: order.amount,
      fee: 0,
      currency: order.coin,
      type: 'transfer',
      status: 'completed',
      note: `${order.side.toUpperCase()} ${order.coin} @ $${order.price}`,
    })
    .select()
    .single();

  if (error) console.error('[DB] createOrder:', error.message);
  return data;
}

// ===== REFERRALS =====

export async function dbCreateReferral(userId: number, referredUserId: number, reward: number) {
  const { error } = await supabase
    .from('referrals')
    .insert({ user_id: userId, referred_user_id: referredUserId, reward });
  if (error) console.error('[DB] createReferral:', error.message);
}

export async function dbGetReferrals(userId: number) {
  const { data } = await supabase
    .from('referrals')
    .select('*, referred:referred_user_id(username, first_name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function dbCountReferrals(userId: number) {
  const { count } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  return count || 0;
}

// ===== NOTIFICATIONS =====

export async function dbCreateNotification(notif: {
  user_id: number;
  title: string;
  message: string;
  type: string;
}) {
  await supabase
    .from('notifications')
    .insert({ ...notif, read: false })
    ;
}

export async function dbMarkNotifRead(id: string) {
  await supabase.from('notifications').update({ read: true }).eq('id', id);
}

// ===== WALLET =====

export async function dbSaveWallet(userId: number, walletType: string, address: string) {
  await supabase
    .from('wallet_connections')
    .upsert(
      { user_id: userId, wallet_type: walletType, address },
      { onConflict: 'user_id' }
    );
}

// ===== KYC =====

export async function dbSubmitKYC(userId: number, data: Record<string, any>) {
  await supabase
    .from('kyc_requests')
    .upsert(
      { user_id: userId, ...data, status: 'pending' },
      { onConflict: 'user_id' }
    );

  await supabase
    .from('users')
    .update({ kyc_status: 'pending' })
    .eq('telegram_id', userId);
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

// ===== P2P OFFERS =====

export async function dbCreateP2POffer(offer: Record<string, any>) {
  const { data, error } = await supabase.from('p2p_offers').insert(offer).select().single();
  if (error) console.error('[DB] createP2POffer:', error.message);
  return data;
}

export async function dbGetP2POffers(type: 'buy' | 'sell', excludeUserId: number) {
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

export async function dbGetMyP2POffers(userId: number) {
  const { data } = await supabase.from('p2p_offers').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  return data || [];
}

export async function dbUpdateP2POffer(id: string, updates: Record<string, any>) {
  await supabase.from('p2p_offers').update(updates).eq('id', id);
}

// ===== MARKETPLACE =====

export async function dbCreateListing(listing: Record<string, any>) {
  const { data, error } = await supabase.from('marketplace_listings').insert(listing).select().single();
  if (error) console.error('[DB] createListing:', error.message);
  return data;
}

export async function dbGetListings(category?: string) {
  let q = supabase.from('marketplace_listings').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(50);
  if (category && category !== 'all') q = q.eq('category', category);
  const { data } = await q;
  return data || [];
}

export async function dbUpdateListing(id: string, updates: Record<string, any>) {
  await supabase.from('marketplace_listings').update(updates).eq('id', id);
}

// ===== SAVINGS GOALS =====

export async function dbCreateGoal(goal: Record<string, any>) {
  const { data, error } = await supabase.from('savings_goals').insert(goal).select().single();
  if (error) console.error('[DB] createGoal:', error.message);
  return data;
}

export async function dbGetGoals(userId: number) {
  const { data } = await supabase.from('savings_goals').select('*').eq('user_id', userId).order('created_at');
  return data || [];
}

export async function dbUpdateGoal(id: string, updates: Record<string, any>) {
  await supabase.from('savings_goals').update(updates).eq('id', id);
}

export async function dbDeleteGoal(id: string) {
  await supabase.from('savings_goals').delete().eq('id', id);
}

// ===== ESCROW DEALS =====

export async function dbCreateEscrow(deal: Record<string, any>) {
  const { data, error } = await supabase.from('escrow_deals').insert(deal).select().single();
  if (error) console.error('[DB] createEscrow:', error.message);
  return data;
}

export async function dbGetEscrowDeals(userId: number) {
  const { data } = await supabase.from('escrow_deals').select('*').eq('buyer_id', userId).order('created_at', { ascending: false });
  return data || [];
}

export async function dbUpdateEscrow(id: string, updates: Record<string, any>) {
  await supabase.from('escrow_deals').update(updates).eq('id', id);
}

// ===== EARN DEPOSITS =====

export async function dbCreateEarnDeposit(deposit: Record<string, any>) {
  const { data, error } = await supabase.from('earn_deposits').insert(deposit).select().single();
  if (error) console.error('[DB] createEarnDeposit:', error.message);
  return data;
}

export async function dbGetEarnDeposits(userId: number) {
  const { data } = await supabase.from('earn_deposits').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  return data || [];
}

export async function dbUpdateEarnDeposit(id: string, updates: Record<string, any>) {
  await supabase.from('earn_deposits').update(updates).eq('id', id);
}

// ===== NEWS =====

export async function dbGetNews(category?: string) {
  let q = supabase.from('news_articles').select('*').order('created_at', { ascending: false }).limit(20);
  if (category && category !== 'all') q = q.eq('category', category);
  const { data } = await q;
  return data || [];
}

// ===== ADMIN STATS =====

export async function dbGetAdminStats() {
  const { count: userCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  const { data: txs } = await supabase
    .from('transactions')
    .select('amount, fee')
    .limit(1000);

  return {
    userCount: userCount || 0,
    totalVolume: txs?.reduce((s, t) => s + Number(t.amount || 0), 0) || 0,
    totalFees: txs?.reduce((s, t) => s + Number(t.fee || 0), 0) || 0,
    totalTxs: txs?.length || 0,
  };
}

// ===== SYNC ON LOGIN =====

export async function syncFromDB(telegramId: number) {
  try {
    const store = useStore.getState();

    // Fetch user (latest data from DB overrides local)
    const dbUser = await dbGetUser(telegramId);
    if (dbUser) {
      store.patchUser({
        level: dbUser.level,
        xp: dbUser.xp,
        kyc_status: dbUser.kyc_status,
        subscription: dbUser.subscription,
        subscription_expires: dbUser.subscription_expires,
        phone_number: dbUser.phone_number,
        role: dbUser.role,
      });
    }

    // Fetch accounts
    const accounts = await dbGetUserAccounts(telegramId);
    if (accounts.length > 0) {
      store.setAccounts(accounts as Account[]);
    }

    // Fetch transactions
    const txs = await dbGetUserTransactions(telegramId);
    if (txs.length > 0) {
      store.setTxs(txs as Transaction[]);
    }

    // Fetch cards
    const accountIds = (accounts || []).map((a: any) => a.id);
    if (accountIds.length > 0) {
      const cards = await dbGetCardsByAccountIds(accountIds);
      if (cards.length > 0) {
        store.setCards(cards as any[]);
      }
    }

    // Fetch wallet
    const { data: wallet } = await supabase
      .from('wallet_connections')
      .select('address')
      .eq('user_id', telegramId)
      .single();

    if (wallet) {
      store.setTonWallet(wallet.address);

      // Sync real crypto balances from blockchain
      try {
        const freshAccounts = store.accounts;

        // TON native balance
        const tonBal = await fetchTonBalance(wallet.address);
        if (tonBal.ok) {
          const tonAcc = freshAccounts.find((a) => a.currency === 'TON');
          if (tonAcc && Math.abs(Number(tonAcc.balance) - tonBal.balance) > 0.0001) {
            const delta = tonBal.balance - Number(tonAcc.balance);
            store.updateBalance(tonAcc.id, delta);
            await dbUpdateBalance(tonAcc.id, delta).catch(() => {});
          }
        }

        // Jetton balances (USDT, etc)
        const jettons = await fetchJettonBalances(wallet.address);
        const usdtJetton = jettons.find((j) => j.symbol === 'USD₮' || j.symbol === 'USDT');
        if (usdtJetton) {
          const usdtAcc = freshAccounts.find((a) => a.currency === 'USDT');
          if (usdtAcc && Math.abs(Number(usdtAcc.balance) - usdtJetton.balance) > 0.001) {
            const delta = usdtJetton.balance - Number(usdtAcc.balance);
            store.updateBalance(usdtAcc.id, delta);
            await dbUpdateBalance(usdtAcc.id, delta).catch(() => {});
          }
        }

        // Save all jettons to store for HomeScreen display
        store.setWalletJettons(jettons.map((j) => ({
          symbol: j.symbol,
          name: j.name,
          balance: j.balance,
          image: j.image,
          verified: j.verified,
        })));

        console.log('[DB] Blockchain balances synced ✓', { ton: tonBal.balance, jettons: jettons.length });
      } catch (err) {
        console.warn('[DB] Blockchain sync failed:', err);
      }
    }

    // Fetch notifications
    const { data: notifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', telegramId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (notifs && notifs.length > 0) {
      store.setNotifs(notifs as any[]);
    }

    console.log('[DB] Synced from Supabase ✓');
  } catch (err) {
    console.warn('[DB] Sync failed (offline mode):', err);
  }
}

// ===== ADMIN: Balance Management =====

export async function dbAdminSetBalance(accountId: string, newBalance: number) {
  const { error } = await supabase
    .from('accounts')
    .update({ balance: newBalance })
    .eq('id', accountId);
  if (error) console.error('[DB] adminSetBalance:', error.message);
}

export async function dbAdminGetUserAccounts(userId: number) {
  const { data } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId);
  return data || [];
}

export async function dbAdminSendNotification(userId: number, title: string, message: string) {
  await supabase
    .from('notifications')
    .insert({ user_id: userId, title, message, type: 'system', read: false });
}
