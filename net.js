// Bez internetu: ako top appky (Instagram, Spotify, Messenger). Žiadna blokujúca obrazovka, appka ostáva použiteľná.
// Hore sa ukáže nenápadný pásik „Bez internetu“, ktorý zmizne sám. Po návrate siete krátko „Si späť online“ a obrazovka sa obnoví.
// Technické chyby (Failed to fetch, Load failed) sa prepíšu na ľudskú vetu. navigator.onLine na iPhone klame (Wi-Fi bez internetu),
// preto sa stav overuje aj skutočnými požiadavkami na server.
const PING = 'https://uxzwqyjbzkcveoxsdqdv.supabase.co/auth/v1/health';
const NET_ERR = /failed to fetch|load failed|networkerror|network request failed|network connection was lost|internet connection appears to be offline|fetch failed|err_internet_disconnected/i;
const MSG = 'Bez internetu. Skús to znova, keď sa pripojíš.';

let off = false, probeT = 0, hideT = 0, failedWhileOff = false;
const doc = document.documentElement;

const st = document.createElement('style');
st.textContent = `
.fw-net{position:fixed;left:16px;right:16px;margin:0 auto;width:max-content;top:calc(env(safe-area-inset-top) + 8px);z-index:620;display:flex;align-items:center;gap:9px;max-width:calc(100% - 32px);box-sizing:border-box;padding:9px 14px 9px 11px;border-radius:99px;
background:var(--text);color:var(--bg);font-family:inherit;font-weight:600;font-size:13.5px;line-height:1.25;box-shadow:0 10px 28px -10px rgba(0,0,0,.55);transform:translateY(-140%);opacity:0;transition:transform .38s cubic-bezier(.2,.9,.25,1.15),opacity .25s;pointer-events:none}
.fw-net.show{transform:none;opacity:1;pointer-events:auto}
.fw-net div{white-space:nowrap}.fw-net svg{flex:none;width:18px;height:18px}
.fw-net small{display:block;font-weight:500;font-size:11.5px;opacity:.72}
.fw-net button{flex:none;margin-left:4px;border:0;border-radius:99px;padding:5px 10px;font-family:inherit;font-weight:700;font-size:12px;line-height:1;color:var(--bg);background:rgba(127,127,127,.28);cursor:pointer}
.fw-net.ok{background:var(--accent);color:var(--accent-ink)}
.fw-net.ok small{display:none}
html.fw-off .toast{top:calc(env(safe-area-inset-top) + 66px);white-space:nowrap}
.fw-offbox{margin:28px auto;max-width:300px;text-align:center;padding:22px 18px;border-radius:20px;background:var(--card);border:1px solid var(--line)}
.fw-offbox svg{width:34px;height:34px;color:var(--muted)}
.fw-offbox b{display:block;margin:10px 0 4px;font-size:16px}
.fw-offbox p{margin:0 0 14px;font-size:13px;line-height:1.45;color:var(--muted)}
@media (prefers-reduced-motion:reduce){.fw-net{transition:opacity .2s}}
`;
document.head.appendChild(st);

const ICON_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 8.8a15 15 0 0 1 4.2-2.6M9.5 5.2A15 15 0 0 1 22 8.8M5 12.5a10 10 0 0 1 3.4-2.1M13.6 10.1A10 10 0 0 1 19 12.5M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r=".6" fill="currentColor"/><path d="M3 3l18 18"/></svg>';
const ICON_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 8.8a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r=".6" fill="currentColor"/></svg>';

const pill = document.createElement('div');
pill.className = 'fw-net'; pill.setAttribute('role', 'status'); pill.setAttribute('aria-live', 'polite');
const mount = () => { if (!pill.isConnected) document.body.appendChild(pill); };

function showOff() {
  mount(); clearTimeout(hideT);
  pill.className = 'fw-net';
  pill.innerHTML = `${ICON_OFF}<div>Bez internetu<small>Vidíš posledné uložené údaje</small></div><button type="button">Skúsiť</button>`;
  pill.querySelector('button').onclick = () => { pill.querySelector('button').textContent = '…'; probe(true); };
  requestAnimationFrame(() => pill.classList.add('show'));
}
function showOk() {
  mount(); clearTimeout(hideT);
  pill.className = 'fw-net ok show';
  pill.innerHTML = `${ICON_OK}<div>Si späť online</div>`;
  hideT = setTimeout(() => pill.classList.remove('show'), 2200);
}

function setOff(v) {
  if (v === off) return;
  off = v;
  doc.classList.toggle('fw-off', v);
  if (v) { failedWhileOff = false; showOff(); schedule(); fillEmpty(); document.querySelectorAll('.toast').forEach(t => { if (isNetToast(t)) t.remove(); }); }
  else { clearTimeout(probeT); showOk(); refresh(); }
}

// overenie skutočného spojenia (no-cors: akákoľvek odpoveď servera = internet funguje)
async function probe(manual) {
  clearTimeout(probeT);
  try {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 6000);
    await nativeFetch(PING + '?t=' + Date.now(), { mode: 'no-cors', cache: 'no-store', signal: c.signal });
    clearTimeout(t); setOff(false);
  } catch (_) {
    if (!off) setOff(true);
    else { if (manual) { const b = pill.querySelector('button'); if (b) b.textContent = 'Skúsiť'; } schedule(); }
  }
}
function schedule() { clearTimeout(probeT); if (off) probeT = setTimeout(() => probe(false), document.hidden ? 20000 : 6000); }

// každá požiadavka appky slúži ako senzor: zlyhanie siete = bez internetu, akákoľvek odpoveď = online
const nativeFetch = window.fetch.bind(window);
window.fetch = function (input, init) {
  const p = nativeFetch(input, init);
  p.then(() => { if (off) setOff(false); }, err => {
    if (err?.name === 'AbortError') return;
    if (NET_ERR.test(String(err?.message || err)) || err instanceof TypeError) { if (off) failedWhileOff = true; else probe(false); }
  });
  return p;
};

addEventListener('offline', () => setOff(true));
addEventListener('online', () => probe(false));
document.addEventListener('visibilitychange', () => { if (!document.hidden && off) probe(false); });
if (navigator.onLine === false) setOff(true);

// po návrate siete obnoviť aktuálnu obrazovku, ale nikdy nie počas písania alebo v otvorenom okne (stratil by rozpísané)
function refresh() {
  const busy = document.querySelector('.sheet-bg') || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
  const broken = document.querySelector('#app .fw-offbox, #app .spinner');
  if (busy && !broken) return;
  if (!busy || broken) setTimeout(() => dispatchEvent(new HashChangeEvent('hashchange')), 150);
}

// obrazovka, ktorá sa bez siete nenačítala (ostalo len koliesko), dostane zrozumiteľný stav namiesto nekonečného točenia
function fillEmpty() {
  if (!off) return;
  document.querySelectorAll('#app .spinner').forEach(sp => {
    if (sp.closest('.fw-offbox')) return;
    const box = document.createElement('div');
    box.className = 'fw-offbox';
    box.innerHTML = `${ICON_OFF}<b>Táto časť potrebuje internet</b><p>Pripoj sa na Wi-Fi alebo mobilné dáta. Obrazovka sa načíta sama, hneď ako sa spojenie vráti.</p><button class="btn sm primary" type="button">Skúsiť znova</button>`;
    box.querySelector('button').onclick = () => probe(true);
    sp.replaceWith(box);
  });
}

// technické hlásenia v toastoch prepísať na ľudskú vetu. Kým svieti pásik, stačí krátke „neuložilo sa“ pod ním,
// aby človek vedel, že jeho ťuknutie neprešlo (nikdy nesmie mať pocit, že sa zápis uložil).
const isNetToast = t => NET_ERR.test(t.textContent || '') || /Nepodarilo sa pripojiť|Bez internetu\./.test(t.textContent || '');
function fixToasts() {
  document.querySelectorAll('.toast').forEach(t => {
    if (!isNetToast(t)) return;
    if (off) { if (t.dataset.fwn !== '2') { t.dataset.fwn = '2'; t.textContent = 'Neuložilo sa, si bez internetu.'; } return; }
    if (!t.dataset.fwn) { t.dataset.fwn = '1'; if (NET_ERR.test(t.textContent || '')) t.textContent = MSG; probe(false); }
  });
}
let spT = 0;
new MutationObserver(muts => {
  for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1) { if (n.classList?.contains('toast')) fixToasts(); }
  if (off) { clearTimeout(spT); spT = setTimeout(fillEmpty, 1200); }
}).observe(document.body, { childList: true, subtree: true });
