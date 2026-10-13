// Stravovacie režimy: nastavenia, hodnotenie jedál (lepok, laktóza, alergény, cukrovka, soľ),
// prevod údajov z Open Food Facts, výpočty glykémie a spoločné štýly. Bez závislosti na app.js.
import * as db from './data.js';

export const MODES = {
  diabetes: { icon: '🩸', title: 'Cukrovka', sub: 'Sacharidy a sacharidové jednotky, glykémia, nízky cukor, správa pre lekára' },
  celiac: { icon: '🌾', title: 'Celiakia', sub: 'Bezlepková diéta: každé jedlo s lepkom je označené' },
  lactose: { icon: '🥛', title: 'Intolerancia laktózy', sub: 'Jedlá s laktózou, s malým obsahom a bez nej' },
  allergy: { icon: '🥜', title: 'Alergia na potraviny', sub: 'Vyberieš si svoje alergény a appka ich stráži' },
  salt: { icon: '🧂', title: 'Vysoký tlak', sub: 'Stráženie soli a upozornenie na veľmi slané jedlá' },
};
export const ALLERGENS = [['gluten', 'Lepok'], ['milk', 'Mlieko'], ['egg', 'Vajcia'], ['peanut', 'Arašidy'], ['nuts', 'Orechy'], ['soy', 'Soja'], ['fish', 'Ryby'],
  ['crustaceans', 'Kôrovce'], ['molluscs', 'Mäkkýše'], ['sesame', 'Sezam'], ['celery', 'Zeler'], ['mustard', 'Horčica'], ['lupin', 'Lupina'], ['sulphites', 'Siričitany']];
const AL_NAME = Object.fromEntries(ALLERGENS.map(([k, v]) => [k, v.toLowerCase()]));
export const alName = k => AL_NAME[k] || k;

// cieľové rozsahy glykémie (mmol/l): lo = hranica nízkeho cukru, hi = horná hranica dobrého rozsahu, fast = horná hranica nalačno
export const DTYPES = {
  t1: { label: '1. typ', lo: 3.9, hi: 10, fast: 7, insulin: true },
  t2: { label: '2. typ', lo: 3.9, hi: 10, fast: 7, insulin: false },
  pre: { label: 'Prediabetes, inzulínová rezistencia', lo: 3.9, hi: 7.8, fast: 5.6, insulin: false },
  gdm: { label: 'Tehotenská cukrovka', lo: 3.9, hi: 7.8, fast: 5.3, insulin: false },
};
export const DEF = { modes: [], dtype: 't2', unit: 'mmol', lo: 3.9, hi: 10, fast: 7, sj: 10, mealCarb: null, insulin: false, allergens: [], hide: false, consent: null };

// ---------- nastavenia (databáza + lokálna kópia, aby sa jedlá dali označiť hneď) ----------
const LS = uid => 'dd_dx_' + uid;
let cache = null, cacheUid = null, loaded = null;
const lsGet = uid => { try { return JSON.parse(localStorage.getItem(LS(uid))); } catch (_) { return null; } };
const lsSet = (uid, v) => { try { localStorage.setItem(LS(uid), JSON.stringify(v)); } catch (_) { /* súkromný režim */ } };
const merge = c => ({ ...DEF, ...(c || {}), modes: Array.isArray(c?.modes) ? c.modes : [], allergens: Array.isArray(c?.allergens) ? c.allergens : [] });

export function cfg() { return cache ? cache : merge(null); }
export const active = (m, c = cfg()) => c.modes.includes(m);
export const anyMode = (c = cfg()) => c.modes.length > 0;

export async function ensure(uid) {
  if (!uid) return cfg();
  if (cacheUid === uid && loaded) return loaded;
  if (cacheUid !== uid) { cache = merge(lsGet(uid)); cacheUid = uid; }
  loaded = (async () => {
    try {
      const { data, error } = await db.sb.from('diet_settings').select('cfg').eq('user_id', uid).maybeSingle();
      if (!error) { cache = merge(data?.cfg); lsSet(uid, cache); }
    } catch (_) { /* tabuľka ešte nemusí existovať, ostaneme pri lokálnej kópii */ }
    return cache;
  })();
  return loaded;
}
export function forget() { cache = null; cacheUid = null; loaded = null; }

export async function saveCfg(uid, patch) {
  const next = merge({ ...cfg(), ...patch });
  const { error } = await db.sb.from('diet_settings').upsert({ user_id: uid, cfg: next, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw new Error(/relation|does not exist|schema cache/i.test(error.message) ? 'Databáza ešte nie je pripravená na režimy. Skús to o chvíľu.' : error.message);
  cache = next; cacheUid = uid; loaded = Promise.resolve(next); lsSet(uid, next);
  return next;
}

// ---------- hodnotenie jedla ----------
const n1 = v => String(Math.round(Number(v) * 10) / 10).replace('.', ',');
const has = (a, k) => Array.isArray(a) && a.includes(k);
const list = a => a.map(alName).join(', ');

// vráti zoznam {mode, level: ok|warn|bad|unk, short, text, more}
export function assess(f, c = cfg()) {
  const out = [], A = f.allergens, T = f.traces, known = Array.isArray(A);
  if (active('celiac', c)) {
    let r;
    if (f.gluten === 'contains' || has(A, 'gluten')) r = ['bad', 'Lepok', 'Obsahuje lepok', 'Tomuto jedlu sa vyhni. Lepok je v pšenici, raži, jačmeni, ovse a špalde.'];
    else if (f.gluten === 'traces' || has(T, 'gluten')) r = ['warn', 'Stopy lepku', 'Môže obsahovať stopy lepku', 'Výrobca uvádza možnú krížovú kontamináciu. Pri celiakii sa to berie vážne.'];
    else if (f.gluten === 'free') r = ['ok', 'Bez lepku', 'Bez lepku', 'Prirodzene bez lepku alebo označené výrobcom. Pri balených produktoch si aj tak pozri obal.'];
    else if (known) r = ['warn', 'Over obal', 'Lepok nie je v zložení uvedený', 'Lepok sme v zložení nenašli, ale nie je to označené ako bezlepkové. Over obal (prečiarknutý klas alebo text „bez lepku“).'];
    else r = ['unk', 'Neoverené', 'Lepok zatiaľ neoverený', 'O tomto jedle nemáme údaj o lepku. Over zloženie na obale alebo sa spýtaj v prevádzke.'];
    out.push({ mode: 'celiac', level: r[0], short: r[1], text: r[2], more: r[3] });
  }
  if (active('lactose', c)) {
    let r;
    if (f.lactose === 'high' || (f.lactose == null && has(A, 'milk'))) r = ['bad', 'Laktóza', 'Obsahuje laktózu', 'Obsahuje mlieko alebo mliečne zložky s laktózou.'];
    else if (f.lactose === 'low') r = ['warn', 'Málo laktózy', 'Malý obsah laktózy', 'Dlho zrejúce syry a maslo majú laktózy veľmi málo. Väčšina ľudí ich znáša, ty to poznáš najlepšie.'];
    else if (f.lactose === 'free') r = ['ok', 'Bez laktózy', 'Bez laktózy', 'Bez laktózy alebo bez mliečnych zložiek.'];
    else if (known) r = ['ok', 'Bez mlieka', 'Bez mliečnych zložiek', 'Mlieko v zložení nie je uvedené. Pri balených produktoch si pozri obal.'];
    else r = ['unk', 'Neoverené', 'Laktóza zatiaľ neoverená', 'O tomto jedle nemáme údaj o laktóze. Over zloženie na obale.'];
    out.push({ mode: 'lactose', level: r[0], short: r[1], text: r[2], more: r[3] });
  }
  if (active('allergy', c) && c.allergens.length) {
    const sel = c.allergens;
    const hit = known ? sel.filter(k => A.includes(k)) : (f.gluten === 'contains' && sel.includes('gluten') ? ['gluten'] : []);
    const tr = Array.isArray(T) ? sel.filter(k => T.includes(k) && !hit.includes(k)) : [];
    let r;
    if (hit.length) r = ['bad', 'Alergén', 'Obsahuje: ' + list(hit), 'Obsahuje alergén, ktorý máš v zozname. Tomuto jedlu sa vyhni.'];
    else if (tr.length) r = ['warn', 'Stopy', 'Môže obsahovať stopy: ' + list(tr), 'Výrobca uvádza možnú krížovú kontamináciu s tvojím alergénom.'];
    else if (known) r = ['ok', 'Bez tvojich alergénov', 'Bez tvojich alergénov', 'Vo vyhlásenom zložení tvoje alergény nie sú. Pri alergii vždy skontroluj aj obal.'];
    else r = ['unk', 'Neoverené', 'Alergény zatiaľ neoverené', 'O tomto jedle nemáme úplný zoznam alergénov. Over zloženie na obale.'];
    out.push({ mode: 'allergy', level: r[0], short: r[1], text: r[2], more: r[3] });
  }
  if (active('diabetes', c)) {
    const carbs = Number(f.carbs) || 0, sug = f.sugar == null ? null : Number(f.sugar), gi = f.gi == null ? null : Number(f.gi);
    let r = null;
    if (sug != null && sug >= 22.5) r = ['warn', 'Veľa cukru', 'Veľa cukru: ' + n1(sug) + ' g na 100 g', 'Rýchle cukry zdvihnú glykémiu najrýchlejšie. Zváž menšiu porciu alebo kombináciu s bielkovinami a vlákninou.'];
    else if (gi != null) r = [gi >= 70 ? 'warn' : 'ok', 'GI ' + gi, (gi >= 70 ? 'Vysoký' : gi >= 56 ? 'Stredný' : 'Nízky') + ' glykemický index (' + gi + ')', 'Glykemický index ukazuje, ako rýchlo sacharidy zdvihnú glykémiu. Orientačná hodnota, u každého je to trochu iné.'];
    else if (carbs < 5) r = ['ok', 'Málo sacharidov', 'Málo sacharidov: ' + n1(carbs) + ' g na 100 g', 'Takmer nezdvíha glykémiu.'];
    if (r) out.push({ mode: 'diabetes', level: r[0], short: r[1], text: r[2], more: r[3] });
  }
  if (active('salt', c) && f.salt != null) {
    const s = Number(f.salt);
    if (s > 1.5) out.push({ mode: 'salt', level: 'bad', short: 'Veľa soli', text: 'Veľa soli: ' + n1(s) + ' g na 100 g', more: 'Viac ako 1,5 g soli na 100 g je veľa. Odporúčaný denný strop je 5 g soli.' });
    else if (s <= 0.3) out.push({ mode: 'salt', level: 'ok', short: 'Málo soli', text: 'Málo soli: ' + n1(s) + ' g na 100 g', more: 'Do 0,3 g soli na 100 g je málo.' });
  }
  return out;
}
export const isBad = (f, c = cfg()) => assess(f, c).some(x => x.level === 'bad' && x.mode !== 'salt' && x.mode !== 'diabetes');
const ICON = { ok: '✓', warn: '!', bad: '✕', unk: '?' };
export function chips(f, c = cfg()) {
  const rank = { bad: 0, warn: 1, ok: 2, unk: 3 };
  const a = assess(f, c).sort((x, y) => rank[x.level] - rank[y.level]); if (!a.length) return '';
  return `<div class="dxs">${a.slice(0, 3).map(x => `<span class="dx ${x.level}">${ICON[x.level]} ${x.short}</span>`).join('')}</div>`;
}

// ---------- Open Food Facts -> značky ----------
const AL_MAP = { 'en:gluten': 'gluten', 'en:milk': 'milk', 'en:eggs': 'egg', 'en:peanuts': 'peanut', 'en:nuts': 'nuts', 'en:soybeans': 'soy', 'en:fish': 'fish',
  'en:crustaceans': 'crustaceans', 'en:molluscs': 'molluscs', 'en:sesame-seeds': 'sesame', 'en:celery': 'celery', 'en:mustard': 'mustard', 'en:lupin': 'lupin', 'en:sulphur-dioxide-and-sulphites': 'sulphites' };
const GLUTEN_RE = /(pšeni|pšenič|\braž|ražn|jačmeň|jačmen|\bovos|\bovsen|špald|lepok|lepku|jačmenn\w* slad|sladov|\bmalt\b|semolin|kuskus|couscous|bulgur|seitan|\bwheat|\brye\b|\bbarley|\boats?\b|\bspelt|gluten|weizen|roggen|gerste|hafer)/i;
export function offTags(p) {
  const tag = a => [...new Set((Array.isArray(a) ? a : []).map(x => AL_MAP[x]).filter(Boolean))];
  const ing = String(p.ingredients_text_sk || p.ingredients_text_cs || p.ingredients_text || p.ingredients_text_en || '');
  const declared = Array.isArray(p.allergens_tags) && p.allergens_tags.length > 0;
  let allergens = ing.trim().length > 8 || declared ? tag(p.allergens_tags) : null;
  if (allergens && !allergens.includes('gluten') && GLUTEN_RE.test(ing) && !/bez lepku|gluten[- ]?free|bezlepk/i.test(ing)) allergens = [...allergens, 'gluten'];
  const traces = Array.isArray(p.traces_tags) ? tag(p.traces_tags) : null;
  const labels = Array.isArray(p.labels_tags) ? p.labels_tags : [];
  const nm = String(p.product_name_sk || p.product_name || '').toLowerCase();
  let gluten = null;
  if (allergens && allergens.includes('gluten')) gluten = 'contains';
  else if (traces && traces.includes('gluten')) gluten = 'traces';
  else if (labels.includes('en:gluten-free') || labels.includes('en:no-gluten') || /bez ?lepk|bezlepk/.test(nm)) gluten = 'free';
  let lactose = null;
  if (labels.includes('en:lactose-free') || labels.includes('en:no-lactose') || /bez ?laktóz|bezlaktóz|bez ?laktoz/.test(nm)) lactose = 'free';
  else if (allergens && allergens.includes('milk')) lactose = 'high';
  return { gluten, lactose, allergens, traces };
}

// ---------- sacharidy a glykémia ----------
export const carbsOf = (f, g) => (Number(f.carbs) || 0) * g / 100;
export const sjOf = (carbs, c = cfg()) => carbs / (Number(c.sj) || 10);
export const gl = (gi, carbs) => gi == null ? null : gi * carbs / 100;
export const giClass = gi => gi >= 70 ? 'high' : gi >= 56 ? 'mid' : 'low';
export const glClass = v => v >= 20 ? 'high' : v >= 11 ? 'mid' : 'low';

export const MG = 18.016;
export const toUnit = (mmol, unit) => unit === 'mgdl' ? Math.round(mmol * MG) : Math.round(mmol * 10) / 10;
export const fmtG = (mmol, unit) => unit === 'mgdl' ? String(Math.round(mmol * MG)) : (Math.round(mmol * 10) / 10).toFixed(1).replace('.', ',');
export const unitLbl = unit => unit === 'mgdl' ? 'mg/dl' : 'mmol/l';
export const fromUnit = (v, unit) => unit === 'mgdl' ? Math.round(v / MG * 10) / 10 : Math.round(v * 10) / 10;
// trieda hodnoty: vlow, low, in, high, vhigh
export function gclass(v, c = cfg()) {
  if (v < 3) return 'vlow';
  if (v < c.lo) return 'low';
  if (v <= c.hi) return 'in';
  if (v <= 13.9) return 'high';
  return 'vhigh';
}
export const GCOL = { vlow: '#FF5C7A', low: '#FF8A5B', in: '#7CFFB2', high: '#FFC857', vhigh: '#FF5C7A' };
export const CTX = { fasting: 'Nalačno', before: 'Pred jedlom', after: 'Po jedle', bedtime: 'Pred spaním', night: 'V noci', other: 'Iné' };

export function stats(rows, c = cfg()) {
  const v = rows.map(r => Number(r.mmol)).filter(x => x > 0);
  const n = v.length; if (!n) return null;
  const mean = v.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  const below = v.filter(x => x < c.lo).length, above = v.filter(x => x > c.hi).length;
  return { n, mean, sd, cv: mean ? sd / mean * 100 : 0, tir: (n - below - above) / n * 100, below: below / n * 100, above: above / n * 100, lows: below, severe: v.filter(x => x < 3).length, min: Math.min(...v), max: Math.max(...v) };
}

export async function fetchGlucose(uid, fromDate, toDate) {
  const q = db.sb.from('glucose_logs').select('id,date,at,mmol,ctx,meal,insulin,note,hypo').eq('user_id', uid).gte('date', fromDate);
  const { data, error } = await (toDate ? q.lte('date', toDate) : q).order('at', { ascending: true }).limit(5000);
  if (error) throw new Error(error.message);
  return data || [];
}

// ---------- panel v okne „Pridať jedlo“ ----------
// pod výpočtom kalórií ukáže, čo jedlo znamená pre zvolené režimy; pri cukrovke prepočíta na zvolené množstvo
export function attachSheet(bg, food, o) {
  const c = cfg(); if (!anyMode(c)) return null;
  const host = bg.querySelector('#calc'); if (!host) return null;
  const box = document.createElement('div'); box.className = 'dxp'; host.after(box);
  let mealCarbs = null;
  if (active('diabetes', c) && c.mealCarb) {
    db.sb.from('food_logs').select('carbs').eq('user_id', o.uid).eq('date', o.date).eq('meal', o.meal)
      .then(({ data }) => { mealCarbs = (data || []).reduce((a, r) => a + Number(r.carbs || 0), 0); draw(); }, () => { });
  }
  const draw = () => {
    const g = o.grams() || 0, parts = [];
    for (const a of assess(food, c)) {
      if (a.mode === 'diabetes' || a.mode === 'salt') continue;
      parts.push(`<div class="dxb ${a.level}"><b>${a.text}</b>${a.level === 'bad' || a.level === 'warn' ? `<span>${a.more}</span>` : ''}</div>`);
    }
    if (active('diabetes', c)) {
      const cb = carbsOf(food, g), sj = sjOf(cb, c), gi = food.gi == null ? null : Number(food.gi), gv = gl(gi, cb);
      const sug = food.sugar == null ? null : Number(food.sugar) * g / 100, fib = food.fiber == null ? null : Number(food.fiber) * g / 100;
      let extra = '';
      if (c.mealCarb) {
        const tot = (mealCarbs || 0) + cb, left = c.mealCarb - tot;
        extra = `<span>V tomto jedle: ${n1(mealCarbs || 0)} g + ${n1(cb)} g = <em class="dxe">${n1(tot)} g</em> z cieľa ${c.mealCarb} g (${left >= 0 ? 'zostáva ' + n1(left) : 'o ' + n1(-left) + ' g viac'}).</span>`;
      }
      parts.push(`<div class="dxb"><b>Sacharidy v tomto množstve</b><div class="dxn"><div><b>${n1(cb)} g</b><small>sacharidy</small></div><div><b>${n1(sj)}</b><small>SJ</small></div>`
        + `<div class="${gi == null ? '' : giClass(gi)}"><b>${gi == null ? '–' : gi}</b><small>GI</small></div><div class="${gv == null ? '' : glClass(gv)}"><b>${gv == null ? '–' : Math.round(gv)}</b><small>GZ</small></div></div>`
        + `<span>${sug != null ? 'Cukry ' + n1(sug) + ' g' : 'Cukry bez údaja'}${fib != null ? ' · vláknina ' + n1(fib) + ' g' : ''}. SJ = sacharidová jednotka (${c.sj} g). GI a GZ (glykemická záťaž) sú orientačné.</span>${extra}</div>`);
    }
    if (active('salt', c) && food.salt != null) {
      const s = Number(food.salt) * g / 100, lvl = Number(food.salt) > 1.5 ? 'bad' : Number(food.salt) > 0.3 ? 'warn' : 'ok';
      parts.push(`<div class="dxb ${lvl}"><b>Soľ: ${n1(s)} g (${Math.round(s / 5 * 100)} % denného stropu 5 g)</b>${lvl === 'bad' ? '<span>Veľa soli na 100 g.</span>' : ''}</div>`);
    }
    box.innerHTML = parts.join('');
  };
  draw();
  return draw;
}

// ---------- štýly ----------
const CSS = `
.dxs{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
.dx{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;white-space:nowrap}
.dx.ok{background:rgba(124,255,178,.14);color:#7CFFB2}.dx.warn{background:rgba(255,200,87,.15);color:#FFC857}.dx.bad{background:rgba(255,92,122,.17);color:#FF5C7A}.dx.unk{background:var(--bg-2);color:var(--muted)}
.dxp{margin-top:12px;display:flex;flex-direction:column;gap:8px}
.dxb{border-radius:14px;padding:10px 12px;background:var(--bg-2);border-left:3px solid var(--line)}
.dxb.ok{border-color:#7CFFB2}.dxb.warn{border-color:#FFC857}.dxb.bad{border-color:#FF5C7A;background:rgba(255,92,122,.08)}
.dxb b{display:block;font-size:14px}.dxb span{display:block;font-size:12.5px;color:var(--muted);margin-top:2px;line-height:1.35}
.dxb.bad b{color:#FF5C7A}
.dxe{font-style:normal;font-weight:700;color:var(--text)}
.dxn{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px}
.dxn div{background:var(--card);border-radius:10px;padding:8px 4px;text-align:center}
.dxn b{display:block;font-size:15px;font-variant-numeric:tabular-nums}.dxn small{font-size:10.5px;color:var(--muted)}
.dxn .lo b{color:#7CFFB2}.dxn .mid b{color:#FFC857}.dxn .hi b{color:#FF5C7A}
.dxh{font-size:12.5px;color:var(--muted);margin:0 0 8px}
.dxf{display:flex;gap:8px;align-items:center;margin:0 0 10px;font-size:13px;color:var(--muted)}
.dxf button{border:0;background:var(--bg-2);color:var(--text);border-radius:99px;padding:6px 12px;font-size:12.5px;font-weight:600;cursor:pointer}
.dxf button.on{background:var(--accent);color:var(--accent-ink)}
`;
if (typeof document !== 'undefined' && !document.getElementById('dx-core-css')) { const s = document.createElement('style'); s.id = 'dx-core-css'; s.textContent = CSS; document.head.appendChild(s); }
