// Ukážka pre prezentáciu: appka beží s vymysleným trénerom a jeho klientmi.
// Zapne sa len odkazom s #demo (demo-boot.js). Všetko je v pamäti telefónu, do skutočnej databázy sa nič nezapíše ani neprečíta,
// okrem hľadania potravín (iba čítanie verejného zoznamu potravín, bez prihlásenia).
// Rozhranie napodobňuje Supabase klienta (from, rpc, auth, storage, functions), takže zvyšok appky nevie, že je v ukážke.

const ID = n => '00000000-0000-4000-8000-0000000000' + String(n).padStart(2, '0');
const TR = ID(1);
const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const ago = n => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - n); return d; };
const at = (n, h, m = 0) => { const d = ago(n); d.setHours(h, m, 0, 0); return d.toISOString(); };
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const r1 = v => Math.round(v * 10) / 10;

// ---------- ľudia ----------
const prof = (n, name, sex, by, h, goal, kcal, p, sw, days, extra = {}) => ({
  id: ID(n), email: null, name, role: 'participant', sex, birth_year: by, height_cm: h, start_weight: sw, goal, activity: `a:desk:${7000 + n * 500}:${days}`,
  training_days: days, target_kcal: kcal, target_protein: p, target_carbs: Math.round((kcal - p * 4 - kcal * 0.25) / 4), target_fat: Math.round(kcal * 0.25 / 9),
  start_date: iso(ago(28)), onboarded: true, created_at: at(29, 18), gym: true, water_goal: 2500, targets_mode: 'auto', units: 'metric', lang: 'sk', ...extra,
});
const trainer = prof(1, 'Martin Kováč', 'm', 1994, 182, 'maintain', 2700, 170, 84, 4);
// k: koľko dní zo 7 zapisuje, last: koľko posledných dní nezapisoval, w0 → w1: váha za 4 týždne, eat: koľko zje oproti cieľu, tr: tréningy týždenne
const C = [
  { p: prof(2, 'Lucia Kováčová', 'f', 1998, 168, 'lose', 1800, 125, 72.4, 3), k: 6.5, last: 0, w0: 72.4, w1: 68.6, eat: 0.98, tr: 3 },
  { p: prof(3, 'Daniel Novák', 'm', 1991, 183, 'lose', 2300, 165, 94.2, 3), k: 6, last: 4, w0: 94.2, w1: 92.1, eat: 1.02, tr: 2 },
  { p: prof(4, 'Marek Horváth', 'm', 2001, 178, 'gain', 3100, 160, 70.8, 5), k: 7, last: 0, w0: 70.8, w1: 72.4, eat: 1.0, tr: 5 },
  { p: prof(5, 'Simona Bartošová', 'f', 1995, 165, 'lose', 1700, 115, 66.3, 3), k: 6, last: 0, w0: 66.3, w1: 65.9, eat: 1.17, tr: 2, stall: true },
  { p: prof(6, 'Tomáš Baláž', 'm', 1988, 186, 'lose', 2400, 175, 102.6, 4), k: 4, last: 1, w0: 102.6, w1: 99.4, eat: 1.03, tr: 3 },
  { p: prof(7, 'Petra Urbanová', 'f', 1999, 170, 'maintain', 2000, 120, 60.1, 4), k: 7, last: 0, w0: 60.1, w1: 60.3, eat: 1.0, tr: 4 },
];
const REQ = { id: ID(9), name: 'Peter Mráz' };

// ---------- jedlá ----------
const F = {
  breakfast: [['Ovsená kaša s banánom', 350, 420, 16, 68, 9], ['Vajíčka so špenátom a chlebom', 260, 410, 26, 30, 20], ['Grécky jogurt s ovocím a granolou', 300, 380, 24, 46, 10], ['Tvarohová palacinka', 220, 360, 30, 38, 9]],
  brunch: [['Proteínový šejk', 330, 210, 30, 12, 4], ['Jablko a mandle', 180, 230, 6, 24, 13], ['Cottage s paprikou', 200, 190, 24, 8, 6]],
  lunch: [['Kuracie prsia s ryžou a zeleninou', 420, 620, 52, 70, 12], ['Hovädzí guláš s knedľou', 450, 760, 40, 78, 28], ['Losos so zemiakmi', 400, 640, 40, 52, 28], ['Cestoviny s morčacím mäsom', 420, 650, 45, 80, 14]],
  snack: [['Tvaroh s medom', 250, 260, 30, 24, 4], ['Ryžové chlebíky so šunkou', 150, 210, 16, 28, 3], ['Proteínová tyčinka', 60, 220, 20, 20, 7]],
  dinner: [['Zeleninový šalát s tuniakom', 380, 420, 36, 18, 22], ['Kurací wrap', 300, 520, 38, 48, 18], ['Omeleta so zeleninou', 300, 410, 30, 10, 28], ['Pečené kuracie stehná so zeleninou', 400, 560, 44, 22, 32]],
};
const pick = a => a[Math.floor(rnd() * a.length)];

// ---------- dáta ----------
const T = { profiles: [trainer, ...C.map(c => c.p)], food_logs: [], weight_logs: [], checkins: [], workout_logs: [], progress_photos: [], messages: [], weekly_checkins: [], target_history: [],
  trainer_profiles: [], trainer_clients: [], trainer_reviews: [], trainer_applications: [], workout_plans: [], diet_settings: [], habits: [], habit_logs: [], glucose_logs: [], sleep_logs: [], health_daily: [],
  food_favs: [], foods: [], water_goals: [], reminder_settings: [], coach_msgs: [], app_events: [], feedback: [], news: [], physique_checks: [], food_portions: [], food_checks: [], push_subscriptions: [] };
let nid = 1000; const next = () => ++nid;

function foodsFor(uid, n, kcalT, mul) {
  const meals = ['breakfast', 'lunch', 'dinner', ...(rnd() > 0.35 ? ['brunch'] : []), ...(rnd() > 0.5 ? ['snack'] : [])];
  let rows = meals.map(m => { const [name, g, kcal, p, c, f] = pick(F[m]); return { meal: m, name, g, kcal, p, c, f }; });
  const sum = rows.reduce((a, r) => a + r.kcal, 0), k = kcalT * mul * (0.94 + rnd() * 0.12) / sum;
  rows.forEach((r, i) => T.food_logs.push({ id: next(), user_id: uid, date: iso(ago(n)), meal: r.meal, name: r.name, brand: null, grams: Math.round(r.g * k), kcal: Math.round(r.kcal * k), protein: r1(r.p * k), carbs: r1(r.c * k), fat: r1(r.f * k), source: 'db', created_at: at(n, 8 + i * 3) }));
}
const TRDAYS = { 2: [1, 3, 5], 3: [1, 3, 5], 4: [1, 2, 4, 6], 5: [1, 2, 3, 5, 6] };
C.forEach((c, ci) => {
  const uid = c.p.id;
  for (let n = 27; n >= 0; n--) {
    const prog = (27 - n) / 27, dow = ago(n).getDay();
    // váha: plynulý trend so šumom (Simona posledné 2 týždne stojí)
    const base = c.stall ? c.w0 + (c.w1 - c.w0) * Math.min(1, prog * 2.2) : c.w0 + (c.w1 - c.w0) * prog;
    if (n >= c.last && (rnd() < 0.72 || n < 3)) T.weight_logs.push({ id: next(), user_id: uid, date: iso(ago(n)), weight_kg: r1(base + (rnd() - 0.5) * 0.7), waist_cm: null, created_at: at(n, 7, 10) });
    const logs = n >= c.last && rnd() < c.k / 7;
    if (logs) foodsFor(uid, n, c.p.target_kcal, c.eat);
    if (n >= c.last && (TRDAYS[c.tr] || []).includes(dow) && rnd() < 0.9) T.workout_logs.push({ id: next(), user_id: uid, date: iso(ago(n)), plan_day: 1, day_name: c.p.goal === 'gain' ? 'Horná časť' : 'Celé telo', sets: [], done: true, duration_min: 50 + Math.round(rnd() * 25), created_at: at(n, 18) });
    if (n >= c.last && rnd() < 0.6) T.checkins.push({ id: next(), user_id: uid, date: iso(ago(n)), sleep_h: r1(6.2 + rnd() * 2), steps: 5000 + Math.round(rnd() * 7000), mood: 3 + Math.round(rnd() * 2), energy: 3 + Math.round(rnd() * 2), note: null, created_at: at(n, 21) });
  }
  [27, 13, 0].forEach((n, i) => { if (!(c.last && n < c.last)) T.progress_photos.push({ id: next(), user_id: uid, date: iso(ago(n)), pose: 'front', path: `demo/${ci}/${i}.svg`, created_at: at(n, 7, 30) }); });
  T.trainer_clients.push({ id: 'dl' + ci, trainer_id: TR, client_id: uid, status: 'active', source: ci % 2 ? 'code' : 'catalog', client_name: c.p.name, client_goal: c.p.goal, message: null, created_at: at(27, 10), accepted_at: at(27, 11) });
});
// poznámky z check-inov a týždenné hodnotenie
const note = (uid, n, text) => { const c = T.checkins.find(x => x.user_id === uid && x.date === iso(ago(n))); if (c) c.note = text; else T.checkins.push({ id: next(), user_id: uid, date: iso(ago(n)), sleep_h: 7, steps: 7000, mood: 3, energy: 3, note: text, created_at: at(n, 21) }); };
note(ID(2), 2, 'Cez víkend som bola na oslave, ale zapísala som všetko.');
note(ID(5), 1, 'Mám pocit, že váha stojí, aj keď sa snažím.');
note(ID(6), 3, 'V práci veľa stresu, tréning som vynechal.');
note(ID(4), 1, 'Drep 100 kg na 5 opakovaní, osobák!');
const wk = d => { const x = new Date(d); const k = (x.getDay() + 6) % 7; x.setDate(x.getDate() - k); return iso(x); };
T.weekly_checkins.push({ id: next(), user_id: ID(2), week_start: wk(ago(7)), energy: 4, sleep: 4, hunger: 3, mood: 4, win: 'Zvládla som 3 tréningy a varila som si dopredu.', hard: 'Sladké večer.', plan: 'Pripraviť si večeru vopred.', created_at: at(2, 20) });
T.target_history.push({ id: next(), user_id: ID(5), date: iso(ago(6)), old_kcal: 1800, new_kcal: 1700, reason: 'Váha 2 týždne stojí, cieľ sme znížili o 100 kcal.', avg_intake: 1850, trend_change: 0, created_at: at(6, 9) });
// správy
const msg = (from, to, n, h, body, read = true) => T.messages.push({ id: next(), from_user: from, to_user: to, body, created_at: at(n, h, 12), read_at: read ? at(n, h + 1) : null });
msg(TR, ID(2), 6, 9, 'Ahoj Lucia, super týždeň! Váha ide pekne dole, len tak ďalej.');
msg(ID(2), TR, 6, 12, 'Ďakujem! Môžem si dať cez víkend aj pizzu?');
msg(TR, ID(2), 6, 13, 'Jasné, len si ju zapíš a v ostatné jedlá daj viac bielkovín. Jedno jedlo ťa nezastaví.');
msg(ID(5), TR, 1, 19, 'Ahoj, váha mi stojí už 2 týždne, čo s tým?', false);
msg(TR, ID(3), 2, 10, 'Daniel, nevidím zápisy od štvrtka. Všetko v poriadku?');
msg(ID(4), TR, 1, 20, 'Dnes drep 100 kg na 5! 💪', false);
msg(TR, ID(4), 1, 21, 'Paráda! Budúci týždeň skúsime 102,5.');
// tréner: vlastný profil, žiadosť nového klienta, hodnotenia
T.trainer_profiles.push({ user_id: TR, display_name: 'Martin Kováč', headline: 'Chudnutie a silový tréning bez hladovania', bio: 'Tréner v RM Sport Resort Prievidza. Pomáham ľuďom schudnúť a zosilnieť bez extrémnych diét. Každý týždeň skontrolujem tvoje jedlo, tréningy a váhu.', city: 'Prievidza',
  photo_url: '', specialties: ['Chudnutie', 'Silový tréning', 'Výživa'], languages: ['slovenčina'], credentials: [], achievements: [], experience_years: 6, online: true, in_person: true, price_from: null, price_note: null,
  invite_code: 'MARTIN6', status: 'published', verified: true, approved: true, created_at: at(40, 10), updated_at: at(3, 10), auto_hidden: false, social_url: null, review_note: null });
T.trainer_clients.push({ id: 'dlr', trainer_id: TR, client_id: REQ.id, status: 'requested', source: 'catalog', client_name: REQ.name, client_goal: 'lose', message: 'Ahoj, chcel by som schudnúť 8 kg do leta a naučiť sa jesť normálne.', created_at: at(0, 9), accepted_at: null });
T.trainer_reviews.push({ id: next(), trainer_id: TR, client_id: ID(2), client_name: 'Lucia', rating: 5, body: 'Za mesiac skoro 4 kg dole a ani raz som nebola hladná.', created_at: at(4, 18) },
  { id: next(), trainer_id: TR, client_id: ID(4), client_name: 'Marek', rating: 5, body: 'Konečne viem, čo jesť na naberanie. Sila ide hore každý týždeň.', created_at: at(9, 18) });
// tréner sám tiež zapisuje (obrazovka Dnes nie je prázdna)
for (let n = 20; n >= 0; n--) {
  if (rnd() < 0.85 || n === 0) foodsFor(TR, n, 2700, n === 0 ? 0.62 : 1);
  if (rnd() < 0.6) T.weight_logs.push({ id: next(), user_id: TR, date: iso(ago(n)), weight_kg: r1(84 - (20 - n) * 0.03 + (rnd() - 0.5) * 0.5), created_at: at(n, 7) });
}
T.food_logs = T.food_logs.filter(f => !(f.user_id === TR && f.date === iso(ago(0)) && (f.meal === 'dinner' || f.meal === 'snack')));

// ---------- fotky (ilustračné siluety, nie skutoční ľudia) ----------
function photoSvg(ci, i) {
  const hue = [160, 200, 140, 280, 30, 330][ci] || 180, w = [1, 0.96, 0.92][i];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue},35%,26%)"/><stop offset="1" stop-color="hsl(${hue},40%,12%)"/></linearGradient></defs><rect width="300" height="400" fill="url(#g)"/><g fill="hsla(${hue},60%,85%,.55)" transform="translate(150 0) scale(${w} 1) translate(-150 0)"><circle cx="150" cy="78" r="34"/><path d="M96 128q54-20 108 0l14 120q-10 8-22 6l-6 136h-34l-6-110-6 110h-34l-6-136q-12 2-22-6z"/></g><text x="150" y="388" font-family="sans-serif" font-size="13" fill="rgba(255,255,255,.6)" text-anchor="middle">Ukážková fotka</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// ---------- týždenný report (zjednodušene ako v databáze) ----------
function weekStats(uid, f) {
  const p = T.profiles.find(x => x.id === uid) || {}, days = Array.from({ length: 7 }, (_, i) => { const d = new Date(f + 'T12:00'); d.setDate(d.getDate() + i); return iso(d); });
  const fd = T.food_logs.filter(x => x.user_id === uid && days.includes(x.date)), byDay = {};
  fd.forEach(x => { const b = byDay[x.date] = byDay[x.date] || { k: 0, p: 0 }; b.k += Number(x.kcal); b.p += Number(x.protein); });
  const logged = Object.keys(byDay).length, vals = Object.values(byDay);
  const inGoal = vals.filter(b => p.target_kcal && Math.abs(b.k / p.target_kcal - 1) <= 0.1).length, protOk = vals.filter(b => b.p >= (p.target_protein || 0) * 0.9).length;
  const trn = T.workout_logs.filter(x => x.user_id === uid && x.done && days.includes(x.date)).length, ws = T.weight_logs.filter(x => x.user_id === uid && days.includes(x.date));
  const ci = T.checkins.filter(x => x.user_id === uid && days.includes(x.date));
  const parts = { log: logged / 7, kcal: inGoal / 7, training: p.training_days ? Math.min(1, trn / p.training_days) : 0, protein: protOk / 7, weigh: Math.min(1, ws.length / 3) };
  const score = Math.round(parts.log * 30 + parts.kcal * 25 + parts.training * 20 + parts.protein * 15 + parts.weigh * 10);
  const avg = (a, k) => a.length ? a.reduce((s, x) => s + Number(x[k]), 0) / a.length : null;
  return { score, parts, days_logged: logged, in_goal: inGoal, kcal_avg: logged ? Math.round(vals.reduce((s, b) => s + b.k, 0) / logged) : null, protein_avg: logged ? Math.round(vals.reduce((s, b) => s + b.p, 0) / logged) : null,
    target_kcal: p.target_kcal, target_protein: p.target_protein, trainings: trn, training_goal: p.training_days, weigh_ins: ws.length, weight_avg: ws.length ? r1(avg(ws, 'weight_kg')) : null,
    sleep_avg: ci.length ? r1(avg(ci, 'sleep_h')) : null, steps_avg: ci.length ? Math.round(avg(ci, 'steps')) : null };
}
function weeklyReport({ p_user, p_from }) {
  const f = wk(p_from ? new Date(p_from + 'T12:00') : new Date()), pf = (() => { const d = new Date(f + 'T12:00'); d.setDate(d.getDate() - 7); return iso(d); })();
  const cur = weekStats(p_user, f), prev = weekStats(p_user, pf), p = T.profiles.find(x => x.id === p_user) || {};
  const lost = { log: (1 - cur.parts.log) * 30, kcal: (1 - cur.parts.kcal) * 25, protein: (1 - cur.parts.protein) * 15, training: (1 - cur.parts.training) * 20, weigh: (1 - cur.parts.weigh) * 10 };
  const focus = Object.entries(lost).sort((a, b) => b[1] - a[1])[0][0];
  const ci = T.weekly_checkins.find(x => x.user_id === p_user && x.week_start === f);
  return { ...cur, prev_score: prev.score, prev_weight_avg: prev.weight_avg, prev_kcal_avg: prev.kcal_avg, focus, name: p.name, goal: p.goal, checkin: ci ? (({ id, user_id, ...r }) => r)(ci) : null };
}

// ---------- dotazy ----------
const cmpv = v => (v === null || v === undefined ? '' : v);
function parseOr(s) {
  return String(s).split(',').map(t => { const m = /^([a-z_]+)\.(eq|neq|ilike|like|gte|lte|gt|lt|is)\.(.*)$/.exec(t.trim()); return m && { c: m[1], op: m[2], v: m[3] }; }).filter(Boolean);
}
const test = (r, c, op, v) => {
  const x = r[c];
  switch (op) {
    case 'eq': return String(x) === String(v); case 'neq': return String(x) !== String(v);
    case 'gt': return cmpv(x) > v; case 'gte': return cmpv(x) >= v; case 'lt': return cmpv(x) < v; case 'lte': return cmpv(x) <= v;
    case 'is': return v === null || v === 'null' ? x == null : x === v; case 'in': return v.map(String).includes(String(x));
    case 'ilike': case 'like': return new RegExp('^' + String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$', 'i').test(String(x ?? ''));
    default: return true;
  }
};
function query(table) {
  const st = { f: [], ord: [], lim: null, rng: null, single: null, op: 'select', rows: null, head: false, count: false, conflict: null, ret: false };
  const rowsOf = () => (T[table] = T[table] || []);
  const match = r => st.f.every(fn => fn(r));
  const run = () => {
    const tbl = rowsOf(); let out;
    if (st.op === 'insert' || st.op === 'upsert') {
      out = (Array.isArray(st.rows) ? st.rows : [st.rows]).map(r0 => {
        const keys = (st.conflict || (table === 'profiles' ? 'id' : table === 'trainer_profiles' ? 'user_id' : '')).split(',').filter(Boolean);
        const ex = st.op === 'upsert' && keys.length ? tbl.find(t => keys.every(k => String(t[k]) === String(r0[k]))) : null;
        if (ex) { Object.assign(ex, r0); return ex; }
        const r = { id: next(), created_at: new Date().toISOString(), ...r0 }; tbl.push(r); return r;
      });
    } else if (st.op === 'update') { out = tbl.filter(match); out.forEach(r => Object.assign(r, st.rows)); }
    else if (st.op === 'delete') { out = tbl.filter(match); T[table] = tbl.filter(r => !match(r)); }
    else out = tbl.filter(match);
    out = out.map(r => ({ ...r }));
    for (const [c, asc] of st.ord.slice().reverse()) out.sort((a, b) => (cmpv(a[c]) > cmpv(b[c]) ? 1 : cmpv(a[c]) < cmpv(b[c]) ? -1 : 0) * (asc ? 1 : -1));
    const count = out.length;
    if (st.rng) out = out.slice(st.rng[0], st.rng[1] + 1);
    if (st.lim != null) out = out.slice(0, st.lim);
    if (st.op !== 'select' && !st.ret) return { data: null, error: null, count };
    if (st.single) return out.length || st.single === 'maybe' ? { data: out[0] || null, error: null } : { data: null, error: { message: 'Nenašlo sa', code: 'PGRST116' } };
    return { data: st.head ? null : out, error: null, count };
  };
  const b = new Proxy({}, {
    get(_, k) {
      if (k === 'then') return (a, c) => new Promise(r => setTimeout(() => r(run()), 60)).then(a, c);
      if (k === 'catch') return c => b.then(undefined, c);
      if (k === 'finally') return f => b.then(v => { f(); return v; });
      switch (k) {
        case 'select': return (_c, o) => { if (st.op !== 'select') st.ret = true; if (o?.head) st.head = true; return b; };
        case 'insert': return rows => { st.op = 'insert'; st.rows = rows; return b; };
        case 'upsert': return (rows, o) => { st.op = 'upsert'; st.rows = rows; st.conflict = o?.onConflict || null; return b; };
        case 'update': return patch => { st.op = 'update'; st.rows = patch; return b; };
        case 'delete': return () => { st.op = 'delete'; return b; };
        case 'eq': case 'neq': case 'gt': case 'gte': case 'lt': case 'lte': case 'like': case 'ilike': case 'is': case 'in':
          return (c, v) => { st.f.push(r => test(r, c, k, v)); return b; };
        case 'or': return s => { const cs = parseOr(s); if (cs.length) st.f.push(r => cs.some(x => test(r, x.c, x.op, x.v))); return b; };
        case 'match': return o => { Object.entries(o).forEach(([c, v]) => st.f.push(r => test(r, c, 'eq', v))); return b; };
        case 'order': return (c, o) => { st.ord.push([c, o?.ascending !== false]); return b; };
        case 'limit': return n => { st.lim = n; return b; };
        case 'range': return (a, z) => { st.rng = [a, z]; return b; };
        case 'single': return () => { st.single = 'one'; return b; };
        case 'maybeSingle': return () => { st.single = 'maybe'; return b; };
        default: return () => b; // not, contains, textSearch, filter… v ukážke netreba
      }
    },
  });
  return b;
}

// ---------- klient ----------
const user = { id: TR, email: 'ukazka@gaintrain.app', user_metadata: { name: trainer.name }, app_metadata: {}, aud: 'authenticated', created_at: at(40, 10) };
const session = { user, access_token: 'demo', refresh_token: 'demo', expires_at: Math.floor(Date.now() / 1000) + 86400 * 365, token_type: 'bearer' };
const ok = data => Promise.resolve({ data, error: null });
const off = () => Promise.resolve({ data: null, error: { message: 'V ukážke táto funkcia nie je dostupná.' } });

export function createClient(url, key) {
  let real = null; // len na hľadanie potravín: verejný zoznam, bez prihlásenia, nič sa neukladá
  const realClient = async () => {
    if (real) return real;
    const m = await import('./vendor/supabase.mjs').catch(() => null); if (!m) return null;
    const mem = {}; real = m.createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, storage: { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; }, removeItem: k => { delete mem[k]; } } } });
    return real;
  };
  return {
    from: t => query(t),
    rpc(name, args = {}) {
      if (name === 'weekly_report') return ok(weeklyReport(args));
      if (name === 'weekly_reports_all') return ok([]);
      if (name === 'trainer_stats') return ok([{ trainer_id: TR, reviews: T.trainer_reviews.length, avg_rating: 5 }]);
      if (name === 'is_admin') return ok(false);
      if (/^search_foods|^img_for_names$|^food_used$/.test(name)) return realClient().then(c => c ? c.rpc(name, args) : { data: [], error: null }).catch(() => ({ data: [], error: null }));
      if (name === 'link_trainer_by_code') return off();
      return ok(null);
    },
    auth: {
      getSession: () => ok({ session }), getUser: () => ok({ user }), refreshSession: () => ok({ session, user }),
      onAuthStateChange: cb => { setTimeout(() => { try { cb('INITIAL_SESSION', session); } catch (_) { } }, 0); return { data: { subscription: { unsubscribe() { } } } }; },
      signOut: () => { window.__fwDemoExit?.(); return ok(null); },
      updateUser: () => ok({ user }), signInWithPassword: off, signUp: off, signInWithOAuth: off, signInWithIdToken: off, resetPasswordForEmail: off, setSession: () => ok({ session }),
    },
    storage: {
      from: bucket => ({
        createSignedUrls: (paths) => ok(paths.map(p => { const m = /^demo\/(\d+)\/(\d+)\.svg$/.exec(p); return { path: p, signedUrl: m ? photoSvg(+m[1], +m[2]) : '', error: null }; })),
        createSignedUrl: p => { const m = /^demo\/(\d+)\/(\d+)\.svg$/.exec(p); return ok({ signedUrl: m ? photoSvg(+m[1], +m[2]) : '' }); },
        upload: off, remove: () => ok([]), getPublicUrl: () => ({ data: { publicUrl: '' } }), list: () => ok([]),
      }),
    },
    functions: { invoke: off },
    channel: () => { const ch = { on: () => ch, subscribe: () => ch, unsubscribe() { } }; return ch; },
    removeChannel() { }, removeAllChannels() { },
  };
}
export default { createClient };
