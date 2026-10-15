// Plusko vedľa spodnej lišty: celoobrazovkové rýchle akcie odkiaľkoľvek v appke.
import { ctx } from './app.js';
import * as db from './data.js';
import * as calc from './calc.js';

const CSS = `
:root{--qa-x:max(12px,calc((100vw - 560px)/2))}
body.has-qa .nav{left:var(--qa-x);right:calc(var(--qa-x) + 68px);max-width:none;margin:0}
.qa-fab{position:fixed;z-index:60;right:var(--qa-x);bottom:calc(env(safe-area-inset-bottom) + 8px);width:60px;height:60px;border-radius:50%;border:0;padding:0;
  display:none;align-items:center;justify-content:center;cursor:pointer;color:#06210f;
  background:linear-gradient(180deg,#9dffc4,#5fe69a);box-shadow:0 12px 28px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.25) inset,0 0 24px rgba(124,255,178,.25);
  transition:transform .35s cubic-bezier(.3,1.5,.5,1)}
body.has-qa .qa-fab{display:flex}body.bd-open .qa-fab{display:none}
.qa-fab:active{transform:scale(.92)}
.qa-fab svg{width:28px;height:28px;stroke:currentColor;stroke-width:2.6;stroke-linecap:round;fill:none;transition:transform .4s cubic-bezier(.3,1.5,.5,1)}
body.qa-open .qa-fab svg{transform:rotate(135deg)}
body.qa-open .bd-fab{display:none}

.qa-ov{position:fixed;inset:0;z-index:50;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;
  padding:calc(env(safe-area-inset-top) + 22px) 18px calc(env(safe-area-inset-bottom) + 110px);
  background:radial-gradient(120% 60% at 85% 0%,rgba(124,255,178,.16),transparent 60%),radial-gradient(90% 50% at 0% 30%,rgba(255,170,80,.10),transparent 60%),rgba(8,11,15,.95);
  -webkit-backdrop-filter:blur(26px) saturate(150%);backdrop-filter:blur(26px) saturate(150%);animation:qaBg .28s ease both}
.qa-ov.out{animation:qaBgOut .22s ease both}
@keyframes qaBg{from{opacity:0}to{opacity:1}}@keyframes qaBgOut{to{opacity:0}}
.qa-in{max-width:560px;margin:0 auto}
.qa-pop{opacity:0;animation:qaPop .55s cubic-bezier(.2,1.25,.4,1) both;animation-delay:calc(var(--i,0)*45ms + 60ms)}
@keyframes qaPop{from{opacity:0;transform:translateY(26px) scale(.94)}to{opacity:1;transform:none}}
.qa-h{font-size:30px;font-weight:800;letter-spacing:-.03em;line-height:1.1}
.qa-sub{color:var(--muted);font-size:14px;margin:6px 0 18px}

.qa-hero{position:relative;overflow:hidden;border-radius:28px;padding:20px 18px 18px;color:#fff;border:1px solid rgba(255,255,255,.16);
  background:linear-gradient(145deg,var(--g1),var(--g2));box-shadow:0 18px 40px rgba(0,0,0,.4)}
.qa-hero::before,.qa-hero::after{content:'';position:absolute;border-radius:50%;filter:blur(30px);opacity:.55;animation:qaBlob 7s ease-in-out infinite}
.qa-hero::before{width:170px;height:170px;right:-40px;top:-50px;background:var(--g3)}
.qa-hero::after{width:140px;height:140px;left:-40px;bottom:-60px;background:var(--g1);animation-delay:-3s}
@keyframes qaBlob{50%{transform:translate(-22px,16px) scale(1.15)}}
.qa-hero>*{position:relative;z-index:1}
.qa-he{font-size:58px;line-height:1;display:inline-block;filter:drop-shadow(0 8px 14px rgba(0,0,0,.35));animation:qaFloat 3.2s ease-in-out infinite}
@keyframes qaFloat{50%{transform:translateY(-8px) rotate(-6deg)}}
.qa-hero h2{font-size:25px;letter-spacing:-.02em;margin-top:8px}
.qa-hero p{font-size:13.5px;opacity:.85;margin-top:2px}
.qa-acts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:16px}
.qa-acts button{display:flex;flex-direction:column;align-items:center;gap:5px;padding:11px 4px;border-radius:16px;border:1px solid rgba(255,255,255,.22);background:rgba(0,0,0,.24);
  -webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);color:#fff;font:inherit;font-size:13px;font-weight:700;cursor:pointer}
.qa-acts button b{font-size:21px;line-height:1}.qa-acts button:active{transform:scale(.95)}

.qa-lb{font-size:13px;color:var(--muted);font-weight:700;margin:24px 2px 10px}
.qa-row{display:flex;gap:10px;overflow-x:auto;margin:0 -18px;padding:2px 18px 6px;scroll-snap-type:x proximity;scroll-padding-left:18px;scrollbar-width:none}
.qa-row::-webkit-scrollbar{display:none}
.qa-m{flex:0 0 112px;scroll-snap-align:start;display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 6px 14px;border-radius:24px;border:1px solid rgba(255,255,255,.1);
  background:linear-gradient(180deg,rgba(255,255,255,.09),rgba(255,255,255,.03));color:#fff;font:inherit;font-size:14px;font-weight:700;cursor:pointer}
.qa-m i{font-style:normal;font-size:38px;line-height:1;display:block;animation:qaFloat 3.6s ease-in-out infinite;animation-delay:calc(var(--i,0)*-.5s)}
.qa-m.on{border-color:rgba(124,255,178,.6);background:linear-gradient(180deg,rgba(124,255,178,.22),rgba(124,255,178,.05))}
.qa-m small{font-size:11px;color:var(--muted);font-weight:600}.qa-m:active{transform:scale(.95)}

.qa-w{display:flex;align-items:center;gap:14px;width:100%;padding:16px;border-radius:24px;border:1px solid rgba(110,190,255,.28);color:#fff;font:inherit;text-align:left;
  background:linear-gradient(135deg,rgba(47,134,232,.32),rgba(155,219,255,.10))}
.qa-w .dr{font-size:38px;line-height:1;display:inline-block;animation:qaDrop 2.4s ease-in-out infinite}
@keyframes qaDrop{50%{transform:translateY(5px) scale(.94,1.06)}}
.qa-w b{display:block;font-size:17px}.qa-w small{display:block;color:rgba(255,255,255,.7);font-size:13px;margin-top:2px}
.qa-w div{flex:1}.qa-w .plus{display:flex;gap:8px}
.qa-w .plus button{border:0;border-radius:14px;padding:10px 12px;font:inherit;font-size:14px;font-weight:800;color:#06210f;background:linear-gradient(180deg,#bfe6ff,#74b9ff);cursor:pointer}
.qa-w .plus button:active{transform:scale(.93)}
.qa-g{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
.qa-t{display:flex;align-items:center;gap:12px;padding:14px;border-radius:20px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#fff;font:inherit;font-size:15px;font-weight:700;cursor:pointer;text-align:left}
.qa-t i{font-style:normal;font-size:26px;line-height:1}.qa-t:active{transform:scale(.96)}
.qa-t small{display:block;font-size:11.5px;color:var(--muted);font-weight:500;margin-top:1px}
@media (prefers-reduced-motion:reduce){.qa-ov *,.qa-ov{animation-duration:.01s!important;animation-iteration-count:1!important}}

/* kalendár vo Fuelwind štýle */
.cal-bg{position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(5,8,12,.6);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);animation:qaBg .2s ease both}
.cal-bg.out{animation:qaBgOut .18s ease both}
.cal{width:100%;max-width:380px;border-radius:30px;padding:18px 14px 14px;border:1px solid rgba(255,255,255,.14);
  background:linear-gradient(180deg,rgba(255,255,255,.09),rgba(255,255,255,.03)),rgba(20,25,33,.92);box-shadow:0 30px 70px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.16);animation:qaPop .45s cubic-bezier(.2,1.25,.4,1) both;touch-action:pan-y}
.cal-top{display:flex;align-items:center;justify-content:space-between;padding:0 6px 12px}
.cal-top h3{font-size:19px;letter-spacing:-.02em;text-transform:capitalize}
.cal-top div{display:flex;gap:6px}
.cal-top button{width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff;font-size:18px;cursor:pointer}
.cal-top button:disabled{opacity:.25}.cal-top button:active{transform:scale(.9)}
.cal-w,.cal-d{display:grid;grid-template-columns:repeat(7,1fr);text-align:center}
.cal-w span{font-size:11.5px;color:var(--muted);font-weight:700;padding:6px 0}
.cal-d{row-gap:4px;animation:calIn .3s ease both}
@keyframes calIn{from{opacity:0;transform:translateX(var(--dx,0))}to{opacity:1;transform:none}}
.cal-d button{aspect-ratio:1;border:0;background:none;color:#fff;font:inherit;font-size:16px;font-weight:600;border-radius:50%;cursor:pointer;position:relative;margin:0 auto;width:80%}
.cal-d button:disabled{color:rgba(255,255,255,.22);cursor:default}
.cal-d button.t{box-shadow:inset 0 0 0 1.5px rgba(124,255,178,.7)}
.cal-d button.s{background:linear-gradient(180deg,#9dffc4,#5fe69a);color:#06210f;font-weight:800;box-shadow:0 6px 16px rgba(95,230,154,.35)}
.cal-d button:not(:disabled):active{transform:scale(.88)}
.cal-f{display:flex;gap:8px;margin-top:12px}
.cal-f button{flex:1;padding:13px;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff;font:inherit;font-size:15px;font-weight:700;cursor:pointer}
.cal-f button.go{background:linear-gradient(180deg,#9dffc4,#5fe69a);color:#06210f;border-color:transparent}
`;
const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

const MEAL_ICO = { breakfast: '🥣', brunch: '🍎', lunch: '🍽', afternoon: '🥪', dinner: '🌙', late: '🌜' };
const MEAL_G = {
  breakfast: ['#ff9a3c', '#e8505b', '#ffd36b'], brunch: ['#e8505b', '#a63d7a', '#ff9a8b'], lunch: ['#2fa26a', '#1d6e8c', '#7cffb2'],
  afternoon: ['#d98324', '#8a5a2b', '#ffd36b'], dinner: ['#5b4bd6', '#2b3a8f', '#b69cff'], late: ['#2b3a8f', '#161a3d', '#6f7cff'],
};
const MEAL_HINT = { breakfast: 'Dobré ráno', brunch: 'Čas na desiatu', lunch: 'Čas na obed', afternoon: 'Olovrant', dinner: 'Čo bude na večeru', late: 'Večerný hlad' };
function nowMeal() {
  const k = new Date().getHours();
  return k < 10 ? 'breakfast' : k < 12 ? 'brunch' : k < 15 ? 'lunch' : k < 17 ? 'afternoon' : k < 21 ? 'dinner' : 'late';
}
const S = () => (typeof ctx.state === 'function' ? ctx.state() : ctx.state) || {};
const fmtL = ml => (ml / 1000).toFixed(2).replace('.', ',').replace(/,?0+$/, m => m.startsWith(',') ? '' : m);

let ov = null, dirty = false;
function close(then) {
  if (!ov) return;
  const el = ov; ov = null;
  document.body.classList.remove('qa-open');
  el.classList.add('out');
  setTimeout(() => { el.remove(); then?.(); }, 200);
  if (dirty) { dirty = false; if ((location.hash || '#/').split('?')[0] === '#/') window.dispatchEvent(new HashChangeEvent('hashchange')); }
}
function go(href, after) {
  close();
  location.hash = href;
  if (after) { let n = 0; const t = setInterval(() => { if (after() || ++n > 40) clearInterval(t); }, 150); }
}
const pop = (i, html) => `<div class="qa-pop" style="--i:${i}">${html}</div>`;

async function open() {
  if (ov) return close();
  const M = ctx.MEALS || {}, cur = nowMeal(), g = MEAL_G[cur], name = M[cur] || 'jedlo';
  const p = S().profile || {}, uid = p.id;
  let ml = 0;
  ov = document.createElement('div'); ov.className = 'qa-ov';
  const goal = (p.water_goal || 8) * 250;
  const draw = () => {
    ov.innerHTML = `<div class="qa-in">
      ${pop(0, `<h1 class="qa-h">Čo zapíšeme?</h1><p class="qa-sub">${MEAL_HINT[cur]}. Všetko za pár ťuknutí.</p>`)}
      ${pop(1, `<div class="qa-hero" style="--g1:${g[0]};--g2:${g[1]};--g3:${g[2]}">
        <span class="qa-he">${MEAL_ICO[cur]}</span><h2>Zapísať ${name.toLowerCase()}</h2><p>Napíš to slovami, odfoť alebo naskenuj kód.</p>
        <div class="qa-acts"><button data-qa="ai:${cur}"><b>✦</b>AI zápis</button><button data-qa="q:${cur}"><b>🔎</b>Hľadať</button><button data-qa="scan:${cur}"><b>▥</b>Kód</button></div></div>`)}
      ${pop(2, '<div class="qa-lb">Iná doba jedla</div>')}
      ${pop(3, `<div class="qa-row">${Object.keys(MEAL_ICO).filter(k => M[k]).map((k, i) => `<button class="qa-m${k === cur ? ' on' : ''}" style="--i:${i}" data-qa="meal:${k}"><i>${MEAL_ICO[k]}</i>${M[k]}${k === cur ? '<small>teraz</small>' : ''}</button>`).join('')}</div>`)}
      ${pop(4, '<div class="qa-lb">Rýchlo</div>')}
      ${pop(5, `<div class="qa-w"><span class="dr">💧</span><div><b>Voda</b><small>${fmtL(ml)} z ${fmtL(goal)} l dnes</small></div><div class="plus"><button data-qa="w:250">+250</button><button data-qa="w:500">+500</button></div></div>`)}
      ${pop(6, `<div class="qa-g">
        <button class="qa-t" data-qa="weight"><i>⚖️</i><span>Hmotnosť<small>Zapísať váhu</small></span></button>
        <button class="qa-t" data-qa="machine"><i>📷</i><span>Skenuj stroj<small>V posilke</small></span></button>
        <button class="qa-t" data-qa="checkin"><i>✅</i><span>Check-in<small>Spánok, nálada</small></span></button>
        <button class="qa-t" data-qa="diary"><i>📖</i><span>Denník<small>Celé jedlá dňa</small></span></button></div>`)}
    </div>`;
  };
  draw();
  document.body.appendChild(ov);
  document.body.classList.add('qa-open');
  try { navigator.vibrate?.(8); } catch (_) { }
  if (uid) db.getCheckin(uid, calc.today()).then(c => {
    ml = c?.water_ml ?? (c?.water || 0) * 250;
    const s = ov?.querySelector('.qa-w small'); if (s) s.textContent = `${fmtL(ml)} z ${fmtL(goal)} l dnes`;
  }).catch(() => { });
  ov.addEventListener('click', async e => {
    const b = e.target.closest('[data-qa]');
    if (!b) { if (!e.target.closest('.qa-in') || e.target.classList.contains('qa-in')) close(); return; }
    const [a, v] = b.dataset.qa.split(':');
    if (a === 'meal') return go('#/jedlo?meal=' + v);
    if (a === 'q') return go('#/jedlo?meal=' + v + '&q=1');
    if (a === 'scan') return go('#/jedlo?meal=' + v + '&scan=1');
    if (a === 'ai') return go('#/jedlo?meal=' + v + '&ai=1');
    if (a === 'weight') return go('#/vaha');
    if (a === 'checkin') return go('#/checkin');
    if (a === 'diary') return go('#/jedlo');
    if (a === 'machine') return go('#/trening', () => { const el = document.getElementById('fw-machine'); if (el) el.click(); return !!el; });
    if (a === 'w' && uid) {
      ml += Number(v);
      const s = ov?.querySelector('.qa-w small'); if (s) s.textContent = `${fmtL(ml)} z ${fmtL(goal)} l dnes`;
      try { navigator.vibrate?.(10); } catch (_) { }
      try { await db.upsertCheckin({ user_id: uid, date: calc.today(), water: Math.floor(ml / 250), water_ml: ml }); ctx.toast(`+${v} ml vody`); }
      catch (err) { ctx.toast(err.message, true); }
      dirty = true;
    }
  });
}

const fab = document.createElement('button');
fab.className = 'qa-fab'; fab.setAttribute('aria-label', 'Rýchle akcie');
fab.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
fab.onclick = open;
document.body.appendChild(fab);
const sync = () => {
  const has = !!document.querySelector('.nav');
  document.body.classList.toggle('has-qa', has);
  if (!has && ov) close();
};
new MutationObserver(sync).observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
sync();
window.addEventListener('hashchange', () => { if (ov) close(); });

// ---------- kalendár ----------
const MON = ['január', 'február', 'marec', 'apríl', 'máj', 'jún', 'júl', 'august', 'september', 'október', 'november', 'december'];
const DOW = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'];
const pad = n => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

function openCalendar(input) {
  const val = input.value || calc.today(), max = input.dataset.max || '', min = input.dataset.min || '';
  let [y, m] = val.split('-').map(Number); m -= 1;
  let sel = input.value;
  const bg = document.createElement('div'); bg.className = 'cal-bg';
  bg.innerHTML = '<div class="cal"></div>';
  document.body.appendChild(bg);
  const box = bg.firstChild;
  const shut = () => { bg.classList.add('out'); setTimeout(() => bg.remove(), 180); };
  const pick = v => {
    input.value = v;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    try { navigator.vibrate?.(8); } catch (_) { }
    shut();
  };
  const draw = dx => {
    const first = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate(), today = calc.today();
    const cells = Array(first).fill('<span></span>');
    for (let d = 1; d <= days; d++) {
      const v = iso(y, m, d), off = (max && v > max) || (min && v < min);
      cells.push(`<button data-v="${v}" class="${v === sel ? 's' : ''} ${v === today ? 't' : ''}" ${off ? 'disabled' : ''}>${d}</button>`);
    }
    const nextOff = !!max && iso(m === 11 ? y + 1 : y, (m + 1) % 12, 1) > max;
    box.innerHTML = `<div class="cal-top"><h3>${MON[m]} ${y}</h3><div><button data-n="-1" aria-label="Predošlý mesiac">‹</button><button data-n="1" aria-label="Ďalší mesiac" ${nextOff ? 'disabled' : ''}>›</button></div></div>
      <div class="cal-w">${DOW.map(x => `<span>${x}</span>`).join('')}</div><div class="cal-d" style="--dx:${dx || 0}px">${cells.join('')}</div>
      <div class="cal-f"><button data-x>Zavrieť</button><button class="go" data-t>Dnes</button></div>`;
  };
  const step = n => { m += n; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } draw(n * 30); };
  box.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.v) pick(b.dataset.v);
    else if (b.dataset.n) step(Number(b.dataset.n));
    else if (b.dataset.t !== undefined) pick(calc.today());
    else if (b.dataset.x !== undefined) shut();
  });
  bg.addEventListener('click', e => { if (e.target === bg) shut(); });
  let x0 = null;
  box.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); }, { passive: true });
  draw(0);
}
// natívny výber dátumu z iOS sa nahradí naším: pole zostane, mení sa len spôsob výberu
function tame(i) {
  if (i.dataset.cal) return; i.dataset.cal = '1';
  if (i.max) i.dataset.max = i.max; if (i.min) i.dataset.min = i.min;
  i.type = 'text'; i.readOnly = true; i.inputMode = 'none';
}
const scanDates = n => { if (n.nodeType !== 1) return; if (n.matches?.('input[type=date]')) tame(n); n.querySelectorAll?.('input[type=date]').forEach(tame); };
new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(scanDates))).observe(document.documentElement, { childList: true, subtree: true });
document.querySelectorAll('input[type=date]').forEach(tame);
document.addEventListener('click', e => {
  const i = e.target.closest?.('input[data-cal]'); if (!i) return;
  e.preventDefault(); i.blur(); openCalendar(i);
}, true);
