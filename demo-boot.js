// Ukážka pre prezentáciu (#demo). Musí bežať ako úplne prvý skript, ešte pred čímkoľvek, čo číta pamäť telefónu.
// V ukážke appka dostane vlastnú, oddelenú pamäť (sessionStorage s predponou), takže skutočný účet v telefóne sa nedotkne.
// Pri ukončení sa pamäť ukážky zmaže a appka sa vráti do normálneho stavu.
(function () {
  var FLAG = 'fw_demo', PFX = 'fwd:';
  var ss; try { ss = window.sessionStorage; } catch (e) { return; }
  try {
    if (location.hash.split('?')[0] === '#demo') { ss.setItem(FLAG, '1'); history.replaceState(null, '', location.pathname + location.search + '#/'); }
  } catch (e) { }
  if (!ss || ss.getItem(FLAG) !== '1') {
    // odkaz #demo otvorený v už bežiacej appke: zapne ukážku a appku načíta nanovo
    window.addEventListener('hashchange', function () { if (location.hash.split('?')[0] === '#demo') { try { ss.setItem(FLAG, '1'); } catch (e) { return; } location.replace(location.pathname + location.search + '#/'); location.reload(); } });
    return;
  }

  var real = window.localStorage;
  var store = {
    getItem: function (k) { return ss.getItem(PFX + k); },
    setItem: function (k, v) { ss.setItem(PFX + k, String(v)); },
    removeItem: function (k) { ss.removeItem(PFX + k); },
    clear: function () { keys().forEach(function (k) { ss.removeItem(PFX + k); }); },
    key: function (i) { return keys()[i] || null; },
  };
  function keys() { var out = []; for (var i = 0; i < ss.length; i++) { var k = ss.key(i); if (k && k.indexOf(PFX) === 0) out.push(k.slice(PFX.length)); } return out; }
  Object.defineProperty(store, 'length', { get: function () { return keys().length; } });
  // Object.keys(localStorage) musí vrátiť kľúče ukážky (appka tak zisťuje napr., či už niekto bol prihlásený)
  var proxy = new Proxy(store, {
    ownKeys: function () { return keys().concat(['length']).filter(function (k) { return k !== 'length'; }); },
    getOwnPropertyDescriptor: function (t, k) { var v = ss.getItem(PFX + k); return v === null ? undefined : { value: v, enumerable: true, configurable: true, writable: true }; },
    get: function (t, k) { if (k in t) return typeof t[k] === 'function' ? t[k].bind(t) : t[k]; var v = typeof k === 'string' ? ss.getItem(PFX + k) : null; return v === null ? undefined : v; },
    set: function (t, k, v) { ss.setItem(PFX + k, String(v)); return true; },
    deleteProperty: function (t, k) { ss.removeItem(PFX + k); return true; },
  });
  // vzhľad a jazyk si ukážka požičia zo skutočnej pamäte (len prečíta, nič tam nezapíše)
  try {
    if (!ss.getItem(PFX + '__init')) {
      ['fw_theme', 'fw_skin', 'fw_lang', 'fw_units'].forEach(function (k) { var v = real && real.getItem(k); if (v !== null && v !== undefined) ss.setItem(PFX + k, v); });
      ss.setItem(PFX + 'fw_prof_00000000-0000-4000-8000-000000000001', '{}');
      ss.setItem(PFX + 'fw_ms', '999');
      ss.setItem(PFX + '__init', '1');
    }
  } catch (e) { }
  try { Object.defineProperty(window, 'localStorage', { configurable: true, get: function () { return proxy; } }); }
  catch (e) { ss.removeItem(FLAG); return; } // prehliadač nedovolí oddeliť pamäť: ukážka sa radšej nespustí

  window.__fwDemo = true;
  window.__fwDemoExit = function () {
    try { keys().forEach(function (k) { ss.removeItem(PFX + k); }); ss.removeItem(FLAG); } catch (e) { }
    location.replace(location.pathname + location.search + '#/');
    setTimeout(function () { location.reload(); }, 30);
  };
  document.documentElement.classList.add('fw-demo');
  var css = document.createElement('style');
  css.textContent = '.fw-demo-b{position:fixed;z-index:9999;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top) + 6px);display:flex;align-items:center;gap:8px;padding:5px 6px 5px 12px;border-radius:99px;background:rgba(10,14,18,.82);color:#fff;font:700 12px/1 system-ui,-apple-system,sans-serif;box-shadow:0 6px 18px -8px rgba(0,0,0,.6);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}.fw-demo-b i{width:7px;height:7px;border-radius:50%;background:#7CFFB2;box-shadow:0 0 8px #7CFFB2}.fw-demo-b button{all:unset;cursor:pointer;padding:5px 10px;border-radius:99px;background:rgba(255,255,255,.14);font-weight:700}';
  document.head.appendChild(css);
  var add = function () {
    if (document.querySelector('.fw-demo-b')) return;
    var b = document.createElement('div'); b.className = 'fw-demo-b';
    b.innerHTML = '<i></i><span>Ukážka</span><button type="button">Ukončiť</button>';
    b.querySelector('button').onclick = window.__fwDemoExit;
    document.body.appendChild(b);
  };
  if (document.body) add(); else document.addEventListener('DOMContentLoaded', add);
})();
