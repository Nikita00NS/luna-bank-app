import React, { useState } from 'react';
import { useStore } from '../lib/store';
import { haptic } from '../lib/utils';
import { SendIcon, DownloadIcon, SwapIcon, CreditCardIcon, BellIcon, PlusIcon, TrendingUpIcon } from '../components/Icons';

const words = ['anchor','apple','autumn','blue','candle','canvas','circle','coffee','crystal','dawn','drift','ember','forest','future','harbor','honest','island','linen','lunar','market','north','orbit','pearl','quiet','river','silver','solar','stone','summit','velvet','wave','winter'];
const assets = [
  { symbol:'BTC', name:'Bitcoin', amount:'0.0842', value:'$5,284.18', change:'+2.4%', color:'#f7931a' },
  { symbol:'ETH', name:'Ethereum', amount:'1.248', value:'$3,941.22', change:'+1.8%', color:'#8b8bff' },
  { symbol:'USDT', name:'Tether', amount:'2,400.00', value:'$2,400.00', change:'0.0%', color:'#26a17b' },
  { symbol:'TON', name:'Toncoin', amount:'184.20', value:'$1,220.04', change:'+4.1%', color:'#35aee2' },
];

function AssetIcon({symbol, color}:{symbol:string;color:string}) { return <span className="asset-icon" style={{background:color}}>{symbol === 'BTC' ? '₿' : symbol === 'ETH' ? '◆' : symbol.slice(0,1)}</span> }
export default function HomeScreen() {
  const { user, go, notifs } = useStore();
  const [showWallet, setShowWallet] = useState(false);
  const [mode, setMode] = useState<'create'|'import'>('create');
  const [phrase, setPhrase] = useState('');
  const [copied, setCopied] = useState(false);
  const mnemonic = Array.from({length:12}, (_,i) => words[(i*3+7)%words.length]).join(' ');
  const firstName = user?.first_name || 'Alex';
  const copy = () => { navigator.clipboard?.writeText(mnemonic); setCopied(true); setTimeout(()=>setCopied(false),1500); };
  return <main className="dashboard">
    <header className="topbar"><div><div className="eyebrow">PERSONAL ACCOUNT <span className="live-dot"/> VERIFIED</div><h1>Good morning, {firstName}</h1></div><button className="icon-button" onClick={()=>go('notifications')}><BellIcon size={19}/>{notifs.some(n=>!n.read)&&<i/>}</button></header>
    <section className="hero-card"><div className="eyebrow muted">TOTAL BALANCE <span className="eye">◉</span></div><div className="balance">$12,845<span>.44</span></div><div className="balance-meta"><span className="positive">↗ $428.16 (3.45%)</span><span>USD · Today</span></div><div className="hero-actions"><button onClick={()=>go('deposit')}><DownloadIcon size={17}/> Add money</button><button onClick={()=>go('transfer')}><SendIcon size={17}/> Send</button><button onClick={()=>go('swap')}><SwapIcon size={17}/> Swap</button></div></section>
    <div className="section-head"><h2>Your cards</h2><button onClick={()=>go('cards')}>View all <span>↗</span></button></div>
    <section className="cards-row"><button className="crypto-card" onClick={()=>go('cards')}><div className="card-top"><span className="brand">luna<span>•</span></span><span className="contactless">)))</span></div><div className="card-number">•••• &nbsp; 4821</div><div className="card-bottom"><span>VIRTUAL</span><span>VISA</span></div></button><button className="add-card" onClick={()=>go('cards')}><PlusIcon size={19}/><span>New card</span></button></section>
    <div className="section-head assets-head"><h2>Assets</h2><button onClick={()=>setShowWallet(true)} className="wallet-cta"><PlusIcon size={14}/> Connect wallet</button></div>
    <section className="asset-list">{assets.map(a=><button className="asset-row" key={a.symbol} onClick={()=>go('account-detail')}><AssetIcon symbol={a.symbol} color={a.color}/><span className="asset-name"><b>{a.symbol}</b><small>{a.name}</small></span><span className="asset-amount"><b>{a.amount}</b><small>{a.value}</small></span><span className="change">{a.change}</span><span className="chevron">›</span></button>)}</section>
    <div className="section-head recent-head"><h2>Recent activity</h2><button onClick={()=>go('history')}>See all <span>↗</span></button></div>
    <section className="activity"><div><span className="activity-icon down"><DownloadIcon size={16}/></span><span><b>Card payment</b><small>Today, 14:32 · Starbucks</small></span><strong>− $8.40</strong></div><div><span className="activity-icon up"><TrendingUpIcon size={16}/></span><span><b>Salary payment</b><small>Yesterday · Incoming</small></span><strong className="positive">+ $2,400.00</strong></div></section>
    {showWallet && <div className="modal-backdrop" onClick={()=>setShowWallet(false)}><div className="wallet-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setShowWallet(false)}>×</button><div className="modal-kicker">NON-CUSTODIAL WALLET</div><h2>{mode==='create'?'Your wallet, your keys.':'Restore your wallet'}</h2><p className="modal-copy">{mode==='create'?'Create a secure multi-chain wallet for BTC, ETH, TON and USDT.':'Enter your 12-word recovery phrase to access your assets.'}</p>{mode==='create'?<><div className="phrase-grid">{mnemonic.split(' ').map((w,i)=><span key={w}><i>{i+1}</i>{w}</span>)}</div><button className="outline-btn" onClick={copy}>{copied?'Copied':'Copy recovery phrase'}</button><button className="primary-btn" onClick={()=>setShowWallet(false)}>I saved my phrase</button><button className="text-btn" onClick={()=>setMode('import')}>I already have a wallet →</button></>:<><textarea value={phrase} onChange={e=>setPhrase(e.target.value)} placeholder="word1 word2 word3 ... word12"/><button className="primary-btn" disabled={phrase.trim().split(/\s+/).length!==12} onClick={()=>setShowWallet(false)}>Import wallet</button><button className="text-btn" onClick={()=>setMode('create')}>Create new wallet</button></>}</div></div>}
  </main>
}
