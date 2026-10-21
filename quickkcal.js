// Zápis len podľa kalórií (keď človek pozná číslo z obalu alebo z reštaurácie a nechce hľadať jedlo); makrá sú voliteľné.
// Tlačidlo „Zapísať len kalórie“ sa samo pridá do ponuky jedla dňa (tri bodky pri jedle na Dnes).
import * as db from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';

const refresh = () => window.dispatchEvent(new HashChangeEvent('hashchange'));

function kcalSheet(meal) {
  const st = ctx.state || {}, uid = st.profile?.id, date = st.date || calc.today();
  if (!uid) return;
  const label = (ctx.MEALS || {})[meal] || '';
  const bg = ctx.sheet(`<div class="row between"><h2>Len kalórie</h2><button class="del" data-x aria-label="Zavrieť">×</button></div>
    <p class="muted small">${label ? 'Do: ' + ctx.h(label.toLowerCase()) + '. ' : ''}Makrá môžeš nechať prázdne.</p>
    <form id="kq" class="mt">
      <input class="input" name="nm" placeholder="Názov (nepovinné), napr. Obed v reštaurácii" maxlength="80">
      <input class="input mono mt" name="kcal" type="number" inputmode="numeric" min="1" max="5000" placeholder="kcal" required style="font-size:28px;text-align:center">
      <div class="row mt" style="gap:8px">
        <input class="input mono" name="p" type="number" inputmode="decimal" min="0" max="500" step="any" placeholder="B g">
        <input class="input mono" name="c" type="number" inputmode="decimal" min="0" max="800" step="any" placeholder="S g">
        <input class="input mono" name="f" type="number" inputmode="decimal" min="0" max="400" step="any" placeholder="T g">
      </div>
      <p class="muted small mt" id="kqn"></p>
      <button class="btn primary mt" type="submit">Zapísať</button>
    </form>`);
  const F = bg.querySelector('#kq'), n = bg.querySelector('#kqn');
  bg.querySelector('[data-x]').onclick = () => bg.remove();
  setTimeout(() => F.kcal.focus(), 250);
  const v = k => Math.max(0, Number(String(F[k].value).replace(',', '.')) || 0);
  F.oninput = () => {
    const mk = v('p') * 4 + v('c') * 4 + v('f') * 9, kc = v('kcal');
    n.textContent = mk && kc && Math.abs(mk - kc) > Math.max(40, kc * 0.3) ? `Makrá dávajú ${Math.round(mk)} kcal, skontroluj čísla.` : '';
  };
  F.onsubmit = async e => {
    e.preventDefault(); const kcal = Math.round(v('kcal')); if (!kcal) return;
    const btn = F.querySelector('button[type=submit]'); btn.disabled = true;
    const r1 = x => Math.round(x * 10) / 10;
    try {
      await db.addFood({ user_id: uid, date, meal, name: F.nm.value.trim() || 'Rýchly zápis', grams: 0, kcal, protein: r1(v('p')), carbs: r1(v('c')), fat: r1(v('f')), source: 'quick' });
      bg.remove(); ctx.toast('Zapísané'); refresh();
    } catch (err) { ctx.toast(err.message, true); btn.disabled = false; }
  };
}

// ponuka jedla dňa: meal sa zistí z nadpisu hlavičky
let lastMeal = '';
document.addEventListener('click', e => { const b = e.target.closest?.('[data-mm]'); if (b) lastMeal = b.dataset.mm; }, true);
function inject() {
  document.querySelectorAll('.sheet .mm').forEach(mm => {
    if (mm.querySelector('[data-kq]') || !mm.querySelector('[data-a=prev]')) return;
    const b = document.createElement('button'); b.className = 'mm-b'; b.dataset.kq = lastMeal || 'snack';
    b.innerHTML = '<span>🔢</span>Zapísať len kalórie';
    mm.querySelector('[data-a=prev]').after(b);
  });
}
document.addEventListener('click', e => {
  const b = e.target.closest?.('[data-kq]'); if (!b) return;
  e.preventDefault(); e.stopImmediatePropagation();
  b.closest('.sheet-bg')?.remove(); kcalSheet(b.dataset.kq);
}, true);
new MutationObserver(() => inject()).observe(document.body, { childList: true, subtree: true });
