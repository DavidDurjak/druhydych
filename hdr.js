// Hlavička Dnes: veľké meno s malým pozdravom, dátum ako tabletka a týždeň ako „palivomery“.
// Každý deň je nádrž: výška výplňe je podiel zjedených kalórií z cieľa, zelená žiara = trafený cieľ, oranžová = prekročený, bodka = tréning.
import * as db from './data.js';
import { ctx } from './app.js';

const CSS = `
.td .tdh{align-items:center;margin-bottom:14px}
.td .tdh-g{display:flex;flex-direction:column;font-size:38px;line-height:1.02;letter-spacing:-.045em;font-weight:800}
.td .tdh-g .hg-s{font-size:14px;font-weight:600;letter-spacing:0;color:var(--muted);margin-bottom:5px}
.td .tdh-s{background:var(--card);border:1px solid var(--line);border-radius:99px;padding:6px 12px;margin-top:12px;font-size:13px}
.td .wk{margin:0 -4px 20px;padding:8px 4px;border-radius:26px;border:1px solid var(--line);background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.01))}
.td .wk .wk-d{gap:7px;padding:8px 0 9px;border-radius:20px;background:none;box-shadow:none}
.td .wk .wk-d .wk-r{display:none}
.td .wk .wk-d.sel{background:rgba(124,255,178,.08);box-shadow:inset 0 0 0 1px rgba(124,255,178,.38)}
.td .wk .wk-d.fut{opacity:1}
.fg{position:relative;display:block;width:26px;height:62px;border-radius:13px;overflow:hidden;background:rgba(255,255,255,.055);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);transition:box-shadow .4s}
.fg-f{position:absolute;left:0;right:0;bottom:0;height:0;border-radius:13px;background:linear-gradient(180deg,#a6ffcb,#34cf84);transition:height .85s cubic-bezier(.2,.9,.3,1)}
.wk-d.hit .fg{box-shadow:inset 0 0 0 1px rgba(124,255,178,.6),0 0 16px rgba(124,255,178,.32)}
.wk-d.over .fg-f{background:linear-gradient(180deg,#ffd37d,#ff8a4c)}
.wk-d.over .fg{box-shadow:inset 0 0 0 1px rgba(255,160,90,.5)}
.wk-d.fut .fg{background:none;box-shadow:none;border:1px dashed rgba(255,255,255,.16)}
.fg-n{font-size:14px;font-weight:800;color:var(--text);font-variant-numeric:tabular-nums;line-height:1}
.wk-d.fut .fg-n{color:var(--muted)}
.wk-d.sel .fg-n{color:var(--accent)}
.wk-d.now:not(.sel) .fg-n{text-decoration:underline;text-decoration-color:var(--accent);text-underline-offset:4px;text-decoration-thickness:2px}
.fg-t{display:block;width:5px;height:5px;border-radius:50%;background:transparent}
.wk-d.tr .fg-t{background:var(--accent);box-shadow:0 0 7px var(--accent)}
@media (prefers-reduced-motion:reduce){.fg-f{transition:none}}
`;
const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

const root = document.getElementById('app');
const cache = {};   // dátum -> { pct, tr }: pri ďalejšom vykreslení sa nádrže hneď ukážu a potom sa upresnia

function paint(wk) {
  wk.querySelectorAll('.wk-d').forEach(b => {
    const c = cache[b.dataset.d]; if (!c) return;
    const f = b.querySelector('.fg-f');
    b.classList.toggle('hit', c.pct >= 0.9 && c.pct <= 1.1);
    b.classList.toggle('over', c.pct > 1.1);
    b.classList.toggle('tr', !!c.tr);
    if (f) f.style.height = c.pct > 0 ? Math.max(9, Math.min(100, c.pct * 100)) + '%' : '0%';
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
  wk.querySelectorAll('.wk-d').forEach(b => {
    const lbl = b.querySelector('.wk-l')?.textContent || '', num = b.querySelector('.wk-r b')?.textContent || '';
    b.querySelector('.wk-r')?.insertAdjacentHTML('afterend', '<span class="fg"><i class="fg-f"></i></span><b class="fg-n"></b><i class="fg-t"></i>');
    b.querySelector('.fg-n').textContent = num;
    if (lbl) b.querySelector('.wk-l').textContent = lbl;
  });
  requestAnimationFrame(() => paint(wk));   // hneď z pamäte, ak už máme čísla
  fill(wk);
}

function head() {
  const g = document.querySelector('.td .tdh-g');
  if (!g || g.dataset.fg) return; g.dataset.fg = '1';
  const m = g.textContent.match(/^(Dobr[^,]*),\s*(.+)$/);
  if (!m) return;
  g.textContent = '';
  const s = document.createElement('span'); s.className = 'hg-s'; s.textContent = m[1];
  const n = document.createElement('span'); n.textContent = m[2];
  g.append(s, n);
}

function run() {
  const wk = document.querySelector('.td .wk'); if (wk) build(wk);
  head();
}
if (root) { new MutationObserver(run).observe(root, { childList: true, subtree: true }); run(); }
