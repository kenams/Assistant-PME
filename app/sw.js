const CACHE_VERSION = 'v1';
const STATIC_CACHE  = 'static-' + CACHE_VERSION;
const DYNAMIC_CACHE = 'dynamic-' + CACHE_VERSION;
const OFFLINE_DB    = 'offline-tickets';

const STATIC_ASSETS = [
  '/app/user/',
  '/app/login/',
  '/app/styles.css',
  '/app/app.js',
  '/app/i18n.js',
  '/app/manifest.json',
  '/app/offline.html',
  '/app/favicon.svg',
  '/app/icons/icon-192.svg',
  '/app/icons/icon-512.svg',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
];

// ── Install : précache les assets statiques ──────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(STATIC_CACHE)
      .then(c => c.addAll(STATIC_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// ── Activate : purge les vieux caches ───────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
        .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch : stratégie hybride ────────────────────────────────
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET et les extensions navigateur
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // API calls : network-first, pas de cache
  const isApi = ['/auth/', '/chat/', '/tickets/', '/kb/', '/users/', '/admin/', '/org/', '/health']
    .some(p => url.pathname.startsWith(p));
  if (isApi) return;

  // Assets statiques : cache-first
  const isStatic = ['/app/styles.css', '/app/app.js', '/app/i18n.js', '/app/favicon', '/app/icons/', '/app/manifest']
    .some(p => url.pathname.startsWith(p) || url.pathname.includes(p));

  if (isStatic) {
    e.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(resp => {
        const clone = resp.clone();
        caches.open(STATIC_CACHE).then(c => c.put(request, clone));
        return resp;
      }))
    );
    return;
  }

  // Pages HTML : network-first avec fallback offline
  e.respondWith(
    fetch(request)
      .then(resp => {
        const clone = resp.clone();
        caches.open(DYNAMIC_CACHE).then(c => c.put(request, clone));
        return resp;
      })
      .catch(() =>
        caches.match(request)
          .then(cached => cached || caches.match('/app/offline.html'))
      )
  );
});

// ── Background Sync : soumettre tickets offline ──────────────
self.addEventListener('sync', e => {
  if (e.tag === 'sync-tickets') {
    e.waitUntil(syncOfflineTickets());
  }
});

async function syncOfflineTickets() {
  const db = await openOfflineDB();
  const tickets = await getAllOfflineTickets(db);
  for (const ticket of tickets) {
    try {
      const resp = await fetch('/tickets/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + ticket.token
        },
        body: JSON.stringify(ticket.data)
      });
      if (resp.ok) {
        await deleteOfflineTicket(db, ticket.id);
        self.registration.showNotification('Ticket envoyé ✓', {
          body: ticket.data.title || 'Votre ticket a été soumis',
          icon: '/app/icons/icon-192.svg',
          badge: '/app/icons/icon-192.svg'
        });
      }
    } catch (err) {
      // réseau toujours indisponible — on réessaiera
    }
  }
}

// ── IndexedDB helpers ────────────────────────────────────────
function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OFFLINE_DB, 1);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore('tickets', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

function getAllOfflineTickets(db) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction('tickets', 'readonly');
    const req = tx.objectStore('tickets').getAll();
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

function deleteOfflineTicket(db, id) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction('tickets', 'readwrite');
    const req = tx.objectStore('tickets').delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
  });
}

// ── Message handler : sauvegarde ticket offline ──────────────
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SAVE_OFFLINE_TICKET') {
    openOfflineDB().then(db => {
      const tx = db.transaction('tickets', 'readwrite');
      tx.objectStore('tickets').add(e.data.payload);
    });
  }
});
