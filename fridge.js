// Čo uvarím z chladničky: odfotíš chladničku (aj mrazák a špajzu, max 3 fotky), AI nájde suroviny, ty ich jedným ťukom opravíš
// a dostaneš recepty presne na svoj cieľ a na to, čo ti dnes ešte zostáva (porcia je prepočítaná na tvoje kalórie).
// Recept zapíšeš jedným ťukom, naplánuješ na zajtra, chýbajúce suroviny pošleš do nákupného zoznamu a obľúbené si uložíš.
// Navyše: čo treba minúť skôr (recepty ich použijú prednostne), čo mám doma vždy (soľ, olej, ryža...), tip čo dokúpiť pre cieľ.
// Vstupy: karta na obrazovke Jedlo, riadok v plusovom menu, odkaz #/chladnicka. Fotky sa nikam neukladajú.
import * as db from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';
import { currentLang } from './i18n.js';
import * as dx from './dxcore.js';
import { DIETS } from './dietcore.js';
import { addExtras } from './shopping.js';

const CSS = `
.frg{position:fixed;inset:0;z-index:60;background:var(--bg);color:var(--text);overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;
  padding:calc(env(safe-area-inset-top) + 10px) 16px calc(env(safe-area-inset-bottom) + 110px);animation:frgIn .32s cubic-bezier(.2,.9,.3,1)}
@keyframes frgIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
body:has(.frg){overflow:hidden}
body:has(.frg) .qa-fab,body:has(.frg) .bd-fab,body:has(.frg) .nav{display:none!important}
.frg-w{max-width:560px;margin:0 auto}
.frg-top{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:44px}
.frg-top b{font-size:15px;color:var(--muted);font-weight:600}
.frg-ib{flex:none;width:40px;height:40px;border-radius:50%;border:1px solid var(--line);background:var(--card);color:var(--text);font:inherit;font-size:22px;line-height:1;display:grid;place-items:center;cursor:pointer;-webkit-appearance:none;appearance:none}
.frg-ib:active{transform:scale(.92)}
.frg h1{font-size:30px;line-height:1.08;letter-spacing:-.03em;margin:14px 0 8px}
.frg h2{font-size:23px;line-height:1.15;letter-spacing:-.02em;margin:8px 0 6px}
.frg-lead{font-size:15px;line-height:1.45;color:var(--muted);margin:0 0 18px;max-width:34em}
.frg-sec{font-size:13px;font-weight:700;color:var(--muted);margin:22px 2px 10px}
.frg-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:54px;border-radius:18px;border:0;font:inherit;font-size:16px;font-weight:700;cursor:pointer;
  background:var(--accent);color:var(--accent-ink,#06130C);-webkit-appearance:none;appearance:none;transition:transform .12s,opacity .2s}
.frg-btn:active{transform:scale(.985)}
.frg-btn[disabled]{opacity:.45;pointer-events:none}
.frg-btn.gh{background:var(--card);color:var(--text);border:1px solid var(--line)}
.frg-btn svg{width:20px;height:20px}
.frg-row{display:flex;gap:10px;margin-top:10px}
.frg-row>*{flex:1}
.frg-link{display:block;width:100%;background:none;border:0;color:var(--muted);font:inherit;font-size:14px;font-weight:600;padding:14px 0 4px;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
/* chladnička na úvode: dvere sa otvoria a zvnútra zasvieti studené svetlo */
.frg-hero{position:relative;height:210px;display:grid;place-items:center;margin:4px 0 0}
.frg-hero::before{content:'';position:absolute;width:260px;height:200px;border-radius:50%;background:radial-gradient(closest-side,rgba(150,225,255,.30),transparent);opacity:0;animation:frgGlow 1.4s ease .55s forwards}
@keyframes frgGlow{to{opacity:1}}
.frg-fr{position:relative;width:132px;height:188px;perspective:600px}
.frg-body{position:absolute;inset:0;border-radius:20px;background:linear-gradient(180deg,#2B3440,#1C232C);box-shadow:inset 0 0 0 2px rgba(255,255,255,.08),0 18px 40px rgba(0,0,0,.45);overflow:hidden}
.frg-inner{position:absolute;inset:9px;border-radius:13px;background:linear-gradient(180deg,#EAF8FF,#C9E7F5);display:grid;grid-template-rows:repeat(3,1fr);padding:6px 7px 4px;gap:4px}
.frg-shelf{position:relative;display:flex;align-items:flex-end;gap:5px;border-bottom:3px solid rgba(90,140,170,.35);padding:0 2px 2px}
.frg-f{display:block;border-radius:6px}
.frg-door{position:absolute;inset:0;border-radius:20px;transform-origin:0 50%;background:linear-gradient(160deg,#3A4552,#252D37);box-shadow:inset 0 0 0 2px rgba(255,255,255,.1);
  animation:frgOpen 1.1s cubic-bezier(.5,.05,.25,1) .35s forwards;backface-visibility:hidden}
.frg-door::after{content:'';position:absolute;right:12px;top:30px;width:5px;height:46px;border-radius:3px;background:rgba(255,255,255,.35)}
@keyframes frgOpen{to{transform:rotateY(-112deg)}}
.frg-hero .frg-spark{position:absolute;font-size:22px;opacity:0;animation:frgPop .5s cubic-bezier(.3,1.6,.5,1) forwards}
@keyframes frgPop{from{opacity:0;transform:scale(.3) translateY(10px)}to{opacity:1;transform:none}}
.frg-ph{display:flex;gap:10px;margin:0 0 14px;overflow-x:auto;padding:2px}
.frg-th{position:relative;flex:none;width:92px;height:122px;border-radius:16px;overflow:hidden;border:1px solid var(--line);background:var(--card)}
.frg-th img{width:100%;height:100%;object-fit:cover;display:block}
.frg-th button{position:absolute;top:6px;right:6px;width:26px;height:26px;border-radius:50%;border:0;background:rgba(0,0,0,.6);color:#fff;font-size:16px;line-height:1;cursor:pointer}
.frg-add{flex:none;width:92px;height:122px;border-radius:16px;border:1.5px dashed var(--line);display:grid;place-items:center;text-align:center;color:var(--muted);font-size:12px;font-weight:600;padding:8px;cursor:pointer;line-height:1.3}
.frg-add span{display:block;font-size:24px;margin-bottom:4px;color:var(--text)}
.frg-tips{display:grid;gap:8px;margin:18px 0 0}
.frg-tip{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;line-height:1.4;color:var(--muted)}
.frg-tip i{flex:none;font-style:normal;width:28px;height:28px;border-radius:9px;display:grid;place-items:center;background:var(--card);border:1px solid var(--line);font-size:14px}
.frg-card{display:flex;align-items:center;gap:12px;width:100%;padding:13px 14px;border-radius:18px;border:1px solid var(--line);background:var(--card);color:var(--text);font:inherit;text-align:left;cursor:pointer;margin:0 0 8px;-webkit-appearance:none;appearance:none}
.frg-card:active{transform:scale(.99)}
.frg-card>span{flex:none;font-size:24px;width:40px;text-align:center}
.frg-card div{flex:1;min-width:0}
.frg-card b{display:block;font-size:15px;line-height:1.3}
.frg-card small{display:block;font-size:12.5px;color:var(--muted);margin-top:2px}
.frg-card em{flex:none;font-style:normal;color:var(--muted);font-size:20px}
/* skenovanie */
.frg-scan{display:grid;justify-items:center;text-align:center;padding-top:24px}
.frg-stack{position:relative;width:min(250px,66vw);aspect-ratio:3/4;margin-bottom:22px}
.frg-stack img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:22px;border:1px solid var(--line);box-shadow:0 18px 40px rgba(0,0,0,.4)}
.frg-stack img:nth-child(2){transform:rotate(-5deg) translate(-10px,6px);opacity:.75}
.frg-stack img:nth-child(3){transform:rotate(5deg) translate(10px,8px);opacity:.6}
.frg-stack img:last-of-type{z-index:2}
.frg-beam{position:absolute;z-index:3;inset:0;border-radius:22px;overflow:hidden;pointer-events:none}
.frg-beam::before{content:'';position:absolute;left:-10%;right:-10%;height:30%;top:-30%;background:linear-gradient(180deg,transparent,rgba(150,225,255,.55),transparent);animation:frgBeam 1.7s ease-in-out infinite}
@keyframes frgBeam{to{top:100%}}
.frg-st{font-size:17px;font-weight:700;margin:0;min-height:24px}
.frg-st2{font-size:14px;color:var(--muted);margin:6px 0 0;min-height:20px}
.frg-dots{display:flex;gap:6px;margin-top:16px}.frg-dots i{width:7px;height:7px;border-radius:50%;background:var(--accent);animation:frgDot 1.2s ease-in-out infinite}
.frg-dots i:nth-child(2){animation-delay:.15s}.frg-dots i:nth-child(3){animation-delay:.3s}
@keyframes frgDot{0%,100%{opacity:.25;transform:scale(.8)}50%{opacity:1;transform:none}}
/* suroviny */
.frg-mode{display:flex;gap:6px;padding:4px;border-radius:14px;background:var(--card);border:1px solid var(--line);margin:4px 0 6px}
.frg-mode button{flex:1;border:0;background:none;color:var(--muted);font:inherit;font-size:13.5px;font-weight:700;padding:9px 6px;border-radius:10px;cursor:pointer}
.frg-mode button.on{background:var(--bg-2,var(--bg));color:var(--text);box-shadow:0 1px 0 rgba(255,255,255,.06),0 2px 8px rgba(0,0,0,.2)}
.frg-hint{font-size:12.5px;color:var(--muted);margin:6px 2px 0;min-height:18px}
.frg-g{font-size:12.5px;font-weight:700;color:var(--muted);margin:16px 2px 8px}
.frg-chips{display:flex;flex-wrap:wrap;gap:8px}
.frg-chip{display:inline-flex;align-items:center;gap:7px;max-width:100%;padding:8px 12px 8px 10px;border-radius:99px;border:1.5px solid var(--line);background:var(--card);color:var(--text);font:inherit;font-size:14px;font-weight:600;cursor:pointer;-webkit-appearance:none;appearance:none;
  transition:background .15s,border-color .15s,opacity .15s;animation:frgChip .35s cubic-bezier(.3,1.5,.5,1) both}
@keyframes frgChip{from{opacity:0;transform:scale(.7)}to{opacity:1;transform:none}}
.frg-chip i{font-style:normal;font-size:16px}
.frg-chip small{font-weight:500;color:var(--muted);font-size:12px}
.frg-chip.on{border-color:color-mix(in srgb,var(--accent) 55%,var(--line));background:color-mix(in srgb,var(--accent) 10%,var(--card))}
.frg-chip.off{opacity:.45;text-decoration:line-through}
.frg-chip.st.off{opacity:.6;text-decoration:none;font-weight:500}
.frg-chip.low{border-style:dashed}
.frg-chip.first{border-color:#FFB547;background:color-mix(in srgb,#FFB547 16%,var(--card))}
.frg-chip.first::after{content:'⏳';font-size:13px}
.frg-addrow{display:flex;gap:8px;margin-top:12px}
.frg-in{flex:1;min-width:0;height:46px;border-radius:14px;border:1px solid var(--line);background:var(--card);color:var(--text);font:inherit;font-size:15px;padding:0 14px}
.frg-in:focus{outline:2px solid color-mix(in srgb,var(--accent) 60%,transparent);outline-offset:1px}
.frg-addrow button{flex:none;width:46px;height:46px;border-radius:14px;border:0;background:var(--accent);color:var(--accent-ink,#06130C);font-size:22px;font-weight:700;cursor:pointer}
.frg-buy{margin-top:22px;padding:14px;border-radius:20px;border:1px solid color-mix(in srgb,var(--accent) 30%,var(--line));background:linear-gradient(160deg,color-mix(in srgb,var(--accent) 9%,transparent),var(--card) 60%)}
.frg-buy h3{margin:0 0 2px;font-size:15px}
.frg-buy>p{margin:0 0 10px;font-size:12.5px;color:var(--muted)}
.frg-bi{display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--line)}
.frg-bi div{flex:1;min-width:0}.frg-bi b{display:block;font-size:14px}.frg-bi small{display:block;font-size:12px;color:var(--muted)}
.frg-bi button{flex:none;border:1px solid var(--line);background:var(--bg-2,var(--bg));color:var(--text);border-radius:99px;padding:7px 12px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer}
.frg-bi button.done{background:var(--accent);color:var(--accent-ink,#06130C);border-color:var(--accent)}
.frg-seg{display:flex;gap:6px;flex-wrap:wrap}
.frg-seg button{border:1px solid var(--line);background:var(--card);color:var(--text);border-radius:99px;padding:9px 14px;font:inherit;font-size:14px;font-weight:600;cursor:pointer}
.frg-seg button.on{background:var(--accent);color:var(--accent-ink,#06130C);border-color:var(--accent)}
.frg-foot{position:fixed;left:0;right:0;bottom:0;z-index:61;padding:14px 16px calc(env(safe-area-inset-bottom) + 14px);background:linear-gradient(180deg,transparent,var(--bg) 38%)}
.frg-foot .frg-btn{max-width:560px;margin:0 auto}
/* recepty */
.frg-bud{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 16px}
.frg-bud span{font-size:12.5px;color:var(--muted);padding:6px 10px;border-radius:99px;background:var(--card);border:1px solid var(--line)}
.frg-bud b{color:var(--text);font-variant-numeric:tabular-nums}
.frg-rc{position:relative;display:block;width:100%;text-align:left;padding:16px;border-radius:22px;border:1px solid var(--line);background:var(--card);color:var(--text);font:inherit;cursor:pointer;margin:0 0 10px;-webkit-appearance:none;appearance:none;animation:frgUp .4s cubic-bezier(.2,.9,.3,1) both}
@keyframes frgUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.frg-rc:active{transform:scale(.99)}
.frg-rc.best{border:1.5px solid color-mix(in srgb,var(--accent) 60%,var(--line));background:radial-gradient(120% 120% at 0% 0%,color-mix(in srgb,var(--accent) 15%,transparent),transparent 60%),var(--card)}
.frg-tag{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:var(--accent);margin-bottom:8px}
.frg-rh{display:flex;gap:12px;align-items:flex-start}
.frg-em{flex:none;width:52px;height:52px;border-radius:16px;display:grid;place-items:center;font-size:30px;background:var(--bg-2,var(--bg));border:1px solid var(--line)}
.frg-rh h3{margin:0;font-size:17px;line-height:1.25;letter-spacing:-.01em}
.frg-rh p{margin:3px 0 0;font-size:13px;color:var(--muted);line-height:1.35}
.frg-nums{display:flex;align-items:baseline;gap:14px;margin-top:12px;flex-wrap:wrap}
.frg-nums b{font-size:24px;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.frg-nums b small{font-size:12px;font-weight:600;color:var(--muted);margin-left:3px;letter-spacing:0}
.frg-nums span{font-size:13px;color:var(--muted);font-variant-numeric:tabular-nums}
.frg-nums span i{font-style:normal;color:var(--text);font-weight:700}
.frg-fit{height:6px;border-radius:3px;background:var(--track,rgba(255,255,255,.08));margin-top:10px;overflow:hidden}
.frg-fit i{display:block;height:100%;border-radius:3px}
.frg-bd{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
.frg-bd span{font-size:12px;font-weight:600;padding:4px 9px;border-radius:99px;background:var(--bg-2,var(--bg));border:1px solid var(--line);color:var(--muted)}
.frg-bd span.ok{color:var(--accent);border-color:color-mix(in srgb,var(--accent) 40%,var(--line))}
.frg-bd span.miss{color:#FFB547;border-color:color-mix(in srgb,#FFB547 40%,var(--line))}
/* detail */
.frg-dh{display:flex;gap:14px;align-items:center;margin:6px 0 4px}
.frg-dh .frg-em{width:64px;height:64px;font-size:38px;border-radius:20px}
.frg-dh h2{margin:0}
.frg-mac{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:16px 0 8px}
.frg-mac div{border-radius:16px;padding:10px 6px;text-align:center;background:var(--card);border:1px solid var(--line)}
.frg-mac b{display:block;font-size:19px;font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.frg-mac small{display:block;font-size:11px;color:var(--muted);margin-top:2px}
.frg-mac div:nth-child(2) b{color:#7CFFB2}.frg-mac div:nth-child(3) b{color:#5BB8FF}.frg-mac div:nth-child(4) b{color:#FFC857}
html[data-theme=light] .frg-mac div:nth-child(2) b{color:#0E9F5B}html[data-theme=light] .frg-mac div:nth-child(3) b{color:#1F7FD1}html[data-theme=light] .frg-mac div:nth-child(4) b{color:#B7791F}
.frg-after{font-size:13.5px;line-height:1.45;color:var(--muted);margin:4px 2px 0}
.frg-after b{color:var(--text)}
.frg-serv{display:flex;align-items:center;justify-content:space-between;margin:18px 0 0;padding:10px 12px;border-radius:16px;background:var(--card);border:1px solid var(--line)}
.frg-serv span{font-size:14px;font-weight:600}
.frg-serv div{display:flex;align-items:center;gap:12px}
.frg-serv button{width:34px;height:34px;border-radius:50%;border:1px solid var(--line);background:var(--bg-2,var(--bg));color:var(--text);font-size:18px;font-weight:700;cursor:pointer}
.frg-serv b{min-width:20px;text-align:center;font-size:16px;font-variant-numeric:tabular-nums}
.frg-ing{list-style:none;margin:0;padding:0}
.frg-ing li{display:flex;align-items:center;gap:10px;padding:10px 2px;border-bottom:1px solid var(--line);font-size:15px}
.frg-ing li:last-child{border-bottom:0}
.frg-ing li i{flex:none;width:22px;height:22px;border-radius:7px;display:grid;place-items:center;font-style:normal;font-size:12px;font-weight:800}
.frg-ing li i.y{background:color-mix(in srgb,var(--accent) 18%,transparent);color:var(--accent)}
.frg-ing li i.n{background:color-mix(in srgb,#FFB547 18%,transparent);color:#FFB547}
.frg-ing li span{flex:1;min-width:0}
.frg-ing li em{font-style:normal;color:var(--muted);font-size:14px;font-variant-numeric:tabular-nums}
.frg-steps{list-style:none;margin:0;padding:0;counter-reset:s}
.frg-steps li{position:relative;padding:10px 0 10px 42px;font-size:15px;line-height:1.45;cursor:pointer;counter-increment:s;transition:opacity .2s}
.frg-steps li::before{content:counter(s);position:absolute;left:0;top:9px;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-size:13px;font-weight:800;background:var(--card);border:1px solid var(--line)}
.frg-steps li.done{opacity:.45;text-decoration:line-through}
.frg-steps li.done::before{content:'✓';background:var(--accent);color:var(--accent-ink,#06130C);border-color:var(--accent)}
.frg-tipc{display:flex;gap:10px;margin-top:16px;padding:12px 14px;border-radius:16px;background:color-mix(in srgb,var(--accent) 8%,var(--card));border:1px solid color-mix(in srgb,var(--accent) 25%,var(--line));font-size:14px;line-height:1.45}
.frg-dfoot{position:fixed;left:0;right:0;bottom:0;z-index:61;padding:12px 16px calc(env(safe-area-inset-bottom) + 12px);background:linear-gradient(180deg,transparent,var(--bg) 30%)}
.frg-dfoot>div{max-width:560px;margin:0 auto}
.frg-err{text-align:center;padding:40px 6px}
.frg-err b{display:block;font-size:19px;margin-bottom:8px}
.frg-err p{color:var(--muted);font-size:14.5px;line-height:1.45;margin:0 0 20px}
.frg-note{font-size:12px;color:var(--muted);line-height:1.45;margin:16px 2px 0}
/* vstupy */
.frg-entry{display:flex;align-items:center;gap:12px;width:100%;margin:0 0 14px;padding:12px 14px;border-radius:18px;border:1px solid color-mix(in srgb,#8FDcff 30%,var(--line));
  background:linear-gradient(160deg,rgba(143,220,255,.12),var(--card) 62%);color:var(--text);text-align:left;font:inherit;cursor:pointer;-webkit-appearance:none;appearance:none}
.frg-entry:active{transform:scale(.985)}
.frg-entry>i{flex:none;width:44px;height:44px;border-radius:14px;display:grid;place-items:center;font-style:normal;font-size:24px;background:color-mix(in srgb,#8FDcff 16%,var(--bg-2,var(--bg)))}
.frg-entry b{display:block;font-size:15px;letter-spacing:-.01em}
.frg-entry span{display:block;font-size:12.5px;color:var(--muted);margin-top:2px;line-height:1.35}
.frg-entry em{margin-left:auto;flex:none;font-style:normal;font-size:11px;font-weight:700;padding:3px 8px;border-radius:99px;color:#8FDcff;background:rgba(143,220,255,.14)}
html[data-theme=light] .frg-entry em{color:#1F7FB0;background:rgba(31,127,176,.12)}
.frg-qa{display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;border-radius:18px;border:1px solid var(--line);background:var(--card);color:var(--text);font:inherit;text-align:left;cursor:pointer;margin:8px 0 0;-webkit-appearance:none;appearance:none}
.frg-qa>i{font-style:normal;font-size:24px}
.frg-qa b{display:block;font-size:15px}.frg-qa small{display:block;font-size:12px;color:var(--muted)}
@media (prefers-reduced-motion:reduce){.frg,.frg-door,.frg-hero::before,.frg-chip,.frg-rc,.frg-hero .frg-spark{animation:none!important}.frg-door{transform:rotateY(-112deg)}.frg-hero::before,.frg-hero .frg-spark{opacity:1}.frg-beam::before{animation:none;top:35%}}
`;
if (!document.getElementById('frg-css')) { const s = document.createElement('style'); s.id = 'frg-css'; s.textContent = CSS; document.head.appendChild(s); }

// ---------- pomocné ----------
const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const r0 = v => Math.round(Number(v) || 0);
const nf = v => r0(v).toLocaleString('sk-SK');
const cap = s => { s = String(s || '').trim(); return s.charAt(0).toUpperCase() + s.slice(1); };
const key = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const track = (n, p) => { try { window.fwTrack && window.fwTrack(n, p || {}); } catch (_) { } };
const ls = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch (_) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { } },
};
const K_STAPLES = 'fw_frg_staples', K_LAST = 'fw_frg_last', K_SAVED = 'fw_frg_saved', K_OPTS = 'fw_frg_opts';
const STAPLES = ['soľ', 'korenie', 'olej', 'cesnak', 'cibuľa', 'ryža', 'cestoviny', 'múka', 'ovsené vločky', 'med', 'sójová omáčka', 'paradajkový pretlak', 'strukoviny v konzerve', 'koreniny a bylinky'];
const STAPLES_ON = ['soľ', 'korenie', 'olej'];
const CATS = [['protein', '🥩', 'Mäso, ryby a vajcia'], ['dairy', '🥛', 'Mliečne'], ['veg', '🥬', 'Zelenina'], ['fruit', '🍎', 'Ovocie'], ['carb', '🍞', 'Prílohy a pečivo'], ['fat', '🥑', 'Tuky a orechy'], ['sauce', '🫙', 'Omáčky a dochucovadlá'], ['snack', '🍫', 'Sladké a slané'], ['drink', '🧃', 'Nápoje'], ['other', '🛒', 'Ostatné']];
const MEALS = [['breakfast', 'Raňajky'], ['lunch', 'Obed'], ['dinner', 'Večera'], ['snack', 'Snack']];
const TAGS = { high_protein: '💪 Veľa bielkovín', quick: '⚡ Rýchle', low_cal: '🪶 Ľahké', vegetarian: '🥕 Bez mäsa', one_pan: '🍳 Jedna panvica', meal_prep: '📦 Aj na zajtra', no_cook: '❄️ Bez varenia' };
const GOOD = 'var(--accent)', MID = '#FFB547', OVER = '#FF7A6B';
const CAM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';

function shrink(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const k = Math.min(1, 1100 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      const d = c.toDataURL('image/jpeg', 0.74);
      res({ b64: d.split(',')[1], url: d });
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Fotku sa nepodarilo načítať.')); };
    img.src = url;
  });
}
const autoMeal = () => { const hr = new Date().getHours(); return hr < 10 ? 'breakfast' : hr < 15 ? 'lunch' : hr < 17 ? 'snack' : 'dinner'; };

// koľko kalórií a bielkovín patrí do jednej porcie tohto jedla (zo zvyšku dňa a cieľa)
async function budget(meal) {
  const p = ctx.state?.profile || {}, date = ctx.state?.date || calc.today();
  let eaten = { kcal: 0, protein: 0 };
  try { const rows = await db.listFood(p.id, date); eaten = (rows || []).reduce((a, f) => ({ kcal: a.kcal + Number(f.kcal || 0), protein: a.protein + Number(f.protein || 0) }), eaten); } catch (_) { }
  const tk = Number(p.target_kcal) || 2000, tp = Number(p.target_protein) || 120;
  const left = tk - eaten.kcal, leftP = Math.max(0, tp - eaten.protein);
  const share = { breakfast: 0.27, lunch: 0.35, dinner: 0.3, snack: 0.12 }[meal] || 0.3;
  const hr = new Date().getHours(), mealsLeft = hr < 11 ? 3 : hr < 15 ? 2.2 : hr < 19 ? 1.5 : 1;
  let kcal = tk * share;
  if (date === calc.today() && left > 0) kcal = Math.min(Math.max(kcal, (left / mealsLeft) * 0.9), left);
  if (date === calc.today() && left <= 200) kcal = Math.min(kcal, meal === 'snack' ? 200 : 350);
  kcal = Math.max(meal === 'snack' ? 150 : 300, Math.min(1200, Math.round(kcal / 10) * 10));
  const protein = Math.max(meal === 'snack' ? 10 : 25, Math.min(70, Math.round(Math.max(tp * share, Math.min(leftP, leftP / mealsLeft * 1.1)))));
  return { kcal, protein, left, leftP, goal: p.goal || 'maintain' };
}
function dietText() {
  try {
    const c = dx.cfg() || {}, out = [];
    (c.diets || []).forEach(k => DIETS[k] && out.push(`${DIETS[k].title}: ${DIETS[k].sub}`));
    if ((c.modes || []).includes('celiac')) out.push('bez lepku (celiakia)');
    if ((c.modes || []).includes('lactose')) out.push('bez laktózy');
    if ((c.modes || []).includes('allergy') && (c.allergens || []).length) out.push('alergény, ktoré nesmie obsahovať: ' + c.allergens.join(', '));
    return out.join('; ');
  } catch (_) { return ''; }
}
async function api(body) {
  const { data, error } = await db.sb.functions.invoke('fridge-scan', { body: { ...body, lang: currentLang(), goal: ctx.state?.profile?.goal || 'maintain' } });
  if (error) {
    let msg = error.message;
    try { const j = await error.context.json(); if (j?.error) msg = j.error; } catch (_) { }
    throw new Error(/failed to send|fetch|network|load failed/i.test(msg) ? 'Bez internetu. Skús to, keď sa pripojíš.' : msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

// ---------- stav ----------
let S = null, root = null;
const fresh = () => ({ pre: null, det: null, photos: [], items: [], shop: [], mode: 'edit', opts: { meal: autoMeal(), minutes: 30, servings: 1, wish: '', ...ls.get(K_OPTS, {}), meal: autoMeal() }, recipes: [], seen: [], b: null, view: 'start' });
const staples = () => ls.get(K_STAPLES, STAPLES_ON);

export function openFridge(opts = {}) {
  if (!ctx.state?.profile) return;
  close();
  S = fresh();
  root = document.createElement('div'); root.className = 'frg'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Čo uvarím z chladničky');
  document.body.appendChild(root);
  track('frg_open', { from: opts.from || '' });
  if (opts.manual) { S.view = 'items'; vItems(); } else vStart();
}
function close() { document.querySelectorAll('.frg').forEach(x => x.remove()); root = null; }
const W = (html, foot = '') => { root.innerHTML = `<div class="frg-w">${html}</div>${foot}`; root.scrollTop = 0; };
const topbar = (title, back) => `<div class="frg-top">${back ? `<button class="frg-ib" data-back aria-label="Späť">‹</button>` : '<span style="width:40px"></span>'}<b>${h(title)}</b><button class="frg-ib" data-close aria-label="Zavrieť">×</button></div>`;
function bindTop(back) {
  root.querySelector('[data-close]')?.addEventListener('click', close);
  root.querySelector('[data-back]')?.addEventListener('click', back);
}

// ---------- 1) úvod: fotka ----------
function fridgeArt() {
  const f = (w, hh, c, r = 6) => `<i class="frg-f" style="width:${w}px;height:${hh}px;background:${c};border-radius:${r}px"></i>`;
  return `<div class="frg-hero" aria-hidden="true"><div class="frg-fr"><div class="frg-body"><div class="frg-inner">
    <div class="frg-shelf">${f(16, 26, '#FFFFFF', 4)}${f(14, 18, '#7CC4FF', 4)}${f(20, 14, '#FFD27A', 8)}${f(13, 13, '#FF6B5E', 99)}</div>
    <div class="frg-shelf">${f(12, 15, '#FFF3D6', 99)}${f(12, 15, '#FFF3D6', 99)}${f(12, 15, '#FFF3D6', 99)}${f(24, 12, '#F2B880', 4)}${f(10, 22, '#7DD87D', 4)}</div>
    <div class="frg-shelf">${f(26, 16, '#6ED39A', 8)}${f(16, 10, '#FF9F43', 99)}${f(18, 18, '#C99BFF', 6)}</div>
  </div></div><div class="frg-door"></div></div>
  <span class="frg-spark" style="left:16%;top:34%;animation-delay:1.25s">🥚</span><span class="frg-spark" style="right:15%;top:22%;animation-delay:1.4s">🥦</span><span class="frg-spark" style="right:19%;bottom:18%;animation-delay:1.55s">🍗</span></div>`;
}
function vStart() {
  S.view = 'start';
  const last = ls.get(K_LAST, null), saved = ls.get(K_SAVED, []);
  const lastOk = last && last.items?.length && Date.now() - last.at < 5 * 864e5;
  const ago = lastOk ? (() => { const d = Math.floor((Date.now() - last.at) / 864e5); return d === 0 ? 'dnes' : d === 1 ? 'včera' : `pred ${d} dňami`; })() : '';
  const n = S.photos.length;
  W(`${topbar('Čo uvarím?')}
    ${n ? '' : fridgeArt()}
    <h1>${n ? 'Ďalšia fotka?' : 'Odfoť chladničku'}</h1>
    <p class="frg-lead">${n ? 'Pridaj mrazák alebo špajzu, nech vidím všetko. Alebo pokračuj.' : 'Nájdem, čo máš doma, a navrhnem recepty presne na tvoj cieľ a na to, čo ti dnes ešte zostáva. Porciu ti prepočítam na tvoje kalórie.'}</p>
    ${n ? `<div class="frg-ph">${S.photos.map((p, i) => `<div class="frg-th"><img src="${p.url}" alt="Fotka ${i + 1}"><button data-rm="${i}" aria-label="Odstrániť fotku">×</button></div>`).join('')}${n < 3 ? `<label class="frg-add"><div><span>＋</span>Mrazák alebo špajza</div><input type="file" accept="image/*" multiple hidden data-pick></label>` : ''}</div>` : ''}
    ${n ? `<button class="frg-btn" data-go>Nájsť suroviny</button>` : `<label class="frg-btn" role="button">${CAM}Odfotiť chladničku<input type="file" accept="image/*" capture="environment" hidden data-pick></label>
      <div class="frg-row"><label class="frg-btn gh" role="button">Z galérie<input type="file" accept="image/*" multiple hidden data-pick></label><button class="frg-btn gh" data-manual>Napíšem sám</button></div>`}
    ${!n && lastOk ? `<div class="frg-sec">Tvoja chladnička</div><button class="frg-card" data-last><span>🧊</span><div><b>Použiť posledný sken</b><small>${ago} · ${last.items.length} ${last.items.length < 5 ? 'suroviny' : 'surovín'}</small></div><em>›</em></button>` : ''}
    ${!n && saved.length ? `<div class="frg-sec">Uložené recepty</div>${saved.slice(0, 6).map((r, i) => `<button class="frg-card" data-saved="${i}"><span>${h(r.emoji)}</span><div><b>${h(r.name)}</b><small>${nf(r.per.kcal)} kcal · B ${r0(r.per.protein)} g · ${r.minutes} min</small></div><em>›</em></button>`).join('')}` : ''}
    ${n ? '' : `<div class="frg-tips">
      <div class="frg-tip"><i>💡</i><span>Otvor dvere naplno a zapni svetlo. Čím ostrejšia fotka, tým viac surovín nájdem.</span></div>
      <div class="frg-tip"><i>📸</i><span>Pridaj aj mrazák, dvere a špajzu, spolu až 3 fotky.</span></div>
      <div class="frg-tip"><i>🔒</i><span>Fotky sa nikam neukladajú, použijú sa len na nájdenie surovín.</span></div></div>`}`);
  bindTop();
  root.querySelectorAll('[data-pick]').forEach(inp => inp.onchange = async () => {
    const files = [...(inp.files || [])].slice(0, 3 - S.photos.length); inp.value = '';
    for (const f of files) { try { S.photos.push(await shrink(f)); } catch (e) { ctx.toast(e.message, true); } }
    if (S.photos.length) { preDetect(); vStart(); }
  });
  root.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { S.photos.splice(Number(b.dataset.rm), 1); if (S.photos.length) preDetect(); vStart(); });
  root.querySelector('[data-go]')?.addEventListener('click', detect);
  root.querySelector('[data-manual]')?.addEventListener('click', () => vItems());
  root.querySelector('[data-last]')?.addEventListener('click', () => { S.items = last.items.map(i => ({ ...i, on: true, first: false })); S.shop = last.shop || []; track('frg_last'); vItems(); prefetch(); });
  root.querySelectorAll('[data-saved]').forEach(b => b.onclick = () => { const r = saved[Number(b.dataset.saved)]; if (r) { S.b = S.b || null; vDetail(r, true); } });
}

// ---------- 2) skenovanie ----------
const SCAN_TXT = [['Hľadám suroviny…', 'Prechádzam police aj dvere'], ['Čítam obaly…', 'Jogurty, syry, omáčky'], ['Odhadujem množstvá…', 'Koľko čoho máš'], ['Ešte chvíľku…', 'Kontrolujem, nech nič nechýba']];
function scanning(imgs, t1, t2) {
  W(`${topbar('Čo uvarím?')}<div class="frg-scan">${imgs.length ? `<div class="frg-stack">${imgs.map(p => `<img src="${p.url}" alt="">`).join('')}<div class="frg-beam"></div></div>` : `<div style="font-size:64px;margin:30px 0 20px">🍳</div>`}
    <p class="frg-st">${h(t1)}</p><p class="frg-st2">${h(t2)}</p><div class="frg-dots"><i></i><i></i><i></i></div></div>`);
  bindTop();
}
function cycle(list) {
  let i = 0;
  const t = setInterval(() => { i = (i + 1) % list.length; const a = root?.querySelector('.frg-st'), b = root?.querySelector('.frg-st2'); if (!a) return clearInterval(t); a.textContent = list[i][0]; b.textContent = list[i][1]; }, 2600);
  return () => clearInterval(t);
}
// suroviny sa začnú hľadať hneď po odfotení (kým človek rozmýšľa, či pridá mrazák); po ťuknutí na „Nájsť suroviny“ s tými istými fotkami už výsledok beží alebo je hotový
const photoSig = () => S.photos.map(p => p.b64.length + ':' + p.b64.slice(-24)).join('|');
function preDetect() {
  const sig = photoSig();
  if (S.det?.sig === sig) return S.det.p;
  const p = api({ mode: 'detect', images: S.photos.map(x => x.b64) });
  p.catch(() => { });
  S.det = { sig, p };
  return p;
}
async function detect() {
  scanning(S.photos.slice().reverse(), ...SCAN_TXT[0]);
  const stop = cycle(SCAN_TXT);
  try {
    const pend = preDetect();
    const res = await pend.catch(() => { S.det = null; return preDetect(); });
    S.det = null;
    stop();
    if (!root) return;
    if (!res.items?.length) return fail('Na fotke som nenašiel jedlo', res.note || 'Skús to odfotiť znova, s otvorenými dverami a zapnutým svetlom. Alebo suroviny napíš sám.', vStart, true);
    // nápoje (voda, džúsy) sú predvolene vypnuté, do receptov sa väčšinou nehodia
    S.items = res.items.map(i => ({ ...i, name: cap(i.name), on: i.cat !== 'drink', first: false }));
    S.shop = res.shop || [];
    ls.set(K_LAST, { at: Date.now(), items: res.items.map(i => ({ ...i, name: cap(i.name) })), shop: S.shop });
    track('frg_scan', { n: res.items.length, photos: S.photos.length, via: res.via || '' });
    vItems(true);
    prefetch();
  } catch (e) { stop(); if (root) fail('Fotku sa nepodarilo prečítať', e.message, vStart, true); }
}
function fail(title, msg, back, manual) {
  W(`${topbar('Čo uvarím?')}<div class="frg-err"><b>${h(title)}</b><p>${h(msg)}</p><button class="frg-btn" data-retry>Skúsiť znova</button>${manual ? '<button class="frg-link" data-manual>Napísať suroviny sám</button>' : ''}</div>`);
  bindTop();
  root.querySelector('[data-retry]').onclick = back;
  root.querySelector('[data-manual]')?.addEventListener('click', () => vItems());
}

// ---------- 3) suroviny a možnosti ----------
function vItems(fromScan) {
  S.view = 'items';
  const st = new Set(staples().map(key));
  const on = S.items.filter(i => i.on);
  const groups = CATS.map(([id, ic, lbl]) => ({ id, ic, lbl, items: S.items.map((it, idx) => ({ it, idx })).filter(x => (x.it.cat || 'other') === id) })).filter(g => g.items.length);
  const chip = ({ it, idx }, k) => `<button class="frg-chip ${it.on ? 'on' : 'off'} ${it.conf === 'low' ? 'low' : ''} ${it.first ? 'first' : ''}" data-i="${idx}" style="animation-delay:${fromScan ? Math.min(k * 40, 900) : 0}ms"><i>${h(it.emoji || '•')}</i>${h(it.name)}${it.qty ? ` <small>${h(it.qty)}</small>` : ''}</button>`;
  let k = 0;
  const o = S.opts;
  W(`${topbar('Suroviny', vStart)}
    <h2>${S.items.length ? `Našiel som ${S.items.length} ${S.items.length === 1 ? 'surovinu' : S.items.length < 5 ? 'suroviny' : 'surovín'}` : 'Čo máš doma?'}</h2>
    <p class="frg-lead" style="margin-bottom:12px">${S.items.length ? 'Ťukni na to, čo už nemáš. Chýba niečo? Dopíš to dole.' : 'Napíš suroviny, ktoré máš v chladničke, a ja vymyslím recepty.'}</p>
    ${S.items.length ? `<div class="frg-mode"><button data-m="edit" class="${S.mode === 'edit' ? 'on' : ''}">Upraviť zoznam</button><button data-m="first" class="${S.mode === 'first' ? 'on' : ''}">⏳ Treba minúť</button></div>
      <p class="frg-hint">${S.mode === 'first' ? 'Ťukni na to, čo sa čoskoro pokazí. Recepty to použijú ako prvé.' : S.items.some(i => i.conf === 'low') ? 'Prerušovaný okraj znamená, že si nie som istý. Skontroluj to.' : ''}</p>` : ''}
    ${groups.map(g => `<div class="frg-g">${g.ic} ${g.lbl}</div><div class="frg-chips">${g.items.map(x => chip(x, k++)).join('')}</div>`).join('')}
    <div class="frg-addrow"><input class="frg-in" id="frgAdd" placeholder="Pridať surovinu, napr. kuracie prsia" autocomplete="off" enterkeyhint="done"><button data-add aria-label="Pridať">＋</button></div>
    <div class="frg-g" style="margin-top:22px">🧂 Doma mám vždy</div>
    <div class="frg-chips">${STAPLES.map(s => `<button class="frg-chip st ${st.has(key(s)) ? 'on' : 'off'}" data-st="${h(s)}" style="animation:none">${h(s)}</button>`).join('')}</div>
    ${S.shop.length ? `<div class="frg-buy"><h3>✨ Na tvoj cieľ by sa hodilo dokúpiť</h3><p>Z toho, čo máš, by s týmto vznikli ešte lepšie jedlá.</p>
      ${S.shop.map((s, i) => `<div class="frg-bi"><div><b>${h(cap(s.name))}</b><small>${h(s.why)}</small></div><button data-buy="${i}" class="${s.added ? 'done' : ''}">${s.added ? '✓ V zozname' : '＋ Do nákupu'}</button></div>`).join('')}</div>` : ''}
    <div class="frg-sec">Čo ideš variť</div>
    <div class="frg-seg" data-g="meal">${MEALS.map(([v, l]) => `<button data-v="${v}" class="${o.meal === v ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div class="frg-sec">Koľko máš času</div>
    <div class="frg-seg" data-g="minutes">${[[15, '15 min'], [30, '30 min'], [60, 'Hodinu aj viac']].map(([v, l]) => `<button data-v="${v}" class="${o.minutes === v ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div class="frg-sec">Pre koľkých</div>
    <div class="frg-seg" data-g="servings">${[[1, 'Len pre mňa'], [2, '2 porcie'], [4, '4 porcie']].map(([v, l]) => `<button data-v="${v}" class="${o.servings === v ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div class="frg-sec">Na čo máš chuť (nepovinné)</div>
    <input class="frg-in" id="frgWish" style="width:100%" maxlength="80" placeholder="napr. niečo pikantné, ázijské, bez rúry" value="${h(o.wish || '')}">`,
    `<div class="frg-foot"><button class="frg-btn" data-recipes ${on.length ? '' : 'disabled'}>${on.length ? 'Navrhnúť recepty' : 'Pridaj aspoň jednu surovinu'}</button></div>`);
  bindTop(vStart);
  const keepY = fn => () => { const y = root.scrollTop; fn(); root.scrollTop = y; };
  root.querySelectorAll('[data-m]').forEach(b => b.onclick = keepY(() => { S.mode = b.dataset.m; vItems(); }));
  root.querySelectorAll('[data-i]').forEach(b => b.onclick = keepY(() => {
    const it = S.items[Number(b.dataset.i)];
    if (S.mode === 'first') { it.first = !it.first; if (it.first) it.on = true; } else { it.on = !it.on; if (!it.on) it.first = false; }
    try { navigator.vibrate?.(6); } catch (_) { }
    vItems(); rePre();
  }));
  const add = keepY(() => {
    const inp = root.querySelector('#frgAdd'), v = inp.value.trim(); if (!v) return;
    v.split(/[,;\n]+/).map(x => cap(x.trim())).filter(Boolean).forEach(name => {
      const ex = S.items.find(i => key(i.name) === key(name));
      if (ex) ex.on = true; else S.items.push({ name, qty: '', g: 0, cat: 'other', emoji: '•', health: 'ok', conf: 'high', on: true, first: false, mine: true });
    });
    vItems(); rePre();
    setTimeout(() => root?.querySelector('#frgAdd')?.focus(), 30);
  });
  root.querySelector('[data-add]').onclick = add;
  root.querySelector('#frgAdd').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); add(); } };
  root.querySelectorAll('[data-st]').forEach(b => b.onclick = () => {
    const cur = staples(), kk = key(b.dataset.st), i = cur.findIndex(x => key(x) === kk);
    if (i >= 0) cur.splice(i, 1); else cur.push(b.dataset.st);
    ls.set(K_STAPLES, cur); b.classList.toggle('on', i < 0); b.classList.toggle('off', i >= 0); rePre();
  });
  root.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
    const s = S.shop[Number(b.dataset.buy)]; if (!s || s.added) return;
    addExtras([{ name: cap(s.name), g: 0, from: 'Chladnička' }]); s.added = true;
    b.classList.add('done'); b.textContent = '✓ V zozname'; track('frg_shop', { n: 1, src: 'tip' });
  });
  root.querySelectorAll('[data-g] [data-v]').forEach(b => b.onclick = () => {
    const g = b.parentElement.dataset.g; S.opts[g] = g === 'meal' ? b.dataset.v : Number(b.dataset.v);
    b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); rePre();
  });
  root.querySelector('#frgWish').oninput = e => { S.opts.wish = e.target.value; rePre(); };
  root.querySelector('[data-recipes]').onclick = () => { S.seen = []; recipes(); };
}

// ---------- 4) recepty ----------
const COOK_TXT = [['Vymýšľam recepty…', 'Z toho, čo máš doma'], ['Rátam makrá…', 'Surovinu po surovine'], ['Prepočítavam porcie…', 'Presne na tvoj cieľ'], ['Vyberám to najlepšie…', 'Podľa toho, čo ti dnes zostáva']];
// požiadavka na recepty z aktuálneho stavu (rovnaká pre predpočítanie aj pre ťuknutie na tlačidlo)
async function recipeReq() {
  const { minutes, servings, wish, meal } = S.opts;
  const b = await budget(meal);
  const on = S.items.filter(i => i.on);
  const body = {
    mode: 'recipes', items: on.map(i => ({ name: i.name, qty: i.qty })), staples: staples(), useFirst: on.filter(i => i.first).map(i => i.name),
    meal: { breakfast: 'breakfast', lunch: 'lunch', dinner: 'dinner', snack: 'snack' }[meal], minutes, servings, kcal: b.kcal, protein: b.protein,
    diet: dietText(), wish: (wish || '').trim(),
  };
  return { b, body, sig: JSON.stringify(body) };
}
// recepty sa začnú počítať hneď po nájdení surovín, kým si ich človek prezerá; keď nič nezmení, po ťuknutí sú hotové okamžite
async function prefetch() {
  try {
    const q = await recipeReq();
    const p = api({ ...q.body, exclude: [] });
    p.catch(() => { });
    S.pre = { sig: q.sig, p };
  } catch (_) { S.pre = null; }
}
// po úprave surovín alebo možností sa recepty prepočítajú vopred znova (až keď človek 2 s nič nemení, najviac 3× za sken)
let preT = 0;
function rePre() {
  clearTimeout(preT);
  if ((S.preN || 0) >= 3) return;
  preT = setTimeout(async () => {
    if (!root || S.view !== 'items' || !S.items.some(i => i.on)) return;
    const q = await recipeReq().catch(() => null);
    if (!q || S.pre?.sig === q.sig) return;
    S.preN = (S.preN || 0) + 1; prefetch();
  }, 2000);
}
async function recipes(more) {
  clearTimeout(preT);
  const { minutes, servings, wish } = S.opts;
  ls.set(K_OPTS, { minutes, servings, wish });
  scanning([], ...COOK_TXT[0]);
  const stop = cycle(COOK_TXT);
  try {
    const q = await recipeReq();
    S.b = q.b;
    const pre = !more && S.pre && S.pre.sig === q.sig ? S.pre.p : null;
    S.pre = null;
    const res = pre ? await pre.catch(() => api({ ...q.body, exclude: S.seen })) : await api({ ...q.body, exclude: S.seen });
    track('frg_pre', { hit: !!pre });
    stop();
    if (!root) return;
    S.recipes = rank(res.recipes || []);
    S.seen = [...new Set([...S.seen, ...S.recipes.map(r => r.name)])].slice(-12);
    track('frg_recipes', { n: S.recipes.length, more: !!more, via: res.via || '' });
    vResults();
  } catch (e) { stop(); if (root) fail('Recepty sa nepodarilo vymyslieť', e.message, () => recipes(more)); }
}
// poradie počíta appka: kalórie blízko cieľa porcie, bielkoviny, nič nechýba, použije čo treba minúť
function rank(list) {
  const b = S.b, first = new Set(S.items.filter(i => i.first).map(i => key(i.name)));
  list.forEach(r => {
    const d = Math.abs(r.per.kcal - b.kcal) / b.kcal;
    const kS = Math.max(0, 1 - d * 2.2), pS = Math.min(1, r.per.protein / Math.max(1, b.protein));
    const missS = r.missing.length ? Math.max(0, 1 - r.missing.length * 0.35) : 1;
    const firstS = first.size ? Math.min(1, r.ingredients.filter(x => first.has(key(x.name)) || [...first].some(f => key(x.name).includes(f))).length / Math.min(2, first.size)) : 0;
    r.fit = 0.34 * kS + 0.34 * pS + 0.2 * missS + 0.12 * firstS;
    r.color = r.per.kcal > Math.max(b.left, 0) + 80 && ctx.state?.date === calc.today() ? OVER : r.fit >= 0.7 ? GOOD : MID;
    r.usesFirst = firstS > 0;
  });
  return list.sort((a, z) => z.fit - a.fit);
}
function badges(r) {
  const out = [`<span>⏱ ${r.minutes} min</span>`];
  out.push(r.missing.length ? `<span class="miss">Chýba: ${h(r.missing.slice(0, 2).join(', '))}${r.missing.length > 2 ? '…' : ''}</span>` : '<span class="ok">✓ Máš všetko</span>');
  if (r.usesFirst) out.push('<span class="ok">⏳ Minie, čo treba</span>');
  (r.tags || []).slice(0, 2).forEach(t => TAGS[t] && out.push(`<span>${TAGS[t]}</span>`));
  return `<div class="frg-bd">${out.join('')}</div>`;
}
function vResults() {
  S.view = 'results';
  const b = S.b, [best, ...rest] = S.recipes;
  const mealL = (MEALS.find(m => m[0] === S.opts.meal) || [, 'jedlo'])[1].toLowerCase();
  const card = (r, i, isBest) => `<button class="frg-rc ${isBest ? 'best' : ''}" data-r="${i}" style="animation-delay:${i * 70}ms">
    ${isBest ? '<div class="frg-tag">★ Najlepšie na tvoj cieľ</div>' : ''}
    <div class="frg-rh"><span class="frg-em">${h(r.emoji)}</span><div><h3>${h(r.name)}</h3>${r.desc ? `<p>${h(r.desc)}</p>` : ''}</div></div>
    <div class="frg-nums"><b>${nf(r.per.kcal)}<small>kcal</small></b><span><i>B ${r0(r.per.protein)} g</i> · S ${r0(r.per.carbs)} · T ${r0(r.per.fat)} g${r.servings > 1 ? ' · na porciu' : ''}</span></div>
    <div class="frg-fit"><i style="width:${Math.round(Math.max(.08, r.fit) * 100)}%;background:${r.color}"></i></div>
    ${badges(r)}</button>`;
  W(`${topbar('Recepty', vItems)}
    <h2>${S.recipes.length} ${S.recipes.length < 5 ? 'recepty' : 'receptov'} z tvojej chladničky</h2>
    <div class="frg-bud"><span>Porcia na ${h(mealL)} <b>~${nf(b.kcal)} kcal</b></span><span>bielkoviny <b>${b.protein} g</b></span>${ctx.state?.date === calc.today() ? `<span>dnes ti ostáva <b>${nf(Math.max(0, b.left))} kcal</b></span>` : ''}</div>
    ${best ? card(best, 0, true) : ''}
    ${rest.length ? `<div class="frg-sec">Ďalšie možnosti</div>${rest.map((r, i) => card(r, i + 1)).join('')}` : ''}
    <div class="frg-row"><button class="frg-btn gh" data-more>↻ Iné recepty</button><button class="frg-btn gh" data-edit>Upraviť suroviny</button></div>
    <p class="frg-note">Porcie sú prepočítané na tvoj cieľ a hodnoty sú zo súčtu surovín. Sú to odhady, po zapísaní ich vieš upraviť ťuknutím na jedlo v Dnes.</p>`);
  bindTop(vItems);
  root.querySelectorAll('[data-r]').forEach(el => el.onclick = () => vDetail(S.recipes[Number(el.dataset.r)]));
  root.querySelector('[data-more]').onclick = () => recipes(true);
  root.querySelector('[data-edit]').onclick = () => vItems();
}

// ---------- 5) detail receptu ----------
function vDetail(r, fromSaved) {
  const base = r.servings || 1;
  let sv = base;
  const savedList = () => ls.get(K_SAVED, []);
  const isSaved = () => savedList().some(x => key(x.name) === key(r.name));
  const back = fromSaved ? vStart : vResults;
  const draw = () => {
    const k = sv / base;
    const b = S.b;
    const after = b && ctx.state?.date === calc.today() ? { kcal: b.left - r.per.kcal, p: b.leftP - r.per.protein } : null;
    const mealL = (MEALS.find(m => m[0] === S.opts.meal) || [, 'Obed'])[1];
    const miss = r.ingredients.filter(x => !x.have);
    W(`${topbar('Recept', back)}
      <div class="frg-dh"><span class="frg-em">${h(r.emoji)}</span><div><h2>${h(r.name)}</h2><p class="frg-lead" style="margin:2px 0 0;font-size:14px">⏱ ${r.minutes} min${r.desc ? ` · ${h(r.desc)}` : ''}</p></div></div>
      <div class="frg-mac"><div><b>${nf(r.per.kcal)}</b><small>kcal</small></div><div><b>${r0(r.per.protein)}</b><small>bielkoviny g</small></div><div><b>${r0(r.per.carbs)}</b><small>sacharidy g</small></div><div><b>${r0(r.per.fat)}</b><small>tuky g</small></div></div>
      ${after ? `<p class="frg-after">${after.kcal >= 0 ? `Po tejto porcii ti dnes ostane <b>${nf(after.kcal)} kcal</b>` : `Táto porcia je o <b>${nf(-after.kcal)} kcal</b> nad tvojím zvyškom na dnes`}${after.p > 0 ? ` a ešte <b>${r0(after.p)} g bielkovín</b>.` : after.kcal >= 0 ? ' a bielkoviny máš na dnes splnené. 💪' : '.'}</p>` : ''}
      <div class="frg-serv"><span>Porcie</span><div><button data-sv="-1" aria-label="Menej">−</button><b>${sv}</b><button data-sv="1" aria-label="Viac">＋</button></div></div>
      <div class="frg-sec">Suroviny${sv > 1 ? ` na ${sv} porcie` : ''}</div>
      <ul class="frg-ing">${r.ingredients.map(x => `<li><i class="${x.have ? 'y' : 'n'}">${x.have ? '✓' : '＋'}</i><span>${h(cap(x.name))}</span><em>${fmtG(x.g * k, x.name)}</em></li>`).join('')}</ul>
      ${miss.length ? `<button class="frg-btn gh" data-shop style="margin-top:12px">🛒 Chýbajúce do nákupného zoznamu (${miss.length})</button>` : ''}
      <div class="frg-sec">Postup <span style="font-weight:500">· ťukni na hotový krok</span></div>
      <ol class="frg-steps">${r.steps.map(s => `<li>${h(s)}</li>`).join('')}</ol>
      ${r.tip ? `<div class="frg-tipc"><span>💡</span><span>${h(r.tip)}</span></div>` : ''}
      <div class="frg-row" style="margin-top:16px"><button class="frg-btn gh" data-plan>📅 Na zajtra</button><button class="frg-btn gh" data-save>${isSaved() ? '♥ Uložené' : '♡ Uložiť'}</button></div>
      <p class="frg-note">Zapíše sa 1 porcia: ${nf(r.per.kcal)} kcal, B ${r0(r.per.protein)} g, S ${r0(r.per.carbs)} g, T ${r0(r.per.fat)} g.</p>`,
      `<div class="frg-dfoot"><div><button class="frg-btn" data-log>Zapísať do: ${h(mealL)} · ${nf(r.per.kcal)} kcal</button></div></div>`);
    bindTop(back);
    root.querySelectorAll('[data-sv]').forEach(bt => bt.onclick = () => { const y = root.scrollTop; sv = Math.max(1, Math.min(8, sv + Number(bt.dataset.sv))); draw(); root.scrollTop = y; });
    root.querySelectorAll('.frg-steps li').forEach(li => li.onclick = () => li.classList.toggle('done'));
    root.querySelector('[data-shop]')?.addEventListener('click', e => {
      addExtras(miss.map(x => ({ name: cap(x.name), g: x.g * k, from: r.name })));
      e.target.textContent = '✓ Pridané do nákupného zoznamu'; e.target.disabled = true;
      track('frg_shop', { n: miss.length, src: 'recipe' }); ctx.toast('Pridané do nákupného zoznamu');
    });
    root.querySelector('[data-save]').onclick = e => {
      const list = savedList(), i = list.findIndex(x => key(x.name) === key(r.name));
      if (i >= 0) list.splice(i, 1); else { list.unshift({ ...r, fit: undefined, color: undefined }); track('frg_save'); }
      ls.set(K_SAVED, list.slice(0, 30)); e.target.textContent = i >= 0 ? '♡ Uložiť' : '♥ Uložené';
    };
    root.querySelector('[data-log]').onclick = () => logIt(r, ctx.state?.date || calc.today(), S.opts.meal, root.querySelector('[data-log]'));
    root.querySelector('[data-plan]').onclick = () => logIt(r, calc.addDays(calc.today(), 1), S.opts.meal, root.querySelector('[data-plan]'), true);
  };
  draw();
}
const fmtG = (g, name) => {
  const liq = /mlieko|smotan|vod|olej|jogurt|kefir|vývar|vyvar|omáčk|omack|víno|vino/i.test(name || '');
  const v = g >= 100 ? Math.round(g / 5) * 5 : Math.round(g);
  return v >= 1000 ? (Math.round(v / 100) / 10).toString().replace('.', ',') + (liq ? ' l' : ' kg') : v + (liq ? ' ml' : ' g');
};
// zapíše 1 porciu ako jedno jedlo (v denníku ako jeden riadok s názvom receptu); na zajtra pošle chýbajúce suroviny aj do nákupu
async function logIt(r, date, meal, btn, plan) {
  const old = btn.textContent; btn.disabled = true; btn.textContent = 'Zapisujem…';
  try {
    await db.addFood({ user_id: ctx.state.profile.id, date, meal, name: r.name, brand: null, grams: r.per.g || 300,
      kcal: r.per.kcal, protein: r.per.protein, carbs: r.per.carbs, fat: r.per.fat, source: 'fridge', barcode: null, food_id: null, portion: null, qty: null });
    if (plan) {
      const miss = r.ingredients.filter(x => !x.have);
      if (miss.length) addExtras(miss.map(x => ({ name: cap(x.name), g: x.g, from: r.name })));
      track('frg_plan', { miss: miss.length });
      ctx.toast(miss.length ? `Naplánované na zajtra. Chýbajúce suroviny sú v nákupnom zozname.` : 'Naplánované na zajtra');
      btn.textContent = '✓ Na zajtra';
      return;
    }
    track('frg_log', { kcal: r.per.kcal });
    close();
    ctx.toast(`Zapísané: ${r.name}`);
    if ((location.hash || '#/').split('?')[0] === '#/') window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = '#/';
  } catch (e) { ctx.toast(e.message, true); btn.disabled = false; btn.textContent = old; }
}

// ---------- vstupy ----------
function injectJedlo() {
  const anchor = document.querySelector('.screen:has(#mealseg) .ms-entry') || document.querySelector('.screen:has(#mealseg) #aiBox');
  if (!anchor || anchor.parentNode.querySelector('.frg-entry')) return;
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'frg-entry';
  b.innerHTML = '<i>🧊</i><div><b>Čo uvarím z chladničky?</b><span>Odfoť chladničku a dostaneš recepty presne na tvoj cieľ</span></div><em>Nové</em>';
  b.onclick = () => openFridge({ from: 'jedlo' });
  anchor.after(b);
}
function injectQuick() {
  const w = document.querySelector('.qa-w');
  if (!w || w.parentNode.querySelector('.frg-qa')) return;
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'frg-qa';
  b.innerHTML = '<i>🧊</i><div><b>Čo uvarím z chladničky?</b><small>Odfoť chladničku, recepty na tvoj cieľ</small></div>';
  b.onclick = () => { document.querySelector('.qa-fab')?.click(); setTimeout(() => openFridge({ from: 'plus' }), 140); };
  w.after(b);
}
let raf = 0;
new MutationObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { injectJedlo(); injectQuick(); }); }).observe(document.body, { childList: true, subtree: true });
injectJedlo(); injectQuick();
// odkaz #/chladnicka (napr. z videa alebo notifikácie) otvorí sken rovno
function deep() {
  if ((location.hash || '').split('?')[0] !== '#/chladnicka') return;
  location.replace('#/jedlo');
  let n = 0; const t = setInterval(() => { if (ctx.state?.profile?.onboarded) { clearInterval(t); openFridge({ from: 'link' }); } else if (++n > 40) clearInterval(t); }, 150);
}
addEventListener('hashchange', deep);
deep();
// systémové Späť (gesto, tlačidlo) zatvorí sken namiesto odchodu z obrazovky
addEventListener('popstate', () => { if (root) close(); });
