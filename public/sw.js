const CACHE_NAME = 'luna-wallet-v2';
const STATIC_CACHE = 'luna-wallet-static-v2';
const API_CACHE = 'luna-wallet-api-v2';

const STATIC_URLS = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_URLS)),
      self.skipWaiting(),
    ])
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter(
              (k) => k !== STATIC_CACHE && k !== API_CACHE && k !== CACHE_NAME
            )
            .map((k) => caches.delete(k))
        )
      ),
      self.clients.claim(),
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // TON API calls — network first, cache fallback
  if (url.hostname === 'toncenter.com' || url.hostname === 'tonapi.io') {
    event.respondWith(networkFirstWithTimeout(request, 5000));
    return;
  }

  // CoinGecko API — stale while revalidate
  if (url.hostname === 'api.coingecko.com') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Navigation — serve index.html from cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const cache = response.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, cache));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static assets — cache first
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font' ||
    request.destination === 'image'
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Default: network first
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

async function cacheFirst(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = response.clone();
      caches.open(STATIC_CACHE).then((c) => c.put(request, cache));
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirstWithTimeout(
  request: Request,
  timeout: number
): Promise<Response> {
  const cached = await caches.match(request);
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), timeout)
      ),
    ]);
    if (response.ok) {
      const cache = response.clone();
      caches.open(API_CACHE).then((c) => c.put(request, cache));
    }
    return response;
  } catch {
    if (cached) return cached;
    return new Response(JSON.stringify({ ok: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function staleWhileRevalidate(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        const cache = response.clone();
        caches.open(API_CACHE).then((c) => c.put(request, cache));
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const options = {
      body: data.message || '',
      icon: '/logo.png',
      badge: '/logo.png',
      vibrate: [200, 100, 200],
      data: { url: data.url || '/' },
    };
    event.waitUntil(
      self.registration.showNotification(
        data.title || 'Luna Wallet',
        options
      )
    );
  } catch {}
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        if (clients.length > 0) {
          clients[0].focus();
          clients[0].navigate(url);
        } else {
          self.clients.openWindow(url);
        }
      })
  );
});