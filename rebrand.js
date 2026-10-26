// GainTrain: nový názov a logo bez prepisovania starších súborov.
// Vymení text „Fuelwind" za „GainTrain" všade, kde sa zobrazí v appke (aj v obrázkoch a textoch na zdieľanie),
// na úvodnej obrazovke ukáže animované logo so sušienkou a na prihlásení logo so sušienkou.
// Je to dočasná vrstva: keď sa názov prepíše priamo v súboroch, tento modul sa dá zmenšiť.
import { WORDMARK, STACKED } from './brand.js';
import { cookie } from './brandmark.js';

const OLD = 'Fuelwind', NEW = 'GainTrain', OLDL = 'fuelwind', NEWL = 'gaintrain';
// ikona (SVG aj PNG) sa generuje z tabuľky app_assets cez funkciu app-icon
const ICON = 'https://uxzwqyjbzkcveoxsdqdv.supabase.co/functions/v1/app-icon';
const fix = s => typeof s === 'string' ? s.split(OLD).join(NEW).split(OLDL).join(NEWL) : s;

const CSS = `
.gt-lock{display:flex;align-items:center;gap:10px;color:var(--text)}
.gt-lock .gt-cookie{width:46px;height:46px;margin:-6px -4px -6px -8px;flex:none}
.gt-lock .gt-word{height:22px;width:auto;display:block}
.ah-brand{margin-bottom:16px}
.gt-lock.gt-sm{gap:7px}.gt-lock.gt-sm .gt-cookie{width:32px;height:32px;margin:-4px -3px -4px -6px}.gt-lock.gt-sm .gt-word{height:15px}
.rc-brand .gt-lock{color:#fff}.rc-brand svg.gt-word{width:auto;height:15px}.rc-brand svg.gt-cookie{width:32px;height:32px}
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
.ah-brand.gt-login{display:block;margin:0}
.ah-brand.gt-login .gt-hero{margin:44px 0 30px 18px}
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

// návod na Skratku pre Zdravie: Skratka v iPhone sa stále volá Fuelwind, tam názov nemeníme
const keep = n => /Skratk|krokov/.test(n.parentElement?.closest('p,a,li')?.textContent || '');
function fixText(root) {
  if (!root) return;
  if (root.nodeType === 3) { if (root.nodeValue.includes(OLD) && !keep(root)) root.nodeValue = fix(root.nodeValue); return; }
  if (root.nodeType !== 1 || root.closest?.('input,textarea,[contenteditable]')) return;
  if (!(root.textContent || '').includes(OLD)) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n; while ((n = w.nextNode())) if (n.nodeValue.includes(OLD) && !keep(n)) n.nodeValue = fix(n.nodeValue);
}

let uid = 0;
function brand() {
  // prihlásenie: sušienka + nápis
  // prihlásenie: rovnaké veľké animované logo ako na úvode kvízu (Registrovať), aby bola značka všade rovnaká
  const b = document.querySelector('.ah-brand');
  if (b && !b.querySelector('.gt-hero')) { b.classList.add('notranslate', 'gt-login'); b.innerHTML = ''; b.appendChild(heroEl()); }
  // týždenný príbeh (rc-brand) a onboarding (.brand): sušienka + nápis namiesto plameňa
  document.querySelectorAll('.rc-brand:not(.gt-done), .screen > .brand:not(.gt-done)').forEach(el => {
    el.classList.add('gt-done', 'notranslate'); el.innerHTML = `<div class="gt-lock gt-sm">${cookie('gtb' + (uid++), 15)}${WORDMARK}</div>`;
  });
  // úvodná obrazovka: animované logo namiesto starého kruhu
  const seal = document.querySelector('svg.fnq-seal');
  if (seal) seal.replaceWith(heroEl());
}
function heroEl() {
  const h = document.createElement('div');
  h.className = 'gt-hero notranslate'; h.setAttribute('role', 'img'); h.setAttribute('aria-label', NEW);
  const stack = STACKED.replace('<path transform="translate(808 0)"', '<g class="l1"><path transform="translate(808 0)"').replace('<path transform="translate(0 798)"', '</g><g class="l2"><path transform="translate(0 798)"').replace('</g></svg>', '</g></g></svg>');
  h.innerHTML = `${stack}<div class="gt-hc">${cookie('gth' + (uid++), 15)}</div>`;
  return h;
}

function run(muts) {
  if (muts) for (const m of muts) { if (m.type === 'characterData') fixText(m.target); else m.addedNodes.forEach(fixText); }
  else fixText(document.body);
  brand(); head();
}
run();
new MutationObserver(run).observe(document.body, { childList: true, subtree: true, characterData: true });
