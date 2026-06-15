import React from 'react';
import ReactDOM from 'react-dom/client';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import App from './App';
import { TON_MANIFEST_URL } from './lib/ton';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TonConnectUIProvider manifestUrl={TON_MANIFEST_URL}>
      <App />
    </TonConnectUIProvider>
  </React.StrictMode>
);
