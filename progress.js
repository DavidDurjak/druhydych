// Pokrok: hero s tromi kruhmi, interaktívny graf váhy s predpoveďou, kalórie po dňoch, makrá v krúžkoch, mriežka 84 dní, zistenia, odznaky.
// Čísla nabehnú, krivka sa nakreslí, stĺpce vyrastú, keď karta príde do obrazu. Po grafe aj stĺpcoch sa dá ťukať a ťahať prstom.
import * as db from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';
import { defaultWeek } from './report.js';
import * as U from './units.js';

const $app = () => ctx.$app;
const state = () => ctx.state;
const h = (...a) => ctx.h(...a), r0 = (...a) => ctx.r0(...a), nav = (...a) => ctx.nav(...a);
const PROGRAM_DAYS = 84;
// štýly Pokroku v2 (kruhy, interaktívny graf, animácie)
if (!document.getElementById('pgx-css')) { const l = document.createElement('link'); l.id = 'pgx-css'; l.rel = 'stylesheet'; l.href = './progressx.css'; document.head.appendChild(l); }
let period = 30; // 7 | 30 | 'all'
let prevPer = 1; // index predošlého obdobia (pre plynulý posun indikátora)

// vždy v kg na vstupe, zobrazí sa v zvolených jednotkách (kg alebo lb)
const fmt1 = v => U.fmtW(v);
const sign = v => U.fmtWD(v);
const dayName = iso => ['ne', 'po', 'ut', 'st', 'št', 'pi', 'so'][new Date(iso + 'T00:00:00').getDay()];
const diffDays = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);

// lineárna regresia trendu (kg za deň) z posledných n dní
function slope(points, days = 14) {
  if (points.length < 3) return null;
  const end = points[points.length - 1].date, from = calc.addDays(end, -days);
  const pts = points.filter(p => p.date >= from);
  if (pts.length < 3) return null;
  const xs = pts.map(p => diffDays(from, p.date)), ys = pts.map(p => p.trend);
  const mx = xs.reduce((a, b) => a + b) / xs.length, my = ys.reduce((a, b) => a + b) / ys.length;
  let num = 0, den = 0; xs.forEach((x, i) => { num += (x - mx) * (ys[i] - my); den += (x - mx) ** 2; });
  return den ? num / den : null;
}

// hodnotenie tempa podľa % telesnej hmotnosti za týždeň
function paceVerdict(goal, weekly, weight) {
  if (weekly == null || !weight) return { cls: '', text: 'Na výpočet tempa treba aspoň 3 váženia za 2 týždne.' };
  const pct = weekly / weight * 100;
  if (goal === 'lose') {
    if (pct <= -1.2) return { cls: 'warn', text: 'Chudneš príliš rýchlo. Hrozí strata svalov, pridaj 150 až 200 kcal.' };
    if (pct <= -0.35) return { cls: 'ok', text: 'Zdravé tempo chudnutia. Presne takto to má vyzerať.' };
    if (pct < 0.1) return { cls: 'mid', text: 'Váha skoro stojí. Skontroluj, či zapisuješ všetko, aj nápoje a omáčky.' };
    return { cls: 'warn', text: 'Váha ide hore. Uber 150 až 200 kcal alebo pridaj kroky.' };
  }
  if (goal === 'gain') {
    if (pct >= 0.75) return { cls: 'warn', text: 'Pribéraš rýchlo, časť bude tuk. Uber 100 až 150 kcal.' };
    if (pct >= 0.15) return { cls: 'ok', text: 'Ideálne tempo naberania svalov.' };
    return { cls: 'mid', text: 'Váha sa nehýbe. Pridaj 150 až 200 kcal, najlepšie zo sacharidov.' };
  }
  return Math.abs(pct) < 0.3 ? { cls: 'ok', text: 'Váha je stabilná, presne podľa cieľa.' } : { cls: 'mid', text: `Váha sa mení o ${sign(weekly)} ${U.wUnit()} týždenne. Pri udržiavaní uprav príjem o 100 až 150 kcal.` };
}
