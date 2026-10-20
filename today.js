// Obrazovka Dnes v0.5: pozdrav, týždenný pás, dýchajúci krúžok kalórií, tip dňa, farebné jedlá, voda v litroch, mini graf váhy
import * as db from './data.js';
import * as calc from './calc.js';
import * as v2 from './app2.js';
import * as push from './push.js';
import { nextDay } from './workouts.js';
import * as hw from './health.js';
import * as rp from './report.js';
import * as ck from './checkin.js';
import { ctx } from './app.js';
import { openLogEdit } from './logedit.js';
import * as rd from './readiness.js';
import { waterHtml, bindWater } from './water.js';

const $app = () => ctx.$app;
const state = () => ctx.state;
const h = (...a) => ctx.h(...a), r0 = (...a) => ctx.r0(...a), toast = (...a) => ctx.toast(...a), nav = (...a) => ctx.nav(...a);
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// odporúčané rozdelenie kalórií počas dňa
export const MEAL_META = {
  breakfast: { label: 'Raňajky', icon: '🍳', color: 'var(--m-breakfast)', share: 0.25 },
  brunch: { label: 'Desiata', icon: '🥪', color: 'var(--m-brunch)', share: 0.10 },
  lunch: { label: 'Obed', icon: '🍲', color: 'var(--m-lunch)', share: 0.30 },
  afternoon: { label: 'Olovrant', icon: '🥨', color: 'var(--m-afternoon)', share: 0.10 },
  dinner: { label: 'Večera', icon: '🍽️', color: 'var(--m-dinner)', share: 0.25 },
  late: { label: 'Druhá večera', icon: '🌙', color: 'var(--m-late)' },
  snack: { label: 'Snack', icon: '🍎', color: 'var(--m-snack)' },
};

// ikona jedla podľa názvu (bez diakritiky)
const EMOJI = [
  [/kurac|kura|chicken|morc|moriak/, '🍗'], [/hovad|steak|bravc|maso|mäso|rezen|karé|kare|sunk|salam|klobas/, '🥩'], [/losos|tuniak|ryba|treska|krevet/, '🐟'],
  [/vajc|vajic|omelet|bielk/, '🥚'], [/ryza|rizot/, '🍚'], [/cestovin|spaget|penne|lasagn|halusk|noky/, '🍝'], [/zemiak|hranolk|krokety|batat/, '🥔'],
  [/chlieb|rozok|zeml|bageta|toast|pecivo|croissant|bagel/, '🥖'], [/vlocky|kasa|musli|granola|cornflakes/, '🥣'], [/pizza/, '🍕'], [/burger|hamburger/, '🍔'],
  [/kebab|gyros|wrap|tortil|burrito/, '🌯'], [/syr|eidam|mozzarel|cottage|parmez|niva|bryndz/, '🧀'], [/jogurt|skyr|tvaroh|kefir|acidko/, '🥛'], [/mlieko|latte|kakao/, '🥛'],
  [/protein|srvatk|whey/, '💪'], [/banan/, '🍌'], [/jablk/, '🍎'], [/jahod|malin|cucorie|ovoc/, '🍓'], [/pomaran|mandarin|citrus/, '🍊'], [/hrozn/, '🍇'], [/avokad/, '🥑'],
  [/brokolic|spenat|salat|zelenin|uhork|paprik|paradaj|mrkv/, '🥗'], [/orech|mandl|kesu|arasid/, '🥜'], [/cokolad|horalk|tycink|keks|susienk|oblat/, '🍫'],
  [/zmrzlin/, '🍦'], [/kolac|torta|buchta|palacink|lievanc|donut|sisk/, '🍰'], [/kofola|cola|limonad|dzus|džús|fanta|sprite|energet|red bull|monster/, '🥤'],
  [/kava|espresso|cappuc/, '☕'], [/caj/, '🍵'], [/pivo/, '🍺'], [/polievk|vyvar|gulas/, '🍜'], [/olej|maslo/, '🫒'], [/med([^a-z]|$)|dzem|nutella/, '🍯'], [/sushi/, '🍣'],
];
const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
export function foodEmoji(name, meal) {
  const n = norm(name);
  for (const [re, e] of EMOJI) if (re.test(n)) return e;
  return MEAL_META[meal]?.icon || '🍽️';
}

const LINES = [
  'Druhý dych nie je dar. Dá sa naučiť.',
  'Nemusíš byť dokonalý. Stačí, keď sa dnes zapíšeš.',
  'Trend rozhoduje, nie jeden deň.',
  'Disciplína je rozhodnutie, ktoré urobíš aj keď sa ti nechce.',
  'Malé kroky každý deň porazia veľké plány raz za mesiac.',
  'Telo sa mení pomaly. Návyky rýchlejšie, ako si myslíš.',
  'Dnešok je šanca. Spravme z neho dobrý deň.',
  'Keď nevieš, čo zjesť, daj si bielkoviny a zeleninu.',
  'Pohár vody teraz je lepší ako dva večer.',
  'Spánok je tréning, ktorý robíš so zatvorenými očami.',
  'Nikto nezačal ako hotový. Každý začal.',
  'Zapísať aj zlý deň je víťazstvo. Schovať ho je prehra.',
];

function greeting() {
  const hr = new Date().getHours();
  return hr < 5 ? 'Dobrú noc' : hr < 10 ? 'Dobré ráno' : hr < 13 ? 'Dobrý deň' : hr < 18 ? 'Dobré popoludnie' : 'Dobrý večer';
}
const DAYS_LONG = ['nedeľa', 'pondelok', 'utorok', 'streda', 'štvrtok', 'piatok', 'sobota'];
const MONTHS = ['januára', 'februára', 'marca', 'apríla', 'mája', 'júna', 'júla', 'augusta', 'septembra', 'októbra', 'novembra', 'decembra'];
function longDate(iso) { const d = new Date(iso + 'T00:00:00'); return `${DAYS_LONG[d.getDay()]} ${d.getDate()}. ${MONTHS[d.getMonth()]}`; }
const REL = { '-1': 'Včera', '0': 'Dnes', '1': 'Zajtra', '2': 'Pozajtra' };
function dayTitle(iso) {
  const diff = Math.round((new Date(iso + 'T00:00:00') - new Date(calc.today() + 'T00:00:00')) / 86400000);
  return REL[diff] || DAYS_LONG[new Date(iso + 'T00:00:00').getDay()].replace(/^./, c => c.toUpperCase());
}
const kcalOf = rows => rows.reduce((a, r) => a + Number(r.kcal || 0), 0);
const liters = glasses => String(+(glasses * 0.25).toFixed(2)).replace('.', ',');

// SVG krúžok (r, hrúbka, percento)
function ringSvg(size, stroke, pct, color, cls = '') {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct));
  return `<svg class="rg ${cls}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--track)" stroke-width="${stroke}"/>
    <circle class="rg-fill" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${c}" data-off="${c * (1 - p)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`;
}

function sparkline(points) {
  if (points.length < 2) return '<div class="spark-empty">Graf po 2. vážení</div>';
  const W = 120, H = 40, vals = points.map(p => p.trend);
  let min = Math.min(...vals), max = Math.max(...vals); if (max - min < 0.6) { const m = (max + min) / 2; min = m - 0.3; max = m + 0.3; }
  const x = i => (i / (points.length - 1)) * W, y = v => H - 4 - ((v - min) / (max - min)) * (H - 8);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.trend).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path d="${d} L${W},${H} L0,${H} Z" class="spark-a"/><path d="${d}" class="spark-l"/><circle cx="${x(points.length - 1)}" cy="${y(vals[vals.length - 1])}" r="3" class="spark-d"/></svg>`;
}

// tip dňa podľa dát
function insight({ p, sum, foods, water, waterGoal, strk, isToday, isFuture }) {
  if (isFuture) return foods.length ? { icon: '🗓️', text: `Naplánované ${r0(sum.kcal)} kcal z ${p.target_kcal}. Zvyšok si môžeš doplniť, alebo skopírovať celý deň cez ⋯.` } : { icon: '🗓️', text: 'Toto je plánovač. Pridaj jedlá dopredu, alebo skopíruj celý deň cez ⋯ a celý týždeň máš hotový za minútu.' };
  if (!isToday) return null;
  const hr = new Date().getHours();
  const protLeft = Math.round(p.target_protein - sum.protein);
  if (!foods.length && hr >= 10) return { icon: '🕐', text: 'Ešte nemáš zapísané žiadne jedlo. Začni tým posledným, čo si jedol, stačí pár sekúnd.' };
  if (sum.kcal > p.target_kcal + 150) return { icon: '🧭', text: `Si ${r0(sum.kcal - p.target_kcal)} kcal nad cieľom. Jeden deň nič nepokazí, o výsledku rozhoduje týždenný trend.` };
  if (hr >= 15 && protLeft > p.target_protein * 0.45) return { icon: '💪', text: `Do cieľa bielkovín ti chýba ${protLeft} g. Pomôže skyr (11 g v 100 g), tvaroh alebo kuracie prsia (31 g v 100 g).` };
  if (hr >= 15 && water < waterGoal / 2) return { icon: '💧', text: `Zatiaľ máš ${liters(water)} l vody. Daj si pohár teraz, večer sa to dobieha ťažko.` };
  if (strk >= 3) return { icon: '🔥', text: `${strk} dni v rade. Takto vzniká návyk, neprerušuj to.` };
  const d = new Date(); const idx = (d.getFullYear() * 366 + d.getMonth() * 31 + d.getDate()) % LINES.length;
  return { icon: '🌿', text: LINES[idx], quote: true };
}

// ---------- obrazovka ----------
export async function renderToday() {
  const st = state(), p = st.profile, uid = p.id;
  const isToday = st.date === calc.today(), isFuture = st.date > calc.today();
  const wkStart = calc.weekStart(st.date), wkEnd = calc.addDays(wkStart, 6);
  const from30 = calc.addDays(calc.today(), -30), fromAct = calc.addDays(calc.today(), -400); // aktivita 400 dní: séria sa nezasekne na 30
  // všetko naraz: hlavné dáta aj doplnkové karty (predtým išli karty po jednej, každá čakala na predošlú)
  // doplnková karta, ktorá nestihne do 2,5 s, sa tentokrát vynechá (obrazovka nikdy nečaká na pomalú maličkosť)
  const soft = (pr, d) => Promise.race([pr.catch(() => d), new Promise(r => setTimeout(() => r(d), 2500))]);
  const weightsP = db.listWeights(uid);
  const adaptP = isToday && p.targets_mode !== 'custom' ? soft(weightsP.then(w => v2.checkAdaptive(p, w)), null) : Promise.resolve(null);
  const pushP = isToday ? soft(push.pushPromptCard(), '') : Promise.resolve('');
  const actP = soft(hw.activityCard(uid, st.date), '');
  const weekP = isToday ? soft(ck.weekCardHtml(uid), '') : Promise.resolve('');
  const [foods, weights, checkin, actDates, msgs, plan, wlogs, byDay] = await Promise.all([
    db.listFood(uid, st.date), weightsP, db.getCheckin(uid, st.date),
    db.activityDates(uid, fromAct), db.listMessages(uid), db.getPlan(uid), db.listWorkoutLogs(uid, calc.addDays(calc.weekStart(), -28)),
    db.foodByDay(uid, wkStart, wkEnd).catch(() => ({})),
  ]);
  const sum = calc.sumMacros(foods);
  const tr = calc.trend(weights.map(w => ({ date: w.date, weight: Number(w.weight_kg) })));
  const last = tr[tr.length - 1];
  const ch7 = calc.trendChange(tr, 7);
  const day = Math.max(1, Math.round((new Date(calc.today()) - new Date(p.start_date || calc.today())) / 86400000) + 1);
  const { n: strk, saved: strkSaved } = calc.streakSafe(actDates);
  const unread = msgs.filter(m => m.to_user === uid && !m.read_at);
  const lastMsg = msgs.find(m => m.to_user === uid);
  const waterGoal = p.water_goal || 8, goalMl = waterGoal * 250;
  const waterMl = checkin?.water_ml ?? (checkin?.water || 0) * 250, water = waterMl / 250;
  const weekLogs = wlogs.filter(w => w.done && w.date >= calc.weekStart());
  const trainedToday = wlogs.some(w => w.done && w.date === st.date);
  const nd = plan ? plan.days[nextDay(plan, wlogs) - 1] : null;
  const [adaptive, pushCard, actCard, weekCard] = await Promise.all([adaptP, pushP, actP, weekP]);
  const left = p.target_kcal - sum.kcal, over = left < 0;
  const tip = insight({ p, sum, foods, water, waterGoal, strk, isToday, isFuture });
  // týždenný priemer (rozhoduje týždeň, nie jeden deň)
  const wkDays = Object.keys(byDay).filter(d => d !== st.date && d <= calc.today() && byDay[d]?.kcal > 0);
  const wkVals = wkDays.map(d => byDay[d].kcal).concat(sum.kcal > 0 && !isFuture ? [sum.kcal] : []);
  const wkAvg = wkVals.length ? wkVals.reduce((a, b) => a + b, 0) / wkVals.length : 0;
  const wkOk = wkAvg && Math.abs(wkAvg - p.target_kcal) <= p.target_kcal * 0.1;
  const weekLine = wkVals.length >= 2 ? `<div class="wk-avg ${wkOk ? 'ok' : ''}">Týždenný priemer <b>${r0(wkAvg)} kcal</b>${wkOk ? ' · v pláne ✓' : wkAvg > p.target_kcal ? ` · ${r0(wkAvg - p.target_kcal)} nad cieľ` : ` · ${r0(p.target_kcal - wkAvg)} pod cieľ`}</div>` : '';
  // týždenný rozpočet: čo zostáva z kalórií na celý týždeň (len aktuálny týždeň)
  const inThisWeek = calc.today() >= wkStart && calc.today() <= wkEnd;
  let budLine = '';
  if (inThisWeek && wkVals.length >= 2 && p.target_kcal) {
    const eatenWk = Array.from({ length: 7 }, (_, i) => calc.addDays(wkStart, i)).filter(d => d <= calc.today()).reduce((a, d) => a + (d === st.date ? sum.kcal : (byDay[d]?.kcal || 0)), 0);
    const daysAfter = Math.round((new Date(wkEnd + 'T00:00:00') - new Date(calc.today() + 'T00:00:00')) / 86400000);
    const leftWk = p.target_kcal * 7 - eatenWk;
    const perDay = daysAfter > 0 ? leftWk / daysAfter : 0;
    const dleft = `${daysAfter} ${daysAfter === 1 ? 'deň' : daysAfter < 5 ? 'dni' : 'dní'}`;
    budLine = daysAfter > 0 && leftWk > 0
      ? (perDay >= p.target_kcal * 0.8 && perDay <= p.target_kcal * 1.15
        ? `<div class="wk-avg">Týždenný rozpočet: zostáva <b>${r0(leftWk)} kcal</b>, to je <b>${r0(perDay)} kcal</b> denne na ďalších ${dleft}</div>`
        : `<div class="wk-avg">Týždenný rozpočet: zostáva <b>${r0(leftWk)} kcal</b> na ďalších ${dleft}. Drž sa denného cieľa.</div>`) : '';
  }
  // návrat po výpadku: posledná aktivita pred 3 a viac dňami, dnes ešte nič
  const prevAct = actDates.filter(d => d < calc.today()).sort().pop();
  const gap = prevAct ? Math.round((new Date(calc.today()) - new Date(prevAct)) / 86400000) : 0;
  const comeback = isToday && gap >= 3 && !actDates.includes(calc.today());
  const backCard = comeback ? `<section class="back-card"><span class="back-i">🌬️</span><div><h3>Vitaj späť${p.name ? ', ' + h(p.name.split(' ')[0]) : ''}</h3><p>Pár dní pauza je v pohode. Druhý dych nie je o tom, koľkokrát vypadneš, ale koľkokrát sa vrátiš. Začni jedným jedlom.</p><a class="btn sm primary" href="#/jedlo?ai=1">Zapísať jedlo</a></div></section>` : '';
  const repCard = isToday ? rp.reportCardHtml() : '';
  const rdCard = isToday && !isFuture ? rd.readinessCardHtml({ ci: checkin, wlogs, date: st.date, p, dayName: nd?.name || '', trainedToday }) : '';
  // prvé dni bez jediného jedla: jasný prvý krok namiesto prázdnej obrazovky
  const firstRun = isToday && day <= 3 && !foods.length && !Object.entries(byDay).some(([d, x]) => d <= calc.today() && x?.kcal > 0);
  // týždenný check-in a report dávajú zmysel až po prvom celom týždni
  const newcomer = (p.start_date || calc.today()) > calc.addDays(rp.defaultWeek(), 6);
  const firstCard = firstRun ? `<section class="back-card td-first"><span class="back-i">👋</span><div><h3>Začni prvým jedlom</h3><p>Napíš vlastnými slovami, čo si jedol, napríklad „2 vajcia a rožok“, alebo jedlo odfoť. Appka spočíta kalórie za teba.</p><a class="btn sm primary" href="#/jedlo?ai=1">Zapísať prvé jedlo</a></div></section>` : '';

  const week = Array.from({ length: 7 }, (_, i) => calc.addDays(wkStart, i));
  const weekStrip = `<div class="wk">
    <button class="wk-nav" data-wk="-7" aria-label="Predchádzajúci týždeň">‹</button>
    ${week.map(d => {
      const k = d === st.date ? (sum.kcal) : (byDay[d]?.kcal || 0);
      const pct = p.target_kcal ? k / p.target_kcal : 0;
      const future = d > calc.today();
      const dt = new Date(d + 'T00:00:00');
      return `<button class="wk-d ${d === st.date ? 'sel' : ''} ${future ? 'fut' : ''} ${d === calc.today() ? 'now' : ''}" data-d="${d}" aria-label="${longDate(d)}">
        <span class="wk-l">${['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'][dt.getDay()]}</span>
        <span class="wk-r">${ringSvg(34, 3.5, pct, pct > 1.1 ? 'var(--danger)' : future ? 'var(--m-brunch)' : 'var(--accent)')}<b>${dt.getDate()}</b></span></button>`;
    }).join('')}
    <button class="wk-nav" data-wk="7" aria-label="Ďalší týždeň">›</button>
  </div>`;

  // makrá: každé má vlastnú farbu (bielkoviny mätová, sacharidy modrá, tuky jantárová), tie isté farby majú aj krúžky v kruhu
  const MC = { p: '#7CFFB2', c: '#5BB8FF', f: '#FFC857', fi: '#B794FF', su: '#FF8FB1', sa: '#9FB3C8' };
  const fmt = (v, dec) => dec ? String(Math.round(v * 10) / 10).replace('.', ',') : r0(v);
  const macroTile = (lbl, val, target, color) => {
    const pct = target ? Math.min(100, val / target * 100) : 0, over = target && r0(val) !== r0(target) && val > target;
    return `<div class="mtile ${over ? 'over' : ''}" style="--c:${color}"><div class="mt-h"><span class="mt-l">${lbl}</span><b><i data-count="${r0(val)}">${r0(val)}</i><small>/ ${r0(target)} g</small></b></div><div class="mt-b"><i style="width:${pct}%"></i></div></div>`;
  };
  const miniStat = (lbl, val, target, color, limit = false) => {
    const pct = target ? Math.min(100, val / target * 100) : 0, over = limit && target && val > target;
    return `<div class="ms ${over ? 'over' : ''}" style="--c:${color}"><span>${lbl}</span><b>${fmt(val, true)}<small> / ${fmt(target, true)} g</small></b><div class="ms-b"><i style="width:${pct}%"></i></div></div>`;
  };
  // cukry a soľ (odporúčania WHO: cukry do 50 g, soľ do 5 g) priamo v hlavnej karte
  const sugar = foods.reduce((a, f) => a + Number(f.sugar || 0), 0);
  const salt = foods.reduce((a, f) => a + Number(f.salt || 0), 0);
  // vláknina z jedál, ktoré ju majú v databáze (cieľ: 14 g na 1000 kcal, aspoň 25 g)
  const fiber = foods.reduce((a, f) => a + Number(f.fiber || 0), 0);
  const fiberGoal = Math.max(25, Math.round((p.target_kcal || 2000) / 1000 * 14));
  const fiberGap = foods.length > 0 && foods.some(f => f.fiber == null);
  // štyri sústredné krúžky: vonkajší = kalórie, vnútorné tri = bielkoviny, sacharidy, tuky
  const RS = 164, CX = RS / 2;
  const ringLayer = (r, sw, pct, stroke, cls = '') => {
    const c = 2 * Math.PI * r, k = Math.max(0, Math.min(1, pct || 0));
    return `<circle cx="${CX}" cy="${CX}" r="${r}" fill="none" stroke="var(--track)" stroke-width="${sw}" opacity=".7"/>
      <circle class="rg-fill ${cls}" cx="${CX}" cy="${CX}" r="${r}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-off="${c * (1 - k)}" transform="rotate(-90 ${CX} ${CX})"/>`;
  };
  const rings = `<svg class="hk-rings" width="${RS}" height="${RS}" viewBox="0 0 ${RS} ${RS}" aria-hidden="true">
    <defs><linearGradient id="kg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${over ? '#B6B6FF' : '#7CFFB2'}"/><stop offset="1" stop-color="${over ? '#8C8CFF' : '#2FD3C0'}"/></linearGradient></defs>
    ${ringLayer(70, 16, p.target_kcal ? sum.kcal / p.target_kcal : 0, 'url(#kg)', 'o0')}
  </svg>`;
  const goalPct = p.target_kcal ? Math.round(sum.kcal / p.target_kcal * 100) : 0;

  const mealRows = f => `<li><span class="fi">${foodEmoji(f.name, f.meal)}</span><div class="fn" data-edit="${f.id}" role="button" tabindex="0"><b>${h(f.name)}</b><span>${f.portion ? `${Math.round(f.qty * 10) / 10}× ${h(f.portion)}, ` : ''}${r0(f.grams)} g</span></div><span class="fk">${r0(f.kcal)}</span><button class="del" data-del="${f.id}" aria-label="Zmazať">×</button></li>`;
  const extraEmpty = ['late', 'snack'].filter(k => !foods.some(f => f.meal === k));
  const mealCards = Object.entries(MEAL_META).filter(([k]) => !extraEmpty.includes(k)).map(([k, m]) => {
    const rows = foods.filter(f => f.meal === k); const s = calc.sumMacros(rows);
    const rec = m.share ? Math.round(p.target_kcal * m.share / 10) * 10 : 0;
    const menu = `<button class="ml-more" data-mm="${k}" aria-label="Viac: ${m.label}">⋯</button>`;
    const add = `<button class="ml-add" data-add="${k}" aria-label="Pridať do: ${m.label}">+</button>`;
    if (!rows.length) return `<section class="ml empty" style="--mc:${m.color}"><span class="ml-ic">${m.icon}</span><div class="ml-t"><h3>${m.label}</h3><span>${rec ? `odporúčané ~${rec} kcal` : 'podľa potreby'}</span></div>${menu}${add}</section>`;
    const pct = rec ? Math.min(100, s.kcal / rec * 100) : 0;
    return `<section class="ml" style="--mc:${m.color}">
      <header class="ml-h">
        <span class="ml-ic">${m.icon}</span>
        <div class="ml-t"><h3>${m.label}</h3><span><b>${r0(s.kcal)}</b>${rec ? ` / ${rec}` : ''} kcal</span><span class="mx">B ${r0(s.protein)} · S ${r0(s.carbs)} · T ${r0(s.fat)}</span></div>
        ${menu}${add}
      </header>
      ${rec ? `<div class="ml-bar"><i style="width:${pct}%;${s.kcal > rec * 1.15 ? 'background:var(--danger)' : ''}"></i></div>` : ''}
      <ul class="ml-list">${rows.map(mealRows).join('')}</ul>
    </section>`;
  }).join('') + (extraEmpty.length ? `<div class="ml-x"><span>Ďalšie</span>${extraEmpty.map(k => `<button class="ml-xb" style="--mc:${MEAL_META[k].color}" data-add="${k}"><i>${MEAL_META[k].icon}</i>${MEAL_META[k].label}<b>+</b></button>`).join('')}</div>` : '');

  // rozbor dňa: pomer živín a rozloženie kalórií cez deň
  const eKc = { p: sum.protein * 4, c: sum.carbs * 4, f: sum.fat * 9 }, eTot = eKc.p + eKc.c + eKc.f;
  const pc = v => eTot ? Math.round(v / eTot * 100) : 0;
  const mealKc = Object.entries(MEAL_META).map(([k, m]) => ({ k, m, kc: kcalOf(foods.filter(f => f.meal === k)) })).filter(x => x.kc > 0);
  const analysis = foods.length ? `<details class="an"><summary><span>Rozbor dňa</span><i>▾</i></summary>
    <div class="an-b">
      <div class="an-t">Odkiaľ prichádzajú kalórie</div>
      <div class="an-bar"><i style="width:${pc(eKc.p)}%;background:var(--protein)"></i><i style="width:${pc(eKc.c)}%;background:var(--carbs)"></i><i style="width:${pc(eKc.f)}%;background:var(--fat)"></i></div>
      <div class="an-lg"><span><u style="background:var(--protein)"></u>Bielkoviny ${pc(eKc.p)} %</span><span><u style="background:var(--carbs)"></u>Sacharidy ${pc(eKc.c)} %</span><span><u style="background:var(--fat)"></u>Tuky ${pc(eKc.f)} %</span></div>
      <div class="an-t mt">Rozloženie cez deň</div>
      <div class="an-bar">${mealKc.map(x => `<i style="width:${x.kc / sum.kcal * 100}%;background:${x.m.color}"></i>`).join('')}</div>
      <div class="an-lg">${mealKc.map(x => `<span><u style="background:${x.m.color}"></u>${x.m.label} ${r0(x.kc)}</span>`).join('')}</div>
    </div></details>` : '';

  $app().innerHTML = `<div class="screen td">
    <header class="tdh">
      <div class="tdh-l"><h1 class="tdh-g">${isToday ? `${greeting()}, ${h(p.name?.split(' ')[0] || '')}` : dayTitle(st.date)}</h1>
        <label class="tdh-s"><span>${longDate(st.date)}</span><i>▾</i><input type="date" class="tdh-dp" value="${st.date}" aria-label="Vybrať dátum"></label></div>
      ${isToday ? '' : '<button class="tdh-now" data-now>Dnes</button>'}
      <a class="tdh-streak ${strk ? 'on' : ''}" href="#/vaha" title="Dni v rade" data-saved="${strkSaved}">🔥 ${strk}</a>
    </header>
    ${isToday ? '' : `<div class="dayban"><span>Zapisuješ za <b>${longDate(st.date)}</b></span><button type="button" data-now>Späť na dnes</button></div>`}
    ${weekStrip}
    ${unread.length ? `<a class="card accent link" href="#/spravy"><div class="row between"><div><h3>Správa od kouča</h3><p class="small mt" style="color:var(--text)">${h(lastMsg.body.slice(0, 120))}${lastMsg.body.length > 120 ? '…' : ''}</p></div><span class="chip" style="background:var(--accent);color:var(--accent-ink)">${unread.length}</span></div></a>` : ''}
    ${firstCard || backCard}
    <section class="hero-k ${over ? 'over' : ''}">
      <div class="hk-top"><span class="hk-t">${isFuture ? 'Plán dňa' : 'Dnešný cieľ'}</span><a class="hk-edit" href="#/ciele" aria-label="Upraviť ciele">${p.target_kcal} kcal<i>✎</i></a></div>
      <div class="hk-body">
        <div class="hk-ring"><i class="hk-sw"></i><div class="breath"></div>${rings}
          <div class="hk-c"><b data-count="${Math.abs(r0(left))}">${Math.abs(r0(left))}</b><span>${over ? 'kcal nad cieľ' : 'kcal zostáva'}</span></div>
        </div>
        <div class="hk-side">
          <div class="hk-eat"><b data-count="${r0(sum.kcal)}">${r0(sum.kcal)}</b><span>${isFuture ? 'kcal naplánované' : 'kcal zjedené'}</span><em class="hk-pc">${goalPct} %</em></div>
          <div class="hk-macros">
            ${macroTile('Bielkoviny', sum.protein, p.target_protein, MC.p)}
            ${macroTile('Sacharidy', sum.carbs, p.target_carbs, MC.c)}
            ${macroTile('Tuky', sum.fat, p.target_fat, MC.f)}
          </div>
        </div>
      </div>
      <div class="hk-minis">
        ${miniStat('Vláknina', fiber, fiberGoal, MC.fi)}
        ${miniStat('Cukry', sugar, 50, MC.su, true)}
        ${miniStat('Soľ', salt, 5, MC.sa, true)}
      </div>
      ${fiberGap ? '<p class="hk-note">Vláknina, cukry a soľ sa počítajú len z jedál, ktoré tieto údaje majú. Odporúčania WHO: cukry do 50 g, soľ do 5 g.</p>' : ''}
    </section>
    <div class="qk">
      <a class="qk-b" href="#/jedlo?q=1" style="--c:var(--qk-blue)"><i class="qk-i"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg></i><span>Hľadať</span></a>
      <a class="qk-b" href="#/jedlo?scan=1" style="--c:var(--qk-amber)"><i class="qk-i qk-scan"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8V5.5A1.5 1.5 0 0 1 4.5 4H7M17 4h2.5A1.5 1.5 0 0 1 21 5.5V8M21 16v2.5a1.5 1.5 0 0 1-1.5 1.5H17M7 20H4.5A1.5 1.5 0 0 1 3 18.5V16"/><path d="M8 9v6M12 9v6M16 9v6"/></svg></i><span>Kód</span></a>
      <a class="qk-b ai" href="#/jedlo?ai=1" style="--c:var(--accent)"><i class="qk-i qk-ai"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="s1" d="M11 4l1.9 5.1L18 11l-5.1 1.9L11 18l-1.9-5.1L4 11l5.1-1.9z" fill="currentColor" stroke="none"/><path class="s2" d="M18.5 3.5v3M17 5h3"/><path class="s3" d="M18 15.5v3M16.5 17h3"/></svg></i><span>AI zápis</span></a>
      <button class="qk-b" data-dm style="--c:var(--qk-violet)"><i class="qk-i"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14.5" rx="3"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4M14 15H9.5M11.5 13l-2 2 2 2"/></svg></i><span>Iný deň</span></button>
    </div>
    ${weekLine}
    ${budLine}

    ${tip && !firstRun ? `<aside class="tip ${tip.quote ? 'q' : ''}"><span class="tip-i">${tip.icon}</span><p>${h(tip.text)}</p></aside>` : ''}

    <div class="meals">${mealCards}</div>

    <!-- kontext dňa: až pod zápisom -->
    ${rdCard}
    ${firstRun ? '' : pushCard}
    ${newcomer ? '' : weekCard}
    ${newcomer ? '' : repCard}
    ${adaptive ? `<div class="card accent" id="adaptCard"><div class="row between"><h3>Týždenné prehodnotenie</h3><span class="chip">Adaptívny cieľ</span></div>
      <p class="small mt">${h(adaptive.reason)}</p>
      <p class="muted small mt">Priemer ${adaptive.avg} kcal z ${adaptive.days} dní, trend ${adaptive.ch > 0 ? '+' : ''}${adaptive.ch} kg</p>
      ${adaptive.adjust ? `<div class="row mt" style="gap:8px"><button class="btn sm primary" id="adaptYes">Nastaviť ${adaptive.newKcal} kcal</button><button class="btn sm ghost" id="adaptNo">Nechať ${p.target_kcal}</button></div>` : `<button class="btn sm ghost mt" id="adaptNo">OK</button>`}
    </div>` : ''}

    ${analysis}

    ${isFuture ? '' : waterHtml({ ml: waterMl, goalMl })}

    ${actCard}

    <div class="duo">
      <a class="tile tr" href="#/trening">
        <span class="tile-ic">🏋️</span><h3>Tréning</h3>
        <p>${plan ? (trainedToday ? 'Dnes hotovo ✓' : `Ďalší: ${h(nd?.name || 'deň 1')}`) : 'Vytvor si plán'}</p>
        ${plan ? `<div class="dots5">${Array.from({ length: Math.max(p.training_days || plan.days.length, 1) }, (_, i) => `<i class="${i < weekLogs.length ? 'on' : ''}"></i>`).join('')}</div><small>${weekLogs.length} z ${p.training_days || plan.days.length} tento týždeň</small>` : ''}
      </a>
      <a class="tile wg" href="#/vaha">
        <span class="tile-ic">⚖️</span><h3>Váha</h3>
        <p><b>${last ? last.trend.toFixed(1) : '–'}</b> kg${ch7 != null ? ` <em class="${ch7 < 0 ? 'dn' : ch7 > 0 ? 'up' : ''}">${ch7 > 0 ? '+' : ''}${ch7.toFixed(1)}</em>` : ''}</p>
        ${sparkline(tr.slice(-14))}
      </a>
    </div>

    <a class="ci" href="#/checkin">
      <span class="ci-i">${checkin?.mood ? ['😵', '😕', '😐', '🙂', '🔥'][checkin.mood - 1] : '📝'}</span>
      <div><h3>Denný check-in</h3><p>${checkin && (checkin.sleep_h || checkin.steps || checkin.mood) ? `Spánok ${checkin.sleep_h ?? '–'} h, ${checkin.steps ?? '–'} krokov` : 'Spánok, kroky a nálada za 20 sekúnd'}</p></div>
      <span class="ci-go">${checkin?.mood ? 'Upraviť' : 'Vyplniť'}</span>
    </a>
  </div>${nav('#/')}`;

  const root = $app();
  if (!window.__tdIn && !reduceMotion()) { window.__tdIn = 1; root.querySelector('.screen.td')?.classList.add('td-in'); }
  rd.bindReadiness(root, { uid, date: st.date, ci: checkin, onSaved: renderToday });
  // animácie: krúžky sa nabehnú, čísla dobehnú
  requestAnimationFrame(() => requestAnimationFrame(() => root.querySelectorAll('.rg-fill').forEach(c => c.setAttribute('stroke-dashoffset', c.dataset.off))));
  if (!reduceMotion()) root.querySelectorAll('[data-count]').forEach(el => {
    const to = Number(el.dataset.count); if (!to) return; const t0 = performance.now();
    const step = t => { const k = Math.min(1, (t - t0) / 700); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });

  const go = d => { st.date = d; renderToday(); };
  root.querySelectorAll('[data-d]').forEach(b => b.onclick = () => go(b.dataset.d));
  root.querySelectorAll('[data-wk]').forEach(b => b.onclick = () => go(calc.addDays(st.date, Number(b.dataset.wk))));
  root.querySelectorAll('[data-now]').forEach(b => b.addEventListener('click', () => go(calc.today())));
  root.querySelector('.tdh-dp')?.addEventListener('change', e => { if (e.target.value) go(e.target.value); });
  // potiahnutie do strán: predchádzajúci / ďalší deň
  const scr = root.querySelector('.screen.td'); let sx = 0, sy = 0, t0 = 0, ok = false;
  scr?.addEventListener('touchstart', e => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; t0 = Date.now(); ok = !e.target.closest('.sheet-bg, .bd-panel, input, textarea'); }, { passive: true });
  scr?.addEventListener('touchend', e => {
    if (!ok) return; const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) > 80 && Math.abs(dy) < 40 && Date.now() - t0 < 600) go(calc.addDays(st.date, dx < 0 ? 1 : -1));
  }, { passive: true });
  root.querySelectorAll('[data-mm]').forEach(b => b.onclick = () => mealMenu(b.dataset.mm, foods, uid));
  root.querySelector('[data-dm]')?.addEventListener('click', () => dayPick(foods, uid, go));
  push.bindPushCard(renderToday);
  root.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { location.hash = `#/jedlo?meal=${b.dataset.add}`; });
  root.querySelectorAll('[data-edit]').forEach(el => el.onclick = () => { const f = foods.find(x => x.id === Number(el.dataset.edit)); if (f) openLogEdit(f, renderToday); });
  root.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { await db.deleteFood(Number(b.dataset.del)); renderToday(); });
  if (!isFuture) bindWater(root, { uid, date: st.date, goalMl, ml: waterMl, isToday });
  root.querySelector('#adaptYes')?.addEventListener('click', async () => { await v2.applyAdaptive(p, adaptive); toast(`Nový cieľ: ${adaptive.newKcal} kcal`); renderToday(); });
  root.querySelector('#adaptNo')?.addEventListener('click', async () => { await db.applyTarget(uid, { date: calc.today(), old_kcal: p.target_kcal, new_kcal: p.target_kcal, reason: 'Ponechané používateľom', avg_intake: adaptive.avg, trend_change: adaptive.ch }, {}); renderToday(); });
}


// ---------- ponuky ⋯ (kopírovanie, plánovanie dopredu, mazanie) ----------
const SHORT = ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'];
const plural = n => n === 1 ? 'položka' : n < 5 ? 'položky' : 'položiek';
const sheetBtn = (a, ic, t, cls = '') => `<button class="mm-b ${cls}" data-a="${a}"><span>${ic}</span>${t}</button>`;

function copySheet({ uid, from, meal, title }) {
  const sel = new Set(), days = Array.from({ length: 30 }, (_, i) => calc.addDays(from, i + 1));
  const bg = ctx.sheet(`<h3>${title}</h3><p class="muted small mt">Skopíruje sa na vybrané dni. Ak tam už niečo je, pridá sa to k tomu.</p>
    <div class="cp-q">${[[1, 'Nasl. deň'], [3, '3 dni'], [7, '7 dní'], [14, '14 dní'], [30, '30 dní']].map(([n, l]) => `<button data-n="${n}">${l}</button>`).join('')}</div>
    <div class="cp-g">${days.map(d => { const dt = new Date(d + 'T00:00:00'); return `<button data-x="${d}"><small>${SHORT[dt.getDay()]}</small><b>${dt.getDate()}</b>${dt.getDate() === 1 || d === days[0] ? `<em>${MONTHS[dt.getMonth()].slice(0, 3)}</em>` : ''}</button>`; }).join('')}</div>
    <button class="btn primary mt" id="cpGo" disabled>Vyber dni</button>`);
  const upd = () => {
    bg.querySelectorAll('[data-x]').forEach(b => b.classList.toggle('on', sel.has(b.dataset.x)));
    const go = bg.querySelector('#cpGo'); go.disabled = !sel.size; go.textContent = sel.size ? `Skopírovať na ${sel.size} ${sel.size === 1 ? 'deň' : sel.size < 5 ? 'dni' : 'dní'}` : 'Vyber dni';
  };
  bg.querySelectorAll('[data-x]').forEach(b => b.onclick = () => { sel.has(b.dataset.x) ? sel.delete(b.dataset.x) : sel.add(b.dataset.x); upd(); });
  bg.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { sel.clear(); days.slice(0, Number(b.dataset.n)).forEach(d => sel.add(d)); upd(); });
  bg.querySelector('#cpGo').onclick = async () => {
    try { const n = await db.copyDay(uid, from, [...sel].sort(), meal); bg.remove(); toast(`Naplánované: ${n} ${plural(n)}`); renderToday(); }
    catch (e) { toast(e.message, true); }
  };
}

function mealMenu(meal, foods, uid) {
  const st = state(), m = MEAL_META[meal], has = foods.some(f => f.meal === meal);
  const bg = ctx.sheet(`<h3>${m.icon} ${m.label}</h3><div class="mm">
    ${sheetBtn('prev', '↻', 'Rovnako ako deň predtým')}
    ${has ? sheetBtn('copy', '📅', 'Kopírovať na iné dni') : ''}
    ${has ? sheetBtn('clear', '🗑', 'Vymazať všetko', 'dng') : ''}</div>`);
  bg.querySelector('[data-a=prev]').onclick = async () => {
    try { const n = await db.copyMeal(uid, calc.addDays(st.date, -1), st.date, meal); bg.remove(); if (!n) toast('Deň predtým tu nebolo nič zapísané', true); else { toast(`Skopírované: ${n} ${plural(n)}`); renderToday(); } }
    catch (e) { toast(e.message, true); }
  };
  bg.querySelector('[data-a=copy]')?.addEventListener('click', () => { bg.remove(); copySheet({ uid, from: st.date, meal, title: `${m.label} na ďalšie dni` }); });
  const clr = bg.querySelector('[data-a=clear]');
  clr?.addEventListener('click', async () => {
    if (!clr.dataset.sure) { clr.dataset.sure = 1; clr.innerHTML = '<span>⚠️</span>Klikni znova a vymaže sa to'; return; }
    try { await db.clearMeal(uid, st.date, meal); bg.remove(); renderToday(); } catch (e) { toast(e.message, true); }
  });
}

function dayPick(foods, uid, go) {
  const st = state(), t = calc.today();
  const pick = [[t, 'Dnes'], [calc.addDays(t, -1), 'Včera'], [calc.addDays(t, -2), 'Predvčerom']].filter(([d]) => d !== st.date);
  const bg = ctx.sheet(`<h3>Zapísať jedlo za iný deň</h3><p class="muted small mt">Vyber deň a potom pridávaj jedlá ako zvyčajne.</p><div class="mm">
    ${pick.map(([d, l]) => sheetBtn('d' + d, '📅', `${l}<small>${longDate(d)}</small>`)).join('')}
    <label class="mm-b mm-date"><span>🗓</span>Vybrať iný dátum<input type="date" max="${t}" value="${st.date}" aria-label="Vybrať dátum"></label>
    ${sheetBtn('more', '⋯', 'Možnosti tohto dňa (kopírovať, vymazať)')}</div>`);
  pick.forEach(([d]) => bg.querySelector(`[data-a="d${d}"]`).onclick = () => { bg.remove(); go(d); });
  bg.querySelector('.mm-date input').addEventListener('change', e => { if (e.target.value) { bg.remove(); go(e.target.value); } });
  bg.querySelector('[data-a=more]').onclick = () => { bg.remove(); dayMenu(foods, uid); };
}

function dayMenu(foods, uid) {
  const st = state(), has = foods.length > 0;
  const bg = ctx.sheet(`<h3>${longDate(st.date)}</h3><div class="mm">
    ${sheetBtn('prev', '↻', 'Doplniť z predchádzajúceho dňa')}
    ${has ? sheetBtn('copy', '📅', 'Skopírovať celý deň na iné dni') : ''}
    ${has ? sheetBtn('clear', '🗑', 'Vymazať celý deň', 'dng') : ''}</div>`);
  bg.querySelector('[data-a=prev]').onclick = async () => {
    try { const n = await db.copyDay(uid, calc.addDays(st.date, -1), [st.date]); bg.remove(); if (!n) toast('Deň predtým nebolo nič zapísané', true); else { toast(`Skopírované: ${n} ${plural(n)}`); renderToday(); } }
    catch (e) { toast(e.message, true); }
  };
  bg.querySelector('[data-a=copy]')?.addEventListener('click', () => { bg.remove(); copySheet({ uid, from: st.date, meal: null, title: 'Celý deň na ďalšie dni' }); });
  const clr = bg.querySelector('[data-a=clear]');
  clr?.addEventListener('click', async () => {
    if (!clr.dataset.sure) { clr.dataset.sure = 1; clr.innerHTML = '<span>⚠️</span>Klikni znova a vymaže sa celý deň'; return; }
    try { for (const k of Object.keys(MEAL_META)) if (foods.some(f => f.meal === k)) await db.clearMeal(uid, st.date, k); bg.remove(); renderToday(); } catch (e) { toast(e.message, true); }
  });
}
