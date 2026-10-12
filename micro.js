// Vláknina, cukry a soľ za deň: karta pod hlavným kruhom na obrazovke Dnes (samo sa vloží, bez zásahu do today.js)
import * as db from './data.js';
import { ctx } from './app.js';

const root = document.getElementById('app');
let busy = false;
const n1 = v => String(Math.round(v * 10) / 10).replace('.', ',');

async function inject() {
  if (busy || !root || !ctx.state?.profile) return;
  const meals = root.querySelector('.screen.td .meals');
  if (!meals || root.querySelector('#micro')) return;
  busy = true;
  try {
    const p = ctx.state.profile, date = ctx.state.date;
    const { data, error } = await db.sb.from('food_logs').select('fiber,sugar,salt').eq('user_id', p.id).eq('date', date);
    const m = root.querySelector('.screen.td .meals');
    if (error || !data || !m || root.querySelector('#micro') || ctx.state.date !== date) return;
    const has = data.some(r => r.fiber != null || r.sugar != null || r.salt != null);
    if (!has) return;
    const sum = k => data.reduce((a, r) => a + Number(r[k] || 0), 0);
    const fiber = sum('fiber'), sugar = sum('sugar'), salt = sum('salt');
    const fGoal = Math.max(20, Math.round((p.target_kcal || 2000) / 1000 * 14));
    const row = (lbl, val, goal, unit, max) => {
      const pct = Math.min(100, goal ? val / goal * 100 : 0);
      const bad = max && val > goal;
      return `<div class="mi"><div class="mi-h"><span>${lbl}</span><b class="${bad ? 'over' : ''}">${n1(val)} ${unit}</b><em>${max ? 'max ' : 'cieľ '}${goal} ${unit}</em></div><div class="mi-b"><i class="${bad ? 'over' : ''}" style="width:${pct}%"></i></div></div>`;
    };
    const el = document.createElement('section');
    el.id = 'micro'; el.className = 'micro';
    el.innerHTML = `<h3>Vláknina, cukry a soľ</h3>${row('Vláknina', fiber, fGoal, 'g', false)}${row('Cukry', sugar, 50, 'g', true)}${row('Soľ', salt, 5, 'g', true)}<p class="mi-n">Počíta sa z jedál, ktoré majú tieto údaje. Odporúčania WHO: vláknina aspoň 14 g na 1000 kcal, cukry do 50 g, soľ do 5 g.</p>`;
    m.before(el);
  } catch (_) { /* nepodstatné */ } finally { busy = false; }
}
if (root) { new MutationObserver(inject).observe(root, { childList: true, subtree: true }); inject(); }
