// Druhý dych: hlavná aplikácia (routing + obrazovky)
import * as db from './data.js';
import * as calc from './calc.js';
import * as v2 from './app2.js';
import * as push from './push.js';
import * as fd from './foods.js';

const $app = document.getElementById('app');
const state = { session: null, profile: null, date: calc.today() };

const MEALS = { breakfast: 'Raňajky', lunch: 'Obed', dinner: 'Večera', snack: 'Snack' };
export const ctx = {};
const ICONS = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11 12 3l9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg>',
  food: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 3v8a3 3 0 0 0 3 3v7M10 3v8a3 3 0 0 1-3 3M17 3c-2 2-2 5-2 8h2v10"/></svg>',
  scale: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 9a4 4 0 0 1 8 0M12 9v3"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>',
  coach: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-5-6.3"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="15" rx="3"/><circle cx="12" cy="12.5" r="3.5"/><path d="M8 5l1.5-2h5L16 5"/></svg>',
  dumbbell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19h16M7 15l4-4 3 3 5-6"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h16v11H9l-5 4z"/></svg>',
};

// ---------- helpers ----------
const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const r0 = n => Math.round(Number(n || 0));
function toast(msg, err = false) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), err ? 4000 : 2200);
}
function sheet(html) {
  const bg = document.createElement('div'); bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet">${html}</div>`;
  bg.addEventListener('click', e => { if (e.target === bg) bg.remove(); });
  document.body.appendChild(bg);
  return bg;
}
// spodná lišta: max 5 položiek pre účastníka (6 pre kouča); Váha + Fotky = Pokrok
const NAV_GROUP = { '#/vaha': '#/vaha', '#/fotky': '#/vaha', '#/checkin': '#/', '#/spravy': '#/profil', '#/pripomienky': '#/profil' };
function nav(active) {
  const items = [['#/', 'home', 'Dnes'], ['#/jedlo', 'food', 'Jedlo'], ['#/trening', 'dumbbell', 'Tréning'], ['#/vaha', 'chart', 'Pokrok']];
  if (state.profile?.role === 'coach') items.push(['#/kouc', 'coach', 'Kouč']);
  items.push(['#/profil', 'user', 'Profil']);
  const cur = NAV_GROUP[active] || active;
  return `<nav class="nav">${items.map(([href, ic, lbl]) => `<a href="${href}" class="${cur === href ? 'on' : ''}"><span class="ic">${ICONS[ic]}</span><span class="lb">${lbl}</span></a>`).join('')}</nav>`;
}
// prepínač Váha / Fotky na obrazovke Pokrok
function progressTabs(path) {
  const scr = $app.querySelector('.screen'); if (!scr) return;
  const el = document.createElement('div');
  el.className = 'seg mb ptabs';
  el.innerHTML = `<a href="#/vaha" class="${path === '#/vaha' ? 'on' : ''}">Váha a miery</a><a href="#/fotky" class="${path === '#/fotky' ? 'on' : ''}">Fotky</a>`;
  const head = scr.querySelector(':scope > .topbar, :scope > h1');
  const h1 = scr.querySelector(':scope > .topbar h1, :scope > h1'); if (h1) h1.textContent = 'Pokrok';
  if (head) head.after(el); else scr.prepend(el);
}
function dateLabel(iso) {
  const d = new Date(iso + 'T00:00:00');
  const days = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'];
  if (iso === calc.today()) return 'Dnes';
  if (iso === calc.addDays(calc.today(), -1)) return 'Včera';
  return `${days[d.getDay()]} ${calc.fmtDate(iso)}`;
}
function datePicker() {
  return `<div class="row" style="gap:6px">
    <button class="btn icon ghost" data-day="-1">‹</button>
    <span class="date mono" style="min-width:90px;text-align:center">${dateLabel(state.date)}</span>
    <button class="btn icon ghost" data-day="1" ${state.date >= calc.today() ? 'disabled' : ''}>›</button>
  </div>`;
}
function bindDatePicker(root, rerender) {
  root.querySelectorAll('[data-day]').forEach(b => b.onclick = () => { state.date = calc.addDays(state.date, Number(b.dataset.day)); rerender(); });
}

// ---------- router ----------
window.addEventListener('hashchange', route);
async function route() {
  const hash = location.hash || '#/';
  const path = hash.split('?')[0];
  if (!state.session) return renderAuth();
  if (!state.profile) state.profile = await db.getProfile(state.session.user.id);
  if (!state.profile?.onboarded && path !== '#/onboarding') { location.hash = '#/onboarding'; return; }
  const views = { '#/': renderToday, '#/onboarding': renderOnboarding, '#/jedlo': fd.renderFood, '#/vaha': renderWeight, '#/checkin': renderCheckin, '#/kouc': v2.renderCoach, '#/profil': renderProfile,
    '#/fotky': () => v2.renderPhotos(), '#/trening': v2.renderTraining, '#/spravy': v2.renderMessages, '#/pripomienky': push.renderReminders };
  let fn = views[path];
  const m = path.match(/^#\/kouc\/([^/]+)(\/fotky)?$/);
  if (m) fn = m[2] ? () => v2.renderPhotos(m[1], true) : () => v2.renderCoachDetail(m[1]);
  fn = fn || renderToday;
  try { await fn(); if (path === '#/vaha' || path === '#/fotky') progressTabs(path); } catch (e) { console.error(e); toast(e.message, true); }
  window.scrollTo(0, 0);
}

// ---------- auth ----------
function renderAuth(mode = 'login') {
  $app.innerHTML = `
  <div class="hero">
    <div class="tag">Druhý dych</div>
    <h1>Druhý dych nie je dar.<br>Dá sa naučiť.</h1>
    <p class="lead">12 týždňov. Jedlo, váha, pohyb a hlava na jednom mieste. Tvoj kouč vidí každý krok.</p>
  </div>
  <div class="screen no-nav">
    <div class="card">
      <div class="seg mb"><button data-m="login" class="${mode === 'login' ? 'on' : ''}">Prihlásiť sa</button><button data-m="register" class="${mode === 'register' ? 'on' : ''}">Registrovať</button></div>
      <form id="authf">
        ${mode === 'register' ? '<label class="field"><span>Meno</span><input class="input" name="name" required placeholder="Ako ťa máme volať"></label>' : ''}
        <label class="field"><span>E-mail</span><input class="input" type="email" name="email" required autocomplete="email"></label>
        <label class="field"><span>Heslo</span><input class="input" type="password" name="password" required minlength="6" autocomplete="${mode === 'register' ? 'new-password' : 'current-password'}"></label>
        <button class="btn primary" type="submit">${mode === 'register' ? 'Vytvoriť účet' : 'Prihlásiť sa'}</button>
      </form>
    </div>
  </div>`;
  $app.querySelectorAll('[data-m]').forEach(b => b.onclick = () => renderAuth(b.dataset.m));
  $app.querySelector('#authf').onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true;
    try {
      if (mode === 'register') {
        const res = await db.signUp(f.get('email'), f.get('password'), f.get('name'));
        if (!res.session) { toast('Účet vytvorený. Skontroluj e-mail a potvrď registráciu.'); renderAuth('login'); return; }
      } else {
        await db.signIn(f.get('email'), f.get('password'));
      }
    } catch (err) { toast(err.message, true); btn.disabled = false; }
  };
}

// ---------- onboarding ----------
async function renderOnboarding() {
  const p = state.profile || {};
  $app.innerHTML = `<div class="screen no-nav">
    <div class="brand mb"><span class="dot"></span> Druhý dych</div>
    <h1>Nastav si štart</h1>
    <p class="muted mb">Z týchto údajov ti appka vypočíta denný cieľ kalórií a makier. Všetko sa dá neskôr zmeniť v profile.</p>
    <form id="onb" class="card">
      <label class="field"><span>Meno</span><input class="input" name="name" required value="${h(p.name || '')}"></label>
      <div class="grid2">
        <label class="field"><span>Pohlavie</span><select class="input" name="sex" required>
          <option value="m" ${p.sex === 'm' ? 'selected' : ''}>Muž</option><option value="f" ${p.sex === 'f' ? 'selected' : ''}>Žena</option></select></label>
        <label class="field"><span>Rok narodenia</span><input class="input" type="number" name="birth_year" required min="1950" max="2015" value="${p.birth_year || 2008}"></label>
      </div>
      <div class="grid2">
        <label class="field"><span>Výška (cm)</span><input class="input" type="number" name="height_cm" required min="120" max="230" value="${p.height_cm || ''}"></label>
        <label class="field"><span>Váha teraz (kg)</span><input class="input" type="number" step="0.1" name="weight" required min="30" max="300" value="${p.start_weight || ''}"></label>
      </div>
      <label class="field"><span>Cieľ</span><select class="input" name="goal" required>
        ${Object.entries(calc.GOAL).map(([k, v]) => `<option value="${k}" ${p.goal === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select></label>
      <label class="field"><span>Aktivita</span><select class="input" name="activity" required>
        ${Object.entries(calc.ACTIVITY).map(([k, v]) => `<option value="${k}" ${(p.activity || 'light') === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select></label>
      <label class="field"><span>Koľko dní v týždni chceš trénovať</span><input class="input" type="number" name="training_days" min="0" max="7" value="${p.training_days ?? 3}"></label>
      <div id="preview" class="stat mb" style="display:none"></div>
      <button class="btn primary" type="submit">Uložiť a začať</button>
    </form>
  </div>`;
  const form = $app.querySelector('#onb');
  const preview = () => {
    const f = new FormData(form);
    const w = Number(f.get('weight')), hc = Number(f.get('height_cm'));
    if (!w || !hc) return;
    const t = calc.targets({ sex: f.get('sex'), weightKg: w, heightCm: hc, birthYear: f.get('birth_year'), activity: f.get('activity'), goal: f.get('goal') });
    const el = $app.querySelector('#preview'); el.style.display = 'block';
    el.innerHTML = `<b>${t.kcal} kcal / deň</b><span>Bielkoviny ${t.protein} g · Sacharidy ${t.carbs} g · Tuky ${t.fat} g · (bazálny metabolizmus ${t.bmr}, výdaj ${t.tdee})</span>`;
  };
  form.addEventListener('input', preview); preview();
  form.onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(form);
    const w = Number(f.get('weight')), hc = Number(f.get('height_cm'));
    const t = calc.targets({ sex: f.get('sex'), weightKg: w, heightCm: hc, birthYear: f.get('birth_year'), activity: f.get('activity'), goal: f.get('goal') });
    const uid = state.session.user.id;
    const first = !state.profile?.onboarded;
    const profile = {
      id: uid, email: state.session.user.email, name: f.get('name'), sex: f.get('sex'), birth_year: Number(f.get('birth_year')), height_cm: hc,
      goal: f.get('goal'), activity: f.get('activity'), training_days: Number(f.get('training_days')),
      target_kcal: t.kcal, target_protein: t.protein, target_carbs: t.carbs, target_fat: t.fat, onboarded: true,
      role: state.profile?.role || 'participant',
    };
    if (first) { profile.start_weight = w; profile.start_date = calc.today(); }
    try {
      state.profile = await db.upsertProfile(profile);
      await db.upsertWeight({ user_id: uid, date: calc.today(), weight_kg: w });
      toast('Štart nastavený. Ideme.');
      location.hash = '#/';
    } catch (err) { toast(err.message, true); }
  };
}

// ---------- dnes ----------
function ring(value, target) {
  const pct = Math.min(1, target ? value / target : 0);
  const r = 56, c = 2 * Math.PI * r;
  const over = target && value > target;
  return `<div class="ring"><svg width="132" height="132" viewBox="0 0 132 132">
    <circle cx="66" cy="66" r="${r}" stroke="var(--bg-2)" stroke-width="12" fill="none"/>
    <circle cx="66" cy="66" r="${r}" stroke="${over ? 'var(--accent-2)' : 'var(--accent)'}" stroke-width="12" fill="none" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}"/>
  </svg><div class="center"><b class="mono">${r0(Math.max(0, target - value))}</b><span>${over ? 'kcal navyše' : 'kcal zostáva'}</span></div></div>`;
}
function macroBar(label, val, target, color) {
  const pct = Math.min(100, target ? (val / target) * 100 : 0);
  return `<div class="macro"><div class="lbl"><span>${label}</span><span class="mono">${r0(val)} / ${target} g</span></div><div class="bar"><i style="width:${pct}%;background:${color}"></i></div></div>`;
}

async function renderToday() {
  const p = state.profile, uid = p.id;
  const from30 = calc.addDays(calc.today(), -30);
  const [foods, weights, checkin, actDates, msgs, plan, wlogs] = await Promise.all([
    db.listFood(uid, state.date), db.listWeights(uid), db.getCheckin(uid, state.date),
    db.activityDates(uid, from30), db.listMessages(uid), db.getPlan(uid), db.listWorkoutLogs(uid, calc.weekStart()),
  ]);
  const sum = calc.sumMacros(foods);
  const tr = calc.trend(weights.map(w => ({ date: w.date, weight: Number(w.weight_kg) })));
  const last = tr[tr.length - 1];
  const change = calc.trendChange(tr, 7);
  const startW = Number(p.start_weight || (weights[0]?.weight_kg ?? 0));
  const total = last ? Math.round((last.trend - startW) * 10) / 10 : 0;
  const day = Math.max(1, Math.round((new Date(calc.today()) - new Date(p.start_date || calc.today())) / 86400000) + 1);
  const strk = calc.streak(actDates);
  const week = calc.last7();
  const actSet = new Set(actDates);
  const unread = msgs.filter(m => m.to_user === uid && !m.read_at);
  const lastMsg = msgs.find(m => m.to_user === uid);
  const water = checkin?.water || 0, waterGoal = p.water_goal || 8;
  const trainedWeek = wlogs.filter(w => w.done).length;
  const trainedToday = wlogs.some(w => w.done && w.date === state.date);
  const adaptive = state.date === calc.today() ? await v2.checkAdaptive(p, weights).catch(() => null) : null;
  const pushCard = state.date === calc.today() ? await push.pushPromptCard().catch(() => '') : '';

  $app.innerHTML = `<div class="screen">
    <div class="topbar"><div><div class="brand"><span class="dot"></span> Ahoj, ${h(p.name?.split(' ')[0] || '')}</div><div class="date">Deň ${day} z 84 · týždeň ${Math.min(12, Math.ceil(day / 7))}</div></div>${datePicker()}</div>
    ${unread.length ? `<a class="card accent link" href="#/spravy"><div class="row between"><div><h3>Správa od kouča</h3><p class="small mt" style="color:var(--text)">${h(lastMsg.body.slice(0, 120))}${lastMsg.body.length > 120 ? '…' : ''}</p></div><span class="chip" style="background:var(--accent);color:var(--accent-ink)">${unread.length}</span></div></a>` : ''}
    ${pushCard}
    ${adaptive ? `<div class="card accent" id="adaptCard"><div class="row between"><h3>Týždenné prehodnotenie</h3><span class="chip">Adaptívny cieľ</span></div>
      <p class="small mt">${h(adaptive.reason)}</p>
      <p class="muted small mt">Priemer ${adaptive.avg} kcal z ${adaptive.days} dní · trend ${adaptive.ch > 0 ? '+' : ''}${adaptive.ch} kg</p>
      ${adaptive.adjust ? `<div class="row mt" style="gap:8px"><button class="btn sm primary" id="adaptYes">Nastaviť ${adaptive.newKcal} kcal</button><button class="btn sm ghost" id="adaptNo">Nechať ${p.target_kcal}</button></div>` : `<button class="btn sm ghost mt" id="adaptNo">OK</button>`}
    </div>` : ''}
    <div class="card">
      <div class="row between mb"><div class="row" style="gap:8px"><span class="streak">🔥 ${strk}</span><span class="muted small">${strk === 1 ? 'deň v rade' : strk >= 2 && strk <= 4 ? 'dni v rade' : 'dní v rade'}</span></div>
        <div class="dots">${week.map(d => `<span class="dot7 ${actSet.has(d) ? 'on' : ''} ${d === calc.today() ? 'today' : ''}" title="${d}">${['P', 'U', 'S', 'Š', 'P', 'S', 'N'][(new Date(d + 'T00:00:00').getDay() + 6) % 7]}</span>`).join('')}</div></div>
      <div class="ring-wrap">${ring(sum.kcal, p.target_kcal)}
        <div class="macros">
          ${macroBar('Bielkoviny', sum.protein, p.target_protein, 'var(--protein)')}
          ${macroBar('Sacharidy', sum.carbs, p.target_carbs, 'var(--carbs)')}
          ${macroBar('Tuky', sum.fat, p.target_fat, 'var(--fat)')}
        </div>
      </div>
      <div class="row between mt small muted"><span>Zjedené <b class="mono" style="color:var(--text)">${r0(sum.kcal)}</b> kcal</span><span>Cieľ <b class="mono" style="color:var(--text)">${p.target_kcal}</b> kcal</span></div>
    </div>
    <div class="grid3 mb">
      <div class="stat"><b class="mono">${last ? last.trend.toFixed(1) : '–'}</b><span>kg trend</span></div>
      <div class="stat"><b class="mono ${total < 0 ? 'pos' : total > 0 ? 'neg' : ''}">${total > 0 ? '+' : ''}${total.toFixed(1)}</b><span>kg od štartu</span></div>
      <div class="stat"><b class="mono">${change == null ? '–' : (change > 0 ? '+' : '') + change.toFixed(1)}</b><span>kg za 7 dní</span></div>
    </div>
    <div class="grid2 mb">
      <a class="card link" href="#/trening" style="margin:0"><div class="row between"><h3>Tréning</h3><span class="${trainedToday ? 'pos' : 'muted'}">${trainedToday ? '✓' : ''}</span></div><p class="muted small mt">${plan ? `${trainedWeek}/${p.training_days || plan.days.length} tento týždeň` : 'Vytvor si plán'}</p></a>
      <div class="card" style="margin:0"><div class="row between"><h3>Voda</h3><span class="muted small mono">${water}/${waterGoal}</span></div><div class="water mt">${Array.from({ length: waterGoal }, (_, i) => `<button data-w="${i + 1}" class="${i < water ? 'on' : ''}"></button>`).join('')}</div></div>
    </div>
    ${Object.entries(MEALS).map(([k, lbl]) => {
      const rows = foods.filter(f => f.meal === k); const s = calc.sumMacros(rows);
      return `<div class="card meal"><div class="meal-h"><h3>${lbl}</h3><div class="row"><span class="muted small mono">${r0(s.kcal)} kcal</span><button class="btn sm primary" data-add="${k}">+ Pridať</button></div></div>
        ${rows.length ? rows.map(f => `<div class="item"><div class="n"><b>${h(f.name)}</b><span>${h(f.brand || '')}${f.brand ? ' · ' : ''}${f.portion ? `${Math.round(f.qty * 10) / 10}× ${h(f.portion)} · ` : ''}${r0(f.grams)} g · B ${r0(f.protein)} · S ${r0(f.carbs)} · T ${r0(f.fat)}</span></div><span class="k mono">${r0(f.kcal)}</span><button class="del" data-del="${f.id}" aria-label="Zmazať">×</button></div>`).join('') : `<div class="empty row between"><span>Zatiaľ nič.</span>${state.date === calc.today() ? `<a href="#" data-copy="${k}" class="small">↻ Ako včera</a>` : ''}</div>`}
      </div>`;
    }).join('')}
    <div class="card"><div class="row between"><div><h3>Denný check-in</h3><p class="muted small">${checkin && (checkin.sleep_h || checkin.steps || checkin.mood) ? `Spánok ${checkin.sleep_h ?? '–'} h · ${checkin.steps ?? '–'} krokov · nálada ${checkin.mood ?? '–'}/5` : 'Spánok, kroky, nálada. 20 sekúnd.'}</p></div><a class="btn sm" href="#/checkin">${checkin?.mood ? 'Upraviť' : 'Vyplniť'}</a></div></div>
  </div>${nav('#/')}`;

  bindDatePicker($app, renderToday);
  push.bindPushCard(renderToday);
  $app.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { location.hash = `#/jedlo?meal=${b.dataset.add}`; });
  $app.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { await db.deleteFood(Number(b.dataset.del)); renderToday(); });
  $app.querySelectorAll('[data-copy]').forEach(b => b.onclick = async e => {
    e.preventDefault();
    const n = await db.copyMeal(uid, calc.addDays(state.date, -1), state.date, b.dataset.copy).catch(err => { toast(err.message, true); return -1; });
    if (n === 0) toast('Včera tu nebolo nič zapísané', true); else if (n > 0) { toast('Skopírované z včera'); renderToday(); }
  });
  $app.querySelectorAll('[data-w]').forEach(b => b.onclick = async () => {
    const n = Number(b.dataset.w); const val = n === water ? n - 1 : n;
    await db.upsertCheckin({ user_id: uid, date: state.date, water: val, sleep_h: checkin?.sleep_h ?? null, steps: checkin?.steps ?? null, mood: checkin?.mood ?? null, note: checkin?.note ?? null });
    renderToday();
  });
  $app.querySelector('#adaptYes')?.addEventListener('click', async () => { await v2.applyAdaptive(p, adaptive); toast(`Nový cieľ: ${adaptive.newKcal} kcal`); renderToday(); });
  $app.querySelector('#adaptNo')?.addEventListener('click', async () => { await db.applyTarget(uid, { date: calc.today(), old_kcal: p.target_kcal, new_kcal: p.target_kcal, reason: 'Ponechané používateľom', avg_intake: adaptive.avg, trend_change: adaptive.ch }, {}); renderToday(); });
}

// ---------- jedlo: foods.js ----------

// ---------- váha ----------
function weightChart(tr) {
  if (tr.length < 2) return '<p class="empty">Graf sa zobrazí po druhom vážení.</p>';
  const W = 520, H = 190, pl = 34, pr = 10, pt = 12, pb = 24;
  const data = tr.slice(-60);
  const ws = data.flatMap(d => [d.weight, d.trend]);
  let min = Math.min(...ws), max = Math.max(...ws); const pad = Math.max(0.5, (max - min) * 0.15); min -= pad; max += pad;
  const x = i => pl + (i / (data.length - 1)) * (W - pl - pr);
  const y = v => pt + (1 - (v - min) / (max - min)) * (H - pt - pb);
  const ticks = [min, (min + max) / 2, max];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">
    ${ticks.map(t => `<line class="grid" x1="${pl}" x2="${W - pr}" y1="${y(t)}" y2="${y(t)}"/><text class="lbl" x="2" y="${y(t) + 4}">${t.toFixed(1)}</text>`).join('')}
    ${data.map((d, i) => `<circle class="raw" cx="${x(i)}" cy="${y(d.weight)}" r="4"/>`).join('')}
    <path class="trend" d="${data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.trend)}`).join(' ')}"/>
    <text class="lbl" x="${pl}" y="${H - 6}">${calc.fmtDate(data[0].date)}</text><text class="lbl" x="${W - pr}" y="${H - 6}" text-anchor="end">${calc.fmtDate(data[data.length - 1].date)}</text>
  </svg>`;
}
async function renderWeight() {
  const uid = state.profile.id;
  const weights = await db.listWeights(uid);
  const tr = calc.trend(weights.map(w => ({ date: w.date, weight: Number(w.weight_kg) })));
  const last = tr[tr.length - 1];
  const todayRow = weights.find(w => w.date === state.date);
  const startW = Number(state.profile.start_weight || weights[0]?.weight_kg || 0);
  const ch7 = calc.trendChange(tr, 7);
  $app.innerHTML = `<div class="screen">
    <div class="topbar"><h1>Váha</h1>${datePicker()}</div>
    <div class="card">
      <form id="wf" class="input-row"><input class="input" type="number" step="0.1" inputmode="decimal" name="w" placeholder="kg" value="${todayRow ? todayRow.weight_kg : ''}" required><input class="input" type="number" step="0.5" inputmode="decimal" name="waist" placeholder="pás cm" value="${todayRow?.waist_cm ?? ''}" style="max-width:110px"><button class="btn sm primary" type="submit">Uložiť</button></form>
      <p class="muted small mt">Váž sa ráno, po WC, pred jedlom. Denné výkyvy sú normálne, pozeraj trend (zelená čiara).</p>
    </div>
    <div class="grid3 mb">
      <div class="stat"><b class="mono">${last ? last.trend.toFixed(1) : '–'}</b><span>kg trend</span></div>
      <div class="stat"><b class="mono">${last ? (last.trend - startW > 0 ? '+' : '') + (last.trend - startW).toFixed(1) : '–'}</b><span>od štartu (${startW.toFixed(1)})</span></div>
      <div class="stat"><b class="mono">${ch7 == null ? '–' : (ch7 > 0 ? '+' : '') + ch7.toFixed(1)}</b><span>kg / 7 dní</span></div>
    </div>
    <div class="card">${weightChart(tr)}</div>
    <div class="card">${weights.length ? [...weights].reverse().slice(0, 30).map(w => `<div class="item"><div class="n"><b>${calc.fmtDate(w.date)} ${w.date.slice(0, 4)}</b><span>${w.waist_cm ? 'pás ' + w.waist_cm + ' cm' : ''}</span></div><span class="k mono">${Number(w.weight_kg).toFixed(1)} kg</span><button class="del" data-del="${w.id}">×</button></div>`).join('') : '<div class="empty">Žiadne váženia.</div>'}</div>
  </div>${nav('#/vaha')}`;
  bindDatePicker($app, renderWeight);
  $app.querySelector('#wf').onsubmit = async e => {
    e.preventDefault(); const f = new FormData(e.target);
    try {
      await db.upsertWeight({ user_id: uid, date: state.date, weight_kg: Number(f.get('w')), waist_cm: f.get('waist') ? Number(f.get('waist')) : null });
      toast('Uložené'); renderWeight();
    } catch (err) { toast(err.message, true); }
  };
  $app.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { await db.deleteWeight(Number(b.dataset.del)); renderWeight(); });
}

// ---------- check-in ----------
async function renderCheckin() {
  const uid = state.profile.id;
  const c = await db.getCheckin(uid, state.date) || {};
  let mood = c.mood || 0;
  $app.innerHTML = `<div class="screen">
    <div class="topbar"><h1>Check-in</h1>${datePicker()}</div>
    <form id="cf" class="card">
      <div class="grid2">
        <label class="field"><span>Spánok (hodiny)</span><input class="input" name="sleep" type="number" step="0.5" inputmode="decimal" value="${c.sleep_h ?? ''}" placeholder="7.5"></label>
        <label class="field"><span>Kroky</span><input class="input" name="steps" type="number" inputmode="numeric" value="${c.steps ?? ''}" placeholder="8000"></label>
      </div>
      <label class="field"><span>Nálada / energia</span><div class="mood">${[1, 2, 3, 4, 5].map(m => `<button type="button" data-mood="${m}" class="${mood === m ? 'on' : ''}">${['😵', '😕', '😐', '🙂', '🔥'][m - 1]}</button>`).join('')}</div></label>
      <label class="field"><span>Poznámka pre kouča (nepovinné)</span><textarea class="input" name="note" rows="2" placeholder="Ako sa dnes cítiš, čo bolo ťažké...">${h(c.note || '')}</textarea></label>
      <button class="btn primary" type="submit">Uložiť check-in</button>
    </form>
  </div>${nav('#/checkin')}`;
  bindDatePicker($app, renderCheckin);
  $app.querySelectorAll('[data-mood]').forEach(b => b.onclick = () => { mood = Number(b.dataset.mood); $app.querySelectorAll('[data-mood]').forEach(x => x.classList.toggle('on', x === b)); });
  $app.querySelector('#cf').onsubmit = async e => {
    e.preventDefault(); const f = new FormData(e.target);
    try {
      await db.upsertCheckin({ user_id: uid, date: state.date, sleep_h: f.get('sleep') ? Number(f.get('sleep')) : null, steps: f.get('steps') ? Number(f.get('steps')) : null, mood: mood || null, note: f.get('note') || null, water: c.water ?? null });
      toast('Uložené. Dobrá práca.'); location.hash = '#/';
    } catch (err) { toast(err.message, true); }
  };
}

// ---------- profil ----------
async function renderProfile() {
  const p = state.profile;
  $app.innerHTML = `<div class="screen">
    <h1 class="mb">Profil</h1>
    <div class="card">
      <h3>${h(p.name)}</h3><p class="muted small">${h(p.email || '')} · ${p.role === 'coach' ? 'kouč' : 'účastník'}</p>
      <div class="grid2 mt">
        <div class="stat"><b class="mono">${p.target_kcal || '–'}</b><span>kcal cieľ</span></div>
        <div class="stat"><b class="mono">${p.target_protein || '–'} g</b><span>bielkoviny</span></div>
        <div class="stat"><b class="mono">${p.start_weight || '–'} kg</b><span>štartová váha</span></div>
        <div class="stat"><b class="mono">${p.start_date ? calc.fmtDate(p.start_date) : '–'}</b><span>štart</span></div>
      </div>
      <p class="muted small mt">Cieľ: ${calc.GOAL[p.goal]?.label || '–'} · ${calc.ACTIVITY[p.activity]?.label || ''}</p>
    </div>
    <a class="btn mb" href="#/onboarding">Upraviť údaje a prepočítať cieľ</a>
    <a class="btn mb" href="#/pripomienky">Pripomienky a notifikácie</a>
    <a class="btn mb" href="#/spravy">Správy</a>
    <button class="btn danger" id="out">Odhlásiť sa</button>
    <p class="muted small center mt">Druhý dych · verzia 0.4 · ${new Date().getFullYear()}</p>
  </div>${nav('#/profil')}`;
  $app.querySelector('#out').onclick = async () => { await db.signOut(); state.profile = null; };
}

// ---------- ctx pre app2.js ----------
Object.assign(ctx, { $app, state, h, r0, toast, sheet, nav, datePicker, bindDatePicker, weightChart, MEALS });

// ---------- boot ----------
async function boot() {
  state.session = await db.getSession();
  db.onAuthChange(s => { const was = !!state.session; state.session = s; if (!s) state.profile = null; if (!!s !== was) { if (s) location.hash = '#/'; route(); } });
  route();
}
boot();
