// Prvý zápis po onboardingu: namiesto prázdnej obrazovky appka hneď vyzve "Napíš, čo si dnes jedol"
// a po zápise ukáže hotové kalórie a bielkoviny. Beží len raz, hneď po prvom vyplnení údajov.
import { ctx } from './app.js';
import * as db from './data.js';
import * as calc from './calc.js';
import { aiBoxHtml, bindAiBox } from './ailog.js';
import { defaultMeal } from './foods.js';

const KEY = 'fw_first';
const DONE = 'fw_first_done';
const h = (...a) => ctx.h(...a);
const tk = (n, p) => { try { window.fwTrack && window.fwTrack(n, p || {}); } catch (_) {} };
const ss = { get: k => { try { return sessionStorage.getItem(k); } catch (_) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (_) {} } };
const ls = { get: k => { try { return localStorage.getItem(k); } catch (_) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} } };

const CSS = `
.fl-bg{position:fixed;inset:0;z-index:28;background:#0B0E12;color:#F2F5F8;display:flex;flex-direction:column;padding:calc(env(safe-area-inset-top) + 28px) 20px calc(env(safe-area-inset-bottom) + 20px);overflow:auto;font-family:Sora,system-ui,sans-serif}
.fl-in{max-width:460px;width:100%;margin:auto;display:flex;flex-direction:column;gap:16px}
.fl-h{font-size:30px;line-height:1.1;font-weight:700;letter-spacing:-.02em;margin:0}
.fl-p{margin:0;color:#A9B3BF;font-size:15px;line-height:1.5}
.fl-tg{display:flex;gap:10px}
.fl-tg div{flex:1;border:1px solid #232A33;border-radius:16px;padding:12px 14px;background:#12171D}
.fl-tg b{display:block;font-size:24px;color:#7CFFB2}
.fl-tg span{font-size:12px;color:#8693A1}
.fl-chips{display:flex;flex-wrap:wrap;gap:8px}
.fl-chips button{border:1px solid #2A333D;background:#12171D;color:#F2F5F8;border-radius:999px;padding:8px 13px;font:inherit;font-size:13px;cursor:pointer}
.fl-chips button:active{background:#1B232B}
.fl-skip{align-self:center;background:none;border:0;color:#8693A1;font:inherit;font-size:14px;padding:10px;cursor:pointer;text-decoration:underline}
.fl-big{display:flex;gap:10px}
.fl-big div{flex:1;border-radius:20px;padding:18px 14px;background:#12171D;border:1px solid #232A33}
.fl-big b{display:block;font-size:40px;line-height:1;color:#7CFFB2;font-variant-numeric:tabular-nums}
.fl-big span{font-size:13px;color:#A9B3BF}
.fl-bar{height:8px;border-radius:99px;background:#1B232B;overflow:hidden}
.fl-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#7CFFB2,#8C8CFF);transition:width .9s cubic-bezier(.2,.8,.2,1)}
.fl-go{border:0;border-radius:16px;padding:15px;background:#7CFFB2;color:#0B0E12;font:inherit;font-weight:700;font-size:16px;cursor:pointer}
.fl-bg .ai-box{margin-bottom:0}
@media (prefers-reduced-motion:reduce){.fl-bar i{transition:none}}
`;

function css() { if (document.getElementById('flCss')) return; const s = document.createElement('style'); s.id = 'flCss'; s.textContent = CSS; document.head.appendChild(s); }

let open = false;
function intro() {
  const { state } = ctx, p = state.profile || {};
  open = true; css(); tk('fl_shown');
  const bg = document.createElement('div'); bg.className = 'fl-bg';
  const kc = Math.round(p.target_kcal || 0), pr = Math.round(p.target_protein || 0);
  bg.innerHTML = `<div class="fl-in">
    <h1 class="fl-h">Napíš, čo si dnes jedol</h1>
    <p class="fl-p">Stačí jedna veta, nadiktovať ju alebo odfotiť tanier. Kalórie a bielkoviny dopočítam ja.</p>
    ${kc ? `<div class="fl-tg"><div><b>${kc}</b><span>kcal na deň</span></div>${pr ? `<div><b>${pr} g</b><span>bielkovín na deň</span></div>` : ''}</div>` : ''}
    ${aiBoxHtml()}
    <div class="fl-chips">${['2 vajcia a rožok', 'bryndzové halušky', 'skyr a banán', 'rezeň s kašou'].map(t => `<button type="button">${h(t)}</button>`).join('')}</div>
    <button class="fl-skip" type="button">Zapíšem neskôr</button>
  </div>`;
  document.body.appendChild(bg);
  const close = () => { bg.remove(); open = false; };
  bindAiBox(bg, () => defaultMeal(), () => result(bg, close));
  const ta = bg.querySelector('#aiText');
  bg.querySelectorAll('.fl-chips button').forEach(b => b.onclick = () => { ta.value = b.textContent; ta.dispatchEvent(new Event('input')); ta.focus(); });
  bg.querySelector('.fl-skip').onclick = () => { tk('fl_skip'); close(); };
}

async function result(bg, close) {
  tk('fl_done');
  const { state } = ctx, p = state.profile || {};
  let t = { kcal: 0, protein: 0 };
  try { t = calc.sumMacros(await db.listFood(p.id, state.date || calc.today())); } catch (_) {}
  const kc = Math.round(p.target_kcal || 0), pr = Math.round(p.target_protein || 0);
  const pct = kc ? Math.min(100, Math.round(t.kcal / kc * 100)) : 0;
  const left = kc ? Math.max(0, kc - Math.round(t.kcal)) : 0;
  bg.innerHTML = `<div class="fl-in">
    <h1 class="fl-h">Prvý zápis je hotový</h1>
    <div class="fl-big"><div><b>${Math.round(t.kcal)}</b><span>kcal${kc ? ' z ' + kc : ''}</span></div><div><b>${Math.round(t.protein)} g</b><span>bielkoviny${pr ? ' z ' + pr + ' g' : ''}</span></div></div>
    ${kc ? `<div class="fl-bar"><i></i></div><p class="fl-p">Do dnešného cieľa ti zostáva ${left} kcal${pr ? ` a ${Math.max(0, pr - Math.round(t.protein))} g bielkovín` : ''}. Takto jednoducho to ide celý deň.</p>` : ''}
    <button class="fl-go" type="button">Ísť na Dnes</button>
  </div>`;
  requestAnimationFrame(() => requestAnimationFrame(() => { const i = bg.querySelector('.fl-bar i'); if (i) i.style.width = pct + '%'; }));
  bg.querySelector('.fl-go').onclick = () => { ls.set(DONE, '1'); close(); if (location.hash !== '#/') location.hash = '#/'; else window.dispatchEvent(new HashChangeEvent('hashchange')); };
}

// zapamätaj si, že tento submit je úplne prvé vyplnenie onboardingu
document.addEventListener('submit', e => {
  if (e.target?.id === 'onb' && !ctx.state?.profile?.onboarded) tk('onb_submit');
  if (e.target?.id === 'onb' && !ctx.state?.profile?.onboarded && !ls.get(DONE)) ss.set(KEY, '1');
}, true);

setInterval(() => {
  if (open || ss.get(KEY) !== '1') return;
  const p = ctx.state?.profile;
  if (!p?.onboarded || document.getElementById('onb')) return;
  if (!['', '#', '#/'].includes(location.hash)) return;
  ss.set(KEY, '0'); ls.set(DONE, '1');
  intro();
}, 400);
