// Pitný režim: fľaša, ktorá sa plní, tempo počas dňa, rýchle pridanie, vrátenie kroku, týždeň a séria dní v cieli.
// Ťuknutím na deň v týždni (alebo na Upraviť) sa dá množstvo ktoréhokoľvek uplynulého dňa prepísať presne.
// Ukladá sa v ml (checkins.water_ml), pohároviky (checkins.water) sa dopisujú kvôli starším častiam appky.
import * as db from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';

const fmtL = ml => String(+(ml / 1000).toFixed(2)).replace('.', ',');
const DAYS = ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'];
const CHIPS = [[150, 'Dúšok'], [250, 'Pohár'], [500, 'Fľaša']];
const BOT = 'M30 4h20a3 3 0 0 1 3 3v8c0 6 14 12 14 26v96a12 12 0 0 1-12 12H25a12 12 0 0 1-12-12V41c0-14 14-20 14-26V7a3 3 0 0 1 3-3z';
const Y0 = 149, Y1 = 22, H = Y0 - Y1, MAX = 8000;

const CSS = `
.wx{position:relative;margin:0 0 10px;padding:16px 14px 14px;border-radius:22px;border:1px solid rgba(110,200,255,.24);background:radial-gradient(120% 90% at 0% 0%,rgba(75,168,240,.22),transparent 62%),var(--card);overflow:hidden;transition:border-color .4s}
.wx.done{border-color:rgba(124,255,178,.5);background:radial-gradient(120% 90% at 0% 0%,rgba(124,255,178,.16),transparent 62%),var(--card)}
.wx.pulse{animation:wxp .6s ease-out}
@keyframes wxp{0%{box-shadow:0 0 0 0 rgba(110,200,255,.45)}100%{box-shadow:0 0 0 18px rgba(110,200,255,0)}}
.wx-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.wx-h h3{margin:0;font-size:17px}
.wx-goal{font-size:12.5px;color:var(--muted);text-decoration:none}.wx-goal b{color:var(--text)}
.wx-main{display:flex;gap:16px;align-items:center}
.wx-bt{position:relative;flex:0 0 92px;height:166px;padding:0;border:0;background:none;cursor:pointer;-webkit-tap-highlight-color:transparent}
.wx-bt:active{transform:scale(.97)}
.wx-bt svg{width:100%;height:100%;overflow:visible;display:block}
.wx-liq{transform:translateY(var(--y,149px));transition:transform 1.1s cubic-bezier(.2,.8,.2,1)}
.wx-wave{animation:wxw 3.4s linear infinite}
@keyframes wxw{to{transform:translateX(-80px)}}
.wx-liq circle{fill:rgba(255,255,255,.55);animation:wxb 4s ease-in infinite}
.wx-liq .b2{animation-delay:1.3s}.wx-liq .b3{animation-delay:2.4s}
@keyframes wxb{0%{transform:translateY(0);opacity:0}15%{opacity:.8}100%{transform:translateY(-46px);opacity:0}}
.wx-tk line{stroke:rgba(255,255,255,.4);stroke-width:1.4}
.wx-fl{position:absolute;left:50%;top:40%;transform:translateX(-50%);font-weight:800;font-size:18px;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.5);pointer-events:none;animation:wxf .9s ease-out forwards}
@keyframes wxf{0%{opacity:0;transform:translate(-50%,10px)}20%{opacity:1}100%{opacity:0;transform:translate(-50%,-34px)}}
.wx-r{flex:1;min-width:0}
.wx-big{font-size:44px;font-weight:800;letter-spacing:-.03em;line-height:1;color:#8FD3FF;font-variant-numeric:tabular-nums}
.wx.done .wx-big{color:var(--accent)}
.wx-big small{font-size:24px;font-weight:700;margin-left:5px}
.wx-of{font-size:13.5px;color:var(--muted);margin-top:5px}
.wx-pct{display:inline-block;margin-top:10px;padding:4px 10px;border-radius:99px;font-size:12.5px;font-weight:700;background:rgba(91,184,255,.16);color:#8FD3FF}
.wx.done .wx-pct{background:rgba(124,255,178,.18);color:var(--accent)}
.wx-msg{font-size:13px;line-height:1.4;margin:10px 0 0;color:var(--text)}
.wx-msg.warn{color:#FFC46B}.wx-msg.ok{color:var(--muted)}
.wx-chips{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px}
.wx-chip{-webkit-appearance:none;appearance:none;border:1px solid rgba(110,200,255,.2);border-radius:14px;padding:9px 2px 8px;background:rgba(91,184,255,.10);color:#8FD3FF;font:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;-webkit-tap-highlight-color:transparent}
.wx-chip:active{transform:scale(.95)}
.wx-chip b{font-size:14.5px}.wx-chip span{font-size:11.5px;color:var(--muted)}
.wx-chip.pri{background:linear-gradient(180deg,#8FD3FF,#4BA8F0);border-color:transparent;color:#06223d}.wx-chip.pri span{color:rgba(6,34,61,.7)}
.wx-wk{display:flex;gap:6px;margin-top:16px}
.wx-d{flex:1;text-align:center;min-width:0;-webkit-appearance:none;appearance:none;border:0;background:none;padding:0;font:inherit;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
.wx-d:active .wx-bar{transform:scale(.93)}
.wx-bar{transition:transform .15s}
.wx-bar{height:34px;border-radius:9px;background:var(--track);position:relative;overflow:hidden}
.wx-bar i{position:absolute;left:0;right:0;bottom:0;height:var(--h,0%);background:linear-gradient(180deg,#8FD3FF,#4BA8F0);transition:height .7s cubic-bezier(.2,.8,.2,1)}
.wx-d.ok .wx-bar i{background:linear-gradient(180deg,#7CFFB2,#3FD5C4)}
.wx-d.fut{opacity:.4}
.wx-d span{display:block;font-size:11px;color:var(--muted);margin-top:4px}.wx-d.now span{color:var(--text);font-weight:700}
.wx-d.now .wx-bar{box-shadow:0 0 0 1.5px rgba(143,211,255,.7)}
.wx-ft{display:flex;justify-content:space-between;align-items:center;margin-top:10px;font-size:12.5px;color:var(--muted);min-height:30px}
.wx-undo{-webkit-appearance:none;appearance:none;border:0;background:rgba(255,255,255,.07);color:var(--text);border-radius:99px;padding:7px 12px;font:inherit;font-size:12.5px;font-weight:600;cursor:pointer}
.wx-undo:disabled{opacity:.3}
.wx-btns{display:flex;gap:6px;flex:none}
.wx-hint{font-size:11.5px;color:var(--muted);text-align:center;margin:6px 0 0;opacity:.8}
.wx-sh h3{margin:0 0 2px}.wx-sh .wx-sub{color:var(--muted);font-size:13px;margin:0}
.wx-oth.ed b{min-width:150px}
.wx-oth{display:flex;align-items:center;justify-content:center;gap:18px;margin:16px 0 12px}
.wx-oth button{width:48px;height:48px;border-radius:50%;border:1px solid var(--line);background:var(--card-2);color:var(--text);font-size:24px;cursor:pointer}
.wx-oth b{font-size:34px;font-weight:800;min-width:120px;text-align:center;font-variant-numeric:tabular-nums}.wx-oth b small{font-size:16px;color:var(--muted);margin-left:4px}
.wx-pre{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:14px}
.wx-pre button{border:1px solid var(--line);background:var(--card-2);color:var(--text);border-radius:99px;padding:8px 14px;font:inherit;font-size:13.5px;cursor:pointer}
.wx-pre button.on{border-color:#6EC8FF;background:rgba(91,184,255,.18);color:#8FD3FF}
@media (prefers-reduced-motion:reduce){.wx-wave,.wx-liq circle,.wx.pulse{animation:none}.wx-liq{transition:none}}
`;
if (typeof document !== 'undefined' && !document.getElementById('wx-css')) {
  const st = document.createElement('style'); st.id = 'wx-css'; st.textContent = CSS; document.head.appendChild(st);
}

export function waterHtml({ ml, goalMl }) {
  const ticks = [];
  for (let m = 500; m < goalMl; m += 500) { const y = (Y0 - m / goalMl * H).toFixed(1); ticks.push(`<line x1="57" x2="67" y1="${y}" y2="${y}"/>`); }
  return `<section class="wx${ml >= goalMl ? ' done' : ''}" id="wx">
    <div class="wx-h"><h3>💧 Pitný režim</h3><a class="wx-goal" href="#/ciele">cieľ <b>${fmtL(goalMl)} l</b> ✎</a></div>
    <div class="wx-main">
      <button class="wx-bt" data-wx="250" aria-label="Pridať pohár vody">
        <svg viewBox="0 0 80 150" aria-hidden="true"><defs><clipPath id="wxc"><path d="${BOT}"/></clipPath>
          <linearGradient id="wxg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9BDBFF"/><stop offset="1" stop-color="#2F86E8"/></linearGradient></defs>
          <path d="${BOT}" fill="rgba(91,184,255,.07)"/>
          <g clip-path="url(#wxc)"><g class="wx-liq" style="--y:${Y0}px">
            <g class="wx-wave"><path d="M0 0q20-6 40 0t40 0t40 0t40 0t40 0t40 0V200H0z" fill="url(#wxg)"/></g>
            <circle class="b1" cx="28" cy="60" r="2.2"/><circle class="b2" cx="45" cy="70" r="1.6"/><circle class="b3" cx="38" cy="55" r="2"/></g>
            <g class="wx-tk">${ticks.join('')}</g></g>
          <path d="${BOT}" fill="none" stroke="rgba(143,211,255,.6)" stroke-width="2"/>
          <path d="M20 58V118" stroke="#fff" stroke-opacity=".2" stroke-width="3" stroke-linecap="round"/></svg>
      </button>
      <div class="wx-r">
        <div class="wx-big"><span id="wxN">${fmtL(ml)}</span><small>l</small></div>
        <div class="wx-of">z ${fmtL(goalMl)} l</div>
        <span class="wx-pct" id="wxP">${Math.round(goalMl ? ml / goalMl * 100 : 0)} %</span>
        <p class="wx-msg" id="wxM"></p>
      </div>
    </div>
    <div class="wx-chips">${CHIPS.map(([n, l]) => `<button class="wx-chip${n === 250 ? ' pri' : ''}" data-wx="${n}"><b>+${n}</b><span>${l}</span></button>`).join('')}<button class="wx-chip" data-wxo><b>Iné</b><span>množstvo</span></button></div>
    <div class="wx-wk" id="wxW"></div>
    <p class="wx-hint">Ťukni na deň a uprav, koľko si vtedy vypil</p>
    <div class="wx-ft"><span id="wxS"></span><span class="wx-btns"><button class="wx-undo" id="wxE">✎ Upraviť</button><button class="wx-undo" id="wxU" disabled>↶ Späť</button></span></div>
  </section>`;
}

function otherSheet(onAdd) {
  let v = 300;
  const bg = ctx.sheet(`<h3>Koľko si vypil?</h3>
    <div class="wx-oth"><button data-s="-50" aria-label="Menej">−</button><b><span id="wxV">300</span><small>ml</small></b><button data-s="50" aria-label="Viac">+</button></div>
    <div class="wx-pre">${[100, 200, 330, 500, 750].map(n => `<button data-p="${n}">${n}</button>`).join('')}</div>
    <button class="btn primary" id="wxGo">Pridať</button>`);
  const upd = () => { bg.querySelector('#wxV').textContent = v; bg.querySelectorAll('[data-p]').forEach(b => b.classList.toggle('on', Number(b.dataset.p) === v)); };
  bg.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { v = Math.max(50, Math.min(2000, v + Number(b.dataset.s))); upd(); });
  bg.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { v = Number(b.dataset.p); upd(); });
  bg.querySelector('#wxGo').onclick = () => { bg.remove(); onAdd(v); };
  upd();
}

// presné prepísanie množstva vody za jeden deň (aj spätne)
const DNAME = ['nedeľa', 'pondelok', 'utorok', 'streda', 'štvrtok', 'piatok', 'sobota'];
function dayLabel(d) {
  const t = calc.today();
  if (d === t) return 'Dnes';
  if (d === calc.addDays(t, -1)) return 'Včera';
  const x = new Date(d + 'T00:00:00'), n = DNAME[x.getDay()];
  return `${n[0].toUpperCase()}${n.slice(1)} ${x.getDate()}. ${x.getMonth() + 1}.`;
}
function editSheet(d, cur, goalMl, onSave) {
  let v = Math.max(0, Math.round(cur / 50) * 50);
  const pre = [...new Set([0, 500, 1000, 1500, 2000, goalMl, 3000])].filter(n => n <= MAX).sort((a, b) => a - b);
  const bg = ctx.sheet(`<div class="wx-sh"><h3>💧 ${dayLabel(d)}</h3><p class="wx-sub">Nastav, koľko si v tento deň vypil spolu</p>
    <div class="wx-oth ed"><button data-s="-250" aria-label="Menej o 250 ml">−</button><b><span id="wxV"></span><small>l</small></b><button data-s="250" aria-label="Viac o 250 ml">+</button></div>
    <div class="wx-pre"><button data-s="-50">−50 ml</button><button data-s="50">+50 ml</button></div>
    <div class="wx-pre">${pre.map(n => `<button data-p="${n}">${n === goalMl ? 'cieľ ' : ''}${fmtL(n)} l</button>`).join('')}</div>
    <button class="btn primary" id="wxGo">Uložiť</button></div>`);
  const upd = () => { bg.querySelector('#wxV').textContent = fmtL(v); bg.querySelectorAll('[data-p]').forEach(b => b.classList.toggle('on', Number(b.dataset.p) === v)); };
  bg.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { v = Math.max(0, Math.min(MAX, v + Number(b.dataset.s))); upd(); });
  bg.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { v = Number(b.dataset.p); upd(); });
  bg.querySelector('#wxGo').onclick = () => { bg.remove(); onSave(v); };
  upd();
}

export function bindWater(root, { uid, date, goalMl, ml, isToday }) {
  const el = root.querySelector('#wx'); if (!el) return;
  const q = s => el.querySelector(s);
  const key = `fw_wlog_${uid}_${date}`;
  let log = [];
  try { log = JSON.parse(localStorage.getItem(key) || '[]'); } catch (_) { log = []; }
  if (!Array.isArray(log) || log.reduce((a, b) => a + b, 0) > ml) log = [];
  const hist = {};

  const message = () => {
    const left = goalMl - ml;
    if (ml >= goalMl) return { t: isToday ? 'Cieľ splnený. Dnes máš hotovo.' : 'Cieľ splnený.', k: 'ok' };
    if (!isToday) return { t: ml ? `Chýbalo ${fmtL(Math.round(left / 50) * 50)} l.` : 'Tento deň nie je nič zapísané.', k: 'ok' };
    const now = new Date(), hr = now.getHours() + now.getMinutes() / 60;
    if (hr >= 22) return { t: `Chýba ${fmtL(Math.round(left / 50) * 50)} l. Zajtra to dáš.`, k: 'ok' };
    if (ml === 0 && hr < 10) return { t: 'Začni pohárom hneď teraz. Po noci je telo vysušené.', k: 'ok' };
    const exp = goalMl * Math.min(1, Math.max(0, (hr - 7) / 15)), behind = exp - ml;
    if (behind > goalMl * 0.12) return { t: `Si o ${fmtL(Math.round(behind / 50) * 50)} l pozadu. Vypi pohár teraz.`, k: 'warn' };
    return { t: `V tempe. Do 22:00 stačí ${Math.max(50, Math.round(left / Math.max(1, 22 - hr) / 10) * 10)} ml za hodinu.`, k: 'ok' };
  };
  const valOf = d => (d === date ? ml : (hist[d] || 0));
  const drawWeek = () => {
    const ws = calc.weekStart(date), t = calc.today();
    q('#wxW').innerHTML = Array.from({ length: 7 }, (_, i) => {
      const d = calc.addDays(ws, i), v = valOf(d), p = goalMl ? Math.min(1, v / goalMl) : 0;
      return `<button type="button" class="wx-d${v >= goalMl ? ' ok' : ''}${d > t ? ' fut' : ''}${d === t ? ' now' : ''}" data-d="${d}" aria-label="${dayLabel(d)}: ${fmtL(v)} l, upraviť"><div class="wx-bar"><i style="--h:${(p * 100).toFixed(0)}%"></i></div><span>${DAYS[new Date(d + 'T00:00:00').getDay()]}</span></button>`;
    }).join('');
  };
  const drawStreak = () => {
    const t = calc.today(); let d = valOf(t) >= goalMl ? t : calc.addDays(t, -1), n = 0;
    while (n < 60 && valOf(d) >= goalMl) { n++; d = calc.addDays(d, -1); }
    q('#wxS').textContent = n >= 2 ? `🔥 ${n} dní v cieli v rade` : n === 1 ? '1 deň v cieli' : 'Cieľ splň tri dni po sebe a vznikne séria';
  };
  const setFill = () => q('.wx-liq').style.setProperty('--y', `${Y0 - (goalMl ? Math.min(1, ml / goalMl) : 0) * H}px`);
  const paint = () => {
    q('#wxN').textContent = fmtL(ml);
    q('#wxP').textContent = `${Math.round(goalMl ? ml / goalMl * 100 : 0)} %`;
    el.classList.toggle('done', ml >= goalMl);
    const m = message(); const e = q('#wxM'); e.textContent = m.t; e.className = `wx-msg ${m.k}`;
    q('#wxU').disabled = !log.length;
    drawWeek(); drawStreak();
  };

  let saving = false, dirty = false;
  const flush = async () => {
    if (saving) { dirty = true; return; }
    saving = true;
    try { do { dirty = false; await db.upsertCheckin({ user_id: uid, date, water: Math.floor(ml / 250), water_ml: ml }); } while (dirty); }
    catch (_) { ctx.toast('Vodu sa nepodarilo uložiť', true); }
    finally { saving = false; }
  };
  const persist = () => { try { localStorage.setItem(key, JSON.stringify(log.slice(-40))); } catch (_) { /* nič */ } };

  const add = n => {
    const before = ml; ml = Math.max(0, Math.min(MAX, ml + n));
    if (ml === before) return;
    log.push(n); persist(); setFill(); paint();
    const f = document.createElement('span'); f.className = 'wx-fl'; f.textContent = `+${n}`; q('.wx-bt').appendChild(f); setTimeout(() => f.remove(), 950);
    el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
    try { navigator.vibrate?.(8); } catch (_) { /* nič */ }
    if (before < goalMl && ml >= goalMl) ctx.toast('Denný cieľ vody splnený 💧');
    flush();
  };
  const undo = () => {
    const n = log.pop(); if (!n) return;
    ml = Math.max(0, ml - n); persist(); setFill(); paint(); flush();
  };

  // prepísanie dňa: zobrazený deň sa prekreslí celý, iný deň sa len uloží a obnoví sa jeho stĺpec
  const setDay = async (d, v) => {
    if (d === date) {
      const before = ml; ml = v; log = []; persist(); setFill(); paint();
      if (before < goalMl && ml >= goalMl) ctx.toast('Denný cieľ vody splnený 💧');
      flush(); return;
    }
    const old = hist[d]; hist[d] = v; drawWeek(); drawStreak();
    try { await db.upsertCheckin({ user_id: uid, date: d, water: Math.floor(v / 250), water_ml: v }); ctx.toast(`${dayLabel(d)}: ${fmtL(v)} l uložené`); }
    catch (_) { hist[d] = old; if (el.isConnected) { drawWeek(); drawStreak(); } ctx.toast('Vodu sa nepodarilo uložiť', true); }
  };
  const edit = d => {
    if (d > calc.today()) { ctx.toast('Tento deň ešte len príde. Vodu zapíšeš, keď nastane.'); return; }
    editSheet(d, valOf(d), goalMl, v => setDay(d, v));
  };
  q('#wxW').addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (b) edit(b.dataset.d); });
  q('#wxE').onclick = () => edit(date);
  el.querySelectorAll('[data-wx]').forEach(b => b.onclick = () => add(Number(b.dataset.wx)));
  q('[data-wxo]').onclick = () => otherSheet(add);
  q('#wxU').onclick = undo;

  paint();
  requestAnimationFrame(() => requestAnimationFrame(setFill));
  // história týždňa a série sa dočíta na pozadí
  const from = calc.addDays(calc.today(), -60);
  db.sb.from('checkins').select('date,water,water_ml').eq('user_id', uid).gte('date', from).lte('date', calc.addDays(calc.today(), 7))
    .then(({ data }) => { (data || []).forEach(r => { hist[String(r.date).slice(0, 10)] = r.water_ml ?? (r.water || 0) * 250; }); if (el.isConnected) { drawWeek(); drawStreak(); } })
    .catch(() => { /* týždeň ostane len s dneškom */ });
}
