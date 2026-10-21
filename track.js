// Meranie appky: udalosti (otvorenie, obrazovky, zápis jedla s počtom ťuknutí a časom, opravy AI) idú do tabuľky app_events.
// Žiadny text jedla, žiadne osobné údaje, len typ udalosti a čísla. Udalosti sa zbierajú v telefóne a odosielajú po dávkach;
// keď sieť alebo tabuľka nejde, ostanú v rade (max 300) a odošlú sa neskôr.
import * as db from './data.js';

const Q = 'fw_evq', MAX = 300;
const sid = (() => { try { let s = sessionStorage.getItem('fw_sid'); if (!s) { s = Math.random().toString(36).slice(2, 10); sessionStorage.setItem('fw_sid', s); } return s; } catch (_) { return 'x'; } })();
const jget = () => { try { return JSON.parse(localStorage.getItem(Q)) || []; } catch (_) { return []; } };
const jset = v => { try { localStorage.setItem(Q, JSON.stringify(v.slice(-MAX))); } catch (_) { } };

let uid = '';
export function track(name, props = {}) {
  try {
    const q = jget(); q.push({ name: String(name).slice(0, 40), props, client_ts: new Date().toISOString(), sid });
    jset(q); schedule();
  } catch (_) { }
}
try { window.fwTrack = track; } catch (_) { }

let tmr = 0, busy = false, dead = false;
function schedule(ms = 8000) { if (!tmr) tmr = setTimeout(() => { tmr = 0; flush(); }, ms); }
async function flush() {
  if (busy || dead || navigator.onLine === false) return;
  const q = jget(); if (!q.length) return;
  try { const { data } = await db.sb.auth.getSession(); uid = data?.session?.user?.id || ''; } catch (_) { return; }
  if (!uid) return;
  busy = true;
  const batch = q.slice(0, 100);
  try {
    const { error } = await db.sb.from('app_events').insert(batch.map(e => ({ ...e, user_id: uid })));
    if (!error) jset(jget().slice(batch.length));
    else if (/does not exist|schema cache|42P01|PGRST205/i.test(error.message + ' ' + error.code)) dead = true; // tabuľka ešte nie je: skúsi sa pri ďalšom otvorení
  } catch (_) { } finally { busy = false; }
  if (jget().length) schedule(60000);
}
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
addEventListener('online', () => schedule(2000));

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
