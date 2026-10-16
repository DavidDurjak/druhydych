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
.fx-setup #mhint{color:var(--text);background:rgba(124,255,178,.08);border:1px solid rgba(124,255,178,.22);border-radius:12px;padding:9px 11px;line-height:1.45}
.fx-setup .card.pv{--mc:#7CFFB2;position:relative;overflow:hidden;border-radius:20px;padding-left:18px;background:linear-gradient(135deg,color-mix(in srgb,var(--mc) 10%,var(--card)),var(--card) 60%);border-color:color-mix(in srgb,var(--mc) 24%,var(--line))}
.fx-setup .card.pv::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--mc);box-shadow:0 0 14px var(--mc)}
.fx-setup .pv h3{display:flex;align-items:center;gap:10px}
.fx-setup .pv h3 .fx-ic{width:38px;height:38px;border-radius:12px;font-size:19px}
.fx-setup .pv h3 small{margin-left:auto;font-size:11px;font-weight:700;color:var(--mc);background:color-mix(in srgb,var(--mc) 14%,transparent);padding:3px 8px;border-radius:99px;white-space:nowrap}
.fx-setup .pvr b{color:var(--mc)}
.fx-setup,.fx-on{position:relative;isolation:isolate;overflow-x:clip}
.fx-setup::before,.fx-on::before{content:"";position:absolute;left:0;right:0;top:0;height:460px;z-index:-1;pointer-events:none;
  background:radial-gradient(55% 45% at 10% 0%,rgba(124,255,178,.17),transparent 72%),radial-gradient(50% 40% at 95% 8%,rgba(91,184,255,.15),transparent 72%)}
.fx-setup h1{font-size:34px;font-weight:800;letter-spacing:-.035em;margin-bottom:6px!important}
.fx-setup .field>span{display:block;font-size:15.5px;font-weight:700;color:var(--text);margin:26px 2px 12px;letter-spacing:-.01em}
.fx-setup #lvl{display:grid;gap:10px;margin:0}
.fx-setup #lvl button{display:grid;grid-template-columns:46px 1fr auto;align-items:center;gap:12px;padding:13px 14px;border-radius:20px;background:var(--card);border:1px solid var(--line);transition:transform .18s,box-shadow .25s,background .25s}
.fx-setup #lvl button:active,.fx-setup #dseg button:active,.fx-setup #eseg button:active,.fx-setup #mseg button:active{transform:scale(.97)}
.lv-ic{width:46px;height:46px;border-radius:15px;display:grid;place-items:center;font-size:23px;background:rgba(255,255,255,.06);transition:background .25s}
.lv-t{min-width:0}.lv-t b{display:block;font-size:15.5px}
.fx-setup #lvl .lv-t small{display:block;max-height:0;opacity:0;overflow:hidden;margin:0;transition:max-height .35s ease,opacity .25s,margin .25s}
.fx-setup #lvl button.on .lv-t small{max-height:90px;opacity:1;margin-top:4px}
.lv-bars{display:flex;gap:3px;align-items:flex-end;height:20px}
.lv-bars i{width:5px;border-radius:3px;background:rgba(255,255,255,.14)}
.lv-bars i:nth-child(1){height:7px}.lv-bars i:nth-child(2){height:11px}.lv-bars i:nth-child(3){height:15px}.lv-bars i:nth-child(4){height:20px}
.lv-bars i.on{background:linear-gradient(180deg,#7CFFB2,#5BB8FF)}
.fx-setup #lvl button.on,.fx-setup #eseg button.on,.fx-setup #mseg button.on{border:1.5px solid transparent;
  background:linear-gradient(135deg,#17262A,#161D29) padding-box,linear-gradient(135deg,#7CFFB2,#5BB8FF) border-box;box-shadow:0 12px 30px rgba(124,255,178,.14)}
.fx-setup #lvl button.on .lv-ic{background:linear-gradient(135deg,rgba(124,255,178,.32),rgba(91,184,255,.26))}
.fx-setup #dseg,.fx-setup #eseg,.fx-setup #mseg{background:none;border:0;padding:0;gap:10px}
.fx-setup #dseg button{flex:1;height:68px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;border-radius:20px;background:var(--card);border:1px solid var(--line);color:var(--muted);transition:transform .18s,background .25s,box-shadow .25s,color .2s}
.fx-setup #dseg button b{font-size:24px;line-height:1;letter-spacing:-.03em;color:var(--text)}
.fx-setup #dseg button small{font-size:11.5px;font-weight:600}
.fx-setup #dseg button.on{background:linear-gradient(145deg,#8DFFC0,#4FD8E0);border-color:transparent;color:#06301A;box-shadow:0 12px 26px rgba(124,255,178,.32);transform:translateY(-2px)}
.fx-setup #dseg button.on b{color:#04261A}
.fx-setup #eseg{display:grid;grid-template-columns:1fr 1fr}
.fx-setup #eseg button,.fx-setup #mseg button{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:4px;padding:16px 8px 14px;border-radius:20px;background:var(--card);border:1px solid var(--line);color:var(--text);text-align:center;transition:transform .18s,box-shadow .25s}
.fx-setup #eseg .eq-ic{font-size:30px;line-height:1;margin-bottom:4px;transition:transform .3s cubic-bezier(.3,1.6,.5,1)}
.fx-setup #eseg button.on .eq-ic{transform:scale(1.15) rotate(-6deg)}
.fx-setup #eseg b,.fx-setup #mseg b{font-size:14.5px;line-height:1.2}
.fx-setup #eseg small,.fx-setup #mseg small{font-size:11.5px;color:var(--muted);line-height:1.3}
.fx-setup #mseg{display:grid;grid-template-columns:repeat(3,1fr)}
.fx-setup #mseg button{padding:14px 6px 12px}
.fx-body{width:46px;height:78px;margin-bottom:6px;opacity:.6;transition:opacity .25s,transform .3s}
.fx-body *{fill:rgba(255,255,255,.13);transition:fill .3s}
.fx-body .hd{fill:rgba(255,255,255,.22)}
#mseg [data-k=balanced] .fx-body .u,#mseg [data-k=balanced] .fx-body .l{fill:#7CFFB2}
#mseg [data-k=upper] .fx-body .u{fill:#5BB8FF}
#mseg [data-k=lower] .fx-body .l{fill:#7CFFB2}
#mseg button.on .fx-body{opacity:1;transform:scale(1.06);filter:drop-shadow(0 0 10px rgba(124,255,178,.55));animation:fxBreath 2.4s ease-in-out infinite}
#mseg [data-k=upper].on .fx-body{filter:drop-shadow(0 0 10px rgba(91,184,255,.6))}
@keyframes fxBreath{50%{transform:scale(1.1)}}
.fx-setup #prio button{padding:9px 14px;border-radius:99px;background:var(--card);font-weight:600}
.fx-setup #prio button.on{background:linear-gradient(135deg,#8DFFC0,#4FD8E0);color:#06301A;border-color:transparent}
.fx-hide{display:none!important}
.fx-sum{position:relative;overflow:hidden;border-radius:26px;padding:18px 16px 16px;margin:22px 0 14px;border:1px solid rgba(124,255,178,.22);
  background:linear-gradient(145deg,#142A26 0%,#12202E 55%,#1B1830 100%);box-shadow:0 18px 40px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.08)}
.fx-sum>*:not(.fx-aur){position:relative}
.fx-sum h2{margin:10px 0 14px;font-size:21px;line-height:1.2;letter-spacing:-.02em}
.fx-week{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;text-align:center}
.fx-week .wd i{display:grid;place-items:center;width:38px;height:38px;margin:0 auto 5px;border-radius:50%;font-style:normal;font-size:17px;border:1.5px dashed rgba(255,255,255,.16)}
.fx-week .wd span{font-size:11px;font-weight:700;color:rgba(242,244,247,.55)}
.fx-week .wd.low i{background:rgba(124,255,178,.18);border:1.5px solid rgba(124,255,178,.7);box-shadow:0 0 14px rgba(124,255,178,.3)}
.fx-week .wd.up i{background:rgba(91,184,255,.18);border:1.5px solid rgba(91,184,255,.75);box-shadow:0 0 14px rgba(91,184,255,.3)}
.fx-week .wd.full i{background:rgba(255,138,76,.18);border:1.5px solid rgba(255,138,76,.75);box-shadow:0 0 14px rgba(255,138,76,.3)}
.fx-week .wd.low span,.fx-week .wd.up span,.fx-week .wd.full span{color:#fff}
.fx-week .wd i{animation:fxIn .45s cubic-bezier(.3,1.5,.5,1) both}
@keyframes fxIn{from{transform:scale(.4);opacity:0}}
.fx-sumst{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}
.fx-sumst div{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:9px 10px}
.fx-sumst b{display:block;font-size:18px;letter-spacing:-.02em}
.fx-sumst span{display:block;font-size:11px;color:rgba(242,244,247,.6);margin-top:2px;line-height:1.3}
.fx-sumnote{margin:12px 2px 0;font-size:12.5px;line-height:1.45;color:rgba(242,244,247,.72)}
.fx-setup #planPrev .plan-info{border-radius:20px}
.fx-setup .vrow i,.fx-on .vrow i{height:8px;border-radius:99px}
.fx-setup .vrow i b,.fx-on .vrow i b{border-radius:99px;background:linear-gradient(90deg,#7CFFB2,#5BB8FF)}
.fx-setup #save{position:sticky;bottom:calc(var(--nav-h) + env(safe-area-inset-bottom) + 16px);z-index:5;padding:17px;border-radius:20px;font-size:16px;font-weight:800;border:0;
  background:linear-gradient(135deg,#8DFFC0,#4FD8E0);color:#04261A;box-shadow:0 14px 34px rgba(124,255,178,.35),0 0 0 6px rgba(11,14,18,.55)}
.fx-blk{display:flex;gap:4px;margin:12px 0 2px}
.fx-blk i{flex:1;height:7px;border-radius:99px;background:rgba(255,255,255,.08)}
.fx-blk i.d{background:#7CFFB2}
.fx-blk i.c{background:linear-gradient(90deg,#7CFFB2,#5BB8FF);box-shadow:0 0 10px rgba(124,255,178,.6);animation:fxPulse 1.6s ease-in-out infinite}
@keyframes fxPulse{50%{opacity:.55}}
.fx-on .excue summary{display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border-radius:99px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.07);list-style:none;font-weight:600}
.fx-on .excue summary::-webkit-details-marker{display:none}
.fx-on .excue summary::before{content:"💡"}
.fx-on .excue[open] summary{background:color-mix(in srgb,var(--mc) 16%,transparent);color:var(--text)}
@media (prefers-reduced-motion:reduce){.fx-aur,.fx-fire,.fx-dots em{animation:none}.exdone .fx-ic span,.fx-on .set.done .chk{animation:none}.fx-ring .fg,.fx-bar i{transition:none}#mseg button.on .fx-body,.fx-blk i.c,.fx-week .wd i{animation:none}}
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
    const exm = $('.exm', card); if (exm) exm.innerHTML = exm.innerHTML.replace(/(\d)\.(\d)/g, '$1,$2');
  });
  const pi = $('.plan-info', scr), bm = pi?.querySelector('.row b')?.textContent.match(/týždeň (\d+) z (\d+)/);
  if (bm) pi.querySelector('.row').insertAdjacentHTML('afterend', `<div class="fx-blk">${Array.from({ length: Number(bm[2]) }, (_, i) => `<i class="${i < bm[1] - 1 ? 'd' : i === bm[1] - 1 ? 'c' : ''}"></i>`).join('')}</div>`);
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

// ---- nastavenie plánu: dlaždice, postava podľa dôrazu, živý súhrn týždňa ----
const setText = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };
const dayType = t => /^(Nohy|Dolná)/.test(t) ? 'low' : /^(Horná|Ramená|Tlaky|Ťahy)/.test(t) ? 'up' : 'full';
const TYPE_EMO = { low: '🦵', up: '💪', full: '🔥' };
const LV = { beginner: ['🌱', 1], intermediate: ['⚡', 2], advanced: ['🔥', 3], elite: ['👑', 4] };
const EQ = { gym: ['🏋️', 'Posilňovňa', 'Stroje, činky, kladky'], home: ['🏠', 'Doma', 'Jednoručky a lavica'] };
const EM = { balanced: ['Vyvážene', 'Celé telo'], upper: ['Horná časť', 'Hrudník, chrbát, ruky'], lower: ['Zadok a nohy', 'Spodok tela'] };
const BODY = '<svg class="fx-body" viewBox="0 0 60 100" aria-hidden="true"><circle class="hd" cx="30" cy="10" r="7"/><rect class="u" x="19" y="19" width="22" height="29" rx="8"/><rect class="u" x="9" y="21" width="8" height="27" rx="4"/><rect class="u" x="43" y="21" width="8" height="27" rx="4"/><rect class="l" x="19" y="45" width="22" height="14" rx="6"/><rect class="l" x="20" y="56" width="9" height="38" rx="4.5"/><rect class="l" x="31" y="56" width="9" height="38" rx="4.5"/></svg>';
const WEEK = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'];
const PATTERN = { 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5] };
const plural = (n, a, b) => `${n} ${n >= 5 ? b : a}`;
const once = (b, html) => { if (b.dataset.fx) return; b.dataset.fx = '1'; b.innerHTML = html; };
function setupFx() {
  const scr = $('#app .screen');
  if (!scr || !$('#mseg', scr) || !$('#planPrev', scr)) return;
  scr.classList.add('fx-setup');
  setText($('#dwrap', scr)?.previousElementSibling, 'Koľko dní v týždni chceš cvičiť?');
  setText($('#eseg', scr)?.previousElementSibling, 'Kde cvičíš?');
  setText($('#mseg', scr).previousElementSibling, 'Na čo dať dôraz?');
  $$('#lvl [data-k]', scr).forEach(b => { const [ic, n] = LV[b.dataset.k] || ['', 0]; once(b, `<span class="lv-ic">${ic}</span><span class="lv-t">${b.innerHTML}</span><span class="lv-bars">${[1, 2, 3, 4].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`); });
  $$('#dseg [data-k]', scr).forEach(b => { const n = Number(b.dataset.k); once(b, `<b>${n}</b><small>${n >= 5 ? 'dní' : 'dni'}</small>`); });
  $$('#eseg [data-k]', scr).forEach(b => { const e = EQ[b.dataset.k]; if (e) once(b, `<span class="eq-ic">${e[0]}</span><b>${e[1]}</b><small>${e[2]}</small>`); });
  $$('#mseg [data-k]', scr).forEach(b => { const e = EM[b.dataset.k]; if (e) once(b, `${BODY}<b>${e[0]}</b><small>${e[1]}</small>`); });
  const pp = $('#planPrev', scr);
  const cards = $$('.card.pv', pp);
  const names = cards.map(c => c.dataset.n || $('h3', c)?.textContent || ''), N = names.length;
  const pat = PATTERN[N] || PATTERN[3];
  cards.forEach((c, i) => {
    if (c.dataset.fx) return;
    const h3 = $('h3', c); if (!h3) return;
    c.dataset.fx = '1'; c.dataset.n = h3.textContent;
    const ty = dayType(h3.textContent);
    c.style.setProperty('--mc', ty === 'low' ? '#7CFFB2' : ty === 'up' ? '#5BB8FF' : '#FF8A4C');
    const n = $$('.pvr b', c).filter(b => !/min/.test(b.textContent)).length;
    h3.insertAdjacentHTML('afterbegin', `<span class="fx-ic"><span>${TYPE_EMO[ty]}</span></span>`);
    h3.insertAdjacentHTML('beforeend', `<small>${WEEK[pat[i]] || ''} · ${plural(n, 'cviky', 'cvikov')}</small>`);
  });
  const head = $('.plan-info', pp);
  if (head && !head.classList.contains('fx-hide') && !$('.fx-sum', pp)) {
    head.classList.add('fx-hide');
    const split = $('b', head)?.textContent || 'Tvoj plán';
    const weeks = (head.textContent.match(/(\d+) týžd/) || [])[1] || '';
    const spec = /špecializa/.test(head.textContent) ? ' Každý druhý blok je špecializačný na tvoje prioritné partie.' : '';
    let sets = 0; $$('.pvr b', pp).forEach(b => { const m = b.textContent.match(/^(\d+) ×/); if (m) sets += Number(m[1]); });
    const mins = Math.round(sets * 2.7 / Math.max(1, N) / 5) * 5;
    const byDay = {}; pat.forEach((d, i) => { byDay[d] = dayType(names[i] || ''); });
    const week = WEEK.map((d, i) => `<div class="wd ${byDay[i] || 'off'}"><i style="animation-delay:${i * 45}ms">${byDay[i] ? TYPE_EMO[byDay[i]] : ''}</i><span>${d}</span></div>`).join('');
    head.insertAdjacentHTML('beforebegin', `<div class="fx-sum"><div class="fx-aur"></div><span class="fx-kick">✨ Tvoj týždeň</span><h2></h2><div class="fx-week">${week}</div>
      <div class="fx-sumst"><div><b>${N}</b><span>${N >= 5 ? 'tréningov' : 'tréningy'} týždenne</span></div><div><b>~${mins}</b><span>minút na tréning</span></div><div><b>${weeks}</b><span>týždňov trvá blok</span></div></div>
      <p class="fx-sumnote">Dni sú len príklad, posuň si ich podľa seba. Dôležité je mať medzi tréningami rovnakých partií aspoň deň pauzu.${spec}</p></div>`);
    $('.fx-sum h2', pp).textContent = split;
  }
  const low = names.filter(t => dayType(t) === 'low').length, up = names.filter(t => dayType(t) === 'up').length;
  const emph = $('#mseg .on', scr)?.dataset.k || 'balanced';
  const full = !names.some(t => dayType(t) !== 'full');
  const hint = emph === 'lower'
    ? (full || low * 2 <= N ? 'Každý tréning je na celé telo, ale zadok a nohy majú najviac sérií. Pri tomto počte dní je celé telo najrýchlejšia cesta k výsledku.' : `${low} z ${N} tréningov týždenne je na zadok a nohy. Horná časť ostáva v menšom, aby chrbát a držanie tela ostali silné.`)
    : emph === 'upper'
      ? (full || up * 2 <= N ? 'Každý tréning je na celé telo, ale horná časť má najviac sérií. Pri tomto počte dní je celé telo najrýchlejšia cesta k výsledku.' : `${up} z ${N} tréningov týždenne je na hornú časť tela. Nohy ostávajú v menšom, aby nestratili silu.`)
      : 'Celé telo rovnomerne.';
  setText($('#mhint', scr), hint);
}

// ---- napojenie ----
function scan() {
  setupFx();
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
