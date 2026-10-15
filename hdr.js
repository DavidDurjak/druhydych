// Týždenný pás na obrazovke Dnes: pôvodné okrúhle dni, ktoré navyše ukážu, ako ti deň vyšiel.
// Trafený cieľ = plný zelený „kotúč“, prekročený = oranžový, tréning = malá činka, po sebe idúce trafené dni spojí reťaz.
import * as db from './data.js';
import { ctx } from './app.js';

const DUMB = '<svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><path d="M3 9v6M7 6v12M17 6v12M21 9v6M7 12h10"/></svg>';
const CSS = `
.td .wk-r{width:38px;height:38px}
.td .wk-r svg{width:100%;height:100%;z-index:1}
.td .wk-r b{z-index:2}
.wk-d.hit .wk-r::before{content:'';position:absolute;inset:3px;border-radius:50%;z-index:1;background:radial-gradient(circle at 35% 25%,#e4fff0,#7dffb8 55%,#3fe08f);box-shadow:0 0 18px rgba(124,255,178,.55)}
.wk-d.hit,.wk-d.fut.hit{opacity:1}
.wk-d.hit .rg-fill{stroke:#b9ffd9}
.wk-d.hit .wk-r b{color:var(--accent-ink);font-weight:800}
.wk-d.over .wk-r b{color:#ffb35c}
.wk-d.over .rg-fill{stroke:#ff9a4c}
.wk-d.now:not(.hit) .wk-r{filter:drop-shadow(0 0 6px rgba(124,255,178,.35))}
.wk-d.chain .wk-r::after{content:'';position:absolute;z-index:0;left:50%;top:calc(50% - 1.5px);width:var(--cw,48px);height:3px;border-radius:2px;background:linear-gradient(90deg,#b9ffd9,#7dffb8);opacity:.9;box-shadow:0 0 8px rgba(124,255,178,.5)}
.wk-d .fg-t{display:none;position:absolute;z-index:3;top:-4px;right:-4px;width:15px;height:15px;border-radius:50%;place-items:center;background:var(--card-2);color:var(--accent);box-shadow:0 0 0 1.5px var(--accent)}
.wk-d.tr .fg-t{display:grid}
`;
const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

const root = document.getElementById('app');
const cache = {};   // dátum -> { pct, tr }: pri ďalšom vykreslení sa stav ukáže hneď a potom sa upresní

function paint(wk) {
  const bs = [...wk.querySelectorAll('.wk-d')];
  const hit = bs.map(b => { const c = cache[b.dataset.d]; return !!c && c.pct >= 0.85 && c.pct <= 1.1; });
  bs.forEach((b, i) => {
    const c = cache[b.dataset.d]; if (!c) return;
    b.classList.toggle('hit', hit[i]);
    b.classList.toggle('over', c.pct > 1.1);
    b.classList.toggle('tr', !!c.tr);
    b.classList.toggle('chain', hit[i] && !!hit[i + 1]);
    b.style.setProperty('--cw', b.offsetWidth + 'px');
  });
}

async function fill(wk) {
  const p = ctx.state?.profile; if (!p) return;
  const ds = [...wk.querySelectorAll('.wk-d')].map(b => b.dataset.d); if (!ds.length) return;
  const [byDay, logs] = await Promise.all([
    db.foodByDay(p.id, ds[0], ds[ds.length - 1]).catch(() => ({})),
    db.listWorkoutLogs(p.id, ds[0]).catch(() => []),
  ]);
  const done = new Set((logs || []).filter(l => l.done).map(l => l.date));
  ds.forEach(d => { cache[d] = { pct: p.target_kcal ? (byDay[d]?.kcal || 0) / p.target_kcal : 0, tr: done.has(d) }; });
  if (wk.isConnected) paint(wk);
}

function build(wk) {
  if (wk.dataset.fg) return; wk.dataset.fg = '1';
  wk.querySelectorAll('.wk-d .wk-r').forEach(r => r.insertAdjacentHTML('beforeend', `<i class="fg-t">${DUMB}</i>`));
  requestAnimationFrame(() => paint(wk));   // hneď z pamäte, ak už máme čísla
  fill(wk);
}

// nadpis je vždy pozdrav podľa denného času a meno, nech je vybraný ktorýkoľvek deň (dátum je pod ním)
function greet() {
  const hr = new Date().getHours();
  return hr < 5 ? 'Dobrú noc' : hr < 10 ? 'Dobré ráno' : hr < 13 ? 'Dobrý deň' : hr < 18 ? 'Dobré popoludnie' : 'Dobrý večer';
}
function head() {
  const g = document.querySelector('.td .tdh-g'), n = ctx.state?.profile?.name?.split(' ')[0];
  if (!g || g.dataset.fg || !n) return;
  g.dataset.fg = '1'; g.textContent = `${greet()}, ${n}`;
}

function run() { const wk = document.querySelector('.td .wk'); if (wk) build(wk); head(); }
if (root) { new MutationObserver(run).observe(root, { childList: true, subtree: true }); run(); }
