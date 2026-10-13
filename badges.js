// Odznaky: kategórie s úrovňami (bronz, striebro, zlato, diamant), pokrok k ďalšiemu odznaku, úroveň hráča a oslava nového odznaku.
// Samo nahradí starú kartu Odznaky na obrazovke Pokrok, bez zásahu do progress.js.
import * as db from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';

const root = document.getElementById('app');
const diff = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
const fmt = v => (Math.round(v * 10) / 10).toLocaleString('sk-SK', { maximumFractionDigits: 1 });
const MAT = ['bronze', 'bronze', 'silver', 'silver', 'gold', 'diamond'];
const MAT_NAME = { bronze: 'Bronz', silver: 'Striebro', gold: 'Zlato', diamond: 'Diamant' };
const PTS = [10, 15, 25, 40, 70, 120];
const LEVELS = [
  [0, 'Nováčik'], [30, 'Začiatočník'], [80, 'Pokračovateľ'], [150, 'Vytrvalec'], [250, 'Bojovník'], [380, 'Pretekár'],
  [550, 'Majster'], [780, 'Šampión'], [1080, 'Elita'], [1450, 'Legenda'], [1900, 'Mýtus'],
];

// kategórie: key, ikona, názov, popis, jednotka (skloňovanie 1 / 2-4 / 5+), prahy, názvy odznakov
const CATS = [
  { k: 'days', i: '📅', t: 'Zapisovanie', d: 'dni so zapísaným jedlom', u: ['deň', 'dni', 'dní'], th: [1, 7, 30, 100, 200, 365], n: ['Prvý krok', 'Celý týždeň', 'Mesiac zápisov', 'Stovka dní', 'Dvojstovka', 'Celý rok'] },
  { k: 'streak', i: '🔥', t: 'Séria', d: 'dní v rade bez vynechania', u: ['deň', 'dni', 'dní'], th: [3, 7, 14, 30, 60, 100], n: ['Rozbeh', 'Týždeň v kuse', 'Dva týždne', 'Železná séria', 'Neotrasiteľný', 'Stovka v rade'] },
  { k: 'perfect', i: '⭐', t: 'Dokonalé dni', d: 'kalórie aj bielkoviny v cieli v ten istý deň', u: ['deň', 'dni', 'dní'], th: [1, 3, 7, 15, 30, 60], n: ['Dokonalý deň', 'Hattrick', 'Týždeň dokonalosti', 'Perfekcionista', 'Mesiac bez chyby', 'Legenda'] },
  { k: 'kcal', i: '🎯', t: 'Kalórie v cieli', d: 'dni v rozmedzí 10 % od cieľa', u: ['deň', 'dni', 'dní'], th: [1, 5, 15, 30, 60, 100], n: ['Presný zásah', 'Päť zásahov', 'Pod kontrolou', 'Mesiac presnosti', 'Strelec', 'Odstrelovač'] },
  { k: 'protein', i: '💪', t: 'Bielkoviny', d: 'dni so splneným cieľom bielkovín', u: ['deň', 'dni', 'dní'], th: [1, 5, 15, 30, 60, 100], n: ['Prvé bielkoviny', 'Päť dní', 'Svalový základ', 'Mesiac bielkovín', 'Stavba tela', 'Bielkovinový boh'] },
  { k: 'train', i: '🏋️', t: 'Tréning', d: 'dokončené tréningy', u: ['tréning', 'tréningy', 'tréningov'], th: [1, 5, 10, 25, 50, 100], n: ['Prvý tréning', 'Rozcvičený', 'Desiatka', 'Železo', 'Pravidelný hosť', 'Stovka'] },
  { k: 'weeks', i: '📆', t: 'Silné týždne', d: 'týždne s aspoň 5 zapísanými dňami', u: ['týždeň', 'týždne', 'týždňov'], th: [1, 2, 4, 8, 12, 24], n: ['Silný týždeň', 'Dva silné', 'Silný mesiac', 'Dva mesiace', 'Kvartál', 'Pol roka'] },
  { k: 'water', i: '💧', t: 'Voda', d: 'dni so splneným pitným režimom', u: ['deň', 'dni', 'dní'], th: [1, 5, 15, 30, 60, 100], n: ['Prvý pohár', 'Hydratovaný', 'Dva týždne vody', 'Mesiac vody', 'Studnica', 'Oceán'] },
  { k: 'meals', i: '🍽️', t: 'Zapísané jedlá', d: 'zapísané jedlá celkovo', u: ['jedlo', 'jedlá', 'jedál'], th: [10, 50, 100, 250, 500, 1000], n: ['Prvá desiatka', 'Päťdesiatka', 'Stovka jedál', 'Gurmán', 'Majster zápisu', 'Tisícka'] },
  { k: 'weigh', i: '⚖️', t: 'Váženie', d: 'zapísané váženia', u: ['váženie', 'váženia', 'vážení'], th: [1, 5, 15, 30, 60, 100], n: ['Prvé váženie', 'Päť vážení', 'Sledovač', 'Mesiac váženia', 'Analytik', 'Stovka vážení'] },
  { k: 'lose', i: '📉', t: 'Zmena váhy', d: 'kg dole od štartu', u: ['kg', 'kg', 'kg'], th: [1, 2, 5, 10, 15, 20], n: ['Prvé kilo', 'Dve kilá', 'Päť kíl', 'Desiatka', 'Premena', 'Nový človek'], only: 'lose', dec: true },
  { k: 'gain', i: '📈', t: 'Zmena váhy', d: 'kg hore od štartu', u: ['kg', 'kg', 'kg'], th: [1, 2, 4, 6, 8, 10], n: ['Prvé kilo', 'Dve kilá', 'Štyri kilá', 'Šesť kíl', 'Osem kíl', 'Desať kíl'], only: 'gain', dec: true },
];
const unit = (c, n) => c.u[n === 1 ? 0 : n >= 2 && n <= 4 ? 1 : 2];

async function fetchAll(table, cols, uid, extra) {
  const out = [];
  for (let from = 0; from < 20000; from += 1000) {
    let q = db.sb.from(table).select(cols).eq('user_id', uid);
    if (extra) q = extra(q);
    const { data, error } = await q.order('id').range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export function bestRun(dates) {
  const s = [...new Set(dates)].sort(); let best = 0, cur = 0, prev = null;
  for (const d of s) { cur = prev && diff(prev, d) === 1 ? cur + 1 : 1; best = Math.max(best, cur); prev = d; }
  return best;
}

// čistý výpočet z dát: vráti hodnoty pre každú kategóriu
export function metrics(p, food, checks, logs, weights) {
  const T = Number(p.target_kcal) || 0, TP = Number(p.target_protein) || 0, wg = Number(p.water_goal) || 8;
  const byDay = {};
  food.forEach(r => { const d = byDay[r.date] = byDay[r.date] || { kcal: 0, protein: 0 }; d.kcal += Number(r.kcal) || 0; d.protein += Number(r.protein) || 0; });
  const foodDays = Object.keys(byDay);
  const kcalOk = d => T > 0 && Math.abs(byDay[d].kcal - T) <= T * 0.1;
  const protOk = d => TP > 0 && byDay[d].protein >= TP * 0.9;
  const doneLogs = logs.filter(l => l.done);
  const act = new Set([...foodDays, ...checks.map(c => c.date), ...weights.map(w => w.date), ...doneLogs.map(l => l.date)]);
  const weekCount = {};
  foodDays.forEach(d => { const w = calc.weekStart(d); weekCount[w] = (weekCount[w] || 0) + 1; });
  const pts = weights.map(w => ({ date: w.date, weight: Number(w.weight_kg) }));
  const tr = calc.trend(pts), last = tr[tr.length - 1];
  const startW = Number(p.start_weight || pts[0]?.weight || 0);
  const delta = last && startW ? last.trend - startW : 0;
  return {
    days: foodDays.length,
    streak: bestRun([...act]),
    cur: calc.streak([...act]),
    perfect: foodDays.filter(d => kcalOk(d) && protOk(d)).length,
    kcal: foodDays.filter(kcalOk).length,
    protein: foodDays.filter(protOk).length,
    train: doneLogs.length,
    weeks: Object.values(weekCount).filter(n => n >= 5).length,
    water: checks.filter(c => Number(c.water) >= wg).length,
    meals: food.length,
    weigh: weights.length,
    lose: Math.max(0, -delta),
    gain: Math.max(0, delta),
  };
}

export function evaluate(p, m) {
  const cats = CATS.filter(c => !c.only || c.only === p.goal).map(c => {
    const v = m[c.k] || 0;
    const tiers = c.th.map((t, i) => ({ t, name: c.n[i], mat: MAT[i], got: v >= t, pts: PTS[i], i }));
    const got = tiers.filter(x => x.got).length, next = tiers[got] || null, prevT = got ? c.th[got - 1] : 0;
    const frac = next ? Math.max(0, Math.min(1, (v - prevT) / (next.t - prevT))) : 1;
    return { c, v, tiers, got, next, frac };
  });
  const xp = cats.reduce((a, x) => a + x.tiers.filter(t => t.got).reduce((s, t) => s + t.pts, 0), 0);
  let lv = 0; LEVELS.forEach(([t], i) => { if (xp >= t) lv = i; });
  const nextLv = LEVELS[lv + 1] || null;
  const total = cats.reduce((a, x) => a + x.tiers.length, 0), have = cats.reduce((a, x) => a + x.got, 0);
  return { cats, xp, lv, lvName: LEVELS[lv][1], lvFrom: LEVELS[lv][0], nextLv, total, have };
}

const CSS = `
.bx-lv{display:flex;align-items:center;gap:14px;padding:14px;border-radius:20px;background:radial-gradient(120% 120% at 0% 0%,rgba(255,200,87,.14),rgba(255,200,87,0) 60%),var(--bg-2);margin-bottom:14px}
.bx-lvn{flex:0 0 auto;width:58px;height:58px;border-radius:50%;display:grid;place-items:center;font-size:24px;font-weight:800;color:#3A2400;background:radial-gradient(circle at 30% 25%,#FFE08A,#FFB547 60%,#B9741A);box-shadow:inset 0 0 0 2px rgba(255,255,255,.3),0 6px 18px rgba(255,181,71,.3)}
.bx-lvt{flex:1;min-width:0}
.bx-lvt b{display:block;font-size:17px}
.bx-lvt span{display:block;font-size:12.5px;color:var(--muted);margin-top:2px}
.bx-xp{height:7px;border-radius:99px;background:var(--track);margin-top:9px;overflow:hidden}
.bx-xp i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#FFB547,#FFE08A);transition:width .8s cubic-bezier(.2,.8,.2,1)}
.bx-sec{font-size:13px;font-weight:700;color:var(--muted);margin:16px 2px 8px}
.bx-up{display:flex;flex-direction:column;gap:8px}
.bx-u{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:16px;background:var(--bg-2)}
.bx-u div{flex:1;min-width:0}
.bx-u b{display:block;font-size:14.5px}
.bx-u span{display:block;font-size:12.5px;color:var(--muted);margin-top:1px}
.bx-u em{font-style:normal;font-weight:800;color:var(--accent);font-size:13px;white-space:nowrap}
.bx-cat{padding:14px 0 4px;border-top:1px solid var(--line);margin-top:12px}
.bx-cat:first-of-type{border-top:0;margin-top:0}
.bx-ch{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.bx-ch>span{font-size:20px}
.bx-ch div{flex:1;min-width:0}
.bx-ch h4{margin:0;font-size:15px;font-weight:700}
.bx-ch p{margin:1px 0 0;font-size:12px;color:var(--muted)}
.bx-ch b{font-size:20px;font-variant-numeric:tabular-nums;letter-spacing:-0.03em}
.bx-med{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px}
.bx-md{display:flex;flex-direction:column;align-items:center;gap:5px;min-width:0;background:none;border:0;padding:0;cursor:pointer}
.bx-m{position:relative;width:100%;max-width:46px;aspect-ratio:1;border-radius:50%;display:grid;place-items:center;font-size:19px;line-height:1}
.bx-m.bronze{background:radial-gradient(circle at 30% 25%,#F3BE8A,#B8692F 60%,#7A3F14);box-shadow:inset 0 0 0 2px rgba(255,255,255,.28),0 4px 12px rgba(184,105,47,.35)}
.bx-m.silver{background:radial-gradient(circle at 30% 25%,#FFFFFF,#AAB6C5 60%,#6F7B8A);box-shadow:inset 0 0 0 2px rgba(255,255,255,.4),0 4px 12px rgba(170,182,197,.3)}
.bx-m.gold{background:radial-gradient(circle at 30% 25%,#FFF0B0,#FFB547 60%,#B9741A);box-shadow:inset 0 0 0 2px rgba(255,255,255,.4),0 4px 14px rgba(255,181,71,.4)}
.bx-m.diamond{background:radial-gradient(circle at 30% 25%,#DDFFF6,#5BE0D2 55%,#3D8BFF);box-shadow:inset 0 0 0 2px rgba(255,255,255,.45),0 4px 16px rgba(91,224,210,.45)}
.bx-m.lock{background:var(--bg-2);box-shadow:inset 0 0 0 1.5px var(--line)}
.bx-m.lock span{filter:grayscale(1);opacity:.28}
.bx-m.nx{background:conic-gradient(var(--accent) calc(var(--p) * 1%),var(--track) 0)}
.bx-m.nx::before{content:'';position:absolute;inset:3.5px;border-radius:50%;background:var(--card)}
.bx-m.nx span{position:relative;filter:grayscale(.6);opacity:.75}
.bx-m.new{animation:bxpop .9s cubic-bezier(.2,1.4,.4,1) 2}
@keyframes bxpop{0%{transform:scale(.6)}60%{transform:scale(1.18)}100%{transform:scale(1)}}
.bx-t{font-size:11px;color:var(--muted);font-weight:700;font-variant-numeric:tabular-nums}
.bx-md.got .bx-t{color:var(--text)}
.bx-pg{height:6px;border-radius:99px;background:var(--track);margin:12px 0 0;overflow:hidden}
.bx-pg i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--accent),#3FD5C4)}
.bx-nx{margin:7px 0 10px;font-size:12.5px;color:var(--muted)}
.bx-nx b{color:var(--text)}
.bx-load{height:120px;border-radius:16px;background:var(--bg-2);opacity:.6}
@media (prefers-reduced-motion:reduce){.bx-m.new{animation:none}.bx-xp i{transition:none}}
`;
if (!document.getElementById('bx-css')) { const s = document.createElement('style'); s.id = 'bx-css'; s.textContent = CSS; document.head.appendChild(s); }

const medal = (c, t, st, p, isNew) => {
  const cls = t.got ? t.mat : st.next === t ? 'nx lock' : 'lock';
  return `<button class="bx-md ${t.got ? 'got' : ''}" data-bx="${c.k}:${t.i}" aria-label="${t.name}${t.got ? ', získaný' : ', ešte nezískaný'}"><span class="bx-m ${cls}${isNew ? ' new' : ''}" style="--p:${Math.round(p)}"><span>${c.i}</span></span><span class="bx-t">${t.t}</span></button>`;
};

const need = (st) => {
  const left = st.next.t - st.v, c = st.c;
  return `ešte ${st.c.dec ? fmt(left) : Math.ceil(left)} ${unit(c, c.dec ? 5 : Math.ceil(left))}`;
};

function html(ev, newKeys) {
  const nexts = ev.cats.filter(s => s.next).sort((a, b) => b.frac - a.frac).slice(0, 3);
  const lvPct = ev.nextLv ? Math.round((ev.xp - ev.lvFrom) / (ev.nextLv[0] - ev.lvFrom) * 100) : 100;
  const up = nexts.length ? `<div class="bx-sec">Ďalšie odznaky</div><div class="bx-up">${nexts.map(s => `<div class="bx-u"><span class="bx-m nx lock" style="--p:${Math.round(s.frac * 100)};width:46px;flex:0 0 auto"><span>${s.c.i}</span></span><div><b>${s.next.name}</b><span>${s.c.t}: ${s.c.dec ? fmt(s.v) : Math.floor(s.v)} z ${s.next.t}</span></div><em>${need(s)}</em></div>`).join('')}</div>` : '';
  const cats = ev.cats.map(s => {
    const c = s.c;
    const nextLine = s.next ? `<div class="bx-pg"><i style="width:${Math.round(s.frac * 100)}%"></i></div><p class="bx-nx">Ďalší: <b>${s.next.name}</b>, ${need(s)}</p>` : `<p class="bx-nx" style="margin-top:12px"><b>Hotovo.</b> Máš všetky odznaky v tejto kategórii.</p>`;
    return `<section class="bx-cat"><div class="bx-ch"><span>${c.i}</span><div><h4>${c.t}</h4><p>${c.d}</p></div><b>${c.dec ? fmt(s.v) : Math.floor(s.v)}</b></div><div class="bx-med">${s.tiers.map(t => medal(c, t, s, s.next === t ? s.frac * 100 : 0, newKeys.has(c.k + ':' + t.i))).join('')}</div>${nextLine}</section>`;
  }).join('');
  return `<div class="pg-row"><h3>Odznaky</h3><span class="pg-chip">${ev.have} z ${ev.total}</span></div>
    <div class="bx-lv"><div class="bx-lvn">${ev.lv + 1}</div><div class="bx-lvt"><b>${ev.lvName}</b><span>${ev.nextLv ? `${ev.xp} XP, do ďalšej úrovne ešte ${ev.nextLv[0] - ev.xp} XP (${ev.nextLv[1]})` : `${ev.xp} XP, najvyššia úroveň`}</span><div class="bx-xp"><i style="width:${lvPct}%"></i></div></div></div>
    ${up}<div class="bx-sec">Všetky kategórie</div>${cats}`;
}

// ---------- načítanie a cache ----------
let cache = null, busy = false;
async function load(p) {
  if (cache && cache.uid === p.id && Date.now() - cache.at < 45000) return cache.ev;
  const [food, checks, logs, weights] = await Promise.all([
    fetchAll('food_logs', 'id,date,kcal,protein', p.id),
    fetchAll('checkins', 'id,date,water', p.id).catch(() => []),
    fetchAll('workout_logs', 'id,date,done', p.id).catch(() => []),
    db.listWeights(p.id).catch(() => []),
  ]);
  const ev = evaluate(p, metrics(p, food, checks, logs, weights));
  cache = { uid: p.id, at: Date.now(), ev };
  return ev;
}

const KEY = 'dd_bx';
const store = {
  get() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (_) { return null; } },
  set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (_) { /* nič */ } },
};
// nové odznaky od posledného zobrazenia (prvýkrát len uložiť, aby sa nezobrazili všetky staré naraz)
function fresh(ev) {
  const all = ev.cats.flatMap(s => s.tiers.filter(t => t.got).map(t => ({ key: s.c.k + ':' + t.i, name: t.name })));
  const seen = store.get();
  store.set(all.map(a => a.key));
  if (!Array.isArray(seen)) return [];
  const has = new Set(seen);
  return all.filter(a => !has.has(a.key));
}
function celebrate(list) {
  if (!list.length || !ctx.toast) return;
  ctx.toast(list.length === 1 ? `🏅 Nový odznak: ${list[0].name}` : `🏅 Nový odznak: ${list[0].name} a ďalšie ${list.length - 1}`);
}

async function inject() {
  if (busy || !root || !ctx.state?.profile) return;
  const old = root.querySelector('.screen.pg .pg-badges');
  if (old && !old.closest('[data-bx]')) {
    const card = old.closest('.pg-card');
    if (!card) return;
    busy = true;
    card.dataset.bx = '1';
    card.innerHTML = '<div class="pg-row"><h3>Odznaky</h3></div><div class="bx-load"></div>';
    try {
      const ev = await load(ctx.state.profile);
      const nw = fresh(ev), keys = new Set(nw.map(n => n.key));
      if (card.isConnected) {
        card.innerHTML = html(ev, keys);
        card.querySelectorAll('[data-bx]').forEach(b => b.onclick = () => {
          const [k, i] = b.dataset.bx.split(':'); const s = ev.cats.find(x => x.c.k === k); const t = s?.tiers[Number(i)];
          if (t && ctx.toast) ctx.toast(`${t.name} (${MAT_NAME[t.mat]}): ${s.c.d}, ${t.t}${t.got ? ', získané' : `, ${need({ ...s, next: t })}`}`);
        });
      }
      celebrate(nw);
    } catch (_) { if (card.isConnected) card.innerHTML = '<div class="pg-row"><h3>Odznaky</h3></div><p class="pg-empty">Odznaky sa nepodarilo načítať.</p>'; }
    finally { busy = false; }
    return;
  }
  // na obrazovke Dnes len ticho skontrolovať nové odznaky (najviac raz za 20 minút)
  if (root.querySelector('.screen.td')) {
    let ts = 0; try { ts = Number(sessionStorage.getItem('dd_bx_ts')) || 0; } catch (_) { /* nič */ }
    if (Date.now() - ts < 20 * 60000) return;
    try { sessionStorage.setItem('dd_bx_ts', String(Date.now())); } catch (_) { /* nič */ }
    busy = true;
    try { celebrate(fresh(await load(ctx.state.profile))); } catch (_) { /* nepodstatné */ } finally { busy = false; }
  }
}
if (root) { new MutationObserver(inject).observe(root, { childList: true, subtree: true }); inject(); }
