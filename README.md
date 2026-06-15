# 🌙 Luna Bank v1.3

**Крипто-финансовая экосистема в Telegram**

> 40 экранов · 14,600+ строк · React 19 + TypeScript + Supabase + TON Connect

---

## 🚀 Live

- **App:** [luna-bank-app.vercel.app](https://luna-bank-app.vercel.app)
- **Bot:** [@LunaBankBot](https://t.me/LunaBankBot)
- **Owner:** TG ID `7320418026`

---

## 📱 Возможности

### 🏦 Банкинг
- 6 типов счетов (Personal, Business, TON, USDT, BTC, ETH)
- Электронная подпись (canvas) + PDF-контракт
- Переводы по username, Luna ID, телефону, TON-адресу
- Виртуальные карты (6 дизайнов)
- QR-коды для переводов
- Копилки с целями

### 💎 Крипто
- **TON Connect** — реальное подключение кошелька
- **Реальный баланс** из блокчейна (TON Center API)
- **Реальная отправка TON** через `sendTransaction()`
- **Реальные цены** через CoinGecko API (12 монет, 7д графики)
- Крипто-портфель с P&L
- Обмен валют с подтверждением
- P2P биржа (купля/продажа за рубли)
- Стейкинг/вклады с реальным начислением %
- Депозит через TON → LNC

### 🤖 AI & Bot
- AI-чат (OpenRouter, Llama 3.1 8B)
- Telegram Bot (@LunaBankBot) — /start /balance /help /id /app
- Push-уведомления при переводах, KYC, покупках
- 2FA OTP через бот

### 🎮 Развлечения
- 5 мини-работ (Курьер, Фрилансер, Разработчик, Менеджер, Трейдер)
- 3 казино-игры (Lucky Spin, Crash, Coin Flip)
- 16 ачивок с XP-наградами
- Глобальный лидерборд
- NFT-маркет

### 🛡️ Безопасность
- PIN-код (SHA-256)
- WebAuthn биометрия (Face ID / Touch ID)
- Telegram BiometricManager (нативная)
- Верификация initData (HMAC-SHA256)
- KYC с админ-одобрением

### 📊 Платформа
- 8 тем оформления
- 13 анимированных SVG-эмодзи
- Stories (как в Тинькофф)
- Маркетплейс (товары за LNC)
- Реферальная программа (◎50 LNC за друга)
- 3 тарифа подписки (Free / Plus / Cosmic)
- Админ-панель (9 вкладок, owner-only)
- PDF-документы (5 типов)
- Telegram Contacts API

---

## 🗄️ База данных (18 таблиц)

```
users, accounts, transactions, cards
wallet_connections, kyc_requests, support_chats
notifications, referrals, otp_codes
login_sessions, audit_log, p2p_offers
marketplace_listings, savings_goals
escrow_deals, earn_deposits, news_articles
```

---

## 🔌 API (Vercel Serverless)

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `/api/bot` | POST | Telegram webhook handler |
| `/api/notify` | POST | Push-уведомления через бот |
| `/api/auth` | POST | Верификация initData |
| `/api/otp` | POST | 2FA OTP (send/verify) |

---

## ⚙️ Стек

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 3
- **Backend:** Supabase (PostgreSQL), Vercel Serverless
- **Crypto:** @tonconnect/ui-react, TON Center API, CoinGecko API
- **AI:** OpenRouter (Llama 3.1 8B)
- **Bot:** Telegram Bot API (webhook)
- **Auth:** WebAuthn, PIN SHA-256, Telegram initData HMAC
- **PDF:** jsPDF
- **QR:** qrcode.react

---

## 📦 Установка

```bash
git clone https://github.com/Nikita00NS/luna-bank-app.git
cd luna-bank-app
npm install
cp .env.example .env  # добавить VITE_OPENROUTER_KEY
npm run dev
```

---

## 📄 Лицензия

MIT © Luna Bank 2026

> 1 LNC = $0.05 🌙
