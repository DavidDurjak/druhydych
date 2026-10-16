// Druhý dych v0.2: nové obrazovky (fotky, tréning, kouč detail, správy, adaptívny cieľ)
import * as db from './data.js';
import { sb } from './data.js';
import * as calc from './calc.js';
import { contestPhase, peakProtocol, PEAK_RISK, generatePlan, nextDay, EXERCISES, LEVELS, EMPHASIS, MUSCLE_LABEL, MIN_DAYS, PRIORITY, SOURCES, alternatives } from './workouts.js';
import { ctx } from './app.js';
import * as rp from './report.js';
import { physiqueCardHtml, openPhysique } from './physique.js';

// ctx sa naplní až po načítaní app.js, preto lenivé gettery
const $app = () => ctx.$app;
const state = new Proxy({}, { get: (_, k) => ctx.state[k], set: (_, k, v) => { ctx.state[k] = v; return true; } });
const h = (...a) => ctx.h(...a), r0 = (...a) => ctx.r0(...a), toast = (...a) => ctx.toast(...a), sheet = (...a) => ctx.sheet(...a), nav = (...a) => ctx.nav(...a), datePicker = (...a) => ctx.datePicker(...a), bindDatePicker = (...a) => ctx.bindDatePicker(...a);

// ---------- FOTKY ----------
export async function renderPhotos(userId = state.profile.id, asCoach = false) {
  const photos = await db.listPhotos(userId);
  const urls = await db.photoUrls(photos.map(p => p.path));
  const byDate = {};
  photos.forEach(p => { byDate[p.date] = byDate[p.date] || {}; byDate[p.date][p.pose] = { ...p, url: urls[p.path] }; });
  const dates = Object.keys(byDate).sort();
  const first = dates[0], last = dates[dates.length - 1];
  const poses = { front: 'Spredu', side: 'Zboku', back: 'Zozadu' };
  let pose = 'front';
  const cmp = () => {
    if (dates.length < 2) return `<p class="empty">${dates.length ? 'Po druhej fotke sa tu objaví porovnanie pred/po.' : 'Zatiaľ žiadne fotky.'}</p>`;
    const a = byDate[first]?.[pose], b = byDate[last]?.[pose];
    if (!a || !b) return '<p class="empty">Pre túto pózu chýba fotka na začiatku alebo na konci.</p>';
    return `<div class="cmp" id="cmp"><img src="${b.url}" alt="po"><div class="cmp-a" id="cmpA"><img src="${a.url}" alt="pred"></div><div class="cmp-h" id="cmpH"><span></span></div>
      <div class="cmp-l">${calc.fmtDate(first)}</div><div class="cmp-r">${calc.fmtDate(last)}</div></div>
      <input type="range" id="cmpR" min="0" max="100" value="50" class="range">`;
  };
  $app().innerHTML = `<div class="screen">
    <div class="topbar"><h1>${asCoach ? 'Fotky' : 'Progres'}</h1>${asCoach ? `<a class="btn sm ghost" href="#/kouc/${userId}">← Späť</a>` : `<button class="btn sm primary" id="add">+ Fotka</button>`}</div>
    <div class="seg mb" id="poseSeg">${Object.entries(poses).map(([k, v]) => `<button data-pose="${k}" class="${k === pose ? 'on' : ''}">${v}</button>`).join('')}</div>
    <div class="card" id="cmpWrap">${cmp()}</div>
    <h3 class="mb">Časová os</h3>
    <div class="timeline" id="tl">${dates.length ? dates.slice().reverse().map(d => `<div class="tl-row"><div class="tl-date mono">${calc.fmtDate(d)}<span>${d.slice(0, 4)}</span></div><div class="tl-pics">${['front', 'side', 'back'].map(p => byDate[d][p] ? `<div class="tl-pic"><img src="${byDate[d][p].url}" loading="lazy">${asCoach ? '' : `<button class="tl-del" data-del="${byDate[d][p].id}">×</button>`}</div>` : '').join('')}</div></div>`).join('') : '<p class="empty">Odfoť sa raz týždenne, vždy v rovnakom svetle a oblečení. Najlepšie ráno.</p>'}</div>
  </div>${nav(asCoach ? '#/kouc' : '#/fotky')}`;
  const bindCmp = () => {
    const r = $app().querySelector('#cmpR'); if (!r) return;
    const A = $app().querySelector('#cmpA'), H = $app().querySelector('#cmpH');
    const set = v => { A.style.width = v + '%'; H.style.left = v + '%'; };
    r.oninput = () => set(r.value); set(50);
  };
  bindCmp();
  $app().querySelectorAll('[data-pose]').forEach(b => b.onclick = () => { pose = b.dataset.pose; $app().querySelectorAll('[data-pose]').forEach(x => x.classList.toggle('on', x === b)); $app().querySelector('#cmpWrap').innerHTML = cmp(); bindCmp(); });
  $app().querySelector('#add')?.addEventListener('click', () => openPhotoAdd(userId, () => renderPhotos(userId)));
  $app().querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { const row = photos.find(p => p.id === Number(b.dataset.del)); if (row && confirm('Zmazať fotku?')) { await db.deletePhoto(row); renderPhotos(userId); } });
}
function openPhotoAdd(userId, done) {
  const bg = sheet(`<h2 class="mb">Nová fotka</h2>
    <p class="muted small mb">Rovnaké miesto, svetlo a oblečenie ako minule. Fotka ostáva súkromná, vidí ju len kouč.</p>
    <label class="field"><span>Dátum</span><input class="input" type="date" id="pd" value="${state.date}" max="${calc.today()}"></label>
    <label class="field"><span>Póza</span><div class="seg" id="ps"><button type="button" data-p="front" class="on">Spredu</button><button type="button" data-p="side">Zboku</button><button type="button" data-p="back">Zozadu</button></div></label>
    <label class="btn primary" style="display:flex"><input type="file" id="pf" accept="image/*" capture="environment" style="display:none">Odfotiť / vybrať</label>
    <div id="pprev" class="mt"></div>
    <button class="btn primary mt" id="save" disabled>Uložiť</button>`);
  let pose = 'front', file = null;
  bg.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { pose = b.dataset.p; bg.querySelectorAll('[data-p]').forEach(x => x.classList.toggle('on', x === b)); });
  bg.querySelector('#pf').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    file = await shrink(f, 1280, 0.82);
    bg.querySelector('#pprev').innerHTML = `<img src="${URL.createObjectURL(file)}" style="width:100%;border-radius:12px;max-height:45vh;object-fit:contain;background:#000">`;
    bg.querySelector('#save').disabled = false;
  };
  bg.querySelector('#save').onclick = async () => {
    const btn = bg.querySelector('#save'); btn.disabled = true; btn.textContent = 'Nahrávam...';
    try { await db.uploadPhoto(userId, bg.querySelector('#pd').value, pose, file); bg.remove(); toast('Fotka uložená'); done(); }
    catch (err) { toast(err.message, true); btn.disabled = false; btn.textContent = 'Uložiť'; }
  };
}
// Zmenší fotku v prehliadači, aby upload nebol 5 MB
function shrink(file, max, q) {
  return new Promise(res => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(b => { URL.revokeObjectURL(url); res(new File([b], 'photo.jpg', { type: 'image/jpeg' })); }, 'image/jpeg', q);
    };
    img.onerror = () => res(file);
    img.src = url;
  });
}

// ---------- TRÉNING ----------
export async function renderTraining() {
  const p = state.profile, uid = p.id;
  const [plan, logs, lastKg] = await Promise.all([db.getPlan(uid), db.listWorkoutLogs(uid, calc.addDays(calc.today(), -60)), db.lastWeights(uid)]);
  if (!plan) return renderPlanSetup();
  await refreshPlan(plan, p);
  const ws = calc.weekStart();
  const weekDone = logs.filter(l => l.done && l.date >= ws).length;
  const todayLog = logs.find(l => l.date === state.date);
  const dayNo = todayLog ? todayLog.plan_day : nextDay(plan, logs);
  const day = plan.days[dayNo - 1];
  const have = todayLog?.sets?.length ? todayLog.sets : [];
  const sets = day.exercises.flatMap(e => { const mine = have.filter(s => s.ex === e.id); return mine.length ? mine : Array.from({ length: e.sets }, (_, i) => ({ ex: e.id, set: i + 1, kg: lastKg[e.id] || '', reps: '', done: false })); });
  const doneCount = sets.filter(s => s.done).length;

  $app().innerHTML = `<div class="screen">
    <div class="topbar"><div><h1>Tréning</h1><p class="muted small">${h(plan.name)}</p></div>${datePicker()}</div>
    <div class="grid3 mb">
      <div class="stat"><b class="mono">${weekDone}/${p.training_days || plan.days.length}</b><span>tento týždeň</span></div>
      <div class="stat"><b class="mono">${logs.filter(l => l.done).length}</b><span>tréningov spolu</span></div>
      <div class="stat"><b class="mono" id="setCount">${doneCount}/${sets.length}</b><span>sérií dnes</span></div>
    </div>
    ${planInfo(plan)}
    ${plan.meta?.v === 2 && plan.meta.params?.level !== 'beginner' ? physiqueCardHtml() : ''}
    ${plan.meta?.v === 2 && plan.meta.params?.level === 'elite' ? contestCard(plan) : ''}
    <div class="row between mb"><div class="seg" style="flex:1">${plan.days.map(d => `<button data-day="${d.day}" class="${d.day === dayNo ? 'on' : ''}">D${d.day}</button>`).join('')}</div></div>
    <div class="card ${todayLog?.done ? 'accent' : ''}">
      <div class="row between"><h2>${h(day.name)}</h2>${todayLog?.done ? '<span class="chip" style="background:#12332A;color:var(--accent)">Hotovo</span>' : ''}</div>
      <p class="muted small">${day.exercises.map(e => e.muscle).filter((v, i, a) => a.indexOf(v) === i).join(' · ')}</p>
    </div>
    ${day.exercises.map(e => `<div class="card ex">
      <div class="exh"><div class="exn"><h3>${h(e.name)}</h3>${exMeta(e, lastKg[e.id])}</div>${plan.meta?.v === 2 && e.id !== 'cardio' && e.reps ? `<button class="swapbtn" data-swap="${e.id}" aria-label="Vymeniť cvik" title="Vymeniť cvik">⇄</button>` : ''}</div>
      ${exCue(e)}
      ${e.reps ? '<div class="setsh"><span></span><span>kg</span><span>opakovania</span><span></span></div>' : ''}
      <div class="sets">${sets.filter(s => s.ex === e.id).map(s => `<div class="set ${s.done ? 'done' : ''}" data-ex="${e.id}" data-set="${s.set}">
        <span class="setno">${s.set}</span>
        ${e.reps ? `<input class="input sm" inputmode="decimal" placeholder="${e.startKg && !lastKg[e.id] ? e.startKg : 'kg'}" value="${s.kg ?? ''}" data-f="kg" aria-label="Váha v kg, séria ${s.set}"><input class="input sm" inputmode="numeric" placeholder="${h(e.reps)}" value="${s.reps ?? ''}" data-f="reps" aria-label="Opakovania, séria ${s.set}">` : `<span class="muted small" style="grid-column:2/4">${Math.round(e.seconds / 60)} min</span>`}
        <button class="chk" data-chk aria-label="Hotovo">✓</button></div>`).join('')}</div>
    </div>`).join('')}
    <div class="row" style="gap:8px"><button class="btn primary" id="finish">${todayLog?.done ? 'Uložiť zmeny' : 'Ukončiť tréning'}</button><button class="btn sm ghost" id="replan">Nový plán</button></div>
  </div>${nav('#/trening')}`;

  bindDatePicker($app(), renderTraining);
  $app().querySelectorAll('[data-day]').forEach(b => b.onclick = async () => {
    if (todayLog && todayLog.plan_day !== Number(b.dataset.day) && !confirm('Dnes už máš rozrobený iný deň. Prepnúť?')) return;
    await db.upsertWorkoutLog({ user_id: uid, date: state.date, plan_day: Number(b.dataset.day), day_name: plan.days[Number(b.dataset.day) - 1].name, sets: [], done: false });
    if (todayLog && todayLog.plan_day !== Number(b.dataset.day)) { /* starý záznam ostáva, nový deň má vlastný riadok */ }
    renderTraining();
  });
  const collect = () => sets.map(s => {
    const el = $app().querySelector(`.set[data-ex="${s.ex}"][data-set="${s.set}"]`);
    if (!el) return s;
    const kg = el.querySelector('[data-f=kg]')?.value, reps = el.querySelector('[data-f=reps]')?.value;
    return { ...s, kg: kg === '' || kg == null ? null : Number(kg), reps: reps === '' || reps == null ? null : Number(reps), done: el.classList.contains('done') };
  });
  let saveTimer = null;
  const autosave = (done = false) => { clearTimeout(saveTimer); saveTimer = setTimeout(() => db.upsertWorkoutLog({ user_id: uid, date: state.date, plan_day: dayNo, day_name: day.name, sets: collect(), done: done || !!todayLog?.done }).catch(e => toast(e.message, true)), 400); };
  $app().querySelectorAll('[data-chk]').forEach(b => b.onclick = () => { b.closest('.set').classList.toggle('done'); $app().querySelector('#setCount').textContent = `${$app().querySelectorAll('.set.done').length}/${sets.length}`; autosave(); });
  $app().querySelectorAll('.set input').forEach(i => i.oninput = () => autosave());
  $app().querySelector('#finish').onclick = async () => {
    clearTimeout(saveTimer);
    const s = collect();
    await db.upsertWorkoutLog({ user_id: uid, date: state.date, plan_day: dayNo, day_name: day.name, sets: s, done: true });
    toast(`Tréning hotový. ${s.filter(x => x.done).length} sérií.`); renderTraining();
  };
  $app().querySelector('#replan').onclick = () => renderPlanSetup();
  $app().querySelector('#contestDate')?.addEventListener('change', e => saveContest(plan, e.target.value));
  $app().querySelector('#contestClear')?.addEventListener('click', () => saveContest(plan, ''));
  const chks = [...$app().querySelectorAll('[data-peakchk]')], unlock = $app().querySelector('#peakUnlock');
  chks.forEach(c => c.addEventListener('change', () => { unlock.disabled = !chks.every(x => x.checked); }));
  unlock?.addEventListener('click', () => savePeakAck(plan, true));
  $app().querySelector('#peakLock')?.addEventListener('click', () => savePeakAck(plan, false));
  $app().querySelector('#physOpen')?.addEventListener('click', () => openPhysique({ profile: p, onApply: hint => renderPlanSetup({ hint }) }));
  const up = $app().querySelector('#upgradePlan'); if (up) up.onclick = () => renderPlanSetup();
  $app().querySelectorAll('[data-swap]').forEach(b => b.onclick = () => openSwap(plan, day.exercises.find(x => x.id === b.dataset.swap), todayLog));
  $app().querySelector('#deloadNow')?.addEventListener('click', () => forceWeek(plan, 'deload'));
  $app().querySelector('#skipDeload')?.addEventListener('click', () => forceWeek(plan, 'skip'));
}
// Súťažný režim (Elite): odpočet a fázy prípravy
function contestDays(date) { if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return null; return Math.round((new Date(date + 'T00:00:00') - new Date(calc.today() + 'T00:00:00')) / 86400000); }
function contestCard(plan) {
  const date = plan.meta.params?.contestDate || '', left = contestDays(date);
  if (left == null || left < -14) return `<div class="px-card"><b>🏆 Súťažný režim</b><p class="muted small">Zadaj dátum súťaže a appka ti bude ukazovať, čo robiť v ktorej fáze prípravy, vrátane posledného týždňa.</p><input class="input" type="date" id="contestDate" min="${calc.today()}" aria-label="Dátum súťaže"></div>`;
  const ph = contestPhase(left);
  return `<div class="px-card"><div class="row between"><b>🏆 ${h(ph.title)}</b><span class="chip" style="background:#12332A;color:var(--accent)">${left > 0 ? 'o ' + left + ' ' + (left === 1 ? 'deň' : left >= 2 && left <= 4 ? 'dni' : 'dní') : left === 0 ? 'dnes' : 'po súťaži'}</span></div>
    <ul class="small" style="margin:8px 0 0 18px;padding:0;line-height:1.5">${ph.items.map(t => `<li style="margin-bottom:6px">${h(t)}</li>`).join('')}</ul>
    <div class="row" style="gap:8px;margin-top:8px"><input class="input" type="date" id="contestDate" value="${h(date)}" aria-label="Dátum súťaže"><button class="btn sm ghost" id="contestClear">Zrušiť</button></div>
    ${left >= 0 && left <= 7 ? peakBlock(plan, left) : ''}
    <p class="muted small" style="margin:8px 0 0">Všeobecné odporúčania z výskumu, nie lekárska rada. Pri zdravotných problémoch a pred extrémnymi krokmi sa poraď s lekárom alebo trénerom.</p></div>`;
}
function peakBlock(plan, left) {
  const ack = plan.meta.params?.peakAck;
  if (!ack) return `<div class="px-caut" style="margin-top:10px"><b>Profi peak week (na vlastné riziko)</b>
    <p class="small" style="margin:6px 0 8px">Denný plán pre súťažiacich: sacharidové nabitie, voda a sodík. Pred odomknutím potvrď všetko nižšie.</p>
    ${PEAK_RISK.map((t, i) => `<label style="display:flex;gap:8px;align-items:flex-start;margin:0 0 8px;font-size:13px;line-height:1.4"><input type="checkbox" data-peakchk="${i}" style="margin-top:3px"><span>${h(t)}</span></label>`).join('')}
    <button class="btn sm primary" id="peakUnlock" disabled>Odomknúť profi peak week</button></div>`;
  const kg = plan.meta.params?.weightKg || state.profile.start_weight;
  const today = peakProtocol(left, kg), next = left > 0 ? peakProtocol(left - 1, kg) : null;
  const box = x => `<p class="small" style="margin:10px 0 4px"><b>${h(x.title)}</b></p><ul class="small" style="margin:0 0 0 18px;padding:0;line-height:1.5">${x.items.map(t => `<li style="margin-bottom:6px">${h(t)}</li>`).join('')}</ul>`;
  return `<div class="px-caut" style="margin-top:10px"><b>Profi peak week</b><p class="small" style="margin:4px 0 0">Dnes a zajtra podľa dátumu súťaže. Telesná hmotnosť pre výpočet: ${kg ? h(String(kg)) + ' kg' : 'nezadaná (uvedené v g a ml na kg)'}.</p>${box(today)}${next ? box(next) : ''}
    <p class="small" style="margin:10px 0 0;opacity:.85">Plán je nad rámec bežných odporúčaní a robíš ho na vlastné riziko. Diuretiká, laxatíva, lieky ani saunové vysúšanie v appke nenájdeš.</p>
    <button class="btn sm ghost" id="peakLock" style="margin-top:8px">Skryť profi plán</button></div>`;
}
async function savePeakAck(plan, on) {
  try {
    const m = plan.meta, meta = { ...m, params: { ...m.params, peakAck: on ? calc.today() : null } };
    const { error } = await sb.from('workout_plans').update({ meta }).eq('id', plan.id);
    if (error) throw new Error(error.message);
    plan.meta = meta; renderTraining();
  } catch (err) { toast(err.message || 'Nepodarilo sa uložiť', true); }
}
async function saveContest(plan, date) {
  try {
    const m = plan.meta, meta = { ...m, params: { ...m.params, contestDate: date || null } };
    const { error } = await sb.from('workout_plans').update({ meta }).eq('id', plan.id);
    if (error) throw new Error(error.message);
    plan.meta = meta; toast(date ? 'Dátum súťaže uložený' : 'Súťažný režim vypnutý'); renderTraining();
  } catch (err) { toast(err.message || 'Nepodarilo sa uložiť', true); }
}

// Výmena cviku: rovnaký sval, rovnaké vybavenie. Voľba sa pamätá v pláne.
async function regen(plan, patch, startedAt) {
  const m = plan.meta;
  const np = generatePlan({ ...m.params, block: m.block, week: m.week, ...patch });
  np.meta.startedAt = startedAt || m.startedAt || (plan.created_at || '').slice(0, 10) || calc.today();
  const { data: row, error } = await sb.from('workout_plans').update({ name: np.name, days: np.days, meta: np.meta }).eq('id', plan.id).select().single();
  if (error) throw new Error(error.message);
  Object.assign(plan, row);
}
function openSwap(plan, e, todayLog) {
  if (!e) return;
  const m = plan.meta, orig = e.orig || e.id;
  const alts = alternatives(e.id, m.params.equipment).filter(a => a.id !== e.id);
  const list = [...(e.id !== orig ? [{ id: orig, name: EXERCISES[orig]?.name || orig, cue: 'Pôvodný cvik z plánu', back: true }] : []), ...alts];
  const bg = sheet(`<div class="row between"><h2>Vymeniť cvik</h2><button class="del" data-x aria-label="Zavrieť">×</button></div>
    <p class="muted small mb">${h(e.name)}. Vyber cvik na rovnaký sval. Tvoja voľba ostane v pláne.</p>
    ${list.length ? list.map(a => `<button class="alt" data-alt="${a.id}"><b>${h(a.name)}</b><small>${h(a.cue || '')}</small></button>`).join('') : '<p class="empty">Pre tento cvik nie je alternatíva.</p>'}`);
  bg.querySelector('[data-x]').onclick = () => bg.remove();
  bg.querySelectorAll('[data-alt]').forEach(b => b.onclick = async () => {
    const nid = b.dataset.alt; b.disabled = true;
    try {
      const swaps = { ...(m.params.swaps || {}) };
      if (nid === orig) delete swaps[orig]; else swaps[orig] = nid;
      await regen(plan, { swaps });
      if (todayLog?.sets?.length) {
        const mapped = todayLog.sets.map(s => s.ex === e.id ? { ...s, ex: nid } : s);
        await db.upsertWorkoutLog({ user_id: state.profile.id, date: state.date, plan_day: todayLog.plan_day, day_name: todayLog.day_name, sets: mapped, done: !!todayLog.done });
      }
      bg.remove(); toast('Cvik vymenený'); renderTraining();
    } catch (err) { toast(err.message || 'Nepodarilo sa vymeniť', true); b.disabled = false; }
  });
}
// Deload hneď (si vyčerpaný) alebo vynechanie deloadu (cítiš sa sviežo)
async function forceWeek(plan, mode) {
  const m = plan.meta, mw = m.mesoWeeks;
  try {
    if (mode === 'deload') await regen(plan, { block: m.block, week: mw }, calc.addDays(calc.today(), -(mw - 1) * 7));
    else await regen(plan, { block: m.block + 1, week: 1 }, calc.today());
    toast(mode === 'deload' ? 'Deload zapnutý' : 'Nový blok začal'); renderTraining();
  } catch (err) { toast(err.message || 'Nepodarilo sa upraviť', true); }
}
const WEEKS_MS = 7 * 86400000;
function planWeek(plan) {
  const m = plan.meta; if (!m || m.v !== 2) return null;
  const start = new Date((m.startedAt || plan.created_at || '').slice(0, 10) + 'T00:00:00');
  if (isNaN(start)) return { week: m.week || 1, block: m.block || 0, rolled: false };
  const now = new Date(calc.today() + 'T00:00:00');
  const w = Math.floor((now - start) / WEEKS_MS) + 1;
  return { elapsed: Math.max(1, w) };
}
// Týždenne posúva sety a rezervu, po konci bloku založí nový blok s obmenenými pomocnými cvikmi
async function refreshPlan(plan, p) {
  try {
    const m = plan.meta; if (!m || m.v !== 2) return;
    const pw = planWeek(plan); if (!pw || !pw.elapsed) return;
    const mw = m.mesoWeeks || 6;
    let block = m.block || 0, startedAt = (m.startedAt || plan.created_at || '').slice(0, 10), el = pw.elapsed;
    while (el > mw) { block++; el -= mw; startedAt = calc.addDays(startedAt, mw * 7); }
    const week = Math.min(el, mw);
    if (block === m.block && week === m.week) return;
    const np = generatePlan({ ...m.params, birthYear: m.params.birthYear, block, week });
    np.meta.startedAt = startedAt;
    if (block !== m.block) np.meta.newBlock = true;
    const { data: row, error } = await sb.from('workout_plans').update({ name: np.name, days: np.days, meta: np.meta }).eq('id', plan.id).select().single();
    if (error) throw error;
    Object.assign(plan, row);
    if (block !== m.block) toast('Nový tréningový blok. Pomocné cviky sú obmenené.');
  } catch (_) { /* ostane aktuálny plán */ }
}
const RIR_TXT = r => r >= 4 ? 'veľmi ľahko, 4 opakovania v rezerve' : r === 3 ? '3 opakovania v rezerve' : r === 2 ? '2 opakovania v rezerve' : r === 1 ? '1 opakovanie v rezerve' : 'do zlyhania';
function planInfo(plan) {
  const m = plan.meta;
  if (!m || m.v !== 2) return `<div class="card" style="border-color:rgba(124,255,178,.35)"><p class="small">Toto je starší plán. Nový plán sa prispôsobí tvojej úrovni, cieľu a vybaveniu a týždenne sa vyvíja.</p><button class="btn sm primary" id="upgradePlan" style="margin-top:8px">Vytvoriť plán na mieru</button></div>`;
  const vol = m.volume || {};
  const rows = Object.keys(MUSCLE_LABEL).filter(k => vol[k]).map(k => `<div class="vrow"><span>${MUSCLE_LABEL[k]}</span><i><b style="width:${Math.min(100, vol[k] / 30 * 100)}%"></b></i><em>${vol[k]}</em></div>`).join('');
  return `<div class="card plan-info">
    <div class="row between"><b>Blok ${(m.block || 0) + 1} · týždeň ${m.week} z ${m.mesoWeeks}</b><span class="chip" style="${m.deload ? 'background:#3A2F12;color:#FFD27A' : 'background:#12332A;color:var(--accent)'}">${m.deload ? 'Deload' : LEVELS[m.params.level]?.label}</span></div>
    <p class="small" style="margin:6px 0 0">${m.deload ? 'Deload týždeň: polovica sérií, rovnaké váhy.' : `Tento týždeň ťahaj série na ${RIR_TXT(m.rir)}.`}</p>
    <details style="margin-top:8px"><summary class="small" style="cursor:pointer">Viac o pláne</summary>
      ${m.spec ? `<p class="small" style="margin:8px 0 0;color:var(--accent)">Špecializačný blok: ${(m.params.priority || []).map(k => PRIORITY[k]?.[0]).filter(Boolean).join(' a ')}</p>` : ''}
      <div class="row" style="gap:8px;margin-top:8px">${m.deload ? '<button class="btn sm ghost" id="skipDeload">Preskočiť deload</button>' : '<button class="btn sm ghost" id="deloadNow">Som vyčerpaný, deload teraz</button>'}</div>
      <p class="small" style="margin:10px 0 4px"><b>Prečo je plán takto zostavený</b></p>
      <ul class="small" style="margin:0 0 0 18px;padding:0;line-height:1.5">${(m.why || []).map(t => `<li>${h(t)}</li>`).join('')}</ul>
      <p class="small" style="margin:8px 0 4px"><b>Progresia</b><br>${h(m.progression || '')}</p>
      <p class="small" style="margin:8px 0 4px"><b>Rozcvička</b><br>${h(m.warmup || '')}</p>
      <p class="small" style="margin:8px 0 4px"><b>Pracovné série na sval za týždeň</b></p>${rows}
      <p class="small" style="margin:8px 0 4px"><b>Na čo sa plán opiera</b></p>
      <ul class="small" style="margin:0 0 0 18px;padding:0;line-height:1.45;opacity:.85">${SOURCES.map(t => `<li>${h(t)}</li>`).join('')}</ul>
    </details>
  </div>`;
}
function exMeta(e, last) {
  const vol = e.reps ? `${e.sets} × ${e.reps}` : `${e.sets} × ${Math.round(e.seconds / 60)} min`;
  const bits = [`<b>${vol}</b>`];
  if (e.id !== 'cardio' && e.rest) {
    if (e.rir != null) bits.push(`rezerva ${e.rir}`);
    bits.push(`pauza ${e.rest >= 120 ? Math.round(e.rest / 60 * 2) / 2 + ' min' : e.rest + ' s'}`);
    if (!last && e.startKg) bits.push(`začni okolo ${e.startKg} kg`);
  }
  return `<p class="exm">${bits.join(' · ')}</p>`;
}
const exCue = e => e.cue ? `<details class="excue"><summary>Ako na to</summary><p>${h(e.cue)}</p></details>` : '';
if (typeof document !== 'undefined') {
  const st = document.createElement('style');
  st.textContent = `.plan-info{margin-bottom:12px}.vrow{display:flex;align-items:center;gap:8px;font-size:12px;margin:3px 0}.vrow span{flex:0 0 96px;color:var(--muted)}.vrow i{flex:1;height:6px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden}.vrow i b{display:block;height:100%;background:var(--accent)}.vrow em{flex:0 0 28px;text-align:right;font-style:normal}.swapbtn{margin:0 0 8px;padding:6px 12px;border-radius:10px;border:1px solid var(--line);background:transparent;color:var(--muted);font:inherit;font-size:12.5px;cursor:pointer}.alt{display:block;width:100%;text-align:left;padding:12px 14px;margin-bottom:8px;border-radius:14px;border:1px solid var(--line);background:var(--card-2);color:var(--text);font:inherit;cursor:pointer}.alt b{display:block;font-size:14.5px}.alt small{display:block;color:var(--muted);font-size:12.5px;margin-top:2px;line-height:1.4}.chips{display:flex;flex-wrap:wrap;gap:8px}.chips button{padding:8px 12px;border-radius:999px;border:1px solid var(--line);background:var(--card-2);color:var(--text);font:inherit;font-size:13.5px;cursor:pointer}.chips button.on{border-color:var(--accent);background:rgba(124,255,178,.12)}.lvl{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}.lvl button{text-align:left;padding:12px 14px;border-radius:14px;border:1px solid var(--line);background:var(--card-2);color:var(--text);font:inherit;cursor:pointer}.lvl button.on{border-color:var(--accent);background:rgba(124,255,178,.10)}.lvl button b{display:block;font-size:15px}.lvl button small{display:block;color:var(--muted);font-size:12.5px;margin-top:2px;line-height:1.4}`;
  document.head.appendChild(st);
  const st2 = document.createElement('style');
  st2.textContent = `.ex .exh{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.ex .exn{min-width:0}.ex .exn h3{font-size:16px;line-height:1.25;margin:0}.ex .exm{margin:3px 0 0;color:var(--muted);font-size:13px;line-height:1.4}.ex .exm b{color:var(--accent);font-weight:700}.ex .swapbtn{flex:none;width:38px;height:38px;margin:0;padding:0;display:grid;place-items:center;border-radius:12px;font-size:17px;line-height:1}.ex .excue{margin:8px 0 0}.ex .excue summary{cursor:pointer;color:var(--muted);font-size:13px}.ex .excue p{margin:6px 0 0;color:var(--muted);font-size:13px;line-height:1.45}.ex .setsh,.ex .set{display:grid;grid-template-columns:30px 1fr 1fr 48px;gap:8px;align-items:center}.ex .setsh{margin-top:12px;color:var(--muted);font-size:11.5px;text-align:center}.ex .sets{margin-top:6px;gap:8px}.ex .input.sm{height:46px;padding:0 8px;font-size:17px;text-align:center}.ex .chk{width:48px;height:46px;border-radius:12px;font-size:16px}.pv h3{margin:0 0 8px}.pvr{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-top:1px solid var(--line);font-size:14px;line-height:1.35}.pvr:first-of-type{border-top:0}.pvr span{min-width:0}.pvr b{flex:none;color:var(--accent);font-weight:700;font-variant-numeric:tabular-nums}`;
  document.head.appendChild(st2);
}
const EMPH_HINT = { balanced: 'Rovnomerne celé telo.', upper: 'Viac sérií na hrudník, chrbát, ramená a ruky.', lower: 'Viac sérií na stehná, zadok a lýtka.' };
async function renderPlanSetup(opts = {}) {
  const p = state.profile;
  const old = await db.getPlan(p.id).catch(() => null);
  const op = old?.meta?.params || {};
  let level = op.level || 'beginner', equipment = op.equipment || 'gym';
  let days = Math.max(MIN_DAYS[level], Math.min(6, op.days || p.training_days || 3));
  let emphasis = op.emphasis || (p.sex === 'f' ? 'lower' : 'balanced');
  let priority = Array.isArray(op.priority) ? op.priority.slice(0, 2) : [];
  const fromPhys = !!opts.hint;
  if (fromPhys) { emphasis = opts.hint.emphasis; if (level === 'elite') priority = opts.hint.priority.slice(0, 2); }
  const preview = () => generatePlan({ contestDate: op.contestDate, peakAck: op.peakAck, block: fromPhys && level === 'elite' && priority.length ? 1 : 0, goal: p.goal, days, level, equipment, emphasis, priority, sex: p.sex, birthYear: p.birth_year, heightCm: p.height_cm, weightKg: p.start_weight });
  const volRows = vol => Object.keys(MUSCLE_LABEL).filter(k => vol[k]).map(k => `<div class="vrow"><span>${MUSCLE_LABEL[k]}</span><i><b style="width:${Math.min(100, vol[k] / 30 * 100)}%"></b></i><em>${vol[k]}</em></div>`).join('');
  const draw = () => {
    const pl = preview(), m = pl.meta;
    $app().querySelector('#planPrev').innerHTML = `<div class="card plan-info"><b>${h(m.split)}</b><p class="small" style="margin:6px 0 0">Blok trvá ${m.mesoWeeks} týždňov, potom sa pomocné cviky obmenia.${level === 'elite' ? ' Každý druhý blok je špecializačný na tvoje prioritné partie.' : ''}</p></div>` +
      pl.days.map(d => `<div class="card pv"><h3>${h(d.name)}</h3>${d.exercises.map(e => `<div class="pvr"><span>${h(e.name)}</span><b>${e.reps ? e.sets + ' × ' + e.reps : Math.round(e.seconds / 60) + ' min'}</b></div>`).join('')}</div>`).join('') +
      `<div class="card plan-info"><p class="small" style="margin:0 0 6px"><b>Pracovné série na sval za týždeň</b></p>${volRows(m.volume)}</div>`;
  };
  const seg = (id, items, cur) => `<div class="seg" id="${id}">${items.map(([k, t]) => `<button data-k="${k}" class="${String(k) === String(cur) ? 'on' : ''}">${t}</button>`).join('')}</div>`;
  const dayItems = () => [2, 3, 4, 5, 6].filter(n => n >= MIN_DAYS[level]).map(n => [n, n]);
  const lvlHtml = () => Object.entries(LEVELS).map(([k, v]) => `<button data-k="${k}" class="${k === level ? 'on' : ''}"><b>${v.label}</b><small>${v.desc}</small></button>`).join('');
  const prioHtml = () => `<span>Prioritné partie pre špecializačný blok (až 2)</span><div class="chips" id="prio">${Object.entries(PRIORITY).map(([k, v]) => `<button type="button" data-k="${k}" class="${priority.includes(k) ? 'on' : ''}">${v[0]}</button>`).join('')}</div>`;
  $app().innerHTML = `<div class="screen">
    <h1 class="mb">Tvoj plán</h1>
    <p class="muted mb">Skladá sa z tvojho cieľa (${calc.GOAL[p.goal]?.label || ''}), úrovne a počtu dní. Sám sa vyvíja a po bloku obmení cviky.</p>
    ${fromPhys ? `<div class="card plan-info"><p class="small" style="margin:0">Plán je nastavený podľa tvojej analýzy postavy: ${level === 'elite' && priority.length ? 'prioritné partie ' + priority.map(k => PRIORITY[k]?.[0].toLowerCase()).join(' a ') + ', plán začne špecializačným blokom' : 'dôraz ' + (EMPHASIS[emphasis] || '').toLowerCase()}. Môžeš to ešte upraviť.</p></div>` : ''}
    <div class="field"><span>Tvoja úroveň</span><div class="lvl" id="lvl">${lvlHtml()}</div></div>
    <div class="field"><span>Dní tréningu v týždni</span><div id="dwrap">${seg('dseg', dayItems(), days)}</div></div>
    <div class="field"><span>Kde cvičíš</span>${seg('eseg', [['gym', 'Posilňovňa'], ['home', 'Doma s jednoručkami']], equipment)}</div>
    <div class="field"><span>Na čo sa zamerať</span>${seg('mseg', Object.entries(EMPHASIS), emphasis)}<p class="muted small" id="mhint" style="margin:6px 2px 0">${EMPH_HINT[emphasis] || ''}</p></div>
    <div class="field" id="prioWrap" style="${level === 'elite' ? '' : 'display:none'}">${prioHtml()}</div>
    <div id="planPrev"></div>
    <button class="btn primary" id="save">Použiť tento plán</button>
  </div>${nav('#/trening')}`;
  draw();
  const root = () => $app();
  const bindDays = () => root().querySelectorAll('#dseg [data-k]').forEach(b => b.onclick = () => { days = Number(b.dataset.k); root().querySelectorAll('#dseg [data-k]').forEach(x => x.classList.toggle('on', x === b)); draw(); });
  const bindLvl = () => root().querySelectorAll('#lvl [data-k]').forEach(b => b.onclick = () => {
    level = b.dataset.k; days = Math.max(MIN_DAYS[level], days);
    root().querySelector('#lvl').innerHTML = lvlHtml(); bindLvl();
    root().querySelector('#dwrap').innerHTML = seg('dseg', dayItems(), days); bindDays();
    root().querySelector('#prioWrap').style.display = level === 'elite' ? '' : 'none';
    draw();
  });
  bindLvl(); bindDays();
  root().querySelectorAll('#eseg [data-k]').forEach(b => b.onclick = () => { equipment = b.dataset.k; root().querySelectorAll('#eseg [data-k]').forEach(x => x.classList.toggle('on', x === b)); draw(); });
  root().querySelectorAll('#mseg [data-k]').forEach(b => b.onclick = () => { emphasis = b.dataset.k; root().querySelector('#mhint').textContent = EMPH_HINT[emphasis] || ''; root().querySelectorAll('#mseg [data-k]').forEach(x => x.classList.toggle('on', x === b)); draw(); });
  root().querySelectorAll('#prio [data-k]').forEach(b => b.onclick = () => {
    const k = b.dataset.k;
    if (priority.includes(k)) priority = priority.filter(x => x !== k); else priority = [...priority, k].slice(-2);
    root().querySelectorAll('#prio [data-k]').forEach(x => x.classList.toggle('on', priority.includes(x.dataset.k)));
    draw();
  });
  root().querySelector('#save').onclick = async () => {
    const pl = preview(); pl.meta.startedAt = calc.today();
    const saved = await db.savePlan(p.id, pl);
    if (saved?.id) { const { error } = await sb.from('workout_plans').update({ meta: pl.meta }).eq('id', saved.id); if (error) throw new Error(error.message); }
    if (p.training_days !== days) state.profile = await db.upsertProfile({ id: p.id, training_days: days });
    toast('Plán uložený'); renderTraining();
  };
}

// ---------- ADAPTÍVNY CIEĽ (volá sa z Dnes) ----------
export async function checkAdaptive(p, weights) {
  if (p.role === 'coach' && !p.onboarded) return null;
  const ws = calc.weekStart();
  const hist = await db.listTargetHistory(p.id);
  if (hist.some(t => t.date >= ws)) return null; // tento týždeň už bolo
  const startPlus7 = calc.addDays(p.start_date || calc.today(), 7);
  if (calc.today() < startPlus7) return null; // prvý týždeň nič
  const from = calc.addDays(calc.today(), -7), to = calc.addDays(calc.today(), -1);
  const fd = await db.foodByDay(p.id, from, to);
  const days = Object.keys(fd).length;
  const avg = days ? Math.round(Object.values(fd).reduce((a, b) => a + b.kcal, 0) / days) : 0;
  const tr = calc.trend(weights.map(w => ({ date: w.date, weight: Number(w.weight_kg) })));
  const ch = calc.trendChange(tr, 7);
  const res = calc.adaptTarget({ goal: p.goal, sex: p.sex, currentTarget: p.target_kcal, avgIntake: avg, loggedDays: days, trendChange7: ch });
  if (!res) return null;
  return { ...res, avg, ch, days };
}
export async function applyAdaptive(p, res) {
  const kcal = res.newKcal;
  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((kcal - p.target_protein * 4 - fat * 9) / 4));
  state.profile = await db.applyTarget(p.id, { date: calc.today(), old_kcal: p.target_kcal, new_kcal: kcal, reason: res.reason, avg_intake: res.avg, trend_change: res.ch }, { target_kcal: kcal, target_carbs: carbs, target_fat: fat });
}

// ---------- SPRÁVY ----------
export async function renderMessages() {
  const uid = state.profile.id;
  const msgs = await db.listMessages(uid);
  const unread = msgs.filter(m => m.to_user === uid && !m.read_at).map(m => m.id);
  await db.markRead(unread);
  const coaches = state.profile.role === 'coach' ? [] : null;
  $app().innerHTML = `<div class="screen">
    <h1 class="mb">Správy od kouča</h1>
    ${state.profile.role !== 'coach' ? `<form id="mf" class="card"><textarea class="input" name="b" rows="2" placeholder="Napíš koučovi..."></textarea><button class="btn sm primary mt" type="submit">Odoslať</button></form>` : ''}
    ${msgs.length ? msgs.map(m => `<div class="card msg ${m.from_user === uid ? 'mine' : ''}"><p>${h(m.body)}</p><p class="muted small mt">${m.from_user === uid ? 'Ty' : 'Kouč'} · ${new Date(m.created_at).toLocaleString('sk-SK', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}</p></div>`).join('') : '<p class="empty">Zatiaľ žiadne správy.</p>'}
  </div>${nav('#/spravy')}`;
  $app().querySelector('#mf')?.addEventListener('submit', async e => {
    e.preventDefault(); const body = new FormData(e.target).get('b').trim(); if (!body) return;
    const { data } = await db.sb.from('profiles').select('id').eq('role', 'coach').limit(1);
    if (!data?.length) return toast('Kouč zatiaľ nie je nastavený', true);
    await db.sendMessage(uid, data[0].id, body); toast('Odoslané'); renderMessages();
  });
}

// ---------- KOUČ 2.0 ----------
export async function renderCoach() {
  if (state.profile.role !== 'coach') { location.hash = '#/'; return; }
  const from = calc.addDays(calc.today(), -6);
  $app().innerHTML = `<div class="screen"><h1>Kouč</h1><div class="spinner"></div></div>${nav('#/kouc')}`;
  const { profiles, weights, foods, checkins, wlogs, photos } = await db.coachOverview2(from);
  const people = profiles.filter(p => p.role !== 'coach' && p.onboarded).map(p => {
    const w = weights.filter(x => x.user_id === p.id);
    const tr = calc.trend(w.map(x => ({ date: x.date, weight: Number(x.weight_kg) })));
    const last = tr[tr.length - 1];
    const startW = Number(p.start_weight || w[0]?.weight_kg || 0);
    const fd = foods.filter(x => x.user_id === p.id);
    const daysLogged = new Set(fd.map(x => x.date)).size;
    const kcalByDay = {}; fd.forEach(x => kcalByDay[x.date] = (kcalByDay[x.date] || 0) + Number(x.kcal));
    const avg = daysLogged ? Object.values(kcalByDay).reduce((a, b) => a + b, 0) / daysLogged : 0;
    const lastFood = fd.length ? fd.map(x => x.date).sort().pop() : null;
    const ci = checkins.filter(x => x.user_id === p.id);
    const sleep = ci.filter(x => x.sleep_h).reduce((a, x, _, arr) => a + Number(x.sleep_h) / arr.length, 0);
    const trainings = wlogs.filter(x => x.user_id === p.id && x.done).length;
    const nPhotos = photos.filter(x => x.user_id === p.id).length;
    const ch7 = calc.trendChange(tr, 7);
    const daysSinceStart = Math.min(7, Math.max(1, Math.round((new Date(calc.today()) - new Date(p.start_date || calc.today())) / 86400000) + 1));
    let flag = 'ok', why = 'Ide podľa plánu';
    const staleDays = lastFood ? Math.round((new Date(calc.today()) - new Date(lastFood)) / 86400000) : 99;
    if (staleDays >= 3) { flag = 'bad'; why = `Nelogoval ${staleDays} dní`; }
    else if (daysLogged < daysSinceStart * 0.6) { flag = 'warn'; why = `Logoval len ${daysLogged}/7 dní`; }
    else if (p.goal === 'lose' && ch7 != null && ch7 >= 0 && tr.length > 10) { flag = 'warn'; why = 'Váha stagnuje'; }
    else if (p.target_kcal && avg > p.target_kcal * 1.15) { flag = 'warn'; why = `Priemer ${r0(avg)} kcal, cieľ ${p.target_kcal}`; }
    else if (p.training_days && trainings < Math.ceil(p.training_days * 0.5) && daysSinceStart >= 7) { flag = 'warn'; why = `Len ${trainings} tréningy z ${p.training_days}`; }
    return { p, last, startW, daysLogged, avg, sleep, trainings, nPhotos, ch7, flag, why };
  });
  const order = { bad: 0, warn: 1, ok: 2 };
  people.sort((a, b) => order[a.flag] - order[b.flag]);
  const reportsHtml = await rp.coachReportsHtml().catch(() => '');
  const totalLoss = people.reduce((a, x) => a + (x.last ? x.startW - x.last.trend : 0), 0);
  $app().innerHTML = `<div class="screen">
    <div class="topbar"><h1>Kouč</h1><button class="btn sm ghost" id="csv">Export CSV</button></div>
    <div class="grid3 mb">
      <div class="stat"><b class="mono">${people.length}</b><span>účastníkov</span></div>
      <div class="stat"><b class="mono">${people.filter(x => x.flag === 'ok').length}</b><span>v pohode</span></div>
      <div class="stat"><b class="mono ${totalLoss > 0 ? 'pos' : ''}">${totalLoss.toFixed(1)}</b><span>kg dole spolu</span></div>
    </div>
    ${reportsHtml}
    ${people.length ? people.map(x => `<a class="card link" href="#/kouc/${x.p.id}">
      <div class="row between"><div><h3><span class="flag ${x.flag}"></span>${h(x.p.name)}</h3><p class="muted small">${x.why}</p></div><div style="text-align:right"><b class="mono">${x.last ? x.last.trend.toFixed(1) : '–'} kg</b><p class="muted small mono">${x.last ? ((x.last.trend - x.startW) > 0 ? '+' : '') + (x.last.trend - x.startW).toFixed(1) + ' od štartu' : 'bez váženia'}</p></div></div>
      <div class="grid3 mt" style="gap:6px">
        <div class="stat" style="padding:8px"><b class="mono" style="font-size:15px">${x.daysLogged}/7</b><span>jedlo</span></div>
        <div class="stat" style="padding:8px"><b class="mono" style="font-size:15px">${x.trainings}/${x.p.training_days || '-'}</b><span>tréningy</span></div>
        <div class="stat" style="padding:8px"><b class="mono" style="font-size:15px">${x.avg ? r0(x.avg) : '–'}</b><span>Ø kcal / ${x.p.target_kcal}</span></div>
      </div>
    </a>`).join('') : '<div class="card"><p class="muted">Zatiaľ žiadni účastníci.</p></div>'}
  </div>${nav('#/kouc')}`;
  $app().querySelector('#csv').onclick = async () => {
    const csv = await db.exportCsv();
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `druhydych-${calc.today()}.csv`; a.click();
  };
}
export async function renderCoachDetail(userId) {
  if (state.profile.role !== 'coach') { location.hash = '#/'; return; }
  $app().innerHTML = `<div class="screen"><div class="spinner"></div></div>${nav('#/kouc')}`;
  const from = calc.addDays(calc.today(), -13);
  const { profile: p, weights, foods, checkins, photos, wlogs, targets } = await db.participantDetail(userId, from);
  const tr = calc.trend(weights.map(w => ({ date: w.date, weight: Number(w.weight_kg) })));
  const last = tr[tr.length - 1];
  const startW = Number(p.start_weight || weights[0]?.weight_kg || 0);
  const fd = {}; foods.forEach(f => { fd[f.date] = fd[f.date] || { kcal: 0, protein: 0, n: 0 }; fd[f.date].kcal += Number(f.kcal); fd[f.date].protein += Number(f.protein); fd[f.date].n++; });
  const days14 = Array.from({ length: 14 }, (_, i) => calc.addDays(calc.today(), i - 13));
  const notes = checkins.filter(c => c.note);
  const urls = await db.photoUrls(photos.slice(-3).map(x => x.path));
  $app().innerHTML = `<div class="screen">
    <div class="topbar"><div><h1>${h(p.name)}</h1><p class="muted small">${calc.GOAL[p.goal]?.label || ''} · cieľ ${p.target_kcal} kcal · ${p.training_days}× tréning</p></div><a class="btn sm ghost" href="#/kouc">←</a></div>
    <div class="grid3 mb">
      <div class="stat"><b class="mono">${last ? last.trend.toFixed(1) : '–'}</b><span>kg trend</span></div>
      <div class="stat"><b class="mono ${last && last.trend < startW ? 'pos' : ''}">${last ? ((last.trend - startW) > 0 ? '+' : '') + (last.trend - startW).toFixed(1) : '–'}</b><span>od štartu (${startW.toFixed(1)})</span></div>
      <div class="stat"><b class="mono">${wlogs.filter(w => w.done).length}</b><span>tréningov / 14 d</span></div>
    </div>
    <a class="rp-card" href="#/report?u=${userId}"><span class="rp-card-i">📊</span><div><h3>Týždenný report</h3><p>Skóre, rozpad bodov a zameranie na ďalší týždeň.</p></div><span class="rp-card-go">›</span></a>
    <div class="card">${ctx.weightChart(tr)}</div>
    <div class="card"><h3 class="mb">Posledných 14 dní</h3><div class="heat">${days14.map(d => { const f = fd[d]; const pct = f && p.target_kcal ? f.kcal / p.target_kcal : 0; const cls = !f ? 'none' : pct > 1.15 ? 'over' : pct < 0.7 ? 'under' : 'ok'; return `<div class="hd ${cls}" title="${d}"><span>${calc.fmtDate(d).split('.')[0]}</span><b>${f ? r0(f.kcal) : '–'}</b></div>`; }).join('')}</div><p class="muted small mt">zelená = cieľ splnený, oranžová = nad cieľ, modrá = pod 70 %, sivá = nelogoval</p></div>
    ${photos.length ? `<a class="card link" href="#/kouc/${userId}/fotky"><div class="row between"><h3>Fotky (${photos.length})</h3><span class="muted small">Otvoriť →</span></div><div class="row mt" style="gap:6px">${photos.slice(-3).map(x => `<img src="${urls[x.path]}" style="width:31%;aspect-ratio:3/4;object-fit:cover;border-radius:10px">`).join('')}</div></a>` : '<div class="card"><p class="muted small">Zatiaľ žiadne fotky.</p></div>'}
    ${targets.length ? `<div class="card"><h3 class="mb">Zmeny cieľa</h3>${targets.slice().reverse().map(t => `<div class="item"><div class="n"><b>${t.old_kcal} → ${t.new_kcal} kcal</b><span>${h(t.reason || '')}</span></div><span class="muted small mono">${calc.fmtDate(t.date)}</span></div>`).join('')}</div>` : ''}
    ${notes.length ? `<div class="card"><h3 class="mb">Poznámky z check-inov</h3>${notes.slice(0, 5).map(c => `<div class="item"><div class="n"><b>${calc.fmtDate(c.date)} · nálada ${c.mood ?? '–'}/5 · spánok ${c.sleep_h ?? '–'} h</b><span>${h(c.note)}</span></div></div>`).join('')}</div>` : ''}
    <form id="mf" class="card"><h3 class="mb">Správa pre ${h(p.name.split(' ')[0])}</h3><textarea class="input" name="b" rows="2" placeholder="Napr. Dobrá práca tento týždeň, skús pridať bielkoviny na raňajky."></textarea><button class="btn sm primary mt" type="submit">Odoslať</button></form>
  </div>${nav('#/kouc')}`;
  $app().querySelector('#mf').onsubmit = async e => {
    e.preventDefault(); const body = new FormData(e.target).get('b').trim(); if (!body) return;
    await db.sendMessage(state.profile.id, userId, body); toast('Odoslané'); e.target.reset();
  };
}
