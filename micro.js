// Cukry a soľ za deň: karta pod jedlami na obrazovke Dnes (vláknina je teraz priamo v hlavnej karte)
import * as db from './data.js';
import { ctx } from './app.js';
import './meals.js';
import './fasting.js';
import './fabpos.js';
import './progfiber.js';
import './searchfix.js';
import './dxdash.js';
import './discover.js';

const root = document.getElementById('app');
let busy = false;
const seen = new WeakSet();
const n1 = v => String(Math.round(v * 10) / 10).replace('.', ',');

async function inject() {
  if (busy || !root || !ctx.state?.profile) return;
  const meals = root.querySelector('.screen.td .meals');
  if (!meals || root.querySelector('#micro') || seen.has(meals)) return;
  // každú vykreslenú obrazovku skontroluje len raz (inak by pri každej zmene na stránke znova volal databázu)
  seen.add(meals);
  busy = true;
  try {
    const p = ctx.state.profile, date = ctx.state.date;
    const { data, error } = await db.sb.from('food_logs').select('sugar,salt').eq('user_id', p.id).eq('date', date);
    const m = root.querySelector('.screen.td .meals');
    if (error || !data || !m || root.querySelector('#micro') || ctx.state.date !== date) return;
    const has = data.some(r => r.sugar != null || r.salt != null);
    if (!has) return;
    const sum = k => data.reduce((a, r) => a + Number(r[k] || 0), 0);
    const sugar = sum('sugar'), salt = sum('salt');
    const row = (lbl, val, goal, unit, max) => {
      const pct = Math.min(100, goal ? val / goal * 100 : 0);
      const bad = max && val > goal;
      return `<div class="mi"><div class="mi-h"><span>${lbl}</span><b class="${bad ? 'over' : ''}">${n1(val)} ${unit}</b><em>${max ? 'max ' : 'cieľ '}${goal} ${unit}</em></div><div class="mi-b"><i class="${bad ? 'over' : ''}" style="width:${pct}%"></i></div></div>`;
    };
    const el = document.createElement('section');
    el.id = 'micro'; el.className = 'micro';
    el.innerHTML = `<h3>Cukry a soľ</h3>${row('Cukry', sugar, 50, 'g', true)}${row('Soľ', salt, 5, 'g', true)}<p class="mi-n">Počíta sa z jedál, ktoré majú tieto údaje. Odporúčania WHO: cukry do 50 g, soľ do 5 g.</p>`;
    // pod jedlami, nad pôstom a vodou (zápis jedla je prvý, čísla navyše až potom)
    (root.querySelector('.screen.td #fast') || root.querySelector('.screen.td .wt') || m).before(el);
  } catch (_) { /* nepodstatné */ } finally { busy = false; }
}
// karta Cukry a soľ je teraz priamo v hlavnej karte (today.js), samostatná sa už nevkladá
void inject;
