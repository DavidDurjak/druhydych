// Tréningy naživo (v320): skupinový videotréning trénera s viacerými klientmi naraz (až 50).
// Tréner: v záložke Klienti naplánuje tréning (typ, čas, dĺžka, kapacita, opakovanie, koho pozvať). Klienti dostanú notifikáciu a správu.
// Klient: pozvánka na obrazovke Dnes a v Tréneroch, potvrdí Idem / Nejdem, pridá si to do kalendára, 15 minút pred začiatkom sa pripojí.
// Obrazovky: #/zive (prehľad) a #/zive/<id> (detail s odpočítavaním). Hovor beží cez Daily (edge funkcia gs-room), mriežka, chat, ruka hore, tréner stlmí a zdieľa obrazovku.
// Dáta: tabuľky group_sessions a group_invites, funkcie gs_* (supabase/migrations/20261102_group_live.sql). Bez tabuliek sa nič z toho neukáže.
import { ctx } from './app.js';
import * as db from './data.js';

const $app = () => ctx.$app;
const st = () => ctx.state;
const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const toast = (...a) => ctx.toast(...a);
const isTrainer = () => !!st().trainer?.approved && st().profile?.role !== 'coach';

export const KINDS = {
  hiit: { e: '🔥', l: 'HIIT', t: 'HIIT naživo', g: ['#FF6A3D', '#E8255A'] },
  strength: { e: '🏋️', l: 'Sila', t: 'Silový tréning', g: ['#2F80FF', '#6A3DF0'] },
  core: { e: '🎯', l: 'Brucho', t: 'Brucho a core', g: ['#F5A623', '#E8573A'] },
  mobility: { e: '🤸', l: 'Mobilita', t: 'Mobilita a strečing', g: ['#11B5A4', '#1E7BD8'] },
  yoga: { e: '🧘', l: 'Joga', t: 'Joga', g: ['#9B5CF6', '#E259B5'] },
  cardio: { e: '🏃', l: 'Kardio', t: 'Kardio', g: ['#F43F7A', '#FF8A3D'] },
  other: { e: '✨', l: 'Iné', t: 'Tréning naživo', g: ['#2BD67B', '#12A0B8'] },
};
const K = k => KINDS[k] || KINDS.other;
const EARLY = 15 * 60e3, LATE = 30 * 60e3;
const DAYS = ['ne', 'po', 'ut', 'st', 'št', 'pi', 'so'];
const DAYS_L = ['nedeľa', 'pondelok', 'utorok', 'streda', 'štvrtok', 'piatok', 'sobota'];
const MONTHS = ['januára', 'februára', 'marca', 'apríla', 'mája', 'júna', 'júla', 'augusta', 'septembra', 'októbra', 'novembra', 'decembra'];
const pad = n => String(n).padStart(2, '0');
const hm = d => `${d.getHours()}:${pad(d.getMinutes())}`;
const sameDay = (a, b) => a.toDateString() === b.toDateString();
function dayWord(d) {
  const t = new Date(); const tm = new Date(t); tm.setDate(t.getDate() + 1);
  if (sameDay(d, t)) return 'dnes';
  if (sameDay(d, tm)) return 'zajtra';
  const diff = (d - t) / 864e5;
  if (diff > 0 && diff < 6) return DAYS_L[d.getDay()];
  return `${DAYS_L[d.getDay()]} ${d.getDate()}. ${d.getMonth() + 1}.`;
}
const when = s => { const d = new Date(s.starts_at); return `${dayWord(d)} o ${hm(d)}`; };
const longDate = d => `${DAYS_L[d.getDay()][0].toUpperCase()}${DAYS_L[d.getDay()].slice(1)} ${d.getDate()}. ${MONTHS[d.getMonth()]}`;
const fname = n => String(n || '').trim().split(/\s+/)[0] || '';
// v ktorej fáze je tréning
function phase(s, now = Date.now()) {
  if (s.status === 'canceled') return 'canceled';
  const a = new Date(s.starts_at).getTime(), b = a + s.duration_min * 60e3;
  if (now < a - EARLY) return 'soon';
  if (now < a) return 'open';
  if (now < b) return 'live';
  if (now < b + LATE) return 'grace';
  return 'over';
}
const joinable = s => ['open', 'live', 'grace'].includes(phase(s)) && (s.mine || s.my_rsvp !== 'declined' || s.going < s.capacity);
const plural = (n, one, few, many) => `${n} ${n === 1 ? one : n >= 2 && n <= 4 ? few : many}`;

// ---------- dáta ----------
let cache = null, cacheAt = 0, missing = false;
async function list(force) {
  if (missing) return [];
  if (!force && cache && Date.now() - cacheAt < 20e3) return cache;
  const { data, error } = await db.sb.rpc('gs_list');
  if (error) { if (/gs_list|PGRST202|42883/.test(`${error.code} ${error.message}`)) missing = true; return cache || []; }
  cache = Array.isArray(data) ? data : []; cacheAt = Date.now();
  return cache;
}
async function one(id) {
  const { data, error } = await db.sb.rpc('gs_list', { p_session: id });
  if (error) throw new Error('Tréning sa nepodarilo načítať.');
  return Array.isArray(data) ? data[0] || null : null;
}
async function rpc(fn, args) {
  const { data, error } = await db.sb.rpc(fn, args);
  if (error) throw new Error(String(error.message || 'Nepodarilo sa.').replace(/^.*?ERROR:\s*/, ''));
  cache = null; return data;
}
async function myClients() {
  const uid = st().profile.id;
  const { data } = await db.sb.from('trainer_clients').select('client_id,client_name').eq('trainer_id', uid).eq('status', 'active');
  const rows = data || []; if (!rows.length) return [];
  const { data: ps } = await db.sb.from('profiles').select('id,name,avatar_url').in('id', rows.map(r => r.client_id));
  const pm = Object.fromEntries((ps || []).map(p => [p.id, p]));
  const seen = new Set();
  return rows.filter(r => !seen.has(r.client_id) && seen.add(r.client_id))
    .map(r => ({ id: r.client_id, name: r.client_name || pm[r.client_id]?.name || 'Klient', avatar: pm[r.client_id]?.avatar_url || null }))
    .sort((a, b) => a.name.localeCompare(b.name, 'sk'));
}

// ---------- vzhľad ----------
const hue = s => [...String(s || '?')].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
const ini = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0] || '').join('').toUpperCase() || '?';
const av = (p, cls = '', one = false) => p.avatar
  ? `<i class="zv-av ${cls}" style="background-image:url('${h(p.avatar)}')" title="${h(p.name)}"></i>`
  : `<i class="zv-av ${cls}" style="--h:${hue(p.name)}" title="${h(p.name)}">${h(one ? ini(p.name)[0] : ini(p.name))}</i>`;
const stack = (people, max = 5) => {
  const xs = (people || []).slice(0, max);
  const more = (people || []).length - xs.length;
  return `<span class="zv-stack">${xs.map(p => av(p, '', true)).join('')}${more > 0 ? `<i class="zv-av zv-more">+${more}</i>` : ''}</span>`;
};
const goingNames = (people, me) => {
  const xs = (people || []).filter(p => (p.rsvp ?? 'going') === 'going');
  const mine = xs.find(p => p.id === me), rest = xs.filter(p => p.id !== me).map(p => fname(p.name));
  const parts = [...(mine ? ['ty'] : []), ...rest];
  if (!parts.length) return '';
  if (parts.length <= 3) return parts.join(', ').replace(/, ([^,]*)$/, ' a $1');
  return `${parts.slice(0, 2).join(', ')} a ${plural(parts.length - 2, 'ďalší', 'ďalší', 'ďalších')}`;
};
const LIVE_DOT = '<span class="zv-dot" aria-hidden="true"></span>';
const ICON_CAM = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h8a2.5 2.5 0 0 1 2.5 2.5v9A2.5 2.5 0 0 1 14 19H6a2.5 2.5 0 0 1-2.5-2.5z"/><path d="M16.5 10.2l3.4-2.3a.7.7 0 0 1 1.1.6v7a.7.7 0 0 1-1.1.6l-3.4-2.3z"/></svg>';
const ICON_CAL = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>';
const ICON_PLUS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';

const CSS = `
.zv{padding-bottom:120px}
.zv svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.zv-top{display:flex;align-items:center;gap:10px;margin:0 0 16px}
.zv-top h1{margin:0;font-size:32px;letter-spacing:-.04em;line-height:1.05}
.zv-top p{margin:4px 0 0;color:var(--muted);font-size:13.5px}
.zv-back{flex:none;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;border:1px solid var(--line);background:var(--card);color:var(--text);text-decoration:none}
.zv-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#FF3B4E;box-shadow:0 0 0 0 rgba(255,59,78,.6);animation:glPulse 1.6s infinite;flex:none}
@keyframes glPulse{0%{box-shadow:0 0 0 0 rgba(255,59,78,.55)}70%{box-shadow:0 0 0 9px rgba(255,59,78,0)}100%{box-shadow:0 0 0 0 rgba(255,59,78,0)}}
.zv-av{position:relative;display:inline-grid;place-items:center;width:30px;height:30px;border-radius:50%;flex:none;font-style:normal;font-size:11px;font-weight:800;color:#fff;
  background:linear-gradient(140deg,hsl(var(--h,200) 70% 58%),hsl(calc(var(--h,200) + 40) 70% 46%));background-size:cover;background-position:center;box-shadow:0 0 0 2px var(--card)}
.zv-stack{display:inline-flex;align-items:center}
.zv-stack .zv-av+.zv-av{margin-left:-9px}
.zv-more{background:color-mix(in srgb,var(--text) 14%,var(--card));color:var(--text)}
.zv-new{position:relative;overflow:hidden;width:100%;display:flex;align-items:center;gap:14px;text-align:left;padding:16px;border-radius:24px;border:0;cursor:pointer;color:#fff;font:inherit;margin:0 0 18px;
  background:radial-gradient(120% 140% at 0% 0%,#FF6A3D,transparent 55%),radial-gradient(120% 140% at 100% 100%,#6A3DF0,transparent 60%),#1A1030;box-shadow:0 14px 34px -18px rgba(106,61,240,.8)}
.zv-new b{display:block;font-size:17px;letter-spacing:-.02em}
.zv-new span{display:block;font-size:13px;opacity:.85;margin-top:2px}
.zv-new .zv-ni{flex:none;width:48px;height:48px;border-radius:16px;display:grid;place-items:center;background:rgba(255,255,255,.18);backdrop-filter:blur(6px)}
.zv-new .zv-ni svg{width:24px;height:24px}
.zv-new .zv-plus{margin-left:auto;flex:none;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#fff;color:#1A1030}
.zv-sec{margin:20px 2px 10px;font-size:13px;font-weight:700;color:var(--muted);display:flex;align-items:center;gap:8px}
.zv-c{position:relative;display:flex;align-items:center;gap:13px;padding:12px;border-radius:22px;background:var(--card);border:1px solid var(--line);margin:0 0 10px;color:inherit;text-decoration:none;
  transition:transform .12s;animation:glIn .45s cubic-bezier(.2,.9,.3,1) both;animation-delay:calc(var(--n,0)*45ms)}
.zv-c:active{transform:scale(.985)}
@keyframes glIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.zv-c.is-x{opacity:.55}
.zv-c.is-live{border-color:rgba(255,59,78,.45);box-shadow:0 0 0 3px rgba(255,59,78,.1)}
.zv-tile{flex:none;width:58px;height:62px;border-radius:17px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;line-height:1;
  background:linear-gradient(150deg,var(--g1),var(--g2));box-shadow:inset 0 1px 0 rgba(255,255,255,.25)}
.zv-tile small{font-size:11px;font-weight:800;opacity:.9}
.zv-tile b{font-size:24px;font-weight:800;letter-spacing:-.04em;margin-top:3px}
.zv-tile.live{background:#FF3B4E}
.zv-tile.live small{display:flex;align-items:center;gap:4px}
.zv-tile.live .zv-dot{background:#fff;width:6px;height:6px}
.zv-cb{flex:1;min-width:0}
.zv-cb b{display:block;font-size:16px;letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.zv-cb span{display:block;font-size:13px;color:var(--muted);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.zv-cb em{font-style:normal;display:flex;align-items:center;gap:7px;margin-top:7px;font-size:12px;color:var(--muted)}
.zv-chip{flex:none;font-size:12px;font-weight:800;padding:6px 10px;border-radius:99px;background:color-mix(in srgb,var(--text) 8%,transparent);color:var(--muted)}
.zv-chip.go{background:color-mix(in srgb,var(--accent) 18%,transparent);color:var(--accent)}
.zv-chip.inv{background:#FF3B4E;color:#fff}
.zv-join{flex:none;display:inline-flex;align-items:center;gap:7px;border:0;border-radius:99px;padding:10px 14px;font:inherit;font-size:14px;font-weight:800;cursor:pointer;background:#FF3B4E;color:#fff;box-shadow:0 8px 20px -10px #FF3B4E}
.zv-join svg{width:18px;height:18px}
.zv-empty{text-align:center;padding:34px 18px;border-radius:24px;border:1px dashed var(--line);color:var(--muted);font-size:14px;line-height:1.5}
.zv-empty b{display:block;color:var(--text);font-size:17px;margin-bottom:6px}
.zv-empty .zv-emo{font-size:38px;display:block;margin-bottom:10px}
/* detail */
.zv-hero{position:relative;overflow:hidden;border-radius:30px;padding:20px 18px 18px;color:#fff;margin:0 0 14px;
  background:radial-gradient(120% 120% at 100% 0%,var(--g2),transparent 60%),radial-gradient(120% 140% at 0% 100%,var(--g1),transparent 65%),#120E1E;box-shadow:0 22px 50px -26px var(--g2)}
.zv-hero:after{content:"";position:absolute;right:-30px;top:-34px;font-size:150px;line-height:1;opacity:.16;content:var(--emo);pointer-events:none;transform:rotate(12deg)}
.zv-kind{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:800;padding:6px 11px;border-radius:99px;background:rgba(255,255,255,.18);backdrop-filter:blur(8px)}
.zv-kind.live{background:#FF3B4E}
.zv-kind.live .zv-dot{background:#fff;width:7px;height:7px}
.zv-hero h2{position:relative;margin:14px 0 6px;font-size:30px;line-height:1.05;letter-spacing:-.04em;max-width:90%}
.zv-hero .zv-when{font-size:14.5px;opacity:.9}
.zv-who{display:flex;align-items:center;gap:10px;margin-top:16px;font-size:14px}
.zv-who .zv-av{width:36px;height:36px;box-shadow:0 0 0 2px rgba(255,255,255,.5)}
.zv-who small{display:block;opacity:.75;font-size:12px}
.zv-cd{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:18px 0 0}
.zv-cd div{border-radius:16px;padding:10px 4px 8px;text-align:center;background:rgba(0,0,0,.24);backdrop-filter:blur(8px)}
.zv-cd b{display:block;font-size:28px;font-weight:800;letter-spacing:-.04em;font-variant-numeric:tabular-nums;line-height:1}
.zv-cd small{font-size:11px;opacity:.75}
.zv-cd.short{grid-template-columns:repeat(3,1fr)}
.zv-livebar{display:flex;align-items:center;gap:10px;margin:18px 0 0;padding:12px 14px;border-radius:18px;background:rgba(0,0,0,.25);font-size:14px;font-weight:700}
.zv-livebar span{margin-left:auto;font-variant-numeric:tabular-nums;opacity:.85}
.zv-prog{height:5px;border-radius:9px;background:rgba(255,255,255,.2);overflow:hidden;margin-top:10px}
.zv-prog i{display:block;height:100%;background:#fff;border-radius:9px}
.zv-cta{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;height:58px;border-radius:20px;border:0;font:inherit;font-size:17px;font-weight:800;cursor:pointer;margin:0 0 10px;
  background:#FF3B4E;color:#fff;box-shadow:0 14px 30px -14px #FF3B4E;transition:transform .12s}
.zv-cta:active{transform:scale(.98)}
.zv-cta svg{width:22px;height:22px}
.zv-cta[disabled]{background:color-mix(in srgb,var(--text) 9%,var(--card));color:var(--muted);box-shadow:none;cursor:default;font-size:15px}
.zv-rsvp{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 14px}
.zv-rsvp button{height:50px;border-radius:16px;border:1px solid var(--line);background:var(--card);color:var(--text);font:inherit;font-size:15px;font-weight:800;cursor:pointer;transition:background .15s,color .15s,border-color .15s}

.zv-rsvp button.on.n{background:var(--text);border-color:var(--text);color:var(--bg)}
.zv-box{padding:15px;border-radius:22px;background:var(--card);border:1px solid var(--line);margin:0 0 12px}
.zv-box h3{margin:0 0 10px;font-size:15px;letter-spacing:-.01em}
.zv-cap{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:14px}
.zv-cap b{font-variant-numeric:tabular-nums}
.zv-bar{height:8px;border-radius:9px;background:color-mix(in srgb,var(--text) 9%,transparent);overflow:hidden;margin:10px 0 12px}
.zv-bar i{display:block;height:100%;border-radius:9px;background:linear-gradient(90deg,var(--g1),var(--g2))}
.zv-ppl{display:flex;align-items:center;gap:10px;font-size:13.5px;color:var(--muted)}
.zv-note{white-space:pre-wrap;font-size:14.5px;line-height:1.5;margin:0}
.zv-row{display:flex;gap:8px;flex-wrap:wrap}
.zv-row .btn{flex:1}
.zv-li{display:flex;align-items:center;gap:11px;padding:9px 0;border-top:1px solid var(--line)}
.zv-li:first-of-type{border-top:0}
.zv-li .zv-av{width:34px;height:34px}
.zv-li b{flex:1;min-width:0;font-size:14.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.zv-tips{margin:0;padding:0;list-style:none;display:grid;gap:9px;font-size:13.5px;color:var(--muted);line-height:1.45}
.zv-tips li{display:flex;gap:10px}
.zv-tips li span{flex:none;width:24px;height:24px;border-radius:8px;display:grid;place-items:center;background:color-mix(in srgb,var(--text) 7%,transparent);font-size:13px}
.zv-x{color:#E5484D!important}
/* plánovanie */
.zv-sh{max-height:min(88vh,860px);overflow:auto;padding-bottom:8px}
.zv-sh h2{margin:0 0 4px;font-size:24px;letter-spacing:-.03em}
.zv-sh>p{margin:0 0 14px;color:var(--muted);font-size:13.5px}
.zv-lab{display:block;font-size:12.5px;font-weight:700;color:var(--muted);margin:16px 2px 8px}
.zv-kinds,.zv-days,.zv-qt{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin:0 -2px;padding:2px}
.zv-kinds::-webkit-scrollbar,.zv-days::-webkit-scrollbar,.zv-qt::-webkit-scrollbar{display:none}
.zv-k{flex:none;display:flex;flex-direction:column;align-items:center;gap:5px;width:72px;padding:10px 4px 9px;border-radius:18px;border:1.5px solid var(--line);background:var(--card);color:var(--text);font:inherit;font-size:12px;font-weight:700;cursor:pointer}
.zv-k i{font-style:normal;font-size:24px;line-height:1}
.zv-k.on{border-color:transparent;color:#fff;background:linear-gradient(150deg,var(--g1),var(--g2))}
.zv-d{flex:none;width:56px;padding:9px 0;border-radius:16px;border:1.5px solid var(--line);background:var(--card);color:var(--text);font:inherit;cursor:pointer;text-align:center;line-height:1.1}
.zv-d small{display:block;font-size:11px;color:var(--muted);font-weight:700}
.zv-d b{display:block;font-size:19px;margin-top:3px}
.zv-d.on{background:var(--text);color:var(--card);border-color:var(--text)}
.zv-d.on small{color:inherit;opacity:.7}
.zv-t{flex:none;padding:9px 13px;border-radius:99px;border:1.5px solid var(--line);background:var(--card);color:var(--text);font:inherit;font-size:14px;font-weight:700;cursor:pointer;font-variant-numeric:tabular-nums}
.zv-t.on{background:var(--text);color:var(--card);border-color:var(--text)}
.zv-time{display:flex;align-items:center;gap:8px}
.zv-time input{flex:none;width:118px;height:42px;border-radius:14px;border:1.5px solid var(--line);background:var(--card);color:var(--text);font:inherit;font-size:16px;font-weight:700;padding:0 10px}
.zv-seg{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:4px;padding:4px;border-radius:16px;background:color-mix(in srgb,var(--text) 6%,transparent)}
.zv-seg button{height:38px;border:0;border-radius:12px;background:none;color:var(--muted);font:inherit;font-size:14px;font-weight:700;cursor:pointer}
.zv-seg button.on{background:var(--card);color:var(--text);box-shadow:0 1px 4px rgba(0,0,0,.12)}
.zv-step{display:flex;align-items:center;gap:14px}
.zv-step button{width:44px;height:44px;border-radius:50%;border:1.5px solid var(--line);background:var(--card);color:var(--text);font-size:22px;font-weight:700;cursor:pointer;line-height:1}
.zv-step output{min-width:56px;text-align:center;font-size:28px;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.zv-step span{color:var(--muted);font-size:13px}
.zv-in{width:100%;height:46px;border-radius:14px;border:1.5px solid var(--line);background:var(--card);color:var(--text);font:inherit;font-size:16px;padding:0 13px}
textarea.zv-in{height:auto;padding:11px 13px;resize:vertical;min-height:70px}
.zv-all{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:16px;border:1.5px solid var(--line);background:var(--card);cursor:pointer;font-size:15px;font-weight:700}
.zv-all input,.zv-pick input{width:22px;height:22px;accent-color:var(--accent);flex:none}
.zv-all span{margin-left:auto;color:var(--muted);font-size:13px;font-weight:600}
.zv-picks{margin-top:8px;border-radius:16px;border:1.5px solid var(--line);background:var(--card);max-height:240px;overflow:auto}
.zv-pick{display:flex;align-items:center;gap:11px;padding:10px 13px;border-top:1px solid var(--line);cursor:pointer;font-size:14.5px;font-weight:600}
.zv-pick:first-child{border-top:0}
.zv-pick .zv-av{width:30px;height:30px}
.zv-pick b{flex:1;font-weight:600}
.zv-sum{margin:16px 0 10px;padding:12px 14px;border-radius:16px;background:color-mix(in srgb,var(--accent) 10%,transparent);font-size:13.5px;line-height:1.45}
.zv-go{width:100%;height:56px;border-radius:18px;border:0;font:inherit;font-size:16.5px;font-weight:800;cursor:pointer;color:#fff;background:linear-gradient(120deg,#FF6A3D,#E8255A 55%,#6A3DF0);box-shadow:0 14px 30px -14px #E8255A}
.zv-go[disabled]{opacity:.5;cursor:default}
/* karta na Dnes / Klienti / Tréneri */
.zv-entry{position:relative;overflow:hidden;display:flex;align-items:center;gap:13px;padding:13px;border-radius:22px;margin:0 0 14px;color:#fff;text-decoration:none;
  background:radial-gradient(110% 150% at 100% 0%,var(--g2),transparent 60%),radial-gradient(120% 160% at 0% 100%,var(--g1),transparent 70%),#160F24;box-shadow:0 12px 30px -18px var(--g2);animation:glIn .5s cubic-bezier(.2,.9,.3,1) both}
.zv-entry .zv-ei{flex:none;width:48px;height:48px;border-radius:15px;display:grid;place-items:center;font-size:24px;background:rgba(255,255,255,.16)}
.zv-entry .zv-cb span,.zv-entry .zv-cb em{color:rgba(255,255,255,.82)}
.zv-entry small.zv-eyb{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:800;opacity:.9;margin-bottom:3px}
.zv-entry .zv-go2{flex:none;padding:9px 13px;border-radius:99px;background:#fff;color:#160F24;font-size:13.5px;font-weight:800}
.zv-entry .zv-go2.live{background:#FF3B4E;color:#fff}
.zv-entry .zv-av{box-shadow:0 0 0 2px #160F24}
.zv-inv{display:flex;align-items:center;gap:8px;margin-top:8px;padding:10px 12px;border-radius:14px;background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--text)!important;text-decoration:none;font-weight:800;font-size:14px}
.zv-inv:after{content:"›";margin-left:auto;font-size:20px;line-height:1}
/* hovor */
.zv-call{position:fixed;inset:0;z-index:99999;background:#05060A;display:flex;flex-direction:column;color:#fff}
.zv-ctop{display:flex;align-items:center;gap:10px;padding:calc(8px + env(safe-area-inset-top)) 12px 8px}
.zv-ctop b{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.zv-ctop .zv-tm{font-size:13px;opacity:.7;font-variant-numeric:tabular-nums;white-space:nowrap}
.zv-ctop button{margin-left:auto;flex:none;border:0;border-radius:99px;padding:9px 15px;background:#FF3B4E;color:#fff;font:inherit;font-size:14px;font-weight:800;cursor:pointer}
.zv-call iframe{flex:1;border:0;width:100%;background:#000}
.zv-load{flex:1;display:grid;place-content:center;text-align:center;gap:14px;font-size:15px;opacity:.85}
.zv-spin{width:34px;height:34px;margin:0 auto;border-radius:50%;border:3px solid rgba(255,255,255,.2);border-top-color:#fff;animation:glSpin .8s linear infinite}
@keyframes glSpin{to{transform:rotate(360deg)}}
/* skiny (nálepky, cookie, svetlý režim) nesmú prefarbiť živé prvky */
.zv .zv-cb b,.zv-c .zv-cb b{color:var(--text)!important}
.zv-entry .zv-cb b,.zv-entry .zv-eyb,.zv-entry{color:#fff!important}
.zv-entry .zv-cb span,.zv-entry .zv-cb em{color:rgba(255,255,255,.82)!important}
button.zv-join,.zv-join{background:#FF3B4E!important;color:#fff!important;border:0!important}
button.zv-cta:not([disabled]){background:#FF3B4E!important;color:#fff!important;border:0!important}
.zv-rsvp button.on.y{background:color-mix(in srgb,var(--accent) 22%,var(--card))!important;border-color:var(--accent)!important;color:var(--text)!important}
.zv-rsvp button.on.n{background:var(--text)!important;border-color:var(--text)!important;color:var(--card)!important}
.zv-tile,.zv-tile b,.zv-tile small{color:#fff!important}
.zv-chip.inv{background:#FF3B4E!important;color:#fff!important}
@media (prefers-reduced-motion:reduce){.zv-dot,.zv-c,.zv-entry{animation:none}}
`;
function css() { if (document.getElementById('zvCss')) return; const s = document.createElement('style'); s.id = 'zvCss'; s.dataset.fwLight = ''; s.textContent = CSS; document.head.appendChild(s); } // data-fw-light: vlastné farby (hero, hovor) ostanú aj vo svetlom režime
const gv = s => { const k = K(s.kind); return `--g1:${k.g[0]};--g2:${k.g[1]}`; };

// ---------- karta tréningu v zozname ----------
function card(s, i, uid) {
  const d = new Date(s.starts_at), ph = phase(s), k = K(s.kind);
  const live = ph === 'live' || ph === 'open' || ph === 'grace';
  const tile = live ? `<div class="zv-tile live" data-noskin><small>${LIVE_DOT}${ph === 'open' ? 'ZA CHVÍĽU' : 'NAŽIVO'}</small><b>${hm(d)}</b></div>`
    : `<div class="zv-tile" data-noskin><small>${DAYS[d.getDay()].toUpperCase()}</small><b>${d.getDate()}.</b></div>`;
  const sub = s.mine
    ? `${hm(d)} · ${s.duration_min} min · ${k.e} ${k.l}`
    : `${hm(d)} · ${s.duration_min} min · s ${h(fname(s.trainer_name))}`;
  const going = (s.people || []).filter(p => (p.rsvp ?? 'going') === 'going');
  const meta = s.status === 'canceled' ? '<em>Zrušené</em>'
    : `<em>${going.length ? stack(going, 4) : ''}${s.mine ? `${s.going}/${s.capacity} prihlásených` : going.length ? h(goingNames(going, uid)) + (going.length === 1 && going[0].id === uid ? ' ideš' : ' idú') : `${s.capacity - s.going} voľných miest`}</em>`;
  let right = '';
  if (live && joinable(s)) right = `<button class="zv-join" data-noskin data-join="${s.id}">${ICON_CAM}${s.mine ? 'Spustiť' : 'Pripojiť'}</button>`;
  else if (!s.mine && s.status !== 'canceled') right = s.my_rsvp === 'going' ? '<span class="zv-chip go">Ideš</span>' : s.my_rsvp === 'declined' ? '<span class="zv-chip">Nejdeš</span>' : '<span class="zv-chip inv">Pozvánka</span>';
  return `<a class="zv-c${s.status === 'canceled' || ph === 'over' ? ' is-x' : ''}${live ? ' is-live' : ''}" href="#/zive/${s.id}" style="${gv(s)};--n:${i}">${tile}
    <div class="zv-cb"><b>${h(s.title)}</b><span>${h(dayWord(d))} · ${sub}</span>${meta}</div>${right}</a>`;
}

// ---------- #/zive ----------
export async function render(id) {
  css();
  if (id) return renderDetail(id);
  const uid = st().profile.id, tr = isTrainer();
  $app().innerHTML = `<div class="screen zv"><div class="zv-top"><div><h1>Naživo</h1><p>Skupinové tréningy cez video</p></div></div><div class="spinner"></div></div>${ctx.nav('#/zive')}`;
  const xs = await list(true);
  const scr = $app().querySelector('.zv'); if (!scr) return;
  const active = xs.filter(s => !['over', 'canceled'].includes(phase(s)));
  const past = xs.filter(s => ['over', 'canceled'].includes(phase(s))).reverse();
  const now = active.filter(s => ['open', 'live', 'grace'].includes(phase(s)));
  const next = active.filter(s => phase(s) === 'soon');
  scr.querySelector('.spinner').outerHTML = `
    ${tr ? `<button class="zv-new" data-noskin id="glNew"><span class="zv-ni">${ICON_CAM}</span><div><b>Naplánovať tréning naživo</b><span>Až 50 klientov naraz, s notifikáciou pre každého</span></div><span class="zv-plus">${ICON_PLUS}</span></button>` : ''}
    ${now.length ? `<div class="zv-sec">${LIVE_DOT}Práve teraz</div>${now.map((s, i) => card(s, i, uid)).join('')}` : ''}
    ${next.length ? `<div class="zv-sec">Nadchádzajúce</div>${next.map((s, i) => card(s, i + now.length, uid)).join('')}` : ''}
    ${!now.length && !next.length ? (tr
      ? `<div class="zv-empty"><span class="zv-emo">🎥</span><b>Zatiaľ nič naplánované</b>Naplánuj prvý tréning naživo. Klienti dostanú pozvánku do mobilu a 10 minút pred začiatkom pripomienku.</div>`
      : `<div class="zv-empty"><span class="zv-emo">🎥</span><b>Žiadne pozvánky</b>Keď ťa tréner pozve na tréning naživo, objaví sa tu aj na obrazovke Dnes a príde ti notifikácia.</div>`) : ''}
    ${past.length ? `<div class="zv-sec">Posledných 7 dní</div>${past.slice(0, 10).map((s, i) => card(s, i, uid)).join('')}` : ''}`;
  scr.querySelector('#glNew')?.addEventListener('click', () => planSheet());
  bindJoin(scr);
}
function bindJoin(root) {
  root.querySelectorAll('[data-join]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); join(b.dataset.join, b); }));
}

// ---------- #/zive/<id> ----------
let tick = null;
async function renderDetail(id) {
  const uid = st().profile.id;
  $app().innerHTML = `<div class="screen zv"><div class="spinner"></div></div>${ctx.nav('#/zive')}`;
  let s; try { s = await one(id); } catch (e) { toast(e.message, true); }
  const scr = $app().querySelector('.zv'); if (!scr) return;
  if (!s) {
    scr.innerHTML = `<div class="zv-top"><div><h1>Naživo</h1></div></div><div class="zv-empty"><span class="zv-emo">🔍</span><b>Tento tréning nevidíš</b>Možno ho tréner zrušil alebo už nie si jeho klient.</div>`;
    return;
  }
  const k = K(s.kind), d = new Date(s.starts_at), end = new Date(d.getTime() + s.duration_min * 60e3);
  const going = (s.people || []).filter(p => (p.rsvp ?? 'going') === 'going');
  const free = Math.max(0, s.capacity - s.going);
  const trainerAv = { name: s.trainer_name, avatar: s.trainer_photo };
  scr.innerHTML = `
    <section class="zv-hero" data-noskin style="${gv(s)};--emo:'${k.e}'">
      <span class="zv-kind" id="glKind">${k.e} ${h(k.l)}${s.series ? ' · každý týždeň' : ''}</span>
      <h2>${h(s.title)}</h2>
      <div class="zv-when">${h(longDate(d))} · ${hm(d)} až ${hm(end)}</div>
      ${s.mine ? '' : `<div class="zv-who">${av(trainerAv)}<div><small>Vedie</small><b>${h(s.trainer_name)}</b></div></div>`}
      <div id="glClock"></div>
    </section>
    <div id="glAct"></div>
    ${!s.mine && s.status === 'scheduled' && phase(s) !== 'over' ? `<div class="zv-rsvp" data-noskin><button class="y${s.my_rsvp === 'going' ? ' on' : ''}" data-r="1">${s.my_rsvp === 'going' ? '✓ Idem' : 'Idem'}</button><button class="n${s.my_rsvp === 'declined' ? ' on' : ''}" data-r="0">Nejdem</button></div>` : ''}
    <div class="zv-box" style="${gv(s)}">
      <div class="zv-cap"><span>${s.mine ? 'Prihlásení' : 'Obsadenosť'}</span><b>${s.going} z ${s.capacity}</b></div>
      <div class="zv-bar"><i style="width:${Math.min(100, s.going / s.capacity * 100).toFixed(1)}%"></i></div>
      <div class="zv-ppl">${going.length ? `${stack(going, 7)}<span>${h(goingNames(going, uid))} ${going.length === 1 && going[0].id === uid ? 'ideš' : going.length === 1 ? 'ide' : 'idú'}</span>` : `<span>${s.mine ? 'Zatiaľ sa nikto neprihlásil.' : 'Buď prvý, kto sa prihlási.'}</span>`}</div>
      ${!s.mine && free <= 3 && free > 0 && s.my_rsvp !== 'going' ? `<p class="muted small" style="margin:10px 0 0">Ostávajú ${plural(free, 'posledné miesto', 'posledné miesta', 'posledných miest')}.</p>` : ''}
    </div>
    ${s.note ? `<div class="zv-box"><h3>Čo si pripraviť</h3><p class="zv-note">${h(s.note)}</p></div>` : ''}
    ${s.status === 'scheduled' && phase(s) !== 'over' ? `<button class="btn" id="glIcs" style="width:100%;margin:0 0 12px;display:flex;align-items:center;justify-content:center;gap:8px"><span class="zv" style="padding:0;display:contents">${ICON_CAL}</span>Pridať do kalendára</button>` : ''}
    ${s.mine ? trainerBox(s) : tipsBox()}`;
  // odpočítavanie
  const clock = scr.querySelector('#glClock'), act = scr.querySelector('#glAct'), kind = scr.querySelector('#glKind');
  let last = '';
  const paint = () => {
    if (!clock.isConnected) { clearInterval(tick); tick = null; return; }
    const now = Date.now(), ph = phase(s, now), a = d.getTime(), b = end.getTime();
    if (ph === 'soon' || ph === 'open') {
      let left = Math.max(0, Math.floor((a - now) / 1000));
      const dd = Math.floor(left / 86400); left -= dd * 86400; const hh = Math.floor(left / 3600); left -= hh * 3600; const mm = Math.floor(left / 60), ss = left % 60;
      clock.innerHTML = dd > 0
        ? `<div class="zv-cd"><div><b>${dd}</b><small>${dd === 1 ? 'deň' : dd < 5 ? 'dni' : 'dní'}</small></div><div><b>${pad(hh)}</b><small>hod</small></div><div><b>${pad(mm)}</b><small>min</small></div><div><b>${pad(ss)}</b><small>sek</small></div></div>`
        : `<div class="zv-cd short"><div><b>${pad(hh)}</b><small>hod</small></div><div><b>${pad(mm)}</b><small>min</small></div><div><b>${pad(ss)}</b><small>sek</small></div></div>`;
    } else if (ph === 'live') {
      const el = Math.floor((now - a) / 60000), rest = Math.ceil((b - now) / 60000);
      clock.innerHTML = `<div class="zv-livebar">${LIVE_DOT}Prebieha${s.started_at || s.mine ? '' : ''}<span>ešte ${rest} min</span></div><div class="zv-prog"><i style="width:${((now - a) / (b - a) * 100).toFixed(1)}%"></i></div>`;
      void el;
    } else if (ph === 'grace') clock.innerHTML = `<div class="zv-livebar">Čas vypršal, miestnosť je otvorená ešte ${Math.ceil((b + LATE - now) / 60000)} min</div>`;
    else if (ph === 'canceled') clock.innerHTML = `<div class="zv-livebar">❌ Tréning je zrušený</div>`;
    else clock.innerHTML = `<div class="zv-livebar">Tréning skončil</div>`;
    const live = ['open', 'live', 'grace'].includes(ph);
    kind.classList.toggle('live', ph === 'live');
    if (ph === 'live' && !kind.dataset.l) { kind.dataset.l = '1'; kind.innerHTML = `${LIVE_DOT}NAŽIVO`; }
    // tlačidlo (prekresliť len pri zmene stavu)
    const opensAt = new Date(a - EARLY);
    const key = `${ph}|${live && joinable(s)}`;
    if (key !== last) {
      last = key;
      act.innerHTML = ph === 'canceled' || ph === 'over' ? ''
        : live ? (joinable(s) ? `<button class="zv-cta" data-noskin data-join="${s.id}">${ICON_CAM}${s.mine ? (s.started_at ? 'Vrátiť sa do tréningu' : 'Spustiť tréning') : 'Pripojiť sa'}</button>` : `<button class="zv-cta" data-noskin disabled>Tréning je plný</button>`)
        : `<button class="zv-cta" data-noskin disabled>${ICON_CAM}Otvorí sa ${sameDay(opensAt, new Date()) ? 'o ' + hm(opensAt) : dayWord(opensAt) + ' o ' + hm(opensAt)}</button>`;
      bindJoin(act);
    }
  };
  if (tick) clearInterval(tick);
  paint(); tick = setInterval(paint, 1000);
  // Idem / Nejdem
  scr.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', async () => {
    const yes = b.dataset.r === '1';
    if ((yes && s.my_rsvp === 'going') || (!yes && s.my_rsvp === 'declined')) return;
    b.disabled = true;
    try {
      await rpc('gs_rsvp', { p_session: s.id, p_going: yes });
      if (navigator.vibrate) navigator.vibrate(yes ? [12, 40, 12] : 10);
      toast(yes ? 'Super, počítame s tebou. Pripomenieme ti to 10 minút pred začiatkom.' : 'Dali sme vedieť, že neprídeš.');
      renderDetail(s.id);
    } catch (e) { toast(e.message, true); b.disabled = false; }
  }));
  scr.querySelector('#glIcs')?.addEventListener('click', () => ics(s));
  if (s.mine) bindTrainer(scr, s);
}

function tipsBox() {
  return `<div class="zv-box"><h3>Ako to prebieha</h3><ul class="zv-tips">
    <li><span>🎥</span>Pred vstupom si skontroluješ kameru a mikrofón. Prehliadač sa spýta na povolenie.</li>
    <li><span>🔇</span>Mikrofón máš na začiatku stlmený, nech je počuť trénera. Zapneš si ho jedným ťuknutím.</li>
    <li><span>📐</span>Polož mobil tak, aby ťa kamera videla celého. Tréner ti tak opraví techniku.</li>
    <li><span>✋</span>Otázku daj cez zdvihnutú ruku alebo chat.</li></ul></div>`;
}
function trainerBox(s) {
  const ppl = s.people || [];
  const lbl = { going: ['Ide', 'go'], declined: ['Nejde', ''], invited: ['Čaká', ''] };
  const editable = s.status === 'scheduled' && !['over', 'grace'].includes(phase(s));
  return `<div class="zv-box"><h3>Pozvaní (${ppl.length})</h3>
      ${ppl.map(p => `<div class="zv-li">${av(p)}<b>${h(p.name)}</b>${p.joined ? '<span class="zv-chip go">Pripojil sa</span>' : `<span class="zv-chip ${lbl[p.rsvp]?.[1] || ''}">${lbl[p.rsvp]?.[0] || ''}</span>`}</div>`).join('')}
      ${editable ? '<button class="btn sm" id="glMore" style="width:100%;margin-top:10px">Pozvať ďalších</button>' : ''}</div>
    ${editable ? `<div class="zv-row" style="margin:0 0 12px"><button class="btn" id="glEdit">Upraviť</button><button class="btn zv-x" id="glCancel">Zrušiť tréning</button></div>` : ''}
    <div class="zv-box"><h3>Tipy pre trénera</h3><ul class="zv-tips">
      <li><span>👥</span>V zozname účastníkov môžeš niekoho stlmiť alebo z tréningu odstrániť.</li>
      <li><span>🖥️</span>Zdieľaním obrazovky ukážeš plán cvikov alebo časovač.</li>
      <li><span>🔔</span>Klientom príde pripomienka 10 minút pred začiatkom. Miestnosť sa otvára 15 minút vopred.</li></ul></div>`;
}
function bindTrainer(scr, s) {
  scr.querySelector('#glCancel')?.addEventListener('click', () => {
    const bg = ctx.sheet(`<h2 style="margin:0 0 6px">Zrušiť tréning?</h2><p class="muted" style="margin:0 0 16px">${h(s.title)}, ${h(when(s))}. Všetci pozvaní dostanú správu a notifikáciu, že sa nekoná.</p>
      <button class="btn tr-danger" id="glYes" style="width:100%">Zrušiť a dať vedieť klientom</button><button class="btn ghost" id="glNo" style="width:100%;margin-top:8px">Nechať tak</button>`);
    bg.querySelector('#glNo').onclick = () => bg.remove();
    bg.querySelector('#glYes').onclick = async e => {
      e.currentTarget.disabled = true;
      try { await rpc('gs_cancel', { p_session: s.id }); bg.remove(); toast('Tréning je zrušený, klienti dostali správu.'); renderDetail(s.id); }
      catch (err) { toast(err.message, true); e.currentTarget.disabled = false; }
    };
  });
  scr.querySelector('#glEdit')?.addEventListener('click', () => planSheet(s));
  scr.querySelector('#glMore')?.addEventListener('click', async () => {
    const all = await myClients(); const inv = new Set((s.people || []).map(p => p.id));
    const rest = all.filter(c => !inv.has(c.id));
    if (!rest.length) { toast('Pozvaný je už každý tvoj aktívny klient.'); return; }
    const bg = ctx.sheet(`<div class="zv zv-sh" style="padding-bottom:0"><h2>Pozvať ďalších</h2><p>Dostanú správu a notifikáciu s pozvánkou.</p>
      <div class="zv-picks">${rest.map(c => `<label class="zv-pick"><input type="checkbox" value="${c.id}" checked>${av(c)}<b>${h(c.name)}</b></label>`).join('')}</div>
      <button class="zv-go" data-noskin id="glInv" style="margin-top:14px">Pozvať</button></div>`);
    bg.querySelector('#glInv').onclick = async e => {
      const ids = [...bg.querySelectorAll('input:checked')].map(x => x.value); if (!ids.length) return;
      e.currentTarget.disabled = true;
      try { const r = await rpc('gs_invite', { p_session: s.id, p_clients: ids }); bg.remove(); toast(`Pozvánka odišla ${plural(r?.invited || ids.length, 'klientovi', 'klientom', 'klientom')}.`); renderDetail(s.id); }
      catch (err) { toast(err.message, true); e.currentTarget.disabled = false; }
    };
  });
}

// ---------- pridať do kalendára ----------
function ics(s) {
  const z = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const a = new Date(s.starts_at), b = new Date(a.getTime() + s.duration_min * 60e3);
  const esc = t => String(t || '').replace(/[\\,;]/g, m => '\\' + m).replace(/\n/g, '\\n');
  const url = location.origin + location.pathname + '#/zive/' + s.id;
  const txt = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GainTrain//Live//SK', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:${s.id}@gaintrain`, `DTSTAMP:${z(new Date())}`, `DTSTART:${z(a)}`, `DTEND:${z(b)}`,
    `SUMMARY:${esc(s.title + ' (naživo)')}`, `DESCRIPTION:${esc((s.note ? s.note + '\n\n' : '') + 'Pripojíš sa v appke GainTrain: ' + url)}`, `URL:${url}`,
    'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', `DESCRIPTION:${esc(s.title)}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const blob = new Blob([txt], { type: 'text/calendar;charset=utf-8' });
  const file = new File([blob], 'trening-nazivo.ics', { type: 'text/calendar' });
  if (navigator.canShare?.({ files: [file] }) && /iP(hone|ad)|Android/.test(navigator.userAgent)) { navigator.share({ files: [file], title: s.title }).catch(() => { }); return; }
  const a2 = document.createElement('a'); a2.href = URL.createObjectURL(blob); a2.download = 'trening-nazivo.ics'; document.body.appendChild(a2); a2.click();
  setTimeout(() => { URL.revokeObjectURL(a2.href); a2.remove(); }, 1500);
}

// ---------- plánovanie / úprava ----------
async function planSheet(edit) {
  css();
  const clients = edit ? [] : await myClients();
  if (!edit && !clients.length) {
    const bg = ctx.sheet(`<div class="zv"><div class="zv-empty" style="border:0"><span class="zv-emo">👥</span><b>Najprv potrebuješ klientov</b>Tréning naživo je pre tvojich aktívnych klientov. Pošli im svoj kód alebo prijmi žiadosti v záložke Klienti.</div><button class="btn primary" style="width:100%" id="glOk">Rozumiem</button></div>`);
    bg.querySelector('#glOk').onclick = () => bg.remove(); return;
  }
  const t0 = edit ? new Date(edit.starts_at) : (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(18, 0, 0, 0); return d; })();
  const S = { kind: edit?.kind || 'hiit', title: edit?.title || '', day: new Date(t0.getFullYear(), t0.getMonth(), t0.getDate()), time: `${pad(t0.getHours())}:${pad(t0.getMinutes())}`,
    dur: edit?.duration_min || 45, cap: edit?.capacity || Math.min(50, Math.max(5, clients.length || 20)), weeks: 1, all: true, pick: new Set(clients.map(c => c.id)), note: edit?.note || '' };
  const days = Array.from({ length: 21 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d; });
  if (edit && !days.some(d => sameDay(d, S.day))) days.push(S.day);
  const QT = ['06:30', '07:00', '12:00', '17:00', '18:00', '19:00', '20:00'];
  const bg = ctx.sheet(`<div class="zv zv-sh">
    <h2>${edit ? 'Upraviť tréning' : 'Tréning naživo'}</h2><p>${edit ? 'Pri zmene času dostanú pozvaní správu.' : 'Klienti dostanú pozvánku hneď a pripomienku 10 minút pred začiatkom.'}</p>
    ${edit ? '' : `<span class="zv-lab">Typ</span><div class="zv-kinds" data-noskin>${Object.entries(KINDS).map(([id, k]) => `<button type="button" class="zv-k${id === S.kind ? ' on' : ''}" data-k="${id}" style="--g1:${k.g[0]};--g2:${k.g[1]}"><i>${k.e}</i>${k.l}</button>`).join('')}</div>`}
    <span class="zv-lab">Názov</span><input class="zv-in" id="glTitle" maxlength="60" placeholder="${h(K(S.kind).t)}" value="${h(S.title)}">
    <span class="zv-lab">Deň</span><div class="zv-days" data-noskin>${days.map((d, i) => `<button type="button" class="zv-d${sameDay(d, S.day) ? ' on' : ''}" data-d="${i}"><small>${i === 0 ? 'dnes' : i === 1 ? 'zajtra' : DAYS[d.getDay()]}</small><b>${d.getDate()}.</b></button>`).join('')}</div>
    <span class="zv-lab">Čas</span><div class="zv-time"><input type="time" id="glTime" value="${S.time}" step="300"><div class="zv-qt" data-noskin>${QT.map(t => `<button type="button" class="zv-t${t === S.time ? ' on' : ''}" data-t="${t}">${t.replace(/^0/, '')}</button>`).join('')}</div></div>
    <span class="zv-lab">Dĺžka</span><div class="zv-seg" id="glDur">${[30, 45, 60, 90].map(m => `<button type="button" data-m="${m}" class="${m === S.dur ? 'on' : ''}">${m} min</button>`).join('')}</div>
    <span class="zv-lab">Kapacita</span><div class="zv-step"><button type="button" data-c="-1" aria-label="Menej">−</button><output id="glCap">${S.cap}</output><button type="button" data-c="1" aria-label="Viac">+</button><span>ľudí naraz<br>(najviac 50)</span></div>
    ${edit ? '' : `<span class="zv-lab">Opakovanie</span><div class="zv-seg" id="glWk">${[[1, 'Raz'], [4, '4 týždne'], [8, '8 týždňov']].map(([w, l]) => `<button type="button" data-w="${w}" class="${w === S.weeks ? 'on' : ''}">${l}</button>`).join('')}</div>
    <span class="zv-lab">Koho pozvať</span>
    <label class="zv-all"><input type="checkbox" id="glAll" checked>Všetkých klientov<span>${clients.length}</span></label>
    <div class="zv-picks" id="glPicks" hidden>${clients.map(c => `<label class="zv-pick"><input type="checkbox" value="${c.id}" checked>${av(c)}<b>${h(c.name)}</b></label>`).join('')}</div>`}
    <span class="zv-lab">Čo si pripraviť (nepovinné)</span><textarea class="zv-in" id="glNote" maxlength="400" rows="2" placeholder="Napr. podložka, fľaša vody, 2 jednoručky">${h(S.note)}</textarea>
    <div class="zv-sum" id="glSum"></div>
    <button class="zv-go" data-noskin id="glGo"></button></div>`);
  const q = sel => bg.querySelector(sel);
  const start = () => { const [hh, mm] = S.time.split(':').map(Number); const d = new Date(S.day); d.setHours(hh || 0, mm || 0, 0, 0); return d; };
  const nInv = () => S.all ? clients.length : S.pick.size;
  const upd = () => {
    const d = start(), past = d.getTime() < Date.now() - 60e3;
    const title = q('#glTitle').value.trim() || K(S.kind).t;
    q('#glSum').innerHTML = past ? '⚠️ Tento čas už bol. Vyber neskorší.'
      : `<b>${h(title)}</b><br>${h(longDate(d))} o ${hm(d)}, ${S.dur} min${S.weeks > 1 ? `, ${S.weeks}× každý týždeň` : ''}${edit ? '' : `<br>Pozvánka pre ${plural(nInv(), 'klienta', 'klientov', 'klientov')}${nInv() > S.cap ? `, prvých ${S.cap} sa prihlási` : ''}`}`;
    const b = q('#glGo'); b.disabled = past || (!edit && !nInv());
    b.textContent = edit ? 'Uložiť zmeny' : `Naplánovať a pozvať ${nInv()}`;
  };
  bg.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
    S.kind = b.dataset.k; bg.querySelectorAll('[data-k]').forEach(x => x.classList.toggle('on', x === b));
    q('#glTitle').placeholder = K(S.kind).t; upd();
  });
  bg.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { S.day = days[Number(b.dataset.d)]; bg.querySelectorAll('[data-d]').forEach(x => x.classList.toggle('on', x === b)); upd(); });
  const setT = t => { S.time = t; q('#glTime').value = t; bg.querySelectorAll('[data-t]').forEach(x => x.classList.toggle('on', x.dataset.t === t)); upd(); };
  bg.querySelectorAll('[data-t]').forEach(b => b.onclick = () => setT(b.dataset.t));
  q('#glTime').addEventListener('input', e => { if (e.target.value) setT(e.target.value); });
  bg.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { S.dur = Number(b.dataset.m); bg.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === b)); upd(); });
  bg.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { S.weeks = Number(b.dataset.w); bg.querySelectorAll('[data-w]').forEach(x => x.classList.toggle('on', x === b)); upd(); });
  bg.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { S.cap = Math.min(50, Math.max(2, S.cap + Number(b.dataset.c) * (S.cap >= 20 ? 5 : 1))); q('#glCap').textContent = S.cap; upd(); });
  q('#glTitle').addEventListener('input', upd);
  q('#glAll')?.addEventListener('change', e => { S.all = e.target.checked; q('#glPicks').hidden = S.all; upd(); });
  q('#glPicks')?.addEventListener('change', () => { S.pick = new Set([...bg.querySelectorAll('#glPicks input:checked')].map(x => x.value)); upd(); });
  upd();
  q('#glGo').onclick = async e => {
    const btn = e.currentTarget; btn.disabled = true; const t = btn.textContent; btn.textContent = edit ? 'Ukladám…' : 'Posielam pozvánky…';
    const title = q('#glTitle').value.trim() || K(S.kind).t, note = q('#glNote').value.trim();
    try {
      if (edit) {
        await rpc('gs_update', { p_session: edit.id, p_title: title, p_starts: start().toISOString(), p_duration: S.dur, p_capacity: S.cap, p_note: note || null });
        bg.remove(); toast('Uložené.'); renderDetail(edit.id);
      } else {
        const r = await rpc('gs_create', { p_title: title, p_starts: start().toISOString(), p_duration: S.dur, p_capacity: S.cap, p_clients: S.all ? null : [...S.pick], p_note: note || null, p_kind: S.kind, p_weeks: S.weeks });
        bg.remove();
        if (navigator.vibrate) navigator.vibrate([15, 50, 15]);
        toast(`Naplánované. Pozvánka odišla ${plural(r?.invited || nInv(), 'klientovi', 'klientom', 'klientom')}.`);
        location.hash = '#/zive/' + r.id;
      }
    } catch (err) { toast(err.message, true); btn.disabled = false; btn.textContent = t; }
  };
}

// ---------- hovor ----------
let wake = null;
async function join(id, btn) {
  const t0 = btn?.innerHTML; if (btn) { btn.disabled = true; btn.textContent = 'Pripájam…'; }
  document.getElementById('glCall')?.remove();
  const box = document.createElement('div'); box.id = 'glCall'; box.className = 'zv-call'; box.dataset.noskin = '';
  box.innerHTML = `<div class="zv-ctop">${LIVE_DOT}<b>Pripájam…</b><span class="zv-tm"></span><button type="button" id="glLeave">Odísť</button></div><div class="zv-load"><div class="zv-spin"></div>Otváram miestnosť</div>`;
  css(); document.body.appendChild(box);
  let timer = null;
  const close = () => { clearInterval(timer); box.remove(); try { wake?.release(); } catch (_) { } wake = null; if (location.hash.startsWith('#/zive')) render(location.hash.split('/')[2]); };
  box.querySelector('#glLeave').onclick = close;
  try {
    const { data, error } = await db.sb.functions.invoke('gs-room', { body: { session: id } });
    let msg = data?.error; if (!msg && error?.context?.json) msg = (await error.context.json().catch(() => null))?.error;
    if (error || !data?.url) throw new Error(msg || 'Do tréningu sa nepodarilo pripojiť.');
    if (!box.isConnected) return;
    box.querySelector('.zv-ctop b').textContent = data.title || 'Tréning naživo';
    const f = document.createElement('iframe');
    f.allow = 'camera; microphone; fullscreen; display-capture; autoplay; picture-in-picture';
    f.src = `${data.url}?t=${encodeURIComponent(data.token)}`;
    box.querySelector('.zv-load').replaceWith(f);
    const endAt = new Date(data.ends_at).getTime(), tm = box.querySelector('.zv-tm');
    const paint = () => { const m = Math.round((endAt - Date.now()) / 60000); tm.textContent = m > 0 ? `ešte ${m} min` : 'čas vypršal'; };
    paint(); timer = setInterval(paint, 15000);
    try { wake = await navigator.wakeLock?.request('screen'); } catch (_) { /* displej môže zhasnúť */ }
    cache = null;
  } catch (e) {
    box.remove(); toast(e.message, true);
  }
  if (btn) { btn.disabled = false; btn.innerHTML = t0; }
}

// ---------- vstupy do appky ----------
function entry(s, uid) {
  const ph = phase(s), live = ['open', 'live', 'grace'].includes(ph), k = K(s.kind);
  const going = (s.people || []).filter(p => (p.rsvp ?? 'going') === 'going');
  const eyb = live ? `${LIVE_DOT}${ph === 'open' ? 'Začína o chvíľu' : 'Práve naživo'}` : s.mine ? 'Tvoj ďalší tréning naživo' : s.my_rsvp === 'invited' ? 'Pozvánka na tréning naživo' : 'Tréning naživo';
  const cta = live && joinable(s) ? `<span class="zv-go2 live" data-join="${s.id}">${s.mine ? 'Spustiť' : 'Pripojiť'}</span>` : `<span class="zv-go2">${s.mine ? 'Detail' : s.my_rsvp === 'invited' ? 'Prídeš?' : 'Detail'}</span>`;
  return `<a class="zv-entry" data-noskin href="#/zive/${s.id}" style="${gv(s)}"><span class="zv-ei">${k.e}</span>
    <div class="zv-cb"><small class="zv-eyb">${eyb}</small><b>${h(s.title)}</b><span>${h(when(s))}${s.mine ? ` · ${s.going}/${s.capacity}` : ` · ${h(fname(s.trainer_name))}`}</span>${going.length > 1 ? `<em>${stack(going, 4)}${plural(going.length, 'ide', 'idú', 'ide')}</em>` : ''}</div>${cta}</a>`;
}
let busy = false;
async function decorate() {
  if (busy || !st().profile || !db.sb) return; busy = true;
  try {
    const path = (location.hash || '#/').split('?')[0];
    const uid = st().profile.id;
    // Klienti (tréner)
    if (path === '#/kouc' && isTrainer()) {
      const root = document.querySelector('#app .ko-root'); if (!root || root.querySelector('.zv-entry,.zv-new')) return;
      const xs = await list(); if (!document.contains(root) || root.querySelector('.zv-entry,.zv-new')) return;
      const nx = xs.find(s => s.mine && !['over', 'canceled'].includes(phase(s)));
      css();
      const el = document.createElement('div');
      el.innerHTML = nx ? entry(nx, uid) + `<a class="zv-inv" href="#/zive" style="margin:-6px 0 14px">Všetky tréningy naživo</a>`
        : `<button class="zv-new" data-noskin type="button"><span class="zv-ni">${ICON_CAM}</span><div><b>Tréning naživo</b><span>Odcvič to s viacerými klientmi naraz cez video</span></div><span class="zv-plus">${ICON_PLUS}</span></button>`;
      el.querySelector('.zv-new')?.addEventListener('click', () => planSheet());
      bindJoin(el);
      const anchor = root.querySelector('.ko-h'); anchor ? anchor.after(...el.children) : root.prepend(...el.children);
      return;
    }
    if (isTrainer()) return;
    // Dnes (klient): beží teraz, pozvánka bez odpovede alebo tréning do 36 hodín
    if (path === '#/' || path === '#/treneri') {
      const scr = document.querySelector('#app .screen'); if (!scr || scr.querySelector('.zv-entry')) return;
      const xs = await list(); if (!document.contains(scr) || scr.querySelector('.zv-entry')) return;
      const cand = xs.filter(s => !s.mine && s.status === 'scheduled' && !['over'].includes(phase(s)) && s.my_rsvp !== 'declined');
      const pick = cand.find(s => ['open', 'live', 'grace'].includes(phase(s)))
        || cand.find(s => s.my_rsvp === 'invited')
        || (path === '#/treneri' ? cand[0] : cand.find(s => new Date(s.starts_at) - Date.now() < 36 * 3600e3));
      if (!pick) return;
      css();
      const el = document.createElement('div'); el.innerHTML = entry(pick, uid); const node = el.firstElementChild;
      bindJoin(el);
      if (path === '#/treneri') {
        const card = scr.querySelector('#trCard');
        if (card) card.after(node); else scr.prepend(node);
        if (cand.length > 1) node.insertAdjacentHTML('afterend', `<a class="zv-inv" href="#/zive" style="margin:-6px 0 14px">Všetky tréningy naživo (${cand.length})</a>`);
      } else {
        const after = scr.querySelector('.td-hero,.hero-card,.today-head,.topbar,header');
        if (after && after.parentElement === scr) after.after(node); else scr.prepend(node);
      }
    }
  } finally { busy = false; }
}
// odkaz v chate (#/zive/<id>) ako tlačidlo
function chatLinks() {
  document.querySelectorAll('#app .tr-bub:not([data-gl])').forEach(b => {
    b.dataset.zv = '1';
    const m = b.textContent.match(/#\/zive\/([0-9a-f-]{36})/); if (!m) return;
    const walker = document.createTreeWalker(b, NodeFilter.SHOW_TEXT); let n;
    while ((n = walker.nextNode())) if (n.nodeValue.includes(m[0])) { n.nodeValue = n.nodeValue.replace(m[0], '').replace(/\n+$/, ''); break; }
    const a = document.createElement('a'); a.href = m[0]; a.className = 'zv-inv'; a.textContent = '🎥 Otvoriť tréning naživo';
    const small = b.querySelector('small'); small ? small.before(a) : b.appendChild(a);
  });
}

let qd = 0;
const app = document.getElementById('app');
if (app) new MutationObserver(() => { if (qd) return; qd = requestAnimationFrame(() => { qd = 0; css(); chatLinks(); decorate(); }); }).observe(app, { childList: true, subtree: true });
addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') cache = null; });
