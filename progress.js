// Pokrok: hero s tromi kruhmi, interaktívny graf váhy s predpoveďou, kalórie po dňoch, makrá v krúžkoch, mriežka 84 dní, zistenia, odznaky.
// Čísla nabehnú, krivka sa nakreslí, stĺpce vyrastú, keď karta príde do obrazu. Po grafe aj stĺpcoch sa dá ťukat’ a ťahať prstom.
import * as db from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';
import { defaultWeek } from './report.js';

const $app = () => ctx.$app;
const state = () => ctx.state;
const h = (...a) => ctx.h(...a), r0 = (...a) => ctx.r0(...a), nav = (...a) => ctx.nav(...a);
const PROGRAM_DAYS = 84;
// štýly Pokroku v2 (kruhy, interaktívny graf, animácie)
if (!document.getElementById('pgx-css')) { const l = document.createElement('link'); l.id = 'pgx-css'; l.rel = 'stylesheet'; l.href = './progressx.css'; document.head.appendChild(l); }
let period = 30; // 7 | 30 | 'all'
let prevPer = 1; // index predošlého obdobia (pre plynulý posun indikátora)

const fmt1 = v => (Math.round(v * 10) / 10).toLocaleString('sk-SK', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const sign = v => (v > 0 ? '+' : v < 0 ? '−' : '') + fmt1(Math.abs(v));
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
    if (pct >= 0.75) return { cls: 'warn', text: 'Pribáraš rýchlo, časť bude tuk. Uber 100 až 150 kcal.' };
    if (pct >= 0.15) return { cls: 'ok', text: 'Ideálne tempo naberania svalov.' };
    return { cls: 'mid', text: 'Váha sa nehýbe. Pridaj 150 až 200 kcal, najlepšie zo sacharidov.' };
  }
  return Math.abs(pct) < 0.3 ? { cls: 'ok', text: 'Váha je stabilná, presne podľa cieľa.' } : { cls: 'mid', text: `Váha sa mení o ${sign(weekly)} kg týždenne. Pri udržiavaní uprav príjem o 100 až 150 kcal.` };
}

// hladká krivka (Catmull-Rom), kontrolné body orezané do rozsahu, aby krivka nepreletela mimo dát
function smooth(P) {
  if (P.length < 2) return '';
  if (P.length === 2) return `M${P[0][0]},${P[0][1]} L${P[1][0]},${P[1][1]}`;
  const ys = P.map(p => p[1]), lo = Math.min(...ys), hi = Math.max(...ys), cl = v => Math.max(lo, Math.min(hi, v));
  let d = `M${P[0][0].toFixed(1)},${P[0][1].toFixed(1)}`;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, cl(p1[1] + (p2[1] - p0[1]) / 6)], c2 = [p2[0] - (p3[0] - p1[0]) / 6, cl(p2[1] - (p3[1] - p1[1]) / 6)];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

function weightChart(tr, startW, projection) {
  const W = 340, H = 170, pl = 6, pr = 6, pt = 14, pb = 22;
  if (tr.length < 2) return '<div class="pgx-empty"><span>⚖️</span><p>Graf sa ukáže po druhom vážení. Váž sa ráno, nalačno, po toalete.</p><a class="btn sm" href="#/vaha">Zapísať váhu</a></div>';
  const all = [...tr.map(p => p.trend), ...tr.map(p => p.weight)]; if (projection) all.push(projection.w); if (startW) all.push(startW);
  let min = Math.min(...all), max = Math.max(...all); const pad = Math.max(0.4, (max - min) * 0.14); min -= pad; max += pad;
  const d0 = tr[0].date, dN = projection ? projection.date : tr[tr.length - 1].date, span = Math.max(1, diffDays(d0, dN));
  const x = d => pl + diffDays(d0, d) / span * (W - pl - pr), y = v => pt + (1 - (v - min) / (max - min)) * (H - pt - pb);
  const P = tr.map(p => [x(p.date), y(p.trend)]);
  const line = smooth(P), lp = P[P.length - 1], last = tr[tr.length - 1];
  const data = tr.map(p => [+x(p.date).toFixed(1), +y(p.trend).toFixed(1), p.date, p.trend, p.weight]);
  return `<div class="pgx-cw" data-pts='${JSON.stringify(data)}' data-w="${W}" data-h="${H}">
  <svg class="pgx-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <defs><linearGradient id="pgxg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".34"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
    ${[0.25, 0.5, 0.75].map(f => `<line x1="${pl}" x2="${W - pr}" y1="${(pt + f * (H - pt - pb)).toFixed(1)}" y2="${(pt + f * (H - pt - pb)).toFixed(1)}" class="pgx-gl"/>`).join('')}
    ${startW ? `<line x1="${pl}" x2="${W - pr}" y1="${y(startW).toFixed(1)}" y2="${y(startW).toFixed(1)}" class="pgx-base"/>` : ''}
    <path d="${line} L${lp[0].toFixed(1)},${H - pb} L${P[0][0].toFixed(1)},${H - pb} Z" fill="url(#pgxg)" class="pgx-area"/>
    ${tr.map(p => `<circle cx="${x(p.date).toFixed(1)}" cy="${y(p.weight).toFixed(1)}" r="2.3" class="pgx-raw"/>`).join('')}
    <path d="${line}" class="pgx-line" pathLength="1"/>
    ${projection ? `<path d="M${lp[0].toFixed(1)},${lp[1].toFixed(1)} L${x(projection.date).toFixed(1)},${y(projection.w).toFixed(1)}" class="pgx-proj"/>` : ''}
    <line class="pgx-cur" x1="0" x2="0" y1="${pt}" y2="${H - pb}"/>
    <text x="${pl}" y="${H - 6}" class="pgx-ax">${calc.fmtDate(d0)}</text>
    <text x="${W - pr}" y="${H - 6}" text-anchor="end" class="pgx-ax">${projection ? calc.fmtDate(projection.date) : calc.fmtDate(last.date)}</text>
  </svg>
  ${startW ? `<span class="pgx-tag" style="top:${(y(startW) / H * 100).toFixed(1)}%">štart ${fmt1(startW)}</span>` : ''}
  <i class="pgx-now" style="left:${(lp[0] / W * 100).toFixed(2)}%;top:${(lp[1] / H * 100).toFixed(2)}%"></i>
  ${projection ? `<span class="pgx-flag" style="left:${(x(projection.date) / W * 100).toFixed(2)}%;top:${(y(projection.w) / H * 100).toFixed(2)}%">🏁</span>` : ''}
  <i class="pgx-dot"></i><div class="pgx-tip"></div>
</div>`;
}
