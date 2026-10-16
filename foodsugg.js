// Návrhy jedál na obrazovke Jedlo: kým si človek nič nezapísal, nevidí prázdnu stránku, ale najčastejšie jedlá
// pre vybrané jedlo dňa (raňajky, obed...). Jedno ťuknutie otvorí zápis. Keď už má vlastnú históriu, ukáže sa tá.
import * as db from './data.js';
import { ctx } from './app.js';
import { openAdd } from './foods.js';
import { thumb, fillThumbs } from './foodimg.js';

// overené základné potraviny z databázy (id), zoradené podľa toho, čo sa na dané jedlo jedáva najčastejšie
const IDS = {
  breakfast: [12, 29, 31, 124, 33, 2812, 18, 46, 50, 47, 1467, 82],
  brunch: [34, 33, 2812, 49, 31, 124, 82, 37, 490216],
  lunch: [7, 23, 15941, 15950, 15908, 103, 39, 41, 42, 10],
  afternoon: [34, 33, 49, 2812, 837, 490216, 82, 37],
  dinner: [12, 10, 147, 7, 15941, 38, 41, 42, 2812, 31, 1467],
  late: [2812, 82, 49, 490216, 34, 33],
  snack: [34, 33, 49, 837, 490216, 37, 53],
};
const FOR = { breakfast: 'raňajky', brunch: 'desiatu', lunch: 'obed', afternoon: 'olovrant', dinner: 'večeru', late: 'druhú večeru', snack: 'snack' };

const st = document.createElement('style');
st.textContent = `.fsg-h{margin:2px 2px 2px;font-size:15px;font-weight:700}.fsg-s{margin:0 2px 10px;font-size:12.5px;color:var(--muted);line-height:1.4}
.fsg-r{cursor:pointer}.fsg-r .k{margin-left:auto}.fsg-r .k small{display:block;font-size:10.5px;color:var(--muted);font-weight:500;text-align:right}
.fsg-plus{flex:none;width:30px;height:30px;margin-left:10px;border-radius:50%;display:grid;place-items:center;background:var(--accent);color:#06301A;font-weight:800;font-size:19px;line-height:1}
.fsg-r:active{transform:scale(.98)}`;
document.head.appendChild(st);

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cache = new Map();
async function load(ids) {
  const need = ids.filter(i => !cache.has(i));
  if (need.length) {
    const { data } = await db.sb.from('foods').select('*').in('id', need);
    (data || []).forEach(f => cache.set(f.id, f));
  }
  return ids.map(i => cache.get(i)).filter(Boolean);
}
const shape = f => ({
  id: f.id, name: f.name, brand: f.brand || '', barcode: f.barcode || null, kcal: Number(f.kcal), protein: Number(f.protein), carbs: Number(f.carbs), fat: Number(f.fat),
  fiber: f.fiber ?? null, sugar: f.sugar ?? null, salt: f.salt ?? null, portions: Array.isArray(f.portions) ? f.portions : [], verified: !!f.verified, is_recipe: !!f.is_recipe, mine: false,
  gluten: f.gluten ?? null, lactose: f.lactose ?? null, allergens: f.allergens ?? null, traces: f.traces ?? null, gi: f.gi ?? null, img: f.img || null, created_by: f.created_by, source: 'db', raw: f,
});
const curMeal = () => document.querySelector('#app [data-meal].on')?.dataset.meal || 'lunch';
const isEmptyRecent = r => { const p = r.querySelector(':scope > p.empty'); return !!p && /^Zatiaľ nič/.test(p.textContent); };

let busy = false;
async function render() {
  const res = document.querySelector('#app #results');
  if (!res || busy) return;
  const box = res.querySelector('.fsg');
  if (!box && !isEmptyRecent(res)) return;
  const meal = curMeal();
  if (box && box.dataset.meal === meal) return;
  busy = true;
  try {
    const list = (await load(IDS[meal] || IDS.snack)).map(shape);
    if (!list.length || document.querySelector('#app #results') !== res) return;
    if (!res.querySelector('.fsg') && !isEmptyRecent(res)) return;
    res.innerHTML = `<div class="fsg" data-meal="${meal}"><p class="fsg-h">Najčastejšie na ${FOR[meal] || 'jedlo'}</p><p class="fsg-s">Ťukni na jedlo a zapíš ho. Čo budeš jesť ty, sa tu potom objaví samo.</p>`
      + list.map((f, i) => {
        const por = f.portions[0];
        const kc = Math.round(por ? f.kcal * por.g / 100 : f.kcal);
        return `<div class="res hasft fsg-r" data-i="${i}">${thumb(f)}<div class="n"><b>${esc(f.name)}</b><span>${por ? `${esc(por.label)} = ${Math.round(por.g)} g` : '100 g'}</span></div><span class="k mono">${kc}<small>kcal</small></span><span class="fsg-plus" aria-hidden="true">+</span></div>`;
      }).join('') + '</div>';
    res.querySelectorAll('.fsg-r').forEach(el => el.onclick = () => {
      const m = curMeal();
      openAdd(list[Number(el.dataset.i)], m, () => { ctx.toast?.('Pridané do: ' + String(ctx.MEALS?.[m] || '').toLowerCase()); location.hash = '#/'; });
    });
    db.foodImages(list.map(f => f.id)).then(map => fillThumbs(res, map)).catch(() => { });
  } catch (_) { /* bez siete ostane pôvodný text */ } finally { busy = false; if (curMeal() !== meal) setTimeout(render, 0); }
}

let raf = 0;
const app = document.getElementById('app');
if (app) new MutationObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(render); }).observe(app, { childList: true, subtree: true });
document.addEventListener('click', e => { if (e.target.closest?.('#app [data-meal]')) setTimeout(render, 0); });
