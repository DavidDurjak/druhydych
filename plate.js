// Tanier (ako v MacroFactor): po pridaní jedla na obrazovke Jedlo appka už neskáče na Dnes, ostaneš vo vyhľadávaní a pridáš ďalšie.
// Nad spodnou lištou sa ukáže tanier so súčtom toho, čo si práve pridal, a so zvyškom dňa. Ťuknutím sa rozbalí zoznam
// (každú položku vieš hneď vrátiť), Hotovo ťa vráti na Dnes.
// Vypnutie: odstrániť plate.js z index.html; foods.js sa potom správa ako predtým (po pridaní skočí na Dnes).
import * as db from './data.js';
import { ctx } from './app.js';

const CSS = `
.gtp{position:fixed;z-index:58;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom) + 78px);max-width:536px;margin:0 auto;
  border-radius:24px;background:rgba(20,26,33,.78);-webkit-backdrop-filter:blur(22px) saturate(1.5);backdrop-filter:blur(22px) saturate(1.5);
  border:1px solid rgba(124,255,178,.22);box-shadow:0 18px 40px -18px rgba(0,0,0,.8),0 0 0 1px rgba(255,255,255,.03) inset,0 10px 30px -20px rgba(124,255,178,.6);
  color:var(--text);transform:translateY(16px) scale(.98);opacity:0;transition:transform .35s cubic-bezier(.2,1.2,.3,1),opacity .25s,background .25s;overflow:hidden}
.gtp.on{transform:none;opacity:1}
.gtp.open{background:rgba(18,23,30,.95)}
.gtp-row{display:flex;align-items:center;gap:12px;padding:10px 10px 10px 12px}
.gtp-main{flex:1;min-width:0;display:flex;align-items:center;gap:12px;background:none;border:0;padding:0;color:var(--text);font:inherit;text-align:left;cursor:pointer}
.gtp-ic{position:relative;flex:none;width:42px;height:42px;border-radius:50%;display:grid;place-items:center;
  background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.22),rgba(255,255,255,0) 45%),radial-gradient(circle,#2A3A33,#16201C);
  box-shadow:inset 0 0 0 1.5px rgba(124,255,178,.35),0 0 16px -4px rgba(124,255,178,.55)}
.gtp-ic svg{width:24px;height:24px;stroke:#9DFFC8;fill:none;stroke-width:1.7;stroke-linecap:round}
.gtp-ic b{position:absolute;top:-4px;right:-5px;min-width:20px;height:20px;padding:0 5px;border-radius:99px;display:grid;place-items:center;
  font-size:11.5px;font-weight:800;color:#06140C;background:linear-gradient(135deg,#B8FFD6,#45E39A);box-shadow:0 0 0 2px rgba(20,26,33,.9)}
.gtp-ic b.pop{animation:gtpPop .45s cubic-bezier(.2,1.6,.4,1)}
@keyframes gtpPop{0%{transform:scale(.4)}100%{transform:none}}
.gtp-t{min-width:0;display:grid;gap:1px}
.gtp-t b{font-size:15px;font-weight:800;letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gtp-t span{font-size:12.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums}
.gtp-t span i{font-style:normal;color:#9DFFC8;font-weight:700}
.gtp-done{flex:none;height:40px;padding:0 16px;border-radius:99px;border:0;font:inherit;font-size:14px;font-weight:800;color:#06140C;
  background:linear-gradient(135deg,#9DFFC8,#3FE0A8);box-shadow:0 8px 20px -10px rgba(124,255,178,.9);cursor:pointer}
.gtp-done:active,.gtp-main:active{transform:scale(.97)}
.gtp-list{display:grid;grid-template-rows:0fr;transition:grid-template-rows .3s ease}
.gtp.open .gtp-list{grid-template-rows:1fr}
.gtp-list>div{overflow:hidden}
.gtp-it{display:flex;align-items:center;gap:10px;margin:0 12px;padding:10px 0;border-top:1px solid rgba(255,255,255,.07)}
.gtp-it div{flex:1;min-width:0}
.gtp-it strong{display:block;font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gtp-it small{font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}
.gtp-it em{font-style:normal;font-size:14px;font-weight:800;font-variant-numeric:tabular-nums}
.gtp-it button{flex:none;width:30px;height:30px;border-radius:50%;border:0;background:rgba(255,255,255,.07);color:var(--muted);font-size:17px;line-height:1;cursor:pointer}
.gtp-sum{display:flex;gap:6px;margin:2px 12px 12px;padding-top:10px;border-top:1px solid rgba(255,255,255,.07)}
.gtp-sum span{flex:1;padding:8px 6px;border-radius:12px;background:rgba(255,255,255,.04);text-align:center;font-size:11px;color:var(--muted)}
.gtp-sum span b{display:block;font-size:15px;font-weight:800;color:var(--c,var(--text));font-variant-numeric:tabular-nums}
body.gtp-on .al-pill{display:none!important}
body.gtp-on #app .screen{padding-bottom:calc(var(--nav-h) + env(safe-area-inset-bottom) + 110px)}
@media (prefers-reduced-motion:reduce){.gtp,.gtp-list,.gtp-ic b.pop{transition:none;animation:none}}
html[data-theme=light] .gtp{background:rgba(255,255,255,.86);border-color:rgba(14,159,98,.25)}
html[data-theme=light] .gtp-ic{background:#E8F7EF}
html[data-theme=light] .gtp-ic svg{stroke:#0E9F62}
html[data-theme=light] .gtp-t span i{color:#0E9F62}
`;
const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

const PLATE = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="7.5"/><circle cx="12" cy="13" r="4.2" opacity=".55"/><path d="M3 4v5.5M3 7h0M21 4v16"/></svg>';
const r0 = n => Math.round(Number(n) || 0);
const fmt = n => r0(n).toLocaleString('sk-SK');
const onJedlo = () => (location.hash || '#/').split('?')[0] === '#/jedlo';
const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cnt = n => `${n} ${n === 1 ? 'položka' : n < 5 ? 'položky' : 'položiek'}`;

let sess = null; // { date, ready: Promise<Set>, rows: [] }
let el = null;

// afterAdd: tanier vznikol až po prvom pridaní (appka sa ešte načítavala alebo sa zmenil deň), takže posledný zápis dňa
// (zoznam je zoradený podľa času) je práve pridané jedlo a do základu sa nepočíta
function start(afterAdd = false) {
  const p = ctx.state?.profile; if (!p?.id) return null;
  const date = ctx.state.date;
  sess = { uid: p.id, date, rows: [], ready: db.listFood(p.id, date).then(r => new Set((afterAdd ? r.slice(0, -1) : r).map(x => x.id))).catch(() => new Set()) };
  return sess;
}
function end() {
  sess = null;
  if (el) { const e = el; el = null; e.classList.remove('on'); setTimeout(() => e.remove(), 300); }
  document.body.classList.remove('gtp-on');
}

async function refresh(pop) {
  if (!sess) return;
  const base = await sess.ready;
  const all = await db.listFood(sess.uid, sess.date).catch(() => null); if (!all || !sess) return;
  sess.rows = all.filter(r => !base.has(r.id));
  sess.day = all.reduce((a, r) => a + (Number(r.kcal) || 0), 0);
  draw(pop);
}

function draw(pop) {
  if (!sess || !sess.rows.length) { if (el) { el.classList.remove('on'); document.body.classList.remove('gtp-on'); } return; }
  const p = ctx.state?.profile || {};
  const t = sess.rows.reduce((a, r) => ({ k: a.k + (Number(r.kcal) || 0), p: a.p + (Number(r.protein) || 0), c: a.c + (Number(r.carbs) || 0), f: a.f + (Number(r.fat) || 0) }), { k: 0, p: 0, c: 0, f: 0 });
  const left = (Number(p.target_kcal) || 0) - (sess.day || 0);
  const open = el?.classList.contains('open');
  if (!el) {
    el = document.createElement('div'); el.className = 'gtp'; el.setAttribute('role', 'status');
    document.body.appendChild(el);
    el.addEventListener('click', onClick);
  }
  el.innerHTML = `<div class="gtp-list"><div>${sess.rows.map(r => `<div class="gtp-it"><div><strong>${h(r.name)}</strong><small>${r.portion && r.qty ? `${String(Math.round(r.qty * 10) / 10).replace('.', ',')}× ${h(r.portion)}, ` : ''}${fmt(r.grams)} g</small></div><em>${fmt(r.kcal)}</em><button type="button" data-undo="${h(r.id)}" aria-label="Vrátiť ${h(r.name)}">×</button></div>`).join('')}
      <div class="gtp-sum"><span style="--c:#9DFFC8"><b>${fmt(t.p)} g</b>bielkoviny</span><span style="--c:#7CC4FF"><b>${fmt(t.c)} g</b>sacharidy</span><span style="--c:#FFD27A"><b>${fmt(t.f)} g</b>tuky</span></div></div></div>
    <div class="gtp-row"><button type="button" class="gtp-main" aria-expanded="${open ? 'true' : 'false'}"><span class="gtp-ic">${PLATE}<b class="${pop ? 'pop' : ''}">${sess.rows.length}</b></span>
      <span class="gtp-t"><b>Na tanieri ${cnt(sess.rows.length)}</b><span><i>+${fmt(t.k)} kcal</i> · ${left >= 0 ? `zostáva ${fmt(left)}` : `${fmt(-left)} nad cieľ`}</span></span></button>
      <button type="button" class="gtp-done">Hotovo</button></div>`;
  if (open) el.classList.add('open');
  document.body.classList.add('gtp-on');
  requestAnimationFrame(() => el && el.classList.add('on'));
}

async function onClick(e) {
  if (e.target.closest('.gtp-done')) { end(); location.hash = '#/'; return; }
  const u = e.target.closest('[data-undo]');
  if (u) {
    u.disabled = true;
    const id = sess?.rows.find(r => String(r.id) === u.dataset.undo)?.id;
    try { if (id != null) await db.deleteFood(id); ctx.toast?.('Vrátené'); } catch (err) { ctx.toast?.(err.message || 'Nepodarilo sa vrátiť', true); }
    await refresh(); if (sess && !sess.rows.length) el?.classList.remove('open');
    return;
  }
  if (e.target.closest('.gtp-main')) { el.classList.toggle('open'); el.querySelector('.gtp-main')?.setAttribute('aria-expanded', el.classList.contains('open')); }
}

// foods.js po pridaní jedla zavolá túto funkciu; true = ostaň na obrazovke Jedlo (tanier to prevezme)
window.__gtPlate = () => {
  if (!onJedlo()) return false;
  if (!sess || sess.date !== ctx.state?.date) start(true);
  if (!sess) return false;
  if (navigator.vibrate) navigator.vibrate(10);
  refresh(true);
  return true;
};

function onRoute() {
  if (!onJedlo()) { if (sess) end(); return; }
  if (!sess || sess.date !== ctx.state?.date) { if (sess) end(); start(); }
}
addEventListener('hashchange', onRoute);
onRoute();
