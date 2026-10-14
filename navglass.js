// Spodná lišta v štýle „tekuté sklo“: plávajúce matná kapsúla, posuvná bublina pod aktívnou záložkou
// a poskúpaní prstom po lište (podržíš a ťaháš, pustíš na záložke a otvorí sa). Ťuknutie funguje ako doteraz.
const CSS = `
:root{--nav-h:78px}
.nav{left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom) + 8px);height:60px;padding:4px;border-radius:32px;align-items:stretch;justify-content:stretch;
  background:linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,.04)),rgba(24,28,34,.52);
  -webkit-backdrop-filter:blur(14px) saturate(160%);backdrop-filter:blur(14px) saturate(160%);transform:translateZ(0);
  border:1px solid rgba(255,255,255,.13);box-shadow:0 14px 34px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.18),inset 0 -1px 0 rgba(255,255,255,.04);
  touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;max-width:560px;margin:0 auto}
.nav a{position:relative;z-index:1;justify-content:center;gap:2px;padding-top:0;transition:color .18s,transform .18s}
.nav a .ic{width:auto;height:26px;background:none!important;transition:transform .2s cubic-bezier(.3,1.5,.5,1)}
.nav a.on{color:var(--accent)}
.nav a.on .fl{fill:currentColor;fill-opacity:.2}
.nav a.hot{color:#fff}.nav a.hot .ic{transform:scale(1.14)}
.nav a.on.hot{color:var(--accent)}
.nav-lens{position:absolute;z-index:0;top:4px;bottom:4px;left:0;border-radius:28px;pointer-events:none;
  background:linear-gradient(180deg,rgba(255,255,255,.20),rgba(255,255,255,.07));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.35),inset 0 0 0 1px rgba(255,255,255,.10),0 4px 14px rgba(0,0,0,.28);
  transition:transform .42s cubic-bezier(.3,1.35,.5,1),width .3s ease}
.nav.drag .nav-lens{transition:none;transform-origin:50% 50%}
.nav.drag .nav-lens::after{content:'';position:absolute;inset:0;border-radius:inherit;box-shadow:0 0 0 1px rgba(124,255,178,.25)}
@media (prefers-reduced-motion:reduce){.nav-lens{transition:none}}
`;
const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

const RING = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path class="fl" d="M13.4 2.6c.3 2.6 2.1 3.9 3.5 5.9 1.5 2.1 2.1 4.2 1.6 6.4-.7 3.1-3.4 5.2-6.5 5.2-3.3 0-5.9-2.4-5.9-5.6 0-2 .9-3.5 2.2-4.8.2 1.1.8 1.9 1.7 2.3-.4-2.9.5-5.9 3.4-11.4z"/><path d="M10.6 19.6c-1.4-.4-2.2-1.5-2.2-2.9 0-1.1.6-2 1.5-2.8.3.8.8 1.3 1.5 1.5.8.7 1.3 1.6 1.3 2.5 0 .8-.6 1.4-2.1 1.7z" stroke-width="1.5"/></svg>';
let lastIdx = null, drag = null, dragEnd = 0;

const items = nav => [...nav.querySelectorAll('a')];
const geo = nav => {
  const r = nav.getBoundingClientRect(), as = items(nav);
  const a0 = as[0].getBoundingClientRect(), w = a0.width;
  return { r, w, left0: a0.left - r.left - nav.clientLeft, cl: nav.clientLeft, n: as.length };
};
function place(nav, idx, anim = true) {
  const lens = nav.querySelector('.nav-lens'); if (!lens) return;
  const g = geo(nav);
  lens.style.width = g.w + 'px';
  if (!anim) { lens.style.transition = 'none'; }
  lens.style.transform = `translateX(${g.left0 + idx * g.w}px)`;
  if (!anim) { void lens.offsetWidth; lens.style.transition = ''; }
}
function setup(nav) {
  if (nav.__g) return; nav.__g = 1;
  const as = items(nav); if (!as.length) return;
  const home = nav.querySelector('a[href="#/"] .ic'); if (home) home.innerHTML = RING;
  const lens = document.createElement('i'); lens.className = 'nav-lens'; nav.prepend(lens);
  const idx = Math.max(0, as.findIndex(a => a.classList.contains('on')));
  // lišta sa pri prepnutí obrazovky vykreslí nanovo: bublina vyjde z predošlej záložky a plynulo sa presunie
  place(nav, lastIdx == null ? idx : lastIdx, false);
  requestAnimationFrame(() => requestAnimationFrame(() => place(nav, idx, true)));
  lastIdx = idx;
}
const scan = n => { if (n.nodeType !== 1) return; if (n.matches?.('.nav')) setup(n); n.querySelectorAll?.('.nav').forEach(setup); };
new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(scan))).observe(document.documentElement, { childList: true, subtree: true });
document.querySelectorAll('.nav').forEach(setup);
window.addEventListener('resize', () => document.querySelectorAll('.nav').forEach(n => { const i = items(n).findIndex(a => a.classList.contains('on')); if (i >= 0) place(n, i, false); }));

const idxAt = (nav, x) => { const g = geo(nav); return Math.max(0, Math.min(g.n - 1, Math.floor((x - g.r.left - g.cl - g.left0) / g.w))); };

document.addEventListener('pointerdown', e => {
  const nav = e.target.closest?.('.nav'); if (!nav || e.button > 0) return;
  drag = { nav, x: e.clientX, y: e.clientY, id: e.pointerId, on: false, idx: null };
}, { passive: true });
document.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.id) return;
  const { nav } = drag;
  if (!drag.on) {
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) <= 14) return;
    drag.on = true; nav.classList.add('drag');
    try { nav.setPointerCapture(e.pointerId); } catch (_) { }
  }
  const g = geo(nav), lens = nav.querySelector('.nav-lens');
  const x = Math.max(g.r.left + g.left0 + g.w / 2, Math.min(g.r.right - g.left0 - g.w / 2, e.clientX));
  lens.style.transform = `translateX(${x - g.r.left - g.cl - g.w / 2}px) scale(1.1)`;
  const i = idxAt(nav, e.clientX);
  if (i !== drag.idx) { drag.idx = i; items(nav).forEach((a, k) => a.classList.toggle('hot', k === i)); try { navigator.vibrate?.(6); } catch (_) { } }
}, { passive: true });
const finish = (e, cancel) => {
  if (!drag || e.pointerId !== drag.id) return;
  const { nav, on, idx } = drag; drag = null;
  if (!on) return;
  dragEnd = Date.now(); nav.classList.remove('drag');
  items(nav).forEach(a => a.classList.remove('hot'));
  const as = items(nav), cur = Math.max(0, as.findIndex(a => a.classList.contains('on')));
  const lens = nav.querySelector('.nav-lens'); if (lens) lens.style.transform = '';
  if (cancel || idx == null) { place(nav, cur, true); return; }
  place(nav, idx, true); lastIdx = idx;
  const a = as[idx], href = a.getAttribute('href');
  as.forEach(x => x.classList.toggle('on', x === a));
  const here = (location.hash || '#/').split('?')[0];
  if (href === here) { if (window.scrollY > 40) window.scrollTo({ top: 0, behavior: 'smooth' }); }
  else location.hash = href;
};
document.addEventListener('pointerup', e => finish(e, false), { passive: true });
document.addEventListener('pointercancel', e => finish(e, true), { passive: true });
// po posunutí prstom nesmie vznikuť aj bežné ťuknutie na pôvodnú záložku
document.addEventListener('click', e => { if (Date.now() - dragEnd < 600 && e.target.closest?.('.nav')) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
