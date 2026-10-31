// Meranie appky: udalosti (otvorenie, obrazovky, zápis jedla s počtom ťuknutí a časom, opravy AI) idú do tabuľky app_events.
// Žiadny text jedla, žiadne osobné údaje, len typ udalosti a čísla. Udalosti sa zbierajú v telefóne a odosielajú po dávkach;
// keď sieť alebo tabuľka nejde, ostanú v rade (max 300) a odošlú sa neskôr.
// v300 (lievik): zariadenie má náhodné anonymné ID (fw_did). Kroky kvízu (fn_…) sa odosielajú aj pred registráciou, bez mena,
// e-mailu či odpovedí, aby bolo vidno, na ktorom kroku ľudia odchádzajú. Ostatné udalosti čakajú, kým sa človek prihlási.
import * as db from './data.js';

const Q = 'fw_evq', MAX = 300;
const sid = (() => { try { let s = sessionStorage.getItem('fw_sid'); if (!s) { s = Math.random().toString(36).slice(2, 10); sessionStorage.setItem('fw_sid', s); } return s; } catch (_) { return 'x'; } })();
const jget = () => { try { return JSON.parse(localStorage.getItem(Q)) || []; } catch (_) { return []; } };
const jset = v => { try { localStorage.setItem(Q, JSON.stringify(v.slice(-MAX))); } catch (_) { } };

const newDevice = (() => { try { return !localStorage.getItem('fw_did'); } catch (_) { return false; } })();
const did = (() => {
  try {
    let d = localStorage.getItem('fw_did');
    if (!/^[a-z0-9]{10,24}$/.test(d || '')) { d = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join(''); localStorage.setItem('fw_did', d); }
    return d;
  } catch (_) { return null; }
})();
const anonOk = e => /^fn_[a-z_]{2,30}$/.test(e.name) || e.name === 'google_signin';

let uid = '';
export function track(name, props = {}) {
  try {
    const q = jget(); q.push({ name: String(name).slice(0, 40), props, client_ts: new Date().toISOString(), sid, did });
    jset(q); schedule(/^fn_|^google|^js_err/.test(name) ? 2500 : 8000); // kvíz: ľudia odchádzajú rýchlo, preto sa odosiela skôr
  } catch (_) { }
}
try { window.fwTrack = track; } catch (_) { }
// udalosti, ktoré poslal kvíz ešte pred načítaním tohto modulu
try { (window.__fwEvq || []).forEach(([n, p]) => track(n, p)); window.__fwEvq = null; } catch (_) { }

let tmr = 0, busy = false, dead = false, anonDead = false, anonErrDead = false;
// pád ešte pred prihlásením (kvíz, registrácia): pošle sa samostatne, aby prípadné odmietnutie servera nezastavilo meranie kvízu
async function anonErrs(q) {
  const errs = q.filter(e => e.name === 'js_err').slice(0, 8);
  if (!errs.length) return;
  try {
    const { error } = await db.sb.from('app_events').insert(errs.map(e => ({ name: e.name, props: { ...e.props, st: String(e.props?.st || '').slice(0, 120) }, client_ts: e.client_ts, sid: e.sid, did: e.did || did, user_id: null })));
    if (error) anonErrDead = true; else jset(jget().filter(e => !errs.some(b => b.client_ts === e.client_ts && b.name === e.name && b.sid === e.sid)));
  } catch (_) { anonErrDead = true; }
}
function schedule(ms = 8000) { if (!tmr) tmr = setTimeout(() => { tmr = 0; flush(); }, ms); }
async function flush() {
  if (busy || dead || navigator.onLine === false) return;
  const q = jget(); if (!q.length) return;
  try { await db.ready; const { data } = await db.sb.auth.getSession(); uid = data?.session?.user?.id || ''; } catch (_) { return; }
  // bez prihlásenia sa posielajú len anonymné udalosti kvízu; zvyšok počká v rade na prihlásenie
  const batch = (uid ? q : anonDead ? [] : q.filter(anonOk)).slice(0, 100);
  busy = true;
  if (!uid && !anonErrDead) await anonErrs(q);
  if (!batch.length) { busy = false; return; }
  try {
    const rows = batch.map(e => uid ? { ...e, did: e.did || did, user_id: uid } : { name: e.name, props: e.props, client_ts: e.client_ts, sid: e.sid, did: e.did || did, user_id: null });
    const { error } = await db.sb.from('app_events').insert(rows);
    if (!error) jset(jget().filter(e => !batch.some(b => b.client_ts === e.client_ts && b.name === e.name && b.sid === e.sid)));
    else if (!uid) anonDead = true; // anonymné meranie na serveri ešte nie je zapnuté: v tejto relácii to už neskúšaj
    else if (/column .*did|did.* does not exist|PGRST204/i.test(error.message + ' ' + error.code)) { // databáza ešte nemá stĺpec did: pošli po starom
      if (uid) { const { error: e2 } = await db.sb.from('app_events').insert(batch.map(({ did: _d, ...e }) => ({ ...e, user_id: uid }))); if (!e2) jset(jget().slice(batch.length)); }
    }
    else if (/does not exist|schema cache|42P01|PGRST205/i.test(error.message + ' ' + error.code)) dead = true; // tabuľka ešte nie je: skúsi sa pri ďalšom otvorení
  } catch (_) { } finally { busy = false; }
  const left = jget(); if (left.length && (uid || (!anonDead && left.some(anonOk)) || (!anonErrDead && left.some(e => e.name === 'js_err')))) schedule(60000);
}
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
addEventListener('online', () => schedule(2000));

// prvé otvorenie na novom zariadení (nie u človeka, ktorý už appku má): odkiaľ prišiel. Len doména odkazu a utm značky z odkazu, nič osobné.
try {
  const known = Object.keys(localStorage).some(k => k.startsWith('fw_prof_') || /^sb-.*-auth-token$/.test(k));
  if (newDevice && !known && !window.__fwDemo) {
    const u = new URLSearchParams(location.search), clean = v => String(v || '').toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 40);
    let ref = ''; try { const r = new URL(document.referrer); if (r.host !== location.host) ref = clean(r.hostname.replace(/^(www|m|l|lm)\./, '')); } catch (_) { }
    track('fn_land', { ref, utm: clean(u.get('utm_source') || u.get('ref')), med: clean(u.get('utm_medium')), cmp: clean(u.get('utm_campaign')), standalone: matchMedia('(display-mode: standalone)').matches, lang: (navigator.language || '').slice(0, 5) });
  }
} catch (_) { }

// otvorenie appky (raz za reláciu) a zobrazené obrazovky
track('open', { standalone: matchMedia('(display-mode: standalone)').matches, lang: document.documentElement.lang || '' });
let lastScreen = '';
function screen() {
  const s = (location.hash || '#/').split('?')[0].replace(/^#\/?/, '') || 'dnes';
  if (s === lastScreen) return; lastScreen = s; track('screen', { s: s.slice(0, 30) });
}
addEventListener('hashchange', screen); setTimeout(screen, 1500);

// ťuknutia na zápis jedla: počítajú sa od prvého ťuknutia po poslednom zápise (alebo po 3 min nečinnosti) až po uloženie jedla
let taps = 0, t0 = 0, lastTap = 0;
document.addEventListener('pointerdown', () => {
  const now = Date.now();
  if (!t0 || now - lastTap > 180000) { taps = 0; t0 = now; }
  taps++; lastTap = now;
}, true);
export function foodLogged(src, n = 1) {
  track('food_add', { src: String(src || 'manual').slice(0, 16), n, taps: taps || 0, ms: t0 ? Date.now() - t0 : 0 });
  taps = 0; t0 = 0;
  try { dispatchEvent(new CustomEvent('fw-logged', { detail: { src, n } })); } catch (_) { }
}
// data.js hlási každý uložený riadok; viac položiek uložených naraz (AI tanier) sa zráta ako jeden zápis
let agg = null;
let hint = null;
export function srcHint(src) { hint = { src, until: Date.now() + 20000 }; }
try { window.fwSrcHint = srcHint; } catch (_) { }
export function noteAdd(src) {
  if (hint && hint.until > Date.now()) src = hint.src;
  if (!agg) { agg = { src, n: 0, t: 0 }; hint = null; }
  agg.n++; clearTimeout(agg.t);
  agg.t = setTimeout(() => { const a = agg; agg = null; foodLogged(a.src, a.n); }, 1500);
}
try { window.fwNoteAdd = noteAdd; } catch (_) { }

// v303 (hlásenie chýb): keď v appke niečo spadne, zapíše sa krátky záznam js_err (správa chyby, súbor, riadok, začiatok výpisu,
// obrazovka a verzia). Žiadne údaje z formulárov ani texty jedál. V Admine sa chyby zoskupia, takže je vidno, čo padá a koľkým ľuďom.
// Rovnaká chyba sa v jednej relácii pošle len raz a najviac 8 rôznych chýb za reláciu. Šum prehliadača a rozšírení sa ignoruje.
const ver = (() => { try { const s = [...document.scripts].map(x => x.src).find(x => /gt\.js\?v=/.test(x)); return s ? s.split('v=')[1].slice(0, 10) : 'src'; } catch (_) { return ''; } })();
const errSeen = new Set();
const NOISE = /ResizeObserver loop|^Script error\.?$|chrome-extension:|moz-extension:|safari-(web-)?extension:|webkit-masked-url|Non-Error promise rejection|AbortError|The operation was aborted|Load failed$|Failed to fetch$|NetworkError when attempting|cancelled$|zrušen/i;
function reportErr(kind, msg, file, line, col, stack) {
  try {
    msg = String(msg || '').replace(/\s+/g, ' ').trim().replace(/^Uncaught /, '').slice(0, 160);
    if (!msg || NOISE.test(msg) || NOISE.test(String(file || '')) || NOISE.test(String(stack || ''))) return;
    const key = msg + '|' + line;
    if (errSeen.has(key) || errSeen.size >= 8) return; errSeen.add(key);
    const f = String(file || '').split('/').pop().split('?')[0].slice(0, 40);
    const st = String(stack || '').split('\n').map(s => s.trim()).filter(s => s && !s.includes(msg.slice(0, 30))).slice(0, 3)
      .map(s => s.replace(/https?:\/\/[^/\s)]+\//g, '').replace(/\?v=[\w]+/g, '')).join(' | ').slice(0, 220);
    track('js_err', { k: kind, m: msg, f, l: line || 0, c: col || 0, st, s: (location.hash || '#/').split('?')[0].slice(0, 30), v: ver, sa: matchMedia('(display-mode: standalone)').matches });
  } catch (_) { }
}
addEventListener('error', e => {
  if (e.target && e.target !== window) return; // nenačítaný obrázok a pod. nie je chyba appky
  reportErr('err', e.message || e.error?.message, e.filename, e.lineno, e.colno, e.error?.stack);
});
addEventListener('unhandledrejection', e => {
  const r = e.reason;
  if (r && typeof r === 'object' && (r.code || r.status) && !r.stack) return; // odpoveď servera (Supabase), nie pád kódu
  reportErr('rej', r?.message || (typeof r === 'string' ? r : ''), '', 0, 0, r?.stack);
});
try { window.fwErr = (m, extra) => reportErr('app', m, '', 0, 0, extra || ''); } catch (_) { }
