// Tréning ako vedený zážitok (ako Hevy či Apple Fitness): otvorený je len cvik, ktorý práve robíš, ostatné sú kompaktné riadky
// s krúžkom postupu. Po poslednej sérii sa cvik zbalí so zelenou fajkou a sám sa otvorí ďalší. Cviky sú hneď pod hlavnou kartou,
// plán a nástroje (Skenuj stroj, blok, analýza postavy) idú pod tlačidlo Ukončiť. Mení len zobrazenie, dáta a ukladanie ostávajú.
import { EXERCISES } from './workouts.js';
import * as U from './units.js';

const CSS = `
.tf .card.ex{padding:0;transition:box-shadow .35s,border-color .35s,background .35s}
.tf .card.ex .exh{padding:14px 14px 14px 18px;cursor:pointer;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none}
.tf .card.ex.tf-col .exh:active{background:rgba(255,255,255,.03)}
.tf-body{display:grid;grid-template-rows:1fr;transition:grid-template-rows .38s cubic-bezier(.3,.9,.3,1)}
.tf-in{min-height:0;overflow:hidden;padding:0 14px 14px 18px}
.tf-in>.fx-bar{margin-top:0}
.tf-col .tf-body{grid-template-rows:0fr}
.tf-col .tf-in{visibility:hidden;transition:visibility 0s .38s}
.tf .card.ex .exm{transition:opacity .2s}
.tf-col .exm,.tf-col .swapbtn{display:none}
.tf-line{display:none;margin:3px 0 0;font-size:13px;color:var(--muted);font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tf-line b{color:var(--text);font-weight:700}
.tf-col .tf-line{display:block}
.tf-st{display:none;position:relative;flex:none;width:42px;height:42px;isolation:isolate}
.tf-col .tf-st{display:block}
.tf-st svg{width:100%;height:100%;display:block;transform:rotate(-90deg)}
.tf-st circle{fill:none;stroke-width:4}
.tf-st .b{stroke:rgba(255,255,255,.1)}
.tf-st .f{stroke:var(--mc);stroke-linecap:round;transition:stroke-dashoffset .6s cubic-bezier(.3,1.2,.4,1)}
.tf-st span{position:absolute;inset:0;display:grid;place-items:center;font-size:11.5px;font-weight:800;font-variant-numeric:tabular-nums;color:var(--muted)}
.exdone .tf-st .f{stroke-dashoffset:0!important}
.exdone .tf-st span{color:#06130C;font-size:17px}
.exdone .tf-st span::before{content:"";position:absolute;inset:7px;border-radius:50%;background:var(--mc);z-index:-1;animation:fxPop .45s cubic-bezier(.3,1.7,.5,1)}
.tf .card.ex.tf-col{background:var(--card);border-color:var(--line);box-shadow:none}
.tf .card.ex.tf-col::before{opacity:.35}
.tf .card.ex.exdone.tf-col{background:linear-gradient(135deg,color-mix(in srgb,var(--mc) 9%,var(--card)),var(--card) 60%);border-color:color-mix(in srgb,var(--mc) 30%,var(--line))}
.tf .card.ex.exdone.tf-col::before{opacity:1}
.tf .card.ex.exdone.tf-col h3{color:var(--muted)}
.tf .card.ex.tf-open:not(.exdone){border-color:color-mix(in srgb,var(--mc) 45%,var(--line));box-shadow:0 14px 34px color-mix(in srgb,var(--mc) 14%,transparent),0 0 0 1px color-mix(in srgb,var(--mc) 22%,transparent)}
.tf-now{display:none;margin-left:6px;padding:1px 7px;border-radius:99px;font-size:10px;font-weight:800;color:#06130C;background:var(--mc);vertical-align:1px}
.tf-open:not(.exdone) .tf-now{display:inline-block}
.tf .set.tf-next{background:color-mix(in srgb,var(--mc) 8%,transparent);box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--mc) 55%,transparent)}
.tf .set.tf-next .chk{border-color:var(--mc);color:var(--mc)}
.tf .set.tf-next .setno{background:color-mix(in srgb,var(--mc) 25%,transparent);color:var(--text)}
.tf .card.ex+.card.ex{margin-top:10px}
.tf-fin{flex-direction:column;align-items:stretch;margin-top:16px}
.tf-fin #finish{width:100%}
.tf-tools{margin-top:30px;padding:4px 0 64px}
.tf-tools>h3{margin:0 2px 12px;font-size:15px;color:var(--muted);font-weight:700}
.tf-tools>*:not(h3){margin-bottom:12px}
.tf-tools .plan-info{margin-top:0}
.tf-tools #replan{width:100%;padding:13px;border-radius:16px;border:1px solid var(--line);background:transparent;color:var(--muted);font-weight:700}
@media (prefers-reduced-motion:reduce){.tf-body,.tf-st .f{transition:none}.exdone .tf-st span::before{animation:none}}
`;
const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
// svetlý režim: tmavý text na svetlozelenom tlačidle (automatický prevod by ho dal biely a nečitateľný)
const lt = document.createElement('style'); lt.dataset.fwLight = '';
lt.textContent = 'html[data-theme=light] .tf #finish{color:#04261A}';
document.head.appendChild(lt);

const EMO = { chest: '🏋️', back: '🧗', shoulders: '🙌', reardelt: '🙌', biceps: '💪', triceps: '💪', quads: '🦵', hams: '🍑', glutes: '🍑', calves: '🦶', core: '🔥', cardio: '🏃' };
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isFinite(n) ? n : 0; };
const kgf = n => String(Math.round(n * 10) / 10).replace('.', ',');
const C = 2 * Math.PI * 17;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

const cards = scr => $$('.card.ex', scr);
const setsOf = card => $$('.set', card);
const doneOf = card => setsOf(card).filter(s => s.classList.contains('done')).length;
const isDone = card => { const n = setsOf(card).length; return n > 0 && doneOf(card) === n; };
const firstOpen = scr => cards(scr).findIndex(c => !isDone(c));

function prep(card) {
  if (card.dataset.tf) return;
  const exh = $('.exh', card); if (!exh) return;
  card.dataset.tf = '1';
  const id = $('.set', card)?.dataset.ex, ex = EXERCISES[id];
  const key = id === 'cardio' ? 'cardio' : Object.entries(ex?.m || {}).sort((a, b) => b[1] - a[1])[0]?.[0];
  const ic = $('.fx-ic span', card); if (ic && EMO[key]) ic.textContent = EMO[key];
  // telo karty (návod, série) do zbaliteľného obalu
  const body = document.createElement('div'); body.className = 'tf-body';
  const inn = document.createElement('div'); inn.className = 'tf-in'; body.append(inn);
  [...card.children].filter(el => el !== exh).forEach(el => inn.append(el));
  card.append(body);
  const exn = $('.exn', card);
  exn?.querySelector('.fx-tag')?.insertAdjacentHTML('beforeend', '<span class="tf-now">Teraz</span>');
  exn?.insertAdjacentHTML('beforeend', '<p class="tf-line"></p>');
  exh.insertAdjacentHTML('beforeend', `<div class="tf-st"><svg viewBox="0 0 42 42" aria-hidden="true"><circle class="b" cx="21" cy="21" r="17"/><circle class="f" cx="21" cy="21" r="17" stroke-dasharray="${C}" stroke-dashoffset="${C}"/></svg><span></span></div>`);
}

function line(card) {
  const ss = setsOf(card), d = doneOf(card);
  const plan = $('.exm b', card)?.textContent || `${ss.length} série`;
  const kgs = ss.map(s => num($('[data-f=kg]', s)?.value || $('[data-f=kg]', s)?.placeholder));
  const top = Math.max(0, ...kgs);
  if (ss.length && d === ss.length) {
    const vol = ss.reduce((a, s) => a + num($('[data-f=kg]', s)?.value) * num($('[data-f=reps]', s)?.value), 0);
    return `<b>Hotovo</b> · ${ss.length} ${ss.length >= 5 ? 'sérií' : ss.length === 1 ? 'séria' : 'série'}${vol ? ` · ${Math.round(vol).toLocaleString('sk-SK')} ${U.wUnit()} objem` : ''}`;
  }
  return `<b>${plan}</b>${top ? ` · ${kgf(top)} ${U.wUnit()}` : ''}${d ? ` · ${d} z ${ss.length} hotové` : ''}`;
}

function paint(scr) {
  const list = cards(scr); if (!list.length) return;
  if (scr._open == null) scr._open = firstOpen(scr);
  list.forEach((card, i) => {
    prep(card);
    const ss = setsOf(card), d = doneOf(card), open = i === scr._open;
    card.classList.toggle('tf-col', !open);
    card.classList.toggle('tf-open', open);
    const f = $('.tf-st .f', card); if (f) f.style.strokeDashoffset = String(C * (1 - (ss.length ? d / ss.length : 0)));
    const sp = $('.tf-st span', card), t = ss.length && d === ss.length ? '✓' : `${d}/${ss.length}`;
    if (sp && sp.textContent !== t) sp.textContent = t;
    const ln = $('.tf-line', card), html = line(card);
    if (ln && ln.innerHTML !== html) ln.innerHTML = html;
    const next = open ? ss.find(s => !s.classList.contains('done')) : null;
    ss.forEach(s => s.classList.toggle('tf-next', s === next));
    const exh = $('.exh', card); if (exh) exh.setAttribute('aria-expanded', String(open));
  });
}

// posun až po dobalení predošlého cviku, inak by cieľ ušiel o jeho výšku
function scrollTo(el, off = 74) {
  clearTimeout(scrollTo.t);
  scrollTo.t = setTimeout(() => {
    if (!el.isConnected) return;
    const y = el.getBoundingClientRect().top + scrollY - off;
    window.scrollTo({ top: Math.max(0, y), behavior: reduce ? 'auto' : 'smooth' });
  }, reduce ? 0 : 400);
}
function open(scr, i, scroll) {
  scr._open = i; paint(scr);
  const card = cards(scr)[i];
  if (scroll && card) scrollTo(card);
}

function layout(scr) {
  const fin = $('#finish', scr), row = fin?.parentElement; if (!row) return;
  row.classList.add('tf-fin');
  let tools = $('.tf-tools', scr);
  if (!tools) { tools = document.createElement('section'); tools.className = 'tf-tools'; tools.innerHTML = '<h3>Plán a nástroje</h3>'; row.after(tools); }
  const mc = $('#fw-machine', scr); if (mc && mc.parentElement !== tools) tools.querySelector('h3').after(mc);
  const pi = $('.plan-info', scr); if (pi && pi.parentElement !== tools) tools.append(pi);
  $$('.px-card', scr).forEach(p => { if (p.parentElement !== tools) tools.append(p); });
  const rp = $('#replan', scr); if (rp && rp.parentElement !== tools) { rp.className = ''; rp.textContent = 'Vytvoriť nový plán'; tools.append(rp); }
}

function scan() {
  const scr = $('#app .screen.fx-on');
  if (!scr || !$('#finish', scr)) return;
  if (!scr.classList.contains('tf')) scr.classList.add('tf');
  layout(scr);
  paint(scr);
}
let raf = 0;
const app = document.getElementById('app');
if (app) new MutationObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(scan); }).observe(app, { childList: true, subtree: true });

// ťuknutie na hlavičku cviku: otvorí ho (ostatné sa zbalia), na otvorenom ho zbalí
document.addEventListener('click', e => {
  const scr = $('#app .screen.tf'); if (!scr) return;
  const exh = e.target.closest('.card.ex .exh');
  if (exh && !e.target.closest('button, input, a, details')) {
    const i = cards(scr).indexOf(exh.closest('.card.ex'));
    open(scr, scr._open === i ? -1 : i, scr._open !== i);
    try { navigator.vibrate?.(8); } catch (_) { }
    return;
  }
  const chk = e.target.closest('[data-chk]'); if (!chk) return;
  const row = chk.closest('.set'), card = row?.closest('.card.ex'); if (!card) return;
  // séria sa práve odškrtáva: prázdne políčka doplní plánom, aby sa rátal objem aj rekordy (dá sa prepísať)
  if (!row.classList.contains('done')) {
    const kg = $('[data-f=kg]', row), reps = $('[data-f=reps]', row);
    if (kg && !kg.value && num(kg.placeholder)) kg.value = String(num(kg.placeholder));
    if (reps && !reps.value) { const r = parseInt(reps.placeholder, 10); if (r) reps.value = String(r); }
  }
  setTimeout(() => {
    paint(scr);
    const i = cards(scr).indexOf(card);
    if (isDone(card) && scr._open === i) {
      clearTimeout(scr._adv);
      scr._adv = setTimeout(() => {
        if (!card.isConnected || !isDone(card) || scr._open !== i) return;
        const list = cards(scr), nxt = list.findIndex((c, k) => k > i && !isDone(c)), any = nxt >= 0 ? nxt : list.findIndex(c => !isDone(c));
        if (any >= 0) open(scr, any, true);
        else { scr._open = -1; paint(scr); const f = $('#finish', scr); if (f) scrollTo(f, innerHeight * 0.45); }
      }, 750);
    }
  }, 0);
}, true);

// zmena váhy v sérii sa prenesie do ďalších neodcvičených sérií toho cviku (ako v top appkách)
document.addEventListener('focusin', e => { const i = e.target.closest?.('.tf .set [data-f]'); if (i) i._old = i.value; });
document.addEventListener('change', e => {
  const inp = e.target.closest?.('.tf .set [data-f]'); if (!inp || inp.value === inp._old) return;
  const f = inp.dataset.f, row = inp.closest('.set'), ss = setsOf(row.closest('.card.ex'));
  ss.slice(ss.indexOf(row) + 1).forEach(s => {
    if (s.classList.contains('done')) return;
    const t = $(`[data-f=${f}]`, s); if (!t || (t.value && t.value !== inp._old)) return;
    t.value = inp.value; t.dispatchEvent(new Event('input', { bubbles: true }));
  });
  inp._old = inp.value;
  const scr = $('#app .screen.tf'); if (scr) paint(scr);
});
