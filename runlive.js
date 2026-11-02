// Beh: živé sledovanie (celá obrazovka). GPS s filtrom chýb, automatická pauza, medzičasy, hlasový tréner, intervaly, režim do vrecka.
// Appka beží v prehliadači: keď sa zamkne displej, mobil GPS nesníma. Preto displej počas behu nezhasne (Wake Lock)
// a režim do vrecka dá čiernu obrazovku so zamknutými dotykmi (šetrí batériu). Rozbehnutý beh sa každých 5 s uloží do zariadenia,
// takže po zatvorení appky sa dá pokračovať.
import { ctx } from './app.js';
import * as db from './data.js';
import * as RL from './runlib.js';
import { mapIn, leaflet } from './runmap.js';
import { tr, currentLang } from './i18n.js';

const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const toast = (...a) => ctx.toast(...a);
const KEY = 'gt_run_live';
let S = null, ui = null, timers = [], watchId = null, wake = null, audio = null, liveMap = null, liveLine = null, liveDot = null;

// ---------- hlas a zvuky ----------
let voiceOn = (() => { try { return localStorage.getItem('gt_run_voice') !== '0'; } catch (_) { return true; } })();
let skVoice = null;
// hlas v jazyku appky: slovenčina priamo, ostatné jazyky cez slovník prekladov (ak preklad ešte nie je, zaznie len pípnutie)
const LNG = () => { try { return currentLang() || 'sk'; } catch (_) { return 'sk'; } };
function pickVoice() {
  try {
    const vs = speechSynthesis.getVoices(), l = LNG().split('-')[0];
    skVoice = l === 'sk' ? (vs.find(v => /^sk/i.test(v.lang)) || vs.find(v => /^cs/i.test(v.lang)) || null) : (vs.find(v => v.lang.toLowerCase().startsWith(l)) || null);
  } catch (_) { }
}
try { speechSynthesis.onvoiceschanged = pickVoice; pickVoice(); } catch (_) { }
function say(t) {
  if (!voiceOn || !window.speechSynthesis) return;
  const l = LNG();
  if (l !== 'sk') { const x = tr(t); if (!x) return; t = x; }
  try { const u = new SpeechSynthesisUtterance(t); u.lang = skVoice?.lang || (l === 'sk' ? 'sk-SK' : l); if (skVoice) u.voice = skVoice; u.rate = 1.02; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (_) { }
}
// pred behom si vyžiadame preklady hlášok, aby boli počas behu pripravené
function warmVoice() {
  if (LNG() === 'sk') return;
  ['Beh začal. Veľa šťastia.', 'Prechádzka začala', 'Pauza', 'Pokračujeme', 'Hlas zapnutý', 'Hotovo! Dnešný tréning je za tebou. Si super.', 'Intervaly sú hotové. Pokračuj voľne alebo ukonči.',
    `${sayKm(1)}. Čas ${sayMin(330)}. Tento kilometer za ${sayMin(330)}.`, `${sayKm(2)}. Čas ${sayMin(660)}. Tento kilometer za ${sayMin(330)}.`, `${sayKm(5)}. Čas ${sayMin(1650)}. Tento kilometer za ${sayMin(330)}.`,
    ...Object.values(RL.STEP_L).flatMap(x => [`${x}, ${sayMin(60)}.`, `${x}, ${sayMin(90)}.`, `${x}, 400 metrov.`])].forEach(x => { try { tr(x); } catch (_) { } });
}
function beep(f = 880, d = 0.12) {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator(), g = audio.createGain(); o.frequency.value = f; o.connect(g); g.connect(audio.destination);
    g.gain.setValueAtTime(0.0001, audio.currentTime); g.gain.exponentialRampToValueAtTime(0.25, audio.currentTime + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + d);
    o.start(); o.stop(audio.currentTime + d + 0.02);
  } catch (_) { }
}
const buzz = p => { try { navigator.vibrate?.(p); } catch (_) { } };
const sayMin = s => { s = Math.round(s); const m = Math.floor(s / 60), x = s % 60; const mw = m === 1 ? 'minúta' : m >= 2 && m <= 4 ? 'minúty' : 'minút'; const xw = x === 1 ? 'sekunda' : x >= 2 && x <= 4 ? 'sekundy' : 'sekúnd'; return `${m ? `${m} ${mw}` : ''}${m && x ? ' ' : ''}${x ? `${x} ${xw}` : ''}` || '0 sekúnd'; };
const sayKm = n => n === 1 ? '1 kilometer' : n >= 2 && n <= 4 ? `${n} kilometre` : `${n} kilometrov`;

// ---------- čas ----------
const now = () => Date.now();
function moving() { if (!S?.startedAt) return 0; const p = S.pauseAcc + (S.pausedAt ? now() - S.pausedAt : 0); return Math.max(0, (now() - S.startedAt - p) / 1000); }

// ---------- štýl ----------
const CSS = `
.rl{position:fixed;inset:0;z-index:99990;display:flex;flex-direction:column;background:#07090D;color:#F4F6FA;font-family:inherit;overflow:hidden;
  padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom);-webkit-user-select:none;user-select:none}
.rl *{box-sizing:border-box}
.rl svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.rl-top{display:flex;align-items:center;gap:10px;padding:10px 14px}
.rl-top b{flex:1;min-width:0;font-size:15px;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rl-gps{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;padding:5px 9px;border-radius:99px;background:rgba(255,255,255,.08);color:#C9D1DC}
.rl-gps i{width:8px;height:8px;border-radius:50%;background:#FF4D5E}
.rl-gps.ok i{background:#2BD67B}.rl-gps.mid i{background:#FFB03B}
.rl-ib{flex:none;display:flex;gap:8px}
.rl-ic{width:40px;height:40px;border-radius:50%;border:0;display:grid;place-items:center;background:rgba(255,255,255,.09);color:#fff;cursor:pointer}
.rl-ic.off{opacity:.45}
.rl-map{position:relative;flex:none;height:34vh;min-height:190px;margin:0 12px;border-radius:24px;overflow:hidden;background:#11151C}
.rl-map .leaflet-container{width:100%;height:100%;background:#11151C}
.rl-map.hide{display:none}
.rl-body{flex:1;display:flex;flex-direction:column;justify-content:center;padding:6px 18px;min-height:0}
.rl-step{border-radius:22px;padding:12px 16px;margin:0 0 12px;background:var(--sc,#2BD67B);color:#06140C;display:flex;align-items:center;gap:12px;transition:background .3s}
.rl-step b{display:block;font-size:22px;letter-spacing:-.03em;line-height:1.05}
.rl-step small{display:block;font-size:12.5px;font-weight:700;opacity:.75;margin-top:2px}
.rl-step .rl-sc{margin-left:auto;font-size:38px;font-weight:800;letter-spacing:-.05em;font-variant-numeric:tabular-nums}
.rl-sbar{height:5px;border-radius:9px;background:rgba(255,255,255,.12);margin:-4px 0 14px;overflow:hidden}
.rl-sbar i{display:block;height:100%;background:#fff;border-radius:9px;transition:width .5s linear}
.rl-main{text-align:center}
.rl-main b{display:block;font-size:min(26vw,118px);font-weight:800;letter-spacing:-.06em;line-height:.9;font-variant-numeric:tabular-nums}
.rl-main span{display:block;font-size:13px;font-weight:700;color:#8C96A5;margin-top:12px}
.rl-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:18px}
.rl-grid div{text-align:center;padding:12px 4px;border-radius:18px;background:rgba(255,255,255,.06)}
.rl-grid b{display:block;font-size:24px;font-weight:800;letter-spacing:-.04em;font-variant-numeric:tabular-nums}
.rl-grid span{font-size:11.5px;color:#8C96A5;font-weight:600}
.rl-spd{display:flex;align-items:center;justify-content:center;gap:16px;margin-top:16px}
.rl-spd button{width:54px;height:54px;border-radius:50%;border:0;background:rgba(255,255,255,.1);color:#fff;font-size:26px;font-weight:700;cursor:pointer}
.rl-spd div{text-align:center;min-width:120px}
.rl-spd b{display:block;font-size:34px;font-weight:800;letter-spacing:-.04em;font-variant-numeric:tabular-nums}
.rl-spd span{font-size:12px;color:#8C96A5;font-weight:600}
.rl-ctl{display:flex;align-items:center;justify-content:center;gap:22px;padding:14px 18px 18px}
.rl-btn{border:0;cursor:pointer;font:inherit;font-weight:800;color:#fff;display:grid;place-items:center}
.rl-go{width:96px;height:96px;border-radius:50%;background:#2BD67B;color:#06140C;font-size:20px;box-shadow:0 14px 40px -12px #2BD67B}
.rl-pause{width:84px;height:84px;border-radius:50%;background:#FFB03B;color:#1A1205}
.rl-pause svg,.rl-go svg{width:34px;height:34px}
.rl-side{width:58px;height:58px;border-radius:50%;background:rgba(255,255,255,.1)}
.rl-stop{width:84px;height:84px;border-radius:50%;background:#FF4D5E;font-size:15px}
.rl-lap{height:62px;padding:0 24px;border-radius:20px;background:#fff;color:#07090D;font-size:17px}
.rl-msg{margin:0 18px 6px;padding:10px 14px;border-radius:16px;background:rgba(255,176,59,.14);color:#FFD08A;font-size:13px;line-height:1.4}
.rl-cd{position:absolute;inset:0;display:grid;place-items:center;background:#07090D;z-index:5;font-size:160px;font-weight:800;letter-spacing:-.06em;color:#2BD67B}
.rl-cd b{animation:rlPop .9s ease-out both}
@keyframes rlPop{from{transform:scale(1.6);opacity:0}30%{opacity:1}to{transform:scale(.9);opacity:.2}}
.rl-lock{position:absolute;inset:0;z-index:8;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#5E6673;touch-action:none}
.rl-lock b{font-size:64px;font-weight:800;letter-spacing:-.05em;color:#3A414C;font-variant-numeric:tabular-nums}
.rl-lock span{font-size:15px;font-weight:700;font-variant-numeric:tabular-nums}
.rl-hold{position:absolute;bottom:calc(40px + env(safe-area-inset-bottom));width:78px;height:78px;border-radius:50%;display:grid;place-items:center;color:#9AA4B2}
.rl-hold svg.r{position:absolute;inset:0;width:78px;height:78px;transform:rotate(-90deg)}
.rl-hold svg.r circle{fill:none;stroke-width:4}
.rl-hold small{position:absolute;bottom:-26px;white-space:nowrap;font-size:12px}
.rl-sum{flex:1;overflow:auto;padding:4px 16px 20px}
.rl-sum h2{margin:4px 2px 2px;font-size:28px;letter-spacing:-.04em}
.rl-sum p.s{margin:0 2px 12px;color:#8C96A5;font-size:13.5px}
.rl-smap{height:220px;border-radius:22px;overflow:hidden;margin:0 0 12px;background:#11151C}
.rl-in{width:100%;height:48px;border-radius:14px;border:1.5px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#fff;font:inherit;font-size:16px;padding:0 14px;margin:0 0 10px}
.rl-row{display:flex;gap:10px}
.rl-save{flex:1;height:56px;border-radius:18px;border:0;background:#2BD67B;color:#06140C;font:inherit;font-size:17px;font-weight:800;cursor:pointer}
.rl-del{height:56px;padding:0 18px;border-radius:18px;border:0;background:rgba(255,255,255,.08);color:#FF8A95;font:inherit;font-size:15px;font-weight:800;cursor:pointer}
.rl-lab{display:block;font-size:12.5px;font-weight:700;color:#8C96A5;margin:12px 2px 6px}
.rl-tm{display:flex;align-items:center;gap:8px}
.rl-tm input{flex:1}
.rl-wait{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;padding:30px;background:rgba(7,9,13,.92);z-index:4}
.rl-wait b{font-size:20px}
.rl-wait p{margin:0;color:#8C96A5;font-size:14px;line-height:1.5;max-width:300px}
.rl-ring{width:56px;height:56px;border-radius:50%;border:4px solid rgba(255,255,255,.12);border-top-color:#2BD67B;animation:rlSpin 1s linear infinite}
@keyframes rlSpin{to{transform:rotate(360deg)}}
.rl-dot{width:16px;height:16px;border-radius:50%;background:#2BD67B;border:3px solid #fff;box-shadow:0 0 0 6px rgba(43,214,123,.25)}
`;
function css() { if (document.getElementById('rlCss')) return; const s = document.createElement('style'); s.id = 'rlCss'; s.dataset.fwLight = ''; s.textContent = CSS; document.head.appendChild(s); }
const I = {
  play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14" stroke-width="3.2"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>',
  vol: '<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>',
  map: '<svg viewBox="0 0 24 24"><path d="M9 4.5l-5 2v13l5-2 6 2 5-2v-13l-5 2z"/><path d="M9 4.5v13M15 6.5v13"/></svg>',
  skip: '<svg viewBox="0 0 24 24"><path d="M5 5l9 7-9 7zM18 5v14"/></svg>',
};
const STEP_C = { warm: '#8FD3FF', run: '#2BD67B', walk: '#FFD24A', cool: '#8FD3FF', work: '#FF5A6A', rest: '#B9C2CF' };

// ---------- uloženie rozbehnutého behu ----------
function persist() { if (!S || S.done) return; try { localStorage.setItem(KEY, JSON.stringify({ ...S, savedAt: now() })); } catch (_) { } }
export function resumable() { try { const x = JSON.parse(localStorage.getItem(KEY) || 'null'); if (x && x.startedAt && now() - x.savedAt < 4 * 3600e3) return x; localStorage.removeItem(KEY); } catch (_) { } return null; }
export function dropResumable() { try { localStorage.removeItem(KEY); } catch (_) { } }
export const isLive = () => !!document.getElementById('rlBox');

// ---------- štart ----------
// opts: { kind, steps?, route?: {id, name, path}, prog?: {w, d}, speed? }
export function start(opts) {
  if (isLive()) { document.getElementById('rlBox').style.display = ''; return; }
  css();
  const k = RL.K(opts.kind);
  S = { kind: opts.kind, startedAt: 0, pauseAcc: 0, pausedAt: 0, auto: false, pts: [], alts: [], dist: 0, lastFix: null, splitsAt: 1000, splits: [], lastSplitT: 0,
    steps: opts.steps || null, stepIdx: 0, stepT0: 0, laps: [], speed: opts.speed || 10, incline: 0, gaps: 0, route: opts.route || null, prog: opts.prog || null, meta: opts.meta || {}, acc: null, lastMoveT: 0 };
  build(k); warmVoice();
  if (k.gps) gpsWarm(); else ready();
}
export function resume(x) {
  if (isLive()) return; css();
  S = { ...x }; if (!S.pausedAt) S.pausedAt = x.savedAt || now(); // pokračuje v pauze
  build(RL.K(S.kind)); ui.root.querySelector('.rl-wait')?.remove();
  if (RL.K(S.kind).gps) watchGps();
  loop(); render(); controls();
  toast('Beh je obnovený. Pokračuj, keď budeš pripravený.');
}

function build(k) {
  const box = document.createElement('div'); box.id = 'rlBox'; box.className = 'rl'; box.dataset.noskin = '';
  box.innerHTML = `
    <div class="rl-top"><span class="rl-gps" id="rlGps"><i></i><span>${k.gps ? 'GPS' : k.l}</span></span><b>${h(S.route?.name || (S.prog ? `Týždeň ${S.prog.w} · deň ${S.prog.d}` : k.l))}</b>
      <div class="rl-ib">${k.gps ? `<button class="rl-ic" id="rlMapT" aria-label="Mapa">${I.map}</button>` : ''}<button class="rl-ic${voiceOn ? '' : ' off'}" id="rlVoice" aria-label="Hlas">${I.vol}</button><button class="rl-ic" id="rlLockB" aria-label="Do vrecka">${I.lock}</button><button class="rl-ic" id="rlX" aria-label="Zavrieť">${I.x}</button></div></div>
    ${k.gps ? '<div class="rl-map" id="rlMap"></div>' : ''}
    <div id="rlMsg"></div>
    <div class="rl-body" id="rlBody"></div>
    <div class="rl-ctl" id="rlCtl"></div>
    ${k.gps ? `<div class="rl-wait"><div class="rl-ring"></div><b>Hľadám GPS signál</b><p>Najlepšie to ide vonku pod holým nebom. Počas behu nechaj appku otvorenú, displej nezhasne. Mobil daj do vrecka cez zámok hore.</p><button class="rl-btn rl-lap" id="rlSkipGps" style="margin-top:6px;height:48px;font-size:15px">Začať aj bez signálu</button></div>` : ''}`;
  document.body.appendChild(box);
  ui = { root: box, body: box.querySelector('#rlBody'), ctl: box.querySelector('#rlCtl'), msg: box.querySelector('#rlMsg'), gps: box.querySelector('#rlGps') };
  box.querySelector('#rlVoice').onclick = e => { voiceOn = !voiceOn; try { localStorage.setItem('gt_run_voice', voiceOn ? '1' : '0'); } catch (_) { } e.currentTarget.classList.toggle('off', !voiceOn); if (voiceOn) say('Hlas zapnutý'); };
  box.querySelector('#rlLockB').onclick = lock;
  box.querySelector('#rlX').onclick = () => { if (!S.startedAt) close(true); else askFinish(); };
  box.querySelector('#rlMapT')?.addEventListener('click', () => { const m = box.querySelector('#rlMap'); m.classList.toggle('hide'); if (!m.classList.contains('hide')) setTimeout(() => liveMap?.invalidateSize(), 50); });
  box.querySelector('#rlSkipGps')?.addEventListener('click', () => { box.querySelector('.rl-wait')?.remove(); ready(); });
  if (k.gps) initMap();
  render(); controls();
  document.addEventListener('visibilitychange', onVis);
}
async function initMap() {
  try {
    const el = ui.root.querySelector('#rlMap');
    liveMap = await mapIn(el, { ghost: S.route?.path || null, interactive: true });
    const L = await leaflet();
    liveLine = L.polyline([], { color: '#2BD67B', weight: 6, lineCap: 'round', lineJoin: 'round' }).addTo(liveMap);
    liveDot = L.marker([0, 0], { icon: L.divIcon({ className: '', html: '<div class="rl-dot"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }), opacity: 0 }).addTo(liveMap);
    if (S.pts.length) liveLine.setLatLngs(S.pts.map(p => [p[0], p[1]]));
  } catch (_) { ui?.root.querySelector('#rlMap')?.classList.add('hide'); }
}

// ---------- GPS ----------
let warmT = null;
function gpsWarm() {
  if (!navigator.geolocation) { ui.root.querySelector('.rl-wait')?.remove(); msg('Tento prehliadač nevie zistiť polohu. Beh sa zapíše len s časom.'); ready(); return; }
  watchGps();
  warmT = setTimeout(() => { /* po 25 s ponúkneme štart aj bez dobrého signálu */ const w = ui?.root.querySelector('.rl-wait p'); if (w) w.textContent = 'Signál je zatiaľ slabý. Môžeš počkať alebo začať, trasa sa spresní za behu.'; }, 25000);
}
function watchGps() {
  if (watchId != null) return;
  watchId = navigator.geolocation.watchPosition(onFix, err => {
    if (err.code === 1) { ui?.root.querySelector('.rl-wait')?.remove(); msg('Appka nemá povolenú polohu. Povoľ ju v nastaveniach prehliadača (Poloha), inak sa trasa nezapíše.'); if (!S.startedAt) ready(); }
  }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
}
function onFix(pos) {
  if (!S) return;
  const c = pos.coords, fix = { lat: c.latitude, lng: c.longitude, acc: c.accuracy, alt: c.altitude, t: pos.timestamp || now() };
  S.acc = c.accuracy;
  ui.gps.className = 'rl-gps' + (c.accuracy <= 15 ? ' ok' : c.accuracy <= 35 ? ' mid' : '');
  ui.gps.querySelector('span').textContent = c.accuracy <= 15 ? 'GPS silný' : c.accuracy <= 35 ? 'GPS stredný' : 'GPS slabý';
  if (liveDot) { liveDot.setLatLng([fix.lat, fix.lng]); liveDot.setOpacity(1); if (!S.pts.length) liveMap?.setView([fix.lat, fix.lng], 16); }
  const w = ui.root.querySelector('.rl-wait');
  if (w && c.accuracy <= 30) { w.remove(); clearTimeout(warmT); ready(); }
  if (!S.startedAt || (S.pausedAt && !S.auto)) { S.lastFix = null; return; }
  const prev = S.lastFix;
  if (!RL.accept(prev, fix, S.kind)) {
    // automatická pauza: dlho žiadny pohyb
    if (S.kind !== 'treadmill' && !S.pausedAt && prev && fix.t - S.lastMoveT > 12000) { S.auto = true; S.pausedAt = now(); say('Pauza'); controls(); }
    return;
  }
  if (S.auto && S.pausedAt) { S.pauseAcc += now() - S.pausedAt; S.pausedAt = 0; S.auto = false; say('Pokračujeme'); controls(); }
  const t = moving();
  if (prev && fix.t - prev.t > 20000) { S.gaps++; } // medzera (displej bol zamknutý)
  if (prev && fix.t - prev.t <= 20000) S.dist += RL.dist([prev.lat, prev.lng], [fix.lat, fix.lng]);
  S.pts.push(fix.alt != null ? [+fix.lat.toFixed(6), +fix.lng.toFixed(6), Math.round(t), Math.round(fix.alt)] : [+fix.lat.toFixed(6), +fix.lng.toFixed(6), Math.round(t)]);
  if (fix.alt != null) S.alts.push(Math.round(fix.alt * 10) / 10);
  S.lastFix = fix; S.lastMoveT = fix.t;
  liveLine?.addLatLng([fix.lat, fix.lng]); liveMap?.panTo([fix.lat, fix.lng], { animate: true });
  checkSplit(t);
}
function checkSplit(t) {
  while (S.dist >= S.splitsAt) {
    const s = Math.round(t - S.lastSplitT); S.splits.push({ km: S.splitsAt / 1000, s }); S.lastSplitT = t;
    const n = S.splitsAt / 1000; S.splitsAt += 1000;
    buzz([40, 60, 40]);
    say(`${sayKm(n)}. Čas ${sayMin(t)}. Tento kilometer za ${sayMin(s)}.`);
  }
}

// ---------- slučka ----------
function ready() {
  if (!ui) return;
  ui.ctl.innerHTML = `<button class="rl-btn rl-go" id="rlGo">${I.play}</button>`;
  ui.ctl.querySelector('#rlGo').onclick = countdown;
}
function countdown() {
  try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume?.(); } catch (_) { }
  pickVoice();
  const cd = document.createElement('div'); cd.className = 'rl-cd'; ui.root.appendChild(cd);
  let n = 3;
  const tick = () => {
    if (n === 0) { cd.remove(); go(); return; }
    cd.innerHTML = `<b>${n}</b>`; beep(n === 1 ? 990 : 660, 0.15); buzz(30); n--; setTimeout(tick, 900);
  };
  tick();
}
async function go() {
  S.startedAt = now(); S.lastMoveT = now();
  try { wake = await navigator.wakeLock?.request('screen'); } catch (_) { }
  beep(1320, 0.25); buzz([60, 40, 60]);
  if (S.steps) startStep(0); else say(S.kind === 'walk' ? 'Prechádzka začala' : 'Beh začal. Veľa šťastia.');
  loop(); controls();
}
function loop() {
  timers.forEach(clearInterval); timers = [];
  let last = now();
  timers.push(setInterval(() => {
    const n = now(), dt = (n - last) / 1000; last = n;
    if (S.startedAt && !S.pausedAt && S.kind === 'treadmill') { S.dist += S.speed / 3.6 * dt; checkSplit(moving()); }
    if (S.steps && S.startedAt && !S.pausedAt) stepTick();
    render();
  }, 500));
  timers.push(setInterval(persist, 5000));
}
function startStep(i) {
  S.stepIdx = i; S.stepT0 = moving();
  const st = S.steps[i]; if (!st) return;
  beep(st.t === 'run' || st.t === 'work' ? 1180 : 760, 0.3); buzz([80, 60, 80]);
  const len = st.m ? `${st.m} metrov` : sayMin(st.s);
  say(`${RL.STEP_L[st.t]}${st.t === 'work' ? `, ${len}` : `, ${len}`}.`);
}
function stepTick() {
  const st = S.steps[S.stepIdx]; if (!st || st.m) return;
  const el = moving() - S.stepT0, left = st.s - el;
  if (left <= 3.2 && left > 0 && Math.ceil(left) !== S._lastBeep) { S._lastBeep = Math.ceil(left); beep(620, 0.08); }
  if (left <= 0) nextStep();
}
function nextStep() {
  const st = S.steps[S.stepIdx];
  if (st) S.laps.push({ n: S.laps.length + 1, type: st.t, s: Math.round(moving() - S.stepT0), m: st.m || null });
  if (st?.m) { S.dist += st.m; checkSplit(moving()); }
  if (S.stepIdx + 1 < S.steps.length) startStep(S.stepIdx + 1);
  else {
    S.stepsDone = true; S.stepIdx = S.steps.length;
    say(S.prog ? 'Hotovo! Dnešný tréning je za tebou. Si super.' : 'Intervaly sú hotové. Pokračuj voľne alebo ukonči.');
    buzz([120, 80, 120, 80, 200]);
    if (S.prog) setTimeout(() => finish(), 1200);
  }
}

// ---------- vykreslenie ----------
function render() {
  if (!ui || !S) return;
  const t = moving(), k = RL.K(S.kind);
  const recent = (() => { const p = S.pts; if (p.length < 2) return null; let i = p.length - 1; const t1 = p[i][2]; while (i > 0 && t1 - p[i][2] < 30) i--; const d = RL.pathLen(p.slice(i)); return d > 20 ? RL.pace(t1 - p[i][2], d) : null; })();
  let stepHtml = '';
  if (S.steps && S.startedAt) {
    const st = S.steps[S.stepIdx];
    if (st) {
      const el = t - S.stepT0, nx = S.steps[S.stepIdx + 1];
      const cnt = st.m ? RL.dur(el) : RL.dur(Math.max(0, st.s - el));
      const totalDone = S.steps.slice(0, S.stepIdx).reduce((a, x) => a + (x.s || 60), 0) + Math.min(el, st.s || el);
      const total = S.steps.reduce((a, x) => a + (x.s || 60), 0);
      stepHtml = `<div class="rl-step" style="--sc:${STEP_C[st.t]}"><div><b>${RL.STEP_L[st.t]}${st.m ? ` ${st.m} m` : ''}</b><small>${S.stepIdx + 1}/${S.steps.length}${nx ? ` · potom ${RL.STEP_L[nx.t].toLowerCase()}${nx.m ? ` ${nx.m} m` : ` ${RL.dur(nx.s)}`}` : ' · posledný úsek'}</small></div><span class="rl-sc">${cnt}</span></div>
        <div class="rl-sbar"><i style="width:${Math.min(100, totalDone / total * 100).toFixed(1)}%"></i></div>`;
    } else if (S.stepsDone) stepHtml = `<div class="rl-step" style="--sc:#2BD67B"><div><b>Intervaly hotové</b><small>Pokračuj voľne alebo beh ukonči</small></div></div>`;
  }
  const main = k.gps || S.kind === 'treadmill' || S.kind === 'track' ? `<div class="rl-main"><b>${RL.km(S.dist)}</b><span>kilometrov</span></div>` : '';
  const grid = `<div class="rl-grid"><div><b>${RL.dur(t)}</b><span>čas</span></div>
      <div><b>${S.kind === 'treadmill' ? RL.pace(3600 / S.speed, 1000) : recent || RL.pace(t, S.dist)}</b><span>${S.kind === 'treadmill' ? 'tempo' : 'aktuálne tempo'}</span></div>
      <div><b>${RL.pace(t, S.dist)}</b><span>priemer /km</span></div></div>`;
  const spd = S.kind === 'treadmill' ? `<div class="rl-spd"><button data-sp="-0.5">−</button><div><b>${S.speed.toFixed(1).replace('.', ',')}</b><span>km/h na páse</span></div><button data-sp="0.5">+</button></div>` : '';
  const html = stepHtml + main + grid + spd + (S.pausedAt && S.startedAt ? `<p style="text-align:center;color:#FFB03B;font-weight:800;margin:14px 0 0">${S.auto ? 'Automatická pauza, rozbehni sa a pokračuje sa' : 'Pauza'}</p>` : '');
  if (ui.body._h !== html) {
    ui.body.innerHTML = html; ui.body._h = html;
    ui.body.querySelectorAll('[data-sp]').forEach(b => b.onclick = () => { S.speed = Math.min(25, Math.max(2, Math.round((S.speed + Number(b.dataset.sp)) * 10) / 10)); render(); });
  }
  const lk = ui.root.querySelector('.rl-lock'); if (lk) { lk.querySelector('b').textContent = RL.km(S.dist); lk.querySelector('span').textContent = `${RL.dur(t)} · ${RL.pace(t, S.dist)} /km`; }
}
function controls() {
  if (!ui || !S.startedAt) return;
  const st = S.steps?.[S.stepIdx];
  if (S.pausedAt && !S.auto) {
    ui.ctl.innerHTML = `<button class="rl-btn rl-stop" id="rlEnd">Koniec</button><button class="rl-btn rl-go" id="rlRes">${I.play}</button>`;
    ui.ctl.querySelector('#rlRes').onclick = () => { S.pauseAcc += now() - S.pausedAt; S.pausedAt = 0; S.lastFix = null; S.lastMoveT = now(); say('Pokračujeme'); buzz(40); controls(); };
    ui.ctl.querySelector('#rlEnd').onclick = askFinish;
  } else {
    ui.ctl.innerHTML = `${st && st.m ? '<button class="rl-btn rl-lap" id="rlLap">Hotovo</button>' : st ? `<button class="rl-btn rl-side" id="rlSkip" aria-label="Preskočiť úsek">${I.skip}</button>` : ''}<button class="rl-btn rl-pause" id="rlPause">${I.pause}</button>`;
    ui.ctl.querySelector('#rlPause').onclick = () => { S.pausedAt = now(); S.auto = false; say('Pauza'); buzz(40); controls(); persist(); };
    ui.ctl.querySelector('#rlLap')?.addEventListener('click', () => { nextStep(); controls(); });
    ui.ctl.querySelector('#rlSkip')?.addEventListener('click', () => { nextStep(); controls(); });
  }
}
function msg(t) { if (ui) ui.msg.innerHTML = t ? `<div class="rl-msg">${h(t)}</div>` : ''; }

// ---------- zámok do vrecka ----------
function lock() {
  if (ui.root.querySelector('.rl-lock')) return;
  const C = 2 * Math.PI * 35;
  const l = document.createElement('div'); l.className = 'rl-lock';
  l.innerHTML = `<b></b><span></span><div class="rl-hold">${I.lock}<svg class="r" viewBox="0 0 78 78"><circle cx="39" cy="39" r="35" stroke="#222831"/><circle cx="39" cy="39" r="35" stroke="#2BD67B" stroke-dasharray="0 ${C}" id="rlHoldC"/></svg><small>Podrž na odomknutie</small></div>`;
  ui.root.appendChild(l); render();
  const ring = l.querySelector('#rlHoldC'); let t0 = 0, raf = 0;
  const step = () => { const p = Math.min(1, (now() - t0) / 1200); ring.setAttribute('stroke-dasharray', `${(p * C).toFixed(1)} ${C}`); if (p >= 1) { buzz(30); l.remove(); return; } raf = requestAnimationFrame(step); };
  const hold = l.querySelector('.rl-hold');
  hold.addEventListener('pointerdown', e => { e.preventDefault(); t0 = now(); raf = requestAnimationFrame(step); });
  const cancel = () => { cancelAnimationFrame(raf); ring.setAttribute('stroke-dasharray', `0 ${C}`); };
  hold.addEventListener('pointerup', cancel); hold.addEventListener('pointerleave', cancel); hold.addEventListener('pointercancel', cancel);
  l.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
}

// ---------- prepínanie appiek / zamknutý displej ----------
let hiddenAt = 0;
async function onVis() {
  if (!S) return;
  if (document.visibilityState === 'hidden') { hiddenAt = now(); persist(); return; }
  try { if (S.startedAt && !wake) wake = await navigator.wakeLock?.request('screen'); else if (S.startedAt && wake?.released) wake = await navigator.wakeLock.request('screen'); } catch (_) { }
  if (hiddenAt && now() - hiddenAt > 15000 && RL.K(S.kind).gps && S.startedAt && !S.pausedAt) {
    S.lastFix = null; // úsek bez GPS sa nezaráta ako priama čiara
    msg('Kým bola appka zavretá alebo displej zamknutý, mobil nesnímal polohu, takže kúsok trasy chýba. Nabudúce daj mobil do vrecka cez zámok hore, displej sa sám nevypne.');
    setTimeout(() => msg(''), 12000);
  }
  hiddenAt = 0;
}

// ---------- koniec ----------
function askFinish() {
  if (!S.startedAt) return close(true);
  if (!S.pausedAt) { S.pausedAt = now(); S.auto = false; }
  controls();
  const t = moving();
  if (t < 30 && S.dist < 50) {
    const bg = ctx.sheet(`<h2 style="margin:0 0 6px">Ukončiť?</h2><p class="muted" style="margin:0 0 16px">Beh je zatiaľ veľmi krátky, neuloží sa.</p><button class="btn tr-danger" style="width:100%" id="rlQ">Zahodiť</button><button class="btn ghost" style="width:100%;margin-top:8px" id="rlB">Pokračovať</button>`);
    bg.style.zIndex = 100000;
    bg.querySelector('#rlQ').onclick = () => { bg.remove(); close(true); };
    bg.querySelector('#rlB').onclick = () => bg.remove();
    return;
  }
  finish();
}
function finish() {
  if (S.pausedAt === 0) S.pausedAt = now();
  S.done = true; persist();
  timers.forEach(clearInterval); timers = [];
  if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  const t = Math.round(moving()), k = RL.K(S.kind);
  if (S.steps && S.steps[S.stepIdx] && !S.stepsDone) S.laps.push({ n: S.laps.length + 1, type: S.steps[S.stepIdx].t, s: Math.round(t - S.stepT0), m: null, cut: true });
  const kg = Number(ctx.state.profile?.start_weight) || 72;
  const hr = new Date(S.startedAt).getHours();
  const tod = hr < 10 ? 'Ranný' : hr < 13 ? 'Dopoludňajší' : hr < 18 ? 'Popoludňajší' : 'Večerný';
  const title0 = S.prog ? `Od gauča k 5 km: týždeň ${S.prog.w}, deň ${S.prog.d}` : S.kind === 'walk' ? `${tod.replace(/ý$/, 'á').replace('Ranná', 'Ranná')} prechádzka` : S.kind === 'treadmill' ? `${tod} beh na páse` : S.kind === 'track' ? 'Intervaly na dráhe' : S.kind === 'runwalk' ? `${tod} beh s chôdzou` : `${tod} beh`;
  ui.root.querySelector('.rl-lock')?.remove();
  ui.root.querySelector('#rlMap')?.remove(); liveMap = null;
  ui.msg.innerHTML = ''; ui.ctl.innerHTML = '';
  ui.root.querySelector('.rl-ib').innerHTML = '';
  const path = RL.simplify(S.pts, 1500);
  ui.body.outerHTML = `<div class="rl-sum" id="rlSum">
    <h2>${S.prog && S.stepsDone ? 'Tréning hotový! 🎉' : 'Výborne! 💪'}</h2>${S.prog && !S.stepsDone ? '<p class="s" style="color:#FFD08A">Tréning z programu nebol dokončený, ostáva ti na nabudúce. Beh sa aj tak uloží.</p>' : ''}<p class="s">${new Date(S.startedAt).toLocaleString('sk-SK', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
    ${path.length > 1 ? '<div class="rl-smap" id="rlSMap"></div>' : ''}
    <div class="rl-grid" style="margin:0 0 6px"><div><b id="rlSD">${RL.km(S.dist)}</b><span>km</span></div><div><b>${RL.dur(t)}</b><span>čas</span></div><div><b id="rlSP">${RL.pace(t, S.dist)}</b><span>tempo /km</span></div></div>
    ${S.kind === 'treadmill' ? `<span class="rl-lab">Vzdialenosť podľa pásu (km)</span><div class="rl-tm"><input class="rl-in" id="rlDist" inputmode="decimal" value="${(S.dist / 1000).toFixed(2)}" style="margin:0"></div>` : ''}
    <span class="rl-lab">Názov</span><input class="rl-in" id="rlTitle" maxlength="80" value="${h(title0)}">
    <span class="rl-lab">Poznámka (nepovinné)</span><input class="rl-in" id="rlNote" maxlength="500" placeholder="Ako sa ti bežalo?">
    <div class="rl-row" style="margin-top:8px"><button class="rl-del" id="rlDrop">Zahodiť</button><button class="rl-save" id="rlSave">Uložiť ${S.kind === 'walk' ? 'prechádzku' : 'beh'}</button></div></div>`;
  if (path.length > 1) mapIn(ui.root.querySelector('#rlSMap'), { path, interactive: false }).catch(() => ui.root.querySelector('#rlSMap')?.remove());
  ui.root.querySelector('#rlDist')?.addEventListener('input', e => { const d = parseFloat(String(e.target.value).replace(',', '.')) * 1000; if (d > 0) { ui.root.querySelector('#rlSD').textContent = RL.km(d); ui.root.querySelector('#rlSP').textContent = RL.pace(t, d); } });
  ui.root.querySelector('#rlDrop').onclick = () => {
    const bg = ctx.sheet(`<h2 style="margin:0 0 6px">Zahodiť ${S.kind === 'walk' ? 'prechádzku' : 'beh'}?</h2><p class="muted" style="margin:0 0 16px">Neuloží sa a nepôjde vrátiť.</p><button class="btn tr-danger" style="width:100%" id="rlQ">Zahodiť</button><button class="btn ghost" style="width:100%;margin-top:8px" id="rlB">Späť</button>`);
    bg.style.zIndex = 100000;
    bg.querySelector('#rlQ').onclick = () => { bg.remove(); close(true); };
    bg.querySelector('#rlB').onclick = () => bg.remove();
  };
  ui.root.querySelector('#rlSave').onclick = async e => {
    const btn = e.currentTarget; btn.disabled = true; btn.textContent = 'Ukladám…';
    let d = S.dist;
    if (S.kind === 'treadmill') { const v = parseFloat(String(ui.root.querySelector('#rlDist').value).replace(',', '.')); if (v > 0 && v < 200) d = v * 1000; }
    const row = {
      user_id: ctx.state.profile.id, kind: S.kind, source: 'app', started_at: new Date(S.startedAt).toISOString(), duration_s: Math.max(1, t),
      elapsed_s: Math.round((now() - S.startedAt) / 1000), distance_m: Math.round(d * 10) / 10, elev_gain_m: RL.elevGain(S.alts), kcal: RL.kcal(S.kind, d, kg),
      path: path.length > 1 ? path : null, splits: path.length > 1 ? RL.splits(path) : (S.splits.length ? S.splits : null), laps: S.laps.length ? S.laps : null,
      best: path.length > 1 ? RL.bestEfforts(path) : null,
      meta: { ...S.meta, ...(S.kind === 'treadmill' ? { speed: S.speed } : {}), ...(S.steps ? { steps: S.steps.length } : {}), ...(S.prog ? { prog: `${S.prog.w}-${S.prog.d}`, prog_done: !!S.stepsDone } : {}), ...(S.gaps ? { gaps: S.gaps } : {}) },
      title: ui.root.querySelector('#rlTitle').value.trim().slice(0, 80) || title0, note: ui.root.querySelector('#rlNote').value.trim().slice(0, 500) || null,
      route_id: S.route?.id || null,
    };
    try {
      const { data, error } = await db.sb.from('runs').insert(row).select('id').single();
      if (error) throw error;
      if (S.prog && S.stepsDone) {
        const { data: pr } = await db.sb.from('run_program').select('done').eq('user_id', row.user_id).maybeSingle();
        const done = [...new Set([...(pr?.done || []), `${S.prog.w}-${S.prog.d}`])];
        await db.sb.from('run_program').upsert({ user_id: row.user_id, plan: 'c25k', done, updated_at: new Date().toISOString() });
      }
      const id = data.id; close(true);
      window.dispatchEvent(new Event('gt-run-saved'));
      location.hash = '#/beh/' + id;
    } catch (err) {
      console.error(err); btn.disabled = false; btn.textContent = 'Skúsiť znova';
      toast('Uloženie zlyhalo. Beh ostáva v zariadení, skús to o chvíľu.', true);
    }
  };
}
function close(drop) {
  timers.forEach(clearInterval); timers = [];
  if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  try { wake?.release(); } catch (_) { } wake = null;
  try { speechSynthesis.cancel(); } catch (_) { }
  document.removeEventListener('visibilitychange', onVis);
  clearTimeout(warmT);
  ui?.root.remove(); ui = null; liveMap = null; liveLine = null; liveDot = null;
  if (drop) dropResumable();
  S = null;
}
