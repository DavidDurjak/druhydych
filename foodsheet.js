// Karta jedla (v152): fotka a názov, výber jedla dňa, porcia s rýchlymi voľbami, kalórie s rozložením makier
// a „Vplyv na tvoj deň“: štyri kolieska (kalórie, bielkoviny, sacharidy, tuky), kde vidno, čo už máš zjedené a koľko pridá toto jedlo.
// Navyše „Dorovnať“: appka sama vypočíta množstvo, ktoré presne doplní zvyšné kalórie alebo bielkoviny (ako MacroFactor).
import * as db from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';
import * as dx from './dxcore.js';
import { thumb } from './foodimg.js';
import { isFav, toggle as toggleFav } from './favs.js';

const state = () => ctx.state;
const h = (...a) => ctx.h(...a), toast = (...a) => ctx.toast(...a), sheet = (...a) => ctx.sheet(...a);
const MEALS = () => ctx.MEALS;
const r0 = v => Math.round(Number(v || 0));
const r1 = v => Math.round(Number(v || 0) * 10) / 10;
const fmt = v => String(r1(v)).replace('.', ',');

const CSS = `
.fs .fs-top{display:flex;gap:14px;align-items:center}
.fs .fs-ph{flex:none;width:72px;height:72px;border-radius:20px;overflow:hidden;background:var(--bg-2);border:1px solid var(--line);display:grid;place-items:center}
.fs .fs-ph .ft{width:72px!important;height:72px!important;border-radius:20px!important;border:0!important;margin:0!important;font-size:34px}
.fs .fs-ph .ft img{width:100%;height:100%;object-fit:cover}
.fs .fs-t{flex:1;min-width:0}
.fs .fs-t h2{font-size:21px;line-height:1.2;letter-spacing:-.02em;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.fs .fs-sub{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px;font-size:12.5px;color:var(--muted)}
.fs .fs-vf{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:99px;font-weight:700;font-size:11.5px;color:var(--accent);background:color-mix(in srgb,var(--accent) 14%,transparent)}
.fs .fs-acts{flex:none;align-self:flex-start;display:flex;gap:2px;margin:-6px -8px 0 0}
.fs .fs-acts button{width:40px;height:40px;border:0;background:none;color:var(--muted);font-size:22px;border-radius:50%;cursor:pointer;display:grid;place-items:center;padding:0}
.fs .fs-acts .fav-star.on{color:#FFC233}
.fs .fs-meal{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:16px -16px 0;padding:0 16px 2px}
.fs .fs-meal::-webkit-scrollbar{display:none}
.fs .fs-meal button{flex:none;border:1px solid var(--line);background:transparent;color:var(--muted);border-radius:99px;padding:7px 13px;font-size:13px;font-weight:650;cursor:pointer;white-space:nowrap}
.fs .fs-meal button.on{background:var(--text);color:var(--bg);border-color:var(--text)}
.fs .fs-box{margin-top:14px;background:var(--bg-2);border:1px solid var(--line);border-radius:22px;padding:14px}
.fs .units{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;gap:6px}
.fs .units::-webkit-scrollbar{display:none}
.fs .units button{flex:none;background:var(--card);border-radius:12px;padding:8px 12px;font-size:13.5px;white-space:nowrap}
.fs .units button.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 16%,var(--card));color:var(--text)}
.fs .fs-step{display:flex;align-items:center;gap:10px;margin-top:12px}
.fs .fs-step>button{flex:none;width:52px;height:52px;border-radius:16px;border:1px solid var(--line);background:var(--card);color:var(--text);font-size:24px;font-weight:600;cursor:pointer;display:grid;place-items:center;padding:0;touch-action:manipulation}
.fs .fs-step>button:active{transform:scale(.94)}
.fs .fs-val{flex:1;position:relative;height:52px;border-radius:16px;background:var(--card);border:1.5px solid var(--line);display:flex;align-items:center;justify-content:center;gap:6px;transition:border-color .15s}
.fs .fs-val:focus-within{border-color:var(--accent)}
.fs .fs-val input{width:100%;max-width:120px;border:0;background:none;outline:none;text-align:right;font-size:26px;font-weight:800;letter-spacing:-.02em;padding:0;-moz-appearance:textfield}
.fs .fs-val input::-webkit-outer-spin-button,.fs .fs-val input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.fs .fs-val span{flex:1;min-width:0;font-size:14px;color:var(--muted);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fs .fs-quick{display:flex;gap:6px;margin-top:10px;overflow-x:auto;scrollbar-width:none}
.fs .fs-quick::-webkit-scrollbar{display:none}
.fs .fs-quick button{flex:none;border:0;background:var(--card);color:var(--text);border-radius:10px;padding:7px 12px;font-size:13px;font-weight:650;cursor:pointer;white-space:nowrap}
.fs .fs-quick button.on{background:color-mix(in srgb,var(--accent) 18%,var(--card));color:var(--accent)}
.fs .fs-quick button.fit{background:none;border:1px dashed color-mix(in srgb,var(--accent) 55%,var(--line));color:var(--accent)}
.fs #calc.stat{background:none;padding:0;border-radius:0;margin-top:14px;display:block}
.fs .fs-k{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
.fs .fs-k b{display:inline;font-size:40px;font-weight:800;letter-spacing:-.04em;line-height:1}
.fs .fs-k b small{font-size:17px;font-weight:700;letter-spacing:0;margin-left:4px;color:var(--muted)}
.fs .fs-k span{font-size:13px;color:var(--muted)}
.fs .fs-bar{display:flex;height:8px;border-radius:99px;overflow:hidden;margin-top:12px;background:var(--line);gap:2px}
.fs .fs-bar i{display:block;height:100%;transition:flex-grow .35s ease}
.fs .fs-mac{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}
.fs .fs-mac div{font-size:12px;color:var(--muted);display:flex;flex-direction:column;gap:1px}
.fs .fs-mac div b{display:flex;align-items:center;gap:6px;font-size:16px;color:var(--text);letter-spacing:-.01em}
.fs .fs-mac div b:before{content:"";width:8px;height:8px;border-radius:50%;background:var(--c)}
.fs .fs-imp h3{font-size:15px;display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.fs .fs-imp h3 span{font-size:12px;font-weight:600;color:var(--muted)}
.fs .fs-rings{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:12px}
.fs .fs-r{display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center}
.fs .fs-r svg{width:100%;max-width:74px;height:auto;overflow:visible}
.fs .fs-r circle{fill:none;stroke-width:7;stroke-linecap:round;transition:stroke-dasharray .45s cubic-bezier(.2,.8,.2,1),stroke-dashoffset .45s cubic-bezier(.2,.8,.2,1)}
.fs .fs-r .tr{stroke:var(--line)}
.fs .fs-r .ea{stroke:var(--c);opacity:.38}
.fs .fs-r .ad{stroke:var(--c);filter:drop-shadow(0 0 4px color-mix(in srgb,var(--c) 70%,transparent))}
.fs .fs-r.over .ad{stroke:var(--danger)}
.fs .fs-r text{font-family:inherit;fill:var(--text);font-weight:800;font-size:15px;letter-spacing:-.02em}
.fs .fs-r b{font-size:12px;font-weight:700}
.fs .fs-r small{display:block;font-size:11px;color:var(--muted);line-height:1.3}
.fs .fs-r small em{font-style:normal;color:var(--c);font-weight:700}
.fs .fs-r.over small em{color:var(--danger)}
.fs .fs-left{margin-top:12px;font-size:13px;color:var(--muted);text-align:center}
.fs .fs-left b{color:var(--text)}
.fs .fs-left.over b{color:var(--danger)}
.fs details.fs-box{padding:0}
.fs details.fs-box summary{list-style:none;cursor:pointer;padding:14px;font-weight:700;font-size:15px;display:flex;justify-content:space-between;align-items:center}
.fs details.fs-box summary::-webkit-details-marker{display:none}
.fs details.fs-box summary:after{content:"";width:8px;height:8px;border-right:2px solid var(--muted);border-bottom:2px solid var(--muted);transform:rotate(45deg);margin-top:-4px;transition:transform .2s}
.fs details[open].fs-box summary:after{transform:rotate(-135deg);margin-top:4px}
.fs .fs-nt{width:100%;border-collapse:collapse;font-size:13.5px;margin:0 0 6px}
.fs .fs-nt th{font-size:11.5px;font-weight:600;color:var(--muted);text-align:right;padding:0 14px 6px}
.fs .fs-nt th:first-child{text-align:left}
.fs .fs-nt td{padding:8px 14px;border-top:1px solid var(--line);text-align:right;font-variant-numeric:tabular-nums}
.fs .fs-nt td:first-child{text-align:left;color:var(--muted)}
.fs .fs-nt tr.sub td:first-child{padding-left:26px;font-size:12.5px}
.fs .fs-nt td:nth-child(2){font-weight:700}
.fs .fs-foot{position:sticky;bottom:calc(-18px - env(safe-area-inset-bottom));margin:16px -16px calc(-18px - env(safe-area-inset-bottom));padding:12px 16px calc(14px + env(safe-area-inset-bottom));background:linear-gradient(to bottom,color-mix(in srgb,var(--card) 0%,transparent),var(--card) 18px);z-index:2}
.fs #save{width:100%;margin:0;height:56px;font-size:16.5px;font-weight:750;border-radius:18px;display:flex;align-items:center;justify-content:center;gap:8px}
.fs #save em{font-style:normal;opacity:.75;font-weight:650}
.fs .fs-links{display:flex;justify-content:space-between;margin-top:10px;font-size:13px}
.fs .fs-links a{color:var(--muted)}
.fs .fs-links a#edit{color:var(--accent)}
.fs .dxp{margin-top:12px}
@media (prefers-reduced-motion:reduce){.fs .fs-r circle,.fs .fs-bar i{transition:none}}
`;
const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

// koliesko: dráha, už zjedené (tlmená farba) a toto jedlo (plná farba so žiarou)
const R = 30, C = 2 * Math.PI * R;
function ring(key, label, color) {
  return `<div class="fs-r" data-r="${key}" style="--c:${color}"><svg viewBox="0 0 76 76" aria-hidden="true">
    <circle class="tr" cx="38" cy="38" r="${R}"/>
    <circle class="ea" cx="38" cy="38" r="${R}" transform="rotate(-90 38 38)" stroke-dasharray="0 ${C}"/>
    <circle class="ad" cx="38" cy="38" r="${R}" transform="rotate(-90 38 38)" stroke-dasharray="0 ${C}"/>
    <text x="38" y="43" text-anchor="middle">0%</text></svg><b>${label}</b><small></small></div>`;
}

export function openFoodSheet(food, meal, done, k) {
  const portions = [{ label: 'g', g: 1 }, ...(food.portions || [])];
  let unit = 0, qty = 100;
  if (food.lastPortion) { const i = portions.findIndex(p => p.label === food.lastPortion); if (i > 0) { unit = i; qty = Number(food.lastQty) || 1; } }
  else if (food.lastGrams) qty = Number(food.lastGrams);
  else if (portions.length > 1) { unit = 1; qty = 1; }

  const p = state().profile || {};
  const T = { kcal: Number(p.target_kcal) || 0, protein: Number(p.target_protein) || 0, carbs: Number(p.target_carbs) || 0, fat: Number(p.target_fat) || 0 };
  let eaten = null;
  const canEdit = food.source === 'db' && (food.mine || p.role === 'coach');
  const ph = food.img ? `<span class="ft ph"><img src="${h(food.img)}" alt="" referrerpolicy="no-referrer"></span>` : thumb(food);

  const bg = sheet(`<div class="fs">
    <div class="fs-top">
      <div class="fs-ph">${ph}</div>
      <div class="fs-t"><h2>${h(food.name)}</h2>
        <div class="fs-sub">${food.verified ? '<span class="fs-vf">✓ Overené</span>' : ''}${food.is_recipe ? '<span class="fs-vf">Recept</span>' : ''}${food.brand ? `<span>${h(food.brand)}</span>` : ''}<span>${r0(food.kcal)} kcal / 100 g</span></div></div>
      <div class="fs-acts">${food.id ? '<button class="fav-star" id="favBtn" aria-label="Pridať medzi obľúbené" aria-pressed="false">☆</button>' : ''}<button data-x aria-label="Zavrieť">×</button></div>
    </div>
    <div class="fs-meal" id="fsMeal">${Object.entries(MEALS()).map(([key, l]) => `<button data-m="${key}" class="${key === meal ? 'on' : ''}">${h(l)}</button>`).join('')}</div>
    <div class="fs-box">
      <div class="units" id="units">${portions.map((x, i) => `<button data-u="${i}" class="${i === unit ? 'on' : ''}">${i === 0 ? 'Gramy' : `${h(x.label)} <small>${r0(x.g)} g</small>`}</button>`).join('')}</div>
      <div class="fs-step"><button data-d="-1" aria-label="Menej">−</button><label class="fs-val"><input id="qty" type="number" inputmode="decimal" min="0" step="any" aria-label="Množstvo"><span id="fsUnit"></span></label><button data-d="1" aria-label="Viac">+</button></div>
      <div class="fs-quick" id="fsQuick"></div>
      <div class="stat" id="calc"></div>
    </div>
    <div class="fs-box fs-imp"><h3>Vplyv na tvoj deň <span id="fsDay"></span></h3>
      <div class="fs-rings">${ring('kcal', 'Kalórie', 'var(--accent-2)')}${ring('protein', 'Bielkoviny', 'var(--protein)')}${ring('carbs', 'Sacharidy', 'var(--carbs)')}${ring('fat', 'Tuky', 'var(--fat)')}</div>
      <p class="fs-left" id="fsLeft">Načítavam tvoj deň…</p>
    </div>
    <details class="fs-box" id="fsNut"><summary>Nutričné hodnoty</summary><div id="fsNt"></div></details>
    <div class="fs-foot"><button class="btn primary" id="save"></button>
      <div class="fs-links">${food.source === 'db' ? '<a href="#" id="rep">Nahlásiť chybu</a>' : '<span></span>'}${canEdit ? '<a href="#" id="edit">Upraviť jedlo</a>' : ''}</div></div>
  </div>`);

  const $ = s => bg.querySelector(s);
  const $qty = $('#qty');
  const grams = () => unit === 0 ? Number($qty.value || 0) : Number($qty.value || 0) * portions[unit].g;
  const dxDraw = dx.attachSheet(bg, food, { uid: p.id, date: state().date, meal, grams: () => grams() });

  // množstvo, ktoré presne doplní zvyšok dňa (kalórie alebo bielkoviny); ponúka sa len, keď dáva zmysel
  const fitFor = key => {
    if (!eaten || !T[key] || !food[key]) return null;
    const left = T[key] - eaten[key]; if (left <= (key === 'kcal' ? 40 : 3)) return null;
    const g = left / Number(food[key]) * 100;
    if (g < 5 || g > 800) return null;
    return g;
  };
  const drawQuick = () => {
    const cur = Number($qty.value || 0);
    const opts = unit === 0 ? [50, 100, 150, 200, 250] : [0.5, 1, 1.5, 2, 3];
    const lab = v => unit === 0 ? `${v} g` : `${String(v).replace('.', ',')}×`;
    let html = opts.map(v => `<button data-q="${v}" class="${Math.abs(cur - v) < 1e-9 ? 'on' : ''}">${lab(v)}</button>`).join('');
    const fk = fitFor('kcal'), fp = Number(food.protein) >= 8 ? fitFor('protein') : null;
    if (fp) html += `<button class="fit" data-fit="protein">Dorovnať bielkoviny</button>`;
    if (fk) html += `<button class="fit" data-fit="kcal">Dorovnať kalórie</button>`;
    $('#fsQuick').innerHTML = html;
  };
  const drawRings = s => {
    if (!eaten) return;
    for (const key of ['kcal', 'protein', 'carbs', 'fat']) {
      const el = bg.querySelector(`[data-r="${key}"]`), t = T[key];
      const e = eaten[key], a = s[key], after = e + a;
      const fe = t ? Math.min(e / t, 1) : 0, fa = t ? Math.min(after / t, 1) : 0;
      const ea = el.querySelector('.ea'), ad = el.querySelector('.ad');
      ea.setAttribute('stroke-dasharray', `${fe * C} ${C}`); ea.style.opacity = fe > 0.004 ? '' : '0';
      ad.setAttribute('stroke-dasharray', `${Math.max(0, fa - fe) * C} ${C}`); ad.style.opacity = fa - fe > 0.004 ? '' : '0';
      ad.setAttribute('stroke-dashoffset', `${-fe * C}`);
      el.classList.toggle('over', !!t && after > t * 1.02);
      el.querySelector('text').textContent = t ? `${r0(after / t * 100)}%` : '–';
      const u = key === 'kcal' ? '' : ' g';
      el.querySelector('small').innerHTML = `<em>+${key === 'kcal' ? r0(a) : fmt(a)}${u}</em><br>${r0(after)} / ${r0(t)}${u}`;
    }
    const left = T.kcal - eaten.kcal - s.kcal;
    const L = $('#fsLeft');
    L.classList.toggle('over', left < 0);
    L.innerHTML = !T.kcal ? 'Nastav si cieľ kalórií v Profile.' : left >= 0 ? `Po pridaní ti dnes zostane <b>${r0(left)} kcal</b>` : `Po pridaní budeš <b>${r0(-left)} kcal nad cieľom</b>`;
  };
  const drawNut = g => {
    const row = (lab, v100, u, sub) => v100 == null || v100 === '' ? '' : `<tr class="${sub ? 'sub' : ''}"><td>${lab}</td><td>${u === 'kcal' ? r0(Number(v100) * g / 100) : fmt(Number(v100) * g / 100)} ${u}</td><td>${u === 'kcal' ? r0(v100) : fmt(v100)} ${u}</td></tr>`;
    $('#fsNt').innerHTML = `<table class="fs-nt"><thead><tr><th></th><th>${r0(g)} g</th><th>100 g</th></tr></thead><tbody>
      ${row('Energia', food.kcal, 'kcal')}${row('v kJ', Number(food.kcal) * 4.184, 'kcal', true).replace(/ kcal</g, ' kJ<')}
      ${row('Bielkoviny', food.protein, 'g')}${row('Sacharidy', food.carbs, 'g')}${row('z toho cukry', food.sugar, 'g', true)}
      ${row('Tuky', food.fat, 'g')}${row('Vláknina', food.fiber, 'g')}${row('Soľ', food.salt, 'g')}</tbody></table>`;
  };
  const upd = () => {
    const g = grams(), s = calc.scale(food, g);
    const pk = s.protein * 4, ck = s.carbs * 4, fk = s.fat * 9, tot = pk + ck + fk || 1;
    $('#fsUnit').textContent = unit === 0 ? 'g' : `${portions[unit].label.replace(/^1\s+/, '')} · ${r0(g)} g`;
    $('#calc').innerHTML = `<div class="fs-k"><b>${r0(s.kcal)}<small>kcal</small></b><span>${r0(g)} g</span></div>
      <div class="fs-bar"><i style="flex-grow:${pk / tot};background:var(--protein)"></i><i style="flex-grow:${ck / tot};background:var(--carbs)"></i><i style="flex-grow:${fk / tot};background:var(--fat)"></i></div>
      <div class="fs-mac"><div style="--c:var(--protein)"><b>${fmt(s.protein)} g</b>Bielkoviny ${r0(pk / tot * 100)} %</div><div style="--c:var(--carbs)"><b>${fmt(s.carbs)} g</b>Sacharidy ${r0(ck / tot * 100)} %</div><div style="--c:var(--fat)"><b>${fmt(s.fat)} g</b>Tuky ${r0(fk / tot * 100)} %</div></div>`;
    $('#save').innerHTML = `Pridať do: ${h(MEALS()[meal].toLowerCase())} <em>· ${r0(s.kcal)} kcal</em>`;
    drawRings(s); drawQuick(); drawNut(g); dxDraw?.();
  };
  const setUnit = i => { unit = i; bg.querySelectorAll('[data-u]').forEach(b => b.classList.toggle('on', Number(b.dataset.u) === i)); };
  const setGrams = g => { $qty.value = unit === 0 ? r0(g) : r1(g / portions[unit].g); upd(); };
  $qty.value = qty; upd();

  // dnešný príjem (aj bez internetu z uloženého dňa)
  const d = state().date;
  $('#fsDay').textContent = d === calc.today() ? 'dnes' : calc.fmtDate(d);
  db.listFood(p.id, d).then(rows => { eaten = calc.sumMacros(rows); upd(); })
    .catch(() => { $('#fsLeft').textContent = 'Tvoj deň sa teraz nepodarilo načítať.'; });

  // ovládanie
  $('[data-x]').onclick = () => bg.remove();
  bg.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { meal = b.dataset.m; bg.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === b)); upd(); });
  bg.querySelector('#fsMeal .on')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  bg.querySelectorAll('[data-u]').forEach(b => b.onclick = () => { const i = Number(b.dataset.u); if (i === unit) return; const g = grams(); setUnit(i); $qty.value = i === 0 ? r0(g || 100) : (r1(g / portions[i].g) || 1); upd(); });
  bg.querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
    const cur = Number($qty.value || 0), dir = Number(b.dataset.d);
    const step = unit === 0 ? (cur + dir * 10 < 20 ? 5 : 10) : 0.5;
    $qty.value = Math.max(0, r1(cur + step * dir)); if (navigator.vibrate) navigator.vibrate(6); upd();
  });
  $('#fsQuick').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.q) { $qty.value = b.dataset.q; upd(); return; }
    const g = fitFor(b.dataset.fit); if (!g) return;
    if (unit !== 0) setUnit(0);
    setGrams(Math.round(g / 5) * 5 || r0(g));
    toast(b.dataset.fit === 'kcal' ? 'Množstvo presne na zvyšné kalórie' : 'Množstvo presne na zvyšné bielkoviny');
  });
  $qty.oninput = upd;
  $qty.onfocus = () => $qty.select();

  // obľúbené
  const fav = $('#favBtn');
  if (fav) {
    const paint = (on, pop) => { fav.textContent = on ? '★' : '☆'; fav.classList.toggle('on', on); fav.setAttribute('aria-pressed', on); if (pop) { fav.style.transform = 'scale(1.3)'; setTimeout(() => { fav.style.transform = ''; }, 200); } };
    isFav(food.id).then(v => paint(v));
    fav.onclick = async () => {
      fav.disabled = true;
      try { const on = await toggleFav(food.id, p.id); paint(on, true); toast(on ? 'Pridané medzi obľúbené' : 'Odobrané z obľúbených'); }
      catch (err) { toast(err.message || 'Nepodarilo sa uložiť', true); }
      fav.disabled = false;
    };
  }

  $('#save').onclick = async () => {
    const g = grams(); if (!g) return toast('Zadaj množstvo', true);
    const btn = $('#save'); btn.disabled = true;
    try {
      let f = food;
      // produkt z Open Food Facts uložíme do našej databázy, nech ho nabudúce nájdu všetci
      if (f.source === 'off' && f.barcode && k.importOff) f = await k.importOff(f).catch(() => f);
      const s = calc.scale(f, g);
      const mic = {}; for (const key of ['fiber', 'sugar', 'salt']) if (f[key] != null) mic[key] = r1(Number(f[key]) * g / 100);
      await db.addFood({ user_id: p.id, date: state().date, meal, name: f.name, brand: f.brand || null, grams: r1(g), ...s, ...mic,
        source: f.source === 'db' ? 'db' : (f.source || 'manual'), barcode: f.barcode || null, food_id: f.id || null,
        portion: unit === 0 ? null : portions[unit].label, qty: unit === 0 ? null : Number($qty.value) });
      if (f.id) db.foodUsed(f.id);
      if (navigator.vibrate) navigator.vibrate(12);
      bg.remove(); done(meal);
    } catch (err) { toast(err.message, true); btn.disabled = false; }
  };
  $('#rep')?.addEventListener('click', e => { e.preventDefault(); k.openReport?.(food); });
  $('#edit')?.addEventListener('click', e => { e.preventDefault(); bg.remove(); food.is_recipe ? k.openRecipeEditor?.(food.raw, meal, done) : k.openFoodEditor?.(food.raw, meal, done); });
  return bg;
}
