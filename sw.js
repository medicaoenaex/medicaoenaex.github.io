// Medição Enaex: guarda o app e TODAS as bibliotecas no cache para abrir sem sinal no campo.
// Aumente a versão sempre que publicar um index.html novo.
const CACHE = 'croqui-real-v7';
const CORE = [
  './', './index.html', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png',
  './lib/pdf.min.js', './lib/pdf.worker.min.js', './lib/jspdf.umd.min.js', './lib/xlsx.full.min.js', './campo.html'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
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
  e.respondWith(caches.open(CACHE).then(async cache => {
    let hit = await cache.match(req, { ignoreSearch: true });
    // Abrir o app sem internet por qualquer endereço do site cai no index.html
    if (!hit && req.mode === 'navigate') hit = await cache.match('./index.html');
    const net = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    }).catch(() => hit || Response.error());
    return hit || net;
  }));
});
