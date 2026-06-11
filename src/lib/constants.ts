export const PROJECT_WALLET = 'UQA9IgVuB-8GUVRttmh4zjhg5yFYXBMhGHWyt7ASJF1VuZJD';
export const LNC_RATE_USD = 0.05; // 1 LNC = $0.05

export const ACCOUNT_TYPES = [
  { id: 'personal', name: 'Личный', currency: 'LNC', icon: '👤', requiresWallet: false, desc: 'Основной счёт в Luna Coin' },
  { id: 'business', name: 'Бизнес', currency: 'LNC', icon: '💼', requiresWallet: false, desc: 'Для предпринимателей' },
  { id: 'ton', name: 'TON', currency: 'TON', icon: '💎', requiresWallet: true, desc: 'Крипто-счёт Toncoin' },
  { id: 'usdt', name: 'USDT', currency: 'USDT', icon: '💵', requiresWallet: true, desc: 'Стейблкоин Tether' },
  { id: 'bitcoin', name: 'Bitcoin', currency: 'BTC', icon: '₿', requiresWallet: true, desc: 'Крипто-счёт Bitcoin' },
  { id: 'ethereum', name: 'Ethereum', currency: 'ETH', icon: 'Ξ', requiresWallet: true, desc: 'Крипто-счёт Ethereum' },
] as const;

export const CARD_DESIGNS = [
  { id: 'classic', name: 'Classic', bg: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', color: '#fff' },
  { id: 'white', name: 'White', bg: 'linear-gradient(145deg, #f8f9fa 0%, #e9ecef 50%, #dee2e6 100%)', color: '#000' },
  { id: 'gradient', name: 'Gradient', bg: 'linear-gradient(145deg, #7c3aed 0%, #a855f7 40%, #ec4899 100%)', color: '#fff' },
  { id: 'night', name: 'Night', bg: 'linear-gradient(145deg, #1e1b4b 0%, #312e81 50%, #3730a3 100%)', color: '#fff' },
  { id: 'ocean', name: 'Ocean', bg: 'linear-gradient(145deg, #0c4a6e 0%, #0284c7 50%, #06b6d4 100%)', color: '#fff' },
  { id: 'metal', name: 'Metal', bg: 'linear-gradient(145deg, #71717a 0%, #a1a1aa 30%, #71717a 60%, #a1a1aa 100%)', color: '#000' },
] as const;

export const SUBSCRIPTION_PLANS = [
  { id: 'free', name: 'Free', price: 0, commission: 0.5, cashback: 0, dailyLimit: 1000, support: 'Чат', icon: '🆓' },
  { id: 'plus', name: 'Plus', price: 4.99, commission: 0.3, cashback: 1, dailyLimit: 10000, support: 'Приоритет', icon: '⭐' },
  { id: 'cosmic', name: 'Cosmic', price: 19.99, commission: 0, cashback: 3, dailyLimit: Infinity, support: 'VIP 24/7', icon: '🚀' },
] as const;

export const CURRENCIES: Record<string, { symbol: string; flag: string; rate: number }> = {
  USD: { symbol: '$', flag: '🇺🇸', rate: 1 },
  LNC: { symbol: '◎', flag: '🌙', rate: 1 / LNC_RATE_USD }, // 1 USD = 20 LNC
  RUB: { symbol: '₽', flag: '🇷🇺', rate: 89.5 },
  EUR: { symbol: '€', flag: '🇪🇺', rate: 0.92 },
  GBP: { symbol: '£', flag: '🇬🇧', rate: 0.79 },
  CNY: { symbol: '¥', flag: '🇨🇳', rate: 7.24 },
  JPY: { symbol: '¥', flag: '🇯🇵', rate: 149.5 },
  TRY: { symbol: '₺', flag: '🇹🇷', rate: 32.1 },
  KZT: { symbol: '₸', flag: '🇰🇿', rate: 449.0 },
  UAH: { symbol: '₴', flag: '🇺🇦', rate: 41.2 },
  BYN: { symbol: 'Br', flag: '🇧🇾', rate: 3.27 },
  UZS: { symbol: 'сўм', flag: '🇺🇿', rate: 12650 },
  AZN: { symbol: '₼', flag: '🇦🇿', rate: 1.7 },
  AMD: { symbol: '֏', flag: '🇦🇲', rate: 387 },
  GEL: { symbol: '₾', flag: '🇬🇪', rate: 2.67 },
  KGS: { symbol: 'сом', flag: '🇰🇬', rate: 89.2 },
  MDL: { symbol: 'L', flag: '🇲🇩', rate: 17.7 },
  TJS: { symbol: 'SM', flag: '🇹🇯', rate: 10.93 },
  TMT: { symbol: 'm', flag: '🇹🇲', rate: 3.5 },
};

export const CRYPTO_PRICES: Record<string, number> = {
  TON: 6.85, BTC: 71250, ETH: 3820, USDT: 1.0, LNC: LNC_RATE_USD,
};

export const JOBS = [
  { id: 'courier', name: 'Курьер', icon: '🚴', pay: 5, xp: 10, cooldown: 60, level: 1 },
  { id: 'freelancer', name: 'Фрилансер', icon: '💻', pay: 15, xp: 25, cooldown: 120, level: 3 },
  { id: 'developer', name: 'Разработчик', icon: '👨‍💻', pay: 35, xp: 50, cooldown: 180, level: 5 },
  { id: 'manager', name: 'Менеджер', icon: '📊', pay: 60, xp: 80, cooldown: 240, level: 8 },
  { id: 'trader', name: 'Трейдер', icon: '📈', pay: 100, xp: 120, cooldown: 300, level: 12 },
];

export const BUSINESSES = [
  { id: 'coffee', name: 'Кофейня', icon: '☕', cost: 500, income: 10, xp: 15, level: 2 },
  { id: 'shop', name: 'Магазин', icon: '🏪', cost: 2000, income: 35, xp: 40, level: 5 },
  { id: 'office', name: 'Офис', icon: '🏢', cost: 5000, income: 80, xp: 70, level: 8 },
  { id: 'restaurant', name: 'Ресторан', icon: '🍽️', cost: 15000, income: 200, xp: 150, level: 12 },
];

export const NEWS_ARTICLES = [
  { id: 1, category: 'news', title: 'Luna Bank запускает новую платформу', summary: 'Революционная крипто-финансовая экосистема теперь доступна в Telegram', date: '2025-01-15', views: 2847, content: 'Luna Bank представляет новый формат банкинга — полноценную финансовую экосистему внутри Telegram.\n\nПользователи могут открывать счета, совершать переводы, управлять криптовалютой и играть в экономическую игру Luna City.\n\nПлатформа поддерживает TON, Bitcoin, Ethereum, USDT и собственную валюту Luna Coin (LNC) по курсу 1 LNC = $0.05.\n\nБлагодаря TON Connect пользователи подключают любой совместимый кошелёк и мгновенно начинают операции.' },
  { id: 2, category: 'investments', title: 'TON показал рост на 45% за месяц', summary: 'Toncoin обновляет максимумы на фоне роста экосистемы', date: '2025-01-14', views: 5621, content: 'Криптовалюта Toncoin (TON) выросла на 45% за последний месяц, достигнув $6.85.\n\nАналитики связывают рост с увеличением числа пользователей Telegram Mini Apps и объёма транзакций в сети TON.\n\nЭкосистема TON продолжает привлекать разработчиков благодаря низким комиссиям и высокой скорости.' },
  { id: 3, category: 'security', title: 'Как защитить свой крипто-кошелёк', summary: '5 правил безопасности для работы с криптовалютой', date: '2025-01-13', views: 3214, content: '1. Никогда не делитесь seed-фразой\n2. Используйте аппаратный кошелёк для крупных сумм\n3. Включите 2FA везде\n4. Проверяйте адреса перед отправкой\n5. Обновляйте ПО кошелька' },
  { id: 4, category: 'ecosystem', title: 'Luna City: экономическая игра внутри банка', summary: 'Зарабатывайте реальные LNC, играя в Luna City', date: '2025-01-12', views: 4102, content: 'Luna City — уникальная мини-игра в Luna Bank.\n\nВыбирайте профессии (от Курьера до Трейдера), открывайте бизнесы и зарабатывайте реальные Luna Coins на банковский счёт.\n\n5 профессий, 4 бизнеса, глобальный рейтинг лидеров.' },
  { id: 5, category: 'news', title: 'Обновление: 6 дизайнов карт', summary: '6 уникальных дизайнов для виртуальных и пластиковых карт', date: '2025-01-11', views: 1893, content: 'Luna Bank представляет 6 новых дизайнов: Classic, White, Gradient, Night, Ocean, Metal.\n\nВиртуальные — бесплатно и мгновенно.\nПластиковые — $19.99 с доставкой 3-7 дней.' },
  { id: 6, category: 'investments', title: 'Bitcoin преодолел $70,000', summary: 'BTC обновляет исторические максимумы', date: '2025-01-10', views: 7823, content: 'Bitcoin впервые преодолел $70,000.\n\nРост связывают с одобрением Bitcoin-ETF и институциональным интересом.\n\nАналитики прогнозируют $100,000 к концу года.' },
  { id: 7, category: 'security', title: 'Двухфакторная аутентификация в Luna Bank', summary: 'PIN + биометрия для максимальной защиты', date: '2025-01-09', views: 2156, content: 'Luna Bank: PIN при каждом входе, опциональная биометрия, логирование операций, SHA-256 хеширование с солью по Telegram ID.' },
  { id: 8, category: 'ecosystem', title: 'Подписки: от Free до Cosmic', summary: 'Выберите тариф, который подходит вам', date: '2025-01-08', views: 3567, content: 'Free ($0) — 0.5% комиссия, $1,000/день\nPlus ($4.99) — 0.3%, кэшбэк 1%, $10,000/день\nCosmic ($19.99) — 0%, кэшбэк 3%, безлимит, VIP 24/7' },
];

export const FAQ_ITEMS = [
  { q: 'Как открыть счёт?', a: 'Счета → "+ Открыть" → выберите тип → заполните данные → подпишите договор.' },
  { q: 'Как пополнить счёт?', a: 'На странице счёта → "Пополнить" → купить за крипту или получить перевод.' },
  { q: 'Как перевести деньги?', a: '"Переводы" → найти по @username или Luna ID → выбрать счёт и сумму → подтвердить.' },
  { q: 'Какие комиссии?', a: 'Free: 0.5%, Plus: 0.3%, Cosmic: 0%. Автоматически от суммы перевода.' },
  { q: 'Что такое LNC?', a: 'Luna Coin — внутренняя валюта. 1 LNC = $0.05. Для переводов, подписок и покупок.' },
  { q: 'Как подключить TON-кошелёк?', a: 'Профиль → TON-кошелёк. Поддерживаются Tonkeeper, MyTonWallet, Wallet, Tonhub.' },
  { q: 'Как пройти KYC?', a: 'Профиль → Верификация → 6 шагов → лимиты до $50,000/мес.' },
  { q: 'Как оформить карту?', a: 'Страница счёта → "Оформить карту". Виртуальная $0, премиум $4.99, пластик $19.99.' },
  { q: 'Как сменить PIN?', a: 'Профиль → Безопасность → Сменить PIN.' },
  { q: 'Как восстановить доступ?', a: 'Войдите через тот же Telegram. Забыли PIN — обратитесь в поддержку.' },
  { q: 'Что такое Luna City?', a: 'Мини-игра: профессии, бизнесы, реальные LNC на счёт.' },
  { q: 'Как связаться с поддержкой?', a: '"Чаты" → "Поддержка". Робот + оператор + FAQ.' },
];
