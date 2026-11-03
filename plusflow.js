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
  st.textContent = `.tdh-plusrow{flex:0 0 100%;display:flex;justify-content:center;margin:2px 0 12px}.tdh-plus{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:42px;padding:0 22px;border:0;border-radius:99px;font:inherit;font-size:15px;font-weight:800;letter-spacing:.005em;cursor:pointer;color:var(--accent-ink,#06210f);background:linear-gradient(110deg,var(--accent),color-mix(in srgb,var(--accent) 50%,#fff) 55%,var(--accent));background-size:200% 100%;box-shadow:0 6px 20px -6px color-mix(in srgb,var(--accent) 80%,transparent),inset 0 1px 0 rgba(255,255,255,.45)}.tdh-plus i{font-style:normal;font-size:14px}.tdh-plus small{font:inherit;font-weight:700;opacity:.72}.tdh-plus:active{transform:scale(.97)}.tdh-plus:focus-visible{outline:2px solid var(--text);outline-offset:2px}@media (prefers-reduced-motion:no-preference){.tdh-plus{animation:tdhPlus 5s ease-in-out 1.2s infinite}@keyframes tdhPlus{0%,70%,100%{background-position:0 0}85%{background-position:100% 0}}}`;
  document.head.appendChild(st);
} catch (_) { }

function pill() {
  const tdh = document.querySelector('.screen.td .tdh'); if (!tdh) return;
  const has = tdh.querySelector('.tdh-plusrow');
  if (!free()) { has?.remove(); return; }
  const trial = ent.offer === 'first_year' && Number(ent.trial_offer_days) > 0;
  const html = trial ? `<i aria-hidden="true">✦</i>Vyskúšaj Plus <small>${Number(ent.trial_offer_days)} dní zadarmo</small>` : `<i aria-hidden="true">✦</i>GainTrain Plus`;
  if (has) { const b = has.firstChild; if (b.dataset.t !== (trial ? '1' : '0')) { b.dataset.t = trial ? '1' : '0'; b.innerHTML = html; } return; }
  const row = document.createElement('div'); row.className = 'tdh-plusrow';
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'tdh-plus'; b.dataset.t = trial ? '1' : '0'; b.setAttribute('aria-label', 'GainTrain Plus');
  b.innerHTML = html; b.onclick = () => paywall({ feature: "pill" });
  row.appendChild(b); tdh.insertBefore(row, tdh.firstChild);
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
