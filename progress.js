// Pokrok: hero s tromi kruhmi, interaktívny graf váhy s predpoveďou, kalórie po dňoch, makrá v krúžkoch, mriežka 84 dní, zistenia, odznaky.
// Čísla nabehnú, krivka sa nakreslí, stĺpce vyrastú, keď karta príde do obrazu. Po grafe aj stĺpcoch sa dá ťukať a ťahať prstom.
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
    if (pct >= 0.75) return { cls: 'warn', text: 'Pribéraš rýchlo, časť bude tuk. Uber 100 až 150 kcal.' };
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

function kcalBars(days, daily, target) {
  const W = 340, H = 140, pb = 18, pt = 10;
  const vals = days.map(d => daily[d]?.kcal || 0);
  const max = Math.max(target * 1.3, ...vals) || 1;
  const gap = W / days.length, bw = gap * (days.length > 14 ? 0.66 : 0.56);
  const y = v => pt + (1 - v / max) * (H - pt - pb);
  const label = days.length <= 7 ? (d => dayName(d)) : ((d, i) => (i % 7 === 0 ? calc.fmtDate(d).replace(/[.]$/, '') : ''));
  const data = days.map((d, i) => [d, Math.round(vals[i])]);
  return `<div class="pgx-bw" data-bars='${JSON.stringify(data)}' data-t="${target}"><svg class="pgx-bars" viewBox="0 0 ${W} ${H}">
    <line x1="0" x2="${W}" y1="${y(target).toFixed(1)}" y2="${y(target).toFixed(1)}" class="pgx-goal"/>
    <text x="${W}" y="${(y(target) - 4).toFixed(1)}" text-anchor="end" class="pgx-ax">cieľ ${Number(target).toLocaleString('sk-SK')}</text>
    ${days.map((d, i) => {
      const v = vals[i]; const cls = !v ? 'none' : v > target * 1.1 ? 'over' : v < target * 0.8 ? 'under' : 'ok';
      const top = v ? y(v) : H - pb - 3, bh = (H - pb) - top;
      return `<rect x="${(i * gap + (gap - bw) / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(3, bh).toFixed(1)}" rx="${Math.min(5, bw / 2).toFixed(1)}" class="b-${cls}" style="--i:${i}"/>
        ${label(d, i) ? `<text x="${(i * gap + gap / 2).toFixed(1)}" y="${H - 4}" text-anchor="middle" class="pgx-ax">${label(d, i)}</text>` : ''}`;
    }).join('')}
  </svg></div>`;
}

// tri kruhy ako v Apple Fitness: program, zapisovanie, kalórie v cieli
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
  { id: 'kg2', icon: '🎯', name: s => s.goal === 'gain' ? '+2 kg' : '−2 kg', test: s => s.goal === 'gain' ? s.change >= 2 : s.change <= -2 },
  { id: 'kg5', icon: '🏆', name: s => s.goal === 'gain' ? '+5 kg' : '−5 kg', test: s => s.goal === 'gain' ? s.change >= 5 : s.change <= -5 },
  { id: 'half', icon: '⛰️', name: 'Polovica programu', test: s => s.programDay >= 42 },
  { id: 'done', icon: '🥇', name: 'Celý program', test: s => s.programDay >= 84 },
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
  const gridFrom = calc.weekStart(start);
  const [weights, daily, totalItems] = await Promise.all([
    db.listWeights(uid), db.dailyTotals(uid, calc.addDays(from < gridFrom ? from : gridFrom, -7), today), db.foodCount(uid).catch(() => 0),
  ]);
  const tr = calc.trend(weights.map(w => ({ date: w.date, weight: Number(w.weight_kg) })));
  const last = tr[tr.length - 1];
  const startW = Number(p.start_weight || tr[0]?.weight || 0);
  const change = last && startW ? last.trend - startW : 0;
  const sl = slope(tr, 14), weekly = sl == null ? null : sl * 7;
  const endDate = calc.addDays(start, PROGRAM_DAYS - 1);
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

  // mriežka programu 12 × 7
  const grid = Array.from({ length: 12 }, (_, w) => Array.from({ length: 7 }, (_, d) => calc.addDays(gridFrom, w * 7 + d)));
  const cell = (d, n) => {
    if (d < start || d > endDate) return '<i class="g-out"></i>';
    const st = ` style="--i:${n}"`;
    if (d > today) return `<i class="g-fut"${st}></i>`;
    const k = daily[d]?.kcal || 0;
    const cls = !daily[d]?.n ? 'g-miss' : Math.abs(k - T) <= T * 0.1 ? 'g-ok' : k > T ? 'g-over' : 'g-under';
    return `<i class="${cls}${d === today ? ' g-now' : ''}" title="${calc.fmtDate(d)}"${st}></i>`;
  };

  // návrat po pauze aspoň 3 dni = odznak Druhý dych
  const sortedLog = [...allLoggedDates].sort();
  const comebacks = sortedLog.filter((d, i) => i > 0 && diffDays(sortedLog[i - 1], d) >= 4).length;
  const stats = { totalItems, programDay, loggedDays: allLoggedDates.length, bestStreak: bStreak, proteinWeek, change, goal: p.goal, comebacks };
  const macroTot = avgP * 4 + avgC * 4 + avgF * 9 || 1;
  const goodDir = p.goal === 'gain' ? change > 0 : p.goal === 'lose' ? change < 0 : Math.abs(change) < 1;

  // kruhy: program, zapisovanie (zapísané dni v programe), kalórie v cieli (v zvolenom období)
  const elapsed = Math.min(programDay, PROGRAM_DAYS);
  const progLogged = allLoggedDates.filter(d => d >= start && d <= today).length;
  const R = [
    { l: 'Program', v: elapsed / PROGRAM_DAYS, c: 'var(--accent)' },
    { l: 'Zapisovanie', v: elapsed ? progLogged / elapsed : 0, c: '#5BB8FF' },
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

  $app().innerHTML = `<div class="screen pg">
    <h1 class="pg-h1">Pokrok</h1>
    ${progressTabs('pokrok')}
    <a class="rp-card" href="#/report?w=${defaultWeek()}"><span class="rp-card-i">📊</span><div><h3>Týždenný report</h3><p>Skóre týždňa, porovnanie a na čo sa zamerať.</p></div><span class="rp-card-go">›</span></a>
    <div class="pg-per pgx-per" style="--i:${prevPer}" data-to="${perIdx}">${[[7, '7 dní'], [30, '30 dní'], ['all', 'Celý program']].map(([v, l]) => `<button data-per="${v}" class="${period === v ? 'on' : ''}">${l}</button>`).join('')}</div>

    <section class="pg-card pgx-hero pgx-anim">
      <div class="pgx-htop">
        <div class="pgx-hl">
          <span class="pg-lbl">Od štartu</span>
          <b class="pgx-big ${goodDir ? 'good' : change ? 'bad' : ''}"><span ${last ? `data-to="${change}" data-dec="1" data-sign="1"` : ''}>${last ? sign(change) : '–'}</span><small> kg</small></b>
          <p class="pgx-sub">${last ? `Teraz <b>${fmt1(last.trend)} kg</b>` : 'Zatiaľ bez váženia'}${weekly != null ? `<br>${sign(weekly)} kg za týždeň` : ''}</p>
        </div>
        <div class="pgx-rw">${rings(R)}<div class="pgx-rc"><b data-to="${elapsed}">${elapsed}</b><span>z ${PROGRAM_DAYS} dní</span></div></div>
      </div>
      <div class="pgx-rl">${R.map(r => `<span><i style="background:${r.c}"></i>${r.l}<b>${Math.round(Math.min(1, r.v) * 100)} %</b></span>`).join('')}</div>
      ${weightChart(period === 'all' ? tr : (trPeriod.length >= 2 ? trPeriod : tr.slice(-2)), startW, period === 'all' ? projection : null)}
      ${period === 'all' && projection ? `<div class="pgx-fc"><span>🏁</span><p>Pri tomto tempe budeš ${calc.fmtDate(endDate)} vážiť približne <b>${fmt1(projection.w)} kg</b>.</p></div>` : projection ? `<p class="pgx-hint">Predpoveď do konca programu uvidíš v zobrazení Celý program.</p>` : ''}
      <p class="pg-pace ${pace.cls}">${pace.text}</p>
    </section>

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

    <section class="pg-card pgx-anim pgx-gc">
      <div class="pg-row"><h3>12 týždňov programu</h3><span class="pg-chip">deň ${Math.min(programDay, PROGRAM_DAYS)} z ${PROGRAM_DAYS}</span></div>
      <div class="pg-grid"><div class="pg-gd">${['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'].map(x => `<span>${x}</span>`).join('')}</div>
        ${grid.map((wk, i) => `<div class="pg-gw"><span class="pg-gn">${i + 1}</span>${wk.map((d, j) => cell(d, i * 7 + j)).join('')}</div>`).join('')}</div>
      <div class="pg-legend"><span><i class="g-ok"></i>v cieli</span><span><i class="g-over"></i>nad</span><span><i class="g-under"></i>pod</span><span><i class="g-miss"></i>nezapísané</span></div>
    </section>

    <section class="pg-card">
      <h3 class="mb">Čo hovoria tvoje dáta</h3>
      <ul class="pg-ins">${insights.map(x => `<li><span>${x.i}</span><p>${h(x.t)}</p></li>`).join('')}</ul>
    </section>

    <section class="pg-card">
      <div class="pg-row"><h3>Odznaky</h3><span class="pg-chip">${BADGES.filter(b => b.test(stats)).length} z ${BADGES.length}</span></div>
      <div class="pg-badges">${BADGES.map(b => { const ok = b.test(stats); const name = typeof b.name === 'function' ? b.name(stats) : b.name; return `<div class="bd ${ok ? 'ok' : ''}"><span>${b.icon}</span><small>${h(name)}</small></div>`; }).join('')}</div>
    </section>
  </div>${nav('#/pokrok')}`;

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
    tip.innerHTML = `<b>${fmt1(best[3])} kg</b><span>${calc.fmtDate(best[2])}${Math.abs(best[4] - best[3]) >= 0.05 ? ` · vážené ${fmt1(best[4])}` : ''}</span>`;
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
