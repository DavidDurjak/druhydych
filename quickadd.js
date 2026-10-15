// Plusko vedľa spodnej lišty: rýchle akcie odkiaľkoľvek v appke (zapísať jedlo, vodu, váhu, naskenovať stroj).
import { ctx } from './app.js';

const CSS = `
:root{--qa-x:max(12px,calc((100vw - 560px)/2))}
body.has-qa .nav{left:var(--qa-x);right:calc(var(--qa-x) + 68px);max-width:none;margin:0}
.qa-fab{position:fixed;z-index:29;right:var(--qa-x);bottom:calc(env(safe-area-inset-bottom) + 8px);width:60px;height:60px;border-radius:50%;border:0;padding:0;
  display:none;align-items:center;justify-content:center;cursor:pointer;color:#06210f;
  background:linear-gradient(180deg,#9dffc4,#5fe69a);box-shadow:0 12px 28px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.25) inset,0 0 24px rgba(124,255,178,.25);
  transition:transform .25s cubic-bezier(.3,1.5,.5,1)}
body.has-qa .qa-fab{display:flex}body.bd-open .qa-fab{display:none}
.qa-fab:active{transform:scale(.92)}
.qa-fab svg{width:28px;height:28px;stroke:currentColor;stroke-width:2.6;stroke-linecap:round;fill:none}
.qa-main{display:flex;align-items:center;gap:14px;width:100%;padding:16px;border-radius:18px;border:0;cursor:pointer;color:#06210f;font:inherit;text-align:left;
  background:linear-gradient(180deg,#9dffc4,#5fe69a);margin:4px 0 14px}
.qa-main b{display:block;font-size:17px}.qa-main small{display:block;font-size:12.5px;opacity:.75;margin-top:1px}.qa-main>span{font-size:26px}
.qa-lb{font-size:12px;color:var(--muted);margin:10px 2px 8px;font-weight:600}
.qa-g{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.qa-g.m3{grid-template-columns:repeat(3,1fr)}
.qa-t{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 4px;border-radius:16px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:var(--text,#fff);font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;text-decoration:none;text-align:center}
.qa-t b{font-size:22px;line-height:1}.qa-t:active{transform:scale(.96)}.qa-t.on{border-color:rgba(124,255,178,.5);background:rgba(124,255,178,.1)}
`;
const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

const MEAL_ICO = { breakfast: '🥣', brunch: '🍎', lunch: '🍽', afternoon: '🥪', dinner: '🌙', late: '🌜' };
function nowMeal() {
  const k = new Date().getHours();
  return k < 10 ? 'breakfast' : k < 12 ? 'brunch' : k < 15 ? 'lunch' : k < 17 ? 'afternoon' : k < 21 ? 'dinner' : 'late';
}
function go(href, after) {
  document.querySelector('.sheet-bg')?.remove();
  const same = (location.hash || '#/').split('?')[0] === href.split('?')[0] && !href.includes('?');
  if (same) { after?.(); return; }
  location.hash = href;
  if (after) { let n = 0; const t = setInterval(() => { if (after() || ++n > 40) clearInterval(t); }, 150); }
}
const tile = (a, ico, lbl, on) => `<button class="qa-t${on ? ' on' : ''}" data-qa="${a}"><b>${ico}</b>${lbl}</button>`;

function open() {
  const M = ctx.MEALS || {}, cur = nowMeal(), curL = M[cur] || 'jedlo';
  const bg = ctx.sheet(`
    <button class="qa-main" data-qa="meal:${cur}"><span>${MEAL_ICO[cur] || '🍽'}</span><div><b>Zapísať jedlo</b><small>Do aktuálnej doby jedla (${curL.toLowerCase()})</small></div></button>
    <div class="qa-g m3">${tile('q', '🔎', 'Hľadať')}${tile('scan', '▥', 'Kód')}${tile('ai', '✦', 'AI zápis')}</div>
    <div class="qa-lb">Zapísať do</div>
    <div class="qa-g m3">${Object.keys(MEAL_ICO).filter(k => M[k]).map(k => tile('meal:' + k, MEAL_ICO[k], M[k], k === cur)).join('')}</div>
    <div class="qa-lb">Ostatné</div>
    <div class="qa-g">${tile('water', '💧', 'Voda')}${tile('weight', '⚖️', 'Hmotnosť')}${tile('machine', '📷', 'Skenuj stroj')}${tile('checkin', '✅', 'Check-in')}</div>`);
  bg.addEventListener('click', e => {
    const b = e.target.closest('[data-qa]'); if (!b) return;
    const a = b.dataset.qa;
    if (a.startsWith('meal:')) return go('#/jedlo?meal=' + a.slice(5));
    if (a === 'q') return go('#/jedlo?q=1');
    if (a === 'scan') return go('#/jedlo?scan=1');
    if (a === 'ai') return go('#/jedlo?ai=1');
    if (a === 'weight') return go('#/vaha');
    if (a === 'checkin') return go('#/checkin');
    if (a === 'water') return go('#/', () => { const el = document.getElementById('wx'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); return !!el; });
    if (a === 'machine') return go('#/trening', () => { const el = document.getElementById('fw-machine'); if (el) el.click(); return !!el; });
  });
}

const fab = document.createElement('button');
fab.className = 'qa-fab'; fab.setAttribute('aria-label', 'Rýchle akcie');
fab.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
fab.onclick = open;
document.body.appendChild(fab);
const sync = () => document.body.classList.toggle('has-qa', !!document.querySelector('.nav'));
new MutationObserver(sync).observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
sync();
