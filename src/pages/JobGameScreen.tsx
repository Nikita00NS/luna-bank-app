import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore, uid } from '../lib/store';
import { haptic } from '../lib/utils';
import { dbUpdateBalance, dbCreateTransaction } from '../lib/db';
import { ArrowLeftIcon } from '../components/Icons';

// ===== TYPES =====
type JobId = 'courier' | 'freelancer' | 'developer' | 'manager' | 'trader';
type GameState = 'idle' | 'playing' | 'won' | 'lost';

interface JobConfig {
  id: JobId;
  name: string;
  icon: string;
  pay: number;
  xp: number;
  level: number;
  timeLimit: number; // seconds
  goal: string;
}

const JOB_CONFIGS: JobConfig[] = [
  { id: 'courier', name: 'Курьер', icon: '🚴', pay: 5, xp: 10, level: 1, timeLimit: 15, goal: 'Доставьте 10 посылок!' },
  { id: 'freelancer', name: 'Фрилансер', icon: '💻', pay: 15, xp: 25, level: 3, timeLimit: 20, goal: 'Наберите код!' },
  { id: 'developer', name: 'Разработчик', icon: '👨‍💻', pay: 35, xp: 50, level: 5, timeLimit: 15, goal: 'Найдите все баги!' },
  { id: 'manager', name: 'Менеджер', icon: '📊', pay: 60, xp: 80, level: 8, timeLimit: 25, goal: 'Решите все задачи!' },
  { id: 'trader', name: 'Трейдер', icon: '📈', pay: 100, xp: 120, level: 12, timeLimit: 20, goal: 'Купите на дне!' },
];

// ============================================
// 🚴 COURIER GAME — Tap to deliver packages
// ============================================
function CourierGame({ onComplete }: { onComplete: (success: boolean) => void }) {
  const [delivered, setDelivered] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [packages, setPackages] = useState<{ id: number; x: number; y: number; caught: boolean }[]>([]);
  const [combo, setCombo] = useState(0);
  const target = 10;

  useEffect(() => {
    // Spawn packages
    const spawn = setInterval(() => {
      setPackages((prev) => [
        ...prev.filter((p) => !p.caught).slice(-8),
        {
          id: Date.now(),
          x: 10 + Math.random() * 80,
          y: 10 + Math.random() * 70,
          caught: false,
        },
      ]);
    }, 800);

    // Timer
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          clearInterval(spawn);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      clearInterval(spawn);
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (delivered >= target) onComplete(true);
    if (timeLeft === 0 && delivered < target) onComplete(false);
  }, [delivered, timeLeft]);

  const catchPackage = (id: number) => {
    haptic('light');
    setPackages((prev) => prev.map((p) => (p.id === id ? { ...p, caught: true } : p)));
    setDelivered((d) => d + 1);
    setCombo((c) => c + 1);
  };

  return (
    <div className="flex flex-col h-full">
      {/* HUD */}
      <div className="flex items-center justify-between mb-3">
        <div className="glass rounded-lg px-3 py-1.5 text-xs font-bold mono">
          📦 {delivered}/{target}
        </div>
        {combo >= 3 && (
          <div className="text-yellow-400 text-xs font-bold animate-scale-in">
            🔥 x{combo} COMBO!
          </div>
        )}
        <div className={`glass rounded-lg px-3 py-1.5 text-xs font-bold mono ${timeLeft <= 5 ? 'text-red-400' : ''}`}>
          ⏱ {timeLeft}с
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-white/[0.06] rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-300"
          style={{ width: `${(delivered / target) * 100}%` }}
        />
      </div>

      {/* Game field */}
      <div className="flex-1 relative glass rounded-2xl overflow-hidden min-h-[300px]">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-5">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute border border-white/10"
              style={{
                left: `${(i % 5) * 25}%`,
                top: `${Math.floor(i / 5) * 25}%`,
                width: '25%',
                height: '25%',
              }}
            />
          ))}
        </div>

        {/* Packages */}
        {packages
          .filter((p) => !p.caught)
          .map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => catchPackage(pkg.id)}
              className="absolute w-12 h-12 flex items-center justify-center text-2xl
                         rounded-xl bg-amber-500/20 border border-amber-500/30
                         active:scale-75 transition-transform duration-100
                         animate-scale-in"
              style={{ left: `${pkg.x}%`, top: `${pkg.y}%` }}
            >
              📦
            </button>
          ))}

        {/* Player */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-3xl animate-float">
          🚴
        </div>
      </div>

      <p className="text-center text-xs text-white/30 mt-2">
        Тапайте по посылкам чтобы доставить!
      </p>
    </div>
  );
}

// ============================================
// 💻 FREELANCER GAME — Type the code
// ============================================
function FreelancerGame({ onComplete }: { onComplete: (success: boolean) => void }) {
  const CODE_SNIPPETS = [
    'const x = 42;',
    'let arr = [];',
    'return true;',
    'if (a > b) {}',
    'for (i=0;;)',
    'fn(x, y)',
    'obj.key',
    'a === b',
  ];

  const [currentIdx, setCurrentIdx] = useState(0);
  const [typed, setTyped] = useState('');
  const [completed, setCompleted] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [errors, setErrors] = useState(0);
  const target = 5;

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timer); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (completed >= target) onComplete(true);
    if (timeLeft === 0 && completed < target) onComplete(false);
  }, [completed, timeLeft]);

  const currentCode = CODE_SNIPPETS[currentIdx % CODE_SNIPPETS.length];

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTyped(val);

    if (val === currentCode) {
      haptic('success');
      setCompleted((c) => c + 1);
      setCurrentIdx((i) => i + 1);
      setTyped('');
    } else if (val.length > 0 && !currentCode.startsWith(val)) {
      haptic('error');
      setErrors((e) => e + 1);
    }
  };

  // Character-by-character highlight
  const renderCode = () => {
    return currentCode.split('').map((char, i) => {
      let color = 'text-white/30';
      if (i < typed.length) {
        color = typed[i] === char ? 'text-emerald-400' : 'text-red-400';
      } else if (i === typed.length) {
        color = 'text-white bg-white/10';
      }
      return (
        <span key={i} className={`${color} font-mono text-lg`}>
          {char === ' ' ? '\u00A0' : char}
        </span>
      );
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* HUD */}
      <div className="flex items-center justify-between mb-3">
        <div className="glass rounded-lg px-3 py-1.5 text-xs font-bold mono">
          ✅ {completed}/{target}
        </div>
        <div className="text-xs text-red-400/60 mono">
          {errors > 0 && `${errors} ошибок`}
        </div>
        <div className={`glass rounded-lg px-3 py-1.5 text-xs font-bold mono ${timeLeft <= 5 ? 'text-red-400' : ''}`}>
          ⏱ {timeLeft}с
        </div>
      </div>

      {/* Progress */}
      <div className="h-2 bg-white/[0.06] rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all"
          style={{ width: `${(completed / target) * 100}%` }}
        />
      </div>

      {/* Code display */}
      <div className="glass p-6 rounded-2xl mb-4 text-center">
        <p className="text-xs text-white/30 mb-3 uppercase tracking-wider">
          Наберите код:
        </p>
        <div className="flex flex-wrap justify-center gap-0.5">
          {renderCode()}
        </div>
      </div>

      {/* Input */}
      <input
        type="text"
        value={typed}
        onChange={handleInput}
        autoFocus
        className="
          w-full glass px-4 py-4 bg-transparent text-white
          text-lg font-mono outline-none text-center
          focus:ring-1 focus:ring-violet-500/30
        "
        placeholder="Начните печатать..."
      />

      <p className="text-center text-xs text-white/20 mt-3">
        Введите код символ за символом
      </p>
    </div>
  );
}

// ============================================
// 👨‍💻 DEVELOPER GAME — Find the bugs (reaction)
// ============================================
function DeveloperGame({ onComplete }: { onComplete: (success: boolean) => void }) {
  const [bugs, setBugs] = useState<{ id: number; x: number; y: number; alive: boolean }[]>([]);
  const [caught, setCaught] = useState(0);
  const [missed, setMissed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const target = 8;

  useEffect(() => {
    const spawn = setInterval(() => {
      const newBug = {
        id: Date.now() + Math.random(),
        x: 5 + Math.random() * 85,
        y: 5 + Math.random() * 75,
        alive: true,
      };
      setBugs((prev) => [...prev.slice(-12), newBug]);

      // Auto-remove after 2 seconds (missed)
      setTimeout(() => {
        setBugs((prev) =>
          prev.map((b) => {
            if (b.id === newBug.id && b.alive) {
              setMissed((m) => m + 1);
              return { ...b, alive: false };
            }
            return b;
          })
        );
      }, 2000);
    }, 600);

    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timer); clearInterval(spawn); return 0; }
        return t - 1;
      });
    }, 1000);

    return () => { clearInterval(spawn); clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (caught >= target) onComplete(true);
    if (timeLeft === 0 && caught < target) onComplete(false);
  }, [caught, timeLeft]);

  const squashBug = (id: number) => {
    haptic('medium');
    setBugs((prev) => prev.map((b) => (b.id === id ? { ...b, alive: false } : b)));
    setCaught((c) => c + 1);
  };

  return (
    <div className="flex flex-col h-full">
      {/* HUD */}
      <div className="flex items-center justify-between mb-3">
        <div className="glass rounded-lg px-3 py-1.5 text-xs font-bold mono">
          🐛 {caught}/{target}
        </div>
        <div className="text-xs text-red-400/60 mono">
          💀 {missed} пропущено
        </div>
        <div className={`glass rounded-lg px-3 py-1.5 text-xs font-bold mono ${timeLeft <= 5 ? 'text-red-400' : ''}`}>
          ⏱ {timeLeft}с
        </div>
      </div>

      {/* Progress */}
      <div className="h-2 bg-white/[0.06] rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all"
          style={{ width: `${(caught / target) * 100}%` }}
        />
      </div>

      {/* Game field — "code editor" */}
      <div className="flex-1 relative glass rounded-2xl overflow-hidden min-h-[300px] font-mono text-[10px] text-white/10 p-3 leading-relaxed">
        {/* Fake code background */}
        <p>{'function processData(input) {'}</p>
        <p>{'  const result = [];'}</p>
        <p>{'  for (let i = 0; i < input.length; i++) {'}</p>
        <p>{'    if (input[i].valid) {'}</p>
        <p>{'      result.push(transform(input[i]));'}</p>
        <p>{'    }'}</p>
        <p>{'  }'}</p>
        <p>{'  return result.filter(Boolean);'}</p>
        <p>{'}'}</p>
        <p>{''}</p>
        <p>{'async function fetchAPI(url) {'}</p>
        <p>{'  const res = await fetch(url);'}</p>
        <p>{'  return res.json();'}</p>
        <p>{'}'}</p>

        {/* Bugs crawling on code */}
        {bugs
          .filter((b) => b.alive)
          .map((bug) => (
            <button
              key={bug.id}
              onClick={() => squashBug(bug.id)}
              className="
                absolute w-10 h-10 flex items-center justify-center text-xl
                rounded-full bg-red-500/20 border border-red-500/30
                active:scale-50 transition-transform duration-100
                animate-scale-in cursor-pointer
              "
              style={{ left: `${bug.x}%`, top: `${bug.y}%` }}
            >
              🐛
            </button>
          ))}
      </div>

      <p className="text-center text-xs text-white/30 mt-2">
        Тапайте по багам, пока они не исчезли!
      </p>
    </div>
  );
}

// ============================================
// 📊 MANAGER GAME — Sort tasks (quick decisions)
// ============================================
function ManagerGame({ onComplete }: { onComplete: (success: boolean) => void }) {
  const TASKS = [
    { text: 'Отправить отчёт', priority: 'high', correct: 'left' },
    { text: 'Обед с клиентом', priority: 'medium', correct: 'right' },
    { text: 'Обновить CRM', priority: 'low', correct: 'right' },
    { text: 'Звонок инвестору', priority: 'high', correct: 'left' },
    { text: 'Проверить email', priority: 'low', correct: 'right' },
    { text: 'Подписать договор', priority: 'high', correct: 'left' },
    { text: 'Заказать канцелярию', priority: 'low', correct: 'right' },
    { text: 'Презентация совету', priority: 'high', correct: 'left' },
    { text: 'Team building', priority: 'medium', correct: 'right' },
    { text: 'Бюджет Q4', priority: 'high', correct: 'left' },
  ];

  const [currentIdx, setCurrentIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [timeLeft, setTimeLeft] = useState(25);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const target = 7;

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timer); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (correct >= target) onComplete(true);
    if (timeLeft === 0 && correct < target) onComplete(false);
  }, [correct, timeLeft]);

  const task = TASKS[currentIdx % TASKS.length];

  const decide = (choice: 'left' | 'right') => {
    if (choice === task.correct) {
      haptic('success');
      setCorrect((c) => c + 1);
      setFeedback('correct');
    } else {
      haptic('error');
      setWrong((w) => w + 1);
      setFeedback('wrong');
    }
    setTimeout(() => {
      setFeedback(null);
      setCurrentIdx((i) => i + 1);
    }, 400);
  };

  return (
    <div className="flex flex-col h-full">
      {/* HUD */}
      <div className="flex items-center justify-between mb-3">
        <div className="glass rounded-lg px-3 py-1.5 text-xs font-bold mono">
          ✅ {correct}/{target}
        </div>
        <div className="text-xs text-red-400/60 mono">
          ❌ {wrong}
        </div>
        <div className={`glass rounded-lg px-3 py-1.5 text-xs font-bold mono ${timeLeft <= 5 ? 'text-red-400' : ''}`}>
          ⏱ {timeLeft}с
        </div>
      </div>

      {/* Progress */}
      <div className="h-2 bg-white/[0.06] rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full transition-all"
          style={{ width: `${(correct / target) * 100}%` }}
        />
      </div>

      {/* Instruction */}
      <div className="text-center mb-4">
        <p className="text-xs text-white/30">
          ← <span className="text-emerald-400">Срочно</span> | <span className="text-blue-400">Потом</span> →
        </p>
      </div>

      {/* Task card */}
      <div
        className={`
          glass-accent p-8 text-center mb-6 transition-all duration-200
          ${feedback === 'correct' ? 'ring-2 ring-emerald-500/50' : ''}
          ${feedback === 'wrong' ? 'ring-2 ring-red-500/50' : ''}
        `}
      >
        <p className={`text-xs mb-2 font-semibold uppercase tracking-wider ${
          task.priority === 'high' ? 'text-red-400' :
          task.priority === 'medium' ? 'text-yellow-400' : 'text-blue-400'
        }`}>
          {task.priority === 'high' ? '🔴 Высокий' :
           task.priority === 'medium' ? '🟡 Средний' : '🔵 Низкий'} приоритет
        </p>
        <p className="text-xl font-extrabold">{task.text}</p>
      </div>

      {/* Decision buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => decide('left')}
          className="
            flex-1 py-5 rounded-2xl bg-emerald-500/20 border border-emerald-500/30
            text-emerald-400 font-bold text-sm
            active:scale-95 transition-all
          "
        >
          ← Срочно
        </button>
        <button
          onClick={() => decide('right')}
          className="
            flex-1 py-5 rounded-2xl bg-blue-500/20 border border-blue-500/30
            text-blue-400 font-bold text-sm
            active:scale-95 transition-all
          "
        >
          Потом →
        </button>
      </div>
    </div>
  );
}

// ============================================
// 📈 TRADER GAME — Catch the dip (timing)
// ============================================
function TraderGame({ onComplete }: { onComplete: (success: boolean) => void }) {
  const [price, setPrice] = useState(100);
  const [priceHistory, setPriceHistory] = useState<number[]>([100]);
  const [bought, setBought] = useState(false);
  const [buyPrice, setBuyPrice] = useState(0);
  const [profit, setProfit] = useState(0);
  const [trades, setTrades] = useState(0);
  const [successfulTrades, setSuccessfulTrades] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const target = 3;

  useEffect(() => {
    const priceTimer = setInterval(() => {
      setPrice((p) => {
        const change = p * (Math.random() - 0.45) * 0.08;
        const newPrice = Math.max(50, Math.min(200, p + change));
        setPriceHistory((h) => [...h.slice(-40), newPrice]);
        return Math.round(newPrice * 100) / 100;
      });
    }, 200);

    const gameTimer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(gameTimer); clearInterval(priceTimer); return 0; }
        return t - 1;
      });
    }, 1000);

    return () => { clearInterval(priceTimer); clearInterval(gameTimer); };
  }, []);

  useEffect(() => {
    if (successfulTrades >= target) onComplete(true);
    if (timeLeft === 0 && successfulTrades < target) onComplete(false);
  }, [successfulTrades, timeLeft]);

  const buy = () => {
    if (bought) return;
    haptic('medium');
    setBought(true);
    setBuyPrice(price);
  };

  const sell = () => {
    if (!bought) return;
    const p = price - buyPrice;
    setProfit((prev) => prev + p);
    setTrades((t) => t + 1);
    if (p > 0) {
      haptic('success');
      setSuccessfulTrades((s) => s + 1);
    } else {
      haptic('error');
    }
    setBought(false);
    setBuyPrice(0);
  };

  // SVG chart
  const chartWidth = 300;
  const chartHeight = 100;
  const min = Math.min(...priceHistory);
  const max = Math.max(...priceHistory);
  const range = max - min || 1;
  const points = priceHistory
    .map(
      (v, i) =>
        `${(i / Math.max(priceHistory.length - 1, 1)) * chartWidth},${
          chartHeight - ((v - min) / range) * (chartHeight - 10) - 5
        }`
    )
    .join(' ');
  const isUp = priceHistory.length > 1 && priceHistory[priceHistory.length - 1] >= priceHistory[priceHistory.length - 2];

  return (
    <div className="flex flex-col h-full">
      {/* HUD */}
      <div className="flex items-center justify-between mb-3">
        <div className="glass rounded-lg px-3 py-1.5 text-xs font-bold mono">
          💰 {successfulTrades}/{target}
        </div>
        <div className={`text-xs font-bold mono ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {profit >= 0 ? '+' : ''}{profit.toFixed(2)}
        </div>
        <div className={`glass rounded-lg px-3 py-1.5 text-xs font-bold mono ${timeLeft <= 5 ? 'text-red-400' : ''}`}>
          ⏱ {timeLeft}с
        </div>
      </div>

      {/* Price display */}
      <div className="glass-accent p-4 rounded-2xl mb-4 text-center">
        <p className="text-xs text-white/30 mb-1">TON/USDT</p>
        <p className={`text-4xl font-extrabold mono ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
          ${price.toFixed(2)}
        </p>
        {bought && (
          <p className={`text-xs mt-1 mono ${price - buyPrice >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            Куплено по ${buyPrice.toFixed(2)} | P&L: {(price - buyPrice).toFixed(2)}
          </p>
        )}
      </div>

      {/* Chart */}
      <div className="glass p-3 rounded-2xl mb-4">
        <svg
          width="100%"
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isUp ? '#34d399' : '#f87171'} stopOpacity="0.3" />
              <stop offset="100%" stopColor={isUp ? '#34d399' : '#f87171'} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon
            fill="url(#tg)"
            points={`0,${chartHeight} ${points} ${chartWidth},${chartHeight}`}
          />
          <polyline
            fill="none"
            stroke={isUp ? '#34d399' : '#f87171'}
            strokeWidth="2"
            points={points}
          />
          {/* Buy line */}
          {bought && (
            <line
              x1="0"
              y1={chartHeight - ((buyPrice - min) / range) * (chartHeight - 10) - 5}
              x2={chartWidth}
              y2={chartHeight - ((buyPrice - min) / range) * (chartHeight - 10) - 5}
              stroke="#facc15"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          )}
        </svg>
      </div>

      {/* Buy/Sell buttons */}
      <div className="flex gap-3">
        <button
          onClick={buy}
          disabled={bought}
          className={`
            flex-1 py-4 rounded-2xl font-bold text-sm transition-all active:scale-95
            ${bought
              ? 'bg-white/5 text-white/20'
              : 'bg-emerald-500 text-white'}
          `}
        >
          📈 Купить
        </button>
        <button
          onClick={sell}
          disabled={!bought}
          className={`
            flex-1 py-4 rounded-2xl font-bold text-sm transition-all active:scale-95
            ${!bought
              ? 'bg-white/5 text-white/20'
              : 'bg-red-500 text-white'}
          `}
        >
          📉 Продать
        </button>
      </div>
    </div>
  );
}

// ============================================
// MAIN JOB GAME SCREEN
// ============================================
export default function JobGameScreen() {
  const { user, accounts, go, updateBalance, addTx, addNotif, patchUser, setJobCD, jobCooldowns } = useStore();
  const [selectedJob, setSelectedJob] = useState<JobConfig | null>(null);
  const [gameState, setGameState] = useState<GameState>('idle');

  if (!user) return null;

  const personalAcc = accounts.find((a) => a.type === 'personal');
  const xpForNext = user.level * 100;

  const startGame = (job: JobConfig) => {
    const cd = jobCooldowns[job.id] || 0;
    if (Date.now() < cd || user.level < job.level) {
      haptic('error');
      return;
    }
    haptic('medium');
    setSelectedJob(job);
    setGameState('playing');
  };

  const handleComplete = (success: boolean) => {
    if (!selectedJob || !personalAcc) return;

    if (success) {
      haptic('success');
      setGameState('won');

      // Reward
      updateBalance(personalAcc.id, selectedJob.pay);
      dbUpdateBalance(personalAcc.id, selectedJob.pay).catch(() => {});

      // XP
      const newXp = user.xp + selectedJob.xp;
      const levelUp = newXp >= xpForNext;
      patchUser({
        xp: levelUp ? newXp - xpForNext : newXp,
        level: levelUp ? user.level + 1 : user.level,
      });

      // Cooldown
      setJobCD(selectedJob.id, Date.now() + 60000);

      // Transaction
      addTx({
        id: uid(), from_user_id: 0, to_user_id: user.telegram_id,
        from_account_id: 'city', to_account_id: personalAcc.id,
        amount: selectedJob.pay, fee: 0, currency: 'LNC',
        type: 'job', status: 'completed',
        note: `Зарплата: ${selectedJob.name}`,
        created_at: new Date().toISOString(),
      });

      if (levelUp) {
        addNotif({
          id: uid(), title: '🎉 Level Up!',
          message: `LVL ${user.level + 1}!`,
          type: 'system', read: false,
          created_at: new Date().toISOString(),
        });
      }
    } else {
      haptic('error');
      setGameState('lost');
    }
  };

  const renderGame = () => {
    if (!selectedJob) return null;
    switch (selectedJob.id) {
      case 'courier': return <CourierGame onComplete={handleComplete} />;
      case 'freelancer': return <FreelancerGame onComplete={handleComplete} />;
      case 'developer': return <DeveloperGame onComplete={handleComplete} />;
      case 'manager': return <ManagerGame onComplete={handleComplete} />;
      case 'trader': return <TraderGame onComplete={handleComplete} />;
    }
  };

  // ===== GAME PLAYING =====
  if (gameState === 'playing' && selectedJob) {
    return (
      <div className="h-full flex flex-col bg-black safe-top">
        <div className="px-5 pt-4 pb-2 flex items-center gap-3">
          <span className="text-2xl">{selectedJob.icon}</span>
          <h1 className="font-bold flex-1">{selectedJob.name}</h1>
          <span className="text-xs text-white/30">+◎{selectedJob.pay}</span>
        </div>
        <div className="flex-1 px-5 pb-8 overflow-hidden">
          {renderGame()}
        </div>
      </div>
    );
  }

  // ===== RESULT =====
  if ((gameState === 'won' || gameState === 'lost') && selectedJob) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black safe-top px-5 animate-fade-in">
        <div className={`
          w-24 h-24 rounded-full flex items-center justify-center text-5xl mb-6
          ${gameState === 'won' ? 'bg-emerald-500/15 animate-check-pop' : 'bg-red-500/15'}
        `}>
          {gameState === 'won' ? '🎉' : '😔'}
        </div>

        <h2 className="text-2xl font-extrabold mb-2">
          {gameState === 'won' ? 'Отличная работа!' : 'Не получилось...'}
        </h2>

        {gameState === 'won' ? (
          <div className="text-center mb-8">
            <p className="text-emerald-400 text-lg font-bold mono">+◎{selectedJob.pay} LNC</p>
            <p className="text-white/30 text-sm">+{selectedJob.xp} XP</p>
          </div>
        ) : (
          <p className="text-white/30 text-sm mb-8">Попробуйте ещё раз!</p>
        )}

        <button
          onClick={() => { setGameState('idle'); setSelectedJob(null); }}
          className="btn-primary w-full max-w-sm"
        >
          {gameState === 'won' ? 'Отлично!' : 'Попробовать снова'}
        </button>
      </div>
    );
  }

  // ===== JOB SELECTION =====
  return (
    <div className="h-full overflow-y-auto pb-24 safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('city')} className="text-white/50">
          <ArrowLeftIcon size={20} />
        </button>
        <h1 className="font-bold flex-1">💼 Работы</h1>
      </div>

      <div className="px-5 mt-2 space-y-3">
        <p className="text-sm text-white/30 mb-2">
          Каждая профессия — уникальная мини-игра. Пройдите её и получите зарплату!
        </p>

        {JOB_CONFIGS.map((job, i) => {
          const cd = jobCooldowns[job.id] || 0;
          const isOnCooldown = Date.now() < cd;
          const isLocked = user.level < job.level;
          const remaining = Math.ceil((cd - Date.now()) / 1000);

          return (
            <button
              key={job.id}
              onClick={() => startGame(job)}
              disabled={isOnCooldown || isLocked}
              className={`
                w-full glass p-4 flex items-center gap-4 text-left
                active:scale-[0.98] transition-all animate-slide-up
                ${isLocked ? 'opacity-30' : ''}
                ${isOnCooldown ? 'opacity-50' : ''}
              `}
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center text-3xl">
                {job.icon}
              </div>
              <div className="flex-1">
                <p className="font-bold text-[15px]">{job.name}</p>
                <p className="text-xs text-white/30 mt-0.5">{job.goal}</p>
                <p className="text-[11px] text-white/20 mt-0.5">
                  +◎{job.pay} · +{job.xp}XP · {job.timeLimit}с · LVL {job.level}+
                </p>
              </div>
              <div className="text-right">
                {isLocked ? (
                  <span className="text-xs text-white/25">🔒 LVL {job.level}</span>
                ) : isOnCooldown ? (
                  <span className="text-xs text-white/25 mono">{remaining}с</span>
                ) : (
                  <span className="text-xs text-emerald-400 font-semibold">Играть →</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
