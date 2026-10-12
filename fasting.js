// Pôstový časovač: karta na obrazovke Dnes (samo sa vloží pred vodu, bez zásahu do today.js)
// Údaje ostanú v zariadení (localStorage). Protokoly sú zámerne do 20:4, bez dlhých pôstov.
import * as calc from './calc.js';
import { ctx } from './app.js';

const root = document.getElementById('app');
const KEY = 'dd_fast', HIST = 'dd_fast_hist', PREF = 'dd_fast_pref';
const PROTOS = [[14, '14:10'], [16, '16:8'], [18, '18:6'], [20, '20:4']];
const ls = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (_) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* súkromný režim */ } },
  del(k) { try { localStorage.removeItem(k); } catch (_) { /* nič */ } },
};
const label = h => (PROTOS.find(p => p[0] === h) || [h, `${h}:${24 - h}`])[1];
const dur = ms => { const m = Math.max(0, Math.floor(ms / 60000)); return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`; };
const pad = n => String(n).padStart(2, '0');
const clock = ts => { const d = new Date(ts), t = `${pad(d.getHours())}:${pad(d.getMinutes())}`; const day = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())) / 86400000); return day === 0 ? `${t} dnes` : day === 1 ? `${t} zajtra` : day === -1 ? `${t} včera` : t; };
const localInput = ts => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };

const CSS = `.fast{background:var(--card,#151a21);border:1px solid var(--line,#232a33);border-radius:20px;padding:14px;margin:0 0 10px}
.fs-h{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.fs-h h3{font-size:16px;margin:0}.fs-h p{font-size:13px;color:var(--muted);margin:3px 0 0}
.fs-p{display:flex;gap:8px;margin:12px 0}
.fs-p button{-webkit-appearance:none;appearance:none;flex:1;border:1px solid var(--line,#232a33);background:var(--card-2,#1b212a);color:var(--text,#fff);border-radius:12px;padding:10px 0;font:inherit;font-weight:700;font-size:14px;cursor:pointer}
.fs-p button.on{background:var(--accent,#7cffb2);color:var(--accent-ink,#0b0e12);border-color:var(--accent,#7cffb2)}
.fs-b{width:100%}
.fs-last{font-size:12.5px;color:var(--muted);margin:10px 0 0}
.fs-note{font-size:11.5px;color:var(--muted);margin:10px 0 0;line-height:1.4}
.fs-live{display:flex;align-items:center;gap:16px;margin:12px 0}
.fs-ring{position:relative;width:104px;height:104px;flex:0 0 auto;display:grid;place-items:center}
.fs-ring svg{position:absolute;inset:0}
.fs-ring b{position:relative;font-size:20px;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.fs-ring small{position:absolute;bottom:26px;font-size:10.5px;color:var(--muted)}
.fs-tx{display:flex;flex-direction:column;gap:5px;font-size:13.5px;min-width:0}
.fs-tx b{font-size:15px}
.fs-tx span{color:var(--muted)}
.fs-ok{color:var(--accent,#7cffb2)!important;font-weight:700}
.fs-acts{display:flex;gap:8px}
.fs-acts button{-webkit-appearance:none;appearance:none;flex:1;border-radius:12px;padding:11px 0;font:inherit;font-weight:700;font-size:14px;cursor:pointer;border:1px solid var(--line,#232a33);background:var(--card-2,#1b212a);color:var(--text,#fff)}
.fs-acts button.pr{background:var(--accent,#7cffb2);color:var(--accent-ink,#0b0e12);border-color:var(--accent,#7cffb2)}`;
if (!document.getElementById('fast-css')) { const s = document.createElement('style'); s.id = 'fast-css'; s.textContent = CSS; document.head.appendChild(s); }

function weekDone() {
  const hist = ls.get(HIST) || [], from = Date.now() - 7 * 86400000;
  return hist.filter(f => f.end >= from && (f.end - f.start) >= f.hours * 3600000).length;
}

function ringSvg(pct, done) {
  const r = 46, c = 2 * Math.PI * r;
  return `<svg width="104" height="104" viewBox="0 0 104 104"><circle cx="52" cy="52" r="${r}" fill="none" stroke="var(--track,#232a33)" stroke-width="9"/><circle cx="52" cy="52" r="${r}" fill="none" stroke="${done ? 'var(--accent,#7cffb2)' : 'var(--m-late,#b58cff)'}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.min(1, pct))}" transform="rotate(-90 52 52)"/></svg>`;
}

function draw(el) {
  const f = ls.get(KEY);
  if (!f) {
    const pref = ls.get(PREF) || 16, last = (ls.get(HIST) || []).slice(-1)[0], wd = weekDone();
    el.innerHTML = `<div class="fs-h"><div><h3>Pôst</h3><p>Zapni časovač, keď dojete. Appka ti povie, kedy môžeš znova jesť.</p></div></div>
      <div class="fs-p">${PROTOS.map(([h, l]) => `<button data-h="${h}" class="${h === pref ? 'on' : ''}">${l}</button>`).join('')}</div>
      <button class="btn primary fs-b" data-start>Začať pôst</button>
      ${last ? `<p class="fs-last">Naposledy ${label(last.hours)}: ${dur(last.end - last.start)}${(last.end - last.start) >= last.hours * 3600000 ? ' ✓' : ''}${wd ? ` · tento týždeň splnené: ${wd}` : ''}</p>` : ''}
      <p class="fs-note">Pôst nie je pre tehotné a dojčiace, pri cukrovke, pri poruchách príjmu potravy ani pre mladších ako 18 rokov. Ak si nie si istý, spýtaj sa lekára.</p>`;
    let sel = pref;
    el.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { sel = Number(b.dataset.h); ls.set(PREF, sel); el.querySelectorAll('[data-h]').forEach(x => x.classList.toggle('on', x === b)); });
    el.querySelector('[data-start]').onclick = () => { ls.set(KEY, { start: Date.now(), hours: sel }); draw(el); };
    return;
  }
  const total = f.hours * 3600000, ms = Date.now() - f.start, done = ms >= total, end = f.start + total;
  el.innerHTML = `<div class="fs-h"><div><h3>Pôst ${label(f.hours)}</h3><p>Začal si ${clock(f.start)}</p></div></div>
    <div class="fs-live"><div class="fs-ring">${ringSvg(ms / total, done)}<b>${Math.min(100, Math.floor(ms / total * 100))} %</b></div>
      <div class="fs-tx">${done ? `<b class="fs-ok">Cieľ splnený 🎉</b><span>Pôst trvá ${dur(ms)}</span>` : `<b>Uplynulo ${dur(ms)}</b><span>Zostáva ${dur(total - ms)}</span>`}<span>${done ? 'Jesť môžeš kedykoľvek.' : `Jesť môžeš od ${clock(end)}`}</span></div></div>
    <div class="fs-acts"><button data-edit>Upraviť začiatok</button><button class="pr" data-stop>${done ? 'Ukončiť pôst' : 'Ukončiť'}</button></div>`;
  el.querySelector('[data-stop]').onclick = () => {
    const cur = ls.get(KEY); if (!cur) return;
    const hist = ls.get(HIST) || []; hist.push({ start: cur.start, end: Date.now(), hours: cur.hours }); ls.set(HIST, hist.slice(-30)); ls.del(KEY);
    const ok = Date.now() - cur.start >= cur.hours * 3600000;
    ctx.toast(ok ? `Pôst ${label(cur.hours)} splnený, ${dur(Date.now() - cur.start)}` : `Pôst ukončený po ${dur(Date.now() - cur.start)}`);
    draw(el);
  };
  el.querySelector('[data-edit]').onclick = () => {
    const bg = ctx.sheet(`<h3>Kedy si prestal jesť?</h3><p class="muted small mt">Ak si zabudol zapnúť časovač, nastav skutočný čas.</p>
      <label class="field mt"><span>Začiatok pôstu</span><input class="input" id="fst" type="datetime-local" value="${localInput(f.start)}" max="${localInput(Date.now())}"></label>
      <button class="btn primary mt" id="fsv">Uložiť</button>`);
    bg.querySelector('#fsv').onclick = () => {
      const t = new Date(bg.querySelector('#fst').value).getTime();
      if (!t || t > Date.now()) return ctx.toast('Čas musí byť v minulosti', true);
      if (Date.now() - t > 48 * 3600000) return ctx.toast('Pôst môže mať najviac 48 hodín', true);
      ls.set(KEY, { ...f, start: t }); bg.remove(); draw(el);
    };
  };
}

let tick = null, busy = false;
function inject() {
  if (busy || !root || !ctx.state?.profile) return;
  const wt = root.querySelector('.screen.td .wt');
  if (!wt || root.querySelector('#fast')) return;
  if (ctx.state.date !== calc.today()) return;
  busy = true;
  try {
    const el = document.createElement('section');
    el.id = 'fast'; el.className = 'fast';
    wt.before(el); draw(el);
    clearInterval(tick);
    tick = setInterval(() => { if (!el.isConnected) { clearInterval(tick); return; } if (ls.get(KEY) && !document.hidden && !document.querySelector('.sheet-bg')) draw(el); }, 30000);
  } finally { busy = false; }
}
if (root) { new MutationObserver(inject).observe(root, { childList: true, subtree: true }); inject(); }
