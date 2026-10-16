// Vizuálna vrstva obrazovky Tréning: živý prstenec postupu, farebné karty podľa svalu, časovač pauzy, konfety po dokončení.
// Beží ako doplnok nad existujúcou obrazovkou (nemení dáta ani ukladanie), preto je bezpečný.
import { EXERCISES } from './workouts.js';

const CSS = `
.fx-hero{position:relative;overflow:hidden;border-radius:26px;padding:18px 16px 16px;margin-bottom:14px;border:1px solid rgba(124,255,178,.22);
  background:linear-gradient(145deg,#142A26 0%,#12202E 55%,#1B1830 100%);box-shadow:0 18px 40px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.08)}
.fx-aur{position:absolute;inset:-40%;pointer-events:none;opacity:.55;filter:blur(38px);
  background:radial-gradient(40% 40% at 20% 30%,rgba(124,255,178,.55),transparent 70%),radial-gradient(35% 35% at 80% 20%,rgba(91,184,255,.5),transparent 70%),radial-gradient(40% 40% at 70% 85%,rgba(255,107,53,.4),transparent 70%);
  animation:fxAur 14s ease-in-out infinite alternate}
@keyframes fxAur{0%{transform:translate3d(-4%,-2%,0) rotate(0deg)}100%{transform:translate3d(5%,4%,0) rotate(18deg)}}
.fx-in{position:relative;display:flex;gap:14px;align-items:center;justify-content:space-between}
.fx-txt{min-width:0;flex:1}
.fx-kick{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:var(--accent);background:rgba(124,255,178,.12);border:1px solid rgba(124,255,178,.25);padding:4px 10px;border-radius:99px}
.fx-fire{display:inline-block;animation:fxFire 1.4s ease-in-out infinite;transform-origin:50% 90%}
@keyframes fxFire{0%,100%{transform:scale(1) rotate(-4deg)}50%{transform:scale(1.25) rotate(5deg)}}
.fx-hero h2{margin:10px 0 2px;font-size:22px;line-height:1.15;letter-spacing:-.02em}
.fx-mus{margin:0;font-size:13px;color:rgba(242,244,247,.7)}
.fx-ring{position:relative;flex:none;width:112px;height:112px}
.fx-ring svg{width:100%;height:100%;display:block;overflow:visible}
.fx-ring .bg{fill:none;stroke:rgba(255,255,255,.10);stroke-width:10}
.fx-ring .fg{fill:none;stroke-width:10;stroke-linecap:round;transition:stroke-dashoffset .9s cubic-bezier(.3,1.2,.4,1);filter:drop-shadow(0 0 8px rgba(124,255,178,.65))}
.fx-ctr{position:absolute;inset:0;display:grid;place-items:center;text-align:center;line-height:1}
.fx-ctr b{display:block;font-size:26px;letter-spacing:-.04em;font-variant-numeric:tabular-nums}
.fx-ctr span{display:block;font-size:11px;color:rgba(242,244,247,.65);margin-top:3px}
.fx-tiles{position:relative;display:grid;grid-template-columns:1.25fr 1fr 1fr;gap:8px;margin-top:14px}
.fx-tile{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:9px 10px;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
.fx-tile b{display:block;font-size:17px;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.fx-tile span{display:block;font-size:11px;color:rgba(242,244,247,.6);margin-top:2px}
.fx-dots{display:flex;gap:3px;font-size:15px;line-height:1;min-height:20px;align-items:center;flex-wrap:wrap}
.fx-dots i{font-style:normal;width:14px;height:14px;border-radius:50%;background:rgba(255,255,255,.14);display:inline-block}
.fx-dots em{font-style:normal;animation:fxFire 1.8s ease-in-out infinite}
.fx-msg{position:relative;margin:12px 2px 0;font-size:13.5px;font-weight:600;color:#fff}
.fx-hero.full .fx-ring .fg{stroke:#7CFFB2;filter:drop-shadow(0 0 12px rgba(124,255,178,.9))}
.fx-hero.full .fx-fire{animation-duration:.7s}
.fx-on .grid3.mb,.fx-on .row.between.mb + .card{display:none}
.fx-on .seg{background:transparent;border:0;padding:0;gap:8px;overflow-x:auto;scrollbar-width:none}
.fx-on .seg::-webkit-scrollbar{display:none}
.fx-on .seg button{flex:1 0 auto;min-width:52px;padding:11px 10px;border-radius:14px;background:var(--card);border:1px solid var(--line);color:var(--muted);font-weight:700;transition:transform .15s,background .2s,color .2s,box-shadow .2s}
.fx-on .seg button.on{background:linear-gradient(135deg,#7CFFB2,#5BE0C0);color:#06301A;border-color:transparent;box-shadow:0 8px 20px rgba(124,255,178,.28);transform:translateY(-1px)}
.fx-on .plan-info{border-radius:20px;background:linear-gradient(135deg,rgba(124,255,178,.07),rgba(91,184,255,.05)),var(--card);border-color:rgba(124,255,178,.18)}
.fx-on .card.ex{--mc:#7CFFB2;position:relative;overflow:hidden;border-radius:22px;padding:16px 14px 14px 18px;
  background:linear-gradient(135deg,color-mix(in srgb,var(--mc) 10%,var(--card)),var(--card) 58%);
  border-color:color-mix(in srgb,var(--mc) 24%,var(--line));transition:box-shadow .35s,border-color .35s}
.fx-on .card.ex::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--mc);box-shadow:0 0 16px var(--mc)}
.fx-on .card.ex.exdone{border-color:color-mix(in srgb,var(--mc) 60%,transparent);box-shadow:0 0 0 1px color-mix(in srgb,var(--mc) 35%,transparent),0 10px 30px color-mix(in srgb,var(--mc) 18%,transparent)}
.fx-on .exh{align-items:center}
.fx-ic{flex:none;width:46px;height:46px;border-radius:15px;display:grid;place-items:center;font-size:23px;margin-right:2px;
  background:color-mix(in srgb,var(--mc) 20%,transparent);border:1px solid color-mix(in srgb,var(--mc) 35%,transparent)}
.fx-ic span{display:inline-block;transition:transform .3s}
.exdone .fx-ic span{animation:fxPop .6s cubic-bezier(.3,1.6,.5,1)}
.fx-tag{display:inline-block;font-size:10.5px;font-weight:700;letter-spacing:.02em;color:var(--mc);margin-bottom:3px}
.fx-on .ex .exn{flex:1}
.fx-on .ex .exm b{color:var(--mc)}
.fx-bar{height:5px;border-radius:99px;background:rgba(255,255,255,.07);margin:12px 0 2px;overflow:hidden}
.fx-bar i{display:block;height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,var(--mc),color-mix(in srgb,var(--mc) 55%,#fff));transition:width .5s cubic-bezier(.3,1.2,.4,1);box-shadow:0 0 10px var(--mc)}
.fx-on .ex .set{padding:5px 6px;border-radius:16px;background:rgba(255,255,255,.035);transition:background .25s}
.fx-on .set.done{opacity:1;background:color-mix(in srgb,var(--mc) 14%,transparent)}
.fx-on .ex .input.sm{background:rgba(0,0,0,.28);border-radius:12px;font-weight:700}
.fx-on .ex .input.sm:focus{border-color:var(--mc);box-shadow:0 0 0 3px color-mix(in srgb,var(--mc) 25%,transparent)}
.fx-on .ex .chk{border-radius:14px;transition:transform .15s,background .2s}
.fx-on .set.done .chk{background:var(--mc);border-color:var(--mc);color:#06130C;animation:fxPop .45s cubic-bezier(.3,1.7,.5,1)}
.fx-on .set.done .setno{background:var(--mc);color:#06130C}
@keyframes fxPop{0%{transform:scale(.7)}60%{transform:scale(1.18)}100%{transform:scale(1)}}
.fx-on #finish{padding:16px;font-size:16px;border-radius:18px;background:linear-gradient(135deg,#7CFFB2,#4FD8E0);box-shadow:0 12px 28px rgba(124,255,178,.3)}
.fx-rest{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 84px);transform:translate(-50%,30px);opacity:0;pointer-events:none;z-index:60;width:min(92vw,360px);
  background:rgba(20,26,34,.82);-webkit-backdrop-filter:blur(16px) saturate(160%);backdrop-filter:blur(16px) saturate(160%);border:1px solid rgba(255,255,255,.14);border-radius:22px;padding:12px 14px;
  box-shadow:0 18px 40px rgba(0,0,0,.5);transition:transform .35s cubic-bezier(.3,1.4,.5,1),opacity .25s}
.fx-rest.on{transform:translate(-50%,0);opacity:1;pointer-events:auto}
.fx-rest .rt{display:flex;align-items:center;gap:12px}
.fx-rest b{font-size:28px;letter-spacing:-.03em;font-variant-numeric:tabular-nums;min-width:74px}
.fx-rest small{display:block;max-width:130px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--muted);font-size:12px}
.fx-rest .rb{margin-left:auto;display:flex;gap:6px}
.fx-rest button{white-space:nowrap;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.08);color:#fff;border-radius:12px;padding:9px 12px;font-weight:700;font-size:13px;cursor:pointer}
.fx-rest .pb{height:4px;border-radius:99px;background:rgba(255,255,255,.1);margin-top:10px;overflow:hidden}
.fx-rest .pb i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#7CFFB2,#5BB8FF);transform-origin:left;transition:transform .25s linear}
.fx-rest.end{border-color:rgba(124,255,178,.7);animation:fxGlow .9s ease-in-out 3}
@keyframes fxGlow{50%{box-shadow:0 0 0 6px rgba(124,255,178,.25),0 18px 40px rgba(0,0,0,.5)}}
.fx-cf{position:fixed;inset:0;z-index:90;pointer-events:none}
@media (prefers-reduced-motion:reduce){.fx-aur,.fx-fire,.fx-dots em{animation:none}.exdone .fx-ic span,.fx-on .set.done .chk{animation:none}.fx-ring .fg,.fx-bar i{transition:none}}
`;
const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

const GROUP = {
  chest: ['#FF8A4C', '🏋️'], back: ['#5BB8FF', '🧗'], shoulders: ['#B792FF', '🙌'], reardelt: ['#B792FF', '🙌'],
  biceps: ['#FFC857', '💪'], triceps: ['#FFC857', '💪'], quads: ['#7CFFB2', '🦵'], hams: ['#7CFFB2', '🦵'], glutes: ['#7CFFB2', '🦵'], calves: ['#7CFFB2', '🦵'],
  core: ['#FF6B8B', '🔥'], cardio: ['#FF6B8B', '🏃'],
};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const num = v => { const n = parseFloat(String(v || '').replace(',', '.')); return isFinite(n) ? n : 0; };
const CIRC = 314;

function tween(el, to, fmt = v => Math.round(v)) {
  if (!el) return;
  const from = el._v ?? 0; el._v = to;
  if (reduce || from === to) { el.textContent = fmt(to); return; }
  const t0 = performance.now(), d = 600;
  const step = t => { const k = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

function build(scr) {
  const dayCard = $('.row.between.mb + .card', scr);
  const name = dayCard?.querySelector('h2')?.textContent || 'Tréning';
  const muscles = dayCard?.querySelector('p')?.textContent || '';
  const wk = ($('.grid3 .stat b', scr)?.textContent || '0/0').split('/').map(n => parseInt(n) || 0);
  const dots = Array.from({ length: Math.max(wk[1], wk[0], 1) }, (_, i) => i < wk[0] ? '<em>🔥</em>' : '<i></i>').join('');
  const hero = document.createElement('div');
  hero.className = 'fx-hero';
  hero.innerHTML = `<div class="fx-aur"></div>
    <div class="fx-in">
      <div class="fx-txt"><span class="fx-kick"><span class="fx-fire">🔥</span> Dnešný tréning</span><h2></h2><p class="fx-mus"></p></div>
      <div class="fx-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="fxg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7CFFB2"/><stop offset="1" stop-color="#5BB8FF"/></linearGradient></defs><circle class="bg" cx="60" cy="60" r="50"/><circle class="fg" cx="60" cy="60" r="50" stroke="url(#fxg)" stroke-dasharray="${CIRC}" stroke-dashoffset="${CIRC}" transform="rotate(-90 60 60)"/></svg>
        <div class="fx-ctr"><div><b data-r="n">0</b><span data-r="of"></span></div></div></div>
    </div>
    <div class="fx-tiles">
      <div class="fx-tile"><div class="fx-dots">${dots}</div><span>tento týždeň ${wk[0]}/${wk[1] || wk[0]}</span></div>
      <div class="fx-tile"><b data-r="vol">0</b><span>kg objem dnes</span></div>
      <div class="fx-tile"><b data-r="min">0</b><span>min zostáva</span></div>
    </div>
    <p class="fx-msg" data-r="msg"></p>`;
  hero.querySelector('h2').textContent = name;
  hero.querySelector('.fx-mus').textContent = muscles;
  scr.insertBefore(hero, $('.topbar', scr).nextSibling);
  $$('.card.ex', scr).forEach(card => {
    const id = $('.set', card)?.dataset.ex;
    const ex = EXERCISES[id];
    const key = id === 'cardio' ? 'cardio' : Object.entries(ex?.m || {}).sort((a, b) => b[1] - a[1])[0]?.[0];
    const [col, emo] = GROUP[key] || GROUP.quads;
    card.style.setProperty('--mc', col);
    const exh = $('.exh', card);
    if (exh) exh.insertAdjacentHTML('afterbegin', `<div class="fx-ic"><span>${emo}</span></div>`);
    const exn = $('.exn', card);
    if (exn && ex) exn.insertAdjacentHTML('afterbegin', `<span class="fx-tag"></span>`), exn.querySelector('.fx-tag').textContent = ex.muscle;
    exh?.insertAdjacentHTML('afterend', '<div class="fx-bar"><i></i></div>');
  });
  scr.classList.add('fx-on');
  return hero;
}

const MSG = [[0, 'Poďme na to. Prvá séria je najťažšia, potom ide sama.'], [0.01, 'Dobre sa rozbieha. Drž techniku.'], [0.34, 'Si v tom. Nepodceňuj pauzy, sú súčasť tréningu.'], [0.67, 'Už len posledné kolo. Dotiahni to.'], [1, 'Hotovo. Toto je rozdiel medzi tými, čo chcú, a tými, čo robia.']];

function refresh(scr, first) {
  const hero = $('.fx-hero', scr); if (!hero) return;
  const sets = $$('.set', scr), done = sets.filter(s => s.classList.contains('done'));
  const total = sets.length, n = done.length, pct = total ? n / total : 0;
  $('.fg', hero).style.strokeDashoffset = String(CIRC * (1 - pct));
  tween($('[data-r=n]', hero), n);
  $('[data-r=of]', hero).textContent = `z ${total} sérií`;
  const vol = done.reduce((a, s) => a + num($('[data-f=kg]', s)?.value) * num($('[data-f=reps]', s)?.value), 0);
  tween($('[data-r=vol]', hero), vol, v => Math.round(v).toLocaleString('sk-SK'));
  const mins = Math.round((total - n) * 2.7);
  tween($('[data-r=min]', hero), mins);
  hero.classList.toggle('full', pct === 1 && total > 0);
  $('.fx-fire', hero).textContent = pct === 1 && total ? '🏆' : '🔥';
  $('[data-r=msg]', hero).textContent = [...MSG].reverse().find(m => pct >= m[0])[1];
  $$('.card.ex', scr).forEach(card => {
    const ss = $$('.set', card), d = ss.filter(s => s.classList.contains('done')).length;
    const bar = $('.fx-bar i', card); if (bar) bar.style.width = `${ss.length ? d / ss.length * 100 : 0}%`;
    card.classList.toggle('exdone', ss.length > 0 && d === ss.length);
  });
  if (first) scr._cel = pct === 1;
  else if (pct === 1 && total && !scr._cel) { scr._cel = true; confetti(70); buzz([30, 40, 30]); }
  else if (pct < 1) scr._cel = false;
}

// ---- časovač pauzy ----
let rest = null, actx = null;
function beep() {
  try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = 880; g.gain.setValueAtTime(.0001, actx.currentTime); g.gain.exponentialRampToValueAtTime(.25, actx.currentTime + .02); g.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + .5); o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + .55); } catch (_) { }
}
const buzz = p => { try { navigator.vibrate?.(p); } catch (_) { } };
function pill() {
  let el = $('.fx-rest');
  if (!el) {
    el = document.createElement('div'); el.className = 'fx-rest';
    el.innerHTML = '<div class="rt"><b>0:00</b><div><span style="font-weight:700">Pauza</span><small></small></div><div class="rb"><button data-a="add">+15 s</button><button data-a="skip">Preskočiť</button></div></div><div class="pb"><i></i></div>';
    el.addEventListener('click', e => { const a = e.target.closest('[data-a]')?.dataset.a; if (a === 'add' && rest) { rest.end += 15000; rest.total += 15000; el.classList.remove('end'); } if (a === 'skip') stopRest(); });
    document.body.appendChild(el);
  }
  return el;
}
function stopRest() { if (rest) clearInterval(rest.t); rest = null; $('.fx-rest')?.classList.remove('on', 'end'); }
function startRest(card) {
  stopRest();
  const m = ($('.exm', card)?.textContent || '').match(/pauza ([\d,]+) (min|s)/);
  if (!m) return;
  const sec = Math.round(num(m[1]) * (m[2] === 'min' ? 60 : 1));
  const el = pill(); el.classList.remove('end');
  const name = $('h3', card)?.textContent || '';
  $('small', el).textContent = name;
  rest = { end: Date.now() + sec * 1000, total: sec * 1000, fin: false };
  const tick = () => {
    if (!rest) return;
    const left = rest.end - Date.now();
    if (left <= 0) {
      $('b', el).textContent = '0:00'; $('.pb i', el).style.transform = 'scaleX(0)';
      if (!rest.fin) { rest.fin = true; el.classList.add('end'); $('small', el).textContent = 'Ďalšia séria, ideš!'; beep(); buzz([200, 80, 200]); setTimeout(() => { if (rest?.fin) stopRest(); }, 5000); }
      return;
    }
    const s = Math.ceil(left / 1000);
    $('b', el).textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    $('.pb i', el).style.transform = `scaleX(${Math.max(0, left / rest.total)})`;
  };
  rest.t = setInterval(tick, 250); tick();
  requestAnimationFrame(() => el.classList.add('on'));
}

// ---- konfety ----
function confetti(count = 140) {
  if (reduce) return;
  const c = document.createElement('canvas'); c.className = 'fx-cf';
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = innerWidth * dpr; c.height = innerHeight * dpr; document.body.appendChild(c);
  const x = c.getContext('2d'); x.scale(dpr, dpr);
  const cols = ['#7CFFB2', '#5BB8FF', '#FFC857', '#FF6B35', '#B792FF', '#FF6B8B'];
  const ps = Array.from({ length: count }, () => ({ x: innerWidth / 2 + (Math.random() - .5) * 120, y: innerHeight * .55, vx: (Math.random() - .5) * 15, vy: -Math.random() * 16 - 6, w: 6 + Math.random() * 7, h: 4 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: cols[Math.floor(Math.random() * cols.length)] }));
  const t0 = performance.now();
  const frame = t => {
    const k = (t - t0) / 2600; x.clearRect(0, 0, innerWidth, innerHeight);
    ps.forEach(p => { p.vy += .42; p.vx *= .992; p.x += p.vx; p.y += p.vy; p.r += p.vr; x.save(); x.globalAlpha = Math.max(0, 1 - k * .9); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); x.restore(); });
    if (k < 1) requestAnimationFrame(frame); else c.remove();
  };
  requestAnimationFrame(frame);
}

// ---- napojenie ----
function scan() {
  const scr = $('#app .screen');
  if (!scr || !$('#finish', scr) || !$('.card.ex', scr)) { if (rest && !$('#finish')) stopRest(); return; }
  if (scr.dataset.fx) return;
  scr.dataset.fx = '1'; build(scr); refresh(scr, true);
}
let raf = 0;
new MutationObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(scan); }).observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
scan();

document.addEventListener('click', e => {
  const scr = $('#app .screen.fx-on'); if (!scr) return;
  const chk = e.target.closest('[data-chk]');
  if (chk) {
    const row = chk.closest('.set');
    setTimeout(() => { refresh(scr); const card = row.closest('.card.ex'); if (row.classList.contains('done') && !card.classList.contains('exdone')) { buzz(12); startRest(card); } else stopRest(); }, 0);
  }
  if (e.target.closest('#finish') && $$('.set.done', scr).length) confetti(150);
}, true);
document.addEventListener('input', e => { const scr = $('#app .screen.fx-on'); if (scr && e.target.closest('.set')) refresh(scr); }, true);
