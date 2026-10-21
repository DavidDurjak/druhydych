// Tréning na úrovni Hevy a Strong: rozcvičovacia rampa z pracovnej váhy, kalkulačka kotúčov a živý rekord (PR) hneď po odškrtnutí série.
// Vrstva nad obrazovkou Tréning: nič nemení v ukladaní, len číta polia sérií a históriu tréningov.
import * as db from './data.js';
import * as calc from './calc.js';
import * as U from './units.js';
import { EXERCISES } from './workouts.js';

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const num = v => { const n = Number(String(v ?? '').replace(',', '.')); return isFinite(n) ? n : 0; };
const e1rm = (kg, reps) => kg * (1 + Math.min(reps, 12) / 30);
const fmt = v => String(Math.round(v * 100) / 100).replace('.', ',');
const BAR_RX = /činkou|mŕtvy ťah|rumunsk|tyčou|benč|bench/i;
const isBarbell = ex => ex && BAR_RX.test(ex.name) && !/jednoruč/i.test(ex.name);
const weighted = ex => ex && ex.type === 'compound' && (ex.rr === 'H' || ex.rr === 'M') && !/kliky|zhyby|dipy|výpady bez/i.test(ex.name);

const CSS = `
.lp-row{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 0}
.lp-btn{border:1px solid var(--line);background:color-mix(in srgb,var(--accent) 7%,var(--card));color:var(--text);border-radius:99px;padding:6px 11px;font:600 12.5px inherit;font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
.lp-btn:active{transform:scale(.97)}
.lp-box{margin:8px 0 0;padding:10px 12px;border-radius:14px;background:var(--card-2,rgba(255,255,255,.04));font-size:13px}
.lp-box h4{margin:0 0 6px;font-size:13px}
.lp-wr{display:grid;grid-template-columns:22px 1fr auto;gap:8px;align-items:center;padding:5px 0;border-top:1px solid var(--line)}
.lp-wr:first-of-type{border-top:0}
.lp-wr b{font-variant-numeric:tabular-nums}
.lp-wr small{color:var(--muted);text-align:right}
.lp-plates{display:flex;gap:4px;align-items:center;flex-wrap:wrap;margin-top:4px}
.lp-pl{display:inline-grid;place-items:center;min-width:26px;height:22px;padding:0 5px;border-radius:5px;font:700 11px inherit;font-family:inherit;color:#0B0E12}
.lp-note{margin:6px 0 0;color:var(--muted);font-size:12px}
.lp-pr{position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 14px);z-index:9999;transform:translate(-50%,-140%);display:flex;gap:12px;align-items:center;max-width:calc(100% - 32px);padding:12px 16px 12px 12px;border-radius:18px;
  background:linear-gradient(135deg,#FFD66B,#FF9F43);color:#1A1205;box-shadow:0 14px 40px rgba(255,159,67,.45);transition:transform .45s cubic-bezier(.2,1.3,.4,1)}
.lp-pr.on{transform:translate(-50%,0)}
.lp-pr i{font-style:normal;font-size:30px;line-height:1}
.lp-pr b{display:block;font-size:15px}
.lp-pr span{display:block;font-size:12.5px;opacity:.85}
.set.lp-hit{box-shadow:0 0 0 2px #FFC857 inset;border-radius:12px}
`;
if (!document.getElementById('lp-css')) { const s = document.createElement('style'); s.id = 'lp-css'; s.textContent = CSS; document.head.appendChild(s); }

// ---------- kotúče ----------
const PLATES = () => U.wUnit() === 'lb' ? [45, 35, 25, 10, 5, 2.5] : [25, 20, 15, 10, 5, 2.5, 1.25];
const BAR = () => U.wUnit() === 'lb' ? 45 : 20;
const PCOL = { 25: '#FF6B6B', 20: '#5BB8FF', 15: '#FFC857', 10: '#7CFFB2', 5: '#E9EEF5', 2.5: '#B794FF', 1.25: '#9FB3C8', 45: '#5BB8FF', 35: '#FFC857' };
function plates(total) {
  let side = (total - BAR()) / 2; if (side <= 0) return [];
  const out = [];
  for (const p of PLATES()) while (side >= p - 1e-6) { out.push(p); side -= p; }
  return out;
}
const platesHtml = total => {
  const ps = plates(total);
  if (total <= BAR()) return `<span class="lp-note">Len prázdna tyč (${fmt(BAR())} ${U.wUnit()})</span>`;
  return `<div class="lp-plates"><span class="lp-note" style="margin:0">Na každú stranu:</span>${ps.map(p => `<span class="lp-pl" style="background:${PCOL[p] || '#ccc'}">${fmt(p)}</span>`).join('')}</div>`;
};

// ---------- rozcvička: rampa z pracovnej váhy (zaokrúhlená na krok, ktorý sa dá naložiť) ----------
function warmup(work, ex) {
  const bar = isBarbell(ex), step = U.wUnit() === 'lb' ? 5 : 2.5, rnd = v => Math.max(bar ? BAR() : step, Math.round(v / step) * step);
  const rows = [];
  if (bar) rows.push([BAR(), 10, 'prázdna tyč']);
  const ramp = work >= (U.wUnit() === 'lb' ? 135 : 60) ? [[0.4, 8], [0.6, 5], [0.75, 3], [0.88, 1]] : [[0.5, 8], [0.7, 5], [0.85, 2]];
  ramp.forEach(([k, r]) => { const w = rnd(work * k); if (w < work && !rows.some(x => x[0] === w)) rows.push([w, r, Math.round(k * 100) + ' %']); });
  return rows;
}

function workingKg(card) {
  const row = $$('.set', card).find(s => !s.classList.contains('done')) || $('.set', card);
  const kg = row && $('[data-f=kg]', row);
  return kg ? num(kg.value) || num(kg.placeholder) : 0;
}

function decorate(card) {
  if (card.dataset.lp) return;
  const setEl = $('.set[data-ex]', card); if (!setEl) return;
  const ex = EXERCISES[setEl.dataset.ex]; if (!ex || !$('[data-f=kg]', card)) return;
  card.dataset.lp = '1';
  const btns = [];
  if (weighted(ex)) btns.push('<button type="button" class="lp-btn" data-lp="wu">🔥 Rozcvičovacie série</button>');
  if (isBarbell(ex)) btns.push('<button type="button" class="lp-btn" data-lp="pl">🏋️ Kotúče</button>');
  if (!btns.length) return;
  const row = document.createElement('div'); row.className = 'lp-row'; row.innerHTML = btns.join('');
  const anchor = $('.setsh', card) || $('.sets', card);
  anchor.parentNode.insertBefore(row, anchor);
}

document.addEventListener('click', e => {
  const b = e.target.closest?.('[data-lp]'); if (!b) return;
  e.preventDefault(); e.stopPropagation();
  const card = b.closest('.card.ex'), ex = EXERCISES[$('.set[data-ex]', card)?.dataset.ex];
  const old = $('.lp-box', card), kind = b.dataset.lp;
  if (old) { old.remove(); if (old.dataset.k === kind) return; }
  const work = workingKg(card), u = U.wUnit();
  const box = document.createElement('div'); box.className = 'lp-box'; box.dataset.k = kind;
  if (!work) box.innerHTML = `<p class="lp-note" style="margin:0">Najprv zadaj pracovnú váhu do prvej série.</p>`;
  else if (kind === 'pl') box.innerHTML = `<h4>${fmt(work)} ${u}</h4>${platesHtml(work)}<p class="lp-note">Tyč ${fmt(BAR())} ${u}. Ak máš inú tyč, odpočítaj rozdiel.</p>`;
  else {
    const rows = warmup(work, ex);
    box.innerHTML = `<h4>Rozcvička pred ${fmt(work)} ${u}</h4>${rows.map(([w, r, l], i) => `<div class="lp-wr"><span class="muted">${i + 1}.</span><div><b>${fmt(w)} ${u} × ${r}</b>${isBarbell(ex) && w > BAR() ? platesHtml(w) : ''}</div><small>${l}</small></div>`).join('')}
      <p class="lp-note">Rozcvičovacie série sa nerátajú do objemu. Medzi nimi stačí 60 až 90 sekúnd.</p>`;
  }
  b.parentNode.after(box);
  try { window.fwTrack && window.fwTrack('lift_tool', { k: kind }); } catch (_) { }
}, true);

// ---------- živý rekord ----------
let hist = null, histUid = '', histP = null;
async function history() {
  try {
    const { data } = await db.sb.auth.getSession(); const uid = data?.session?.user?.id; if (!uid) return null;
    if (hist && histUid === uid) return hist;
    if (!histP) histP = db.listWorkoutLogs(uid, calc.addDays(calc.today(), -400)).then(logs => {
      const best = {};
      (logs || []).filter(l => l.date < calc.today()).forEach(l => (l.sets || []).forEach(s => {
        const kg = num(s.kg), r = num(s.reps); if (!(kg > 0 && r > 0) || !(s.done || l.done)) return;
        const b = best[s.ex] || (best[s.ex] = { e: 0, kg: 0, n: 0 });
        b.e = Math.max(b.e, e1rm(kg, r)); b.kg = Math.max(b.kg, kg); b.n++;
      }));
      hist = best; histUid = uid; histP = null; return best;
    }).catch(() => { histP = null; return null; });
    return await histP;
  } catch (_) { return null; }
}
let toastEl = null, toastT = 0;
function prToast(title, sub) {
  if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'lp-pr'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
  toastEl.innerHTML = `<i>🏆</i><div><b>${title}</b><span>${sub}</span></div>`;
  requestAnimationFrame(() => toastEl.classList.add('on'));
  clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 3800);
  try { navigator.vibrate?.([30, 60, 30, 60, 80]); } catch (_) { }
}
document.addEventListener('click', e => {
  const chk = e.target.closest?.('.set [data-chk]'); if (!chk) return;
  const row = chk.closest('.set'); if (!row || row.classList.contains('done')) return; // odškrtnutie späť nerieši
  setTimeout(async () => {
    if (!row.classList.contains('done')) return;
    const ex = EXERCISES[row.dataset.ex], kgEl = $('[data-f=kg]', row), rEl = $('[data-f=reps]', row);
    if (!ex || !kgEl || !rEl) return;
    const kg = U.outW(kgEl.value || kgEl.placeholder), reps = num(rEl.value);
    if (!(kg > 0 && reps > 0)) return;
    const best = await history(); const b = best?.[row.dataset.ex]; if (!b || b.n < 2) return; // bez histórie nie je s čím porovnať
    // predošlé série dnes: rekord sa hlási len raz, za najlepšiu sériu
    const card = row.closest('.card.ex');
    const todayBest = Math.max(0, ...$$('.set.done', card).filter(s => s !== row).map(s => e1rm(U.outW($('[data-f=kg]', s)?.value || 0) || 0, num($('[data-f=reps]', s)?.value))));
    const e1 = e1rm(kg, reps);
    if (kg > b.kg + 1e-6 && kg >= todayBest) {
      row.classList.add('lp-hit');
      prToast('Nový rekord: najťažšia váha', `${ex.name}: ${U.fmtWt(kg)} ${U.wUnit()} × ${reps} (doteraz ${U.fmtWt(b.kg)} ${U.wUnit()})`);
      try { window.fwTrack && window.fwTrack('pr', { k: 'kg' }); } catch (_) { }
    } else if (e1 > b.e * 1.005 && e1 > todayBest) {
      row.classList.add('lp-hit');
      prToast('Nový rekord: najsilnejšia séria', `${ex.name}: ${U.fmtWt(kg)} ${U.wUnit()} × ${reps}, odhad maxima ${U.fmtWt(e1)} ${U.wUnit()}`);
      try { window.fwTrack && window.fwTrack('pr', { k: 'e1rm' }); } catch (_) { }
    }
  }, 30);
}, true);

// karty cvikov dostanú tlačidlá, keď sa obrazovka Tréning vykreslí
let raf = 0;
const app = document.getElementById('app');
const scan = () => { $$('#app .card.ex').forEach(decorate); if ($('#app .card.ex')) history(); };
if (app) new MutationObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(scan); }).observe(app, { childList: true, subtree: true });
