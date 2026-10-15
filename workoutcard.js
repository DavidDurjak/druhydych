// Tréningová karta na story (9:16): z odcvičeného dňa vyrobí obrázok s celkovým objemom, rekordmi, top cvikmi a sériou.
// Tlačidlo "Zdieľať tréning" sa objaví na obrazovke Tréning, keď je deň ukončený.
import * as db from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';
import { EXERCISES } from './workouts.js';

const W = 1080, H = 1920;
const BG = '#0B0E12', MINT = '#7CFFB2', INK = '#F4F7FA', MUTED = '#8C97A6', GOLD = '#FFC857', FIRE = '#FF8A1F';
const FONT = (w, s) => `${w} ${s}px Sora, "SF Pro Display", system-ui, -apple-system, "Segoe UI", sans-serif`;
const FLAME = 'M13.4 2.6c.3 2.6 2.1 3.9 3.5 5.9 1.5 2.1 2.1 4.2 1.6 6.4-.7 3.1-3.4 5.2-6.5 5.2-3.3 0-5.9-2.4-5.9-5.6 0-2 .9-3.5 2.2-4.8.2 1.1.8 1.9 1.7 2.3-.4-2.9.5-5.9 3.4-11.4z';
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
const nf = n => Math.round(n).toLocaleString('sk-SK').replace(/ /g, ' ');
const kgs = n => String(Math.round(n * 10) / 10).replace('.', ',');
const exName = id => EXERCISES?.[id]?.name || id;
const e1rm = (kg, reps) => kg * (1 + Math.min(reps, 20) / 30);

// porovnanie, aby číslo malo váhu
function compare(v) {
  const U = v < 1200 ? [80, 'človeka', 'ľudí'] : v < 7500 ? [1500, 'auta', 'áut'] : [5000, 'slona', 'slonov'];
  const x = v / U[0];
  return x >= 10 ? `${nf(x)} ${U[2]}` : `${(Math.round(x * 10) / 10).toString().replace('.', ',')} ${U[1]}`;
}

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
  return { volume, sets: done.length - cardioSets, cardioSets, exCount: byEx.size, prs, top, volPr: prior.length > 0 && volume > prevMaxVol && prevMaxVol > 0 };
}

export function draw(d) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  c.fillStyle = BG; c.fillRect(0, 0, W, H);
  // teplý svit za číslom, jemné čiary rýchlosti
  const g = c.createRadialGradient(W / 2, 640, 40, W / 2, 640, 760);
  g.addColorStop(0, 'rgba(255,138,31,.26)'); g.addColorStop(.5, 'rgba(255,90,30,.08)'); g.addColorStop(1, 'rgba(11,14,18,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  const g2 = c.createRadialGradient(W / 2, H, 40, W / 2, H, 700);
  g2.addColorStop(0, 'rgba(124,255,178,.14)'); g2.addColorStop(1, 'rgba(11,14,18,0)');
  c.fillStyle = g2; c.fillRect(0, 1200, W, 720);
  c.lineCap = 'round';
  [[70, 300, 380, .09], [130, 360, 250, .06], [780, 320, 230, .08], [850, 380, 160, .05]].forEach(([x, y, l, a]) => { c.strokeStyle = `rgba(255,170,80,${a})`; c.lineWidth = 6; c.beginPath(); c.moveTo(x, y); c.lineTo(x + l, y); c.stroke(); });

  // hlavička
  c.save(); c.translate(72, 92); c.scale(3.2, 3.2);
  c.fillStyle = 'rgba(124,255,178,.2)'; c.strokeStyle = MINT; c.lineWidth = 1.9; c.lineJoin = 'round';
  const p = new Path2D(FLAME); c.fill(p); c.stroke(p); c.restore();
  c.fillStyle = INK; c.font = FONT(800, 46); c.textAlign = 'left'; c.fillText('Fuelwind', 160, 138);
  c.fillStyle = MUTED; c.font = FONT(500, 30); c.textAlign = 'right'; c.fillText(d.dateLabel, W - 72, 136);

  // názov dňa
  c.textAlign = 'center'; c.fillStyle = INK; c.font = FONT(800, 64);
  c.fillText(fit(c, d.dayName, W - 160), W / 2, 330);
  c.fillStyle = MUTED; c.font = FONT(600, 32); c.fillText(d.name ? `Tréning · ${d.name}` : 'Tréning', W / 2, 380);

  // hlavné číslo
  const big = d.s.volume > 0;
  const val = big ? nf(d.s.volume) : String(d.s.sets);
  let fs = 250; c.font = FONT(900, fs); while (c.measureText(val).width > W - 140 && fs > 120) { fs -= 10; c.font = FONT(900, fs); }
  c.shadowColor = 'rgba(255,138,31,.55)'; c.shadowBlur = 44; c.fillStyle = INK; c.fillText(val, W / 2, 640); c.shadowBlur = 0;
  c.fillStyle = FIRE; c.font = FONT(800, 50); c.fillText(big ? 'kg zdvihnutých' : 'odcvičených sérií', W / 2, 712);
  if (big) {
    const t = `to je ako ${compare(d.s.volume)}`;
    c.font = FONT(700, 34); const bw = c.measureText(t).width + 64, bx = W / 2 - bw / 2;
    rr(c, bx, 748, bw, 66, 33); c.fillStyle = 'rgba(255,138,31,.16)'; c.fill();
    c.strokeStyle = 'rgba(255,138,31,.45)'; c.lineWidth = 2; c.stroke();
    c.fillStyle = INK; c.fillText(t, W / 2, 793);
  }

  // rekordy
  let y = 880;
  const prs = d.s.prs.slice(0, 2);
  if (prs.length || d.s.volPr) {
    prs.forEach(pr => {
      rr(c, 72, y, W - 144, 118, 30);
      const gg = c.createLinearGradient(72, y, W - 72, y); gg.addColorStop(0, 'rgba(255,200,87,.26)'); gg.addColorStop(1, 'rgba(255,200,87,.07)');
      c.fillStyle = gg; c.fill(); c.strokeStyle = 'rgba(255,200,87,.7)'; c.lineWidth = 2.5; c.stroke();
      c.textAlign = 'left'; c.fillStyle = GOLD; c.font = FONT(800, 26); c.fillText('NOVÝ REKORD', 106, y + 44);
      c.fillStyle = INK; c.font = FONT(800, 38); c.fillText(fit(c, exName(pr.id), 520), 106, y + 90);
      c.textAlign = 'right'; c.fillStyle = GOLD; c.font = FONT(900, 46); c.fillText(`${kgs(pr.kg)} kg × ${pr.reps}`, W - 106, y + 80);
      y += 138;
    });
    if (!prs.length && d.s.volPr) {
      rr(c, 72, y, W - 144, 96, 30); c.fillStyle = 'rgba(255,200,87,.14)'; c.fill(); c.strokeStyle = 'rgba(255,200,87,.6)'; c.lineWidth = 2.5; c.stroke();
      c.textAlign = 'center'; c.fillStyle = GOLD; c.font = FONT(800, 36); c.fillText('Najväčší objem v histórii', W / 2, y + 62);
      y += 116;
    }
    y += 6;
  } else y += 10;

  // top cviky
  c.textAlign = 'left';
  const rows = d.s.top.slice(0, prs.length >= 2 ? 3 : 4);
  rows.forEach(e => {
    rr(c, 72, y, W - 144, 92, 24); c.fillStyle = 'rgba(255,255,255,.06)'; c.fill();
    c.fillStyle = INK; c.font = FONT(700, 34); c.textAlign = 'left'; c.fillText(fit(c, exName(e.id), 560), 104, y + 58);
    c.textAlign = 'right'; c.fillStyle = MINT; c.font = FONT(800, 34);
    c.fillText(e.best ? `${kgs(e.best.kg)} kg × ${e.best.reps}` : `${e.bw} op.`, W - 104, y + 58);
    y += 108;
  });

  // dlaždice
  const stats = [[String(d.s.sets), 'sérií'], [String(d.s.exCount), 'cvikov'], [d.s.cardioSets ? 'áno' : 'nie', 'kardio'], [d.week, 'tento týždeň']];
  const n = stats.length, gap = 18, pad = 72, tw = (W - pad * 2 - gap * (n - 1)) / n, ty = 1560, th = 132;
  stats.forEach(([v, l], i) => {
    const x = pad + i * (tw + gap);
    rr(c, x, ty, tw, th, 26); c.fillStyle = 'rgba(255,255,255,.06)'; c.fill();
    c.strokeStyle = 'rgba(255,255,255,.08)'; c.lineWidth = 1.5; c.stroke();
    c.textAlign = 'center'; c.fillStyle = INK; c.font = FONT(800, 46); c.fillText(v, x + tw / 2, ty + 66);
    c.fillStyle = MUTED; c.font = FONT(500, 23); c.fillText(l, x + tw / 2, ty + 106);
  });

  // séria a pätička
  if (d.streak > 0) {
    c.save(); c.translate(W / 2 - 150, 1742); c.scale(2.2, 2.2);
    c.fillStyle = 'rgba(255,138,31,.35)'; c.strokeStyle = FIRE; c.lineWidth = 1.8; c.lineJoin = 'round';
    const p2 = new Path2D(FLAME); c.fill(p2); c.stroke(p2); c.restore();
    c.textAlign = 'left'; c.fillStyle = INK; c.font = FONT(800, 44); c.fillText(`${d.streak} ${d.streak === 1 ? 'deň' : d.streak < 5 ? 'dni' : 'dní'} v rade`, W / 2 - 98, 1790);
  }
  c.textAlign = 'center'; c.fillStyle = 'rgba(140,151,166,.8)'; c.font = FONT(500, 28);
  c.fillText('druhydych.vercel.app', W / 2, 1866);
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
    s, dayName: log.day_name || 'Tréning', name: (st.profile.name || '').split(' ')[0],
    dateLabel: dt.toLocaleDateString('sk-SK', { day: 'numeric', month: 'long' }),
    week: goal ? `${weekN}/${goal}` : String(weekN),
    streak: calc.streak ? calc.streak(dates) : 0,
  };
}

async function open() {
  let d;
  try { d = await build(); } catch (e) { ctx.toast(e.message || 'Karta sa nepodarila', true); return; }
  try { await Promise.race([document.fonts.load('900 80px Sora'), new Promise(r => setTimeout(r, 1200))]); } catch (_) { /* náhradné písmo */ }
  const cv = draw(d), url = cv.toDataURL('image/png');
  const bg = ctx.sheet(`<div class="row between"><h3>Karta tréningu</h3><button class="del" data-x aria-label="Zavrieť">×</button></div>
    <img src="${url}" alt="Karta tréningu: ${Math.round(d.s.volume)} kg zdvihnutých" style="width:100%;max-height:62vh;object-fit:contain;border-radius:18px;margin-top:10px;display:block">
    <div class="row mt" style="gap:8px"><button class="btn" id="wcSave" style="flex:1">Uložiť</button><button class="btn primary" id="wcShare" style="flex:1">${navigator.canShare ? 'Zdieľať na story' : 'Stiahnuť'}</button></div>`);
  bg.querySelector('[data-x]').onclick = () => bg.remove();
  const blob = () => new Promise(r => cv.toBlob(r, 'image/png'));
  const save = async () => { const b = await blob(), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'fuelwind-trening.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  bg.querySelector('#wcSave').onclick = save;
  bg.querySelector('#wcShare').onclick = async () => {
    try {
      const b = await blob(), f = new File([b], 'fuelwind-trening.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f], title: 'Fuelwind', text: d.s.volume ? `Dnes ${nf(d.s.volume)} kg. Fuelwind` : 'Môj tréning. Fuelwind' });
      else await save();
    } catch (e) { if (e?.name !== 'AbortError') ctx.toast('Nepodarilo sa zdieľať', true); }
  };
}

const CSS = `.wc-btn{width:100%;margin:2px 0 10px;border:0;border-radius:18px;padding:15px;font:inherit;font-weight:800;font-size:16px;color:#2a1200;background:linear-gradient(180deg,#FFD58A,#FF9D3D);cursor:pointer;box-shadow:0 6px 22px rgba(255,138,31,.28)}.wc-btn:active{transform:scale(.98)}`;
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
