// Predplatné GainTrain Plus (v303). Kým je v databáze billing.on = false, tento modul nerobí nič viditeľné:
// nič sa neobmedzuje, v Profile nie je karta predplatného a obrazovka s cenami sa nikdy neukáže.
// Po zapnutí:
//   * nárok (predplatné, 7 dní skúšobnej doby, admin, tréner) a dnešné limity AI prídu z my_entitlement()
//   * AI funkcie na serveri pri prekročení limitu vrátia 402 s paywall: true; tu sa vtedy otvorí obrazovka predplatného
//   * funkcie len s predplatným (menu, chladnička, postava, import receptu) sa ponúknu ešte pred fotením, nie až po ňom
//   * platí sa cez Stripe Checkout (funkcia billing-checkout), zrušenie a zmena karty cez Stripe portál (billing-portal)
import * as db from './data.js';
import { ctx } from './app.js';

const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tk = (n, p) => { try { window.fwTrack && window.fwTrack(n, p || {}); } catch (_) { } };
const KEY = 'fw_ent';

export const ent = { on: false, premium: true, reason: 'off', limits: {}, used: {}, plans: [] };
try { const c = JSON.parse(localStorage.getItem(KEY) || 'null'); if (c && typeof c === 'object') Object.assign(ent, c); } catch (_) { }

let loading = null, lastLoad = 0;
export function load(force) {
  if (!force && loading) return loading;
  if (!force && Date.now() - lastLoad < 60000) return Promise.resolve(ent);
  loading = (async () => {
    try {
      await db.ready;
      const { data: s } = await db.sb.auth.getSession();
      if (!s?.session) return ent;
      const { data, error } = await db.sb.rpc('my_entitlement');
      if (error || !data) { if (error && /does not exist|PGRST202|42883/i.test(error.message + ' ' + error.code)) set({ on: false, premium: true, reason: 'off', limits: {}, used: {}, plans: [] }); return ent; }
      set(data); lastLoad = Date.now();
    } catch (_) { /* bez siete ostane posledný známy stav */ }
    return ent;
  })().finally(() => { loading = null; });
  return loading;
}
function set(d) {
  Object.keys(ent).forEach(k => delete ent[k]);
  Object.assign(ent, { on: false, premium: true, limits: {}, used: {}, plans: [] }, d);
  try { localStorage.setItem(KEY, JSON.stringify(ent)); } catch (_) { }
  document.documentElement.classList.toggle('gt-free', !!(ent.on && !ent.premium));
  try { dispatchEvent(new CustomEvent('fw-ent', { detail: ent })); } catch (_) { }
}
export const isPremium = () => !ent.on || !!ent.premium;
// bez Plus podľa čerstvej odpovede servera (nie len z uloženej kópie): pre kroky, ktoré niečo menia, napr. výmenu plánu
export async function confirmedFree() { await load(); return lastLoad > 0 && !!ent.on && !ent.premium; }
export const left = f => { if (!ent.on) return Infinity; const l = ent.limits?.[f]; if (l == null) return Infinity; return Math.max(0, l - (ent.used?.[f] || 0)); };

// funkcie len s predplatným: ponuka hneď pri ťuknutí na vstup, aby človek zbytočne nefotil
const PREMIUM_ONLY = { menu_scan: 'Odfoť denné menu', fridge_scan: 'Čo uvarím z chladničky', physique_ai: 'AI analýza postavy', recipe_import: 'Import receptu z odkazu', custom_plan: 'Tréningový plán na mieru', crossfit: 'CrossFit plán od Laury', ai_log: 'Zápis jedla cez AI (hlas, fotka)', skin: 'Vzhľady Cookie a Nálepky' };
export function gate(feature) {
  if (isPremium()) return true;
  const only = feature === 'skin'; // funkcie bez limitu v nastavení: vždy len s Plus
  if (!only && left(feature) > 0) return true;
  paywall({ feature, reason: only || (ent.limits?.[feature] ?? 1) === 0 ? 'premium_only' : 'free_limit' });
  return false;
}
try { window.fwGate = gate; } catch (_) { }

// odpoveď AI funkcie 402 (limit) → obrazovka predplatného. Volajúci kód si chybu vyčíta sám (telo sa číta z kópie).
function wrapInvoke() {
  try {
    const fns = db.sb.functions; if (!fns || fns.__gtWrapped) return;
    const orig = fns.invoke.bind(fns);
    const wrapped = async (name, opts) => {
      const r = await orig(name, opts);
      try {
        const st = r?.error?.context?.status;
        if (st === 402) { const j = await r.error.context.clone().json(); if (j?.paywall) { load(true); setTimeout(() => paywall(j), 0); } }
      } catch (_) { }
      return r;
    };
    // sb je Proxy: vlastnosť nastavená priamo na ňom má prednosť pred klientom
    db.sb.functions = new Proxy(fns, { get: (t, k) => k === 'invoke' ? wrapped : k === '__gtWrapped' ? true : (typeof t[k] === 'function' ? t[k].bind(t) : t[k]) });
  } catch (_) { }
}
db.ready.then(() => { wrapInvoke(); load(true); }).catch(() => { });
addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') load(); });

// ---------- obrazovka predplatného ----------
const CSS = `
.pw{position:fixed;inset:0;z-index:80;outline:none;overflow:hidden;background:var(--bg);color:var(--text);animation:pwIn .26s cubic-bezier(.2,.8,.2,1) both}
.pw.out{animation:pwOut .2s ease both}
@keyframes pwIn{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}@keyframes pwOut{to{opacity:0;transform:translateY(16px)}}
.pw-in{max-width:460px;margin:0 auto;display:flex;flex-direction:column;height:100%}
.pw-scroll{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:calc(env(safe-area-inset-top) + 10px) 20px 18px}
.pw-foot{flex:none;padding:12px 20px calc(env(safe-area-inset-bottom) + 12px);background:var(--bg);border-top:1px solid var(--line);display:flex;flex-direction:column}
.pw-foot .pw-go{margin-top:0}.pw-foot .pw-fine{margin-top:8px;font-size:11.5px;line-height:1.45}.pw-foot .pw-err{margin:8px 0 0}
.pw-foot .pw-later{margin-top:2px;padding:8px}
.pw-x{display:block;margin-left:auto;margin-bottom:6px;width:40px;height:40px;border-radius:50%;border:1px solid var(--line);background:var(--card);color:var(--muted);font:inherit;font-size:20px;line-height:1;cursor:pointer}
.pw-hero{position:relative;margin:2px 0 0;padding:18px 18px 16px;border-radius:24px;overflow:hidden;background:
  radial-gradient(120% 90% at 100% 0%,color-mix(in srgb,var(--accent) 34%,transparent),transparent 60%),
  radial-gradient(90% 80% at 0% 100%,color-mix(in srgb,var(--accent-2,#8C8CFF) 26%,transparent),transparent 60%),var(--card);border:1px solid var(--line)}
.pw-tag{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:800;padding:5px 10px;border-radius:99px;background:var(--accent);color:var(--accent-ink,#06210f)}
.pw-h{font-size:26px;line-height:1.13;font-weight:800;letter-spacing:-.02em;margin:12px 0 6px}
.pw-sub{margin:0;color:var(--muted);font-size:14.5px;line-height:1.5}
.pw-why{margin:12px 0 0;padding:10px 12px;border-radius:14px;background:color-mix(in srgb,var(--text) 6%,transparent);font-size:13.5px;line-height:1.45}
.pw-ben{list-style:none;margin:16px 0 4px;padding:0;display:flex;flex-direction:column;gap:11px}
.pw-ben li{display:flex;gap:12px;align-items:center;font-size:15.5px;font-weight:700;line-height:1.3}
.pw-ben i{flex:none;width:32px;height:32px;border-radius:10px;display:grid;place-items:center;font-style:normal;font-size:17px;background:var(--card);border:1px solid var(--line)}
.pw-ben small{display:block;color:var(--muted);font-size:12.5px;margin-top:2px}
.pw-plans{display:flex;flex-direction:column;gap:10px;margin:18px 0 0}
.pw-plan{position:relative;display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:15px 16px;border-radius:18px;border:2px solid var(--line);background:var(--card);color:inherit;font:inherit;cursor:pointer}
.pw-plan[aria-checked=true]{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 9%,var(--card))}
.pw-plan .r{flex:none;width:22px;height:22px;border-radius:50%;border:2px solid var(--line)}
.pw-plan[aria-checked=true] .r{border-color:var(--accent);box-shadow:inset 0 0 0 4px var(--card);background:var(--accent)}
.pw-plan .n{flex:1;min-width:0}.pw-plan .n b{display:block;font-size:16px}.pw-plan .n small{color:var(--muted);font-size:12.5px}
.pw-plan .p{text-align:right;font-variant-numeric:tabular-nums}.pw-plan .p b{display:block;font-size:17px}.pw-plan .p small{color:var(--muted);font-size:12px}
.pw-plan .bd{position:absolute;top:-10px;right:14px;font-size:11.5px;font-weight:800;padding:3px 8px;border-radius:99px;background:var(--accent);color:var(--accent-ink,#06210f)}
.pw-go{margin-top:18px;border:0;border-radius:18px;padding:17px;font:inherit;font-size:16.5px;font-weight:800;cursor:pointer;background:var(--accent);color:var(--accent-ink,#06210f)}
.pw-go:disabled{opacity:.6}
.pw-go.alt{background:var(--card);color:var(--text);border:1px solid var(--line);margin-top:10px}
.pw-who{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin:18px 0 0;padding:4px;border-radius:16px;background:var(--card);border:1px solid var(--line)}
.pw-who button{border:0;border-radius:12px;padding:10px;background:none;color:var(--muted);font:inherit;font-size:14px;font-weight:800;cursor:pointer}
.pw-who button[aria-pressed=true]{background:var(--accent);color:var(--accent-ink,#06210f)}
.pw-plan .n .pw-noads{display:block;color:var(--accent);font-weight:700;margin-top:2px}
.pw-plan .p s{display:block;color:var(--muted);font-size:12.5px}
.pw-ppl{font-style:normal;font-size:12px;font-weight:700;color:var(--muted);margin-left:4px}
.pw-code{align-self:center;margin-top:10px;background:none;border:0;color:var(--accent);font:inherit;font-size:13.5px;font-weight:700;padding:8px;cursor:pointer}
.pw-fine{margin:12px 0 0;text-align:center;color:var(--muted);font-size:12px;line-height:1.5}
.pw-fine a{color:inherit}
.pw-more{border:0;background:none;color:var(--muted);font:inherit;font-size:13.5px;font-weight:700;padding:6px;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
.pw-tl{list-style:none;margin:16px 0 0;padding:0 0 0 4px;display:flex;flex-direction:column;gap:0}
.pw-tl li{position:relative;padding:0 0 14px 26px;font-size:14px;line-height:1.35}
.pw-tl li::before{content:'';position:absolute;left:3px;top:5px;width:10px;height:10px;border-radius:50%;background:var(--accent)}
.pw-tl li::after{content:'';position:absolute;left:7px;top:17px;bottom:-1px;width:2px;background:color-mix(in srgb,var(--accent) 35%,transparent)}
.pw-tl li:last-child{padding-bottom:0}.pw-tl li:last-child::after{display:none}
.pw-tl li:last-child::before{background:var(--muted)}
.pw-tl b{display:block;font-size:14.5px}.pw-tl small{color:var(--muted);font-size:12.5px}
.pw-nopay{margin:8px 0 0;text-align:center;font-size:13.5px;font-weight:700;color:var(--accent)}
.pw-err{margin:10px 0 0;text-align:center;color:var(--danger,#FF5C7A);font-size:13px}
.pw-later{align-self:center;margin-top:6px;background:none;border:0;color:var(--muted);font:inherit;font-size:14px;padding:10px;cursor:pointer}
.pw-st{margin:16px 0 0;padding:16px;border-radius:18px;background:var(--card);border:1px solid var(--line)}
.pw-st b{font-size:16px}.pw-st p{margin:6px 0 0;color:var(--muted);font-size:13.5px;line-height:1.45}
.gt-sub{display:flex;align-items:center;gap:12px;margin:0 0 12px;padding:14px 16px;border-radius:18px;border:1px solid var(--line);background:
  radial-gradient(120% 120% at 100% 0%,color-mix(in srgb,var(--accent) 18%,transparent),transparent 60%),var(--card);color:inherit;text-decoration:none;width:100%;font:inherit;text-align:left;cursor:pointer}
.gt-sub i{flex:none;width:38px;height:38px;border-radius:12px;display:grid;place-items:center;font-style:normal;font-size:19px;background:var(--accent);color:var(--accent-ink,#06210f)}
.gt-sub div{flex:1;min-width:0}.gt-sub b{display:block;font-size:15px}.gt-sub small{color:var(--muted);font-size:12.5px}
.gt-sub span{color:var(--muted);font-size:20px}
/* v339: kompaktné rozloženie, aby boli plány vidieť hneď, bez posúvania */
.pw-top{display:flex;align-items:center;justify-content:space-between;gap:10px}
.pw-top .pw-x{margin:0;flex:none}
.pw-hero{margin:14px 0 0;padding:0;background:none;border:0;border-radius:0;overflow:visible}
.pw-h{font-size:27px;margin:0 0 6px}.pw-sub{font-size:14.5px}
.pw-ben{margin:14px 0 0;gap:8px}.pw-ben li{font-size:15px}.pw-ben i{width:30px;height:30px;border-radius:9px;font-size:15px}
.pw-plans{margin:16px 0 0;gap:8px}.pw-plan{padding:11px 14px;border-radius:16px}.pw-plan .n .pw-noads{display:none}
.pw-who{margin:12px 0 0}
.pw-code{margin-top:4px}
/* v343: úplný zoznam funkcií, plány v pevnej lište */
.pw-feats{display:flex;flex-direction:column;gap:14px;margin:18px 0 0}
.pw-fg h2{margin:0 0 7px 4px;font-size:13.5px;font-weight:800;color:var(--muted);letter-spacing:.01em}
.pw-fg ul{list-style:none;margin:0;padding:4px 14px;border-radius:20px;background:var(--card);border:1px solid var(--line)}
.pw-fg li{display:flex;gap:12px;align-items:center;padding:11px 0;border-bottom:1px solid var(--line)}
.pw-fg li:last-child{border-bottom:0}
.pw-fg li i{flex:none;width:38px;height:38px;border-radius:12px;display:grid;place-items:center;font-style:normal;font-size:19px;background:color-mix(in srgb,var(--accent) 14%,var(--card));border:1px solid color-mix(in srgb,var(--accent) 28%,var(--line))}
.pw-fg li b{display:block;font-size:15px;line-height:1.25}.pw-fg li small{display:block;margin-top:2px;color:var(--muted);font-size:12.5px;line-height:1.35}
.pw-pts{display:grid;grid-template-columns:repeat(var(--n,3),1fr);gap:8px;margin:2px 0 12px}
.pw-pt{position:relative;display:flex;flex-direction:column;align-items:center;gap:1px;padding:15px 4px 10px;border-radius:16px;border:2px solid var(--line);background:var(--card);color:inherit;font:inherit;cursor:pointer;min-width:0;text-align:center}
.pw-pt[aria-checked=true]{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,var(--card))}
.pw-pt .nm{font-size:13.5px}.pw-pt .pr{font-size:17px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap}
.pw-pt .pr s{display:block;font-size:11.5px;font-weight:600;color:var(--muted);line-height:1.1}
.pw-pt small{font-size:11.5px;color:var(--muted);line-height:1.25}
.pw-pt .bd{position:absolute;top:-10px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:11px;font-weight:800;padding:3px 8px;border-radius:99px;background:var(--accent);color:var(--accent-ink,#06210f)}
.pw-row{display:flex;align-items:center;justify-content:space-between;gap:8px}
.pw-row .pw-later{margin:2px 0 0;padding:8px 6px}.pw-row .pw-grp{color:var(--accent);font-weight:700}
.pw-foot .pw-go{margin-top:0}
@media (prefers-reduced-motion:reduce){.pw,.pw.out{animation:none}}
`;
function css() { if (document.getElementById('pwCss')) return; const s = document.createElement('style'); s.id = 'pwCss'; s.textContent = CSS; document.head.appendChild(s); }

// všetko, čo Plus odomyká (rovnaký zoznam sa používa na ponuke aj pri oslave)
const FEATS = [
  ['AI zápis a kouč', [
    ['📸', 'Zápis jedla fotkou', 'Odfoť tanier a AI spočíta kalórie a makrá'],
    ['🎙️', 'Zápis hlasom', 'Nadiktuj, čo si jedol, a je to zapísané'],
    ['✍️', 'Zápis textom cez AI', 'Napíš „2 vajcia a toast“ a hotovo'],
    ['🏷️', 'Sken tabuľky z obalu', 'Nutričné hodnoty priamo z fotky'],
    ['💬', 'AI kouč', 'Poradí s jedlom aj tréningom a po zápise ti zhodnotí deň'],
  ]],
  ['Jedlo a recepty', [
    ['🍽️', 'Odfoť denné menu', 'AI z lístka vyberie jedlo, ktoré ti dnes sedí'],
    ['🧊', 'Čo uvarím z chladničky', 'Odfoť chladničku a dostaneš recepty na tvoj cieľ'],
    ['🔗', 'Import receptov z odkazu', 'Recept z ľubovoľnej stránky zapíšeš jedným ťuknutím'],
  ]],
  ['Tréning a postava', [
    ['🏋️', 'Tréningový plán na mieru', 'Podľa tvojej postavy a cieľa, s váhami na štart, týždenne sa vyvíja'],
    ['🔥', 'CrossFit plán', 'Kruhové tréningy vonku aj vnútri s počítadlom kôl'],
    ['📷', 'Sken stroja v posilňovni', 'Odfoť stroj a AI ti ukáže, ako na ňom cvičiť'],
    ['💪', 'Analýza postavy', 'Pokrok z fotiek, partia po partii'],
  ]],
  ['Navyše', [
    ['🎨', 'Vzhľady Cookie a Nálepky', 'Appka v štýle, aký ťa baví'],
    ['🚫', 'Bez reklám', 'Nikde ťa nič nebude rušiť'],
    ['👨‍👩‍👧', 'Duo a Rodina', 'Zdieľaj Plus s partnerom alebo rodinou'],
  ]],
];
const UNLOCKS = ['Zápis jedla fotkou, hlasom aj textom', 'AI kouč kedykoľvek', 'Denné menu a recepty z chladničky', 'Tréningový plán na mieru', 'CrossFit plán', 'Sken stroja a analýza postavy', 'Vzhľady Cookie a Nálepky', 'Bez reklám'];
const WHY = {
  free_limit: f => `Dnešné AI ${f === 'coach_chat' ? 'správy' : 'zápisy'} zadarmo sú minuté. Zajtra sa obnovia, s Plus ich máš bez limitu.`,
  premium_only: f => `${PREMIUM_ONLY[f] || 'Táto funkcia'} je súčasťou GainTrain Plus.`,
  cap: () => 'Dnes si túto funkciu použil už veľakrát. Zajtra sa limit obnoví.',
};
const eur = v => v == null ? '' : Number(v).toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const mo = p => Number(p.months) || (p.id === 'year' ? 12 : p.id === 'quarter' || p.id === 'q' ? 3 : 1);
const days = t => Math.max(0, Math.ceil((new Date(t) - Date.now()) / 864e5));
const dLabel = n => n === 1 ? '1 deň' : n >= 2 && n <= 4 ? `${n} dni` : `${n} dní`;
const seatsOf = p => Number(p?.seats) || 1;
const pplLabel = n => n === 2 ? '2 ľudia' : `do ${n} ľudí`;
// cena prvého obdobia po zľave (prvý rok pre nových, zľava na návrat), inak null
function offerPrice(p) {
  const of = ent.offers || {};
  if (ent.offer === 'first_year' && of.first_year && (of.first_year.plans || []).includes(p.id) && Number(of.first_year.price) < Number(p.price)) return { price: Number(of.first_year.price), label: 'Prvý rok' };
  if (ent.offer === 'winback' && of.winback && (of.winback.plans || []).includes(p.id) && Number(of.winback.price) > 0 && Number(of.winback.price) < Number(p.price)) return { price: Number(of.winback.price), label: `Vitaj späť, -${Math.round((1 - of.winback.price / p.price) * 100)} %` };
  return null;
}

let open = null;
export function paywall(info = {}) {
  if (!ent.on && !info.preview) return;
  if (open) return;
  css(); tk('pw_open', { f: info.feature || '', r: info.reason || '' });
  const el = document.createElement('div'); el.className = 'pw'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'GainTrain Plus');
  open = el; document.body.appendChild(el); document.body.style.overflow = 'hidden';
  const close = () => { if (!open) return; el.classList.add('out'); setTimeout(() => el.remove(), 200); open = null; document.body.style.overflow = ''; removeEventListener('keydown', esc); };
  const esc = e => { if (e.key === 'Escape') close(); };
  addEventListener('keydown', esc);
  const all = (info.plans || ent.plans || []).filter(p => p && p.id && p.price != null);
  const solo = all.filter(p => seatsOf(p) === 1), group = all.filter(p => seatsOf(p) > 1);
  let who = 'solo', pick = (solo.find(p => p.id === 'year') || solo[0] || all[0])?.id;
  const month = solo.find(p => p.id === 'month');
  const isSub = ent.reason === 'sub', isMember = ent.reason === 'member';
  const trialDays = Number(ent.trial_offer_days) || 0;
  const trial = ent.reason === 'trial' && ent.trial_end ? days(ent.trial_end) : null;
  const why = info.reason && WHY[info.reason] ? WHY[info.reason](info.feature) : '';

  const card = p => {
    const of = offerPrice(p), m = mo(p), n = seatsOf(p);
    const save = month && m > 1 ? Math.round((1 - (of ? of.price : p.price) / (month.price * m)) * 100) : 0;
    const badge = of ? of.label : n === 1 && save >= 15 ? `-${save} %` : '';
    const sub = n > 1 ? `${eur(p.price / n / m)} / osoba` : m > 1 ? `${eur((of ? of.price : p.price) / m)} / mes.` : 'zrušíš kedykoľvek';
    const nm = n > 1 ? p.name : p.id === 'month' ? 'Mesačne' : p.id === 'year' ? 'Ročne' : p.name;
    return `<button class="pw-pt" type="button" role="radio" aria-checked="${p.id === pick}" data-plan="${h(p.id)}">
      ${badge ? `<span class="bd">${h(badge)}</span>` : ''}
      <b class="nm">${h(nm)}</b>
      <span class="pr">${of ? `<s>${eur(p.price)}</s>` : ''}${eur(of ? of.price : p.price)}</span>
      <small>${sub}</small></button>`;
  };
  const chosen = () => all.find(p => p.id === pick);
  const ctaText = () => trialDays > 0 ? `Vyskúšať ${dLabel(trialDays)} zadarmo` : 'Pokračovať';
  const fine = () => {
    const p = chosen(); if (!p) return '';
    const of = offerPrice(p), first = of ? of.price : p.price;
    const tail = 'Zrušíš kedykoľvek v Profile.';
    return (trialDays > 0
      ? `${dLabel(trialDays)} zadarmo, potom ${eur(first)} ${of ? 'za prvý rok, ďalej ' + eur(p.price) + ' ročne' : 'za ' + h(p.period)}. `
      : of ? `${eur(first)} za prvý rok, potom ${eur(p.price)} ročne. ` : `${eur(p.price)} za ${h(p.period)}, obnovuje sa automaticky. `) + tail;
  };
  const timeline = () => {
    const p = chosen(); if (!p || !(trialDays > 0)) return '';
    const of = offerPrice(p), first = of ? of.price : p.price, rem = Math.max(1, trialDays - 3);
    return `<ol class="pw-tl"><li><b>Dnes</b><small>Odomkneš všetko z Plus. Nič neplatíš.</small></li>${rem < trialDays ? `<li><b>Deň ${rem}</b><small>Pripomenieme ti, že skúška čoskoro končí.</small></li>` : ''}<li><b>Deň ${trialDays}</b><small>Prvá platba ${eur(first)}, ak predplatné nezrušíš.</small></li></ol>`;
  };
  const drawPlans = () => {
    const list = who === 'solo' ? solo : group;
    const box = el.querySelector('.pw-pts'); if (!box) return;
    box.style.setProperty('--n', String(Math.max(1, list.length)));
    box.innerHTML = list.map(card).join('');
    box.querySelectorAll('[data-plan]').forEach(x => x.onclick = () => { pick = x.dataset.plan; drawPlans(); });
    const tl = el.querySelector('[data-tl]'); if (tl) tl.innerHTML = timeline();
    const f = el.querySelector('[data-fine]'); if (f) f.innerHTML = fine() + ' <a href="/podmienky.html#predplatne" target="_blank" rel="noopener">Podmienky</a>';
    const w = el.querySelector('[data-who]'); if (w) { w.dataset.who = who === 'solo' ? 'group' : 'solo'; w.textContent = who === 'solo' ? 'Duo a Rodina ›' : '‹ Len pre mňa'; }
  };

  const title = isSub ? 'Máš GainTrain Plus' : isMember ? 'Máš GainTrain Plus' : info.welcome ? 'Tvoj plán je hotový' : 'Odomkni celé GainTrain';
  const subline = isSub ? (ent.trialing ? `Skúšobná doba, prvá platba ${new Date(ent.period_end).toLocaleDateString('sk-SK')}.` : ent.cancel ? `Predplatné skončí ${new Date(ent.period_end).toLocaleDateString('sk-SK')}. Dovtedy máš všetko.` : `Obnoví sa ${new Date(ent.period_end).toLocaleDateString('sk-SK')}.`)
    : isMember ? `Si v predplatnom, ktoré platí ${h(ent.owner || 'iný človek')}. Celé Plus máš, kým platí.`
      : trial != null ? `Skúšobná doba: ešte ${dLabel(trial)} máš všetko zadarmo.` : info.welcome ? (trialDays > 0 ? `Odomkni AI, kouča a plán na mieru. ${dLabel(trialDays)} zadarmo, teraz nič neplatíš.` : 'Odomkni AI, kouča a plán na mieru.') : 'Zapisovanie jedla a hotový plán ostávajú zadarmo.';
  const group1 = isSub && seatsOf(all.find(p => p.id === ent.plan)) > 1;

  const featHtml = FEATS.map(([g, rows]) => `<section class="pw-fg"><h2>${g}</h2><ul>${rows.map(([i, t, s]) => `<li><i>${i}</i><div><b>${t}</b><small>${s}</small></div></li>`).join('')}</ul></section>`).join('');
  const hero = `<div class="pw-top"><span class="pw-tag">✦ GainTrain Plus</span><button class="pw-x" type="button" aria-label="Zavrieť">×</button></div>
    <div class="pw-hero">
      <h1 class="pw-h">${title}</h1>
      <p class="pw-sub">${subline}</p>
      ${why ? `<p class="pw-why">${h(why)}</p>` : ''}
    </div>
    <div class="pw-feats">${featHtml}</div>`;
  const buying = !isSub && !isMember && all.length;
  el.innerHTML = `<div class="pw-in">
    <div class="pw-scroll">${hero}
      ${buying ? `<div data-tl></div>
        <button class="pw-code" type="button" data-join>Máš pozvánku do Duo alebo Rodiny? Zadaj kód</button>`
        : !isSub && !isMember ? `<div class="pw-st"><b>Predplatné pripravujeme</b><p>Čoskoro si ho tu budeš môcť zapnúť.</p></div>` : ''}
    </div>
    <div class="pw-foot">
      ${isSub ? `${group1 ? '<button class="pw-go" type="button" data-family>Pozvať ľudí do predplatného</button>' : ''}<button class="pw-go${group1 ? ' alt' : ''}" type="button" data-portal>Spravovať predplatné</button><p class="pw-fine">Zmena karty, faktúry a zrušenie cez zabezpečený portál Stripe.</p>`
        : isMember ? `<button class="pw-go alt" type="button" data-leave>Odísť z predplatného</button>`
          : buying ? `<div class="pw-pts" role="radiogroup" aria-label="Plán"></div>
            <button class="pw-go" type="button" data-buy>${ctaText()}</button>
            ${trialDays > 0 ? '<p class="pw-nopay">✓ Teraz nič neplatíš. Zrušíš kedykoľvek.</p>' : ''}
            <p class="pw-fine" data-fine></p>` : ''}
      <p class="pw-err" hidden></p>
      <div class="pw-row"><button class="pw-later" type="button">${isSub || isMember ? 'Zavrieť' : 'Teraz nie'}</button>${buying && group.length ? '<button class="pw-later pw-grp" type="button" data-who="group">Duo a Rodina ›</button>' : ''}</div>
    </div>
  </div>`;
  el.querySelector('.pw-x').onclick = close; el.querySelector('.pw-later').onclick = () => { tk('pw_later', { f: info.feature || '' }); close(); };
  el.querySelectorAll('[data-who]').forEach(b => b.onclick = () => {
    who = b.dataset.who; const list = who === 'solo' ? solo : group;
    if (!list.some(p => p.id === pick)) pick = (list.find(p => p.id === 'year') || list[list.length - 1] || list[0])?.id;
    drawPlans();
  });
  drawPlans();
  const err = m => { const e = el.querySelector('.pw-err'); e.textContent = m; e.hidden = !m; };
  const go = async (fn, body, btn) => {
    if (info.preview) return;
    const label = btn.textContent; btn.disabled = true; btn.textContent = 'Otváram platbu…'; err('');
    try {
      const { data, error } = await db.sb.functions.invoke(fn, { body: { ...body, back: location.origin + location.pathname } });
      let msg = data?.error || '';
      if (error) { msg = error.message; try { const j = await error.context.json(); if (j?.error) msg = j.error; } catch (_) { } }
      if (!data?.url) throw new Error(/failed to send|fetch|network|load failed/i.test(msg) ? 'Bez internetu. Skús to znova.' : msg || 'Platbu sa nepodarilo otvoriť.');
      tk(fn === 'billing-checkout' ? 'pw_checkout' : 'pw_portal', { plan: body.plan || '' });
      location.href = data.url;
    } catch (e) { err(e.message); btn.disabled = false; btn.textContent = label; }
  };
  el.querySelector('[data-buy]')?.addEventListener('click', e => go('billing-checkout', { plan: pick }, e.currentTarget));
  el.querySelector('[data-portal]')?.addEventListener('click', e => go('billing-portal', {}, e.currentTarget));
  el.querySelector('[data-family]')?.addEventListener('click', () => { close(); familySheet(); });
  el.querySelector('[data-join]')?.addEventListener('click', () => { close(); familySheet({ join: true }); });
  el.querySelector('[data-leave]')?.addEventListener('click', async e => {
    const b = e.currentTarget;
    if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Naozaj odísť? Ťukni ešte raz'; return; }
    b.disabled = true;
    const { error } = await db.sb.rpc('family_remove', { p_member: null });
    if (error) { err('Nepodarilo sa. Skús to znova.'); b.disabled = false; return; }
    await load(true); close();
  });
  el.tabIndex = -1; setTimeout(() => el.focus({ preventScroll: true }), 50); // čítačka obrazovky začne od nadpisu, bez rámčeka na tlačidle
}
try { window.fwPaywall = paywall; } catch (_) { }

// ---------- Duo a Rodina: pozvánka kódom a pridanie ----------
const FCSS = `
.fam h3{margin:0;font-size:22px;font-weight:800;letter-spacing:-.02em}
.fam-h{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px}
.fam-x{flex:none;width:36px;height:36px;border-radius:50%;border:1px solid var(--line);background:var(--bg-2,var(--card-2));color:var(--text);font-size:22px;line-height:1;cursor:pointer}
.fam p{margin:4px 0 0;color:var(--muted);font-size:14px;line-height:1.5}
.fam-code{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:16px 0 10px;padding:16px 18px;border-radius:18px;background:var(--card-2);border:1px dashed color-mix(in srgb,var(--accent) 55%,transparent)}
.fam-code b{font-size:26px;letter-spacing:.14em;font-variant-numeric:tabular-nums}
.fam-code button,.fam-row button{border:0;border-radius:12px;padding:9px 13px;background:var(--accent);color:var(--accent-ink,#06210f);font:inherit;font-size:13.5px;font-weight:800;cursor:pointer}
.fam-list{margin:14px 0 0;display:flex;flex-direction:column;gap:8px}
.fam-row{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:16px;background:var(--card-2);border:1px solid var(--line)}
.fam-row span{flex:1;font-weight:700}.fam-row small{color:var(--muted)}
.fam-row button.ghost{background:none;color:var(--muted);border:1px solid var(--line)}
.fam-in{width:100%;margin:16px 0 10px;padding:15px 16px;border-radius:16px;border:1.5px solid var(--line);background:var(--card-2);color:var(--text);font:inherit;font-size:20px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;text-align:center}
.fam-go{width:100%;border:0;border-radius:16px;padding:15px;background:var(--accent);color:var(--accent-ink,#06210f);font:inherit;font-size:16px;font-weight:800;cursor:pointer}
.fam-go:disabled{opacity:.5}
.fam-err{margin:10px 0 0;color:var(--danger,#FF5C7A);font-size:13.5px;font-weight:700;text-align:center}
.fam-free{margin-top:8px;font-size:13px;color:var(--muted)}
`;
export async function familySheet(opt = {}) {
  if (!document.getElementById('famCss')) { const s = document.createElement('style'); s.id = 'famCss'; s.textContent = FCSS; document.head.appendChild(s); }
  const sheet = ctx.sheet || ((html) => { const bg = document.createElement('div'); bg.className = 'sheet-bg'; bg.innerHTML = `<div class="sheet">${html}</div>`; bg.onclick = e => { if (e.target === bg) bg.remove(); }; document.body.appendChild(bg); return bg; });
  const bg = sheet('<div class="fam" id="famBody"><p>Načítavam…</p></div>');
  const body = bg.querySelector('#famBody');
  const close = () => bg.remove();
  const head = t => `<div class="fam-h"><h3>${t}</h3><button class="fam-x" type="button" data-x aria-label="Zavrieť">×</button></div>`;
  const bindX = () => body.querySelector('[data-x]')?.addEventListener('click', close);
  const joinView = (msg = '') => {
    body.innerHTML = `${head('Pridať sa k predplatnému')}<p>Zadaj kód, ktorý ti poslal majiteľ Duo alebo Rodiny. Hneď budeš mať celé Plus, bez reklám, kým jeho predplatné platí.</p>
      <input class="fam-in" maxlength="12" autocomplete="off" autocapitalize="characters" placeholder="KÓD" aria-label="Kód pozvánky">
      <button class="fam-go" type="button" data-j>Pridať sa</button>${msg ? `<p class="fam-err">${h(msg)}</p>` : ''}`;
    bindX();
    const inp = body.querySelector('.fam-in'), btn = body.querySelector('[data-j]');
    setTimeout(() => inp.focus(), 80);
    btn.onclick = async () => {
      const code = inp.value.trim(); if (code.length < 4) { joinView('Zadaj celý kód.'); return; }
      btn.disabled = true; btn.textContent = 'Overujem…';
      const { data, error } = await db.sb.rpc('family_join', { p_code: code });
      if (error) { joinView(/kód|plné|vlastné|inom|predplatné/i.test(error.message) ? error.message : 'Nepodarilo sa. Skús to znova.'); return; }
      await load(true); tk('family_join');
      body.innerHTML = `${head('Hotovo')}<p>Si v predplatnom ${h(data?.owner || '')}. Celé Plus máš odomknuté.</p><button class="fam-go" type="button" data-x2>Super</button>`;
      bindX(); body.querySelector('[data-x2]').onclick = close;
    };
  };
  if (opt.join) { joinView(); return; }
  const { data: f, error } = await db.sb.rpc('family_info');
  if (error || !f) { body.innerHTML = `${head('Duo a Rodina')}<p class="fam-err">Nepodarilo sa načítať. Skús to znova.</p>`; bindX(); return; }
  if (f.role === 'member') { body.innerHTML = `${head('Si v predplatnom')}<p>Plus máš v predplatnom, ktoré platí ${h(f.owner || 'iný človek')}. Odísť môžeš v okne predplatného.</p>`; bindX(); return; }
  if (f.role !== 'owner') { joinView(); return; }
  const draw = (fam) => {
    const free = fam.seats - 1 - fam.members.length;
    const link = `${location.origin}${location.pathname}#/rodina/${fam.code}`;
    body.innerHTML = `${head(fam.seats === 2 ? 'Tvoje Duo' : 'Tvoja Rodina')}
      <p>Pošli kód alebo odkaz ľuďom, ktorých chceš pridať. Dostanú celé Plus bez reklám, platíš len ty.</p>
      <div class="fam-code"><b>${h(fam.code)}</b><button type="button" data-share>Poslať</button></div>
      <p class="fam-free">${free > 0 ? `Voľné miesta: ${free} z ${fam.seats - 1}` : 'Všetky miesta sú obsadené.'}</p>
      <div class="fam-list">${fam.members.map(m => `<div class="fam-row"><span>${h(m.name || 'Člen')}</span><button class="ghost" type="button" data-rm="${h(m.id)}">Odobrať</button></div>`).join('') || '<p>Zatiaľ si tu len ty.</p>'}</div>`;
    bindX();
    body.querySelector('[data-share]').onclick = async () => {
      const text = `Pridaj sa ku mne do GainTrain Plus. Kód: ${fam.code}`;
      try { if (navigator.share) { await navigator.share({ title: 'GainTrain Plus', text, url: link }); return; } } catch (_) { return; }
      try { await navigator.clipboard.writeText(`${text} ${link}`); ctx.toast?.('Skopírované'); } catch (_) { }
    };
    body.querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => {
      if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Naozaj?'; return; }
      b.disabled = true;
      const { error: e2 } = await db.sb.rpc('family_remove', { p_member: b.dataset.rm });
      if (!e2) { fam.members = fam.members.filter(m => m.id !== b.dataset.rm); draw(fam); }
    });
  };
  draw(f);
}
try { window.fwFamily = familySheet; } catch (_) { }
// odkaz #/rodina/KÓD z pozvánky otvorí pridanie s vyplneným kódom
function famLink() {
  const m = /^#\/rodina\/([A-Z0-9]{4,12})$/i.exec(location.hash || ''); if (!m) return;
  history.replaceState(null, '', location.pathname + location.search + '#/');
  db.ready.then(() => setTimeout(async () => { await familySheet({ join: true }); const i = document.querySelector('.fam-in'); if (i) i.value = m[1].toUpperCase(); }, 600));
}
addEventListener('hashchange', famLink); famLink();

// ---------- karta v Profile ----------
function profileCard() {
  if (!ent.on) return;
  const scr = document.querySelector('#app .screen'); if (!scr) return;
  css();
  const anchor = scr.querySelector('.pfx-tiles') || scr.querySelector('a.btn[href="#/ciele"]'); if (!anchor || scr.querySelector('.gt-sub')) return;
  const tr = ent.reason === 'trial' && ent.trial_end ? days(ent.trial_end) : null;
  const fy = ent.offer === 'first_year' && ent.offers?.first_year?.price;
  const [t, s] = ent.reason === 'sub' ? ['GainTrain Plus', ent.trialing ? `Skúšobná doba, prvá platba ${new Date(ent.period_end).toLocaleDateString('sk-SK')}` : ent.cancel ? `Aktívne do ${new Date(ent.period_end).toLocaleDateString('sk-SK')}` : 'Aktívne, spravovať predplatné']
    : ent.reason === 'member' ? ['GainTrain Plus', `V predplatnom, ktoré platí ${ent.owner || 'iný človek'}`]
      : ent.reason === 'admin' || ent.reason === 'trainer' ? ['GainTrain Plus', ent.reason === 'trainer' ? 'Zadarmo pre trénerov' : 'Zadarmo pre admina']
        : tr != null ? ['Skúšobná doba Plus', `Ešte ${dLabel(tr)} máš všetko zadarmo`]
          : ['Získaj GainTrain Plus', Number(ent.trial_offer_days) > 0 ? `${dLabel(Number(ent.trial_offer_days))} zadarmo${fy ? `, potom prvý rok za ${eur(fy)}` : ''}` : ent.offer === 'winback' ? `Vitaj späť: prvý rok za ${eur(ent.offers?.winback?.price || 29.99)}` : 'AI bez limitu, plán na mieru, bez reklám'];
  const b = document.createElement('div'); b.className = 'gt-sub'; b.setAttribute('role', 'button'); b.tabIndex = 0;
  b.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); b.click(); } };
  b.innerHTML = `<i>✦</i><div><b>${t}</b><small>${s}</small></div><span>›</span>`;
  b.onclick = () => paywall({ from: 'profile' });
  anchor.parentNode.insertBefore(b, anchor);
}
const app = document.getElementById('app');
if (app) new MutationObserver(() => { if (ent.on && (location.hash || '').startsWith('#/profil')) profileCard(); }).observe(app, { childList: true, subtree: true });
addEventListener('fw-ent', () => { if ((location.hash || '').startsWith('#/profil')) profileCard(); });

// ---------- oslava po kúpe: pre každý vzhľad (Klasický, Cookie, Nálepky) iná ----------
const CELE = `
.cel{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;padding:20px;text-align:center;overflow:auto;color:var(--text);animation:celIn .4s ease both}
.cel.out{animation:celOut .35s ease both}
@keyframes celIn{from{opacity:0}to{opacity:1}}@keyframes celOut{to{opacity:0;transform:scale(1.04)}}
.cel canvas{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:1}
.cel-in{position:relative;z-index:2;max-width:380px;width:100%;display:flex;flex-direction:column;align-items:center;margin:auto}
.cel-h{margin:20px 0 6px;font-size:31px;line-height:1.1;font-weight:800;letter-spacing:-.02em;animation:celUp .6s ease .5s both}
.cel-s{margin:0;color:var(--muted);font-size:14.5px;line-height:1.5;animation:celUp .6s ease .65s both}
.cel-ul{list-style:none;margin:16px 0 0;padding:0;width:100%;display:flex;flex-direction:column;gap:6px;text-align:left}
.cel-ul li{display:flex;align-items:center;gap:11px;padding:7px 12px;font-size:14.5px;font-weight:700;opacity:0;animation:celUp .45s ease both}
.cel-ul i{position:relative;flex:none;width:26px;height:26px;display:grid;place-items:center;font-style:normal}
.cel-ul i::before{content:'🔒';font-size:15px;position:absolute;animation:celLock .3s ease both;animation-delay:inherit}
.cel-ul i::after{content:'✓';font-weight:900;font-size:15px;position:absolute;opacity:0;animation:celChk .35s cubic-bezier(.3,1.6,.5,1) both;animation-delay:inherit}
@keyframes celLock{0%{opacity:1;transform:none}60%{opacity:1;transform:rotate(-14deg) scale(1.15)}100%{opacity:0;transform:scale(.3)}}
@keyframes celChk{from{opacity:0;transform:scale(.2)}to{opacity:1;transform:none}}
.cel-go{margin-top:18px;width:100%;border:0;font:inherit;font-size:16.5px;font-weight:800;cursor:pointer;padding:17px;animation:celUp .5s ease both}
@keyframes celUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
/* klasický: mätová žiara, orb a prstence */
.cel.k-classic{background:radial-gradient(90% 55% at 50% 30%,color-mix(in srgb,var(--accent) 30%,transparent),transparent 70%),color-mix(in srgb,var(--bg) 96%,#000)}
.k-classic .cel-orb{position:relative;width:128px;height:128px;border-radius:50%;display:grid;place-items:center;font-size:56px;color:var(--accent-ink,#06210f);background:linear-gradient(140deg,var(--accent),color-mix(in srgb,var(--accent) 45%,#fff));box-shadow:0 18px 60px -10px color-mix(in srgb,var(--accent) 85%,transparent),inset 0 2px 0 rgba(255,255,255,.55);animation:celPop .8s cubic-bezier(.2,1.4,.4,1) both}
.k-classic .cel-orb::before,.k-classic .cel-orb::after{content:'';position:absolute;inset:0;border-radius:50%;border:2px solid var(--accent);animation:celRing 1.9s ease-out .35s infinite}
.k-classic .cel-orb::after{animation-delay:1.1s}
@keyframes celPop{from{transform:scale(.2) rotate(-40deg);opacity:0}to{transform:none;opacity:1}}
@keyframes celRing{from{transform:scale(1);opacity:.65}to{transform:scale(2.1);opacity:0}}
.k-classic .cel-ul li{background:var(--card);border:1px solid var(--line);border-radius:14px}
.k-classic .cel-ul i::after{color:var(--accent)}
.k-classic .cel-go{border-radius:18px;color:var(--accent-ink,#06210f);background:var(--accent)}
/* cookie: hrubé čierne okraje, zahryznutá sušienka a omrvinky */
.cel.k-cookie{background:#BDEFDD;--text:#0B1512;--muted:#2F4F47}
.k-cookie .cel-art{width:124px;height:124px;animation:ckDrop .9s cubic-bezier(.3,1.5,.5,1) both,ckWob 2.4s ease-in-out 1s infinite;filter:drop-shadow(0 6px 0 rgba(0,0,0,.9))}
.k-cookie .cel-art svg{width:100%;height:100%;display:block}
@keyframes ckDrop{0%{transform:translateY(-70vh) rotate(-80deg) scale(.6);opacity:0}55%{opacity:1}100%{transform:none;opacity:1}}
@keyframes ckWob{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(5deg) translateY(-4px)}}
.k-cookie .cel-h{font-weight:900;color:#0B1512;text-transform:none}
.k-cookie .cel-ul li{background:#fff;border:2.5px solid #000;border-radius:14px;box-shadow:3px 3px 0 #000;color:#0B1512}
.k-cookie .cel-ul i::after{color:#000;background:#7CFFB2;border:2px solid #000;border-radius:50%;width:24px;height:24px;display:grid;place-items:center;font-size:13px;position:absolute}
.k-cookie .cel-go{background:#000;color:#fff;border-radius:18px;border:3px solid #000;box-shadow:4px 4px 0 #16B07A}
/* nálepky: nalepenie, holografický prstenec, hviezdy */
.cel.k-sticker{background:#ECEBEF;--text:#15131E;--muted:#6A6880}
.k-sticker .cel-art{width:132px;height:132px;background:#fff;border-radius:50%;padding:6px;box-sizing:border-box;box-shadow:0 0 0 5px #fff;animation:stSlap .7s cubic-bezier(.2,1.6,.4,1) both,stShine 3s linear 1s infinite;filter:drop-shadow(0 8px 0 rgba(21,19,30,.18))}
.k-sticker .cel-art{position:relative}.k-sticker .cel-art svg{width:100%;height:100%;display:block}
.k-sticker .cel-art::after{content:'✦';position:absolute;left:50%;top:50%;width:46%;height:46%;transform:translate(-50%,-50%);border-radius:50%;display:grid;place-items:center;font-size:38px;color:#fff;background:linear-gradient(135deg,#C94DA8,#F08A3C)}
@keyframes stSlap{0%{transform:scale(2.6) rotate(24deg);opacity:0}60%{opacity:1}100%{transform:rotate(-6deg)}}
@keyframes stShine{0%,100%{filter:drop-shadow(0 8px 0 rgba(21,19,30,.18)) hue-rotate(0)}50%{filter:drop-shadow(0 8px 0 rgba(21,19,30,.18)) hue-rotate(60deg)}}
.k-sticker .cel-h{display:inline-block;margin:26px 0 8px;padding:8px 16px;background:#fff;border-radius:16px;box-shadow:0 0 0 4px #fff,0 6px 0 4px rgba(21,19,30,.14);transform:rotate(-2deg);color:#15131E;font-size:26px}
.k-sticker .cel-ul li{background:#fff;border-radius:14px;box-shadow:0 0 0 3px #fff,0 4px 0 3px rgba(21,19,30,.12);color:#15131E}
.k-sticker .cel-ul li:nth-child(odd){transform:rotate(-.9deg)}.k-sticker .cel-ul li:nth-child(even){transform:rotate(.9deg)}
.k-sticker .cel-ul i::after{color:#fff;background:linear-gradient(135deg,#C94DA8,#F08A3C);border-radius:50%;width:24px;height:24px;display:grid;place-items:center;font-size:13px;position:absolute}
.k-sticker .cel-go{background:#15131E;color:#fff;border-radius:18px;box-shadow:0 0 0 3px #fff,0 5px 0 3px rgba(21,19,30,.18)}
@media (prefers-reduced-motion:reduce){.cel,.cel *{animation-duration:.01s!important;animation-delay:0s!important;animation-iteration-count:1!important}}
`;
function confetti(cv, mode) {
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  const dpr = Math.min(2, devicePixelRatio || 1), W = cv.width = innerWidth * dpr, H = cv.height = innerHeight * dpr, g = cv.getContext('2d');
  const ac = (getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#7CFFB2').trim() || '#7CFFB2';
  const sets = { classic: [ac, '#FFC857', '#FF8FB1', '#8C8CFF', '#FFFFFF', '#4AE9D6'], cookie: ['#C47F3D', '#92511F', '#E7A961', '#3A1E0C', '#F9D39A'], sticker: ['#C94DA8', '#F08A3C', '#2F7FF0', '#17B978', '#FFC98A', '#8C6CFF'] };
  const cols = sets[mode] || sets.classic, N = mode === 'classic' ? 110 : 80, T = mode === 'classic' ? 3200 : 3800;
  const P = Array.from({ length: N }, () => mode === 'classic'
    ? { x: W / 2, y: H * .34, vx: (Math.random() - .5) * 17 * dpr, vy: (-Math.random() * 15 - 5) * dpr, s: (4 + Math.random() * 6) * dpr, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: cols[(Math.random() * cols.length) | 0], w: Math.random() < .5 }
    : { x: Math.random() * W, y: -Math.random() * H * .6, vx: (Math.random() - .5) * 2 * dpr, vy: (2 + Math.random() * 4) * dpr, s: (5 + Math.random() * (mode === 'sticker' ? 11 : 7)) * dpr, r: Math.random() * 6, vr: (Math.random() - .5) * .25, c: cols[(Math.random() * cols.length) | 0] });
  const star = (s) => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5, r = i % 2 ? s * .45 : s; g.lineTo(Math.sin(a) * r, -Math.cos(a) * r); } g.closePath(); g.fill(); };
  const t0 = performance.now();
  (function f(t) {
    const k = t - t0; if (k > T || !cv.isConnected) return;
    g.clearRect(0, 0, W, H);
    for (const p of P) {
      p.vy += (mode === 'classic' ? .42 : .06) * dpr; p.vx *= .992; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      g.save(); g.globalAlpha = Math.max(0, 1 - k / T); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c;
      if (mode === 'sticker') { g.lineWidth = 2 * dpr; g.strokeStyle = '#fff'; star(p.s / 1.6); g.strokeStyle = '#fff'; }
      else if (mode === 'cookie') { g.beginPath(); g.arc(0, 0, p.s / 3, 0, 7); g.fill(); g.lineWidth = 1.5 * dpr; g.strokeStyle = '#000'; g.stroke(); }
      else p.w ? g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2) : (g.beginPath(), g.arc(0, 0, p.s / 2.4, 0, 7), g.fill());
      g.restore();
    }
    requestAnimationFrame(f);
  })(t0);
}
export function celebrate(force) {
  if (document.querySelector('.cel')) return;
  if (!document.getElementById('celCss')) { const s = document.createElement('style'); s.id = 'celCss'; s.textContent = CELE; document.head.appendChild(s); }
  const sk = force || document.documentElement.dataset.skin;
  const mode = sk === 'cookie' ? 'cookie' : sk === 'sticker' ? 'sticker' : 'classic';
  const art = window.fwSkinArt || {};
  const hero = mode === 'cookie' && art.cookie ? `<div class="cel-art" aria-hidden="true">${art.cookie()}</div>`
    : mode === 'sticker' && art.holo ? `<div class="cel-art" aria-hidden="true">${art.holo()}</div>`
    : '<div class="cel-orb" aria-hidden="true">✦</div>';
  const el = document.createElement('div'); el.className = 'cel k-' + mode; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Vitaj v GainTrain Plus');
  const end = ent.period_end ? new Date(ent.period_end).toLocaleDateString('sk-SK') : '';
  const sub = ent.trialing && end ? `Skúšobná doba beží do ${end}. Prvá platba až potom, zrušíš kedykoľvek v Profile.` : 'Všetko je odomknuté. Ďakujeme, že nás podporuješ.';
  const head = mode === 'cookie' ? 'Sušienka je tvoja!' : mode === 'sticker' ? 'Nalepené, si v Plus!' : 'Vitaj v GainTrain Plus';
  el.innerHTML = `<canvas aria-hidden="true"></canvas><div class="cel-in">${hero}<h1 class="cel-h">${head}</h1><p class="cel-s">${sub}</p>
    <ul class="cel-ul">${UNLOCKS.map((c, i) => { const d = (0.9 + i * 0.28).toFixed(2); return `<li style="animation-delay:${d}s"><i style="animation-delay:${(+d + 0.35).toFixed(2)}s"></i><span>${c}</span></li>`; }).join('')}</ul>
    <button class="cel-go" type="button" style="animation-delay:${(0.9 + UNLOCKS.length * 0.28 + 0.4).toFixed(2)}s">Poďme na to</button></div>`;
  document.body.appendChild(el);
  try { navigator.vibrate && navigator.vibrate([18, 40, 18]); } catch (_) { }
  confetti(el.querySelector('canvas'), mode);
  const close = () => { if (!el.isConnected) return; el.classList.add('out'); setTimeout(() => el.remove(), 360); };
  el.querySelector('.cel-go').onclick = close;
  setTimeout(close, 14000);
}
try { window.fwCelebrate = celebrate; } catch (_) { }

// ---------- návrat zo Stripe ----------
try {
  const q = new URLSearchParams(location.search), b = q.get('billing');
  if (b) {
    history.replaceState(null, '', location.pathname + location.hash);
    db.ready.then(async () => {
      for (let i = 0; i < 6; i++) { await load(true); if (b !== 'ok' || ent.reason === 'sub') break; await new Promise(r => setTimeout(r, 1500)); } // webhook môže prísť o chvíľu neskôr
      if (b === 'ok' && ent.reason === 'sub') { try { location.hash = '#/'; } catch (_) { } celebrate(); }
      else { const t = document.createElement('div'); t.className = 'toast'; t.textContent = b === 'ok' ? 'Platba prebehla, predplatné sa o chvíľu zapne' : 'Platba bola zrušená'; document.body.appendChild(t); setTimeout(() => t.remove(), 3500); }
      tk(b === 'ok' ? 'pw_paid' : 'pw_cancel');
    });
  }
} catch (_) { }
// bez Plus: štítok „AI“ pri zápise jedla je zámok
try { const st = document.createElement('style'); st.textContent = '.gt-free .ob-ai-tag{font-size:0!important}.gt-free .ob-ai-tag::after{content:"\\1F512";font-size:11px;line-height:1}'; document.head.appendChild(st); } catch (_) { }
