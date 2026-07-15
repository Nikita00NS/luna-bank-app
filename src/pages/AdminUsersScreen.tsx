import React, { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { haptic, formatFiat } from '../lib/utils';
import { ArrowLeftIcon, SearchIcon, ChevronRightIcon } from '../components/Icons';
import { toastSuccess, toastError } from '../lib/toast';

export default function AdminUsersScreen() {
  const { go, back } = useStore();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editBalance, setEditBalance] = useState('');

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false }).limit(100);
    setUsers(data || []);
  };

  const updateUser = async (id: number, updates: any) => {
    const { error } = await supabase.from('users').update(updates).eq('id', id);
    if (error) { toastError('Error', error.message); return; }
    toastSuccess('Updated');
    loadUsers();
  };

  const updateBalance = async (id: number) => {
    await updateUser(id, { balance_rub: Number(editBalance) });
    setEditBalance('');
  };

  const filtered = users.filter(u =>
    u.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    String(u.id).includes(search)
  );

  const getRoleColor = (role: string) => {
    if (role === 'owner') return 'var(--orange)';
    if (role === 'admin') return 'var(--accent)';
    return 'var(--text-tertiary)';
  };

  const getRoleBg = (role: string) => {
    if (role === 'owner') return 'var(--orange)/10';
    if (role === 'admin') return 'var(--accent)/10';
    return 'var(--bg-card)';
  };

  return (
    <div className="page safe-top">
      <div className="header">
        <button onClick={() => { haptic('light'); back(); }} className="back-btn"><ArrowLeftIcon size={18} color="var(--text)" /></button>
        <p className="header-title">Users</p>
        <span className="text-xs text-[var(--text-tertiary)]">{users.length}</span>
      </div>

      <div className="px-4 mt-2">
        <div className="relative">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, username or ID..." className="input pl-10 text-sm" />
          <SearchIcon size={16} color="var(--text-tertiary)" className="absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      <div className="px-4 mt-4 space-y-2">
        {filtered.map((u) => (
          <div key={u.id} className="card overflow-hidden">
            <button onClick={() => { haptic('light'); setSelectedUser(selectedUser?.id === u.id ? null : u); }}
              className="w-full p-3.5 flex items-center gap-3 text-left active:scale-[0.98] transition-all">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ background: getRoleBg(u.role), color: getRoleColor(u.role) }}>
                {u.first_name?.[0] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">{u.first_name} {u.last_name || ''}</p>
                  {u.role === 'owner' && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[var(--orange)/10] text-[var(--orange)]">OWNER</span>
                  )}
                  {u.role === 'admin' && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[var(--accent)/10] text-[var(--accent)]">ADMIN</span>
                  )}
                </div>
                <p className="text-[10px] text-[var(--text-tertiary)]">
                  @{u.username || 'no-username'} · ID: {u.id}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold mono text-sm">{u.balance_rub ? `${formatFiat(Number(u.balance_rub))}` : '0 ₽'}</p>
                <p className="text-[10px] text-[var(--text-tertiary)]">{u.subscription || 'free'}</p>
              </div>
            </button>

            {selectedUser?.id === u.id && (
              <div className="p-3.5 pt-0 border-t space-y-3" style={{ borderColor: 'var(--border)' }}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] block mb-1 text-[var(--text-tertiary)]">Role</label>
                    <select value={u.role} onChange={e => { haptic('light'); updateUser(u.id, { role: e.target.value }); }}
                      className="input text-xs">
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="owner">Owner</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] block mb-1 text-[var(--text-tertiary)]">Subscription</label>
                    <select value={u.subscription} onChange={e => { haptic('light'); updateUser(u.id, { subscription: e.target.value }); }}
                      className="input text-xs">
                      <option value="free">Free</option>
                      <option value="plus">Plus</option>
                      <option value="pro">Pro</option>
                      <option value="business">Business</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input type="number" value={editBalance} onChange={e => setEditBalance(e.target.value)}
                    placeholder="Balance RUB" className="input flex-1 text-xs" />
                  <button onClick={() => { haptic('light'); updateBalance(u.id); }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--green)] text-black">
                    Set
                  </button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { navigator.clipboard.writeText(String(u.id)); toastSuccess('ID copied'); haptic('light'); }}
                    className="flex-1 py-2 rounded-xl text-[10px] font-medium bg-[var(--bg-card)] text-[var(--text-secondary)]">
                    Copy ID
                  </button>
                  <button onClick={() => {
                    supabase.from('notifications').insert({
                      user_id: String(u.id),
                      title: 'Admin Notification',
                      message: 'Your account has been reviewed. Thank you for using Luna Wallet!',
                      type: 'system',
                      read: false
                    });
                    toastSuccess('Notification sent');
                    haptic('success');
                  }}
                    className="flex-1 py-2 rounded-xl text-[10px] font-medium bg-[var(--accent)] text-white">
                    Notify
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}