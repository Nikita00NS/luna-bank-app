-- =============================================================
-- Luna Wallet v2 — SUPABASE MIGRATION: Services + Admin + Support
-- =============================================================

-- 0. FIX: Drop old check constraint on subscription column
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_subscription_check;

-- 1. USERS — add role, subscription, commission
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,4) DEFAULT 0.005;
ALTER TABLE users ADD COLUMN IF NOT EXISTS balance_rub NUMERIC(14,2) DEFAULT 0;

-- 2. SERVICE PURCHASES
CREATE TABLE IF NOT EXISTS service_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id BIGINT NOT NULL REFERENCES users(telegram_id),
  service_name TEXT NOT NULL,
  service_category TEXT NOT NULL,
  period TEXT NOT NULL,
  price_usd NUMERIC(10,2) NOT NULL,
  price_crypto NUMERIC(20,8) NOT NULL,
  crypto_currency TEXT NOT NULL DEFAULT 'USDT',
  activation_code TEXT,
  status TEXT DEFAULT 'pending',
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- 3. VIRTUAL CARDS
CREATE TABLE IF NOT EXISTS virtual_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id BIGINT NOT NULL REFERENCES users(telegram_id),
  card_number TEXT NOT NULL,
  cvv TEXT NOT NULL,
  expiry TEXT NOT NULL,
  balance NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id BIGINT NOT NULL REFERENCES users(telegram_id),
  user_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  admin_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ADMIN EVENTS (maintenance, announcements, promos)
CREATE TABLE IF NOT EXISTS app_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL DEFAULT 'announcement',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SERVICE CATALOG
CREATE TABLE IF NOT EXISTS service_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🎬',
  price_monthly NUMERIC(10,2) NOT NULL,
  price_quarterly NUMERIC(10,2),
  price_yearly NUMERIC(10,2),
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. APP SETTINGS (maintenance mode, commission)
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO app_settings (key, value) VALUES
  ('maintenance_mode', 'false'),
  ('system_commission', '0.005'),
  ('service_fee', '0.05')
ON CONFLICT (key) DO NOTHING;

-- Insert default services
INSERT INTO service_catalog (name, category, icon, price_monthly, price_quarterly, price_yearly, description) VALUES
  ('Netflix', 'streaming', '🎬', 11.99, 29.99, 95.99, 'Стриминг фильмов и сериалов 4K'),
  ('YouTube Premium', 'streaming', '▶️', 13.99, 35.99, 119.99, 'YouTube без рекламы + YouTube Music'),
  ('Spotify', 'streaming', '🎵', 10.99, 27.99, 89.99, 'Музыка без рекламы, офлайн-режим'),
  ('Apple Music', 'streaming', '🍎', 10.99, 27.99, 89.99, 'Миллионы треков, пространственное аудио'),
  ('Steam Wallet', 'gaming', '🎮', 10.00, 30.00, 100.00, 'Пополнение кошелька Steam'),
  ('PlayStation Plus', 'gaming', '🎮', 9.99, 24.99, 79.99, 'Мультиплеер + игры каждый месяц'),
  ('Xbox Game Pass', 'gaming', '🎮', 11.99, 29.99, 95.99, 'Сотни игр на PC и консоли'),
  ('Nintendo Online', 'gaming', '🎮', 3.99, 9.99, 34.99, 'Онлайн-игры на Nintendo Switch'),
  ('Roblox Premium', 'gaming', '🎮', 4.99, 12.99, 44.99, 'Robux ежемесячно + эксклюзивные предметы'),
  ('ChatGPT Plus', 'software', '🤖', 20.00, 50.00, 200.00, 'GPT-4, быстрые ответы, DALL·E'),
  ('Canva Pro', 'software', '🎨', 12.99, 32.99, 109.99, 'Дизайн, ИИ-функции, бренд-кит'),
  ('Adobe Creative Cloud', 'software', '✨', 54.99, 149.99, 549.99, 'Photoshop, Illustrator, Premiere'),
  ('Microsoft 365', 'software', '💼', 9.99, 24.99, 89.99, 'Word, Excel, PowerPoint, 1TB облака'),
  ('Telegram Premium', 'social', '✈️', 4.99, 12.99, 44.99, 'Ускоренные загрузки, стикеры, каналы'),
  ('X Premium', 'social', '🐦', 8.00, 21.00, 84.00, 'Синяя галочка, редактор, длинные посты'),
  ('Discord Nitro', 'social', '💬', 9.99, 24.99, 89.99, 'HD-стриминг, эмодзи, буст серверов'),
  ('iCloud+', 'cloud', '☁️', 2.99, 7.99, 29.99, '50GB облачного хранилища Apple'),
  ('Google One', 'cloud', '☁️', 1.99, 5.99, 19.99, '100GB облачного хранилища Google'),
  ('Dropbox Plus', 'cloud', '☁️', 11.99, 29.99, 99.99, '2TB облачного хранилища'),
  ('NordVPN', 'vpn', '🛡️', 11.99, 29.99, 79.99, 'VPN с защитой от угроз'),
  ('ExpressVPN', 'vpn', '🛡️', 12.95, 33.95, 95.95, 'Быстрый VPN, 90+ стран'),
  ('Surfshark', 'vpn', '🛡️', 10.99, 25.99, 59.99, 'VPN без ограничения устройств')
ON CONFLICT DO NOTHING;

-- 8. UPDATE OWNER: make Nikita the owner with business subscription
UPDATE users 
SET role = 'owner', 
    subscription = 'business',
    commission_rate = 0
WHERE telegram_id = 7320418026;