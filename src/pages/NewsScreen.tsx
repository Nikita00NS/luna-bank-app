import React, { useState, useEffect } from 'react';
import { haptic } from '../lib/utils';
import { dbGetNews } from '../lib/db';

interface Article {
  id: string;
  category: string;
  title: string;
  summary: string;
  content: string;
  created_at: string;
  views: number;
}

const CATEGORIES = [
  { id: 'all', label: 'Все' },
  { id: 'ecosystem', label: 'Экосистема' },
  { id: 'security', label: 'Безопасность' },
];

// Fallback if Supabase has no articles yet
const FALLBACK: Article[] = [
  { id: '1', category: 'ecosystem', title: 'Добро пожаловать в Luna Bank!', summary: 'Ваша крипто-финансовая экосистема в Telegram', content: 'Luna Bank — полноценная финансовая платформа.\n\nСчета, переводы, крипта, игры и AI.\n\n1 LNC = $0.05', created_at: new Date().toISOString(), views: 0 },
  { id: '2', category: 'security', title: 'Безопасность аккаунта', summary: 'Как защитить свои средства', content: '1. Сложный PIN\n2. Биометрия\n3. Не сообщайте PIN\n4. Проверяйте адреса\n5. Пройдите KYC', created_at: new Date().toISOString(), views: 0 },
];

export default function NewsScreen() {
  const [category, setCategory] = useState('all');
  const [articles, setArticles] = useState<Article[]>([]);
  const [selected, setSelected] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadNews(); }, [category]);

  const loadNews = async () => {
    setLoading(true);
    try {
      const data = await dbGetNews(category);
      setArticles(data.length > 0 ? data as Article[] : FALLBACK);
    } catch {
      setArticles(FALLBACK);
    }
    setLoading(false);
  };

  const filtered = category === 'all' ? articles : articles.filter(a => a.category === category);

  if (selected) {
    return (
      <div className="h-full overflow-y-auto pb-24 safe-top">
        <div className="px-5 pt-4 pb-2 flex items-center gap-4">
          <button onClick={() => setSelected(null)} className="text-white/50 text-sm">← Назад</button>
        </div>
        <article className="px-5 mt-2 animate-fade-in">
          <div className="glass p-5 rounded-2xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] bg-white/[0.08] px-2 py-0.5 rounded-lg">{selected.category}</span>
              <span className="text-[11px] text-white/25">{new Date(selected.created_at).toLocaleDateString('ru-RU')}</span>
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
        {loading ? (
          <div className="text-center py-10"><div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16"><p className="text-4xl mb-3">📰</p><p className="text-white/35">Нет новостей</p></div>
        ) : (
          <div className="space-y-3">
            {filtered.map((article, i) => (
              <button key={article.id} onClick={() => { haptic('light'); setSelected(article); }}
                className="w-full glass p-4 text-left rounded-2xl animate-slide-up active:scale-[0.98] transition-all" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] bg-white/[0.08] px-2 py-0.5 rounded-lg">{article.category}</span>
                  <span className="text-[11px] text-white/20">{new Date(article.created_at).toLocaleDateString('ru-RU')}</span>
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
