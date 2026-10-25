// Registrácia ako v top appkách (Cal AI, Noom): najprv krátky kvíz, potom „tvoj plán je hotový“ a až potom účet.
// Človek vidí hodnotu skôr, než dá e-mail. Signatúra: otvorený prstenec z loga sa s každou odpoveďou dokresľuje a na konci
// sa z neho stane kalorický prstenec s makrami. Odpovede sa držia v zariadení (fw_quiz); po vytvorení účtu sa nimi sám
// vyplní a uloží pôvodný onboarding (žiadna zmena v app.js), a do profilu sa uloží aj intake (prekážky, odkiaľ prišiel, cieľová váha).
import * as db from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';
import { cookie, biteTo } from './brandmark.js';
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
  font-feature-settings:"tnum" 1}
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
/* v2 karty */
.tl{flex:none;position:relative;width:54px;height:54px;border-radius:17px;display:grid;place-items:center;color:var(--c);background:linear-gradient(145deg,color-mix(in srgb,var(--c) 28%,var(--bg-2,#10141a)),color-mix(in srgb,var(--c) 8%,var(--bg-2,#10141a)));border:1px solid color-mix(in srgb,var(--c) 38%,transparent);box-shadow:inset 0 1px 0 #ffffff14}
.tl svg{width:27px;height:27px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.fnq-o.v2{gap:14px;min-height:80px;padding:12px 16px 12px 12px;border-radius:22px;overflow:hidden}
.fnq-o.v2::before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(90% 150% at 0% 50%,color-mix(in srgb,var(--c) 15%,transparent),transparent 72%)}
.fnq-o.v2>*{position:relative}
.fnq-o.v2[aria-checked=true]{border-color:var(--c);background:color-mix(in srgb,var(--c) 9%,var(--card,#151a21));box-shadow:0 0 0 4px color-mix(in srgb,var(--c) 16%,transparent)}
.fnq-o.v2[aria-checked=true] .ck{background:var(--c);border-color:var(--c);color:#06130C}
.fnq-o.v2.big{min-height:100px}.fnq-opts:has(.big){gap:12px}.fnq-o.v2.big .tl{width:62px;height:62px;border-radius:19px}.fnq-o.v2.big .tl svg{width:30px;height:30px}
.fnq-o.v2.big b{font-size:18px}
.fnq-o .pl{display:inline-block;margin-top:7px;font-style:normal;font-size:12px;font-weight:700;padding:3px 10px;border-radius:99px;color:var(--c);background:color-mix(in srgb,var(--c) 14%,transparent)}
.fnq-o .bars{display:flex;gap:3px;align-items:flex-end;margin-left:auto;height:24px}
.fnq-o .bars i{width:6px;border-radius:3px;background:var(--line,#232a33);transition:background .2s}
.fnq-o .bars i:nth-child(1){height:9px}.fnq-o .bars i:nth-child(2){height:16px}.fnq-o .bars i:nth-child(3){height:24px}
.fnq-o .bars i.on{background:var(--c)}.fnq-o .bars+.ck{margin-left:4px}
.fnq-opts.tight{gap:8px}
.fnq-opts.tight .fnq-o.v2{min-height:54px;padding:7px 14px 7px 8px;border-radius:18px}
.fnq-opts.tight .tl{width:40px;height:40px;border-radius:12px}.fnq-opts.tight .tl svg{width:21px;height:21px}
.fnq-opts.tight .fnq-o b{font-size:15.5px;line-height:1.2}
.fnq-opts.two .fnq-o.v2{flex-direction:column;justify-content:center;gap:14px;min-height:184px;padding:20px 10px}
.fnq-opts.two .fnq-o.v2::before{background:radial-gradient(90% 90% at 50% 0%,color-mix(in srgb,var(--c) 20%,transparent),transparent 75%)}
.fnq-opts.two .fnq-o.v2 .tl{width:84px;height:84px;border-radius:50%}.fnq-opts.two .fnq-o.v2 .tl svg{width:40px;height:40px}
.fnq-opts.two .fnq-o.v2 b{font-size:20px}
.fnq-opts.two .fnq-o.v2 .ck{position:absolute;top:12px;right:12px;margin:0}
.fnq-bigin{padding:18px 18px 14px;border-radius:26px;text-align:center;background:radial-gradient(120% 120% at 50% 0%,color-mix(in srgb,var(--accent,#7CFFB2) 13%,transparent),transparent 70%),var(--card,#151a21);border:1.5px solid var(--line,#232a33);transition:border-color .18s}
.fnq-bigin:focus-within{border-color:var(--accent,#7CFFB2)}
.fnq-bigin label span{display:block;font-size:13px;color:var(--muted,#8a94a3);font-weight:600}
.fnq-bigin input{width:100%;text-align:center;border:0;background:transparent;color:var(--text,#fff);font:inherit;font-size:72px;font-weight:800;letter-spacing:-.045em;outline:none;padding:2px 0;font-variant-numeric:tabular-nums;-moz-appearance:textfield}
.fnq-bigin input::-webkit-outer-spin-button,.fnq-bigin input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.fnq-bigin input::placeholder{color:color-mix(in srgb,var(--text,#fff) 18%,transparent)}
.fnq-age{min-height:26px;font-size:16px;font-weight:700;color:var(--accent,#7CFFB2)}
.fnq-yrs{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 0;justify-content:center}
.fnq-yrs button{appearance:none;-webkit-appearance:none;height:40px;padding:0 16px;border-radius:99px;border:1.5px solid var(--line,#232a33);background:var(--card,#151a21);color:var(--text,#fff);font:inherit;font-size:15px;font-weight:700;font-variant-numeric:tabular-nums;cursor:pointer}
.fnq-yrs button:active{transform:scale(.95)}
.fnq-nf .mi{flex:none;width:46px;height:46px;border-radius:15px;display:grid;place-items:center;margin-right:2px;color:var(--accent,#7CFFB2);background:color-mix(in srgb,var(--accent,#7CFFB2) 12%,var(--bg-2,#10141a))}
.fnq-nf .mi svg{width:23px;height:23px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.fnq-bmi{margin:20px 4px 0}.fnq-bmi[hidden]{display:none}
.fnq-bmi .tr{position:relative;height:12px;border-radius:99px;background:linear-gradient(90deg,#5BB8FF 0%,#6FE6C8 14%,#7CFFB2 27%,#C9E58A 40%,#FFC857 55%,#FF9A52 75%,#FF7A4C 100%);box-shadow:0 0 18px color-mix(in srgb,#7CFFB2 14%,transparent)}
.fnq-bmi .tr i{position:absolute;top:50%;width:20px;height:20px;border-radius:50%;background:#fff;border:3px solid var(--bg,#0B0E12);box-shadow:0 2px 8px #0008;transform:translate(-50%,-50%);transition:left .35s cubic-bezier(.3,1,.4,1)}
.fnq-bmi .lb{position:relative;height:16px;margin-top:8px;font-size:11px;color:var(--muted,#8a94a3)}.fnq-bmi .lb span{position:absolute;transform:translateX(-50%);white-space:nowrap}
.fnq-week{gap:6px}.fnq-week i{width:38px;height:38px;border-radius:12px}
.fnq-week i svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round}
.fnq-sec{margin:0 0 12px;padding:14px;border-radius:22px;background:var(--card,#151a21);border:1.5px solid var(--line,#232a33)}
.fnq-sec header{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.fnq-sec header .tl{width:44px;height:44px;border-radius:14px}.fnq-sec header .tl svg{width:22px;height:22px}
.fnq-sec header b{display:block;font-size:16px;letter-spacing:-.01em}.fnq-sec header small{display:block;font-size:12.5px;color:var(--muted,#8a94a3);margin-top:1px}
.fnq-sec header em{margin-left:auto;min-width:24px;height:24px;padding:0 6px;border-radius:99px;display:grid;place-items:center;font-style:normal;font-size:13px;font-weight:800;background:var(--accent,#7CFFB2);color:var(--accent-ink,#06130C)}
.fnq-sec .fnq-h{margin:14px 0 8px}
.fnq-ch button{display:inline-flex;align-items:center}
.fnq-ch button i{display:inline-grid;width:0;opacity:0;overflow:hidden;transition:all .18s;color:var(--accent,#7CFFB2)}
.fnq-ch button i svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
.fnq-ch button[aria-pressed=true] i{width:16px;opacity:1;margin-right:7px}
.fnq-why li i{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;font-size:0;color:var(--accent,#7CFFB2);background:color-mix(in srgb,var(--accent,#7CFFB2) 14%,var(--bg-2,#10141a))}
.fnq-why li i svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
@media (max-height:720px){.fnq-opts.tight .fnq-o.v2{min-height:50px;padding-top:5px;padding-bottom:5px}.fnq-opts.tight .tl{width:36px;height:36px}.fnq-opts.tight{gap:6px}.fnq h1{font-size:26px}.fnq .fnq-sub{margin:6px 0 14px}}
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
function ringSvg(p, cls = 'fnq-mini', w = 9, ck = true, live = false) {
  const a = A0 + SPAN * Math.max(0.001, p), [dx, dy] = pt(a);
  // sušienka v strede prstenca (znak appky); live = celá na začiatku, s postupom sa odhryzuje a otáča k bodke
  const inner = ck ? cookie('fq' + (++ckN), live ? 0 : 15, live ? p : 1).replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '') : '';
  const c = ck ? `<g class="gt-ck"><g class="gt-cr" transform="translate(50 50) rotate(${live ? (a + 45).toFixed(1) : 0}) scale(0.2235)">${inner}</g></g>` : '';
  return `<svg class="${cls}" viewBox="0 0 100 100" fill="none" stroke-linecap="round" aria-hidden="true">
    <g class="rgp"><path d="${ARC}" style="stroke:var(--line,#232a33)" stroke-width="${w}"/>
    <path class="p" d="${ARC}" pathLength="100" style="stroke:var(--accent,#7CFFB2)" stroke-width="${w}" stroke-dasharray="100" stroke-dashoffset="${100 - p * 100}"/>
    <circle class="dt" cx="${dx.toFixed(2)}" cy="${dy.toFixed(2)}" r="${w * 0.62}" style="fill:var(--fnq-dot)"/></g>${c}</svg>`;
}
// plynulé posunutie existujúceho prstenca na hodnotu p: oblúk, bodka, otočenie a odhryznutie sušienky idú spolu
function setRing(svg, p) {
  const a = A0 + SPAN * Math.max(0.001, p), [dx, dy] = pt(a), path = svg.querySelector('.p'), dot = svg.querySelector('.dt'), cr = svg.querySelector('.gt-cr');
  if (path) { path.style.transition = 'none'; path.setAttribute('stroke-dashoffset', 100 - p * 100); }
  if (dot) { dot.setAttribute('cx', dx.toFixed(2)); dot.setAttribute('cy', dy.toFixed(2)); }
  if (cr) { cr.setAttribute('transform', `translate(50 50) rotate(${(a + 45).toFixed(1)}) scale(0.2235)`); biteTo(cr, p); }
}
let ringP = 0;
function tweenRing(svg, from, to, ms = 520) {
  cancelAnimationFrame(svg._raf);
  if (reduce() || from === to) { setRing(svg, to); return; }
  const t0 = performance.now(), e = t => t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
  const f = now => { const k = Math.min(1, (now - t0) / ms); setRing(svg, from + (to - from) * e(k)); if (k < 1 && svg.isConnected) svg._raf = requestAnimationFrame(f); };
  svg._raf = requestAnimationFrame(f);
}

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
  check: I('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  ruler: I('<rect x="3" y="8" width="18" height="8" rx="1.5"/><path d="M7 8v3M11 8v4M15 8v3M19 8v2"/>'),
  flame: I('<path d="M12 3c.6 3.2 5 5.2 5 10.2a5 5 0 01-10 0c0-2.2 1-3.6 2.2-4.6.1 1.8.9 2.8 1.9 3.1C10.5 9.5 10.6 6 12 3z"/>'),
  scale: I('<path d="M12 4v16M8 20h8M4.5 7.5h15M4.5 7.5L2.5 13a2.5 2.5 0 005 0zM19.5 7.5L17.5 13a2.5 2.5 0 005 0z"/>'),
  trend: I('<path d="M3.5 17l6-6 4 4 7-8.5M15 6.5h5.5V12"/>'),
  male: I('<circle cx="10" cy="14" r="5"/><path d="M14 10l6-6M15 4h5v5"/>'),
  female: I('<circle cx="12" cy="9" r="5"/><path d="M12 14v7M9 18h6"/>'),
  laptop: I('<rect x="5" y="5" width="14" height="10" rx="2"/><path d="M2.5 19h19"/>'),
  person: I('<circle cx="12" cy="5" r="2.2"/><path d="M12 8.5v6M8 11.5h8M9 21l3-6.5 3 6.5"/>'),
  helmet: I('<path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5zM3.5 7.5L12 12l8.5-4.5M12 12v9"/>'),
  clock: I('<circle cx="12" cy="13" r="8"/><path d="M12 9v4.2l2.8 1.8M10 3h4"/>'),
  help: I('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.6a2.5 2.5 0 114 2c-1 .7-1.5 1.2-1.5 2.4M12 17h.01"/>'),
  utensils: I('<path d="M7 3v7a2 2 0 002 2v9M7 3v5M11 3v5M17 3c-2.2 1.8-2.6 6-.5 8.5V21"/>'),
  candy: I('<rect x="6" y="8" width="12" height="8" rx="4"/><path d="M6 12l-3.5-2.5v5zM18 12l3.5-2.5v5z"/>'),
  down: I('<path d="M3.5 7l6 6 4-4 7 8.5M20.5 12v5.5H15"/>'),
  pulse: I('<path d="M12 20s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.5-7 10-7 10z"/><path d="M7.5 11.5h3l1.5-2.5 2 4.5 1-2H17"/>'),
  leaf: I('<path d="M5 19C5 9 10 5 20 5c0 10-4.5 15-13.5 15M5 19l8-8"/>'),
  compass: I('<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>'),
  moon: I('<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/>'),
  repeat: I('<path d="M4 11V9a3 3 0 013-3h11l-3-3M20 13v2a3 3 0 01-3 3H6l3 3"/>'),
  bolt: I('<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>'),
  coach: I('<path d="M5 5h14a2 2 0 012 2v8a2 2 0 01-2 2h-7l-5 4v-4H5a2 2 0 01-2-2V7a2 2 0 012-2z"/>'),
};
const GOALS = [['lose', ICON.flame, 'Schudnúť', 'zhodiť tuk, udržať svaly', '#FF8A4C', 'kalórie pod výdajom'], ['maintain', ICON.scale, 'Udržať váhu', 'jesť vyvážene, cítiť sa lepšie', '#5BB8FF', 'kalórie na úrovni výdaja'], ['gain', ICON.trend, 'Nabrať svaly', 'rásť bez zbytočného tuku', '#7CFFB2', 'kalórie nad výdajom']];
const SEX = [['m', ICON.male, 'Muž', '#5BB8FF'], ['f', ICON.female, 'Žena', '#FF8AC6']];
const JOBS = [['desk', ICON.laptop, 'Sedím väčšinu dňa', 'škola, kancelária', '#5BB8FF', 1], ['stand', ICON.person, 'Som veľa na nohách', 'obchod, gastro, učenie', '#FFC857', 2], ['phys', ICON.helmet, 'Fyzická práca', 'stavba, sklad, záhrada', '#FF8A4C', 3]];
const BLOCK = [['time', ICON.clock, 'Zapisovanie ma zdržiava'], ['what', ICON.help, 'Neviem, čo mám jesť'], ['out', ICON.utensils, 'Často jem vonku alebo v jedálni'], ['sweet', ICON.candy, 'Chute na sladké a večerné jedenie'], ['motiv', ICON.down, 'Vydržím pár dní a prestanem'], ['train', ICON.dumbbell, 'Neviem, ako trénovať'], ['health', ICON.pulse, 'Cukrovka, celiakia, alergia alebo diéta ma obmedzujú']];
const HEALTH = [['diabetes', 'Cukrovka'], ['celiac', 'Celiakia'], ['lactose', 'Intolerancia laktózy'], ['allergy', 'Alergia na potraviny'], ['salt', 'Vysoký tlak']];
const SRC = [['instagram', ICON.camera, 'Instagram'], ['tiktok', ICON.music, 'TikTok'], ['facebook', ICON.people, 'Facebook'], ['youtube', ICON.play, 'YouTube'], ['gym', ICON.dumbbell, 'Fitko alebo tréner'], ['friend', ICON.heart, 'Kamarát'], ['store', ICON.search, 'Google alebo obchod s appkami'], ['other', ICON.spark, 'Iné']];
const FIX = {
  time: [ICON.bolt, 'Zápis za 3 sekundy', 'napíš, nadiktuj alebo odfoť, čo máš na tanieri. AI spočíta zvyšok.'],
  what: [ICON.compass, 'Vždy vieš, čo zjesť ďalej', 'návrhy jedál podľa zvyšných kalórií a bielkovín.'],
  out: [ICON.utensils, 'Odfoť denné menu', 'AI ti z lístka vyberie jedlo, ktoré ti dnes sedí najviac.'],
  sweet: [ICON.moon, 'Plán aj na chute', 'kouč ti pomôže rozložiť kalórie tak, aby ostalo aj na niečo sladké.'],
  motiv: [ICON.repeat, 'Séria, ktorá odpúšťa', 'jeden vynechaný deň ťa nevráti na nulu. Kouč ťa podrží.'],
  health: [ICON.pulse, 'Jedlá podľa tvojho zdravia', 'appka označí, čo ti nesedí, a upozorní ťa pred zápisom.'],
  train: [ICON.trend, 'Tréningový plán na mieru', 'podľa tvojich dní, s radou, kedy pridať váhu.'],
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

// posúvať sa dá len to, čo sa naozaj nezmestí (inak by tam bol zbytočný posuvník)
function fitScroll() {
  const b = el?.querySelector('.fnq-body'); if (!b) return;
  b.style.overflowY = 'hidden';
  requestAnimationFrame(() => { if (b.isConnected) b.style.overflowY = b.scrollHeight > b.clientHeight + 2 ? 'auto' : 'hidden'; });
}
addEventListener('resize', () => fitScroll());
function draw() {
  if (!el) return;
  const list = steps(), id = list[step], qs = list.indexOf('calc'), p = Math.min(1, Math.max(0, (step - 1) / (qs - 1)));
  el.querySelector('.fnq-back').hidden = step === 0 || id === 'calc';
  const top = el.querySelector('.fnq-top'); top.style.visibility = id === 'hello' ? 'hidden' : '';
  el.querySelector('.fnq-bar i').style.width = (id === 'plan' || id === 'account' ? 100 : p * 100) + '%';
  const slot = el.querySelector('.fnq-ring-slot'), tp = id === 'plan' || id === 'account' ? 1 : p;
  if (!slot.firstElementChild) { slot.innerHTML = ringSvg(0, 'fnq-mini', 9, true, true); ringP = 0; }
  tweenRing(slot.firstElementChild, ringP, tp); ringP = tp;
  const body = el.querySelector('.fnq-body');
  body.innerHTML = `<div class="fnq-step ${dir < 0 ? 'back' : ''}">${VIEWS[id]()}</div>`;
  body.scrollTop = 0;
  BIND[id]?.(body.firstElementChild);
  fitScroll();
}

const opt = (v, ic, label, sub, on, multi) => `<button class="fnq-o" type="button" role="${multi ? 'checkbox' : 'radio'}" data-v="${v}" aria-checked="${!!on}">${ic ? `<span class="ic">${ic}</span>` : ''}<div><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</div>${multi || !ic || sub ? '<span class="ck">✓</span>' : ''}</button>`;
const opt2 = (v, ic, color, label, sub, on, o = {}) => `<button class="fnq-o v2 ${o.cls || ''}" type="button" role="${o.multi ? 'checkbox' : 'radio'}" data-v="${v}" aria-checked="${!!on}" style="--c:${color}"><span class="tl">${ic}</span><div><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}${o.pill ? `<em class="pl">${o.pill}</em>` : ''}</div>${o.bars ? `<span class="bars">${[1, 2, 3].map(n => `<i class="${n <= o.bars ? 'on' : ''}"></i>`).join('')}</span>` : ''}<span class="ck">✓</span></button>`;
const foot = (label = 'Pokračovať', dis = false, extra = '') => `<div class="fnq-foot"><button class="fnq-cta" type="button" ${dis ? 'disabled' : ''}>${label}</button>${extra}</div>`;
const pickOne = (root, key, after) => root.querySelectorAll('.fnq-o').forEach(b => b.onclick = () => {
  q[key] = key === 'days' ? Number(b.dataset.v) : b.dataset.v; save();
  root.querySelectorAll('.fnq-o').forEach(x => x.setAttribute('aria-checked', String(x === b))); buzz();
  after ? after(b) : setTimeout(() => go(1), 230);
});

const daysCap = () => q.days == null ? '' : q.days === 0 ? 'Začneme jedlom a krokmi. Tréning pridáš, keď budeš chcieť.' : `${q.days} ${q.days === 1 ? 'tréning' : q.days < 5 ? 'tréningy' : 'tréningov'} a ${7 - q.days} ${7 - q.days === 1 ? 'deň' : 7 - q.days < 5 ? 'dni' : 'dní'} voľna. ${q.days <= 3 ? 'Na celé telo to stačí na viditeľný rast.' : 'Rozdelíme to na hornú a dolnú časť alebo push, pull, nohy.'} Konkrétne dni si vyberieš v tréningovom pláne.`;
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
    <div class="fnq-opts">${GOALS.map(([v, ic, l, sb, c, pill]) => opt2(v, ic, c, l, sb, q.goal === v, { pill, cls: 'big' })).join('')}</div>`,
  sex: () => `<h1>Pohlavie</h1><p class="fnq-sub">Muži a ženy majú iný výdaj energie aj odporúčané minimá.</p>
    <div class="fnq-opts two">${SEX.map(([v, ic, l, c]) => opt2(v, ic, c, l, '', q.sex === v, { cls: 'tall' })).join('')}</div>`,
  age: () => `<h1>V ktorom roku si sa ${q.sex === 'f' ? 'narodila' : 'narodil'}?</h1><p class="fnq-sub">Vek mení bazálny metabolizmus. Fuelwind je pre ľudí od 18 rokov.</p>
    <div class="fnq-bigin"><label><span>Rok narodenia</span><input id="fnqBy" type="number" inputmode="numeric" placeholder="2000" min="1930" max="${YEAR - 18}" value="${h(q.by)}"></label><div class="fnq-age" id="fnqCap"></div></div>
    <div class="fnq-yrs">${[YEAR - 18, YEAR - 21, YEAR - 25, YEAR - 30, YEAR - 35, YEAR - 40, YEAR - 50].map(y => `<button type="button" data-y="${y}">${y}</button>`).join('')}</div>
    ${foot('Pokračovať', true)}`,
  body: () => `<h1>Výška a váha</h1><p class="fnq-sub">Stačí približne. Váhu budeš sledovať ako trend, nie jedno číslo.</p>
    <div class="fnq-num">
      <div class="fnq-nf"><span class="mi">${ICON.ruler}</span><label><span>Výška</span><input id="fnqH" type="number" inputmode="numeric" placeholder="178" min="120" max="230" value="${h(q.h)}"></label><em>cm</em><div class="fnq-pm"><button type="button" data-pm="fnqH:-1" aria-label="Menej">−</button><button type="button" data-pm="fnqH:1" aria-label="Viac">+</button></div></div>
      <div class="fnq-nf"><span class="mi">${ICON.scale}</span><label><span>Váha teraz</span><input id="fnqW" type="number" inputmode="decimal" step="0.1" placeholder="76" min="30" max="300" value="${h(q.w)}"></label><em>kg</em><div class="fnq-pm"><button type="button" data-pm="fnqW:-0.5" aria-label="Menej">−</button><button type="button" data-pm="fnqW:0.5" aria-label="Viac">+</button></div></div>
    </div>
    <div class="fnq-bmi" id="fnqBmi" hidden><div class="tr"><i id="fnqBmiM"></i></div><div class="lb"><span style="left:27%">norma</span><span style="left:50%">nadváha</span><span style="left:80%">obezita</span></div></div>
    <p class="fnq-cap" id="fnqCap"></p>${foot('Pokračovať', true)}`,
  target: () => `<h1>${q.goal === 'lose' ? `Akú váhu by si ${q.sex === 'f' ? 'chcela' : 'chcel'} mať?` : 'Kam to chceš dotiahnuť?'}</h1><p class="fnq-sub">Ukážeme ti, za ako dlho je to reálne pri zdravom tempe.</p>
    <div class="fnq-num"><div class="fnq-nf"><label><span>Cieľová váha</span><input id="fnqT" type="number" inputmode="decimal" step="0.5" min="35" max="250" value="${h(q.tw || (Number(q.w) ? (q.goal === 'lose' ? Math.round(Number(q.w) * 0.92) : Math.round(Number(q.w) * 1.05)) : ''))}"></label><em>kg</em><div class="fnq-pm"><button type="button" data-pm="fnqT:-0.5" aria-label="Menej">−</button><button type="button" data-pm="fnqT:0.5" aria-label="Viac">+</button></div></div></div>
    <p class="fnq-cap" id="fnqCap"></p>${foot('Pokračovať', false, '<button class="fnq-link" data-skip type="button">Zatiaľ neviem, preskočiť</button>')}`,
  job: () => `<h1>Ako vyzerá tvoj bežný deň?</h1><p class="fnq-sub">Pohyb mimo tréningu robí viac, než si väčšina ľudí myslí.</p>
    <div class="fnq-opts">${JOBS.map(([v, ic, l, sb, c, bars]) => opt2(v, ic, c, l, sb, q.job === v, { bars, cls: 'big' })).join('')}</div>
    <p class="fnq-cap">Čím viac pohybu cez deň, tým viac môžeš zjesť.</p>`,
  days: () => `<h1>Koľkokrát týždenne chceš trénovať?</h1><p class="fnq-sub">Aj nula je v poriadku. Plán sa prispôsobí.</p>
    <div class="fnq-opts days">${[0, 1, 2, 3, 4, 5, 6, 7].map(n => opt(n, '', String(n), n === 0 ? 'zatiaľ nie' : n === 1 ? 'raz' : 'krát', q.days === n)).join('')}</div>
    <div class="fnq-week" id="fnqWeek">${[0, 1, 2, 3, 4, 5, 6].map(i => `<i class="${q.days > i ? 'on' : ''}">${q.days > i ? ICON.dumbbell : ''}</i>`).join('')}</div>
    <p class="fnq-cap" id="fnqCap">${daysCap()}</p>
    ${foot('Pokračovať', q.days == null)}`,
  block: () => `<h1>Čo ti doteraz najviac bránilo?</h1><p class="fnq-sub">Vyber všetko, čo sedí.</p>
    <div class="fnq-opts tight">${BLOCK.map(([v, ic, l]) => opt2(v, ic, '#7CFFB2', l, '', q.block.includes(v), { multi: true })).join('')}</div>${foot('Pokračovať', false)}`,
  diet: () => {
    const d = q.diet, any = d.diets.length || d.modes.length, n1 = d.modes.length, n2 = d.diets.length;
    const chip = (attr, k, label, on) => `<button type="button" ${attr}="${k}" aria-pressed="${on}"><i>${ICON.check}</i>${h(label)}</button>`;
    return `<h1>Máš nejaké obmedzenia?</h1><p class="fnq-sub">Appka podľa toho označí jedlá a nastaví limity. Ak nič z toho, pokračuj ďalej.</p>
    <section class="fnq-sec"><header><span class="tl" style="--c:#FF7A8A">${ICON.pulse}</span><div><b>Zdravie</b><small>Choroby a alergie, ktoré ovplyvňujú jedlo</small></div>${n1 ? `<em>${n1}</em>` : ''}</header>
      <div class="fnq-ch">${HEALTH.map(([k, l]) => chip('data-m', k, l, d.modes.includes(k))).join('')}</div>
      ${d.modes.includes('diabetes') ? `<div class="fnq-h">Aký typ cukrovky máš?</div><div class="fnq-ch">${Object.entries(dx.DTYPES).map(([k, v]) => chip('data-t', k, v.label, d.dtype === k)).join('')}</div>` : ''}
      ${d.modes.includes('allergy') ? `<div class="fnq-h">Na čo máš alergiu?</div><div class="fnq-ch">${dx.ALLERGENS.map(([k, l]) => chip('data-a', k, l, d.allergens.includes(k))).join('')}</div>` : ''}
      ${d.modes.includes('diabetes') && q.goal === 'lose' ? `<p class="fnq-cap">Pri cukrovke sa o chudnutí poraď s lekárom. Appka nepočíta dávky inzulínu ani liekov.</p>` : ''}</section>
    <section class="fnq-sec"><header><span class="tl" style="--c:#7CFFB2">${ICON.leaf}</span><div><b>Ako sa stravuješ</b><small>Diéta alebo vierovyznanie</small></div>${n2 ? `<em>${n2}</em>` : ''}</header>
      <div class="fnq-ch">${DIET_KEYS.map(k => chip('data-d', k, DIETS[k].title, d.diets.includes(k))).join('')}</div></section>
    ${any ? `<label class="fnq-cons" id="fnqCons"><input type="checkbox" ${d.consent ? 'checked' : ''}><span>Súhlasím, aby Fuelwind ukladal údaje o mojom zdraví a stravovaní na účely týchto funkcií. Súhlas môžeš kedykoľvek odvolať v Profile.</span></label>` : ''}
    ${foot(any ? 'Pokračovať' : 'Preskočiť', false)}`;
  },
  src: () => `<h1>Kde si o nás ${q.sex === 'f' ? 'počula' : 'počul'}?</h1><p class="fnq-sub">Pomôže nám to dostať appku k ďalším ľuďom ako ty.</p>
    <div class="fnq-opts src">${SRC.map(([v, ic, l]) => opt(v, ic, l, '', q.src === v)).join('')}</div>`,
  calc: () => `<div class="fnq-calc">${ringSvg(0, 'big', 7, true, true)}<h1>Skladám tvoj plán</h1>
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
  age: r => { numStep(r, ['fnqBy'], () => {
    const y = Number(q.by);
    if (!y || String(q.by).length < 4) return { ok: false };
    if (y > YEAR - 18) return { ok: false, msg: 'Fuelwind je zatiaľ len pre ľudí od 18 rokov.' };
    if (y < 1930) return { ok: false, msg: 'Skontroluj rok.' };
    return { ok: true, msg: `${YEAR - y} rokov` };
  }, () => { q.by = r.querySelector('#fnqBy').value; save(); });
    r.querySelectorAll('[data-y]').forEach(b => b.onclick = () => { const i = r.querySelector('#fnqBy'); i.value = b.dataset.y; i.dispatchEvent(new Event('input', { bubbles: true })); buzz(); });
  },
  body: r => numStep(r, ['fnqH', 'fnqW'], () => {
    const hh = Number(q.h), ww = Number(q.w), g = r.querySelector('#fnqBmi');
    if (!(hh >= 120 && hh <= 230 && ww >= 30 && ww <= 300)) { g.hidden = true; return { ok: false }; }
    const bmi = ww / ((hh / 100) ** 2);
    g.hidden = false; r.querySelector('#fnqBmiM').style.left = Math.max(2, Math.min(98, (bmi - 15) / 25 * 100)) + '%';
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
      r.querySelectorAll('#fnqWeek i').forEach((d, i) => { const on = q.days > i; d.classList.toggle('on', on); d.innerHTML = on ? ICON.dumbbell : ''; });
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
    const lis = r.querySelectorAll('.fnq-list li'), svg = r.querySelector('svg.big');
    const T = reduce() ? 150 : 650;
    if (svg) { setRing(svg, 0); tweenRing(svg, 0, 1, T * (lis.length + 1)); }
    lis.forEach((li, i) => setTimeout(() => { li.classList.add('on'); buzz(); }, T * (i + 1)));
    setTimeout(() => { if (el && steps()[step] === 'calc') go(1); }, T * (lis.length + 1) + 250);
  },
  plan: r => {
    const t = plan(), svg = r.querySelector('.fnq-ring svg');
    // prstenec z loga rozdelený na makrá: bielkoviny, sacharidy, tuky
    const cal = [t.protein * 4, t.carbs * 4, t.fat * 9], sum = cal.reduce((a, b) => a + b, 0) || 1, COL = ['#7CFFB2', '#5BB8FF', '#FFC857'];
    svg.querySelectorAll('.p, circle').forEach(x => x.remove());
    // farby plynulo prechádzajú jedna do druhej: stred každého makra má svoju farbu, medzi nimi sa farba mieša
    const lens = cal.map(c => c / sum * 100), mids = [lens[0] / 2, lens[0] + lens[1] / 2, lens[0] + lens[1] + lens[2] / 2];
    const rgb = hx => [1, 3, 5].map(i => parseInt(hx.slice(i, i + 2), 16));
    const colAt = x => {
      if (x <= mids[0]) return rgb(COL[0]); if (x >= mids[2]) return rgb(COL[2]);
      const j = x < mids[1] ? 0 : 1, k = (x - mids[j]) / (mids[j + 1] - mids[j]), A = rgb(COL[j]), B = rgb(COL[j + 1]);
      return A.map((v, n) => Math.round(v + (B[n] - v) * k));
    };
    const N = 100, step = 100 / N;
    for (let i = 0; i < N; i++) {
      const sg = document.createElementNS('http://www.w3.org/2000/svg', 'path'), c = colAt(i * step + step / 2);
      sg.setAttribute('d', ARC); sg.setAttribute('pathLength', '100'); sg.setAttribute('stroke', `rgb(${c})`); sg.setAttribute('stroke-width', '8');
      sg.setAttribute('stroke-dasharray', `${step * 1.02} ${100 - step * 1.02}`); sg.setAttribute('stroke-dashoffset', String(-i * step));
      sg.style.opacity = '0'; sg.style.transition = `opacity .25s ease ${reduce() ? 0 : 120 + i * 11}ms`;
      svg.appendChild(sg); requestAnimationFrame(() => requestAnimationFrame(() => { sg.style.opacity = '1'; }));
    }
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
  if (!el && !jget(SKIP, sessionStorage) && !known()) open(0); else if (!el) unpre();
}
const app = document.getElementById('app');
if (app) new MutationObserver(scan).observe(app, { childList: true, subtree: true });
// nový človek: úvod sa otvorí hneď, nečaká sa na prihlasovaciu obrazovku (tá čaká na server)
if (!jget(SKIP, sessionStorage) && !known() && !document.querySelector('#app #onb')) open(0);
scan();
