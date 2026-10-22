// Pás „Objav v appke“ na obrazovke Dnes: funkcie, ktoré používateľ ešte nemá zapnuté, ako malé dlaždice vedľa seba.
// Je až pod jedlami, takže zápis jedla je hneď pod hlavným kruhom. Dlaždica zmizne, keď si funkciu zapneš alebo ju zavrieš.
import * as dx from './dxcore.js';
import * as hb from './habits.js';
import { openPlans } from './meals.js';
import { renderToday } from './today.js';
import { ctx } from './app.js';

const root = document.getElementById('app');
const ls = {
  get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
  set(k) { try { localStorage.setItem(k, '1'); } catch (_) { /* súkromný režim */ } },
};
// kľúče zavretia: nové (v2), aby sa pás ukázal aj tým, čo kedysi zavreli staré veľké karty Návyky a Zdravie
const KEY = { plan: 'fw_dc2_plan', habits: 'fw_dc2_habits', diet: 'fw_dc2_diet' };

const CSS = `
.dc{margin:2px 0 14px}
.dc-h{display:flex;align-items:baseline;justify-content:space-between;margin:0 2px 8px}
.dc-h h3{font-size:15px;letter-spacing:-.01em}
.dc-h span{font-size:12px;color:var(--muted)}
.dc-row{display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-padding:0 16px;margin:0 -16px;padding:0 16px 4px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.dc-row::-webkit-scrollbar{display:none}
.dc-t{position:relative;flex:0 0 156px;scroll-snap-align:start;display:flex;flex-direction:column;gap:3px;text-align:left;padding:12px 12px 13px;border-radius:18px;border:1px solid var(--line);background:linear-gradient(160deg,var(--tint) 0%,var(--card) 62%);color:var(--text);font:inherit;cursor:pointer;-webkit-appearance:none;appearance:none;text-decoration:none}
.dc-t:active{transform:scale(.97)}
.dc-t .dc-i{font-size:24px;line-height:1;margin-bottom:6px}
.dc-t b{font-size:14px;letter-spacing:-.01em}
.dc-t small{font-size:12px;color:var(--muted);line-height:1.3}
.dc-x{position:absolute;top:4px;right:4px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border:0;background:none;color:var(--muted);font-size:17px;line-height:1;cursor:pointer;border-radius:50%}
.dc-x:active{background:rgba(255,255,255,.06)}
`;
if (!document.getElementById('dc-css')) { const el = document.createElement('style'); el.id = 'dc-css'; el.textContent = CSS; document.head.appendChild(el); }

async function tiles() {
  const p = ctx.state.profile, uid = p.id, out = [];
  if (!ls.get(KEY.plan)) out.push({ k: 'plan', i: '🗓️', t: 'Hotový jedálniček', s: `Týždeň jedla na ${p.target_kcal || 'tvoje'} kcal, jedným ťuknutím`, tint: 'rgba(124,255,178,.14)', run: () => openPlans() });
  if (!ls.get(KEY.habits)) {
    try {
      await hb.load(uid);
      if (!hb.activeHabits().length) out.push({ k: 'habits', i: '🚭', t: 'Návyky', s: 'Fajčenie, vape alebo alkohol pod kontrolou', tint: 'rgba(255,200,87,.14)', run: () => hb.openSetup(null, () => renderToday()) });
    } catch (_) { /* tabuľky ešte nie sú, dlaždicu vynecháme */ }
  }
  if (!ls.get(KEY.diet)) {
    try {
      await dx.ensure(uid);
      if (!dx.anyMode(dx.cfg())) out.push({ k: 'diet', i: '🩺', t: 'Zdravie a diéta', s: 'Cukrovka, celiakia, alergie', tint: 'rgba(91,184,255,.14)', href: '#/rezim' });
    } catch (_) { /* bez režimov */ }
  }
  return out;
}

let busy = false;
const seen = new WeakSet();
async function inject() {
  if (busy || !root || !ctx.state?.profile) return;
  const meals = root.querySelector('.screen.td .meals');
  if (!meals || root.querySelector('#fw-discover') || seen.has(meals)) return;
  // každú vykreslenú obrazovku skontroluje len raz (inak by pri každej zmene na stránke znova volal databázu)
  seen.add(meals);
  busy = true;
  try {
    const list = await tiles();
    const m = root.querySelector('.screen.td .meals');
    if (!list.length || !m || root.querySelector('#fw-discover')) return;
    const el = document.createElement('section');
    el.id = 'fw-discover'; el.className = 'dc';
    el.innerHTML = `<div class="dc-h"><h3>Objav v appke</h3>${list.length > 2 ? '<span>potiahni →</span>' : ''}</div>
      <div class="dc-row">${list.map(t => t.href
        ? `<a class="dc-t" data-k="${t.k}" href="${t.href}" style="--tint:${t.tint}"><span class="dc-i">${t.i}</span><b>${t.t}</b><small>${t.s}</small><span class="dc-x" data-x="${t.k}" role="button" aria-label="Skryť">×</span></a>`
        : `<button class="dc-t" data-k="${t.k}" style="--tint:${t.tint}"><span class="dc-i">${t.i}</span><b>${t.t}</b><small>${t.s}</small><span class="dc-x" data-x="${t.k}" role="button" aria-label="Skryť">×</span></button>`).join('')}</div>`;
    // hneď pod jedlami (a pod rozborom dňa, ak je otvorený)
    (root.querySelector('.screen.td details.an') || m).after(el);
    el.querySelectorAll('.dc-t').forEach(b => b.addEventListener('click', e => {
      const x = e.target.closest('[data-x]');
      if (x) {
        e.preventDefault(); e.stopPropagation();
        ls.set(KEY[x.dataset.x]); b.remove();
        if (!el.querySelector('.dc-t')) el.remove();
        return;
      }
      const t = list.find(z => z.k === b.dataset.k);
      if (t?.run) t.run();
    }));
  } catch (_) { /* nepodstatné */ } finally { busy = false; }
}
if (root) { new MutationObserver(inject).observe(root, { childList: true, subtree: true }); inject(); }
