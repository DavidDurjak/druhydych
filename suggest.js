// "Dojedz zvyšok dňa": návrhy jedál z toho, čo človek naozaj jedáva, ktoré sedia do zostávajúcich kalórií a bielkovín.
// Samo sa vloží pod lištu rýchleho zápisu na obrazovke Dnes (bez zásahu do today.js).
import * as db from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';
import { renderToday } from './today.js';

const root = document.getElementById('app');
let busy = false, cache = null;
const STAPLES = ['skyr', 'tvaroh', 'cottage', 'jogurt biely', 'kuracie prsia', 'vajce', 'tuniak', 'banán', 'jablko', 'ryža', 'ovsené vločky', 'chlieb', 'syr eidam', 'orechy', 'proteín'];
const JUNK = /čokol|keks|sušien|chips|zmrzl|cola|kofola|pivo|víno|vodka|nutella|torta|koláč|sladk|cukor|džús|limonád|energet|bonbón|gumov/i;
const SCALES = [0.5, 0.75, 1, 1.5, 2];
const num = v => Number(v) || 0;
const r0 = v => Math.round(v);

function mealNow() { const h = new Date().getHours(); return h < 10 ? 'breakfast' : h < 12 ? 'brunch' : h < 14 ? 'lunch' : h < 17 ? 'afternoon' : h < 21 ? 'dinner' : 'late'; }
const SHARE = { breakfast: 0.25, brunch: 0.10, lunch: 0.30, afternoon: 0.10, dinner: 0.25, late: 0.05, snack: 0.10 };

function scaled(it, k0) {
  const g0 = num(it.grams);
  const q0 = num(it.qty);
  const k = q0 > 0 && it.portion ? Math.max(1, Math.round(q0 * k0)) / q0 : g0 >= 50 ? Math.max(5, Math.round(g0 * k0 / 5) * 5) / g0 : k0;
  return { ...it, grams: num(it.grams) * k, kcal: num(it.kcal) * k, protein: num(it.protein) * k, carbs: num(it.carbs) * k, fat: num(it.fat) * k, qty: it.qty != null ? Math.round(num(it.qty) * k * 10) / 10 : null };
}
function totals(items) { return items.reduce((a, i) => ({ kcal: a.kcal + i.kcal, protein: a.protein + i.protein, carbs: a.carbs + i.carbs, fat: a.fat + i.fat }), { kcal: 0, protein: 0, carbs: 0, fat: 0 }); }

// skóre: čím nižšie, tým lepšie
function score(t, goalK, goalP) {
  let s = Math.abs(t.kcal - goalK) / goalK;
  if (t.kcal > goalK * 1.06) s += 1.5 * (t.kcal / goalK - 1.06);
  const share = t.kcal ? t.protein * 4 / t.kcal : 0;
  s += 2 * Math.max(0, 0.18 - share);
  if (goalP > 5) s += 0.7 * Math.max(0, goalP * 0.85 - t.protein) / goalP;
  return s;
}

export function pickSuggestions(pool, goalK, goalP) {
  const usable = pool.filter(i => !JUNK.test(i.name) && num(i.kcal) >= 40 && num(i.grams) > 0 && num(i.kcal) <= goalK * 1.6);
  const opts = [];
  usable.forEach(i => SCALES.forEach(k => { const s = scaled(i, k); if (s.grams >= 20 && s.grams <= 600) opts.push([s]); }));
  for (let a = 0; a < usable.length; a++) for (let b = a + 1; b < usable.length; b++) {
    for (const ka of [0.75, 1, 1.5]) for (const kb of [0.5, 1, 1.5]) {
      const x = scaled(usable[a], ka), y = scaled(usable[b], kb);
      if (x.grams > 500 || y.grams > 500) continue;
      opts.push([x, y]);
    }
  }
  const ranked = opts.map(items => { const t = totals(items); return { items, t, s: score(t, goalK, goalP) + (items.length > 1 ? 0.04 : 0) }; }).sort((p, q) => p.s - q.s);
  const out = [], used = new Set();
  for (const c of ranked) {
    const key = c.items.map(i => i.name).sort().join('|');
    if (used.has(key)) continue;
    // každý návrh musí mať iné jedlá ako predošlé
    if (c.items.some(i => out.some(o => o.items.some(j => j.name === i.name)))) continue;
    used.add(key); out.push(c);
    if (out.length === 3) break;
  }
  return out;
}

function label(i) {
  const g = r0(i.grams);
  return i.portion && i.qty ? `${String(i.qty).replace('.', ',')}× ${i.portion} ${i.name}` : `${g} g ${i.name}`;
}

async function loadPool(uid) {
  if (cache && cache.uid === uid && Date.now() - cache.t < 120000) return cache.pool;
  let pool = await db.recentLogs(uid, 60).catch(() => []);
  if (pool.length < 8) {
    const or = STAPLES.map(s => `name.ilike.%${s}%`).join(',');
    const { data } = await db.sb.from('foods').select('id,name,brand,kcal,protein,carbs,fat,verified').eq('verified', true).or(or).limit(40);
    const extra = (data || []).filter(f => num(f.kcal) > 0).map(f => ({ name: f.name, brand: f.brand, grams: f.name.toLowerCase().includes('vajce') ? 60 : 150, kcal: num(f.kcal) * 1.5, protein: num(f.protein) * 1.5, carbs: num(f.carbs) * 1.5, fat: num(f.fat) * 1.5, source: 'db', barcode: null, food_id: f.id, portion: null, qty: null }));
    pool = pool.concat(extra);
  }
  cache = { uid, t: Date.now(), pool };
  return pool;
}

async function inject() {
  if (busy || !root || !ctx.state?.profile) return;
  const bar = root.querySelector('.screen.td .qk');
  if (!bar || root.querySelector('#sugg')) return;
  const p = ctx.state.profile, date = ctx.state.date;
  if (date !== calc.today() || !p.target_kcal) return;
  busy = true;
  try {
    const foods = await db.listFood(p.id, date);
    const sum = calc.sumMacros(foods);
    const remK = p.target_kcal - sum.kcal, remP = Math.max(0, p.target_protein - sum.protein);
    if (remK < 150) return;
    const meal = mealNow();
    const goalK = remK > 700 ? p.target_kcal * SHARE[meal] : remK;
    const goalP = remK > 700 ? p.target_protein * SHARE[meal] : remP;
    const pool = await loadPool(p.id);
    const list = pickSuggestions(pool, goalK, goalP);
    const b = root.querySelector('.screen.td .qk');
    if (!list.length || !b || root.querySelector('#sugg') || ctx.state.date !== date) return;
    const el = document.createElement('section');
    el.id = 'sugg'; el.className = 'sugg';
    el.innerHTML = `<div class="sg-h"><h3>Čo zjesť ďalej</h3><span>zostáva ${r0(remK)} kcal${remP > 5 ? ` a ${r0(remP)} g bielkovín` : ''}</span></div>` +
      list.map((c, i) => `<button class="sg" data-i="${i}"><span class="sg-t">${c.items.map(label).join(' + ')}</span><span class="sg-m">${r0(c.t.kcal)} kcal · ${r0(c.t.protein)} g bielkovín</span><span class="sg-a">Pridať</span></button>`).join('');
    b.after(el);
    el.querySelectorAll('.sg').forEach(btn => btn.onclick = async () => {
      const c = list[Number(btn.dataset.i)];
      btn.disabled = true;
      try {
        for (const it of c.items) {
          await db.addFood({ user_id: p.id, date, meal, name: it.name, brand: it.brand || null, grams: Math.round(it.grams * 10) / 10, kcal: Math.round(it.kcal * 10) / 10, protein: Math.round(it.protein * 10) / 10, carbs: Math.round(it.carbs * 10) / 10, fat: Math.round(it.fat * 10) / 10,
            source: it.source || 'db', barcode: it.barcode || null, food_id: it.food_id || null, portion: it.portion || null, qty: it.qty ?? null });
          if (it.food_id) db.foodUsed(it.food_id);
        }
        ctx.toast('Pridané');
        renderToday();
      } catch (e) { ctx.toast(e.message, true); btn.disabled = false; }
    });
  } catch (_) { /* návrhy sú bonus, nesmú rozbiť obrazovku */ } finally { busy = false; }
}
if (root) { new MutationObserver(inject).observe(root, { childList: true, subtree: true }); inject(); }
