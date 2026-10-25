// Obľúbené jedlá: hviezdička v okne jedla a záložka „Obľúbené“ na obrazovke Jedlo.
// Ukladá sa do účtu (tabuľka food_favs), takže sedí na všetkých zariadeniach.
import { sb } from './data.js';
import { ctx } from './app.js';
import { openAdd } from './foods.js';
import { thumb, fillThumbs } from './foodimg.js';
import * as dx from './dxcore.js';
const stayHere = () => (location.hash || '').split('?')[0] === '#/jedlo' && !/[?&]meal=/.test(location.hash); // Jedlo otvorené cez kartu: po pridaní ostaň a obnov
const after = () => { if (stayHere()) window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = '#/'; };

let ids = null, loading = null;
const load = () => loading || (loading = sb.from('food_favs').select('food_id').then(r => {
  if (r.error) throw r.error;
  ids = new Set((r.data || []).map(x => Number(x.food_id)));
  return ids;
}).catch(e => { loading = null; throw e; }));

export async function isFav(id) { if (id == null || id === '') return false; try { return (await load()).has(Number(id)); } catch (_) { return false; } }

export async function toggle(id, userId) {
  const set = await load(), n = Number(id), was = set.has(n);
  if (was) { set.delete(n); const r = await sb.from('food_favs').delete().eq('food_id', n); if (r.error) { set.add(n); throw r.error; } }
  else { set.add(n); const r = await sb.from('food_favs').upsert({ user_id: userId, food_id: n }, { onConflict: 'user_id,food_id' }); if (r.error) { set.delete(n); throw r.error; } }
  return !was;
}

// jedlá v poradí, ako si ich pridal medzi obľúbené (najnovšie hore)
export async function list(limit = 100) {
  const r = await sb.from('food_favs').select('created_at, foods(*)').order('created_at', { ascending: false }).limit(limit);
  if (r.error) throw r.error;
  return (r.data || []).map(x => x.foods).filter(Boolean);
}

// ---------- napojenie na obrazovku Jedlo (bez zásahu do foods.js) ----------
if (typeof document !== 'undefined') {
  const h = (...a) => ctx.h(...a), r0 = (...a) => ctx.r0(...a), toast = (...a) => ctx.toast(...a);
  const r1 = v => Math.round(Number(v || 0) * 10) / 10;
  const fromDb = f => ({ id: f.id, name: f.name, brand: f.brand || '', barcode: f.barcode || null, kcal: Number(f.kcal), protein: Number(f.protein), carbs: Number(f.carbs), fat: Number(f.fat), fiber: f.fiber ?? null, sugar: f.sugar ?? null, salt: f.salt ?? null,
    portions: Array.isArray(f.portions) ? f.portions : [], verified: !!f.verified, is_recipe: !!f.is_recipe, mine: f.created_by === ctx.state?.profile?.id,
    gluten: f.gluten ?? null, lactose: f.lactose ?? null, allergens: f.allergens ?? null, traces: f.traces ?? null, gi: f.gi ?? null, img: f.img || null, created_by: f.created_by, source: 'db', raw: f });

  const CSS = `.fav-star{font-size:24px!important;color:var(--muted);transition:transform .2s cubic-bezier(.3,1.6,.5,1),color .15s}.fav-star.on{color:#FFD166}.fav-star.pop{transform:scale(1.35)}`;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

  // 1) ktorý riadok si ťukol: jeho food_id použijeme pre hviezdičku v okne, ktoré sa po ňom otvorí
  let last = null;
  document.addEventListener('click', e => {
    const row = e.target.closest?.('#results .res');
    const ft = row?.querySelector('.ft[data-fid]');
    last = ft && ft.dataset.fid ? { id: Number(ft.dataset.fid), t: Date.now() } : null;
  }, true);

  const addStar = bg => {
    const x = bg.querySelector('[data-x]');
    if (!x || !bg.querySelector('#units') || !bg.querySelector('#save') || !last || Date.now() - last.t > 8000 || bg.querySelector('#favBtn')) return;
    const id = last.id, userId = ctx.state?.profile?.id; if (!id || !userId) return;
    const b = document.createElement('button');
    b.className = 'del fav-star'; b.id = 'favBtn'; b.textContent = '☆'; b.setAttribute('aria-label', 'Pridať medzi obľúbené'); b.setAttribute('aria-pressed', 'false');
    const wrap = document.createElement('div'); wrap.style.cssText = 'display:flex;align-items:center;gap:2px;flex:none';
    x.replaceWith(wrap); wrap.append(b, x);
    const paint = (on, pop) => { b.textContent = on ? '★' : '☆'; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.setAttribute('aria-label', on ? 'Odobrať z obľúbených' : 'Pridať medzi obľúbené'); if (pop) { b.classList.add('pop'); setTimeout(() => b.classList.remove('pop'), 220); } };
    isFav(id).then(v => paint(v));
    b.onclick = async () => {
      b.disabled = true;
      try { const on = await toggle(id, userId); paint(on, true); if (navigator.vibrate) navigator.vibrate(10); toast(on ? 'Pridané medzi obľúbené' : 'Odobrané z obľúbených'); }
      catch (err) { toast(err.message || 'Nepodarilo sa uložiť', true); }
      b.disabled = false;
    };
  };

  // 2) záložka Obľúbené
  const showFavs = async tabs => {
    const res = document.getElementById('results'); if (!res) return;
    tabs.querySelectorAll('button').forEach(x => x.classList.toggle('on', x.id === 'favTab'));
    res.innerHTML = '<div class="spinner"></div>';
    try {
      const foods = (await list()).map(fromDb);
      if (!tabs.querySelector('#favTab.on')) return; // medzitým prepol inam
      const meal = () => document.querySelector('#mealseg .on')?.dataset.meal || 'snack';
      res.innerHTML = foods.length ? foods.map((f, i) => {
        const por = f.portions?.[0];
        const sub = [f.brand, por ? `${h(por.label)} = ${r0(por.g)} g` : null].filter(Boolean).map(h).join(' · ');
        return `<div class="res hasft" data-fav="${i}">${thumb(f)}<div class="n"><b>${h(f.name)}${f.verified ? ' <span class="vf" title="Overené">✓</span>' : ''}${f.is_recipe ? ' <span class="chip">recept</span>' : ''}</b><span>${sub || '100 g'}</span>${dx.chips(f)}</div><span class="k mono">${por ? r0(f.kcal * por.g / 100) : r0(f.kcal)}<small>${por ? '/' + h(por.label.replace(/^1 /, '')) : '/100 g'}</small></span></div>`;
      }).join('') : '<p class="empty">Zatiaľ nič. Otvor ľubovoľné jedlo a ťukni na hviezdičku ★, aby si ho mal vždy po ruke.</p>';
      res.querySelectorAll('[data-fav]').forEach(el => el.onclick = () => {
        last = { id: foods[el.dataset.fav].id, t: Date.now() };
        openAdd(foods[el.dataset.fav], meal(), () => { toast('Pridané'); after(); });
      });
      fillThumbs(res, new Map(foods.filter(f => f.img).map(f => [f.id, f.img])));
    } catch (e) { res.innerHTML = `<p class="empty">${h(e.message)}</p>`; }
  };
  const addTab = tabs => {
    if (tabs.querySelector('#favTab') || !tabs.querySelector('[data-t="recent"]')) return;
    const b = document.createElement('button'); b.id = 'favTab'; b.textContent = '★ Obľúbené';
    const mine = tabs.querySelector('[data-t="mine"]'); if (mine) { mine.textContent = 'Moje'; mine.before(b); } else tabs.appendChild(b);
    b.onclick = () => showFavs(tabs);
  };

  const scan = n => {
    if (n.nodeType !== 1) return;
    if (n.matches?.('.sheet-bg')) addStar(n); else n.querySelectorAll?.('.sheet-bg').forEach(addStar);
    if (n.id === 'tabs') addTab(n); else n.querySelectorAll?.('#tabs').forEach(addTab);
  };
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(scan))).observe(document.documentElement, { childList: true, subtree: true });
}
