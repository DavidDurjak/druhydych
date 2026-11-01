// Predplatné GainTrain Plus (v303). Kým je v databáze billing.on = false, tento modul nerobí nič viditeľné:
// nič sa neobmedzuje, v Profile nie je karta predplatného a obrazovka s cenami sa nikdy neukáže.
// Po zapnutí:
//   * nárok (predplatné, 7 dní skúšobnej doby, admin, tréner) a dnešné limity AI prídu z my_entitlement()
//   * AI funkcie na serveri pri prekročení limitu vrátia 402 s paywall: true; tu sa vtedy otvorí obrazovka predplatného
//   * funkcie len s predplatným (menu, chladnička, postava, import receptu) sa ponúknu ešte pred fotením, nie až po ňom
//   * platí sa cez Stripe Checkout (funkcia billing-checkout), zrušenie a zmena karty cez Stripe portál (billing-portal)
import * as db from './data.js';

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
const PREMIUM_ONLY = { menu_scan: 'Odfoť denné menu', fridge_scan: 'Čo uvarím z chladničky', physique_ai: 'AI analýza postavy', recipe_import: 'Import receptu z odkazu', custom_plan: 'Tréningový plán na mieru' };
export function gate(feature) {
  if (isPremium() || left(feature) > 0) return true;
  paywall({ feature, reason: (ent.limits?.[feature] ?? 1) === 0 ? 'premium_only' : 'free_limit' });
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
.pw{position:fixed;inset:0;z-index:80;outline:none;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;background:var(--bg);color:var(--text);
  padding:calc(env(safe-area-inset-top) + 14px) 20px calc(env(safe-area-inset-bottom) + 20px);animation:pwIn .26s cubic-bezier(.2,.8,.2,1) both}
.pw.out{animation:pwOut .2s ease both}
@keyframes pwIn{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}@keyframes pwOut{to{opacity:0;transform:translateY(16px)}}
.pw-in{max-width:460px;margin:0 auto;display:flex;flex-direction:column;min-height:100%}
.pw-x{align-self:flex-end;width:40px;height:40px;border-radius:50%;border:1px solid var(--line);background:var(--card);color:var(--muted);font:inherit;font-size:20px;line-height:1;cursor:pointer}
.pw-hero{position:relative;margin:6px 0 4px;padding:22px 20px 20px;border-radius:24px;overflow:hidden;background:
  radial-gradient(120% 90% at 100% 0%,color-mix(in srgb,var(--accent) 34%,transparent),transparent 60%),
  radial-gradient(90% 80% at 0% 100%,color-mix(in srgb,var(--accent-2,#8C8CFF) 26%,transparent),transparent 60%),var(--card);border:1px solid var(--line)}
.pw-tag{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:800;padding:5px 10px;border-radius:99px;background:var(--accent);color:var(--accent-ink,#06210f)}
.pw-h{font-size:28px;line-height:1.12;font-weight:800;letter-spacing:-.02em;margin:12px 0 6px}
.pw-sub{margin:0;color:var(--muted);font-size:14.5px;line-height:1.5}
.pw-why{margin:12px 0 0;padding:10px 12px;border-radius:14px;background:color-mix(in srgb,var(--text) 6%,transparent);font-size:13.5px;line-height:1.45}
.pw-ben{list-style:none;margin:18px 0 6px;padding:0;display:flex;flex-direction:column;gap:12px}
.pw-ben li{display:flex;gap:12px;align-items:flex-start;font-size:15px;line-height:1.35}
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
.pw-fine{margin:12px 0 0;text-align:center;color:var(--muted);font-size:12px;line-height:1.5}
.pw-fine a{color:inherit}
.pw-err{margin:10px 0 0;text-align:center;color:var(--danger,#FF5C7A);font-size:13px}
.pw-later{align-self:center;margin-top:6px;background:none;border:0;color:var(--muted);font:inherit;font-size:14px;padding:10px;cursor:pointer}
.pw-st{margin:16px 0 0;padding:16px;border-radius:18px;background:var(--card);border:1px solid var(--line)}
.pw-st b{font-size:16px}.pw-st p{margin:6px 0 0;color:var(--muted);font-size:13.5px;line-height:1.45}
.gt-sub{display:flex;align-items:center;gap:12px;margin:0 0 12px;padding:14px 16px;border-radius:18px;border:1px solid var(--line);background:
  radial-gradient(120% 120% at 100% 0%,color-mix(in srgb,var(--accent) 18%,transparent),transparent 60%),var(--card);color:inherit;text-decoration:none;width:100%;font:inherit;text-align:left;cursor:pointer}
.gt-sub i{flex:none;width:38px;height:38px;border-radius:12px;display:grid;place-items:center;font-style:normal;font-size:19px;background:var(--accent);color:var(--accent-ink,#06210f)}
.gt-sub div{flex:1;min-width:0}.gt-sub b{display:block;font-size:15px}.gt-sub small{color:var(--muted);font-size:12.5px}
.gt-sub span{color:var(--muted);font-size:20px}
@media (prefers-reduced-motion:reduce){.pw,.pw.out{animation:none}}
`;
function css() { if (document.getElementById('pwCss')) return; const s = document.createElement('style'); s.id = 'pwCss'; s.textContent = CSS; document.head.appendChild(s); }

const BEN = [
  ['🏋️', 'Tréningový plán na mieru', 'Podľa tvojej postavy a cieľa, s váhami na štart. Týždenne sa vyvíja'],
  ['📸', 'AI zápis bez limitu', 'Odfoť tanier, nadiktuj alebo napíš, koľkokrát chceš'],
  ['💬', 'AI kouč kedykoľvek', 'Poradí s jedlom, tréningom aj keď sa zasekneš'],
  ['🍽️', 'Denné menu a chladnička', 'AI vyberie z lístka a navrhne recepty z toho, čo máš doma'],
  ['💪', 'Analýza postavy a import receptov', 'Pokrok z fotiek a recepty z ľubovoľného odkazu'],
];
const WHY = {
  free_limit: f => `Dnešné AI ${f === 'coach_chat' ? 'správy' : 'zápisy'} zadarmo sú minuté. Zajtra sa obnovia, s Plus ich máš bez limitu.`,
  premium_only: f => `${PREMIUM_ONLY[f] || 'Táto funkcia'} je súčasťou GainTrain Plus.`,
  cap: () => 'Dnes si túto funkciu použil už veľakrát. Zajtra sa limit obnoví.',
};
const eur = v => v == null ? '' : Number(v).toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const mo = p => Number(p.months) || (p.id === 'year' ? 12 : p.id === 'quarter' || p.id === 'q' ? 3 : 1);
const days = t => Math.max(0, Math.ceil((new Date(t) - Date.now()) / 864e5));
const dLabel = n => n === 1 ? '1 deň' : n >= 2 && n <= 4 ? `${n} dni` : `${n} dní`;

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
  const plans = (info.plans || ent.plans || []).filter(p => p && p.id);
  let pick = plans[0]?.id;
  const month = plans.find(p => p.id === 'month'), year = plans.find(p => p.id === 'year');
  const save = month?.price && year?.price ? Math.round((1 - year.price / (month.price * 12)) * 100) : 0;
  const isSub = ent.reason === 'sub';
  const trial = ent.reason === 'trial' && ent.trial_end ? days(ent.trial_end) : null;
  const why = info.reason && WHY[info.reason] ? WHY[info.reason](info.feature) : '';

  el.innerHTML = `<div class="pw-in">
    <button class="pw-x" type="button" aria-label="Zavrieť">×</button>
    <div class="pw-hero">
      <span class="pw-tag">✦ GainTrain Plus</span>
      <h1 class="pw-h">${isSub ? 'Máš GainTrain Plus' : 'Celá appka, bez limitov'}</h1>
      <p class="pw-sub">${isSub ? (ent.cancel ? `Predplatné skončí ${new Date(ent.period_end).toLocaleDateString('sk-SK')}. Dovtedy máš všetko.` : `Obnoví sa ${new Date(ent.period_end).toLocaleDateString('sk-SK')}.`)
      : trial != null ? `Skúšobná doba: ešte ${dLabel(trial)} máš všetko zadarmo.` : 'Zapisovanie jedla, ciele a hotový tréningový plán ostávajú zadarmo. Plus pridá plán na mieru a AI bez obmedzení.'}</p>
      ${why ? `<p class="pw-why">${h(why)}</p>` : ''}
    </div>
    <ul class="pw-ben">${BEN.map(([i, t, s]) => `<li><i>${i}</i><div><b>${t}</b><small>${s}</small></div></li>`).join('')}</ul>
    ${isSub ? `<button class="pw-go" type="button" data-portal>Spravovať predplatné</button><p class="pw-fine">Zmena karty, faktúry a zrušenie cez zabezpečený portál Stripe.</p>`
      : plans.length ? `<div class="pw-plans" role="radiogroup" aria-label="Plán">${plans.map(p => `<button class="pw-plan" type="button" role="radio" aria-checked="${p.id === pick}" data-plan="${h(p.id)}">
          ${p.badge || (p.id === 'year' && save > 0) ? `<span class="bd">${h(p.id === 'year' && save > 0 ? `Ušetríš ${save} %` : p.badge)}</span>` : ''}
          <span class="r"></span><span class="n"><b>${h(p.name)}</b><small>${mo(p) > 1 && p.price ? `${eur(p.price / mo(p))} mesačne` : p.note ? h(p.note) : 'zrušíš kedykoľvek'}</small></span>
          <span class="p"><b>${p.price != null ? eur(p.price) : '–'}</b><small>${p.period ? '/ ' + h(p.period) : ''}</small></span></button>`).join('')}</div>
        <button class="pw-go" type="button" data-buy>Pokračovať</button>
        <p class="pw-fine">Platba kartou, Apple Pay alebo Google Pay cez Stripe. Zrušíš kedykoľvek v Profile, predplatné potom dobehne do konca obdobia. <a href="/podmienky.html" target="_blank" rel="noopener">Podmienky</a></p>`
      : `<div class="pw-st"><b>Predplatné pripravujeme</b><p>Čoskoro si ho tu budeš môcť zapnúť.</p></div>`}
    <p class="pw-err" hidden></p>
    <button class="pw-later" type="button">${isSub ? 'Zavrieť' : 'Teraz nie'}</button>
  </div>`;
  el.querySelector('.pw-x').onclick = close; el.querySelector('.pw-later').onclick = () => { tk('pw_later', { f: info.feature || '' }); close(); };
  el.querySelectorAll('[data-plan]').forEach(b => b.onclick = () => { pick = b.dataset.plan; el.querySelectorAll('[data-plan]').forEach(x => x.setAttribute('aria-checked', String(x === b))); });
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
  el.tabIndex = -1; setTimeout(() => el.focus({ preventScroll: true }), 50); // čítačka obrazovky začne od nadpisu, bez rámčeka na tlačidle
}
try { window.fwPaywall = paywall; } catch (_) { }

// ---------- karta v Profile ----------
function profileCard() {
  if (!ent.on) return;
  const scr = document.querySelector('#app .screen'); if (!scr) return;
  css();
  const anchor = scr.querySelector('.pfx-plan') || scr.querySelector('a.btn[href="#/ciele"]'); if (!anchor || scr.querySelector('.gt-sub')) return;
  const tr = ent.reason === 'trial' && ent.trial_end ? days(ent.trial_end) : null;
  const [t, s] = ent.reason === 'sub' ? ['GainTrain Plus', ent.cancel ? `Aktívne do ${new Date(ent.period_end).toLocaleDateString('sk-SK')}` : 'Aktívne · spravovať predplatné']
    : ent.reason === 'admin' || ent.reason === 'trainer' ? ['GainTrain Plus', ent.reason === 'trainer' ? 'Zadarmo pre trénerov' : 'Zadarmo pre admina']
      : tr != null ? ['Skúšobná doba Plus', `Ešte ${dLabel(tr)} máš všetko zadarmo`] : ['Získaj GainTrain Plus', 'AI zápis, kouč a skeny bez limitu'];
  const b = document.createElement('div'); b.className = 'gt-sub'; b.setAttribute('role', 'button'); b.tabIndex = 0;
  b.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); b.click(); } };
  b.innerHTML = `<i>✦</i><div><b>${t}</b><small>${s}</small></div><span>›</span>`;
  b.onclick = () => paywall({ from: 'profile' });
  anchor.parentNode.insertBefore(b, anchor);
}
const app = document.getElementById('app');
if (app) new MutationObserver(() => { if (ent.on && (location.hash || '').startsWith('#/profil')) profileCard(); }).observe(app, { childList: true, subtree: true });
addEventListener('fw-ent', () => { if ((location.hash || '').startsWith('#/profil')) profileCard(); });

// ---------- návrat zo Stripe ----------
try {
  const q = new URLSearchParams(location.search), b = q.get('billing');
  if (b) {
    history.replaceState(null, '', location.pathname + location.hash);
    db.ready.then(async () => {
      for (let i = 0; i < 6; i++) { await load(true); if (b !== 'ok' || ent.reason === 'sub') break; await new Promise(r => setTimeout(r, 1500)); } // webhook môže prísť o chvíľu neskôr
      const t = document.createElement('div'); t.className = 'toast'; t.textContent = b === 'ok' ? (ent.reason === 'sub' ? 'Vitaj v GainTrain Plus' : 'Platba prebehla, predplatné sa o chvíľu zapne') : 'Platba bola zrušená';
      document.body.appendChild(t); setTimeout(() => t.remove(), 3500);
      tk(b === 'ok' ? 'pw_paid' : 'pw_cancel');
    });
  }
} catch (_) { }
