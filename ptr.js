// Potiahnutie obrazovky nadol (keď si úplné navrchu) obnoví aktuálnu obrazovku čerstvými dátami a skontroluje novú verziu appky.
// Nereloaduje celú stránku: len znova spustí router, takže sa nič nezablikne.
const OK = new Set(['', '#/', '#/jedlo', '#/pokrok', '#/vaha', '#/navyky', '#/profil', '#/tyzden', '#/report', '#/trening']);
const MAX = 100, GO = 60;
const CSS = `
#fw-ptr{position:fixed;left:50%;top:calc(env(safe-area-inset-top) + 8px);width:38px;height:38px;margin-left:-19px;z-index:210;border-radius:50%;display:flex;align-items:center;justify-content:center;
  background:#121821;border:1px solid #232c3a;box-shadow:0 6px 18px rgba(0,0,0,.45);pointer-events:none;opacity:0;transform:translateY(-60px)}
#fw-ptr svg{width:20px;height:20px;stroke:#7CFFB2;fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
#fw-ptr.spin svg{animation:fwptr .7s linear infinite}
@keyframes fwptr{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){#fw-ptr.spin svg{animation-duration:2s}}
`;
const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
const el = document.createElement('div'); el.id = 'fw-ptr'; el.setAttribute('aria-hidden', 'true');
el.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/></svg>';
document.body.appendChild(el);

let y0 = null, x0 = 0, pull = 0, busy = false, armed = false;
const path = () => (location.hash || '#/').split('?')[0];
const scrolled = t => { for (let n = t; n && n !== document.body; n = n.parentElement) { if (n.scrollTop > 0) return true; } return false; };
const show = (p, anim) => {
  const k = Math.min(1, p / GO);
  el.style.transition = anim ? 'transform .25s ease, opacity .2s ease' : 'none';
  el.style.opacity = String(Math.min(1, k * 1.4));
  el.style.transform = `translateY(${Math.min(p, MAX) * 0.75 - 56}px)`;
  if (!busy) el.querySelector('svg').style.transform = `rotate(${k * 270}deg)`;
};
const hide = () => { el.classList.remove('spin'); el.querySelector('svg').style.transform = ''; show(0, true); el.style.opacity = '0'; };

async function refresh() {
  busy = true; el.classList.add('spin'); show(GO, true);
  try { navigator.vibrate?.(8); } catch (_) { }
  try { const r = await navigator.serviceWorker?.getRegistration(); r?.update().catch(() => { }); } catch (_) { }
  try { localStorage.removeItem('fw_snap'); } catch (_) { }
  const t0 = Date.now();
  window.dispatchEvent(new HashChangeEvent('hashchange'));
  // pokrúti sa aspoň chvíľku, nech je vidieť, že sa niečo stalo; potom, keď router dobehne, zmizne
  const done = () => { if (document.documentElement.classList.contains('fw-loading') && Date.now() - t0 < 8000) return setTimeout(done, 120); setTimeout(() => { busy = false; hide(); }, Math.max(0, 600 - (Date.now() - t0))); };
  setTimeout(done, 150);
}

// touchmove s možnosťou zablokovať posun sa pripája len počas ťahu zhora; inak by prehliadač pri každom posune čakal na tento skript (sekanie)
let moving = false;
const on = () => { if (!moving) { moving = true; document.addEventListener('touchmove', onMove, { passive: false }); } };
const off = () => { if (moving) { moving = false; document.removeEventListener('touchmove', onMove); } };
document.addEventListener('touchstart', e => {
  off(); y0 = null; armed = false;
  if (busy || e.touches.length !== 1 || !OK.has(path())) return;
  if ((window.scrollY || document.documentElement.scrollTop) > 0) return;
  const t = e.target;
  if (document.querySelector('.sheet-bg') || t.closest?.('input,textarea,select,[contenteditable],svg.chart') || scrolled(t)) return;
  y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; pull = 0;
  on();
}, { passive: true });

function onMove(e) {
  if (y0 == null || busy) return off();
  const dy = e.touches[0].clientY - y0, dx = Math.abs(e.touches[0].clientX - x0);
  if (!armed) {
    if (dy < 0 || (dy < 10 && dx > dy)) { if (dy < -6 || dx > 16) { y0 = null; off(); } return; }
    if (dy < 10) return;
    armed = true;
  }
  if ((window.scrollY || 0) > 0) { y0 = null; off(); hide(); return; }
  pull = Math.min(MAX, (dy - 10) * 0.65);
  if (e.cancelable) e.preventDefault();
  show(pull, false);
}

const end = () => {
  off();
  if (y0 == null) return;
  const go = armed && pull >= GO * 0.9;
  y0 = null; armed = false;
  if (go) refresh(); else if (!busy) hide();
};
document.addEventListener('touchend', end, { passive: true });
document.addEventListener('touchcancel', () => { off(); y0 = null; armed = false; if (!busy) hide(); }, { passive: true });
