// Service worker: appka sa nainštaluje na plochu, načíta aj pri slabom signáli a prijíma push notifikácie
const CACHE = 'fuelwind-v69';
const ASSETS = ['./', './index.html', './app.css', './app.js', './app2.js', './push.js', './foods.js', './scan.js', './scan.css', './today.js', './logedit.js', './mydata.js', './micro.js', './meals.js', './fasting.js', './fabpos.js', './micro.css', './suggest.js', './suggest.css', './buddy.js', './avatars.js', './buddy.css', './today.css', './progress.js', './progress.css', './health.js', './report.js', './v07.css', './v08.css', './ailog.js', './checkin.js', './admin.js', './goals.js', './workouts.js', './physique.js', './dxcore.js', './diet.js', './glucose.js', './cards.js', './dxdash.js', './habits.js', './discover.js', './foodimg.js', './readiness.js', './news.js', './recap.js', './favs.js', './shopping.js', './sharecard.js', './welcome.js', './friends.js', './ptr.js', './searchux.js', './navglass.js', './badges.js', './progfiber.js', './searchfix.js', './data.js', './calc.js', './food.js', './config.js', './manifest.json', './icon.svg'];

const checked = new Map();
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Supabase, Open Food Facts, fonty: vždy zo siete
  // Súbory sú verzované číslom cache (CACHE), takže po nasadení sa vymenia samé. Obnova na pozadí je len poistka a beží najviac raz za 30 minút na súbor,
  // inak by pri každom otvorení appky ďalších ~60 požiadaviek bojovalo o sieť s dátami.
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req);
    const key = url.pathname, now = Date.now();
    if (hit && now - (checked.get(key) || 0) < 30 * 60 * 1000) return hit;
    const net = fetch(req).then(res => { if (res && res.ok) { checked.set(key, Date.now()); c.put(req, res.clone()); } return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || (await caches.match('./index.html')) || Response.error();
  }));
});

// ---------- Push notifikácie ----------
self.addEventListener('push', e => {
  let d = { title: 'Fuelwind', body: '', url: '#/', tag: 'fw' };
  try { d = { ...d, ...e.data.json() }; } catch (_) { if (e.data) d.body = e.data.text(); }
  e.waitUntil(self.registration.showNotification(d.title, {
    body: d.body, tag: d.tag, renotify: true, icon: 'https://uxzwqyjbzkcveoxsdqdv.supabase.co/functions/v1/app-icon', badge: './icon-192.png', data: { url: d.url },
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
