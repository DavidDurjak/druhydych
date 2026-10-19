// Úvodné nastavenie (onboarding): nad pôvodným formulárom ostáva rovnaká logika, mení sa len vzhľad a ovládanie.
// Hore je živá karta s denným cieľom: prstenec rozdelený podľa makier sa prepočítava pri každom údaji.
// Pohlavie, cieľ a počet tréningov sú dlaždice namiesto výberových zoznamov. Pôvodné polia ostávajú v formulári (skryté),
// takže ukladanie, výpočet cieľov a odvodenie aktivity z počtu tréningov fungujú ako predtým.
import * as calc from './calc.js';
import { tr } from './i18n.js';

const CSS = `
body.ah-on #app .screen:has(#onb){padding-top:calc(env(safe-area-inset-top) + 22px)}
.screen:has(#onb) h1{font-size:34px;line-height:1.04;letter-spacing:-.035em;margin:6px 0 0}
.screen:has(#onb)>p.muted{font-size:15px;margin:10px 0 18px;max-width:34ch}
#onb.card{background:transparent;border:0;box-shadow:none;padding:0}
#onb #preview{display:none!important}
#onb .af-hint{display:none}
.ob-live{position:relative;display:flex;align-items:center;gap:18px;padding:18px;border-radius:26px;margin:0 0 22px;overflow:hidden;
  border:1px solid color-mix(in srgb,var(--accent) 26%,var(--line));
  background:radial-gradient(90% 120% at 0% 0%,color-mix(in srgb,var(--accent) 16%,transparent),transparent 62%),var(--card);
  box-shadow:0 18px 44px rgba(0,0,0,.16)}
.ob-ring{position:relative;flex:none;width:122px;height:122px}
.ob-ring svg{width:100%;height:100%;transform:rotate(-90deg);overflow:visible}
.ob-ring circle{fill:none;stroke-width:11;stroke-linecap:butt}
.ob-ring .t{stroke:var(--track,color-mix(in srgb,var(--text) 9%,transparent))}
.ob-ring .a{transition:stroke-dasharray .9s cubic-bezier(.3,1,.4,1),stroke-dashoffset .9s cubic-bezier(.3,1,.4,1),opacity .4s}
.ob-ring .w{stroke:var(--accent);opacity:0;stroke-dasharray:6 10;stroke-width:3}
.ob-live:not(.ok) .ob-ring .w{opacity:.55;animation:obSpin 24s linear infinite;transform-origin:60px 60px}
@keyframes obSpin{to{transform:rotate(360deg)}}
.ob-ring div{position:absolute;inset:0;display:grid;place-content:center;text-align:center;line-height:1}
.ob-ring b{font-size:25px;font-weight:800;letter-spacing:-.04em;font-variant-numeric:tabular-nums}
.ob-ring small{font-size:11.5px;color:var(--muted);margin-top:4px}
.ob-meta{flex:1;min-width:0}
.ob-meta h2{margin:0 0 10px;font-size:15px;font-weight:700;letter-spacing:-.01em;color:var(--text)}
.ob-meta ul{list-style:none;margin:0;padding:0;display:grid;gap:7px}
.ob-meta li{display:flex;align-items:center;gap:9px;font-size:13.5px;color:var(--muted)}
.ob-meta li i{flex:none;width:9px;height:9px;border-radius:3px}
.ob-meta li b{margin-left:auto;color:var(--text);font-variant-numeric:tabular-nums}
.ob-meta p{margin:11px 0 0;font-size:12.5px;line-height:1.4;color:var(--muted)}
.ob-g{margin:0 0 20px}
.ob-t{margin:0 0 9px 2px;font-size:13.5px;font-weight:600;color:var(--muted)}
.ob-seg{display:grid;gap:8px;grid-auto-flow:column;grid-auto-columns:1fr}
.ob-seg button{appearance:none;-webkit-appearance:none;position:relative;display:grid;place-content:center;gap:2px;min-height:56px;padding:8px 6px;border-radius:17px;
  background:var(--bg-2);border:1.5px solid var(--line);color:var(--text);font:inherit;text-align:center;cursor:pointer;
  transition:border-color .18s,background .18s,transform .12s,box-shadow .18s}
.ob-seg button b{font-size:15.5px;font-weight:700;letter-spacing:-.01em}
.ob-seg button small{font-size:11.5px;color:var(--muted)}
.ob-seg button:active{transform:scale(.97)}
.ob-seg button[aria-checked=true]{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 14%,var(--bg-2));box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 18%,transparent)}
.ob-seg button[aria-checked=true] small{color:var(--text)}
.ob-seg.days{grid-auto-flow:row;grid-template-columns:repeat(8,1fr);gap:6px}
.ob-seg.days button{min-height:0;aspect-ratio:1/1;padding:0;border-radius:50%}
.ob-seg.days button b{font-size:16px}
.ob-cap{margin:10px 2px 0;font-size:13px;color:var(--muted);min-height:1.3em}
.ob-row3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:0 0 20px}
.ob-row3 .field{margin:0;min-width:0}
.ob-row3 .field>span{display:block;margin:0 0 9px 2px;font-size:13.5px;font-weight:600;color:var(--muted);white-space:nowrap}
.ob-row3 .input{width:100%;height:60px;padding:0 4px;text-align:center;font-size:24px;font-weight:700;letter-spacing:-.03em;border-radius:17px;font-variant-numeric:tabular-nums;
  border:1.5px solid var(--line);background:var(--bg-2);-moz-appearance:textfield}
.ob-row3 .input::placeholder{font-size:16px;font-weight:500;letter-spacing:0;color:var(--muted);opacity:.7}
.ob-row3 .input::-webkit-outer-spin-button,.ob-row3 .input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
#onb .btn.primary{margin-top:6px;height:58px;font-size:17px}
body.ah-on #app .screen:has(#onb) .ob-live{animation:obIn .6s cubic-bezier(.2,.9,.3,1) both}
@keyframes obIn{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}
@media (max-width:350px){.ob-live{flex-direction:column;align-items:flex-start}}
@media (prefers-reduced-motion:reduce){.ob-ring .a{transition:none}.ob-live:not(.ok) .ob-ring .w{animation:none}body.ah-on #app .screen:has(#onb) .ob-live{animation:none}.ob-seg button{transition:none}}
`;
const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

const T = s => tr(s) || s;
const R = 48, C = 2 * Math.PI * R;
const COL = ['var(--protein,#7CFFB2)', 'var(--carbs,#5BB8FF)', 'var(--fat,#FFB547)'];
const fmt = n => Math.round(n).toLocaleString('sk-SK').replace(/ /g, ' ');

function days(n) {
  if (n === 0) return 'Bez tréningov týždenne';
  if (n === 1) return 'Jeden tréning týždenne';
  return `${n} ${n < 5 ? 'tréningy' : 'tréningov'} týždenne`;
}

function seg(form, name, title, items, cls) {
  const ctl = form.querySelector(`[name=${name}]`); if (!ctl) return null;
  const lab = ctl.closest('label'); if (lab) lab.style.display = 'none';
  const w = document.createElement('div'); w.className = 'ob-g';
  w.innerHTML = `<div class="ob-t">${T(title)}</div><div class="ob-seg ${cls || ''}" role="radiogroup" aria-label="${T(title)}">${items.map(([v, l, sub]) =>
    `<button type="button" role="radio" data-v="${v}" aria-checked="false"><b>${l}</b>${sub ? `<small>${sub}</small>` : ''}</button>`).join('')}</div>${cls === 'days' ? '<div class="ob-cap"></div>' : ''}`;
  lab.after(w);
  const mark = () => { w.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.v === String(ctl.value)))); const cap = w.querySelector('.ob-cap'); if (cap) cap.textContent = T(days(Number(ctl.value) || 0)); };
  w.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    ctl.value = b.dataset.v;
    ctl.dispatchEvent(new Event('input', { bubbles: true }));
    mark();
  });
  ctl.addEventListener('input', mark);
  mark();
  return w;
}

function liveCard() {
  const el = document.createElement('div'); el.className = 'ob-live'; el.setAttribute('aria-live', 'polite');
  el.innerHTML = `<div class="ob-ring"><svg viewBox="0 0 120 120"><circle class="t" cx="60" cy="60" r="${R}"/>
      ${COL.map(c => `<circle class="a" cx="60" cy="60" r="${R}" stroke="${c}" stroke-dasharray="0 ${C}" stroke-dashoffset="0"/>`).join('')}
      <circle class="w" cx="60" cy="60" r="${R + 11}"/></svg><div><b class="notranslate">0</b><small>kcal</small></div></div>
    <div class="ob-meta"><h2>${T('Tvoj denný cieľ')}</h2><ul>
      ${[['Bielkoviny', 0], ['Sacharidy', 1], ['Tuky', 2]].map(([n, i]) => `<li><i style="background:${COL[i]}"></i>${T(n)}<b class="notranslate">0 g</b></li>`).join('')}</ul>
      <p>${T('Doplň rok narodenia, výšku a váhu a cieľ sa prepočíta hneď.')}</p></div>`;
  return el;
}

let raf = 0;
function countTo(el, to) {
  cancelAnimationFrame(raf);
  const from = Number(el.dataset.v || 0), t0 = performance.now(); el.dataset.v = String(to);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || from === to) { el.textContent = fmt(to); return; }
  const step = t => { const k = Math.min(1, (t - t0) / 700); el.textContent = fmt(from + (to - from) * (1 - Math.pow(1 - k, 3))); if (k < 1 && el.isConnected) raf = requestAnimationFrame(step); };
  raf = requestAnimationFrame(step);
}

function update(form, card) {
  const f = new FormData(form);
  const w = Number(f.get('weight')), hc = Number(f.get('height_cm')), by = Number(f.get('birth_year'));
  const ok = w >= 30 && w <= 300 && hc >= 120 && hc <= 230 && by >= 1930 && by <= new Date().getFullYear() - 18;
  card.classList.toggle('ok', ok);
  const arcs = card.querySelectorAll('.ob-ring .a'), rows = card.querySelectorAll('.ob-meta li b'), p = card.querySelector('.ob-meta p'), num = card.querySelector('.ob-ring b');
  if (!ok) {
    arcs.forEach(a => a.setAttribute('stroke-dasharray', `0 ${C}`));
    rows.forEach(r => { r.textContent = '0 g'; });
    num.dataset.v = '0'; num.textContent = '0';
    p.textContent = T('Doplň rok narodenia, výšku a váhu a cieľ sa prepočíta hneď.');
    return;
  }
  const t = calc.targets({ sex: f.get('sex'), weightKg: w, heightCm: hc, birthYear: f.get('birth_year'), activity: f.get('activity'), goal: f.get('goal') });
  const cal = [t.protein * 4, t.carbs * 4, t.fat * 9], sum = cal.reduce((a, b) => a + b, 0) || 1;
  let start = 0; const gap = 3;
  cal.forEach((c, i) => { const len = Math.max(0, (c / sum) * C - gap); arcs[i].setAttribute('stroke-dasharray', `${len} ${C - len}`); arcs[i].setAttribute('stroke-dashoffset', String(-start)); start += (c / sum) * C; });
  [t.protein, t.carbs, t.fat].forEach((v, i) => { rows[i].textContent = `${Math.round(v)} g`; });
  countTo(num, t.kcal);
  p.textContent = `${T('Výdaj energie')} ${fmt(t.tdee)} kcal, ${T('bazálny metabolizmus')} ${fmt(t.bmr)} kcal.`;
}

function enhance(form) {
  if (form.dataset.ob) return; form.dataset.ob = '1';
  // tri číselné polia do jedného riadku s veľkými číslami
  const by = form.querySelector('[name=birth_year]'), ht = form.querySelector('[name=height_cm]'), wt = form.querySelector('[name=weight]');
  if (by && ht && wt) {
    const row = document.createElement('div'); row.className = 'ob-row3';
    const labs = [[by, 'Narodený'], [ht, 'Výška, cm'], [wt, 'Váha, kg']].map(([c, name]) => { const l = c.closest('label'); l.querySelector('span').textContent = T(name); return l; });
    const sexLab = form.querySelector('[name=sex]')?.closest('label');
    (sexLab?.parentElement || form).before(row);
    labs.forEach(l => { const g = l.parentElement; row.appendChild(l); if (g && g !== form && g.classList.contains('grid2') && !g.children.length) g.remove(); });
    by.placeholder = '1998'; ht.placeholder = '180'; wt.placeholder = '75';
    ht.setAttribute('inputmode', 'numeric'); wt.setAttribute('inputmode', 'decimal');
  }
  const sexSel = form.querySelector('[name=sex]');
  const sexItems = sexSel ? [...sexSel.options].map(o => [o.value, o.textContent]) : [];
  const goalSel = form.querySelector('[name=goal]');
  const sub = { lose: '−500 kcal', maintain: 'bez zmeny', gain: '+300 kcal' };
  const goalItems = goalSel ? [...goalSel.options].map(o => [o.value, o.textContent, T(sub[o.value] || '')]) : [];
  const g1 = seg(form, 'sex', 'Pohlavie', sexItems);
  const g2 = seg(form, 'goal', 'Tvoj cieľ', goalItems);
  const g3 = seg(form, 'training_days', 'Tréningy v týždni', [0, 1, 2, 3, 4, 5, 6, 7].map(n => [n, n]), 'days');
  if (g1 && g2 && g3) { const first = form.querySelector('.ob-row3'); if (first) { first.before(g1); g1.after(g2); } }
  const card = liveCard();
  form.before(card);
  const run = () => update(form, card);
  form.addEventListener('input', run); form.addEventListener('change', run);
  run(); setTimeout(run, 250);
}

function scan() { const f = document.querySelector('#app #onb'); if (f) enhance(f); }
const app = document.getElementById('app');
if (app) { new MutationObserver(scan).observe(app, { childList: true, subtree: true }); scan(); }
