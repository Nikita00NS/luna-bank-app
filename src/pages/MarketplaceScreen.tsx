import React, { useState, useEffect } from 'react';
import { useStore, uid } from '../lib/store';
import { haptic } from '../lib/utils';
import { dbUpdateBalance, dbCreateListing, dbGetListings, dbUpdateListing, dbCreateTransaction } from '../lib/db';
import { notifyCustom } from '../lib/bot';
import {
  ArrowLeftIcon, PlusIcon, ShoppingCartIcon, TagIcon, StoreIcon,
  FileTextIcon, GamepadIcon, BriefcaseIcon, SparklesIcon, DiamondIcon,
  CheckCircleIcon,
} from '../components/Icons';
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
  { id: 'all', label: 'Все товары', Icon: StoreIcon },
  { id: 'digital', label: 'Цифровые активы', Icon: FileTextIcon },
  { id: 'services', label: 'Услуги и сервис', Icon: BriefcaseIcon },
  { id: 'education', label: 'Курсы и обучение', Icon: SparklesIcon },
  { id: 'gaming', label: 'Игровые предметы', Icon: GamepadIcon },
  { id: 'other', label: 'Разное', Icon: TagIcon },
];

const ITEM_ICONS = [
  { id: 'digital', Icon: FileTextIcon, label: 'Код / Лицензия' },
  { id: 'gaming', Icon: GamepadIcon, label: 'Игровой предмет' },
  { id: 'service', Icon: BriefcaseIcon, label: 'Услуга / Работа' },
  { id: 'education', Icon: SparklesIcon, label: 'Курс / Книга' },
  { id: 'crypto', Icon: DiamondIcon, label: 'NFT / Токен' },
  { id: 'store', Icon: ShoppingCartIcon, label: 'Товар' },
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
  const [newEmoji, setNewEmoji] = useState('digital');

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

    const txData = { id: uid(), from_user_id: user.telegram_id, to_user_id: selectedItem.seller_id, from_account_id: lncAcc.id, to_account_id: 'marketplace', amount: selectedItem.price, fee: 0, currency: 'LNC' as const, type: 'transfer' as const, status: 'completed' as const, note: `Покупка товара: ${selectedItem.title}`, created_at: new Date().toISOString() };
    addTx(txData);
    dbCreateTransaction(txData).catch(() => {});
    addNotif({ id: uid(), title: 'Товар приобретён', message: `${selectedItem.title} — ${selectedItem.price} LNC`, type: 'transfer', read: false, created_at: new Date().toISOString() });

    await dbUpdateListing(selectedItem.id, { status: 'sold', buyer_id: user.telegram_id });
    notifyCustom(selectedItem.seller_id, `*Ваш товар продан!*\nНазвание: ${selectedItem.title}\nЗачислено: ${selectedItem.price} LNC`).catch(() => {});

    setShowBuy(false);
    loadListings();
  };

  const getItemIcon = (idOrEmoji: string) => {
    const found = ITEM_ICONS.find(item => item.id === idOrEmoji);
    if (found) return <found.Icon size={28} />;
    return <ShoppingCartIcon size={28} />;
  };

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4 border-b border-white/[0.04]">
        <button onClick={() => go('home')} className="text-white/60 hover:text-white p-1 -ml-1 transition-colors"><ArrowLeftIcon size={20} /></button>
        <h1 className="font-extrabold flex-1 text-[17px] text-white tracking-tight">Маркетплейс активов</h1>
        <button onClick={() => { setShowCreate(true); haptic('light'); }} className="glass rounded-2xl px-3.5 py-1.5 flex items-center gap-1.5 text-xs font-bold text-amber-400 border border-amber-500/30 hover:bg-amber-500/10 active:scale-95 transition-all">
          <PlusIcon size={14} /> Выставить
        </button>
      </div>

      {/* Categories */}
      <div className="px-5 mt-3 flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-5 px-5">
        {CATEGORIES.map((c) => (
          <button key={c.id} onClick={() => { setCategory(c.id); haptic('light'); }}
            className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${category === c.id ? 'bg-amber-500 text-black border-amber-500 shadow-md shadow-amber-500/20' : 'glass border-white/10 text-white/60 hover:text-white'}`}>
            <c.Icon size={14} color={category === c.id ? '#000' : 'currentColor'} />
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24 mt-4">
        {filtered.length === 0 ? (
          <div className="text-center py-14 glass rounded-3xl border border-white/10 bg-white/[0.02]">
            <div className="w-16 h-16 rounded-3xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-4 text-white/20">
              <StoreIcon size={32} />
            </div>
            <p className="text-white font-extrabold text-base">Товаров в этой категории пока нет</p>
            <p className="text-white/40 text-xs mt-1 max-w-[240px] mx-auto">Станьте первым, кто разместит здесь свой цифровой товар, услугу или лицензию</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary mt-6 px-8 py-3.5 rounded-2xl font-bold">Разместить лот</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((item, i) => {
              const isMine = item.seller_id === user.telegram_id;
              return (
                <button key={item.id}
                  onClick={() => { if (!isMine) { setSelectedItem(item); setShowBuy(true); haptic('light'); } }}
                  className="glass p-4 rounded-2xl text-left animate-slide-up active:scale-[0.97] transition-all border border-white/10 hover:border-white/20 bg-gradient-to-b from-white/[0.04] to-transparent group"
                  style={{ animationDelay: `${i * 0.04}s` }}>
                  <div className="w-full aspect-square rounded-xl bg-gradient-to-br from-amber-500/10 to-violet-600/10 border border-white/10 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-105 transition-all">
                    {getItemIcon(item.image_emoji)}
                  </div>
                  <p className="font-extrabold text-sm truncate text-white">{item.title}</p>
                  <p className="text-[11px] text-white/40 font-medium truncate mt-0.5">{item.description || 'Без описания'}</p>
                  <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-white/[0.06]">
                    <p className="font-extrabold text-sm mono text-amber-400">{item.price} LNC</p>
                    {isMine && <span className="text-[9px] text-white/40 bg-white/10 border border-white/15 px-2 py-0.5 rounded-md font-semibold">Ваш лот</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Размещение нового лота">
        <div className="space-y-4">
          <div>
            <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-2">Иконка лота</p>
            <div className="grid grid-cols-3 gap-2">
              {ITEM_ICONS.map((item) => (
                <button key={item.id} onClick={() => setNewEmoji(item.id)}
                  className={`p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all border ${newEmoji === item.id ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 font-bold shadow-md shadow-amber-500/10' : 'glass border-white/10 text-white/60 hover:text-white'}`}>
                  <item.Icon size={20} color="currentColor" />
                  <span className="text-[10px] truncate max-w-full font-semibold">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-1.5">Название товара или услуги</p>
            <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Например: Лицензия на ПО или консультация" className="w-full glass px-4 py-3.5 bg-transparent text-white outline-none rounded-2xl border border-white/10 focus:border-amber-500/50 text-sm font-semibold placeholder:text-white/25" />
          </div>
          <div>
            <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-1.5">Подробное описание</p>
            <input type="text" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Что входит в стоимость лота, условия передачи" className="w-full glass px-4 py-3.5 bg-transparent text-white outline-none rounded-2xl border border-white/10 focus:border-amber-500/50 text-sm font-medium placeholder:text-white/25" />
          </div>
          <div>
            <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-1.5">Стоимость (LNC)</p>
            <input type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="0.00" className="w-full glass px-4 py-3.5 bg-transparent text-white mono outline-none rounded-2xl border border-white/10 focus:border-amber-500/50 text-lg font-extrabold text-center placeholder:text-white/25" />
          </div>
          <div>
            <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-1.5">Категория каталога</p>
            <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full glass px-4 py-3.5 bg-black text-white outline-none rounded-2xl border border-white/10 focus:border-amber-500/50 text-sm font-semibold">
              {CATEGORIES.filter((c) => c.id !== 'all').map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <button onClick={handleCreateListing} disabled={!newTitle || !newPrice} className="btn-primary w-full py-4 rounded-2xl font-bold text-[15px] shadow-lg shadow-amber-500/20 disabled:opacity-30">Опубликовать в маркетплейсе</button>
        </div>
      </Modal>

      {/* Buy Modal */}
      <Modal open={showBuy} onClose={() => setShowBuy(false)} title="Покупка товара">
        {selectedItem && (
          <div className="space-y-4">
            <div className="glass p-5 rounded-3xl text-center border border-white/15 bg-gradient-to-b from-white/[0.06] to-transparent">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-3 shadow-lg shadow-amber-500/15">
                {getItemIcon(selectedItem.image_emoji)}
              </div>
              <h3 className="font-extrabold text-lg text-white">{selectedItem.title}</h3>
              {selectedItem.description && <p className="text-xs text-white/60 font-medium mt-1 leading-relaxed">{selectedItem.description}</p>}
            </div>
            <div className="glass p-4 rounded-2xl space-y-2 border border-white/10 bg-white/[0.02]">
              <div className="flex justify-between text-sm"><span className="text-white/40 font-medium">Продавец</span><span className="font-semibold text-white">@{selectedItem.seller_username}</span></div>
              <div className="flex justify-between text-sm"><span className="text-white/40 font-medium">Стоимость</span><span className="font-extrabold mono text-amber-400">{selectedItem.price} LNC</span></div>
              <div className="flex justify-between text-sm"><span className="text-white/40 font-medium">Ваш доступный баланс</span><span className="mono font-semibold text-white">{lncAcc?.balance.toFixed(2) || 0} LNC</span></div>
            </div>
            {lncAcc && lncAcc.balance < selectedItem.price && (
              <p className="text-red-400 font-bold text-xs text-center">На вашем счёте недостаточно средств для покупки</p>
            )}
            <button onClick={buyItem} disabled={!lncAcc || lncAcc.balance < selectedItem.price} className="btn-primary w-full py-4 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-30">
              <CheckCircleIcon size={18} /> Подтвердить и оплатить {selectedItem.price} LNC
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
