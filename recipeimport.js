// Import receptu z odkazu: v okne Recepty (a v editore vlastného receptu) pribudne tlačidlo "Import z odkazu".
// Vloží sa adresa receptu z ľubovoľnej stránky, server z nej urobí zoznam surovín s gramami a hodnotami a appka ho otvorí v editore receptu.
// Nič sa neuloží, kým človek recept neskontroluje a nepotvrdí.
import * as db from './data.js';
import { ctx } from './app.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CSS = `.ri-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin:10px 0 0;padding:11px 14px;border-radius:14px;border:1px dashed var(--line);background:none;color:var(--text);font:600 14px inherit;font-family:inherit;cursor:pointer}
.ri-btn:active{transform:scale(.99)}
.ri-box h2{margin:0 0 6px;font-size:21px;letter-spacing:-.02em}.ri-box p{margin:0 0 12px;font-size:13.5px;line-height:1.45;color:var(--muted)}
.ri-box .row{display:flex;gap:8px}.ri-err{color:#FF8FA4;font-size:13px;min-height:18px;margin:8px 0 0}
html[data-theme=light] .ri-err{color:#c02448}
.ri-load{display:grid;justify-items:center;gap:12px;padding:26px 6px;text-align:center}.ri-load i{width:34px;height:34px;border-radius:50%;border:3px solid color-mix(in srgb,var(--accent) 25%,transparent);border-top-color:var(--accent);animation:riS .8s linear infinite}
@keyframes riS{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.ri-load i{animation:none}}`;
if (!document.getElementById('ri-css')) { const s = document.createElement('style'); s.id = 'ri-css'; s.textContent = CSS; document.head.appendChild(s); }

function addButtons() {
  const seg = document.querySelector('.rh [data-rh-seg]');
  if (seg && !seg.parentElement.querySelector('.ri-btn')) seg.after(mk());
  const it = document.querySelector('#itext');
  if (it && !it.parentElement.querySelector('.ri-btn')) it.after(mk());
}
function mk() {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'ri-btn'; b.textContent = '🔗 Import receptu z odkazu';
  b.onclick = () => openImport(b);
  return b;
}
new MutationObserver(addButtons).observe(document.body, { childList: true, subtree: true });
addButtons();

function openImport(from) {
  const host = from.closest('.sheet')?.parentElement || null;
  const bg = ctx.sheet(`<div class="ri-box"><div class="row" style="justify-content:space-between;align-items:flex-start"><h2>Import z odkazu</h2><button class="del" data-x aria-label="Zavrieť">×</button></div>
    <p>Vlož odkaz na recept z akejkoľvek stránky. Appka z neho vytiahne suroviny, spočíta hodnoty na porciu a otvorí ti ho na kontrolu.</p>
    <input class="input" id="riUrl" type="url" inputmode="url" autocomplete="off" placeholder="https://..." aria-label="Odkaz na recept">
    <div class="row" style="margin-top:10px"><button class="btn ghost sm" id="riPaste" type="button">Vložiť zo schránky</button><button class="btn primary" id="riGo" type="button" style="flex:1;margin:0">Načítať recept</button></div>
    <p class="ri-err" id="riErr" role="alert"></p><p style="margin:6px 0 0;font-size:12px">Hodnoty sú odhad zo surovín. Pred uložením si ich skontroluj.</p></div>`);
  const $ = s => bg.querySelector(s);
  $('[data-x]').onclick = () => bg.remove();
  $('#riPaste').onclick = async () => { try { const t = (await navigator.clipboard.readText()).trim(); if (t) $('#riUrl').value = t; } catch (_) { $('#riErr').textContent = 'Schránku sa nepodarilo prečítať, vlož odkaz ručne.'; } };
  $('#riUrl').addEventListener('keydown', e => { if (e.key === 'Enter') $('#riGo').click(); });
  $('#riGo').onclick = async () => {
    const url = $('#riUrl').value.trim();
    if (!/^https?:\/\//i.test(url)) { $('#riErr').textContent = 'Vlož celý odkaz, ktorý začína na https://'; return; }
    const box = bg.querySelector('.ri-box'); const keep = box.innerHTML;
    box.innerHTML = '<div class="ri-load"><i></i><b>Čítam recept…</b><span class="muted small">Môže to trvať do pol minúty.</span></div>';
    let data = null, err = '';
    try {
      const r = await db.sb.functions.invoke('recipe-import', { body: { url } });
      data = r.data;
      if (r.error) { try { err = (await r.error.context.json()).error || ''; } catch (_) { /* nič */ } err = err || 'Import sa nepodaril. Skús to znova.'; }
    } catch (e) { err = 'Import sa nepodaril. Skontroluj pripojenie.'; }
    if (err || !data?.ok) {
      box.innerHTML = keep; bg.querySelector('#riUrl').value = url; bg.querySelector('#riErr').textContent = err || data?.error || 'Na tejto stránke sa nenašiel recept.';
      bg.querySelector('[data-x]').onclick = () => bg.remove(); return;
    }
    try { window.fwTrack && window.fwTrack('recipe_import', { host: data.host, n: data.ingredients.length }); } catch (_) { }
    bg.remove(); if (host && host.isConnected) host.remove();
    const { openRecipeEditor } = await import('./foods.js');
    openRecipeEditor({ name: data.name, servings: data.servings, is_public: false,
      recipe: data.ingredients.map(i => ({ food_id: null, name: i.name, grams: i.grams, per100: i.per100 })) }, 'lunch', null);
    try { ctx.toast(`Načítaných surovín: ${data.ingredients.length}. Skontroluj gramy.`); } catch (_) { }
  };
}
