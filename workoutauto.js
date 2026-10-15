// Tréning: časovač (od prvého zapísaného kroku po ukončenie) a automatické otvorenie karty na zdieľanie po "Ukončiť tréning".
import * as db from './data.js';
import { ctx } from './app.js';

const root = document.getElementById('app');
const ls = { get: k => { try { return Number(localStorage.getItem(k) || 0); } catch (_) { return 0; } }, set: (k, v) => { try { localStorage.setItem(k, String(v)); } catch (_) { } }, del: k => { try { localStorage.removeItem(k); } catch (_) { } } };
const dayNo = () => root.querySelector('.seg [data-day].on')?.dataset.day || '0';
const keyOf = (date, day) => `fw_ws_${date}_${day}`;
let pending = null;

function mark() {
  if (!root.querySelector('#finish')) return;
  const k = keyOf(ctx.state?.date || '', dayNo());
  if (!ls.get(k)) ls.set(k, Date.now());
}
document.addEventListener('click', e => {
  if (e.target.closest?.('[data-chk]')) mark();
  const f = e.target.closest?.('#finish');
  if (f && /Ukončiť/.test(f.textContent)) pending = { t: Date.now(), date: ctx.state?.date || '', day: dayNo() };
}, true);
document.addEventListener('input', e => { if (e.target.closest?.('.set input')) mark(); }, true);

async function finishUp() {
  const p = pending; pending = null;
  const k = keyOf(p.date, p.day), start = ls.get(k), uid = ctx.state?.profile?.id;
  if (start && uid) {
    const dur = Math.round((Date.now() - start) / 60000);
    if (dur >= 5 && dur <= 300) {
      try { await db.sb.from('workout_logs').update({ duration_min: dur }).eq('user_id', uid).eq('date', p.date).eq('plan_day', Number(p.day)); } catch (_) { /* čas je bonus */ }
    }
    ls.del(k);
  }
  setTimeout(() => { const b = root.querySelector('#shareW'); if (b && !document.querySelector('.sheet-bg')) b.click(); }, 350);
}
if (root) new MutationObserver(() => {
  if (!pending) return;
  if (Date.now() - pending.t > 15000) { pending = null; return; }
  if (root.querySelector('#shareW')) finishUp();
}).observe(root, { childList: true, subtree: true });
