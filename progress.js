// Pokrok: hero s tromi kruhmi, interaktívny graf váhy s predpoveďou, kalórie po dňoch, makrá v krúžkoch, kalendár po mesiacoch z krúžkov (s listovaním, bez konca), zistenia, odznaky.
// Čísla nabehnú, krivka sa nakreslí, stĺpce vyrastú, keď karta príde do obrazu. Po grafe aj stĺpcoch sa dá ťukať a ťahať prstom.
import * as db from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';
import { defaultWeek } from './report.js';
import * as U from './units.js';

const $app = () => ctx.$app;
const state = () => ctx.state;
const h = (...a) => ctx.h(...a), r0 = (...a) => ctx.r0(...a), nav = (...a) => ctx.nav(...a);
const FORECAST_DAYS = 56; // predpoveď váhy 8 týždňov dopredu (appka nemá koniec, žiadny 84-dňový program)
const MONF = ['Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún', 'Júl', 'August', 'September', 'Október', 'November', 'December'];
let calMonth = null; const calLoaded = new Set(); // zvolený mesiac v kalendári (RRRR-MM) a mesiace už načítané pri listovaní
// kalendár ako v Apple Fitness: každý deň je krúžok s dátumom, naplnený podľa toho, koľko z cieľa kcal si zjedol
function calHtml(ym, daily, T, start, today) {
  const [y, m] = ym.split('-').map(Number), dim = new Date(y, m, 0).getDate(), lead = (new Date(y, m - 1, 1).getDay() + 6) % 7, C = 2 * Math.PI * 15;
  let cells = Array.from({ length: lead }, () => '<span class="cl-e"></span>').join(''), logged = 0, ok = 0, past = 0;
  for (let i = 1; i <= dim; i++) {
    const d = `${ym}-${String(i).padStart(2, '0')}`; let cls = 'miss', pct = 0;
    if (d > today) cls = 'fut'; else if (d < start) cls = 'pre';
    else { past++; const x = daily[d]; if (x?.n) { logged++; const k = x.kcal; pct = T ? k / T : 0; cls = Math.abs(k - T) <= T * 0.1 ? 'ok' : k > T ? 'over' : 'under'; if (cls === 'ok') ok++; } }
    const fill = pct > 0 ? `<circle class="cl-f" cx="18" cy="18" r="15" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${C.toFixed(2)}" style="--off:${(C * (1 - Math.min(1, pct))).toFixed(2)}" transform="rotate(-90 18 18)"/>` : '';
    cells += `<div class="cl-d ${cls}${d === today ? ' now' : ''}" style="--i:${lead + i}" title="${calc.fmtDate(d)}"><svg viewBox="0 0 36 36" aria-hidden="true"><circle class="cl-t" cx="18" cy="18" r="15"/>${fill}</svg><b>${i}</b></div>`;
  }
  const sYm = start.slice(0, 7), cYm = today.slice(0, 7);
  return `<div class="pg-row cl-top"><h3>Kalendár</h3><div class="cl-nav"><button type="button" data-cal="-1" ${ym <= sYm ? 'disabled' : ''} aria-label="Predchádzajúci mesiac">‹</button><span>${MONF[m - 1]} ${y}</span><button type="button" data-cal="1" ${ym >= cYm ? 'disabled' : ''} aria-label="Ďalší mesiac">›</button></div></div>
      <div class="cl-stats"><span><i class="s-log"></i><b>${logged}</b> z ${past} dní zapísaných</span><span><i class="s-ok"></i><b>${ok}</b> v cieli</span></div>
      <div class="cl-wd">${['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'].map(x => `<span>${x}</span>`).join('')}</div>
      <div class="cl-g">${cells}</div>
      <div class="pg-legend cl-lg"><span><i class="ok"></i>v cieli</span><span><i class="over"></i>nad</span><span><i class="under"></i>pod</span><span><i class="miss"></i>nezapísané</span></div>`;
}
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
    if (pct >= 0.75) return { cls: 'warn', text: 'Priberáš rýchlo, časť bude tuk. Uber 100 až 150 kcal.' };
    if (pct >= 0.15) return { cls: 'ok', text: 'Ideálne tempo naberania svalov.' };
    return { cls: 'mid', text: 'Váha sa nehýbe. Pridaj 150 až 200 kcal, najlepšie zo sacharidov.' };
  }
  return Math.abs(pct) < 0.3 ? { cls: 'ok', text: 'Váha je stabilná, presne podľa cieľa.' } : { cls: 'mid', text: `Váha sa mení o ${sign(weekly)} ${U.wUnit()} týždenne. Pri udržiavaní uprav príjem o 100 až 150 kcal.` };
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

function kcalBars(days, daily, target) {
  const W = 340, H = 140, pb = 18, pt = 10;
  const vals = days.map(d => daily[d]?.kcal || 0);
  const max = Math.max(target * 1.3, ...vals) || 1;
  const gap = W / days.length, bw = gap * (days.length > 14 ? 0.66 : 0.56);
  const y = v => pt + (1 - v / max) * (H - pt - pb);
  const label = days.length <= 7 ? (d => dayName(d)) : ((d, i) => (i % 7 === 0 ? calc.fmtDate(d).replace(/[.]$/, '') : ''));
  const data = days.map((d, i) => [d, Math.round(vals[i])]);
  const ma = days.map((d, i) => { const w = vals.slice(Math.max(0, i - 6), i + 1).filter(v => v > 0); return w.length >= 2 ? w.reduce((a, b) => a + b, 0) / w.length : null; });
  const mp = ma.map((v, i) => v == null ? null : [i * gap + gap / 2, y(v)]).filter(Boolean);
  const maPath = mp.length >= 2 ? smooth(mp) : '';
  return `<div class="pgx-bw" data-bars='${JSON.stringify(data)}' data-t="${target}"><svg class="pgx-bars" viewBox="0 0 ${W} ${H}">
    <line x1="0" x2="${W}" y1="${y(target).toFixed(1)}" y2="${y(target).toFixed(1)}" class="pgx-goal"/>
    <text x="${W}" y="${(y(target) - 4).toFixed(1)}" text-anchor="end" class="pgx-ax">cieľ ${Number(target).toLocaleString('sk-SK')}</text>
    <defs><linearGradient id="pgxb-ok" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent)" stop-opacity=".45"/></linearGradient>
      <linearGradient id="pgxb-over" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent-2)"/><stop offset="1" stop-color="var(--accent-2)" stop-opacity=".45"/></linearGradient>
      <linearGradient id="pgxb-under" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5BB8FF"/><stop offset="1" stop-color="#5BB8FF" stop-opacity=".45"/></linearGradient></defs>
    ${days.map((d, i) => {
      const v = vals[i]; const cls = !v ? 'none' : v > target * 1.1 ? 'over' : v < target * 0.8 ? 'under' : 'ok';
      const top = v ? y(v) : H - pb - 3, bh = (H - pb) - top;
      return `<rect x="${(i * gap + (gap - bw) / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(3, bh).toFixed(1)}" rx="${Math.min(5, bw / 2).toFixed(1)}" class="b-${cls}" style="--i:${i}"/>
        ${label(d, i) ? `<text x="${(i * gap + gap / 2).toFixed(1)}" y="${H - 4}" text-anchor="middle" class="pgx-ax">${label(d, i)}</text>` : ''}`;
    }).join('')}
    ${maPath ? `<path d="${maPath}" class="pgx-ma" pathLength="1"/>` : ''}
  </svg></div>`;
}

// tri kruhy ako v Apple Fitness: zapisovanie, bielkoviny v cieli, kalórie v cieli
function rings(list) {
  const S = 132, c = S / 2, sw = 10, gapR = 13;
  return `<svg class="pgx-rings" viewBox="0 0 ${S} ${S}">${list.map((r, i) => {
    const rad = c - sw / 2 - i * gapR, len = 2 * Math.PI * rad;
    return `<circle cx="${c}" cy="${c}" r="${rad}" class="pgx-rt" style="stroke:${r.c}"/><circle cx="${c}" cy="${c}" r="${rad}" class="pgx-rv" style="stroke:${r.c};--len:${len.toFixed(1)};--to:${(len * (1 - Math.min(1, r.v))).toFixed(1)};--d:${i * 0.12}s" transform="rotate(-90 ${c} ${c})"/>`;
  }).join('')}</svg>`;
}

function miniRing(v, t, color) {
  const pct = t ? v / t : 0, R = 25, len = 2 * Math.PI * R;
  return `<svg viewBox="0 0 60 60" class="pgx-mr"><circle cx="30" cy="30" r="${R}" class="pgx-rt" style="stroke:${color}"/><circle cx="30" cy="30" r="${R}" class="pgx-rv" style="stroke:${color};--len:${len.toFixed(1)};--to:${(len * (1 - Math.min(1, pct))).toFixed(1)}" transform="rotate(-90 30 30)"/></svg>`;
}

const BADGES = [
  { id: 'first', icon: '🌱', name: 'Prvý zápis', test: s => s.totalItems >= 1 },
  { id: 'week', icon: '📅', name: 'Prvý týždeň', test: s => s.programDay >= 7 && s.loggedDays >= 5 },
  { id: 'streak7', icon: '🔥', name: '7 dní v rade', test: s => s.bestStreak >= 7 },
  { id: 'streak21', icon: '⚡', name: '21 dní v rade', test: s => s.bestStreak >= 21 },
  { id: 'items100', icon: '🍽️', name: '100 jedál', test: s => s.totalItems >= 100 },
  { id: 'protein', icon: '💪', name: 'Bielkovinový týždeň', test: s => s.proteinWeek },
  { id: 'kg2', icon: '🎯', name: s => `${s.goal === 'gain' ? '+' : '−'}${U.imp() ? 5 : 2} ${U.wUnit()}`, test: s => { const n = U.fromW(U.imp() ? 5 : 2); return s.goal === 'gain' ? s.change >= n : s.change <= -n; } },
  { id: 'kg5', icon: '🏆', name: s => `${s.goal === 'gain' ? '+' : '−'}${U.imp() ? 10 : 5} ${U.wUnit()}`, test: s => { const n = U.fromW(U.imp() ? 10 : 5); return s.goal === 'gain' ? s.change >= n : s.change <= -n; } },
  { id: 'half', icon: '⛰️', name: 'Mesiac s GainTrain', test: s => s.programDay >= 30 },
  { id: 'done', icon: '🥇', name: '100 dní s GainTrain', test: s => s.programDay >= 100 },
  { id: 'comeback', icon: '🌬️', name: 'Druhý dych', test: s => s.comebacks >= 1 },
];

function bestStreak(dates) {
  const s = [...new Set(dates)].sort(); let best = 0, cur = 0, prev = null;
  for (const d of s) { cur = prev && diffDays(prev, d) === 1 ? cur + 1 : 1; best = Math.max(best, cur); prev = d; }
  return best;
}

export function progressTabs(active) {
  return `<div class="seg mb ptabs"><a href="#/pokrok" class="${active === 'pokrok' ? 'on' : ''}">Prehľad</a><a href="#/vaha" class="${active === 'vaha' ? 'on' : ''}">Váha</a><a href="#/fotky" class="${active === 'fotky' ? 'on' : ''}">Fotky</a></div>`;
}

export async function renderProgress() {
  const p = state().profile, uid = p.id, today = calc.today();
  const start = p.start_date || today;
  const programDay = Math.max(1, diffDays(start, today) + 1);
  const from = period === 'all' ? start : calc.addDays(today, -(period - 1));
  // kalendár: mesiac po krúžkoch; aktuálny mesiac sa načíta vždy, staršie mesiace pri listovaní
  const gridFrom = today.slice(0, 7) + '-01';
  const [weights, daily, totalItems, actDates] = await Promise.all([
    db.listWeights(uid), db.dailyTotals(uid, calc.addDays(from < gridFrom ? from : gridFrom, -7), today), db.foodCount(uid).catch(() => 0),
    db.activityDates(uid, calc.addDays(today, -400)).catch(() => null),
  ]);
  const tr = calc.trend(weights.map(w => ({ date: w.date, weight: Number(w.weight_kg) })));
  const last = tr[tr.length - 1];
  const startW = Number(p.start_weight || tr[0]?.weight || 0);
  const change = last && startW ? last.trend - startW : 0;
  const sl = slope(tr, 14), weekly = sl == null ? null : sl * 7;
  const endDate = calc.addDays(today, FORECAST_DAYS);
  const projection = last && sl != null && endDate > last.date ? { date: endDate, w: last.trend + sl * diffDays(last.date, endDate) } : null;
  const pace = paceVerdict(p.goal, weekly, last?.trend);
  const trPeriod = tr.filter(t => t.date >= from);
  const days = []; for (let d = from; d <= today; d = calc.addDays(d, 1)) days.push(d);
  const logged = days.filter(d => daily[d]?.n);
  const T = p.target_kcal;
  const avg = k => logged.length ? logged.reduce((a, d) => a + daily[d][k], 0) / logged.length : 0;
  const avgK = avg('kcal'), avgP = avg('protein'), avgC = avg('carbs'), avgF = avg('fat');
  const inGoal = logged.filter(d => Math.abs(daily[d].kcal - T) <= T * 0.1).length;
  const allLoggedDates = Object.keys(daily).filter(d => daily[d].n);
  const bStreak = bestStreak(allLoggedDates);
  const protDays = logged.filter(d => daily[d].protein >= p.target_protein * 0.9).length;
  const last7 = calc.last7(today);
  const proteinWeek = last7.every(d => daily[d]?.protein >= p.target_protein * 0.9);

  // zistenia z dát
  const insights = [];
  if (logged.length >= 4) {
    const we = logged.filter(d => [0, 6].includes(new Date(d + 'T00:00:00').getDay())), wd = logged.filter(d => !we.includes(d));
    if (we.length && wd.length) {
      const a = we.reduce((s, d) => s + daily[d].kcal, 0) / we.length, b = wd.reduce((s, d) => s + daily[d].kcal, 0) / wd.length;
      if (Math.abs(a - b) >= 200) insights.push({ i: a > b ? '🍕' : '🥗', t: `Cez víkend ješ v priemere o ${r0(Math.abs(a - b))} kcal ${a > b ? 'viac' : 'menej'} ako cez týždeň.` });
    }
    insights.push({ i: '💪', t: `Bielkoviny si splnil ${protDays} z ${logged.length} zapísaných dní${protDays / logged.length < 0.5 ? '. Toto je najväčšia rezerva.' : '.'}` });
    const best = logged.reduce((b, d) => Math.abs(daily[d].kcal - T) < Math.abs(daily[b].kcal - T) ? d : b, logged[0]);
    insights.push({ i: '🎯', t: `Najpresnejší deň: ${dayName(best)} ${calc.fmtDate(best)} (${r0(daily[best].kcal)} kcal pri cieli ${T}).` });
  }
  if (bStreak >= 3) insights.push({ i: '🔥', t: `Najdlhšia séria zapisovania: ${bStreak} dní v rade.` });
  if (!insights.length) insights.push({ i: '🌱', t: 'Zapisuj aspoň 4 dni a appka ti tu ukáže, čo z tvojich dát vyplýva.' });

  // návrat po pauze aspoň 3 dni = odznak Druhý dych
  const sortedLog = [...allLoggedDates].sort();
  const comebacks = sortedLog.filter((d, i) => i > 0 && diffDays(sortedLog[i - 1], d) >= 4).length;
  const stats = { totalItems, programDay, loggedDays: allLoggedDates.length, bestStreak: bStreak, proteinWeek, change, goal: p.goal, comebacks };
  const macroTot = avgP * 4 + avgC * 4 + avgF * 9 || 1;
  const goodDir = p.goal === 'gain' ? change > 0 : p.goal === 'lose' ? change < 0 : Math.abs(change) < 1;

  // kruhy (v zvolenom období): zapisovanie, bielkoviny v cieli, kalórie v cieli; v strede celkový počet zapísaných dní, bez konca
  const perDays = days.filter(d => d >= start).length || 1;
  const totalLogged = new Set((actDates || allLoggedDates).filter(d => d <= today)).size; // celkový počet dní so zápisom, rastie bez konca
  const R = [
    { l: 'Zapisovanie', v: Math.min(1, logged.length / perDays), c: 'var(--accent)' },
    { l: 'Bielkoviny v cieli', v: logged.length ? protDays / logged.length : 0, c: '#5BB8FF' },
    { l: 'Kalórie v cieli', v: logged.length ? inGoal / logged.length : 0, c: '#FFB547' },
  ];
  const fibDays = logged.filter(d => daily[d].fiberN), avgFib = fibDays.length ? fibDays.reduce((a, d) => a + daily[d].fiber, 0) / fibDays.length : null;
  const M = [
    { l: 'Bielkoviny', v: logged.length ? avgP : null, t: p.target_protein, c: 'var(--protein)' },
    { l: 'Sacharidy', v: logged.length ? avgC : null, t: p.target_carbs, c: 'var(--carbs)' },
    { l: 'Tuky', v: logged.length ? avgF : null, t: p.target_fat, c: 'var(--fat)' },
    { l: 'Vláknina', v: avgFib, t: Math.max(25, Math.round((T || 2000) / 1000 * 14)), c: 'var(--fiber, #9BD45B)' },
  ];
  const perIdx = period === 7 ? 0 : period === 30 ? 1 : 2;

  // čipy pod grafom váhy: zmena v období, najnižšia a najvyššia hodnota trendu
  const tp = period === 'all' ? tr : trPeriod;
  const chips = tp.length >= 2 ? (() => {
    const ts = tp.map(t => t.trend), dlt = ts[ts.length - 1] - ts[0];
    const good = p.goal === 'gain' ? dlt > 0.05 : p.goal === 'lose' ? dlt < -0.05 : Math.abs(dlt) < 0.5;
    return `<div class="pgx-chips"><div class="${good ? 'good' : ''}"><b>${sign(dlt)}<small> ${U.wUnit()}</small></b><span>v tomto období</span></div><div><b>${fmt1(Math.min(...ts))}<small> ${U.wUnit()}</small></b><span>najnižšia</span></div><div><b>${fmt1(Math.max(...ts))}<small> ${U.wUnit()}</small></b><span>najvyššia</span></div></div>`;
  })() : '';

  // séria zapisovania: dni v rade (dnes sa ešte neráta ako prerušená), rekord, najbližší míľnik
  // rovnaká séria ako na Dnes a v Profile (zápis jedla, váhy, tréningu aj check-inu, s ochranou série), nie len jedlo
  const logSet = new Set(actDates || allLoggedDates);
  const cur = actDates ? calc.streakSafe([...logSet]).n : (() => { let n = 0, d = logSet.has(today) ? today : calc.addDays(today, -1); while (logSet.has(d)) { n++; d = calc.addDays(d, -1); } return n; })();
  const recBest = bestStreak([...logSet]);
  const MS = [3, 7, 14, 21, 30, 50, 84, 100, 150, 200], nextMs = MS.find(m => m > cur) || cur + 50, prevMs = [...MS].reverse().find(m => m <= cur) || 0;
  const left = nextMs - cur, pl = n => n === 1 ? 'deň' : n < 5 ? 'dni' : 'dní';
  const last14 = Array.from({ length: 14 }, (_, i) => calc.addDays(today, i - 13));
  const streakCard = `<section class="pg-card pgx-anim pgx-st ${cur ? 'hot' : ''}">
      <div class="st-top">
        <div class="st-fl"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="o" d="M13.5 0.7c.6 4.1-1.4 6.2-3.2 8.4C8.5 11.300 6.500 13.500 6.500 17c0 3.600 2.600 6.300 5.500 6.300s5.500-2.700 5.500-6.300c0-3.100-1.300-4.800-2.300-6.300-.5 1.100-1.100 1.800-1.900 2.400.6-4.500-.4-9.100-.3-12.400z"/><path class="i" d="M12 23.300c-2 0-3.500-1.700-3.500-3.900 0-2.600 2.200-3.800 3.200-5.700 1 1.900 3.800 3.100 3.800 5.700 0 2.200-1.500 3.900-3.500 3.900z"/></svg></div>
        <div class="st-n"><b data-to="${cur}">0</b><span>${cur ? `${pl(cur)} v rade` : 'žiadna séria'}</span></div>
        <div class="st-best"><b>${Math.max(recBest, bStreak, cur)}</b><span>rekord</span></div>
      </div>
      <div class="st-dots">${last14.map((d, i) => `<div class="${logSet.has(d) ? 'on' : ''}${d === today ? ' now' : ''}" style="--i:${i}"><i></i><span>${dayName(d)}</span></div>`).join('')}</div>
      <div class="st-next"><div class="st-bar"><i style="--w:${Math.round((cur - prevMs) / (nextMs - prevMs) * 100)}%"></i></div>
        <p>${cur ? `Ešte <b>${left} ${pl(left)}</b> do míľnika ${nextMs} dní.` : 'Zapíš dnes jedlo, váhu alebo tréning a spustíš novú sériu.'}</p></div>
    </section>`;

  $app().innerHTML = `<div class="screen pg">
    <h1 class="pg-h1">Pokrok</h1>
    ${progressTabs('pokrok')}
    ${logSet.size ? `<a class="rp-card" href="#/report?w=${defaultWeek()}"><span class="rp-card-i">📊</span><div><h3>Týždenný report</h3><p>Skóre týždňa, porovnanie a na čo sa zamerať.</p></div><span class="rp-card-go">›</span></a>` : ''}
    <div class="pg-per pgx-per" style="--i:${prevPer}" data-to="${perIdx}">${[[7, '7 dní'], [30, '30 dní'], ['all', 'Všetko']].map(([v, l]) => `<button data-per="${v}" class="${period === v ? 'on' : ''}">${l}</button>`).join('')}</div>

    <section class="pg-card pgx-hero pgx-anim">
      <i class="pgx-aur" aria-hidden="true"></i>
      <div class="pgx-htop">
        <div class="pgx-hl">
          <span class="pg-lbl">Od štartu</span>
          <b class="pgx-big ${goodDir ? 'good' : change ? 'bad' : ''}"><span ${last ? `data-to="${U.toW(change)}" data-dec="1" data-sign="1"` : ''}>${last ? sign(change) : '–'}</span><small> ${U.wUnit()}</small></b>
          <p class="pgx-sub">${last ? `Trendová váha <b>${fmt1(last.trend)} ${U.wUnit()}</b>` : 'Zatiaľ bez vážení'}${weekly != null ? `<br>${sign(weekly)} ${U.wUnit()} za týždeň` : ''}</p>
        </div>
        <div class="pgx-rw">${rings(R)}<div class="pgx-rc"><b data-to="${totalLogged}">${totalLogged}</b><span>${totalLogged === 1 ? 'zapísaný<br>deň' : totalLogged > 1 && totalLogged < 5 ? 'zapísané<br>dni' : 'zapísaných<br>dní'}</span></div></div>
      </div>
      <div class="pgx-rl">${R.map(r => `<span><i style="background:${r.c}"></i>${r.l}<b>${Math.round(Math.min(1, r.v) * 100)} %</b></span>`).join('')}</div>
      ${weightChart(period === 'all' ? tr : (trPeriod.length >= 2 ? trPeriod : tr.slice(-2)), startW, period === 'all' ? projection : null)}
      ${period === 'all' && projection ? `<div class="pgx-fc"><span>🏁</span><p>Pri tomto tempe budeš o 8 týždňov (${calc.fmtDate(endDate)}) vážiť približne <b>${fmt1(projection.w)} ${U.wUnit()}</b>.</p></div>` : projection ? `<p class="pgx-hint">Predpoveď na 8 týždňov dopredu uvidíš v zobrazení Všetko.</p>` : ''}
      ${chips}
      <p class="pg-pace ${pace.cls}">${pace.text}</p>
    </section>

    ${streakCard}

    <section class="pg-card pgx-anim pgx-kc">
      <div class="pg-row"><h3>Kalórie</h3><span class="pg-chip">${logged.length ? `${Math.round(inGoal / logged.length * 100)} % dní v cieli` : 'bez dát'}</span></div>
      <div class="pgx-kpis"><div><b>${logged.length ? `<span data-to="${Math.round(avgK)}">0</span>` : '–'}</b><span>priemer kcal</span></div><div><b>${Number(T).toLocaleString('sk-SK')}</b><span>cieľ kcal</span></div><div><b><span data-to="${logged.length}">0</span><small>/${days.length}</small></b><span>zapísané dni</span></div></div>
      ${kcalBars(period === 'all' && days.length > 42 ? days.slice(-42) : days, daily, T)}
      <p class="pgx-read">Ťukni na stĺpec a uvidíš presné číslo za deň.</p>
      <div class="pg-legend"><span><i class="b-ok"></i>v cieli</span><span><i class="b-over"></i>nad</span><span><i class="b-under"></i>pod</span></div>
    </section>

    <section class="pg-card pgx-anim">
      <div class="pg-row"><h3>Makrá v priemere</h3><span class="pg-chip">${logged.length ? `za ${logged.length} ${logged.length === 1 ? 'deň' : logged.length < 5 ? 'dni' : 'dní'}` : 'bez dát'}</span></div>
      <div class="pgx-mac">${M.map(m => `<div><div class="pgx-mrw">${miniRing(m.v, m.t, m.c)}<b>${m.v == null ? '–' : `<span data-to="${Math.round(m.v)}">0</span>`}<small>g</small></b></div><span>${m.l}</span><small>${m.v == null ? `cieľ ${m.t} g` : `${Math.round(m.v / m.t * 100)} % z ${m.t} g`}</small></div>`).join('')}</div>
    </section>

    <section class="pg-card pgx-anim pgx-hmc" id="pgCal">${calHtml(calMonth && calMonth <= today.slice(0, 7) ? calMonth : today.slice(0, 7), daily, T, start, today)}</section>

    <section class="pg-card">
      <h3 class="mb">Čo hovoria tvoje dáta</h3>
      <div class="pgx-ins">${insights.map((x, i) => `<article style="--k:${['var(--accent)', '#5BB8FF', '#FFB547', 'var(--accent-2)'][i % 4]}"><span>${x.i}</span><p>${h(x.t)}</p></article>`).join('')}</div>
    </section>

    <section class="pg-card">
      <div class="pg-row"><h3>Odznaky</h3><span class="pg-chip">${BADGES.filter(b => b.test(stats)).length} z ${BADGES.length}</span></div>
      <div class="pg-badges">${BADGES.map(b => { const ok = b.test(stats); const name = typeof b.name === 'function' ? b.name(stats) : b.name; return `<div class="bd ${ok ? 'ok' : ''}"><span>${b.icon}</span><small>${h(name)}</small></div>`; }).join('')}</div>
    </section>
  </div>${nav('#/pokrok')}`;

  const calSec = $app().querySelector('#pgCal');
  if (calSec) calSec.addEventListener('click', async e => {
    const b = e.target.closest('[data-cal]'); if (!b || b.disabled) return;
    const cur = calMonth && calMonth <= today.slice(0, 7) ? calMonth : today.slice(0, 7);
    const [y, m] = cur.split('-').map(Number), nd = new Date(y, m - 1 + Number(b.dataset.cal), 1);
    calMonth = `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}`;
    const mFrom = calMonth + '-01', mTo = calMonth + '-' + String(new Date(nd.getFullYear(), nd.getMonth() + 1, 0).getDate()).padStart(2, '0');
    if (!calLoaded.has(calMonth) && mFrom < gridFrom) { try { Object.assign(daily, await db.dailyTotals(uid, mFrom, mTo)); calLoaded.add(calMonth); } catch { /* bez siete ukáž, čo je */ } }
    calSec.innerHTML = calHtml(calMonth, daily, T, start, today);
    calSec.classList.remove('in'); requestAnimationFrame(() => requestAnimationFrame(() => calSec.classList.add('in')));
  });
  $app().querySelectorAll('[data-per]').forEach(b => b.onclick = () => { prevPer = perIdx; period = b.dataset.per === 'all' ? 'all' : Number(b.dataset.per); renderProgress(); });
  const per = $app().querySelector('.pgx-per');
  if (per) requestAnimationFrame(() => requestAnimationFrame(() => per.style.setProperty('--i', per.dataset.to)));
  prevPer = perIdx;
  enhance($app());
}

// ---------- animácie a interakcia (spustia sa, keď karta príde do obrazu) ----------
const RM = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function countUp(el) {
  const to = Number(el.dataset.to), dec = Number(el.dataset.dec || 0), sg = el.dataset.sign === '1';
  const f = v => { const a = Math.abs(v).toLocaleString('sk-SK', { minimumFractionDigits: dec, maximumFractionDigits: dec }); return sg ? (v > 0.0001 ? '+' : v < -0.0001 ? '−' : '') + a : a; };
  if (RM() || !isFinite(to)) { el.textContent = isFinite(to) ? f(to) : '–'; return; }
  const t0 = performance.now(), D = 1100;
  const step = t => { const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 3); el.textContent = f(to * e); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function bindChart(cw) {
  const pts = JSON.parse(cw.dataset.pts || '[]'), W = Number(cw.dataset.w), H = Number(cw.dataset.h);
  if (!pts.length) return;
  const svg = cw.querySelector('svg'), cur = cw.querySelector('.pgx-cur'), dot = cw.querySelector('.pgx-dot'), tip = cw.querySelector('.pgx-tip');
  const show = cx => {
    const r = svg.getBoundingClientRect(), sx = (cx - r.left) / r.width * W;
    let best = pts[0]; for (const p of pts) if (Math.abs(p[0] - sx) < Math.abs(best[0] - sx)) best = p;
    cur.setAttribute('x1', best[0]); cur.setAttribute('x2', best[0]);
    const lx = best[0] / W * 100, ly = best[1] / H * 100;
    dot.style.left = lx + '%'; dot.style.top = ly + '%';
    tip.innerHTML = `<b>${fmt1(best[3])} ${U.wUnit()}</b><span>${calc.fmtDate(best[2])}${Math.abs(best[4] - best[3]) >= 0.05 ? ` · vážené ${fmt1(best[4])}` : ''}</span>`;
    tip.style.left = Math.max(14, Math.min(86, lx)) + '%';
    cw.classList.add('on');
    if (navigator.vibrate && cw.__last !== best[2]) { cw.__last = best[2]; navigator.vibrate(4); }
  };
  const hide = () => cw.classList.remove('on');
  cw.addEventListener('pointerdown', e => { show(e.clientX); });
  cw.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || e.buttons || e.pressure) show(e.clientX); });
  cw.addEventListener('pointerup', () => setTimeout(hide, 1400));
  cw.addEventListener('pointerleave', () => setTimeout(hide, 300));
}
function bindBars(bw) {
  const data = JSON.parse(bw.dataset.bars || '[]'), out = bw.closest('.pg-card')?.querySelector('.pgx-read');
  const rects = [...bw.querySelectorAll('rect')], T = Number(bw.dataset.t);
  const pick = cx => {
    const r = bw.getBoundingClientRect(), i = Math.max(0, Math.min(data.length - 1, Math.floor((cx - r.left) / r.width * data.length)));
    rects.forEach((x, k) => x.classList.toggle('sel', k === i));
    const [d, v] = data[i];
    if (out) out.innerHTML = v ? `<b>${v.toLocaleString('sk-SK')} kcal</b> ${dayName(d)} ${calc.fmtDate(d)} · ${v > T ? `o ${(v - T).toLocaleString('sk-SK')} nad cieľom` : `o ${(T - v).toLocaleString('sk-SK')} pod cieľom`}` : `${dayName(d)} ${calc.fmtDate(d)} · nezapísané`;
  };
  bw.addEventListener('pointerdown', e => pick(e.clientX));
  bw.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'mouse') pick(e.clientX); });
}
function enhance(root) {
  root.querySelectorAll('.pgx-cw').forEach(bindChart);
  root.querySelectorAll('.pgx-bw').forEach(bindBars);
  const go = el => { el.classList.add('in'); el.querySelectorAll('[data-to]').forEach(countUp); };
  if (!('IntersectionObserver' in window) || RM()) { root.querySelectorAll('.pgx-anim').forEach(go); return; }
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { go(e.target); io.unobserve(e.target); } }), { threshold: 0.25 });
  root.querySelectorAll('.pgx-anim').forEach(el => io.observe(el));
}
