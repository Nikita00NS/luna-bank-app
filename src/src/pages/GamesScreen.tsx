import React, { useState, useEffect, useRef } from 'react';
import { useStore, uid } from '../lib/store';
import { haptic } from '../lib/utils';
import { dbUpdateBalance, dbCreateTransaction, dbCreateNotification } from '../lib/sync';
import { notifyUser } from '../lib/telegram-bot';

// ========== LUCKY SPIN ==========
function LuckySpin({ balance, onWin }: { balance: number; onWin: (amount: number) => void }) {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [angle, setAngle] = useState(0);
  const cost = 10; // 10 LNC per spin

  const segments = [
    { label: '0', value: 0, color: '#1a1a2e', prob: 30 },
    { label: '5', value: 5, color: '#16213e', prob: 25 },
    { label: '20', value: 20, color: '#0f3460', prob: 20 },
    { label: '50', value: 50, color: '#533483', prob: 12 },
    { label: '100', value: 100, color: '#7c3aed', prob: 8 },
    { label: '500', value: 500, color: '#e94560', prob: 4 },
    { label: '1K', value: 1000, color: '#ec4899', prob: 0.9 },
    { label: '🌙', value: 5000, color: '#ffc300', prob: 0.1 },
  ];

  const spin = () => {
    if (spinning || balance < cost) return;
    haptic('heavy');
    setSpinning(true);
    setResult(null);

    // Weighted random
    const totalProb = segments.reduce((s, seg) => s + seg.prob, 0);
    let rand = Math.random() * totalProb;
    let winner = segments[0];
    for (const seg of segments) {
      rand -= seg.prob;
      if (rand <= 0) { winner = seg; break; }
    }

    const targetIdx = segments.indexOf(winner);
    const segAngle = 360 / segments.length;
    const newAngle = angle + 1440 + (360 - targetIdx * segAngle - segAngle / 2);
    setAngle(newAngle);

    setTimeout(() => {
      setSpinning(false);
      setResult(winner.value);
      if (winner.value > 0) haptic('success');
      else haptic('error');
      onWin(winner.value - cost);
    }, 3500);
  };

  const segAngle = 360 / segments.length;

  return (
    <div className="flex flex-col items-center animate-fade-in">
      <h3 className="font-extrabold text-lg mb-4">🎰 Lucky Spin</h3>
      <p className="text-xs text-white/30 mb-4">Стоимость: ◎{cost} LNC за спин</p>

      {/* Wheel */}
      <div className="relative w-64 h-64 mb-6">
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20 w-0 h-0"
          style={{ borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderTop: '18px solid #ffc300' }} />

        {/* Wheel SVG */}
        <div className="w-full h-full rounded-full overflow-hidden border-4 border-white/10 shadow-2xl"
          style={{ transform: `rotate(${angle}deg)`, transition: spinning ? 'transform 3.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none' }}>
          <svg viewBox="0 0 200 200" className="w-full h-full">
            {segments.map((seg, i) => {
              const startAngle = i * segAngle * Math.PI / 180;
              const endAngle = (i + 1) * segAngle * Math.PI / 180;
              const x1 = 100 + 100 * Math.cos(startAngle);
              const y1 = 100 + 100 * Math.sin(startAngle);
              const x2 = 100 + 100 * Math.cos(endAngle);
              const y2 = 100 + 100 * Math.sin(endAngle);
              const largeArc = segAngle > 180 ? 1 : 0;
              const midAngle = (startAngle + endAngle) / 2;
              const tx = 100 + 65 * Math.cos(midAngle);
              const ty = 100 + 65 * Math.sin(midAngle);

              return (
                <g key={i}>
                  <path d={`M100,100 L${x1},${y1} A100,100 0 ${largeArc},1 ${x2},${y2} Z`} fill={seg.color} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                  <text x={tx} y={ty} textAnchor="middle" dominantBaseline="central" fill="white" fontSize="11" fontWeight="bold"
                    transform={`rotate(${i * segAngle + segAngle / 2}, ${tx}, ${ty})`}>
                    {seg.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-black border-2 border-white/10 flex items-center justify-center shadow-xl">
            <img src="/logo.png" alt="" className="w-8 h-8 object-contain" />
          </div>
        </div>
      </div>

      {/* Result */}
      {result !== null && !spinning && (
        <div className={`text-center mb-4 animate-scale-in ${result > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          <p className="text-3xl font-extrabold">{result > 0 ? `+◎${result}` : 'Мимо!'}</p>
          <p className="text-xs text-white/30 mt-1">{result > 0 ? 'Выигрыш зачислен!' : 'Попробуйте ещё раз'}</p>
        </div>
      )}

      <button onClick={spin} disabled={spinning || balance < cost}
        className="btn-primary w-full max-w-xs text-base">
        {spinning ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            Крутим...
          </span>
        ) : `🎰 Крутить за ◎${cost}`}
      </button>
    </div>
  );
}

// ========== CRASH GAME ==========
function CrashGame({ balance, onResult }: { balance: number; onResult: (delta: number) => void }) {
  const [state, setState] = useState<'idle' | 'running' | 'crashed' | 'cashed'>('idle');
  const [bet, setBet] = useState('50');
  const [multiplier, setMultiplier] = useState(1.0);
  const [crashPoint, setCrashPoint] = useState(0);
  const intervalRef = useRef<any>(null);

  const startGame = () => {
    const b = parseFloat(bet) || 0;
    if (b <= 0 || b > balance) { haptic('error'); return; }
    haptic('medium');

    // Generate crash point (house edge ~3%)
    const r = Math.random();
    const cp = Math.max(1.01, 1 / (1 - r * 0.97));
    setCrashPoint(cp);
    setMultiplier(1.0);
    setState('running');

    intervalRef.current = setInterval(() => {
      setMultiplier(prev => {
        const next = prev + 0.01 + prev * 0.005;
        if (next >= cp) {
          clearInterval(intervalRef.current);
          setState('crashed');
          haptic('error');
          onResult(-b);
          return cp;
        }
        return next;
      });
    }, 50);
  };

  const cashOut = () => {
    if (state !== 'running') return;
    clearInterval(intervalRef.current);
    haptic('success');
    setState('cashed');
    const b = parseFloat(bet) || 0;
    const win = b * multiplier - b;
    onResult(win);
  };

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const b = parseFloat(bet) || 0;

  return (
    <div className="flex flex-col items-center animate-fade-in">
      <h3 className="font-extrabold text-lg mb-4">🚀 Crash</h3>

      {/* Multiplier display */}
      <div className={`w-full glass rounded-2xl p-8 flex items-center justify-center mb-4 ${
        state === 'crashed' ? 'border border-red-500/30' : state === 'cashed' ? 'border border-emerald-500/30' : ''
      }`}>
        <div className="text-center">
          <p className={`text-6xl font-black tabular-nums ${
            state === 'crashed' ? 'text-red-400' : state === 'cashed' ? 'text-emerald-400' :
            multiplier >= 2 ? 'text-emerald-400' : 'text-white'
          }`}>
            {multiplier.toFixed(2)}x
          </p>
          {state === 'crashed' && <p className="text-red-400 text-sm font-bold mt-2">💥 CRASH!</p>}
          {state === 'cashed' && <p className="text-emerald-400 text-sm font-bold mt-2">💰 +◎{(b * multiplier - b).toFixed(2)}</p>}
          {state === 'idle' && <p className="text-white/25 text-xs mt-2">Поставьте и ждите роста</p>}
        </div>
      </div>

      {state === 'idle' && (
        <>
          <div className="w-full glass rounded-xl p-3 mb-3">
            <p className="text-xs text-white/35 mb-1.5">Ставка (LNC)</p>
            <input type="number" value={bet} onChange={e => setBet(e.target.value)}
              className="w-full bg-transparent text-2xl font-extrabold tabular-nums outline-none text-white text-center" />
          </div>
          <div className="flex gap-2 w-full mb-4">
            {[10, 50, 100, 500].map(v => (
              <button key={v} onClick={() => setBet(String(v))}
                className="flex-1 glass rounded-lg py-2 text-xs tabular-nums font-semibold active:scale-95 transition-transform">
                ◎{v}
              </button>
            ))}
          </div>
          <button onClick={startGame} disabled={b <= 0 || b > balance} className="btn-primary w-full">
            🚀 Старт
          </button>
        </>
      )}

      {state === 'running' && (
        <button onClick={cashOut}
          className="w-full py-5 rounded-2xl bg-emerald-500 text-white font-extrabold text-xl active:scale-[0.97] transition-transform animate-pulse">
          💰 Забрать ◎{(b * multiplier).toFixed(2)}
        </button>
      )}

      {(state === 'crashed' || state === 'cashed') && (
        <button onClick={() => { setState('idle'); setMultiplier(1.0); }}
          className="btn-primary w-full mt-2">
          🔄 Играть снова
        </button>
      )}
    </div>
  );
}

// ========== COIN FLIP ==========
function CoinFlip({ balance, onResult }: { balance: number; onResult: (delta: number) => void }) {
  const [bet, setBet] = useState('50');
  const [side, setSide] = useState<'heads' | 'tails'>('heads');
  const [flipping, setFlipping] = useState(false);
  const [result, setResult] = useState<'heads' | 'tails' | null>(null);
  const [won, setWon] = useState<boolean | null>(null);

  const flip = () => {
    const b = parseFloat(bet) || 0;
    if (b <= 0 || b > balance) { haptic('error'); return; }
    haptic('heavy');
    setFlipping(true);
    setResult(null);
    setWon(null);

    setTimeout(() => {
      const r = Math.random() < 0.49 ? 'heads' : 'tails'; // slight house edge
      setResult(r);
      setFlipping(false);
      const w = r === side;
      setWon(w);
      if (w) { haptic('success'); onResult(b * 0.95); } // 1.95x payout
      else { haptic('error'); onResult(-b); }
    }, 1500);
  };

  return (
    <div className="flex flex-col items-center animate-fade-in">
      <h3 className="font-extrabold text-lg mb-4">🪙 Монетка</h3>

      {/* Coin */}
      <div className={`w-32 h-32 rounded-full flex items-center justify-center text-5xl mb-6 shadow-2xl transition-transform duration-500 ${
        flipping ? 'animate-spin' : ''
      } ${result === 'heads' ? 'bg-gradient-to-br from-yellow-400 to-amber-500' : result === 'tails' ? 'bg-gradient-to-br from-gray-400 to-gray-500' : 'bg-gradient-to-br from-yellow-400/50 to-amber-500/50'}`}>
        {result ? (result === 'heads' ? '🌙' : '⭐') : '🪙'}
      </div>

      {won !== null && (
        <p className={`text-2xl font-extrabold mb-4 animate-scale-in ${won ? 'text-emerald-400' : 'text-red-400'}`}>
          {won ? `+◎${(parseFloat(bet) * 0.95).toFixed(2)}!` : `−◎${bet}`}
        </p>
      )}

      {/* Side selection */}
      <div className="flex gap-3 w-full max-w-xs mb-4">
        <button onClick={() => setSide('heads')}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${side === 'heads' ? 'bg-yellow-500 text-black' : 'glass text-white/50'}`}>
          🌙 Луна
        </button>
        <button onClick={() => setSide('tails')}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${side === 'tails' ? 'bg-gray-400 text-black' : 'glass text-white/50'}`}>
          ⭐ Звезда
        </button>
      </div>

      {/* Bet */}
      <div className="w-full max-w-xs glass rounded-xl p-3 mb-3">
        <input type="number" value={bet} onChange={e => setBet(e.target.value)} placeholder="Ставка"
          className="w-full bg-transparent text-xl font-bold tabular-nums outline-none text-white text-center" />
      </div>

      <div className="flex gap-2 w-full max-w-xs mb-4">
        {[10, 50, 100, 500].map(v => (
          <button key={v} onClick={() => setBet(String(v))}
            className="flex-1 glass rounded-lg py-1.5 text-xs tabular-nums active:scale-95 transition-transform">◎{v}</button>
        ))}
      </div>

      <button onClick={flip} disabled={flipping || (parseFloat(bet) || 0) > balance}
        className="btn-primary w-full max-w-xs">
        {flipping ? '🪙 Подбрасываем...' : '🪙 Подбросить'}
      </button>
    </div>
  );
}

// ========== MAIN GAMES SCREEN ==========
export default function GamesScreen() {
  const { user, accounts, go, updateBalance, addTx, addNotif } = useStore();
  const [game, setGame] = useState<'menu' | 'spin' | 'crash' | 'coin'>('menu');

  if (!user) return null;

  const lncAcc = accounts.find(a => a.currency === 'LNC');
  const balance = lncAcc?.balance || 0;

  const handleResult = (delta: number) => {
    if (!lncAcc) return;
    updateBalance(lncAcc.id, delta);
    dbUpdateBalance(lncAcc.id, delta).catch(() => {});

    if (delta > 0) {
      addTx({
        id: uid(), from_user_id: 0, to_user_id: user.telegram_id,
        from_account_id: 'games', to_account_id: lncAcc.id,
        amount: delta, fee: 0, currency: 'LNC',
        type: 'business', status: 'completed',
        note: 'Выигрыш в игре', created_at: new Date().toISOString(),
      });
    }
  };

  const games = [
    { id: 'spin' as const, icon: '🎰', name: 'Lucky Spin', desc: 'Крути колесо — выигрывай до ◎5000', color: 'from-purple-500/20 to-pink-500/10' },
    { id: 'crash' as const, icon: '🚀', name: 'Crash', desc: 'Успей забрать до краша!', color: 'from-emerald-500/20 to-cyan-500/10' },
    { id: 'coin' as const, icon: '🪙', name: 'Монетка', desc: 'Орёл или решка — x1.95', color: 'from-yellow-500/20 to-amber-500/10' },
  ];

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => game === 'menu' ? go('city') : setGame('menu')} className="text-white/50 text-sm">← Назад</button>
        <h1 className="font-bold flex-1">🎮 Мини-игры</h1>
        <div className="glass rounded-full px-3 py-1 text-xs font-bold tabular-nums">
          ◎{balance.toFixed(0)}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {game === 'menu' && (
          <div className="space-y-3 mt-2 animate-fade-in">
            <div className="glass-accent rounded-2xl p-4 mb-4">
              <p className="text-xs text-white/35 uppercase font-medium">Ваш баланс</p>
              <p className="text-3xl font-extrabold tabular-nums mt-1">◎{balance.toFixed(2)} <span className="text-base text-white/30">LNC</span></p>
            </div>

            {games.map((g, i) => (
              <button key={g.id} onClick={() => { haptic('medium'); setGame(g.id); }}
                className={`w-full rounded-2xl p-5 flex items-center gap-4 text-left bg-gradient-to-r ${g.color} border border-white/[0.06] active:scale-[0.98] transition-all animate-slide-up`}
                style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="w-14 h-14 rounded-2xl bg-white/[0.06] flex items-center justify-center text-3xl">{g.icon}</div>
                <div className="flex-1">
                  <p className="font-extrabold text-lg">{g.name}</p>
                  <p className="text-xs text-white/35 mt-0.5">{g.desc}</p>
                </div>
                <span className="text-white/20 text-xl">›</span>
              </button>
            ))}
          </div>
        )}

        {game === 'spin' && <div className="mt-4"><LuckySpin balance={balance} onWin={handleResult} /></div>}
        {game === 'crash' && <div className="mt-4"><CrashGame balance={balance} onResult={handleResult} /></div>}
        {game === 'coin' && <div className="mt-4"><CoinFlip balance={balance} onResult={handleResult} /></div>}
      </div>
    </div>
  );
}
