// Medição Enaex: guarda o app e TODAS as bibliotecas no cache para abrir sem sinal no campo.
// Aumente a versão sempre que publicar um index.html novo.
const CACHE = 'croqui-real-v31';
const CORE = [
  './', './index.html', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png',
  './lib/pdf.min.js', './lib/pdf.worker.min.js', './lib/jspdf.umd.min.js', './lib/xlsx.full.min.js', './campo.html', './campo2.html', './campo3.html', './temporizacao.html', './tz-manifest.webmanifest', './tz-icon-192.png', './tz-icon-512.png', './tz-icon-maskable-512.png', './tz-apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Responde do cache na hora e atualiza o cache pela rede em segundo plano.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;
  // Carregamento de Campo: rede primeiro (abre sempre a versão publicada), cache só sem sinal
  const u = new URL(req.url);
  if (req.mode === 'navigate' && u.origin === self.location.origin && /\/carregamento[^/]*\.html$/.test(u.pathname)) {
    e.respondWith(caches.open(CACHE).then(async cache => {
      const key = u.origin + u.pathname;
      try {
        const res = await Promise.race([fetch(key, { cache: 'no-cache' }), new Promise((_, no) => setTimeout(() => no(new Error('tempo')), 6000))]);
        if (res && res.ok) { cache.put(key, res.clone()); return res; }
        throw new Error('http');
      } catch (err) {
        return (await cache.match(key)) || (await cache.match(req, { ignoreSearch: true })) || (await cache.match('./index.html')) || Response.error();
      }
    }));
    return;
  }
  e.respondWith(caches.open(CACHE).then(async cache => {
    let hit = await cache.match(req, { ignoreSearch: true });
    // Abrir o app sem internet por qualquer endereço do site cai no index.html
    if (!hit && req.mode === 'navigate') hit = await cache.match('./index.html');
    const net = fetch(req, req.url.startsWith(self.location.origin) ? { cache: 'no-cache' } : {}).then(res => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    }).catch(() => hit || Response.error());
    return hit || net;
  }));
});
