import React, { useState, useEffect } from 'react';
import { useStore, uid } from '../lib/store';
import { haptic, formatMoney, balanceInUsd } from '../lib/utils';
import { dbUpdateBalance, dbCreateTransaction, dbCreateGoal, dbGetGoals, dbUpdateGoal, dbDeleteGoal } from '../lib/db';
import { ArrowLeftIcon, PlusIcon } from '../components/Icons';
import AnimatedEmoji from '../components/AnimatedEmoji';
import Modal from '../components/Modal';

interface SavingsGoal {
  id: string;
  name: string;
  icon: string;
  target: number;
  saved: number;
  deadline?: string;
  created_at: string;
}

const GOAL_PRESETS = [
  { icon: '📱', name: 'iPhone', target: 20000 },
  { icon: '🚗', name: 'Автомобиль', target: 500000 },
  { icon: '✈️', name: 'Отпуск', target: 50000 },
  { icon: '🏠', name: 'Квартира', target: 2000000 },
  { icon: '💻', name: 'Ноутбук', target: 30000 },
  { icon: '🎓', name: 'Обучение', target: 100000 },
  { icon: '💍', name: 'Свадьба', target: 200000 },
  { icon: '🎯', name: 'Своя цель', target: 0 },
];

export default function SavingsScreen() {
  const { user, accounts, go, updateBalance, addTx } = useStore();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(true);

  const userId = user?.telegram_id;
  useEffect(() => { if (userId) loadGoalsFromDB(); }, [userId]);

  const loadGoalsFromDB = async () => {
    if (!user) return;
    setLoadingGoals(true);
    const data = await dbGetGoals(user.telegram_id);
    setGoals(data as SavingsGoal[]);
    setLoadingGoals(false);
  };
  const [showCreate, setShowCreate] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('🎯');
  const [newTarget, setNewTarget] = useState('');
  const [depositAmt, setDepositAmt] = useState('');

  if (!user) return null;
  const lncAcc = accounts.find((a) => a.currency === 'LNC');

  const createGoal = async () => {
    const target = parseFloat(newTarget) || 0;
    if (!newName || target <= 0) { haptic('error'); return; }
    haptic('success');
    await dbCreateGoal({ user_id: user.telegram_id, name: newName, icon: newIcon, target, saved: 0 });
    setShowCreate(false);
    setNewName(''); setNewTarget('');
    loadGoalsFromDB();
  };

  const depositToGoal = async () => {
    if (!selectedGoal || !lncAcc) return;
    const amt = parseFloat(depositAmt) || 0;
    if (amt <= 0 || amt > lncAcc.balance) { haptic('error'); return; }
    haptic('success');

    updateBalance(lncAcc.id, -amt);
    dbUpdateBalance(lncAcc.id, -amt).catch(() => {});
    await dbUpdateGoal(selectedGoal.id, { saved: Number(selectedGoal.saved) + amt });

    addTx({ id: uid(), from_user_id: user.telegram_id, to_user_id: user.telegram_id, from_account_id: lncAcc.id, to_account_id: `savings_${selectedGoal.id}`, amount: amt, fee: 0, currency: 'LNC', type: 'transfer', status: 'completed', note: `Копилка: ${selectedGoal.name}`, created_at: new Date().toISOString() });

    setShowDeposit(false);
    setDepositAmt('');
    loadGoalsFromDB();
  };

  const withdrawGoal = async (goal: SavingsGoal) => {
    if (!lncAcc || Number(goal.saved) <= 0) return;
    haptic('success');
    updateBalance(lncAcc.id, Number(goal.saved));
    dbUpdateBalance(lncAcc.id, Number(goal.saved)).catch(() => {});
    await dbUpdateGoal(goal.id, { saved: 0 });
    loadGoalsFromDB();
  };

  const handleDeleteGoal = async (id: string) => {
    const goal = goals.find((g) => g.id === id);
    if (goal && Number(goal.saved) > 0 && lncAcc) {
      updateBalance(lncAcc.id, Number(goal.saved));
      dbUpdateBalance(lncAcc.id, Number(goal.saved)).catch(() => {});
    }
    await dbDeleteGoal(id);
    haptic('medium');
    loadGoalsFromDB();
  };

  return (
    <div className="h-full flex flex-col bg-black safe-top">
      <div className="px-5 pt-4 pb-2 flex items-center gap-4">
        <button onClick={() => go('home')} className="text-white/50"><ArrowLeftIcon size={20} /></button>
        <h1 className="font-bold flex-1">Копилки</h1>
        <button onClick={() => { setShowCreate(true); haptic('light'); }} className="glass rounded-full w-8 h-8 flex items-center justify-center">
          <PlusIcon size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24 mt-2">
        {goals.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <AnimatedEmoji type="coin" size={56} />
            <h3 className="font-bold text-lg mt-4">Создайте цель</h3>
            <p className="text-white/30 text-sm mt-1 max-w-[250px] mx-auto">Копилки помогут откладывать на мечту</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary mt-6 px-8">
              + Новая цель
            </button>
          </div>
        ) : (
          <div className="space-y-3 animate-fade-in">
            {goals.map((goal, i) => {
              const pct = Math.min((goal.saved / goal.target) * 100, 100);
              const done = goal.saved >= goal.target;
              return (
                <div key={goal.id} className={`glass p-4 rounded-2xl animate-slide-up ${done ? 'ring-1 ring-emerald-500/30' : ''}`} style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{goal.icon}</span>
                    <div className="flex-1">
                      <p className="font-bold">{goal.name}</p>
                      <p className="text-[10px] text-white/25">◎{goal.saved.toFixed(0)} / ◎{goal.target.toFixed(0)}</p>
                    </div>
                    <p className={`font-extrabold text-lg ${done ? 'text-emerald-400' : ''}`}>{pct.toFixed(0)}%</p>
                  </div>

                  <div className="h-2.5 bg-white/[0.06] rounded-full overflow-hidden mb-3">
                    <div className={`h-full rounded-full transition-all ${done ? 'bg-emerald-500' : 'bg-gradient-to-r from-violet-500 to-pink-500'}`} style={{ width: `${pct}%` }} />
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => { setSelectedGoal(goal); setShowDeposit(true); haptic('light'); }}
                      className="flex-1 glass py-2 rounded-xl text-xs font-semibold active:scale-95">
                      📥 Пополнить
                    </button>
                    {goal.saved > 0 && (
                      <button onClick={() => withdrawGoal(goal)}
                        className="flex-1 glass py-2 rounded-xl text-xs font-semibold active:scale-95">
                        📤 Забрать
                      </button>
                    )}
                    <button onClick={() => handleDeleteGoal(goal.id)}
                      className="glass py-2 px-3 rounded-xl text-xs text-red-400/60 active:scale-95">
                      🗑
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Новая цель">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {GOAL_PRESETS.map((p) => (
              <button key={p.name} onClick={() => { setNewIcon(p.icon); setNewName(p.name); if (p.target) setNewTarget(String(p.target)); haptic('light'); }}
                className={`glass px-3 py-2 rounded-xl text-xs active:scale-95 ${newName === p.name ? 'ring-1 ring-white/20' : ''}`}>
                {p.icon} {p.name}
              </button>
            ))}
          </div>
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Название цели"
            className="w-full glass px-4 py-3 bg-transparent text-white outline-none rounded-xl" />
          <input type="number" value={newTarget} onChange={(e) => setNewTarget(e.target.value)} placeholder="Цель (LNC)"
            className="w-full glass px-4 py-3 bg-transparent text-white mono outline-none rounded-xl" />
          <button onClick={createGoal} disabled={!newName || !newTarget} className="btn-primary w-full">
            Создать копилку
          </button>
        </div>
      </Modal>

      {/* Deposit Modal */}
      <Modal open={showDeposit} onClose={() => setShowDeposit(false)} title={`📥 ${selectedGoal?.name || ''}`}>
        <div className="space-y-4">
          <p className="text-xs text-white/30">Баланс: ◎{lncAcc?.balance.toFixed(2) || 0}</p>
          <input type="number" value={depositAmt} onChange={(e) => setDepositAmt(e.target.value)} placeholder="Сумма"
            className="w-full glass px-4 py-3.5 bg-transparent text-white text-xl mono outline-none text-center rounded-xl" />
          <div className="flex gap-2">
            {[10, 50, 100, 500].map((v) => (
              <button key={v} onClick={() => setDepositAmt(String(v))} className="flex-1 glass py-2 rounded-lg text-xs mono active:scale-95">◎{v}</button>
            ))}
          </div>
          <button onClick={depositToGoal} disabled={!depositAmt || (parseFloat(depositAmt) || 0) > (lncAcc?.balance || 0)} className="btn-primary w-full">
            Пополнить ◎{depositAmt || 0}
          </button>
        </div>
      </Modal>
    </div>
  );
}
