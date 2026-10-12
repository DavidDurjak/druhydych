// Úprava zapísaného jedla v denníku: množstvo, jedlo dňa, zmazanie
import * as db from './data.js';
import { ctx } from './app.js';

const h = (...a) => ctx.h(...a), r0 = (...a) => ctx.r0(...a), toast = (...a) => ctx.toast(...a);

async function updateFoodLog(id, row) {
  const { data, error } = await db.sb.from('food_logs').update(row).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

// ---------- úprava zapísaného jedla: množstvo, jedlo dňa, zmazanie ----------
export function openLogEdit(f, again) {
  const MEALS = ctx.MEALS;
  const quick = !(Number(f.grams) > 0);
  const perPort = f.portion && Number(f.qty) > 0 ? Number(f.grams) / Number(f.qty) : 0;
  let unit = perPort ? 1 : 0, meal = f.meal;
  const r1 = v => Math.round(Number(v || 0) * 10) / 10;
  const bg = ctx.sheet(`<div class="row between"><h2>${h(f.name)}</h2><button class="del" data-x aria-label="Zavrieť">×</button></div>
    <p class="muted small mt">${f.brand ? h(f.brand) + ' · ' : ''}${r0(f.kcal)} kcal · B ${r1(f.protein)} · S ${r1(f.carbs)} · T ${r1(f.fat)}</p>
    ${quick ? '' : `<div class="units mt" id="eu"><button data-u="0" class="${unit === 0 ? 'on' : ''}">gramy</button>${perPort ? `<button data-u="1" class="${unit === 1 ? 'on' : ''}">${h(f.portion)} <small>${r0(perPort)} g</small></button>` : ''}</div>`}
    <div class="qty mt"><button class="btn icon" data-d="-1">−</button><input class="input mono" id="eq" type="number" inputmode="decimal" min="0" step="any"><button class="btn icon" data-d="1">+</button></div>
    <div class="stat mt" id="ec"></div>
    <div class="seg mt" id="em">${Object.entries(MEALS).map(([k, l]) => `<button data-m="${k}" class="${k === meal ? 'on' : ''}">${l}</button>`).join('')}</div>
    <button class="btn primary mt" id="es">Uložiť</button>
    <button class="btn ghost mt" id="ed" style="color:var(--danger)">Zmazať zo dňa</button>`);
  const $q = bg.querySelector('#eq'), $c = bg.querySelector('#ec');
  const base = quick ? Number(f.kcal) : Number(f.grams);
  const cur = () => quick ? Number($q.value || 0) : (unit === 1 ? Number($q.value || 0) * perPort : Number($q.value || 0));
  const ratio = () => base > 0 ? cur() / base : 0;
  const upd = () => { const k = ratio(); $c.innerHTML = `<b class="mono">${r0(f.kcal * k)} kcal</b><span>${quick ? '' : r0(cur()) + ' g · '}B ${r1(f.protein * k)} g · S ${r1(f.carbs * k)} g · T ${r1(f.fat * k)} g</span>`; };
  $q.value = quick ? r0(f.kcal) : (unit === 1 ? r1(f.qty) : r0(f.grams)); upd();
  $q.oninput = upd;
  bg.querySelector('[data-x]').onclick = () => bg.remove();
  bg.querySelectorAll('[data-u]').forEach(b => b.onclick = () => { const g = cur(); unit = Number(b.dataset.u); bg.querySelectorAll('[data-u]').forEach(x => x.classList.toggle('on', x === b)); $q.value = unit === 1 ? (r1(g / perPort) || 1) : r0(g); upd(); });
  bg.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { const step = quick ? 50 : unit === 1 ? 0.5 : 10; $q.value = Math.max(0, r1(Number($q.value || 0) + step * Number(b.dataset.d))); upd(); });
  bg.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { meal = b.dataset.m; bg.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === b)); });
  bg.querySelector('#es').onclick = async () => {
    const k = ratio(); if (!(k > 0)) return toast('Zadaj množstvo', true);
    const row = { meal, kcal: Math.round(f.kcal * k), protein: r1(f.protein * k), carbs: r1(f.carbs * k), fat: r1(f.fat * k) };
    if (!quick) { row.grams = r1(cur()); row.portion = unit === 1 ? f.portion : null; row.qty = unit === 1 ? Number($q.value) : null; }
    try { await updateFoodLog(f.id, row); bg.remove(); toast('Uložené'); again(); } catch (e) { toast(e.message, true); }
  };
  bg.querySelector('#ed').onclick = async () => { try { await db.deleteFood(f.id); bg.remove(); again(); } catch (e) { toast(e.message, true); } };
}
