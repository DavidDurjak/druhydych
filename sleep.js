// Spánok: karta na obrazovke Dnes a detail (týždeň, spánkový dlh, pravidelnosť, vplyv na jedlo a tréning).
// Zdroje (podľa presnosti): ručný zápis (sleep_logs) > hodinky cez Zdravie v iPhone (health_daily.sleep_h) > ranný check-in (checkins.sleep_h).
// Ručný zápis sa dopíše aj do check-inu, takže ho použije aj denná pripravenosť. Priame prepojenie hodiniek (HealthKit, Health Connect)
// príde s natívnou appkou v App Store.
import * as db from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';

const GOAL_KEY = 'fw_sleep_goal';
const QUAL = [[1, '😫', 'Hrozne'], [2, '😕', 'Zle'], [3, '😐', 'Ok'], [4, '🙂', 'Dobre'], [5, '😴', 'Výborne']];
const DAYS = ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'];
const goal = () => { try { return Number(localStorage.getItem(GOAL_KEY)) || 8; } catch (_) { return 8; } };
const setGoal = v => { try { localStorage.setItem(GOAL_KEY, String(v)); } catch (_) { /* súkromný režim */ } };
const fmtH = v => { const m = Math.round(v * 60); return `${Math.floor(m / 60)} h${m % 60 ? ' ' + String(m % 60).padStart(2, '0') + ' min' : ''}`; };
const fmtShort = v => { const m = Math.round(v * 60); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; };
const t5 = s => (s || '').slice(0, 5);
const toMin = s => { const [h, m] = String(s).split(':').map(Number); return h * 60 + m; };

const CSS = `
.sp{position:relative;margin:0 0 14px;padding:14px 16px 16px;border-radius:24px;overflow:hidden;border:1px solid color-mix(in srgb,#8C8CFF 30%,var(--line));
  background:radial-gradient(120% 90% at 100% 0%,color-mix(in srgb,#8C8CFF 22%,transparent),transparent 60%),var(--card)}
.sp-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.sp-h h3{font-size:15px;display:flex;align-items:center;gap:8px}
.sp-moon{width:22px;height:22px;flex:none;color:#B3B3FF;animation:spFloat 5s ease-in-out infinite}
@keyframes spFloat{0%,100%{transform:translateY(0) rotate(-6deg)}50%{transform:translateY(-2px) rotate(6deg)}}
.sp-h button{-webkit-appearance:none;appearance:none;border:0;background:none;color:var(--muted);font:inherit;font-size:13px;font-weight:700;cursor:pointer;padding:6px 0 6px 10px}
.sp-stars{position:absolute;inset:0;pointer-events:none;opacity:.55}
.sp-stars i{position:absolute;width:3px;height:3px;border-radius:50%;background:#fff;animation:spTw 3s ease-in-out infinite}
@keyframes spTw{0%,100%{opacity:.15}50%{opacity:.9}}
html[data-theme=light] .sp-stars{opacity:.0}
.sp-q{font-size:14px;color:var(--muted);margin:0 0 10px}
.sp-chips{display:flex;gap:8px}
.sp-chips button{flex:1;min-width:0;height:46px;border-radius:14px;border:1px solid color-mix(in srgb,var(--text) 14%,transparent);background:color-mix(in srgb,var(--text) 6%,transparent);color:var(--text);font:inherit;font-weight:800;font-size:15px;cursor:pointer;-webkit-appearance:none;appearance:none}
.sp-chips button:active{transform:scale(.95)}
.sp-more{display:block;margin:10px auto 0;-webkit-appearance:none;appearance:none;border:0;background:none;color:#8C8CFF;font:inherit;font-size:13px;font-weight:800;cursor:pointer;padding:6px}
.sp-main{display:flex;align-items:center;gap:14px}
.sp-ring{position:relative;width:74px;height:74px;flex:none}
.sp-ring svg{width:74px;height:74px;transform:rotate(-90deg)}
.sp-ring .t{fill:none;stroke:color-mix(in srgb,var(--text) 10%,transparent);stroke-width:8}
.sp-ring .f{fill:none;stroke:url(#spg);stroke-width:8;stroke-linecap:round;transition:stroke-dashoffset 1s cubic-bezier(.2,.9,.3,1)}
.sp-ring b{position:absolute;inset:0;display:grid;place-items:center;font-size:20px}
.sp-v strong{display:block;font-size:26px;font-weight:900;letter-spacing:-.02em;line-height:1.05}
.sp-v span{display:block;font-size:13px;color:var(--muted);margin-top:3px}
.sp-src{display:inline-block;margin-top:5px;font-size:11px;font-weight:800;padding:2px 7px;border-radius:7px;background:color-mix(in srgb,#8C8CFF 18%,transparent);color:color-mix(in srgb,#8C8CFF 70%,var(--text))}
.sp-week{display:flex;align-items:flex-end;gap:6px;height:54px;margin:14px 0 4px;position:relative}
.sp-week .gl{position:absolute;left:0;right:0;border-top:1px dashed color-mix(in srgb,var(--text) 25%,transparent)}
.sp-week div{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end}
.sp-week u{display:block;width:100%;max-width:26px;border-radius:7px 7px 4px 4px;background:linear-gradient(180deg,#B3B3FF,#6C6CF0);min-height:3px;transform-origin:bottom;animation:spGrow .7s cubic-bezier(.2,.9,.3,1) both}
.sp-week u.low{background:linear-gradient(180deg,#FFB3C1,#F0708A)}
.sp-week u.none{background:color-mix(in srgb,var(--text) 10%,transparent)}
.sp-week small{font-size:10px;color:var(--muted)}
@keyframes spGrow{from{transform:scaleY(0)}}
.sp-tip{margin-top:10px;padding:10px 12px;border-radius:14px;font-size:13px;line-height:1.4;background:color-mix(in srgb,var(--text) 5%,transparent)}
.sp-tip b{color:var(--text)}
.spx h3{margin:0}
.spx .sp-week{height:110px}
.spx-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}
.spx-stats div{padding:10px;border-radius:14px;background:color-mix(in srgb,var(--text) 5%,transparent);text-align:center}
.spx-stats b{display:block;font-size:18px}.spx-stats span{font-size:11px;color:var(--muted)}
.spx-sec{margin:16px 0 6px;font-size:13px;font-weight:800;color:var(--muted)}
.spx-ins{display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--line);font-size:14px;line-height:1.4}
.spx-ins:last-child{border-bottom:0}.spx-ins i{font-style:normal;font-size:18px}
.spx-goal{display:flex;gap:6px;flex-wrap:wrap}
.spx-goal button,.spx-qual button{-webkit-appearance:none;appearance:none;border:1px solid var(--line);background:var(--bg-2);color:var(--text);font:inherit;font-weight:700;border-radius:12px;padding:8px 12px;cursor:pointer}
.spx-goal button.on,.spx-qual button.on{border-color:#8C8CFF;background:color-mix(in srgb,#8C8CFF 22%,var(--bg-2))}
.spx-times{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:8px 0}
.spx-times label{font-size:12px;color:var(--muted);display:flex;flex-direction:column;gap:4px}
.spx-times input{font:inherit;font-size:18px;font-weight:800;padding:10px;border-radius:12px;border:1px solid var(--line);background:var(--bg-2);color:var(--text)}
.spx-qual{display:flex;gap:6px}.spx-qual button{flex:1;padding:8px 0;font-size:20px;display:flex;flex-direction:column;align-items:center;gap:2px}.spx-qual small{font-size:10px;color:var(--muted)}
.spx-dev{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}.spx-dev span{font-size:12px;font-weight:700;padding:5px 9px;border-radius:9px;background:color-mix(in srgb,var(--text) 6%,transparent)}
@media (prefers-reduced-motion:reduce){.sp *{animation:none!important}}
`;
if (!document.getElementById('sp-css')) { const s = document.createElement('style'); s.id = 'sp-css'; s.textContent = CSS; document.head.appendChild(s); }

const MOON = '<svg class="sp-moon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a.6.6 0 0 0-.8-.7A9.5 9.5 0 1 0 21.2 15.4a.6.6 0 0 0-.7-.8z"/></svg>';

// ---------- dáta ----------
let cache = null; // { key, at, nights: Map(date -> {h, bed, wake, q, src}) }
async function load(uid, to, days = 14, force = false) {
  const key = uid + to + days;
  if (!force && cache?.key === key && Date.now() - cache.at < 60000) return cache.nights;
  const from = calc.addDays(to, -(days - 1));
  const sb = db.sb;
  const [a, b, c] = await Promise.all([
    sb.from('sleep_logs').select('date,hours,bed_time,wake_time,quality,source').eq('user_id', uid).gte('date', from).lte('date', to),
    sb.from('health_daily').select('date,sleep_h').eq('user_id', uid).gte('date', from).lte('date', to).not('sleep_h', 'is', null),
    sb.from('checkins').select('date,sleep_h').eq('user_id', uid).gte('date', from).lte('date', to).not('sleep_h', 'is', null),
  ]);
  const n = new Map();
  for (const r of c.data || []) n.set(r.date, { h: +r.sleep_h, src: 'checkin' });
  for (const r of b.data || []) if (+r.sleep_h > 0) n.set(r.date, { h: +r.sleep_h, src: 'watch' });
  for (const r of a.data || []) n.set(r.date, { h: +r.hours, bed: t5(r.bed_time), wake: t5(r.wake_time), q: r.quality, src: r.source || 'manual' });
  cache = { key, at: Date.now(), nights: n };
  return n;
}
async function save(uid, date, row) {
  const sb = db.sb;
  const { error } = await sb.from('sleep_logs').upsert({ user_id: uid, date, ...row, source: 'manual', updated_at: new Date().toISOString() }, { onConflict: 'user_id,date' });
  if (error) throw new Error(error.message);
  // aj do check-inu, aby to videla denná pripravenosť
  try { await db.upsertCheckin({ user_id: uid, date, sleep_h: row.hours }); } catch (_) { /* nepodstatné */ }
  cache = null;
}
async function remove(uid, date) {
  await db.sb.from('sleep_logs').delete().eq('user_id', uid).eq('date', date);
  cache = null;
}

// ---------- rady ----------
function tipFor(h, g, q) {
  if (h < 6) return '<b>Krátka noc.</b> Po nedospatí ľudia v priemere zjedia asi o 385 kcal viac. Daj dnes bielkoviny ku každému jedlu, kávu len do 14:00 a tréning skôr ľahší.';
  if (h < g - 0.75) return `<b>Trochu pod cieľom.</b> Dnes večer choď spať aspoň o ${Math.round((g - h) * 60)} min skôr. Posledné väčšie jedlo 2 až 3 hodiny pred spaním.`;
  if (q && q <= 2) return '<b>Dosť hodín, ale zlá kvalita.</b> Častou príčinou je ťažké jedlo, alkohol alebo kofeín neskoro. Skús dnes posledné jedlo ľahšie a skôr.';
  return '<b>Dobrý spánok.</b> Telo je zregenerované, dnes je dobrý deň na ťažší tréning. Hlad by mal byť pod kontrolou.';
}
function week(nights, to, g, n = 7) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = calc.addDays(to, -i), x = nights.get(d), max = Math.max(g + 1.5, 10);
    const pct = x ? Math.min(100, x.h / max * 100) : 0;
    out.push(`<div><u class="${x ? (x.h < g - 0.75 ? 'low' : '') : 'none'}" style="height:${x ? pct : 6}%;animation-delay:${(n - 1 - i) * 40}ms" title="${x ? fmtH(x.h) : 'bez záznamu'}"></u><small>${DAYS[new Date(d + 'T12:00:00').getDay()]}</small></div>`);
  }
  const max = Math.max(g + 1.5, 10);
  return `<div class="sp-week"><span class="gl" style="bottom:calc(16px + (100% - 16px) * ${(g / max).toFixed(3)})"></span>${out.join('')}</div>`;
}
const SRC = { watch: 'z hodiniek', checkin: 'z check-inu', manual: 'zapísané' };

// ---------- karta na Dnes ----------
function cardHtml(date, x, nights, g) {
  const stars = Array.from({ length: 9 }, (_, i) => `<i style="left:${55 + (i * 37) % 40}%;top:${4 + (i * 13) % 26}%;animation-delay:${(i * 0.4).toFixed(1)}s"></i>`).join('');
  const head = `<div class="sp-stars" aria-hidden="true">${stars}</div><div class="sp-h"><h3>${MOON}Spánok</h3><button type="button" data-sp="open">Týždeň ›</button></div>`;
  if (!x) {
    return `${head}<p class="sp-q">${date === calc.today() ? 'Koľko si dnes v noci spal?' : 'Koľko si spal v noci pred týmto dňom?'}</p>
      <div class="sp-chips">${[5, 6, 7, 8, 9].map(v => `<button type="button" data-h="${v}">${v} h</button>`).join('')}</div>
      <button type="button" class="sp-more" data-sp="edit">Zadať presne (kedy si išiel spať a vstal)</button>`;
  }
  const pct = Math.min(1, x.h / g), C = 2 * Math.PI * 30;
  const q = x.q ? QUAL.find(z => z[0] === x.q) : null;
  return `${head}<div class="sp-main">
      <div class="sp-ring"><svg viewBox="0 0 74 74" aria-hidden="true"><defs><linearGradient id="spg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#B3B3FF"/><stop offset="1" stop-color="#6C6CF0"/></linearGradient></defs><circle class="t" cx="37" cy="37" r="30"/><circle class="f" cx="37" cy="37" r="30" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${C.toFixed(1)}" data-off="${(C * (1 - pct)).toFixed(1)}"/></svg><b>${q ? q[1] : '🌙'}</b></div>
      <div class="sp-v"><strong>${fmtH(x.h)}</strong><span>${x.bed && x.wake ? `${x.bed} → ${x.wake} · ` : ''}cieľ ${String(g).replace('.', ',')} h</span><em class="sp-src">${SRC[x.src] || 'zapísané'}</em></div>
    </div>
    ${week(nights, date, g)}
    <div class="sp-tip">${tipFor(x.h, g, x.q)}</div>`;
}

let busy = false;
async function mount() {
  const wx = document.querySelector('.screen.td #wx');
  const scr = document.querySelector('.screen.td');
  if (!scr || busy) return;
  const st = ctx.state, uid = st?.profile?.id; if (!uid) return;
  const date = st.date || calc.today();
  if (date > calc.today()) { // budúci deň: karta ostane na svojom mieste, spánok sa zapíše ráno v ten deň
    let f = scr.querySelector('#sp'); const anchor = wx || scr.querySelector('.meals');
    if (!f && anchor) { f = document.createElement('section'); f.className = 'sp'; f.id = 'sp'; anchor.after(f); }
    if (f && f.dataset.d !== date) {
      f.dataset.d = date; f.dataset.v = 'fut';
      f.innerHTML = `<div class="sp-h"><h3>${MOON}Spánok</h3><button type="button" data-sp="open">Týždeň ›</button></div><p class="sp-q">Spánok pred týmto dňom zapíšeš ráno v ten deň.</p>`;
      f.onclick = e => { if (e.target.closest('[data-sp=open]')) openSleep(uid, calc.today()); };
    }
    return;
  }
  let el = scr.querySelector('#sp');
  if (el && el.dataset.d === date && el.dataset.v === String(cache?.at || '')) return;
  busy = true;
  try {
    const nights = await load(uid, date);
    if (!scr.isConnected) return;
    el = scr.querySelector('#sp');
    if (!el) {
      el = document.createElement('section'); el.className = 'sp'; el.id = 'sp';
      const anchor = wx || scr.querySelector('.meals');
      if (!anchor) return;
      anchor.after(el);
    }
    el.dataset.d = date; el.dataset.v = String(cache?.at || '');
    el.innerHTML = cardHtml(date, nights.get(date), nights, goal());
    requestAnimationFrame(() => requestAnimationFrame(() => el.querySelectorAll('[data-off]').forEach(c => { c.style.strokeDashoffset = c.dataset.off; })));
    el.onclick = async e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.h) {
        b.disabled = true;
        try { await save(uid, date, { hours: Number(b.dataset.h), bed_time: null, wake_time: null, quality: null }); ctx.toast('Spánok zapísaný'); }
        catch (err) { ctx.toast(err.message, true); }
        refresh();
      } else if (b.dataset.sp === 'edit') editSheet(uid, date, nights.get(date));
      else if (b.dataset.sp === 'open') openSleep(uid, date);
    };
  } catch (_) { /* tabuľka ešte nie je: karta sa neukáže */ }
  finally { busy = false; }
}
function refresh() { cache = null; const el = document.querySelector('#sp'); if (el) el.dataset.v = 'x'; mount(); }

// ---------- zápis presne ----------
function editSheet(uid, date, x) {
  let bed = x?.bed || '23:00', wake = x?.wake || '07:00', q = x?.q || null;
  const bg = ctx.sheet(`<div class="spx">
    <div class="row between"><h3>Spánok · ${calc.fmtDate(date)}</h3><button class="del" data-x aria-label="Zavrieť">×</button></div>
    <div class="spx-times"><label>Išiel som spať<input type="time" id="spBed" value="${bed}"></label><label>Vstal som<input type="time" id="spWake" value="${wake}"></label></div>
    <p class="muted small" id="spDur"></p>
    <div class="spx-sec">Ako si sa vyspal?</div>
    <div class="spx-qual">${QUAL.map(([v, e, l]) => `<button type="button" data-q="${v}" class="${q === v ? 'on' : ''}">${e}<small>${l}</small></button>`).join('')}</div>
    <div class="row mt" style="gap:8px">${x?.src === 'manual' ? '<button class="btn" id="spDel" style="flex:1">Zmazať</button>' : ''}<button class="btn primary" id="spOk" style="flex:2">Uložiť</button></div>
  </div>`);
  const dur = () => { let m = toMin(wake) - toMin(bed); if (m <= 0) m += 1440; return m / 60; };
  const upd = () => { bg.querySelector('#spDur').textContent = `Spánok: ${fmtH(dur())}`; };
  upd();
  bg.querySelector('[data-x]').onclick = () => bg.remove();
  bg.querySelector('#spBed').oninput = e => { bed = e.target.value || bed; upd(); };
  bg.querySelector('#spWake').oninput = e => { wake = e.target.value || wake; upd(); };
  bg.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { q = Number(b.dataset.q); bg.querySelectorAll('[data-q]').forEach(z => z.classList.toggle('on', z === b)); });
  bg.querySelector('#spOk').onclick = async () => {
    const h = Math.round(dur() * 100) / 100;
    if (h > 16) { ctx.toast('Skontroluj časy, vychádza viac ako 16 hodín.', true); return; }
    try { await save(uid, date, { hours: h, bed_time: bed, wake_time: wake, quality: q }); bg.remove(); ctx.toast('Spánok zapísaný'); refresh(); }
    catch (err) { ctx.toast(err.message, true); }
  };
  bg.querySelector('#spDel')?.addEventListener('click', async () => { await remove(uid, date); bg.remove(); refresh(); });
}

// ---------- detail: týždeň, dlh, pravidelnosť, vplyv na jedlo ----------
async function insights(uid, to, nights) {
  const from = calc.addDays(to, -29);
  const { data } = await db.sb.from('food_logs').select('date,meal,kcal').eq('user_id', uid).gte('date', from).lte('date', to);
  const kc = {}, late = {};
  for (const r of data || []) { kc[r.date] = (kc[r.date] || 0) + (+r.kcal || 0); if (r.meal === 'late' && +r.kcal > 0) late[r.date] = true; }
  const out = [];
  const short = [], ok = [];
  for (const [d, x] of nights) { if (!kc[d] || kc[d] < 300) continue; (x.h < 6.5 ? short : x.h >= 7 ? ok : []).push(kc[d]); }
  const avg = a => a.reduce((s, v) => s + v, 0) / a.length;
  if (short.length >= 2 && ok.length >= 2) {
    const diff = Math.round(avg(short) - avg(ok));
    out.push(['🍽️', diff > 40 ? `Po krátkej noci zješ v priemere o <b>${diff} kcal viac</b> ako po dobrej. Presne to hovoria aj štúdie.` : diff < -40 ? `Po krátkej noci zješ menej (o ${-diff} kcal). Pozor, aby ti nechýbali bielkoviny.` : 'Tvoj príjem sa po krátkej noci veľmi nemení. Dobrá disciplína.']);
  }
  const wl = [], wo = [];
  for (const [d, x] of nights) { const prev = calc.addDays(d, -1); if (kc[prev] == null) continue; (late[prev] ? wl : wo).push(x.h); }
  if (wl.length >= 2 && wo.length >= 2) {
    const diff = Math.round((avg(wo) - avg(wl)) * 60);
    out.push(['🌙', diff > 10 ? `Keď ješ druhú večeru, spíš v priemere o <b>${diff} min menej</b>.` : 'Druhá večera tvoj spánok zatiaľ výrazne nemení.']);
  }
  return out;
}
export async function openSleep(uid, to) {
  const nights = await load(uid, to, 30, true).catch(() => new Map());
  let g = goal();
  const last7 = [...Array(7)].map((_, i) => nights.get(calc.addDays(to, -i))).filter(Boolean);
  const avg = last7.length ? last7.reduce((s, x) => s + x.h, 0) / last7.length : null;
  const debt = last7.reduce((s, x) => s + Math.max(0, g - x.h), 0);
  const beds = last7.filter(x => x.bed).map(x => { let m = toMin(x.bed); if (m < 720) m += 1440; return m; });
  const spread = beds.length >= 3 ? Math.round(Math.sqrt(beds.reduce((s, m) => s + (m - beds.reduce((a, b) => a + b, 0) / beds.length) ** 2, 0) / beds.length)) : null;
  const wakes = last7.filter(x => x.wake).map(x => toMin(x.wake));
  const wakeAvg = wakes.length ? Math.round(wakes.reduce((a, b) => a + b, 0) / wakes.length) : 6 * 60 + 30;
  const bedTarget = (wakeAvg - g * 60 + 1440) % 1440, mealBy = (bedTarget - 150 + 1440) % 1440;
  const hm = m => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
  const bg = ctx.sheet(`<div class="spx">
    <div class="row between"><h3>Spánok</h3><button class="del" data-x aria-label="Zavrieť">×</button></div>
    ${week(nights, to, g, 14)}
    <div class="spx-stats">
      <div><b>${avg ? fmtShort(avg) + ' h' : '–'}</b><span>priemer 7 dní</span></div>
      <div><b>${last7.length ? fmtShort(debt) + ' h' : '–'}</b><span>spánkový dlh</span></div>
      <div><b>${spread != null ? '±' + spread + ' min' : '–'}</b><span>pravidelnosť</span></div>
    </div>
    <div class="spx-sec">Čo s tebou robí spánok</div>
    <div id="spIns"><div class="spx-ins"><i>⏳</i><div>Počítam z tvojich dát…</div></div></div>
    <div class="spx-sec">Tvoj večer</div>
    <div class="spx-ins"><i>🛏️</i><div>Vstávaš okolo <b>${hm(wakeAvg)}</b>, takže na ${String(g).replace('.', ',')} h choď spať o <b>${hm(bedTarget)}</b>.</div></div>
    <div class="spx-ins"><i>🍽️</i><div>Posledné väčšie jedlo do <b>${hm(mealBy)}</b>, kávu a energetické nápoje do 14:00.</div></div>
    <div class="spx-sec">Cieľ spánku</div>
    <div class="spx-goal">${[7, 7.5, 8, 8.5, 9].map(v => `<button type="button" data-g="${v}" class="${v === g ? 'on' : ''}">${String(v).replace('.', ',')} h</button>`).join('')}</div>
    <div class="spx-sec">Hodinky a prstene</div>
    <p class="small">Apple Watch, Garmin, Oura, Whoop, Samsung aj Fitbit zapisujú spánok do Zdravia v telefóne. Na iPhone sa odtiaľ spánok dostane sem cez prepojenie Zdravia, automaticky každé ráno.</p>
    <div class="spx-dev"><span>Apple Watch</span><span>Garmin</span><span>Oura</span><span>Whoop</span><span>Samsung</span><span>Fitbit</span></div>
    <div class="row mt" style="gap:8px"><a class="btn" href="#/hodinky" style="flex:1">Prepojiť hodinky</a><button class="btn primary" id="spEdit" style="flex:1">Zapísať noc</button></div>
  </div>`);
  bg.querySelector('[data-x]').onclick = () => bg.remove();
  bg.querySelector('a[href="#/hodinky"]').addEventListener('click', () => bg.remove());
  bg.querySelector('#spEdit').onclick = () => { bg.remove(); editSheet(uid, to, nights.get(to)); };
  bg.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { setGoal(Number(b.dataset.g)); bg.remove(); refresh(); openSleep(uid, to); });
  try {
    const ins = await insights(uid, to, nights);
    const box = bg.querySelector('#spIns'); if (!box) return;
    box.innerHTML = ins.length ? ins.map(([i, t]) => `<div class="spx-ins"><i>${i}</i><div>${t}</div></div>`).join('')
      : `<div class="spx-ins"><i>📈</i><div>Zapisuj spánok aspoň týždeň a ukážem ti z tvojich vlastných dát, ako krátka noc mení tvoj hlad a ako neskoré jedlo mení spánok.</div></div>`;
  } catch (_) { /* nič */ }
}

new MutationObserver(() => { if (document.querySelector('.screen.td') && !document.querySelector('#sp')) mount(); }).observe(document.documentElement, { childList: true, subtree: true });
mount();
