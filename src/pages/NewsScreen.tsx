import React, { useState, useEffect } from 'react';
import { haptic } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface Article {
  id: string;
  category: string;
  title: string;
  summary: string;
  content: string;
  date: string;
  views: number;
}

// Default articles (can be managed from admin later)
const DEFAULT_ARTICLES: Article[] = [
  {
    id: '1', category: 'ecosystem', title: 'Добро пожаловать в Luna Bank!',
    summary: 'Ваша крипто-финансовая экосистема в Telegram',
    content: 'Luna Bank — это полноценная финансовая платформа внутри Telegram.\n\nОткрывайте счета, переводите средства, обменивайте криптовалюты, играйте в мини-игры и зарабатывайте Luna Coins.\n\n1 LNC = $0.05\n\nНачните с открытия первого счёта!',
    date: new Date().toISOString().split('T')[0], views: 0,
  },
  {
    id: '2', category: 'security', title: 'Безопасность вашего аккаунта',
    summary: 'Как защитить свои средства в Luna Bank',
    content: 'Советы по безопасности:\n\n1. Используйте сложный PIN-код\n2. Включите биометрию\n3. Никому не сообщайте PIN\n4. Проверяйте адреса перед переводом\n5. Пройдите KYC для повышения лимитов',
    date: new Date().toISOString().split('T')[0], views: 0,
  },
];

const CATEGORIES = [
  { id: 'all', label: 'Все' },
  { id: 'ecosystem', label: 'Экосистема' },
  { id: 'security', label: 'Безопасность' },
];

export default function NewsScreen() {
  const [category, setCategory] = useState('all');
  const [articles] = useState<Article[]>(DEFAULT_ARTICLES);
  const [selected, setSelected] = useState<Article | null>(null);

  const filtered = category === 'all'
    ? articles
    : articles.filter(a => a.category === category);

  if (selected) {
    return (
      <div className="h-full overflow-y-auto pb-24 safe-top">
        <div className="px-5 pt-4 pb-2 flex items-center gap-4">
          <button onClick={() => setSelected(null)} className="text-white/50 text-sm">← Назад</button>
        </div>
        <article className="px-5 mt-2 animate-fade-in">
          <div className="glass p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] bg-white/[0.08] px-2 py-0.5 rounded-lg">{selected.category}</span>
              <span className="text-[11px] text-white/25">{selected.date}</span>
            </div>
            <h2 className="text-xl font-extrabold mb-4">{selected.title}</h2>
            <div className="text-[13px] text-white/60 leading-relaxed whitespace-pre-line">{selected.content}</div>
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-24 safe-top">
      <div className="px-5 pt-6">
        <h1 className="text-2xl font-extrabold mb-4">Новости</h1>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => { haptic('light'); setCategory(c.id); }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${category === c.id ? 'bg-white text-black' : 'glass text-white/50'}`}>
              {c.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📰</p>
            <p className="text-white/35">Нет новостей в этой категории</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((article, i) => (
              <button key={article.id} onClick={() => { haptic('light'); setSelected(article); }}
                className="w-full glass p-4 text-left animate-slide-up active:scale-[0.98] transition-all"
                style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] bg-white/[0.08] px-2 py-0.5 rounded-lg">{article.category}</span>
                  <span className="text-[11px] text-white/20">{article.date}</span>
                </div>
                <h3 className="font-bold mb-1">{article.title}</h3>
                <p className="text-sm text-white/35 line-clamp-2">{article.summary}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
