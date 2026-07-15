import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useStore } from '../lib/store';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { haptic, formatCrypto, formatFiat } from '../lib/utils';
import { buildTransfer } from '../lib/ton';
import { PAYMENT_METHODS } from '../lib/constants';
import { useP2P, P2POfferData } from '../hooks/useP2P';
import { toastSuccess, toastError } from '../lib/toast';
import { ArrowLeftIcon, RefreshIcon, PlusIcon, CloseIcon } from '../components/Icons';

type TabType = 'buy' | 'sell';

export default function P2PScreen() {
  const { go, back, tonWallet, tokens } = useStore();
  const [tonConnectUI] = useTonConnectUI();
  const { offers, myOffers, loading, creating, fetchOffers, fetchMyOffers, createOffer, deleteOffer, startTrade } = useP2P();

  const [tab, setTab] = useState<TabType>('buy');
  const [coin, setCoin] = useState('USDT');
  const [amount, setAmount] = useState('');
  const [fiatAmount, setFiatAmount] = useState('');
  const [selectedOffer, setSelectedOffer] = useState<P2POfferData | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [trading, setTrading] = useState(false);
  const [showMyOffers, setShowMyOffers] = useState(false);

  const [createType, setCreateType] = useState<TabType>('sell');
  const [createCoin, setCreateCoin] = useState('USDT');
  const [createPrice, setCreatePrice] = useState('');
  const [createAmount, setCreateAmount] = useState('');
  const [createMin, setCreateMin] = useState('');
  const [createMax, setCreateMax] = useState('');
  const [createPayment, setCreatePayment] = useState(PAYMENT_METHODS[0]);

  useEffect(() => { fetchOffers(tab); }, [tab, fetchOffers]);
  useEffect(() => { fetchMyOffers(); }, [fetchMyOffers]);

  const filteredOffers = useMemo(() =>
    offers.filter(o => o.type === tab && o.coin === coin),
    [offers, tab, coin]
  );

  const handleAmountChange = (val: string) => {
    setAmount(val);
    if (selectedOffer) {
      setFiatAmount((Number(val) * selectedOffer.price).toFixed(2));
    }
  };

  const handleSelectOffer = (offer: P2POfferData) => {
    setSelectedOffer(offer);
    haptic('light');
  };

  const handleStartTrade = async () => {
    if (!selectedOffer || !tonWallet || !Number(amount)) return;
    setTrading(true);
    await startTrade(selectedOffer, Number(amount));
    setTrading(false);
    setSelectedOffer(null);
    setAmount('');
    setFiatAmount('');
  };

  const handleCreateOffer = async () => {
    if (!createPrice || !createAmount) return;
    const ok = await createOffer({
      type: createType,
      coin: createCoin,
      price: Number(createPrice),
      amount: Number(createAmount),
      min_amount: Number(createMin) || Number(createAmount) * 0.1,
      max_amount: Number(createMax) || Number(createAmount) * 10,
      payment_method: createPayment,
    });
    if (ok) {
      setShowCreate(false);
      setCreatePrice('');
      setCreateAmount('');
    }
  };

  return (
    <div className="page safe-top">
      <div className="header">
        {showMyOffers ? (
          <button onClick={() => { setShowMyOffers(false); haptic('light'); }} className="back-btn"><ArrowLeftIcon size={18} color="var(--text)" /></button>
        ) : (
          <button onClick={() => { haptic('light'); back(); }} className="back-btn"><ArrowLeftIcon size={18} color="var(--text)" /></button>
        )}
        <p className="header-title">P2P Trading</p>
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={() => { setShowMyOffers(!showMyOffers); haptic('light'); }}
            className="px-3 py-1.5 rounded-lg text-[10px] font-medium bg-[var(--bg-card)] text-[var(--text-secondary)]">
            My ({myOffers.length})
          </button>
          {!showMyOffers && (
            <button onClick={() => { setShowCreate(true); haptic('light'); }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 bg-[var(--accent)] text-white">
              <PlusIcon size={12} color="white" /> Create
            </button>
          )}
        </div>
      </div>

      {showMyOffers ? (
        <div className="px-4 mt-4 space-y-2">
          {myOffers.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-[var(--text-tertiary)]">No offers</p>
            </div>
          ) : myOffers.map((o) => (
            <div key={o.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${o.type === 'buy' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}
                    style={{ background: o.type === 'buy' ? 'var(--green)/10' : 'var(--red)/10' }}>
                    {o.type === 'buy' ? 'Buy' : 'Sell'} {o.coin}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${o.status === 'active' ? 'text-[var(--green)]' : 'text-[var(--text-tertiary)]'}`}>
                    {o.status === 'active' ? 'Active' : 'Closed'}
                  </span>
                </div>
                <button onClick={() => deleteOffer(o.id)}
                  className="p-1.5 rounded-lg active:bg-[var(--red)/10]">
                  <CloseIcon size={12} color="var(--red)" />
                </button>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>{formatFiat(o.price)} ₽</span>
                <span>{formatCrypto(o.available)} {o.coin}</span>
                <span className="text-xs text-[var(--text-tertiary)]">{o.payment_method}</span>
              </div>
            </div>
          ))}
        </div>
      ) : showCreate ? (
        <div className="px-4 mt-4 space-y-4">
          <div className="flex p-1 rounded-lg bg-[var(--bg-card)]">
            {(['sell', 'buy'] as const).map((t) => (
              <button key={t} onClick={() => setCreateType(t)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${createType === t ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)]'}`}>
                {t === 'sell' ? 'Sell' : 'Buy'}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            {['USDT', 'TON'].map(c => (
              <button key={c} onClick={() => setCreateCoin(c)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${createCoin === c ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-card)] text-[var(--text-secondary)]'}`}>
                {c}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-[var(--text-tertiary)] mb-1 block">Price per 1 {createCoin} (RUB)</label>
              <input type="number" value={createPrice} onChange={e => setCreatePrice(e.target.value)}
                placeholder="0.00" className="input" />
            </div>
            <div>
              <label className="text-xs text-[var(--text-tertiary)] mb-1 block">Amount {createCoin}</label>
              <input type="number" value={createAmount} onChange={e => setCreateAmount(e.target.value)}
                placeholder="0.00" className="input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--text-tertiary)] mb-1 block">Min deal (RUB)</label>
                <input type="number" value={createMin} onChange={e => setCreateMin(e.target.value)}
                  placeholder="1000" className="input" />
              </div>
              <div>
                <label className="text-xs text-[var(--text-tertiary)] mb-1 block">Max deal (RUB)</label>
                <input type="number" value={createMax} onChange={e => setCreateMax(e.target.value)}
                  placeholder="500000" className="input" />
              </div>
            </div>
            <div>
              <label className="text-xs text-[var(--text-tertiary)] mb-1 block">Payment Method</label>
              <select value={createPayment} onChange={e => setCreatePayment(e.target.value)}
                className="input">
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setShowCreate(false)} className="btn btn-secondary flex-1">Cancel</button>
            <button onClick={handleCreateOffer} disabled={!createPrice || !createAmount || creating} className="btn btn-primary flex-1">
              {creating ? 'Creating...' : 'Create Offer'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="px-4 mt-2">
            <div className="flex p-1 rounded-lg bg-[var(--bg-card)]">
              {(['buy', 'sell'] as const).map((t) => (
                <button key={t} onClick={() => { setTab(t); setSelectedOffer(null); setAmount(''); }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)]'}`}>
                  {t === 'buy' ? 'Buy' : 'Sell'} Crypto
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 mt-4 flex gap-2">
            {['USDT', 'TON'].map(c => (
              <button key={c} onClick={() => { setCoin(c); setSelectedOffer(null); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${coin === c ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-card)] text-[var(--text-secondary)]'}`}>
                {c}
              </button>
            ))}
          </div>

          <div className="px-4 mt-4 space-y-2">
            {loading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-24 w-full" />)}</div>
            ) : filteredOffers.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-[var(--text-tertiary)]">No active offers</p>
              </div>
            ) : filteredOffers.map((offer) => {
              const isSelected = selectedOffer?.id === offer.id;
              return (
                <button key={offer.id} onClick={() => handleSelectOffer(offer)}
                  className={`w-full card p-4 text-left transition-all ${isSelected ? 'ring-1 ring-[var(--accent)]' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-[var(--bg-card)]">
                        {offer.user_name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{offer.user_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{formatFiat(offer.price)}</p>
                      <p className="text-[10px] text-[var(--text-tertiary)]">per 1 {offer.coin}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                    <span>{formatCrypto(offer.available)} {offer.coin} available</span>
                    <span>{formatFiat(offer.min_amount)}–{formatFiat(offer.max_amount)} RUB</span>
                    <span>{offer.payment_method}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedOffer && (
            <div className="px-4 mt-4 pb-8">
              <div className="card p-4 space-y-4">
                <p className="font-semibold">{tab === 'buy' ? 'Buy' : 'Sell'} {coin} from {selectedOffer.user_name}</p>
                <div className="space-y-2">
                  <label className="text-xs text-[var(--text-tertiary)]">Amount {coin}</label>
                  <input type="number" value={amount} onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="0.00" className="input text-xl font-bold mono" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-[var(--text-tertiary)]">To pay (RUB)</label>
                  <input type="text" value={fiatAmount ? `${formatFiat(Number(fiatAmount))} ₽` : ''}
                    readOnly placeholder="0 ₽" className="input text-xl font-bold mono" />
                </div>
                <div className="p-3 rounded-lg text-xs bg-[var(--bg-surface)] text-[var(--text-tertiary)]">
                  <div className="flex justify-between mb-1"><span>Rate</span><span>{formatFiat(selectedOffer.price)} ₽</span></div>
                  <div className="flex justify-between mb-1"><span>Payment</span><span>{selectedOffer.payment_method}</span></div>
                  <div className="flex justify-between"><span>Limits</span><span>{formatFiat(selectedOffer.min_amount)} – {formatFiat(selectedOffer.max_amount)} ₽</span></div>
                </div>
                <button onClick={handleStartTrade} disabled={!Number(amount) || trading}
                  className={`w-full py-4 rounded-lg font-semibold text-center transition-all active:scale-[0.97] ${tab === 'buy' ? 'btn btn-success' : 'btn btn-danger'}`}>
                  {trading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : tab === 'buy' ? `Buy ${amount || '0'} ${coin}` : `Sell ${amount || '0'} ${coin}`}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}