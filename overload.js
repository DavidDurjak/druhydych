// Tréning: pri každom cviku ukáže, čo urobiť dnes podľa tvojich minulých výkonov (pridať váhu, držať, znížiť, stagnácia)
// a predvyplní odporúčanú váhu. Plán v databáze sa nemení, je to vrstva nad obrazovkou Tréning.
import * as db from './data.js';
import * as calc from './calc.js';
import * as U from './units.js';
import { EXERCISES } from './workouts.js';
import * as P from './overloadlogic.js';
import { ctx } from './app.js';

const root = document.getElementById('app');
const num = v => { const n = Number(v); return isFinite(n) ? n : 0; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const st = document.createElement('style');
st.textContent = '.ovl{margin:8px 0 0;padding:8px 10px;border-radius:10px;border-left:3px solid var(--muted);background:var(--card-2,rgba(127,127,127,.1));font-size:13px;line-height:1.4;color:var(--text)}'
  + '.ovl.add,.ovl.harder{border-left-color:var(--accent)}.ovl.drop,.ovl.stall{border-left-color:var(--danger)}'
  + '.ovl b{font-weight:700}.ovl-sum{margin:0 0 12px}.ovl-sum p{margin:0;font-size:14px;line-height:1.45}.ovl-sum .btn{margin-top:10px}';
document.head.appendChild(st);

const LABEL = { add: 'Pridaj váhu', harder: 'Zvýš náročnosť', hold: 'Bez zmeny', reps: 'Pridaj opakovanie', drop: 'Uber a zlepši techniku', deload: 'Deload', start: 'Prvý raz' };
let busy = false;

async function enhance(screen) {
  if (busy || screen.dataset.ovl) return;
  const cards = [...screen.querySelectorAll('.ex')];
  const uid = ctx?.state?.profile?.id, date = ctx?.state?.date;
  if (!cards.length || !uid || !date) return;
  screen.dataset.ovl = '1'; busy = true;
  try {
    const dayNo = Number(screen.querySelector('.seg [data-day].on')?.dataset.day || 1);
    const [plan, logs] = await Promise.all([db.getPlan(uid), db.listWorkoutLogs(uid, calc.addDays(date, -120))]);
    const day = plan?.days?.[dayNo - 1]; if (!day) return;
    const deload = !!plan.meta?.deload;
    const recs = [];
    cards.forEach(card => {
      const id = card.querySelector('.set')?.dataset.ex;
      const e = day.exercises.find(x => x.id === id);
      if (!e || !e.reps || card.querySelector('.ovl')) return;
      const rec = P.recommend({ ex: EXERCISES[id], plan: e, sessions: P.sessionsFor(id, logs, date), deload, fmt: U.fmtWt, unit: U.wUnit() });
      recs.push(rec);
      if (rec.kind === 'start' && !rec.text) return;
      const meta = card.querySelector('.exm');
      const cls = rec.stalled && rec.kind !== 'add' ? 'stall' : rec.kind;
      const p = document.createElement('p'); p.className = `ovl ${cls}`;
      p.innerHTML = `<b>${esc(rec.stalled && rec.kind !== 'add' ? 'Stagnácia' : LABEL[rec.kind] || '')}.</b> ${esc(rec.text)}`;
      (meta || card.querySelector('.exh'))?.after(p);
      // predvyplň váhu len tam, kde je pole prázdne alebo má automaticky doplnenú poslednú váhu a séria ešte nie je odškrtnutá
      const saved = (logs.find(l => l.date === date)?.sets || []).some(x => x.ex === id && (num(x.kg) || num(x.reps)));
      if (rec.kg && rec.kind !== 'start' && !saved) card.querySelectorAll('.set:not(.done) [data-f=kg]').forEach(inp => { inp.value = U.inW(rec.kg); });
    });
    const sum = P.summarize(recs);
    if (sum.total && !screen.querySelector('.ovl-sum')) {
      const first = cards[0];
      const bits = [];
      if (sum.up) bits.push(`${sum.up} ${sum.up === 1 ? 'cvik je pripravený na vyššiu záťaž' : sum.up < 5 ? 'cviky sú pripravené na vyššiu záťaž' : 'cvikov je pripravených na vyššiu záťaž'}`);
      if (sum.stalled) bits.push(`${sum.stalled} ${sum.stalled === 1 ? 'cvik stagnuje' : sum.stalled < 5 ? 'cviky stagnujú' : 'cvikov stagnuje'}`);
      if (!bits.length) bits.push('všetko ide podľa plánu');
      const canDeload = sum.deload && !deload && screen.querySelector('#deloadNow');
      const d = document.createElement('div'); d.className = 'card ovl-sum';
      d.innerHTML = `<p><b>Podľa tvojich výkonov:</b> ${esc(bits.join(', '))}.${canDeload ? ' Veľa cvikov sa nehýbe, čo je znak únavy. Zváž týždeň deloadu.' : ''}</p>${canDeload ? '<button class="btn sm ghost" id="ovlDeload">Deload teraz</button>' : ''}`;
      first.before(d);
      d.querySelector('#ovlDeload')?.addEventListener('click', () => screen.querySelector('#deloadNow')?.click());
    }
  } catch (_) { /* odporúčania sú bonus, obrazovka funguje aj bez nich */ }
  finally { busy = false; }
}

function scan() { const s = root?.querySelector('.screen'); if (s && s.querySelector('#finish') && s.querySelector('.ex')) enhance(s); }
if (root) { new MutationObserver(scan).observe(root, { childList: true, subtree: true }); scan(); }
