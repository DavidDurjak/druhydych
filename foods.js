// Jedlo v0.4: komunitná databáza, porcie, vlastné jedlá, recepty, kopírovanie, čiarové kódy
import * as db from './data.js';
import * as calc from './calc.js';
import { searchOFF, lookupBarcode } from './food.js';
import { ctx } from './app.js';
import { scanBarcode } from './scan.js';
import { aiBoxHtml, bindAiBox } from './ailog.js';
import * as dx from './dxcore.js';
import { thumb, fillThumbs } from './foodimg.js';
import { openFoodSheet } from './foodsheet.js';
import * as ff from './foodfast.js';
// recepty (6 000+ jedál s fotkami, vyše 3 MB) sa načítajú až pri otvorení receptov, nie pri štarte appky
let recMod = null;
const loadRecipes = () => (recMod ||= import('./recipes.js'));
const openRecipeHub = (...a) => loadRecipes().then(m => m.openRecipeHub(...a)).catch(() => toast('Recepty sa nepodarilo načítať, skús to znova', true));
const hubTabs = active => `<div class="seg rh-seg" data-rh-seg><button data-rh="insp" class="${active === 'insp' ? 'on' : ''}">Inšpiruj sa</button><button data-rh="mine" class="${active === 'mine' ? 'on' : ''}">Môj recept</button></div>`;

const $app = () => ctx.$app;
const state = () => ctx.state;
const h = (...a) => ctx.h(...a), r0 = (...a) => ctx.r0(...a), toast = (...a) => ctx.toast(...a), sheet = (...a) => ctx.sheet(...a), nav = (...a) => ctx.nav(...a);
const MEALS = () => ctx.MEALS;
const r1 = v => Math.round(Number(v || 0) * 10) / 10;

export function defaultMeal() {
  const m = new Date().getHours() * 60 + new Date().getMinutes();
  return m < 570 ? 'breakfast' : m < 690 ? 'brunch' : m < 870 ? 'lunch' : m < 1020 ? 'afternoon' : m < 1230 ? 'dinner' : m < 1380 ? 'late' : 'snack';
}

// Jedlo z akéhoľvek zdroja -> jednotný tvar s hodnotami na 100 g
function fromDb(f) {
  return { id: f.id, name: f.name, brand: f.brand || '', barcode: f.barcode || null, kcal: Number(f.kcal), protein: Number(f.protein), carbs: Number(f.carbs), fat: Number(f.fat), fiber: f.fiber ?? null, sugar: f.sugar ?? null, salt: f.salt ?? null,
    portions: Array.isArray(f.portions) ? f.portions : [], verified: !!f.verified, is_recipe: !!f.is_recipe, mine: f.mine ?? (f.created_by === state().profile.id),
    gluten: f.gluten ?? null, lactose: f.lactose ?? null, allergens: f.allergens ?? null, traces: f.traces ?? null, gi: f.gi ?? null, img: f.img || null,
    created_by: f.created_by, source: 'db', raw: f };
}
function fromOff(f) { return { ...f, portions: [], source: 'off' }; }
async function fromLog(l) {
  if (l.food_id) { const f = await db.getFood(l.food_id).catch(() => null); if (f) return { ...fromDb(f), lastPortion: l.portion, lastQty: l.qty, lastGrams: l.grams }; }
  const g = Number(l.grams) || 100, k = 100 / g;
  // zápis bez väzby na databázu (odhad, rýchle pridanie): ak existuje rovnaké jedlo s podobnými kalóriami, použijeme ho, nech sa dá overiť lepok a alergény
  if (l.name && g > 0) {
    const f = await db.sb.from('foods').select('*').eq('name', l.name).order('pop', { ascending: false, nullsFirst: false }).limit(5).then(r => (r.data || []).find(x => Math.abs(Number(x.kcal) - l.kcal * k) <= Math.max(15, 0.15 * l.kcal * k)), () => null);
    if (f) return { ...fromDb(f), lastGrams: g };
  }
  return { name: l.name, brand: l.brand || '', barcode: l.barcode, kcal: l.kcal * k, protein: l.protein * k, carbs: l.carbs * k, fat: l.fat * k, portions: [], source: l.source || 'manual', lastGrams: g };
}

function per100Line(f) { return `${r0(f.kcal)} kcal · B ${r1(f.protein)} · S ${r1(f.carbs)} · T ${r1(f.fat)} na 100 g`; }
function row(f, key) {
  const por = f.portions?.[0];
  const sub = [f.brand, por ? `${h(por.label)} = ${r0(por.g)} g` : null, dx.active('diabetes') ? `S ${r0(f.carbs * (por ? por.g : 100) / 100)} g` : null].filter(Boolean).map(h).join(' · ');
  const kcalShown = por ? r0(f.kcal * por.g / 100) : r0(f.kcal);
  return `<div class="res hasft" data-k="${key}">${thumb(f)}<div class="n"><b>${h(f.name)}${f.verified ? ' <span class="vf" title="Overené">✓</span>' : ''}${f.is_recipe ? ' <span class="chip">recept</span>' : ''}</b><span>${sub || '100 g'}</span>${dx.chips(f)}</div><span class="k mono">${kcalShown}<small>${por ? '/' + h(por.label.replace(/^1 /, '')) : '/100 g'}</small></span></div>`;
}

// ---------- obrazovka ----------
export async function renderFood() {
  const params = new URLSearchParams((location.hash.split('?')[1]) || '');
  let meal = params.get('meal') || defaultMeal();
  const uid = state().profile.id;
  dx.ensure(uid).then(() => { if ($app().querySelector('#results') && dx.anyMode()) $app().querySelector('#q')?.dispatchEvent(new Event('input')); }).catch(() => { });
  let tab = 'recent', showHidden = false;
  const pool = new Map();
  const put = (f) => { const k = 'f' + pool.size; pool.set(k, f); return k; };

  $app().innerHTML = `<div class="screen">
    <div class="topbar"><h1>Pridať jedlo</h1>${ctx.datePicker(true)}</div>
    <div class="seg mb" id="mealseg">${Object.entries(MEALS()).map(([k, l]) => `<button data-meal="${k}" class="${k === meal ? 'on' : ''}">${l}</button>`).join('')}</div>
    ${aiBoxHtml()}
    <div class="input-row mb">
      <input class="input" id="q" placeholder="Hľadaj jedlo alebo produkt" autocomplete="off" enterkeyhint="search">
      <button class="btn icon" id="scan" title="Čiarový kód" aria-label="Skenovať čiarový kód"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M11 8v8M15 8v8M18 8v8"/></svg></button>
    </div>
    <div class="qa mb">
      <button class="qa-b" id="newFood"><b>＋</b><span>Nové jedlo</span></button>
      <button class="qa-b" id="newRecipe"><b><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M9 8h7M9 12h5"/></svg></b><span>Recept</span></button>
      <button class="qa-b" id="copyY"><b>↻</b><span>Z včera</span></button>
      <button class="qa-b" id="quick"><b>⚡</b><span>Len kcal</span></button>
    </div>
    <div class="seg mb" id="tabs"><button data-t="recent" class="on">Naposledy</button><button data-t="mine">Moje jedlá a recepty</button></div>
    <div class="card"><div id="results" class="results"><div class="spinner"></div></div></div>
  </div>${nav('#/jedlo')}`;

  const $res = $app().querySelector('#results'), $q = $app().querySelector('#q'), $tabs = $app().querySelector('#tabs');
  const done = m => { toast('Pridané do: ' + MEALS()[typeof m === 'string' && MEALS()[m] ? m : meal].toLowerCase()); location.hash = '#/'; };
  const pick = async k => { const f = pool.get(k); if (!f) return; openAdd(f.log ? await fromLog(f.log) : f, meal, done); };
  const bind = () => $res.querySelectorAll('[data-k]').forEach(el => el.onclick = () => pick(el.dataset.k));

  // ---------- rýchle pridanie z Naposledy: jedno ťuknutie, hromadný výber, späť ----------
  let multi = false; const chosen = new Set(); let added = [];
  const logRow = l => ({ user_id: uid, date: state().date, meal, name: l.name, brand: l.brand || null, grams: l.grams, kcal: l.kcal, protein: l.protein, carbs: l.carbs, fat: l.fat,
    source: l.source || 'manual', barcode: l.barcode || null, food_id: l.food_id || null, portion: l.portion || null, qty: l.qty ?? null, fiber: l.fiber ?? null, sugar: l.sugar ?? null, salt: l.salt ?? null });
  const drawBar = () => {
    let bar = $app().querySelector('.fast-bar');
    const n = multi ? chosen.size : added.length;
    if (!n) { bar?.remove(); return; }
    if (!bar) { bar = document.createElement('div'); bar.className = 'fast-bar'; $app().appendChild(bar); }
    if (multi) {
      const kc = [...chosen].reduce((a, k) => a + Number(pool.get(k)?.log?.kcal || 0), 0);
      bar.innerHTML = `<div><b>${n} ${n === 1 ? 'položka' : n < 5 ? 'položky' : 'položiek'}</b><span>${r0(kc)} kcal</span></div><button class="btn primary sm" id="fbGo">Pridať do: ${MEALS()[meal].toLowerCase()}</button>`;
      bar.querySelector('#fbGo').onclick = async () => {
        const btn = bar.querySelector('#fbGo'); btn.disabled = true;
        try { for (const k of chosen) { const l = pool.get(k).log; await db.addFood(logRow(l)); if (l.food_id) db.foodUsed(l.food_id); } bar.remove(); toast(`Pridané: ${n} ${n === 1 ? 'položka' : n < 5 ? 'položky' : 'položiek'}`); location.hash = '#/'; }
        catch (e) { toast(e.message, true); btn.disabled = false; }
      };
    } else {
      const kc = added.reduce((a, r) => a + Number(r.kcal || 0), 0);
      bar.innerHTML = `<div><b>Pridané: ${n}</b><span>${r0(kc)} kcal do: ${MEALS()[meal].toLowerCase()}</span></div><button class="btn sm" id="fbUndo">Späť</button><button class="btn primary sm" id="fbGo">Hotovo</button>`;
      bar.querySelector('#fbUndo').onclick = async () => { const last = added.pop(); if (last) { await db.deleteFood(last.id).catch(() => { }); toast('Vrátené'); } drawBar(); };
      bar.querySelector('#fbGo').onclick = () => { bar.remove(); location.hash = '#/'; };
    }
  };
  const bindFast = () => {
    $res.querySelector('#multi')?.addEventListener('click', e => { e.stopPropagation(); multi = !multi; chosen.clear(); showTab().then(drawBar); });
    $res.querySelectorAll('[data-qa]').forEach(b => b.onclick = async e => {
      e.stopPropagation(); if (b.classList.contains('ok')) return;
      const l = pool.get(b.dataset.qa)?.log; if (!l) return;
      b.classList.add('ok'); b.textContent = '✓';
      try { const r = await db.addFood(logRow(l)); added.push(r); if (l.food_id) db.foodUsed(l.food_id); if (navigator.vibrate) navigator.vibrate(15); drawBar(); }
      catch (err) { b.classList.remove('ok'); b.textContent = '+'; toast(err.message, true); }
      setTimeout(() => { if (b.isConnected) { b.classList.remove('ok'); b.textContent = '+'; } }, 1400);
    });
    if (multi) $res.querySelectorAll('.res.fast').forEach(el => el.onclick = () => { const k = el.dataset.k; chosen.has(k) ? chosen.delete(k) : chosen.add(k); el.classList.toggle('on', chosen.has(k)); drawBar(); });
  };

  let recentIds = [];
  async function showTab() {
    $res.innerHTML = '<div class="spinner"></div>';
    try {
      if (tab === 'recent') {
        const logs = await db.recentLogs(uid, 25);
        recentIds = logs.map(l => l.food_id).filter(Boolean);
        $res.innerHTML = logs.length ? `<div class="fast-h"><span>${multi ? 'Vyber položky a pridaj naraz' : 'Ťukni na + a je to zapísané'}</span><button id="multi">${multi ? 'Zrušiť' : 'Vybrať viac'}</button></div>` + logs.map(l => {
          const k = put({ log: l });
          return `<div class="res fast hasft ${multi ? 'multi' : ''}" data-k="${k}">${multi ? `<span class="fchk" data-chk="${k}"></span>` : ''}${thumb({ id: l.food_id, name: l.name })}<div class="n"><b>${h(l.name)}</b><span>${[l.brand, l.portion ? `${r1(l.qty)}× ${l.portion}` : `${r0(l.grams)} g`].filter(Boolean).map(h).join(' · ')}</span><div class="mx"><i style="--c:#7CFFB2">B ${r0(l.protein)}</i><i style="--c:#5BB8FF">S ${r0(l.carbs)}</i><i style="--c:#FFC857">T ${r0(l.fat)}</i></div></div><span class="k mono">${r0(l.kcal)}</span>${multi ? '' : `<button class="qadd" data-qa="${k}" aria-label="Pridať">+</button>`}</div>`;
        }).join('') : '<p class="empty">Zatiaľ nič. Napíš hore, čo si jedol, vyhľadáj jedlo alebo naskenuj čiarový kód.</p>';
      } else {
        const mine = (await db.myFoods(uid)).map(fromDb);
        $res.innerHTML = mine.length ? mine.map(f => row(f, put(f))).join('') : '<p class="empty">Tu sa zobrazia jedlá a recepty, ktoré pridáš ty. Pomôžeš tým aj ostatným.</p>';
      }
      bind();
      if (tab === 'recent') { bindFast(); const ids = [...new Set(recentIds)]; if (ids.length) db.foodImages(ids).then(m => fillThumbs($res, m)).catch(() => { }); }
    } catch (e) { $res.innerHTML = `<p class="empty">${h(e.message)}</p>`; }
  }
  showTab();

  $tabs.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; $tabs.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); showTab(); });
  ctx.bindDatePicker($app(), renderFood);
  bindAiBox($app(), () => meal, m => { location.hash = '#/'; });
  if (params.get('scan')) setTimeout(() => $app().querySelector('#scan')?.click(), 80);
  if (params.get('q')) setTimeout(() => $q.focus(), 50);
  if (params.get('ai')) setTimeout(() => $app().querySelector('#aiText')?.focus(), 50);
  $app().querySelectorAll('[data-meal]').forEach(b => b.onclick = () => { meal = b.dataset.meal; $app().querySelectorAll('[data-meal]').forEach(x => x.classList.toggle('on', x === b)); });

  let ctrl = null, timer = null, seq = 0;
  $q.oninput = () => {
    const q = $q.value.trim();
    clearTimeout(timer);
    if (!q) { $tabs.style.display = ''; showTab(); return; }
    if (multi) { multi = false; chosen.clear(); drawBar(); }
    $tabs.style.display = 'none';
    // okamžité výsledky z našej databázy v telefóne, server ich o chvíu doplní
    const fast = (dx.cfg().hide && !showHidden ? ff.search(q, 20).filter(f => !dx.isBad(f)) : ff.search(q, 20)).slice(0, 12);
    if (fast.length) {
      $res.classList.remove('stale');
      $res.innerHTML = '<p class="sec">Databáza Fuelwind</p>' + fast.map(f => row(fromDb(f), put(fromDb(f)))).join('') + '<div class="spinner" style="margin:14px auto 4px;transform:scale(.7)"></div>';
      bind();
    }
    timer = setTimeout(async () => {
      const my = ++seq;
      if (!fast.length) $res.innerHTML = '<div class="spinner"></div>';
      const raw = await db.searchFoods(q, dx.cfg().hide ? 50 : 30).catch(() => []);
      if (my !== seq) return;
      const local = dx.cfg().hide && !showHidden ? raw.filter(f => !dx.isBad(f)).slice(0, 30) : raw;
      const hiddenN = raw.length - local.length;
      const addMore = `<button class="btn ghost mt" id="addQ">＋ Pridať „${h(q)}“ do databázy</button>`;
      $res.innerHTML = (hiddenN ? `<p class="dxh">Skryté: ${hiddenN} ${hiddenN === 1 ? 'jedlo' : hiddenN < 5 ? 'jedlá' : 'jedál'}, ktoré ti nevyhovujú. <a href="#" id="dxShow">Zobraziť</a></p>` : '')
        + (local.length ? '<p class="sec">Databáza Fuelwind</p>' + local.map(f => row(fromDb(f), put(fromDb(f)))).join('') : '')
        + '<div id="offBox"><div class="spinner"></div></div>' + addMore;
      bind();
      $res.querySelector('#addQ').onclick = () => openFoodEditor({ name: q }, meal, done);
      $res.querySelector('#dxShow')?.addEventListener('click', e => { e.preventDefault(); showHidden = true; $q.dispatchEvent(new Event('input')); });
      if (ctrl) ctrl.abort(); ctrl = new AbortController();
      // našli sme dosť v našej databáze: Open Food Facts len na požiadanie (rýchlejšie, menej šumu)
      if (local.length >= 8) {
        const box0 = $res.querySelector('#offBox');
        box0.innerHTML = '<button class="btn ghost sm" id="moreOff">Hľadať aj v Open Food Facts</button>';
        box0.querySelector('#moreOff').onclick = () => { box0.innerHTML = '<div class="spinner"></div>'; runOff(); };
        return;
      }
      runOff();
      async function runOff() {
      try {
        const off = (await searchOFF(q, { signal: ctrl.signal })).filter(o => !local.some(l => l.barcode && l.barcode === o.barcode));
        if (my !== seq) return;
        const box = $res.querySelector('#offBox');
        box.innerHTML = off.length ? '<p class="sec">Open Food Facts</p>' + off.map(o => row(fromOff(o), put(fromOff(o)))).join('') : (local.length ? '' : '<p class="empty">Nič sa nenašlo. Pridaj to jedlo do databázy, nájdu ho potom aj ostatní.</p>');
        bind();
      } catch (err) { if (err.name !== 'AbortError') { const box = $res.querySelector('#offBox'); if (box) box.innerHTML = ''; } }
      }
    }, fast.length ? 160 : 90);
  };
  ff.ensure();

  $app().querySelector('#newFood').onclick = () => openFoodEditor({ name: $q.value.trim() }, meal, done);
  const $nr = $app().querySelector('#newRecipe');
  $nr.addEventListener('pointerdown', loadRecipes, { once: true });
  $nr.onclick = () => openRecipeHub(meal, done, recipeHubK);
  $app().querySelector('#quick').onclick = () => openQuick(meal);
  $app().querySelector('#scan').onclick = () => openScan(meal, done);
  $app().querySelector('#copyY').onclick = async () => {
    const d = state().date, y = calc.addDays(d, -1);
    try {
      const n = await db.copyMeal(uid, y, d, meal);
      if (!n) return toast(`Deň predtým si nemal nič zapísané v: ${MEALS()[meal].toLowerCase()}`, true);
      toast(`Skopírované: ${n} ${n === 1 ? 'položka' : n < 5 ? 'položky' : 'položiek'}`); location.hash = '#/';
    } catch (e) { toast(e.message, true); }
  };
}

// ---------- pridanie do deníka (porcie) ----------
// karta jedla je v foodsheet.js (fotka, porcia, vplyv na deň, nutričné hodnoty)
export function openAdd(food, meal, done) {
  return openFoodSheet(food, meal, done, { importOff, openReport, openFoodEditor, openRecipeEditor });
}

const opt = v => v != null && Number(v) >= 0 && Number(v) <= 100 ? r1(Number(v)) : null;
async function importOff(f) {
  const exist = await db.foodByBarcode(f.barcode);
  if (exist) return fromDb(exist);
  const row = { name: f.name.slice(0, 120), brand: (f.brand || '').split(',')[0].slice(0, 80) || null, barcode: f.barcode, kcal: r0(f.kcal), protein: r1(f.protein), carbs: r1(f.carbs), fat: r1(f.fat),
    fiber: opt(f.fiber), sugar: opt(f.sugar), salt: opt(f.salt), img: f.img || null, gluten: f.gluten ?? null, lactose: f.lactose ?? null, allergens: f.allergens ?? null, traces: f.traces ?? null };
  if (validate(row)) return f; // nesedia hodnoty, neukladáme
  try { return fromDb(await db.createFood(row)); }
  catch (e) {
    if (!/column|schema cache/i.test(e.message)) throw e;
    for (const k of ['gluten', 'lactose', 'allergens', 'traces', 'img']) delete row[k];
    return fromDb(await db.createFood(row));
  }
}

// ---------- kontrola hodnôt (rovnaká ako v databáze) ----------
function validate(f) {
  if (!f.name || f.name.trim().length < 2) return 'Zadaj názov jedla';
  for (const k of ['kcal', 'protein', 'carbs', 'fat']) if (f[k] === '' || f[k] == null || isNaN(f[k]) || f[k] < 0) return 'Vyplň kalórie a makrá (0, ak niečo neobsahuje)';
  if (f.kcal > 900) return 'Viac ako 900 kcal na 100 g nemá žiadne jedlo. Skontroluj, či nezadávaš kJ.';
  if (f.protein + f.carbs + f.fat > 100.5) return 'Bielkoviny + sacharidy + tuky nemôžu byť viac ako 100 g v 100 g';
  const est = 4 * f.protein + 4 * f.carbs + 9 * f.fat + 7 * (f.alcohol || 0);
  if (Math.abs(f.kcal - est) > Math.max(40, 0.3 * f.kcal)) return `Kalórie nesedia s makrami. Podľa makier vychádza približne ${r0(est)} kcal, zadal si ${r0(f.kcal)}.`;
  return null;
}

// ---------- nové / upraviť jedlo ----------
export function openFoodEditor(pre = {}, meal, done) {
  const edit = !!pre.id;
  let portions = Array.isArray(pre.portions) ? pre.portions.map(p => ({ ...p })) : [];
  let basis = 100; // hodnoty zadané na 100 g alebo na porciu
  const bg = sheet(`<div class="row between"><h2>${edit ? 'Upraviť jedlo' : 'Nové jedlo'}</h2><button class="del" data-x aria-label="Zavrieť">×</button></div>
    <p class="muted small mt mb">Hodnoty nájdeš na obale v tabuľke výživových hodnôt. Jedlo uvidia aj ostatní používatelia.</p>
    <label class="field"><span>Názov</span><input class="input" id="name" maxlength="120" placeholder="Napr. Bryndzové halušky, Proteínová tyčinka" value="${h(pre.name || '')}"></label>
    <div class="grid2"><label class="field"><span>Značka / obchod (nepovinné)</span><input class="input" id="brand" maxlength="80" value="${h(pre.brand || '')}"></label>
    <label class="field"><span>Čiarový kód (nepovinné)</span><input class="input mono" id="barcode" inputmode="numeric" maxlength="14" value="${h(pre.barcode || '')}"></label></div>
    <div class="seg mb" id="basis"><button data-b="100" class="on">Na 100 g</button><button data-b="p">Na 1 porciu</button></div>
    <label class="field" id="pgWrap" style="display:none"><span>Porcia má (g)</span><input class="input" id="pg" type="number" inputmode="decimal" placeholder="Napr. 60"></label>
    <div class="grid2">
      <label class="field"><span>Kalórie (kcal)</span><input class="input" id="kcal" type="number" inputmode="decimal" step="any" value="${pre.kcal ?? ''}"></label>
      <label class="field"><span>Bielkoviny (g)</span><input class="input" id="protein" type="number" inputmode="decimal" step="any" value="${pre.protein ?? ''}"></label>
      <label class="field"><span>Sacharidy (g)</span><input class="input" id="carbs" type="number" inputmode="decimal" step="any" value="${pre.carbs ?? ''}"></label>
      <label class="field"><span>Tuky (g)</span><input class="input" id="fat" type="number" inputmode="decimal" step="any" value="${pre.fat ?? ''}"></label>
    </div>
    <details class="mb"><summary class="muted small">Vláknina, cukry, soľ, alkohol (nepovinné)</summary><div class="grid3 mt">
      <label class="field"><span>Vláknina</span><input class="input" id="fiber" type="number" inputmode="decimal" step="any" value="${pre.fiber ?? ''}"></label>
      <label class="field"><span>Cukry</span><input class="input" id="sugar" type="number" inputmode="decimal" step="any" value="${pre.sugar ?? ''}"></label>
      <label class="field"><span>Soľ</span><input class="input" id="salt" type="number" inputmode="decimal" step="any" value="${pre.salt ?? ''}"></label>
      <label class="field"><span>Alkohol (% obj.)</span><input class="input" id="abv" type="number" inputmode="decimal" step="any" placeholder="napr. 12" value="${pre.alcohol ? r1(pre.alcohol / 0.79) : ''}"></label></div></details>
    <details class="mb" ${pre.gluten || pre.lactose || Array.isArray(pre.allergens) ? 'open' : ''}><summary class="muted small">Lepok, laktóza, alergény (pre celiakiu, intoleranciu, alergie)</summary><div class="mt">
      <div class="grid2"><label class="field"><span>Lepok</span><select class="input" id="fgl"><option value="">Neviem</option><option value="free" ${pre.gluten === 'free' ? 'selected' : ''}>Bez lepku</option><option value="contains" ${pre.gluten === 'contains' ? 'selected' : ''}>Obsahuje lepok</option></select></label>
      <label class="field"><span>Laktóza</span><select class="input" id="flc"><option value="">Neviem</option><option value="free" ${pre.lactose === 'free' ? 'selected' : ''}>Bez laktózy</option><option value="low" ${pre.lactose === 'low' ? 'selected' : ''}>Málo laktózy</option><option value="high" ${pre.lactose === 'high' ? 'selected' : ''}>Obsahuje laktózu</option></select></label></div>
      <label class="field"><span>Alergény</span><select class="input" id="fam"><option value="">Neviem</option><option value="none" ${Array.isArray(pre.allergens) && !pre.allergens.length ? 'selected' : ''}>Žiadne alergény</option><option value="some" ${Array.isArray(pre.allergens) && pre.allergens.length ? 'selected' : ''}>Obsahuje:</option></select></label>
      <div id="falw" class="row mb" style="flex-wrap:wrap;gap:6px;${Array.isArray(pre.allergens) && pre.allergens.length ? '' : 'display:none'}">${dx.ALLERGENS.map(([k, v]) => `<label class="small"><input type="checkbox" data-fal="${k}" ${(pre.allergens || []).includes(k) ? 'checked' : ''}> ${h(v)}</label>`).join('')}</div>
      <p class="muted small">Vypĺňaj len to, čo vieš z obalu. „Neviem“ appka ukáže ako neoverené, nič nehádže.</p></div></details>
    <p class="small muted mb">Porcie (napr. 1 kus, 1 lyžica, 1 tanier), aby sa nemuselo vážiť:</p>
    <div id="plist"></div>
    <button class="btn sm ghost mb" id="padd">＋ Pridať porciu</button>
    <p class="err small" id="err"></p>
    <button class="btn primary" id="save">${edit ? 'Uložiť zmeny' : 'Uložiť a pridať'}</button>
    ${edit ? '<button class="btn ghost mt" id="del" style="color:var(--danger)">Zmazať jedlo</button>' : ''}`);

  const $ = s => bg.querySelector(s);
  const drawP = () => {
    $('#plist').innerHTML = portions.map((p, i) => `<div class="prow"><input class="input sm" data-pl="${i}" placeholder="1 kus" value="${h(p.label)}"><input class="input sm mono" data-pg="${i}" type="number" inputmode="decimal" placeholder="g" value="${p.g ?? ''}"><span class="muted small">g</span><button class="del" data-pd="${i}">×</button></div>`).join('');
    bg.querySelectorAll('[data-pl]').forEach(el => el.oninput = () => portions[el.dataset.pl].label = el.value);
    bg.querySelectorAll('[data-pg]').forEach(el => el.oninput = () => portions[el.dataset.pg].g = Number(el.value));
    bg.querySelectorAll('[data-pd]').forEach(el => el.onclick = () => { portions.splice(Number(el.dataset.pd), 1); drawP(); });
  };
  drawP();
  $('[data-x]').onclick = () => bg.remove();
  $('#fam').onchange = () => { $('#falw').style.display = $('#fam').value === 'some' ? '' : 'none'; };
  $('#padd').onclick = () => { portions.push({ label: portions.length ? '' : '1 kus', g: '' }); drawP(); bg.querySelector(`[data-pg="${portions.length - 1}"]`)?.focus(); };
  bg.querySelectorAll('[data-b]').forEach(b => b.onclick = () => { basis = b.dataset.b === '100' ? 100 : 'p'; bg.querySelectorAll('[data-b]').forEach(x => x.classList.toggle('on', x === b)); $('#pgWrap').style.display = basis === 100 ? 'none' : ''; });

  $('#save').onclick = async () => {
    const num = id => { const v = $(id).value.trim().replace(',', '.'); return v === '' ? null : Number(v); };
    let k = 1;
    if (basis === 'p') { const pg = num('#pg'); if (!pg) { $('#err').textContent = 'Zadaj, koľko gramov má porcia'; return; } k = 100 / pg; }
    const sc = v => v == null ? null : r1(v * k);
    const row = { name: $('#name').value.trim(), brand: $('#brand').value.trim() || null, barcode: $('#barcode').value.trim() || null,
      kcal: num('#kcal') == null ? null : r0(num('#kcal') * k), protein: sc(num('#protein') ?? 0), carbs: sc(num('#carbs') ?? 0), fat: sc(num('#fat') ?? 0),
      fiber: sc(num('#fiber')), sugar: sc(num('#sugar')), salt: sc(num('#salt')), alcohol: r1((num('#abv') || 0) * 0.79) };
    row.gluten = $('#fgl').value || null; row.lactose = $('#flc').value || null;
    { const am = $('#fam').value, al = [...bg.querySelectorAll('[data-fal]:checked')].map(x => x.dataset.fal);
      row.allergens = am === 'none' ? [] : am === 'some' && al.length ? al : null;
      if (row.gluten === 'contains' && Array.isArray(row.allergens) && !row.allergens.includes('gluten')) row.allergens.push('gluten');
      if ((row.lactose === 'high') && Array.isArray(row.allergens) && !row.allergens.includes('milk')) row.allergens.push('milk'); }
    const ps = portions.slice();
    if (basis === 'p' && !ps.some(p => Number(p.g) === num('#pg'))) ps.unshift({ label: '1 porcia', g: num('#pg') });
    row.portions = ps.filter(p => p.label && p.label.trim() && Number(p.g) > 0).map(p => ({ label: p.label.trim().slice(0, 30), g: Number(p.g) }));
    if (row.barcode && !/^[0-9]{6,14}$/.test(row.barcode)) { $('#err').textContent = 'Čiarový kód má byť 6 až 14 číslic'; return; }
    const err = validate(row); if (err) { $('#err').textContent = err; return; }
    $('#save').disabled = true;
    try {
      const saved = edit ? await db.updateFood(pre.id, row) : await db.createFood(row);
      bg.remove();
      toast(edit ? 'Uložené' : 'Jedlo pridané do databázy');
      openAdd(fromDb(saved), meal, done);
    } catch (e) {
      $('#save').disabled = false;
      $('#err').textContent = /barcode|duplicate|unique/i.test(e.message) ? 'Produkt s týmto čiarovým kódom už v databáze je. Vyhľadáj ho alebo naskenuj.' : e.message;
    }
  };
  $('#del')?.addEventListener('click', async () => {
    if (!confirm('Naozaj zmazať toto jedlo z databázy? Zápisy v deníku ostanú.')) return;
    try { await db.deleteFoodItem(pre.id); bg.remove(); toast('Zmazané'); renderFood(); } catch (e) { toast(e.message, true); }
  });
}

// Lepok, laktóza a alergény receptu sa odvodia zo surôvin. Ak o jednej nevieme, recept to nepredstiera.
async function recipeFlags(items) {
  const ids = [...new Set(items.map(i => i.food_id).filter(Boolean))];
  const m = {};
  if (ids.length) { const { data } = await db.sb.from('foods').select('id,gluten,lactose,allergens,traces').in('id', ids); (data || []).forEach(f => { m[f.id] = f; }); }
  const L = items.map(i => m[i.food_id] || {});
  const all = k => L.every(f => f[k] != null);
  const gluten = L.some(f => f.gluten === 'contains') ? 'contains' : L.some(f => f.gluten === 'traces') ? 'traces' : all('gluten') ? 'free' : null;
  const lactose = L.some(f => f.lactose === 'high') ? 'high' : L.some(f => f.lactose === 'low') ? 'low' : all('lactose') ? 'free' : null;
  const known = L.every(f => Array.isArray(f.allergens));
  const un = [...new Set(L.flatMap(f => Array.isArray(f.allergens) ? f.allergens : []))];
  const tr = [...new Set(L.flatMap(f => Array.isArray(f.traces) ? f.traces : []))];
  return { gluten, lactose, allergens: known ? un : null, traces: known ? (tr.length ? tr : null) : [...new Set([...un, ...tr])] };
}

// ---------- hotové recepty (Inšpiruj sa) ----------
function presetItems(r) { return r.ing.map(i => ({ food_id: null, name: i.name, grams: i.grams, per100: { ...i.per100 } })); }
async function addPreset(r, meal, done, qty = 1) {
  const uid = state().profile.id;
  const exist = (await db.myFoods(uid).catch(() => [])).find(f => f.is_recipe && f.name === r.name);
  let saved = exist;
  if (!saved) {
    const k = 100 / r.grams, t = r.ing.reduce((a, i) => { const f = i.grams / 100; a.kcal += i.per100.kcal * f; a.protein += i.per100.protein * f; a.carbs += i.per100.carbs * f; a.fat += i.per100.fat * f; return a; }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
    const { photoOf } = await import('./recipes.photos2.js');
    const row = { name: r.name, is_recipe: true, servings: r.servings, total_grams: r0(r.grams), is_public: false, img: photoOf(r.id, 500),
      kcal: r0(t.kcal * k), protein: r1(t.protein * k), carbs: r1(t.carbs * k), fat: r1(t.fat * k),
      portions: [{ label: '1 porcia', g: r0(r.grams / r.servings) }], recipe: presetItems(r) };
    const err = validate(row); if (err) throw new Error(err);
    Object.assign(row, await recipeFlags(row.recipe));
    saved = await db.createFood(row);
  }
  const food = fromDb(saved); food.lastPortion = '1 porcia'; food.lastQty = qty;
  openAdd(food, meal, done);
}
function editPreset(r, meal, done) { openRecipeEditor({ name: r.name, servings: r.servings, recipe: presetItems(r), is_public: false }, meal, done); }
const recipeHubK = { addPreset, editPreset, openMine: (meal, done) => openRecipeEditor(null, meal, done, true) };

// ---------- recepty ----------
export function openRecipeEditor(pre, meal, done, withTabs) {
  const edit = !!pre?.id;
  let items = (pre?.recipe || []).map(i => ({ ...i }));
  const bg = sheet(`<div class="row between"><h2>${edit ? 'Upraviť recept' : withTabs ? 'Recepty' : 'Nový recept'}</h2><button class="del" data-x aria-label="Zavrieť">×</button></div>
    ${withTabs ? hubTabs('mine') : ''}
    <p class="muted small mt mb">Zadaj suroviny tak, ako ich dávaš do hrnca. Appka spočíta hodnoty na porciu.</p>
    <label class="field"><span>Názov</span><input class="input" id="name" maxlength="120" placeholder="Napr. Mamina sviečková" value="${h(pre?.name || '')}"></label>
    <label class="field"><span>Počet porcií</span><input class="input" id="serv" type="number" inputmode="numeric" min="1" value="${pre?.servings || 4}"></label>
    <p class="sec">Suroviny</p><div id="ilist"></div>
    <div class="input-row mt"><input class="input" id="iq" placeholder="Pridaj surovinu: ryža, kuracie..." autocomplete="off"></div>
    <div id="ires" class="results"></div>
    <button class="btn ghost sm mt" type="button" id="itext">✨ Vložiť celý recept textom</button>
    <div id="itbox" hidden><textarea class="input mt" id="itxt" rows="4" placeholder="Skopíruj suroviny z receptu, napr.:\n500 g kuracích pŕs, 300 g ryže, 2 vajcia, lyžica oleja, 1 cibuľa"></textarea>
      <button class="btn sm primary mt" type="button" id="itgo">Rozpoznať suroviny</button><p class="muted small mt">AI rozloží text na suroviny a dá im hodnoty z našej databázy. Gramy si potom skontroluj.</p></div>
    <div class="stat mt" id="tot"></div>
    <label class="row mt small"><input type="checkbox" id="pub" ${pre?.is_public === false ? '' : 'checked'}> Zdieľať recept s ostatnými</label>
    <p class="err small" id="err"></p>
    <button class="btn primary mt" id="save">${edit ? 'Uložiť recept' : 'Uložiť a pridať porciu'}</button>`);
  const $ = s => bg.querySelector(s);
  const totals = () => items.reduce((a, i) => { const s = calc.scale(i.per100, i.grams); a.g += Number(i.grams || 0); a.kcal += s.kcal; a.protein += s.protein; a.carbs += s.carbs; a.fat += s.fat; return a; }, { g: 0, kcal: 0, protein: 0, carbs: 0, fat: 0 });
  const draw = () => {
    $('#ilist').innerHTML = items.length ? items.map((i, n) => `<div class="prow"><span class="pn">${h(i.name)}</span><input class="input sm mono" data-ig="${n}" type="number" inputmode="decimal" value="${i.grams}"><span class="muted small">g</span><button class="del" data-id="${n}">×</button></div>`).join('') : '<p class="empty">Zatiaľ žiadne suroviny.</p>';
    bg.querySelectorAll('[data-ig]').forEach(el => el.oninput = () => { items[el.dataset.ig].grams = Number(el.value); tot(); });
    bg.querySelectorAll('[data-id]').forEach(el => el.onclick = () => { items.splice(Number(el.dataset.id), 1); draw(); });
    tot();
  };
  const tot = () => { const t = totals(), sv = Math.max(1, Number($('#serv').value) || 1); $('#tot').innerHTML = `<b class="mono">${r0(t.kcal / sv)} kcal / porcia</b><span>Spolu ${r0(t.g)} g · ${r0(t.kcal)} kcal · porcia ${r0(t.g / sv)} g · B ${r1(t.protein / sv)} · S ${r1(t.carbs / sv)} · T ${r1(t.fat / sv)}</span>`; };
  $('#serv').oninput = tot; draw();
  $('[data-x]').onclick = () => bg.remove();
  $('[data-rh="insp"]')?.addEventListener('click', () => { bg.remove(); openRecipeHub(meal, done, recipeHubK); });

  let timer, seq = 0; const found = new Map();
  $('#iq').oninput = () => {
    clearTimeout(timer); const q = $('#iq').value.trim();
    if (q.length < 2) { $('#ires').innerHTML = ''; return; }
    timer = setTimeout(async () => {
      const my = ++seq; const res = (await db.searchFoods(q, 8).catch(() => [])).filter(f => !f.is_recipe).map(fromDb);
      if (my !== seq) return;
      found.clear(); res.forEach((f, i) => found.set('i' + i, f));
      $('#ires').innerHTML = res.length ? res.map((f, i) => row(f, 'i' + i)).join('') : `<p class="empty">Nenašlo sa. <a href="#" id="inew">Pridať „${h(q)}“ do databázy</a></p>`;
      $('#ires').querySelectorAll('[data-k]').forEach(el => el.onclick = () => {
        const f = found.get(el.dataset.k); const g = f.portions?.[0]?.g || 100;
        items.push({ food_id: f.id, name: f.name, grams: g, per100: { kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat } });
        $('#iq').value = ''; $('#ires').innerHTML = ''; draw();
      });
      $('#inew')?.addEventListener('click', e => { e.preventDefault(); toast('Najprv ulož recept bez tejto suroviny alebo ju pridaj cez Nové jedlo', true); });
    }, 120);
  };

  // celý recept textom: AI rozloží suroviny, hodnoty z databázy (rovnaká cesta ako zápis jedla textom)
  $('#itext').onclick = () => { const b = $('#itbox'); b.hidden = !b.hidden; if (!b.hidden) $('#itxt').focus(); };
  $('#itgo').onclick = async () => {
    const text = $('#itxt').value.trim(); if (text.length < 3) return;
    const btn = $('#itgo'); btn.disabled = true; btn.textContent = 'Rozpoznávam…';
    try {
      const { data, error } = await db.sb.functions.invoke('ai-log', { body: { text } });
      let msg = error ? 'AI teraz neodpovedala. Skús to o chvíľu.' : data?.error;
      if (error) { try { const j = await error.context.json(); if (j?.error) msg = j.error; } catch (_) { /* ostáva */ } }
      if (msg) throw new Error(msg);
      const got = (data?.items || []).filter(it => it.grams > 0);
      if (!got.length) throw new Error(data?.note || 'V texte som nenašiel suroviny.');
      got.forEach(it => {
        const m = !it.useEstimate && it.matches?.[0];
        items.push(m ? { food_id: m.id, name: m.name, grams: Math.round(it.grams), per100: { kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat } }
          : { food_id: null, name: it.name, grams: Math.round(it.grams), per100: { kcal: it.estimate.kcal, protein: it.estimate.protein, carbs: it.estimate.carbs, fat: it.estimate.fat } });
      });
      $('#itxt').value = ''; $('#itbox').hidden = true; draw();
      toast(`Pridané: ${got.length} ${got.length === 1 ? 'surovina' : got.length < 5 ? 'suroviny' : 'surôvin'}`);
    } catch (e) { toast(e.message, true); }
    finally { btn.disabled = false; btn.textContent = 'Rozpoznať suroviny'; }
  };

  $('#save').onclick = async () => {
    const name = $('#name').value.trim(), sv = Math.max(1, Number($('#serv').value) || 1), t = totals();
    if (name.length < 2) { $('#err').textContent = 'Zadaj názov receptu'; return; }
    if (!items.length || t.g <= 0) { $('#err').textContent = 'Pridaj aspoň jednu surovinu'; return; }
    const k = 100 / t.g;
    const row = { name, is_recipe: true, servings: sv, total_grams: r0(t.g), is_public: $('#pub').checked,
      kcal: r0(t.kcal * k), protein: r1(t.protein * k), carbs: r1(t.carbs * k), fat: r1(t.fat * k),
      portions: [{ label: '1 porcia', g: r0(t.g / sv) }], recipe: items.map(i => ({ food_id: i.food_id, name: i.name, grams: i.grams, per100: i.per100 })) };
    const err = validate(row); if (err) { $('#err').textContent = err; return; }
    $('#save').disabled = true;
    try {
      Object.assign(row, await recipeFlags(items));
      const saved = edit ? await db.updateFood(pre.id, row) : await db.createFood(row);
      bg.remove(); toast('Recept uložený');
      openAdd(fromDb(saved), meal, done);
    } catch (e) { $('#save').disabled = false; $('#err').textContent = e.message; }
  };
}

// ---------- nahlásenie chyby ----------
function openReport(food) {
  const reasons = ['Nesprávne kalórie alebo makrá', 'Zlý názov alebo značka', 'Duplicitné jedlo', 'Nevhodný obsah'];
  const bg = sheet(`<h2 class="mb">Nahlásiť chybu</h2><p class="muted small mb">${h(food.name)}</p>
    ${reasons.map((r, i) => `<label class="rrow"><input type="radio" name="r" value="${h(r)}" ${i === 0 ? 'checked' : ''}><span class="rl">${r}</span></label>`).join('')}
    <label class="field mt"><span>Poznámka (nepovinné)</span><input class="input" id="note" maxlength="200" placeholder="Napr. na obale je 120 kcal"></label>
    <button class="btn primary" id="send">Odoslať</button>`);
  bg.querySelector('#send').onclick = async () => {
    const r = bg.querySelector('input[name=r]:checked').value, note = bg.querySelector('#note').value.trim();
    try { await db.reportFood(food.id, state().profile.id, (r + (note ? ': ' + note : '')).slice(0, 300)); bg.remove(); toast('Ďakujeme, pozrieme sa na to'); }
    catch (e) { toast(e.message, true); }
  };
}

// ---------- rýchle kalórie ----------
function openQuick(meal) {
  const bg = sheet(`<h2 class="mb">Len kalórie</h2><p class="muted small mb">Keď nevieš presne, čo si jedol, zadaj aspoň odhad.</p>
    <label class="field"><span>Názov</span><input class="input" id="n" placeholder="Napr. obed v reštaurácii"></label>
    <div class="grid2"><label class="field"><span>kcal</span><input class="input" id="k" type="number" inputmode="numeric"></label><label class="field"><span>Bielkoviny (g)</span><input class="input" id="p" type="number" inputmode="numeric" value="0"></label></div>
    <button class="btn primary" id="save">Pridať</button>`);
  bg.querySelector('#save').onclick = async () => {
    const name = bg.querySelector('#n').value.trim() || 'Odhad';
    const kcal = Number(bg.querySelector('#k').value); if (!kcal) return toast('Zadaj kcal', true);
    await db.addFood({ user_id: state().profile.id, date: state().date, meal, name, grams: 0, kcal, protein: Number(bg.querySelector('#p').value || 0), carbs: 0, fat: 0, source: 'quick' });
    bg.remove(); toast('Pridané'); location.hash = '#/';
  };
}

// ---------- čiarový kód ----------
async function openScan(meal, done) {
  const code = await scanBarcode();
  if (!code) return;
  toast('Hľadám ' + code);
  const local = await db.foodByBarcode(code).catch(() => null);
  if (local) return openAdd(fromDb(local), meal, done);
  const off = await lookupBarcode(code).catch(() => null);
  if (off) return openAdd(fromOff(off), meal, done);
  toast('Produkt zatiaľ nikto nepridal. Pridaj ho ty, ďalš� ho už nájdu.');
  openFoodEditor({ barcode: code }, meal, done);
}
