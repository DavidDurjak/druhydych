// Pokrok: štvrtá položka v priemeroch makier, vláknina (počíta sa len z dní, ktoré majú údaj o vláknine)
import * as db from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';
import './badges.js';
import './speed.js';
import './boost.js';
import './workoutcard.js';
import './workoutauto.js';
import './invite.js';
import './navblend.js';
import './hdr.js';
import './cal.js';

const root = document.getElementById('app');
let busy = false;

async function inject() {
  if (busy || !root || !ctx.state?.profile) return;
  const box = root.querySelector('.screen.pg .pg-macros');
  if (!box || box.dataset.pf) return;
  busy = true;
  try {
    const p = ctx.state.profile, today = calc.today();
    const sel = root.querySelector('.pg-per button.on')?.dataset.per;
    const from = sel === 'all' ? (p.start_date || today) : calc.addDays(today, -((Number(sel) || 30) - 1));
    const { data, error } = await db.sb.from('food_logs').select('date,fiber').eq('user_id', p.id).gte('date', from).lte('date', today);
    const b = root.querySelector('.screen.pg .pg-macros');
    if (error || !data || !b || b.dataset.pf) return;
    b.dataset.pf = '1';
    const byDay = {};
    data.forEach(r => { if (r.fiber != null) byDay[r.date] = (byDay[r.date] || 0) + Number(r.fiber); });
    const vals = Object.values(byDay);
    const avg = vals.length ? vals.reduce((a, c) => a + c, 0) / vals.length : null;
    const goal = Math.max(25, Math.round((p.target_kcal || 2000) / 1000 * 14));
    b.insertAdjacentHTML('beforeend', `<div><span class="dot" style="background:var(--fiber)"></span><b>${avg == null ? '–' : Math.round(avg)}</b><small>/${goal} g</small><span>Vláknina</span></div>`);
    b.style.gridTemplateColumns = 'repeat(4, minmax(0, 1fr))';
  } catch (_) { /* nepodstatné */ } finally { busy = false; }
}
if (root) { new MutationObserver(inject).observe(root, { childList: true, subtree: true }); inject(); }
