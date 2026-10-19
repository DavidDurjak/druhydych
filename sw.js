// Service worker: appka sa nainštaluje na plochu, načíta aj pri slabom signáli a prijíma push notifikácie
const CACHE = 'fuelwind-v173';
const ASSETS = ['./', './index.html', './app.css', './app.js', './app2.js', './push.js', './foods.js', './scan.js', './scan.css', './today.js', './logedit.js', './mydata.js', './micro.js', './meals.js', './fasting.js', './fabpos.js', './micro.css', './suggest.js', './suggest.css', './buddy.js', './avatars.js', './buddy.css', './today.css', './progress.js', './progress.css', './progressx.css', './health.js', './report.js', './v07.css', './v08.css', './ailog.js', './checkin.js', './admin.js', './goals.js', './workouts.js', './physique.js', './dxcore.js', './diet.js', './glucose.js', './cards.js', './dxdash.js', './habits.js', './discover.js', './foodimg.js', './readiness.js', './news.js', './recap.js', './firstlog.js', './water.js', './machine.js', './quickadd.js', './speed.js', './boost.js', './workoutcard.js', './workoutauto.js', './trainfx.js', './foodsugg.js', './theme.js', './i18n.js', './authhero.js', './polish.js', './ailang.js', './net.js', './labelscan.js', './todaydeck.js', './navfx.js', './trainflow.js', './authretry.js', './favs.js', './shopping.js', './sharecard.js', './welcome.js', './friends.js', './qr.js', './invite.js', './navblend.js', './hdr.js', './cal.js', './shopcart.js', './profil.js', './backbtn.js', './authfix.js', './zasady.html', './podmienky.html', './ptr.js', './searchux.js', './vpro.js', './offline.js', './foodsheet.js', './recipes.js', './recipes.data.js', './recipes.all.js', './recipes.ing.js', './recipes.d1.js', './recipes.d2.js', './recipes.d3.js', './recipes.d4.js', './recipes.d5.js', './recipes.d6.js', './recipes.d7.js', './recipes.d8.js', './recipes.d9.js', './recipes.d10.js', './recipes.d11.js', './recipes.d12.js', './recipes.d13.js', './recipes.d14.js', './recipes.d15.js', './recipes.d16.js', './recipes.d17.js', './recipes.d18.js', './recipes.d19.js', './recipes.d20.js', './recipes.d21.js', './recipes.d22.js', './recipes.d23.js', './recipes.d24.js', './recipes.d25.js', './recipes.d26.js', './recipes.d27.js', './recipes.d28.js', './recipes.d29.js', './recipes.d30.js', './recipes.d31.js', './recipes.d32.js', './recipes.d33.js', './recipes.d34.js', './recipes.d35.js', './recipes.d36.js', './recipes.d37.js', './recipes.d38.js', './recipes.d39.js', './recipes.d40.js', './recipes.d41.js', './recipes.d42.js', './recipes.d43.js', './recipes.d44.js', './recipes.d45.js', './recipes.d46.js', './recipes.d47.js', './recipes.d48.js', './recipes.d49.js', './recipes.d50.js', './recipes.d51.js', './recipes.d52.js', './recipes.d53.js', './recipes.d54.js', './recipes.d55.js', './recipes.d56.js', './recipes.d57.js', './recipes.d58.js', './recipes.d59.js', './recipes.d60.js', './recipes.d61.js', './recipes.d62.js', './recipes.d63.js', './recipes.d64.js', './recipes.d65.js', './recipes.d66.js', './recipes.d67.js', './recipes.d68.js', './recipes.d69.js', './recipes.d70.js', './recipes.d71.js', './recipes.d72.js', './recipes.d73.js', './recipes.d74.js', './recipes.d75.js', './recipes.d76.js', './recipes.d77.js', './recipes.d78.js', './recipes.d79.js', './recipes.d80.js', './recipes.d81.js', './recipes.d82.js', './recipes.d83.js', './recipes.d84.js', './recipes.d85.js', './recipes.d86.js', './recipes.d87.js', './recipes.d88.js', './recipes.d89.js', './recipes.d90.js', './recipes.d91.js', './recipes.d92.js', './recipes.d93.js', './recipes.d94.js', './recipes.d95.js', './recipes.d96.js', './recipes.d97.js', './recipes.d98.js', './recipes.d99.js', './recipes.d100.js', './recipes.d101.js', './recipes.d102.js', './recipes.d103.js', './recipes.d104.js', './recipes.d105.js', './recipes.d106.js', './recipes.d107.js', './recipes.d108.js', './recipes.d109.js', './recipes.d110.js', './recipes.d111.js', './recipes.d112.js', './recipes.d113.js', './recipes.d114.js', './recipes.d115.js', './recipes.d116.js', './recipes.d117.js',
  './recipes.d118.js',
  './recipes.d119.js',
  './recipes.d120.js',
  './recipes.d121.js',
  './recipes.d122.js',
  './recipes.d123.js',
  './recipes.d124.js',
  './recipes.d125.js',
  './recipes.d126.js',
  './recipes.d127.js',
  './recipes.d128.js',
  './recipes.d129.js',
  './recipes.d130.js',
  './recipes.d131.js',
  './recipes.d132.js',
  './recipes.d133.js',
  './recipes.d134.js',
  './recipes.d135.js',
  './recipes.d136.js',
  './recipes.d137.js',
  './recipes.d138.js',
  './recipes.d139.js',
  './recipes.d140.js',
  './recipes.d141.js',
  './recipes.d142.js',
  './recipes.d143.js',
  './recipes.d144.js',
  './recipes.d145.js',
  './recipes.d146.js',
  './recipes.d147.js',
  './recipes.d148.js',
  './recipes.d149.js',
  './recipes.d150.js',
  './recipes.d151.js',
  './recipes.d152.js', './recipes.photos.js', './navglass.js', './badges.js', './progfiber.js', './searchfix.js', './data.js', './calc.js', './food.js', './config.js', './manifest.json', './icon.svg'];

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
