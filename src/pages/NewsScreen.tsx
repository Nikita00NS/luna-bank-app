import React, { useState } from 'react';
import { haptic } from '../lib/utils';

// ===== Article Data =====
const ARTICLES = [
  {
    id: 1,
    category: 'news',
    title: 'Luna Bank запускает новую платформу',
    summary: 'Революционная крипто-экосистема теперь в Telegram',
    date: '2025-01-15',
    views: 2847,
    content:
      'Luna Bank представляет новый формат банкинга — полноценную финансовую экосистему внутри Telegram.\n\nПользователи могут открывать счета, совершать переводы, управлять криптовалютой и играть в экономическую игру Luna City.\n\nПлатформа поддерживает TON, Bitcoin, Ethereum, USDT и собственную валюту Luna Coin (LNC) по курсу 1 LNC = $0.05.',
  },
  {
    id: 2,
    category: 'investments',
    title: 'TON показал рост на 45% за месяц',
    summary: 'Toncoin обновляет максимумы',
    date: '2025-01-14',
    views: 5621,
    content:
      'Криптовалюта Toncoin (TON) выросла на 45% за последний месяц, достигнув $6.85.\n\nАналитики связывают рост с увеличением числа пользователей Telegram Mini Apps.',
  },
  {
    id: 3,
    category: 'security',
    title: 'Как защитить крипто-кошелёк',
    summary: '5 правил безопасности',
    date: '2025-01-13',
    views: 3214,
    content:
      '1. Никогда не делитесь seed-фразой\n2. Используйте аппаратный кошелёк для крупных сумм\n3. Включите 2FA везде\n4. Проверяйте адреса перед отправкой\n5. Обновляйте ПО кошелька',
  },
  {
    id: 4,
    category: 'ecosystem',
    title: 'Luna City: игра внутри банка',
    summary: 'Зарабатывайте реальные LNC',
    date: '2025-01-12',
    views: 4102,
    content:
      'Luna City — уникальная мини-игра в Luna Bank.\n\nВыбирайте профессии от Курьера до Трейдера, открывайте бизнесы и зарабатывайте реальные Luna Coins.\n\n5 профессий, 4 бизнеса, глобальный рейтинг.',
  },
  {
    id: 5,
    category: 'investments',
    title: 'Bitcoin преодолел $70,000',
    summary: 'BTC обновляет исторические максимумы',
    date: '2025-01-10',
    views: 7823,
    content:
      'Bitcoin впервые преодолел $70,000.\n\nРост связывают с одобрением Bitcoin-ETF и институциональным интересом.',
  },
  {
    id: 6,
    category: 'ecosystem',
    title: 'Подписки: Free, Plus, Cosmic',
    summary: 'Выберите свой тариф',
    date: '2025-01-08',
    views: 3567,
    content:
      'Free ($0) — 0.5% комиссия\nPlus ($4.99) — 0.3%, кэшбэк 1%\nCosmic ($19.99) — 0%, кэшбэк 3%, VIP 24/7',
  },
];

const CATEGORIES = [
  { id: 'all', label: 'Все' },
  { id: 'news', label: 'Новости' },
  { id: 'investments', label: 'Инвестиции' },
  { id: 'security', label: 'Безопасность' },
  { id: 'ecosystem', label: 'Экосистема' },
];

export default function NewsScreen() {
  const [category, setCategory] = useState('all');
  const [selectedArticle, setSelectedArticle] = useState<(typeof ARTICLES)[number] | null>(null);

  const filtered =
    category === 'all'
      ? ARTICLES
      : ARTICLES.filter((a) => a.category === category);

  // ===== Article View =====
  if (selectedArticle) {
    return (
      <div className="h-full overflow-y-auto pb-24 safe-top">
        <div className="px-5 pt-4 pb-2 flex items-center gap-4">
          <button
            onClick={() => setSelectedArticle(null)}
            className="text-white/50 text-sm"
          >
            ← Назад
          </button>
        </div>

        <article className="px-5 mt-2 animate-fade-in">
          <div className="glass p-5">
            {/* Meta */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] bg-white/[0.08] px-2 py-0.5 rounded-lg">
                {selectedArticle.category}
              </span>
              <span className="text-[11px] text-white/25">
                {selectedArticle.date}
              </span>
              <span className="text-[11px] text-white/25">
                👁 {selectedArticle.views}
              </span>
            </div>

            {/* Title */}
            <h2 className="text-xl font-extrabold mb-4">
              {selectedArticle.title}
            </h2>

            {/* Content */}
            <div className="text-[13px] text-white/60 leading-relaxed whitespace-pre-line">
              {selectedArticle.content}
            </div>
          </div>
        </article>
      </div>
    );
  }

  // ===== Feed View =====
  return (
    <div className="h-full overflow-y-auto pb-24 safe-top">
      <div className="px-5 pt-6">
        <h1 className="text-2xl font-extrabold mb-4">📰 Витрина</h1>

        {/* Category tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                haptic('light');
                setCategory(c.id);
              }}
              className={`
                px-4 py-2 rounded-xl text-sm font-semibold
                whitespace-nowrap transition-all
                ${
                  category === c.id
                    ? 'bg-white text-black'
                    : 'glass text-white/50'
                }
              `}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Article list */}
        <div className="space-y-3">
          {filtered.map((article, i) => (
            <button
              key={article.id}
              onClick={() => {
                haptic('light');
                setSelectedArticle(article);
              }}
              className="
                w-full glass p-4 text-left
                animate-slide-up active:scale-[0.98] transition-all
              "
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              {/* Meta */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] bg-white/[0.08] px-2 py-0.5 rounded-lg">
                  {article.category}
                </span>
                <span className="text-[11px] text-white/20">
                  {article.date}
                </span>
              </div>

              {/* Title + Summary */}
              <h3 className="font-bold mb-1">{article.title}</h3>
              <p className="text-sm text-white/35 line-clamp-2">
                {article.summary}
              </p>

              {/* Views */}
              <span className="text-[11px] text-white/20 mt-2 block">
                👁 {article.views}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
