// Tlačidlo Späť na každej vnorenej obrazovke (Ciele, Správy, Hodinky, Návyky, ...), nie len na hlavných kartách dole.
import { ctx } from './app.js';

const root = document.getElementById('app');
const TABS = new Set(['#/', '#/jedlo', '#/trening', '#/pokrok', '#/kouc', '#/profil', '#/onboarding', '#/checkin']);
const PARENT = { '#/jedlo': '#/', '#/vaha': '#/pokrok', '#/fotky': '#/pokrok', '#/report': '#/pokrok', '#/tyzden': '#/profil', '#/cukor-sprava': '#/cukor', '#/cukor': '#/profil', '#/navyky': '#/profil' };
let moves = 0;
addEventListener('hashchange', () => { moves++; });

const st = document.createElement('style');
st.textContent = `
.screen.bk{position:relative;padding-top:calc(env(safe-area-inset-top) + 94px)}
.bk-b{position:absolute;z-index:5;top:calc(env(safe-area-inset-top) + 46px);left:12px;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;padding:0;border:1px solid rgba(255,255,255,.1);background:rgba(28,34,43,.72);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);color:var(--text);box-shadow:0 6px 16px -8px rgba(0,0,0,.7);-webkit-appearance:none;appearance:none;cursor:pointer;transition:transform .12s}
.bk-b:active{transform:scale(.92)}
.bk-b svg{width:20px;height:20px}
body:has(.sheet-bg) .bk-b{visibility:hidden}
`;
document.head.appendChild(st);

function back() {
  const p = (location.hash || '#/').split('?')[0];
  if (moves > 0 && history.length > 1) { history.back(); return; }
  const m = p.match(/^#\/kouc\/[^/]+\/fotky$/);
  location.hash = m ? p.replace(/\/fotky$/, '') : (PARENT[p] || (/^#\/kouc\//.test(p) ? '#/kouc' : '#/profil'));
}

function run() {
  const p = (location.hash || '#/').split('?')[0];
  const s = root?.querySelector('.screen');
  if (!s) return;
  const show = (!TABS.has(p) || (p === '#/onboarding' && ctx.state?.profile?.onboarded)) && !s.classList.contains('wc') && !s.querySelector('#wcBack');
  const b = s.querySelector(':scope > .bk-b');
  if (!show) { if (b) { b.remove(); s.classList.remove('bk'); } return; }
  if (b) return;
  const el = document.createElement('button');
  el.type = 'button'; el.className = 'bk-b'; el.setAttribute('aria-label', 'Späť');
  el.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  el.onclick = back;
  s.classList.add('bk'); s.prepend(el);
  // staré textové „Späť“ v hlavičke je už zbytočné
  s.querySelectorAll('.topbar a, .tr-top a').forEach(a => { const t = a.textContent.trim(); if (t === '←' || /^(←\s*)?Späť$/.test(t)) a.style.display = 'none'; }); // šípka vľavo hore už je, druhá by mätla
}
if (root) { new MutationObserver(run).observe(root, { childList: true, subtree: true }); run(); }
