import React, { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { haptic } from '../lib/utils';
import { ArrowLeftIcon, PlusIcon, CloseIcon } from '../components/Icons';
import { toastSuccess, toastError } from '../lib/toast';

export default function AdminServicesScreen() {
  const { go, back, events, setEvents } = useStore();
  const [tab, setTab] = useState<'events' | 'catalog'>('events');
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState<'maintenance' | 'update' | 'promo' | 'announcement'>('announcement');

  useEffect(() => { loadEvents(); }, []);

  const loadEvents = async () => {
    const { data } = await supabase.from('app_events').select('*').order('date', { ascending: false }).limit(50);
    if (data) setEvents(data);
  };

  const createEvent = async () => {
    if (!title.trim()) return;
    const { error } = await supabase.from('app_events').insert({
      title, description: desc, date: date || new Date().toISOString(), type, active: true,
    });
    if (error) { toastError('Error', error.message); return; }
    toastSuccess('Event created');
    loadEvents();
    setShowCreate(false);
    setTitle(''); setDesc(''); setDate('');
  };

  const toggleEvent = async (id: string, active: boolean) => {
    await supabase.from('app_events').update({ active }).eq('id', id);
    loadEvents();
  };

  const deleteEvent = async (id: string) => {
    await supabase.from('app_events').delete().eq('id', id);
    toastSuccess('Deleted');
    loadEvents();
  };

  return (
    <div className="page safe-top">
      <div className="header">
        <button onClick={() => { haptic('light'); back(); }} className="back-btn"><ArrowLeftIcon size={18} color="var(--text)" /></button>
        <p className="header-title">Services</p>
      </div>

      <div className="flex gap-1.5 px-4 mt-2">
        {(['events', 'catalog'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); haptic('light'); }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === t ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-card)] text-[var(--text-secondary)]'}`}>
            {t === 'events' ? 'Events' : 'Catalog'}
          </button>
        ))}
      </div>

      {tab === 'events' ? (
        <>
          {showCreate && (
            <div className="px-4 mt-4">
              <div className="card p-4 space-y-3">
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="Event title" className="input text-sm" />
                <textarea value={desc} onChange={e => setDesc(e.target.value)}
                  placeholder="Description (optional)" rows={2} className="input text-sm resize-none" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] block mb-1 text-[var(--text-tertiary)]">Date</label>
                    <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)}
                      className="input text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] block mb-1 text-[var(--text-tertiary)]">Type</label>
                    <select value={type} onChange={e => setType(e.target.value as any)}
                      className="input text-xs">
                      <option value="announcement">Announcement</option>
                      <option value="update">Update</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="promo">Promo</option>
                    </select>
                  </div>
                </div>
                <button onClick={createEvent} disabled={!title.trim()}
                  className="btn btn-primary w-full text-sm">Create</button>
              </div>
            </div>
          )}

          <div className="px-4 mt-4 space-y-2">
            {events.length === 0 ? (
              <div className="py-12 text-center">
                <p className="font-semibold">No events</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">Create your first event</p>
              </div>
            ) : events.map((e) => (
              <div key={e.id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                      style={{ background: e.type === 'maintenance' ? 'var(--orange)/10' : e.type === 'update' ? 'var(--accent)/10' : e.type === 'promo' ? 'var(--green)/10' : 'var(--text-tertiary)/10' }}>
                      <span style={{ color: e.type === 'maintenance' ? 'var(--orange)' : e.type === 'update' ? 'var(--accent)' : e.type === 'promo' ? 'var(--green)' : 'var(--text-tertiary)' }}>
                        {e.type === 'maintenance' ? '⚙' : e.type === 'update' ? '⟳' : e.type === 'promo' ? '★' : '●'}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{e.title}</p>
                      <p className="text-[10px] text-[var(--text-tertiary)]">
                        {new Date(e.date).toLocaleDateString('en-US')} · {e.type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { haptic('light'); toggleEvent(e.id, !e.active); }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-medium ${e.active ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}
                      style={{ background: e.active ? 'var(--green)/10' : 'var(--red)/10' }}>
                      {e.active ? 'On' : 'Off'}
                    </button>
                    <button onClick={() => { haptic('light'); deleteEvent(e.id); }}
                      className="p-1.5 rounded-lg" style={{ background: 'var(--red)/10' }}>
                      <CloseIcon size={12} color="var(--red)" />
                    </button>
                  </div>
                </div>
                {e.description && (
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{e.description}</p>
                )}
              </div>
            ))}
          </div>

          <div className="px-4 mt-4">
            <button onClick={() => { setShowCreate(!showCreate); haptic('light'); }}
              className="btn btn-primary w-full">
              {showCreate ? 'Cancel' : 'Create Event'}
            </button>
          </div>
        </>
      ) : (
        <div className="px-4 mt-4">
          <div className="card p-6 text-center">
            <p className="font-semibold mb-1">Service Catalog</p>
            <p className="text-sm text-[var(--text-tertiary)] mb-4">
              22 services across 6 categories. Managed via Supabase Dashboard.
            </p>
            <button onClick={() => window.open('https://supabase.com/dashboard/project/lffdzsbqnrjmhdneolrh', '_blank')}
              className="btn btn-primary w-full max-w-[300px]">
              Open Supabase
            </button>
          </div>
        </div>
      )}
    </div>
  );
}