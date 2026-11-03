// GainTrain Plus: kde sa ponuka ukáže bez toho, aby človek niečo ťukal.
// 1) Pilulka „Plus“ v hlavičke obrazovky Dnes (len bez Plus a len keď sú platby zapnuté).
// 2) Raz po prvom nastavení účtu: ponuka s 7 dňami zadarmo (so zatváracím krížikom, bez nátlaku, nič sa neopakuje).
// Všetko sa riadi tým istým stavom ako zvyšok platieb (billing.js): kým sú platby vypnuté, nič z toho sa nezobrazí.
import { ent, paywall } from './billing.js';
import { ctx } from './app.js';
import * as calc from './calc.js';

const free = () => !!ent.on && !ent.premium && ent.reason === 'free';
try {
  const st = document.createElement('style');
  st.textContent = `.tdh-plus{flex:0 0 auto;display:inline-flex;align-items:center;gap:5px;height:34px;padding:0 13px 0 11px;margin:0 2px 0 auto;border:0;border-radius:99px;font:inherit;font-size:14px;font-weight:800;letter-spacing:.01em;cursor:pointer;color:var(--accent-ink,#06210f);background:linear-gradient(120deg,var(--accent),color-mix(in srgb,var(--accent) 55%,#fff));box-shadow:0 4px 14px -4px color-mix(in srgb,var(--accent) 70%,transparent)}.tdh-plus i{font-style:normal;font-size:12px}.tdh-plus:active{transform:scale(.95)}.tdh-plus:focus-visible{outline:2px solid var(--text);outline-offset:2px}.tdh-l{margin-right:8px}`;
  document.head.appendChild(st);
} catch (_) { }

function pill() {
  const tdh = document.querySelector('.screen.td .tdh'); if (!tdh) return;
  const has = tdh.querySelector('.tdh-plus');
  if (!free()) { has?.remove(); return; }
  if (has) return;
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'tdh-plus'; b.setAttribute('aria-label', 'GainTrain Plus');
  b.innerHTML = '<i aria-hidden="true">✦</i>Plus';
  b.onclick = () => paywall({ feature: 'pill' });
  tdh.insertBefore(b, tdh.querySelector('.tdh-now, .tdh-edit') || null);
}

// nový účet (do 2 dní od štartu), ktorý ešte nemal predplatné: ponuka raz, po príchode na Dnes
function welcome() {
  const p = ctx.state?.profile;
  if (!p?.onboarded || !free() || ent.offer !== 'first_year' || location.hash !== '#/' && location.hash !== '') return;
  const age = p.start_date ? (new Date(calc.today()) - new Date(p.start_date)) / 864e5 : 99;
  if (!(age >= 0 && age <= 2)) return;
  const key = 'gt-pw-welcome:' + p.id;
  try { if (localStorage.getItem(key)) return; localStorage.setItem(key, '1'); } catch (_) { return; }
  setTimeout(() => { if (free()) paywall({ welcome: true, feature: 'welcome' }); }, 1400);
}

let q = 0;
const run = () => { q = 0; try { pill(); welcome(); } catch (_) { } };
const app = document.getElementById('app');
if (app) new MutationObserver(() => { if (!q) q = requestAnimationFrame(run); }).observe(app, { childList: true, subtree: true });
addEventListener('fw-ent', () => { if (!q) q = requestAnimationFrame(run); });
