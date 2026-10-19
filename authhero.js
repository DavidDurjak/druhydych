// Úvodná obrazovka (prihlásenie a registrácia): logo namiesto nadpisu FUELWIND a živá ukážka toho, čo appka robí.
// V karte sa sám napíše príklad jedla („2 vajcia a rožok“), objavia sa čipy položiek, krúžok dopočíta kalórie a pruhy bielkoviny, sacharidy a tuky.
// Príklady sa striedajú dookola. Pri obmedzení pohybu sa ukáže len prvý príklad bez animácie.
import { tr } from './i18n.js';

const CSS = `
.ah-brand{display:flex;align-items:center;gap:10px;margin-bottom:18px}
.ah-brand img{width:38px;height:38px;border-radius:11px;box-shadow:0 6px 18px rgba(124,255,178,.18)}
.ah-brand b{font-size:19px;font-weight:800;letter-spacing:-.02em;color:var(--text)}
.ah-demo{margin-top:20px;padding:14px;border-radius:22px;border:1px solid color-mix(in srgb,var(--accent) 28%,var(--line));
  background:radial-gradient(120% 100% at 0% 0%,color-mix(in srgb,var(--accent) 12%,transparent),transparent 60%),var(--card);box-shadow:0 14px 34px rgba(0,0,0,.18)}
.ah-in{display:flex;align-items:center;gap:10px;height:46px;padding:0 6px 0 14px;border-radius:14px;background:var(--bg-2);border:1px solid var(--line)}
.ah-in span{flex:1;min-width:0;font-size:15.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text)}
.ah-in i{display:inline-block;width:2px;height:18px;margin-left:1px;vertical-align:-3px;background:var(--accent);animation:ahBlink 1s steps(1) infinite}
.ah-in em{flex:none;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;font-style:normal;font-weight:800;background:var(--accent);color:var(--accent-ink,#06130C);transition:transform .2s}
.ah-demo.ah-go .ah-in em{transform:scale(.88)}
@keyframes ahBlink{50%{opacity:0}}
.ah-out{display:flex;align-items:center;gap:14px;margin-top:12px;transition:opacity .35s,transform .35s}
.ah-demo:not(.ah-res) .ah-out{opacity:.25;transform:translateY(4px)}
.ah-ring{position:relative;flex:none;width:72px;height:72px}
.ah-ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.ah-ring circle{fill:none;stroke-width:7}
.ah-ring .b{stroke:var(--track,rgba(255,255,255,.08))}
.ah-ring .f{stroke:var(--accent);stroke-linecap:round;transition:stroke-dashoffset .9s cubic-bezier(.3,1,.4,1)}
.ah-ring div{position:absolute;inset:0;display:grid;place-items:center;text-align:center;line-height:1}
.ah-ring b{display:block;font-size:19px;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.ah-ring small{display:block;font-size:10.5px;color:var(--muted);margin-top:2px}
.ah-mac{flex:1;display:grid;gap:7px;min-width:0}
.ah-mac div{display:grid;grid-template-columns:76px 1fr 38px;align-items:center;gap:8px;font-size:12.5px;color:var(--muted)}
.ah-mac p{margin:0;height:6px;border-radius:99px;background:var(--track,rgba(255,255,255,.08));overflow:hidden}
.ah-mac p i{display:block;height:100%;width:0;border-radius:99px;transition:width .8s cubic-bezier(.3,1,.4,1)}
.ah-mac b{color:var(--text);font-size:12.5px;text-align:right;font-variant-numeric:tabular-nums}
body.ah-on #app{position:relative;isolation:isolate}
body.ah-on #app::before{content:"";position:absolute;left:0;right:0;top:0;height:560px;z-index:-1;pointer-events:none;
  background:var(--accent);opacity:.13;
  -webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='560' fill='none' stroke='%23000' stroke-linecap='round'%3E%3Cpath d='M0 120C150 60 260 180 420 120S700 70 900 120' stroke-width='2.2'/%3E%3Cpath d='M0 190C170 130 300 250 470 190S720 140 900 190' stroke-width='1.4'/%3E%3Cpath d='M0 270C130 220 290 320 450 262S760 215 900 270' stroke-width='3'/%3E%3Cpath d='M0 350C200 300 330 400 520 340S760 300 900 350' stroke-width='1.2'/%3E%3Cpath d='M0 60C120 20 300 100 460 55S760 20 900 60' stroke-width='1'/%3E%3C/svg%3E");
  mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='560' fill='none' stroke='%23000' stroke-linecap='round'%3E%3Cpath d='M0 120C150 60 260 180 420 120S700 70 900 120' stroke-width='2.2'/%3E%3Cpath d='M0 190C170 130 300 250 470 190S720 140 900 190' stroke-width='1.4'/%3E%3Cpath d='M0 270C130 220 290 320 450 262S760 215 900 270' stroke-width='3'/%3E%3Cpath d='M0 350C200 300 330 400 520 340S760 300 900 350' stroke-width='1.2'/%3E%3Cpath d='M0 60C120 20 300 100 460 55S760 20 900 60' stroke-width='1'/%3E%3C/svg%3E");
  -webkit-mask-size:900px 560px;mask-size:900px 560px;-webkit-mask-repeat:repeat-x;mask-repeat:repeat-x;
  animation:ahWind 38s linear infinite;
  -webkit-mask-composite:source-over}
body.ah-on #app::after{content:"";position:absolute;left:-20%;right:-20%;top:-120px;height:420px;z-index:-1;pointer-events:none;
  background:radial-gradient(50% 60% at 30% 40%,color-mix(in srgb,var(--accent) 16%,transparent),transparent 70%)}
@keyframes ahWind{to{-webkit-mask-position:-900px 0;mask-position:-900px 0}}
.ah-brand b{font-size:20px}
body.ah-on .hero{padding-top:calc(env(safe-area-inset-top) + 28px);padding-bottom:14px}
body.ah-on .hero h1{font-size:34px}
body.ah-on .hero p.lead{font-size:15px;margin-top:10px}
body.ah-on .hero+.screen{padding-top:0}
.ah-demo{margin-top:16px}
.ah-demo{position:relative;overflow:hidden;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
.ah-demo::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;
  background:linear-gradient(105deg,transparent 30%,color-mix(in srgb,var(--accent) 22%,transparent) 50%,transparent 70%);transform:translateX(-100%)}
.ah-demo.ah-go::after{animation:ahSweep .7s ease-out}
@keyframes ahSweep{0%{opacity:1;transform:translateX(-100%)}100%{opacity:1;transform:translateX(100%)}}
.ah-items{display:flex;flex-wrap:wrap;gap:6px;min-height:28px;margin-top:10px}
.ah-items span{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border-radius:99px;font-size:12.5px;color:var(--text);
  background:color-mix(in srgb,var(--accent) 12%,var(--bg-2));border:1px solid color-mix(in srgb,var(--accent) 26%,var(--line));
  animation:ahPop .38s cubic-bezier(.3,1.4,.5,1) both}
.ah-items span b{font-weight:800;font-variant-numeric:tabular-nums;color:var(--accent)}
@keyframes ahPop{from{opacity:0;transform:translateY(6px) scale(.9)}to{opacity:1;transform:none}}
.seg:has(+#authf){position:relative;isolation:isolate}
.seg:has(+#authf)::before{content:"";position:absolute;z-index:-1;top:4px;bottom:4px;left:4px;width:calc(50% - 6px);border-radius:9px;
  background:var(--card-2);box-shadow:0 2px 8px rgba(0,0,0,.18);transition:transform .28s cubic-bezier(.3,1.1,.4,1)}
.seg:has(+#authf):has(button[data-m=register].on)::before{transform:translateX(calc(100% + 4px))}
.seg:has(+#authf) button.on{background:transparent!important}
#authf .input{height:52px;border-radius:14px;transition:border-color .2s,box-shadow .2s,background .2s}
#authf .input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 4px color-mix(in srgb,var(--accent) 20%,transparent)}
#authf .btn.primary{position:relative;overflow:hidden;height:54px;border-radius:15px;font-size:16.5px;letter-spacing:-.01em;
  box-shadow:0 10px 26px color-mix(in srgb,var(--accent) 34%,transparent);transition:transform .15s,box-shadow .2s}
#authf .btn.primary:active{transform:scale(.98)}
.ah-trust{display:grid;gap:8px;margin:18px 4px 6px;font-size:13px;color:var(--muted)}
.ah-trust div{display:flex;align-items:center;gap:10px}
.ah-trust svg{flex:none;width:18px;height:18px;stroke:var(--accent);fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
@media (prefers-reduced-motion:reduce){body.ah-on #app::before{animation:none}.ah-demo.ah-go::after{animation:none}.ah-items span{animation:none}.seg:has(+#authf)::before{transition:none}}
@media (prefers-reduced-motion:reduce){.ah-in i{animation:none}.ah-out,.ah-ring .f,.ah-mac p i{transition:none}}
`;
const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

// príklady: text, kcal, bielkoviny, sacharidy, tuky (g), položky
const EX = [
  ['2 vajcia a rožok', 290, 17, 30, 11, [['2 vajcia', 140], ['rožok', 150]]],
  ['Kuracie prsia s ryžou a zeleninou', 540, 46, 62, 9, [['kuracie prsia', 210], ['ryža', 250], ['zelenina', 80]]],
  ['Skyr s banánom a ovsenými vločkami', 330, 24, 48, 4, [['skyr', 110], ['banán', 90], ['vločky', 130]]],
  ['Bryndzové halušky', 720, 22, 88, 30, [['halušky', 340], ['bryndza', 230], ['slanina', 150]]],
];
const MAC = [['Bielkoviny', 'var(--protein,#7CFFB2)', 60], ['Sacharidy', 'var(--carbs,#5BB8FF)', 100], ['Tuky', 'var(--fat,#FFB547)', 40]];
const C = 2 * Math.PI * 30;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function build(hero) {
  hero.dataset.ah = '1';
  const tag = hero.querySelector('.tag');
  if (tag) tag.outerHTML = '<div class="ah-brand"><img src="icon.svg" alt=""><b class="notranslate">Fuelwind</b></div>';
  const demo = document.createElement('div');
  demo.className = 'ah-demo'; demo.setAttribute('aria-hidden', 'true');
  demo.innerHTML = `<div class="ah-in"><span class="notranslate"></span><em>→</em></div>
    <div class="ah-items"></div>
    <div class="ah-out"><div class="ah-ring"><svg viewBox="0 0 72 72"><circle class="b" cx="36" cy="36" r="30"/><circle class="f" cx="36" cy="36" r="30" stroke-dasharray="${C}" stroke-dashoffset="${C}"/></svg><div><span><b class="notranslate">0</b><small>kcal</small></span></div></div>
    <div class="ah-mac">${MAC.map(([n, c]) => `<div><span>${n}</span><p><i style="background:${c}"></i></p><b class="notranslate">0 g</b></div>`).join('')}</div></div>`;
  (hero.querySelector('.lead') || hero.lastElementChild).after(demo);
  run(demo);
}

function show(demo, ex) {
  const [, kcal, ...m] = ex; m.pop();
  demo.classList.add('ah-res');
  const box = demo.querySelector('.ah-items');
  ex[5].forEach(([n, k], i) => { const sp = document.createElement('span'); sp.style.animationDelay = reduce ? '0s' : `${i * 160}ms`; sp.innerHTML = `${tr(n) || n} <b class="notranslate">${k}</b>`; box.appendChild(sp); });
  demo.querySelector('.ah-ring .f').style.strokeDashoffset = String(C * (1 - Math.min(1, kcal / 900)));
  const b = demo.querySelector('.ah-ring b');
  if (reduce) b.textContent = kcal;
  else { const t0 = performance.now(); const step = t => { const k = Math.min(1, (t - t0) / 800); b.textContent = Math.round(kcal * (1 - Math.pow(1 - k, 3))); if (k < 1 && demo.isConnected) requestAnimationFrame(step); }; requestAnimationFrame(step); }
  demo.querySelectorAll('.ah-mac > div').forEach((row, i) => { row.querySelector('i').style.width = `${Math.min(100, m[i] / MAC[i][2] * 100)}%`; row.querySelector('b').textContent = `${m[i]} g`; });
}
function clear(demo) {
  demo.classList.remove('ah-res', 'ah-go');
  demo.querySelector('.ah-items').textContent = '';
  demo.querySelector('.ah-ring .f').style.strokeDashoffset = String(C);
  demo.querySelector('.ah-ring b').textContent = '0';
  demo.querySelectorAll('.ah-mac i').forEach(i => { i.style.width = '0'; });
}

async function run(demo) {
  const span = demo.querySelector('.ah-in span');
  const text = s => tr(s) || s; // v jazyku používateľa, ak už je preklad v slovníku
  if (reduce) { span.textContent = text(EX[0][0]); show(demo, EX[0]); return; }
  span.insertAdjacentHTML('afterend', '<i></i>');
  for (let n = 0; demo.isConnected; n++) {
    const ex = EX[n % EX.length], s = text(ex[0]);
    clear(demo); span.textContent = '';
    await sleep(500);
    for (let i = 1; i <= s.length && demo.isConnected; i++) { span.textContent = s.slice(0, i); await sleep(42 + Math.random() * 40); }
    await sleep(350); demo.classList.add('ah-go'); await sleep(250);
    show(demo, ex);
    await sleep(2600);
  }
}

const ICO = {
  bolt: '<svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/></svg>',
};
function trust() {
  const card = document.querySelector('#app .screen .card');
  if (!card || card.dataset.aht || !card.querySelector('#authf')) return;
  card.dataset.aht = '1';
  const t = document.createElement('div'); t.className = 'ah-trust';
  t.innerHTML = `<div>${ICO.bolt}<span>${tr('Zápis textom, hlasom aj fotkou jedla') || 'Zápis textom, hlasom aj fotkou jedla'}</span></div><div>${ICO.book}<span>${tr('Vyše 7 000 receptov s reálnou fotkou') || 'Vyše 7 000 receptov s reálnou fotkou'}</span></div>`;
  card.after(t);
}
function scan() {
  document.body.classList.toggle('ah-on', !!document.querySelector('#app #authf'));
  trust();
  const hero = document.querySelector('#app .hero');
  if (hero && !hero.dataset.ah && document.querySelector('#authf')) build(hero);
}
const app = document.getElementById('app');
if (app) { new MutationObserver(scan).observe(app, { childList: true, subtree: true }); scan(); }
