// Recepty (v156): tlačidlo Recept otvorí okno s dvoma záložkami.
//  In:špiruj sa = knižnica takmer 600 receptov zo Slovenska, Čech, celéj Európy aj sveta s reálnymi fotkami,
//   filter podľa jedla a krajiny, vyhľadávanie podľa názvu, suroviny aj krajiny, radenie podľa bielkovín alebo kalórií. Karta receptu má porcie, makrá, vplyv na deň, suroviny a postup.
//  Môj recept = vlastný recept z surovín (pôvodný editor).
import * as db from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';
import { RECIPES, CATS, CUIS } from './recipes.all.js';
import { photoOf, photoBackup, creditOf, allCredits } from './recipes.photos2.js';
import './foodsheet.js';
import * as dx from './dxcore.js';
import { recipeTags, tagsOf, fit, DIETS } from './dietcore.js';

const h = (...a) => ctx.h(...a), sheet = (...a) => ctx.sheet(...a);
const MEALS = () => ctx.MEALS;
const r0 = v => Math.round(Number(v || 0));
const r1 = v => Math.round(Number(v || 0) * 10) / 10;
const fmt = v => String(r1(v)).replace('.', ',');

const CSS = `
.rh .rh-dx{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:10px 0 0;font-size:12.5px;color:var(--muted)}
.rh .rh-dx:empty{display:none}
.rh .rh-dx button{flex:none;border:0;background:transparent;color:var(--accent);font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;padding:4px 0}
.rh .rh-mk{position:absolute;top:8px;left:8px;z-index:2;padding:3px 8px;border-radius:99px;font-size:11px;font-weight:700;background:rgba(10,14,20,.78);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.rh .rh-mk.bad{color:#FF8FA4}.rh .rh-mk.warn{color:#FFC857}
.rh .rh-fit{margin:12px 0 0;padding:11px 13px;border-radius:15px;border:1px solid var(--line);border-left-width:3px;background:var(--bg-2);display:grid;gap:3px}
.rh .rh-fit b{font-size:14px}.rh .rh-fit span{font-size:12.5px;line-height:1.4;color:var(--muted)}.rh .rh-fit em{font-style:normal;font-size:11.5px;color:var(--muted);opacity:.85}
.rh .rh-fit.ok{border-left-color:#7CFFB2}.rh .rh-fit.warn{border-left-color:#FFC857}.rh .rh-fit.bad{border-left-color:#FF5C7A;background:rgba(255,92,122,.08)}
html[data-theme=light] .rh .rh-fit.bad b{color:#c02448}html[data-theme=light] .rh .rh-mk{background:rgba(255,255,255,.88)}
html[data-theme=light] .rh .rh-mk.bad{color:#c02448}html[data-theme=light] .rh .rh-mk.warn{color:#8a5a00}
.rh{min-height:calc(88vh - 40px)}
.rh .rh-seg{margin:14px 0 0}
.rh .rh-hd{display:flex;align-items:center;justify-content:space-between}
.rh .rh-q{width:100%;box-sizing:border-box;margin-top:12px;height:46px;border-radius:14px;border:1px solid var(--line);background:var(--bg-2);color:var(--text);padding:0 14px 0 42px;font:inherit;font-size:15px;outline:none;-webkit-appearance:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%238a93a6' stroke-width='2.4' stroke-linecap='round'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='M20 20l-3.5-3.5'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:14px 50%}
.rh .rh-q:focus{border-color:var(--accent)}
.rh .rh-q::-webkit-search-cancel-button{-webkit-appearance:none}
.rh .rh-cats,.rh .rh-cuis,.rh .rh-sort{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:12px -16px 0;padding:0 16px 2px}
.rh .rh-cats::-webkit-scrollbar,.rh .rh-cuis::-webkit-scrollbar,.rh .rh-sort::-webkit-scrollbar{display:none}
.rh .rh-cuis{margin-top:8px}
.rh .rh-cuis button{flex:none;border:0;background:transparent;color:var(--muted);border-radius:99px;padding:6px 11px;font-size:12.5px;font-weight:650;cursor:pointer;white-space:nowrap;box-shadow:inset 0 0 0 1px var(--line)}
.rh .rh-cuis button.on{background:color-mix(in srgb,var(--accent) 16%,transparent);color:var(--accent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 45%,transparent)}
.rh .rh-more{height:1px}
.rh .rh-cats button{flex:none;border:1px solid var(--line);background:transparent;color:var(--muted);border-radius:99px;padding:7px 14px;font-size:13px;font-weight:650;cursor:pointer;white-space:nowrap}
.rh .rh-cats button.on{background:var(--text);color:var(--bg);border-color:var(--text)}
.rh .rh-sort{margin-top:8px;align-items:center}
.rh .rh-sort span{flex:none;font-size:12px;color:var(--muted);font-weight:600}
.rh .rh-sort button{flex:none;border:0;background:var(--bg-2);color:var(--muted);border-radius:10px;padding:6px 11px;font-size:12.5px;font-weight:650;cursor:pointer;white-space:nowrap}
.rh .rh-sort button.on{background:color-mix(in srgb,var(--accent) 18%,var(--bg-2));color:var(--accent)}
.rh .rh-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:14px}
.rh .rh-c{-webkit-appearance:none;appearance:none;display:block;width:100%;text-align:left;font:inherit;color:inherit;background:var(--bg-2);border:1px solid var(--line);border-radius:20px;padding:0;overflow:hidden;cursor:pointer;touch-action:manipulation}
.rh .rh-c:active{transform:scale(.98)}
.rh .rh-ph{position:relative;display:block;aspect-ratio:4/3;background:var(--line);overflow:hidden}
.rh .rh-ph img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;opacity:0;transition:opacity .25s}
.rh .rh-ph img.ok{opacity:1}
.rh .rh-ph.no:after{content:"";position:absolute;inset:0;background:var(--bg-2) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 24 24' fill='none' stroke='%238a93a6' stroke-width='1.6' stroke-linecap='round'%3E%3Ccircle cx='12' cy='12' r='8'/%3E%3Ccircle cx='12' cy='12' r='4.5'/%3E%3C/svg%3E") center/44px no-repeat}
.rh .rh-kc{position:absolute;left:8px;bottom:8px;z-index:1;padding:4px 9px;border-radius:99px;background:rgba(10,12,18,.62);color:#fff;font-size:12.5px;font-weight:750;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
.rh .rh-n{display:block;padding:10px 12px 12px}
.rh .rh-n b{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:14.5px;font-weight:650;line-height:1.25;min-height:2.5em}
.rh .rh-n span{display:block;margin-top:6px;font-size:12px;color:var(--muted)}
.rh .rh-empty{margin:36px 0;text-align:center;color:var(--muted);font-size:14px}
.rh .rh-hint{margin:16px 0 0;font-size:12.5px;color:var(--muted);text-align:center}
.rh .rh-hint a{color:var(--muted);text-decoration:underline}
.rh .rh-back{-webkit-appearance:none;appearance:none;border:0;background:none;color:var(--accent);font:inherit;font-weight:700;font-size:14px;padding:4px 0;cursor:pointer}
.rh .rh-hero{position:relative;margin-top:10px;aspect-ratio:16/10;border-radius:22px;overflow:hidden;background:var(--line);border:1px solid var(--line)}
.rh .rh-hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .3s}
.rh .rh-hero img.ok{opacity:1}
.rh .rh-hero.no:after{content:"";position:absolute;inset:0;background:var(--bg-2) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 24 24' fill='none' stroke='%238a93a6' stroke-width='1.4' stroke-linecap='round'%3E%3Ccircle cx='12' cy='12' r='8'/%3E%3Ccircle cx='12' cy='12' r='4.5'/%3E%3C/svg%3E") center/64px no-repeat}
.rh .rh-cr{margin:6px 2px 0;font-size:11px;color:var(--muted);line-height:1.3}
.rh .rh-cr a{color:var(--muted);text-decoration:underline}
.rh h2.rh-t{margin:14px 0 0;font-size:23px;line-height:1.2;letter-spacing:-.02em}
.rh .rh-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.rh .rh-chips span{padding:5px 10px;border-radius:99px;font-size:12.5px;font-weight:650;background:var(--bg-2);border:1px solid var(--line);color:var(--muted)}
.rh .rh-sec{margin:22px 0 4px;font-size:16px;font-weight:750}
.rh .rh-ing{display:flex;justify-content:space-between;gap:12px;padding:11px 0;border-top:1px solid var(--line);font-size:14.5px}
.rh .rh-ing:first-of-type{border-top:0}
.rh .rh-ing span:last-child{color:var(--muted);font-weight:650;white-space:nowrap;font-variant-numeric:tabular-nums}
.rh .rh-step{display:flex;gap:12px;padding:9px 0;font-size:14.5px;line-height:1.5}
.rh .rh-step i{flex:none;width:26px;height:26px;border-radius:50%;background:color-mix(in srgb,var(--accent) 16%,var(--bg-2));color:var(--accent);font-style:normal;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center;margin-top:1px}
.rh .rh-por{display:flex;align-items:center;justify-content:space-between;gap:10px}
.rh .rh-por b{font-size:15px}
.rh .rh-por small{display:block;margin-top:2px;font-size:12.5px;color:var(--muted);font-weight:500}
.rh .rh-por div.st{display:flex;align-items:center;gap:6px}
.rh .rh-por button{flex:none;width:44px;height:44px;border-radius:14px;border:1px solid var(--line);background:var(--card);color:var(--text);font-size:22px;font-weight:600;cursor:pointer;display:grid;place-items:center;padding:0;touch-action:manipulation}
.rh .rh-por button:active{transform:scale(.94)}
.rh .rh-por em{min-width:44px;text-align:center;font-style:normal;font-size:22px;font-weight:800;letter-spacing:-.02em}
.rh .rh-foot .btn.ghost{margin-top:8px}
.rh #rhAdd{width:100%;margin:0;height:56px;font-size:16.5px;font-weight:750;border-radius:18px;display:flex;align-items:center;justify-content:center;gap:8px}
.rh #rhAdd em{font-style:normal;opacity:.75;font-weight:650}
.rh .rh-cl{display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-top:1px solid var(--line);font-size:13px}
.rh .rh-cl:first-of-type{border-top:0}
.rh .rh-cl a{color:var(--text)}
.rh .rh-cl span{color:var(--muted);text-align:right}
`;
if (!document.getElementById('rh-css')) { const st = document.createElement('style'); st.id = 'rh-css'; st.textContent = CSS; document.head.appendChild(st); }


// ---------- diéty a zdravotné režimy v receptoch ----------
// Recepty sa posudzujú podľa surovín. Nevhodné sa predvolene skryjú (dá sa to vypnúť), pochybné dostanú upozornenie.
let showAllRec = false;
const prefs = () => { const c = dx.cfg(); return { diets: c.diets || [], modes: c.modes || [], allergens: c.allergens || [] }; };
const hasPrefs = () => { const c = prefs(); return c.diets.length > 0 || c.modes.some(m => m === 'celiac' || m === 'lactose' || m === 'allergy'); };
const verdict = r => hasPrefs() ? fit(recipeTags(r), prefs()) : { level: 'ok', items: [] };
const DX_NAME = { celiac: 'Celiakia', lactose: 'Laktóza', allergy: 'Alergia' };
const dxName = k => DIETS[k]?.title || DX_NAME[k] || k;
// ktoré suroviny receptu robia problém
function culprits(r) {
  const out = [], c = prefs();
  for (const i of r.ing) { const f = fit(tagsOf(i.name), c); if (f.level !== 'ok') out.push({ name: i.name, level: f.level, why: [...new Set(f.items.map(x => x.why))].join(', ') }); }
  return out;
}
const dietBlock = r => {
  if (!hasPrefs()) return '';
  const v = verdict(r);
  if (v.level === 'ok') return `<div class="rh-fit ok"><b>Sedí k tvojmu stravovaniu</b><span>${[...prefs().diets.map(dxName), ...prefs().modes.filter(m => DX_NAME[m]).map(dxName)].join(', ')}. Posúdené podľa surovín.</span></div>`;
  const cs = culprits(r);
  return `<div class="rh-fit ${v.level}"><b>${v.level === 'bad' ? 'Tento recept ti nesedí' : 'Over pri tomto recepte'}</b><span>${cs.slice(0, 6).map(x => `${h(x.name)} (${h(x.why)})`).join(', ') || 'Zloženie sa nepodarilo plne posúdiť'}${cs.length > 6 ? ' a ďalšie' : ''}.</span><em>Posúdené podľa názvov surovín, nie podľa presného zloženia výrobkov.</em></div>`;
};

// záložky Inšpiruj sa / Môj recept (používajú ich aj editor vlastného receptu)
export const hubTabs = active => `<div class="seg rh-seg" data-rh-seg><button data-rh="insp" class="${active === 'insp' ? 'on' : ''}">Inšpiruj sa</button><button data-rh="mine" class="${active === 'mine' ? 'on' : ''}">Môj recept</button></div>`;

const catFor = meal => ({ breakfast: 'breakfast', brunch: 'breakfast', lunch: 'lunch', afternoon: 'snack', dinner: 'dinner', late: 'dinner', snack: 'snack' }[meal] || 'all');
const mealWord = m => (MEALS()[m] || '').toLowerCase();
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const SORTS = [['rec', 'Odporúčané'], ['fit', 'Sedí do môjho dňa'], ['prot', 'Najviac bielkovín'], ['kcal', 'Najmenej kalórií']];
// "Sedí do môjho dňa": podiel zostávajúcich kalórií a bielkovín na jedno z ešte zostávajúcich jedál (raňajky = 3, obed/olovrant = 2, večera = 1)
const mealsLeft = m => ({ breakfast: 3, brunch: 3, lunch: 2, afternoon: 2, snack: 2, dinner: 1, late: 1 }[m] || 2);
function fitScore(r, want) {
  const k = r.per.kcal, p = r.per.protein;
  return Math.abs(k - want.kcal) / Math.max(want.kcal, 150) + (want.protein ? Math.max(0, want.protein - p) / want.protein * 1.2 + Math.max(0, p - want.protein * 1.6) / want.protein * 0.3 : 0);
}
const sortRows = (rows, key, want) => key === 'fit' && want ? [...rows].sort((a, b) => fitScore(a, want) - fitScore(b, want)) : key === 'prot' ? [...rows].sort((a, b) => b.per.protein - a.per.protein) : key === 'kcal' ? [...rows].sort((a, b) => a.per.kcal - b.per.kcal) : rows;
const cuisName = key => (CUIS.find(c => c[0] === key) || [])[1] || '';
const SEARCH = RECIPES.map(r => ({ r, t: norm(r.name + ' ' + cuisName(r.cuis) + ' ' + r.ing.map(i => i.name).join(' ')) }));
const catName = key => (CATS.find(c => c[0] === key) || [])[1] || '';
const PAGE = 36;

// fotka sa jemne zobrazí po načítaní; keď sa nenačíta, ostane čistá neutrálna dlaždica
function wirePhotos(root) {
  root.querySelectorAll('[data-ph] img').forEach(img => {
    const box = img.parentElement, src0 = img.getAttribute('src');
    let tries = 0, alt = null;
    const m = /recipes\/(.+?)-([sl])\.jpg/.exec(src0 || '');
    if (m) alt = photoBackup(decodeURIComponent(m[1]), m[2] === 'l' ? 960 : 500);
    const ok = () => img.classList.add('ok');
    // pri chybe skúsi zálohu z Wikimedie a opakuje s odstupom; až potom ostane neutrálna dlaždica
    const no = () => {
      if (tries >= 3) { box.classList.add('no'); return; }
      tries++;
      const base = tries === 1 && alt ? alt : (tries % 2 && alt ? alt : src0);
      setTimeout(() => { if (img.isConnected) img.src = base + (base.includes('?') ? '&' : '?') + 'r=' + tries; }, tries === 1 ? 50 : 1200 * tries + Math.random() * 800);
    };
    img.onload = ok; img.onerror = no;
    if (img.complete) { img.naturalWidth ? ok() : no(); }
  });
}

// koliesko: dráha, už zjedené (tlmená farba) a tento recept (plná farba)
const RR = 30, RC = 2 * Math.PI * RR;
const ring = (key, label, color) => `<div class="fs-r" data-r="${key}" style="--c:${color}"><svg viewBox="0 0 76 76" aria-hidden="true">
    <circle class="tr" cx="38" cy="38" r="${RR}"/><circle class="ea" cx="38" cy="38" r="${RR}" transform="rotate(-90 38 38)" stroke-dasharray="0 ${RC}"/>
    <circle class="ad" cx="38" cy="38" r="${RR}" transform="rotate(-90 38 38)" stroke-dasharray="0 ${RC}"/><text x="38" y="43" text-anchor="middle">0%</text></svg><b>${label}</b><small></small></div>`;

// k = { addPreset(recipe, meal, done, servings), editPreset(recipe, meal, done), openMine(meal, done) }
export function openRecipeHub(meal, done, k) {
  let cat = catFor(meal), cuis = 'all', q = '', sort = 'rec', io = null, hidden = 0, want = null;
  const bg = sheet('<div class="rh fs"></div>');
  const root = bg.querySelector('.rh');
  const close = () => bg.remove();
  const scrollTop = () => { const s = bg.querySelector('.sheet'); if (s) s.scrollTop = 0; };

  const wireTabs = () => root.querySelector('[data-rh="mine"]')?.addEventListener('click', () => { close(); k.openMine(meal, done); });

  const rowsNow = () => {
    const nq = norm(q).trim();
    let rows = nq ? SEARCH.filter(s => nq.split(/\s+/).every(w => s.t.includes(w))).map(s => s.r) : RECIPES.filter(r => cat === 'all' || r.cat === cat);
    if (!nq && cuis !== 'all') rows = rows.filter(r => r.cuis === cuis);
    hidden = 0;
    if (hasPrefs() && !showAllRec) { const keep = rows.filter(r => verdict(r).level !== 'bad'); hidden = rows.length - keep.length; rows = keep; }
    return sortRows(rows, sort, want);
  };
  const mark = r => { if (!hasPrefs()) return ''; const l = verdict(r).level; return l === 'bad' ? '<span class="rh-mk bad">✕ nevhodné</span>' : l === 'warn' ? '<span class="rh-mk warn">! over</span>' : ''; };
  const card = r => `<button class="rh-c" data-r="${r.id}"><span class="rh-ph" data-ph>${mark(r)}<img src="${photoOf(r.id, 500)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"><span class="rh-kc">${r.per.kcal} kcal</span></span><span class="rh-n"><b>${h(r.name)}</b><span>B ${r.per.protein} g · S ${r.per.carbs} g · T ${r.per.fat} g</span></span></button>`;
  // karty sa dokreslľujú po dávkach pri rolovaní, aby sa okno otvorilo hneď aj pri stovkách receptov
  function paintGrid() {
    const rows = rowsNow();
    const g = root.querySelector('#rhGrid'), more = root.querySelector('#rhMore');
    let shown = 0;
    if (io) { io.disconnect(); io = null; }
    g.innerHTML = '';
    const next = () => {
      const part = rows.slice(shown, shown + PAGE);
      if (!part.length) return;
      const tmp = document.createElement('div');
      tmp.innerHTML = part.map(card).join('');
      wirePhotos(tmp);
      tmp.querySelectorAll('[data-r]').forEach(b => b.onclick = () => detail(RECIPES.find(r => r.id === b.dataset.r)));
      g.append(...tmp.children);
      shown += part.length;
      if (shown >= rows.length && io) { io.disconnect(); io = null; }
    };
    next();
    if (shown < rows.length && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) next(); }, { root: bg.querySelector('.sheet') || null, rootMargin: '600px 0px' });
      io.observe(more);
    } else while (shown < rows.length) next();
    root.querySelector('#rhEmpty').innerHTML = rows.length ? '' : `<div class="rh-empty">Nič sa nenašlo. Skús iný názov, surovinu alebo krajinu.</div>`;
    const dxn = root.querySelector('#rhDx');
    if (dxn) {
      if (!hasPrefs()) dxn.innerHTML = '';
      else dxn.innerHTML = showAllRec ? `<span>Zobrazujem aj recepty, ktoré ti nesedia.</span><button type="button" id="rhDxT">Skryť nevhodné</button>` : `<span>Podľa tvojho stravovania${hidden ? ` skryté: ${hidden}` : ''}.</span>${hidden ? '<button type="button" id="rhDxT">Zobraziť všetky</button>' : ''}`;
      const t = dxn.querySelector('#rhDxT'); if (t) t.onclick = () => { showAllRec = !showAllRec; paintGrid(); };
    }
    root.querySelector('#rhCount').textContent = `${rows.length} ${rows.length === 1 ? 'recept' : rows.length < 5 && rows.length > 0 ? 'recepty' : 'receptov'}`;
  }

  // zostávajúce makrá dňa (cieľ mínus zjedené) sa načítajú raz; radenie „Sedí do môjho dňa“ sa po načítaní samo prekreslí
  (() => {
    const p0 = ctx.state.profile || {};
    if (!p0.id || !(Number(p0.target_kcal) > 0)) return;
    db.listFood(p0.id, ctx.state.date).then(rows => {
      const e = calc.sumMacros(rows), n = mealsLeft(meal);
      const lk = Number(p0.target_kcal) - e.kcal, lp = (Number(p0.target_protein) || 0) - e.protein;
      want = { kcal: Math.max(250, lk / n), protein: Math.max(0, lp / n) };
      if (sort === 'fit' && root.querySelector('#rhGrid')) paintGrid();
    }).catch(() => { });
  })();

  function list() {
    root.innerHTML = `<div class="rh-hd"><h2>Recepty</h2><button class="del" data-x aria-label="Zavrieť">×</button></div>
      ${hubTabs('insp')}
      <input class="rh-q" id="rhQ" type="search" placeholder="Hľadaj recept, surovinu alebo krajinu" autocomplete="off" enterkeyhint="search" value="${h(q)}">
      <div class="rh-cats">${[['all', 'Všetko'], ...CATS].map(([key, l]) => `<button data-c="${key}" class="${!q && key === cat ? 'on' : ''}">${h(l)}</button>`).join('')}</div>
      <div class="rh-cuis">${[['all', 'Celý svet'], ...CUIS].map(([key, l]) => `<button data-u="${key}" class="${!q && key === cuis ? 'on' : ''}">${h(l)}</button>`).join('')}</div>
      <div class="rh-sort"><span id="rhCount"></span>${SORTS.map(([key, l]) => `<button data-s="${key}" class="${key === sort ? 'on' : ''}">${h(l)}</button>`).join('')}</div>
      <div class="rh-dx" id="rhDx"></div>
      <div class="rh-grid" id="rhGrid"></div><div class="rh-more" id="rhMore"></div><div id="rhEmpty"></div>
      <p class="rh-hint">Hodnoty sú vypočítané zo surovín. <a href="#" id="rhCred">Zdroje fotiek</a></p>`;
    root.querySelector('[data-x]').onclick = () => { if (io) io.disconnect(); close(); };
    wireTabs();
    const cats = root.querySelector('.rh-cats');
    cats.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { cat = b.dataset.c; q = ''; root.querySelector('#rhQ').value = ''; cats.querySelectorAll('[data-c]').forEach(x => x.classList.toggle('on', x === b)); root.querySelectorAll('[data-u]').forEach(x => x.classList.toggle('on', x.dataset.u === cuis)); paintGrid(); });
    root.querySelectorAll('[data-u]').forEach(b => b.onclick = () => { cuis = b.dataset.u; if (cuis !== 'all' && cat !== 'all') { cat = 'all'; cats.querySelectorAll('[data-c]').forEach(x => x.classList.toggle('on', x.dataset.c === 'all')); } if (q) { q = ''; root.querySelector('#rhQ').value = ''; cats.querySelectorAll('[data-c]').forEach(x => x.classList.toggle('on', x.dataset.c === cat)); } root.querySelectorAll('[data-u]').forEach(x => x.classList.toggle('on', x === b)); paintGrid(); });
    root.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { sort = b.dataset.s; root.querySelectorAll('[data-s]').forEach(x => x.classList.toggle('on', x === b)); paintGrid(); });
    root.querySelector('#rhQ').oninput = e => { q = e.target.value; cats.querySelectorAll('[data-c]').forEach(x => x.classList.toggle('on', !q && x.dataset.c === cat)); root.querySelectorAll('[data-u]').forEach(x => x.classList.toggle('on', !q && x.dataset.u === cuis)); paintGrid(); };
    root.querySelector('#rhCred').onclick = e => { e.preventDefault(); credits(); };
    paintGrid();
    scrollTop();
  }

  function credits() {
    if (io) { io.disconnect(); io = null; }
    const names = Object.fromEntries(RECIPES.map(r => [r.id, r.name]));
    root.innerHTML = `<div class="rh-hd"><button class="rh-back" id="back">‹ Recepty</button><button class="del" data-x aria-label="Zavrieť">×</button></div>
      <h2 class="rh-t">Zdroje fotiek</h2><p class="rh-hint" style="text-align:left">Fotky jedál pochádzajú z Wikimedia Commons a sú pod voľnými licenciami. Ďakujeme autorom.</p>
      <div style="margin-top:10px">${allCredits().map(c => `<div class="rh-cl"><a href="${h(c.page)}" target="_blank" rel="noopener">${h(names[c.id] || c.id)}</a><span>${h(c.author)} · ${h(c.license)}</span></div>`).join('')}</div>`;
    root.querySelector('[data-x]').onclick = close;
    root.querySelector('#back').onclick = list;
    scrollTop();
  }

  function detail(r) {
    if (io) { io.disconnect(); io = null; }
    const p = ctx.state.profile || {};
    const T = { kcal: Number(p.target_kcal) || 0, protein: Number(p.target_protein) || 0, carbs: Number(p.target_carbs) || 0, fat: Number(p.target_fat) || 0 };
    let eaten = null, m = 1;
    const cr = creditOf(r.id);
    const per = r.grams / r.servings;
    root.innerHTML = `<div class="rh-hd"><button class="rh-back" id="back">‹ Recepty</button><button class="del" data-x aria-label="Zavrieť">×</button></div>
      <div class="rh-hero" data-ph><img src="${photoOf(r.id, 960)}" alt="${h(r.name)}" decoding="async" referrerpolicy="no-referrer"></div>
      ${cr ? `<p class="rh-cr">Foto: ${h(cr.author)}, ${h(cr.license)} · <a href="${h(cr.page)}" target="_blank" rel="noopener">Wikimedia Commons</a></p>` : ''}
      <h2 class="rh-t">${h(r.name)}</h2>
      <div class="rh-chips"><span>${r.min} min</span><span>${h(catName(r.cat))}</span>${r.cuis && r.cuis !== 'fit' ? `<span>${h(cuisName(r.cuis))}</span>` : ''}<span>${r.servings === 1 ? '1 porcia' : r.servings + ' porcií v recepte'}</span></div>
      ${dietBlock(r)}
      <div class="fs-box"><div class="rh-por"><div><b>Počet porcií</b><small id="rhPg"></small></div><div class="st"><button data-d="-1" aria-label="Menej">−</button><em id="rhM"></em><button data-d="1" aria-label="Viac">+</button></div></div>
        <div id="rhCalc" style="margin-top:14px"></div></div>
      <div class="fs-box fs-imp"><h3>Vplyv na tvoj deň <span id="rhDay"></span></h3>
        <div class="fs-rings">${ring('kcal', 'Kalórie', 'var(--accent-2)')}${ring('protein', 'Bielkoviny', 'var(--protein)')}${ring('carbs', 'Sacharidy', 'var(--carbs)')}${ring('fat', 'Tuky', 'var(--fat)')}</div>
        <p class="fs-left" id="rhLeft">Načítavam tvoj deň…</p></div>
      <p class="rh-sec">Suroviny</p><div id="rhIng"></div>
      <p class="rh-sec">Postup</p>
      ${r.steps.map((s, n) => `<div class="rh-step"><i>${n + 1}</i><span>${h(s)}</span></div>`).join('')}
      <div class="rh-foot fs-foot"><button class="btn primary" id="rhAdd"></button><button class="btn ghost" id="rhEdit">Upraviť suroviny a uložiť</button></div>`;
    const $ = s => root.querySelector(s);
    wirePhotos(root);

    const amt = g => { const v = g / r.servings * m; return (v < 10 ? fmt(v) : r0(v)) + ' g'; };
    const paint = () => {
      const s = { kcal: r.per.kcal * m, protein: r.per.protein * m, carbs: r.per.carbs * m, fat: r.per.fat * m };
      const pk = s.protein * 4, ck = s.carbs * 4, fk = s.fat * 9, tot = pk + ck + fk || 1;
      $('#rhM').textContent = String(m).replace('.', ',') + '×';
      $('#rhPg').textContent = `${r0(per * m)} g spolu`;
      $('#rhCalc').innerHTML = `<div class="fs-k"><b>${r0(s.kcal)}<small>kcal</small></b><span>${m === 1 ? '1 porcia' : String(m).replace('.', ',') + ' porcie'}</span></div>
        <div class="fs-bar"><i style="flex-grow:${pk / tot};background:var(--protein)"></i><i style="flex-grow:${ck / tot};background:var(--carbs)"></i><i style="flex-grow:${fk / tot};background:var(--fat)"></i></div>
        <div class="fs-mac"><div style="--c:var(--protein)"><b>${fmt(s.protein)} g</b>Bielkoviny ${r0(pk / tot * 100)} %</div><div style="--c:var(--carbs)"><b>${fmt(s.carbs)} g</b>Sacharidy ${r0(ck / tot * 100)} %</div><div style="--c:var(--fat)"><b>${fmt(s.fat)} g</b>Tuky ${r0(fk / tot * 100)} %</div></div>`;
      $('#rhIng').innerHTML = r.ing.map(i => `<div class="rh-ing"><span>${h(i.name)}</span><span>${amt(i.grams)}</span></div>`).join('');
      $('#rhAdd').innerHTML = `Pridať do: ${h(mealWord(meal))} <em>· ${r0(s.kcal)} kcal</em>`;
      drawRings(s);
    };
    const drawRings = s => {
      if (!eaten) return;
      for (const key of ['kcal', 'protein', 'carbs', 'fat']) {
        const el = root.querySelector(`[data-r="${key}"]`), t = T[key];
        const e = eaten[key], a = s[key], after = e + a;
        const fe = t ? Math.min(e / t, 1) : 0, fa = t ? Math.min(after / t, 1) : 0;
        const ea = el.querySelector('.ea'), ad = el.querySelector('.ad');
        ea.setAttribute('stroke-dasharray', `${fe * RC} ${RC}`); ea.style.opacity = fe > 0.004 ? '' : '0';
        ad.setAttribute('stroke-dasharray', `${Math.max(0, fa - fe) * RC} ${RC}`); ad.style.opacity = fa - fe > 0.004 ? '' : '0';
        ad.setAttribute('stroke-dashoffset', `${-fe * RC}`);
        el.classList.toggle('over', !!t && after > t * 1.02);
        el.querySelector('text').textContent = t ? `${r0(after / t * 100)}%` : '–';
        const u = key === 'kcal' ? '' : ' g';
        el.querySelector('small').innerHTML = `<em>+${key === 'kcal' ? r0(a) : fmt(a)}${u}</em><br>${r0(after)} / ${r0(t)}${u}`;
      }
      const left = T.kcal - eaten.kcal - s.kcal, L = $('#rhLeft');
      L.classList.toggle('over', left < 0);
      L.innerHTML = !T.kcal ? 'Nastav si cieľ kalórií v Profile.' : left >= 0 ? `Po pridaní ti dnes zostane <b>${r0(left)} kcal</b>` : `Po pridaní budeš <b>${r0(-left)} kcal nad cieľom</b>`;
    };
    paint();

    const d = ctx.state.date;
    $('#rhDay').textContent = d === calc.today() ? 'dnes' : calc.fmtDate(d);
    if (p.id) db.listFood(p.id, d).then(rows => { eaten = calc.sumMacros(rows); paint(); })
      .catch(() => { $('#rhLeft').textContent = 'Tvoj deň sa teraz nepodarilo načítať.'; });
    else $('#rhLeft').textContent = '';

    $('[data-x]').onclick = close;
    $('#back').onclick = list;
    root.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { m = Math.min(6, Math.max(0.5, m + Number(b.dataset.d) * 0.5)); if (navigator.vibrate) navigator.vibrate(6); paint(); });
    $('#rhAdd').onclick = async e => { const b = e.currentTarget; b.disabled = true; try { await k.addPreset(r, meal, done, m); close(); } catch (err) { b.disabled = false; ctx.toast(err.message || 'Nepodarilo sa uložiť recept', true); } };
    $('#rhEdit').onclick = () => { close(); k.editPreset(r, meal, done); };
    scrollTop();
  }

  list();
  return bg;
}
