import React from 'react';
import ReactDOM from 'react-dom/client';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import App from './App';
import { TON_MANIFEST_URL } from './lib/ton';
import './styles/index.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TonConnectUIProvider manifestUrl={TON_MANIFEST_URL} actionsConfiguration={{ twaReturnUrl: 'https://luna-wallet.app' }}>
      <App />
    </TonConnectUIProvider>
  </React.StrictMode>
);