-- ============================================
-- Luna Bank — Features Migration
-- P2P Offers, Marketplace Listings, Savings Goals
-- Run in Supabase SQL Editor
-- ============================================

-- ===== P2P OFFERS =====
CREATE TABLE IF NOT EXISTS p2p_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  username TEXT NOT NULL DEFAULT '',
  first_name TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  amount NUMERIC(20, 8) NOT NULL,
  price NUMERIC(20, 4) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'RUB',
  min_limit NUMERIC(20, 2) DEFAULT 100,
  max_limit NUMERIC(20, 2) DEFAULT 0,
  payment_methods JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE p2p_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON p2p_offers FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_p2p_user ON p2p_offers(user_id);
CREATE INDEX IF NOT EXISTS idx_p2p_status ON p2p_offers(status);

-- ===== MARKETPLACE LISTINGS =====
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  seller_name TEXT NOT NULL DEFAULT '',
  seller_username TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  price NUMERIC(20, 8) NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  image_emoji TEXT DEFAULT '📦',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled')),
  buyer_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON marketplace_listings FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_marketplace_seller ON marketplace_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_status ON marketplace_listings(status);

-- ===== SAVINGS GOALS =====
CREATE TABLE IF NOT EXISTS savings_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🎯',
  target NUMERIC(20, 8) NOT NULL,
  saved NUMERIC(20, 8) DEFAULT 0,
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON savings_goals FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_savings_user ON savings_goals(user_id);

-- ===== ESCROW DEALS =====
CREATE TABLE IF NOT EXISTS escrow_deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id BIGINT NOT NULL REFERENCES users(telegram_id),
  seller_username TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  amount NUMERIC(20, 8) NOT NULL,
  fee NUMERIC(20, 8) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'funded' CHECK (status IN ('funded', 'delivered', 'completed', 'disputed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE escrow_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON escrow_deals FOR ALL USING (true) WITH CHECK (true);

-- ===== EARN DEPOSITS =====
CREATE TABLE IF NOT EXISTS earn_deposits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  product TEXT NOT NULL,
  amount NUMERIC(20, 8) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'LNC',
  apy NUMERIC(5, 2) NOT NULL,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'done')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE earn_deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON earn_deposits FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_earn_user ON earn_deposits(user_id);

-- ===== NEWS ARTICLES =====
CREATE TABLE IF NOT EXISTS news_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL DEFAULT 'ecosystem',
  title TEXT NOT NULL,
  summary TEXT DEFAULT '',
  content TEXT DEFAULT '',
  views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON news_articles FOR ALL USING (true) WITH CHECK (true);

-- Insert default articles
INSERT INTO news_articles (category, title, summary, content) VALUES
('ecosystem', 'Добро пожаловать в Luna Bank!', 'Ваша крипто-финансовая экосистема в Telegram', 'Luna Bank — полноценная финансовая платформа внутри Telegram. Счета, переводы, крипта, игры и AI-ассистент. 1 LNC = $0.05'),
('security', 'Безопасность аккаунта', 'Как защитить свои средства', 'Советы: 1) Сложный PIN-код 2) Биометрия 3) Не сообщайте PIN 4) Проверяйте адреса 5) Пройдите KYC'),
('ecosystem', 'TON Connect', 'Подключите кошелёк для крипто-операций', 'Подключите Tonkeeper или MyTonWallet. Реальные балансы, реальные транзакции, прямо из блокчейна.'),
('ecosystem', 'P2P Биржа', 'Покупайте и продавайте LNC за рубли', 'Создавайте объявления, выбирайте способ оплаты. Безопасные сделки между пользователями.'),
('ecosystem', 'Реферальная программа', 'Приглашай друзей — получай бонусы', 'За каждого друга, который зарегистрируется по вашей ссылке, вы оба получите 50 LNC!')
ON CONFLICT DO NOTHING;
