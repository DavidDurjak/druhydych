// Tréningová karta na story (9:16): z odcvičeného dňa vyrobí obrázok s celkovým objemom, rekordmi, top cvikmi a sériou.
// Tlačidlo "Zdieľať tréning" sa objaví na obrazovke Tréning, keď je deň ukončený.
import * as db from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';
import { EXERCISES } from './workouts.js';

const W = 1080, H = 1920;
const BG = '#0B0E12';
const FONT = (w, s) => `${w} ${s}px Sora, "SF Pro Display", system-ui, -apple-system, "Segoe UI", sans-serif`;
const FLAME = 'M13.4 2.6c.3 2.6 2.1 3.9 3.5 5.9 1.5 2.1 2.1 4.2 1.6 6.4-.7 3.1-3.4 5.2-6.5 5.2-3.3 0-5.9-2.4-5.9-5.6 0-2 .9-3.5 2.2-4.8.2 1.1.8 1.9 1.7 2.3-.4-2.9.5-5.9 3.4-11.4z';
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
const nf = n => Math.round(n).toLocaleString('sk-SK').replace(/ /g, ' ');
const kgs = n => String(Math.round(n * 10) / 10).replace('.', ',');
const exName = id => EXERCISES?.[id]?.name || id;
const e1rm = (kg, reps) => kg * (1 + Math.min(reps, 20) / 30);

export function calcStats(log, prior) {
  const done = (log.sets || []).filter(s => s.done);
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

// ---------- postava so svietiacimi svalmi: unikátny tvar každého tréningu (ako trasa na Strave) ----------
const E = (x, y, rx, ry, rot = 0) => ({ e: [x, y, rx, ry, rot] });
const FIG = {
  sil: [E(100, 31, 16, 19), E(100, 53, 8, 9), E(100, 112, 38, 50), E(100, 190, 25, 18), E(52, 102, 11, 30, .12), E(148, 102, 11, 30, -.12), E(45, 154, 9, 27, .08), E(155, 154, 9, 27, -.08), E(41, 188, 7, 10), E(159, 188, 7, 10),
    E(84, 242, 19, 54, .03), E(116, 242, 19, 54, -.03), E(82, 340, 13, 46), E(118, 340, 13, 46), E(80, 397, 12, 7), E(120, 397, 12, 7)],
  front: {
    delt: [E(60, 78, 13, 13), E(140, 78, 13, 13)], chest: [E(84, 98, 19, 16, -.2), E(116, 98, 19, 16, .2)], biceps: [E(51, 106, 8, 20, .12), E(149, 106, 8, 20, -.12)],
    abs: [E(100, 146, 13, 33)], quads: [E(84, 242, 16, 47), E(116, 242, 16, 47)], calves: [E(82, 340, 10, 38), E(118, 340, 10, 38)],
  },
  back: {
    back: [E(100, 78, 20, 14), E(80, 118, 14, 30, .25), E(120, 118, 14, 30, -.25)], rdelt: [E(60, 78, 13, 13), E(140, 78, 13, 13)], triceps: [E(51, 106, 8, 20, .12), E(149, 106, 8, 20, -.12)],
    glutes: [E(86, 204, 17, 15), E(114, 204, 17, 15)], hams: [E(84, 247, 15, 44), E(116, 247, 15, 44)], calves: [E(82, 340, 11, 38), E(118, 340, 11, 38)],
  },
};
// cvik -> svalové skupiny (váha)
const MUS = { 'hrudník': { chest: 1, delt: .35, triceps: .3 }, 'ramená': { delt: 1, rdelt: .5 }, 'zadné ramená': { rdelt: 1 }, 'chrbát': { back: 1, biceps: .35, rdelt: .3 }, 'biceps': { biceps: 1 }, 'triceps': { triceps: 1 }, 'core': { abs: 1 },
  'nohy': { quads: 1, glutes: .5 }, 'kvadricepsy': { quads: 1 }, 'zadný reťazec': { hams: 1, glutes: .7, back: .4 }, 'hamstringy': { hams: 1 }, 'zadok': { glutes: 1, hams: .3 }, 'lýtka': { calves: 1 } };
export function muscleLoad(top) {
  const m = {};
  for (const e of top) { const w = MUS[EXERCISES?.[e.id]?.muscle]; if (!w) continue; for (const k in w) m[k] = (m[k] || 0) + e.sets * w[k]; }
  const mx = Math.max(0, ...Object.values(m));
  const out = {}; if (mx) for (const k in m) out[k] = m[k] / mx;
  return out;
}
function path(c, list, ox, oy, sc) {
  list.forEach(({ e: [x, y, rx, ry, rot] }) => { c.beginPath(); c.ellipse(ox + x * sc, oy + y * sc, rx * sc, ry * sc, rot, 0, Math.PI * 2); c.fill(); });
}
const TORSO = [[62, 68], [138, 68], [135, 120], [125, 150], [119, 192], [81, 192], [75, 150], [65, 120]];
function silhouette(c, ox, oy, sc, alpha) {
  const t = document.createElement('canvas'); t.width = W; t.height = H;
  const x = t.getContext('2d'); x.fillStyle = x.strokeStyle = '#fff'; x.lineJoin = 'round'; x.lineWidth = 12 * sc;
  x.beginPath(); TORSO.forEach(([a, b], i) => i ? x.lineTo(ox + a * sc, oy + b * sc) : x.moveTo(ox + a * sc, oy + b * sc)); x.closePath(); x.fill(); x.stroke();
  path(x, FIG.sil.filter(o => o.e[3] !== 50), ox, oy, sc);
  c.save(); c.globalAlpha = alpha; c.drawImage(t, 0, 0); c.restore();
}
function figure(c, ox, oy, sc, side, load, sticker) {
  c.save();
  silhouette(c, ox, oy, sc, sticker ? .26 : .15);
  const parts = FIG[side];
  for (const k in parts) {
    const v = load[k] || 0;
    if (!v) { c.fillStyle = 'rgba(255,255,255,.07)'; path(c, parts[k], ox, oy, sc); continue; }
    const t = .5 + .5 * v;
    c.shadowColor = `rgba(255,120,30,${.9 * v})`; c.shadowBlur = 44 * v + 10;
    c.fillStyle = v > .7 ? `rgba(255,196,90,${t})` : `rgba(255,118,38,${t})`;
    path(c, parts[k], ox, oy, sc); c.shadowBlur = 0;
  }
  c.restore();
}

// štýly: 'foto' (tvoja fotka), 'dark' (tmavé pozadie), 'clear' (priehQadné PNG na nalepenie do story)
export function draw(d, mode = 'dark', photo = null) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const sticker = mode === 'clear';
  if (!sticker) {
    c.fillStyle = BG; c.fillRect(0, 0, W, H);
    if (mode === 'foto' && photo) {
      const iw = photo.width, ih = photo.height, k = Math.max(W / iw, H / ih), w = iw * k, h = ih * k;
      c.drawImage(photo, (W - w) / 2, (H - h) / 2, w, h);
      const sc = c.createLinearGradient(0, 0, 0, H);
      sc.addColorStop(0, 'rgba(0,0,0,.50)'); sc.addColorStop(.3, 'rgba(0,0,0,.22)'); sc.addColorStop(.62, 'rgba(0,0,0,.30)'); sc.addColorStop(1, 'rgba(0,0,0,.72)');
      c.fillStyle = sc; c.fillRect(0, 0, W, H);
    } else {
      const g = c.createRadialGradient(W / 2, 1180, 60, W / 2, 1180, 900);
      g.addColorStop(0, 'rgba(255,110,30,.30)'); g.addColorStop(.55, 'rgba(255,90,30,.08)'); g.addColorStop(1, 'rgba(11,14,18,0)');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
  }
  const shadow = on => { c.shadowColor = on ? 'rgba(0,0,0,.55)' : 'transparent'; c.shadowBlur = on ? 22 : 0; c.shadowOffsetY = on ? 3 : 0; };
  c.textAlign = 'center'; shadow(true);
  // štatistiky ako na Strave: malý popis, veľké číslo
  const big = d.s.volume > 0, t0 = d.s.top[0];
  c.font = FONT(600, 40);
  const stats = [
    [big ? 'Objem' : 'Série', big ? `${nf(d.s.volume)} kg` : String(d.s.sets)],
    [big ? 'Série' : 'Cviky', big ? String(d.s.sets) : String(d.s.exCount)],
  ];
  if (t0) stats.push([fit(c, exName(t0.id), 760), t0.best ? `${kgs(t0.best.kg)} kg × ${t0.best.reps}` : `${t0.bw} op.`]);
  let y = 300;
  stats.forEach(([l, v]) => {
    c.fillStyle = 'rgba(255,255,255,.92)'; c.font = FONT(600, 40); c.fillText(l, W / 2, y);
    c.fillStyle = '#fff'; c.font = FONT(800, 104); let fs = 104; while (c.measureText(v).width > W - 160 && fs > 60) { fs -= 6; c.font = FONT(800, fs); }
    c.fillText(v, W / 2, y + 104); y += 200;
  });
  // rekord
  const pr = d.s.prs[0];
  if (pr || d.s.volPr) {
    shadow(false); c.font = FONT(800, 34);
    const t = pr ? `Nový rekord · ${fit(c, exName(pr.id), 600)}` : 'Najväčší objem v histórii'; const bw = Math.min(W - 80, c.measureText(t).width + 72), bx = W / 2 - bw / 2;
    rr(c, bx, y - 20, bw, 78, 39); c.fillStyle = 'rgba(255,200,87,.92)'; c.fill();
    c.fillStyle = '#2a1a00'; c.fillText(t, W / 2, y + 30); shadow(true);
  }
  // postava
  const sc = 1.5, fw = 200 * sc, gap = 30, ox = (W - (fw * 2 + gap)) / 2, oy = 1020;
  shadow(false);
  figure(c, ox, oy, sc, 'front', d.load, sticker); figure(c, ox + fw + gap, oy, sc, 'back', d.load, sticker);
  // pätička
  shadow(true);
  c.save(); c.translate(W / 2 - 168, 1778); c.scale(2.3, 2.3);
  c.fillStyle = 'rgba(255,255,255,.25)'; c.strokeStyle = '#fff'; c.lineWidth = 1.8; c.lineJoin = 'round';
  const p = new Path2D(FLAME); c.fill(p); c.stroke(p); c.restore();
  c.textAlign = 'left'; c.fillStyle = '#fff'; c.font = FONT(800, 52); c.fillText('Fuelwind', W / 2 - 108, 1826);
  c.textAlign = 'center'; c.fillStyle = 'rgba(255,255,255,.85)'; c.font = FONT(600, 30);
  c.fillText(`${d.dateLabel}${d.streak > 0 ? `  ·  ${d.streak} ${d.streak === 1 ? 'deň' : d.streak < 5 ? 'dni' : 'dní'} v rade` : ''}`, W / 2, 1878);
  shadow(false);
  return cv;
}
function fit(c, text, max) {
  if (c.measureText(text).width <= max) return text;
  let t = text; while (t.length > 3 && c.measureText(t + '…').width > max) t = t.slice(0, -1);
  return t.trimEnd() + '…';
}

async function build() {
  const st = ctx.state, uid = st.profile.id, date = st.date || calc.today();
  const from = calc.addDays(calc.today(), -400);
  const [logs, dates, plan] = await Promise.all([
    db.sb.from('workout_logs').select('date,day_name,sets,done,plan_day').eq('user_id', uid).eq('done', true).gte('date', from).order('date', { ascending: false }).then(r => { if (r.error) throw r.error; return r.data || []; }),
    db.activityDates(uid, from).catch(() => []),
    db.getPlan(uid).catch(() => null),
  ]);
  const log = logs.find(l => l.date === date); if (!log) throw new Error('Tréning nie je ukončený');
  const prior = logs.filter(l => l.date < date);
  const s = calcStats(log, prior);
  const ws = calc.weekStart(date);
  const weekN = logs.filter(l => l.date >= ws && l.date <= calc.addDays(ws, 6)).length;
  const goal = st.profile.training_days || plan?.days?.length || 0;
  const dt = new Date(date + 'T00:00:00');
  return {
    s, load: muscleLoad(s.all), dayName: log.day_name || 'Tréning', name: (st.profile.name || '').split(' ')[0],
    dateLabel: dt.toLocaleDateString('sk-SK', { day: 'numeric', month: 'long' }),
    week: goal ? `${weekN}/${goal}` : String(weekN),
    streak: calc.streak ? calc.streak(dates) : 0,
  };
}

async function loadPhoto(file) {
  try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (_) { /* starší prehliadač */ }
  return await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
}
async function open() {
  let d;
  try { d = await build(); } catch (e) { ctx.toast(e.message || 'Karta sa nepodarila', true); return; }
  try { await Promise.race([document.fonts.load('800 80px Sora'), new Promise(r => setTimeout(r, 1200))]); } catch (_) { /* náhradné písmo */ }
  let mode = 'dark', photo = null, cv = draw(d, mode, photo);
  const bg = ctx.sheet(`<div class="row between"><h3>Karta tréningu</h3><button class="del" data-x aria-label="Zavrieť">×</button></div>
    <div class="wc-pv"><img alt="Náhľad karty tréningu"></div>
    <div class="wc-seg"><button data-m="foto">Moja fotka</button><button data-m="dark" class="on">Tmavá</button><button data-m="clear">Prieh'ľadňá</button></div>
    <p class="muted small wc-hint"></p>
    <input type="file" accept="image/*" id="wcFile" hidden>
    <div class="row mt" style="gap:8px"><button class="btn" id="wcSave" style="flex:1">Uložiť</button><button class="btn primary" id="wcShare" style="flex:1">${navigator.canShare ? 'Zdieľať na story' : 'Stiahnuť'}</button></div>`);
  const img = bg.querySelector('img'), hint = bg.querySelector('.wc-hint'), file = bg.querySelector('#wcFile');
  const HINT = { foto: 'Fotka z posilňovne dá najlepší výsledok. Ťukni na "Moja fotka" znova a vymeníš ju.', dark: 'Hotová karta bez fotky.', clear: 'PNG bez pozadia. V Instagrame ho nalepíš na vlastnú fotku alebo video ako nálepku.' };
  const redraw = () => {
    cv = draw(d, mode, photo); img.src = cv.toDataURL('image/png'); hint.textContent = HINT[mode];
    bg.querySelectorAll('[data-m]').forEach(b => b.classList.toggle('on', b.dataset.m === mode));
    bg.querySelector('.wc-pv').classList.toggle('clr', mode === 'clear');
  };
  bg.querySelector('[data-x]').onclick = () => bg.remove();
  bg.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
    if (b.dataset.m === 'foto' && (!photo || mode === 'foto')) { file.click(); return; }
    mode = b.dataset.m; redraw();
  });
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

const CSS = `.wc-btn{width:100%;margin:2px 0 10px;border:0;border-radius:18px;padding:15px;font:inherit;font-weight:800;font-size:16px;color:#2a1200;background:linear-gradient(180deg,#FFD58A,#FF9D3D);cursor:pointer;box-shadow:0 6px 22px rgba(255,138,31,.28)}.wc-btn:active{transform:scale(.98)}.wc-pv{margin-top:10px;border-radius:18px;overflow:hidden;background:#0B0E12;line-height:0}.wc-pv img{width:100%;max-height:56vh;object-fit:contain;display:block;margin:0 auto}.wc-pv.clr{background:repeating-conic-gradient(#3a3f47 0 25%,#2b2f35 0 50%) 0 0/24px 24px}.wc-seg{display:flex;gap:6px;margin-top:10px}.wc-seg button{flex:1;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#fff;font:inherit;font-weight:700;font-size:14px;padding:10px 4px;border-radius:14px;cursor:pointer}.wc-seg button.on{background:rgba(255,138,31,.2);border-color:#FF8A1F}.wc-hint{margin-top:8px;min-height:2.6em}`;
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
