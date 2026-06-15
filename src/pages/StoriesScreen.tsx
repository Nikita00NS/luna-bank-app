import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../lib/store';
import { haptic, timeAgo } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { ArrowLeftIcon } from '../components/Icons';
import AnimatedEmoji from '../components/AnimatedEmoji';

interface Story {
  id: string;
  title: string;
  content: string;
  bg: string;
  emoji: string;
  cta?: string;
  ctaPage?: string;
}

const STORIES: Story[] = [
  { id: '1', title: '🚀 Luna Bank v1.3', content: 'Новое обновление!\n\n✅ Реальный TON баланс\n✅ Биометрия\n✅ Бот-уведомления\n✅ Рефералы', bg: 'from-violet-600 to-purple-900', emoji: '🚀', cta: 'Попробовать', ctaPage: 'home' },
  { id: '2', title: '💎 TON Connect', content: 'Подключите кошелёк и отправляйте реальные TON прямо из приложения!', bg: 'from-blue-600 to-cyan-900', emoji: '💎', cta: 'Подключить', ctaPage: 'ton-connect' },
  { id: '3', title: '👥 Приглашай друзей', content: 'Получай 🌙50 LNC за каждого друга!\n\nДелись реферальной ссылкой и зарабатывай.', bg: 'from-emerald-600 to-teal-900', emoji: '🎁', cta: 'Пригласить', ctaPage: 'referral' },
  { id: '4', title: '🎮 Мини-игры', content: '5 работ + 3 казино-игры\n\nЗарабатывайте LNC играя!', bg: 'from-orange-600 to-red-900', emoji: '🎮', cta: 'Играть', ctaPage: 'games' },
  { id: '5', title: '⭐ Premium', content: '0% комиссия\n3% кэшбэк\nVIP поддержка\n\nПодписка Cosmic — для тех, кто хочет максимум.', bg: 'from-yellow-600 to-amber-900', emoji: '⭐', cta: 'Подписаться', ctaPage: 'subscription' },
];

interface FeedItem {
  id: string;
  user_name: string;
  user_initial: string;
  action: string;
  amount?: number;
  currency?: string;
  time: string;
}

export default function StoriesScreen() {
  const { user, txs, go } = useStore();
  const [viewingStory, setViewingStory] = useState<Story | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const [viewedStories, setViewedStories] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('luna-viewed-stories') || '[]')); } catch { return new Set(); }
  });
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const progressRef = useRef<ReturnType<typeof setInterval>>(undefined);

  if (!user) return null;

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    try {
      const { data } = await supabase
        .from('transactions')
        .select('id, from_user_id, to_user_id, amount, currency, type, note, created_at')
        .order('created_at', { ascending: false })
        .limit(30);

      if (data) {
        const feedItems: FeedItem[] = data.map((tx: any) => ({
          id: tx.id,
          user_name: tx.note?.includes('@') ? tx.note.split('@')[1]?.split(' ')[0] || 'User' : 'User',
          user_initial: '?',
          action: tx.type === 'transfer' ? 'перевёл' : tx.type === 'deposit' ? 'пополнил' : tx.type === 'job' ? 'заработал' : 'совершил операцию',
          amount: tx.amount,
          currency: tx.currency,
          time: tx.created_at,
        }));
        setFeed(feedItems);
      }
    } catch {}
  };

  // Story viewer
  const openStory = (story: Story) => {
    haptic('medium');
    setViewingStory(story);
    setStoryProgress(0);
    const viewed = new Set(viewedStories);
    viewed.add(story.id);
    setViewedStories(viewed);
    localStorage.setItem('luna-viewed-stories', JSON.stringify([...viewed]));

    let p = 0;
    progressRef.current = setInterval(() => {
      p += 2;
      setStoryProgress(p);
      if (p >= 100) {
        clearInterval(progressRef.current);
        // Auto-advance to next story
        const idx = STORIES.findIndex((s) => s.id === story.id);
        if (idx < STORIES.length - 1) {
          openStory(STORIES[idx + 1]);
        } else {
          setViewingStory(null);
        }
      }
    }, 100);
  };

  const closeStory = () => {
    if (progressRef.current) clearInterval(progressRef.current);
    setViewingStory(null);
  };

  // Story viewer overlay
  if (viewingStory) {
    return (
      <div className={`h-full flex flex-col bg-gradient-to-b ${viewingStory.bg} relative`} onClick={closeStory}>
        {/* Progress bars */}
        <div className="flex gap-1 px-3 pt-3 safe-top">
          {STORIES.map((s) => (
            <div key={s.id} className="flex-1 h-0.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all" style={{
                width: s.id === viewingStory.id ? `${storyProgress}%` : viewedStories.has(s.id) ? '100%' : '0%'
              }} />
            </div>
          ))}
        </div>

        {/* Close */}
        <div className="px-5 pt-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">🌙</div>
            <span className="text-sm font-bold">Luna Bank</span>
          </div>
          <button onClick={closeStory} className="text-white/60 text-2xl">✕</button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-8" onClick={(e) => e.stopPropagation()}>
          <span className="text-6xl mb-4">{viewingStory.emoji}</span>
          <h2 className="text-2xl font-extrabold text-center mb-4">{viewingStory.title}</h2>
          <p className="text-white/70 text-center whitespace-pre-line text-sm leading-relaxed">{viewingStory.content}</p>
        </div>

        {/* CTA */}
        {viewingStory.cta && (
          <div className="px-6 pb-8 safe-bottom" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { closeStory(); go(viewingStory.ctaPage as any); }}
              className="w-full py-4 bg-white text-black rounded-2xl font-bold text-base active:scale-[0.97]">
              {viewingStory.cta}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('home')} className="text-white/50"><ArrowLeftIcon size={20} /></button>
        <h1 className="font-bold flex-1">Лента</h1>
      </div>

      {/* Stories row */}
      <div className="px-5 mt-2">
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 no-scrollbar">
          {STORIES.map((story) => {
            const viewed = viewedStories.has(story.id);
            return (
              <button key={story.id} onClick={() => openStory(story)}
                className="flex flex-col items-center gap-1.5 shrink-0 active:scale-95 transition-transform">
                <div className={`w-16 h-16 rounded-full p-0.5 ${viewed ? 'bg-white/10' : 'bg-gradient-to-br from-violet-500 to-pink-500'}`}>
                  <div className={`w-full h-full rounded-full bg-gradient-to-b ${story.bg} flex items-center justify-center text-xl`}>
                    {story.emoji}
                  </div>
                </div>
                <span className="text-[9px] text-white/40 max-w-[60px] truncate">{story.title.replace(/^[^\s]+\s/, '')}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Activity feed */}
      <div className="flex-1 overflow-y-auto px-5 pb-24 mt-4">
        <h3 className="text-sm font-bold mb-3">📊 Активность сообщества</h3>
        {feed.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-white/25 text-sm">Нет активности</p>
          </div>
        ) : (
          <div className="space-y-2">
            {feed.slice(0, 20).map((item, i) => (
              <div key={item.id} className="glass p-3 flex items-center gap-3 rounded-xl animate-slide-up" style={{ animationDelay: `${i * 0.03}s` }}>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500/50 to-pink-500/50 flex items-center justify-center text-sm font-bold">
                  {item.user_initial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">Пользователь</span>
                    <span className="text-white/40"> {item.action}</span>
                  </p>
                  <p className="text-[10px] text-white/20">{timeAgo(item.time)}</p>
                </div>
                {item.amount && (
                  <p className="text-xs mono font-bold text-emerald-400/70">🌙{item.amount}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
