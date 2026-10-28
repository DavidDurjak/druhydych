// Úprava obrazovky Dnes: človek si karty pod kartou kalórií preusporiada a skryje, a kedykoľvek ich vráti späť.
// Vstupy: tlačidlo ≡ vpravo hore v hlavičke, podržanie prsta na karte (otvorí úpravy s tou kartou zvýraznenou)
// a odkaz „Upraviť Dnes“ na konci obrazovky. Úpravy sú v spodnom paneli ako zoznam (ako Apple Zdravie, Samsung Health
// či Ovládacie centrum na iPhone): ťahanie za úchyt ⠿ mení poradie, krížik kartu skryje, sekcia Skryté karty ju vráti
// jedným ťuknutím a Obnoviť pôvodné vráti všetko. Každá zmena sa hneď prejaví na obrazovke za panelom.
import { CARDS, getLayout, setLayout, resetLayout, isCustom, cardOf } from './todayorder.js';

const byId = Object.fromEntries(CARDS.map(c => [c.id, c]));
const track = (n, p) => { try { window.fwTrack?.(n, p); } catch (_) { } };

const CSS = `
.tde{position:fixed;inset:0;z-index:95;display:flex;flex-direction:column;justify-content:flex-end}
.tde-bg{position:absolute;inset:0;background:rgba(0,0,0,.48);opacity:0;transition:opacity .25s}
.tde.in .tde-bg{opacity:1}
.tde-s{position:relative;max-height:88vh;max-height:88dvh;display:flex;flex-direction:column;background:var(--bg);color:var(--text);border-radius:26px 26px 0 0;
  box-shadow:0 -10px 40px rgba(0,0,0,.35);border-top:1px solid var(--line);transform:translateY(100%);transition:transform .32s cubic-bezier(.2,.9,.3,1);
  padding-bottom:env(safe-area-inset-bottom)}
.tde.in .tde-s{transform:none}
.tde-grab{width:44px;height:5px;border-radius:3px;background:var(--line);margin:10px auto 4px;flex:none}
.tde-top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:6px 18px 0;flex:none}
.tde-top h2{margin:0;font-size:22px;letter-spacing:-.02em}
.tde-done{-webkit-appearance:none;appearance:none;border:0;border-radius:99px;padding:10px 18px;background:var(--accent);color:var(--accent-ink,#06130C);font:inherit;font-weight:800;font-size:15px;cursor:pointer}
.tde-lead{margin:6px 18px 10px;font-size:13.5px;line-height:1.4;color:var(--muted);flex:none}
.tde-sc{overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:0 14px 18px;position:relative}
.tde-sec{font-size:12.5px;font-weight:700;color:var(--muted);margin:14px 4px 8px;display:flex;justify-content:space-between}
.tde-l{list-style:none;margin:0;padding:0;position:relative}
.tde-r{position:relative;display:flex;align-items:center;gap:10px;min-height:58px;padding:8px 6px 8px 8px;margin:0 0 6px;border-radius:16px;background:var(--card);border:1px solid var(--line);
  box-sizing:border-box;touch-action:pan-y;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.tde-r.anim{transition:transform .2s cubic-bezier(.2,.9,.3,1)}
.tde-r.drag{z-index:5;transition:none;box-shadow:0 14px 30px rgba(0,0,0,.35);background:var(--card-2,var(--card));border-color:var(--accent)}
.tde-r.flash{animation:tdeFlash 1.4s ease}
@keyframes tdeFlash{0%,40%{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 35%,transparent)}100%{}}
.tde-ic{flex:none;width:36px;height:36px;border-radius:11px;display:grid;place-items:center;font-size:19px;background:color-mix(in srgb,var(--text) 7%,transparent)}
.tde-t{flex:1;min-width:0}
.tde-t b{display:block;font-size:15px;font-weight:700;line-height:1.2}
.tde-t small{display:block;font-size:12.5px;color:var(--muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tde-b{-webkit-appearance:none;appearance:none;flex:none;width:38px;height:38px;border-radius:50%;border:0;padding:0;display:grid;place-items:center;cursor:pointer;font:inherit;-webkit-tap-highlight-color:transparent}
.tde-b svg{width:18px;height:18px}
.tde-x{background:color-mix(in srgb,#FF5A5F 16%,transparent);color:#FF6B6B}
.tde-add{background:color-mix(in srgb,var(--accent) 20%,transparent);color:var(--accent)}
.tde-lk{flex:none;width:38px;height:38px;display:grid;place-items:center;color:var(--muted)}
.tde-lk svg{width:16px;height:16px}
.tde-dh{background:none;color:var(--muted);touch-action:none;cursor:grab;width:44px;height:44px}
.tde-dh svg{width:22px;height:22px}
.tde-dh:focus-visible,.tde-b:focus-visible,.tde-done:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.tde-fx{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;border:1px dashed var(--line);color:var(--muted);font-size:13px}
.tde-fx svg{width:15px;height:15px;flex:none}
.tde-hid .tde-r{opacity:.78}
.tde-empty{font-size:13px;color:var(--muted);padding:6px 6px 2px}
.tde-reset{display:block;width:100%;margin-top:16px;-webkit-appearance:none;appearance:none;border:1px solid var(--line);background:none;color:var(--text);border-radius:14px;padding:13px;font:inherit;font-weight:700;font-size:14.5px;cursor:pointer}
.tde-reset[disabled]{opacity:.4;pointer-events:none}
.td-editlink{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin:6px 0 4px;-webkit-appearance:none;appearance:none;border:1px dashed var(--line);background:none;color:var(--muted);
  border-radius:16px;padding:14px;font:inherit;font-weight:700;font-size:14px;cursor:pointer}
.td-editlink svg{width:18px;height:18px}
.td-editlink em{font-style:normal;color:var(--accent)}
.screen.td>.td-press{transition:transform .35s ease;transform:scale(.975)}
.screen.td>*{-webkit-touch-callout:none}
.screen.td>.td-holding{-webkit-user-select:none;user-select:none}
body.tde-open{overflow:hidden}
@media (prefers-reduced-motion:reduce){.tde-bg,.tde-s,.tde-r.anim,.screen.td>.td-press{transition:none}.tde-r.flash{animation:none}}
`;
const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

const I = {
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  grip: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.8"/><circle cx="15" cy="6" r="1.8"/><circle cx="9" cy="12" r="1.8"/><circle cx="15" cy="12" r="1.8"/><circle cx="9" cy="18" r="1.8"/><circle cx="15" cy="18" r="1.8"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
};
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const app = document.getElementById('app');
const scrEl = () => app?.querySelector('.screen.td');

// karty, ktoré sú teraz na obrazovke (prázdne sloty bez obsahu do zoznamu nedávame, skryté áno)
function present() {
  const scr = scrEl(); const ids = new Set();
  if (!scr) return ids;
  [...scr.children].forEach(el => { const c = cardOf(el); if (c && (el.classList.contains('td-off') || el.offsetHeight > 0)) ids.add(c.id); });
  return ids;
}

let sheet = null, avail = new Set();

function rowHtml(c, hidden) {
  const lead = hidden ? '' : (c.lock ? `<span class="tde-lk" title="Jedlá dňa sa nedajú skryť">${I.lock}</span>` : `<button type="button" class="tde-b tde-x" data-hide="${c.id}" aria-label="Skryť kartu ${esc(c.label)}">${I.x}</button>`);
  const tail = hidden
    ? `<button type="button" class="tde-b tde-add" data-show="${c.id}" aria-label="Vrátiť kartu ${esc(c.label)}">${I.plus}</button>`
    : `<button type="button" class="tde-b tde-dh" data-drag aria-label="Presunúť ${esc(c.label)}, šípkami hore alebo dole">${I.grip}</button>`;
  return `<li class="tde-r" data-id="${c.id}">${lead}<span class="tde-ic" aria-hidden="true">${c.ic}</span><span class="tde-t"><b>${esc(c.label)}</b><small>${esc(c.sub)}</small></span>${tail}</li>`;
}

function render(keepScroll) {
  if (!sheet) return;
  const L = getLayout(), hid = new Set(L.hidden);
  const vis = L.order.filter(id => avail.has(id) && !hid.has(id));
  const hidden = L.order.filter(id => avail.has(id) && hid.has(id));
  const sc = sheet.querySelector('.tde-sc'), top = sc.scrollTop;
  sc.innerHTML = `
    <div class="tde-fx">${I.lock}<span>Vždy hore: dátum, týždeň a karta kalórií s makrami</span></div>
    <div class="tde-sec"><span>Na obrazovke</span><span>${vis.length}</span></div>
    <ul class="tde-l" data-list>${vis.map(id => rowHtml(byId[id], false)).join('')}</ul>
    <div class="tde-sec"><span>Skryté karty</span><span>${hidden.length || ''}</span></div>
    <div class="tde-hid"><ul class="tde-l">${hidden.map(id => rowHtml(byId[id], true)).join('')}</ul>
    ${hidden.length ? '' : '<p class="tde-empty">Nič nie je skryté. Kartu skryješ krížikom, vrátiš ju tu cez +.</p>'}</div>
    <button type="button" class="tde-reset" data-reset ${isCustom() ? '' : 'disabled'}>Obnoviť pôvodné rozloženie</button>`;
  if (keepScroll) sc.scrollTop = top;
}

function open(focusId) {
  if (sheet || !scrEl()) return;
  avail = present();
  if (focusId) avail.add(focusId);
  sheet = document.createElement('div');
  sheet.className = 'tde';
  sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-labelledby', 'tde-h');
  sheet.innerHTML = `<div class="tde-bg" data-close></div><div class="tde-s">
    <div class="tde-grab" data-grab></div>
    <div class="tde-top"><h2 id="tde-h">Upraviť Dnes</h2><button type="button" class="tde-done" data-close>Hotovo</button></div>
    <p class="tde-lead">Potiahni za ⠿ a zmeň poradie. Kartu skryješ krížikom, vrátiš ju dole v Skrytých kartách.</p>
    <div class="tde-sc"></div></div>`;
  document.body.appendChild(sheet);
  document.body.classList.add('tde-open');
  render();
  requestAnimationFrame(() => requestAnimationFrame(() => sheet?.classList.add('in')));
  bind(sheet);
  setTimeout(() => {
    if (!sheet) return;
    const r = focusId && sheet.querySelector(`.tde-r[data-id="${focusId}"]`);
    if (r) { r.scrollIntoView({ block: 'center', behavior: 'smooth' }); r.classList.add('flash'); setTimeout(() => r.classList.remove('flash'), 1500); }
    sheet.querySelector('.tde-done')?.focus({ preventScroll: true });
  }, 330);
  track('td_edit_open', { from: focusId ? 'hold' : 'btn' });
}

function close() {
  if (!sheet) return;
  const s = sheet; sheet = null;
  s.classList.remove('in');
  document.body.classList.remove('tde-open');
  setTimeout(() => s.remove(), 340);
  syncLink();
  document.querySelector('.td .tdh-edit')?.focus({ preventScroll: true });
}

function commitMove(id, beforeId) {
  const L = getLayout();
  const order = L.order.filter(x => x !== id);
  let at = beforeId ? order.indexOf(beforeId) : -1;
  if (at < 0) {
    // posledná viditeľná pozícia: hneď za poslednú viditeľnú kartu v zozname
    const vis = [...sheet.querySelectorAll('[data-list] .tde-r')].map(r => r.dataset.id).filter(x => x !== id);
    const last = vis[vis.length - 1];
    at = last ? order.indexOf(last) + 1 : order.length;
  }
  order.splice(at, 0, id);
  setLayout({ order, hidden: L.hidden });
}

function bind(s) {
  s.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) { close(); return; }
    const h = e.target.closest('[data-hide]');
    if (h) { const L = getLayout(); setLayout({ order: L.order, hidden: [...L.hidden, h.dataset.hide] }); render(true); track('td_edit_hide', { id: h.dataset.hide }); return; }
    const a = e.target.closest('[data-show]');
    if (a) {
      const id = a.dataset.show, L = getLayout();
      setLayout({ order: L.order, hidden: L.hidden.filter(x => x !== id) }); render(true);
      const r = s.querySelector(`[data-list] .tde-r[data-id="${id}"]`);
      if (r) { r.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); r.classList.add('flash'); setTimeout(() => r.classList.remove('flash'), 1500); }
      track('td_edit_show', { id }); return;
    }
    if (e.target.closest('[data-reset]')) { resetLayout(); render(true); track('td_edit_reset'); }
  });
  s.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    const dh = e.target.closest?.('[data-drag]');
    if (dh && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      const r = dh.closest('.tde-r'), sib = e.key === 'ArrowUp' ? r.previousElementSibling : r.nextElementSibling;
      if (!sib) return;
      const id = r.dataset.id;
      if (e.key === 'ArrowUp') commitMove(id, sib.dataset.id);
      else commitMove(id, sib.nextElementSibling?.dataset.id || null);
      render(true);
      s.querySelector(`.tde-r[data-id="${id}"] [data-drag]`)?.focus();
    }
    if (e.key === 'Tab') { // fokus ostáva v paneli
      const f = [...s.querySelectorAll('button:not([disabled])')]; if (!f.length) return;
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });
  dragSupport(s);
  grabToClose(s);
}

// ťahanie: za úchyt hneď, za celý riadok po krátkom podržaní (aby sa zoznam dal normálne posúvať prstom)
function dragSupport(s) {
  let D = null, hold = 0;
  const sc = () => s.querySelector('.tde-sc');

  const start = (row, y, pid, target) => {
    const list = row.parentElement; if (!list?.matches('[data-list]')) return;
    const rows = [...list.children];
    const box = sc();
    D = { row, list, rows, i: rows.indexOf(row), to: rows.indexOf(row), y0: y, y, pid, st0: box.scrollTop, box,
      tops: rows.map(r => r.offsetTop), h: row.offsetHeight + 6, raf: 0 };
    rows.forEach(r => { if (r !== row) r.classList.add('anim'); });
    row.classList.add('drag');
    try { target.setPointerCapture(pid); } catch (_) { }
    navigator.vibrate?.(8);
    loop();
  };
  const place = () => {
    if (!D) return;
    const dy = D.y - D.y0 + (D.box.scrollTop - D.st0);
    D.row.style.transform = `translateY(${dy}px)`;
    const mid = D.tops[D.i] + dy + D.h / 2;
    // nové miesto = koľko ostatných kariet má stred nad stredom ťahanej
    let to = 0;
    for (let k = 0; k < D.rows.length; k++) if (k !== D.i && mid > D.tops[k] + D.h / 2) to++;
    if (to !== D.to) { D.to = to; navigator.vibrate?.(4); }
    D.rows.forEach((r, k) => {
      if (r === D.row) return;
      let t = 0;
      if (D.i < D.to && k > D.i && k <= D.to) t = -D.h;
      if (D.i > D.to && k < D.i && k >= D.to) t = D.h;
      r.style.transform = t ? `translateY(${t}px)` : '';
    });
  };
  const loop = () => {
    if (!D) return;
    const b = D.box.getBoundingClientRect(), edge = 64;
    let v = 0;
    if (D.y < b.top + edge) v = -Math.ceil((b.top + edge - D.y) / 6);
    else if (D.y > b.bottom - edge) v = Math.ceil((D.y - (b.bottom - edge)) / 6);
    if (v) D.box.scrollTop += Math.max(-14, Math.min(14, v));
    place();
    D.raf = requestAnimationFrame(loop);
  };
  const end = cancel => {
    clearTimeout(hold); hold = 0;
    if (!D) return;
    cancelAnimationFrame(D.raf);
    const { row, rows, i, to } = D;
    D = null;
    rows.forEach(r => { r.classList.remove('anim', 'drag'); r.style.transform = ''; });
    if (cancel || i === to) return;
    const id = row.dataset.id;
    const rest = rows.filter(r => r !== row);
    const before = rest[to] ? rest[to].dataset.id : null;
    commitMove(id, before);
    render(true);
    const nr = s.querySelector(`.tde-r[data-id="${id}"]`);
    nr?.classList.add('flash'); setTimeout(() => nr?.classList.remove('flash'), 900);
    track('td_edit_move', { id });
  };

  s.addEventListener('pointerdown', e => {
    if (D || e.button > 0) return;
    const row = e.target.closest('[data-list] .tde-r'); if (!row) return;
    if (e.target.closest('[data-hide]')) return;
    if (e.target.closest('[data-drag]')) { e.preventDefault(); start(row, e.clientY, e.pointerId, e.target.closest('[data-drag]')); return; }
    const y0 = e.clientY, x0 = e.clientX, pid = e.pointerId;
    clearTimeout(hold);
    hold = setTimeout(() => { hold = 0; start(row, y0, pid, row); }, 260);
    const mv = ev => { if (Math.abs(ev.clientY - y0) > 8 || Math.abs(ev.clientX - x0) > 8) { clearTimeout(hold); hold = 0; off(); } };
    const off = () => { s.removeEventListener('pointermove', mv); s.removeEventListener('pointerup', off); s.removeEventListener('pointercancel', off); };
    s.addEventListener('pointermove', mv); s.addEventListener('pointerup', off); s.addEventListener('pointercancel', off);
  });
  s.addEventListener('pointermove', e => { if (D && e.pointerId === D.pid) { e.preventDefault(); D.y = e.clientY; } }, { passive: false });
  s.addEventListener('pointerup', e => { if (D && e.pointerId === D.pid) end(false); else { clearTimeout(hold); hold = 0; } });
  s.addEventListener('pointercancel', e => { if (D && e.pointerId === D.pid) end(true); });
  // počas ťahania sa zoznam nesmie posúvať prstom (iOS)
  s.addEventListener('touchmove', e => { if (D) e.preventDefault(); }, { passive: false });
  s.addEventListener('contextmenu', e => { if (e.target.closest('.tde-r')) e.preventDefault(); });
}

// potiahnutie panela za horný úchyt nadol ho zavrie
function grabToClose(s) {
  const g = s.querySelector('[data-grab]'), panel = s.querySelector('.tde-s');
  let y0 = null;
  const top = s.querySelector('.tde-top');
  [g, top].forEach(el => el.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; y0 = e.clientY; panel.style.transition = 'none'; try { el.setPointerCapture(e.pointerId); } catch (_) { } }));
  s.addEventListener('pointermove', e => { if (y0 == null) return; const dy = Math.max(0, e.clientY - y0); panel.style.transform = `translateY(${dy}px)`; });
  const up = e => { if (y0 == null) return; const dy = e.clientY - y0; y0 = null; panel.style.transition = ''; panel.style.transform = ''; if (dy > 90) close(); };
  s.addEventListener('pointerup', up); s.addEventListener('pointercancel', up);
}

// podržanie prsta na karte otvorí úpravy s touto kartou zvýraznenou
let lp = null, swallow = false;
function lpStart(e) {
  if (sheet || e.button > 0) return;
  const scr = scrEl(); if (!scr) return;
  const card = e.target.closest('.screen.td > *'); if (!card || card.parentElement !== scr) return;
  const c = cardOf(card); if (!c) return;
  if (e.target.closest('input,textarea,select,[contenteditable]')) return;
  const x0 = e.clientX, y0 = e.clientY;
  card.classList.add('td-holding');
  lp = { card, x0, y0, t: setTimeout(() => {
    lp = null; card.classList.remove('td-holding'); swallow = true; setTimeout(() => { swallow = false; }, 700);
    card.classList.add('td-press'); setTimeout(() => card.classList.remove('td-press'), 380);
    navigator.vibrate?.(12);
    open(c.id);
  }, 550) };
}
function lpCancel(e) {
  if (!lp) return;
  if (e && e.type === 'pointermove' && Math.abs(e.clientX - lp.x0) < 10 && Math.abs(e.clientY - lp.y0) < 10) return;
  clearTimeout(lp.t); lp.card.classList.remove('td-holding'); lp = null;
}
if (app) {
  app.addEventListener('pointerdown', lpStart, { passive: true });
  app.addEventListener('pointermove', lpCancel, { passive: true });
  app.addEventListener('pointerup', lpCancel, { passive: true });
  app.addEventListener('pointercancel', lpCancel, { passive: true });
  window.addEventListener('scroll', () => lpCancel(), { passive: true });
  // po podržaní nesmie prst pri pustení stlačiť tlačidlo na karte, ani otvoriť systémové menu
  app.addEventListener('click', e => { if (swallow) { e.preventDefault(); e.stopPropagation(); swallow = false; } }, true);
  app.addEventListener('contextmenu', e => { if (e.target.closest('.screen.td > *') && cardOf(e.target.closest('.screen.td > *'))) e.preventDefault(); });
  app.addEventListener('click', e => { if (e.target.closest('[data-tdedit]')) { e.preventDefault(); open(); } });
}

// odkaz na konci obrazovky (ľudia, ktorí ≡ prehliadnu, ho nájdu tam, kde karty končia)
function syncLink() {
  const scr = scrEl(); if (!scr) return;
  let a = scr.querySelector(':scope > .td-editlink');
  if (!a) {
    a = document.createElement('button'); a.type = 'button'; a.className = 'td-editlink'; a.setAttribute('data-tdedit', '');
    scr.appendChild(a);
  } else if (a !== scr.lastElementChild) scr.appendChild(a);
  const n = getLayout().hidden.filter(id => scr.querySelector(byId[id].sel)).length;
  const html = `${I.menu}<span>Upraviť Dnes${n ? ` · <em>${n} ${n === 1 ? 'skrytá karta' : n < 5 ? 'skryté karty' : 'skrytých kariet'}</em>` : ''}</span>`;
  if (a.innerHTML !== html) a.innerHTML = html;
}
if (app) {
  let q = 0;
  new MutationObserver(() => { if (q) return; q = requestAnimationFrame(() => { q = 0; syncLink(); }); }).observe(app, { childList: true, subtree: true });
  window.addEventListener('hashchange', () => close());
  document.addEventListener('keydown', e => { if (sheet && e.key === 'Escape') { e.preventDefault(); close(); } });
}
