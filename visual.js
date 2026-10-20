// Vzhľad spodných kariet na Dnes: nákupný zoznam, kamaráti, Objav v appke, tréning, váha, check-in a dni nad cieľom v týždennom páse.
// Len farby, svetlo a jemný pohyb cez transform a opacity (nič neprepočítava rozloženie). Ikonky kariet sa nahradia kreslenými SVG s malou animáciou.
const CSS = `
:root{--vz-blue:#5BB8FF;--vz-amber:#FFB547;--vz-violet:#B794FF;--vz-mint:#7CFFB2;--vz-rose:#FF6B8B}
html[data-theme=light]{--vz-blue:#1E78D6;--vz-amber:#C77700;--vz-violet:#7A4FD6;--vz-mint:#0FA46B;--vz-rose:#E5446A}

/* dni v tyzdni nad cielom: ruzovo-cervena v miatovom style appky */
.screen.td .wk-d.over .rg-fill{stroke:#FF6B8B}
.screen.td .wk-d.over .wk-r b{color:#FF9DB3}
.screen.td .wk-d.over .rg{filter:drop-shadow(0 0 4px rgba(255,92,122,.6))}
html[data-theme=light] .screen.td .wk-d.over .rg-fill{stroke:#E5446A}
html[data-theme=light] .screen.td .wk-d.over .wk-r b{color:#C42F55}
html[data-theme=light] .screen.td .wk-d.over .rg{filter:none}

/* ikonova dlazdica */
.vi{position:relative;display:grid;place-items:center;flex:0 0 auto;width:44px;height:44px;border-radius:15px;font-size:0;color:var(--c);background:color-mix(in srgb,var(--c) 16%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 30%,transparent),0 8px 18px -10px var(--c)}
.vi svg{width:26px;height:26px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;overflow:visible}
.vi svg *{transform-box:fill-box;transform-origin:center}
.v-lift{animation:vLift 2.6s ease-in-out infinite;will-change:transform}
.v-nd{transform-origin:50% 100%!important;animation:vNd 3.6s ease-in-out infinite;will-change:transform}
.v-pn{animation:vPn 2.2s ease-in-out infinite;will-change:transform}
.v-p1,.v-p2{animation:vBob 2.4s ease-in-out infinite;will-change:transform}.v-p2{animation-delay:-1.2s}
.v-ck{animation:vBlink 2.8s ease-in-out infinite}
.v-ht{animation:vBeat 1.7s ease-in-out infinite;will-change:transform}
.v-ring{animation:vSpin 7s linear infinite;will-change:transform}
@keyframes vLift{0%,100%{transform:translateY(1px) rotate(0)}50%{transform:translateY(-3px) rotate(-3deg)}}
@keyframes vNd{0%,100%{transform:rotate(-38deg)}50%{transform:rotate(38deg)}}
@keyframes vPn{0%,100%{transform:translate(0,0)}50%{transform:translate(-3px,1.5px)}}
@keyframes vBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-2.2px)}}
@keyframes vBlink{0%,100%{opacity:.35}50%{opacity:1}}
@keyframes vBeat{0%,40%,100%{transform:scale(1)}12%{transform:scale(1.14)}26%{transform:scale(.98)}}
@keyframes vSpin{to{transform:rotate(360deg)}}

/* karty: farebne svetlo, jemny tien, prechadzajuci lesk */
.screen.td .shop-card,.screen.td .fr-card{position:relative;overflow:hidden;border-radius:22px;padding:14px 14px 14px 14px;gap:13px;box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 14px 28px -20px rgba(0,0,0,.7)}
.screen.td .fr-card{border-color:color-mix(in srgb,var(--vz-mint) 30%,var(--line));background:radial-gradient(120% 140% at 0% 0%,color-mix(in srgb,var(--vz-mint) 16%,transparent),transparent 62%),linear-gradient(160deg,color-mix(in srgb,var(--vz-violet) 10%,var(--card)),var(--card) 70%)}
.screen.td .fr-card b,.screen.td .shop-card b{font-size:16px;letter-spacing:-.015em}
.screen.td .fr-card>span{display:grid;place-items:center;width:46px;height:46px;border-radius:15px;font-size:0}
.screen.td .fr-card>i,.screen.td .shop-card>i{display:grid;place-items:center;flex:0 0 auto;width:30px;height:30px;border-radius:50%;font-size:19px;line-height:1;color:var(--text);background:color-mix(in srgb,var(--text) 9%,transparent);animation:vNudge 3.2s ease-in-out infinite;will-change:transform}
@keyframes vNudge{0%,70%,100%{transform:translateX(0)}82%{transform:translateX(3px)}92%{transform:translateX(0)}}
.screen.td .fr-card::after,.screen.td .dc-t::after,.screen.td .ci::after{content:'';position:absolute;top:0;bottom:0;left:0;width:50%;pointer-events:none;background:linear-gradient(100deg,transparent,rgba(255,255,255,.10),transparent);transform:translateX(-140%) skewX(-18deg);animation:vSheen 9s ease-in-out infinite;will-change:transform}
.screen.td .dc-t:nth-child(2)::after{animation-delay:1.2s}.screen.td .dc-t:nth-child(3)::after{animation-delay:2.4s}.screen.td .ci::after{animation-delay:3.4s}.screen.td .fr-card::after{animation-delay:.8s}
@keyframes vSheen{0%,60%{transform:translateX(-140%) skewX(-18deg)}100%{transform:translateX(320%) skewX(-18deg)}}
html[data-theme=light] .screen.td .fr-card::after,html[data-theme=light] .screen.td .dc-t::after,html[data-theme=light] .screen.td .ci::after{background:linear-gradient(100deg,transparent,rgba(255,255,255,.75),transparent)}

/* Objav v appke */
.screen.td .dc-h h3{font-size:18px;font-weight:800;letter-spacing:-.025em}
.screen.td .dc-row{gap:12px}
.screen.td .dc-t{overflow:hidden;flex:0 0 172px;padding:14px 14px 15px;border-radius:22px;gap:4px;border-color:color-mix(in srgb,var(--c,var(--accent)) 28%,var(--line));background:radial-gradient(120% 90% at 100% 0%,color-mix(in srgb,var(--c,var(--accent)) 22%,transparent),transparent 62%),linear-gradient(165deg,var(--tint),var(--card) 68%);box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 16px 28px -22px var(--c,#000)}
.screen.td .dc-t .dc-i{margin-bottom:8px}
.screen.td .dc-t b{font-size:15.5px;letter-spacing:-.015em}
.screen.td .dc-t small{font-size:12.5px;line-height:1.35}

/* tréning a váha */
.screen.td .duo{gap:12px}
.screen.td .tile{position:relative;overflow:hidden;min-height:162px;border-radius:24px;padding:15px;gap:5px;border-color:color-mix(in srgb,var(--c) 26%,var(--line));background:linear-gradient(155deg,color-mix(in srgb,var(--c) 13%,var(--card)),var(--card) 66%);box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 16px 30px -22px var(--c)}
.screen.td .tile.tr{--c:var(--vz-mint)}.screen.td .tile.wg{--c:var(--vz-blue)}
.screen.td .tile::before{content:'';position:absolute;right:-34px;top:-34px;width:120px;height:120px;border-radius:50%;pointer-events:none;background:radial-gradient(circle,color-mix(in srgb,var(--c) 34%,transparent),transparent 70%);animation:vDrift 9s ease-in-out infinite alternate;will-change:transform}
@keyframes vDrift{to{transform:translate(-14px,10px) scale(1.18)}}
.screen.td .tile>*{position:relative}
.screen.td .tile .tile-ic{margin-bottom:4px}
.screen.td .tile h3{font-size:16px;letter-spacing:-.015em}
.screen.td .tile p b{font-size:24px;letter-spacing:-.03em}
.screen.td .dots5{gap:6px;margin:6px 0 2px}
.screen.td .dots5 i{border-radius:9px}
.screen.td .dots5 i.on{box-shadow:0 0 12px color-mix(in srgb,var(--vz-mint) 70%,transparent)}
.screen.td .spark-l{filter:drop-shadow(0 0 4px color-mix(in srgb,var(--vz-blue) 60%,transparent));stroke:var(--vz-blue)}
.screen.td .spark-a{fill:color-mix(in srgb,var(--vz-blue) 14%,transparent)}
.screen.td .spark-d{fill:var(--vz-blue);transform-box:fill-box;transform-origin:center;animation:vDot 2.4s ease-in-out infinite}
@keyframes vDot{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.7);opacity:.55}}

/* denny check-in */
.screen.td .ci{position:relative;overflow:hidden;border-radius:24px;padding:15px;gap:14px;border-color:color-mix(in srgb,var(--vz-violet) 28%,var(--line));background:radial-gradient(110% 130% at 100% 0%,color-mix(in srgb,var(--vz-violet) 18%,transparent),transparent 60%),linear-gradient(160deg,color-mix(in srgb,var(--vz-violet) 9%,var(--card)),var(--card) 70%)}
.screen.td .ci h3{font-size:16px;letter-spacing:-.015em}
.screen.td .ci .ci-i{width:46px;height:46px;border-radius:15px;background:color-mix(in srgb,var(--vz-violet) 16%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--vz-violet) 30%,transparent)}
.screen.td .ci-go{padding:9px 15px;border-radius:99px;background:var(--accent);color:var(--accent-ink);box-shadow:0 8px 18px -8px var(--accent)}
.screen.td .tile:active,.screen.td .dc-t:active,.screen.td .fr-card:active,.screen.td .shop-card:active,.screen.td .ci:active{transform:scale(.975)}

@media (prefers-reduced-motion:reduce){.v-lift,.v-nd,.v-pn,.v-p1,.v-p2,.v-ck,.v-ht,.v-ring,.screen.td .fr-card>i,.screen.td .shop-card>i,.screen.td .fr-card::after,.screen.td .dc-t::after,.screen.td .ci::after,.screen.td .tile::before,.screen.td .spark-d{animation:none}}
`;
if (!document.getElementById('vz-css')) { const el = document.createElement('style'); el.id = 'vz-css'; el.textContent = CSS; document.head.appendChild(el); }

const ICONS = {
  lift: ['--vz-mint', '<g class="v-lift"><path d="M7 8v8M17 8v8M4 10v4M20 10v4M7 12h10"/></g>'],
  scale: ['--vz-blue', '<rect x="4" y="5" width="16" height="15" rx="4"/><path d="M8.2 10.4a5 5 0 0 1 7.6 0"/><path class="v-nd" d="M12 13V9.4"/>'],
  note: ['--vz-violet', '<rect x="5" y="4" width="14" height="17" rx="3"/><path d="M9 9h6M9 13h3.5"/><g class="v-pn"><path d="M14.6 17.4l4-4 1.6 1.6-4 4-2.2.6z"/></g>'],
  friends: ['--vz-mint', '<g class="v-p1"><circle cx="9" cy="8.6" r="3"/><path d="M3.5 19c0-3 2.4-5 5.5-5s5.5 2 5.5 5"/></g><g class="v-p2"><circle cx="17.2" cy="9.6" r="2.4"/><path d="M15.8 14.2c2.7-.5 4.9 1.1 4.9 4.2"/></g>'],
  plan: ['--vz-mint', '<rect x="4" y="5.5" width="16" height="14.5" rx="3"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/><path class="v-ck" d="M9 15l2 2 4-4"/>'],
  habits: ['--vz-amber', '<circle class="v-ring" cx="12" cy="12" r="8.5" stroke-dasharray="3.4 3.4"/><path d="M8.5 12.4l2.5 2.5 4.5-5"/>'],
  heart: ['--vz-rose', '<g class="v-ht"><path d="M12 20s-7.2-4.5-7.2-10.2A4.1 4.1 0 0 1 12 7.4a4.1 4.1 0 0 1 7.2 2.4C19.2 15.5 12 20 12 20z"/></g>'],
};
function put(el, key) {
  if (!el || el.dataset.vz) return;
  const [c, svg] = ICONS[key];
  el.dataset.vz = '1'; el.classList.add('vi'); el.style.setProperty('--c', `var(${c})`);
  el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${svg}</svg>`;
}
const root = document.getElementById('app');
let raf = 0;
function scan() {
  raf = 0;
  if (!root) return;
  const td = root.querySelector('.screen.td'); if (!td) return;
  put(td.querySelector('.tile.tr .tile-ic'), 'lift');
  put(td.querySelector('.tile.wg .tile-ic'), 'scale');
  const ci = td.querySelector('.ci .ci-i'); if (ci && ci.textContent.trim() === '📝') put(ci, 'note');
  put(td.querySelector('.fr-card > span'), 'friends');
  put(td.querySelector('.dc-t[data-k=plan] .dc-i'), 'plan');
  put(td.querySelector('.dc-t[data-k=habits] .dc-i'), 'habits');
  put(td.querySelector('.dc-t[data-k=diet] .dc-i'), 'heart');
  td.querySelectorAll('.dc-t').forEach(t => { const c = { plan: '--vz-mint', habits: '--vz-amber', diet: '--vz-rose' }[t.dataset.k]; if (c && !t.style.getPropertyValue('--c')) t.style.setProperty('--c', `var(${c})`); });
}
if (root) new MutationObserver(() => { if (!raf) raf = requestAnimationFrame(scan); }).observe(root, { childList: true, subtree: true });
scan();
