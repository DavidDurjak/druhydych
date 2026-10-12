// v0.7: týždenný report (skóre 0 až 100, rozpad bodov, porovnanie s minulým týždňom, zameranie na ďalší týždeň)
import * as calc from './calc.js';
import { ctx } from './app.js';
import { weeklyReport, weeklyReportsAll, fmtSleep } from './health.js';

const $app = () => ctx.$app;
const state = () => ctx.state;
const h = (...a) => ctx.h(...a), nav = (...a) => ctx.nav(...a), toast = (...a) => ctx.toast(...a);

const PARTS = [
  ['log', 'Zapisovanie jedla', 30],
  ['kcal', 'Kalórie v cieli', 25],
  ['training', 'Tréningy', 20],
  ['protein', 'Bielkoviny', 15],
  ['weigh', 'Váženie', 10],
];
const FOCUS = {
  log: { i: '📝', t: 'Zapisuj jedlo každý deň', d: 'Aj nedokonalý zápis je lepší ako žiadny. Použi „Rovnako ako včera“ a skener, zaberie to minútu denne.' },
  kcal: { i: '🎯', t: 'Traf kalórie aspoň 5 dní zo 7', d: 'Plánuj večeru podľa toho, koľko ti zostáva. Najviac sa ujde cez víkend.' },
  training: { i: '🏋️', t: 'Odtrénuj všetky plánované tréningy', d: 'Daj si tréningy do kalendára ako stretnutie. Kratší tréning je lepší ako žiadny.' },
  protein: { i: '💪', t: 'Bielkoviny ku každému jedlu', d: 'Tvaroh, vajcia, kuracie, skyr alebo strukoviny. Bielkoviny držia svaly a sýtosť.' },
  weigh: { i: '⚖️', t: 'Váž sa aspoň 3× ráno', d: 'Po WC, pred jedlom. Z viacerých vážení appka vypočíta presnejší trend.' },
};

// predvolený týždeň: v nedeľu aktuálny, inak posledný ukončený
export function defaultWeek() {
  const t = calc.today();
  const ws = calc.weekStart(t);
  return new Date(t + 'T00:00:00').getDay() === 0 ? ws : calc.addDays(ws, -7);
}
// karta na Dnes: nedeľa od 18:00, pondelok a utorok
export function reportReady() {
  const d = new Date(); const g = d.getDay();
  return (g === 0 && d.getHours() >= 18) || g === 1 || g === 2;
}
export function reportCardHtml() {
  if (!reportReady()) return '';
  return `<a class="rp-card" href="#/report"><span class="rp-card-i">📊</span><div><h3>Tvoj týždenný report je hotový</h3><p>Skóre, porovnanie s minulým týždňom a jedna vec na zlepšenie.</p></div><span class="rp-card-go">›</span></a>`;
}

function verdict(s) {
  if (s >= 85) return 'Výborný týždeň';
  if (s >= 70) return 'Silný týždeň';
  if (s >= 50) return 'Solídny základ';
  if (s >= 25) return 'Je čo zlepšovať';
  return 'Týždeň na reštart';
}
function scoreRing(score) {
  const r = 70, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(100, score)) / 100);
  return `<svg class="rp-ring" viewBox="0 0 170 170" aria-hidden="true">
    <defs><linearGradient id="rpg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7CFFB2"/><stop offset="1" stop-color="#3FD5C4"/></linearGradient></defs>
    <circle cx="85" cy="85" r="${r}" fill="none" stroke="var(--track)" stroke-width="12"/>
    <circle class="rg-fill" cx="85" cy="85" r="${r}" fill="none" stroke="url(#rpg)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${c.toFixed(1)}" data-off="${off.toFixed(1)}" transform="rotate(-90 85 85)"/>
  </svg>`;
}
const sgn = v => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v);

export async function renderReport() {
  const st = state(), me = st.profile;
  const q = new URLSearchParams((location.hash.split('?')[1]) || '');
  const uid = q.get('u') && me.role === 'coach' ? q.get('u') : me.id;
  const from = calc.weekStart(q.get('w') || defaultWeek());
  const thisWeek = calc.weekStart(calc.today());
  const base = '#/report?' + (uid !== me.id ? `u=${uid}&` : '');
  $app().innerHTML = `<div class="screen"><h1>Týždenný report</h1><div class="spinner"></div></div>${nav('#/report')}`;

  const r = await weeklyReport(uid, from);
  const who = uid !== me.id ? (r.name || 'Účastník') : null;
  const score = Number(r.score) || 0, prev = r.prev_score == null ? null : Number(r.prev_score);
  const delta = prev != null && (prev > 0 || score > 0) ? score - prev : null;
  const wDelta = r.weight_avg != null && r.prev_weight_avg != null ? Math.round((r.weight_avg - r.prev_weight_avg) * 10) / 10 : null;
  const f = FOCUS[r.focus] || FOCUS.log;
  const partial = from === thisWeek && new Date().getDay() !== 0;
  const empty = !r.days_logged && !r.weigh_ins && !r.trainings;

  const stat = (ic, val, lbl, sub = '') => `<div class="rp-s"><span>${ic}</span><b>${val}</b><small>${lbl}</small>${sub ? `<em>${sub}</em>` : ''}</div>`;
  const goal = r.goal || me.goal;
  const goodW = goal === 'gain' ? wDelta > 0 : goal === 'lose' ? wDelta < 0 : wDelta != null && Math.abs(wDelta) <= 0.3;

  $app().innerHTML = `<div class="screen rp">
    <div class="topbar"><div><h1>${who ? h(who) : 'Týždenný report'}</h1><p class="muted small">${who ? 'Týždenný report · ' : ''}${calc.fmtDate(from)} až ${calc.fmtDate(calc.addDays(from, 6))}${partial ? ' · týždeň ešte beží' : ''}</p></div>
      <div class="rp-nav"><a class="btn icon ghost" href="${base}w=${calc.addDays(from, -7)}" aria-label="Predchádzajúci týždeň">‹</a>${from < thisWeek ? `<a class="btn icon ghost" href="${base}w=${calc.addDays(from, 7)}" aria-label="Ďalší týždeň">›</a>` : '<span class="btn icon ghost" style="opacity:.3">›</span>'}</div></div>

    <section class="rp-hero">
      <div class="rp-score">${scoreRing(score)}<div class="rp-sc"><b data-count="${score}">${score}</b><span>zo 100</span></div></div>
      <h2>${empty ? 'Zatiaľ bez dát' : verdict(score)}</h2>
      ${delta != null ? `<p class="rp-delta ${delta > 0 ? 'up' : delta < 0 ? 'dn' : ''}">${sgn(delta)} oproti minulému týždňu</p>` : '<p class="rp-delta">Prvý týždeň, porovnanie bude nabudúce</p>'}
    </section>

    <section class="pg-card">
      <h3 class="mb">Odkiaľ sú body</h3>
      <div class="rp-parts">${PARTS.map(([k, l, max]) => { const v = Number(r.parts?.[k] || 0); const pts = Math.round(v * max); return `<div class="rp-p"><div class="rp-pl"><span>${l}</span><b>${pts}<small>/${max}</small></b></div><div class="rp-pb"><i class="${v >= 0.8 ? 'ok' : v >= 0.5 ? 'mid' : 'low'}" style="width:${v * 100}%"></i></div></div>`; }).join('')}</div>
    </section>

    <section class="rp-focus">
      <span class="rp-fi">${f.i}</span>
      <div><small>Budúci týždeň</small><h3>${f.t}</h3><p>${f.d}</p></div>
    </section>

    <section class="pg-card">
      <h3 class="mb">Čísla týždňa</h3>
      <div class="rp-grid">
        ${stat('🍽️', `${r.days_logged}/7`, 'dní so zápisom')}
        ${stat('🎯', `${r.in_goal}/7`, 'dní v cieli kcal')}
        ${stat('🔥', r.days_logged ? r.kcal_avg : '–', 'priemer kcal', `cieľ ${r.target_kcal ?? '–'}`)}
        ${stat('💪', r.days_logged ? `${r.protein_avg} g` : '–', 'bielkoviny / deň', `cieľ ${r.target_protein ?? '–'} g`)}
        ${stat('🏋️', `${r.trainings}/${r.training_goal}`, 'tréningy')}
        ${stat('⚖️', r.weight_avg != null ? `${String(r.weight_avg).replace('.', ',')} kg` : '–', 'priemerná váha', wDelta != null ? `<span class="${goodW ? 'g' : 'b'}">${sgn(wDelta).replace('.', ',')} kg</span> vs. minulý` : `${r.weigh_ins}× vážené`)}
        ${stat('👟', r.steps_avg != null ? Number(r.steps_avg).toLocaleString('sk-SK') : '–', 'krokov / deň')}
        ${stat('😴', r.sleep_avg != null ? fmtSleep(Number(r.sleep_avg)) : '–', 'spánok / noc')}
      </div>
      ${r.best_day ? `<p class="muted small mt">Najpresnejší deň: ${calc.fmtDate(r.best_day)}</p>` : ''}
    </section>

    ${'share' in navigator && !who ? '<button class="btn mb" id="share">Zdieľať report</button>' : ''}
    ${who ? `<a class="btn mb" href="#/kouc/${uid}">Detail účastníka</a>` : '<a class="btn ghost mb" href="#/pokrok">Späť na Pokrok</a>'}
  </div>${nav('#/report')}`;

  const root = $app();
  requestAnimationFrame(() => requestAnimationFrame(() => root.querySelectorAll('.rg-fill').forEach(c => c.setAttribute('stroke-dashoffset', c.dataset.off))));
  const el = root.querySelector('[data-count]');
  if (el && score && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const t0 = performance.now();
    const step = t => { const k = Math.min(1, (t - t0) / 900); el.textContent = Math.round(score * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  root.querySelector('#share')?.addEventListener('click', async () => {
    const text = `Môj týždeň v Druhom dychu: ${score}/100${delta != null ? ` (${sgn(delta)})` : ''}. Jedlo ${r.days_logged}/7 dní, tréningy ${r.trainings}/${r.training_goal}. Ďalej: ${f.t.toLowerCase()}.`;
    try { await navigator.share({ title: 'Druhý dych', text }); } catch (_) { }
  });
}

// zoznam pre kouča (Kouč obrazovka)
export async function coachReportsHtml() {
  const from = defaultWeek();
  const all = await weeklyReportsAll(from).catch(() => []);
  if (!all.length) return '';
  const sorted = all.slice().sort((a, b) => b.score - a.score);
  const avg = Math.round(all.reduce((s, x) => s + Number(x.score), 0) / all.length);
  return `<section class="card"><div class="row between mb"><h3>Týždenné reporty</h3><span class="chip">${calc.fmtDate(from)} · priemer ${avg}</span></div>
    ${sorted.map(x => { const d = x.prev_score != null && (x.prev_score > 0 || x.score > 0) ? x.score - x.prev_score : null; return `<a class="rp-li" href="#/report?u=${x.user_id}&w=${from}"><b class="rp-li-s ${x.score >= 70 ? 'ok' : x.score >= 50 ? 'mid' : 'low'}">${x.score}</b><span>${h(x.name)}</span>${d != null ? `<em class="${d > 0 ? 'up' : d < 0 ? 'dn' : ''}">${sgn(d)}</em>` : ''}<i>›</i></a>`; }).join('')}
  </section>`;
}
