// Kresba karty tréningu na story (1080 × 1920). Anatomická postava (muž alebo žena, spredu a zozadu),
// na ktorej svietia svaly z dnešného tréningu: čím viac sérií, tým jasnejšie. Tri štýly:
// 'dark' (hotová karta), 'foto' (tvoja fotka v pozadí), 'clear' (priehľadné PNG ako nálepka do story).
import { VB, BB, BORDER, PARTS } from './bodymap.js';
import { drawLogo, logoImg } from './brandmark.js';
const LOGO = await logoImg('#fff'); // karta sa otvára až po načítaní loga

export const W = 1080, H = 1920;
const FONT = (w, s) => `${w} ${s}px Sora, "SF Pro Display", system-ui, -apple-system, "Segoe UI", sans-serif`;
const FLAME = 'M13.4 2.6c.3 2.6 2.1 3.9 3.5 5.9 1.5 2.1 2.1 4.2 1.6 6.4-.7 3.1-3.4 5.2-6.5 5.2-3.3 0-5.9-2.4-5.9-5.6 0-2 .9-3.5 2.2-4.8.2 1.1.8 1.9 1.7 2.3-.4-2.9.5-5.9 3.4-11.4z';
const MINT = '#7CFFB2', TEAL = '#3FD5C4';
const NON_MUSCLE = new Set(['head', 'hair', 'hands', 'feet', 'knees', 'ankles', 'neck']);
export const MUSCLE_NAME = { chest: 'Hrudník', deltoids: 'Ramená', biceps: 'Biceps', triceps: 'Triceps', abs: 'Brucho', obliques: 'Šikmé brušné', quadriceps: 'Stehná',
  hamstring: 'Zadné stehná', gluteal: 'Zadok', calves: 'Lýtka', 'upper-back': 'Chrbát', 'lower-back': 'Spodný chrbát', trapezius: 'Trapézy', forearm: 'Predlaktie', adductors: 'Adduktory' };
// váhy cviku (workouts.js, pole m) -> svaly na postave
const MAP = { chest: { chest: 1 }, triceps: { triceps: 1 }, shoulders: { deltoids: 1 }, back: { 'upper-back': 1, trapezius: .55, 'lower-back': .35 }, biceps: { biceps: 1, forearm: .35 },
  reardelt: { deltoids: .8, trapezius: .35 }, quads: { quadriceps: 1, adductors: .35 }, glutes: { gluteal: 1 }, hams: { hamstring: 1 }, calves: { calves: 1 }, core: { abs: 1, obliques: .7 } };
const BY_GROUP = { 'hrudník': { chest: 1 }, 'chrbát': { back: 1 }, 'ramená': { shoulders: 1 }, 'zadné ramená': { reardelt: 1 }, 'biceps': { biceps: 1 }, 'triceps': { triceps: 1 },
  'nohy': { quads: 1, glutes: .5 }, 'zadná strana': { hams: 1, glutes: .7 }, 'zadok': { glutes: 1 }, 'lýtka': { calves: 1 }, 'core': { core: 1 } };

// sets: [{ex, done, kg, reps}], exercises: mapa id -> {m, muscle}; vráti {sval: 0..1}
export function loadFrom(sets, exercises) {
  const acc = {};
  for (const s of sets) {
    const ex = exercises?.[s.ex]; if (!ex || s.ex === 'cardio') continue;
    const m = ex.m && Object.keys(ex.m).length ? ex.m : BY_GROUP[ex.muscle] || {};
    for (const k in m) for (const [slug, w] of Object.entries(MAP[k] || {})) acc[slug] = (acc[slug] || 0) + m[k] * w;
  }
  const mx = Math.max(0, ...Object.values(acc)), out = {};
  if (mx) for (const k in acc) out[k] = Math.min(1, acc[k] / mx);
  return out;
}
export function topMuscles(load, n = 3) {
  return Object.entries(load).filter(([k, v]) => v >= .5 && MUSCLE_NAME[k]).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => MUSCLE_NAME[k]);
}

const STOPS = [[0, [22, 122, 110]], [.42, [63, 213, 196]], [.75, [124, 255, 178]], [1, [232, 255, 242]]];
function heat(v) {
  for (let i = 1; i < STOPS.length; i++) {
    const [p1, c1] = STOPS[i], [p0, c0] = STOPS[i - 1];
    if (v <= p1) { const t = (v - p0) / (p1 - p0); return c0.map((x, j) => Math.round(x + (c1[j] - x) * t)); }
  }
  return STOPS[STOPS.length - 1][1];
}
const P2D = new Map();
const path2d = d => { let p = P2D.get(d); if (!p) { p = new Path2D(d); P2D.set(d, p); } return p; };

// jedna postava vpísaná do obdĺžnika (x, y, w, h), zarovnaná na stred
function body(c, key, load, x, y, w, h, opt = {}) {
  const [bx, by, bw, bh] = BB[key];
  const k = Math.min(w / bw, h / bh), ox = x + (w - bw * k) / 2 - bx * k, oy = y + (h - bh * k) / 2 - by * k;
  c.save(); c.translate(ox, oy); c.scale(k, k);
  const parts = PARTS[key];
  // podklad: celé telo jemne, svaly oddelené medzerami ako na anatomickom atlase
  for (const [slug, ds] of parts) {
    c.fillStyle = NON_MUSCLE.has(slug) ? (opt.light ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.075)') : (opt.light ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.05)');
    for (const d of ds) c.fill(path2d(d));
  }
  c.lineJoin = 'round'; c.lineWidth = 3 / k; c.strokeStyle = opt.light ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.22)';
  c.stroke(path2d(BORDER[key]));
  // svaly z tréningu: najprv žiara, potom ostrá farba
  const hot = parts.filter(([s]) => (load[s] || 0) > 0.04);
  for (const pass of [0, 1]) {
    for (const [slug, ds] of hot) {
      const v = load[slug], [r, g, b] = heat(v);
      if (pass === 0) { c.shadowColor = `rgba(${r},${g},${b},${.55 + .4 * v})`; c.shadowBlur = (18 + 46 * v) * (opt.blur || 1); c.fillStyle = `rgba(${r},${g},${b},${.35 + .5 * v})`; }
      else { c.shadowColor = 'transparent'; c.shadowBlur = 0; c.fillStyle = `rgba(${r},${g},${b},${.62 + .38 * v})`; }
      for (const d of ds) c.fill(path2d(d));
    }
  }
  c.restore();
}
export function bodies(c, sex, load, x, y, w, h, opt = {}) {
  const f = sex === 'f', gap = w * .04, bw = (w - gap) / 2;
  if (!opt.light) { // svetlo na podlahe pod postavami
    for (const cx of [x + bw / 2, x + bw + gap + bw / 2]) {
      const g = c.createRadialGradient(cx, y + h - 6, 4, cx, y + h - 6, bw * .42);
      g.addColorStop(0, 'rgba(124,255,178,.22)'); g.addColorStop(1, 'rgba(124,255,178,0)');
      c.save(); c.translate(0, (y + h - 6) * (1 - .22)); c.scale(1, .22); c.fillStyle = g; c.fillRect(cx - bw / 2, y + h - 6 - bw / 2, bw, bw); c.restore();
    }
  }
  body(c, f ? 'ff' : 'mf', load, x, y, bw, h, opt);
  body(c, f ? 'fb' : 'mb', load, x + bw + gap, y, bw, h, opt);
}

const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
function fitFont(c, text, weight, size, min, maxW) { let s = size; c.font = FONT(weight, s); while (c.measureText(text).width > maxW && s > min) { s -= 4; c.font = FONT(weight, s); } return s; }
function ell(c, text, maxW) { if (c.measureText(text).width <= maxW) return text; let t = text; while (t.length > 3 && c.measureText(t + '…').width > maxW) t = t.slice(0, -1); return t.trimEnd() + '…'; }
let grain = null;
function noise(c) {
  if (!grain) {
    grain = document.createElement('canvas'); grain.width = grain.height = 256;
    const g = grain.getContext('2d'), im = g.createImageData(256, 256);
    for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 14; }
    g.putImageData(im, 0, 0);
  }
  c.save(); c.fillStyle = c.createPattern(grain, 'repeat'); c.fillRect(0, 0, W, H); c.restore();
}
function cover(c, img) {
  const iw = img.width, ih = img.height, k = Math.max(W / iw, H / ih);
  c.drawImage(img, (W - iw * k) / 2, (H - ih * k) / 2, iw * k, ih * k);
}
function check(c, x, y, s, col) { c.save(); c.strokeStyle = col; c.lineWidth = s * .16; c.lineCap = c.lineJoin = 'round'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + s * .35, y + s * .35); c.lineTo(x + s, y - s * .4); c.stroke(); c.restore(); }

// d: { title, dateLabel, stats: [[popis, hodnota, jednotka]], load, sex, muscles: [..], highlight: {label, text, pr}, streak, week }
export function drawCard(d, mode = 'dark', photo = null, T = s => s) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const clear = mode === 'clear', foto = mode === 'foto' && photo;
  if (!clear) {
    c.fillStyle = '#05070A'; c.fillRect(0, 0, W, H);
    if (foto) {
      cover(c, photo);
      let g = c.createLinearGradient(0, 0, 0, 760); g.addColorStop(0, 'rgba(0,0,0,.78)'); g.addColorStop(.6, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, W, 760);
      g = c.createLinearGradient(0, 1060, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.45, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,.88)'); c.fillStyle = g; c.fillRect(0, 1060, W, H - 1060);
    } else {
      let g = c.createRadialGradient(W / 2, 1040, 40, W / 2, 1040, 820); g.addColorStop(0, 'rgba(63,213,196,.22)'); g.addColorStop(.5, 'rgba(124,255,178,.06)'); g.addColorStop(1, 'rgba(5,7,10,0)');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      g = c.createRadialGradient(140, 120, 10, 140, 120, 700); g.addColorStop(0, 'rgba(124,255,178,.10)'); g.addColorStop(1, 'rgba(124,255,178,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.8, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.45)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      noise(c);
    }
  }
  const sh = on => { c.shadowColor = on && (clear || foto) ? 'rgba(0,0,0,.55)' : 'transparent'; c.shadowBlur = on ? 24 : 0; c.shadowOffsetY = on ? 2 : 0; };
  const L = 84, R = W - 84;
  sh(true);
  // hlavička: logo a dátum
  drawLogo(c, L, 150, 46, '#fff', LOGO);
  c.textAlign = 'right'; c.font = FONT(600, 32); c.fillStyle = 'rgba(255,255,255,.62)'; c.fillText(d.dateLabel, R, 148);
  // názov tréningu
  c.textAlign = 'left'; c.fillStyle = '#fff';
  const title = T(d.title);
  fitFont(c, title, 800, 104, 60, R - L); c.fillText(ell(c, title, R - L), L, 318);
  check(c, L + 4, 376, 30, MINT);
  c.font = FONT(700, 32); c.fillStyle = MINT; c.fillText(T('Tréning dokončený'), L + 52, 388);
  // štatistiky: malý popis, veľké číslo
  const cols = d.stats.slice(0, 3), cw = (R - L) / cols.length;
  cols.forEach(([lab, val, unit], i) => {
    const x = L + i * cw;
    c.font = FONT(600, 30); c.fillStyle = 'rgba(255,255,255,.55)'; c.fillText(T(lab), x, 486);
    c.fillStyle = '#fff'; const vs = fitFont(c, val, 800, 80, 46, cw - (unit ? 70 : 16)); c.fillText(val, x, 576);
    if (unit) { const vw = c.measureText(val).width; c.font = FONT(700, Math.round(vs * .45)); c.fillStyle = 'rgba(255,255,255,.62)'; c.fillText(unit, x + vw + 8, 576); }
  });
  // postavy
  sh(false);
  if (foto) bodies(c, d.sex, d.load, 250, 1150, W - 500, 540, { light: true, blur: .8 });
  else bodies(c, d.sex, d.load, 90, 650, W - 180, clear ? 860 : 820, { light: clear });
  // zapojené svaly
  let y = foto ? 1730 : 1566;
  if (!foto && d.muscles?.length) {
    c.font = FONT(700, 30);
    const pad = 28, gp = 14, ws = d.muscles.map(m => c.measureText(T(m)).width + pad * 2), tot = ws.reduce((a, b) => a + b, 0) + gp * (ws.length - 1);
    let x = (W - tot) / 2;
    d.muscles.forEach((m, i) => {
      rr(c, x, y - 40, ws[i], 60, 30); c.fillStyle = clear ? 'rgba(0,0,0,.35)' : 'rgba(124,255,178,.10)'; c.fill();
      c.lineWidth = 2; c.strokeStyle = 'rgba(124,255,178,.55)'; c.stroke();
      c.fillStyle = '#E9FFF3'; c.textAlign = 'center'; c.fillText(T(m), x + ws[i] / 2, y + 1); x += ws[i] + gp;
    });
    y += 70;
  }
  // rekord alebo najlepšia séria
  if (d.highlight && !foto) {
    const bx = L, bw = R - L, bh = 128, by = y;
    rr(c, bx, by, bw, bh, 30);
    if (d.highlight.pr) { const g = c.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, 'rgba(255,200,87,.20)'); g.addColorStop(1, 'rgba(255,200,87,.06)'); c.fillStyle = g; }
    else c.fillStyle = clear ? 'rgba(0,0,0,.40)' : 'rgba(255,255,255,.05)';
    c.fill(); c.lineWidth = 2; c.strokeStyle = d.highlight.pr ? 'rgba(255,200,87,.6)' : 'rgba(255,255,255,.12)'; c.stroke();
    c.textAlign = 'left'; c.font = FONT(700, 27); c.fillStyle = d.highlight.pr ? '#FFC857' : 'rgba(255,255,255,.55)'; c.fillText(T(d.highlight.label), bx + 36, by + 50);
    c.fillStyle = '#fff'; fitFont(c, d.highlight.text, 800, 40, 28, bw - 72); c.fillText(ell(c, d.highlight.text, bw - 72), bx + 36, by + 98);
  }
  // pätička: séria dní a týždeň
  sh(true);
  c.textAlign = 'left'; c.font = FONT(700, 32);
  if (d.streak > 0) {
    c.save(); c.translate(L, 1818); c.scale(1.6, 1.6); c.fillStyle = '#FF9D3D'; c.fill(new Path2D(FLAME)); c.restore();
    c.fillStyle = '#fff'; c.fillText(T(d.streakText), L + 46, 1850);
  }
  if (d.week) { c.textAlign = 'right'; c.fillStyle = 'rgba(255,255,255,.62)'; c.font = FONT(600, 30); c.fillText(T(d.week), R, 1850); }
  sh(false);
  return cv;
}
