// Tréning: keď človek dva týždne po sebe odcvičí menej než polovicu plánu, appka mu ponúkne plán s menším počtom dní
// namiesto toho, aby mu ďalej ukazovala nesplnený plán. Plán, ktorý sa dá dodržať, je lepší než ideálny, ktorý sa nedodrží.
import * as db from './data.js';
import * as calc from './calc.js';
import * as v2 from './app2.js';
import { generatePlan, MIN_DAYS } from './workouts.js';
import { ctx } from './app.js';

const root = document.getElementById('app');
const KEY = 'fw_adh_skip';
const ls = { get: () => { try { return localStorage.getItem(KEY) || ''; } catch (_) { return ''; } }, set: v => { try { localStorage.setItem(KEY, v); } catch (_) { } } };

const st = document.createElement('style');
st.textContent = '.adh{margin:0 0 12px;border-left:3px solid var(--accent)}.adh p{margin:0;font-size:14px;line-height:1.5;color:var(--text)}.adh .row{gap:8px;margin-top:12px;flex-wrap:wrap}';
document.head.appendChild(st);

// čistá logika: koľko z plánovaných tréningov sa odcvičilo v dvoch uzavretých týždňoch pred tým aktuálnym
export function assess(plan, logs, date) {
  const m = plan?.meta; if (!m || m.v !== 2) return null;
  const D = plan.days?.length || 0; if (D < 3) return null;                    // pri 2 dňoch niet kam znižovať
  const ws = calc.weekStart(date), from = calc.addDays(ws, -14);
  const start = (m.startedAt || plan.created_at || '').slice(0, 10);
  if (!start || start > from) return null;                                      // plán musí bežať aspoň dva celé týždne
  const done = new Set(logs.filter(l => l.done && l.date >= from && l.date < ws).map(l => `${l.date}|${l.plan_day}`)).size;
  const expected = 2 * D;
  if (done > expected * 0.5) return null;
  const level = m.params?.level, floor = MIN_DAYS[level] || 2;
  const weekly = done / 2;
  const target = Math.max(floor, Math.min(D - 1, Math.ceil(weekly) + 1));
  if (target >= D) return null;
  return { done, expected, D, target };
}

let busy = false;
async function enhance(screen) {
  if (busy || screen.dataset.adh) return;
  const uid = ctx?.state?.profile?.id, date = ctx?.state?.date;
  if (!uid || !date) return;
  screen.dataset.adh = '1'; busy = true;
  try {
    if (ls.get() >= calc.today()) return;
    const [plan, logs] = await Promise.all([db.getPlan(uid), db.listWorkoutLogs(uid, calc.addDays(calc.weekStart(date), -14))]);
    const a = assess(plan, logs, date); if (!a || screen.querySelector('.adh')) return;
    const card = document.createElement('div'); card.className = 'card adh';
    card.innerHTML = `<p><b>Plán je pre teba teraz priveľký.</b> Za posledné dva týždne si odcvičil ${a.done} z ${a.expected} tréningov. Plán, ktorý sa nedá dodržať, nepomáha. Odporúčam ${a.target} ${a.target < 5 ? 'dni' : 'dní'} týždenne, a keď to pôjde, pridáš.</p>
      <div class="row"><button class="btn sm primary" id="adhDo">Znížiť na ${a.target} ${a.target < 5 ? 'dni' : 'dní'}</button><button class="btn sm ghost" id="adhSkip">Nechať ako je</button></div>`;
    (screen.querySelector('.topbar') || screen.firstElementChild)?.after(card);
    card.querySelector('#adhSkip').onclick = () => { ls.set(calc.addDays(calc.today(), 7)); card.remove(); };
    card.querySelector('#adhDo').onclick = async e => {
      e.target.disabled = true;
      try {
        const m = plan.meta;
        const np = generatePlan({ ...m.params, days: a.target, block: m.block, week: m.week });
        np.meta.startedAt = m.startedAt || (plan.created_at || '').slice(0, 10) || calc.today();
        const { error } = await db.sb.from('workout_plans').update({ name: np.name, days: np.days, meta: np.meta }).eq('id', plan.id);
        if (error) throw new Error(error.message);
        ctx.state.profile = await db.upsertProfile({ id: uid, training_days: a.target });
        try { ctx.toast(`Plán má teraz ${a.target} ${a.target < 5 ? 'dni' : 'dní'} týždenne.`); } catch (_) { /* bez hlásenia */ }
        v2.renderTraining();
      } catch (err) { e.target.disabled = false; try { ctx.toast(err.message || 'Nepodarilo sa upraviť plán', true); } catch (_) { /* bez hlásenia */ } }
    };
  } catch (_) { /* karta je bonus */ }
  finally { busy = false; }
}

function scan() { const s = root?.querySelector('.screen'); if (s && s.querySelector('#finish') && s.querySelector('.ex')) enhance(s); }
if (root) { new MutationObserver(scan).observe(root, { childList: true, subtree: true }); scan(); }
