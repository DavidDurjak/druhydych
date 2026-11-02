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
  ['🚫', 'Bez reklám', 'Nikde v appke ťa nebude nič rušiť'],
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
    const badge = of ? of.label : n === 1 && save >= 20 ? `Ušetríš ${save} %` : n > 1 ? '' : p.badge || '';
    const sub = n > 1 ? `${eur(p.price / n / m)} na osobu mesačne` : m > 1 ? `${eur((of ? of.price : p.price) / m)} mesačne` : 'zrušíš kedykoľvek';
    const after = of ? `potom ${eur(p.price)} / ${h(p.period)}` : '';
    return `<button class="pw-plan" type="button" role="radio" aria-checked="${p.id === pick}" data-plan="${h(p.id)}">
      ${badge ? `<span class="bd">${h(badge)}</span>` : ''}
      <span class="r"></span><span class="n"><b>${h(p.name)}${n > 1 ? ` <em class="pw-ppl">${pplLabel(n)}</em>` : ''}</b><small>${sub}</small><small class="pw-noads">Bez reklám${n > 1 ? ' pre všetkých' : ''}</small></span>
      <span class="p">${of ? `<s>${eur(p.price)}</s>` : ''}<b>${eur(of ? of.price : p.price)}</b><small>${after || '/ ' + h(p.period)}</small></span></button>`;
  };
  const chosen = () => all.find(p => p.id === pick);
  const ctaText = () => trialDays > 0 ? `Vyskúšať ${dLabel(trialDays)} zadarmo` : 'Pokračovať';
  const fine = () => {
    const p = chosen(); if (!p) return '';
    const of = offerPrice(p), first = of ? of.price : p.price;
    const tail = 'Zrušíš kedykoľvek v Profile, predplatné potom dobehne do konca obdobia.';
    return (trialDays > 0
      ? `${dLabel(trialDays)} zadarmo, potom ${eur(first)} ${of ? 'za prvý rok, ďalej ' + eur(p.price) + ' ročne' : 'za ' + h(p.period)}. Deň pred koncom skúšobnej doby ti pošleme e-mail. `
      : of ? `${eur(first)} za prvý rok, potom ${eur(p.price)} ročne. ` : `${eur(p.price)} za ${h(p.period)}, obnovuje sa automaticky. `) + tail;
  };

  const drawPlans = () => {
    const list = who === 'solo' ? solo : group;
    const box = el.querySelector('.pw-plans'); if (!box) return;
    box.innerHTML = list.map(card).join('');
    box.querySelectorAll('[data-plan]').forEach(b => b.onclick = () => { pick = b.dataset.plan; drawPlans(); });
    const f = el.querySelector('[data-fine]'); if (f) f.innerHTML = fine() + ' <a href="/podmienky.html#predplatne" target="_blank" rel="noopener">Podmienky</a>';
    el.querySelectorAll('[data-who]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.who === who)));
  };

  const title = isSub ? 'Máš GainTrain Plus' : isMember ? 'Máš GainTrain Plus' : 'Celá appka, bez limitov a bez reklám';
  const subline = isSub ? (ent.trialing ? `Skúšobná doba, prvá platba ${new Date(ent.period_end).toLocaleDateString('sk-SK')}.` : ent.cancel ? `Predplatné skončí ${new Date(ent.period_end).toLocaleDateString('sk-SK')}. Dovtedy máš všetko.` : `Obnoví sa ${new Date(ent.period_end).toLocaleDateString('sk-SK')}.`)
    : isMember ? `Si v predplatnom, ktoré platí ${h(ent.owner || 'iný človek')}. Celé Plus máš, kým platí.`
      : trial != null ? `Skúšobná doba: ešte ${dLabel(trial)} máš všetko zadarmo.` : 'Zapisovanie jedla, ciele a hotový tréningový plán ostávajú zadarmo. Plus pridá plán na mieru, AI bez obmedzení a žiadne reklamy.';
  const group1 = isSub && seatsOf(all.find(p => p.id === ent.plan)) > 1;

  el.innerHTML = `<div class="pw-in">
    <button class="pw-x" type="button" aria-label="Zavrieť">×</button>
    <div class="pw-hero">
      <span class="pw-tag">✦ GainTrain Plus</span>
      <h1 class="pw-h">${title}</h1>
      <p class="pw-sub">${subline}</p>
      ${why ? `<p class="pw-why">${h(why)}</p>` : ''}
    </div>
    <ul class="pw-ben">${BEN.map(([i, t, s]) => `<li><i>${i}</i><div><b>${t}</b><small>${s}</small></div></li>`).join('')}</ul>
    ${isSub ? `${group1 ? '<button class="pw-go" type="button" data-family>Pozvať ľudí do predplatného</button>' : ''}<button class="pw-go${group1 ? ' alt' : ''}" type="button" data-portal>Spravovať predplatné</button><p class="pw-fine">Zmena karty, faktúry a zrušenie cez zabezpečený portál Stripe.</p>`
      : isMember ? `<button class="pw-go alt" type="button" data-leave>Odísť z predplatného</button>`
        : all.length ? `${group.length ? `<div class="pw-who" role="group" aria-label="Pre koho"><button type="button" data-who="solo" aria-pressed="true">Len pre mňa</button><button type="button" data-who="group" aria-pressed="false">Duo a Rodina</button></div>` : ''}
          <div class="pw-plans" role="radiogroup" aria-label="Plán"></div>
          <button class="pw-go" type="button" data-buy>${ctaText()}</button>
          <p class="pw-fine" data-fine></p>
          <p class="pw-fine">Platba kartou, Apple Pay alebo Google Pay cez Stripe.</p>
          <button class="pw-code" type="button" data-join>Máš pozvánku do Duo alebo Rodiny? Zadaj kód</button>`
          : `<div class="pw-st"><b>Predplatné pripravujeme</b><p>Čoskoro si ho tu budeš môcť zapnúť.</p></div>`}
    <p class="pw-err" hidden></p>
    <button class="pw-later" type="button">${isSub || isMember ? 'Zavrieť' : 'Teraz nie'}</button>
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
