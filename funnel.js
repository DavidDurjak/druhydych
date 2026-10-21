// Registrácia ako v top appkách (Cal AI, Noom): najprv krátky kvíz, potom „tvoj plán je hotový“ a až potom účet.
// Človek vidí hodnotu skôr, než dá e-mail. Signatúra: otvorený prstenec z loga sa s každou odpoveďou dokresľuje a na konci
// sa z neho stane kalorický prstenec s makrami. Odpovede sa držia v zariadení (fw_quiz); po vytvorení účtu sa nimi sám
// vyplní a uloží pôvodný onboarding (žiadna zmena v app.js), a do profilu sa uloží aj intake (prekážky, odkiaľ prišiel, cieľová váha).
import * as db from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';

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
.fq{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;background:var(--bg,#0B0E12);color:var(--text,#fff);overflow:hidden;
  font-feature-settings:"tnum" 1;animation:fqIn .35s ease both}
.fq::before{content:"";position:absolute;inset:-20% -30% auto;height:70%;pointer-events:none;
  background:radial-gradient(50% 50% at 50% 30%,color-mix(in srgb,var(--accent,#7CFFB2) 14%,transparent),transparent 70%)}
.fq.out{animation:fqOut .35s ease both}
@keyframes fqIn{from{opacity:0}}@keyframes fqOut{to{opacity:0;transform:scale(1.02)}}
.fq-top{position:relative;display:flex;align-items:center;gap:10px;padding:calc(env(safe-area-inset-top) + 12px) 16px 6px;max-width:520px;width:100%;margin:0 auto;box-sizing:border-box;min-height:56px}
.fq-back{width:40px;height:40px;border-radius:12px;border:0;background:transparent;color:var(--muted,#8a94a3);display:grid;place-items:center;cursor:pointer;padding:0}
.fq-back svg{width:22px;height:22px}
.fq-back[hidden]{visibility:hidden;display:grid}
.fq-bar{flex:1;height:4px;border-radius:99px;background:var(--line,#232a33);overflow:hidden}
.fq-bar i{display:block;height:100%;width:0;border-radius:inherit;background:var(--accent,#7CFFB2);transition:width .45s cubic-bezier(.3,1,.4,1)}
.fq-mini{flex:none;width:34px;height:34px}
.fq-body{position:relative;flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch}
.fq-step{max-width:520px;margin:0 auto;padding:14px 20px 24px;box-sizing:border-box;min-height:100%;display:flex;flex-direction:column;animation:fqStep .38s cubic-bezier(.3,1,.4,1) both}
.fq-step.back{animation-name:fqStepB}
@keyframes fqStep{from{opacity:0;transform:translateX(28px)}}@keyframes fqStepB{from{opacity:0;transform:translateX(-28px)}}
.fq h1{margin:6px 0 0;font-size:31px;line-height:1.08;letter-spacing:-.035em;font-weight:800}
.fq .fq-sub{margin:10px 0 22px;font-size:15px;line-height:1.45;color:var(--muted,#8a94a3);max-width:36ch}
.fq-opts{display:grid;gap:10px}
.fq-opts.two{grid-template-columns:1fr 1fr}
.fq-opts.days{grid-template-columns:repeat(4,1fr)}
.fq-o{appearance:none;-webkit-appearance:none;position:relative;display:flex;align-items:center;gap:14px;min-height:66px;padding:12px 16px;border-radius:20px;
  background:var(--card,#151a21);border:1.5px solid var(--line,#232a33);color:var(--text,#fff);font:inherit;text-align:left;cursor:pointer;
  transition:border-color .18s,background .18s,transform .12s,box-shadow .18s}
.fq-o:active{transform:scale(.98)}
.fq-o .ic{flex:none;width:42px;height:42px;border-radius:13px;display:grid;place-items:center;font-size:21px;background:var(--bg-2,#10141a)}
.fq-o b{display:block;font-size:16.5px;font-weight:700;letter-spacing:-.01em}
.fq-o small{display:block;font-size:13px;color:var(--muted,#8a94a3);margin-top:2px;line-height:1.3}
.fq-o .ck{margin-left:auto;flex:none;width:24px;height:24px;border-radius:50%;border:1.5px solid var(--line,#232a33);display:grid;place-items:center;color:transparent;font-size:13px;font-weight:900;transition:all .18s}
.fq-o[aria-checked=true]{border-color:var(--accent,#7CFFB2);background:color-mix(in srgb,var(--accent,#7CFFB2) 11%,var(--card,#151a21));box-shadow:0 0 0 4px color-mix(in srgb,var(--accent,#7CFFB2) 13%,transparent)}
.fq-o[aria-checked=true] .ck{background:var(--accent,#7CFFB2);border-color:var(--accent,#7CFFB2);color:var(--accent-ink,#06130C)}
.fq-opts.days .fq-o,.fq-opts.two .fq-o{justify-content:center;text-align:center;flex-direction:column;gap:4px;min-height:74px;padding:10px 6px}
.fq-opts.days .fq-o b{font-size:24px;font-weight:800}
.fq-opts.two .fq-o .ic{margin-bottom:2px}
.fq-cap{margin:14px 2px 0;font-size:13.5px;color:var(--muted,#8a94a3);min-height:20px;line-height:1.4}
.fq-num{display:grid;gap:12px}
.fq-nf{display:flex;align-items:center;gap:10px;padding:14px 14px 14px 18px;border-radius:22px;background:var(--card,#151a21);border:1.5px solid var(--line,#232a33);transition:border-color .18s}
.fq-nf:focus-within{border-color:var(--accent,#7CFFB2)}
.fq-nf label{flex:1;min-width:0;display:block}
.fq-nf label span{display:block;font-size:13px;color:var(--muted,#8a94a3);font-weight:600}
.fq-nf input{width:100%;border:0;background:transparent;color:var(--text,#fff);font:inherit;font-size:40px;font-weight:800;letter-spacing:-.03em;padding:0;outline:none;font-variant-numeric:tabular-nums;-moz-appearance:textfield}
.fq-nf input::-webkit-outer-spin-button,.fq-nf input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.fq-nf input::placeholder{color:color-mix(in srgb,var(--text,#fff) 22%,transparent)}
.fq-nf em{font-style:normal;font-size:16px;color:var(--muted,#8a94a3);font-weight:700;margin-left:2px}
.fq-pm{display:flex;gap:6px}
.fq-pm button{width:46px;height:46px;border-radius:14px;border:1px solid var(--line,#232a33);background:var(--bg-2,#10141a);color:var(--text,#fff);font-size:22px;font-weight:600;cursor:pointer}
.fq-pm button:active{transform:scale(.94)}
.fq-foot{position:sticky;bottom:0;margin-top:auto;padding:18px 0 calc(env(safe-area-inset-bottom) + 12px);background:linear-gradient(180deg,transparent,var(--bg,#0B0E12) 34%)}
.fq-cta{width:100%;height:58px;border-radius:18px;border:0;background:var(--accent,#7CFFB2);color:var(--accent-ink,#06130C);font:inherit;font-size:17px;font-weight:800;letter-spacing:-.01em;cursor:pointer;
  box-shadow:0 10px 30px color-mix(in srgb,var(--accent,#7CFFB2) 28%,transparent);transition:transform .12s,opacity .2s}
.fq-cta:active{transform:scale(.98)}
.fq-cta:disabled{opacity:.35;box-shadow:none;cursor:default}
.fq-link{display:block;width:100%;margin-top:10px;padding:12px;border:0;background:none;color:var(--muted,#8a94a3);font:inherit;font-size:14.5px;cursor:pointer}
.fq-link b{color:var(--text,#fff)}
.fq-err{margin:12px 2px 0;font-size:14px;color:#FF7A6B;line-height:1.4}
/* úvod */
.fq-hero{flex:1;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;padding-top:10px}
.fq-seal{width:132px;height:132px;margin:0 0 26px -8px;filter:drop-shadow(0 0 28px color-mix(in srgb,var(--accent,#7CFFB2) 35%,transparent))}
.fq-seal .rg{stroke-dasharray:100;stroke-dashoffset:100;animation:fqDraw 1.4s .15s cubic-bezier(.6,0,.2,1) forwards}
.fq-seal .mk{stroke-dasharray:100;stroke-dashoffset:100;animation:fqDraw 1.2s .7s cubic-bezier(.6,0,.2,1) forwards}
.fq-seal .dot{opacity:0;animation:fqDot .4s 1.5s ease forwards}
@keyframes fqDraw{to{stroke-dashoffset:0}}@keyframes fqDot{to{opacity:1}}
.fq-hero h1{font-size:40px;line-height:1.02;letter-spacing:-.045em}
.fq-hero .fq-sub{font-size:16px;margin-bottom:22px}
.fq-chips{display:flex;flex-wrap:wrap;gap:8px}
.fq-chips span{display:inline-flex;align-items:center;gap:7px;height:34px;padding:0 13px;border-radius:99px;font-size:13.5px;background:var(--card,#151a21);border:1px solid var(--line,#232a33)}
.fq-chips span i{font-style:normal;color:var(--accent,#7CFFB2)}
/* počítanie */
.fq-calc{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:6px}
.fq-calc .big{width:168px;height:168px;margin-bottom:18px}
.fq-calc .big .p{transition:stroke-dashoffset 2.6s cubic-bezier(.5,0,.2,1)}
.fq-calc h1{font-size:26px}
.fq-list{list-style:none;margin:16px 0 0;padding:0;display:grid;gap:11px;text-align:left}
.fq-list li{display:flex;align-items:center;gap:11px;font-size:15px;color:var(--muted,#8a94a3);transition:color .3s}
.fq-list li i{flex:none;width:22px;height:22px;border-radius:50%;border:1.5px solid var(--line,#232a33);display:grid;place-items:center;font-style:normal;font-size:12px;font-weight:900;color:transparent;transition:all .3s}
.fq-list li.on{color:var(--text,#fff)}
.fq-list li.on i{background:var(--accent,#7CFFB2);border-color:var(--accent,#7CFFB2);color:var(--accent-ink,#06130C)}
/* plán */
.fq-plan{display:flex;flex-direction:column;align-items:center;text-align:center}
.fq-plan .tag{font-size:13px;font-weight:700;color:var(--accent,#7CFFB2);margin:4px 0 6px}
.fq-ring{position:relative;width:230px;height:230px;margin:10px 0 6px}
.fq-ring svg{width:100%;height:100%;overflow:visible}
.fq-ring .seg{transition:stroke-dasharray 1.1s cubic-bezier(.3,1,.4,1),stroke-dashoffset 1.1s cubic-bezier(.3,1,.4,1)}
.fq-ring div{position:absolute;inset:0;display:grid;place-content:center;line-height:1}
.fq-ring b{font-size:54px;font-weight:800;letter-spacing:-.05em;font-variant-numeric:tabular-nums}
.fq-ring small{display:block;margin-top:6px;font-size:13.5px;color:var(--muted,#8a94a3)}
.fq-mac{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:100%;margin:10px 0 0}
.fq-mac div{padding:12px 6px;border-radius:18px;background:var(--card,#151a21);border:1px solid var(--line,#232a33)}
.fq-mac b{display:block;font-size:21px;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.fq-mac span{display:flex;align-items:center;justify-content:center;gap:6px;font-size:12.5px;color:var(--muted,#8a94a3);margin-top:3px}
.fq-mac span i{width:8px;height:8px;border-radius:3px}
.fq-proj{width:100%;box-sizing:border-box;margin:12px 0 0;padding:14px 16px;border-radius:20px;text-align:left;
  background:radial-gradient(120% 140% at 0% 0%,color-mix(in srgb,var(--accent,#7CFFB2) 14%,transparent),transparent 60%),var(--card,#151a21);border:1px solid color-mix(in srgb,var(--accent,#7CFFB2) 30%,var(--line,#232a33))}
.fq-proj b{display:block;font-size:17px;letter-spacing:-.01em}
.fq-proj span{display:block;font-size:13.5px;color:var(--muted,#8a94a3);margin-top:3px;line-height:1.4}
.fq-why{width:100%;list-style:none;margin:12px 0 0;padding:0;display:grid;gap:8px;text-align:left}
.fq-why li{display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border-radius:18px;background:var(--card,#151a21);border:1px solid var(--line,#232a33);font-size:14px;line-height:1.4}
.fq-why li i{flex:none;font-style:normal;font-size:19px;line-height:1.2}
.fq-why li b{display:block;font-size:14.5px}
.fq-why li span{color:var(--muted,#8a94a3)}
/* účet */
.fq-form{display:grid;gap:10px}
.fq-in{display:block;padding:10px 16px 12px;border-radius:18px;background:var(--card,#151a21);border:1.5px solid var(--line,#232a33);transition:border-color .18s}
.fq-in:focus-within{border-color:var(--accent,#7CFFB2)}
.fq-in span{display:block;font-size:12.5px;color:var(--muted,#8a94a3);font-weight:600}
.fq-in input{width:100%;border:0;background:transparent;color:var(--text,#fff);font:inherit;font-size:17px;padding:4px 0 0;outline:none}
.fq-ok{display:flex;gap:12px;align-items:flex-start;margin:6px 2px 0;font-size:13.5px;line-height:1.45;color:var(--muted,#8a94a3);cursor:pointer}
.fq-ok input{flex:none;width:22px;height:22px;margin:0;accent-color:var(--accent,#7CFFB2)}
.fq-ok a{color:var(--text,#fff)}
.fq-mini-plan{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:18px;margin:0 0 16px;background:var(--card,#151a21);border:1px solid var(--line,#232a33)}
.fq-mini-plan b{font-size:20px;font-weight:800;letter-spacing:-.02em}
.fq-mini-plan span{font-size:13px;color:var(--muted,#8a94a3)}
.fq-mini-plan svg{flex:none;width:40px;height:40px}
.fq-cover{position:fixed;inset:0;z-index:61;display:grid;place-content:center;justify-items:center;gap:16px;background:var(--bg,#0B0E12);color:var(--text,#fff);text-align:center;font-size:16px}
.fq-cover svg{width:96px;height:96px;animation:fqSpin 1.4s linear infinite}
@keyframes fqSpin{to{transform:rotate(360deg)}}
@media (min-width:700px){.fq h1{font-size:36px}.fq-hero h1{font-size:48px}}
@media (prefers-reduced-motion:reduce){.fq,.fq-step,.fq-seal *{animation:none!important}.fq-seal .rg,.fq-seal .mk{stroke-dashoffset:0}.fq-seal .dot{opacity:1}.fq-cover svg{animation:none}}
`;
const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

const BACK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
// pečať z ikony appky (prstenec + tep s vidličkou), bez pozadia
const SEAL = `<svg class="fq-seal" viewBox="0 0 1024 1024" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <defs><linearGradient id="fqg" x1="150" y1="150" x2="880" y2="880" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#dcffee"/><stop offset=".45" stop-color="#7CFFB2"/><stop offset="1" stop-color="#1fbfa0"/></linearGradient></defs>
  <path class="rg" pathLength="100" d="M128.6 583.5 A 390 390 0 1 1 264.3 813.2" stroke="url(#fqg)" stroke-width="34"/>
  <path class="rg" pathLength="100" d="M128.6 583.5 H 334.1" stroke="url(#fqg)" stroke-width="34"/>
  <g transform="translate(500 545) scale(0.7) translate(-517 -545)" stroke="url(#fqg)" stroke-width="46">
    <path class="mk" pathLength="100" d="M280 600 L 336 508 L 390 648 L 474 300 L 580 800 L 642 548 L 690 624 C 712 652 752 650 780 600"/>
    <g transform="translate(790 562) rotate(10)"><path class="mk" pathLength="100" d="M-80 -250 V -78 C -80 -26 -44 0 0 0 C 44 0 80 -26 80 -78 V -250"/><path class="mk" pathLength="100" d="M-27 -250 V -40 M27 -250 V -40 M0 0 V 42"/></g>
  </g>
  <circle class="dot" cx="264.3" cy="813.2" r="22" fill="#fff" stroke="none"/>
</svg>`;
// prstenec z loga ako ukazovateľ postupu (p 0..1) s bodkou na konci
function ringSvg(p, cls = 'fq-mini', w = 9) {
  const a = A0 + SPAN * Math.max(0.001, p), [dx, dy] = pt(a);
  return `<svg class="${cls}" viewBox="0 0 100 100" fill="none" stroke-linecap="round" aria-hidden="true">
    <path d="${ARC}" stroke="var(--line,#232a33)" stroke-width="${w}"/>
    <path class="p" d="${ARC}" pathLength="100" stroke="var(--accent,#7CFFB2)" stroke-width="${w}" stroke-dasharray="100" stroke-dashoffset="${100 - p * 100}"/>
    <circle cx="${dx.toFixed(2)}" cy="${dy.toFixed(2)}" r="${w * 0.62}" fill="#fff"/></svg>`;
}

const GOALS = [['lose', '🔥', 'Schudnúť', 'zhodiť tuk, udržať svaly'], ['maintain', '⚖️', 'Udržať váhu', 'jesť vyvážene, cítiť sa lepšie'], ['gain', '💪', 'Nabrať svaly', 'rásť bez zbytočného tuku']];
const SEX = [['m', '👨', 'Muž'], ['f', '👩', 'Žena']];
const JOBS = [['desk', '💻', 'Sedím väčšinu dňa', 'škola, kancelária'], ['stand', '🚶', 'Som veľa na nohách', 'obchod, gastro, učenie'], ['phys', '🏗️', 'Fyzická práca', 'stavba, sklad, záhrada']];
const BLOCK = [['time', '⏱️', 'Zapisovanie ma zdržiava'], ['what', '🤷', 'Neviem, čo mám jesť'], ['out', '🍽️', 'Často jem vonku alebo v jedálni'], ['sweet', '🍫', 'Chute na sladké a večerné jedenie'], ['motiv', '📉', 'Vydržím pár dní a prestanem'], ['train', '🏋️', 'Neviem, ako trénovať']];
const SRC = [['instagram', '📸', 'Instagram'], ['tiktok', '🎵', 'TikTok'], ['gym', '🏋️', 'Fitko alebo tréner'], ['friend', '🤝', 'Kamarát'], ['store', '🔎', 'Google alebo obchod s appkami'], ['other', '✨', 'Iné']];
const FIX = {
  time: ['⚡', 'Zápis za 3 sekundy', 'napíš, nadiktuj alebo odfoť, čo si jedol. AI spočíta zvyšok.'],
  what: ['🧭', 'Vždy vieš, čo zjesť ďalej', 'návrhy jedál podľa zvyšných kalórií a bielkovín.'],
  out: ['📋', 'Odfoť denné menu', 'AI ti z lístka vyberie jedlo, ktoré ti dnes sedí najviac.'],
  sweet: ['🌙', 'Plán aj na chute', 'kouč ti pomôže rozložiť kalórie tak, aby ostalo aj na niečo sladké.'],
  motiv: ['🔁', 'Séria, ktorá odpúšťa', 'jeden vynechaný deň ťa nevráti na nulu. Kouč ťa podrží.'],
  train: ['📈', 'Tréningový plán na mieru', 'podľa tvojich dní, s radou, kedy pridať váhu.'],
};

let el = null, q = null, step = 0, dir = 1;
const fresh = () => ({ goal: '', sex: '', by: '', h: '', w: '', tw: '', job: '', days: null, block: [], src: '', name: '', done: false });
const steps = () => ['hello', 'goal', 'sex', 'age', 'body', ...(q.goal && q.goal !== 'maintain' ? ['target'] : []), 'job', 'days', 'block', 'src', 'calc', 'plan', 'account'];

function plan() {
  const w = Number(q.w), activity = calc.encodeActivity({ job: q.job || 'desk', steps: (calc.JOBS[q.job] || calc.JOBS.desk).steps, days: q.days || 0 });
  const t = calc.targets({ sex: q.sex || 'm', weightKg: w, heightCm: Number(q.h), birthYear: Number(q.by), activity, goal: q.goal || 'maintain' });
  const perWeek = q.goal === 'lose' ? -Math.min(0.01 * w, Math.max(0.2, (t.tdee - t.kcal) * 7 / 7700)) : q.goal === 'gain' ? Math.max(0.15, Math.min(0.005 * w, (t.kcal - t.tdee) * 7 / 7700)) : 0;
  const diff = Number(q.tw) ? Number(q.tw) - w : 0;
  const weeks = perWeek && diff && Math.sign(diff) === Math.sign(perWeek) ? Math.ceil(Math.abs(diff / perWeek)) : 0;
  return { ...t, activity, perWeek, weeks };
}

function open(startAt = 0) {
  if (el) return;
  q = { ...fresh(), ...(jget(KEY) || {}) };
  step = startAt; dir = 1;
  el = document.createElement('div'); el.className = 'fq'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Nastavenie plánu');
  el.innerHTML = `<div class="fq-top"><button class="fq-back" aria-label="Späť">${BACK}</button><div class="fq-bar"><i></i></div><span class="fq-ring-slot"></span></div><div class="fq-body"></div>`;
  document.body.appendChild(el);
  el.querySelector('.fq-back').onclick = () => go(-1);
  draw();
}
function close(toLogin) {
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
  el.querySelector('.fq-back').hidden = step === 0 || id === 'calc';
  const top = el.querySelector('.fq-top'); top.style.visibility = id === 'hello' ? 'hidden' : '';
  el.querySelector('.fq-bar i').style.width = (id === 'plan' || id === 'account' ? 100 : p * 100) + '%';
  el.querySelector('.fq-ring-slot').innerHTML = ringSvg(id === 'plan' || id === 'account' ? 1 : p);
  const body = el.querySelector('.fq-body');
  body.innerHTML = `<div class="fq-step ${dir < 0 ? 'back' : ''}">${VIEWS[id]()}</div>`;
  body.scrollTop = 0;
  BIND[id]?.(body.firstElementChild);
}

const opt = (v, ic, label, sub, on, multi) => `<button class="fq-o" type="button" role="${multi ? 'checkbox' : 'radio'}" data-v="${v}" aria-checked="${!!on}">${ic ? `<span class="ic">${ic}</span>` : ''}<div><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</div>${multi || !ic || sub ? '<span class="ck">✓</span>' : ''}</button>`;
const foot = (label = 'Pokračovať', dis = false, extra = '') => `<div class="fq-foot"><button class="fq-cta" type="button" ${dis ? 'disabled' : ''}>${label}</button>${extra}</div>`;
const pickOne = (root, key, after) => root.querySelectorAll('.fq-o').forEach(b => b.onclick = () => {
  q[key] = key === 'days' ? Number(b.dataset.v) : b.dataset.v; save();
  root.querySelectorAll('.fq-o').forEach(x => x.setAttribute('aria-checked', String(x === b))); buzz();
  after ? after(b) : setTimeout(() => go(1), 230);
});

const VIEWS = {
  hello: () => `<div class="fq-hero">${SEAL}
      <h1>Tvoj plán jedla a tréningu za minútu.</h1>
      <p class="fq-sub">Pár otázok a appka ti vypočíta kalórie a makrá presne na teba. Potom už len zapisuješ, zvyšok stráži AI.</p>
      <div class="fq-chips"><span><i>✦</i>Zápis jedla fotkou</span><span><i>✦</i>Odfoť denné menu</span><span><i>✦</i>Kouč, ktorý ťa pozná</span></div></div>
    ${foot('Poďme na to', false, '<button class="fq-link" data-login type="button">Už mám účet. <b>Prihlásiť sa</b></button>')}`,
  goal: () => `<h1>Čo chceš dosiahnuť?</h1><p class="fq-sub">Podľa toho nastavíme kalórie aj tréning.</p>
    <div class="fq-opts">${GOALS.map(([v, ic, l, s]) => opt(v, ic, l, s, q.goal === v)).join('')}</div>`,
  sex: () => `<h1>Pohlavie</h1><p class="fq-sub">Muži a ženy majú iný výdaj energie aj odporúčané minimá.</p>
    <div class="fq-opts two">${SEX.map(([v, ic, l]) => opt(v, ic, l, '', q.sex === v)).join('')}</div>`,
  age: () => `<h1>V ktorom roku si sa narodil?</h1><p class="fq-sub">Vek mení bazálny metabolizmus. Fuelwind je pre ľudí od 18 rokov.</p>
    <div class="fq-num"><div class="fq-nf"><label><span>Rok narodenia</span><input id="fqBy" type="number" inputmode="numeric" placeholder="2000" min="1930" max="${YEAR - 18}" value="${h(q.by)}"></label></div></div>
    <p class="fq-cap" id="fqCap"></p>${foot('Pokračovať', true)}`,
  body: () => `<h1>Výška a váha</h1><p class="fq-sub">Stačí približne. Váhu budeš sledovať ako trend, nie jedno číslo.</p>
    <div class="fq-num">
      <div class="fq-nf"><label><span>Výška</span><input id="fqH" type="number" inputmode="numeric" placeholder="178" min="120" max="230" value="${h(q.h)}"></label><em>cm</em><div class="fq-pm"><button type="button" data-pm="fqH:-1" aria-label="Menej">−</button><button type="button" data-pm="fqH:1" aria-label="Viac">+</button></div></div>
      <div class="fq-nf"><label><span>Váha teraz</span><input id="fqW" type="number" inputmode="decimal" step="0.1" placeholder="76" min="30" max="300" value="${h(q.w)}"></label><em>kg</em><div class="fq-pm"><button type="button" data-pm="fqW:-0.5" aria-label="Menej">−</button><button type="button" data-pm="fqW:0.5" aria-label="Viac">+</button></div></div>
    </div><p class="fq-cap" id="fqCap"></p>${foot('Pokračovať', true)}`,
  target: () => `<h1>${q.goal === 'lose' ? 'Akú váhu by si chcel mať?' : 'Kam to chceš dotiahnuť?'}</h1><p class="fq-sub">Ukážeme ti, za ako dlho je to reálne pri zdravom tempe.</p>
    <div class="fq-num"><div class="fq-nf"><label><span>Cieľová váha</span><input id="fqT" type="number" inputmode="decimal" step="0.5" min="35" max="250" value="${h(q.tw || (Number(q.w) ? (q.goal === 'lose' ? Math.round(Number(q.w) * 0.92) : Math.round(Number(q.w) * 1.05)) : ''))}"></label><em>kg</em><div class="fq-pm"><button type="button" data-pm="fqT:-0.5" aria-label="Menej">−</button><button type="button" data-pm="fqT:0.5" aria-label="Viac">+</button></div></div></div>
    <p class="fq-cap" id="fqCap"></p>${foot('Pokračovať', false, '<button class="fq-link" data-skip type="button">Zatiaľ neviem, preskočiť</button>')}`,
  job: () => `<h1>Ako vyzerá tvoj bežný deň?</h1><p class="fq-sub">Pohyb mimo tréningu robí viac, než si väčšina ľudí myslí.</p>
    <div class="fq-opts">${JOBS.map(([v, ic, l, s]) => opt(v, ic, l, s, q.job === v)).join('')}</div>`,
  days: () => `<h1>Koľkokrát týždenne chceš trénovať?</h1><p class="fq-sub">Aj nula je v poriadku. Plán sa prispôsobí.</p>
    <div class="fq-opts days">${[0, 1, 2, 3, 4, 5, 6, 7].map(n => opt(n, '', String(n), n === 0 ? 'zatiaľ nie' : n === 1 ? 'raz' : 'krát', q.days === n)).join('')}</div>
    <p class="fq-cap">${q.days == null ? '' : q.days === 0 ? 'Začneme jedlom a krokmi, tréning pridáš, keď budeš chcieť.' : q.days <= 3 ? 'Ideálne na celé telo, 3 dni stačia na viditeľný rast.' : 'Rozdelíme to na hornú a dolnú časť alebo push, pull, nohy.'}</p>`,
  block: () => `<h1>Čo ti doteraz najviac bránilo?</h1><p class="fq-sub">Vyber všetko, čo sedí. Appka sa podľa toho nastaví.</p>
    <div class="fq-opts">${BLOCK.map(([v, ic, l]) => opt(v, ic, l, '', q.block.includes(v), true)).join('')}</div>${foot('Pokračovať', false)}`,
  src: () => `<h1>Kde si o nás počul?</h1><p class="fq-sub">Pomôže nám to dostať appku k ďalším ľuďom ako ty.</p>
    <div class="fq-opts">${SRC.map(([v, ic, l]) => opt(v, ic, l, '', q.src === v)).join('')}</div>`,
  calc: () => `<div class="fq-calc">${ringSvg(0, 'big', 7)}<h1>Skladám tvoj plán</h1>
    <ul class="fq-list"><li><i>✓</i>Počítam tvoj denný výdaj energie</li><li><i>✓</i>Nastavujem bielkoviny pre tvoj cieľ</li><li><i>✓</i>Rozdeľujem sacharidy a tuky</li><li><i>✓</i>Pripravujem AI kouča</li></ul></div>`,
  plan: () => {
    const t = plan(), pw = t.perWeek, end = t.weeks ? new Date(Date.now() + t.weeks * 7 * 864e5) : null;
    const proj = q.goal === 'maintain' ? ['Držíme váhu, budujeme formu', 'Jedlo okolo tvojho výdaja, dosť bielkovín a sila v tréningu.']
      : [`${pw > 0 ? '+' : '−'}${nf(Math.abs(pw), 1)} kg týždenne`, end ? `Cieľ ${nf(Number(q.tw), 1)} kg približne ${end.toLocaleDateString('sk-SK', { day: 'numeric', month: 'long' })}${t.weeks > 52 ? ' budúceho roka' : ''}. Bezpečné tempo, bez hladovania.` : 'Bezpečné tempo, ktoré sa dá vydržať. Appka ho každý týždeň doladí podľa tvojej váhy.'];
    const fixes = (q.block.length ? q.block : ['time', 'what']).slice(0, 3).map(k => FIX[k]).filter(Boolean);
    return `<div class="fq-plan"><div class="tag">✦ Tvoj plán je hotový</div><h1>${h(GOALS.find(g => g[0] === q.goal)?.[2] || 'Tvoj plán')}</h1>
      <div class="fq-ring">${ringSvg(0, '', 8).replace('class=""', 'class="pr"')}<div><b data-kc="${t.kcal}">0</b><small>kcal denne</small></div></div>
      <div class="fq-mac"><div><b>${t.protein} g</b><span><i style="background:#7CFFB2"></i>bielkoviny</span></div><div><b>${t.carbs} g</b><span><i style="background:#5BB8FF"></i>sacharidy</span></div><div><b>${t.fat} g</b><span><i style="background:#FFC857"></i>tuky</span></div></div>
      <div class="fq-proj"><b>${proj[0]}</b><span>${proj[1]}</span></div>
      <ul class="fq-why">${fixes.map(([ic, b, s]) => `<li><i>${ic}</i><div><b>${b}</b><span>${s}</span></div></li>`).join('')}</ul></div>
      ${foot('Uložiť plán')}`;
  },
  account: () => {
    const t = plan();
    return `<h1>Ulož si plán</h1><p class="fq-sub">Vytvor si účet a plán máš na všetkých zariadeniach. Bez reklám.</p>
      <div class="fq-mini-plan">${ringSvg(1, '', 10)}<div><b>${nf(t.kcal)} kcal</b><span> · B ${t.protein} g · S ${t.carbs} g · T ${t.fat} g</span></div></div>
      <form class="fq-form" id="fqAcc" novalidate>
        <label class="fq-in"><span>Ako ťa máme volať</span><input name="name" autocomplete="given-name" required maxlength="40" value="${h(q.name)}" placeholder="Meno"></label>
        <label class="fq-in"><span>E-mail</span><input name="email" type="email" autocomplete="email" inputmode="email" required placeholder="ty@email.sk"></label>
        <label class="fq-in"><span>Heslo</span><input name="password" type="password" autocomplete="new-password" required minlength="6" placeholder="aspoň 6 znakov"></label>
        <label class="fq-ok"><input type="checkbox" name="ok"><span>Mám aspoň 18 rokov a súhlasím s <a href="podmienky.html" target="_blank" rel="noopener">podmienkami</a> a <a href="zasady.html" target="_blank" rel="noopener">zásadami ochrany súkromia</a>. Appka nenahrádza lekára.</span></label>
        <p class="fq-err" id="fqErr" hidden></p>
      </form>
      ${foot('Vytvoriť účet', false, '<button class="fq-link" data-login type="button">Už mám účet. <b>Prihlásiť sa</b></button>')}`;
  },
};

function numStep(root, ids, valid, cap) {
  const ins = ids.map(i => root.querySelector('#' + i)), cta = root.querySelector('.fq-cta');
  const check = () => { const r = valid(); cta.disabled = !r.ok; root.querySelector('#fqCap').textContent = r.msg || ''; return r.ok; };
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
  hello: r => { r.querySelector('.fq-cta').onclick = () => go(1); r.querySelector('[data-login]').onclick = () => close(true); },
  goal: r => pickOne(r, 'goal'),
  sex: r => pickOne(r, 'sex'),
  age: r => numStep(r, ['fqBy'], () => {
    const y = Number(q.by);
    if (!y || String(q.by).length < 4) return { ok: false };
    if (y > YEAR - 18) return { ok: false, msg: 'Fuelwind je zatiaľ len pre ľudí od 18 rokov.' };
    if (y < 1930) return { ok: false, msg: 'Skontroluj rok.' };
    return { ok: true, msg: `${YEAR - y} rokov` };
  }, () => { q.by = r.querySelector('#fqBy').value; save(); }),
  body: r => numStep(r, ['fqH', 'fqW'], () => {
    const hh = Number(q.h), ww = Number(q.w);
    if (!(hh >= 120 && hh <= 230 && ww >= 30 && ww <= 300)) return { ok: false };
    const bmi = ww / ((hh / 100) ** 2);
    return { ok: true, msg: `BMI ${nf(bmi, 1)}. Pri tréningu je to len orientačné číslo, sledovať budeme trend a pás.` };
  }, () => { q.h = r.querySelector('#fqH').value; q.w = r.querySelector('#fqW').value; save(); }),
  target: r => {
    const inp = r.querySelector('#fqT');
    const cap = () => {
      q.tw = inp.value; save();
      const t = plan(), c = r.querySelector('#fqCap'), d = Number(q.tw) - Number(q.w);
      if (!Number(q.tw)) { c.textContent = ''; return; }
      if ((q.goal === 'lose' && d >= 0) || (q.goal === 'gain' && d <= 0)) { c.textContent = q.goal === 'lose' ? 'Cieľ je vyšší ako tvoja váha teraz.' : 'Cieľ je nižší ako tvoja váha teraz.'; return; }
      c.textContent = t.weeks ? `Pri zdravom tempe približne ${t.weeks} ${t.weeks < 5 ? 'týždne' : 'týždňov'}.` : '';
    };
    numStep(r, ['fqT'], () => ({ ok: true }), cap); cap();
    r.querySelector('[data-skip]').onclick = () => { q.tw = ''; save(); go(1); };
  },
  job: r => pickOne(r, 'job'),
  days: r => pickOne(r, 'days', () => { draw(); setTimeout(() => go(1), 650); }),
  block: r => {
    r.querySelectorAll('.fq-o').forEach(b => b.onclick = () => {
      const v = b.dataset.v; q.block = q.block.includes(v) ? q.block.filter(x => x !== v) : [...q.block, v]; save(); buzz();
      b.setAttribute('aria-checked', String(q.block.includes(v)));
    });
    r.querySelector('.fq-cta').onclick = () => go(1);
  },
  src: r => pickOne(r, 'src'),
  calc: r => {
    const lis = r.querySelectorAll('.fq-list li'), path = r.querySelector('.big .p');
    requestAnimationFrame(() => requestAnimationFrame(() => { if (path) path.style.strokeDashoffset = '0'; }));
    const T = reduce() ? 150 : 650;
    lis.forEach((li, i) => setTimeout(() => { li.classList.add('on'); buzz(); }, T * (i + 1)));
    setTimeout(() => { if (el && steps()[step] === 'calc') go(1); }, T * (lis.length + 1) + 250);
  },
  plan: r => {
    const t = plan(), svg = r.querySelector('.fq-ring svg');
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
    r.querySelector('.fq-cta').onclick = () => go(1);
  },
  account: r => {
    const f = r.querySelector('#fqAcc'), cta = r.querySelector('.fq-cta'), err = r.querySelector('#fqErr');
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
          r.innerHTML = `<div class="fq-calc">${ringSvg(1, 'big', 7)}<h1>Potvrď e-mail</h1><p class="fq-sub" style="margin:8px auto 0">Poslali sme ti odkaz na ${h(email)}. Po potvrdení sa prihlás a tvoj plán sa uloží automaticky.</p></div>${foot('Prihlásiť sa')}`;
          r.querySelector('.fq-cta').onclick = () => close(true);
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
  if (!coverEl) { coverEl = document.createElement('div'); coverEl.className = 'fq-cover'; document.body.appendChild(coverEl); }
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
    const before = location.hash;
    form.requestSubmit ? form.requestSubmit() : form.querySelector('button[type=submit]')?.click();
    for (let i = 0; i < 100 && location.hash === before; i++) await new Promise(r => setTimeout(r, 100));
    if (location.hash !== before && ctx.state?.profile?.onboarded) {
      const intake = { block: data.block || [], src: data.src || null, target_weight: Number(data.tw) || null, v: 1, at: new Date().toISOString() };
      try { await db.sb.from('profiles').update({ intake }).eq('id', ctx.state.profile.id); } catch (_) { /* intake je bonus */ }
      jset(KEY, null);
    }
  } catch (_) { /* ak niečo zlyhá, človek vidí vyplnený formulár a uloží ho sám */ }
  finally { filling = false; uncover(); }
}

// ---------- kedy sa kvíz ukáže ----------
function scan() {
  const app = document.getElementById('app'); if (!app) return;
  const onb = app.querySelector('#onb');
  if (onb) { if (el) close(false); autofill(onb); return; }
  const auth = app.querySelector('#authf');
  if (!auth) { if (el && ctx.state?.session) close(false); return; }
  // tlačidlo Registrovať otvorí kvíz
  const reg = app.querySelector('[data-m=register]');
  if (reg && !reg.dataset.fq) { reg.dataset.fq = '1'; reg.addEventListener('click', e => { e.preventDefault(); e.stopImmediatePropagation(); jset(SKIP, null, sessionStorage); open(jget(KEY)?.goal ? 1 : 0); }, true); }
  if (!el && !jget(SKIP, sessionStorage) && !known()) open(0);
}
const app = document.getElementById('app');
if (app) new MutationObserver(scan).observe(app, { childList: true, subtree: true });
scan();
