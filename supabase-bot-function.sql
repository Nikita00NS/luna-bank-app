-- ============================================
-- Luna Bank — Telegram Bot Edge Function
-- Run this in Supabase SQL Editor
-- ============================================

-- Create secrets table for bot token
CREATE TABLE IF NOT EXISTS app_secrets (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Insert bot token (ONLY stored on server, never in client!)
INSERT INTO app_secrets (key, value)
VALUES ('TELEGRAM_BOT_TOKEN', '8859860619:AAFwtBwOfpDUv565vUxZG32SI2Zo8BTolNU')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- RLS: app_secrets NOT accessible from client
ALTER TABLE app_secrets ENABLE ROW LEVEL SECURITY;
-- No policies = no client access

-- ============================================
-- Function to send Telegram message (called from triggers)
-- ============================================
CREATE OR REPLACE FUNCTION send_telegram_message(
  p_chat_id BIGINT,
  p_text TEXT
) RETURNS void AS $$
DECLARE
  v_token TEXT;
  v_response TEXT;
BEGIN
  SELECT value INTO v_token FROM app_secrets WHERE key = 'TELEGRAM_BOT_TOKEN';
  
  IF v_token IS NULL THEN
    RAISE NOTICE 'Bot token not found';
    RETURN;
  END IF;

  -- Use pg_net extension for HTTP calls (available in Supabase)
  PERFORM net.http_post(
    url := 'https://api.telegram.org/bot' || v_token || '/sendMessage',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'chat_id', p_chat_id,
      'text', p_text,
      'parse_mode', 'Markdown'
    )::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Trigger: notify on new transaction
-- ============================================
CREATE OR REPLACE FUNCTION notify_transaction() RETURNS trigger AS $$
DECLARE
  v_user_id BIGINT;
  v_text TEXT;
BEGIN
  v_user_id := NEW.to_user_id;
  
  IF NEW.type = 'transfer' THEN
    v_text := '🌙 *Luna Bank*' || chr(10) || '━━━━━━━━━━━' || chr(10) ||
              '📥 *Входящий перевод*' || chr(10) || chr(10) ||
              '💰 Сумма: `' || NEW.amount || ' ' || NEW.currency || '`' || chr(10) ||
              '📝 ' || COALESCE(NEW.note, '') || chr(10) ||
              '━━━━━━━━━━━';
    PERFORM send_telegram_message(v_user_id, v_text);
  END IF;

  IF NEW.type = 'deposit' THEN
    v_text := '🌙 *Luna Bank*' || chr(10) || '━━━━━━━━━━━' || chr(10) ||
              '📥 *Пополнение*' || chr(10) || chr(10) ||
              '💰 Сумма: `' || NEW.amount || ' ' || NEW.currency || '`' || chr(10) ||
              '━━━━━━━━━━━' || chr(10) ||
              '✅ Зачислено на баланс';
    PERFORM send_telegram_message(v_user_id, v_text);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trg_notify_transaction ON transactions;
CREATE TRIGGER trg_notify_transaction
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_transaction();

-- ============================================
-- Trigger: notify on KYC status change
-- ============================================
CREATE OR REPLACE FUNCTION notify_kyc_change() RETURNS trigger AS $$
DECLARE
  v_text TEXT;
BEGIN
  IF OLD.kyc_status IS DISTINCT FROM NEW.kyc_status THEN
    IF NEW.kyc_status = 'approved' THEN
      v_text := '🌙 *Luna Bank*' || chr(10) || '━━━━━━━━━━━' || chr(10) ||
                '✅ *KYC одобрен!*' || chr(10) || chr(10) ||
                '🚀 Лимиты увеличены до $50,000/мес';
    ELSIF NEW.kyc_status = 'rejected' THEN
      v_text := '🌙 *Luna Bank*' || chr(10) || '━━━━━━━━━━━' || chr(10) ||
                '❌ *KYC отклонён*' || chr(10) || chr(10) ||
                'Попробуйте снова с корректными данными';
    ELSIF NEW.kyc_status = 'pending' THEN
      v_text := '🌙 *Luna Bank*' || chr(10) || '━━━━━━━━━━━' || chr(10) ||
                '⏳ *KYC на проверке*' || chr(10) || chr(10) ||
                'Обычно 1-2 рабочих дня';
    END IF;

    IF v_text IS NOT NULL THEN
      PERFORM send_telegram_message(NEW.telegram_id, v_text);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_kyc ON users;
CREATE TRIGGER trg_notify_kyc
  AFTER UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION notify_kyc_change();
