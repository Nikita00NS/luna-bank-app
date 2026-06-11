-- ============================================
-- Luna Bank — Supabase Database Schema
-- Run this in Supabase SQL Editor: 
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============ USERS ============
CREATE TABLE IF NOT EXISTS users (
  telegram_id BIGINT PRIMARY KEY,
  username TEXT NOT NULL DEFAULT '',
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  photo_url TEXT DEFAULT '',
  pin_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'owner')),
  luna_id TEXT UNIQUE NOT NULL,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  kyc_status TEXT DEFAULT 'none' CHECK (kyc_status IN ('none', 'pending', 'approved', 'rejected')),
  subscription TEXT DEFAULT 'free' CHECK (subscription IN ('free', 'plus', 'cosmic')),
  subscription_expires TIMESTAMPTZ,
  display_currency TEXT DEFAULT 'USD',
  biometrics_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ ACCOUNTS ============
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('personal', 'business', 'ton', 'usdt', 'bitcoin', 'ethereum')),
  name TEXT NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('LNC', 'TON', 'USDT', 'BTC', 'ETH')),
  balance NUMERIC(20, 8) DEFAULT 0,
  account_number TEXT NOT NULL,
  iban TEXT NOT NULL,
  wallet_address TEXT,
  contract_signed BOOLEAN DEFAULT FALSE,
  signature_data TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ TRANSACTIONS ============
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id BIGINT NOT NULL,
  to_user_id BIGINT NOT NULL,
  from_account_id TEXT NOT NULL,
  to_account_id TEXT NOT NULL,
  amount NUMERIC(20, 8) NOT NULL,
  fee NUMERIC(20, 8) DEFAULT 0,
  currency TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('transfer', 'deposit', 'withdrawal', 'subscription', 'job', 'business', 'card')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ CARDS ============
CREATE TABLE IF NOT EXISTS cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('virtual', 'premium', 'plastic')),
  design TEXT NOT NULL DEFAULT 'classic',
  number TEXT NOT NULL,
  cvv TEXT NOT NULL,
  expiry TEXT NOT NULL,
  holder TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ WALLET CONNECTIONS ============
CREATE TABLE IF NOT EXISTS wallet_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id BIGINT UNIQUE NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  wallet_type TEXT NOT NULL,
  address TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ KYC REQUESTS ============
CREATE TABLE IF NOT EXISTS kyc_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id BIGINT UNIQUE NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  phone TEXT,
  email TEXT,
  birth_date TEXT,
  document_url TEXT,
  selfie_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ SUPPORT CHATS ============
CREATE TABLE IF NOT EXISTS support_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id BIGINT UNIQUE NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ NOTIFICATIONS ============
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ REFERRALS ============
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id BIGINT NOT NULL REFERENCES users(telegram_id),
  referred_user_id BIGINT NOT NULL REFERENCES users(telegram_id),
  reward NUMERIC(20, 8) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, referred_user_id)
);

-- ============ RPC: Atomic balance update ============
CREATE OR REPLACE FUNCTION update_balance(p_account_id UUID, p_delta NUMERIC)
RETURNS void AS $$
BEGIN
  UPDATE accounts 
  SET balance = ROUND((balance + p_delta)::numeric, 8)
  WHERE id = p_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============ RPC: Transfer between accounts ============
CREATE OR REPLACE FUNCTION transfer_funds(
  p_from_account UUID,
  p_to_account UUID,
  p_amount NUMERIC,
  p_fee NUMERIC,
  p_from_user BIGINT,
  p_to_user BIGINT,
  p_currency TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_tx_id UUID;
  v_from_balance NUMERIC;
BEGIN
  -- Check balance
  SELECT balance INTO v_from_balance FROM accounts WHERE id = p_from_account FOR UPDATE;
  
  IF v_from_balance < (p_amount + p_fee) THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
  
  -- Debit sender
  UPDATE accounts SET balance = ROUND((balance - p_amount - p_fee)::numeric, 8) WHERE id = p_from_account;
  
  -- Credit receiver
  UPDATE accounts SET balance = ROUND((balance + p_amount)::numeric, 8) WHERE id = p_to_account;
  
  -- Create transaction record
  INSERT INTO transactions (from_user_id, to_user_id, from_account_id, to_account_id, amount, fee, currency, type, status, note)
  VALUES (p_from_user, p_to_user, p_from_account::text, p_to_account::text, p_amount, p_fee, p_currency, 'transfer', 'completed', p_note)
  RETURNING id INTO v_tx_id;
  
  RETURN v_tx_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============ Row Level Security ============

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- For now: allow all operations with anon key (Telegram handles auth)
-- In production, validate Telegram initData on server side

CREATE POLICY "Allow all for anon" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON cards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON wallet_connections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON kyc_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON support_chats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON referrals FOR ALL USING (true) WITH CHECK (true);

-- ============ Indexes ============
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_from ON transactions(from_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to ON transactions(to_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_luna_id ON users(luna_id);

-- ============ Storage bucket for KYC ============
-- Run this separately if needed:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false);
