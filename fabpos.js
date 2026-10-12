// Plávajúci pomocník: dá sa potiahnuť na ľubovoľné miesto (prilepí sa k okraju) a pri scrollovaní sa zjemní,
// aby neprekrýval text. Samo sa pripojí k tlačidlu .bd-fab, bez zásahu do buddy.js.
const KEY = 'dd_fab';
const ls = {
  get() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (_) { return null; } },
  set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (_) { /* súkromný režim */ } },
};
const SIZE = 54, EDGE = 12;

const CSS = `.bd-fab{width:${SIZE}px!important;height:${SIZE}px!important;touch-action:none;-webkit-user-select:none;user-select:none;transition:opacity .25s ease,transform .25s ease,left .2s ease,right .2s ease}
.bd-fab svg{width:100%;height:100%;display:block;pointer-events:none}
.bd-fab.bd-dim{opacity:.28;transform:scale(.82)}
.bd-fab.bd-drag{transition:none;transform:scale(1.08);opacity:1}`;
if (!document.getElementById('fabpos-css')) { const s = document.createElement('style'); s.id = 'fabpos-css'; s.textContent = CSS; document.head.appendChild(s); }

const clampTop = y => Math.max(70, Math.min(window.innerHeight - 170, y));

function place(f) {
  const p = ls.get(); if (!p) return;
  f.style.bottom = 'auto';
  f.style.top = clampTop(p.y * window.innerHeight) + 'px';
  if (p.side === 'l') { f.style.left = EDGE + 'px'; f.style.right = 'auto'; } else { f.style.right = EDGE + 'px'; f.style.left = 'auto'; }
}

let fab = null, justDragged = false, dimTimer = null;

function attach(f) {
  fab = f; place(f);
  let sx = 0, sy = 0, ox = 0, oy = 0, moved = false, down = false;
  f.addEventListener('pointerdown', e => {
    down = true; moved = false; sx = e.clientX; sy = e.clientY;
    const r = f.getBoundingClientRect(); ox = r.left; oy = r.top;
    try { f.setPointerCapture(e.pointerId); } catch (_) { /* nič */ }
  });
  f.addEventListener('pointermove', e => {
    if (!down) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (!moved && Math.hypot(dx, dy) < 8) return;
    if (!moved) { moved = true; f.classList.add('bd-drag'); f.classList.remove('bd-dim'); }
    f.style.right = 'auto'; f.style.bottom = 'auto';
    f.style.left = Math.max(EDGE, Math.min(window.innerWidth - SIZE - EDGE, ox + dx)) + 'px';
    f.style.top = clampTop(oy + dy) + 'px';
  });
  const end = () => {
    if (!down) return; down = false;
    if (!moved) return;
    f.classList.remove('bd-drag');
    const r = f.getBoundingClientRect();
    const side = r.left + r.width / 2 < window.innerWidth / 2 ? 'l' : 'r';
    ls.set({ side, y: clampTop(r.top) / window.innerHeight });
    place(f);
    justDragged = true; setTimeout(() => { justDragged = false; }, 350);
  };
  f.addEventListener('pointerup', end);
  f.addEventListener('pointercancel', end);
}

// potiahnutie nesmie otvoriť chat
document.addEventListener('click', e => {
  if (justDragged && e.target.closest?.('.bd-fab')) { e.stopPropagation(); e.preventDefault(); }
}, true);

// pri scrollovaní sa zjemní a po chvíli sa vráti
window.addEventListener('scroll', () => {
  if (!fab || fab.classList.contains('bd-drag')) return;
  fab.classList.add('bd-dim');
  clearTimeout(dimTimer); dimTimer = setTimeout(() => fab && fab.classList.remove('bd-dim'), 900);
}, { capture: true, passive: true });

window.addEventListener('resize', () => { if (fab) place(fab); });

function scan() { const f = document.querySelector('.bd-fab'); if (f && f !== fab) attach(f); }
new MutationObserver(scan).observe(document.body, { childList: true });
scan();
