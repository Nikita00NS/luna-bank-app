import React, { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { haptic } from '../lib/utils';
import { ArrowLeftIcon, SearchIcon, SendIcon } from '../components/Icons';
import { toastSuccess, toastError } from '../lib/toast';

export default function AdminSupportScreen() {
  const { go, back } = useStore();
  const [tickets, setTickets] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [response, setResponse] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'answered'>('all');

  useEffect(() => { loadTickets(); }, []);

  const loadTickets = async () => {
    const { data } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false }).limit(50);
    setTickets(data || []);
  };

  const handleRespond = async () => {
    if (!selected || !response.trim()) return;
    const { error } = await supabase.from('support_tickets')
      .update({ admin_response: response, status: 'answered', updated_at: new Date().toISOString() })
      .eq('id', selected.id);
    if (error) { toastError('Error', error.message); return; }
    toastSuccess('Response sent');
    setResponse('');
    loadTickets();
    setSelected(null);
  };

  const filtered = tickets.filter(t => filter === 'all' || t.status === filter);

  return (
    <div className="page safe-top">
      <div className="header">
        <button onClick={() => { haptic('light'); back(); }} className="back-btn"><ArrowLeftIcon size={18} color="var(--text)" /></button>
        <p className="header-title">Support</p>
      </div>

      <div className="flex gap-1.5 px-4 mt-2 overflow-x-auto no-scrollbar">
        {(['all', 'open', 'answered'] as const).map(f => (
          <button key={f} onClick={() => { setFilter(f); haptic('light'); }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${filter === f ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-card)] text-[var(--text-secondary)]'}`}>
            {f === 'all' ? 'All' : f === 'open' ? 'Open' : 'Answered'}
            <span className="ml-1 text-[9px] opacity-60">({tickets.filter(t => f === 'all' || t.status === f).length})</span>
          </button>
        ))}
      </div>

      <div className="px-4 mt-4 space-y-2">
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="font-semibold">All tickets processed</p>
          </div>
        ) : filtered.map((t) => (
          <div key={t.id} className="card overflow-hidden">
            <button onClick={() => { haptic('light'); setSelected(selected?.id === t.id ? null : t); }}
              className="w-full p-3.5 flex items-start gap-3 text-left active:scale-[0.98] transition-all">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: t.status === 'open' ? 'var(--red)' : 'var(--green)' }}>
                {t.user_name?.[0] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">{t.user_name}</p>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${t.status === 'open' ? 'text-[var(--red)]' : 'text-[var(--green)]'}`}
                    style={{ background: t.status === 'open' ? 'var(--red)/10' : 'var(--green)/10' }}>
                    {t.status === 'open' ? 'Open' : 'Answered'}
                  </span>
                </div>
                <p className="text-xs font-medium mt-0.5">{t.subject}</p>
                <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 truncate">{t.message.substring(0, 100)}...</p>
              </div>
            </button>

            {selected?.id === t.id && (
              <div className="p-3.5 pt-0 border-t space-y-3" style={{ borderColor: 'var(--border)' }}>
                <div className="p-3 rounded-xl text-sm bg-[var(--bg-surface)]">
                  <p className="font-medium mb-1">Question:</p>
                  <p className="text-[var(--text-secondary)]">{t.message}</p>
                </div>
                {t.admin_response && (
                  <div className="p-3 rounded-xl text-sm bg-[var(--accent)/10]">
                    <p className="font-medium mb-1 text-[var(--accent)]">Answer:</p>
                    <p className="text-[var(--text-secondary)]">{t.admin_response}</p>
                  </div>
                )}
                {t.status === 'open' && (
                  <div className="flex gap-2">
                    <input type="text" value={response} onChange={e => setResponse(e.target.value)}
                      placeholder="Enter response..." className="input flex-1 text-sm" />
                    <button onClick={handleRespond} disabled={!response.trim()}
                      className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white">
                      <SendIcon size={18} color="white" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}