// Registrácia ako v top appkách (Cal AI, Noom): najprv krátky kvíz, potom „tvoj plán je hotový“ a až potom účet.
// Človek vidí hodnotu skôr, než dá e-mail. Signatúra: otvorený prstenec z loga sa s každou odpoveďou dokresľuje a na konci
// sa z neho stane kalorický prstenec s makrami. Odpovede sa držia v zariadení (fw_quiz); po vytvorení účtu sa nimi sám
// vyplní a uloží pôvodný onboarding (žiadna zmena v app.js), a do profilu sa uloží aj intake (prekážky, odkiaľ prišiel, cieľová váha).
import * as db from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';
import { cookie } from './brandmark.js';
import { DIETS, DIET_KEYS } from './dietcore.js';
import * as dx from './dxcore.js';

const KEY = 'fw_quiz', SKIP = 'fw_fq_skip';
const jget = (k, s = localStorage) => { try { return JSON.parse(s.getItem(k) || 'null'); } catch (_) { return null; } };
const jset = (k, v, s = localStorage) => { try { v == null ? s.removeItem(k) : s.setItem(k, JSON.stringify(v)); } catch (_) { /* nič */ } };
const known = () => { try { return Object.keys(localStorage).some(k => k.startsWith('fw_prof_')); } catch (_) { return false; } };
const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (v, d = 0) => Number(v).toLocaleString('sk-SK', { minimumFractionDigits: d, maximumFractionDigits: d });
const buzz = () => { try { navigator.vibrate?.(8); } catch (_) { /* nič */ } };
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const YEAR = new Date().getFullYear();

// geometria prstenca z loga (viewBox 100): stred 50,50, polomer 40, medzera vľavo dole, ťah v smere hodinových ručičiek
const CX = 50, CY = 50, RR = 40, A0 = 169.4, SPAN = 320;
const pt = a => [CX + RR * Math.cos(a * Math.PI / 180), CY + RR * Math.sin(a * Math.PI / 180)];
const [SX, SY] = pt(A0), [EX, EY] = pt(A0 + SPAN);
const ARC = `M${SX.toFixed(2)} ${SY.toFixed(2)} A ${RR} ${RR} 0 1 1 ${EX.toFixed(2)} ${EY.toFixed(2)}`;

const CSS = `
.fnq{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;background:var(--bg,#0B0E12);color:var(--text,#fff);overflow:hidden;
  font-feature-settings:"tnum" 1;animation:fnqIn .35s ease both}
.fnq::before{content:"";position:absolute;inset:-20% -30% auto;height:70%;pointer-events:none;
  background:radial-gradient(50% 50% at 50% 30%,color-mix(in srgb,var(--accent,#7CFFB2) 14%,transparent),transparent 70%)}
.fnq.out{animation:fnqOut .35s ease both}
.fnq,.fnq-cover{--fnq-s1:#dcffee;--fnq-s2:#7CFFB2;--fnq-s3:#1fbfa0;--fnq-dot:#fff}
html[data-theme=light] .fnq,html[data-theme=light] .fnq-cover{--fnq-s1:#3ddc97;--fnq-s2:#14b37d;--fnq-s3:#0b8a66;--fnq-dot:#0b8a66}
html[data-theme=light] .fnq-seal{filter:none}
@keyframes fnqIn{from{opacity:0}}@keyframes fnqOut{to{opacity:0;transform:scale(1.02)}}
.fnq-top{position:relative;display:flex;align-items:center;gap:10px;padding:calc(env(safe-area-inset-top) + 12px) 16px 6px;max-width:520px;width:100%;margin:0 auto;box-sizing:border-box;min-height:56px}
.fnq-back{width:40px;height:40px;border-radius:12px;border:0;background:transparent;color:var(--muted,#8a94a3);display:grid;place-items:center;cursor:pointer;padding:0}
.fnq-back svg{width:22px;height:22px}
.fnq-back[hidden]{visibility:hidden;display:grid}
.fnq-bar{flex:1;height:4px;border-radius:99px;background:var(--line,#232a33);overflow:hidden}
.fnq-bar i{display:block;height:100%;width:0;border-radius:inherit;background:var(--accent,#7CFFB2);transition:width .45s cubic-bezier(.3,1,.4,1)}
.fnq-mini{flex:none;width:42px;height:42px}
.fnq-body{position:relative;flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch}
.fnq-step{max-width:520px;margin:0 auto;padding:14px 20px 24px;box-sizing:border-box;min-height:100%;display:flex;flex-direction:column;animation:fnqStep .38s cubic-bezier(.3,1,.4,1) both}
.fnq-step.back{animation-name:fnqStepB}
@keyframes fnqStep{from{opacity:0;transform:translateX(28px)}}@keyframes fnqStepB{from{opacity:0;transform:translateX(-28px)}}
.fnq h1{margin:6px 0 0;font-size:31px;line-height:1.08;letter-spacing:-.035em;font-weight:800}
.fnq .fnq-sub{margin:10px 0 22px;font-size:15px;line-height:1.45;color:var(--muted,#8a94a3);max-width:36ch}
.fnq-opts{display:grid;gap:10px}
.fnq-opts.two{grid-template-columns:1fr 1fr}
.fnq-opts.days{grid-template-columns:repeat(4,1fr)}
.fnq-o{appearance:none;-webkit-appearance:none;position:relative;display:flex;align-items:center;gap:14px;min-height:66px;padding:12px 16px;border-radius:20px;
  background:var(--card,#151a21);border:1.5px solid var(--line,#232a33);color:var(--text,#fff);font:inherit;text-align:left;cursor:pointer;
  transition:border-color .18s,background .18s,transform .12s,box-shadow .18s}
.fnq-o:active{transform:scale(.98)}
.fnq-o .ic{flex:none;width:42px;height:42px;border-radius:13px;display:grid;place-items:center;font-size:21px;background:var(--bg-2,#10141a)}
.fnq-o b{display:block;font-size:16.5px;font-weight:700;letter-spacing:-.01em}
.fnq-o small{display:block;font-size:13px;color:var(--muted,#8a94a3);margin-top:2px;line-height:1.3}
.fnq-o .ck{margin-left:auto;flex:none;width:24px;height:24px;border-radius:50%;border:1.5px solid var(--line,#232a33);display:grid;place-items:center;color:transparent;font-size:13px;font-weight:900;transition:all .18s}
.fnq-o[aria-checked=true]{border-color:var(--accent,#7CFFB2);background:color-mix(in srgb,var(--accent,#7CFFB2) 11%,var(--card,#151a21));box-shadow:0 0 0 4px color-mix(in srgb,var(--accent,#7CFFB2) 13%,transparent)}
.fnq-o[aria-checked=true] .ck{background:var(--accent,#7CFFB2);border-color:var(--accent,#7CFFB2);color:var(--accent-ink,#06130C)}
.fnq-opts.days .fnq-o,.fnq-opts.two .fnq-o{justify-content:center;text-align:center;flex-direction:column;gap:4px;min-height:74px;padding:10px 6px}
.fnq-opts.days .fnq-o b{font-size:24px;font-weight:800}
.fnq-opts.two .fnq-o .ic{margin-bottom:2px}
.fnq-cap{margin:14px 2px 0;font-size:13.5px;color:var(--muted,#8a94a3);min-height:20px;line-height:1.4}
.fnq-num{display:grid;gap:12px}
.fnq-nf{display:flex;align-items:center;gap:10px;padding:14px 14px 14px 18px;border-radius:22px;background:var(--card,#151a21);border:1.5px solid var(--line,#232a33);transition:border-color .18s}
.fnq-nf:focus-within{border-color:var(--accent,#7CFFB2)}
.fnq-nf label{flex:1;min-width:0;display:block}
.fnq-nf label span{display:block;font-size:13px;color:var(--muted,#8a94a3);font-weight:600}
.fnq-nf input{width:100%;border:0;background:transparent;color:var(--text,#fff);font:inherit;font-size:40px;font-weight:800;letter-spacing:-.03em;padding:0;outline:none;font-variant-numeric:tabular-nums;-moz-appearance:textfield}
.fnq-nf input::-webkit-outer-spin-button,.fnq-nf input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.fnq-nf input::placeholder{color:color-mix(in srgb,var(--text,#fff) 22%,transparent)}
.fnq-nf em{font-style:normal;font-size:16px;color:var(--muted,#8a94a3);font-weight:700;margin-left:2px}
.fnq-pm{display:flex;gap:6px}
.fnq-pm button{width:46px;height:46px;border-radius:14px;border:1px solid var(--line,#232a33);background:var(--bg-2,#10141a);color:var(--text,#fff);font-size:22px;font-weight:600;cursor:pointer}
.fnq-pm button:active{transform:scale(.94)}
.fnq-foot{position:sticky;bottom:0;margin-top:auto;padding:18px 0 calc(env(safe-area-inset-bottom) + 12px);background:linear-gradient(180deg,transparent,var(--bg,#0B0E12) 34%)}
.fnq-cta{width:100%;height:58px;border-radius:18px;border:0;background:var(--accent,#7CFFB2);color:var(--accent-ink,#06130C);font:inherit;font-size:17px;font-weight:800;letter-spacing:-.01em;cursor:pointer;
  box-shadow:0 10px 30px color-mix(in srgb,var(--accent,#7CFFB2) 28%,transparent);transition:transform .12s,opacity .2s}
.fnq-cta:active{transform:scale(.98)}
.fnq-cta:disabled{opacity:.35;box-shadow:none;cursor:default}
.fnq-link{display:block;width:100%;margin-top:10px;padding:12px;border:0;background:none;color:var(--muted,#8a94a3);font:inherit;font-size:14.5px;cursor:pointer}
.fnq-link b{display:inline;color:var(--text,#fff)}
.fnq-err{margin:12px 2px 0;font-size:14px;color:#FF7A6B;line-height:1.4}
/* úvod */
.fnq-hero{flex:1;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;padding-top:10px}
.fnq-seal{width:132px;height:132px;margin:0 0 26px -8px;filter:drop-shadow(0 0 28px color-mix(in srgb,var(--accent,#7CFFB2) 35%,transparent))}
.fnq-seal .rg{stroke-dasharray:100;stroke-dashoffset:100;animation:fnqDraw 1.4s .15s cubic-bezier(.6,0,.2,1) forwards}
.fnq-seal .mk{stroke-dasharray:100;stroke-dashoffset:100;animation:fnqDraw 1.2s .7s cubic-bezier(.6,0,.2,1) forwards}
.fnq-seal .dot{opacity:0;animation:fnqDot .4s 1.5s ease forwards}
@keyframes fnqDraw{to{stroke-dashoffset:0}}@keyframes fnqDot{to{opacity:1}}
.fnq-hero h1{font-size:40px;line-height:1.02;letter-spacing:-.045em}
.fnq-hero .fnq-sub{font-size:16px;margin-bottom:22px}
.fnq-feats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:6px 0 14px}
.fnq-opts.days .fnq-o .ck{display:none}
.fnq-feats>div{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:16px;background:var(--card,#151a21);border:1.5px solid var(--line,#232a33);min-height:52px}
.fnq-feats .fi{flex:none;width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:color-mix(in srgb,var(--accent,#7CFFB2) 14%,var(--bg-2,#10141a));color:var(--accent,#7CFFB2)}
.fnq-feats .fi svg{width:19px!important;height:19px!important}
.fnq-hero .gt-hero{margin:0 0 16px 6px;width:200px}
.fnq-hero h1{font-size:34px}
@media (max-height:700px){.fnq-hero .gt-hero{width:150px;margin-bottom:8px}.fnq-hero h1{font-size:28px}.fnq-hero .fnq-sub{display:none}.fnq-feats>div{min-height:44px;padding:5px 8px}}
.fnq-feats .fi svg,.fnq-o .ic svg{width:23px;height:23px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.fnq-feats b{font-size:13.5px;font-weight:700;line-height:1.15;letter-spacing:-.01em}
.fnq-body{scrollbar-width:none}.fnq-body::-webkit-scrollbar{display:none}
.fnq-opts.src .fnq-o{min-height:56px;padding:8px 14px}
.fnq-opts.src .fnq-o .ic{width:38px;height:38px;color:var(--accent,#7CFFB2)}
.fnq-opts.days .fnq-o small{font-size:11.5px}
.fnq-week{display:flex;gap:6px;justify-content:center;margin:18px 0 0}
.fnq-week i{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;font-style:normal;font-size:12px;font-weight:700;color:var(--muted,#8a94a3);background:var(--card,#151a21);border:1.5px solid var(--line,#232a33);transition:all .25s}
.fnq-week i.on{background:var(--accent,#7CFFB2);border-color:var(--accent,#7CFFB2);color:var(--accent-ink,#06130C);transform:translateY(-3px)}
.fnq-ch{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 6px}
.fnq-ch button{appearance:none;-webkit-appearance:none;min-height:42px;padding:0 15px;border-radius:99px;border:1.5px solid var(--line,#232a33);background:var(--card,#151a21);color:var(--text,#fff);font:inherit;font-size:14px;font-weight:600;cursor:pointer;transition:all .18s}
.fnq-ch button[aria-pressed=true]{border-color:var(--accent,#7CFFB2);background:color-mix(in srgb,var(--accent,#7CFFB2) 15%,var(--card,#151a21));box-shadow:0 0 0 3px color-mix(in srgb,var(--accent,#7CFFB2) 14%,transparent)}
.fnq-h{margin:18px 0 8px;font-size:13px;font-weight:700;color:var(--muted,#8a94a3)}
.fnq-cons{display:flex;gap:10px;align-items:flex-start;margin-top:16px;padding:12px 14px;border-radius:16px;border:1.5px solid var(--line,#232a33);background:var(--card,#151a21);font-size:12.5px;line-height:1.4;color:var(--muted,#8a94a3)}
.fnq-cons.bad{border-color:#ff5d5d}.fnq-cons input{flex:none;width:20px;height:20px;margin-top:1px;accent-color:var(--accent,#7CFFB2)}
.fnq-unused span{display:inline-flex;align-items:center;gap:7px;height:34px;padding:0 13px;border-radius:99px;font-size:13.5px;background:var(--card,#151a21);border:1px solid var(--line,#232a33)}
.fnq-chips span i{font-style:normal;color:var(--accent,#7CFFB2)}
/* počítanie */
.fnq-calc{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:6px}
.fnq-calc .big{width:168px;height:168px;margin-bottom:18px}
.fnq-calc .big .p{transition:stroke-dashoffset 2.6s cubic-bezier(.5,0,.2,1)}
.fnq-calc h1{font-size:26px}
.fnq-list{list-style:none;margin:16px 0 0;padding:0;display:grid;gap:11px;text-align:left}
.fnq-list li{display:flex;align-items:center;gap:11px;font-size:15px;color:var(--muted,#8a94a3);transition:color .3s}
.fnq-list li i{flex:none;width:22px;height:22px;border-radius:50%;border:1.5px solid var(--line,#232a33);display:grid;place-items:center;font-style:normal;font-size:12px;font-weight:900;color:transparent;transition:all .3s}
.fnq-list li.on{color:var(--text,#fff)}
.fnq-list li.on i{background:var(--accent,#7CFFB2);border-color:var(--accent,#7CFFB2);color:var(--accent-ink,#06130C)}
/* plán */
.fnq-plan{display:flex;flex-direction:column;align-items:center;text-align:center}
.fnq-plan .tag{font-size:13px;font-weight:700;color:var(--accent,#7CFFB2);margin:4px 0 6px}
.fnq-ring{position:relative;width:230px;height:230px;margin:10px 0 6px}
.fnq-ring svg{width:100%;height:100%;overflow:visible}
.fnq-ring .seg{transition:stroke-dasharray 1.1s cubic-bezier(.3,1,.4,1),stroke-dashoffset 1.1s cubic-bezier(.3,1,.4,1)}
.fnq-ring div{position:absolute;inset:0;display:grid;place-content:center;line-height:1}
.fnq-ring b{font-size:54px;font-weight:800;letter-spacing:-.05em;font-variant-numeric:tabular-nums}
.fnq-ring small{display:block;margin-top:6px;font-size:13.5px;color:var(--muted,#8a94a3)}
.fnq-mac{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:100%;margin:10px 0 0}
.fnq-mac div{padding:12px 6px;border-radius:18px;background:var(--card,#151a21);border:1px solid var(--line,#232a33)}
.fnq-mac b{display:block;font-size:21px;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.fnq-mac span{display:flex;align-items:center;justify-content:center;gap:6px;font-size:12.5px;color:var(--muted,#8a94a3);margin-top:3px}
.fnq-mac span i{width:8px;height:8px;border-radius:3px}
.fnq-proj{width:100%;box-sizing:border-box;margin:12px 0 0;padding:14px 16px;border-radius:20px;text-align:left;
  background:radial-gradient(120% 140% at 0% 0%,color-mix(in srgb,var(--accent,#7CFFB2) 14%,transparent),transparent 60%),var(--card,#151a21);border:1px solid color-mix(in srgb,var(--accent,#7CFFB2) 30%,var(--line,#232a33))}
.fnq-proj b{display:block;font-size:17px;letter-spacing:-.01em}
.fnq-proj span{display:block;font-size:13.5px;color:var(--muted,#8a94a3);margin-top:3px;line-height:1.4}
.fnq-why{width:100%;list-style:none;margin:12px 0 0;padding:0;display:grid;gap:8px;text-align:left}
.fnq-why li{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border-radius:20px;background:radial-gradient(120% 140% at 0% 0%,color-mix(in srgb,var(--accent,#7CFFB2) 14%,transparent),transparent 60%),var(--card,#151a21);border:1px solid color-mix(in srgb,var(--accent,#7CFFB2) 30%,var(--line,#232a33));font-size:14px;line-height:1.4}
.fnq-why li i{flex:none;font-style:normal;font-size:19px;line-height:1.2}
.fnq-why li b{display:block;font-size:17px;letter-spacing:-.01em}
.fnq-why li span{display:block;color:var(--muted,#8a94a3);font-size:13.5px;margin-top:3px;line-height:1.4}
/* účet */
.fnq-form{display:grid;gap:10px}
.fnq-in{display:block;padding:10px 16px 12px;border-radius:18px;background:var(--card,#151a21);border:1.5px solid var(--line,#232a33);transition:border-color .18s}
.fnq-in:focus-within{border-color:var(--accent,#7CFFB2)}
.fnq-in span{display:block;font-size:12.5px;color:var(--muted,#8a94a3);font-weight:600}
.fnq-in input{width:100%;border:0;background:transparent;color:var(--text,#fff);font:inherit;font-size:17px;padding:4px 0 0;outline:none}
.fnq-ok{display:flex;gap:12px;align-items:flex-start;margin:6px 2px 0;font-size:13.5px;line-height:1.45;color:var(--muted,#8a94a3);cursor:pointer}
.fnq-ok input{flex:none;width:22px;height:22px;margin:0;accent-color:var(--accent,#7CFFB2)}
.fnq-ok a{color:var(--text,#fff)}
.fnq-mini-plan{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:18px;margin:0 0 16px;background:var(--card,#151a21);border:1px solid var(--line,#232a33)}
.fnq-mini-plan b{font-size:20px;font-weight:800;letter-spacing:-.02em}
.fnq-mini-plan span{display:block;font-size:13px;color:var(--muted,#8a94a3);margin-top:2px}
.fnq-mini-plan b{display:block}
.fnq-mini-plan svg{flex:none;width:48px;height:48px}
.fnq-cover{position:fixed;inset:0;z-index:61;display:grid;place-content:center;justify-items:center;gap:16px;background:var(--bg,#0B0E12);color:var(--text,#fff);text-align:center;font-size:16px}
.fnq-cover svg,.fnq-calc svg{overflow:visible}
.fnq-cover svg{width:112px;height:112px}
.fnq-cover .rgp{animation:fnqSpinC 1.4s linear infinite}
@keyframes fnqSpinC{from{transform:translate(50px,50px) rotate(0) translate(-50px,-50px)}to{transform:translate(50px,50px) rotate(360deg) translate(-50px,-50px)}}
.fnq-cover .gt-ck,.fnq-calc .gt-ck{animation:fnqWob 2.2s ease-in-out infinite}
@keyframes fnqWob{0%,100%{transform:translate(50px,50px) rotate(-9deg) scale(1) translate(-50px,-50px)}50%{transform:translate(50px,50px) rotate(9deg) scale(1.05) translate(-50px,-50px)}}
@keyframes fnqSpin{to{transform:rotate(360deg)}}
@media (min-width:700px){.fnq h1{font-size:36px}.fnq-hero h1{font-size:48px}}
@media (prefers-reduced-motion:reduce){.fnq,.fnq-step,.fnq-seal *{animation:none!important}.fnq-cover .rgp,.fnq-cover .gt-ck,.fnq-calc .gt-ck{animation:none}.fnq-seal .rg,`;
const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

const BACK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
// pečať z ikony appky (prstenec + tep s vidličkou), bez pozadia
const SEAL = `<svg class="fnq-seal" viewBox="0 0 1024 1024" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <defs><linearGradient id="fqg" x1="150" y1="150" x2="880" y2="880" gradientUnits="userSpaceOnUse"><stop offset="0" style="stop-color:var(--fnq-s1)"/><stop offset=".45" style="stop-color:var(--fnq-s2)"/><stop offset="1" style="stop-color:var(--fnq-s3)"/></linearGradient></defs>
  <path class="rg" pathLength="100" d="M128.6 583.5 A 390 390 0 1 1 264.3 813.2" stroke="url(#fqg)" stroke-width="34"/>
  <path class="rg" pathLength="100" d="M128.6 583.5 H 334.1" stroke="url(#fqg)" stroke-width="34"/>
  <g transform="translate(500 545) scale(0.7) translate(-517 -545)" stroke="url(#fqg)" stroke-width="46">
    <path class="mk" pathLength="100" d="M280 600 L 336 508 L 390 648 L 474 300 L 580 800 L 642 548 L 690 624 C 712 652 752 650 780 600"/>
    <g transform="translate(790 562) rotate(10)"><path class="mk" pathLength="100" d="M-80 -250 V -78 C -80 -26 -44 0 0 0 C 44 0 80 -26 80 -78 V -250"/><path class="mk" pathLength="100" d="M-27 -250 V -40 M27 -250 V -40 M0 0 V 42"/></g>
  </g>
  <circle class="dot" cx="264.3" cy="813.2" r="22" style="fill:var(--fnq-dot)" stroke="none"/>
</svg>`;
// prstenec z loga ako ukazovateľ postupu (p 0..1) s bodkou na konci
let ckN = 0;
function ringSvg(p, cls = 'fnq-mini', w = 9, ck = true) {
  const a = A0 + SPAN * Math.max(0.001, p), [dx, dy] = pt(a);
  // sušienka v strede prstenca (znak appky); prstenec sa točí, sušienka sa jemne kolíše
  const inner = ck ? cookie('fq' + (++ckN), 15).replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '') : '';
  const c = ck ? `<g class="gt-ck"><g transform="translate(50 50) scale(0.2235)">${inner}</g></g>` : '';
  return `<svg class="${cls}" viewBox="0 0 100 100" fill="none" stroke-linecap="round" aria-hidden="true">
    <g class="rgp"><path d="${ARC}" style="stroke:var(--line,#232a33)" stroke-width="${w}"/>
    <path class="p" d="${ARC}" pathLength="100" style="stroke:var(--accent,#7CFFB2)" stroke-width="${w}" stroke-dasharray="100" stroke-dashoffset="${100 - p * 100}"/>
    <circle cx="${dx.toFixed(2)}" cy="${dy.toFixed(2)}" r="${w * 0.62}" style="fill:var(--fnq-dot)"/></g>${c}</svg>`;
}

const GOALS = [['lose', '🔥', 'Schudnúť', 'zhodiť tuk, udržať svaly'], ['maintain', '⚖️', 'Udržať váhu', 'jesť vyvážene, cítiť sa lepšie'], ['gain', '💪', 'Nabrať svaly', 'rásť bez zbytočného tuku']];
const SEX = [['m', '👨', 'Muž'], ['f', '👩', 'Žena']];
const JOBS = [['desk', '💻', 'Sedím väčšinu dňa', 'škola, kancelária'], ['stand', '🚶', 'Som veľa na nohách', 'obchod, gastro, učenie'], ['phys', '🏗️', 'Fyzická práca', 'stavba, sklad, záhrada']];
const BLOCK = [['time', '⏱️', 'Zapisovanie ma zdržiava'], ['what', '🤷', 'Neviem, čo mám jesť'], ['out', '🍽️', 'Často jem vonku alebo v jedálni'], ['sweet', '🍫', 'Chute na sladké a večerné jedenie'], ['motiv', '📉', 'Vydržím pár dní a prestanem'], ['train', '🏋️', 'Neviem, ako trénovať']];
const I = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const ICON = {
  camera: I('<rect x="3" y="7" width="18" height="13" rx="3"/><circle cx="12" cy="13.5" r="3.5"/><path d="M8 7l1.5-2.5h5L16 7"/>'),
  music: I('<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>'),
  people: I('<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.5 0 4 2 4 5"/>'),
  play: I('<rect x="3" y="5" width="18" height="14" rx="4"/><path d="M10.5 9.5v5l4-2.5z"/>'),
  dumbbell: I('<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>'),
  heart: I('<path d="M12 20s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.5-7 10-7 10z"/>'),
  search: I('<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.2-4.2"/>'),
  spark: I('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>'),
  video: I('<rect x="3" y="6" width="12" height="12" rx="3"/><path d="M15 11l6-3.5v9L15 13z"/>'),
  chart: I('<path d="M4 19V5M4 19h16"/><path d="M8 15l3.5-4 3 2.5L19 7"/>'),
  bolt: I('<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>'),
  coach: I('<path d="M5 5h14a2 2 0 012 2v8a2 2 0 01-2 2h-7l-5 4v-4H5a2 2 0 01-2-2V7a2 2 0 012-2z"/>'),
};
const HEALTH = [['diabetes', 'Cukrovka'], ['celiac', 'Celiakia'], ['lactose', 'Intolerancia laktózy'], ['allergy', 'Alergia na potraviny'], ['salt', 'Vysoký tlak']];
const SRC = [['instagram', ICON.camera, 'Instagram'], ['tiktok', ICON.music, 'TikTok'], ['facebook', ICON.people, 'Facebook'], ['youtube', ICON.play, 'YouTube'], ['gym', ICON.dumbbell, 'Fitko alebo tréner'], ['friend', ICON.heart, 'Kamarát'], ['store', ICON.search, 'Google alebo obchod s appkami'], ['other', ICON.spark, 'Iné']];
const FIX = {
  time: ['⚡', 'Zápis za 3 sekundy', 'napíš, nadiktuj alebo odfoť, čo máš na tanieri. AI spočíta zvyšok.'],
  what: ['🧭', 'Vždy vieš, čo zjesť ďalej', 'návrhy jedál podľa zvyšných kalórií a bielkovín.'],
  out: ['📋', 'Odfoť denné menu', 'AI ti z lístka vyberie jedlo, ktoré ti dnes sedí najviac.'],
  sweet: ['🌙', 'Plán aj na chute', 'kouč ti pomôže rozložiť kalórie tak, aby ostalo aj na niečo sladké.'],
  motiv: ['🔁', 'Séria, ktorá odpúšťa', 'jeden vynechaný deň ťa nevráti na nulu. Kouč ťa podrží.'],
  train: ['📈', 'Tréningový plán na mieru', 'podľa tvojich dní, s radou, kedy pridať váhu.'],
};

let el = null, q = null, step = 0, dir = 1;
const fresh = () => ({ goal: '', sex: '', by: '', h: '', w: '', tw: '', job: '', days: null, block: [], diet: { diets: [], modes: [], dtype: 't2', allergens: [], consent: false }, src: '', name: '', done: false });
const steps = () => ['hello', 'goal', 'sex', 'age', 'body', ...(q.goal && q.goal !== 'maintain' ? ['target'] : []), 'job', 'days', 'block', 'diet', 'src', 'calc', 'plan', 'account'];

function plan() {
  const w = Number(q.w), activity = calc.encodeActivity({ job: q.job || 'desk', steps: (calc.JOBS[q.job] || calc.JOBS.desk).steps, days: q.days || 0 });
  const t = calc.targets({ sex: q.sex || 'm', weightKg: w, heightCm: Number(q.h), birthYear: Number(q.by), activity, goal: q.goal || 'maintain' });
  const perWeek = q.goal === 'lose' ? -Math.min(0.01 * w, Math.max(0.2, (t.tdee - t.kcal) * 7 / 7700)) : q.goal === 'gain' ? Math.max(0.15, Math.min(0.005 * w, (t.kcal - t.tdee) * 7 / 7700)) : 0;
  const diff = Number(q.tw) ? Number(q.tw) - w : 0;
  const weeks = perWeek && diff && Math.sign(diff) === Math.sign(perWeek) ? Math.ceil(Math.abs(diff / perWeek)) : 0;
  return { ...t, activity, perWeek, weeks };
}

const unpre = () => document.documentElement.classList.remove('fnq-pre');
function open(startAt = 0) {
  if (el) return;
  q = { ...fresh(), ...(jget(KEY) || {}) }; if (!q.diet || !Array.isArray(q.diet.diets)) q.diet = fresh().diet;
  step = startAt; dir = 1;
  el = document.createElement('div'); el.className = 'fnq'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Nastavenie plánu');
  el.innerHTML = `<div class="fnq-top"><button class="fnq-back" aria-label="Späť">${BACK}</button><div class="fnq-bar"><i></i></div><span class="fnq-ring-slot"></span></div><div class="fnq-body"></div>`;
  document.body.appendChild(el); setTimeout(unpre, 450);
  el.querySelector('.fnq-back').onclick = () => go(-1);
  draw();
}
function close(toLogin) {
  unpre();
  if (!el) return;
  const e = el; el = null; e.classList.add('out'); setTimeout(() => e.remove(), 340);
  if (toLogin) { jset(SKIP, 1, sessionStorage); document.querySelector('#app [data-m=login]')?.click(); }
}
const save = () => jset(KEY, q);
function go(d) {
  const list = steps(); dir = d;
  let i = step + d;
  if (list[i] === 'calc' && d < 0) i--; // späť z plánu preskočí počítanie
  if (i < 0) return;
  step = Math.min(i, list.length - 1); buzz(); draw();
}

function draw() {
  if (!el) return;
  const list = steps(), id = list[step], qs = list.indexOf('calc'), p = Math.min(1, Math.max(0, (step - 1) / (qs - 1)));
  el.querySelector('.fnq-back').hidden = step === 0 || id === 'calc';
  const top = el.querySelector('.fnq-top'); top.style.visibility = id === 'hello' ? 'hidden' : '';
  el.querySelector('.fnq-bar i').style.width = (id === 'plan' || id === 'account' ? 100 : p * 100) + '%';
  el.querySelector('.fnq-ring-slot').innerHTML = ringSvg(id === 'plan' || id === 'account' ? 1 : p);
  const body = el.querySelector('.fnq-body');
  body.innerHTML = `<div class="fnq-step ${dir < 0 ? 'back' : ''}">${VIEWS[id]()}</div>`;
  body.scrollTop = 0; body.style.overflowY = id === 'hello' ? 'hidden' : '';
  BIND[id]?.(body.firstElementChild);
}

const opt = (v, ic, label, sub, on, multi) => `<button class="fnq-o" type="button" role="${multi ? 'checkbox' : 'radio'}" data-v="${v}" aria-checked="${!!on}">${ic ? `<span class="ic">${ic}</span>` : ''}<div><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</div>${multi || !ic || sub ? '<span class="ck">✓</span>' : ''}</button>`;
const foot = (label = 'Pokračovať', dis = false, extra = '') => `<div class="fnq-foot"><button class="fnq-cta" type="button" ${dis ? 'disabled' : ''}>${label}</button>${extra}</div>`;
const pickOne = (root, key, after) => root.querySelectorAll('.fnq-o').forEach(b => b.onclick = () => {
  q[key] = key === 'days' ? Number(b.dataset.v) : b.dataset.v; save();
  root.querySelectorAll('.fnq-o').forEach(x => x.setAttribute('aria-checked', String(x === b))); buzz();
  after ? after(b) : setTimeout(() => go(1), 230);
});

const daysCap = () => q.days == null ? '' : q.days === 0 ? 'Začneme jedlom a krokmi, tréning pridáš, keď budeš chcieť.' : q.days <= 3 ? 'Ideálne na celé telo, 3 dni stačia na viditeľný rast.' : 'Rozdelíme to na hornú a dolnú časť alebo push, pull, nohy.';
const VIEWS = {
  hello: () => `<div class="fnq-hero">${SEAL}
      <h1>Tvoj plán jedla a tréningu za minútu.</h1>
      <p class="fnq-sub">Pár otázok a appka ti vypočíta plán presne na teba.</p>
      <div class="fnq-feats">
        <div><span class="fi">${ICON.camera}</span><b>Zápis jedla fotkou</b></div>
        <div><span class="fi">${ICON.coach}</span><b>AI kouč na mieru</b></div>
        <div><span class="fi">${ICON.dumbbell}</span><b>Tréningový plán</b></div>
        <div><span class="fi">${ICON.chart}</span><b>Kalórie a makrá</b></div>
        <div><span class="fi">${ICON.people}</span><b>Reální tréneri</b></div>
        <div><span class="fi">${ICON.video}</span><b>Videohovory</b></div>
      </div></div>
    ${foot('Poďme na to', false, '<button class="fnq-link" data-login type="button">Už mám účet. <b>Prihlásiť sa</b></button>')}`,
  goal: () => `<h1>Čo chceš dosiahnuť?</h1><p class="fnq-sub">Podľa toho nastavíme kalórie aj tréning.</p>
    <div class="fnq-opts">${GOALS.map(([v, ic, l, s]) => opt(v, ic, l, s, q.goal === v)).join('')}</div>`,
  sex: () => `<h1>Pohlavie</h1><p class="fnq-sub">Muži a ženy majú iný výdaj energie aj odporúčané minimá.</p>
    <div class="fnq-opts two">${SEX.map(([v, ic, l]) => opt(v, ic, l, '', q.sex === v)).join('')}</div>`,
  age: () => `<h1>V ktorom roku si sa ${q.sex === 'f' ? 'narodila' : 'narodil'}?</h1><p class="fnq-sub">Vek mení bazálny metabolizmus. Fuelwind je pre ľudí od 18 rokov.</p>
    <div class="fnq-num"><div class="fnq-nf"><label><span>Rok narodenia</span><input id="fnqBy" type="number" inputmode="numeric" placeholder="2000" min="1930" max="${YEAR - 18}" value="${h(q.by)}"></label></div></div>
    <p class="fnq-cap" id="fnqCap"></p>${foot('Pokračovať', true)}`,
  body: () => `<h1>Výška a váha</h1><p class="fnq-sub">Stačí približne. Váhu budeš sledovať ako trend, nie jedno číslo.</p>
    <div class="fnq-num">
      <div class="fnq-nf"><label><span>Výška</span><input id="fnqH" type="number" inputmode="numeric" placeholder="178" min="120" max="230" value="${h(q.h)}"></label><em>cm</em><div class="fnq-pm"><button type="button" data-pm="fnqH:-1" aria-label="Menej">−</button><button type="button" data-pm="fnqH:1" aria-label="Viac">+</button></div></div>
      <div class="fnq-nf"><label><span>Váha teraz</span><input id="fnqW" type="number" inputmode="decimal" step="0.1" placeholder="76" min="30" max="300" value="${h(q.w)}"></label><em>kg</em><div class="fnq-pm"><button type="button" data-pm="fnqW:-0.5" aria-label="Menej">−</button><button type="button" data-pm="fnqW:0.5" aria-label="Viac">+</button></div></div>
    </div><p class="fnq-cap" id="fnqCap"></p>${foot('Pokračovať', true)}`,
  target: () => `<h1>${q.goal === 'lose' ? `Akú váhu by si ${q.sex === 'f' ? 'chcela' : 'chcel'} mať?` : 'Kam to chceš dotiahnuť?'}</h1><p class="fnq-sub">Ukážeme ti, za ako dlho je to reálne pri zdravom tempe.</p>
    <div class="fnq-num"><div class="fnq-nf"><label><span>Cieľová váha</span><input id="fnqT" type="number" inputmode="decimal" step="0.5" min="35" max="250" value="${h(q.tw || (Number(q.w) ? (q.goal === 'lose' ? Math.round(Number(q.w) * 0.92) : Math.round(Number(q.w) * 1.05)) : ''))}"></label><em>kg</em><div class="fnq-pm"><button type="button" data-pm="fnqT:-0.5" aria-label="Menej">−</button><button type="button" data-pm="fnqT:0.5" aria-label="Viac">+</button></div></div></div>
    <p class="fnq-cap" id="fnqCap"></p>${foot('Pokračovať', false, '<button class="fnq-link" data-skip type="button">Zatiaľ neviem, preskočiť</button>')}`,
  job: () => `<h1>Ako vyzerá tvoj bežný deň?</h1><p class="fnq-sub">Pohyb mimo tréningu robí viac, než si väčšina ľudí myslí.</p>
    <div class="fnq-opts">${JOBS.map(([v, ic, l, s]) => opt(v, ic, l, s, q.job === v)).join('')}</div>`,
  days: () => `<h1>Koľkokrát týždenne chceš trénovať?</h1><p class="fnq-sub">Aj nula je v poriadku. Plán sa prispôsobí.</p>
    <div class="fnq-opts days">${[0, 1, 2, 3, 4, 5, 6, 7].map(n => opt(n, '', String(n), n === 0 ? 'zatiaľ nie' : n === 1 ? 'raz' : 'krát', q.days === n)).join('')}</div>
    <div class="fnq-week" id="fnqWeek">${['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'].map((d, i) => `<i class="${q.days > i ? 'on' : ''}">${d}</i>`).join('')}</div>
    <p class="fnq-cap" id="fnqCap">${daysCap()}</p>
    ${foot('Pokračovať', q.days == null)}`,
  block: () => `<h1>Čo ti doteraz najviac bránilo?</h1><p class="fnq-sub">Vyber všetko, čo sedí. Appka sa podľa toho nastaví.</p>
    <div class="fnq-opts">${BLOCK.map(([v, ic, l]) => opt(v, ic, l, '', q.block.includes(v), true)).join('')}</div>${foot('Pokračovať', false)}`,
  diet: () => {
    const d = q.diet, any = d.diets.length || d.modes.length;
    return `<h1>Stravuješ sa nejako špecificky?</h1><p class="fnq-sub">Appka podľa toho označí jedlá a nastaví limity. Ak nič z toho, pokračuj ďalej.</p>
    <div class="fnq-h">Ako sa stravuješ</div><div class="fnq-ch">${DIET_KEYS.map(k => `<button type="button" data-d="${k}" aria-pressed="${d.diets.includes(k)}">${h(DIETS[k].title)}</button>`).join('')}</div>
    <div class="fnq-h">Zdravie</div><div class="fnq-ch">${HEALTH.map(([k, l]) => `<button type="button" data-m="${k}" aria-pressed="${d.modes.includes(k)}">${l}</button>`).join('')}</div>
    ${d.modes.includes('diabetes') ? `<div class="fnq-h">Aký typ cukrovky máš?</div><div class="fnq-ch">${Object.entries(dx.DTYPES).map(([k, v]) => `<button type="button" data-t="${k}" aria-pressed="${d.dtype === k}">${h(v.label)}</button>`).join('')}</div>` : ''}
    ${d.modes.includes('allergy') ? `<div class="fnq-h">Na čo máš alergiu?</div><div class="fnq-ch">${dx.ALLERGENS.map(([k, l]) => `<button type="button" data-a="${k}" aria-pressed="${d.allergens.includes(k)}">${h(l)}</button>`).join('')}</div>` : ''}
    ${d.modes.includes('diabetes') && q.goal === 'lose' ? `<p class="fnq-cap">Pri cukrovke sa o chudnutí poraď s lekárom. Appka nepočíta dávky inzulínu ani liekov.</p>` : ''}
    ${any ? `<label class="fnq-cons" id="fnqCons"><input type="checkbox" ${d.consent ? 'checked' : ''}><span>Súhlasím, aby Fuelwind ukladal údaje o mojom zdraví a stravovaní na účely týchto funkcií. Súhlas môžeš kedykoľvek odvolať v Profile.</span></label>` : ''}
    ${foot(any ? 'Pokračovať' : 'Preskočiť', false)}`;
  },
  src: () => `<h1>Kde si o nás ${q.sex === 'f' ? 'počula' : 'počul'}?</h1><p class="fnq-sub">Pomôže nám to dostať appku k ďalším ľuďom ako ty.</p>
    <div class="fnq-opts src">${SRC.map(([v, ic, l]) => opt(v, ic, l, '', q.src === v)).join('')}</div>`,
  calc: () => `<div class="fnq-calc">${ringSvg(0, 'big', 7)}<h1>Skladám tvoj plán</h1>
    <ul class="fnq-list"><li><i>✓</i>Počítam tvoj denný výdaj energie</li><li><i>✓</i>Nastavujem bielkoviny pre tvoj cieľ</li><li><i>✓</i>Rozdeľujem sacharidy a tuky</li><li><i>✓</i>Pripravujem AI kouča</li></ul></div>`,
  plan: () => {
    const t = plan(), pw = t.perWeek, end = t.weeks ? new Date(Date.now() + t.weeks * 7 * 864e5) : null;
    const proj = q.goal === 'maintain' ? ['Držíme váhu, budujeme formu', 'Jedlo okolo tvojho výdaja, dosť bielkovín a sila v tréningu.']
      : [`${pw > 0 ? '+' : '−'}${nf(Math.round(Math.abs(pw) * 20) / 20, 2).replace(/0$/, '')} kg týždenne`, end ? `Cieľ ${nf(Number(q.tw), 1)} kg približne ${end.toLocaleDateString('sk-SK', { day: 'numeric', month: 'long' })}${t.weeks > 52 ? ' budúceho roka' : ''}. Bezpečné tempo, bez hladovania.` : 'Bezpečné tempo, ktoré sa dá vydržať. Appka ho každý týždeň doladí podľa tvojej váhy.'];
    const fixes = (q.block.length ? q.block : ['time', 'what']).slice(0, 3).map(k => FIX[k]).filter(Boolean);
    return `<div class="fnq-plan"><div class="tag">✦ Tvoj plán je hotový</div><h1>${h(GOALS.find(g => g[0] === q.goal)?.[2] || 'Tvoj plán')}</h1>
      <div class="fnq-ring">${ringSvg(0, '', 8, false).replace('class=""', 'class="pr"')}<div><b data-kc="${t.kcal}">0</b><small>kcal denne</small></div></div>
      <div class="fnq-mac"><div><b>${t.protein} g</b><span><i style="background:#7CFFB2"></i>bielkoviny</span></div><div><b>${t.carbs} g</b><span><i style="background:#5BB8FF"></i>sacharidy</span></div><div><b>${t.fat} g</b><span><i style="background:#FFC857"></i>tuky</span></div></div>
      <div class="fnq-proj"><b>${proj[0]}</b><span>${proj[1]}</span></div>
      <ul class="fnq-why">${fixes.map(([ic, b, s]) => `<li><i>${ic}</i><div><b>${b}</b><span>${s}</span></div></li>`).join('')}</ul></div>
      ${foot('Uložiť plán')}`;
  },
  account: () => {
    const t = plan();
    return `<h1>Ulož si plán</h1><p class="fnq-sub">Vytvor si účet a plán máš na všetkých zariadeniach. Bez reklám.</p>
      <div class="fnq-mini-plan">${ringSvg(1, '', 10)}<div><b>${nf(t.kcal)} kcal</b><span>B ${t.protein} g · S ${t.carbs} g · T ${t.fat} g</span></div></div>
      <form class="fnq-form" id="fnqAcc" novalidate>
        <label class="fnq-in"><span>Ako ťa máme volať</span><input name="name" autocomplete="given-name" required maxlength="40" value="${h(q.name)}" placeholder="Meno"></label>
        <label class="fnq-in"><span>E-mail</span><input name="email" type="email" autocomplete="email" inputmode="email" required placeholder="ty@email.sk"></label>
        <label class="fnq-in"><span>Heslo</span><input name="password" type="password" autocomplete="new-password" required minlength="6" placeholder="aspoň 6 znakov"></label>
        <label class="fnq-ok"><input type="checkbox" name="ok"><span>Mám aspoň 18 rokov a súhlasím s <a href="podmienky.html" target="_blank" rel="noopener">podmienkami</a> a <a href="zasady.html" target="_blank" rel="noopener">zásadami ochrany súkromia</a>. Appka nenahrádza lekára.</span></label>
        <p class="fnq-err" id="fnqErr" hidden></p>
      </form>
      ${foot('Vytvoriť účet', false, '<button class="fnq-link" data-login type="button">Už mám účet. <b>Prihlásiť sa</b></button>')}`;
  },
};

function numStep(root, ids, valid, cap) {
  const ins = ids.map(i => root.querySelector('#' + i)), cta = root.querySelector('.fnq-cta');
  const check = () => { const r = valid(); cta.disabled = !r.ok; root.querySelector('#fnqCap').textContent = r.msg || ''; return r.ok; };
  ins.forEach(inp => { inp.oninput = () => { cap(); check(); }; inp.onkeydown = e => { if (e.key === 'Enter' && check()) go(1); }; });
  root.querySelectorAll('[data-pm]').forEach(b => b.onclick = () => {
    const [id, d] = b.dataset.pm.split(':'), inp = root.querySelector('#' + id);
    const v = (Number(inp.value) || Number(inp.placeholder) || 0) + Number(d);
    inp.value = String(Math.round(v * 10) / 10); buzz(); cap(); check();
  });
  cta.onclick = () => { if (check()) go(1); };
  check();
  setTimeout(() => { if (!ins[0].value) ins[0].focus({ preventScroll: true }); }, 380);
}

const BIND = {
  hello: r => { r.querySelector('.fnq-cta').onclick = () => go(1); r.querySelector('[data-login]').onclick = () => close(true); },
  goal: r => pickOne(r, 'goal'),
  sex: r => pickOne(r, 'sex'),
  age: r => numStep(r, ['fnqBy'], () => {
    const y = Number(q.by);
    if (!y || String(q.by).length < 4) return { ok: false };
    if (y > YEAR - 18) return { ok: false, msg: 'Fuelwind je zatiaľ len pre ľudí od 18 rokov.' };
    if (y < 1930) return { ok: false, msg: 'Skontroluj rok.' };
    return { ok: true, msg: `${YEAR - y} rokov` };
  }, () => { q.by = r.querySelector('#fnqBy').value; save(); }),
  body: r => numStep(r, ['fnqH', 'fnqW'], () => {
    const hh = Number(q.h), ww = Number(q.w);
    if (!(hh >= 120 && hh <= 230 && ww >= 30 && ww <= 300)) return { ok: false };
    const bmi = ww / ((hh / 100) ** 2);
    return { ok: true, msg: `BMI ${nf(bmi, 1)}. Pri tréningu je to len orientačné číslo, sledovať budeme trend a pás.` };
  }, () => { q.h = r.querySelector('#fnqH').value; q.w = r.querySelector('#fnqW').value; save(); }),
  target: r => {
    const inp = r.querySelector('#fnqT');
    const cap = () => {
      q.tw = inp.value; save();
      const t = plan(), c = r.querySelector('#fnqCap'), d = Number(q.tw) - Number(q.w);
      if (!Number(q.tw)) { c.textContent = ''; return; }
      if ((q.goal === 'lose' && d >= 0) || (q.goal === 'gain' && d <= 0)) { c.textContent = q.goal === 'lose' ? 'Cieľ je vyšší ako tvoja váha teraz.' : 'Cieľ je nižší ako tvoja váha teraz.'; return; }
      c.textContent = t.weeks ? `Pri zdravom tempe približne ${t.weeks} ${t.weeks < 5 ? 'týždne' : 'týždňov'}.` : '';
    };
    numStep(r, ['fnqT'], () => ({ ok: true }), cap); cap();
    r.querySelector('[data-skip]').onclick = () => { q.tw = ''; save(); go(1); };
  },
  job: r => pickOne(r, 'job'),
  days: r => {
    const cta = r.querySelector('.fnq-cta');
    r.querySelectorAll('.fnq-o').forEach(b => b.onclick = () => {
      q.days = Number(b.dataset.v); save(); buzz();
      r.querySelectorAll('.fnq-o').forEach(x => x.setAttribute('aria-checked', String(x === b)));
      r.querySelectorAll('#fnqWeek i').forEach((d, i) => d.classList.toggle('on', q.days > i));
      r.querySelector('#fnqCap').textContent = daysCap(); cta.disabled = false;
    });
    cta.onclick = () => { if (q.days != null) go(1); };
  },
  block: r => {
    r.querySelectorAll('.fnq-o').forEach(b => b.onclick = () => {
      const v = b.dataset.v; q.block = q.block.includes(v) ? q.block.filter(x => x !== v) : [...q.block, v]; save(); buzz();
      b.setAttribute('aria-checked', String(q.block.includes(v)));
    });
    r.querySelector('.fnq-cta').onclick = () => go(1);
  },
  diet: r => {
    const d = q.diet, FG = ['vegetarian', 'vegan', 'pescatarian'], re = () => { save(); const y = r.parentElement.scrollTop; draw(); const b = el.querySelector('.fnq-body'); b.scrollTop = y; };
    r.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { const k = b.dataset.d; d.diets = d.diets.includes(k) ? d.diets.filter(x => x !== k) : [...d.diets.filter(x => !(FG.includes(k) && FG.includes(x))), k]; buzz(); re(); });
    r.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { const k = b.dataset.m; d.modes = d.modes.includes(k) ? d.modes.filter(x => x !== k) : [...d.modes, k]; buzz(); re(); });
    r.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { d.dtype = b.dataset.t; buzz(); re(); });
    r.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { const k = b.dataset.a; d.allergens = d.allergens.includes(k) ? d.allergens.filter(x => x !== k) : [...d.allergens, k]; buzz(); re(); });
    const c = r.querySelector('#fnqCons input'); if (c) c.onchange = () => { d.consent = c.checked; save(); r.querySelector('#fnqCons').classList.remove('bad'); };
    r.querySelector('.fnq-cta').onclick = () => {
      const any = d.diets.length || d.modes.length;
      if (any && !d.consent) { const l = r.querySelector('#fnqCons'); l.classList.add('bad'); l.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
      if (d.modes.includes('allergy') && !d.allergens.length) { r.querySelector('.fnq-cta').textContent = 'Vyber aspoň jeden alergén'; return; }
      go(1);
    };
  },
  src: r => pickOne(r, 'src'),
  calc: r => {
    const lis = r.querySelectorAll('.fnq-list li'), path = r.querySelector('.big .p');
    requestAnimationFrame(() => requestAnimationFrame(() => { if (path) path.style.strokeDashoffset = '0'; }));
    const T = reduce() ? 150 : 650;
    lis.forEach((li, i) => setTimeout(() => { li.classList.add('on'); buzz(); }, T * (i + 1)));
    setTimeout(() => { if (el && steps()[step] === 'calc') go(1); }, T * (lis.length + 1) + 250);
  },
  plan: r => {
    const t = plan(), svg = r.querySelector('.fnq-ring svg');
    // prstenec z loga rozdelený na makrá: bielkoviny, sacharidy, tuky
    const cal = [t.protein * 4, t.carbs * 4, t.fat * 9], sum = cal.reduce((a, b) => a + b, 0) || 1, COL = ['#7CFFB2', '#5BB8FF', '#FFC857'];
    svg.querySelectorAll('.p, circle').forEach(x => x.remove());
    let start = 0;
    cal.forEach((c, i) => {
      const len = (c / sum) * 100, s = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      s.setAttribute('d', ARC); s.setAttribute('pathLength', '100'); s.setAttribute('class', 'seg'); s.setAttribute('stroke', COL[i]); s.setAttribute('stroke-width', '8');
      s.setAttribute('stroke-dasharray', `0 100`); s.setAttribute('stroke-dashoffset', String(-start));
      svg.appendChild(s);
      const gap = i < 2 ? 1.6 : 0;
      setTimeout(() => { s.setAttribute('stroke-dasharray', `${Math.max(0, len - gap)} ${100 - len + gap}`); }, 120 + i * 180);
      start += len;
    });
    const b = r.querySelector('[data-kc]'), to = Number(b.dataset.kc), t0 = performance.now();
    if (reduce()) b.textContent = nf(to);
    else { const stp = tt => { const k = Math.min(1, (tt - t0) / 1100); b.textContent = nf(to * (1 - Math.pow(1 - k, 3))); if (k < 1 && b.isConnected) requestAnimationFrame(stp); }; requestAnimationFrame(stp); }
    r.querySelector('.fnq-cta').onclick = () => go(1);
  },
  account: r => {
    const f = r.querySelector('#fnqAcc'), cta = r.querySelector('.fnq-cta'), err = r.querySelector('#fnqErr');
    const fail = m => { err.textContent = m; err.hidden = false; cta.disabled = false; cta.textContent = 'Vytvoriť účet'; };
    r.querySelector('[data-login]').onclick = () => close(true);
    f.onsubmit = e => { e.preventDefault(); cta.click(); };
    cta.onclick = async () => {
      const d = new FormData(f), name = String(d.get('name') || '').trim(), email = String(d.get('email') || '').trim(), pw = String(d.get('password') || '');
      err.hidden = true;
      if (!name) return fail('Napíš, ako ťa máme volať.');
      if (!/^\S+@\S+\.\S+$/.test(email)) return fail('Skontroluj e-mail.');
      if (pw.length < 6) return fail('Heslo musí mať aspoň 6 znakov.');
      if (!d.get('ok')) return fail('Potvrď, že máš aspoň 18 rokov a súhlasíš s podmienkami.');
      q.name = name; q.done = true; save();
      cta.disabled = true; cta.textContent = 'Vytváram účet…';
      try {
        const res = await db.signUp(email, pw, name);
        if (!res?.session) {
          r.innerHTML = `<div class="fnq-calc">${ringSvg(1, 'big', 7)}<h1>Potvrď e-mail</h1><p class="fnq-sub" style="margin:8px auto 0">Poslali sme ti odkaz na ${h(email)}. Po potvrdení sa prihlás a tvoj plán sa uloží automaticky.</p></div>${foot('Prihlásiť sa')}`;
          r.querySelector('.fnq-cta').onclick = () => close(true);
          return;
        }
        cover('Ukladám tvoj plán…');
        close(false);
      } catch (e2) {
        const m = String(e2?.message || '');
        fail(/already|registered|exists/i.test(m) ? 'Tento e-mail už má účet. Prihlás sa.' : /network|fetch/i.test(m) ? 'Bez internetu. Skús to znova.' : m || 'Účet sa nepodarilo vytvoriť.');
      }
    };
  },
};

// ---------- po vytvorení účtu: vyplnenie a uloženie onboardingu z kvízu ----------
let coverEl = null;
function cover(text) {
  if (!coverEl) { coverEl = document.createElement('div'); coverEl.className = 'fnq-cover'; document.body.appendChild(coverEl); }
  coverEl.innerHTML = `${ringSvg(0.72, '', 8)}<div>${h(text)}</div>`;
  clearTimeout(cover.t); cover.t = setTimeout(uncover, 15000);
}
function uncover() { coverEl?.remove(); coverEl = null; }

let filling = false;
async function autofill(form) {
  const data = jget(KEY);
  if (filling || !data?.done || ctx.state?.profile?.onboarded) return;
  filling = true; cover('Ukladám tvoj plán…');
  const set = (n, v) => { const c = form.querySelector(`[name=${n}]`); if (!c || v == null || v === '') return; c.value = String(v); c.dispatchEvent(new Event('input', { bubbles: true })); c.dispatchEvent(new Event('change', { bubbles: true })); };
  try {
    for (let i = 0; i < 30 && !form.querySelector('.ob-act'); i++) await new Promise(r => setTimeout(r, 100));
    set('name', data.name); set('sex', data.sex); set('birth_year', data.by); set('height_cm', data.h); set('weight', data.w); set('goal', data.goal); set('training_days', data.days ?? 3);
    form.querySelector(`.ob-act [data-g=job] [data-v="${data.job || 'desk'}"]`)?.click();
    form.querySelector('.ob-act [data-g=steps] [data-v="auto"]')?.click();
    const adult = form.querySelector('[name=adult]'); if (adult) adult.checked = true;
    await new Promise(r => setTimeout(r, 120));
    try { localStorage.setItem('fw_first_done', '1'); } catch (_) { /* nič */ }
    const before = location.hash;
    form.requestSubmit ? form.requestSubmit() : form.querySelector('button[type=submit]')?.click();
    for (let i = 0; i < 100 && location.hash === before; i++) await new Promise(r => setTimeout(r, 100));
    if (location.hash !== before && ctx.state?.profile?.onboarded) {
      const intake = { block: data.block || [], src: data.src || null, target_weight: Number(data.tw) || null, v: 1, at: new Date().toISOString() };
      try { await db.sb.from('profiles').update({ intake }).eq('id', ctx.state.profile.id); } catch (_) { /* intake je bonus */ }
      try {
        const dd = data.diet || {}, any = (dd.diets?.length || 0) + (dd.modes?.length || 0) > 0;
        if (any && dd.consent) {
          await dx.ensure(ctx.state.profile.id);
          const patch = { diets: dd.diets, modes: dd.modes, allergens: dd.modes.includes('allergy') ? dd.allergens : [], consent: new Date().toISOString(), hide: true };
          if (dd.modes.includes('diabetes')) { const t = dx.DTYPES[dd.dtype]; if (t) Object.assign(patch, { dtype: dd.dtype, lo: t.lo, hi: t.hi, fast: t.fast, insulin: t.insulin }); }
          await dx.saveCfg(ctx.state.profile.id, patch);
        }
      } catch (_) { /* nastavenia sa dajú doplniť v Profile */ }
      jset(KEY, null);
    }
  } catch (_) { /* ak niečo zlyhá, človek vidí vyplnený formulár a uloží ho sám */ }
  finally { filling = false; uncover(); }
}

// ---------- kedy sa kvíz ukáže ----------
function scan() {
  const app = document.getElementById('app'); if (!app) return;
  const onb = app.querySelector('#onb');
  if (onb) { unpre(); if (el) close(false); autofill(onb); return; }
  const auth = app.querySelector('#authf');
  if (!auth) { if (ctx.state?.session) unpre(); if (el && ctx.state?.session) close(false); return; }
  // tlačidlo Registrovať otvorí kvíz
  const reg = app.querySelector('[data-m=register]');
  if (reg && !reg.dataset.fnq) { reg.dataset.fnq = '1'; reg.addEventListener('click', e => { e.preventDefault(); e.stopImmediatePropagation(); jset(SKIP, null, sessionStorage); open(jget(KEY)?.goal ? 1 : 0); }, true); }
  if (!el && !jget(SKIP, sessionStorage) && !known()) open(0); else unpre();
}
const app = document.getElementById('app');
if (app) new MutationObserver(scan).observe(app, { childList: true, subtree: true });
scan();
