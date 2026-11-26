// Service worker: guarda la app en el celular para que abra sin internet
const VERSION = 'rh-432af2a5';
const APP = ['./', './index.html', './config.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable.png', './apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(APP)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== 'rh-fuentes').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Intenta internet un rato corto; si no hay, usa lo guardado
function redPrimero(req, ms) {
  return new Promise(res => {
    let listo = false;
    const usarCache = () => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html'));
    const t = setTimeout(() => usarCache().then(r => { if (r && !listo) { listo = true; res(r); } }), ms);
    fetch(req).then(r => {
      if (r && r.ok) { const c = r.clone(); caches.open(VERSION).then(x => x.put(req, c)); }
      if (!listo) { listo = true; clearTimeout(t); res(r); }
    }).catch(() => usarCache().then(r => { if (!listo) { listo = true; clearTimeout(t); res(r || Response.error()); } }));
  });
}
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;                                   // envíos a la API: siempre por internet
  if (/script\.google(usercontent)?\.com$/.test(url.hostname) || url.hostname.endsWith('drive.google.com') || url.hostname.endsWith('docs.google.com')) return;
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {        // tipografías: guardadas para siempre
    e.respondWith(caches.open('rh-fuentes').then(c => c.match(req).then(r => r || fetch(req).then(n => { c.put(req, n.clone()); return n; }))));
    return;
  }
  if (url.origin === location.origin) e.respondWith(redPrimero(req, req.mode === 'navigate' ? 3000 : 2500));
});
