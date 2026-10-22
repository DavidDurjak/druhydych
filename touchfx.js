// Drobnosti, ktoré robia appku príjemnejšou:
// 1) Zvuk vody pri pridaní pohára (Pitný režim aj Voda v plusovom menu): kvapka, tečenie s bublinkami, ktoré stúpajú, ako sa pohár plní, a cinknutie.
//    Zvuk sa vytvára v telefóne (Web Audio), nič sa nesťahuje. Keď má človek zapnutý tichý režim, telefón ho stíši ako každá appka.
// 2) Krížik na zavretie každého spodného okna (sheet), ktoré ho nemá. Napr. Hotový jedálniček sa inak nedal zavrieť.
// 3) Na obrazovke Nastav si štart je šípka Späť vedľa loga, neprekrýva nadpis.
// 4) Dlaždica Hotový jedálniček v Profile a karta Nákupný zoznam omylom otvárali Karty do zahraničia; teraz otvoria výber jedálničku.
// 5) iPhone niekedy po otvorení appky z plochy nevykreslí obrazovku (čierna, kým sa nedotkneš). Appka si ju sama prekreslí:
//    po spustení, po návrate z pozadia a po načítaní obrazovky, rovnako ako keby si sa jej dotkol.
const CSS = `
.sx-close{position:sticky;top:0;float:right;z-index:3;width:36px;height:36px;margin:-6px -4px 4px 10px;border-radius:50%;border:1px solid var(--line);
  background:var(--bg-2);color:var(--text);font:inherit;font-size:22px;line-height:1;display:grid;place-items:center;cursor:pointer;-webkit-appearance:none;appearance:none;box-shadow:0 4px 14px rgba(0,0,0,.25)}
.sx-close:active{transform:scale(.92)}
/* Nastav si štart (úprava údajov): šípka Späť v riadku s logom, nie cez nadpis */
#app .screen.bk:has(#onb) > .bk-b{top:calc(env(safe-area-inset-top) + 14px)}
#app .screen.bk:has(#onb) > .brand{margin-left:52px;min-height:24px;display:flex;align-items:center}
/* karta Spánok vykresľuje svoje animácie sama v sebe (iPhone nemusí kvôli nim prekresľovať zvyšok obrazovky) */
.sp{contain:paint;isolation:isolate}
`;
if (!document.getElementById('sx-css')) { const s = document.createElement('style'); s.id = 'sx-css'; s.textContent = CSS; document.head.appendChild(s); }

// ---------- zvuk vody ----------
let ac = null;
function audio() {
  const A = window.AudioContext || window.webkitAudioContext; if (!A) return null;
  if (!ac) ac = new A();
  if (ac.state === 'suspended') ac.resume().catch(() => { });
  return ac;
}
// jedna bublinka: krátky tón, ktorý rýchlo stúpa (typické „blub“)
function bubble(c, out, t, f, vol, len = 0.11) {
  const o = c.createOscillator(), g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(f, t);
  o.frequency.exponentialRampToValueAtTime(f * 2.4, t + len * 0.65);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(g).connect(out);
  o.start(t); o.stop(t + len + 0.02);
}
// tečúca voda: šum, ktorého tón stúpa, ako sa pohár plní
function pour(c, out, t, len) {
  const n = Math.floor(c.sampleRate * (len + 0.1)), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < n; i++) { last = last * 0.55 + (Math.random() * 2 - 1) * 0.45; d[i] = last; }
  const src = c.createBufferSource(); src.buffer = buf;
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.4;
  bp.frequency.setValueAtTime(520, t); bp.frequency.exponentialRampToValueAtTime(2300, t + len);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.22, t + 0.06);
  g.gain.setValueAtTime(0.22, t + len * 0.75);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.08);
  src.connect(bp).connect(g).connect(out);
  src.start(t); src.stop(t + len + 0.1);
}
// cinknutie pohára na konci: tri čisté tóny, ktoré doznievajú
function plink(c, out, t, root) {
  [[1, 0.16], [2.01, 0.07], [3.02, 0.035]].forEach(([k, v]) => {
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(root * k, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    o.connect(g).connect(out); o.start(t); o.stop(t + 0.75);
  });
}
export function waterSound(ml) {
  try {
    const c = audio(); if (!c) return;
    const t = c.currentTime + 0.02;
    const out = c.createGain(); out.gain.value = 1;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
    out.connect(comp).connect(c.destination);
    const len = ml >= 500 ? 0.95 : ml >= 250 ? 0.65 : 0.42;
    // prvá veľká kvapka, potom tečenie s bublinkami, ktoré stúpajú, a nakoniec cinknutie
    bubble(c, out, t, 170, 0.32, 0.16);
    pour(c, out, t + 0.05, len);
    const n = Math.round(len / 0.065);
    for (let i = 0; i < n; i++) {
      const k = i / n;
      bubble(c, out, t + 0.06 + k * len + Math.random() * 0.02, 260 + k * 520 + Math.random() * 90, 0.09 + Math.random() * 0.07);
    }
    plink(c, out, t + len + 0.1, ml >= 500 ? 1568 : ml >= 250 ? 1760 : 1976);
    if (navigator.vibrate) navigator.vibrate(12);
    clearTimeout(closeT); closeT = setTimeout(release, (len + 1.6) * 1000);
  } catch (_) { /* bez zvuku */ }
}
// Zvukový kanál je otvorený len počas zvuku: 2,5 s po poslednom zvuku a pri odchode z appky sa zavrie.
// Otvorený zvukový kanál v appke z plochy na iPhone vie spôsobiť čiernu obrazovku po návrate do appky.
let closeT = 0;
function release() { clearTimeout(closeT); const c = ac; ac = null; if (c) c.close().catch(() => { }); }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') release(); });
addEventListener('pagehide', release);
// Pitný režim na Dnes (+150, +250, +500) aj Voda v plusovom menu (+250, +500)
document.addEventListener('click', e => {
  const b = e.target.closest?.('#wx [data-wx], [data-qa^="w:"]');
  if (!b) return;
  waterSound(Number(b.dataset.wx || String(b.dataset.qa).split(':')[1]) || 250);
}, true);

// ---------- krížik na zavretie okien ----------
const hasClose = sh => [...sh.querySelectorAll('button,a')].some(b => /zavrie/i.test(b.getAttribute('aria-label') || '') || /^\s*(×|✕|✖|zavrieť)\s*$/i.test(b.textContent || ''));
function addClose(bg) {
  const sh = bg.querySelector(':scope > .sheet');
  if (!sh || sh.dataset.sx || hasClose(sh)) return;
  sh.dataset.sx = '1';
  const x = document.createElement('button');
  x.type = 'button'; x.className = 'sx-close'; x.setAttribute('aria-label', 'Zavrieť'); x.textContent = '×';
  x.onclick = () => bg.remove();
  sh.prepend(x);
}
new MutationObserver(ms => {
  for (const m of ms) for (const n of m.addedNodes) {
    if (n.nodeType !== 1) continue;
    if (n.classList?.contains('sheet-bg')) setTimeout(() => addClose(n), 0);
  }
}).observe(document.body, { childList: true });

// ---------- Hotový jedálniček: správny cieľ ----------
document.addEventListener('click', e => {
  const a = e.target.closest?.('a[href="#/karta"]');
  const shop = e.target.closest?.('#fw-shop');
  if (!shop && !(a && /Hotový jedálniček/.test(a.textContent || ''))) return;
  e.preventDefault(); e.stopImmediatePropagation();
  import('./meals.js').then(m => m.openPlans()).catch(() => { });
}, true);

// ---------- prekreslenie obrazovky (iPhone: čierna obrazovka, kým sa nedotkneš) ----------
function repaint() {
  requestAnimationFrame(() => {
    const y = window.scrollY;
    window.scrollTo(0, y + 1); window.scrollTo(0, y);
  });
}
const kick = () => { repaint(); setTimeout(repaint, 350); setTimeout(repaint, 1200); };
addEventListener('pageshow', kick);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') kick(); });
addEventListener('load', kick);
// keď appka dokončí načítanie obrazovky (zmizne fw-loading), prekreslí sa ešte raz
new MutationObserver(ms => { for (const m of ms) if (m.oldValue && /fw-loading/.test(m.oldValue) && !document.documentElement.classList.contains('fw-loading')) { repaint(); break; } })
  .observe(document.documentElement, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
kick();

// ---------- dočasná diagnostika čiernej obrazovky (iPhone): čo je nad obsahom, odošle sa do app_events ----------
function diag(tag) {
  try {
    const W = innerWidth, H = innerHeight, d = el => { if (!el || el.nodeType !== 1) return null; const s = getComputedStyle(el), r = el.getBoundingClientRect(); return [el.tagName, el.id, String(el.className || '').slice(0, 60), s.position, s.zIndex, s.backgroundColor, s.opacity, s.visibility, s.display, Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)].join('|'); };
    const pts = [[W / 2, H / 2], [W / 2, 120], [20, 40], [W / 2, H - 60]].map(([x, y]) => (document.elementsFromPoint(x, y) || []).slice(0, 6).map(d));
    const fixed = [...document.querySelectorAll('body *')].filter(e => { const p = getComputedStyle(e).position; return p === 'fixed' || p === 'sticky'; }).slice(0, 25).map(d);
    const neg = [...document.querySelectorAll('body *')].filter(e => e.childElementCount === 0 && /[−-]\s?0,1/.test(e.textContent || '')).slice(0, 3).map(e => [d(e), d(e.parentElement), d(e.parentElement?.parentElement)]);
    window.fwTrack && window.fwTrack('diag', { tag, W, H, sy: scrollY, cls: document.documentElement.className, bcls: document.body.className, pts, fixed, neg, ua: navigator.userAgent.slice(0, 120) });
  } catch (e) { window.fwTrack && window.fwTrack('diag', { tag, err: String(e).slice(0, 200) }); }
}
setTimeout(() => diag('t3'), 3000);
setTimeout(() => diag('t8'), 8000);
