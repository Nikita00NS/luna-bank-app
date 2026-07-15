import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { haptic } from '../lib/utils';
import { ArrowLeftIcon } from '../components/Icons';

const FAQ = [
  { q: 'What is Luna Wallet?', a: 'Luna Wallet is a non-custodial crypto wallet built on the TON blockchain. You can send, receive, swap, and manage your crypto assets securely.' },
  { q: 'How do I connect my wallet?', a: 'Tap "Connect Wallet" on the home screen. Choose your preferred wallet app (Tonkeeper, Tonhub, etc.) and scan the QR code or approve the connection.' },
  { q: 'What is a seed phrase?', a: 'A 12-word seed phrase is the master key to your wallet. It gives you full access to your funds. Never share it with anyone. Store it offline in a secure place.' },
  { q: 'How do I send TON?', a: 'Go to Send, enter the recipient address, enter the amount, review the details, and confirm. Your wallet app will ask you to approve the transaction.' },
  { q: 'How long do transactions take?', a: 'TON blockchain transactions are confirmed in 1-5 seconds. It\'s one of the fastest blockchains in the world.' },
  { q: 'What can I do with my wallet?', a: 'Send and receive TON and USDT, swap tokens via DEX, trade P2P, buy crypto services, view NFTs, and more.' },
  { q: 'What are the fees?', a: 'Network fee is ~0.005 TON per transaction. USDT transfers also require a small TON fee for processing. No hidden Luna Wallet fees.' },
  { q: 'How do I buy services?', a: 'Go to the Services tab, select a service (Netflix, ChatGPT, VPN, etc.), choose a plan, and pay with USDT or TON. You\'ll receive an activation code instantly.' },
  { q: 'Is my wallet safe?', a: 'Yes. Your private keys never leave your wallet app. We use TON Connect, the most secure connection protocol for TON dApps.' },
  { q: 'How do I get support?', a: 'Open a support ticket in the app. Business subscribers get 24/7 personal manager support.' },
  { q: 'How do I import my wallet?', a: 'Go to Settings > Seed Phrase > Import. Enter your 12 words in order. Your wallet will be restored from the blockchain.' },
  { q: 'What is an NFT?', a: 'NFTs are unique digital assets on the blockchain. You can view your NFTs in the NFT Gallery section. Supported collections from GetGems, Fragment, and more.' },
  { q: 'Can I swap tokens?', a: 'Yes. Go to Swap, select the token you want to trade and the token you want to receive. We aggregate rates from STON.fi and DeDust to find the best price.' },
  { q: 'What is P2P trading?', a: 'P2P (peer-to-peer) trading lets you buy and sell crypto directly with other users. Pay with bank transfer or cash. No middleman.' },
  { q: 'What is Klikopolic Co.?', a: 'Klikopolic Co. is the company behind Luna Wallet. We build secure crypto products for the TON ecosystem.' },
];

export default function FAQScreen() {
  const { go, back } = useStore();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="page safe-top">
      <div className="header">
        <button onClick={() => { haptic('light'); back(); }} className="back-btn"><ArrowLeftIcon size={18} color="var(--text)" /></button>
        <p className="header-title">FAQ</p>
      </div>
      <div className="px-4 mt-4 space-y-1">
        {FAQ.map((item, i) => (
          <div key={i} className="card overflow-hidden">
            <button onClick={() => { setOpen(open === i ? null : i); haptic('light'); }}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left active:bg-[var(--bg-card-hover)] transition-all">
              <p className="text-sm font-medium flex-1 pr-4">{item.q}</p>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className={`transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {open === i && (
              <div className="px-4 pb-4">
                <div className="divider mb-3" />
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="px-4 mt-8 mb-4 text-center">
        <p className="text-xs text-[var(--text-tertiary)]">Powered by Klikopolic Co.</p>
        <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Luna Wallet v2.0</p>
      </div>
    </div>
  );
}
