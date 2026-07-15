import React from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { haptic } from '../lib/utils';
import { ArrowLeftIcon } from '../components/Icons';
import { toastSuccess } from '../lib/toast';

const SUBSCRIPTION_PLANS = [
  { id: 'free', name: 'Free', price: 0, commission: 0.5, cashback: 0, support: 'Chat' },
  { id: 'plus', name: 'Plus', price: 4.99, commission: 0.3, cashback: 1, support: 'Priority' },
  { id: 'pro', name: 'Pro', price: 14.99, commission: 0.1, cashback: 2.5, support: 'VIP 24/7' },
  { id: 'business', name: 'Business', price: 49.99, commission: 0, cashback: 5, support: 'Personal Manager' },
];

export default function AdminSettingsScreen() {
  const { go, back, maintenanceMode, setMaintenanceMode, systemCommission, setSystemCommission } = useStore();

  const toggleMaintenance = async () => {
    const newVal = !maintenanceMode;
    setMaintenanceMode(newVal);
    await supabase.from('app_settings').upsert({ key: 'maintenance_mode', value: JSON.stringify(newVal), updated_at: new Date().toISOString() });
    toastSuccess(newVal ? 'Maintenance mode enabled' : 'Maintenance mode disabled');
    haptic('medium');
  };

  const updateCommission = async (val: number) => {
    setSystemCommission(val);
    await supabase.from('app_settings').upsert({ key: 'system_commission', value: JSON.stringify(val), updated_at: new Date().toISOString() });
    toastSuccess(`Commission: ${(val * 100).toFixed(1)}%`);
    haptic('light');
  };

  return (
    <div className="page safe-top">
      <div className="header">
        <button onClick={() => { haptic('light'); back(); }} className="back-btn"><ArrowLeftIcon size={18} color="var(--text)" /></button>
        <p className="header-title">Settings</p>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Maintenance Mode */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-semibold text-sm">Maintenance Mode</p>
              <p className="text-[11px] text-[var(--text-tertiary)]">
                {maintenanceMode ? 'App unavailable for users' : 'App running normally'}
              </p>
            </div>
            <button onClick={toggleMaintenance}
              className="w-14 h-7 rounded-full relative transition-all"
              style={{ background: maintenanceMode ? 'var(--red)' : 'var(--bg-card)' }}>
              <div className={`w-5 h-5 rounded-full bg-[var(--text)] absolute top-1 transition-all ${maintenanceMode ? 'left-8' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {/* Commission */}
        <div className="card p-4">
          <p className="font-semibold text-sm mb-3">System Commission</p>
          <p className="text-[11px] text-[var(--text-tertiary)] mb-3">
            Current: {(systemCommission * 100).toFixed(1)}%
          </p>
          <div className="flex gap-2">
            {[0.1, 0.3, 0.5, 0.8, 1.0].map(v => (
              <button key={v} onClick={() => updateCommission(v / 100)}
                className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${systemCommission === v / 100 ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-card)] text-[var(--text-secondary)]'}`}>
                {v}%
              </button>
            ))}
          </div>
        </div>

        {/* Subscription Plans */}
        <div className="card p-4">
          <p className="font-semibold text-sm mb-3">Subscription Plans</p>
          <div className="space-y-2">
            {SUBSCRIPTION_PLANS.map(p => (
              <div key={p.id} className="p-3 rounded-xl bg-[var(--bg-surface)]">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: p.id === 'free' ? 'var(--text-tertiary)' : p.id === 'plus' ? 'var(--accent)' : p.id === 'pro' ? 'var(--green)' : 'var(--orange)' }} />
                    <p className="font-semibold text-sm">{p.name}</p>
                  </div>
                  <p className="font-bold">{p.price === 0 ? 'Free' : `$${p.price}/mo`}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px] text-[var(--text-tertiary)]">
                  <span>Commission: {p.commission}%</span>
                  <span>Cashback: {p.cashback}%</span>
                  <span>Support: {p.support}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Service Fee */}
        <div className="card p-4">
          <p className="font-semibold text-sm mb-2">Service Commission</p>
          <p className="text-[11px] text-[var(--text-tertiary)] mb-3">
            5% commission on foreign service payments
          </p>
          <div className="p-3 rounded-xl bg-[var(--orange)/10]">
            <p className="text-xs font-medium text-[var(--orange)]">
              Revenue per purchase: 5% of amount
            </p>
          </div>
        </div>

        {/* System Info */}
        <div className="card p-4">
          <p className="font-semibold text-sm mb-2">System Info</p>
          <div className="space-y-1 text-xs text-[var(--text-tertiary)]">
            <div className="flex justify-between"><span>Version</span><span className="text-[var(--text)]">v2.0.0</span></div>
            <div className="flex justify-between"><span>Network</span><span className="text-[var(--text)]">TON Blockchain</span></div>
            <div className="flex justify-between"><span>Supabase</span><span className="text-[var(--text)]">lffdzsbqnrjmhdneolrh</span></div>
            <div className="flex justify-between"><span>Owner ID</span><span className="text-[var(--text)]">7320418026</span></div>
          </div>
        </div>
      </div>

      <div className="px-4 mt-8 mb-4 text-center">
        <p className="text-xs text-[var(--text-tertiary)]">Powered by Klikopolic Co.</p>
        <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Luna Wallet v2.0</p>
      </div>
    </div>
  );
}