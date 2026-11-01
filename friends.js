// Kamaráti: týždenná tabuľka s ľuďmi, ktorých si pozveš kódom alebo odkazom.
// Kamaráti vidia len počty dní so zápisom, dní v cieli a tréningov za 7 dní, nikdy kalórie ani váhu.
// Týždenná výzva: každý týždeň (pondelok až nedeľa) rovnaká výzva pre celú skupinu, vidno len počty dní a tréningov.
// Karta sa vloží pod jedlá na obrazovke Dnes (bez zásahu do today.js). Pozvánka: #/kamarat/KÓD.
import { sb } from './data.js';
import { ctx } from './app.js';
import { EXERCISES } from './workouts.js';
import { allTemplates } from './laura-plans.js';

const ls = { get: k => { try { return localStorage.getItem(k); } catch (_) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) { /* nič */ } }, del: k => { try { localStorage.removeItem(k); } catch (_) { /* nič */ } } };
const PEND = 'fw_fr_pending';

const CSS = `
.fr-card{display:flex;align-items:center;gap:12px;width:100%;margin:0 0 14px;padding:13px 14px;border-radius:18px;border:1px solid var(--line);background:linear-gradient(160deg,rgba(124,255,178,.10),rgba(124,255,178,.02));color:var(--text);font:inherit;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent}
.fr-card:active{transform:scale(.985)}
.fr-card>span{font-size:24px}.fr-card div{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0}.fr-card b{font-size:15px}.fr-card small{font-size:12.5px;color:var(--muted)}.fr-card i{font-style:normal;font-size:22px;color:var(--muted)}
.fr-card.fr-new small{color:var(--accent);font-weight:700}
.fr-h{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}.fr-h h3{margin:0;font-size:24px;font-weight:800;letter-spacing:-.02em}.fr-h small{display:block;color:var(--muted);font-size:13px;margin-top:2px}
.fr-h .del{flex:none;width:36px;height:36px;border-radius:50%;border:1px solid var(--line);background:var(--bg-2,var(--card-2));color:var(--text);font-size:22px;line-height:1;display:grid;place-items:center;cursor:pointer}
.fr-av{flex:none;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-size:13px;font-weight:800;color:#0B1512;background:var(--c,#7CFFB2);letter-spacing:-.01em}
.fr-av.me{box-shadow:0 0 0 2px var(--bg-2,#0B1512),0 0 0 4px var(--accent)}
/* výzva týždňa */
.fr-ch{position:relative;margin:0 0 18px;padding:16px;border-radius:22px;overflow:hidden;border:1px solid color-mix(in srgb,var(--accent) 35%,transparent);
  background:radial-gradient(120% 90% at 100% 0%,color-mix(in srgb,var(--accent) 22%,transparent),transparent 60%),var(--card-2)}
.fr-ch-h{display:flex;align-items:center;gap:12px}
.fr-ch-i{flex:none;width:48px;height:48px;border-radius:15px;display:grid;place-items:center;font-size:25px;background:color-mix(in srgb,var(--accent) 20%,transparent)}
.fr-ch-h div{flex:1;min-width:0}.fr-tag{display:inline-block;font-size:11.5px;font-weight:800;padding:3px 9px;border-radius:99px;background:var(--accent);color:var(--accent-ink,#06210f);margin-bottom:4px}
.fr-ch-h b{display:block;font-size:18px;font-weight:800;letter-spacing:-.01em;line-height:1.2}
.fr-ch p{font-size:13.5px;line-height:1.45;margin:12px 0 14px;color:var(--muted)}
.fr-pr{display:flex;align-items:center;gap:10px;margin-bottom:10px;font-size:14px}
.fr-pr .fr-av{flex:0 0 28px;width:28px;height:28px;font-size:11px}
.fr-pr>span:not(.fr-av){flex:0 0 64px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}.fr-pr.me>span:not(.fr-av){font-weight:800}
.fr-pr i{flex:1;height:10px;border-radius:99px;background:color-mix(in srgb,var(--text) 10%,transparent);overflow:hidden}.fr-pr i b{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--accent),color-mix(in srgb,var(--accent) 60%,#5BB8FF));transition:width .5s ease}
.fr-pr em{flex:0 0 46px;text-align:right;font-style:normal;font-weight:700;font-variant-numeric:tabular-nums;color:var(--muted)}.fr-pr em.ok{color:var(--accent)}
.fr-team{margin-top:12px;padding-top:12px;border-top:1px solid var(--line)}
.fr-last{font-size:12.5px;color:var(--muted);line-height:1.45;margin:12px 0 0;padding-top:10px;border-top:1px solid var(--line)}
/* rebríček */
.fr-sec{display:flex;align-items:baseline;justify-content:space-between;margin:4px 2px 10px}.fr-sec b{font-size:17px;font-weight:800}.fr-sec small{font-size:12.5px;color:var(--muted)}
.fr-sub{font-size:13px;color:var(--muted);margin:4px 0 12px;line-height:1.45}
.fr-row{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:18px;border:1px solid var(--line);background:var(--card-2);margin-bottom:8px}
.fr-row.me{border-color:color-mix(in srgb,var(--accent) 50%,transparent);background:linear-gradient(160deg,color-mix(in srgb,var(--accent) 14%,transparent),transparent),var(--card-2)}
.fr-rk{flex:0 0 24px;text-align:center;font-size:15px;font-weight:800;color:var(--muted);font-variant-numeric:tabular-nums}
.fr-rk.g1{color:#FFC94D}.fr-rk.g2{color:#C9D3DD}.fr-rk.g3{color:#E39A5B}
.fr-n{flex:1;min-width:0}.fr-n b{display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fr-st{display:flex;gap:10px;margin-top:3px;font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}.fr-st span{white-space:nowrap}
.fr-p{flex:0 0 auto;text-align:right;font-size:21px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums}.fr-p small{display:block;font-size:11px;font-weight:600;color:var(--muted);margin-top:3px}
.fr-how{margin:2px 2px 0;font-size:12px;color:var(--muted);line-height:1.5}
/* pozvánka */
.fr-box{margin-top:16px;padding:16px;border-radius:22px;border:1px solid var(--line);background:var(--card-2)}
.fr-box>b{display:block;font-size:16px;font-weight:800}.fr-box>small{display:block;color:var(--muted);font-size:13px;line-height:1.4;margin-top:3px}
.fr-codew{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:14px 0 12px;padding:12px 14px;border-radius:16px;border:1.5px dashed color-mix(in srgb,var(--accent) 45%,var(--line))}
.fr-codew small{color:var(--muted);font-size:12px}
.fr-code{font-family:ui-monospace,Menlo,monospace;font-size:24px;font-weight:800;letter-spacing:.16em;margin:0}
.fr-btns{display:flex;gap:8px;flex-wrap:wrap}.fr-btns button{white-space:nowrap;padding-left:8px;padding-right:8px}
.fr-box .fr-btns #frShare{flex:1 1 100%!important}.fr-box .fr-btns #frCopy,.fr-box .fr-btns #frQr{flex:1 1 calc(50% - 4px)!important;min-width:0}
.fr-join{margin-top:10px;border-radius:18px;border:1px solid var(--line);background:var(--card-2)}
.fr-join summary{list-style:none;cursor:pointer;padding:14px 16px;font-size:14.5px;font-weight:700;display:flex;justify-content:space-between;align-items:center}
.fr-join summary::-webkit-details-marker{display:none}.fr-join summary::after{content:'›';font-size:20px;color:var(--muted);transition:transform .2s}.fr-join[open] summary::after{transform:rotate(90deg)}
.fr-join .fr-add{display:flex;gap:8px;padding:0 16px 16px;align-items:stretch}.fr-join .fr-add button{width:auto;flex:0 0 auto;padding:0 20px}.fr-join .fr-add input{width:0;flex:1 1 0;min-width:0;text-transform:uppercase;letter-spacing:.12em;font-family:ui-monospace,Menlo,monospace}
.fr-note{display:flex;gap:8px;font-size:12px;color:var(--muted);line-height:1.5;margin:14px 2px 0}.fr-note i{font-style:normal}
/* tréningy kamarátov */
.fr-feed{margin:0 0 18px}
.fr-it{padding:14px;border-radius:20px;border:1px solid var(--line);background:var(--card-2);margin-bottom:8px}
.fr-it-h{display:flex;align-items:center;gap:10px}.fr-it-h div{flex:1;min-width:0}.fr-it-h b{display:block;font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fr-it-h small{display:block;font-size:12px;color:var(--muted)}
.fr-it-d{display:block;font-size:12px;font-weight:700;color:var(--muted);text-transform:none}.fr-it-t.np{margin-top:2px}
.fr-it-t{margin:10px 0 0;font-size:16px;font-weight:800;letter-spacing:-.01em;line-height:1.25}
.fr-it-s{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.fr-it-s span{font-size:12.5px;font-weight:600;padding:5px 9px;border-radius:99px;background:color-mix(in srgb,var(--text) 7%,transparent);font-variant-numeric:tabular-nums}
.fr-it-f{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px}.fr-it-f small{font-size:12.5px;color:var(--muted);min-width:0}
.fr-kd{flex:none;display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 14px;border-radius:99px;border:1px solid var(--line);background:transparent;color:var(--text);font:inherit;font-size:14px;font-weight:700;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .15s,background .2s}
.fr-kd:active{transform:scale(.92)}.fr-kd.on{border-color:transparent;background:color-mix(in srgb,var(--accent) 22%,transparent);color:var(--accent)}
.fr-kd.pop i{animation:frPop .45s cubic-bezier(.3,1.6,.5,1)}.fr-kd i{font-style:normal;display:inline-block}
@keyframes frPop{0%{transform:scale(1)}40%{transform:scale(1.5) rotate(-12deg)}100%{transform:scale(1)}}
.fr-it.me .fr-it-f small{color:var(--accent);font-weight:600}
.fr-opt{padding:16px;border-radius:20px;margin-bottom:10px;border:1px solid color-mix(in srgb,var(--accent) 35%,transparent);background:linear-gradient(160deg,color-mix(in srgb,var(--accent) 12%,transparent),transparent),var(--card-2)}
.fr-opt b{display:block;font-size:15.5px;font-weight:800}.fr-opt p{margin:4px 0 12px;font-size:13px;line-height:1.45;color:var(--muted)}.fr-opt .fr-btns button{flex:1 1 0}
.fr-more{display:block;width:100%;padding:10px;border:0;background:none;color:var(--muted);font:inherit;font-size:13.5px;font-weight:700;cursor:pointer}
.fr-tg{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px;padding:14px 16px;border-radius:18px;border:1px solid var(--line);background:var(--card-2);font-size:14px;font-weight:600}
.fr-tg small{display:block;font-weight:500;font-size:12px;color:var(--muted);margin-top:2px}
.fr-sw{flex:none;position:relative;width:48px;height:28px;border-radius:99px;background:color-mix(in srgb,var(--text) 16%,transparent);border:0;cursor:pointer;transition:background .2s}
.fr-sw::after{content:'';position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.3)}
.fr-sw[aria-checked=true]{background:var(--accent)}.fr-sw[aria-checked=true]::after{transform:translateX(20px)}
@media (prefers-reduced-motion:reduce){.fr-kd.pop i{animation:none}}
[data-uid]{cursor:pointer;-webkit-tap-highlight-color:transparent}
.fr-it-h[data-uid] b::after,.fr-row[data-uid] .fr-n b::after{content:' ›';color:var(--muted);font-weight:600}
/* profil kamaráta */
.fp-top{display:flex;align-items:center;justify-content:space-between;margin:-4px 0 12px}.sheet.fp-on .fr-h{display:none}
.fp-back{display:inline-flex;align-items:center;gap:4px;margin:0;padding:6px 10px 6px 4px;border:0;background:none;color:var(--muted);font:inherit;font-size:14.5px;font-weight:700;cursor:pointer}
.fp-hero{position:relative;display:flex;align-items:center;gap:16px;padding:18px;border-radius:24px;overflow:hidden;border:1px solid var(--line);
  background:radial-gradient(120% 100% at 0% 0%,color-mix(in srgb,var(--c) 30%,transparent),transparent 62%),var(--card-2)}
.fp-hero .fr-av{width:72px;height:72px;font-size:26px;flex:0 0 72px}.fp-hero .fr-av.me{box-shadow:0 0 0 3px var(--bg-2,#0B1512),0 0 0 6px var(--accent)}
.fp-hero h4{margin:0;font-size:22px;font-weight:800;letter-spacing:-.02em;line-height:1.15}.fp-hero small{display:block;margin-top:4px;color:var(--muted);font-size:13px}
.fp-me{display:inline-block;margin-top:6px;font-size:11.5px;font-weight:800;padding:3px 9px;border-radius:99px;background:var(--accent);color:var(--accent-ink,#06210f)}
.fp-st{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0 18px}
.fp-st div{padding:14px 10px 12px;border-radius:18px;border:1px solid var(--line);background:var(--card-2);text-align:center}
.fp-st i{display:block;font-style:normal;font-size:20px;line-height:1}.fp-st b{display:block;margin-top:6px;font-size:22px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums}
.fp-st small{display:block;margin-top:4px;font-size:11.5px;color:var(--muted);line-height:1.25}
.fp-cal{padding:16px;border-radius:20px;border:1px solid var(--line);background:var(--card-2);margin-bottom:18px}
.fp-grid{display:grid;grid-template-columns:18px repeat(12,1fr);gap:4px;margin-top:12px}
.fp-grid span{font-size:9.5px;color:var(--muted);line-height:1;display:flex;align-items:center}
.fp-grid i{aspect-ratio:1;border-radius:5px;background:color-mix(in srgb,var(--text) 8%,transparent)}
.fp-grid i.on{background:linear-gradient(135deg,var(--accent),color-mix(in srgb,var(--accent) 55%,#5BB8FF));box-shadow:0 0 10px color-mix(in srgb,var(--accent) 35%,transparent)}
.fp-grid i.today{outline:2px solid color-mix(in srgb,var(--accent) 60%,transparent);outline-offset:1px}.fp-grid i.fut{opacity:.25}
.fp-cal-f{display:flex;justify-content:space-between;margin-top:10px;font-size:12px;color:var(--muted)}
.fp-best{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:16px;border:1px solid var(--line);background:var(--card-2);margin-bottom:8px}
.fp-best>i{flex:none;width:36px;height:36px;border-radius:12px;display:grid;place-items:center;font-style:normal;font-size:17px;background:color-mix(in srgb,var(--accent) 16%,transparent)}
.fp-best div{flex:1;min-width:0}.fp-best b{display:block;font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fp-best small{display:block;font-size:12px;color:var(--muted);margin-top:1px}
.fp-best em{flex:none;font-style:normal;font-weight:800;font-size:16px;font-variant-numeric:tabular-nums}
.fp-lock{padding:16px;border-radius:20px;border:1px dashed var(--line);color:var(--muted);font-size:13.5px;line-height:1.5;margin-bottom:18px;text-align:center}.fp-lock b{display:block;color:var(--text);font-size:15px;margin-bottom:4px}
.fp-lock .btn{margin-top:12px}
.fp-x{flex:none;width:36px;height:36px;border-radius:50%;border:1px solid var(--line);background:var(--bg-2,var(--card-2));color:var(--text);font-size:22px;line-height:1;display:grid;place-items:center;cursor:pointer}
.fp-rm{display:block;width:100%;margin-top:18px;padding:13px;border-radius:16px;border:1px solid var(--line);background:none;color:var(--muted);font:inherit;font-size:14px;font-weight:700;cursor:pointer}
.fp-rm.sure{border-color:var(--danger,#FF5C7A);color:var(--danger,#FF5C7A)}

.fr-empty{text-align:center;padding:20px 12px;border-radius:18px;border:1px dashed var(--line);color:var(--muted);font-size:13.5px;line-height:1.5}.fr-empty b{display:block;font-size:16px;color:var(--text);margin-bottom:4px}
`;

const days = n => (n === 1 ? 'deň' : n >= 2 && n <= 4 ? 'dni' : 'dní');
const trn = n => (n === 1 ? 'tréning' : n >= 2 && n <= 4 ? 'tréningy' : 'tréningov');
const AVC = ['#7CFFB2', '#FFC857', '#FF8FB1', '#8EC5FF', '#C9A7FF', '#FFAE7A', '#7FE3E0'];
const initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
const avColor = n => { let x = 0; for (const c of String(n || '')) x = (x * 31 + c.charCodeAt(0)) >>> 0; return AVC[x % AVC.length]; };
const firstName = n => String(n || 'Kamarát').trim().split(/\s+/)[0];
const av = (h, name, me) => `<span class="fr-av${me ? ' me' : ''}" style="--c:${avColor(name)}">${h(initials(name))}</span>`;

let cache = null, cacheAt = 0;
async function board(force) {
  if (!force && cache && Date.now() - cacheAt < 30000) return cache;
  const { data, error } = await sb.rpc('friends_board');
  if (error) throw error;
  cache = Array.isArray(data) ? data : []; cacheAt = Date.now();
  return cache;
}

// ---------- týždenná výzva ----------
const CHALLENGES = [
  { id: 'log', icon: '📝', title: 'Zapíš 6 dní', text: 'Zapíš jedlo aspoň v 6 dňoch z 7. Nemusí byť dokonalé, dôležité je vedieť, čo jete.', key: 'logged', goal: 6, unit: 'dní' },
  { id: 'prot', icon: '💪', title: 'Bielkovinový týždeň', text: 'Dosiahni aspoň 90 % denného cieľa bielkovín v 5 dňoch.', key: 'prot', goal: 5, unit: 'dní' },
  { id: 'trn', icon: '🏋️', title: 'Tréningový týždeň', text: 'Odcvič 3 tréningy v tomto týždni.', key: 'workouts', goal: 3, unit: 'tréningov' },
  { id: 'tgt', icon: '🎯', title: 'Presný týždeň', text: 'Buď v cieli kalórií (85 až 110 %) aspoň 4 dni. Počítajú sa dokončené dni, dnešok až zajtra.', key: 'ontarget', goal: 4, unit: 'dní' },
  { id: 'team', icon: '🤝', title: 'Spolu to dáme', text: 'Spoločný cieľ: dokopy 3 tréningy na každého z vás. Každý tréning sa počíta.', key: 'workouts', goal: 3, unit: 'tréningov', team: true },
  { id: 'perf', icon: '⭐', title: 'Dokonalé dni', text: 'Kalórie v cieli a bielkoviny splnené v 3 dňoch. Počítajú sa dokončené dni.', key: 'perfect', goal: 3, unit: 'dní' },
];
const parseDay = d => { const [y, m, dd] = String(d).slice(0, 10).split('-').map(Number); return Date.UTC(y, m - 1, dd); };
const challengeFor = ws => CHALLENGES[Math.floor(parseDay(ws) / 86400000 / 7) % CHALLENGES.length];
let chCache = null, chAt = 0;
async function challengeData(force) {
  if (!force && chCache && Date.now() - chAt < 30000) return chCache;
  const [cur, prev] = await Promise.all([sb.rpc('friends_challenge', { p_offset: 0 }), sb.rpc('friends_challenge', { p_offset: 1 })]);
  if (cur.error) throw cur.error;
  chCache = { cur: cur.data, prev: prev.error ? null : prev.data }; chAt = Date.now();
  return chCache;
}
const leftTxt = n => (n <= 1 ? 'Dnes je posledný deň' : `Zostáva ${n} ${days(n)}`);
function challengeHtml(d, h, profOn) {
  const rows = d?.cur?.rows || [];
  if (!d?.cur?.week_start || !rows.length) return '';
  const ch = challengeFor(d.cur.week_start);
  const left = Math.round((parseDay(d.cur.week_end) - parseDay(d.cur.today)) / 86400000) + 1;
  const goal = ch.goal;
  const bar = (name, val, g, me, full, uid) => `<div class="fr-pr${me ? ' me' : ''}"${uid && profOn ? ` data-uid="${h(uid)}"` : ''}>${full !== false ? av(h, full || name, me) : ''}<span>${h(name)}</span><i><b style="width:${Math.min(100, g ? val / g * 100 : 0)}%"></b></i><em class="${val >= g ? 'ok' : ''}">${val >= g ? '✓ ' : ''}${val}/${g}</em></div>`;
  const sorted = rows.slice().sort((a, b) => (b[ch.key] - a[ch.key]) || (b.me - a.me) || String(a.name).localeCompare(String(b.name)));
  const solo = rows.length === 1;
  let body;
  if (ch.team) {
    const tot = rows.reduce((a, r) => a + (r[ch.key] || 0), 0), tg = goal * rows.length;
    body = sorted.map(r => bar(r.me ? 'Ty' : firstName(r.name), r[ch.key] || 0, goal, r.me, r.name || 'Ty', r.id)).join('')
      + `<div class="fr-team">${bar('Spolu', tot, tg, false, false)}</div>`;
  } else {
    body = sorted.map(r => bar(r.me ? 'Ty' : firstName(r.name), r[ch.key] || 0, goal, r.me, r.name || 'Ty', r.id)).join('');
  }
  let last = '';
  if (d.prev?.week_start && (d.prev.rows || []).length) {
    const pc = challengeFor(d.prev.week_start), pr = d.prev.rows;
    const ok = pc.team ? (pr.reduce((a, r) => a + (r[pc.key] || 0), 0) >= pc.goal * pr.length ? pr : []) : pr.filter(r => (r[pc.key] || 0) >= pc.goal);
    const any = pr.some(r => (r.logged || 0) > 0 || (r.workouts || 0) > 0);
    if (any) {
      const names = ok.map(r => (r.me ? 'ty' : (r.name || 'kamarát')));
      last = `<p class="fr-last">Minulý týždeň (${h(pc.title)}): ${pc.team ? (ok.length ? 'splnili ste to spolu ✓' : 'spoločný cieľ ste nedali') : (names.length ? 'splnil' + (names.length > 1 ? 'i' : '') + ' ' + names.map(h).join(', ') : 'nikto to nedotiahol')}.</p>`;
    }
  }
  return `<div class="fr-ch"><div class="fr-ch-h"><span class="fr-ch-i">${ch.icon}</span><div><span class="fr-tag">Výzva týždňa · ${leftTxt(left).toLowerCase()}</span><b>${h(ch.title)}</b></div></div>
    <p>${h(ch.text)}${solo ? ' Pozvi kamaráta a pretekajte sa.' : ''}</p>${body}${last}</div>`;
}

// ---------- tréningy kamarátov a pochvala ----------
const KSEEN = 'fw_kudo_seen';
let fdCache = null, fdAt = 0;
async function feed(force) {
  if (!force && fdCache && Date.now() - fdAt < 30000) return fdCache;
  const { data, error } = await sb.rpc('friends_feed', { p_limit: 30 });
  if (error) throw error;
  fdCache = Array.isArray(data) ? data : []; fdAt = Date.now();
  return fdCache;
}
const WD = ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'];
function whenTxt(d) {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const [y, m, dd] = String(d).split('-').map(Number); const x = new Date(y, m - 1, dd);
  const diff = Math.round((t - x) / 86400000);
  return diff <= 0 ? 'dnes' : diff === 1 ? 'včera' : `${WD[x.getDay()]} ${dd}. ${m}.`;
}
const fmtKg = v => Number(v).toLocaleString('sk-SK');
const names2 = a => a.length === 1 ? a[0] : a.length === 2 ? `${a[0]} a ${a[1]}` : `${a[0]}, ${a[1]} a ďalší`;
function itemHtml(it, h, inProfile) {
  const stats = [];
  if (it.duration_min > 0) stats.push(`⏱ ${it.duration_min} min`);
  if (it.sets > 0) stats.push(`${it.sets} ${it.sets === 1 ? 'séria' : it.sets <= 4 ? 'série' : 'sérií'}`);
  if (it.volume > 0) stats.push(`${fmtKg(it.volume)} kg objem`);
  const by = (it.by || []).map(firstName);
  const foot = it.me
    ? `<small>${it.kudos ? `💪 ${h(names2(by))} ${it.kudos > 1 ? 'ťa pochválili' : 'ťa pochválil(a)'}` : 'Zatiaľ bez pochvaly'}</small>`
    : `<small>${it.kudos ? `${it.kudos}× pochvala` : ''}</small><button class="fr-kd${it.mine ? ' on' : ''}" data-kd="${it.id}" aria-pressed="${it.mine ? 'true' : 'false'}" aria-label="Pochváliť ${h(firstName(it.name))}"><i>💪</i>${it.mine ? 'Pochválené' : 'Pochváliť'}</button>`;
  const head = inProfile ? `<small class="fr-it-d">${whenTxt(it.date)}</small>`
    : `<div class="fr-it-h"${it.user_id ? ` data-uid="${h(it.user_id)}"` : ''}>${av(h, it.name || 'Ty', it.me)}<div><b class="notranslate">${it.me ? 'Ty' : h(it.name || 'Kamarát')}</b><small>${whenTxt(it.date)} · ${it.me ? 'tvoj tréning' : (it.sex === 'f' ? 'odcvičila tréning' : 'odcvičil tréning')}</small></div></div>`;
  return `<div class="fr-it${it.me ? ' me' : ''}">${head}
    <div class="fr-it-t${inProfile ? ' np' : ''}">${h(it.day_name || 'Tréning')}</div>${stats.length ? `<div class="fr-it-s">${stats.map(x => `<span>${x}</span>`).join('')}</div>` : ''}
    <div class="fr-it-f">${foot}</div></div>`;
}
function feedHtml(items, me, others, h, all) {
  if (items == null) return ''; // tréningy ešte nie sú zapnuté na serveri
  const optIn = me.share_workouts == null && others
    ? `<div class="fr-opt"><b>Ukáž kamarátom svoje tréningy</b><p>Uvidia tvoje tréningy (názov, dĺžku, série, objem), kalendár a najlepšie výkony a môžu ťa pochváliť. Nikdy nie jedlo, kalórie ani váhu.</p><div class="fr-btns"><button class="btn primary" data-share="1">Zdieľať</button><button class="btn ghost" data-share="0">Teraz nie</button></div></div>` : '';
  const shown = all ? items : items.slice(0, 5);
  const friendsAny = items.some(i => !i.me);
  const list = shown.length ? shown.map(i => itemHtml(i, h)).join('') : '';
  const empty = !friendsAny ? `<div class="fr-empty"><b>${others ? 'Zatiaľ ticho' : 'Tréningy kamarátov'}</b>${others ? 'Keď kamarát odcvičí tréning a zdieľa ho, uvidíš ho tu a môžeš ho pochváliť.' : 'Pozvi kamaráta a uvidíte navzájom svoje tréningy.'}</div>` : '';
  return `<div class="fr-feed"><div class="fr-sec"><b>Tréningy</b><small>posledných 14 dní</small></div>${optIn}${list}${items.length > shown.length ? `<button class="fr-more" data-more>Zobraziť všetky (${items.length})</button>` : ''}${empty}</div>`;
}

// ---------- profil kamaráta ----------
let exNames = null;
function exName(id) {
  if (!exNames) {
    exNames = {};
    Object.values(EXERCISES).forEach(e => { exNames[e.id] = e.name; });
    try { allTemplates().forEach(t => t.parsed.forEach(d => d.exercises.forEach(e => { if (!exNames[e.id]) exNames[e.id] = e.name.replace(/\s*\(.*\)$/, ''); }))); } catch (_) { }
  }
  return exNames[id] || String(id).replace(/^l_/, '').replace(/_\d+$/, '').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
}
const MON = ['jan', 'feb', 'mar', 'apr', 'máj', 'jún', 'júl', 'aug', 'sep', 'okt', 'nov', 'dec'];
const dShort = t => { const d = new Date(t); return isNaN(d) ? '' : `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`; };
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function calHtml(daysList, total) {
  const set = new Set(daysList || []);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dow = (today.getDay() + 6) % 7; // Po = 0
  const start = new Date(today); start.setDate(today.getDate() - dow - 7 * 11); // pondelok pred 11 týždňami
  const L = ['Po', '', 'St', '', 'Pi', '', 'Ne'];
  let cells = '';
  for (let r = 0; r < 7; r++) {
    cells += `<span>${L[r]}</span>`;
    for (let c = 0; c < 12; c++) {
      const d = new Date(start); d.setDate(start.getDate() + c * 7 + r);
      const k = ymd(d), fut = d > today;
      cells += `<i class="${set.has(k) ? 'on' : ''}${k === ymd(today) ? ' today' : ''}${fut ? ' fut' : ''}" title="${d.getDate()}. ${d.getMonth() + 1}."></i>`;
    }
  }
  const n = (daysList || []).length;
  return `<div class="fp-cal"><div class="fr-sec" style="margin:0"><b>Tréningy</b><small>posledných 12 týždňov</small></div><div class="fp-grid">${cells}</div>
    <div class="fp-cal-f"><span>${n} ${n === 1 ? 'tréning' : n >= 2 && n <= 4 ? 'tréningy' : 'tréningov'} za 12 týždňov</span><span>${total != null ? `${total} spolu` : ''}</span></div></div>`;
}
function profileHtml(pf, h, meProfile) {
  const nm = pf.name || (pf.me ? meProfile?.name : '') || (pf.me ? 'Ty' : 'Kamarát');
  const fn = firstName(nm), she = pf.sex === 'f';
  const wk = pf.week || {};
  const sub = pf.me ? '' : pf.since ? `Kamaráti od ${dShort(pf.since)}` : '';
  let html = `<div class="fp-top"><button class="fp-back" data-back>‹ Kamaráti</button><button class="del fp-x" data-close aria-label="Zavrieť">×</button></div>
    <div class="fp-hero" style="--c:${avColor(nm)}">${av(h, nm, pf.me)}<div><h4 class="notranslate">${h(nm)}</h4>${sub ? `<small>${sub}</small>` : ''}${pf.me ? '<span class="fp-me">Takto ťa vidia kamaráti</span>' : ''}</div></div>
    <div class="fp-st">
      <div><i>🔥</i><b>${pf.streak || 0}</b><small>${(pf.streak || 0) === 1 ? 'deň' : (pf.streak || 0) >= 2 && (pf.streak || 0) <= 4 ? 'dni' : 'dní'} so zápisom v rade</small></div>
      <div><i>🏋️</i><b>${pf.month_workouts || 0}</b><small>${(pf.month_workouts || 0) === 1 ? 'tréning' : (pf.month_workouts || 0) >= 2 && (pf.month_workouts || 0) <= 4 ? 'tréningy' : 'tréningov'} za 30 dní</small></div>
      <div><i>🎯</i><b>${wk.ontarget || 0}/7</b><small>dní v cieli tento týždeň</small></div>
    </div>`;
  if (pf.shares) {
    html += calHtml(pf.days, pf.total);
    const bests = (pf.bests || []).filter(b => b.kg > 0).sort((a, b) => b.kg - a.kg);
    if (bests.length) html += `<div class="fr-sec"><b>Najlepšie výkony</b><small>posledné pol roka</small></div>`
      + bests.map((b, i) => `<div class="fp-best"><i>${i === 0 ? '🏆' : '💪'}</i><div><b>${h(exName(b.ex))}</b><small>${whenTxt(b.date)}</small></div><em>${fmtKg(b.kg)} kg × ${b.reps}</em></div>`).join('') + '<div style="height:10px"></div>';
    const ws = pf.workouts || [];
    html += `<div class="fr-sec"><b>Posledné tréningy</b><small>30 dní</small></div>` + (ws.length ? ws.slice(0, 10).map(it => itemHtml({ ...it, name: nm }, h, true)).join('')
      : `<div class="fr-empty"><b>Zatiaľ bez tréningu</b>${pf.me ? 'Keď odcvičíš a ukončíš tréning, objaví sa tu.' : `Keď ${fn} ${she ? 'odcvičí' : 'odcvičí'} tréning, uvidíš ho tu.`}</div>`);
  } else if (pf.me) {
    html += `<div class="fp-lock"><b>Kamaráti teraz vidia len počty</b>Zapni zdieľanie tréningov a uvidia tvoj kalendár, tréningy a najlepšie výkony. Nikdy nie jedlo, kalórie ani váhu.<br><button class="btn primary" data-share="1">Zdieľať moje tréningy</button></div>`;
  } else {
    html += `<div class="fp-lock"><b>🔒 ${h(fn)} tréningy nezdieľa</b>Vidíš len počty v rebríčku. Keď si zdieľanie ${she ? 'zapne' : 'zapne'}, uvidíš ${she ? 'jej' : 'jeho'} kalendár, tréningy a najlepšie výkony.</div>`;
  }
  if (!pf.me) html += `<button class="fp-rm" data-rm>Odobrať z kamarátov</button>`;
  return html;
}

function linkFor(code) { return `${location.origin}${location.pathname}#/kamarat/${code}`; }

async function openFriends() {
  const h = (...a) => ctx.h(...a);
  const me = ctx.state?.profile;
  if (!me) return;
  let code = me.friend_code || '';
  if (!code) { try { const { data } = await sb.from('profiles').select('friend_code').eq('id', me.id).maybeSingle(); code = data?.friend_code || ''; me.friend_code = code; } catch (_) { /* bez kódu */ } }
  const bg = ctx.sheet('<div class="fr-h"><div><h3>Kamaráti</h3><small>Výzva, tréningy a rebríček s ľuďmi, ktorých poznáš</small></div><button class="del" data-x aria-label="Zavrieť">×</button></div><div id="frBody"><p class="fr-sub">Načítavam…</p></div>');
  bg.querySelector('[data-x]').onclick = () => bg.remove();
  const body = bg.querySelector('#frBody');
  let showAll = false;
  const bindKudos = (root, list, redraw) => root.querySelectorAll('[data-kd]').forEach(b => b.onclick = async () => {
    const id = Number(b.dataset.kd), it = list.find(x => x.id === id); if (!it || b.disabled) return;
    const on = !it.mine; it.mine = on; it.kudos = Math.max(0, (it.kudos || 0) + (on ? 1 : -1));
    b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); b.lastChild.textContent = on ? 'Pochválené' : 'Pochváliť';
    const sm = b.previousElementSibling; if (sm) sm.textContent = it.kudos ? `${it.kudos}× pochvala` : '';
    if (on) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); try { navigator.vibrate?.(15); } catch (_) { } }
    b.disabled = true; fdCache = null;
    try { const { error } = await sb.rpc('give_kudos', { p_log: id, p_on: on }); if (error) throw error; }
    catch (e) { it.mine = !on; it.kudos = Math.max(0, it.kudos + (on ? -1 : 1)); ctx.toast(e.message || 'Nepodarilo sa', true); redraw(); }
    finally { b.disabled = false; }
  });
  const sheetEl = bg.querySelector('.sheet') || bg;
  const openProfile = async (uid) => {
    body.innerHTML = '<p class="fr-sub">Načítavam…</p>'; sheetEl.scrollTop = 0;
    let pf;
    try { const { data, error } = await sb.rpc('friend_profile', { p_user: uid }); if (error) throw error; pf = data; }
    catch (e) { sheetEl.classList.remove('fp-on'); body.innerHTML = `<button class="fp-back" data-back>‹ Kamaráti</button><p class="fr-sub">${h(e.message || 'Profil sa nepodarilo načítať.')}</p>`; body.querySelector('[data-back]').onclick = () => draw(true); return; }
    const paint = () => {
      sheetEl.classList.add('fp-on');
      body.innerHTML = profileHtml(pf, h, me);
      body.querySelector('[data-back]').onclick = () => { sheetEl.classList.remove('fp-on'); draw(false).then(() => { sheetEl.scrollTop = 0; }); };
      body.querySelector('[data-close]').onclick = () => bg.remove();
      bindKudos(body, pf.workouts || [], paint);
      body.querySelector('[data-share]')?.addEventListener('click', async () => {
        try { const { error } = await sb.from('profiles').update({ share_workouts: true }).eq('id', me.id); if (error) throw error; me.share_workouts = true; fdCache = null; ctx.toast('Kamaráti uvidia tvoje tréningy'); openProfile(uid); }
        catch (_) { ctx.toast('Nepodarilo sa uložiť', true); }
      });
      const rm = body.querySelector('[data-rm]');
      if (rm) rm.onclick = async () => {
        if (!rm.classList.contains('sure')) { rm.classList.add('sure'); rm.textContent = 'Naozaj odobrať? Ťukni ešte raz'; setTimeout(() => { if (rm.isConnected) { rm.classList.remove('sure'); rm.textContent = 'Odobrať z kamarátov'; } }, 4000); return; }
        rm.disabled = true;
        try { const { error } = await sb.rpc('remove_friend', { p_user: uid }); if (error) throw error; cache = null; chCache = null; fdCache = null; sheetEl.classList.remove('fp-on'); ctx.toast(`${firstName(pf.name)} už nie je v tvojich kamarátoch`); draw(true); }
        catch (e) { ctx.toast(e.message || 'Nepodarilo sa', true); rm.disabled = false; }
      };
    };
    paint();
  };
  const draw = async (force) => {
    sheetEl.classList.remove('fp-on');
    let rows = [], chd = null, items = null;
    try { [rows, chd, items] = await Promise.all([board(force), challengeData(force).catch(() => null), feed(force).catch(() => null)]); } catch (e) { body.innerHTML = '<p class="fr-sub">Tabuľku sa nepodarilo načítať. Skús to o chvíľu.</p>'; return; }
    const others = rows.filter(r => !r.me).length;
    if (items) { const lk = items.filter(i => i.me && i.last_kudo).map(i => i.last_kudo).sort().pop(); if (lk) ls.set(KSEEN, lk); }
    body.innerHTML = `${challengeHtml(chd, h, !!items)}
      ${feedHtml(items, me, others, h, showAll)}
      <div class="fr-sec"><b>Rebríček</b><small>posledných 7 dní</small></div>
      ${others ? rows.map((r, i) => `<div class="fr-row${r.me ? ' me' : ''}"${r.id && items ? ` data-uid="${h(r.id)}" role="button" tabindex="0" aria-label="Profil: ${h(r.name || 'Kamarát')}"` : ''}><div class="fr-rk${i < 3 ? ' g' + (i + 1) : ''}">${i + 1}</div>${av(h, r.name || 'Ty', r.me)}
        <div class="fr-n"><b class="notranslate">${h(r.name || 'Kamarát')}${r.me ? ' (ty)' : ''}</b><div class="fr-st"><span>📝 ${r.logged} ${days(r.logged)}</span><span>🎯 ${r.ontarget} v cieli</span><span>🏋️ ${r.workouts}</span></div></div>
        <div class="fr-p">${r.points}<small>bodov</small></div></div>`).join('') + '<p class="fr-how">Body: 10 za deň so zápisom, 10 za deň v cieli kalórií, 10 za deň s bielkovinami, 20 za tréning.</p>'
        : `<div class="fr-empty"><b>Zatiaľ si tu sám</b>Pozvi kamaráta. Keď zadá tvoj kód alebo otvorí odkaz, uvidíte sa navzájom v rebríčku.</div>`}
      <div class="fr-box"><b>Pozvi kamaráta</b><small>Pošli mu odkaz. Po registrácii sa pridá k tebe automaticky.</small>
        <div class="fr-codew"><small>Tvoj kód</small><div class="fr-code">${h(code || '…')}</div></div>
        <div class="fr-btns"><button class="btn primary" id="frShare">Poslať pozvánku</button><button class="btn ghost" id="frCopy">Kopírovať kód</button></div></div>
      <details class="fr-join"><summary>Mám kód od kamaráta</summary>
        <div class="fr-add"><input class="input" id="frIn" maxlength="6" placeholder="ABC123" autocapitalize="characters" autocomplete="off"><button class="btn primary" id="frAdd">Pridať</button></div></details>
      ${items ? `<div class="fr-tg"><div>Zdieľať moje tréningy<small>Kamaráti uvidia tvoje tréningy, kalendár a najlepšie výkony a môžu ťa pochváliť</small></div><button class="fr-sw" role="switch" aria-checked="${me.share_workouts ? 'true' : 'false'}" aria-label="Zdieľať moje tréningy s kamarátmi" data-sw></button></div>` : ''}
      <p class="fr-note"><i>🔒</i><span>Kamaráti vidia počty dní so zápisom, dní v cieli a tréningov${me.share_workouts ? ' a tvoje odcvičené tréningy' : ''}. Nikdy nevidia tvoje kalórie, jedlá ani váhu.</span></p>`;
    const setShare = async v => {
      try { const { error } = await sb.from('profiles').update({ share_workouts: v }).eq('id', me.id); if (error) throw error; me.share_workouts = v; ctx.toast(v ? 'Kamaráti uvidia tvoje tréningy' : 'Tvoje tréningy sú skryté'); fdCache = null; await draw(true); }
      catch (_) { ctx.toast('Nepodarilo sa uložiť', true); }
    };
    body.querySelectorAll('[data-share]').forEach(b => b.onclick = () => setShare(b.dataset.share === '1'));
    body.querySelector('[data-sw]')?.addEventListener('click', () => setShare(!me.share_workouts));
    body.querySelector('[data-more]')?.addEventListener('click', () => { showAll = true; draw(false); });
    bindKudos(body, items || [], () => draw(false));
    body.querySelectorAll('[data-uid]').forEach(el => { el.onclick = () => openProfile(el.dataset.uid); el.onkeydown = e => { if (e.key === 'Enter') openProfile(el.dataset.uid); }; });
    const text = `Pridaj sa a porovnajme sa v GainTrain. Každý týždeň uvidíme, kto zapisoval, trafil kalórie a trénoval viac. Odkaz: ${linkFor(code)} (kód ${code})`;
    body.querySelector('#frShare').onclick = async () => {
      try {
        if (navigator.share) await navigator.share({ title: 'GainTrain', text });
        else { await navigator.clipboard.writeText(text); ctx.toast('Pozvánka skopírovaná'); }
      } catch (e) { if (e?.name !== 'AbortError') ctx.toast('Nepodarilo sa odoslať', true); }
    };
    body.querySelector('#frCopy').onclick = async () => {
      try { await navigator.clipboard.writeText(code); ctx.toast('Kód skopírovaný'); } catch (_) { ctx.toast(code); }
    };
    const add = async () => {
      const v = body.querySelector('#frIn').value.trim();
      if (v.length < 6) return ctx.toast('Kód má 6 znakov', true);
      const btn = body.querySelector('#frAdd'); btn.disabled = true;
      try { await addByCode(v); await draw(true); } catch (e) { ctx.toast(e.message || 'Nepodarilo sa pridať', true); btn.disabled = false; }
    };
    body.querySelector('#frAdd').onclick = add;
    body.querySelector('#frIn').onkeydown = e => { if (e.key === 'Enter') add(); };
  };
  await draw(true);
}

try { window.fwFriends = () => openFriends(); } catch (_) { }

async function addByCode(code) {
  const { data, error } = await sb.rpc('add_friend', { p_code: code });
  if (error) throw new Error(error.message || 'Nepodarilo sa pridať');
  cache = null;
  ctx.toast(`${data?.name || 'Kamarát'} je v tvojej tabuľke`);
  return data;
}

// ---------- pozvánkový odkaz #/kamarat/KÓD ----------
// odkaz z notifikácie o pochvale: #/kamarati otvorí okno Kamaráti nad obrazovkou Dnes
function grabOpen() {
  if (!/^#\/kamarati\b/.test(location.hash || '')) return false;
  history.replaceState(null, '', location.pathname + '#/');
  window.dispatchEvent(new HashChangeEvent('hashchange'));
  pendOpen = true; return true;
}
let pendOpen = false;
function grabInvite() {
  const m = /^#\/kamarat\/([A-Za-z0-9]{6})\b/.exec(location.hash || '');
  if (!m) return;
  ls.set(PEND, m[1].toUpperCase());
  history.replaceState(null, '', location.pathname + '#/');
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

let pendBusy = false;
async function processInvite() {
  const code = ls.get(PEND);
  if (!code || pendBusy || !ctx.state?.profile?.onboarded) return;
  pendBusy = true; ls.del(PEND);
  try { await addByCode(code); setTimeout(openFriends, 400); }
  catch (e) { ctx.toast(e.message || 'Pozvánku sa nepodarilo prijať', true); }
  finally { pendBusy = false; }
}

// ---------- karta na obrazovke Dnes ----------
if (typeof document !== 'undefined') {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  grabInvite(); grabOpen();
  const root = document.getElementById('app');
  const seen = new WeakSet();
  const inject = async () => {
    processInvite();
    if (pendOpen && ctx.state?.profile?.onboarded) { pendOpen = false; setTimeout(openFriends, 300); }
    if (!root || !ctx.state?.profile?.onboarded) return;
    const meals = root.querySelector('.screen.td .meals');
    if (!meals || seen.has(meals) || root.querySelector('#fw-friends')) return;
    seen.add(meals);
    const b = document.createElement('button'); b.id = 'fw-friends'; b.className = 'fr-card';
    b.innerHTML = '<span>👥</span><div><b>Kamaráti</b><small>Pridaj sa a porovnajme sa: pošli pozvánku</small></div><i>›</i>';
    b.onclick = openFriends;
    meals.after(b);
    try {
      const [rows, chd, items] = await Promise.all([board(false), challengeData(false).catch(() => null), feed(false).catch(() => null)]);
      const others = rows.filter(r => !r.me).length;
      const cm = chd?.cur?.week_start ? (() => { const ch = challengeFor(chd.cur.week_start), mine = (chd.cur.rows || []).find(r => r.me); return mine ? `${ch.title}: ${Math.min(mine[ch.key] || 0, ch.goal)}/${ch.goal}` : ''; })() : '';
      if (b.isConnected) {
        const mine = rows.find(r => r.me), pos = rows.findIndex(r => r.me) + 1;
        const base = others ? `${pos}. miesto z ${rows.length} · ${mine?.points || 0} bodov` : 'Pridaj sa a porovnajme sa: pošli pozvánku';
        b.querySelector('b').textContent = 'Kamaráti';
        b.querySelector('small').textContent = cm ? (others ? `${pos}. miesto z ${rows.length} · výzva ${cm}` : `Výzva týždňa ${cm} · pozvi kamaráta`) : base;
        // nová pochvala za môj tréning: ukáže sa na karte, kým okno neotvorím
        const seen = ls.get(KSEEN) || '';
        const fresh = (items || []).filter(i => i.me && i.last_kudo && i.last_kudo > seen);
        if (fresh.length) { const who = [...new Set(fresh.flatMap(i => (i.by || []).map(firstName)))]; b.querySelector('small').textContent = `💪 ${names2(who)} ${who.length > 1 ? 'ťa pochválili' : 'ťa pochválil(a)'} za tréning`; b.classList.add('fr-new'); }
        const fi = (items || []).find(i => !i.me && !i.mine);
        if (!fresh.length && fi) b.querySelector('small').textContent = `${firstName(fi.name)} ${whenTxt(fi.date)} ${fi.sex === 'f' ? 'odcvičila tréning · pochváľ ju' : 'odcvičil tréning · pochváľ ho'}`;
      }
    } catch (_) { /* karta ostane s výzvou */ }
  };
  if (root) new MutationObserver(() => inject()).observe(root, { childList: true, subtree: true });
  window.addEventListener('hashchange', () => { if (/^#\/kamarat\//.test(location.hash)) grabInvite(); else if (grabOpen()) inject(); });
}
