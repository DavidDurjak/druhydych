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

const $app = () => ctx.$app;
const state = () => ctx.state;
const h = (...a) => ctx.h(...a), r0 = (...a) => ctx.r0(...a), toast = (...a) => ctx.toast(...a), nav = (...a) => ctx.nav(...a);
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// odporúčané rozdelenie kalórií počas dňa
export const MEAL_META = {
  breakfast: { label: 'Raňajky', icon: '🍳', share: 0.25, color: 'var(--m-breakfast)' },
  lunch: { label: 'Obed', icon: '🍲', share: 0.35, color: 'var(--m-lunch)' },
  dinner: { label: 'Večera', icon: '🌙', share: 0.30, color: 'var(--m-dinner)' },
  snack: { label: 'Snack', icon: '🍎', share: 0.10, color: 'var(--m-snack)' },
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
  'Dnešok je jeden z 84. Spravme z neho dobrý.',
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
function insight({ p, sum, foods, water, waterGoal, strk, isToday }) {
  if (!isToday) return null;
  const hr = new Date().getHours();
  const protLeft = Math.round(p.target_protein - sum.protein);
  if (!foods.length && hr >= 10) return { icon: '🕐', text: 'Ešte nemáš zapísané žiadne jedlo. Začni tým posledným, čo si jedol, stačí pár sekúnd.' };
  if (sum.kcal > p.target_kcal + 150) return { icon: '🧭', text: `Si ${r0(sum.kcal - p.target_kcal)} kcal nad cieľom. Jeden deň nič nepokazí, o výsledku rozhoduje týždenný trend.` };
  if (hr >= 15 && protLeft > p.target_protein * 0.45) return { icon: '💪', text: `Do cieľa bielkovín ti chýba ${protLeft} g. Pomôže skyr (11 g v 100 g), tvaroh alebo kuracie prsia (31 g v 100 g).` };
  if (hr >= 15 && water < waterGoal / 2) return { icon: '💧', text: `Zatiaľ máš ${liters(water)} l vody. Daj si pohár teraz, večer sa to dobieha ťažko.` };
  if (strk >= 3) return { icon: '🔥', text: `${strk} dni v rade. Takto vzniká návyk, nepreruš to.` };
  const d = new Date(); const idx = (d.getFullYear() * 366 + d.getMonth() * 31 + d.getDate()) % LINES.length;
  return { icon: '🌿', text: LINES[idx], quote: true };
}

// ---------- obrazovka ----------
export async function renderToday() {
  const st = state(), p = st.profile, uid = p.id;
  const isToday = st.date === calc.today();
  const wkStart = calc.weekStart(st.date), wkEnd = calc.addDays(wkStart, 6);
  const from30 = calc.addDays(calc.today(), -30);
  const [foods, weights, checkin, actDates, msgs, plan, wlogs, byDay] = await Promise.all([
    db.listFood(uid, st.date), db.listWeights(uid), db.getCheckin(uid, st.date),
    db.activityDates(uid, from30), db.listMessages(uid), db.getPlan(uid), db.listWorkoutLogs(uid, calc.addDays(calc.weekStart(), -28)),
    db.foodByDay(uid, wkStart, wkEnd).catch(() => ({})),
  ]);
  const sum = calc.sumMacros(foods);
  const tr = calc.trend(weights.map(w => ({ date: w.date, weight: Number(w.weight_kg) })));
  const last = tr[tr.length - 1];
  const ch7 = calc.trendChange(tr, 7);
  const day = Math.max(1, Math.round((new Date(calc.today()) - new Date(p.start_date || calc.today())) / 86400000) + 1);
  const strk = calc.streak(actDates);
  const unread = msgs.filter(m => m.to_user === uid && !m.read_at);
  const lastMsg = msgs.find(m => m.to_user === uid);
  const water = checkin?.water || 0, waterGoal = p.water_goal || 8;
  const weekLogs = wlogs.filter(w => w.done && w.date >= calc.weekStart());
  const trainedToday = wlogs.some(w => w.done && w.date === st.date);
  const nd = plan ? plan.days[nextDay(plan, wlogs) - 1] : null;
  const adaptive = isToday && p.targets_mode !== 'custom' ? await v2.checkAdaptive(p, weights).catch(() => null) : null;
  const pushCard = isToday ? await push.pushPromptCard().catch(() => '') : '';
  const left = p.target_kcal - sum.kcal, over = left < 0;
  const tip = insight({ p, sum, foods, water, waterGoal, strk, isToday });
  const actCard = await hw.activityCard(uid, st.date).catch(() => '');
  // týždenný priemer (rozhoduje týždeň, nie jeden deň)
  const wkDays = Object.keys(byDay).filter(d => d !== st.date && byDay[d]?.kcal > 0);
  const wkVals = wkDays.map(d => byDay[d].kcal).concat(sum.kcal > 0 ? [sum.kcal] : []);
  const wkAvg = wkVals.length ? wkVals.reduce((a, b) => a + b, 0) / wkVals.length : 0;
  const wkOk = wkAvg && Math.abs(wkAvg - p.target_kcal) <= p.target_kcal * 0.1;
  const weekLine = wkVals.length >= 2 ? `<div class="wk-avg ${wkOk ? 'ok' : ''}">Týždenný priemer <b>${r0(wkAvg)} kcal</b>${wkOk ? ' · v pláne ✓' : wkAvg > p.target_kcal ? ` · ${r0(wkAvg - p.target_kcal)} nad cieľ` : ` · ${r0(p.target_kcal - wkAvg)} pod cieľ`}</div>` : '';
  // návrat po výpadku: posledná aktivita pred 3 a viac dňami, dnes ešte nič
  const prevAct = actDates.filter(d => d < calc.today()).sort().pop();
  const gap = prevAct ? Math.round((new Date(calc.today()) - new Date(prevAct)) / 86400000) : 0;
  const comeback = isToday && gap >= 3 && !actDates.includes(calc.today());
  const backCard = comeback ? `<section class="back-card"><span class="back-i">🌬️</span><div><h3>Vitaj späť${p.name ? ', ' + h(p.name.split(' ')[0]) : ''}</h3><p>Pár dní pauza je v pohode. Druhý dych nie je o tom, koľkokrát vypadneš, ale koľkokrát sa vrátiš. Začni jedným jedlom.</p><a class="btn sm primary" href="#/jedlo?ai=1">Zapísať jedlo</a></div></section>` : '';
  const repCard = isToday ? rp.reportCardHtml() : '';
  // prvé dni bez jediného jedla: jasný prvý krok namiesto prázdnej obrazovky
  const firstRun = isToday && day <= 3 && !foods.length && !Object.values(byDay).some(x => x?.kcal > 0);
  // týždenný check-in a report dávajú zmysel až po prvom celom týždni
  const newcomer = (p.start_date || calc.today()) > calc.addDays(rp.defaultWeek(), 6);
  const firstCard = firstRun ? `<section class="back-card td-first"><span class="back-i">👋</span><div><h3>Začni prvým jedlom</h3><p>Napíš vlastnými slovami, čo si jedol, napríklad „2 vajcia a rožok“, alebo jedlo odfoť. Appka spočíta kalórie za teba.</p><a class="btn sm primary" href="#/jedlo?ai=1">Zapísať prvé jedlo</a></div></section>` : '';
  const weekCard = isToday ? await ck.weekCardHtml(uid).catch(() => '') : '';

  const week = Array.from({ length: 7 }, (_, i) => calc.addDays(wkStart, i));
  const weekStrip = `<div class="wk">
    <button class="wk-nav" data-wk="-7" aria-label="Predchádzajúci týždeň">‹</button>
    ${week.map(d => {
      const k = d === st.date ? (sum.kcal) : (byDay[d]?.kcal || 0);
      const pct = p.target_kcal ? k / p.target_kcal : 0;
      const future = d > calc.today();
      const dt = new Date(d + 'T00:00:00');
      return `<button class="wk-d ${d === st.date ? 'sel' : ''} ${future ? 'fut' : ''} ${d === calc.today() ? 'now' : ''}" data-d="${d}" ${future ? 'disabled' : ''}>
        <span class="wk-l">${['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'][dt.getDay()]}</span>
        <span class="wk-r">${ringSvg(34, 3.5, pct, pct > 1.1 ? 'var(--m-dinner)' : 'var(--accent)')}<b>${dt.getDate()}</b></span></button>`;
    }).join('')}
    <button class="wk-nav" data-wk="7" aria-label="Ďalší týždeň" ${wkEnd >= calc.today() ? 'disabled' : ''}>›</button>
  </div>`;

  const macro = (lbl, val, target, color) => {
    const rest = Math.round(target - val);
    return `<div class="mc">${ringSvg(54, 6, target ? val / target : 0, color)}<div class="mc-t"><b>${rest >= 0 ? rest : '+' + -rest} g</b><span>${lbl} ${rest >= 0 ? 'zostáva' : 'nad cieľ'}</span></div></div>`;
  };

  const mealCards = Object.entries(MEAL_META).map(([k, m]) => {
    const rows = foods.filter(f => f.meal === k); const s = calc.sumMacros(rows);
    const goal = Math.round(p.target_kcal * m.share / 10) * 10;
    return `<section class="ml" style="--mc:${m.color}">
      <header class="ml-h">
        <span class="ml-ic">${m.icon}</span>
        <div class="ml-t"><h3>${m.label}</h3><span><b>${r0(s.kcal)}</b> z ${goal} kcal</span></div>
        <button class="ml-add" data-add="${k}" aria-label="Pridať do: ${m.label}">+</button>
      </header>
      <div class="ml-bar"><i style="width:${Math.min(100, goal ? s.kcal / goal * 100 : 0)}%"></i></div>
      ${rows.length ? `<ul class="ml-list">${rows.map(f => `<li><span class="fi">${foodEmoji(f.name, k)}</span><div class="fn"><b>${h(f.name)}</b><span>${f.portion ? `${Math.round(f.qty * 10) / 10}× ${h(f.portion)}, ` : ''}${r0(f.grams)} g</span></div><span class="fk">${r0(f.kcal)}</span><button class="del" data-del="${f.id}" aria-label="Zmazať">×</button></li>`).join('')}</ul>`
        : (isToday ? `<button class="ml-copy" data-copy="${k}">↻ Rovnako ako včera</button>` : '')}
    </section>`;
  }).join('');

  const waterSegs = Array.from({ length: waterGoal }, (_, i) => `<i class="${i < water ? 'on' : ''}"></i>`).join('');

  $app().innerHTML = `<div class="screen td">
    <header class="tdh">
      <div><h1 class="tdh-g">${greeting()}, ${h(p.name?.split(' ')[0] || '')}</h1>
        <p class="tdh-s">${isToday ? 'Dnes je ' : ''}${longDate(st.date)}, deň ${day} z 84</p></div>
      <a class="tdh-streak ${strk ? 'on' : ''}" href="#/vaha" title="Dni v rade">🔥 ${strk}</a>
    </header>
    ${weekStrip}
    ${unread.length ? `<a class="card accent link" href="#/spravy"><div class="row between"><div><h3>Správa od kouča</h3><p class="small mt" style="color:var(--text)">${h(lastMsg.body.slice(0, 120))}${lastMsg.body.length > 120 ? '…' : ''}</p></div><span class="chip" style="background:var(--accent);color:var(--accent-ink)">${unread.length}</span></div></a>` : ''}
    ${firstCard || backCard}
    ${firstRun ? '' : pushCard}
    ${newcomer ? '' : weekCard}
    ${newcomer ? '' : repCard}
    ${adaptive ? `<div class="card accent" id="adaptCard"><div class="row between"><h3>Týždenné prehodnotenie</h3><span class="chip">Adaptívny cieľ</span></div>
      <p class="small mt">${h(adaptive.reason)}</p>
      <p class="muted small mt">Priemer ${adaptive.avg} kcal z ${adaptive.days} dní, trend ${adaptive.ch > 0 ? '+' : ''}${adaptive.ch} kg</p>
      ${adaptive.adjust ? `<div class="row mt" style="gap:8px"><button class="btn sm primary" id="adaptYes">Nastaviť ${adaptive.newKcal} kcal</button><button class="btn sm ghost" id="adaptNo">Nechať ${p.target_kcal}</button></div>` : `<button class="btn sm ghost mt" id="adaptNo">OK</button>`}
    </div>` : ''}

    <section class="hero-k ${over ? 'over' : ''}">
      <div class="hk-side"><b data-count="${r0(sum.kcal)}">${r0(sum.kcal)}</b><span>zjedené</span></div>
      <div class="hk-ring">
        <div class="breath"></div>
        ${ringSvg(196, 14, p.target_kcal ? sum.kcal / p.target_kcal : 0, 'url(#kg)', 'big')}
        <svg width="0" height="0" style="position:absolute"><defs><linearGradient id="kg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7CFFB2"/><stop offset="1" stop-color="#3FD5C4"/></linearGradient></defs></svg>
        <div class="hk-c"><b data-count="${Math.abs(r0(left))}">${Math.abs(r0(left))}</b><span>${over ? 'kcal nad cieľ' : 'kcal zostáva'}</span></div>
      </div>
      <a class="hk-side" href="#/ciele" style="color:inherit" aria-label="Upraviť ciele"><b>${p.target_kcal}</b><span>cieľ ✎</span></a>
      <div class="hk-macros">
        ${macro('Bielkoviny', sum.protein, p.target_protein, 'var(--protein)')}
        ${macro('Sacharidy', sum.carbs, p.target_carbs, 'var(--carbs)')}
        ${macro('Tuky', sum.fat, p.target_fat, 'var(--fat)')}
      </div>
    </section>
    ${weekLine}

    ${tip && !firstRun ? `<aside class="tip ${tip.quote ? 'q' : ''}"><span class="tip-i">${tip.icon}</span><p>${h(tip.text)}</p></aside>` : ''}

    ${isToday ? `<a class="ai-bar" href="#/jedlo?ai=1"><span class="ai-spark">✦</span><span>Napíš alebo odfoť, čo si jedol</span><i>📷</i></a>` : ''}
    <div class="meals">${mealCards}</div>

    <section class="wt">
      <div class="wt-h"><div><h3>Voda</h3><p><b>${liters(water)} l</b> z ${liters(waterGoal)} l</p></div>
        <div class="wt-b"><button class="wt-btn minus" data-wd="-1" aria-label="Uber pohár" ${water ? '' : 'disabled'}>−</button><button class="wt-btn" data-wd="1">+ 250 ml</button></div></div>
      <div class="wt-segs">${waterSegs}</div>
    </section>

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
  // animácie: krúžky sa nabehnú, čísla dobehnú
  requestAnimationFrame(() => requestAnimationFrame(() => root.querySelectorAll('.rg-fill').forEach(c => c.setAttribute('stroke-dashoffset', c.dataset.off))));
  if (!reduceMotion()) root.querySelectorAll('[data-count]').forEach(el => {
    const to = Number(el.dataset.count); if (!to) return; const t0 = performance.now();
    const step = t => { const k = Math.min(1, (t - t0) / 700); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });

  root.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { st.date = b.dataset.d; renderToday(); });
  root.querySelectorAll('[data-wk]').forEach(b => b.onclick = () => { const d = calc.addDays(st.date, Number(b.dataset.wk)); st.date = d > calc.today() ? calc.today() : d; renderToday(); });
  push.bindPushCard(renderToday);
  root.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { location.hash = `#/jedlo?meal=${b.dataset.add}`; });
  root.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { await db.deleteFood(Number(b.dataset.del)); renderToday(); });
  root.querySelectorAll('[data-copy]').forEach(b => b.onclick = async () => {
    const n = await db.copyMeal(uid, calc.addDays(st.date, -1), st.date, b.dataset.copy).catch(err => { toast(err.message, true); return -1; });
    if (n === 0) toast('Včera tu nebolo nič zapísané', true); else if (n > 0) { toast('Skopírované z včera'); renderToday(); }
  });
  root.querySelectorAll('[data-wd]').forEach(b => b.onclick = async () => {
    const val = Math.max(0, Math.min(20, water + Number(b.dataset.wd)));
    await db.upsertCheckin({ user_id: uid, date: st.date, water: val, sleep_h: checkin?.sleep_h ?? null, steps: checkin?.steps ?? null, mood: checkin?.mood ?? null, note: checkin?.note ?? null });
    if (val === waterGoal && Number(b.dataset.wd) > 0) toast('Denný cieľ vody splnený 💧');
    renderToday();
  });
  root.querySelector('#adaptYes')?.addEventListener('click', async () => { await v2.applyAdaptive(p, adaptive); toast(`Nový cieľ: ${adaptive.newKcal} kcal`); renderToday(); });
  root.querySelector('#adaptNo')?.addEventListener('click', async () => { await db.applyTarget(uid, { date: calc.today(), old_kcal: p.target_kcal, new_kcal: p.target_kcal, reason: 'Ponechané používateľom', avg_intake: adaptive.avg, trend_change: adaptive.ch }, {}); renderToday(); });
}
