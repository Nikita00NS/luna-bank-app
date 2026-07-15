import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { shortAddress } from '../lib/ton';
import { haptic } from '../lib/utils';
import { getLang, setLang, type Lang } from '../lib/i18n';
import { WalletIcon, GlobeIcon, LockIcon, InfoIcon, ChevronRightIcon } from '../components/Icons';

export default function SettingsScreen() {
  const { go, tonWallet, tonWalletName, setTonWallet } = useStore();
  const [tonConnectUI] = useTonConnectUI();
  const [lang, setLangState] = useState(getLang());
  const [showLangPicker, setShowLangPicker] = useState(false);

  const disconnect = async () => { haptic('medium'); await tonConnectUI.disconnect(); setTonWallet(null); };

  const sections = [
    { title: 'Wallet', items: [
      { label: 'Connected Wallet', desc: tonWalletName || 'Not connected', icon: WalletIcon, action: () => tonWallet ? disconnect() : tonConnectUI.openModal() },
      { label: 'Seed Phrase', desc: 'Create / Import', icon: LockIcon, action: () => go('seed-phrase') },
    ]},
    { title: 'Preferences', items: [
      { label: 'Language', desc: lang === 'ru' ? 'Русский' : 'English', icon: GlobeIcon, action: () => setShowLangPicker(!showLangPicker) },
      { label: 'FAQ', desc: 'Frequently asked questions', icon: InfoIcon, action: () => go('faq') },
    ]},
  ];

  return (
    <div className="page safe-top">
      <div className="px-4 py-3"><p className="text-base font-semibold">Settings</p></div>

      {showLangPicker && (
        <div className="px-4 mb-2">
          <div className="bg-[var(--bg-card)] rounded-xl overflow-hidden">
            {(['ru', 'en'] as Lang[]).map(l => (
              <button key={l} onClick={() => { setLang(l); setLangState(l); setShowLangPicker(false); haptic('light'); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left ${lang === l ? 'bg-[var(--accent)]/10' : ''}`}>
                <span className="text-base">{l === 'ru' ? '🇷🇺' : '🇬🇧'}</span>
                <div className="flex-1"><p className="text-sm font-medium">{l === 'ru' ? 'Русский' : 'English'}</p></div>
                {lang === l && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>}
              </button>
            ))}
          </div>
        </div>
      )}

      {tonWallet && (
        <div className="px-4 mb-4">
          <div className="bg-[var(--bg-card)] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-[var(--green)]" /><span className="text-xs text-[var(--green)]">Connected</span>
            </div>
            <p className="text-xs font-mono text-[var(--text-secondary)]">{shortAddress(tonWallet, 8)}</p>
          </div>
        </div>
      )}

      {sections.map(s => (
        <div key={s.title} className="px-4 mb-4">
          <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2 px-1">{s.title}</p>
          <div className="bg-[var(--bg-card)] rounded-xl overflow-hidden">
            {s.items.map((item, i) => (
              <div key={item.label}>
                <button onClick={item.action} className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-[var(--bg-card-hover)] transition-all text-left">
                  <item.icon size={18} color="var(--text-secondary)" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.label}</p>
                    {item.desc && <p className="text-xs text-[var(--text-tertiary)]">{item.desc}</p>}
                  </div>
                  <ChevronRightIcon size={14} color="var(--text-tertiary)" />
                </button>
                {i < s.items.length - 1 && <div className="h-px bg-[var(--border)] mx-4" />}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="px-4 mt-8 mb-4 text-center">
        <p className="text-xs text-[var(--text-tertiary)]">Powered by Klikopolic Co.</p>
        <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Luna Wallet v2.0</p>
      </div>
    </div>
  );
}