// Profil: hráčska karta (úroveň, séria, odznaky), plán, rýchle dlaždice a nastavenia zoskupené do prehľadných sekcií.
// Pôvodná obrazovka z app.js zostane v DOM skrytá (jej odhlásenie, odkazy z iných modulov aj dáta fungujú ďalej), nové UI sa vloží nad ňu.
import * as db from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';
import { metrics, evaluate } from './badges.js';
import { exportMine } from './mydata.js';
import { APP_VERSION } from './admin.js';
import * as U from './units.js';

const root = document.getElementById('app');
const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = v => Math.round(v).toLocaleString('sk-SK');
const kg = v => (Math.round(v * 10) / 10).toLocaleString('sk-SK', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const P = {
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20c.8-4 3.9-6 7.5-6s6.7 2 7.5 6"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path d="M7.5 12h2l1.5-3 2 5 1.3-2H17"/>',
  shield: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  watch: '<rect x="7" y="6" width="10" height="12" rx="3"/><path d="M9 6l.8-3h4.4L15 6M9 18l.8 3h4.4l.8-3M12 10v2.5l1.5 1"/>',
  bell: '<path d="M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 21h4"/>',
  cal: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M8 3v4M16 3v4M9 15l2 2 4-4"/>',
  menu: '<rect x="5" y="4" width="14" height="17" rx="3"/><path d="M9 4h6v3H9zM9 12h6M9 16h4"/>',
  chat: '<path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-6l-4 3.5V17H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  cart: '<path d="M3 5h2.5l2 10h9.5l2-7H7"/><circle cx="9.5" cy="19" r="1.4"/><circle cx="16.5" cy="19" r="1.4"/>',
  invite: '<circle cx="10" cy="8" r="4"/><path d="M3 20c.7-3.7 3.4-5.5 7-5.5M18 9v6M15 12h6"/>',
  chart: '<path d="M5 20v-9M12 20V5M19 20v-7"/>',
  down: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 20h14"/>',
  doc: '<path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3"/>',
  out: '<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 8l4 4-4 4M19 12H9"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
  chev: '<path d="M9 5l7 7-7 7"/>',
  pen: '<path d="M4 20l1-4L16 5l3 3L8 19z"/>',
  flame: '<path d="M12 3c1 3 4.5 5 4.5 9.5A4.5 4.5 0 0 1 12 17a4.5 4.5 0 0 1-4.5-4.5c0-2 1-3 2-4 .2 1.2.9 2 1.7 2.3C11 12 12 8 12 3z"/>',
};
const ic = (k, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" ${extra} aria-hidden="true">${P[k]}</svg>`;

const CSS = `
.screen.pfx>*:not(.pfx-root){display:none!important}
.pfx-root{padding-bottom:28px}
.pfx-root h1{margin:0 0 16px;font-size:30px;letter-spacing:-.03em}
.pfx-root button,.pfx-root a{-webkit-appearance:none;appearance:none;font:inherit;color:inherit;text-decoration:none;cursor:pointer}
.pfx-hero{position:relative;overflow:hidden;border-radius:28px;padding:20px 18px 0;border:1px solid rgba(255,255,255,.08);background:radial-gradient(90% 75% at 0% 0%,rgba(124,255,178,.15),transparent 62%),radial-gradient(70% 70% at 100% 100%,rgba(255,181,71,.12),transparent 64%),linear-gradient(180deg,#1b212b,#12161c);box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 22px 44px -26px rgba(0,0,0,.9)}
.pfx-hero::before{content:'';position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(rgba(255,255,255,.07) 1px,transparent 1.2px);background-size:15px 15px;-webkit-mask:linear-gradient(200deg,#000,transparent 55%);mask:linear-gradient(200deg,#000,transparent 55%)}
.pfx-hd{position:relative;display:flex;align-items:center;gap:16px}
.pfx-av{position:relative;flex:none;width:92px;height:92px}
.pfx-ring{position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg);overflow:visible}
.pfx-ring circle{fill:none;stroke-width:5;stroke-linecap:round}
.pfx-ring .trk{stroke:rgba(255,255,255,.09)}
.pfx-ring .fl{stroke:url(#pfxg);stroke-dasharray:0 100;transition:stroke-dasharray 1.1s cubic-bezier(.2,.8,.2,1) .15s;filter:drop-shadow(0 0 5px rgba(255,181,71,.45))}
.pfx-ini{position:absolute;inset:9px;border-radius:50%;display:grid;place-items:center;font-size:27px;font-weight:800;letter-spacing:-.02em;color:var(--accent);background:radial-gradient(120% 120% at 30% 15%,#2a3d34,#131b17);box-shadow:inset 0 0 0 1px rgba(124,255,178,.22)}
.pfx-lv{position:absolute;right:-3px;bottom:-3px;min-width:30px;height:30px;padding:0 6px;border-radius:99px;display:grid;place-items:center;font-size:14px;font-weight:800;color:#3A2400;background:radial-gradient(circle at 30% 25%,#FFE08A,#FFB547 60%,#B9741A);border:3px solid #151a21;box-shadow:0 4px 12px rgba(255,181,71,.35)}
.pfx-lv.pop{animation:pfxPop .8s cubic-bezier(.2,1.5,.4,1) .9s both}
@keyframes pfxPop{0%{transform:scale(.4);opacity:0}100%{transform:none;opacity:1}}
.pfx-id{min-width:0;flex:1}
.pfx-root .pfx-name{display:flex;align-items:center;gap:7px;max-width:100%;padding:0;margin:0;border:0;background:none;text-align:left;font-size:22px;font-weight:800;letter-spacing:-.025em;line-height:1.15}
.pfx-name span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pfx-name svg{flex:none;width:15px;height:15px;color:var(--muted)}
.pfx-mail{margin:3px 0 0;font-size:12.5px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pfx-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.pfx-chip{display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 10px;border-radius:99px;font-size:12.5px;font-weight:700;background:rgba(255,255,255,.07);color:#D6DCE6}
.pfx-chip svg{width:13px;height:13px}
.pfx-chip.lv{background:rgba(255,181,71,.15);color:#FFCB6B}
.pfx-chip.fire{background:rgba(255,138,76,.15);color:#FF9A4C}
.pfx-chip.fire svg{fill:currentColor;stroke:none}
.pfx-xp{position:relative;margin-top:18px}
.pfx-xb{height:6px;border-radius:99px;background:rgba(255,255,255,.09);overflow:hidden}
.pfx-xb i{display:block;height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,#FFB547,#FFE08A);transition:width 1.1s cubic-bezier(.2,.8,.2,1) .15s}
.pfx-xp p{margin:8px 0 0;font-size:12.5px;color:var(--muted)}
.pfx-st{position:relative;display:grid;grid-template-columns:repeat(3,1fr);margin:16px -18px 0;border-top:1px solid rgba(255,255,255,.08);background:rgba(0,0,0,.18)}
.pfx-st div{padding:14px 6px 13px;text-align:center}
.pfx-st div+div{border-left:1px solid rgba(255,255,255,.07)}
.pfx-st b{display:block;font-size:24px;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums;line-height:1.1}
.pfx-st div>span{display:block;margin-top:3px;font-size:12px;color:var(--muted)}
.pfx-plan{margin-top:14px;padding:16px;border-radius:24px;background:var(--card);border:1px solid var(--line)}
.pfx-ph{display:flex;align-items:center;gap:8px}
.pfx-ph h3{margin:0;font-size:16px}
.pfx-goal{height:24px;padding:0 10px;border-radius:99px;display:inline-flex;align-items:center;font-size:12px;font-weight:700;background:rgba(124,255,178,.12);color:var(--accent)}
.pfx-ph a{margin-left:auto;font-size:13.5px;font-weight:700;color:var(--accent)}
.pfx-pb{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-top:14px}
.pfx-kc b{font-size:38px;font-weight:800;letter-spacing:-.04em;line-height:1;font-variant-numeric:tabular-nums}
.pfx-kc span{margin-left:6px;font-size:13px;color:var(--muted)}
.pfx-wt{text-align:right}
.pfx-wt b{display:block;font-size:18px;font-weight:800;letter-spacing:-.02em}
.pfx-wt span{font-size:12px;color:var(--muted)}
.pfx-wt span.dn{color:var(--accent)}.pfx-wt span.up{color:#FFB35C}
.pfx-mb{display:flex;gap:3px;height:10px;margin-top:16px;border-radius:99px;overflow:hidden}
.pfx-mb i{display:block;min-width:6px;border-radius:3px}
.pfx-ml{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
.pfx-ml div{font-size:12px;color:var(--muted);line-height:1.3}
.pfx-ml b{display:block;font-size:16px;color:var(--text);font-variant-numeric:tabular-nums}
.pfx-ml i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px}
.pfx-tiles{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
.pfx-t{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:12px;min-height:104px;padding:14px;border-radius:22px;border:1px solid var(--line);background:var(--card);text-align:left;transition:transform .15s}
.pfx-t:active{transform:scale(.97)}
.pfx-ti{width:36px;height:36px;border-radius:12px;display:grid;place-items:center;color:var(--c);background:var(--cb)}
.pfx-ti svg{width:20px;height:20px}
.pfx-t b{display:block;font-size:15px;font-weight:700;line-height:1.2}
.pfx-t small{display:block;margin-top:2px;font-size:12px;color:var(--muted);line-height:1.3}
.pfx-nb{position:absolute;top:12px;right:12px;min-width:22px;height:22px;padding:0 6px;border-radius:99px;display:grid;place-items:center;font-size:12px;font-weight:800;color:#fff;background:var(--danger);box-shadow:0 0 0 3px var(--card)}
.pfx-s{display:flex;align-items:center;gap:10px;height:48px;margin-top:22px;padding:0 14px;border-radius:16px;background:var(--bg-2);border:1px solid var(--line)}
.pfx-s svg{width:19px;height:19px;color:var(--muted);flex:none}
.pfx-s input{flex:1;min-width:0;height:100%;border:0;outline:0;background:none;font-size:16px;color:var(--text)}
.pfx-s input::placeholder{color:var(--muted)}
.pfx-gt{margin:24px 4px 8px;font-size:13px;font-weight:700;color:var(--muted);letter-spacing:0}
.pfx-g{border-radius:22px;background:var(--card);border:1px solid var(--line);overflow:hidden}
.pfx-r{position:relative;display:flex;align-items:center;gap:13px;width:100%;min-height:62px;padding:11px 14px;border:0;background:none;text-align:left;transition:background .12s}
.pfx-r:active{background:rgba(255,255,255,.05)}
.pfx-r:active .pfx-ri{transform:scale(.92)}
.pfx-r+.pfx-r::before{content:'';position:absolute;left:65px;right:0;top:0;height:1px;background:var(--line)}
.pfx-ri{flex:none;width:38px;height:38px;border-radius:12px;display:grid;place-items:center;color:var(--c);background:var(--cb);transition:transform .15s}
.pfx-ri svg{width:20px;height:20px}
.pfx-rt{flex:1;min-width:0}
.pfx-rt b{display:block;font-size:15.5px;font-weight:650;line-height:1.25}
.pfx-rt small{display:block;margin-top:2px;font-size:12.5px;color:var(--muted);line-height:1.3}
.pfx-r>svg{flex:none;width:16px;height:16px;color:#5d6778}
.pfx-r.dng .pfx-rt b{color:var(--danger)}
.pfx-root [hidden]{display:none!important}
.pfx-none{margin:26px 4px 0;padding:22px 16px;border-radius:22px;text-align:center;border:1px dashed var(--line);color:var(--muted);font-size:14px}
.pfx-none a{display:inline-block;margin-top:8px;font-weight:700;color:var(--accent)}
.pfx-foot{margin:30px 0 0;text-align:center;font-size:12.5px;color:var(--muted)}
.pfx-foot b{display:block;margin-bottom:3px;font-size:14px;color:var(--text);letter-spacing:-.01em}
.pfx-sh h3{margin:0 0 12px;font-size:20px;letter-spacing:-.02em}
.pfx-sh p{margin:0 0 16px;color:var(--muted);font-size:14.5px}
.pfx-in{width:100%;height:52px;padding:0 14px;border-radius:14px;border:1px solid var(--line);background:var(--bg-2);color:var(--text);font-size:17px;outline:0}
.pfx-in:focus{border-color:var(--accent)}
.pfx-sb{display:flex;gap:8px;margin-top:14px}.pfx-sb .btn{flex:1;margin:0}
@media (prefers-reduced-motion:reduce){.pfx-ring .fl,.pfx-xb i{transition:none}.pfx-lv.pop{animation:none}}
`;
const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

// ---------- dáta ----------
async function all(table, cols, uid) {
  const out = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data, error } = await db.sb.from(table).select(cols).eq('user_id', uid).order('id').range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}
let cache = null;
async function loadStats(p) {
  if (cache && cache.uid === p.id && Date.now() - cache.at < 45000) return cache.d;
  const [food, checks, logs, weights, msgs] = await Promise.all([
    all('food_logs', 'id,date,kcal,protein', p.id),
    all('checkins', 'id,date,water', p.id).catch(() => []),
    all('workout_logs', 'id,date,done', p.id).catch(() => []),
    db.listWeights(p.id).catch(() => []),
    db.listMessages(p.id).catch(() => []),
  ]);
  const m = metrics(p, food, checks, logs, weights), ev = evaluate(p, m);
  const d = { m, ev, weights, unread: msgs.filter(x => x.to_user === p.id && !x.read_at).length };
  cache = { uid: p.id, at: Date.now(), d };
  return d;
}

// ---------- pomocné ----------
const initials = n => { const w = String(n || '').trim().split(/\s+/).filter(Boolean); return ((w[0]?.[0] || '?') + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase(); };
const COL = {
  mint: ['#7CFFB2', 'rgba(124,255,178,.14)'], rose: ['#FF7A93', 'rgba(255,92,122,.15)'], violet: ['#B79CFF', 'rgba(150,120,255,.17)'], sky: ['#6FC4FF', 'rgba(91,184,255,.15)'],
  amber: ['#FFC25C', 'rgba(255,194,92,.15)'], teal: ['#5BE0D2', 'rgba(91,224,210,.14)'], slate: ['#B4BFD0', 'rgba(180,191,208,.13)'], red: ['#FF5C7A', 'rgba(255,92,122,.15)'],
};
const cv = c => `--c:${COL[c][0]};--cb:${COL[c][1]}`;
const row = r => {
  const tag = r.href ? 'a' : 'button', at = r.href ? `href="${r.href}"` : `type="button" data-a="${r.a}"`;
  return `<${tag} class="pfx-r${r.dng ? ' dng' : ''}" ${at} data-k="${h((r.t + ' ' + (r.k || '') + ' ' + (r.s || '')).toLowerCase())}" ${r.id ? `id="${r.id}"` : ''}><span class="pfx-ri" style="${cv(r.c)}">${ic(r.i)}</span><span class="pfx-rt"><b>${h(r.t)}</b><small>${h(r.s || '')}</small></span>${r.dng ? '' : ic('chev')}</${tag}>`;
};
const tile = r => {
  const tag = r.href ? 'a' : 'button', at = r.href ? `href="${r.href}"` : `type="button" data-a="${r.a}"`;
  return `<${tag} class="pfx-t" ${at}><span class="pfx-ti" style="${cv(r.c)}">${ic(r.i)}</span><span><b>${h(r.t)}</b><small>${h(r.s)}</small></span>${r.badge ? `<i class="pfx-nb" data-nb>${r.badge}</i>` : ''}</${tag}>`;
};
const countUp = (el, to, fmt = nf) => {
  if (matchMedia('(prefers-reduced-motion:reduce)').matches || !isFinite(to)) { el.textContent = fmt(to); return; }
  const t0 = performance.now(), D = 900;
  const f = now => { const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(to * e); if (k < 1 && el.isConnected) requestAnimationFrame(f); };
  requestAnimationFrame(f);
};

// ---------- zostavenie ----------
function html(p, admin) {
  const goal = calc.GOAL?.[p.goal]?.label || 'Bez cieľa';
  const act = String(calc.ACTIVITY?.[p.activity]?.label || '').split(' (')[0];
  const kc = Number(p.target_kcal) || 0, pr = Number(p.target_protein) || 0, ca = Number(p.target_carbs) || 0, fa = Number(p.target_fat) || 0;
  const sh = [pr * 4, ca * 4, fa * 9];
  const code = p.friend_code;
  const groups = [
    ['Plán a zdravie', [
      { href: '#/ciele', i: 'target', c: 'mint', t: 'Ciele a makrá', s: kc ? `${nf(kc)} kcal, B ${nf(pr)} g, S ${nf(ca)} g, T ${nf(fa)} g` : 'Nastav si kalórie a makrá', k: 'kalorie bielkoviny sacharidy tuky' },
      { href: '#/onboarding', i: 'user', c: 'sky', t: 'Moje údaje', s: [p.height_cm ? U.fmtH(p.height_cm) : '', p.training_days != null ? `${p.training_days} ${Number(p.training_days) === 1 ? 'tréning' : Number(p.training_days) < 5 ? 'tréningy' : 'tréningov'} týždenne` : act].filter(Boolean).join(', ') || 'Váha, výška, cieľ, aktivita', k: 'vaha vyska aktivita cieľ' },
      { href: '#/rezim', i: 'heart', c: 'rose', t: 'Zdravie a diéta', s: 'Cukrovka, celiakia, alergie', k: 'diabetes cukor alergie celiakia', id: 'pfxDx' },
      { href: '#/navyky', i: 'shield', c: 'violet', t: 'Návyky', s: 'Nikotín a alkohol pod kontrolou', k: 'fajcenie vape alkohol' },
    ]],
    ['Pripojenia a upozornenia', [
      { href: '#/hodinky', i: 'watch', c: 'teal', t: 'Hodinky a Apple Zdravie', s: 'Kroky, spánok a aktivita z hodiniek', k: 'garmin apple health kroky' },
      { href: '#/pripomienky', i: 'bell', c: 'amber', t: 'Pripomienky a notifikácie', s: 'Čo ti a kedy pripomenieme', k: 'notifikacie push upozornenia' },
    ]],
    ['Prehľady', [
      { href: '#/tyzden', i: 'cal', c: 'sky', t: 'Týždenné vyhodnotenie', s: 'Ako sa ti darilo a čo zmeniť', k: 'check-in tyzden' },
      { href: '#/karta', i: 'menu', c: 'amber', t: 'Hotový jedálniček', s: kc ? `Týždeň jedla na ${nf(kc)} kcal` : 'Týždeň jedla jedným ťuknutím', k: 'jedalnicek plan' },
    ]],
    ['Podpora a dáta', [
      { href: '#/napis', i: 'bulb', c: 'amber', t: 'Napíš nám', s: 'Problém alebo nápad', k: 'feedback chyba napad' },
      ...(admin ? [{ href: '#/admin', i: 'chart', c: 'slate', t: 'Admin prehľad', s: 'Používatelia a aktivita', k: 'admin' }] : []),
      { a: 'export', i: 'down', c: 'slate', t: 'Stiahnuť moje dáta', s: 'JSON a CSV so všetkými tvojimi údajmi', k: 'export stiahnut data' },
      { href: 'zasady.html', i: 'doc', c: 'slate', t: 'Zásady ochrany osobných údajov', s: 'Aké údaje máme a prečo', k: 'gdpr sukromie zasady udaje' },
      { href: 'podmienky.html', i: 'doc', c: 'slate', t: 'Podmienky používania', s: 'Pravidlá appky', k: 'podmienky pravidla' },
      { a: 'logout', i: 'out', c: 'red', t: 'Odhlásiť sa', s: p.email || '', dng: true, k: 'odhlasit' },
      { a: 'delete', i: 'trash', c: 'red', t: 'Zmazať účet a dáta', s: 'Natrvalo, bez možnosti vrátiť', dng: true, k: 'zmazat ucet vymazat dáta gdpr' },
    ]],
  ];
  return `
<h1>Profil</h1>
<section class="pfx-hero">
  <div class="pfx-hd">
    <div class="pfx-av">
      <svg class="pfx-ring" viewBox="0 0 100 100"><defs><linearGradient id="pfxg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#FFA53A"/></linearGradient></defs><circle class="trk" cx="50" cy="50" r="46"/><circle class="fl" cx="50" cy="50" r="46" pathLength="100"/></svg>
      <span class="pfx-ini">${h(initials(p.name))}</span><b class="pfx-lv" data-lv>1</b>
    </div>
    <div class="pfx-id">
      <button class="pfx-name" type="button" data-a="rename" aria-label="Zmeniť meno"><span>${h(p.name || 'Bez mena')}</span>${ic('pen')}</button>
      <p class="pfx-mail">${h(p.email || '')}</p>
      <div class="pfx-chips"><span class="pfx-chip lv" data-lvn>Úroveň 1</span><span class="pfx-chip fire" data-fire hidden>${ic('flame')}<span></span></span>${p.role === 'coach' ? '<span class="pfx-chip">Kouč</span>' : ''}</div>
    </div>
  </div>
  <div class="pfx-xp"><div class="pfx-xb"><i data-xb></i></div><p data-xt>Počítam tvoj postup</p></div>
  <div class="pfx-st"><div><b data-n="days">0</b><span>dní so zápisom</span></div><div><b data-n="best">0</b><span>najlepšia séria</span></div><div><b data-n="badges">0</b><span data-bl>odznakov</span></div></div>
</section>
<section class="pfx-plan">
  <div class="pfx-ph"><h3>Tvoj plán</h3><span class="pfx-goal">${h(goal)}</span><a href="#/ciele">Upraviť</a></div>
  <div class="pfx-pb"><div class="pfx-kc"><b>${kc ? nf(kc) : '0'}</b><span>kcal denne</span></div><div class="pfx-wt"><b data-wt>${p.start_weight ? U.fmtWU(p.start_weight) : '0 ' + U.wUnit()}</b><span data-wd>${p.start_date ? 'od ' + h(calc.fmtDate(p.start_date)) : ''}</span></div></div>
  <div class="pfx-mb">${[['--protein', sh[0]], ['--carbs', sh[1]], ['--fat', sh[2]]].map(([c, v]) => `<i style="flex:${Math.max(v, 1)};background:var(${c})"></i>`).join('')}</div>
  <div class="pfx-ml"><div><b>${nf(pr)} g</b><i style="background:var(--protein)"></i>Bielkoviny</div><div><b>${nf(ca)} g</b><i style="background:var(--carbs)"></i>Sacharidy</div><div><b>${nf(fa)} g</b><i style="background:var(--fat)"></i>Tuky</div></div>
</section>
<div class="pfx-tiles">
  ${tile({ href: '#/spravy', i: 'chat', c: 'sky', t: 'Správy', s: 'Od kouča a tímu', badge: '0' })}
  ${tile({ a: 'invite', i: 'invite', c: 'mint', t: 'Pozvi kamaráta', s: code ? `Tvoj kód ${code}` : 'Porovnajte sa spolu' })}
  ${tile({ a: 'shop', i: 'cart', c: 'amber', t: 'Nákupný zoznam', s: 'Z tvojho plánu na 7 dní' })}
  ${tile({ href: '#/report', i: 'chart', c: 'violet', t: 'Týždenný report', s: 'Skóre a rozbor týždňa' })}
</div>
<label class="pfx-s">${ic('search')}<input type="search" placeholder="Hľadať v nastaveniach" enterkeyhint="search" autocomplete="off" autocapitalize="off" aria-label="Hľadať v nastaveniach"></label>
${groups.map(([t, rows]) => `<h2 class="pfx-gt">${h(t)}</h2><div class="pfx-g">${rows.map(row).join('')}</div>`).join('')}
<div class="pfx-none" hidden>Nič sme nenašli.<br><a href="#/napis">Napíš nám, čo ti chýba</a></div>
<p class="pfx-foot"><b>Fuelwind</b>verzia ${h(APP_VERSION)}, ${new Date().getFullYear()}</p>`;
}

function fill(box, p, d) {
  const { m, ev, weights, unread } = d;
  box.querySelector('[data-lv]').textContent = ev.lv + 1;
  box.querySelector('[data-lv]').classList.add('pop');
  box.querySelector('[data-lvn]').textContent = ev.lvName;
  const frac = ev.nextLv ? Math.max(0, Math.min(1, (ev.xp - ev.lvFrom) / (ev.nextLv[0] - ev.lvFrom))) : 1;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    box.querySelector('.pfx-ring .fl').style.strokeDasharray = `${Math.max(frac * 100, 1.5)} 100`;
    box.querySelector('[data-xb]').style.width = Math.max(frac * 100, 2) + '%';
  }));
  box.querySelector('[data-xt]').textContent = ev.nextLv ? `${ev.xp} XP, do úrovne ${ev.nextLv[1]} ešte ${ev.nextLv[0] - ev.xp} XP` : `${ev.xp} XP, najvyššia úroveň`;
  const fire = box.querySelector('[data-fire]');
  if (m.cur > 0) { fire.hidden = false; fire.lastElementChild.textContent = `${m.cur} ${m.cur === 1 ? 'deň' : m.cur < 5 ? 'dni' : 'dní'} v rade`; }
  countUp(box.querySelector('[data-n=days]'), m.days);
  countUp(box.querySelector('[data-n=best]'), m.streak);
  box.querySelector('[data-n=badges]').innerHTML = `<span data-bc>0</span><small style="font-size:14px;color:var(--muted);font-weight:700">/${ev.total}</small>`;
  countUp(box.querySelector('[data-bc]'), ev.have);
  // váha: posledný záznam oproti štartu
  const last = weights[weights.length - 1], sw = Number(p.start_weight) || 0;
  if (last) {
    const w = Number(last.weight_kg), dlt = sw ? w - sw : 0;
    box.querySelector('[data-wt]').textContent = U.fmtWU(w);
    const wd = box.querySelector('[data-wd]');
    wd.textContent = !sw || Math.abs(dlt) < 0.05 ? 'bez zmeny od štartu' : `${dlt > 0 ? '+' : '-'}${U.fmtW(Math.abs(dlt))} ${U.wUnit()} od štartu`;
    wd.className = dlt < -0.04 ? 'dn' : dlt > 0.04 ? 'up' : '';
  }
  const nb = box.querySelector('[data-nb]'), tl = nb?.closest('.pfx-t');
  if (nb) { nb.hidden = !unread; nb.textContent = unread; }
  if (tl) tl.querySelector('small').textContent = unread ? (unread === 1 ? '1 nová správa' : unread < 5 ? `${unread} nové správy` : `${unread} nových správ`) : 'Od kouča a tímu';
}

// ---------- akcie ----------
function renameSheet(box, p) {
  const bg = ctx.sheet(`<div class="pfx-sh"><h3>Tvoje meno</h3><p>Takto ťa oslovíme v appke a uvidia ťa kamaráti.</p><input class="pfx-in" maxlength="40" value="${h(p.name || '')}" autocomplete="off" aria-label="Meno"><div class="pfx-sb"><button class="btn primary" data-ok>Uložiť</button><button class="btn ghost" data-x>Zrušiť</button></div></div>`);
  const inp = bg.querySelector('input'), ok = bg.querySelector('[data-ok]');
  setTimeout(() => { inp.focus(); inp.select(); }, 120);
  const save = async () => {
    const name = inp.value.trim().replace(/\s+/g, ' ');
    if (name.length < 2) { ctx.toast('Meno musí mať aspoň 2 znaky', true); return; }
    if (name === p.name) { bg.remove(); return; }
    ok.disabled = true;
    try {
      const { error } = await db.sb.from('profiles').update({ name }).eq('id', p.id);
      if (error) throw new Error(error.message);
      p.name = name;
      box.querySelector('.pfx-name span').textContent = name;
      box.querySelector('.pfx-ini').textContent = initials(name);
      bg.remove(); ctx.toast('Meno uložené');
    } catch (e) { ok.disabled = false; ctx.toast(e.message || 'Meno sa nepodarilo uložiť', true); }
  };
  ok.onclick = save;
  inp.onkeydown = e => { if (e.key === 'Enter') save(); };
  bg.querySelector('[data-x]').onclick = () => bg.remove();
}
async function invite(p) {
  if (!p.friend_code) { location.hash = '#/'; return; }
  const url = `${location.origin}${location.pathname}#/kamarat/${p.friend_code}`;
  try {
    if (navigator.share) await navigator.share({ title: 'Fuelwind', text: 'Pridaj sa ku mne vo Fuelwind a porovnajme sa.', url });
    else { await navigator.clipboard.writeText(url); ctx.toast('Odkaz skopírovaný'); }
  } catch (e) { if (e?.name !== 'AbortError') ctx.toast('Nepodarilo sa zdieľať', true); }
}
function logoutSheet(screen) {
  const bg = ctx.sheet('<div class="pfx-sh"><h3>Odhlásiť sa?</h3><p>Tvoje dáta ostanú uložené. Po prihlásení ich nájdeš tak, ako si ich nechal.</p><div class="pfx-sb"><button class="btn danger" data-ok>Odhlásiť sa</button><button class="btn ghost" data-x>Zostať</button></div></div>');
  bg.querySelector('[data-x]').onclick = () => bg.remove();
  bg.querySelector('[data-ok]').onclick = () => { bg.remove(); screen.querySelector('#out')?.click(); };
}

function deleteSheet() {
  const bg = ctx.sheet('<div class="pfx-sh"><h3>Zmazať účet?</h3><p>Natrvalo zmažeme tvoj účet, jedlá, váhu, tréningy, fotky, správy aj prepojenia. Nedá sa to vrátiť. Ak chceš dáta zachovať, najprv si ich stiahni cez Stiahnuť moje dáta.</p><p>Na potvrdenie napíš <b>ZMAZAŤ</b>.</p><input class="pfx-in" autocomplete="off" autocapitalize="characters" aria-label="Potvrdenie" placeholder="ZMAZAŤ"><div class="pfx-sb"><button class="btn danger" data-ok disabled>Zmazať natrvalo</button><button class="btn ghost" data-x>Zrušiť</button></div></div>');
  const inp = bg.querySelector('input'), ok = bg.querySelector('[data-ok]');
  const norm = v => v.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  inp.oninput = () => { ok.disabled = norm(inp.value) !== 'zmazat'; };
  bg.querySelector('[data-x]').onclick = () => bg.remove();
  ok.onclick = async () => {
    if (norm(inp.value) !== 'zmazat') return;
    ok.disabled = true; ok.textContent = 'Mažem…';
    try {
      const { data, error } = await db.sb.functions.invoke('delete-account', { body: { confirm: 'ZMAZAT' } });
      if (error || !data?.ok) {
        // ak účet už neexistuje (zmazal sa pri predchádzajúcom pokuse), je to v poriadku: dokončíme odhlásenie
        const { data: u, error: ue } = await db.sb.auth.getUser().catch(e => ({ error: e }));
        const gone = ue && (ue.status === 403 || ue.status === 404 || /not.?found|does not exist/i.test(ue.message || ''));
        if (!gone && u?.user) throw new Error(data?.error || 'Účet sa nepodarilo zmazať. Skús to znova.');
      }
      try { await db.sb.auth.signOut({ scope: 'local' }); } catch (_) {}
      try { localStorage.clear(); sessionStorage.clear(); } catch (_) {}
      location.replace(location.pathname);
    } catch (e) { ok.disabled = false; ok.textContent = 'Zmazať natrvalo'; ctx.toast(e.message || 'Účet sa nepodarilo zmazať.', true); }
  };
}
const bound = new WeakSet();
function build(screen) {
  const p = ctx.state?.profile; if (!p) return;
  const box = document.createElement('div'); box.className = 'pfx-root';
  box.innerHTML = html(p, !!screen.querySelector('a[href="#/admin"]'));
  screen.classList.add('pfx'); screen.prepend(box); bound.add(box);
  box.addEventListener('click', async e => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const a = b.dataset.a;
    if (a === 'rename') renameSheet(box, p);
    else if (a === 'invite') invite(p);
    else if (a === 'logout') logoutSheet(screen);
    else if (a === 'delete') deleteSheet();
    else if (a === 'shop') { try { (await import('./shopping.js')).openShopping(7); } catch (_) { ctx.toast('Zoznam sa nepodarilo otvoriť', true); } }
    else if (a === 'export') { b.style.opacity = .5; try { await exportMine(ctx.toast); } finally { b.style.opacity = ''; } }
  });
  const q = box.querySelector('.pfx-s input'), none = box.querySelector('.pfx-none');
  q.addEventListener('input', () => {
    const t = q.value.trim().toLowerCase();
    box.querySelectorAll('.pfx-g').forEach(g => {
      let any = false;
      g.querySelectorAll('.pfx-r').forEach(r => { const s = !t || r.dataset.k.includes(t); r.hidden = !s; any = any || s; });
      g.hidden = !any; g.previousElementSibling.hidden = !any;
    });
    const vis = [...box.querySelectorAll('.pfx-r')].some(r => !r.hidden);
    none.hidden = vis;
    box.querySelector('.pfx-tiles').hidden = !!t; box.querySelector('.pfx-hero').hidden = !!t; box.querySelector('.pfx-plan').hidden = !!t;
  });
  let shown = null;
  if (cache && cache.uid === p.id) { shown = cache.d; fill(box, p, shown); }
  loadStats(p).then(d => { if (box.isConnected && d !== shown) fill(box, p, d); }).catch(() => { box.querySelector('[data-xt]').textContent = 'Postup sa nepodarilo načítať'; });
}

function run() {
  const out = root?.querySelector('#out');
  const screen = out?.closest('.screen');
  if (screen) {
    const old = screen.querySelector(':scope > .pfx-root');
    if (old && !bound.has(old)) { old.remove(); screen.classList.remove('pfx'); }
    if (!screen.classList.contains('pfx')) build(screen);
    // popis „Zdravie a diéta“ si doplní podľa zapnutých režimov (odkaz pridáva dxdash.js asynchrónne)
    const dx = screen.querySelector('#dxlink'), sub = screen.querySelector('#pfxDx small');
    if (dx && sub) { const t = dx.textContent.replace(/^\S+\s+Zdravie a diéta:?\s*/, '').replace(/^\(|\)$/g, '').trim(); if (t && sub.textContent !== t) sub.textContent = t; }
  }
}
if (root) { new MutationObserver(run).observe(root, { childList: true, subtree: true }); run(); }
