// Rýchle preklikávanie: posledná podoba obrazovky sa ukáže hneď, čerstvé dáta ju za chvíľu prepíšu.
// Pri zápise (POST/PATCH/DELETE) sa pamäť zmaže, aby nikdy nezostali staré čísla po pridaní jedla.
import { ctx } from './app.js';

const app = document.getElementById('app'), root = document.documentElement;
const setHtml = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML').set;
const cache = new Map(), TTL = 5 * 60 * 1000;
let last = location.hash || '#/', raf = 0;
window.__fwSnapHits = 0;

const keyOf = () => {
  const s = ctx.state || {}, h = location.hash || '#/';
  if (!s.session || h.includes('?') || /onboarding|admin|spravy/.test(h)) return null;
  return `${s.session.user.id}|${h}|${s.date || ''}`;
};

window.addEventListener('hashchange', () => {
  const prev = last; last = location.hash || '#/';
  if (prev === last) return; // obnova tej istej obrazovky (po zápise): nič staré neukáž
  const k = keyOf(), hit = k && cache.get(k);
  if (!hit || Date.now() - hit.t > TTL) return;
  // až po router-i, ktorý si pri hashchange nastaví fw-loading (poradie listenerov nie je zaručené)
  setTimeout(() => {
    if (keyOf() !== k || !root.classList.contains('fw-loading')) return;
    root.classList.add('fw-snap');
    setHtml.call(app, hit.html);
    window.scrollTo(0, 0);
    window.__fwSnapHits++;
  }, 0);
});

new MutationObserver(() => {
  if (root.classList.contains('fw-loading')) return;
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => {
    const k = keyOf(); if (!k || root.classList.contains('fw-loading')) return;
    const html = app.innerHTML;
    if (!html.includes('<nav class="nav"') || html.includes('<canvas') || html.length > 500000) return;
    cache.set(k, { html, t: Date.now() });
    if (cache.size > 14) cache.delete(cache.keys().next().value);
  });
}).observe(root, { attributes: true, attributeFilter: ['class'] });

const f0 = window.fetch;
window.fetch = function (input, init) {
  const m = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
  if (m !== 'GET' && m !== 'HEAD') cache.clear();
  return f0.apply(this, arguments);
};
