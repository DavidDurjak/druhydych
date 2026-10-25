// v183: nová obrazovka Pridať jedlo
// živý prehľad dňa (kruh + makrá), jedlá s ikonou a kcal, AI zápis s pohyblivým svetelným rámom a nápadmi,
// farebné rýchle akcie, výsledky s makrami a postupným nábehom, animovaný text vo vyhľadávaní.
import { ctx } from './app.js';
import * as db from './data.js';

const CSS = `
@property --jang{syntax:'<angle>';inherits:false;initial-value:0deg}
.screen:has(#mealseg){isolation:isolate}
.screen:has(#mealseg)::before{content:'';position:absolute;left:-30px;right:-30px;top:-20px;height:520px;z-index:-1;pointer-events:none;
  background:radial-gradient(260px 220px at 18% 24%,color-mix(in srgb,#7CFFB2 30%,transparent),transparent 70%),radial-gradient(280px 240px at 88% 14%,color-mix(in srgb,#5BB8FF 24%,transparent),transparent 70%),radial-gradient(240px 220px at 60% 62%,color-mix(in srgb,#B794FF 18%,transparent),transparent 70%);
  filter:blur(26px);opacity:.9;animation:jDrift 14s ease-in-out infinite alternate}
@keyframes jDrift{0%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(18px,10px,0) scale(1.06)}100%{transform:translate3d(-14px,22px,0) scale(1.02)}}

/* ---------- prehľad dňa ---------- */
.jh{position:relative;display:grid;grid-template-columns:76px 1fr;gap:2px 14px;align-items:center;padding:14px 16px 12px;margin:0 0 14px;border-radius:26px;overflow:hidden;
  background:linear-gradient(155deg,color-mix(in srgb,var(--card) 92%,#7CFFB2 8%),var(--card));border:1px solid color-mix(in srgb,var(--line) 70%,#7CFFB2 30%);
  box-shadow:0 14px 34px -18px color-mix(in srgb,#7CFFB2 40%,transparent),inset 0 1px 0 rgba(255,255,255,.06);animation:jIn .6s cubic-bezier(.2,.9,.3,1) both}
.jh::after{content:'';position:absolute;inset:0;background:linear-gradient(110deg,transparent 35%,rgba(255,255,255,.07) 50%,transparent 65%);transform:translateX(-120%);animation:jShine 5.5s ease-in-out 1.2s infinite;pointer-events:none}
@keyframes jShine{0%,55%{transform:translateX(-120%)}100%{transform:translateX(120%)}}
.jh-ring{position:relative;width:76px;height:76px}
.jh-ring svg{width:100%;height:100%;transform:rotate(-90deg);overflow:visible}
.jh-ring .t{fill:none;stroke:color-mix(in srgb,var(--text) 10%,transparent);stroke-width:9}
.jh-ring .f{fill:none;stroke:url(#jg);stroke-width:9;stroke-linecap:round;stroke-dasharray:213.6;stroke-dashoffset:213.6;transition:stroke-dashoffset 1.3s cubic-bezier(.2,.8,.2,1) .15s;filter:drop-shadow(0 0 6px color-mix(in srgb,#7CFFB2 55%,transparent))}
.jh.over .jh-ring .f{filter:drop-shadow(0 0 6px color-mix(in srgb,#B794FF 60%,transparent))}
.jh-ring b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.jh-ring b small{font-size:11px;font-weight:700;margin-left:1px;color:var(--muted)}
.jh-t{min-width:0}
.jh-t small{display:block;font-size:12.5px;font-weight:650;color:var(--muted)}
.jh-t strong{display:block;font-size:32px;line-height:1.05;font-weight:850;letter-spacing:-.04em;font-variant-numeric:tabular-nums;margin-top:1px}
.jh-t strong em{font-style:normal;font-size:14px;font-weight:700;color:var(--muted);letter-spacing:0;margin-left:5px}
.jh-t span{display:block;font-size:12.5px;color:var(--muted);margin-top:3px}
.jh-m{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:10px}
.jm{display:flex;flex-direction:column;gap:5px;font-size:11.5px;font-weight:700;color:var(--c)}
.jm b{font-size:14px;font-weight:800;color:var(--text);letter-spacing:-.01em;font-variant-numeric:tabular-nums}
.jm b small{font-size:11px;font-weight:600;color:var(--muted);margin-left:2px}
.jm i{display:block;height:6px;border-radius:99px;background:color-mix(in srgb,var(--text) 9%,transparent);overflow:hidden}
.jm i u{display:block;height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,color-mix(in srgb,var(--c) 70%,transparent),var(--c));transition:width 1.1s cubic-bezier(.2,.8,.2,1) .3s;text-decoration:none}
.jh-tip{grid-column:1/-1;margin-top:8px;padding:7px 11px;border-radius:12px;font-size:12px;line-height:1.35;font-weight:600;color:var(--text);background:color-mix(in srgb,#7CFFB2 10%,transparent);border:1px solid color-mix(in srgb,#7CFFB2 22%,transparent)}
.jh.sk .jh-ring,.jh.sk .jh-t strong,.jh.sk .jh-t small{position:relative;color:transparent;border-radius:12px;background:linear-gradient(90deg,color-mix(in srgb,var(--text) 6%,transparent),color-mix(in srgb,var(--text) 14%,transparent),color-mix(in srgb,var(--text) 6%,transparent));background-size:200% 100%;animation:jSk 1.2s linear infinite}
.jh.sk .jh-ring svg,.jh.sk .jh-ring b,.jh.sk .jh-m,.jh.sk .jh-t span{visibility:hidden}
@keyframes jSk{to{background-position:-200% 0}}
@keyframes jIn{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}

/* ---------- výber jedla ---------- */
.screen:has(#mealseg) #mealseg{gap:8px;padding:6px;border-radius:22px;background:color-mix(in srgb,var(--card) 80%,transparent);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}
.screen:has(#mealseg) #mealseg button{display:flex;flex-direction:column;align-items:center;gap:2px;min-width:78px;padding:10px 10px 9px;border-radius:16px;border:1px solid transparent;font-size:12.5px;font-weight:700;transition:transform .2s,background .25s,border-color .25s,box-shadow .25s}
.screen:has(#mealseg) #mealseg button .ji{font-size:22px;line-height:1.1;font-style:normal;transition:transform .3s cubic-bezier(.3,1.6,.5,1)}
.screen:has(#mealseg) #mealseg button small{font-size:11px;font-weight:700;color:var(--muted);min-height:13px;font-variant-numeric:tabular-nums}
.screen:has(#mealseg) #mealseg button.has small{color:var(--mc)}
.screen:has(#mealseg) #mealseg button:active{transform:scale(.94)}
.screen:has(#mealseg) #mealseg button.on{color:var(--text);border-color:color-mix(in srgb,var(--mc) 60%,transparent);background:linear-gradient(180deg,color-mix(in srgb,var(--mc) 34%,transparent),color-mix(in srgb,var(--mc) 10%,transparent));box-shadow:0 8px 22px -8px color-mix(in srgb,var(--mc) 70%,transparent),inset 0 1px 0 rgba(255,255,255,.18)}
.screen:has(#mealseg) #mealseg button.on .ji{transform:scale(1.18) translateY(-1px);animation:jBob 2.6s ease-in-out infinite}
.screen:has(#mealseg) #mealseg button.on small{color:var(--text)}
@keyframes jBob{0%,100%{transform:scale(1.18) translateY(-1px)}50%{transform:scale(1.18) translateY(-4px) rotate(-6deg)}}

/* ---------- vyhľadávanie ---------- */
.screen:has(#mealseg) .input-row:has(#q){position:relative}
.screen:has(#mealseg) #q{background-color:color-mix(in srgb,var(--card) 88%,transparent);box-shadow:inset 0 1px 0 rgba(255,255,255,.05)}
.screen:has(#mealseg) .input-row:has(#q) .btn.icon{position:relative;overflow:hidden;color:var(--accent);background:linear-gradient(160deg,color-mix(in srgb,var(--accent) 16%,var(--card)),var(--card));border:1px solid color-mix(in srgb,var(--accent) 35%,var(--line))}
.screen:has(#mealseg) #scan::after{content:'';position:absolute;left:10px;right:10px;height:2px;border-radius:2px;background:var(--accent);box-shadow:0 0 10px var(--accent);top:12px;animation:jScan 2.4s ease-in-out infinite}
@keyframes jScan{0%,100%{top:12px;opacity:.2}50%{top:calc(100% - 14px);opacity:1}}

/* ---------- AI zápis ---------- */
.screen:has(#mealseg) .ai-box{position:relative;border:0;border-radius:24px;padding:14px 14px 14px;background:linear-gradient(180deg,color-mix(in srgb,var(--card) 92%,#7CFFB2 8%),var(--card))}
.screen:has(#mealseg) .ai-box::before{content:'';position:absolute;inset:0;border-radius:inherit;padding:1.6px;pointer-events:none;
  background:conic-gradient(from var(--jang),#7CFFB2,#5BB8FF,#B794FF,#FF8FB1,#FFC857,#7CFFB2);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:jSpin 6s linear infinite;opacity:.85}
@keyframes jSpin{to{--jang:360deg}}
.screen:has(#mealseg) .ai-box::after{content:'';position:absolute;left:12%;right:12%;bottom:-14px;height:26px;border-radius:50%;background:conic-gradient(from var(--jang),#7CFFB2,#5BB8FF,#B794FF,#7CFFB2);filter:blur(22px);opacity:.28;z-index:-1;animation:jSpin 6s linear infinite;pointer-events:none}
.screen:has(#mealseg) .ai-spark{display:inline-grid;place-items:center;animation:jSpark 3s ease-in-out infinite}
@keyframes jSpark{0%,100%{transform:scale(1) rotate(0)}50%{transform:scale(1.22) rotate(18deg)}}
.jai-ch{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin:12px -14px 0;padding:0 14px 2px}
.jai-ch::-webkit-scrollbar{display:none}
.jai-ch button{flex:0 0 auto;-webkit-appearance:none;appearance:none;border:1px solid color-mix(in srgb,var(--text) 14%,transparent);background:color-mix(in srgb,var(--text) 6%,transparent);color:var(--text);padding:7px 12px;border-radius:99px;font:inherit;font-size:12.5px;font-weight:650;cursor:pointer;white-space:nowrap;transition:transform .15s,background .2s}
.jai-ch button:active{transform:scale(.94);background:color-mix(in srgb,var(--accent) 22%,transparent)}
.screen:has(#mealseg) .ai-box.has .jai-ch{display:none}

/* ---------- rýchle akcie ---------- */
.screen:has(#mealseg) .qa{gap:10px}
.screen:has(#mealseg) .qa-b{position:relative;overflow:hidden;min-height:78px;border-radius:20px;justify-content:center;gap:7px;font-weight:700;border:1px solid color-mix(in srgb,var(--c) 28%,var(--line));background:linear-gradient(170deg,color-mix(in srgb,var(--c) 14%,var(--card)),var(--card));animation:jIn .55s cubic-bezier(.2,.9,.3,1) both;transition:transform .15s,box-shadow .25s}
.screen:has(#mealseg) .qa-b:nth-child(1){--c:#7CFFB2;animation-delay:.05s}
.screen:has(#mealseg) .qa-b:nth-child(2){--c:#FFC857;animation-delay:.12s}
.screen:has(#mealseg) .qa-b:nth-child(3){--c:#5BB8FF;animation-delay:.19s}
.screen:has(#mealseg) .qa-b:nth-child(4){--c:#FF8FB1;animation-delay:.26s}
.screen:has(#mealseg) .qa-b b{display:grid;place-items:center;width:34px;height:34px;border-radius:12px;color:var(--c);font-size:18px;background:color-mix(in srgb,var(--c) 18%,transparent);box-shadow:0 6px 16px -6px color-mix(in srgb,var(--c) 70%,transparent)}
.screen:has(#mealseg) .qa-b span{font-size:12.5px}
.screen:has(#mealseg) .qa-b::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at var(--px,50%) var(--py,50%),color-mix(in srgb,var(--c) 40%,transparent),transparent 60%);opacity:0;transition:opacity .3s}
.screen:has(#mealseg) .qa-b:active::after{opacity:1}
.screen:has(#mealseg) .qa-b:active{transform:scale(.95)}

/* ---------- záložky a výsledky ---------- */
.screen:has(#mealseg) #tabs{border-radius:18px;padding:5px;background:color-mix(in srgb,var(--card) 80%,transparent)}
.screen:has(#mealseg) #tabs button{border-radius:13px;padding:11px 6px;font-size:14px;transition:background .25s,color .25s,box-shadow .25s}
.screen:has(#mealseg) #tabs button.on{background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 22%,var(--card-2)),var(--card-2));color:var(--text);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 35%,transparent),0 6px 16px -8px color-mix(in srgb,var(--accent) 60%,transparent)}
.screen:has(#mealseg) .res.hasft.fast{animation:jIn .5s cubic-bezier(.2,.9,.3,1) both;transition:transform .15s,border-color .2s}
.screen:has(#mealseg) .res.hasft.fast:nth-of-type(2){animation-delay:.04s}
.screen:has(#mealseg) .res.hasft.fast:nth-of-type(3){animation-delay:.09s}
.screen:has(#mealseg) .res.hasft.fast:nth-of-type(4){animation-delay:.14s}
.screen:has(#mealseg) .res.hasft.fast:nth-of-type(5){animation-delay:.19s}
.screen:has(#mealseg) .res.hasft.fast:nth-of-type(n+6){animation-delay:.24s}
.screen:has(#mealseg) .res.hasft.fast:active{transform:scale(.985)}
.screen:has(#mealseg) .res.hasft .k{color:var(--accent)}
.screen:has(#mealseg) .res .n .mx{display:flex;flex-wrap:nowrap;gap:12px;margin-top:5px;font-size:12px;font-weight:700;line-height:1.2}
.screen:has(#mealseg) .res .n .mx i{display:inline-block;white-space:nowrap;font-style:normal;font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}
.screen:has(#mealseg) .res .n .mx i::before{content:'';display:inline-block;width:6px;height:6px;margin-right:5px;border-radius:50%;background:var(--c);vertical-align:middle}
.screen:has(#mealseg) .fast-h span{font-size:12.5px}
.screen:has(#mealseg) .empty{position:relative;padding:34px 18px 26px;text-align:center;border-radius:20px;border:1.5px dashed color-mix(in srgb,var(--text) 16%,transparent);color:var(--muted)}
.screen:has(#mealseg) .empty::before{content:'🍽️';display:block;font-size:38px;margin-bottom:8px;animation:jBob2 3s ease-in-out infinite}
@keyframes jBob2{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-6px) rotate(4deg)}}
body:has(.fast-bar) .bd-fab{opacity:0!important;pointer-events:none!important;transform:scale(.6)!important}
.fast-bar{z-index:70}
@media (prefers-reduced-motion:reduce){.screen:has(#mealseg) *,.screen:has(#mealseg)::before,.jh,.jh::after{animation:none!important;transition:none!important}}
`;
/* karta s kcal a makrami hore je zbytočná (to isté je na Dnes); skrytá, súhrny jedál na lište ostávajú */
const st = document.createElement('style'); st.id = 'jedlo2css'; st.textContent = CSS + '#jh,.jh{display:none!important}'; document.head.appendChild(st);

const META = {
  breakfast: ['🍳', '#FFB547'], brunch: ['🥪', '#FFD36E'], lunch: ['🍲', '#FF7A59'], afternoon: ['🥨', '#5CD6C0'],
  dinner: ['🍽️', '#8C8CFF'], late: ['🌙', '#B58CFF'], snack: ['🍎', '#FF6FA8'],
};
const IDEAS = ['2 vajcia a toast', 'skyr a banán', 'kuracie s ryžou', 'kebab a kofola', 'ovsená kaša s ovocím'];
const HINTS = ['kuracie prsia', 'ovsená kaša', 'bryndzové halušky', 'skyr', 'banán', 'tvaroh', 'ryža basmati', 'avokádo', 'proteínová tyčinka'];
const n0 = v => Math.round(Number(v) || 0);
const num = (el, to, ms = 1000, from = 0) => {
  const t0 = performance.now();
  const step = t => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3); el.textContent = n0(from + (to - from) * e); if (k < 1 && el.isConnected) requestAnimationFrame(step); };
  requestAnimationFrame(step);
};

function decorateMeals(seg, sums) {
  seg.querySelectorAll('button[data-meal]').forEach(b => {
    const k = b.dataset.meal, m = META[k] || ['🍴', '#7CFFB2'];
    b.style.setProperty('--mc', m[1]);
    let i = b.querySelector('.ji'), s = b.querySelector('small');
    if (!i) { i = document.createElement('i'); i.className = 'ji'; i.textContent = m[0]; b.prepend(i); }
    if (!s) { s = document.createElement('small'); b.appendChild(s); }
    const kc = sums?.[k] || 0;
    s.textContent = kc ? n0(kc) + ' kcal' : '+';
    b.classList.toggle('has', kc > 0);
  });
}

async function fill(hero, seg) {
  const c = ctx, p = c.state?.profile; if (!p) { hero.remove(); return; }
  let rows = [];
  try { rows = await db.listFood(p.id, c.state.date); } catch (_) { hero.remove(); return; }
  if (!hero.isConnected) return;
  const sum = { kcal: 0, protein: 0, carbs: 0, fat: 0 }, by = {};
  rows.forEach(r => { sum.kcal += +r.kcal || 0; sum.protein += +r.protein || 0; sum.carbs += +r.carbs || 0; sum.fat += +r.fat || 0; by[r.meal] = (by[r.meal] || 0) + (+r.kcal || 0); });
  decorateMeals(seg, by);
  const tk = +p.target_kcal || 0, left = tk - sum.kcal, over = left < 0, pct = tk ? Math.min(1, sum.kcal / tk) : 0;
  hero.classList.remove('sk'); hero.classList.toggle('over', over);
  const strong = hero.querySelector('.jh-t strong'), lab = hero.querySelector('.jh-t small'), sub = hero.querySelector('.jh-t span');
  lab.textContent = over ? 'Nad cieľom o' : 'Zostáva dnes';
  const prev = +hero.dataset.k || 0; hero.dataset.k = String(Math.abs(left));
  strong.innerHTML = `<i>${n0(prev)}</i><em>kcal</em>`; num(strong.querySelector('i'), Math.abs(left), 700, prev);
  sub.textContent = `zjedené ${n0(sum.kcal)} z ${n0(tk)} kcal`;
  const ring = hero.querySelector('.f'), pc = hero.querySelector('.jh-ring b');
  const pp = +hero.dataset.p || 0; hero.dataset.p = String(pct * 100);
  pc.innerHTML = `<span>${n0(pp)}</span><small>%</small>`; num(pc.firstChild, pct * 100, 700, pp);
  requestAnimationFrame(() => requestAnimationFrame(() => { ring.style.strokeDashoffset = String(213.6 * (1 - pct)); }));
  const M = [['Bielkoviny', sum.protein, +p.target_protein, '#7CFFB2'], ['Sacharidy', sum.carbs, +p.target_carbs, '#5BB8FF'], ['Tuky', sum.fat, +p.target_fat, '#FFC857']];
  hero.querySelector('.jh-m').innerHTML = M.map(([l, v, t, col]) => `<div class="jm" style="--c:${col}">${l}<b>${n0(v)}<small>/ ${n0(t)} g</small></b><i><u data-w="${t ? Math.min(100, v / t * 100) : 0}"></u></i></div>`).join('');
  requestAnimationFrame(() => requestAnimationFrame(() => hero.querySelectorAll('u[data-w]').forEach(u => { u.style.width = u.dataset.w + '%'; })));
  const pl = (+p.target_protein || 0) - sum.protein;
  const tip = hero.querySelector('.jh-tip');
  if (!rows.length) tip.textContent = 'Zatiaľ nič nezapísané. Začni tým, čo máš najbližšie, aj odhad stačí.';
  else if (over) tip.textContent = 'Si nad cieľom. Jeden deň nič nepokazí, ďalšie jedlo vyber ľahšie.';
  else if (pl > 20) tip.textContent = `Do cieľa ti chýba ešte ${n0(pl)} g bielkovín. Skús skyr, tvaroh alebo kuracie.`;
  else tip.textContent = 'Bielkoviny máš skoro v cieli. Drž sa plánu.';
  tip.hidden = false;
}

function placeholderLoop(q) {
  let i = 0, j = 0, dir = 1, wait = 0;
  const tm = setInterval(() => {
    if (!q.isConnected) { clearInterval(tm); return; }
    if (document.activeElement === q || q.value) { return; }
    if (wait > 0) { wait--; return; }
    const w = HINTS[i];
    j += dir; q.placeholder = 'Hľadaj: ' + w.slice(0, Math.max(0, j)) + (j > 0 ? '|' : '');
    if (dir === 1 && j >= w.length) { dir = -1; wait = 18; }
    else if (dir === -1 && j <= 0) { dir = 1; i = (i + 1) % HINTS.length; wait = 4; }
  }, 70);
}

let barTxt = '', barT = 0;
// po každom uloženom jedle obnov súčty kcal pri jedlách (predtým to robila spodná lišta Pridané/Späť/Hotovo)
addEventListener('fw-logged', () => { clearTimeout(barT); barT = setTimeout(() => { const hero = document.querySelector('#jh'), seg = document.querySelector('#mealseg'); if (hero && seg) fill(hero, seg); }, 600); });
function watchBar() {
  const t = document.querySelector('.fast-bar')?.textContent || '';
  if (t === barTxt) return; barTxt = t;
  clearTimeout(barT);
  barT = setTimeout(() => { const hero = document.querySelector('#jh'), seg = document.querySelector('#mealseg'); if (hero && seg) fill(hero, seg); }, 500);
}
function tune() {
  watchBar();
  const seg = document.querySelector('#mealseg'); if (!seg || seg.dataset.j2) return;
  seg.dataset.j2 = '1';
  decorateMeals(seg, null);
  const top = seg.closest('.screen')?.querySelector('.topbar');
  if (top && !document.querySelector('#jh')) {
    const hero = document.createElement('section'); hero.className = 'jh sk'; hero.id = 'jh';
    hero.innerHTML = `<div class="jh-ring"><svg viewBox="0 0 84 84" aria-hidden="true"><defs><linearGradient id="jg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7CFFB2"/><stop offset="1" stop-color="#5BE0C0"/></linearGradient></defs><circle class="t" cx="42" cy="42" r="34"/><circle class="f" cx="42" cy="42" r="34"/></svg><b></b></div><div class="jh-t"><small>Dnes</small><strong>&nbsp;</strong><span>&nbsp;</span></div><div class="jh-m"></div><div class="jh-tip" hidden></div>`;
    top.after(hero);
    fill(hero, seg);
  }
  const ai = document.querySelector('#aiBox');
  if (ai && !ai.querySelector('.jai-ch')) {
    const row = document.createElement('div'); row.className = 'jai-ch';
    row.innerHTML = IDEAS.map(t => `<button type="button">${t}</button>`).join('');
    ai.appendChild(row);
    row.addEventListener('click', e => { const b = e.target.closest('button'); const ta = ai.querySelector('#aiText'); if (!b || !ta) return; ta.value = b.textContent; ta.dispatchEvent(new Event('input')); ta.focus(); });
  }
  const q = document.querySelector('#q'); if (q) placeholderLoop(q);
}
new MutationObserver(tune).observe(document.documentElement, { childList: true, subtree: true });
tune();
