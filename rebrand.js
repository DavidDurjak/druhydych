// GainTrain: nový názov a logo bez prepisovania starších súborov.
// Vymení text „Fuelwind" za „GainTrain" všade, kde sa zobrazí v appke (aj v obrázkoch a textoch na zdieľanie),
// na úvodnej obrazovke ukáže animované logo so sušienkou a na prihlásení logo so sušienkou.
// Je to dočasná vrstva: keď sa názov prepíše priamo v súboroch, tento modul sa dá zmenšiť.
import { WORDMARK, STACKED } from './brand.js';

const OLD = 'Fuelwind', NEW = 'GainTrain', OLDL = 'fuelwind', NEWL = 'gaintrain';
// ikona (SVG aj PNG) sa generuje z tabuľky app_assets cez funkciu app-icon
const ICON = 'https://uxzwqyjbzkcveoxsdqdv.supabase.co/functions/v1/app-icon';
const fix = s => typeof s === 'string' ? s.split(OLD).join(NEW).split(OLDL).join(NEWL) : s;

const CSS = `
.gt-lock{display:flex;align-items:center;gap:10px;color:var(--text)}
.gt-lock .gt-cookie{width:46px;height:46px;margin:-6px -4px -6px -8px;flex:none}
.gt-lock .gt-word{height:22px;width:auto;display:block}
.ah-brand{margin-bottom:16px}
.gt-hero{position:relative;width:250px;margin:6px 0 30px 18px;color:var(--text)}
.gt-hero .gt-stack{display:block;width:100%;height:auto;overflow:visible}
.gt-hero .gt-hc{position:absolute;left:-8.7%;top:-29.5%;width:36.8%;pointer-events:none}
.gt-hero .gt-hc .gt-cookie{display:block;width:100%;height:auto;overflow:visible;filter:drop-shadow(0 8px 14px rgba(0,0,0,.28))}
.gt-hero .l1,.gt-hero .l2{opacity:0;animation:gtIn .7s cubic-bezier(.2,.9,.25,1) forwards}
.gt-hero .l1{animation-delay:.1s}.gt-hero .l2{animation-delay:.28s}
@keyframes gtIn{from{opacity:0;transform:translateX(-90px) skewX(-8deg)}to{opacity:1;transform:none}}
.gt-hero .gt-hc{opacity:0;animation:gtRoll .95s .45s cubic-bezier(.25,1.1,.35,1) forwards}
@keyframes gtRoll{from{opacity:0;transform:translateX(-160%) rotate(-300deg)}60%{opacity:1}to{opacity:1;transform:none}}
.gt-cookie .gt-bite{transform-box:fill-box;transform-origin:center}
.gt-hero .gt-bite{transform:scale(0);animation:gtBite .28s 1.45s cubic-bezier(.3,1.6,.5,1) forwards}
@keyframes gtBite{to{transform:scale(1)}}
.gt-hero .gt-crumb{opacity:0;animation:gtCrumb .6s calc(1.5s + var(--i)*.05s) cubic-bezier(.2,.9,.3,1) forwards}
@keyframes gtCrumb{from{opacity:0;transform:translate(-30px,30px) scale(.3)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.gt-hero *{animation:none!important;opacity:1!important;transform:none!important}}
`;
if (!document.getElementById('gt-css')) { const s = document.createElement('style'); s.id = 'gt-css'; s.textContent = CSS; document.head.appendChild(s); }

// obrázky a texty na zdieľanie (týždeň, tréning, pozvánky) a názvy stiahnutých súborov
try {
  const C = CanvasRenderingContext2D.prototype, ft = C.fillText, st = C.strokeText;
  C.fillText = function (t, ...a) { return ft.call(this, fix(t), ...a); };
  C.strokeText = function (t, ...a) { return st.call(this, fix(t), ...a); };
  if (navigator.share) { const sh = navigator.share.bind(navigator); navigator.share = d => sh(d ? { ...d, title: fix(d.title), text: fix(d.text) } : d); }
  const dl = Object.getOwnPropertyDescriptor(HTMLAnchorElement.prototype, 'download');
  if (dl?.set) Object.defineProperty(HTMLAnchorElement.prototype, 'download', { ...dl, set(v) { dl.set.call(this, fix(v)); } });
  const F = window.File; window.File = class extends F { constructor(b, n, o) { super(b, fix(n), o); } };
  if (navigator.clipboard?.writeText) { const w = navigator.clipboard.writeText.bind(navigator.clipboard); navigator.clipboard.writeText = t => w(fix(t)); }
} catch (_) { /* starší prehliadač */ }

function head() {
  if (document.title.includes(OLD)) document.title = fix(document.title);
  const m = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (m && m.content !== NEW) m.content = NEW;
  const fav = document.querySelector('link[rel="icon"]');
  if (fav && !fav.href.includes('app-icon')) { fav.href = ICON + '?svg=1&v=3'; fav.type = 'image/svg+xml'; }
  const ati = document.querySelector('link[rel="apple-touch-icon"]');
  if (ati && !ati.href.includes('v=3')) ati.href = ICON + '?v=3';
  document.querySelectorAll('img[src="icon.svg"]').forEach(i => { i.src = ICON + '?size=192&v=3'; });
}

function fixText(root) {
  if (!root) return;
  if (root.nodeType === 3) { if (root.nodeValue.includes(OLD)) root.nodeValue = fix(root.nodeValue); return; }
  if (root.nodeType !== 1 || root.closest?.('input,textarea,[contenteditable]')) return;
  if (!(root.textContent || '').includes(OLD)) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n; while ((n = w.nextNode())) if (n.nodeValue.includes(OLD)) n.nodeValue = fix(n.nodeValue);
}

let uid = 0;
function brand() {
  // prihlásenie: sušienka + nápis
  const b = document.querySelector('.ah-brand');
  if (b && !b.querySelector('.gt-lock')) { b.classList.add('notranslate'); b.innerHTML = `<div class="gt-lock">${cookie('gtl' + (uid++), 15)}${WORDMARK}</div>`; }
  // úvodná obrazovka: animované logo namiesto starého kruhu
  const seal = document.querySelector('svg.fnq-seal');
  if (seal) {
    const h = document.createElement('div');
    h.className = 'gt-hero notranslate'; h.setAttribute('role', 'img'); h.setAttribute('aria-label', NEW);
    const stack = STACKED.replace('<path transform="translate(808 0)"', '<g class="l1"><path transform="translate(808 0)"').replace('<path transform="translate(0 798)"', '</g><g class="l2"><path transform="translate(0 798)"').replace('</g></svg>', '</g></g></svg>');
    h.innerHTML = `${stack}<div class="gt-hc">${cookie('gth' + (uid++), 15)}</div>`;
    seal.replaceWith(h);
  }
}

function run(muts) {
  if (muts) for (const m of muts) { if (m.type === 'characterData') fixText(m.target); else m.addedNodes.forEach(fixText); }
  else fixText(document.body);
  brand(); head();
}
run();
new MutationObserver(run).observe(document.body, { childList: true, subtree: true, characterData: true });

// Kotúčová sušienka (kotúč na činku z cesta, s čokoládou a odhryznutím). Kreslí sa v kóde, takže je ostrá v každej veľkosti.
// rot = natočenie (odhryznutie smeruje doprava hore pri 0). Triedy gt-bite / gt-crumb slúžia na animáciu.
function cookie(id, rot = 15) {
  const r = 100, A = -0.25 * Math.PI, P = (a, k) => [Math.cos(a) * r * k, Math.sin(a) * r * k], f = n => n.toFixed(1);
  let d = '';
  for (let i = 0; i <= 120; i++) { const t = i / 120 * 2 * Math.PI, k = 1 + 0.018 * Math.sin(t * 6 + 0.7) + 0.012 * Math.sin(t * 11 + 2.1) + 0.006 * Math.sin(t * 19 + 1), [x, y] = P(t, k); d += (i ? 'L' : 'M') + f(x) + ' ' + f(y); }
  const bites = [[A, 1.02, 0.40], [A - 0.6, 1.12, 0.27], [A + 0.6, 1.12, 0.27]].map(([a, k, s]) => { const [x, y] = P(a, k); return `<circle class="gt-bite" cx="${f(x)}" cy="${f(y)}" r="${f(r * s)}" fill="black"/>`; }).join('');
  let body = `<path d="${d}Z" fill="url(#${id}g)"/><circle r="82" fill="none" stroke="#9A5B2C" stroke-width="5" opacity=".75"/><circle r="28" fill="none" stroke="#9A5B2C" stroke-width="6" opacity=".8"/>`;
  for (const a of [45, 135, 225]) {
    const t = a * Math.PI / 180, rr = 55, w = 0.34, x1 = f(Math.cos(t - w) * rr), y1 = Math.sin(t - w) * rr, x2 = f(Math.cos(t + w) * rr), y2 = Math.sin(t + w) * rr;
    body += `<path d="M${x1} ${f(y1)}A55 55 0 0 1 ${x2} ${f(y2)}" stroke="#7A4220" stroke-width="14" stroke-linecap="round" fill="none"/><path d="M${x1} ${f(y1 + 3)}A55 55 0 0 1 ${x2} ${f(y2 + 3)}" stroke="#F6C98F" stroke-width="3" stroke-linecap="round" fill="none" opacity=".55"/>`;
  }
  const chip = 'M1 0Q.9.7.2.95Q-.6 1-.95.3Q-1.05-.5-.35-.9Q.5-1.05 1 0Z';
  body += [[-68, -5, 10, 10], [-5, -66, 9, 40], [0, 70, 9.5, -20], [66, 12, 8, 70], [-40, -30, 6.5, 15], [40, -32, 6, 30], [36, 70, 6, -35], [-64, 42, 5.5, 50], [12, 42, 5, 5], [-30, 12, 5, 25]].map(([x, y, s, ro]) => `<path transform="translate(${x} ${y}) rotate(${ro}) scale(${s})" d="${chip}" fill="#3A2214"/>`).join('');
  body += `<path d="${d}Z" fill="url(#${id}s)"/>`;
  const crumb = 'M1 .1L.55.9L-.5.8L-1-.05L-.35-.95L.6-.75Z';
  const crumbs = [[A + 0.02, 1.55, 8.5, 15], [A - 0.38, 1.5, 6, -30], [A + 0.42, 1.45, 5.5, 60], [A + 0.18, 1.85, 4, 10]].map(([a, k, s, ro], i) => { const [x, y] = P(a, k); return `<g class="gt-crumb" style="--i:${i}"><path transform="translate(${f(x)} ${f(y)}) rotate(${ro}) scale(${s})" d="${crumb}" fill="#D9955A"/></g>`; }).join('');
  return `<svg class="gt-cookie" viewBox="-170 -170 340 340" aria-hidden="true"><defs><radialGradient id="${id}g" cx="-30" cy="-35" r="140" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#F2BE7E"/><stop offset=".55" stop-color="#D9955A"/><stop offset="1" stop-color="#A9622F"/></radialGradient><radialGradient id="${id}s" cx="-40" cy="-50" r="90" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><mask id="${id}m" maskUnits="userSpaceOnUse" x="-200" y="-200" width="400" height="400"><rect x="-200" y="-200" width="400" height="400" fill="white"/>${bites}<circle r="17" fill="black"/></mask></defs><g transform="rotate(${rot})"><g mask="url(#${id}m)">${body}</g>${crumbs}</g></svg>`;
}
