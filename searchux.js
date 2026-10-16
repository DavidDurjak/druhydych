// Hľadanie jedla bez blikania (ako v top appkách): počas písania ostávajú staré výsledky na mieste, jemne sa stlmia
// a vymenia sa za nové, až keď prídu. Koliesko sa ukáže len pri prvom hľadaní. Rovnaké hľadanie sa zopakuje hneď z pamäte.
import * as db from './data.js';
import './trainfx.js';
import './foodsugg.js';
import './net.js';
import './labelscan.js';
import './todaydeck.js';

const SP = '<div class="spinner"></div>';
const st = document.createElement('style');
st.textContent = '#results.stale{opacity:.5;transition:opacity .18s ease .14s}#results{transition:opacity .12s ease}';
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
      return r;
    });
  };
}).catch(() => { });
