import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

// Remove the previous Luna PWA cache and persisted session so the new app
// cannot resurrect the legacy account or the old interface on first launch.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(registration => registration.unregister()));
    const keys = await caches.keys();
    await Promise.all(keys.map(key => caches.delete(key)));
  });
}
try {
  Object.keys(localStorage).filter(key => /luna|supabase|zustand/i.test(key)).forEach(key => localStorage.removeItem(key));
  Object.keys(sessionStorage).forEach(key => sessionStorage.removeItem(key));
} catch {}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
