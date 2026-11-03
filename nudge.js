// Kontextové ponuky GainTrain Plus: malá zatvoriteľná karta v správnom momente (nie náhodný popup).
// Momenty: po zápise jedla, po dokončenom tréningu, pri týždennom vyhodnotení a pripomienka konca skúšobnej doby.
// Pravidlá frekvencie (aby ponuka nepálila používateľa):
//   * len bez Plus a keď sú platby zapnuté; nikdy počas písania, nad inou obrazovkou ani počas prvých minút po štarte
//   * najviac jedna ponuka za reláciu a odstup aspoň GAP medzi ponukami
//   * ten istý moment sa po zobrazení neopakuje 3 dni, po zatvorení 7 dní
//   * po 3 zatvoreniach sa ponuky na 30 dní vypnú (ostane pilulka Plus a Profil)
//   * pripomienka konca skúšobnej doby je informácia o platbe, nie ponuka: ukáže sa raz a nepočíta sa do limitov
import { ent } from './billing.js';

const KEY = 'gt_nd', GAP = 6 * 36e5, SHOW_COOLDOWN = 3 * 864e5, DISMISS_COOLDOWN = 7 * 864e5, MUTE = 30 * 864e5;
const BOOT = Date.now();
const tk = (n, p) => { try { window.fwTrack && window.fwTrack(n, p || {}); } catch (_) { } };
const rd = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (_) { return {}; } };
const wr = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) { } };
let shownThisSession = false, cur = null, logs = 0;

const free = () => !!ent.on && !ent.premium && ent.reason === 'free';
const trialDays = () => (ent.offer === 'first_year' || ent.offer === 'winback') ? Number(ent.trial_offer_days) || 0 : 0;
const cta = () => trialDays() > 0 ? `Vyskúšať ${trialDays()} dní zadarmo` : 'Pozrieť Plus';

const MOMENTS = {
  meal: () => ({ icon: '🍽️', title: 'Zajtrajšok si môžeš nechať naplánovať', text: 'Plus z toho, čo si dnes zjedol, poskladá zajtrajšie jedlá presne podľa tvojich makier.', cta: cta() }),
  workout: () => ({ icon: '💪', title: 'Tréning hotový', text: 'Plus podľa neho upraví tvoje dnešné makrá a navrhne, čo trénovať ďalej.', cta: cta() }),
  week: () => ({ icon: '📈', title: 'Tvoj týždeň je zhrnutý', text: 'Plus ti ukáže, kde ti ušli bielkoviny a čo na budúci týždeň zmeniť.', cta: cta() }),
};

const CSS = `
.gt-nd{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 86px);z-index:850;width:min(430px,calc(100% - 24px));transform:translate(-50%,24px);opacity:0;display:flex;gap:12px;align-items:flex-start;padding:14px 14px 14px 14px;border-radius:20px;background:var(--card);color:var(--text);border:1px solid var(--line);box-shadow:0 18px 44px -14px rgba(0,0,0,.55);transition:transform .32s cubic-bezier(.2,.8,.2,1),opacity .24s ease}
.gt-nd.on{transform:translate(-50%,0);opacity:1}
.gt-nd i{flex:none;width:40px;height:40px;border-radius:13px;display:grid;place-items:center;font-style:normal;font-size:21px;background:color-mix(in srgb,var(--accent) 18%,transparent)}
.gt-nd .b{flex:1;min-width:0}
.gt-nd b{display:block;font-size:15px;line-height:1.25;margin-top:1px}
.gt-nd p{margin:3px 0 0;font-size:13px;line-height:1.4;color:var(--muted)}
.gt-nd .go{margin-top:10px;border:0;border-radius:12px;padding:10px 14px;font:inherit;font-size:14px;font-weight:800;cursor:pointer;background:var(--accent);color:var(--accent-ink,#06210f)}
.gt-nd .go:active{transform:scale(.97)}
.gt-nd .x{flex:none;width:30px;height:30px;margin:-4px -4px 0 0;border:0;border-radius:50%;background:none;color:var(--muted);font:inherit;font-size:20px;line-height:1;cursor:pointer}
.gt-nd .go:focus-visible,.gt-nd .x:focus-visible{outline:2px solid var(--text);outline-offset:2px}
@media (prefers-reduced-motion:reduce){.gt-nd{transition:opacity .2s ease;transform:translate(-50%,0)}}
`;
function css() { if (document.getElementById('gt-nd-css')) return; const s = document.createElement('style'); s.id = 'gt-nd-css'; s.textContent = CSS; document.head.appendChild(s); }

const blocked = () => {
  const a = document.activeElement;
  if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return true;
  if (a && a.isContentEditable) return true;
  return !!document.querySelector('.pw, .gt-cel, [role="dialog"], [aria-modal="true"], .sheet.open, .modal.open');
};

function allowed(id) {
  if (!free() || shownThisSession || cur) return false;
  if (Date.now() - BOOT < 90000) return false;
  const s = rd(), now = Date.now();
  if (s.mute && now < s.mute) return false;
  if (s.last && now - s.last < GAP) return false;
  const m = (s.m || {})[id] || {};
  if (m.shown && now - m.shown < SHOW_COOLDOWN) return false;
  if (m.dismissed && now - m.dismissed < DISMISS_COOLDOWN) return false;
  return !blocked();
}

function hide(el, dismissed) {
  if (!el || el.dataset.gone) return; el.dataset.gone = '1';
  el.classList.remove('on'); setTimeout(() => el.remove(), 320);
  if (cur === el) cur = null;
}

export function show(id) {
  const def = MOMENTS[id]; if (!def || !allowed(id)) return false;
  const d = def();
  css();
  const el = document.createElement('div'); el.className = 'gt-nd'; el.setAttribute('role', 'region'); el.setAttribute('aria-label', 'GainTrain Plus');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  el.innerHTML = `<i aria-hidden="true">${d.icon}</i><div class="b"><b>${esc(d.title)}</b><p>${esc(d.text)}</p><button type="button" class="go">${esc(d.cta)}</button></div><button type="button" class="x" aria-label="Zavrieť">×</button>`;
  document.body.appendChild(el); cur = el; shownThisSession = true;
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on')));
  const s = rd(); s.last = Date.now(); s.m = s.m || {}; s.m[id] = { ...(s.m[id] || {}), shown: Date.now() }; wr(s);
  tk('nudge_show', { id });
  el.querySelector('.go').onclick = () => { tk('nudge_tap', { id }); hide(el); try { window.fwPaywall && window.fwPaywall({ feature: 'nudge_' + id, reason: 'nudge' }); } catch (_) { } };
  el.querySelector('.x').onclick = () => {
    const t = rd(); t.m = t.m || {}; t.m[id] = { ...(t.m[id] || {}), dismissed: Date.now() };
    t.dc = (t.dc || 0) + 1; if (t.dc >= 3) { t.mute = Date.now() + MUTE; t.dc = 0; }
    wr(t); tk('nudge_close', { id }); hide(el, true);
  };
  setTimeout(() => hide(el), 14000); // sama zmizne, nepočíta sa ako zatvorenie
  return true;
}

// ----- spúšťače -----
// po zápise jedla: až po druhom zápise v relácii, keď už človek videl hodnotu (a po vete z kouča)
addEventListener('fw-logged', () => { logs++; if (logs >= 2) setTimeout(() => show('meal'), 7500); });
// po dokončení tréningu (rovnaký signál ako konfety v trainfx.js)
document.addEventListener('click', e => {
  const f = e.target.closest?.('#finish'); if (!f) return;
  const scr = f.closest('.screen') || document; if (!scr.querySelector('.set.done')) return;
  setTimeout(() => show('workout'), 3800);
}, true);
// týždenné vyhodnotenie
let wk = 0;
const route = () => { clearTimeout(wk); if ((location.hash || '').split('?')[0] === '#/report') wk = setTimeout(() => show('week'), 2600); };
addEventListener('hashchange', route); route();

// ----- pripomienka konca skúšobnej doby (informácia o platbe, nie ponuka) -----
function trialNote() {
  try {
    if (!ent.on || ent.reason !== 'sub' || !ent.trialing || ent.cancel || !ent.period_end) return;
    const left = (new Date(ent.period_end) - Date.now()) / 864e5; if (left > 2.5 || left < 0) return;
    const key = 'gt_trialnote:' + String(ent.period_end).slice(0, 10);
    if (localStorage.getItem(key) || cur || blocked()) return; localStorage.setItem(key, '1');
    css();
    const d = new Date(ent.period_end).toLocaleDateString('sk-SK');
    const el = document.createElement('div'); el.className = 'gt-nd'; el.setAttribute('role', 'region'); el.setAttribute('aria-label', 'Skúšobná doba');
    el.innerHTML = `<i aria-hidden="true">⏳</i><div class="b"><b>Skúšobná doba Plus končí</b><p>Prvá platba bude ${d}. Ak nechceš pokračovať, predplatné zrušíš v Profile jedným ťuknutím.</p><button type="button" class="go">Spravovať predplatné</button></div><button type="button" class="x" aria-label="Zavrieť">×</button>`;
    document.body.appendChild(el); cur = el; requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on')));
    tk('trialnote_show');
    el.querySelector('.go').onclick = () => { hide(el); try { window.fwPaywall && window.fwPaywall({ feature: 'trialnote' }); } catch (_) { } };
    el.querySelector('.x').onclick = () => hide(el);
  } catch (_) { }
}
addEventListener('fw-ent', () => setTimeout(trialNote, 4000));
setTimeout(trialNote, 8000);

try { window.fwNudge = show; } catch (_) { }
