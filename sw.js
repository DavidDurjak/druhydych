// Service worker: appka sa nainštaluje na plochu, načíta aj pri slabom signáli a prijíma push notifikácie
const CACHE = 'druhydych-v16';
const ASSETS = ['./', './index.html', './app.css', './app.js', './app2.js', './push.js', './foods.js', './scan.js', './scan.css', './today.js', './logedit.js', './mydata.js', './micro.js', './micro.css', './today.css', './progress.js', './progress.css', './health.js', './report.js', './v07.css', './v08.css', './ailog.js', './checkin.js', './admin.js', './goals.js', './workouts.js', './data.js', './calc.js', './food.js', './config.js', './manifest.json', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // Supabase, Open Food Facts, fonty: vždy zo siete
  e.respondWith(
    fetch(e.request).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});

// ---------- Push notifikácie ----------
self.addEventListener('push', e => {
  let d = { title: 'Druhý dych', body: '', url: '#/', tag: 'dd' };
  try { d = { ...d, ...e.data.json() }; } catch (_) { if (e.data) d.body = e.data.text(); }
  e.waitUntil(self.registration.showNotification(d.title, {
    body: d.body, tag: d.tag, renotify: true, icon: './icon-192.png', badge: './icon-192.png', data: { url: d.url },
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = new URL(e.notification.data?.url || '#/', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if (c.url.startsWith(self.registration.scope)) { c.navigate(target); return c.focus(); } }
    return self.clients.openWindow(target);
  }));
});
