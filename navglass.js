// Spodná lišta v štýle „tekuté sklo“: plávajúca matná kapsula, posuvná bublina pod aktívnou záložkou
// a posúvanie prstom po lište (podržíš a ťaháš, pustíš na záložke a otvorí sa). Ťuknutie funguje ako doteraz.
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
/* v328: zvýraznenie ako v iOS. Aktívna farba nie je na záložke, ale na kópii lišty (.nav-hl), ktorá je viditeľná len vo vnútri bubliny.
   Keď bublina stojí medzi dvoma záložkami, každá je zafarbená presne toľko, koľko z nej bublina prekrýva. */
.nav-hl{position:absolute;z-index:2;top:4px;bottom:4px;left:4px;right:4px;display:flex;pointer-events:none;will-change:clip-path}
.nav-hl > a{pointer-events:none}
/* v319: bublina ako tekuté sklo v iOS 26. Pohyb riadi pružina v JS (premenné --x, --sx, --sy, --gl):
   v pokoji jemná sklenená kapsula pod aktívnou záložkou; po dotyku sa nafúkne nad lištu, ťahá sa za prstom,
   pri rýchlom pohybe sa natiahne, okraje sa zalesknú dúhou a ikony pod ňou sa zväčšia ako pod lupou. */
.nav{overflow:visible}
.nav-lens{--x:0px;--sx:1;--sy:1;--gl:0;position:absolute;z-index:0;top:4px;bottom:4px;left:4px;border-radius:999px;pointer-events:none;
  transform:translate3d(var(--x),0,0) scale(var(--sx),var(--sy));transform-origin:50% 50%;will-change:transform;
  background:radial-gradient(120% 100% at 30% 0%,rgba(255,255,255,calc(.20 - var(--gl)*.12)),rgba(255,255,255,calc(.06 - var(--gl)*.04)) 62%),rgba(255,255,255,calc(.05 + var(--gl)*.03));
  box-shadow:inset 0 1px .5px rgba(255,255,255,calc(.45 + var(--gl)*.4)),inset 0 -1.5px 1px rgba(255,255,255,calc(.10 + var(--gl)*.25)),inset 0 0 0 .5px rgba(255,255,255,calc(.22 + var(--gl)*.3)),
    inset 0 0 calc(var(--gl)*14px) rgba(255,255,255,calc(var(--gl)*.18)),0 calc(4px + var(--gl)*10px) calc(12px + var(--gl)*18px) rgba(0,0,0,calc(.22 + var(--gl)*.16))}
/* dúhový lom svetla na okraji (ako hrana skla) */
.nav-lens::before{content:'';position:absolute;inset:0;border-radius:inherit;padding:1.6px;opacity:calc(var(--gl)*.95);
  background:conic-gradient(from 210deg,rgba(255,110,190,.9),rgba(255,224,110,.85),rgba(110,240,255,.9),rgba(160,130,255,.85),rgba(255,110,190,.9));
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0)}
/* odlesk hore */
.nav-lens::after{content:'';position:absolute;left:14%;right:14%;top:7%;height:36%;border-radius:999px;opacity:calc(.35 + var(--gl)*.55);
  background:linear-gradient(180deg,rgba(255,255,255,.55),rgba(255,255,255,0))}
.nav a .ic,.nav a .lb{transform-origin:50% 60%;will-change:transform}
.nav a,.nav a *{-webkit-user-drag:none;user-drag:none}
.nav .tdi-top{opacity:.32;transition:opacity .2s}
.nav a.on .tdi-top{opacity:1}
.nav .tdi-n{font-weight:800;font-size:9.6px;font-family:inherit;letter-spacing:-.04em;font-variant-numeric:tabular-nums}
.nav .tdi.tdi-go .tdi-top{transform-box:fill-box;transform-origin:50% 0;animation:tdiFlip .55s cubic-bezier(.3,1.4,.5,1)}
.nav .tdi.tdi-go .tdi-n{transform-box:fill-box;transform-origin:50% 60%;animation:tdiPop .5s cubic-bezier(.3,1.6,.5,1) .08s both}
@keyframes tdiFlip{0%{transform:scaleY(1)}35%{transform:scaleY(-.6)}100%{transform:scaleY(1)}}
@keyframes tdiPop{0%{transform:scale(.6);opacity:.2}100%{transform:scale(1);opacity:1}}
@media (prefers-reduced-motion:reduce){.nav .tdi.tdi-go *{animation:none!important}}
`;
const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

// Ikonka záložky Dnes: kalendárový lístok s dnešným dátumom (dnes 23, zajtra 24). Plamienok patrí sérii, nie záložke Dnes.
// Dátum sa prepíše sám o polnoci aj po návrate do appky. Keď prejdeš na Dnes, lístok sa jemne pretočí ako trhací kalendár.
const dayNum = () => new Date().getDate();
const todayIcon = () => `<svg class="tdi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
<rect x="3.6" y="4.6" width="16.8" height="16.4" rx="4.4"/>
<path class="tdi-top" d="M3.6 9.6V9a4.4 4.4 0 0 1 4.4-4.4h8A4.4 4.4 0 0 1 20.4 9v.6z" fill="currentColor" stroke="none"/>
<path d="M8.2 2.9v3.2M15.8 2.9v3.2"/>
<text class="tdi-n" x="12" y="18.3" text-anchor="middle" fill="currentColor" stroke="none">${dayNum()}</text></svg>`;
const syncDay = () => document.querySelectorAll('.nav .tdi-n').forEach(t => { const d = String(dayNum()); if (t.textContent !== d) t.textContent = d; });
setInterval(syncDay, 60000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncDay(); });
let lastIdx = null, drag = null, dragEnd = 0;

const items = nav => [...nav.querySelectorAll(':scope > a')];
// ---------- pružina bubliny (jedna pre celú appku, lišta sa pri prepnutí obrazovky vykreslí nanovo a bublina pokračuje) ----------
const RM = matchMedia('(prefers-reduced-motion: reduce)');
const L = { nav: null, pos: 0, vel: 0, target: 0, press: 0, pressT: 0, sx: 1, sy: 1, gl: 0, raf: 0, last: 0, init: false };
const slot = nav => (nav.clientWidth - 8) / Math.max(1, items(nav).length);
function render() {
  const nav = L.nav; if (!nav || !nav.isConnected) return;
  const lens = nav.querySelector('.nav-lens'); if (!lens) return;
  const hl = nav.querySelector('.nav-hl');
  const w = slot(nav), n = items(nav).length;
  // v pokoji má kapsula presne šírku záložky (s malou medzerou), nikdy nezasahuje do susednej ani na krajoch;
  // nafúkne sa až pri dotyku alebo prechode (--sx, --sy), ako v iOS
  const gap = Math.min(4, w * 0.05);
  lens.style.width = (w - gap * 2) + 'px';
  const x = L.pos * w + gap;
  lens.style.setProperty('--x', x.toFixed(2) + 'px');
  // zafarbená kópia lišty je vidieť len v tvare bubliny (aj keď sa nafúkne)
  if (hl) {
    const lw = (w - gap * 2) * L.sx, left = x + (w - gap * 2) * (1 - L.sx) / 2, right = hl.clientWidth - left - lw;
    const vh = hl.clientHeight * (L.sy - 1) / 2;
    hl.style.clipPath = `inset(${(-vh).toFixed(1)}px ${right.toFixed(1)}px ${(-vh).toFixed(1)}px ${left.toFixed(1)}px round 999px)`;
  }
  lens.style.setProperty('--sx', L.sx.toFixed(4)); lens.style.setProperty('--sy', L.sy.toFixed(4)); lens.style.setProperty('--gl', L.gl.toFixed(3));
  // lupa: ikona a popis pod bublinou sa zväčšia podľa toho, ako blízko je stred bubliny a ako je nafúknutá
  const amp = 0.2 * Math.min(1, L.press + Math.min(1, Math.abs(L.vel) / 6));
  const hls = hl ? [...hl.children] : [];
  items(nav).forEach((a, k) => {
    const p = Math.max(0, 1 - Math.abs(k - L.pos));
    const sc = 1 + amp * p;
    const t = sc > 1.001 ? `scale(${sc.toFixed(3)})` : '';
    const tl = t ? `translateY(${(-2 * amp * p).toFixed(2)}px) ${t}` : '';
    for (const el of [a, hls[k]]) {
      if (!el) continue;
      const ic = el.querySelector('.ic'), lb = el.querySelector('.lb');
      if (ic && ic.style.transform !== t) ic.style.transform = t;
      if (lb && lb.style.transform !== tl) lb.style.transform = tl;
    }
    if (hl && a.classList.contains('on')) a.classList.remove('on'); // farbu aktívnej záložky kreslí len kópia v bubline
    if (hls[k] && !hls[k].classList.contains('on')) hls[k].classList.add('on');
  });
  if (n) nav.querySelectorAll(':scope > a').forEach((a, k) => a.setAttribute('aria-current', k === Math.round(L.target) ? 'page' : 'false'));
}
function step(t) {
  const dt = Math.min(0.034, Math.max(0.001, (t - (L.last || t)) / 1000 || 0.016)); L.last = t;
  // poloha: pružina s jemným preskokom (ako v iOS); pri ťahaní tuhšia, aby bublina išla za prstom
  const k = drag?.on ? 520 : 260, c = drag?.on ? 34 : 22;
  const a = k * (L.target - L.pos) - c * L.vel;
  L.vel += a * dt; L.pos += L.vel * dt;
  // nafúknutie: pri dotyku a počas cesty na inú záložku
  L.press += (L.pressT - L.press) * Math.min(1, dt * (L.pressT > L.press ? 18 : 9));
  const travel = Math.min(1, Math.abs(L.target - L.pos) * 1.4);
  const g = Math.max(L.press, travel * 0.85);
  const stretch = Math.min(0.22, Math.abs(L.vel) * 0.03);
  const tsx = 1 + g * 0.2 + stretch, tsy = 1 + g * 0.3 - stretch * 0.5;
  L.sx += (tsx - L.sx) * Math.min(1, dt * 22); L.sy += (tsy - L.sy) * Math.min(1, dt * 22);
  L.gl += (Math.min(1, g * 1.15) - L.gl) * Math.min(1, dt * 16);
  render();
  const idle = Math.abs(L.target - L.pos) < 0.002 && Math.abs(L.vel) < 0.01 && Math.abs(L.press - L.pressT) < 0.005 && Math.abs(L.sx - 1) < 0.002 && Math.abs(L.sy - 1) < 0.002 && L.gl < 0.01 && !drag;
  if (idle) { L.pos = L.target; L.vel = 0; L.sx = L.sy = 1; L.gl = 0; L.raf = 0; L.last = 0; render(); return; }
  L.raf = requestAnimationFrame(step);
}
const kick = () => { if (RM.matches) { L.pos = L.target; L.vel = 0; L.sx = L.sy = 1; L.gl = 0; render(); return; } if (!L.raf) { L.last = 0; L.raf = requestAnimationFrame(step); } };

function setup(nav) {
  if (nav.__g) return; nav.__g = 1;
  const as = items(nav); if (!as.length) return;
  const home = nav.querySelector('a[href="#/"] .ic'); if (home) home.innerHTML = todayIcon();
  const lens = document.createElement('i'); lens.className = 'nav-lens'; nav.prepend(lens);
  const hl = document.createElement('div'); hl.className = 'nav-hl'; hl.setAttribute('aria-hidden', 'true');
  hl.innerHTML = as.map(a => `<a class="on" tabindex="-1">${a.innerHTML}</a>`).join('');
  hl.querySelectorAll('[id]').forEach(x => x.removeAttribute('id'));
  nav.appendChild(hl);
  const idx = Math.max(0, as.findIndex(a => a.classList.contains('on')));
  if (home) { const h2 = hl.querySelector('a[href="#/"] .ic, a:first-child .ic'); if (h2 && as[0]?.getAttribute('href') === '#/') h2.innerHTML = todayIcon(); }
  L.nav = nav;
  if (!L.init) { L.init = true; L.pos = idx; L.vel = 0; } // inak bublina plynule pokračuje z miesta, kde bola na predošlej lište
  L.target = idx;
  render(); kick();
  // príchod na Dnes z inej záložky: lístok kalendára sa pretočí
  if (idx === 0 && lastIdx != null && lastIdx !== 0) { const svg = nav.querySelector('.tdi'); if (svg) requestAnimationFrame(() => svg.classList.add('tdi-go')); }
  lastIdx = idx;
}
const scan = n => { if (n.nodeType !== 1) return; if (n.matches?.('.nav')) setup(n); n.querySelectorAll?.('.nav').forEach(setup); };
new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(scan))).observe(document.documentElement, { childList: true, subtree: true });
document.querySelectorAll('.nav').forEach(setup);
window.addEventListener('resize', () => render());

// poloha prsta v jednotkách záložiek (0 = prvá); stred bubliny ide za prstom, na krajoch sa zastaví
const posAt = (nav, x) => { const r = nav.getBoundingClientRect(), w = slot(nav), n = items(nav).length; return Math.max(0, Math.min(n - 1, (x - r.left - nav.clientLeft - 4 - w / 2) / w)); };

document.addEventListener('pointerdown', e => {
  const nav = e.target.closest?.('.nav'); if (!nav || e.button > 0) return;
  drag = { nav, x: e.clientX, y: e.clientY, id: e.pointerId, on: false, idx: null };
  L.nav = nav; L.pressT = 1; kick(); // dotyk: bublina sa hneď nafúkne
}, { passive: true });
document.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.id) return;
  const { nav } = drag;
  if (!drag.on) {
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) <= 10) return;
    drag.on = true; nav.classList.add('drag'); drag.orig = Math.round(L.target);
    try { nav.setPointerCapture(e.pointerId); } catch (_) { }
  }
  L.target = posAt(nav, e.clientX); kick();
  const i = Math.round(L.target);
  if (i !== drag.idx) { drag.idx = i; try { navigator.vibrate?.(6); } catch (_) { } }
}, { passive: true });
const finish = (e, cancel) => {
  if (!drag || e.pointerId !== drag.id) return;
  const { nav, on, idx, orig } = drag; drag = null;
  L.pressT = 0; kick();
  if (!on) return; // obyčajné ťuknutie rieši odkaz (nová obrazovka a bublina doputuje sama)
  dragEnd = Date.now(); nav.classList.remove('drag');
  const as = items(nav), cur = Math.max(0, orig ?? 0);
  if (cancel || idx == null) { L.target = cur; kick(); return; }
  L.target = idx; kick(); lastIdx = idx;
  const a = as[idx], href = a.getAttribute('href');
  const here = (location.hash || '#/').split('?')[0];
  if (href === here) { if (window.scrollY > 40) window.scrollTo({ top: 0, behavior: 'smooth' }); }
  else location.hash = href;
};
document.addEventListener('pointerup', e => finish(e, false), { passive: true });
document.addEventListener('pointercancel', e => finish(e, true), { passive: true });
// odkaz v lište sa nesmie začať ťahať ako obrázok (na počítači by to zrušilo posúvanie bubliny)
document.addEventListener('dragstart', e => { if (e.target.closest?.('.nav')) e.preventDefault(); }, true);
// po posunutí prstom nesmie vzniknúť aj bežné ťuknutie na pôvodnú záložku
document.addEventListener('click', e => { if (Date.now() - dragEnd < 600 && e.target.closest?.('.nav')) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
// ťuknutie na záložku: bublina vyrazí k nej hneď, ešte kým sa vykreslí nová obrazovka
document.addEventListener('click', e => {
  const a = e.target.closest?.('.nav a'); if (!a) return;
  const nav = a.closest('.nav'), i = items(nav).indexOf(a); if (i < 0) return;
  L.nav = nav; L.target = i; kick();
}, true);
