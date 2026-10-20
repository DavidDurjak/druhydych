// Tréning: pri každom cviku ukáže, čo urobiť dnes podľa tvojich minulých výkonov (pridať váhu, držať, znížiť, stagnácia)
// a predvyplní odporúčanú váhu. Plán v databáze sa nemení, je to vrstva nad obrazovkou Tréning.
import * as db from './data.js';
import * as calc from './calc.js';
import * as U from './units.js';
import { EXERCISES } from './workouts.js';
import * as P from './overloadlogic.js';
import * as RD from './readiness.js';
import { ctx } from './app.js';

const root = document.getElementById('app');
const num = v => { const n = Number(v); return isFinite(n) ? n : 0; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const st = document.createElement('style');
st.textContent = '.ovl{margin:8px 0 0;padding:8px 10px;border-radius:10px;border-left:3px solid var(--muted);background:var(--card-2,rgba(127,127,127,.1));font-size:13px;line-height:1.4;color:var(--text)}'
  + '.ovl.add,.ovl.harder{border-left-color:var(--accent)}.ovl.drop,.ovl.stall{border-left-color:var(--danger)}'
  + '.ovl b{font-weight:700}.ovl-sum{margin:0 0 12px}.ovl-sum p{margin:0;font-size:14px;line-height:1.45}.ovl-sum .btn{margin-top:10px}'
  + '.fd{margin:0 0 12px;border-left:3px solid var(--fc,var(--muted))}.fd p{margin:0;font-size:14px;line-height:1.5;color:var(--text)}.fd .btn{margin-top:10px}.fd-y{--fc:#E0A82E}.fd-r{--fc:var(--danger)}.set.fd-opt{opacity:.4}';
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
    const [plan, logs, ci] = await Promise.all([db.getPlan(uid), db.listWorkoutLogs(uid, calc.addDays(date, -120)), db.getCheckin(uid, date).catch(() => null)]);
    const today = date === calc.today() && !(logs.find(l => l.date === date)?.done);
    const rd = today ? RD.readinessOf(ci, logs, date) : null;
    const tired = !!rd && rd.level !== 'g';
    const day = plan?.days?.[dayNo - 1]; if (!day) return;
    const deload = !!plan.meta?.deload;
    const recs = []; let cut = 0, total = 0;
    cards.forEach(card => {
      const id = card.querySelector('.set')?.dataset.ex;
      const e = day.exercises.find(x => x.id === id);
      if (!e || !e.reps || card.querySelector('.ovl')) return;
      let rec = P.recommend({ ex: EXERCISES[id], plan: e, sessions: P.sessionsFor(id, logs, date), deload, fmt: U.fmtWt, unit: U.wUnit() });
      // unavený deň: žiadne navyšovanie váhy, drž poslednú
      if (tired && rec.kind === 'add' && rec.last) rec = { ...rec, kind: 'hold', kg: rec.last.kg, text: `Dnes bez navýšenia, telo je unavené. Drž ${U.fmtWt(rec.last.kg)} ${U.wUnit()} a rob čisté opakovania.` };
      if (tired) {
        const rows = [...card.querySelectorAll('.set')], keep = rd.level === 'r' ? 2 : Math.max(2, rows.length - 1);
        if (rows.length >= 3) rows.slice(keep).forEach(r => { if (!r.classList.contains('done')) { r.classList.add('fd-opt'); cut++; } });
      }
      total += card.querySelectorAll('.set').length;
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
    if (today && !rd && !ci && !screen.querySelector('.fd')) {
      const d = document.createElement('div'); d.className = 'card fd';
      d.innerHTML = '<p><b>Plán sa vie prispôsobiť dnešnému dňu.</b> Odpovedz na tri otázky (spánok, energia, svaly) a upravím ti dnešný tréning.</p><button class="btn sm ghost" id="fdGo">Vyplniť na obrazovke Dnes</button>';
      cards[0].before(d); d.querySelector('#fdGo').onclick = () => { location.hash = '#/'; };
    }
    if (tired && !screen.querySelector('.fd')) {
      const y = rd.level === 'y';
      const d = document.createElement('div'); d.className = `card fd fd-${rd.level}`;
      d.innerHTML = `<p><b>${y ? 'Žltý deň' : 'Červený deň'}: dnešný tréning je upravený.</b> ${esc(rd.why.join(', '))}. ${y ? 'Zosivené série preskoč a nechaj si 2 opakovania v rezerve.' : 'Odporúčam ťažký tréning dnes vynechať. Ak ideš, urob len prvé dve série každého cviku, ľahko, bez zlyhania.'} Sérií dnes: ${total - cut} namiesto ${total}.</p>`;
      cards[0].before(d);
    }
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
