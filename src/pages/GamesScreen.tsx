import React, { useState, useEffect, useRef } from 'react';
import { useStore, uid } from '../lib/store';
import { haptic } from '../lib/utils';
import { dbUpdateBalance } from '../lib/db';
import { ArrowLeftIcon, GamepadIcon } from '../components/Icons';

export default function GamesScreen() {
  const { user, accounts, go, updateBalance, addTx } = useStore();
  const [game, setGame] = useState<'menu' | 'spin' | 'crash' | 'coin'>('menu');
  if (!user) return null;
  const lncAcc = accounts.find(a => a.currency === 'LNC');
  const balance = lncAcc?.balance || 0;

  const handleWin = (delta: number) => {
    if (!lncAcc) return;
    updateBalance(lncAcc.id, delta);
    dbUpdateBalance(lncAcc.id, delta).catch(() => {});
    if (delta > 0) addTx({ id: uid(), from_user_id: 0, to_user_id: user.telegram_id, from_account_id: 'games', to_account_id: lncAcc.id, amount: delta, fee: 0, currency: 'LNC', type: 'business', status: 'completed', note: 'Выигрыш', created_at: new Date().toISOString() });
  };

  // SPIN
  function Spin() {
    const [spinning, setSpinning] = useState(false);
    const [result, setResult] = useState<number | null>(null);
    const [angle, setAngle] = useState(0);
    const cost = 10;
    const segs = [0, 5, 20, 50, 100, 500, 1000, 5000];
    const probs = [30, 25, 20, 12, 8, 4, 0.9, 0.1];
    const spin = () => {
      if (spinning || balance < cost) return;
      haptic('heavy'); setSpinning(true); setResult(null);
      let r = Math.random() * 100, winner = 0;
      for (let i = 0; i < probs.length; i++) { r -= probs[i]; if (r <= 0) { winner = segs[i]; break; } }
      setAngle(a => a + 1440 + Math.random() * 360);
      setTimeout(() => { setSpinning(false); setResult(winner); handleWin(winner - cost); if (winner > 0) haptic('success'); else haptic('error'); }, 3500);
    };
    return (
      <div className="text-center">
        <h3 className="font-extrabold text-lg mb-4">🎰 Lucky Spin</h3>
        <div className="relative w-56 h-56 mx-auto mb-6">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10 w-0 h-0" style={{ borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '14px solid #ffc300' }} />
          <div className="w-full h-full rounded-full overflow-hidden border-4 border-white/10 shadow-2xl" style={{ transform: `rotate(${angle}deg)`, transition: spinning ? 'transform 3.5s cubic-bezier(0.17,0.67,0.12,0.99)' : 'none' }}>
            <div className="w-full h-full bg-gradient-conic from-violet-600 via-pink-500 to-blue-500 rounded-full flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center text-2xl border-2 border-white/10">🌙</div>
            </div>
          </div>
        </div>
        {result !== null && !spinning && <p className={`text-2xl font-extrabold mb-4 animate-scale-in ${result > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{result > 0 ? `+🌙{result}` : 'Мимо!'}</p>}
        <button onClick={spin} disabled={spinning || balance < cost} className="btn-primary w-full max-w-xs mx-auto">
          {spinning ? '🎰 Крутим...' : `🎰 Крутить (🌙{cost})`}
        </button>
      </div>
    );
  }

  // CRASH
  function Crash() {
    const [state, setState] = useState<'idle' | 'run' | 'crash' | 'cash'>('idle');
    const [bet, setBet] = useState('50');
    const [mult, setMult] = useState(1.0);
    const ref = useRef<any>(null);
    const [cp] = useState(() => Math.max(1.01, 1 / (1 - Math.random() * 0.97)));
    const b = parseFloat(bet) || 0;
    const start = () => {
      if (b <= 0 || b > balance) { haptic('error'); return; }
      haptic('medium'); setState('run'); setMult(1.0);
      ref.current = setInterval(() => {
        setMult(prev => {
          const next = prev + 0.01 + prev * 0.005;
          if (next >= cp) { clearInterval(ref.current); setState('crash'); haptic('error'); handleWin(-b); return cp; }
          return next;
        });
      }, 50);
    };
    const cashOut = () => { if (state !== 'run') return; clearInterval(ref.current); haptic('success'); setState('cash'); handleWin(b * mult - b); };
    useEffect(() => () => { if (ref.current) clearInterval(ref.current); }, []);
    return (
      <div className="text-center">
        <h3 className="font-extrabold text-lg mb-4">🚀 Crash</h3>
        <div className={`glass p-8 mb-4 ${state === 'crash' ? 'border border-red-500/30' : state === 'cash' ? 'border border-emerald-500/30' : ''}`}>
          <p className={`text-6xl font-black mono ${state === 'crash' ? 'text-red-400' : state === 'cash' ? 'text-emerald-400' : mult >= 2 ? 'text-emerald-400' : 'text-white'}`}>{mult.toFixed(2)}x</p>
          {state === 'crash' && <p className="text-red-400 text-sm mt-2 font-bold">💥 CRASH!</p>}
          {state === 'cash' && <p className="text-emerald-400 text-sm mt-2 font-bold">💰 +🌙{(b * mult - b).toFixed(2)}</p>}
        </div>
        {state === 'idle' && <>
          <input type="number" value={bet} onChange={e => setBet(e.target.value)} placeholder="Ставка" className="w-full glass px-4 py-3 bg-transparent text-white text-xl font-bold mono outline-none text-center mb-3" />
          <div className="flex gap-2 mb-4">{[10, 50, 100, 500].map(v => <button key={v} onClick={() => setBet(String(v))} className="flex-1 glass rounded-lg py-2 text-xs mono active:scale-95 transition-transform">🌙{v}</button>)}</div>
          <button onClick={start} disabled={b <= 0 || b > balance} className="btn-primary w-full">🚀 Старт</button>
        </>}
        {state === 'run' && <button onClick={cashOut} className="w-full py-5 rounded-2xl bg-emerald-500 text-white font-extrabold text-xl active:scale-[0.97] transition-transform animate-pulse">💰 Забрать 🌙{(b * mult).toFixed(2)}</button>}
        {(state === 'crash' || state === 'cash') && <button onClick={() => { setState('idle'); setMult(1.0); }} className="btn-primary w-full mt-2">🔄 Снова</button>}
      </div>
    );
  }

  // COIN FLIP
  function CoinFlip() {
    const [bet, setBet] = useState('50');
    const [side, setSide] = useState<'h' | 't'>('h');
    const [flipping, setFlipping] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [won, setWon] = useState<boolean | null>(null);
    const b = parseFloat(bet) || 0;
    const flip = () => {
      if (b <= 0 || b > balance) { haptic('error'); return; }
      haptic('heavy'); setFlipping(true); setResult(null); setWon(null);
      setTimeout(() => {
        const r = Math.random() < 0.49 ? 'h' : 't';
        setResult(r); setFlipping(false);
        const w = r === side; setWon(w);
        if (w) { haptic('success'); handleWin(b * 0.95); } else { haptic('error'); handleWin(-b); }
      }, 1500);
    };
    return (
      <div className="text-center">
        <h3 className="font-extrabold text-lg mb-4">🪙 Монетка</h3>
        <div className={`w-28 h-28 rounded-full mx-auto flex items-center justify-center text-5xl mb-6 shadow-2xl ${flipping ? 'animate-spin' : ''} ${result === 'h' ? 'bg-gradient-to-br from-yellow-400 to-amber-500' : result === 't' ? 'bg-gradient-to-br from-gray-400 to-gray-500' : 'bg-gradient-to-br from-yellow-400/50 to-amber-500/50'}`}>
          {result ? (result === 'h' ? '🌙' : '⭐') : '🪙'}
        </div>
        {won !== null && <p className={`text-2xl font-extrabold mb-4 animate-scale-in ${won ? 'text-emerald-400' : 'text-red-400'}`}>{won ? `+🌙{(b * 0.95).toFixed(2)}` : `-🌙{bet}`}</p>}
        <div className="flex gap-3 max-w-xs mx-auto mb-4">
          <button onClick={() => setSide('h')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${side === 'h' ? 'bg-yellow-500 text-black' : 'glass text-white/50'}`}>🌙 Луна</button>
          <button onClick={() => setSide('t')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${side === 't' ? 'bg-gray-400 text-black' : 'glass text-white/50'}`}>⭐ Звезда</button>
        </div>
        <input type="number" value={bet} onChange={e => setBet(e.target.value)} placeholder="Ставка" className="w-full max-w-xs mx-auto glass px-4 py-3 bg-transparent text-white text-xl font-bold mono outline-none text-center mb-3 block" />
        <button onClick={flip} disabled={flipping || b > balance} className="btn-primary w-full max-w-xs mx-auto">{flipping ? '🪙 ...' : '🪙 Подбросить'}</button>
      </div>
    );
  }

  const games = [
    { id: 'spin' as const, icon: '🎰', name: 'Lucky Spin', desc: 'До 🌙5000', color: 'from-purple-500/20 to-pink-500/10' },
    { id: 'crash' as const, icon: '🚀', name: 'Crash', desc: 'Успей забрать!', color: 'from-emerald-500/20 to-cyan-500/10' },
    { id: 'coin' as const, icon: '🪙', name: 'Монетка', desc: 'x1.95', color: 'from-yellow-500/20 to-amber-500/10' },
  ];

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => game === 'menu' ? go('city') : setGame('menu')} className="text-white/50"><ArrowLeftIcon size={20} /></button>
        <h1 className="font-bold flex-1">Мини-игры</h1>
        <div className="glass rounded-full px-3 py-1 text-xs font-bold mono">🌙{balance.toFixed(0)}</div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {game === 'menu' && <div className="space-y-3 mt-2 animate-fade-in">
          {games.map((g, i) => (
            <button key={g.id} onClick={() => { haptic('medium'); setGame(g.id); }}
              className={`w-full rounded-2xl p-5 flex items-center gap-4 text-left bg-gradient-to-r ${g.color} border border-white/[0.06] active:scale-[0.98] transition-all animate-slide-up`}
              style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="w-14 h-14 rounded-2xl bg-white/[0.06] flex items-center justify-center text-3xl">{g.icon}</div>
              <div className="flex-1"><p className="font-extrabold text-lg">{g.name}</p><p className="text-xs text-white/35">{g.desc}</p></div>
              <span className="text-white/20 text-xl">›</span>
            </button>
          ))}
        </div>}
        {game === 'spin' && <div className="mt-4"><Spin /></div>}
        {game === 'crash' && <div className="mt-4"><Crash /></div>}
        {game === 'coin' && <div className="mt-4"><CoinFlip /></div>}
      </div>
    </div>
  );
}
