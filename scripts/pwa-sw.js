// Service worker do app web (iPhone). Modelo: o export-pwa.js troca __VERSION__ e
// __PRECACHE__ a cada build e grava o resultado em web/app/sw.js.
//
// - Na instalação, guarda todos os arquivos do app: depois disso ele abre sem internet.
// - A página (index.html) vem da internet quando dá, para pegar versões novas;
//   sem conexão, usa a cópia guardada.
// - Os outros arquivos têm o conteúdo no nome (index-abc123.js), então a cópia
//   guardada nunca fica velha.
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const CACHE = `pentecostal-${VERSION}`;
const APP_PAGE = new URL('./', self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  // Apaga o que foi guardado por versões anteriores do app.
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key.startsWith('pentecostal-') && key !== CACHE).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // O banco da Bíblia fica guardado pelo próprio SQLite; uma segunda cópia só ocuparia espaço.
  if (url.pathname.endsWith('.db')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(APP_PAGE, copy));
          }
          return response;
        })
        .catch(() => caches.match(APP_PAGE))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
    )
  );
});
