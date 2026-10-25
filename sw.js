// Service worker: appka sa nainštaluje na plochu, načíta aj pri slabom signáli a prijíma push notifikácie
// v195: pri každom nasadení sa už nestáhova celých 5 MB. Jadro appky (malé) sa predcachuje s verziou, recepty (3,8 MB, 196 súborov)
// sa ukladajú do vlastnej trvalej cache pri prvom použití a obnovujú sa na pozadí.
const CACHE = 'fuelwind-v277';
const RCACHE = 'fuelwind-recipes';
const ASSETS = ['./', './index.html', './app.css', './app.js', './app2.js', './push.js', './foods.js', './scan.js', './scan.css', './today.js', './logedit.js', './mydata.js', './micro.js', './meals.js', './fasting.js', './fabpos.js', './micro.css', './suggest.js', './suggest.css', './buddy.js', './avatars.js', './buddy.css', './perf.css', './today.css', './progress.js', './progress.css', './progressx.css', './health.js', './report.js', './v07.css', './v08.css', './ailog.js', './checkin.js', './admin.js', './goals.js', './workouts.js', './physique.js', './dxcore.js', './dietcore.js', './diet.js', './glucose.js', './cards.js', './dxdash.js', './habits.js', './discover.js', './foodimg.js', './readiness.js', './news.js', './recap.js', './firstlog.js', './water.js', './machine.js', './quickadd.js', './speed.js', './boost.js', './workoutcard.js', './workoutauto.js', './trainfx.js', './foodsugg.js', './theme.js', './i18n.js', './authhero.js', './onboard.js', './pokrok2.js', './kouc2.js', './trainers.js', './voice.js', './menuscan.js', './funnel.js', './extra.js', './langsync.js', './track.js', './liftpro.js', './afterlog.js', './quickkcal.js', './coachmem.js', './underfed.js', './supers.js', './recipeimport.js', './polish.js', './ailang.js', './net.js', './labelscan.js', './todaydeck.js', './navfx.js', './trainflow.js', './authretry.js', './favs.js', './shopping.js', './sharecard.js', './welcome.js', './friends.js', './qr.js', './invite.js', './navblend.js', './hdr.js', './visual.js', './units.js', './tdee.js', './activity.js', './overloadlogic.js', './overload.js', './adherence.js', './kcalinfo.js', './adapt.js', './cal.js', './shopcart.js', './profil.js', './backbtn.js', './authfix.js', './zasady.html', './podmienky.html', './ptr.js', './searchux.js', './vpro.js', './jedlo2.js', './offline.js', './foodsheet.js', './foodfast.js', './cardart.js', './bodymap.js', './navglass.js', './badges.js', './progfiber.js', './searchfix.js', './data.js', './calc.js', './food.js', './config.js', './manifest.json', './icon.svg'];

const checked = new Map();
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== RCACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Supabase, Open Food Facts, fonty: vždy zo siete
  // Jadro je verzované číslom cache (CACHE). Recepty žijú v trvalej cache a obnovujú sa na pozadí, najviac raz za 30 minút na súbor.
  const isRec = /\/recipes\.[^/]*\.js$/.test(url.pathname) || url.pathname.endsWith('/recipes.js');
  e.respondWith(caches.open(isRec ? RCACHE : CACHE).then(async c => {
    const hit = (await c.match(req)) || (isRec ? await caches.match(req) : null);
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
    body: d.body, tag: d.tag, renotify: true, icon: 'https://uxzwqyjbzkcveoxsdqdv.supabase.co/functions/v1/app-icon', badge: 'https://uxzwqyjbzkcveoxsdqdv.supabase.co/functions/v1/app-icon?size=96', data: { url: d.url },
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
