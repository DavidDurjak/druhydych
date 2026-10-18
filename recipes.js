// Recepty (v154): tlačidlo Recept otvorí okno s dvoma záložkami.
//  Inšpiruj sa = hotové jednoduché recepty (raňajky, obed, večera, desiata) s vypočítanými kalóriami a makrami, pridajú sa jedným ťuknutím,
//  Môj recept = vlastný recept zo surôvin (pôvodný editor).
import { ctx } from './app.js';
import { RECIPES, CATS } from './recipes.data.js';

const h = (...a) => ctx.h(...a), sheet = (...a) => ctx.sheet(...a);
const MEALS = () => ctx.MEALS;

const CSS = `
.rh-seg{margin:14px 0 0}
.rh .rh-cats{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:14px -16px 0;padding:0 16px 2px}
.rh .rh-cats::-webkit-scrollbar{display:none}
.rh .rh-cats button{flex:none;border:1px solid var(--line);background:transparent;color:var(--muted);border-radius:99px;padding:7px 14px;font-size:13px;font-weight:650;cursor:pointer;white-space:nowrap}
.rh .rh-cats button.on{background:var(--text);color:var(--bg);border-color:var(--text)}
.rh .rh-list{display:flex;flex-direction:column;gap:10px;margin-top:14px}
.rh .rh-c{-webkit-appearance:none;appearance:none;display:flex;align-items:center;gap:14px;width:100%;text-align:left;font:inherit;color:inherit;background:var(--card-2,var(--bg-2));border:1px solid var(--line);border-radius:20px;padding:12px 14px 12px 12px;cursor:pointer}
.rh .rh-c:active{transform:scale(.985)}
.rh .rh-ic{flex:none;width:56px;height:56px;border-radius:16px;background:var(--bg-2);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:29px;line-height:1}
.rh .rh-n{flex:1;min-width:0}
.rh .rh-n b{display:block;font-size:15.5px;font-weight:650;line-height:1.25}
.rh .rh-n span{display:block;margin-top:3px;font-size:12.5px;color:var(--muted)}
.rh .rh-k{flex:none;text-align:right;font-weight:800;font-size:19px;color:var(--accent);letter-spacing:-.01em}
.rh .rh-k small{display:block;font-size:11px;font-weight:600;color:var(--muted);margin-top:1px}
.rh .rh-hint{margin:14px 0 0;font-size:12.5px;color:var(--muted)}
.rh .rh-back{-webkit-appearance:none;appearance:none;border:0;background:none;color:var(--accent);font:inherit;font-weight:700;font-size:14px;padding:4px 0;cursor:pointer}
.rh .rh-hero{display:flex;align-items:center;gap:14px;margin-top:10px}
.rh .rh-hero .rh-ic{width:72px;height:72px;border-radius:20px;font-size:38px}
.rh .rh-hero h2{font-size:21px;line-height:1.2;margin:0}
.rh .rh-hero p{margin:4px 0 0;font-size:13px;color:var(--muted)}
.rh .rh-big{display:flex;align-items:baseline;gap:6px;margin-top:18px}
.rh .rh-big b{font-size:40px;font-weight:800;letter-spacing:-.02em;line-height:1}
.rh .rh-big span{color:var(--muted);font-size:14px;font-weight:600}
.rh .rh-mac{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
.rh .rh-mac div{background:var(--bg-2);border:1px solid var(--line);border-radius:14px;padding:10px 12px}
.rh .rh-mac b{display:block;font-size:18px;font-weight:750}
.rh .rh-mac span{font-size:12px;color:var(--muted)}
.rh .rh-sec{margin:22px 0 8px;font-size:15px;font-weight:750}
.rh .rh-ing{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid var(--line);font-size:14.5px}
.rh .rh-ing:first-of-type{border-top:0}
.rh .rh-ing span:last-child{color:var(--muted);font-weight:600;white-space:nowrap}
.rh .rh-step{display:flex;gap:12px;padding:8px 0;font-size:14.5px;line-height:1.45}
.rh .rh-step i{flex:none;width:24px;height:24px;border-radius:50%;background:var(--bg-2);border:1px solid var(--line);font-style:normal;font-size:12.5px;font-weight:750;display:flex;align-items:center;justify-content:center;margin-top:1px}
.rh .rh-foot{position:sticky;bottom:calc(-18px - env(safe-area-inset-bottom));margin:18px -16px calc(-18px - env(safe-area-inset-bottom));padding:12px 16px calc(14px + env(safe-area-inset-bottom));background:linear-gradient(to bottom,color-mix(in srgb,var(--card) 0%,transparent),var(--card) 18px);z-index:2}
.rh .rh-foot .btn.ghost{margin-top:8px}
`;
if (!document.getElementById('rh-css')) { const st = document.createElement('style'); st.id = 'rh-css'; st.textContent = CSS; document.head.appendChild(st); }

// záložky Inšpiruj sa / Môj recept (používa ich aj editor vlastného receptu)
export const hubTabs = active => `<div class="seg rh-seg" data-rh-seg><button data-rh="insp" class="${active === 'insp' ? 'on' : ''}">Inšpiruj sa</button><button data-rh="mine" class="${active === 'mine' ? 'on' : ''}">Môj recept</button></div>`;

const catFor = meal => ({ breakfast: 'breakfast', brunch: 'breakfast', lunch: 'lunch', afternoon: 'snack', dinner: 'dinner', late: 'dinner', snack: 'snack' }[meal] || 'breakfast');
const mealWord = m => (MEALS()[m] || '').toLowerCase();
const sub = r => `${r.min} min · B ${r.per.protein} · S ${r.per.carbs} · T ${r.per.fat}`;

// k = { addPreset(recipe, meal, done), editPreset(recipe, meal, done), openMine(meal, done) }
export function openRecipeHub(meal, done, k) {
  let cat = catFor(meal);
  const bg = sheet('<div class="rh"></div>');
  const root = bg.querySelector('.rh');
  const close = () => bg.remove();

  const wireTabs = () => root.querySelector('[data-rh="mine"]')?.addEventListener('click', () => { close(); k.openMine(meal, done); });

  function list() {
    const rows = RECIPES.filter(r => r.cat === cat);
    root.innerHTML = `<div class="row between"><h2>Recepty</h2><button class="del" data-x aria-label="Zavrieť">×</button></div>
      ${hubTabs('insp')}
      <div class="rh-cats">${CATS.map(([key, l]) => `<button data-c="${key}" class="${key === cat ? 'on' : ''}">${h(l)}</button>`).join('')}</div>
      <div class="rh-list">${rows.map(r => `<button class="rh-c" data-r="${r.id}"><span class="rh-ic">${r.icon}</span><span class="rh-n"><b>${h(r.name)}</b><span>${sub(r)}</span></span><span class="rh-k">${r.per.kcal}<small>kcal / porcia</small></span></button>`).join('')}</div>
      <p class="rh-hint">Ťukni na recept, uvidíš suroviny a postup. Hodnoty sú vypočítané zo surôvin.</p>`;
    root.querySelector('[data-x]').onclick = close;
    wireTabs();
    root.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { cat = b.dataset.c; list(); });
    root.querySelectorAll('[data-r]').forEach(b => b.onclick = () => detail(RECIPES.find(r => r.id === b.dataset.r)));
    bg.querySelector('.sheet').scrollTop = 0;
  }

  function detail(r) {
    root.innerHTML = `<div class="row between"><button class="rh-back" id="back">‹ Recepty</button><button class="del" data-x aria-label="Zavrieť">×</button></div>
      <div class="rh-hero"><span class="rh-ic">${r.icon}</span><div><h2>${h(r.name)}</h2><p>${r.min} min · ${r.servings === 1 ? '1 porcia' : r.servings + ' porcie'} · ${Math.round(r.grams / r.servings)} g</p></div></div>
      <div class="rh-big"><b>${r.per.kcal}</b><span>kcal na porciu</span></div>
      <div class="rh-mac"><div><b>${r.per.protein} g</b><span>Bielkoviny</span></div><div><b>${r.per.carbs} g</b><span>Sacharidy</span></div><div><b>${r.per.fat} g</b><span>Tuky</span></div></div>
      <p class="rh-sec">Suroviny</p>
      ${r.ing.map(i => `<div class="rh-ing"><span>${h(i.name)}</span><span>${i.grams} g</span></div>`).join('')}
      <p class="rh-sec">Postup</p>
      ${r.steps.map((s, n) => `<div class="rh-step"><i>${n + 1}</i><span>${h(s)}</span></div>`).join('')}
      <div class="rh-foot"><button class="btn primary" id="rhAdd">Pridať do: ${h(mealWord(meal))} · ${r.per.kcal} kcal</button><button class="btn ghost" id="rhEdit">Upraviť suroviny a uložiť</button></div>`;
    root.querySelector('[data-x]').onclick = close;
    root.querySelector('#back').onclick = list;
    const run = fn => async e => { const b = e.currentTarget; b.disabled = true; try { await fn(r, meal, done); close(); } catch (err) { b.disabled = false; ctx.toast(err.message || 'Nepodarilo sa uložiť recept', true); } };
    root.querySelector('#rhAdd').onclick = run(k.addPreset);
    root.querySelector('#rhEdit').onclick = () => { close(); k.editPreset(r, meal, done); };
    bg.querySelector('.sheet').scrollTop = 0;
  }

  list();
  return bg;
}
