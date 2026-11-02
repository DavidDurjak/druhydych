// Beh: výpočty bez obrazovky (vzdialenosť, tempo, medzičasy, najlepšie úseky, zjednodušenie trasy, súkromie, program Od gauča k 5 km, výzvy).
// Testovateľné samostatne (node), nič tu nesiaha na DOM ani databázu.

export const KIND = {
  outdoor: { e: '🏃', l: 'Beh vonku', s: 'GPS, mapa a tempo', gps: true, c: ['#2BD67B', '#12A0B8'] },
  treadmill: { e: '🏃‍♀️', l: 'Beh na páse', s: 'Stopky a rýchlosť pásu', gps: false, c: ['#5B8CFF', '#7A5CFF'] },
  track: { e: '🏟️', l: 'Atletická dráha', s: 'Intervaly a kolá', gps: false, c: ['#FF7A45', '#FF3B6B'] },
  runwalk: { e: '🔁', l: 'Beh a chôdza', s: 'Striedanie v intervaloch', gps: true, c: ['#F5A623', '#F2643A'] },
  walk: { e: '🚶', l: 'Prechádzka', s: 'Aj krátka sa počíta', gps: true, c: ['#16B8A6', '#4C9F38'] },
};
export const K = k => KIND[k] || KIND.outdoor;

const R = 6371008.8;
const rad = d => d * Math.PI / 180;
export function dist(a, b) {
  const dLat = rad(b[0] - a[0]), dLng = rad(b[1] - a[1]);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}
export function pathLen(p) { let d = 0; for (let i = 1; i < (p?.length || 0); i++) d += dist(p[i - 1], p[i]); return d; }

// formáty
const pad = n => String(n).padStart(2, '0');
export function dur(s) {
  s = Math.max(0, Math.round(s || 0));
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
  return h ? `${h}:${pad(m)}:${pad(x)}` : `${m}:${pad(x)}`;
}
export const km = (m, d = 2) => (Math.max(0, m || 0) / 1000).toFixed(d).replace('.', ',');
export function pace(s, m) { // min/km
  if (!m || m < 20 || !s) return '–:––';
  const p = s / (m / 1000); if (p > 3600) return '–:––';
  return `${Math.floor(p / 60)}:${pad(Math.round(p % 60) % 60)}`;
}
export const speed = (s, m) => (!s || !m ? '0,0' : (m / s * 3.6).toFixed(1).replace('.', ','));
export function kcal(kind, m, kg) { return Math.round((kind === 'walk' ? 0.55 : 1.0) * (kg || 72) * (m || 0) / 1000); }

// filter GPS bodov: presnosť, nezmyselné skoky, stojace body
export function accept(prev, fix, kind) {
  if (fix.acc != null && fix.acc > 35) return false;
  if (!prev) return true;
  const d = dist([prev.lat, prev.lng], [fix.lat, fix.lng]);
  const dt = Math.max(0.5, (fix.t - prev.t) / 1000);
  const v = d / dt;
  if (v > (kind === 'walk' ? 4.5 : 9.5)) return false; // rýchlejšie než šprint: chyba GPS
  if (d < Math.max(2.5, (fix.acc || 10) * 0.25)) return false; // šum na mieste
  return true;
}

// medzičasy po kilometroch z bodov [lat, lng, t]
export function splits(p) {
  const out = []; if (!p || p.length < 2) return out;
  let acc = 0, mark = 1000, lastT = p[0][2] || 0;
  for (let i = 1; i < p.length; i++) {
    const d = dist(p[i - 1], p[i]);
    if (acc + d >= mark) {
      const f = (mark - acc) / d, t = p[i - 1][2] + (p[i][2] - p[i - 1][2]) * f;
      out.push({ km: mark / 1000, s: Math.round(t - lastT) }); lastT = t; mark += 1000;
    }
    acc += d;
  }
  const rest = acc - (mark - 1000);
  if (rest > 150) out.push({ km: +(acc / 1000).toFixed(2), s: Math.round(p[p.length - 1][2] - lastT), part: true });
  return out;
}
// najrýchlejší úsek danej dĺžky (dvaja bežci po trase)
export function bestEfforts(p, targets = [1000, 5000, 10000, 21097]) {
  const res = {}; if (!p || p.length < 2) return res;
  const cum = [0]; for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + dist(p[i - 1], p[i]));
  for (const T of targets) {
    if (cum[cum.length - 1] < T) continue;
    let best = Infinity, j = 0;
    for (let i = 1; i < p.length; i++) {
      while (j < i && cum[i] - cum[j + 1] >= T) j++;
      if (cum[i] - cum[j] >= T) {
        const over = cum[i] - cum[j] - T, seg = cum[i] - cum[i - 1] || 1;
        const t = (p[i][2] - (p[i][2] - p[i - 1][2]) * Math.min(1, over / seg)) - p[j][2];
        if (t > 0 && t < best) best = t;
      }
    }
    if (best < Infinity) res[T] = Math.round(best);
  }
  return res;
}
// Douglas-Peucker na max. n bodov (zachová tvar trasy)
export function simplify(p, maxN = 1200) {
  if (!p || p.length <= maxN) return p || [];
  let eps = 1.5, out = p;
  const pr = q => [q[0] * 111320, q[1] * 111320 * Math.cos(rad(p[0][0]))];
  const perp = (a, b, c) => { const [x1, y1] = pr(a), [x2, y2] = pr(b), [x0, y0] = pr(c); const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1; return Math.abs(dy * x0 - dx * y0 + x2 * y1 - y2 * x1) / L; };
  const dp = (pts, e) => {
    const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
    const st = [[0, pts.length - 1]];
    while (st.length) { const [a, b] = st.pop(); let mx = 0, ix = -1; for (let i = a + 1; i < b; i++) { const d = perp(pts[a], pts[b], pts[i]); if (d > mx) { mx = d; ix = i; } } if (mx > e && ix > 0) { keep[ix] = 1; st.push([a, ix], [ix, b]); } }
    return pts.filter((_, i) => keep[i]);
  };
  while (out.length > maxN && eps < 200) { out = dp(p, eps); eps *= 1.6; }
  return out;
}
// súkromie: odreže začiatok a koniec trasy (~200 m), aby zverejnená trasa neukázala dom
export function privacyTrim(p, m = 200) {
  if (!p || p.length < 4) return p || [];
  const total = pathLen(p); if (total < m * 3) return p;
  let a = 0, acc = 0; while (a < p.length - 1 && acc < m) { acc += dist(p[a], p[a + 1]); a++; }
  let b = p.length - 1; acc = 0; while (b > a && acc < m) { acc += dist(p[b - 1], p[b]); b--; }
  return p.slice(a, b + 1);
}
// prevýšenie z nadmorskej výšky (vyhladené, iba stúpania nad 1 m)
export function elevGain(alts) {
  const xs = (alts || []).filter(x => x != null); if (xs.length < 5) return null;
  let g = 0, base = xs[0];
  for (const a of xs) { if (a - base > 1.5) { g += a - base; base = a; } else if (a < base) base = a; }
  return Math.round(g);
}
// farba úseku podľa tempa (rýchlo = zelená, pomaly = červená) relatívne k behu
export function paceColors(p, n = 60) {
  if (!p || p.length < 3) return [];
  const seg = [];
  const step = Math.max(1, Math.floor(p.length / n));
  for (let i = 0; i < p.length - 1; i += step) {
    const j = Math.min(p.length - 1, i + step), d = pathLen(p.slice(i, j + 1)), t = (p[j][2] ?? 0) - (p[i][2] ?? 0);
    seg.push({ from: i, to: j, v: d > 0 && t > 0 ? d / t : 0 });
  }
  const vs = seg.map(s => s.v).filter(v => v > 0).sort((a, b) => a - b);
  const lo = vs[Math.floor(vs.length * 0.1)] || 0, hi = vs[Math.floor(vs.length * 0.9)] || 1;
  return seg.map(s => ({ ...s, q: hi > lo ? Math.max(0, Math.min(1, (s.v - lo) / (hi - lo))) : 0.5 }));
}
export function heat(q) { // 0 pomaly (červená) → 1 rýchlo (zelená)
  const stops = [[255, 77, 94], [255, 176, 59], [255, 226, 74], [43, 214, 123]];
  const x = q * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(x)), f = x - i;
  const c = stops[i].map((v, k) => Math.round(v + (stops[i + 1][k] - v) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
// SVG náhľad trasy (bez mapy)
export function thumb(p, w = 88, h = 64, color = 'currentColor', sw = 3) {
  if (!p || p.length < 2) return '';
  const c = Math.cos(rad(p[0][0]));
  const xs = p.map(q => q[1] * c), ys = p.map(q => -q[0]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const s = Math.min((w - 10) / ((x1 - x0) || 1e-9), (h - 10) / ((y1 - y0) || 1e-9));
  const ox = (w - (x1 - x0) * s) / 2, oy = (h - (y1 - y0) * s) / 2;
  const step = Math.max(1, Math.floor(p.length / 150));
  const pts = p.filter((_, i) => i % step === 0 || i === p.length - 1).map(q => `${((q[1] * c - x0) * s + ox).toFixed(1)},${((-q[0] - y0) * s + oy).toFixed(1)}`).join(' ');
  const [sx, sy] = pts.split(' ')[0].split(','), [ex, ey] = pts.split(' ').pop().split(',');
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${sx}" cy="${sy}" r="3.2" fill="#2BD67B"/><circle cx="${ex}" cy="${ey}" r="3.2" fill="#FF4D5E"/></svg>`;
}

// ---------- intervaly ----------
// kroky [{t:'warm'|'run'|'walk'|'cool'|'work'|'rest', s, m?}]
export const STEP_L = { warm: 'Rozcvička chôdzou', run: 'Beh', walk: 'Chôdza', cool: 'Vydýchanie chôdzou', work: 'Naplno', rest: 'Oddych' };
export function runwalk(runS, walkS, reps, warm = 300, cool = 300) {
  const st = []; if (warm) st.push({ t: 'warm', s: warm });
  for (let i = 0; i < reps; i++) { st.push({ t: 'run', s: runS }); if (i < reps - 1 || !cool) st.push({ t: 'walk', s: walkS }); }
  if (cool) st.push({ t: 'cool', s: cool });
  return st;
}
export function trackSteps(reps, m, restS, warm = 600, cool = 300) {
  const st = []; if (warm) st.push({ t: 'warm', s: warm });
  for (let i = 0; i < reps; i++) { st.push({ t: 'work', m, s: 0 }); if (i < reps - 1) st.push({ t: 'rest', s: restS }); }
  if (cool) st.push({ t: 'cool', s: cool });
  return st;
}
export const stepsTotal = st => st.reduce((a, x) => a + (x.s || 0), 0);

// ---------- Od gauča k 5 km (8 týždňov, 3 tréningy týždenne) ----------
const W = 300, M = 60;
const seq = (...xs) => { const st = [{ t: 'warm', s: W }]; xs.forEach(([t, s]) => st.push({ t, s })); st.push({ t: 'cool', s: W }); return st; };
const rw = (r, w, n) => seq(...Array.from({ length: n * 2 - 1 }, (_, i) => i % 2 ? ['walk', w] : ['run', r]));
export const C25K = [
  { w: 1, tip: 'Krátke úseky behu. Beh môže byť pomalý, ide o to vydržať.', days: [rw(60, 90, 8), rw(60, 90, 8), rw(60, 90, 8)] },
  { w: 2, tip: 'Úseky behu sa predlžujú. Dýchaj nosom aj ústami, v pohodovom tempe.', days: [rw(90, 120, 6), rw(90, 120, 6), rw(90, 120, 6)] },
  { w: 3, tip: 'Prvýkrát 3 minúty behu v kuse. Spomaľ, ak treba, len nezastav.', days: Array(3).fill(seq(['run', 90], ['walk', 90], ['run', 3 * M], ['walk', 3 * M], ['run', 90], ['walk', 90], ['run', 3 * M])) },
  { w: 4, tip: 'Päť minút behu dvakrát. Toto je zlomový týždeň, zvládneš ho.', days: Array(3).fill(seq(['run', 3 * M], ['walk', 90], ['run', 5 * M], ['walk', 150], ['run', 3 * M], ['walk', 90], ['run', 5 * M])) },
  { w: 5, tip: 'Na konci týždňa 20 minút bez zastavenia. Ver si.', days: [seq(['run', 5 * M], ['walk', 3 * M], ['run', 5 * M], ['walk', 3 * M], ['run', 5 * M]), seq(['run', 8 * M], ['walk', 5 * M], ['run', 8 * M]), seq(['run', 20 * M])] },
  { w: 6, tip: 'Dlhšie úseky a 25 minút v kuse. Tempo drž také, aby si vedel rozprávať.', days: [seq(['run', 5 * M], ['walk', 3 * M], ['run', 8 * M], ['walk', 3 * M], ['run', 5 * M]), seq(['run', 10 * M], ['walk', 3 * M], ['run', 10 * M]), seq(['run', 25 * M])] },
  { w: 7, tip: 'Tri behy po 25 minút. Telo si zvyká na súvislý beh.', days: Array(3).fill(seq(['run', 25 * M])) },
  { w: 8, tip: 'Finále: 30 minút behu. To je zhruba 5 km. Gratulujeme dopredu!', days: [seq(['run', 28 * M]), seq(['run', 28 * M]), seq(['run', 30 * M])] },
];
export function nextC25K(done = []) {
  const set = new Set(done);
  for (const wk of C25K) for (let d = 0; d < 3; d++) if (!set.has(`${wk.w}-${d + 1}`)) return { w: wk.w, d: d + 1, steps: wk.days[d], tip: wk.tip };
  return null;
}
export function stepsSummary(st) {
  const runs = st.filter(x => x.t === 'run');
  if (!runs.length) return '';
  const same = runs.every(x => x.s === runs[0].s);
  const mm = s => s % 60 ? `${Math.floor(s / 60) ? Math.floor(s / 60) + ' min ' : ''}${s % 60} s` : `${s / 60} min`;
  if (runs.length === 1) return `${mm(runs[0].s)} behu v kuse`;
  return same ? `${runs.length}× ${mm(runs[0].s)} behu` : runs.map(x => mm(x.s)).join(' + ') + ' behu';
}

// ---------- výzvy (počítané z behov) ----------
export function challenges(runs, now = new Date()) {
  const R = (runs || []).filter(r => r.kind !== 'walk');
  const all = runs || [];
  const tot = R.reduce((a, r) => a + Number(r.distance_m || 0), 0);
  const maxRun = Math.max(0, ...R.map(r => Number(r.distance_m || 0)));
  const ms = new Date(now.getFullYear(), now.getMonth(), 1);
  const month = R.filter(r => new Date(r.started_at) >= ms).reduce((a, r) => a + Number(r.distance_m || 0), 0);
  const early = all.some(r => new Date(r.started_at).getHours() < 7);
  const weeks = new Set(all.map(r => { const d = new Date(r.started_at); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); }));
  let streak = 0; { const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); if (!weeks.has(d.getTime())) d.setDate(d.getDate() - 7); while (weeks.has(d.getTime())) { streak++; d.setDate(d.getDate() - 7); } }
  const best5 = Math.min(Infinity, ...R.map(r => r.best?.['5000'] || Infinity));
  const MONTHS = ['januári', 'februári', 'marci', 'apríli', 'máji', 'júni', 'júli', 'auguste', 'septembri', 'októbri', 'novembri', 'decembri'];
  return {
    monthly: { title: `50 km v ${MONTHS[now.getMonth()]}`, done: month, target: 50000 },
    badges: [
      { id: 'first', e: '👟', l: 'Prvý beh', d: 'Odbehni svoj prvý beh', ok: R.length > 0 },
      { id: 'walk', e: '🌿', l: 'Na čerstvom vzduchu', d: 'Zapíš prechádzku', ok: all.some(r => r.kind === 'walk') },
      { id: '5k', e: '5️⃣', l: 'Prvá päťka', d: 'Odbehni 5 km naraz', ok: maxRun >= 5000 },
      { id: '10k', e: '🔟', l: 'Desiatka', d: 'Odbehni 10 km naraz', ok: maxRun >= 10000 },
      { id: 'half', e: '🏅', l: 'Polmaratón', d: 'Odbehni 21,1 km naraz', ok: maxRun >= 21097 },
      { id: 'sub30', e: '⚡', l: '5 km pod 30 minút', d: 'Najlepšia päťka pod 30:00', ok: best5 < 1800 },
      { id: 'sub25', e: '🚀', l: '5 km pod 25 minút', d: 'Najlepšia päťka pod 25:00', ok: best5 < 1500 },
      { id: 'early', e: '🌅', l: 'Ranné vtáča', d: 'Beh alebo prechádzka pred 7:00', ok: early },
      { id: 'w4', e: '🔥', l: '4 týždne v rade', d: 'Aspoň jeden beh každý týždeň', ok: streak >= 4 },
      { id: 'k50', e: '🛣️', l: '50 km spolu', d: 'Nazbieraj 50 km behu', ok: tot >= 50000 },
      { id: 'k100', e: '💯', l: '100 km spolu', d: 'Nazbieraj 100 km behu', ok: tot >= 100000 },
      { id: 'k500', e: '🌍', l: '500 km spolu', d: 'Nazbieraj 500 km behu', ok: tot >= 500000 },
    ],
    streak, total: tot,
  };
}
