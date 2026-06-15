import React, { useState, useEffect } from 'react';
import { useStore, uid } from '../lib/store';
import { haptic } from '../lib/utils';
import { dbUpdateBalance, dbCreateListing, dbGetListings, dbUpdateListing, dbCreateTransaction } from '../lib/db';
import { notifyCustom } from '../lib/bot';
import { ArrowLeftIcon, PlusIcon } from '../components/Icons';
import AnimatedEmoji from '../components/AnimatedEmoji';
import Modal from '../components/Modal';

interface Listing {
  id: string;
  seller_id: number;
  seller_name: string;
  seller_username: string;
  title: string;
  description: string;
  price: number;
  category: string;
  image_emoji: string;
  status: 'active' | 'sold';
  created_at: string;
}

const CATEGORIES = [
  { id: 'all', label: '🔥 Все', icon: '🔥' },
  { id: 'digital', label: '💻 Цифровые', icon: '💻' },
  { id: 'services', label: '🛠 Услуги', icon: '🛠' },
  { id: 'education', label: '📚 Обучение', icon: '📚' },
  { id: 'gaming', label: '🎮 Игры', icon: '🎮' },
  { id: 'other', label: '📦 Другое', icon: '📦' },
];

export default function MarketplaceScreen() {
  const { user, accounts, go, updateBalance, addTx, addNotif } = useStore();
  const [category, setCategory] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showBuy, setShowBuy] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Listing | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => { loadListings(); }, [category]);

  const loadListings = async () => {
    setLoadingList(true);
    const data = await dbGetListings(category);
    setListings(data as Listing[]);
    setLoadingList(false);
  };

  // Create form
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('digital');
  const [newEmoji, setNewEmoji] = useState('📦');

  if (!user) return null;
  const lncAcc = accounts.find((a) => a.currency === 'LNC');

  const filtered = listings;

  const handleCreateListing = async () => {
    const price = parseFloat(newPrice) || 0;
    if (!newTitle || price <= 0) { haptic('error'); return; }
    haptic('success');

    await dbCreateListing({
      seller_id: user.telegram_id,
      seller_name: user.first_name,
      seller_username: user.username,
      title: newTitle,
      description: newDesc,
      price,
      category: newCategory,
      image_emoji: newEmoji,
      status: 'active',
    });

    setShowCreate(false);
    setNewTitle(''); setNewDesc(''); setNewPrice('');
    loadListings();
  };

  const buyItem = async () => {
    if (!selectedItem || !lncAcc) return;
    if (lncAcc.balance < selectedItem.price) { haptic('error'); return; }
    if (selectedItem.seller_id === user.telegram_id) { haptic('error'); return; }

    haptic('success');
    updateBalance(lncAcc.id, -selectedItem.price);
    dbUpdateBalance(lncAcc.id, -selectedItem.price).catch(() => {});

    const txData = { id: uid(), from_user_id: user.telegram_id, to_user_id: selectedItem.seller_id, from_account_id: lncAcc.id, to_account_id: 'marketplace', amount: selectedItem.price, fee: 0, currency: 'LNC' as const, type: 'transfer' as const, status: 'completed' as const, note: `Покупка: ${selectedItem.title}`, created_at: new Date().toISOString() };
    addTx(txData);
    dbCreateTransaction(txData).catch(() => {});
    addNotif({ id: uid(), title: '🛒 Покупка', message: `${selectedItem.title} — 🌙${selectedItem.price}`, type: 'transfer', read: false, created_at: new Date().toISOString() });

    await dbUpdateListing(selectedItem.id, { status: 'sold', buyer_id: user.telegram_id });
    notifyCustom(selectedItem.seller_id, `🛒 *Ваш товар куплен!*\n${selectedItem.title}: 🌙${selectedItem.price} LNC`).catch(() => {});

    setShowBuy(false);
    loadListings();
  };

  const EMOJIS = ['📦', '💻', '📱', '🎮', '📚', '🎨', '🎵', '📸', '🛠', '🎁', '👕', '🏠'];

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('home')} className="text-white/50"><ArrowLeftIcon size={20} /></button>
        <h1 className="font-bold flex-1">Маркетплейс</h1>
        <button onClick={() => { setShowCreate(true); haptic('light'); }} className="glass rounded-full w-8 h-8 flex items-center justify-center">
          <PlusIcon size={16} />
        </button>
      </div>

      {/* Categories */}
      <div className="px-5 mt-1 flex gap-1.5 overflow-x-auto pb-2 no-scrollbar -mx-5 px-5">
        {CATEGORIES.map((c) => (
          <button key={c.id} onClick={() => { setCategory(c.id); haptic('light'); }}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${category === c.id ? 'bg-white text-black' : 'glass text-white/40'}`}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24 mt-3">
        {filtered.length === 0 ? (
          <div className="text-center py-14">
            <AnimatedEmoji type="wallet" size={48} />
            <p className="text-white/30 text-sm mt-3">Нет товаров</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary mt-4 px-6">+ Выставить</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {filtered.map((item, i) => {
              const isMine = item.seller_id === user.telegram_id;
              return (
                <button key={item.id}
                  onClick={() => { if (!isMine) { setSelectedItem(item); setShowBuy(true); haptic('light'); } }}
                  className="glass p-3 rounded-2xl text-left animate-slide-up active:scale-[0.97] transition-all"
                  style={{ animationDelay: `${i * 0.04}s` }}>
                  <div className="w-full aspect-square rounded-xl bg-white/[0.03] flex items-center justify-center text-4xl mb-2">
                    {item.image_emoji}
                  </div>
                  <p className="font-bold text-sm truncate">{item.title}</p>
                  <p className="text-[10px] text-white/25 truncate">{item.description || '—'}</p>
                  <div className="flex justify-between items-center mt-2">
                    <p className="font-extrabold text-sm text-yellow-400">🌙{item.price}</p>
                    {isMine && <span className="text-[8px] text-white/20 bg-white/5 px-1.5 py-0.5 rounded">Ваш</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Новый товар">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {EMOJIS.map((e) => (
              <button key={e} onClick={() => setNewEmoji(e)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${newEmoji === e ? 'bg-white/10 ring-1 ring-white/20' : 'glass'}`}>
                {e}
              </button>
            ))}
          </div>
          <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Название" className="w-full glass px-4 py-3 bg-transparent text-white outline-none rounded-xl" />
          <input type="text" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Описание" className="w-full glass px-4 py-3 bg-transparent text-white outline-none rounded-xl text-sm" />
          <input type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="Цена (LNC)" className="w-full glass px-4 py-3 bg-transparent text-white mono outline-none rounded-xl" />
          <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full glass px-4 py-3 bg-black text-white outline-none rounded-xl text-sm">
            {CATEGORIES.filter((c) => c.id !== 'all').map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <button onClick={handleCreateListing} disabled={!newTitle || !newPrice} className="btn-primary w-full">Опубликовать</button>
        </div>
      </Modal>

      {/* Buy Modal */}
      <Modal open={showBuy} onClose={() => setShowBuy(false)} title="Покупка">
        {selectedItem && (
          <div className="space-y-4">
            <div className="text-center">
              <span className="text-5xl">{selectedItem.image_emoji}</span>
              <h3 className="font-bold text-lg mt-2">{selectedItem.title}</h3>
              {selectedItem.description && <p className="text-xs text-white/30 mt-1">{selectedItem.description}</p>}
            </div>
            <div className="glass p-3 rounded-xl space-y-1.5">
              <div className="flex justify-between text-sm"><span className="text-white/35">Продавец</span><span>@{selectedItem.seller_username}</span></div>
              <div className="flex justify-between text-sm"><span className="text-white/35">Цена</span><span className="font-bold text-yellow-400">🌙{selectedItem.price} LNC</span></div>
              <div className="flex justify-between text-sm"><span className="text-white/35">Баланс</span><span>🌙{lncAcc?.balance.toFixed(2) || 0}</span></div>
            </div>
            {lncAcc && lncAcc.balance < selectedItem.price && (
              <p className="text-red-400 text-xs text-center">Недостаточно средств</p>
            )}
            <button onClick={buyItem} disabled={!lncAcc || lncAcc.balance < selectedItem.price} className="btn-primary w-full">
              ✅ Купить за 🌙{selectedItem.price}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
