// Dnes: výzvy (Ako sa dnes máš, Denný check-in, Týženný check-in, Týženný report, Zapni pripomienky) v jednom karuseli „Na dnes“
// namiesto piatich kariet pod sebou. Jedna karta naraz, ďalšia vykukuje, bodky ukazujú, koľko ich je. Ako v Apple Fitness či Revolute.
// Navýze: potiahnutie karusela (aj „Objav v appke“) už neprepína deň.
const st = document.createElement('style');
st.textContent = `
.fwdk{margin:2px 0 14px}
.fwdk-h{display:flex;align-items:baseline;justify-content:space-between;margin:0 2px 8px}
.fwdk-h h3{margin:0;font-size:15px;letter-spacing:-.01em}
.fwdk-h span{font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}
.fwdk-t{display:flex;align-items:stretch;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-padding:0 16px;margin:0 -16px;padding:0 16px 2px;scrollbar-width:none;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}
.fwdk-t::-webkit-scrollbar{display:none}
.fwdk-t>*{flex:0 0 calc(100% - 30px);margin:0 !important;scroll-snap-align:start;box-sizing:border-box;min-width:0}
.fwdk-t>.ci,.fwdk-t>.wc-card,.fwdk-t>.rp-card,.fwdk-t>.rd-card{min-height:96px}
.fwdk.one .fwdk-t>*{flex-basis:100%}
.fwdk #pushCard{display:flex;flex-direction:column;justify-content:center;padding:14px 16px}
.fwdk #pushCard p.small{display:none}
.fwdk #pushCard #pushYes{align-self:flex-start;margin-top:10px}
.fwdk.one .fwdk-h span,.fwdk.one .fwdk-d{display:none}
.fwdk-d{display:flex;justify-content:center;gap:5px;margin-top:9px}
.fwdk-d i{width:6px;height:6px;border-radius:99px;background:var(--line);transition:width .25s,background .25s}
.fwdk-d i.on{width:18px;background:var(--accent)}
@media (prefers-reduced-motion:reduce){.fwdk-d i{transition:none}}
`;
document.head.appendChild(st);

// poradie: denné veci prvé, jednorazová ponuka notifikácií posledná
const KINDS = [
  ['rd', el => el.matches('button.rd-card.rd-empty')],
  ['ci', el => el.matches('a.ci') && /Vyplniť/.test(el.querySelector('.ci-go')?.textContent || '')],
  ['wc', el => el.matches('a.wc-card')],
  ['rp', el => el.matches('a.rp-card')],
  ['push', el => el.matches('#pushCard')],
];
const kindOf = el => KINDS.findIndex(([, t]) => t(el));

// horizontálne posúvanie v karuseli nesmie spustiť prepnutie dňa (to počúva touchend na .screen.td)
function guard(el) {
  if (el.__fwg) return; el.__fwg = 1;
  el.addEventListener('touchend', e => e.stopPropagation(), { passive: true });
}

function sync(deck) {
  const t = deck.querySelector('.fwdk-t'), kids = [...t.children];
  if (!kids.length) { deck.remove(); return; }
  deck.classList.toggle('one', kids.length === 1);
  const d = deck.querySelector('.fwdk-d');
  if (d.children.length !== kids.length) d.innerHTML = kids.map(() => '<i></i>').join('');
  const w = kids[0].getBoundingClientRect().width + 10;
  const i = Math.max(0, Math.min(kids.length - 1, Math.round(t.scrollLeft / (w || 1))));
  [...d.children].forEach((x, k) => x.classList.toggle('on', k === i));
  const sp = deck.querySelector('.fwdk-h span'), txt = `${i + 1} z ${kids.length}`;
  if (sp.textContent !== txt) sp.textContent = txt; // len pri zmene, inak by sa observer točil dookola
}

function run() {
  const scr = document.querySelector('#app .screen.td');
  if (!scr) return;
  scr.querySelectorAll('.dc-row').forEach(guard);
  const loose = [...scr.children].filter(el => kindOf(el) >= 0);
  let deck = scr.querySelector(':scope > .fwdk');
  if (!deck) {
    if (loose.length < 2) return;
    deck = document.createElement('section');
    deck.className = 'fwdk';
    deck.innerHTML = '<div class="fwdk-h"><h3>Na dnes</h3><span></span></div><div class="fwdk-t"></div><div class="fwdk-d" aria-hidden="true"></div>';
    loose[0].before(deck);
    const t = deck.querySelector('.fwdk-t');
    guard(t);
    let raf = 0;
    t.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => sync(deck)); }, { passive: true });
  }
  const t = deck.querySelector('.fwdk-t');
  // karta, ktorá už nie je výzvou (napr. vyplnený check-in), ide späť z karusela
  [...t.children].forEach(el => { if (kindOf(el) < 0) deck.after(el); });
  for (const el of loose) {
    const k = kindOf(el);
    const next = [...t.children].find(x => kindOf(x) > k);
    next ? next.before(el) : t.append(el);
  }
  sync(deck);
}

let raf = 0;
const app = document.getElementById('app');
if (app) new MutationObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(run); }).observe(app, { childList: true, subtree: true });
addEventListener('resize', () => { const d = document.querySelector('.fwdk'); if (d) sync(d); });
