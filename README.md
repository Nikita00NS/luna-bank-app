# 🏦 Luna Wallet v2.0

**Крипто-кошелёк на TON Blockchain** — React 19 + TypeScript + Vite + Tailwind + Capacitor

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646cff)](https://vitejs.dev/)
[![TON](https://img.shields.io/badge/TON-Blockchain-0098ea)](https://ton.org/)
[![Capacitor](https://img.shields.io/badge/Capacitor-8-119eff)](https://capacitorjs.com/)
[![License](https://img.shields.io/badge/License-MIT-green)]()

---

## 📱 Screenshots

| Главная | Отправка | Обмен | P2P | Портфель |
|---------|----------|-------|-----|----------|
| Баланс, активы, история | TON/jettons | DEX агрегатор | Торговля | CoinGecko |

---

## ✨ Возможности

### 💎 Кошелёк
- **TON Connect** — подключение через Tonkeeper, Wallet, Tonhub
- **Реальные балансы** — TON Center API + tonapi.io
- **Jettons** — USDT, HMSTR, tsTON, NOT, DOGS и все токены TON
- **NFT** — галерея с tonapi.io, 40+ NFT

### 🔄 Транзакции
- **Отправка** — TON Connect `sendTransaction` с комментариями
- **Получение** — QR-код, TON URI, копирование адреса
- **История** — из блокчейна, фильтры (все/получено/отправлено)
- **Детали** — статус, сумма, комиссия, Tx Hash, ссылка в TON Viewer

### 💱 DeFi
- **DEX Своп** — STON.fi + DeDust, лучшие маршруты
- **Агрегатор обменников** — BestChange, ChangeNOW, SwapSpace, Exolix, SimpleSwap, FixedFloat
- **Портфель** — CoinGecko, реальные цены, 24h изменение

### 🤝 P2P
- **Торговля** — крипта за рубли между пользователями
- **Способы оплаты** — Сбербанк, Т-Банк, Альфа-Банк, ВТБ, наличные
- **Рейтинг** — отзывы, верификация, количество сделок

### 📡 Технологии
- **QR-оплата** — сканирование QR-кода с адресом
- **NFC** — считывание тега → форма оплаты
- **BLE** — Bluetooth передача между телефонами
- **Deep Links** — `ton://transfer/...` обработка

### 🔐 Безопасность
- PIN-код с подтверждением транзакций
- Session lock (автоблокировка 5 мин)
- Rate limiting (5 попыток/мин)
- Error Boundary
- Валидация адресов и сумм

### 🌐 Мультиязычность
- Русский / English
- 150+ строк перевода

---

## 🏗 Архитектура

```
src/
├── App.tsx                    # Корневой компонент, роутинг
├── main.tsx                   # Точка входа, TON Connect Provider
├── components/                # UI компоненты
│   ├── BottomNav.tsx          # Нижняя навигация (5 вкладок)
│   ├── ErrorBoundary.tsx      # Глобальный перехват ошибок
│   ├── Icons.tsx              # SVG иконки (40+)
│   ├── Toast.tsx              # Toast-уведомления
│   ├── PriceChart.tsx         # График цен (SVG)
│   └── ListVirtualizer.tsx    # Виртуальный список
├── hooks/                     # React хуки
│   ├── useWallet.ts           # Все операции кошелька
│   ├── useDeepLink.ts         # Deep link обработка
│   ├── useP2P.ts              # P2P торговля
│   └── usePriceChart.ts       # График цен
├── lib/                       # Бизнес-логика
│   ├── ton.ts                 # TON Blockchain API
│   ├── coingecko.ts           # CoinGecko API
│   ├── dex.ts                 # DEX (STON.fi / DeDust)
│   ├── store.ts               # Zustand store
│   ├── supabase.ts            # Supabase клиент
│   ├── db.ts                  # Database операции
│   ├── bot.ts                 # Telegram Bot API
│   ├── i18n.ts                # Мультиязычность
│   ├── security.ts            # PIN, биометрия
│   ├── deeplink.ts            # TON Deep Links
│   ├── constants.ts           # Константы
│   ├── utils.ts               # Форматирование
│   ├── toast.ts               # Toast система
│   └── capacitor.ts           # Capacitor native
├── pages/                     # Экраны (18 шт)
│   ├── HomeScreen.tsx         # Главный экран
│   ├── SendScreen.tsx         # Отправка
│   ├── ReceiveScreen.tsx      # Получение
│   ├── SwapScreen.tsx         # Обмен
│   ├── HistoryScreen.tsx      # История
│   ├── TxDetailScreen.tsx     # Детали транзакции
│   ├── TxConfirmScreen.tsx    # Подтверждение с PIN
│   ├── PortfolioScreen.tsx    # Портфель
│   ├── P2PScreen.tsx          # P2P торговля
│   ├── AggregatorScreen.tsx   # Агрегатор обменников
│   ├── AuthScreen.tsx         # Авторизация
│   ├── SettingsScreen.tsx     # Настройки
│   ├── ProfileScreen.tsx      # Профиль
│   ├── QRScanScreen.tsx       # QR сканер
│   ├── QRPayScreen.tsx        # QR оплата
│   ├── NFCPayScreen.tsx       # NFC оплата
│   ├── BLETransferScreen.tsx  # BLE передача
│   ├── NFTGalleryScreen.tsx   # NFT галерея
│   ├── TokenDetailScreen.tsx  # Управление токенами
│   └── NotificationsScreen.tsx # Уведомления
└── styles/
    └── index.css              # Дизайн-система
```

---

## 🚀 Быстрый старт

```bash
# Установка
npm install

# Разработка
npm run dev

# Сборка
npm run build

# Проверка типов
npx tsc --noEmit
```

---

## 📦 Сборка

### Production билд
```bash
npm run build
```
Результат: `dist/` — 4.1 MB, 29 чанков (code splitting)

### iOS (Capacitor)
```bash
npm run build
npx cap sync ios
npx cap open ios
```

### Android (Capacitor)
```bash
npm run build
npx cap sync android
npx cap open android
```

---

## 🔗 Интеграции

| Сервис | Назначение | API |
|--------|-----------|-----|
| [TON Center](https://toncenter.com) | Балансы, транзакции | v2 API |
| [tonapi.io](https://tonapi.io) | Jettons, NFT | v2 API |
| [CoinGecko](https://coingecko.com) | Цены криптовалют | v3 API |
| [STON.fi](https://ston.fi) | DEX свопы | v1 API |
| [DeDust](https://dedust.io) | DEX свопы | v1 API |
| [Supabase](https://supabase.com) | База данных | JS SDK |
| [TON Connect](https://ton.org/connect) | Подключение кошелька | v3 |
| [Telegram Bot](https://core.telegram.org/bots) | Push уведомления | Bot API |

---

## 📊 Размеры чанков

| Чанк | Размер | Gzip |
|------|--------|------|
| `vendor-ton` | 452 KB | 134 KB |
| `index.js` | 214 KB | 67 KB |
| `vendor-supabase` | 208 KB | 54 KB |
| `vendor-qrcode` | 17 KB | 6 KB |
| `i18n` | 9 KB | 3 KB |
| `HomeScreen` | 14 KB | 4 KB |
| `P2PScreen` | 13 KB | 4 KB |
| `SwapScreen` | 9 KB | 3 KB |
| Все остальные | 2-7 KB | 1-2 KB |

---

## 🛠 Технологии

| Технология | Версия |
|-----------|--------|
| React | 19.1 |
| TypeScript | 5.7 |
| Vite | 6.4 |
| Tailwind CSS | 3.4 |
| Zustand | 5.0 |
| Capacitor | 8.4 |
| TON Connect SDK | 3.0 |
| Supabase JS | 2.108 |
| qrcode.react | 4.2 |

---

## 📄 License

MIT © 2025 Luna Wallet