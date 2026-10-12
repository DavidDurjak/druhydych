// Pokrok v0.6: obdobie, trend váhy s predpoveďou, kalórie po dňoch, mriežka 84 dní, zistenia z dát, odznaky
import * as db from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';
import { defaultWeek } from './report.js';

const $app = () => ctx.$app;
const state = () => ctx.state;
const h = (...a) => ctx.h(...a), r0 = (...a) => ctx.r0(...a), nav = (...a) => ctx.nav(...a);
const PROGRAM_DAYS = 84;
let period = 30; // 7 | 30 | 'all'

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
    if (pct >= 0.75) return { cls: 'warn', text: 'Priberáš rýchlo, časť bude tuk. Uber 100 až 150 kcal.' };
    if (pct >= 0.15) return { cls: 'ok', text: 'Ideálne tempo naberania svalov.' };
    return { cls: 'mid', text: 'Váha sa nehýbe. Pridaj 150 až 200 kcal, najlepšie zo sacharidov.' };
  }
  return Math.abs(pct) < 0.3 ? { cls: 'ok', text: 'Váha je stabilná, presne podľa cieľa.' } : { cls: 'mid', text: `Váha sa mení o ${sign(weekly)} kg týždenne. Pri udržiavaní uprav príjem o 100 až 150 kcal.` };
}

function weightChart(tr, startW, projection) {
  const W = 340, H = 150, pl = 4, pr = 4, pt = 10, pb = 20;
  if (tr.length < 2) return '<p class="pg-empty">Graf sa ukáže po druhom vážení.</p>';
  const pts = tr.map(p => ({ ...p }));
  const all = [...pts.map(p => p.trend), ...pts.map(p => p.weight)]; if (projection) all.push(projection.w);
  let min = Math.min(...all), max = Math.max(...all); const pad = Math.max(0.4, (max - min) * 0.12); min -= pad; max += pad;
  const d0 = pts[0].date, dN = projection ? projection.date : pts[pts.length - 1].date, span = Math.max(1, diffDays(d0, dN));
  const x = d => pl + diffDays(d0, d) / span * (W - pl - pr), y = v => pt + (1 - (v - min) / (max - min)) * (H - pt - pb);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.trend).toFixed(1)}`).join(' ');
  const lastP = pts[pts.length - 1];
  return `<svg class="pg-wchart" viewBox="0 0 ${W} ${H}">
    <defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7CFFB2" stop-opacity=".28"/><stop offset="1" stop-color="#7CFFB2" stop-opacity="0"/></linearGradient></defs>
    ${startW ? `<line x1="${pl}" x2="${W - pr}" y1="${y(startW)}" y2="${y(startW)}" class="pg-base"/><text x="${W - pr}" y="${y(startW) - 4}" text-anchor="end" class="pg-ax">štart ${fmt1(startW)}</text>` : ''}
    <path d="${line} L${x(lastP.date)},${H - pb} L${x(d0)},${H - pb} Z" fill="url(#wg)"/>
    ${pts.map(p => `<circle cx="${x(p.date).toFixed(1)}" cy="${y(p.weight).toFixed(1)}" r="2.2" class="pg-raw"/>`).join('')}
    <path d="${line}" class="pg-trend"/>
    ${projection ? `<path d="M${x(lastP.date)},${y(lastP.trend)} L${x(projection.date)},${y(projection.w)}" class="pg-proj"/><circle cx="${x(projection.date)}" cy="${y(projection.w)}" r="4" class="pg-projdot"/>` : ''}
    <circle cx="${x(lastP.date)}" cy="${y(lastP.trend)}" r="4.5" class="pg-now"/>
    <text x="${pl}" y="${H - 5}" class="pg-ax">${calc.fmtDate(d0)}</text>
    <text x="${W - pr}" y="${H - 5}" text-anchor="end" class="pg-ax">${projection ? 'koniec programu' : calc.fmtDate(lastP.date)}</text>
  </svg>`;
}

function kcalBars(days, daily, target) {
  const W = 340, H = 140, pb = 18, pt = 8;
  const vals = days.map(d => daily[d]?.kcal || 0);
  const max = Math.max(target * 1.3, ...vals) || 1;
  const bw = (W / days.length) * 0.62, gap = W / days.length;
  const y = v => pt + (1 - v / max) * (H - pt - pb);
  const label = days.length <= 7 ? (d => dayName(d)) : ((d, i) => (i % 7 === 0 ? calc.fmtDate(d).replace(/[.]$/, '') : ''));
  return `<svg class="pg-bars" viewBox="0 0 ${W} ${H}">
    <line x1="0" x2="${W}" y1="${y(target)}" y2="${y(target)}" class="pg-goal"/>
    ${days.map((d, i) => {
      const v = vals[i]; const cls = !v ? 'none' : v > target * 1.1 ? 'over' : v < target * 0.8 ? 'under' : 'ok';
      const bh = v ? Math.max(3, (H - pt - pb) - (y(v) - pt)) : 3;
      return `<rect x="${(i * gap + (gap - bw) / 2).toFixed(1)}" y="${(v ? y(v) : H - pb - 3).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="${Math.min(4, bw / 2).toFixed(1)}" class="b-${cls}"/>
        ${label(d, i) ? `<text x="${(i * gap + gap / 2).toFixed(1)}" y="${H - 4}" text-anchor="middle" class="pg-ax">${label(d, i)}</text>` : ''}`;
    }).join('')}
  </svg>`;
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
  const cell = d => {
    if (d < start || d > endDate) return '<i class="g-out"></i>';
    if (d > today) return '<i class="g-fut"></i>';
    const k = daily[d]?.kcal || 0;
    const cls = !daily[d]?.n ? 'g-miss' : Math.abs(k - T) <= T * 0.1 ? 'g-ok' : k > T ? 'g-over' : 'g-under';
    return `<i class="${cls}${d === today ? ' g-now' : ''}" title="${calc.fmtDate(d)}"></i>`;
  };

  const stats = { totalItems, programDay, loggedDays: allLoggedDates.length, bestStreak: bStreak, proteinWeek, change, goal: p.goal };
  const macroTot = avgP * 4 + avgC * 4 + avgF * 9 || 1;
  const goodDir = p.goal === 'gain' ? change > 0 : p.goal === 'lose' ? change < 0 : Math.abs(change) < 1;

  $app().innerHTML = `<div class="screen pg">
    <h1 class="pg-h1">Pokrok</h1>
    ${progressTabs('pokrok')}
    <a class="rp-card" href="#/report?w=${defaultWeek()}"><span class="rp-card-i">📊</span><div><h3>Týždenný report</h3><p>Skóre týždňa, porovnanie a na čo sa zamerať.</p></div><span class="rp-card-go">›</span></a>
    <div class="pg-per">${[[7, '7 dní'], [30, '30 dní'], ['all', 'Celý program']].map(([v, l]) => `<button data-per="${v}" class="${period === v ? 'on' : ''}">${l}</button>`).join('')}</div>

    <section class="pg-card pg-weight">
      <div class="pg-wtop">
        <div><span class="pg-lbl">Od štartu</span><b class="pg-big ${goodDir ? 'good' : change ? 'bad' : ''}">${last ? sign(change) : '–'}<small> kg</small></b></div>
        <div class="pg-wnow"><span class="pg-lbl">Teraz</span><b>${last ? fmt1(last.trend) : '–'} kg</b>${weekly != null ? `<span class="pg-rate">${sign(weekly)} kg / týždeň</span>` : ''}</div>
      </div>
      ${weightChart(period === 'all' ? tr : (trPeriod.length >= 2 ? trPeriod : tr.slice(-2)), startW, period === 'all' ? projection : null)}
      ${projection ? `<p class="pg-proj-t">Pri tomto tempe budeš na konci programu (${calc.fmtDate(endDate)}) vážiť približne <b>${fmt1(projection.w)} kg</b>.</p>` : ''}
      <p class="pg-pace ${pace.cls}">${pace.text}</p>
    </section>

    <section class="pg-card">
      <div class="pg-row"><h3>Kalórie</h3><span class="pg-chip">${logged.length ? `${Math.round(inGoal / logged.length * 100)} % dní v cieli` : 'bez dát'}</span></div>
      <div class="pg-kpis"><div><b>${logged.length ? r0(avgK) : '–'}</b><span>priemer kcal</span></div><div><b>${T}</b><span>cieľ kcal</span></div><div><b>${logged.length}/${days.length}</b><span>zapísané dni</span></div></div>
      ${kcalBars(period === 'all' && days.length > 42 ? days.slice(-42) : days, daily, T)}
      <div class="pg-legend"><span><i class="b-ok"></i>v cieli</span><span><i class="b-over"></i>nad</span><span><i class="b-under"></i>pod</span></div>
    </section>

    <section class="pg-card">
      <div class="pg-row"><h3>Makrá v priemere</h3><span class="pg-chip">${logged.length ? `${r0(avgP)} g bielkovín` : 'bez dát'}</span></div>
      <div class="pg-split">${logged.length ? `<i style="flex:${avgP * 4 / macroTot};background:var(--protein)"></i><i style="flex:${avgC * 4 / macroTot};background:var(--carbs)"></i><i style="flex:${avgF * 9 / macroTot};background:var(--fat)"></i>` : '<i style="flex:1;background:var(--track)"></i>'}</div>
      <div class="pg-macros">
        ${[['Bielkoviny', avgP, p.target_protein, 'var(--protein)'], ['Sacharidy', avgC, p.target_carbs, 'var(--carbs)'], ['Tuky', avgF, p.target_fat, 'var(--fat)']].map(([l, v, t, c]) => `<div><span class="dot" style="background:${c}"></span><b>${r0(v)}</b><small>/${t} g</small><span>${l}</span></div>`).join('')}
      </div>
    </section>

    <section class="pg-card">
      <div class="pg-row"><h3>12 týždňov programu</h3><span class="pg-chip">deň ${Math.min(programDay, PROGRAM_DAYS)} z ${PROGRAM_DAYS}</span></div>
      <div class="pg-grid"><div class="pg-gd">${['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'].map(x => `<span>${x}</span>`).join('')}</div>
        ${grid.map((wk, i) => `<div class="pg-gw"><span class="pg-gn">${i + 1}</span>${wk.map(cell).join('')}</div>`).join('')}</div>
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

  $app().querySelectorAll('[data-per]').forEach(b => b.onclick = () => { period = b.dataset.per === 'all' ? 'all' : Number(b.dataset.per); renderProgress(); });
}
