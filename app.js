// Fuelwind: hlavná aplikácia (routing + obrazovky)
import * as db from './data.js';
import * as calc from './calc.js';
import * as v2 from './app2.js';
import * as push from './push.js';
import * as fd from './foods.js';
import * as td from './today.js';
import * as pg from './progress.js';
import * as hw from './health.js';
import * as rp from './report.js';
import * as ck from './checkin.js';
import * as ad from './admin.js';
import * as gl from './goals.js';
import * as dtm from './diet.js';
import * as gls from './glucose.js';
import * as crd from './cards.js';
import * as hb from './habits.js';

const $app = document.getElementById('app');
const state = { session: null, profile: null, date: calc.today() };

const MEALS = { breakfast: 'Raňajky', brunch: 'Desiata', lunch: 'Obed', afternoon: 'Olovrant', dinner: 'Večera', late: 'Druhá večera', snack: 'Snack' };
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
  if (msg === STALE) return; // zastaraná obrazovka (používateľ medzitým preklikol), nie je to chyba
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
const NAV_GROUP = { '#/vaha': '#/pokrok', '#/fotky': '#/pokrok', '#/checkin': '#/', '#/spravy': '#/profil', '#/pripomienky': '#/profil', '#/report': '#/pokrok', '#/hodinky': '#/profil', '#/tyzden': '#/', '#/admin': '#/profil', '#/napis': '#/profil', '#/ciele': '#/profil', '#/rezim': '#/profil', '#/karta': '#/profil', '#/cukor': '#/', '#/cukor-sprava': '#/', '#/navyky': '#/' };
function nav(active) {
  const items = [['#/', 'home', 'Dnes'], ['#/jedlo', 'food', 'Jedlo'], ['#/trening', 'dumbbell', 'Tréning'], ['#/pokrok', 'chart', 'Pokrok']];
  if (state.profile?.role === 'coach') items.push(['#/kouc', 'coach', 'Kouč']);
  items.push(['#/profil', 'user', 'Profil']);
  const cur = groupOf(active);
  return `<nav class="nav" data-for="${active}">${items.map(([href, ic, lbl]) => `<a href="${href}" class="${cur === href ? 'on' : ''}"><span class="ic">${ICONS[ic]}</span><span class="lb">${lbl}</span></a>`).join('')}</nav>`;
}
// do ktorej záložky spodnej lišty patrí cesta
function groupOf(path) {
  const p = String(path || '#/').split('?')[0] || '#/';
  if (p.startsWith('#/kouc/')) return '#/kouc';
  return NAV_GROUP[p] || p;
}
const curPath = () => (location.hash || '#/').split('?')[0];

// Ochrana: keď používateľ rýchlo preklikne (Pokrok → Tréning), pomalšia staršia obrazovka sa dokončí neskôr
// a prepísala by novú. Zápis obrazovky inej záložky, než je práve otvorená, sa zahodí a stará obrazovka sa zastaví.
const STALE = '__stale_screen__';
const HTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
Object.defineProperty($app, 'innerHTML', {
  configurable: true,
  get() { return HTML.get.call(this); },
  set(v) {
    const m = typeof v === 'string' && v.match(/<nav class="nav" data-for="([^"]*)"/);
    if (m && groupOf(m[1]) !== groupOf(curPath())) throw new Error(STALE);
    HTML.set.call(this, v);
  },
});

// Spodná lišta reaguje okamžite: záložka sa rozsvieti hneď pri ťuknutí (nie až keď sa načítajú dáta),
// funguje aj ťuknutie počas dobiehajúceho scrollu na iPhone (vtedy Safari klik nepošle) a opätovné
// ťuknutie na otvorenú záložku vyroluje hore.
let navDown = null, navAt = 0;
function navGo(a) {
  const href = a.getAttribute('href');
  if (!href) return;
  a.closest('.nav')?.querySelectorAll('a').forEach(x => x.classList.toggle('on', x === a));
  if (href === curPath() || (href === '#/' && curPath() === '#/')) {
    if (window.scrollY > 40) window.scrollTo({ top: 0, behavior: 'smooth' }); else route();
    return;
  }
  location.hash = href;
}
document.addEventListener('pointerdown', e => {
  const a = e.target.closest?.('.nav a');
  navDown = a ? { a, x: e.clientX, y: e.clientY } : null;
}, { passive: true });
document.addEventListener('pointerup', e => {
  if (!navDown || e.pointerType === 'mouse') return;
  const { a, x, y } = navDown; navDown = null;
  if (Math.hypot(e.clientX - x, e.clientY - y) > 14 || !a.isConnected) return;
  navAt = Date.now(); navGo(a);
}, { passive: true });
document.addEventListener('click', e => {
  const a = e.target.closest?.('.nav a');
  if (!a) return;
  e.preventDefault();
  if (Date.now() - navAt < 700) return; // už vybavené pri pointerup
  navGo(a);
});
// prepínač Váha / Fotky na obrazovke Pokrok
function progressTabs(path) {
  const scr = $app.querySelector('.screen'); if (!scr) return;
  const el = document.createElement('div');
  el.innerHTML = pg.progressTabs(path.slice(2));
  const tabs = el.firstElementChild;
  const head = scr.querySelector(':scope > .topbar, :scope > h1');
  const h1 = scr.querySelector(':scope > .topbar h1, :scope > h1'); if (h1) h1.textContent = 'Pokrok';
  if (head) head.after(tabs); else scr.prepend(tabs);
}
function dateLabel(iso) {
  const d = new Date(iso + 'T00:00:00');
  const days = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'];
  if (iso === calc.today()) return 'Dnes';
  if (iso === calc.addDays(calc.today(), -1)) return 'Včera';
  if (iso === calc.addDays(calc.today(), 1)) return 'Zajtra';
  return `${days[d.getDay()]} ${calc.fmtDate(iso)}`;
}
function datePicker(future = false) {
  return `<div class="row" style="gap:6px">
    <button class="btn icon ghost" data-day="-1">‹</button>
    <span class="date mono" style="min-width:90px;text-align:center">${dateLabel(state.date)}</span>
    <button class="btn icon ghost" data-day="1" ${!future && state.date >= calc.today() ? 'disabled' : ''}>›</button>
  </div>`;
}
function bindDatePicker(root, rerender) {
  root.querySelectorAll('[data-day]').forEach(b => b.onclick = () => { state.date = calc.addDays(state.date, Number(b.dataset.day)); rerender(); });
}

// ---------- router ----------
window.addEventListener('hashchange', route);
const DOC = document.documentElement;
let routeSeq = 0, snapTimer = null;
// profil si pamätáme v zariadení: appka nemusí pri štarte čakať na server, čerstvý sa načíta na pozadí
const PROF = uid => 'fw_prof_' + uid;
function cachedProfile(uid) { try { const p = JSON.parse(localStorage.getItem(PROF(uid)) || 'null'); return p?.id === uid ? p : null; } catch (_) { return null; } }
function saveProfile(p) { try { if (p?.id) localStorage.setItem(PROF(p.id), JSON.stringify(p)); } catch (_) { /* plné úložisko */ } }
async function loadProfile(uid) {
  const cached = cachedProfile(uid);
  const fresh = db.getProfile(uid).then(p => { if (p) { saveProfile(p); if (state.profile?.id === uid) Object.assign(state.profile, p); } return p; });
  if (cached) { fresh.catch(() => null); return cached; }
  return fresh;
}
// snímka obrazovky Dnes: pri ďalšom otvorení appky sa ukáže okamžite (index.html), kým sa načítajú čerstvé dáta
function saveSnap(my) {
  clearTimeout(snapTimer);
  snapTimer = setTimeout(() => {
    if (my !== routeSeq || curPath() !== '#/' || state.date !== calc.today() || document.querySelector('.sheet-bg')) return;
    try { localStorage.setItem('fw_snap', JSON.stringify({ d: calc.today(), u: state.profile?.id, h: $app.innerHTML })); } catch (_) { /* plné úložisko */ }
  }, 1800);
}
async function route() {
  const my = ++routeSeq;
  DOC.classList.add('fw-loading');
  try { await routeInner(my); }
  finally { if (my === routeSeq) DOC.classList.remove('fw-loading', 'fw-snap'); }
}
async function routeInner(my) {
  const hash = location.hash || '#/';
  let path = hash.split('?')[0];
  if (path !== state.curPath) { state.prevPath = state.curPath; state.curPath = path; }
  if (!state.session) return renderAuth();
  if (!state.profile) { const p = await loadProfile(state.session.user.id); if (my !== routeSeq) return; state.profile = p; }
  if (!state.profile?.onboarded && path !== '#/onboarding') { location.hash = '#/onboarding'; return; }
  const views = { '#/': td.renderToday, '#/pokrok': pg.renderProgress, '#/onboarding': renderOnboarding, '#/jedlo': fd.renderFood, '#/vaha': renderWeight, '#/checkin': renderCheckin, '#/kouc': v2.renderCoach, '#/profil': renderProfile,
    '#/fotky': () => v2.renderPhotos(), '#/trening': v2.renderTraining, '#/spravy': v2.renderMessages, '#/pripomienky': push.renderReminders, '#/report': rp.renderReport, '#/hodinky': hw.renderWatch, '#/tyzden': ck.renderWeekCheckin, '#/admin': ad.renderAdmin, '#/napis': ad.renderFeedback, '#/ciele': gl.renderGoals,
    '#/rezim': dtm.renderDiet, '#/cukor': gls.renderGlucose, '#/cukor-sprava': gls.renderGlucoseReport, '#/karta': crd.renderCards, '#/navyky': hb.renderHabits };
  let fn = views[path];
  const m = path.match(/^#\/kouc\/([^/]+)(\/fotky)?$/);
  if (m) fn = m[2] ? () => v2.renderPhotos(m[1], true) : () => v2.renderCoachDetail(m[1]);
  if (!fn) { fn = td.renderToday; if (path !== '#/') { history.replaceState(null, '', '#/'); path = '#/'; state.curPath = path; } }
  try {
    await fn();
    if (my !== routeSeq) return;
    if (path === '#/vaha' || path === '#/fotky') progressTabs(path);
  } catch (e) {
    if (my !== routeSeq || e?.message === STALE) return; // medzitým otvorená iná obrazovka
    console.error(e); toast(e.message, true);
    return;
  }
  window.scrollTo(0, 0);
  saveProfile(state.profile); // po zmene cieľov alebo údajov ostane v pamäti aktuálny profil
  if (path === '#/') saveSnap(my);
}

// ---------- auth ----------
function renderAuth(mode = 'login') {
  $app.innerHTML = `
  <div class="hero">
    <div class="tag">Fuelwind</div>
    <h1>Palivo pre telo.<br>Vietor v chrbte.</h1>
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
    <div class="brand mb"><span class="dot"></span> Fuelwind</div>
    <h1>Nastav si štart</h1>
    <p class="muted mb">Z týchto údajov ti appka vypočíta denný cieľ kalórií a makier. Všetko sa dá neskôr zmeniť v profile.</p>
    <form id="onb" class="card">
      <label class="field"><span>Meno</span><input class="input" name="name" required value="${h(p.name || '')}"></label>
      <div class="grid2">
        <label class="field"><span>Pohlavie</span><select class="input" name="sex" required>
          <option value="m" ${p.sex === 'm' ? 'selected' : ''}>Muž</option><option value="f" ${p.sex === 'f' ? 'selected' : ''}>Žena</option></select></label>
        <label class="field"><span>Rok narodenia</span><input class="input" type="number" inputmode="numeric" name="birth_year" required min="1930" max="${new Date().getFullYear() - 18}" placeholder="napr. 1998" value="${p.birth_year || ''}"></label>
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
      ${p.onboarded ? '' : '<label class="row small mb" style="gap:10px;align-items:flex-start"><input type="checkbox" name="adult" required style="margin-top:3px"> <span>Mám aspoň 18 rokov. Beriem na vedomie, že appka nenahrádza lekára ani výživového poradcu a používam ju na vlastnú zodpovednosť.</span></label>'}
      <button class="btn primary" type="submit">${p.onboarded ? 'Uložiť zmeny' : 'Uložiť a začať'}</button>
    </form>
  </div>`;
  const form = $app.querySelector('#onb');
  const preview = () => {
    const f = new FormData(form);
    const w = Number(f.get('weight')), hc = Number(f.get('height_cm'));
    if (!w || !hc || Number(f.get('birth_year')) < 1930) return;
    const t = calc.targets({ sex: f.get('sex'), weightKg: w, heightCm: hc, birthYear: f.get('birth_year'), activity: f.get('activity'), goal: f.get('goal') });
    const el = $app.querySelector('#preview'); el.style.display = 'block';
    el.innerHTML = `<b>${t.kcal} kcal / deň</b><span>Bielkoviny ${t.protein} g · Sacharidy ${t.carbs} g · Tuky ${t.fat} g · (bazálny metabolizmus ${t.bmr}, výdaj ${t.tdee})</span>`;
  };
  form.addEventListener('input', preview); preview();
  form.onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(form);
    const w = Number(f.get('weight')), hc = Number(f.get('height_cm'));
    if (new Date().getFullYear() - Number(f.get('birth_year')) < 18) { toast('Fuelwind je pre ľudí od 18 rokov.', true); return; }
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
    // vlastné ciele (Moje ciele) neprepíšeme, údaje sa len uložia
    const custom = state.profile?.targets_mode === 'custom';
    if (custom) { delete profile.target_kcal; delete profile.target_protein; delete profile.target_carbs; delete profile.target_fat; }
    try {
      state.profile = await db.upsertProfile(profile);
      await db.upsertWeight({ user_id: uid, date: calc.today(), weight_kg: w });
      toast(first ? 'Štart nastavený. Zapíš prvé jedlo.' : custom ? 'Uložené. Tvoje vlastné ciele ostali bez zmeny.' : 'Uložené, ciele sú prepočítané.');
      location.hash = '#/';
    } catch (err) { toast(err.message, true); }
  };
}

// ---------- dnes: today.js ----------

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
  const admin = await ad.isAdmin().catch(() => false);
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
      <p class="muted small mt">Cieľ: ${calc.GOAL[p.goal]?.label || '–'} · ${calc.ACTIVITY[p.activity]?.label || ''} · ${p.targets_mode === 'custom' ? 'vlastné makrá' : 'automatické makrá'}</p>
    </div>
    <a class="btn primary mb" href="#/ciele">🎯 Moje ciele: kalórie a makrá</a>
    <a class="btn mb" href="#/onboarding">Upraviť údaje (váha, výška, cieľ, aktivita)</a>
    <a class="btn mb" href="#/hodinky">⌚ Hodinky a Apple Zdravie</a>
    <a class="btn mb" href="#/pripomienky">Pripomienky a notifikácie</a>
    <a class="btn mb" href="#/spravy">Správy</a>
    <a class="btn mb" href="#/napis">💬 Napíš nám: problém alebo nápad</a>
    ${admin ? '<a class="btn mb" href="#/admin">📊 Admin prehľad</a>' : ''}
    <button class="btn danger" id="out">Odhlásiť sa</button>
    <p class="muted small center mt">Fuelwind · verzia ${ad.APP_VERSION} · ${new Date().getFullYear()}</p>
  </div>${nav('#/profil')}`;
  $app.querySelector('#out').onclick = async () => {
    try { localStorage.removeItem('fw_snap'); localStorage.removeItem(PROF(p.id)); } catch (_) { /* nič */ }
    await db.signOut(); state.profile = null; ad.resetAdmin();
  };
}

// ---------- ctx pre app2.js ----------
Object.assign(ctx, { $app, state, h, r0, toast, sheet, nav, datePicker, bindDatePicker, weightChart, MEALS });

// ---------- boot ----------
async function boot() {
  await db.ready;
  state.session = await db.getSession();
  db.onAuthChange(s => {
    const was = !!state.session; state.session = s;
    if (!s) { state.profile = null; try { localStorage.removeItem('fw_snap'); } catch (_) { /* nič */ } }
    if (!!s !== was) { if (s) location.hash = '#/'; route(); }
  });
  route();
}
boot();
