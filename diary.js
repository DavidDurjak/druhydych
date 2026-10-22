// Denník: celý deň na jednom mieste. Otvorí sa z plusového menu (Denník) ako celoobrazovkové okno.
// Hore týždeň (bodka = ako sedeli kalórie), rovnica Cieľ − Jedlo = Zostáva, makrá, potom jedlá po častiach dňa
// s časom zápisu (ťuk = úprava, + = pridať do tej časti), voda, spánok, tréning a poznámka dňa.
// Starší deň sa dá jedným ťuknutím skopírovať na dnešok.
// Hlavný prvok má triedu gt-diary (nie dn: tú už v appke používa šípka poklesu váhy).
import * as db from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';
import { openLogEdit } from './logedit.js';

const META = { breakfast: '🍳', brunch: '🥪', lunch: '🍲', afternoon: '🥨', dinner: '🍽️', late: '🌙', snack: '🍎' };
const DAYS = ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'];
const n0 = v => Math.round(Number(v) || 0);
const nf = v => n0(v).toLocaleString('sk-SK');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hm = iso => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? '' : `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };

const CSS = `
.gt-diary{position:fixed;inset:0;z-index:40;background:var(--bg);overflow-y:auto;-webkit-overflow-scrolling:touch;animation:dnIn .22s cubic-bezier(.2,.9,.3,1)}
@keyframes dnIn{from{opacity:0;transform:translateY(24px)}}
.dn-in{max-width:560px;margin:0 auto;padding:calc(env(safe-area-inset-top) + 14px) 16px calc(env(safe-area-inset-bottom) + 40px)}
.dn-top{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.dn-top h1{flex:1;font-size:28px;margin:0}
.dn-x{width:40px;height:40px;border-radius:50%;border:1px solid var(--line);background:var(--card);color:var(--text);font:inherit;font-size:22px;cursor:pointer;-webkit-appearance:none;appearance:none}
.dn-week{display:grid;grid-template-columns:auto repeat(7,1fr) auto;gap:4px;align-items:center;margin-bottom:14px}
.dn-week>button{-webkit-appearance:none;appearance:none;border:0;background:none;color:var(--text);font:inherit;cursor:pointer}
.dn-arr{width:30px;height:44px;font-size:20px!important;color:var(--muted)!important}
.dn-d{display:flex;flex-direction:column;align-items:center;gap:4px;padding:7px 0;border-radius:14px}
.dn-d small{font-size:11px;color:var(--muted)}.dn-d b{font-size:15px}
.dn-d i{width:6px;height:6px;border-radius:50%;background:transparent}
.dn-d i.ok{background:#7CFFB2}.dn-d i.lo{background:#FFC857}.dn-d i.hi{background:#FF7A7A}
.dn-d.on{background:var(--card);box-shadow:inset 0 0 0 1.5px var(--accent)}
.dn-d.fut{opacity:.35;pointer-events:none}
.dn-sum{padding:16px;border-radius:22px;background:linear-gradient(155deg,color-mix(in srgb,var(--card) 90%,#7CFFB2 10%),var(--card));border:1px solid var(--line);margin-bottom:14px}
.dn-eq{display:grid;grid-template-columns:1fr auto 1fr auto 1fr;align-items:end;text-align:center;gap:4px}
.dn-eq b{display:block;font-size:22px;font-weight:900;letter-spacing:-.02em}.dn-eq small{font-size:11px;color:var(--muted)}
.dn-eq span{font-size:18px;color:var(--muted);padding-bottom:16px}
.dn-eq .left b{color:var(--accent)}.dn-eq .over b{color:#FF7A7A}
.dn-mac{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px}
.dn-mac div{font-size:12px;color:var(--muted)}.dn-mac b{color:var(--text);font-size:14px}
.dn-mac u{display:block;height:5px;border-radius:5px;margin-top:5px;background:color-mix(in srgb,var(--text) 10%,transparent);overflow:hidden}
.dn-mac u i{display:block;height:100%;border-radius:5px;background:var(--c);transition:width .8s cubic-bezier(.2,.9,.3,1)}
.dn-meal{border-radius:20px;background:var(--card);border:1px solid var(--line);margin-bottom:10px;overflow:hidden}
.dn-mh{display:flex;align-items:center;gap:10px;padding:12px 14px}
.dn-mh em{font-style:normal;font-size:20px}.dn-mh b{flex:1;font-size:15px}.dn-mh span{font-size:13px;color:var(--muted);font-weight:700}
.dn-add{width:34px;height:34px;border-radius:11px;border:1px solid color-mix(in srgb,var(--accent) 40%,var(--line));background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent);font:inherit;font-size:20px;font-weight:800;cursor:pointer;-webkit-appearance:none;appearance:none}
.dn-row{display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;border:0;border-top:1px solid var(--line);background:none;color:var(--text);font:inherit;text-align:left;cursor:pointer;-webkit-appearance:none;appearance:none}
.dn-row:active{background:color-mix(in srgb,var(--text) 5%,transparent)}
.dn-row div{flex:1;min-width:0}.dn-row b{display:block;font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dn-row small{display:block;font-size:12px;color:var(--muted);margin-top:2px}
.dn-row strong{font-size:14px}.dn-row time{font-size:11px;color:var(--muted);min-width:34px}
.dn-empty{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 14px}
.dn-empty button{display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:12px;border:1px dashed var(--line);background:none;color:var(--muted);font:inherit;font-size:13px;font-weight:700;cursor:pointer;-webkit-appearance:none;appearance:none}
.dn-sec{font-size:13px;font-weight:800;color:var(--muted);margin:18px 2px 8px}
.dn-day{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.dn-day a,.dn-day div{display:flex;flex-direction:column;gap:3px;padding:12px;border-radius:16px;background:var(--card);border:1px solid var(--line);color:var(--text);text-decoration:none}
.dn-day i{font-style:normal;font-size:18px}.dn-day b{font-size:15px}.dn-day small{font-size:11px;color:var(--muted)}
.dn-note{width:100%;min-height:76px;resize:vertical;box-sizing:border-box;padding:12px;border-radius:16px;border:1px solid var(--line);background:var(--card);color:var(--text);font:inherit;font-size:15px}
.dn-copy{width:100%;margin-top:16px}
.dn-none{text-align:center;padding:26px 10px;color:var(--muted);font-size:14px}
.dn-none b{display:block;font-size:30px;margin-bottom:6px}
body:has(.gt-diary) .sheet-bg{z-index:50}
body:has(.gt-diary) .qa-fab,body:has(.gt-diary) .bd-fab,body:has(.gt-diary) .nav{display:none!important}
`;
if (!document.getElementById('dn-css')) { const s = document.createElement('style'); s.id = 'dn-css'; s.textContent = CSS; document.head.appendChild(s); }

let el = null, date = null, saveT = 0;

async function loadDay(uid, d) {
  const sb = db.sb;
  const [rows, ci, sl, wo, wk] = await Promise.all([
    db.listFood(uid, d).catch(() => []),
    sb.from('checkins').select('water_ml,water,sleep_h,note').eq('user_id', uid).eq('date', d).maybeSingle().then(r => r.data).catch(() => null),
    sb.from('sleep_logs').select('hours').eq('user_id', uid).eq('date', d).maybeSingle().then(r => r.data).catch(() => null),
    sb.from('workout_logs').select('day_name,duration_min,done').eq('user_id', uid).eq('date', d).then(r => r.data || []).catch(() => []),
    db.foodTotalsRange(uid, calc.addDays(d, -9), calc.addDays(d, 3)).catch(() => []),
  ]);
  const byDay = {};
  for (const r of wk || []) byDay[r.date] = (byDay[r.date] || 0) + (+r.kcal || 0);
  return { rows, ci, sl, wo, byDay };
}

function render(uid, d, data) {
  const p = ctx.state.profile || {};
  const goal = +p.target_kcal || 0, MEALS = ctx.MEALS;
  const sum = { kcal: 0, protein: 0, carbs: 0, fat: 0 }, by = {};
  for (const r of data.rows) { for (const k in sum) sum[k] += +r[k] || 0; (by[r.meal] ||= []).push(r); }
  const left = goal - sum.kcal;
  const today = calc.today();
  // týždeň okolo zvoleného dňa (posledný deň = zvolený, ak nie je v budúcnosti)
  const end = d >= today ? today : calc.addDays(d, Math.min(3, Math.round((new Date(today) - new Date(d)) / 864e5)));
  const days = [...Array(7)].map((_, i) => calc.addDays(end, i - 6));
  const dot = x => { const k = data.byDay[x] || 0; if (!k || !goal) return ''; const r = k / goal; return r > 1.1 ? 'hi' : r < 0.8 ? 'lo' : 'ok'; };
  const mac = [['Bielkoviny', sum.protein, +p.target_protein, '#7CFFB2'], ['Sacharidy', sum.carbs, +p.target_carbs, '#5BB8FF'], ['Tuky', sum.fat, +p.target_fat, '#FFC857']];
  const used = Object.keys(MEALS).filter(k => by[k]?.length), empty = Object.keys(MEALS).filter(k => !by[k]?.length);
  const water = +data.ci?.water_ml || (+data.ci?.water || 0) * 250, wGoal = (+p.water_goal || 8) * 250;
  const sleep = +data.sl?.hours || +data.ci?.sleep_h || 0;
  const wo = data.wo.find(w => w.done) || data.wo[0];
  const label = d === today ? 'Dnes' : d === calc.addDays(today, -1) ? 'Včera' : `${DAYS[new Date(d + 'T12:00:00').getDay()]} ${calc.fmtDate(d)}`;
  el.querySelector('.dn-in').innerHTML = `
    <div class="dn-top"><h1>Denník</h1><button class="dn-x" data-dn="x" aria-label="Zavrieť">×</button></div>
    <div class="dn-week">
      <button class="dn-arr" data-dn="prev" aria-label="Predošlý týždeň">‹</button>
      ${days.map(x => `<button class="dn-d${x === d ? ' on' : ''}${x > today ? ' fut' : ''}" data-day="${x}"><small>${DAYS[new Date(x + 'T12:00:00').getDay()]}</small><b>${Number(x.slice(8))}</b><i class="${dot(x)}"></i></button>`).join('')}
      <button class="dn-arr" data-dn="next" aria-label="Ďalší týždeň" ${end >= today ? 'disabled' : ''}>›</button>
    </div>
    <section class="dn-sum">
      <div class="small muted" style="margin-bottom:8px">${label}</div>
      <div class="dn-eq">
        <div><b>${nf(goal)}</b><small>cieľ</small></div><span>−</span>
        <div><b>${nf(sum.kcal)}</b><small>jedlo</small></div><span>=</span>
        <div class="${left < 0 ? 'over' : 'left'}"><b>${nf(Math.abs(left))}</b><small>${left < 0 ? 'nad cieľom' : 'zostáva'}</small></div>
      </div>
      <div class="dn-mac">${mac.map(([l, v, t, c]) => `<div style="--c:${c}">${l}<br><b>${n0(v)}</b> / ${n0(t)} g<u><i data-w="${t ? Math.min(100, v / t * 100) : 0}" style="width:0"></i></u></div>`).join('')}</div>
    </section>
    ${used.length ? used.map(k => {
      const list = by[k], kc = list.reduce((s, r) => s + (+r.kcal || 0), 0);
      return `<section class="dn-meal"><div class="dn-mh"><em>${META[k] || '🍴'}</em><b>${esc(MEALS[k])}</b><span>${nf(kc)} kcal</span><button class="dn-add" data-add="${k}" aria-label="Pridať do: ${esc(MEALS[k])}">+</button></div>
        ${list.map(r => `<button class="dn-row" data-id="${esc(r.id)}"><time>${hm(r.created_at)}</time><div><b>${esc(r.name)}</b><small>${[r.brand, r.portion && +r.qty ? (+r.qty === 1 ? r.portion : `${String(+(+r.qty).toFixed(1)).replace('.', ',')} × ${String(r.portion).replace(/^1\s+/, '')}`) : +r.grams ? `${n0(r.grams)} g` : ''].filter(Boolean).map(esc).join(' · ')}${+r.protein ? ` · B ${n0(r.protein)} g` : ''}</small></div><strong>${nf(r.kcal)}</strong></button>`).join('')}
      </section>`;
    }).join('') : `<div class="dn-none"><b>🍽️</b>V tento deň zatiaľ nič. Pridaj prvé jedlo.</div>`}
    ${empty.length ? `<div class="dn-empty">${empty.map(k => `<button data-add="${k}">${META[k] || '🍴'} ${esc(MEALS[k])} <span style="color:var(--accent)">+</span></button>`).join('')}</div>` : ''}
    <div class="dn-sec">Deň</div>
    <div class="dn-day">
      <div><i>💧</i><b>${(water / 1000).toFixed(1).replace('.', ',')} l</b><small>z ${(wGoal / 1000).toFixed(1).replace('.', ',')} l vody</small></div>
      <div><i>🌙</i><b>${sleep ? `${Math.floor(sleep)} h ${String(Math.round((sleep % 1) * 60)).padStart(2, '0')}` : '–'}</b><small>spánok</small></div>
      <a href="#/trening" data-dn="go"><i>🏋️</i><b>${wo ? (wo.done ? 'Hotovo' : 'Rozbehnutý') : '–'}</b><small>${wo ? esc(wo.day_name || 'tréning') + (+wo.duration_min ? ` · ${n0(wo.duration_min)} min` : '') : 'bez tréningu'}</small></a>
    </div>
    <div class="dn-sec">Poznámka dňa</div>
    <textarea class="dn-note" id="dnNote" placeholder="Ako sa cítiš, čo sa dnes podarilo, čo zajtra inak…" maxlength="1000">${esc(data.ci?.note || '')}</textarea>
    ${d < today && data.rows.length ? `<button class="btn dn-copy" data-dn="copy">Skopírovať jedlá tohto dňa na dnešok</button>` : ''}`;
  requestAnimationFrame(() => requestAnimationFrame(() => el.querySelectorAll('[data-w]').forEach(i => { i.style.width = i.dataset.w + '%'; })));

  const note = el.querySelector('#dnNote');
  note.oninput = () => {
    clearTimeout(saveT);
    saveT = setTimeout(() => db.upsertCheckin({ user_id: uid, date: d, note: note.value.trim() || null }).catch(() => { }), 700);
  };
  el.querySelector('.dn-in').onclick = async e => {
    const b = e.target.closest('button,a'); if (!b) return;
    const act = b.dataset.dn;
    if (act === 'x') return close();
    if (act === 'go') { close(); return; }
    if (act === 'prev') return show(uid, calc.addDays(d, -7));
    if (act === 'next') { const n = calc.addDays(d, 7); return show(uid, n > today ? today : n); }
    if (b.dataset.day) return show(uid, b.dataset.day);
    if (b.dataset.add) { ctx.state.date = d; close(); location.hash = '#/jedlo?meal=' + b.dataset.add; return; }
    if (b.dataset.id) {
      const r = data.rows.find(x => String(x.id) === b.dataset.id);
      if (r) openLogEdit(r, () => show(uid, d));
      return;
    }
    if (act === 'copy') {
      b.disabled = true;
      try {
        for (const r of data.rows) {
          const { id, created_at, _local, ...row } = r;
          await db.addFood({ ...row, date: today });
        }
        ctx.toast(`Skopírované na dnešok: ${data.rows.length} ${data.rows.length === 1 ? 'položka' : data.rows.length < 5 ? 'položky' : 'položiek'}`);
        show(uid, today);
      } catch (err) { ctx.toast(err.message, true); b.disabled = false; }
    }
  };
}

async function show(uid, d) {
  date = d;
  try { const data = await loadDay(uid, d); if (el && date === d) render(uid, d, data); }
  catch (e) { ctx.toast(e.message, true); }
}
function close() {
  if (!el) return;
  el.remove(); el = null;
  if ((location.hash || '#/').split('?')[0] === '#/') window.dispatchEvent(new HashChangeEvent('hashchange'));
}
export function openDiary(d) {
  const uid = ctx.state?.profile?.id; if (!uid) return;
  el?.remove();
  el = document.createElement('div'); el.className = 'gt-diary'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Denník');
  el.innerHTML = '<div class="dn-in"><div class="spinner" style="margin:120px auto"></div></div>';
  document.body.appendChild(el);
  show(uid, d || ctx.state.date || calc.today());
}
addEventListener('hashchange', () => { if (el) close(); });

// plusové menu: Denník otvorí denník (doteraz omylom presmeroval na obrazovku Jedlo)
document.addEventListener('click', e => {
  const b = e.target.closest?.('[data-qa="diary"]'); if (!b) return;
  e.preventDefault(); e.stopImmediatePropagation();
  document.querySelector('.qa-fab')?.click();
  setTimeout(() => openDiary(), 120);
}, true);
