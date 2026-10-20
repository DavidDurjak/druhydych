// Jednotky: metrické (kg, cm) alebo imperiálne (lb, ft a in). V databáze je vždy kg a cm, premieňa sa len pri zobrazení a zadávaní.
// Predvolené sú kg a cm. Voľba sa pamätá v zariadení a (ak sa dá) aj v profile, aby platila na každom telefóne.
import { currentLang } from './i18n.js';

const KEY = 'fw_units';
const LB = 2.20462262185, IN = 2.54;
let sys = 'metric';
try { sys = localStorage.getItem(KEY) === 'imperial' ? 'imperial' : 'metric'; } catch (_) { /* nič */ }
let saver = null;

export const imp = () => sys === 'imperial';
export const onSave = fn => { saver = fn; };
export function setSys(s, save = true) {
  s = s === 'imperial' ? 'imperial' : 'metric';
  if (s === sys) return;
  sys = s;
  try { localStorage.setItem(KEY, s); } catch (_) { /* nič */ }
  if (save && saver) { try { Promise.resolve(saver(s)).catch(() => {}); } catch (_) { /* nič */ } }
  window.dispatchEvent(new CustomEvent('fw-units', { detail: s }));
}
// profil z databázy: ak si zariadenie ešte nepamätá voľbu, prevezme ju z profilu
export function adopt(profile) {
  let has = false;
  try { has = localStorage.getItem(KEY) != null; } catch (_) { /* nič */ }
  if (!has && profile?.units === 'imperial') setSys('imperial', false);
}

const DEC = (1.5).toLocaleString(currentLang()).charAt(1);
const dec = s => (DEC === ',' ? s.replace('.', ',') : s);
const r = (v, d) => { const k = 10 ** d; return Math.round(v * k) / k; };

// ---------- váha ----------
export const wUnit = () => (imp() ? 'lb' : 'kg');
export const toW = kg => (imp() ? kg * LB : kg);
export const fromW = v => (imp() ? v / LB : v);
export const fmtW = (kg, d = 1) => dec(r(toW(Number(kg)), d).toFixed(d));
export const fmtWU = (kg, d = 1) => `${fmtW(kg, d)} ${wUnit()}`;
export const fmtWD = (kg, d = 1) => { const v = r(toW(Number(kg)), d); return (v > 0 ? '+' : v < 0 ? '−' : '') + dec(Math.abs(v).toFixed(d)); };
// závažia pri tréningu: bez zbytočných núl (20, 22,5)
export const fmtWt = kg => dec(String(+toW(Number(kg)).toFixed(1)));
// zmena s najviac 2 desatinnými miestami bez zbytočných núl (plán +0,25)
export const fmtWT = kg => { const v = r(toW(Number(kg)), 2); return (v > 0 ? '+' : v < 0 ? '−' : '') + dec(String(Math.abs(v))); };
// hodnota do inputu (s bodkou, bez zbytočných núl)
export const inW = kg => (kg == null || kg === '' || !isFinite(Number(kg)) ? '' : String(r(toW(Number(kg)), 1)));
// z inputu na kg (3 desatinné miesta, aby sa pri zobrazení vrátilo presne to isté číslo)
export const outW = v => { const n = Number(String(v).replace(',', '.')); return isFinite(n) ? r(fromW(n), 3) : NaN; };

// ---------- dĺžky (pás) ----------
export const lUnit = () => (imp() ? 'in' : 'cm');
export const inL = cm => (cm == null || cm === '' || !isFinite(Number(cm)) ? '' : String(r(imp() ? Number(cm) / IN : Number(cm), 1)));
export const outL = v => { const n = Number(String(v).replace(',', '.')); return isFinite(n) ? r(imp() ? n * IN : n, 2) : NaN; };
export const fmtL = cm => `${dec(String(r(imp() ? Number(cm) / IN : Number(cm), 1)))} ${lUnit()}`;

// ---------- výška ----------
export function ftIn(cm) {
  const t = Math.round(Number(cm) / IN);
  return { ft: Math.floor(t / 12), inch: t % 12 };
}
export const cmFrom = (ft, inch) => r(((Number(ft) || 0) * 12 + (Number(inch) || 0)) * IN, 1);
export function fmtH(cm) {
  if (!cm || !isFinite(Number(cm))) return '';
  if (!imp()) return `${Math.round(Number(cm))} cm`;
  const { ft, inch } = ftIn(cm);
  return `${ft}′${inch}″`;
}

// ---------- prepínač ----------
export const switchHtml = () => `<div class="un-sw" role="group" aria-label="Jednotky"><button type="button" data-us="metric" aria-pressed="${!imp()}" class="${imp() ? '' : 'on'}">kg · cm</button><button type="button" data-us="imperial" aria-pressed="${imp()}" class="${imp() ? 'on' : ''}">lb · ft</button></div>`;
export function bindSwitch(root, after) {
  root.querySelectorAll('[data-us]').forEach(b => {
    b.onclick = () => {
      if (b.dataset.us === sys) return;
      setSys(b.dataset.us);
      root.querySelectorAll('[data-us]').forEach(x => { const on = x.dataset.us === sys; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
      if (after) after(sys);
    };
  });
}

// ---------- vzhľad ----------
const CSS = `
.un-sw{display:inline-flex;padding:3px;border-radius:99px;background:var(--bg-2);border:1px solid var(--line)}
.un-sw button{font:inherit;font-size:13px;font-weight:700;letter-spacing:-.01em;padding:7px 14px;border:0;border-radius:99px;background:transparent;color:var(--muted);cursor:pointer;transition:background .2s,color .2s,box-shadow .2s;-webkit-tap-highlight-color:transparent}
.un-sw button.on{background:var(--accent);color:var(--accent-ink);box-shadow:0 6px 14px -6px var(--accent)}
.un-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 16px}
.un-bar span{font-size:13.5px;font-weight:600;color:var(--muted)}
.un-real{position:absolute!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important;overflow:hidden;padding:0!important;border:0!important}
.un-h{display:flex;align-items:center;gap:4px;min-width:0}
.un-h .input{min-width:0;flex:1 1 0}
.un-h i{font-style:normal;font-size:13px;font-weight:700;color:var(--muted);flex:none;margin-right:3px}
.un-w{position:relative}
.un-w .input{padding-right:34px}
.un-w .un-u{position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:13px;font-weight:700;color:var(--muted);pointer-events:none}
.ob-row3.un-imp{grid-template-columns:.8fr 1.45fr 1.3fr}
`;
if (typeof document !== 'undefined' && !document.getElementById('un-css')) { const el = document.createElement('style'); el.id = 'un-css'; el.textContent = CSS; document.head.appendChild(el); }

// ---------- formulár Moje údaje (výška a váha) ----------
// Skutočné polia height_cm a weight ostávajú v kg a cm (z nich číta appka aj databáza). V imperiálnom režime sú skryté
// a používateľ píše do ft, in a lb, z čoho sa hneď prepočítajú.
const ORIG = new WeakMap();
function enhance(form) {
  const ht = form.querySelector('[name=height_cm]'), wt = form.querySelector('[name=weight]');
  if (!ht || !wt) return;
  const row = form.querySelector('.ob-row3');
  if (!row && !form.dataset.unWait) { form.dataset.unWait = '1'; setTimeout(() => enhance(form), 700); return; }
  if (!form.dataset.un) {
    form.dataset.un = '1';
    const anchor = row || ht.closest('.grid2') || ht.closest('label');
    const bar = document.createElement('div'); bar.className = 'un-bar';
    bar.innerHTML = `<span>Jednotky</span>${switchHtml()}`;
    anchor.after(bar);
    bindSwitch(bar, () => apply(form));
    ORIG.set(form, { ht: ht.closest('label').querySelector('span').textContent, wt: wt.closest('label').querySelector('span').textContent, hmin: ht.min, hmax: ht.max, wmin: wt.min, wmax: wt.max });
    form.addEventListener('input', e => { if (e.target.closest?.('.un-d')) sync(form); });
  }
  if (form.dataset.unSys !== sys) apply(form);
}

function build(form) {
  const ht = form.querySelector('[name=height_cm]'), wt = form.querySelector('[name=weight]');
  const hl = ht.closest('label'), wl = wt.closest('label');
  hl.querySelectorAll('.un-d').forEach(x => x.remove()); wl.querySelectorAll('.un-d').forEach(x => x.remove());
  const { ft, inch } = ht.value ? ftIn(ht.value) : { ft: '', inch: '' };
  const hd = document.createElement('div'); hd.className = 'un-h un-d';
  hd.innerHTML = `<input class="input" type="number" inputmode="numeric" data-k="ft" min="3" max="7" step="1" placeholder="6" required value="${ft}" aria-label="Výška, stopy"><i>ft</i><input class="input" type="number" inputmode="numeric" data-k="in" min="0" max="11" step="1" placeholder="0" value="${inch}" aria-label="Výška, palce"><i>in</i>`;
  ht.before(hd);
  const wd = document.createElement('div'); wd.className = 'un-w un-d';
  wd.innerHTML = `<input class="input" type="number" inputmode="decimal" data-k="lb" step="0.1" min="66" max="661" placeholder="165" required value="${wt.value ? inW(wt.value) : ''}" aria-label="Váha v librách"><span class="un-u">lb</span>`;
  wt.before(wd);
}

function apply(form) {
  const ht = form.querySelector('[name=height_cm]'), wt = form.querySelector('[name=weight]');
  const o = ORIG.get(form); if (!o) return;
  form.dataset.unSys = sys;
  const hs = ht.closest('label').querySelector('span'), ws = wt.closest('label').querySelector('span');
  const row = form.querySelector('.ob-row3');
  const bar = form.querySelector('.un-bar');
  if (bar) { bar.querySelectorAll('[data-us]').forEach(x => { const on = x.dataset.us === sys; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); }); }
  if (imp()) {
    build(form);
    ht.classList.add('un-real'); wt.classList.add('un-real');
    ht.required = false; wt.required = false; ht.step = 'any'; wt.step = 'any';
    ht.removeAttribute('min'); ht.removeAttribute('max'); wt.removeAttribute('min'); wt.removeAttribute('max');
    hs.textContent = 'Výška, ft a in'; ws.textContent = 'Váha, lb';
    row?.classList.add('un-imp');
  } else {
    form.querySelectorAll('.un-d').forEach(x => x.remove());
    ht.classList.remove('un-real'); wt.classList.remove('un-real');
    ht.required = true; wt.required = true; ht.removeAttribute('step'); wt.step = '0.1';
    if (o.hmin) ht.min = o.hmin; if (o.hmax) ht.max = o.hmax; if (o.wmin) wt.min = o.wmin; if (o.wmax) wt.max = o.wmax;
    if (ht.value) ht.value = String(Math.round(Number(ht.value)));
    if (wt.value) wt.value = String(r(Number(wt.value), 1));
    hs.textContent = o.ht; ws.textContent = o.wt;
    row?.classList.remove('un-imp');
    ht.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

function sync(form) {
  const ht = form.querySelector('[name=height_cm]'), wt = form.querySelector('[name=weight]');
  const ft = form.querySelector('[data-k=ft]'), inch = form.querySelector('[data-k=in]'), lb = form.querySelector('[data-k=lb]');
  if (!ft || !lb) return;
  if (ft.value === '') ht.value = '';
  else {
    const cm = cmFrom(ft.value, inch.value);
    ht.value = String(cm);
    inch.setCustomValidity(cm < 120 || cm > 230 ? 'Výška môže byť od 3′9″ do 7′7″' : '');
  }
  if (lb.value === '') wt.value = '';
  else { const kgv = outW(lb.value); wt.value = String(kgv); lb.setCustomValidity(kgv < 30 || kgv > 300 ? 'Váha môže byť od 66 do 661 lb' : ''); }
  ht.dispatchEvent(new Event('input', { bubbles: true }));
}

const app = typeof document !== 'undefined' ? document.getElementById('app') : null;
let raf = 0;
function scan() { raf = 0; const f = app?.querySelector('#onb'); if (f) enhance(f); }
if (app) { new MutationObserver(() => { if (!raf) raf = requestAnimationFrame(scan); }).observe(app, { childList: true, subtree: true }); scan(); }
