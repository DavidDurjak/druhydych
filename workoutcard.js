// Tréningová karta na story (9:16): z odcvičeného dňa vyrobí obrázok s celkovým objemom, rekordmi, top cvikmi a sériou.
// Tlačidlo "Zdieľať tréning" sa objaví na obrazovke Tréning, keď je deň ukončený.
import * as db from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';
import { EXERCISES } from './workouts.js';
// kresba karty a anatomická mapa (~130 kB) sa načítajú až pri otvorení karty
let ART = null;
import { tr, currentLang } from './i18n.js';
import * as U from './units.js';

const W = 1080, H = 1920;
const BG = '#0B0E12';
const FONT = (w, s) => `${w} ${s}px Sora, "SF Pro Display", system-ui, -apple-system, "Segoe UI", sans-serif`;
const FLAME = 'M13.4 2.6c.3 2.6 2.1 3.9 3.5 5.9 1.5 2.1 2.1 4.2 1.6 6.4-.7 3.1-3.4 5.2-6.5 5.2-3.3 0-5.9-2.4-5.9-5.6 0-2 .9-3.5 2.2-4.8.2 1.1.8 1.9 1.7 2.3-.4-2.9.5-5.9 3.4-11.4z';
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
const nf = n => Math.round(n).toLocaleString('sk-SK').replace(/ /g, ' ');
const durFmt = m => m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${m} min`;
const kgs = n => U.fmtWt(n);
const exName = id => EXERCISES?.[id]?.name || id;
const e1rm = (kg, reps) => kg * (1 + Math.min(reps, 20) / 30);

export function calcStats(log, prior) {
  let done = (log.sets || []).filter(s => s.done);
  if (!done.length) done = (log.sets || []).filter(s => s.ex && (Number(s.reps) > 0 || Number(s.kg) > 0 || s.ex === 'cardio'));
  const byEx = new Map();
  let volume = 0, cardioSets = 0;
  for (const s of done) {
    if (s.ex === 'cardio') { cardioSets++; continue; }
    const kg = Number(s.kg) || 0, reps = Number(s.reps) || 0;
    const e = byEx.get(s.ex) || { id: s.ex, sets: 0, vol: 0, best: null };
    e.sets++;
    if (kg && reps) { e.vol += kg * reps; volume += kg * reps; if (!e.best || e1rm(kg, reps) > e1rm(e.best.kg, e.best.reps)) e.best = { kg, reps }; }
    else if (reps && !e.best) e.bw = Math.max(e.bw || 0, reps);
    byEx.set(s.ex, e);
  }
  // rekordy: najlepší odhad 1RM na cvik proti všetkému predtým
  const prev = {}; let prevMaxVol = 0;
  for (const l of prior) {
    let lv = 0;
    for (const s of (l.sets || [])) {
      if (!s.done || s.ex === 'cardio') continue;
      const kg = Number(s.kg) || 0, reps = Number(s.reps) || 0;
      if (kg && reps) { lv += kg * reps; prev[s.ex] = Math.max(prev[s.ex] || 0, e1rm(kg, reps)); }
    }
    prevMaxVol = Math.max(prevMaxVol, lv);
  }
  const prs = [];
  for (const e of byEx.values()) {
    if (e.best && prev[e.id] && e1rm(e.best.kg, e.best.reps) > prev[e.id] * 1.005) prs.push({ id: e.id, kg: e.best.kg, reps: e.best.reps, gain: e1rm(e.best.kg, e.best.reps) - prev[e.id] });
  }
  prs.sort((a, b) => b.gain - a.gain);
  const top = [...byEx.values()].filter(e => e.best || e.bw).sort((a, b) => b.vol - a.vol).slice(0, 4);
  return { all: [...byEx.values()], volume, sets: done.length - cardioSets, cardioSets, exCount: byEx.size, prs, top, volPr: prior.length > 0 && volume > prevMaxVol && prevMaxVol > 0 };
}

// ---------- karta: kresba je v cardart.js (anatomická postava muža alebo ženy so svietiacimi svalmi) ----------
const NUMW = n => ['', 'deň', 'dni', 'dni', 'dni'][n] || 'dní';
function cardData(d, sex) {
  const s = d.s, big = s.volume > 0, t0 = s.top[0], pr = s.prs[0];
  const stats = [];
  if (big) stats.push(['Objem', nf(U.toW(s.volume)), U.wUnit()]);
  if (d.dur) stats.push(['Čas', d.dur >= 60 ? `${Math.floor(d.dur / 60)}:${String(d.dur % 60).padStart(2, '0')}` : String(d.dur), d.dur >= 60 ? 'h' : 'min']);
  stats.push(['Série', String(s.sets), '']);
  if (stats.length < 3) stats.push(['Cviky', String(s.exCount), '']);
  let highlight = null;
  if (pr) highlight = { label: 'Osobný rekord', text: `${exName(pr.id)} · ${kgs(pr.kg)} ${U.wUnit()} × ${pr.reps}`, pr: true };
  else if (s.volPr) highlight = { label: 'Rekord', text: 'Najväčší objem v histórii', pr: true };
  else if (t0) highlight = { label: 'Najlepšia séria', text: t0.best ? `${exName(t0.id)} · ${kgs(t0.best.kg)} ${U.wUnit()} × ${t0.best.reps}` : `${exName(t0.id)} · ${t0.bw} opakovaní`, pr: false };
  return { title: d.dayName, dateLabel: d.dateLabel, stats: stats.slice(0, 3), load: d.load, sex, muscles: ART.topMuscles(d.load), highlight,
    streak: d.streak, streakText: `${d.streak} ${NUMW(d.streak)} v rade`, week: d.weekText };
}
export function draw(d, mode = 'dark', photo = null, sex = 'm') { return ART.drawCard(cardData(d, sex), mode, photo, t => tr(t) || t); }

async function build() {
  const st = ctx.state, uid = st.profile.id, date = st.date || calc.today();
  const from = calc.addDays(calc.today(), -400);
  const [logs, dates, plan] = await Promise.all([
    db.sb.from('workout_logs').select('date,day_name,sets,done,plan_day,duration_min').eq('user_id', uid).eq('done', true).gte('date', from).order('date', { ascending: false }).then(r => { if (r.error) throw r.error; return r.data || []; }),
    db.activityDates(uid, from).catch(() => []),
    db.getPlan(uid).catch(() => null),
  ]);
  const log = logs.find(l => l.date === date); if (!log) throw new Error('Tréning nie je ukončený');
  const prior = logs.filter(l => l.date < date);
  const s = calcStats(log, prior);
  // svaly: každá započítaná séria; keď nie je zapísaná žiadna, použijú sa cviky z plánu na tento deň
  let list = s.all.flatMap(e => Array(e.sets).fill({ ex: e.id }));
  if (!list.length) {
    const day = plan?.days?.find((x, i) => i === log.plan_day || x.name === log.day_name);
    list = (day?.exercises || []).flatMap(e => Array(Number(e.sets) || 1).fill({ ex: e.id }));
    if (!s.sets) { s.sets = list.length; s.exCount = new Set(list.map(x => x.ex)).size; }
  }
  const ws = calc.weekStart(date);
  const weekN = logs.filter(l => l.date >= ws && l.date <= calc.addDays(ws, 6)).length;
  const goal = st.profile.training_days || plan?.days?.length || 0;
  const dt = new Date(date + 'T00:00:00');
  const lang = currentLang();
  return {
    s, dur: Number(log.duration_min) || 0, load: ART.loadFrom(list, EXERCISES), dayName: log.day_name || 'Tréning', name: (st.profile.name || '').split(' ')[0],
    dateLabel: dt.toLocaleDateString(lang === 'sk' ? 'sk-SK' : lang, { day: 'numeric', month: 'long' }),
    weekText: goal ? `Tréning ${Math.min(weekN, 99)} z ${goal} tento týždeň` : '',
    streak: calc.streak ? calc.streak(dates) : 0,
    sex: st.profile.sex === 'f' ? 'f' : 'm',
  };
}

async function loadPhoto(file) {
  try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (_) { /* starší prehliadač */ }
  return await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
}
async function open() {
  let d;
  try { ART ||= await import('./cardart.js'); d = await build(); } catch (e) { ctx.toast(e.message || 'Karta sa nepodarila', true); return; }
  try { await Promise.race([document.fonts.load('800 80px Sora'), new Promise(r => setTimeout(r, 1200))]); } catch (_) { /* náhradné písmo */ }
  let sex = d.sex; try { sex = localStorage.getItem('fw_card_sex') || d.sex; } catch (_) { /* nič */ }
  let mode = 'dark', photo = null, cv = null, url = '';
  const bg = ctx.sheet(`<div class="row between"><h3>Karta tréningu</h3><button class="del" data-x aria-label="Zavrieť">×</button></div>
    <div class="wc-pv"><img alt="Náhľad karty tréningu"></div>
    <div class="wc-opts">
      <div class="wc-seg" role="group" aria-label="Pozadie"><button data-m="dark">Tmavá</button><button data-m="foto">Moja fotka</button><button data-m="clear">Nálepka</button></div>
      <div class="wc-seg wc-sex" role="group" aria-label="Postava"><button data-s="m">Muž</button><button data-s="f">Žena</button></div>
    </div>
    <p class="muted small wc-hint"></p>
    <input type="file" accept="image/*" id="wcFile" hidden>
    <div class="row mt" style="gap:8px"><button class="btn" id="wcSave" style="flex:1">Uložiť</button><button class="btn primary" id="wcShare" style="flex:1.4">${navigator.canShare ? 'Zdieľať na story' : 'Stiahnuť'}</button></div>`);
  const img = bg.querySelector('img'), hint = bg.querySelector('.wc-hint'), file = bg.querySelector('#wcFile');
  const HINT = { foto: 'Najlepšie vyzerá fotka z posilňovne. Ťukni na Moja fotka znova a vymeníš ju.', dark: 'Hotová karta, stačí zdieľať.', clear: 'Priehľadná nálepka. V Instagrame ju prilepíš na svoju fotku alebo video.' };
  const redraw = () => {
    cv = draw(d, mode, photo, sex); hint.textContent = HINT[mode];
    cv.toBlob(b => { if (!b) return; if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(b); img.src = url; }, 'image/png');
    bg.querySelectorAll('[data-m]').forEach(b => b.classList.toggle('on', b.dataset.m === mode));
    bg.querySelectorAll('[data-s]').forEach(b => b.classList.toggle('on', b.dataset.s === sex));
    bg.querySelector('.wc-pv').classList.toggle('clr', mode === 'clear');
  };
  bg.querySelector('[data-x]').onclick = () => bg.remove();
  bg.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
    if (b.dataset.m === 'foto' && (!photo || mode === 'foto')) { file.click(); return; }
    mode = b.dataset.m; redraw();
  });
  bg.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { sex = b.dataset.s; try { localStorage.setItem('fw_card_sex', sex); } catch (_) { /* nič */ } redraw(); });
  file.onchange = async () => {
    const f = file.files?.[0]; if (!f) return;
    try { photo = await loadPhoto(f); mode = 'foto'; redraw(); } catch (_) { ctx.toast('Fotku sa nepodarilo načítať', true); }
    file.value = '';
  };
  const blob = () => new Promise(r => cv.toBlob(r, 'image/png'));
  const save = async () => { const b = await blob(), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'fuelwind-trening.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  bg.querySelector('#wcSave').onclick = save;
  bg.querySelector('#wcShare').onclick = async () => {
    try {
      const b = await blob(), f = new File([b], 'fuelwind-trening.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f], title: 'Fuelwind' });
      else await save();
    } catch (e) { if (e?.name !== 'AbortError') ctx.toast('Nepodarilo sa zdieľať', true); }
  };
  redraw();
}

const CSS = `.wc-btn{width:100%;margin:2px 0 10px;border:0;border-radius:18px;padding:15px;font:inherit;font-weight:800;font-size:16px;color:#05261a;background:linear-gradient(180deg,#9DFFC8,#3FD5C4);cursor:pointer;box-shadow:0 8px 26px rgba(63,213,196,.30)}.wc-btn:active{transform:scale(.98)}
.wc-pv{margin-top:10px;border-radius:20px;overflow:hidden;background:#05070A;line-height:0;box-shadow:0 10px 40px rgba(0,0,0,.45)}.wc-pv img{width:100%;max-height:54vh;object-fit:contain;display:block;margin:0 auto;aspect-ratio:9/16}
.wc-pv.clr{background:repeating-conic-gradient(#3a3f47 0 25%,#2b2f35 0 50%) 0 0/24px 24px}
.wc-opts{display:flex;gap:8px;margin-top:12px}.wc-seg{display:flex;gap:4px;padding:4px;border-radius:16px;background:rgba(255,255,255,.06);flex:1}.wc-sex{flex:0 0 auto}
.wc-seg button{flex:1;text-align:center;border:0;background:none;color:var(--muted,#9aa6b2);font:inherit;font-weight:700;font-size:13.5px;padding:9px 10px;border-radius:12px;cursor:pointer;white-space:nowrap}
.wc-seg button.on{background:rgba(124,255,178,.16);color:#CFFFE3;box-shadow:inset 0 0 0 1px rgba(124,255,178,.45)}
.wc-hint{margin-top:8px;min-height:1.4em}`;
const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
const root = document.getElementById('app');
function enhance() {
  const fin = root?.querySelector('#finish'); if (!fin || root.querySelector('#shareW')) return;
  const sc = fin.closest('.screen'); if (!sc || !sc.querySelector('.card.accent .chip')) return; // len ukončený deň
  const b = document.createElement('button'); b.id = 'shareW'; b.className = 'wc-btn'; b.textContent = 'Zdieľať tréning na story';
  b.onclick = open;
  fin.parentElement.before(b);
}
if (root) { new MutationObserver(enhance).observe(root, { childList: true, subtree: true }); enhance(); }
export { open as openWorkoutCard };
