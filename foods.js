// Jedlo v0.4: komunitná databáza, porcie, vlastné jedlá, recepty, kopírovanie, čiarové kódy
import * as db from './data.js';
import * as calc from './calc.js';
import { searchOFF, lookupBarcode } from './food.js';
import { ctx } from './app.js';
import { scanBarcode } from './scan.js';
import { aiBoxHtml, bindAiBox } from './ailog.js';

const $app = () => ctx.$app;
const state = () => ctx.state;
const h = (...a) => ctx.h(...a), r0 = (...a) => ctx.r0(...a), toast = (...a) => ctx.toast(...a), sheet = (...a) => ctx.sheet(...a), nav = (...a) => ctx.nav(...a);
const MEALS = () => ctx.MEALS;
const r1 = v => Math.round(Number(v || 0) * 10) / 10;

export function defaultMeal() {
  const hr = new Date().getHours();
  return hr < 10 ? 'breakfast' : hr < 15 ? 'lunch' : hr < 21 ? 'dinner' : 'snack';
}

// Jedlo z akéhokoľvek zdroja -> jednotný tvar s hodnotami na 100 g
function fromDb(f) {
  return { id: f.id, name: f.name, brand: f.brand || '', barcode: f.barcode || null, kcal: Number(f.kcal), protein: Number(f.protein), carbs: Number(f.carbs), fat: Number(f.fat),
    portions: Array.isArray(f.portions) ? f.portions : [], verified: !!f.verified, is_recipe: !!f.is_recipe, mine: f.mine ?? (f.created_by === state().profile.id),
    created_by: f.created_by, source: 'db', raw: f };
}
function fromOff(f) { return { ...f, portions: [], source: 'off' }; }
async function fromLog(l) {
  if (l.food_id) { const f = await db.getFood(l.food_id).catch(() => null); if (f) return { ...fromDb(f), lastPortion: l.portion, lastQty: l.qty, lastGrams: l.grams }; }
  const g = Number(l.grams) || 100, k = 100 / g;
  return { name: l.name, brand: l.brand || '', barcode: l.barcode, kcal: l.kcal * k, protein: l.protein * k, carbs: l.carbs * k, fat: l.fat * k, portions: [], source: l.source || 'manual', lastGrams: g };
}

function per100Line(f) { return `${r0(f.kcal)} kcal · B ${r1(f.protein)} · S ${r1(f.carbs)} · T ${r1(f.fat)} na 100 g`; }
function row(f, key) {
  const por = f.portions?.[0];
  const sub = [f.brand, por ? `${h(por.label)} = ${r0(por.g)} g` : null].filter(Boolean).map(h).join(' · ');
  const kcalShown = por ? r0(f.kcal * por.g / 100) : r0(f.kcal);
  return `<div class="res" data-k="${key}"><div class="n"><b>${h(f.name)}${f.verified ? ' <span class="vf" title="Overené">✓</span>' : ''}${f.is_recipe ? ' <span class="chip">recept</span>' : ''}</b><span>${sub || '100 g'}</span></div><span class="k mono">${kcalShown}<small>${por ? '/' + h(por.label.replace(/^1 /, '')) : '/100 g'}</small></span></div>`;
}

// ---------- obrazovka ----------
export async function renderFood() {
  const params = new URLSearchParams((location.hash.split('?')[1]) || '');
  let meal = params.get('meal') || defaultMeal();
  const uid = state().profile.id;
  let tab = 'recent';
  const pool = new Map();
  const put = (f) => { const k = 'f' + pool.size; pool.set(k, f); return k; };

  $app().innerHTML = `<div class="screen">
    <div class="topbar"><h1>Pridať jedlo</h1>${ctx.datePicker()}</div>
    <div class="seg mb" id="mealseg">${Object.entries(MEALS()).map(([k, l]) => `<button data-meal="${k}" class="${k === meal ? 'on' : ''}">${l}</button>`).join('')}</div>
    ${aiBoxHtml()}
    <div class="input-row mb">
      <input class="input" id="q" placeholder="Hľadaj akékoľvek jedlo alebo produkt" autocomplete="off" enterkeyhint="search">
      <button class="btn icon" id="scan" title="Čiarový kód" aria-label="Skenovať čiarový kód"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M11 8v8M15 8v8M18 8v8"/></svg></button>
    </div>
    <div class="qa mb">
      <button class="qa-b" id="newFood"><b>＋</b><span>Nové jedlo</span></button>
      <button class="qa-b" id="newRecipe"><b>🍲</b><span>Recept</span></button>
      <button class="qa-b" id="copyY"><b>↻</b><span>Z včera</span></button>
      <button class="qa-b" id="quick"><b>⚡</b><span>Len kcal</span></button>
    </div>
    <div class="seg mb" id="tabs"><button data-t="recent" class="on">Naposledy</button><button data-t="mine">Moje jedlá a recepty</button></div>
    <div class="card"><div id="results" class="results"><div class="spinner"></div></div></div>
  </div>${nav('#/jedlo')}`;

  const $res = $app().querySelector('#results'), $q = $app().querySelector('#q'), $tabs = $app().querySelector('#tabs');
  const done = () => { toast('Pridané do: ' + MEALS()[meal].toLowerCase()); location.hash = '#/'; };
  const pick = async k => { const f = pool.get(k); if (!f) return; openAdd(f.log ? await fromLog(f.log) : f, meal, done); };
  const bind = () => $res.querySelectorAll('[data-k]').forEach(el => el.onclick = () => pick(el.dataset.k));

  // ---------- rýchle pridanie z Naposledy: jedno ťuknutie, hromadný výber, späť ----------
  let multi = false; const chosen = new Set(); let added = [];
  const logRow = l => ({ user_id: uid, date: state().date, meal, name: l.name, brand: l.brand || null, grams: l.grams, kcal: l.kcal, protein: l.protein, carbs: l.carbs, fat: l.fat,
    source: l.source || 'manual', barcode: l.barcode || null, food_id: l.food_id || null, portion: l.portion || null, qty: l.qty ?? null });
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

  async function showTab() {
    $res.innerHTML = '<div class="spinner"></div>';
    try {
      if (tab === 'recent') {
        const logs = await db.recentLogs(uid, 25);
        $res.innerHTML = logs.length ? `<div class="fast-h"><span>${multi ? 'Vyber položky a pridaj naraz' : 'Ťukni na + a je to zapísané'}</span><button id="multi">${multi ? 'Zrušiť' : 'Vybrať viac'}</button></div>` + logs.map(l => {
          const k = put({ log: l });
          return `<div class="res fast ${multi ? 'multi' : ''}" data-k="${k}">${multi ? `<span class="fchk" data-chk="${k}"></span>` : ''}<div class="n"><b>${h(l.name)}</b><span>${[l.brand, l.portion ? `${r1(l.qty)}× ${l.portion}` : `${r0(l.grams)} g`].filter(Boolean).map(h).join(' · ')}</span></div><span class="k mono">${r0(l.kcal)}</span>${multi ? '' : `<button class="qadd" data-qa="${k}" aria-label="Pridať">+</button>`}</div>`;
        }).join('') : '<p class="empty">Zatiaľ nič. Napíš hore, čo si jedol, vyhľadaj jedlo alebo naskenuj čiarový kód.</p>';
      } else {
        const mine = (await db.myFoods(uid)).map(fromDb);
        $res.innerHTML = mine.length ? mine.map(f => row(f, put(f))).join('') : '<p class="empty">Tu sa zobrazia jedlá a recepty, ktoré pridáš ty. Pomôžeš tým aj ostatným.</p>';
      }
      bind();
      if (tab === 'recent') bindFast();
    } catch (e) { $res.innerHTML = `<p class="empty">${h(e.message)}</p>`; }
  }
  showTab();

  $tabs.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; $tabs.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); showTab(); });
  ctx.bindDatePicker($app(), renderFood);
  bindAiBox($app(), () => meal, m => { location.hash = '#/'; });
  if (params.get('ai')) setTimeout(() => $app().querySelector('#aiText')?.focus(), 50);
  $app().querySelectorAll('[data-meal]').forEach(b => b.onclick = () => { meal = b.dataset.meal; $app().querySelectorAll('[data-meal]').forEach(x => x.classList.toggle('on', x === b)); });

  let ctrl = null, timer = null, seq = 0;
  $q.oninput = () => {
    const q = $q.value.trim();
    clearTimeout(timer);
    if (!q) { $tabs.style.display = ''; showTab(); return; }
    if (multi) { multi = false; chosen.clear(); drawBar(); }
    $tabs.style.display = 'none';
    timer = setTimeout(async () => {
      const my = ++seq;
      $res.innerHTML = '<div class="spinner"></div>';
      const local = await db.searchFoods(q, 30).catch(() => []);
      if (my !== seq) return;
      const addMore = `<button class="btn ghost mt" id="addQ">＋ Pridať „${h(q)}“ do databázy</button>`;
      $res.innerHTML = (local.length ? '<p class="sec">Databáza Druhý dych</p>' + local.map(f => row(fromDb(f), put(fromDb(f)))).join('') : '')
        + '<div id="offBox"><div class="spinner"></div></div>' + addMore;
      bind();
      $res.querySelector('#addQ').onclick = () => openFoodEditor({ name: q }, meal, done);
      if (ctrl) ctrl.abort(); ctrl = new AbortController();
      try {
        const off = (await searchOFF(q, { signal: ctrl.signal })).filter(o => !local.some(l => l.barcode && l.barcode === o.barcode));
        if (my !== seq) return;
        const box = $res.querySelector('#offBox');
        box.innerHTML = off.length ? '<p class="sec">Open Food Facts</p>' + off.map(o => row(fromOff(o), put(fromOff(o)))).join('') : (local.length ? '' : '<p class="empty">Nič sa nenašlo. Pridaj to jedlo do databázy, nájdu ho potom aj ostatní.</p>');
        bind();
      } catch (err) { if (err.name !== 'AbortError') { const box = $res.querySelector('#offBox'); if (box) box.innerHTML = ''; } }
    }, 250);
  };

  $app().querySelector('#newFood').onclick = () => openFoodEditor({ name: $q.value.trim() }, meal, done);
  $app().querySelector('#newRecipe').onclick = () => openRecipeEditor(null, meal, done);
  $app().querySelector('#quick').onclick = () => openQuick(meal);
  $app().querySelector('#scan').onclick = () => openScan(meal, done);
  $app().querySelector('#copyY').onclick = async () => {
    const d = state().date, y = calc.addDays(d, -1);
    try {
      const n = await db.copyMeal(uid, y, d, meal);
      if (!n) return toast(`Včera si nemal nič zapísané v: ${MEALS()[meal].toLowerCase()}`, true);
      toast(`Skopírované: ${n} ${n === 1 ? 'položka' : n < 5 ? 'položky' : 'položiek'}`); location.hash = '#/';
    } catch (e) { toast(e.message, true); }
  };
}

// ---------- pridanie do denníka (porcie) ----------
export function openAdd(food, meal, done) {
  const portions = [{ label: 'g', g: 1 }, ...(food.portions || [])];
  let unit = 0, qty = 100;
  if (food.lastPortion) { const i = portions.findIndex(p => p.label === food.lastPortion); if (i > 0) { unit = i; qty = Number(food.lastQty) || 1; } }
  else if (food.lastGrams) qty = Number(food.lastGrams);
  else if (portions.length > 1) { unit = 1; qty = 1; }

  const bg = sheet(`<div class="row between"><h2>${h(food.name)}${food.verified ? ' <span class="vf">✓</span>' : ''}</h2><button class="del" data-x aria-label="Zavrieť">×</button></div>
    <p class="muted small mt">${food.brand ? h(food.brand) + ' · ' : ''}${per100Line(food)}</p>
    <div class="units mt" id="units">${portions.map((p, i) => `<button data-u="${i}" class="${i === unit ? 'on' : ''}">${i === 0 ? 'gramy' : `${h(p.label)} <small>${r0(p.g)} g</small>`}</button>`).join('')}</div>
    <div class="qty mt"><button class="btn icon" data-d="-1">−</button><input class="input mono" id="qty" type="number" inputmode="decimal" min="0" step="any"><button class="btn icon" data-d="1">+</button></div>
    <div class="stat mt" id="calc"></div>
    <button class="btn primary mt" id="save">Pridať do: ${MEALS()[meal].toLowerCase()}</button>
    <div class="row between mt small">${food.source === 'db' ? `<a href="#" id="rep" class="muted">Nahlásiť chybu</a>` : '<span></span>'}${food.source === 'db' && (food.mine || state().profile.role === 'coach') ? `<a href="#" id="edit">Upraviť jedlo</a>` : ''}</div>`);

  const $qty = bg.querySelector('#qty'), $calc = bg.querySelector('#calc');
  const grams = () => unit === 0 ? Number($qty.value || 0) : Number($qty.value || 0) * portions[unit].g;
  const upd = () => { const s = calc.scale(food, grams()); $calc.innerHTML = `<b class="mono">${s.kcal} kcal</b><span>${r0(grams())} g · B ${s.protein} g · S ${s.carbs} g · T ${s.fat} g</span>`; };
  const setUnit = i => { unit = i; bg.querySelectorAll('[data-u]').forEach(b => b.classList.toggle('on', Number(b.dataset.u) === i)); };
  $qty.value = qty; upd();
  bg.querySelector('[data-x]').onclick = () => bg.remove();
  bg.querySelectorAll('[data-u]').forEach(b => b.onclick = () => { const i = Number(b.dataset.u); if (i === unit) return; const g = grams(); setUnit(i); $qty.value = i === 0 ? r0(g || 100) : (r1(g / portions[i].g) || 1); upd(); });
  bg.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { const step = unit === 0 ? 10 : 0.5; $qty.value = Math.max(0, r1(Number($qty.value || 0) + step * Number(b.dataset.d))); upd(); });
  $qty.oninput = upd;

  bg.querySelector('#save').onclick = async () => {
    const g = grams(); if (!g) return toast('Zadaj množstvo', true);
    const btn = bg.querySelector('#save'); btn.disabled = true;
    try {
      let f = food;
      // produkt z Open Food Facts uložíme do našej databázy, nech ho nabudúce nájdu všetci
      if (f.source === 'off' && f.barcode) f = await importOff(f).catch(() => f);
      const s = calc.scale(f, g);
      await db.addFood({ user_id: state().profile.id, date: state().date, meal, name: f.name, brand: f.brand || null, grams: r1(g), ...s,
        source: f.source === 'db' ? 'db' : (f.source || 'manual'), barcode: f.barcode || null, food_id: f.id || null,
        portion: unit === 0 ? null : portions[unit].label, qty: unit === 0 ? null : Number($qty.value) });
      if (f.id) db.foodUsed(f.id);
      bg.remove(); done();
    } catch (err) { toast(err.message, true); btn.disabled = false; }
  };
  bg.querySelector('#rep')?.addEventListener('click', e => { e.preventDefault(); openReport(food); });
  bg.querySelector('#edit')?.addEventListener('click', e => { e.preventDefault(); bg.remove(); food.is_recipe ? openRecipeEditor(food.raw, meal, done) : openFoodEditor(food.raw, meal, done); });
}

async function importOff(f) {
  const exist = await db.foodByBarcode(f.barcode);
  if (exist) return fromDb(exist);
  const row = { name: f.name.slice(0, 120), brand: (f.brand || '').split(',')[0].slice(0, 80) || null, barcode: f.barcode, kcal: r0(f.kcal), protein: r1(f.protein), carbs: r1(f.carbs), fat: r1(f.fat) };
  if (validate(row)) return f; // nesedia hodnoty, neukladáme
  return fromDb(await db.createFood(row));
}

// ---------- kontrola hodnôt (rovnaká ako v databáze) ----------
function validate(f) {
  if (!f.name || f.name.trim().length < 2) return 'Zadaj názov jedla';
  for (const k of ['kcal', 'protein', 'carbs', 'fat']) if (f[k] === '' || f[k] == null || isNaN(f[k]) || f[k] < 0) return 'Vyplň kalórie a makrá (0, ak niečo neobsahuje)';
  if (f.kcal > 900) return 'Viac ako 900 kcal na 100 g nemá žiadne jedlo. Skontroluj, či nezadávaš kJ.';
  if (f.protein + f.carbs + f.fat > 100.5) return 'Bielkoviny + sacharidy + tuky nemôžu byť viac ako 100 g v 100 g';
  const est = 4 * f.protein + 4 * f.carbs + 9 * f.fat;
  if (Math.abs(f.kcal - est) > Math.max(40, 0.3 * f.kcal)) return `Kalórie nesedia s makrami. Podľa makier vychádza približne ${r0(est)} kcal, zadal si ${r0(f.kcal)}.`;
  return null;
}

// ---------- nové / upraviť jedlo ----------
export function openFoodEditor(pre = {}, meal, done) {
  const edit = !!pre.id;
  let portions = Array.isArray(pre.portions) ? pre.portions.map(p => ({ ...p })) : [];
  let basis = 100; // hodnoty zadané na 100 g alebo na porciu
  const bg = sheet(`<div class="row between"><h2>${edit ? 'Upraviť jedlo' : 'Nové jedlo'}</h2><button class="del" data-x aria-label="Zavrieť">×</button></div>
    <p class="muted small mt mb">Hodnoty nájdeš na obale v tabuľke výživých hodnôt. Jedlo uvidia aj ostatní používatelia.</p>
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
    <details class="mb"><summary class="muted small">Vláknina, cukry, soľ (nepovinné)</summary><div class="grid3 mt">
      <label class="field"><span>Vláknina</span><input class="input" id="fiber" type="number" inputmode="decimal" step="any" value="${pre.fiber ?? ''}"></label>
      <label class="field"><span>Cukry</span><input class="input" id="sugar" type="number" inputmode="decimal" step="any" value="${pre.sugar ?? ''}"></label>
      <label class="field"><span>Soľ</span><input class="input" id="salt" type="number" inputmode="decimal" step="any" value="${pre.salt ?? ''}"></label></div></details>
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
  $('#padd').onclick = () => { portions.push({ label: portions.length ? '' : '1 kus', g: '' }); drawP(); bg.querySelector(`[data-pg="${portions.length - 1}"]`)?.focus(); };
  bg.querySelectorAll('[data-b]').forEach(b => b.onclick = () => { basis = b.dataset.b === '100' ? 100 : 'p'; bg.querySelectorAll('[data-b]').forEach(x => x.classList.toggle('on', x === b)); $('#pgWrap').style.display = basis === 100 ? 'none' : ''; });

  $('#save').onclick = async () => {
    const num = id => { const v = $(id).value.trim().replace(',', '.'); return v === '' ? null : Number(v); };
    let k = 1;
    if (basis === 'p') { const pg = num('#pg'); if (!pg) { $('#err').textContent = 'Zadaj, koľko gramov má porcia'; return; } k = 100 / pg; }
    const sc = v => v == null ? null : r1(v * k);
    const row = { name: $('#name').value.trim(), brand: $('#brand').value.trim() || null, barcode: $('#barcode').value.trim() || null,
      kcal: num('#kcal') == null ? null : r0(num('#kcal') * k), protein: sc(num('#protein') ?? 0), carbs: sc(num('#carbs') ?? 0), fat: sc(num('#fat') ?? 0),
      fiber: sc(num('#fiber')), sugar: sc(num('#sugar')), salt: sc(num('#salt')) };
    const ps = portions.slice();
    if (basis === 'p' && !ps.some(p => Number(p.g) === num('#pg'))) ps.unshift({ label: '1 porcia', g: num('#pg') });
    row.portions = ps.filter(p => p.label && p.label.trim() && Number(p.g) > 0).map(p => ({ label: p.label.trim().slice(0, 30), g: Number(p.g) }));
    if (row.barcode && !/^[0-9]{6,14}$/.test(row.barcode)) { $('#err').textContent = 'Čiarový kód má mať 6 až 14 číslic'; return; }
    const err = validate(row); if (err) { $('#err').textContent = err; return; }
    $('#save').disabled = true;
    try {
      const saved = edit ? await db.updateFood(pre.id, row) : await db.createFood(row);
      bg.remove();
      toast(edit ? 'Uložené' : 'Jedlo pridané do databázy');
      openAdd(fromDb(saved), meal, done);
    } catch (e) {
      $('#save').disabled = false;
      $('#err').textContent = /barcode|duplicate|unique/i.test(e.message) ? 'Produkt s týmto čiarovým kódom už v databáze je. Vyhľadaj ho alebo naskenuj.' : e.message;
    }
  };
  $('#del')?.addEventListener('click', async () => {
    if (!confirm('Naozaj zmazať toto jedlo z databázy? Zápisy v denníku ostanú.')) return;
    try { await db.deleteFoodItem(pre.id); bg.remove(); toast('Zmazané'); renderFood(); } catch (e) { toast(e.message, true); }
  });
}

// ---------- recepty ----------
export function openRecipeEditor(pre, meal, done) {
  const edit = !!pre?.id;
  let items = (pre?.recipe || []).map(i => ({ ...i }));
  const bg = sheet(`<div class="row between"><h2>${edit ? 'Upraviť recept' : 'Nový recept'}</h2><button class="del" data-x aria-label="Zavrieť">×</button></div>
    <p class="muted small mt mb">Zadaj suroviny tak, ako ich dávaš do hrnca. Appka spočíta hodnoty na porciu.</p>
    <label class="field"><span>Názov</span><input class="input" id="name" maxlength="120" placeholder="Napr. Mamina sviečková" value="${h(pre?.name || '')}"></label>
    <label class="field"><span>Počet porcií</span><input class="input" id="serv" type="number" inputmode="numeric" min="1" value="${pre?.servings || 4}"></label>
    <p class="sec">Suroviny</p><div id="ilist"></div>
    <div class="input-row mt"><input class="input" id="iq" placeholder="Pridaj surovinu: ryža, kuracie..." autocomplete="off"></div>
    <div id="ires" class="results"></div>
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
    }, 250);
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
  toast('Produkt zatiaľ nikto nepridal. Pridaj ho ty, ďalší ho už nájdu.');
  openFoodEditor({ barcode: code }, meal, done);
}
