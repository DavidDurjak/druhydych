// Hľadanie jedla bez blikania (ako v top appkách): počas písania ostávajú staré výsledky na mieste, jemne sa stlmia
// a vymenia sa za nové, až keď prídu. Koliesko sa ukáže len pri prvom hľadaní. Rovnaké hľadanie sa zopakuje hneď z pamäte.
import * as db from './data.js';
import { ctx } from './app.js';
import './trainfx.js';
import './foodsugg.js';
import './net.js';
import './labelscan.js';
import './todaydeck.js';
import './navfx.js';
import './trainflow.js';
import './authretry.js';
import './authhero.js';
import './onboard.js';
import './activity.js';
import './overload.js';
import './adherence.js';
import './kcalinfo.js';
import './extra.js';
import './pokrok2.js'; import './kouc2.js';
import './polish.js';
import './ailang.js';
import './vpro.js';
import './jedlo2.js';
import './offline.js';

const SP = '<div class="spinner"></div>';
const st = document.createElement('style');
// počas hľadania: staré výsledky sa stlmia a hore beží pruh, aby bolo jasné, že sa hľadá
st.textContent = '#results.stale{opacity:.55;transition:opacity .18s ease .14s;position:relative}#results{transition:opacity .12s ease}'
  + '#results.stale::before{content:"";position:sticky;top:0;display:block;height:3px;margin:0 0 8px;border-radius:3px;z-index:2;'
  + 'background:linear-gradient(90deg,transparent,var(--accent,#7CFFB2),transparent);background-size:40% 100%;background-repeat:no-repeat;animation:fwSearchBar 1s linear infinite}'
  + '@keyframes fwSearchBar{from{background-position:-40% 0}to{background-position:140% 0}}'
  + '@media (prefers-reduced-motion:reduce){#results.stale::before{animation:none;background-size:100% 100%}}';
document.head.appendChild(st);

const proto = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
function patch(el) {
  if (el.__ux) return; el.__ux = 1;
  Object.defineProperty(el, 'innerHTML', {
    configurable: true,
    get() { return proto.get.call(this); },
    set(v) {
      const q = document.querySelector('#q');
      if (v === SP && q && q.value.trim() && this.querySelector('.res')) { this.classList.add('stale'); return; }
      this.classList.remove('stale');
      proto.set.call(this, v);
    },
  });
}
const scan = n => { if (n.nodeType !== 1) return; if (n.id === 'results') patch(n); n.querySelectorAll?.('#results').forEach(patch); };
new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(scan))).observe(document.documentElement, { childList: true, subtree: true });
document.querySelectorAll('#results').forEach(patch);

// keď databáza nestihne odpovedať, človek sa to dozvie (najviac raz za 20 s), namiesto ticho prázdneho výsledku
let failAt = 0;
function failNote() {
  if (Date.now() - failAt < 20000) return; failAt = Date.now();
  try { ctx.toast('Hľadanie trvá dlhšie, skús to znova.', true); } catch (_) { /* bez hlásenia */ }
}

// pamäť pre rovnaké hľadanie (backspace, vrátenie sa k predošlému slovu)
db.ready.then(() => {
  const sb = db.sb;
  if (!sb || sb.__uxc) return; sb.__uxc = true;
  const orig = sb.rpc.bind(sb), cache = new Map();
  sb.rpc = (name, args, ...rest) => {
    if (name !== 'search_foods_v2' || !args?.q) return orig(name, args, ...rest);
    const k = args.q.trim().toLowerCase() + '|' + (args.lim || 30), hit = cache.get(k);
    if (hit && Date.now() - hit.t < 45000) return Promise.resolve(hit.r);
    return Promise.resolve(orig(name, args, ...rest)).then(r => {
      if (!r?.error) { cache.set(k, { t: Date.now(), r }); if (cache.size > 80) cache.delete(cache.keys().next().value); }
      else if (!/failed to fetch|load failed|network/i.test(r.error.message || '')) failNote();
      return r;
    });
  };
}).catch(() => { });
