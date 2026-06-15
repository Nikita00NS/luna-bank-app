-- ============================================
-- Luna Bank — Security Migration
-- Run in Supabase SQL Editor
-- ============================================

-- ===== OTP Codes Table =====
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id BIGINT NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'login',
  attempts INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON otp_codes FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_otp_user ON otp_codes(user_id);

-- ===== Login sessions table =====
CREATE TABLE IF NOT EXISTS login_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  device_info TEXT,
  ip_address TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE login_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON login_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON login_sessions(user_id);

-- ===== Audit log =====
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id BIGINT,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON audit_log FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
