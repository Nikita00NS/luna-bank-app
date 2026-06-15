-- ============================================
-- Luna Bank — Migration: Add phone_number to users
-- Run this in Supabase SQL Editor:
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================

-- Add phone_number column
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Index for phone search
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
