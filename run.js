// Beh (v321): bežecká časť appky. Vstup z obrazovky Tréning (karta Beh) a cez #/beh.
// Obrazovky: #/beh (rozcestník s dlaždicami), #/beh/h história, #/beh/s štatistiky, #/beh/c ciele, #/beh/t trasy (v okolí a moje), #/beh/t/<id> trasa,
// #/beh/v výzvy, #/beh/p program Od gauča k 5 km, #/beh/<id> detail behu. Živé sledovanie je v runlive.js, výpočty v runlib.js, mapa v runmap.js.
// Dáta: tabuľky runs, run_routes, run_goals, run_program (supabase/migrations/20261102_running.sql).
import { ctx } from './app.js';
import * as db from './data.js';
import * as RL from './runlib.js';
import { mapIn } from './runmap.js';
import * as live from './runlive.js';

const $app = () => ctx.$app;
const st = () => ctx.state;
const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const toast = (...a) => ctx.toast(...a);
const uid = () => st().profile.id;
const MONTHS = ['január', 'február', 'marec', 'apríl', 'máj', 'jún', 'júl', 'august', 'september', 'október', 'november', 'december'];
const DAYS = ['ne', 'po', 'ut', 'st', 'št', 'pi', 'so'];
const plural = (n, a, b, c) => `${n} ${n === 1 ? a : n >= 2 && n <= 4 ? b : c}`;

// ---------- dáta ----------
let cache = null, missing = false;
addEventListener('gt-run-saved', () => { cache = null; });
async function runs(force) {
  if (cache && !force) return cache;
  const { data, error } = await db.sb.from('runs').select('id,kind,source,started_at,duration_s,distance_m,kcal,best,title,path,route_id,meta,elev_gain_m').eq('user_id', uid()).order('started_at', { ascending: false }).limit(400);
  if (error) { if (/runs|42P01|PGRST205/.test(`${error.code} ${error.message}`)) missing = true; throw new Error('Behy sa nepodarilo načítať.'); }
  cache = data || []; return cache;
}
async function program() { const { data } = await db.sb.from('run_program').select('*').eq('user_id', uid()).maybeSingle(); return data || null; }
async function goals() { const { data } = await db.sb.from('run_goals').select('*').eq('user_id', uid()); return data || []; }
const weekStart = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const sum = (xs, f) => xs.reduce((a, x) => a + Number(f(x) || 0), 0);
const isRun = r => r.kind !== 'walk';

// ---------- vzhľad ----------
const CSS = `
.rn{padding-bottom:120px}
.rn svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.rn-h{margin:0 0 14px}
.rn-h h1{margin:0;font-size:34px;letter-spacing:-.04em;line-height:1.05}
.rn-h p{margin:4px 0 0;color:var(--muted);font-size:14px}
.rn-go{position:relative;overflow:hidden;width:100%;display:flex;align-items:center;gap:14px;padding:18px;border:0;border-radius:26px;cursor:pointer;font:inherit;text-align:left;color:#06140C;margin:0 0 12px;
  background:linear-gradient(125deg,#3BF08F,#14C8A0 60%,#12A0B8);box-shadow:0 16px 36px -18px #14C8A0}
.rn-go b{display:block;font-size:21px;letter-spacing:-.03em}
.rn-go span{display:block;font-size:13.5px;font-weight:600;opacity:.75;margin-top:2px}
.rn-go i{flex:none;width:56px;height:56px;border-radius:50%;display:grid;place-items:center;background:#06140C;color:#3BF08F}
.rn-go i svg{width:26px;height:26px;fill:currentColor;stroke:none}
.rn-go:after{content:"";position:absolute;right:-30px;top:-40px;width:150px;height:150px;border-radius:50%;background:rgba(255,255,255,.18)}
.rn-tiles{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0 0 14px}
.rn-t{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:15px 14px 14px;border-radius:22px;text-decoration:none;color:var(--text);min-height:118px;
  background:color-mix(in srgb,var(--tc) 14%,var(--card));border:1px solid color-mix(in srgb,var(--tc) 26%,transparent);transition:transform .12s}
.rn-t:active{transform:scale(.97)}
.rn-t .ic{width:40px;height:40px;border-radius:13px;display:grid;place-items:center;background:color-mix(in srgb,var(--tc) 22%,transparent);color:var(--tc)}
.rn-t b{font-size:16px;letter-spacing:-.02em;margin-top:auto}
.rn-t small{font-size:12.5px;color:var(--muted);margin-top:-6px}
.rn-t em{position:absolute;top:14px;right:14px;font-style:normal;font-size:12px;font-weight:800;color:var(--tc)}
.rn-sec{margin:20px 2px 10px;font-size:13px;font-weight:700;color:var(--muted);display:flex;align-items:center;justify-content:space-between}
.rn-sec a{color:var(--accent);text-decoration:none;font-weight:800}
.rn-run{display:flex;align-items:center;gap:13px;padding:12px;border-radius:22px;background:var(--card);border:1px solid var(--line);margin:0 0 10px;color:inherit;text-decoration:none}
.rn-th{flex:none;width:72px;height:60px;border-radius:15px;display:grid;place-items:center;background:color-mix(in srgb,var(--text) 6%,transparent);color:var(--accent);overflow:hidden;font-size:28px}
.rn-th svg{width:72px;height:60px;stroke:none}
.rn-rb{flex:1;min-width:0}
.rn-rb b{display:block;font-size:15.5px;letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rn-rb span{display:block;font-size:12.5px;color:var(--muted);margin-top:2px}
.rn-rb div{display:flex;gap:14px;margin-top:6px;font-size:13.5px;font-weight:700;font-variant-numeric:tabular-nums}
.rn-rb div small{font-weight:600;color:var(--muted);font-size:11.5px;margin-left:2px}
.rn-box{padding:15px;border-radius:22px;background:var(--card);border:1px solid var(--line);margin:0 0 12px}
.rn-box h3{margin:0 0 10px;font-size:15px}
.rn-prog{position:relative;overflow:hidden;display:flex;gap:14px;align-items:center;padding:16px;border-radius:24px;margin:0 0 12px;color:#fff;text-decoration:none;
  background:radial-gradient(120% 140% at 100% 0%,#F2643A,transparent 60%),radial-gradient(120% 140% at 0% 100%,#F5A623,transparent 70%),#2A160C}
.rn-prog .e{flex:none;width:52px;height:52px;border-radius:16px;display:grid;place-items:center;font-size:26px;background:rgba(255,255,255,.16)}
.rn-prog b{display:block;font-size:17px;letter-spacing:-.02em}
.rn-prog span{display:block;font-size:13px;opacity:.85;margin-top:2px}
.rn-prog .go{margin-left:auto;flex:none;padding:9px 14px;border-radius:99px;background:#fff;color:#2A160C;font-weight:800;font-size:14px}
.rn-res{display:flex;align-items:center;gap:12px;padding:14px;border-radius:20px;margin:0 0 12px;background:color-mix(in srgb,#FFB03B 16%,var(--card));border:1px solid color-mix(in srgb,#FFB03B 40%,transparent)}
.rn-res b{display:block;font-size:15px}.rn-res span{font-size:12.5px;color:var(--muted)}
.rn-res .btn{margin-left:auto}
.rn-kind{display:flex;align-items:center;gap:14px;width:100%;padding:13px;border-radius:20px;border:1px solid var(--line);background:var(--card);color:var(--text);font:inherit;text-align:left;cursor:pointer;margin:0 0 8px}
.rn-kind .e{flex:none;width:50px;height:50px;border-radius:16px;display:grid;place-items:center;font-size:25px;background:linear-gradient(140deg,var(--c1),var(--c2))}
.rn-kind b{display:block;font-size:16px}.rn-kind small{display:block;font-size:12.5px;color:var(--muted);margin-top:2px}
.rn-kind:after{content:"›";margin-left:auto;font-size:24px;color:var(--muted)}
.rn-lab{display:block;font-size:12.5px;font-weight:700;color:var(--muted);margin:14px 2px 8px}
.rn-step{display:flex;align-items:center;gap:12px}
.rn-step button{width:44px;height:44px;border-radius:50%;border:1.5px solid var(--line);background:var(--card);color:var(--text);font-size:22px;font-weight:700;cursor:pointer}
.rn-step output{min-width:80px;text-align:center;font-size:26px;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.rn-step span{color:var(--muted);font-size:13px}
.rn-chips{display:flex;gap:8px;flex-wrap:wrap}
.rn-chips button{padding:9px 14px;border-radius:99px;border:1.5px solid var(--line);background:var(--card);color:var(--text);font:inherit;font-size:14px;font-weight:700;cursor:pointer}
.rn-chips button.on{background:var(--text);color:var(--card);border-color:var(--text)}
.rn-sum{margin:14px 0 12px;padding:12px 14px;border-radius:16px;background:color-mix(in srgb,var(--accent) 10%,transparent);font-size:13.5px;line-height:1.45}
.rn-start{width:100%;height:56px;border-radius:18px;border:0;background:linear-gradient(125deg,#3BF08F,#14C8A0);color:#06140C;font:inherit;font-size:17px;font-weight:800;cursor:pointer}
.rn-in{width:100%;height:46px;border-radius:14px;border:1.5px solid var(--line);background:var(--card);color:var(--text);font:inherit;font-size:16px;padding:0 13px}
.rn-map{height:300px;border-radius:24px;overflow:hidden;margin:0 0 12px;background:color-mix(in srgb,var(--text) 6%,var(--card))}
.rn-map .leaflet-container{width:100%;height:100%;background:transparent;font:inherit}
.rn-leg{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted);margin:-4px 4px 12px}
.rn-leg i{flex:1;height:6px;border-radius:9px;background:linear-gradient(90deg,#2BD67B,#FFE24A,#FFB03B,#FF4D5E)}
.rn-title{margin:2px 0 2px;font-size:26px;letter-spacing:-.03em;line-height:1.1}
.rn-date{margin:0 0 12px;color:var(--muted);font-size:13.5px}
.rn-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 0 12px}
.rn-stats div{padding:12px 8px;border-radius:18px;background:var(--card);border:1px solid var(--line);text-align:center}
.rn-stats b{display:block;font-size:22px;font-weight:800;letter-spacing:-.04em;font-variant-numeric:tabular-nums}
.rn-stats span{font-size:11.5px;color:var(--muted);font-weight:600}
.rn-sp{display:grid;grid-template-columns:38px 1fr 54px;align-items:center;gap:10px;padding:6px 0;font-size:13.5px;font-variant-numeric:tabular-nums}
.rn-sp i{display:block;height:10px;border-radius:9px;background:var(--accent)}
.rn-sp i.rn-fa{background:#2BD67B}.rn-sp i.rn-sl{background:#FFB03B}
.rn-sp em{font-style:normal;text-align:right;font-weight:700}
.rn-sp span{color:var(--muted)}
.rn-pr{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:99px;background:color-mix(in srgb,#FFB03B 18%,transparent);color:#E8930B;font-size:12.5px;font-weight:800;margin:0 6px 6px 0}
.rn-acts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 12px}
.rn-seg{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:4px;padding:4px;border-radius:16px;background:color-mix(in srgb,var(--text) 6%,transparent);margin:0 0 12px}
.rn-seg button{height:38px;border:0;border-radius:12px;background:none;color:var(--muted);font:inherit;font-size:14px;font-weight:700;cursor:pointer}
.rn-seg button.on{background:var(--card);color:var(--text);box-shadow:0 1px 4px rgba(0,0,0,.12)}
.rn-big{display:flex;align-items:baseline;gap:8px;margin:2px 0 4px}
.rn-big b{font-size:48px;font-weight:800;letter-spacing:-.05em;font-variant-numeric:tabular-nums}
.rn-big span{color:var(--muted);font-weight:700}
.rn-bars{display:flex;align-items:flex-end;gap:5px;height:120px;margin:14px 0 4px}
.rn-bars div{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:4px;height:100%}
.rn-bars i{display:block;width:100%;border-radius:7px 7px 3px 3px;background:color-mix(in srgb,var(--accent) 35%,transparent);min-height:3px}
.rn-bars div.now i{background:var(--accent)}
.rn-bars small{font-size:10px;color:var(--muted)}
.rn-li{display:flex;align-items:center;gap:12px;padding:11px 0;border-top:1px solid var(--line)}
.rn-li:first-of-type{border-top:0}
.rn-li b{flex:1;font-size:14.5px}
.rn-li em{font-style:normal;font-weight:800;font-variant-numeric:tabular-nums}
.rn-li small{color:var(--muted);font-size:12px;display:block;font-weight:500}
.rn-goal{display:flex;align-items:center;gap:14px;padding:14px;border-radius:22px;background:var(--card);border:1px solid var(--line);margin:0 0 10px}
.rn-ring{position:relative;flex:none;width:64px;height:64px}
.rn-ring svg{width:64px;height:64px;transform:rotate(-90deg)}
.rn-ring circle{fill:none;stroke-width:7;stroke-linecap:round}
.rn-ring span{position:absolute;inset:0;display:grid;place-items:center;font-size:13px;font-weight:800}
.rn-goal b{display:block;font-size:15.5px}.rn-goal small{display:block;color:var(--muted);font-size:12.5px;margin-top:3px}
.rn-goal button{margin-left:auto;border:0;background:none;color:var(--muted);font-size:20px;cursor:pointer;padding:6px}
.rn-badges{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.rn-badge{text-align:center;padding:14px 6px 12px;border-radius:20px;background:var(--card);border:1px solid var(--line)}
.rn-badge i{display:grid;place-items:center;width:52px;height:52px;margin:0 auto 8px;border-radius:50%;font-style:normal;font-size:26px;background:linear-gradient(140deg,#FFD24A,#FF8A3D)}
.rn-badge b{display:block;font-size:12.5px;line-height:1.2}
.rn-badge small{display:block;font-size:11px;color:var(--muted);margin-top:3px;line-height:1.3}
.rn-badge.off i{background:color-mix(in srgb,var(--text) 8%,transparent);filter:grayscale(1);opacity:.5}
.rn-badge.off b{color:var(--muted)}
.rn-mbar{height:12px;border-radius:9px;background:color-mix(in srgb,var(--text) 8%,transparent);overflow:hidden;margin:10px 0 6px}
.rn-mbar i{display:block;height:100%;border-radius:9px;background:linear-gradient(90deg,#3BF08F,#12A0B8)}
.rn-wk{display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--line)}
.rn-wk:first-of-type{border-top:0}
.rn-wk b{flex:none;width:76px;font-size:14px}
.rn-wk span{flex:1;font-size:12.5px;color:var(--muted)}
.rn-dots{display:flex;gap:6px}
.rn-dots i{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:12px;font-weight:800;background:color-mix(in srgb,var(--text) 8%,transparent);color:var(--muted)}
.rn-dots i.ok{background:#2BD67B;color:#06140C}
.rn-dots i.nx{background:#F5A623;color:#2A160C}
.rn-tabs{display:flex;gap:8px;margin:0 0 12px}
.rn-route{display:flex;align-items:center;gap:13px;padding:12px;border-radius:22px;background:var(--card);border:1px solid var(--line);margin:0 0 10px;color:inherit;text-decoration:none}
.rn-empty{text-align:center;padding:30px 18px;border-radius:24px;border:1px dashed var(--line);background:var(--card);color:var(--muted);font-size:14px;line-height:1.5}
.rn-empty b{display:block;color:var(--text);font-size:17px;margin-bottom:6px}
.rn-empty .e{font-size:36px;display:block;margin-bottom:8px}
.rn-tog{display:flex;align-items:center;gap:12px;padding:13px 14px;border-radius:16px;border:1.5px solid var(--line);background:var(--card);font-weight:700;cursor:pointer}
.rn-tog input{width:22px;height:22px;accent-color:var(--accent);flex:none}
.rn-tog small{display:block;font-weight:500;color:var(--muted);font-size:12.5px;margin-top:2px}
.rn-entry{display:flex;align-items:center;gap:13px;padding:14px;border-radius:22px;margin:12px 0;color:#06140C;text-decoration:none;background:linear-gradient(125deg,#3BF08F,#14C8A0 60%,#12A0B8);box-shadow:0 14px 30px -18px #14C8A0}
.rn-entry .e{flex:none;width:48px;height:48px;border-radius:15px;display:grid;place-items:center;font-size:25px;background:rgba(6,20,12,.12)}
.rn-entry b{display:block;font-size:17px;letter-spacing:-.02em}
.rn-entry span{display:block;font-size:13px;font-weight:600;opacity:.75;margin-top:1px}
.rn-prog.rn-ch{background:radial-gradient(120% 140% at 100% 0%,#12A0B8,transparent 60%),radial-gradient(120% 140% at 0% 100%,#3BF08F,transparent 70%),#0B2A22!important}
.rn-prog,.rn-prog b,.rn-prog span{color:#fff!important}
.rn-prog .go,.rn-prog .rn-start{color:#2A160C!important}
.rn-entry,.rn-entry b,.rn-entry span,.rn-go,.rn-go b,.rn-go span{color:#06140C!important}
.rn-go i{color:#3BF08F!important}
.rn-empty b{color:var(--text)!important}
.rn-entry:after{content:"›";margin-left:auto;font-size:28px;font-weight:700;opacity:.6}
`;
function css() { if (document.getElementById('rnCss')) return; const s = document.createElement('style'); s.id = 'rnCss'; s.dataset.fwLight = ''; s.textContent = CSS; document.head.appendChild(s); }
const IC = {
  play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
  hist: '<svg viewBox="0 0 24 24"><path d="M3.5 12a8.5 8.5 0 1 0 2.5-6"/><path d="M3.5 4.5V9H8M12 7.5V12l3 2"/></svg>',
  stat: '<svg viewBox="0 0 24 24"><path d="M4 20h16M7 16v-4M12 16V8M17 16v-7"/></svg>',
  goal: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>',
  map: '<svg viewBox="0 0 24 24"><path d="M9 4.5l-5 2v13l5-2 6 2 5-2v-13l-5 2z"/><path d="M9 4.5v13M15 6.5v13"/></svg>',
  cup: '<svg viewBox="0 0 24 24"><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7"/></svg>',
  shoe: '<svg viewBox="0 0 24 24"><path d="M3 16.5c0-2 1-3 2.5-3.5l3-1 1.5-4 3 1-.5 2.5c2 1.5 4.5 2 7 2.5 1 .2 1.5 1 1.5 2v1.5H4.5A1.5 1.5 0 0 1 3 16.5z"/><path d="M3 19.5h18"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
};
function shell(title, sub, body) {
  return `<div class="screen rn"><div class="rn-h"><h1>${h(title)}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${body}</div>${ctx.nav('#/beh')}`;
}
const loading = t => { $app().innerHTML = shell(t, '', '<div class="spinner"></div>'); };
function noDb() {
  return `<div class="rn-empty"><span class="e">🏃</span><b>Beh sa práve spúšťa</b>Ešte pár minút a bude tu. Skús to znova o chvíľu.</div>`;
}
function runRow(r) {
  const k = RL.K(r.kind), d = new Date(r.started_at);
  const th = r.path?.length > 1 ? RL.thumb(r.path, 72, 60, 'var(--accent)', 3) : k.e;
  const showDist = r.distance_m > 0;
  return `<a class="rn-run" href="#/beh/${r.id}"><span class="rn-th">${th}</span><div class="rn-rb"><b>${h(r.title || k.l)}</b><span>${DAYS[d.getDay()]} ${d.getDate()}. ${d.getMonth() + 1}. · ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')} · ${k.l}${r.source === 'manual' ? ' · ručne' : r.source === 'watch' ? ' · ⌚ hodinky' : ''}</span>
    <div>${showDist ? `<span>${RL.km(r.distance_m)}<small>km</small></span>` : ''}<span>${RL.dur(r.duration_s)}</span>${showDist ? `<span>${RL.pace(r.duration_s, r.distance_m)}<small>/km</small></span>` : ''}</div></div></a>`;
}

// ---------- vstup na obrazovke Tréning ----------
let entryBusy = false;
async function entry() {
  if (entryBusy) return;
  const path = (location.hash || '#/').split('?')[0];
  if (path !== '#/trening') return;
  const scr = document.querySelector('#app .screen'); if (!scr || scr.querySelector('.rn-entry')) return;
  // len pri výbere úrovne (Začiatočník, Pokročilý, Elite) v nastavení plánu, nie na obrazovke s tréningom
  const anchor = scr.querySelector('#lvl')?.closest('.field') || scr.querySelector('#lvl');
  if (!anchor) return;
  entryBusy = true;
  try {
    css();
    let sub = 'Vonku, na páse, na dráhe aj prechádzka';
    if (cache) { const ws = weekStart(); const w = cache.filter(r => new Date(r.started_at) >= ws); if (w.length) sub = `Tento týždeň ${RL.km(sum(w, r => r.distance_m), 1)} km · ${plural(w.length, 'aktivita', 'aktivity', 'aktivít')}`; }
    const a = document.createElement('a'); a.className = 'rn-entry'; a.href = '#/beh'; a.dataset.noskin = '';
    a.innerHTML = `<span class="e">🏃</span><div><b>Beh</b><span>${h(sub)}</span></div>`;
    anchor.after(a);
  } finally { entryBusy = false; }
}

// ---------- #/beh ----------
export async function render(sub) {
  css();
  if (!sub) return hub();
  if (sub === 'h') return history();
  if (sub === 's') return stats();
  if (sub === 'c') return goalsScreen();
  if (sub === 't') return routes();
  if (sub === 'v') return challengesScreen();
  if (sub === 'p') return programScreen();
  if (sub.startsWith('t/')) return routeDetail(sub.slice(2));
  if (/^[0-9a-f-]{36}$/.test(sub)) return detail(sub);
  location.hash = '#/beh';
}

async function hub() {
  loading('Beh');
  let xs = [], pr = null;
  try { [xs, pr] = await Promise.all([runs(true), program()]); } catch (_) { if (missing) { $app().innerHTML = shell('Beh', '', noDb()); return; } }
  const ws = weekStart(), wk = xs.filter(r => new Date(r.started_at) >= ws);
  const res = live.resumable();
  const nx = pr ? RL.nextC25K(pr.done) : null;
  const ch = RL.challenges(xs);
  const nBadges = ch.badges.filter(b => b.ok).length;
  const month = xs.filter(r => isRun(r) && new Date(r.started_at) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const body = `
    ${res && !live.isLive() ? `<div class="rn-res"><span style="font-size:26px">⏸️</span><div><b>Máš rozbehnutú aktivitu</b><span>${RL.km(res.dist)} km · ${RL.dur((res.savedAt - res.startedAt - res.pauseAcc) / 1000)}</span></div><button class="btn sm primary" id="rnRes">Pokračovať</button></div>` : ''}
    <button class="rn-go" id="rnGo" data-noskin><i>${IC.play}</i><div><b>Spustiť beh</b><span>Vonku, na páse, na dráhe alebo prechádzka</span></div></button>
    ${pr && nx ? `<a class="rn-prog" href="#/beh/p" data-noskin><span class="e">🛋️</span><div><b>Od gauča k 5 km</b><span>Týždeň ${nx.w}, deň ${nx.d} · ${h(RL.stepsSummary(nx.steps))}</span></div><span class="go">Ďalej</span></a>`
      : !pr && xs.filter(isRun).length < 5 ? `<a class="rn-prog" href="#/beh/p" data-noskin><span class="e">🛋️</span><div><b>Od gauča k 5 km</b><span>8 týždňov, 3 tréningy týždenne. Na konci odbehneš 5 km.</span></div><span class="go">Pozrieť</span></a>` : ''}
    <div class="rn-tiles">
      <a class="rn-t" href="#/beh/h" style="--tc:#5B8CFF"><span class="ic">${IC.hist}</span><b>História behov</b><small>${xs.length ? plural(xs.length, 'aktivita', 'aktivity', 'aktivít') : 'Predchádzajúce aktivity'}</small></a>
      <a class="rn-t" href="#/beh/s" style="--tc:#E8930B"><span class="ic">${IC.stat}</span><b>Štatistiky</b><small>Výkonnosť a rekordy</small></a>
      <a class="rn-t" href="#/beh/c" style="--tc:#A35CF0"><span class="ic">${IC.goal}</span><b>Moje ciele</b><small>Osobné bežecké ciele</small></a>
      <a class="rn-t" href="#/beh/t" style="--tc:#14A3B8"><span class="ic">${IC.map}</span><b>Bežecké trasy</b><small>V okolí aj tvoje</small></a>
      <a class="rn-t" href="#/beh/v" style="--tc:#F2643A"><span class="ic">${IC.cup}</span><b>Výzvy</b><small>${nBadges}/${ch.badges.length} odznakov</small><em>${Math.round(Math.min(1, ch.monthly.done / ch.monthly.target) * 100)} %</em></a>
      <a class="rn-t" href="#/beh/p" style="--tc:#2BB673"><span class="ic">${IC.shoe}</span><b>Od gauča k 5 km</b><small>${pr ? `${pr.done.length}/24 tréningov` : 'Program pre začiatočníkov'}</small></a>
    </div>
    ${xs.length ? `<div class="rn-sec">Posledné aktivity<a href="#/beh/h">Všetky</a></div>${xs.slice(0, 3).map(runRow).join('')}` : ''}
    <button class="btn ghost" id="rnMan" style="width:100%;margin-top:4px">Zapísať aktivitu ručne</button>`;
  const subt = wk.length ? `Tento týždeň ${RL.km(sum(wk, r => r.distance_m), 1)} km · ${plural(wk.length, 'aktivita', 'aktivity', 'aktivít')}${month.length ? ` · v ${MONTHS[new Date().getMonth()].replace(/r$/, 'ri').replace(/c$/, 'ci').replace(/l$/, 'li').replace(/j$/, 'ji').replace(/n$/, 'ni').replace(/t$/, 'te')} ${RL.km(sum(month, r => r.distance_m), 0)} km` : ''}` : 'Tento týždeň zatiaľ bez behu. Poďme na to!';
  $app().innerHTML = shell('Beh', h(subt), body);
  $app().querySelector('#rnGo').onclick = () => pickKind();
  $app().querySelector('#rnMan').onclick = () => manual();
  $app().querySelector('#rnRes')?.addEventListener('click', () => live.resume(res));
}

// ---------- výber typu a nastavenie ----------
export function pickKind(opts = {}) {
  css();
  const bg = ctx.sheet(`<div class="rn"><h2 style="margin:0 0 4px">Čo ideš robiť?</h2><p class="muted" style="margin:0 0 14px;font-size:13.5px">Počas behu nechaj appku otvorenú. Displej nezhasne a mobil dáš do vrecka cez zámok.</p>
    ${Object.entries(RL.KIND).map(([id, k]) => `<button class="rn-kind" data-k="${id}" style="--c1:${k.c[0]};--c2:${k.c[1]}"><span class="e">${k.e}</span><div><b>${k.l}</b><small>${k.s}</small></div></button>`).join('')}</div>`);
  bg.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
    const k = b.dataset.k; bg.remove();
    if (k === 'runwalk') return setupRunwalk();
    if (k === 'track') return setupTrack();
    if (k === 'treadmill') return setupTreadmill();
    live.start({ kind: k, route: opts.route });
  });
}
function stepper(id, val, unit, fmt = v => v) { return `<div class="rn-step"><button type="button" data-s="${id}" data-d="-1">−</button><output id="${id}">${fmt(val)}</output><button type="button" data-s="${id}" data-d="1">+</button><span>${unit}</span></div>`; }
const mmss = s => s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `0:${String(s).padStart(2, '0')}`;
function setupRunwalk() {
  const S = { run: 120, walk: 60, reps: 8, warm: true };
  const bg = ctx.sheet(`<div class="rn"><h2 style="margin:0 0 4px">🔁 Beh a chôdza</h2><p class="muted" style="margin:0 0 4px;font-size:13.5px">Hlas ti povie, kedy bežať a kedy ísť krokom.</p>
    <span class="rn-lab">Beh (min:s)</span>${stepper('sR', S.run, 'za úsek', mmss)}
    <span class="rn-lab">Chôdza (min:s)</span>${stepper('sW', S.walk, 'za úsek', mmss)}
    <span class="rn-lab">Opakovania</span>${stepper('sN', S.reps, 'krát')}
    <span class="rn-lab">Rozcvička a vydýchanie</span><label class="rn-tog"><input type="checkbox" id="sWu" checked><div>5 minút chôdze na začiatku aj na konci<small>Odporúčame, telo sa zahreje a nezraní</small></div></label>
    <div class="rn-sum" id="sSum"></div><button class="rn-start" id="sGo">Spustiť</button></div>`);
  const upd = () => { bg.querySelector('#sR').textContent = mmss(S.run); bg.querySelector('#sW').textContent = mmss(S.walk); bg.querySelector('#sN').textContent = S.reps; const tot = RL.stepsTotal(RL.runwalk(S.run, S.walk, S.reps, S.warm ? 300 : 0, S.warm ? 300 : 0)); bg.querySelector('#sSum').innerHTML = `Spolu <b>${Math.round(tot / 60)} min</b>, z toho ${Math.round(S.run * S.reps / 60)} min behu.`; };
  bg.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { const d = Number(b.dataset.d); if (b.dataset.s === 'sR') S.run = Math.max(15, Math.min(1800, S.run + d * (S.run >= 120 ? 30 : 15))); if (b.dataset.s === 'sW') S.walk = Math.max(15, Math.min(900, S.walk + d * (S.walk >= 120 ? 30 : 15))); if (b.dataset.s === 'sN') S.reps = Math.max(1, Math.min(30, S.reps + d)); upd(); });
  bg.querySelector('#sWu').onchange = e => { S.warm = e.target.checked; upd(); };
  upd();
  bg.querySelector('#sGo').onclick = () => { bg.remove(); live.start({ kind: 'runwalk', steps: RL.runwalk(S.run, S.walk, S.reps, S.warm ? 300 : 0, S.warm ? 300 : 0), meta: { run: S.run, walk: S.walk, reps: S.reps } }); };
}
function setupTrack() {
  const S = { m: 400, reps: 6, rest: 90, warm: true };
  const bg = ctx.sheet(`<div class="rn"><h2 style="margin:0 0 4px">🏟️ Intervaly na dráhe</h2><p class="muted" style="margin:0 0 4px;font-size:13.5px">Na konci každého úseku ťukni Hotovo. Oddych odpočíta appka sama a zavelí ďalší úsek.</p>
    <span class="rn-lab">Úsek</span><div class="rn-chips" id="sM">${[200, 400, 800, 1000, 1600].map(m => `<button type="button" data-m="${m}" class="${m === S.m ? 'on' : ''}">${m >= 1000 ? (m / 1000).toString().replace('.', ',') + ' km' : m + ' m'}</button>`).join('')}</div>
    <span class="rn-lab">Opakovania</span>${stepper('sN', S.reps, 'krát')}
    <span class="rn-lab">Oddych medzi úsekmi</span>${stepper('sP', S.rest, 'min:s', mmss)}
    <span class="rn-lab">Rozbehanie</span><label class="rn-tog"><input type="checkbox" id="sWu" checked><div>10 min rozklusania a 5 min vyklusania<small>Pred rýchlymi úsekmi je to nutnosť</small></div></label>
    <div class="rn-sum" id="sSum"></div><button class="rn-start" id="sGo">Spustiť</button></div>`);
  const upd = () => { bg.querySelector('#sN').textContent = S.reps; bg.querySelector('#sP').textContent = mmss(S.rest); bg.querySelector('#sSum').innerHTML = `<b>${S.reps}× ${S.m} m</b> s oddychom ${mmss(S.rest)}. Spolu ${RL.km(S.reps * S.m, S.reps * S.m % 1000 ? 1 : 0)} km rýchlo.`; };
  bg.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { S.m = Number(b.dataset.m); bg.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === b)); upd(); });
  bg.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { const d = Number(b.dataset.d); if (b.dataset.s === 'sN') S.reps = Math.max(1, Math.min(30, S.reps + d)); if (b.dataset.s === 'sP') S.rest = Math.max(15, Math.min(600, S.rest + d * 15)); upd(); });
  bg.querySelector('#sWu').onchange = e => { S.warm = e.target.checked; };
  upd();
  bg.querySelector('#sGo').onclick = () => { bg.remove(); live.start({ kind: 'track', steps: RL.trackSteps(S.reps, S.m, S.rest, S.warm ? 600 : 0, S.warm ? 300 : 0), meta: { m: S.m, reps: S.reps, rest: S.rest } }); };
}
function setupTreadmill() {
  let sp = 9;
  const bg = ctx.sheet(`<div class="rn"><h2 style="margin:0 0 4px">🏃‍♀️ Beh na páse</h2><p class="muted" style="margin:0 0 4px;font-size:13.5px">Pás nemá GPS. Nastav rovnakú rýchlosť ako na páse, appka počíta vzdialenosť a na konci ju opravíš podľa displeja pásu.</p>
    <span class="rn-lab">Rýchlosť pásu</span>${stepper('sV', sp, 'km/h', v => v.toFixed(1).replace('.', ','))}
    <div class="rn-sum" id="sSum"></div><button class="rn-start" id="sGo">Spustiť</button></div>`);
  const upd = () => { bg.querySelector('#sV').textContent = sp.toFixed(1).replace('.', ','); bg.querySelector('#sSum').innerHTML = `Tempo <b>${RL.pace(3600 / sp, 1000)} /km</b>. Rýchlosť meníš aj počas behu.`; };
  bg.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { sp = Math.max(3, Math.min(22, sp + Number(b.dataset.d) * 0.5)); upd(); });
  upd();
  bg.querySelector('#sGo').onclick = () => { bg.remove(); live.start({ kind: 'treadmill', speed: sp }); };
}
function manual() {
  const now = new Date(); const pad = n => String(n).padStart(2, '0');
  const bg = ctx.sheet(`<div class="rn"><h2 style="margin:0 0 4px">Zapísať aktivitu</h2><p class="muted" style="margin:0 0 8px;font-size:13.5px">Keď si appku pri behu nemal pri sebe.</p>
    <span class="rn-lab">Typ</span><div class="rn-chips" id="mK">${Object.entries(RL.KIND).map(([id, k], i) => `<button type="button" data-k="${id}" class="${i === 0 ? 'on' : ''}">${k.e} ${k.l.replace('Beh ', '').replace(/^vonku$/, 'Vonku')}</button>`).join('')}</div>
    <span class="rn-lab">Kedy</span><div style="display:flex;gap:8px"><input class="rn-in" type="date" id="mD" value="${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}"><input class="rn-in" type="time" id="mT" value="${pad(now.getHours())}:${pad(now.getMinutes())}" style="width:130px"></div>
    <span class="rn-lab">Vzdialenosť (km)</span><input class="rn-in" id="mKm" inputmode="decimal" placeholder="5,2">
    <span class="rn-lab">Čas (hodiny, minúty, sekundy)</span><div style="display:flex;gap:8px"><input class="rn-in" id="mH" inputmode="numeric" placeholder="0" style="text-align:center"><input class="rn-in" id="mM" inputmode="numeric" placeholder="28" style="text-align:center"><input class="rn-in" id="mS" inputmode="numeric" placeholder="30" style="text-align:center"></div>
    <div class="rn-sum" id="mSum">Doplň vzdialenosť a čas.</div><button class="rn-start" id="mGo">Uložiť</button></div>`);
  let kind = 'outdoor';
  const val = () => { const kmv = parseFloat(String(bg.querySelector('#mKm').value).replace(',', '.')) || 0; const s = (Number(bg.querySelector('#mH').value) || 0) * 3600 + (Number(bg.querySelector('#mM').value) || 0) * 60 + (Number(bg.querySelector('#mS').value) || 0); return { m: kmv * 1000, s }; };
  const upd = () => { const v = val(); bg.querySelector('#mSum').innerHTML = v.s ? `${v.m ? `${RL.km(v.m)} km za ${RL.dur(v.s)} · tempo <b>${RL.pace(v.s, v.m)} /km</b>` : RL.dur(v.s)}` : 'Doplň vzdialenosť a čas.'; };
  bg.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { kind = b.dataset.k; bg.querySelectorAll('[data-k]').forEach(x => x.classList.toggle('on', x === b)); });
  bg.querySelectorAll('input').forEach(i => i.addEventListener('input', upd));
  bg.querySelector('#mGo').onclick = async e => {
    const v = val(); if (!v.s) { toast('Doplň čas aktivity.', true); return; }
    if (v.m && v.s / (v.m / 1000) < 150) { toast('Takéto tempo nie je možné. Skontroluj vzdialenosť a čas.', true); return; }
    const at = new Date(`${bg.querySelector('#mD').value}T${bg.querySelector('#mT').value || '12:00'}`);
    if (isNaN(at) || at > new Date(Date.now() + 3600e3)) { toast('Skontroluj dátum.', true); return; }
    e.currentTarget.disabled = true;
    const kg = Number(st().profile?.start_weight) || 72;
    const { data, error } = await db.sb.from('runs').insert({ user_id: uid(), kind, source: 'manual', started_at: at.toISOString(), duration_s: v.s, elapsed_s: v.s, distance_m: Math.round(v.m), kcal: RL.kcal(kind, v.m, kg), title: `${RL.K(kind).l}${v.m ? ` ${RL.km(v.m, 1)} km` : ''}` }).select('id').single();
    if (error) { toast('Nepodarilo sa uložiť.', true); e.currentTarget.disabled = false; return; }
    bg.remove(); cache = null; toast('Uložené.'); location.hash = '#/beh/' + data.id;
  };
}

// ---------- detail behu ----------
async function detail(id) {
  loading('Beh');
  const { data: r, error } = await db.sb.from('runs').select('*').eq('id', id).maybeSingle();
  if (error || !r) { $app().innerHTML = shell('Beh', '', '<div class="rn-empty"><span class="e">🔍</span><b>Aktivitu sme nenašli</b>Možno bola zmazaná.</div>'); return; }
  const k = RL.K(r.kind), d = new Date(r.started_at), all = await runs().catch(() => []);
  // osobné rekordy, ktoré tento beh prekonal
  const prs = Object.entries(r.best || {}).filter(([dist, s]) => !all.some(o => o.id !== r.id && new Date(o.started_at) < d && (o.best?.[dist] || Infinity) <= s));
  const PRN = { 1000: '1 km', 5000: '5 km', 10000: '10 km', 21097: 'polmaratón' };
  const sp = (r.splits || []).filter(x => x.s > 0);
  const paces = sp.map(x => x.s / ((x.part ? (x.km % 1 || 1) : 1)));
  const fast = Math.min(...paces), slow = Math.max(...paces);
  const hasMap = r.path?.length > 1;
  const body = `
    ${hasMap ? '<div class="rn-map" id="rnMap"></div><div class="rn-leg">ľahšie<i></i>najťažšie</div>' : ''}
    <h2 class="rn-title">${h(r.title || k.l)}</h2>
    <p class="rn-date">${k.e} ${k.l} · ${d.toLocaleString('sk-SK', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}${r.source === 'manual' ? ' · zapísané ručne' : ''}</p>
    ${prs.length ? `<div style="margin:0 0 8px">${prs.map(([dist, s]) => `<span class="rn-pr">🏆 Rekord ${PRN[dist] || dist} · ${RL.dur(s)}</span>`).join('')}</div>` : ''}
    <div class="rn-stats">
      <div><b>${RL.km(r.distance_m)}</b><span>km</span></div><div><b>${RL.dur(r.duration_s)}</b><span>čas</span></div><div><b>${RL.pace(r.duration_s, r.distance_m)}</b><span>tempo /km</span></div>
      <div><b>${r.kcal ?? '–'}</b><span>kcal</span></div><div><b>${RL.speed(r.duration_s, r.distance_m)}</b><span>km/h</span></div><div><b>${r.elev_gain_m != null ? Math.round(r.elev_gain_m) : '–'}</b><span>m stúpanie</span></div>
    </div>
    ${r.note ? `<div class="rn-box"><p style="margin:0;white-space:pre-wrap">${h(r.note)}</p></div>` : ''}
    ${sp.length ? `<div class="rn-box"><h3>Kilometre</h3>${sp.map((x, i) => { const p = paces[i]; const w = slow > fast ? 45 + (slow - p) / (slow - fast) * 55 : 100; return `<div class="rn-sp"><span>${x.part ? RL.km(x.km * 1000, 2) : x.km}</span><i class="${p === fast && sp.length > 1 ? "rn-fa" : p === slow && sp.length > 1 ? "rn-sl" : ""}" style="width:${w}%"></i><em>${RL.pace(x.s, (x.part ? (x.km % 1 || 1) : 1) * 1000)}</em></div>`; }).join('')}</div>` : ''}
    ${r.laps?.length ? `<div class="rn-box"><h3>Úseky</h3>${r.laps.filter(l => l.type !== 'warm' && l.type !== 'cool').map((l, i) => `<div class="rn-li"><b>${RL.STEP_L[l.type] || 'Úsek'}${l.m ? ` ${l.m} m` : ''}<small>${i + 1}. úsek${l.cut ? ' · nedokončený' : ''}</small></b><em>${RL.dur(l.s)}${l.m ? ` · ${RL.pace(l.s, l.m)}/km` : ''}</em></div>`).join('')}</div>` : ''}
    ${Object.keys(r.best || {}).length ? `<div class="rn-box"><h3>Najlepšie úseky v tomto behu</h3>${Object.entries(r.best).map(([dist, s]) => `<div class="rn-li"><b>${PRN[dist] || dist}</b><em>${RL.dur(s)}</em></div>`).join('')}</div>` : ''}
    <div class="rn-acts">${hasMap ? '<button class="btn" id="rnRoute">Uložiť ako trasu</button>' : ''}<button class="btn" id="rnShare">Zdieľať</button><button class="btn" id="rnEdit">Upraviť názov</button><button class="btn" id="rnDel" style="color:#E5484D">Zmazať</button></div>`;
  $app().innerHTML = shell('', '', body).replace('<div class="rn-h"><h1></h1></div>', '');
  if (hasMap) mapIn($app().querySelector('#rnMap'), { path: r.path, interactive: true }).catch(() => { $app().querySelector('#rnMap')?.remove(); $app().querySelector('.rn-leg')?.remove(); });
  $app().querySelector('#rnRoute')?.addEventListener('click', () => saveRoute(r));
  $app().querySelector('#rnShare').onclick = () => {
    const t = `${r.title || k.l}: ${RL.km(r.distance_m)} km za ${RL.dur(r.duration_s)} (${RL.pace(r.duration_s, r.distance_m)}/km) v appke GainTrain 🏃`;
    if (navigator.share) navigator.share({ text: t }).catch(() => { }); else { navigator.clipboard?.writeText(t); toast('Skopírované.'); }
  };
  $app().querySelector('#rnEdit').onclick = () => {
    const bg = ctx.sheet(`<div class="rn"><h2 style="margin:0 0 10px">Upraviť</h2><span class="rn-lab">Názov</span><input class="rn-in" id="eT" maxlength="80" value="${h(r.title || '')}"><span class="rn-lab">Poznámka</span><input class="rn-in" id="eN" maxlength="500" value="${h(r.note || '')}"><button class="rn-start" id="eGo" style="margin-top:14px">Uložiť</button></div>`);
    bg.querySelector('#eGo').onclick = async () => { const { error } = await db.sb.from('runs').update({ title: bg.querySelector('#eT').value.trim() || null, note: bg.querySelector('#eN').value.trim() || null }).eq('id', r.id); if (error) return toast('Nepodarilo sa uložiť.', true); bg.remove(); cache = null; detail(r.id); };
  };
  $app().querySelector('#rnDel').onclick = () => {
    const bg = ctx.sheet(`<h2 style="margin:0 0 6px">Zmazať aktivitu?</h2><p class="muted" style="margin:0 0 16px">Zmizne z histórie aj štatistík. Nedá sa to vrátiť.</p><button class="btn tr-danger" style="width:100%" id="dY">Zmazať</button><button class="btn ghost" style="width:100%;margin-top:8px" id="dN">Nechať</button>`);
    bg.querySelector('#dN').onclick = () => bg.remove();
    bg.querySelector('#dY').onclick = async () => { const { error } = await db.sb.from('runs').delete().eq('id', r.id); if (error) return toast('Nepodarilo sa zmazať.', true); bg.remove(); cache = null; toast('Zmazané.'); location.hash = '#/beh/h'; };
  };
}
function saveRoute(r) {
  const S = { surface: 'road', pub: true };
  const bg = ctx.sheet(`<div class="rn"><h2 style="margin:0 0 4px">Uložiť trasu</h2><p class="muted" style="margin:0 0 6px;font-size:13.5px">Trasu potom spustíš jedným ťuknutím a uvidíš ju počas behu na mape.</p>
    <span class="rn-lab">Názov trasy</span><input class="rn-in" id="rN" maxlength="60" placeholder="Okolo zámku, Bojnice">
    <span class="rn-lab">Kde to je (nepovinné)</span><input class="rn-in" id="rP" maxlength="60" placeholder="Mesto alebo park">
    <span class="rn-lab">Povrch</span><div class="rn-chips">${[['road', 'Cesta'], ['park', 'Park'], ['trail', 'Les a terén'], ['track', 'Dráha'], ['mixed', 'Mix']].map(([id, l]) => `<button type="button" data-f="${id}" class="${id === S.surface ? 'on' : ''}">${l}</button>`).join('')}</div>
    <span class="rn-lab">Zdieľanie</span><label class="rn-tog"><input type="checkbox" id="rPub" checked><div>Ukázať trasu ostatným bežcom v okolí<small>Začiatok a koniec trasy (asi 200 m) sa skryje, nikto neuvidí, kde bývaš. Meno sa ukáže len krstné.</small></div></label>
    <button class="rn-start" id="rGo" style="margin-top:14px">Uložiť trasu</button></div>`);
  bg.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { S.surface = b.dataset.f; bg.querySelectorAll('[data-f]').forEach(x => x.classList.toggle('on', x === b)); });
  bg.querySelector('#rGo').onclick = async e => {
    const name = bg.querySelector('#rN').value.trim(); if (name.length < 2) { toast('Daj trase názov.', true); return; }
    const pub = bg.querySelector('#rPub').checked;
    const raw = r.path.map(q => [q[0], q[1]]);
    const path = RL.simplify(pub ? RL.privacyTrim(raw) : raw, 600);
    if (path.length < 2) { toast('Trasa je na zdieľanie príliš krátka.', true); return; }
    e.currentTarget.disabled = true;
    const { data, error } = await db.sb.from('run_routes').insert({ user_id: uid(), name, place: bg.querySelector('#rP').value.trim() || null, surface: S.surface, public: pub, distance_m: Math.round(RL.pathLen(path)), path, start_lat: path[0][0], start_lng: path[0][1], from_run: r.id }).select('id').single();
    if (error) { toast('Trasu sa nepodarilo uložiť.', true); e.currentTarget.disabled = false; return; }
    await db.sb.from('runs').update({ route_id: data.id }).eq('id', r.id);
    bg.remove(); toast(pub ? 'Trasa je uložená a vidia ju bežci v okolí.' : 'Trasa je uložená.'); location.hash = '#/beh/t/' + data.id;
  };
}

// ---------- história ----------
async function history() {
  loading('História behov');
  let xs = []; try { xs = await runs(); } catch (_) { $app().innerHTML = shell('História behov', '', missing ? noDb() : '<div class="rn-empty">Nepodarilo sa načítať.</div>'); return; }
  if (!xs.length) { $app().innerHTML = shell('História behov', '', `<div class="rn-empty"><span class="e">👟</span><b>Zatiaľ žiadna aktivita</b>Tvoj prvý beh sa objaví tu, aj s mapou a medzičasmi.</div><button class="rn-start" style="margin-top:12px" id="hGo">Spustiť beh</button>`); $app().querySelector('#hGo').onclick = () => pickKind(); return; }
  const groups = {};
  xs.forEach(r => { const d = new Date(r.started_at); const key = `${d.getFullYear()}-${d.getMonth()}`; (groups[key] = groups[key] || { d, xs: [] }).xs.push(r); });
  const body = Object.values(groups).map(g => `<div class="rn-sec"><span>${MONTHS[g.d.getMonth()][0].toUpperCase() + MONTHS[g.d.getMonth()].slice(1)} ${g.d.getFullYear()}</span><span>${RL.km(sum(g.xs, r => r.distance_m), 1)} km · ${g.xs.length}×</span></div>${g.xs.map(runRow).join('')}`).join('');
  $app().innerHTML = shell('História behov', plural(xs.length, 'aktivita', 'aktivity', 'aktivít'), body);
}

// ---------- štatistiky ----------
let statPer = 'month';
async function stats() {
  loading('Štatistiky');
  let xs = []; try { xs = (await runs()); } catch (_) { $app().innerHTML = shell('Štatistiky', '', missing ? noDb() : ''); return; }
  const now = new Date();
  const from = statPer === 'week' ? weekStart() : statPer === 'month' ? new Date(now.getFullYear(), now.getMonth(), 1) : statPer === 'year' ? new Date(now.getFullYear(), 0, 1) : new Date(0);
  const P = xs.filter(r => new Date(r.started_at) >= from), PR = P.filter(isRun);
  const dist = sum(PR, r => r.distance_m), time = sum(PR, r => r.duration_s);
  // posledných 12 týždňov
  const ws = weekStart(); const weeks = Array.from({ length: 12 }, (_, i) => { const a = new Date(ws); a.setDate(a.getDate() - (11 - i) * 7); const b = new Date(a); b.setDate(b.getDate() + 7); return { a, m: sum(xs.filter(r => isRun(r) && new Date(r.started_at) >= a && new Date(r.started_at) < b), r => r.distance_m) }; });
  const mx = Math.max(1, ...weeks.map(w => w.m));
  const best = d => { let b = null; xs.forEach(r => { const s = r.best?.[d]; if (s && (!b || s < b.s)) b = { s, r }; }); return b; };
  const longest = xs.filter(isRun).reduce((a, r) => !a || Number(r.distance_m) > Number(a.distance_m) ? r : a, null);
  const byKind = Object.keys(RL.KIND).map(k => ({ k, n: P.filter(r => r.kind === k).length, m: sum(P.filter(r => r.kind === k), r => r.distance_m) })).filter(x => x.n);
  const PRN = [[1000, '1 km'], [5000, '5 km'], [10000, '10 km'], [21097, 'Polmaratón']];
  const body = `
    <div class="rn-seg">${[['week', 'Týždeň'], ['month', 'Mesiac'], ['year', 'Rok'], ['all', 'Celkovo']].map(([id, l]) => `<button data-p="${id}" class="${statPer === id ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div class="rn-box"><div class="rn-big"><b>${RL.km(dist, 1)}</b><span>km behu</span></div>
      <div class="rn-stats" style="margin:10px 0 0"><div><b>${PR.length}</b><span>behov</span></div><div><b>${RL.dur(time)}</b><span>čas</span></div><div><b>${RL.pace(time, dist)}</b><span>priem. tempo</span></div></div>
      ${P.length - PR.length ? `<p class="muted small" style="margin:10px 0 0">+ ${plural(P.length - PR.length, 'prechádzka', 'prechádzky', 'prechádzok')}, ${RL.km(sum(P.filter(r => !isRun(r)), r => r.distance_m), 1)} km</p>` : ''}</div>
    <div class="rn-box"><h3>Kilometre po týždňoch</h3><div class="rn-bars">${weeks.map((w, i) => `<div class="${i === 11 ? 'now' : ''}"><i style="height:${(w.m / mx * 100).toFixed(1)}%" title="${RL.km(w.m, 1)} km"></i><small>${i === 11 ? 'teraz' : `${w.a.getDate()}.${w.a.getMonth() + 1}`}</small></div>`).join('')}</div>
      <p class="muted small" style="margin:6px 0 0">Najviac ${RL.km(mx, 1)} km za týždeň</p></div>
    <div class="rn-box"><h3>Osobné rekordy</h3>${PRN.map(([d, l]) => { const b = best(d); return `<div class="rn-li"><b>${l}${b ? `<small>${new Date(b.r.started_at).toLocaleDateString('sk-SK')}</small>` : ''}</b>${b ? `<a href="#/beh/${b.r.id}" style="color:inherit;text-decoration:none"><em>${RL.dur(b.s)}</em></a>` : '<span class="muted small">zatiaľ nie</span>'}</div>`; }).join('')}
      ${longest ? `<div class="rn-li"><b>Najdlhší beh<small>${new Date(longest.started_at).toLocaleDateString('sk-SK')}</small></b><em>${RL.km(longest.distance_m)} km</em></div>` : ''}</div>
    ${byKind.length ? `<div class="rn-box"><h3>Podľa typu</h3>${byKind.map(x => `<div class="rn-li"><b>${RL.K(x.k).e} ${RL.K(x.k).l}<small>${plural(x.n, 'aktivita', 'aktivity', 'aktivít')}</small></b><em>${RL.km(x.m, 1)} km</em></div>`).join('')}</div>` : ''}`;
  $app().innerHTML = shell('Štatistiky', 'Výkonnosť a rekordy', body);
  $app().querySelectorAll('[data-p]').forEach(b => b.onclick = () => { statPer = b.dataset.p; stats(); });
}

// ---------- ciele ----------
const GK = {
  week_km: { l: 'Kilometre za týždeň', u: 'km', def: 15, step: 1, fmt: v => `${v} km` },
  month_km: { l: 'Kilometre za mesiac', u: 'km', def: 50, step: 5, fmt: v => `${v} km` },
  week_runs: { l: 'Behov za týždeň', u: 'behov', def: 3, step: 1, fmt: v => plural(v, 'beh', 'behy', 'behov') },
  pr_5k: { l: '5 km pod čas', u: 'min', def: 30, step: 1, fmt: v => `pod ${v}:00` },
  pr_10k: { l: '10 km pod čas', u: 'min', def: 60, step: 1, fmt: v => `pod ${v}:00` },
  long_run: { l: 'Najdlhší beh', u: 'km', def: 10, step: 1, fmt: v => `${v} km naraz` },
};
function goalProgress(g, xs) {
  const ws = weekStart(), ms = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const R = xs.filter(isRun), t = Number(g.target);
  if (g.kind === 'week_km') { const v = sum(R.filter(r => new Date(r.started_at) >= ws), r => r.distance_m) / 1000; return { v, p: v / t, txt: `${RL.km(v * 1000, 1)} z ${t} km tento týždeň` }; }
  if (g.kind === 'month_km') { const v = sum(R.filter(r => new Date(r.started_at) >= ms), r => r.distance_m) / 1000; return { v, p: v / t, txt: `${RL.km(v * 1000, 1)} z ${t} km tento mesiac` }; }
  if (g.kind === 'week_runs') { const v = R.filter(r => new Date(r.started_at) >= ws).length; return { v, p: v / t, txt: `${v} z ${t} tento týždeň` }; }
  if (g.kind === 'pr_5k' || g.kind === 'pr_10k') { const d = g.kind === 'pr_5k' ? 5000 : 10000; const b = Math.min(Infinity, ...R.map(r => r.best?.[d] || Infinity)); return b < Infinity ? { p: Math.min(1, t * 60 / b), txt: `Tvoj najlepší čas ${RL.dur(b)}${b <= t * 60 ? ', splnené!' : `, chýba ${RL.dur(b - t * 60)}`}` } : { p: 0, txt: `Zatiaľ nemáš odbehnutých ${d / 1000} km naraz` }; }
  if (g.kind === 'long_run') { const v = Math.max(0, ...R.map(r => Number(r.distance_m))) / 1000; return { v, p: v / t, txt: `Zatiaľ najviac ${RL.km(v * 1000, 1)} km` }; }
  return { p: 0, txt: '' };
}
async function goalsScreen() {
  loading('Moje ciele');
  let xs = [], gs = []; try { [xs, gs] = await Promise.all([runs(), goals()]); } catch (_) { $app().innerHTML = shell('Moje ciele', '', missing ? noDb() : ''); return; }
  const C = 2 * Math.PI * 26;
  const body = (gs.length ? gs.map(g => { const pr = goalProgress(g, xs), p = Math.max(0, Math.min(1, pr.p)); const ok = p >= 1; return `<div class="rn-goal"><div class="rn-ring"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" stroke="color-mix(in srgb,var(--text) 9%,transparent)"/><circle cx="32" cy="32" r="26" stroke="${ok ? '#2BD67B' : '#A35CF0'}" stroke-dasharray="${(p * C).toFixed(1)} ${C}"/></svg><span>${ok ? '✓' : Math.round(p * 100) + '%'}</span></div><div><b>${GK[g.kind].l}: ${GK[g.kind].fmt(Number(g.target))}</b><small>${h(pr.txt)}</small></div><button data-del="${g.id}" aria-label="Zmazať cieľ">×</button></div>`; }).join('')
    : `<div class="rn-empty"><span class="e">🎯</span><b>Zatiaľ žiadny cieľ</b>Cieľ ťa dostane von aj vtedy, keď sa nechce. Začni niečím malým, napríklad 3 behy týždenne.</div>`)
    + `<button class="rn-start" id="gAdd" style="margin-top:12px">Pridať cieľ</button>`;
  $app().innerHTML = shell('Moje ciele', 'Osobné bežecké ciele', body);
  $app().querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { await db.sb.from('run_goals').delete().eq('id', b.dataset.del); goalsScreen(); });
  $app().querySelector('#gAdd').onclick = () => {
    let kind = 'week_runs', val = GK.week_runs.def;
    const bg = ctx.sheet(`<div class="rn"><h2 style="margin:0 0 10px">Nový cieľ</h2><span class="rn-lab">Čo chceš dosiahnuť</span><div class="rn-chips">${Object.entries(GK).map(([id, g]) => `<button type="button" data-g="${id}" class="${id === kind ? 'on' : ''}">${g.l}</button>`).join('')}</div>
      <span class="rn-lab">Cieľ</span><div class="rn-step"><button type="button" data-d="-1">−</button><output id="gV"></output><button type="button" data-d="1">+</button><span id="gU"></span></div><button class="rn-start" id="gGo" style="margin-top:16px">Uložiť cieľ</button></div>`);
    const upd = () => { bg.querySelector('#gV').textContent = val; bg.querySelector('#gU').textContent = GK[kind].u; };
    bg.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { kind = b.dataset.g; val = GK[kind].def; bg.querySelectorAll('[data-g]').forEach(x => x.classList.toggle('on', x === b)); upd(); });
    bg.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { val = Math.max(1, val + Number(b.dataset.d) * GK[kind].step); upd(); });
    upd();
    bg.querySelector('#gGo').onclick = async () => { const { error } = await db.sb.from('run_goals').upsert({ user_id: uid(), kind, target: val }, { onConflict: 'user_id,kind' }); if (error) return toast('Nepodarilo sa uložiť.', true); bg.remove(); goalsScreen(); };
  };
}

// ---------- trasy ----------
let routeTab = 'near', here = null;
async function routes() {
  loading('Bežecké trasy');
  const tabs = `<div class="rn-seg"><button data-t="near" class="${routeTab === 'near' ? 'on' : ''}">V okolí</button><button data-t="mine" class="${routeTab === 'mine' ? 'on' : ''}">Moje trasy</button></div>`;
  const draw = (inner, sub = 'Trasy od bežcov v okolí aj tvoje vlastné') => {
    $app().innerHTML = shell('Bežecké trasy', sub, tabs + inner);
    $app().querySelectorAll('[data-t]').forEach(b => b.onclick = () => { routeTab = b.dataset.t; routes(); });
  };
  const card = r => `<a class="rn-route" href="#/beh/t/${r.id}"><span class="rn-th">${RL.thumb(r.path, 72, 60, '#14A3B8', 3)}</span><div class="rn-rb"><b>${h(r.name)}</b><span>${r.place ? h(r.place) + ' · ' : ''}${r.km != null ? `${String(r.km).replace('.', ',')} km od teba` : r.public ? 'zverejnená' : 'súkromná'}</span>
    <div><span>${RL.km(r.distance_m, 1)}<small>km</small></span>${r.author && !r.mine ? `<span style="font-weight:600;color:var(--muted)">od ${h(r.author)}</span>` : r.mine ? '<span style="font-weight:600;color:var(--muted)">tvoja</span>' : ''}${Number(r.runs) > 1 ? `<span style="font-weight:600;color:var(--muted)">${plural(Number(r.runs), 'beh', 'behy', 'behov')}</span>` : ''}</div></div></a>`;
  if (routeTab === 'mine') {
    const { data, error } = await db.sb.from('run_routes').select('id,name,distance_m,path,place,public').eq('user_id', uid()).order('created_at', { ascending: false });
    if (error) { draw(noDb()); return; }
    draw(data?.length ? data.map(r => card({ ...r, mine: true })).join('') : `<div class="rn-empty"><span class="e">🗺️</span><b>Zatiaľ žiadna trasa</b>Po behu vonku ťukni v detaile na Uložiť ako trasu. Potom ju spustíš jedným ťuknutím.</div>`);
    return;
  }
  if (!here) {
    draw(`<div class="rn-empty"><span class="e">📍</span><b>Trasy v tvojom okolí</b>Ukážeme ti trasy, ktoré zverejnili bežci blízko teba. Na to potrebujeme tvoju polohu, nikam ju neukladáme.<br><button class="rn-start" id="tLoc" style="margin-top:14px">Ukázať trasy v okolí</button></div>`);
    $app().querySelector('#tLoc').onclick = e => {
      e.currentTarget.disabled = true; e.currentTarget.textContent = 'Zisťujem polohu…';
      navigator.geolocation?.getCurrentPosition(p => { here = [p.coords.latitude, p.coords.longitude]; routes(); }, () => { toast('Polohu sa nepodarilo zistiť. Povoľ ju v nastaveniach prehliadača.', true); routes(); }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
    };
    return;
  }
  const { data, error } = await db.sb.rpc('run_routes_near', { p_lat: here[0], p_lng: here[1], p_km: 25 });
  if (error) { draw(noDb()); return; }
  const xs = data || [];
  draw(xs.length ? xs.map(card).join('') : `<div class="rn-empty"><span class="e">🌱</span><b>Buď prvý vo svojom okolí</b>Blízko teba zatiaľ nikto trasu nezverejnil. Po behu ju ulož a zverejni, ostatní ju uvidia tu.</div>`, `${plural(xs.length, 'trasa', 'trasy', 'trás')} do 25 km od teba`);
}
async function routeDetail(id) {
  loading('Trasa');
  const { data: r } = await db.sb.from('run_routes').select('*').eq('id', id).maybeSingle();
  if (!r) { $app().innerHTML = shell('Trasa', '', '<div class="rn-empty"><span class="e">🔍</span><b>Trasu sme nenašli</b>Autor ju možno zmazal alebo skryl.</div>'); return; }
  const mine = r.user_id === uid();
  const [{ count }, mineRuns] = await Promise.all([
    db.sb.from('runs').select('id', { count: 'exact', head: true }).eq('route_id', id).then(x => x, () => ({ count: 0 })),
    runs().then(xs => xs.filter(x => x.route_id === id)).catch(() => []),
  ]);
  const best = mineRuns.reduce((a, x) => !a || x.duration_s < a.duration_s ? x : a, null);
  const SURF = { road: 'Cesta', park: 'Park', trail: 'Les a terén', track: 'Dráha', mixed: 'Mix' };
  const body = `<div class="rn-map" id="rnMap"></div>
    <h2 class="rn-title">${h(r.name)}</h2><p class="rn-date">${r.place ? h(r.place) + ' · ' : ''}${SURF[r.surface] || ''}${r.public ? ' · zverejnená' : ' · len pre teba'}</p>
    <div class="rn-stats"><div><b>${RL.km(r.distance_m, 1)}</b><span>km</span></div><div><b>${mineRuns.length}</b><span>tvoje behy</span></div><div><b>${best ? RL.dur(best.duration_s) : '–'}</b><span>tvoj najlepší</span></div></div>
    <button class="rn-start" id="rRun">Bežať túto trasu</button>
    <p class="muted small" style="margin:8px 4px 12px">Trasa sa ti počas behu ukáže na mape ako prerušovaná čiara.${r.public ? '' : ''}</p>
    ${mine ? `<div class="rn-acts"><button class="btn" id="rPub">${r.public ? 'Skryť pred ostatnými' : 'Zverejniť v okolí'}</button><button class="btn" id="rDel" style="color:#E5484D">Zmazať trasu</button></div>` : ''}
    ${mineRuns.length ? `<div class="rn-sec">Tvoje behy na tejto trase</div>${mineRuns.map(runRow).join('')}` : ''}`;
  $app().innerHTML = shell('', '', body).replace('<div class="rn-h"><h1></h1></div>', '');
  void count;
  mapIn($app().querySelector('#rnMap'), { path: r.path, colored: false, color: '#14A3B8' }).catch(() => { });
  $app().querySelector('#rRun').onclick = () => live.start({ kind: 'outdoor', route: { id: r.id, name: r.name, path: r.path } });
  $app().querySelector('#rPub')?.addEventListener('click', async () => {
    if (!r.public && r.from_run) {
      // pri zverejnení ešte raz odrežeme začiatok a koniec
      const p = RL.simplify(RL.privacyTrim(r.path), 600);
      await db.sb.from('run_routes').update({ public: true, path: p, start_lat: p[0][0], start_lng: p[0][1], distance_m: Math.round(RL.pathLen(p)) }).eq('id', r.id);
    } else await db.sb.from('run_routes').update({ public: !r.public }).eq('id', r.id);
    routeDetail(r.id);
  });
  $app().querySelector('#rDel')?.addEventListener('click', async () => { const { error } = await db.sb.from('run_routes').delete().eq('id', r.id); if (error) return toast('Nepodarilo sa zmazať.', true); toast('Trasa je zmazaná.'); location.hash = '#/beh/t'; });
}

// ---------- výzvy ----------
async function challengesScreen() {
  loading('Výzvy');
  let xs = []; try { xs = await runs(); } catch (_) { $app().innerHTML = shell('Výzvy', '', missing ? noDb() : ''); return; }
  const ch = RL.challenges(xs), m = ch.monthly, p = Math.min(1, m.done / m.target);
  const left = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate();
  const body = `<div class="rn-prog rn-ch" style="display:block" data-noskin>
      <b style="font-size:20px">${h(m.title)}</b><span>${p >= 1 ? 'Splnené! Si stroj. 🔥' : `Ešte ${RL.km(m.target - m.done, 1)} km, ${plural(left, 'ostáva deň', 'ostávajú dni', 'ostáva dní').replace(/^(\d+) (ostáva|ostávajú) /, '$2 $1 ')}`}</span>
      <div class="rn-mbar" style="background:rgba(255,255,255,.2)"><i style="width:${(p * 100).toFixed(1)}%;background:#fff"></i></div><span>${RL.km(m.done, 1)} / 50 km</span></div>
    ${ch.streak ? `<div class="rn-box" style="display:flex;align-items:center;gap:12px"><span style="font-size:30px">🔥</span><div><b>${plural(ch.streak, 'týždeň', 'týždne', 'týždňov')} v rade</b><div class="muted small">Aspoň jeden beh každý týždeň. Nepreruš to!</div></div></div>` : ''}
    <div class="rn-sec">Odznaky ${ch.badges.filter(b => b.ok).length}/${ch.badges.length}</div>
    <div class="rn-badges">${ch.badges.map(b => `<div class="rn-badge${b.ok ? '' : ' off'}"><i>${b.e}</i><b>${h(b.l)}</b><small>${h(b.d)}</small></div>`).join('')}</div>`;
  $app().innerHTML = shell('Výzvy', 'Odmeny a motivácia', body);
}

// ---------- Od gauča k 5 km ----------
async function programScreen() {
  loading('Od gauča k 5 km');
  let pr = null; try { pr = await program(); } catch (_) { }
  const nx = pr ? RL.nextC25K(pr.done) : RL.nextC25K([]);
  const done = new Set(pr?.done || []);
  const intro = `<div class="rn-box"><p style="margin:0;line-height:1.5">Program pre úplných začiatočníkov. <b>8 týždňov, 3 tréningy týždenne</b>, každý asi 30 minút. Začína sa striedaním minúty behu a chôdze, na konci odbehneš 30 minút v kuse, to je zhruba 5 km. Hlas ti povie, kedy bežať a kedy ísť krokom.</p></div>`;
  const weeks = RL.C25K.map(wk => `<div class="rn-wk"><b>Týždeň ${wk.w}</b><span>${h(RL.stepsSummary(wk.days[0]))}</span><div class="rn-dots">${[1, 2, 3].map(d => { const key = `${wk.w}-${d}`; return `<i class="${done.has(key) ? 'ok' : nx && nx.w === wk.w && nx.d === d ? 'nx' : ''}">${done.has(key) ? '✓' : d}</i>`; }).join('')}</div></div>`).join('');
  const body = `${!pr ? intro : ''}
    ${nx ? `<div class="rn-prog" style="display:block" data-noskin><span style="font-weight:800;font-size:13px;opacity:.85">${pr ? 'Ďalší tréning' : 'Prvý tréning'}</span><b style="font-size:22px;margin-top:4px">Týždeň ${nx.w}, deň ${nx.d}</b><span>${h(RL.stepsSummary(nx.steps))} · spolu ${Math.round(RL.stepsTotal(nx.steps) / 60)} min</span><span style="margin-top:8px;opacity:.8">💡 ${h(nx.tip)}</span>
      <button class="rn-start" id="pGo" style="margin-top:14px;background:#fff;color:#2A160C">${pr ? 'Začať tréning' : 'Začať program'}</button></div>`
      : `<div class="rn-prog" style="display:block" data-noskin><b style="font-size:22px">Program je hotový! 🏅</b><span>Zvládol si 24 tréningov. Teraz skús 5 km pod 30 minút v cieľoch.</span></div>`}
    <div class="rn-box"><h3>Plán</h3>${weeks}</div>
    ${pr ? '<button class="btn ghost" id="pReset" style="width:100%">Začať program odznova</button>' : ''}`;
  $app().innerHTML = shell('Od gauča k 5 km', pr ? `${pr.done.length} z 24 tréningov hotových` : 'Za 8 týždňov k prvým 5 km', body);
  $app().querySelector('#pGo')?.addEventListener('click', async () => {
    if (!pr) { const { error } = await db.sb.from('run_program').upsert({ user_id: uid(), plan: 'c25k', done: [], started_at: new Date().toISOString() }); if (error) return toast('Program sa nepodarilo spustiť.', true); }
    live.start({ kind: 'runwalk', steps: nx.steps, prog: { w: nx.w, d: nx.d } });
  });
  $app().querySelector('#pReset')?.addEventListener('click', async () => { await db.sb.from('run_program').upsert({ user_id: uid(), plan: 'c25k', done: [], started_at: new Date().toISOString(), updated_at: new Date().toISOString() }); programScreen(); });
}

// karta Beh na obrazovke Tréning + načítanie behov na pozadí pre podtitulok
let q = 0;
const app = document.getElementById('app');
if (app) new MutationObserver(() => { if (q) return; q = requestAnimationFrame(() => { q = 0; entry(); }); }).observe(app, { childList: true, subtree: true });
addEventListener('hashchange', () => { if ((location.hash || '').startsWith('#/trening') && !cache && !missing && st().profile) runs().then(() => { document.querySelector('.rn-entry')?.remove(); entry(); }).catch(() => { }); });
try { entry(); } catch (_) { }
