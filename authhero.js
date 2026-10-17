// Úvodná obrazovka (prihlásenie a registrácia): logo namiesto nadpisu FUELWIND a živá ukážka toho, čo appka robí.
// V karte sa sám napíše príklad jedla („2 vajcia a rožok“), krúžok dopočíta kalórie a pruhy bielkoviny, sacharidy a tuky.
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
@media (prefers-reduced-motion:reduce){.ah-in i{animation:none}.ah-out,.ah-ring .f,.ah-mac p i{transition:none}}
`;
const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

// príklady: text, kcal, bielkoviny, sacharidy, tuky (g)
const EX = [['2 vajcia a rožok', 290, 17, 30, 11], ['Kuracie prsia s ryžou a zeleninou', 540, 46, 62, 9], ['Skyr s banánom a ovsenými vločkami', 330, 24, 48, 4], ['Bryndzové halušky', 720, 22, 88, 30]];
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
    <div class="ah-out"><div class="ah-ring"><svg viewBox="0 0 72 72"><circle class="b" cx="36" cy="36" r="30"/><circle class="f" cx="36" cy="36" r="30" stroke-dasharray="${C}" stroke-dashoffset="${C}"/></svg><div><span><b class="notranslate">0</b><small>kcal</small></span></div></div>
    <div class="ah-mac">${MAC.map(([n, c]) => `<div><span>${n}</span><p><i style="background:${c}"></i></p><b class="notranslate">0 g</b></div>`).join('')}</div></div>`;
  (hero.querySelector('.lead') || hero.lastElementChild).after(demo);
  run(demo);
}

function show(demo, ex) {
  const [, kcal, ...m] = ex;
  demo.classList.add('ah-res');
  demo.querySelector('.ah-ring .f').style.strokeDashoffset = String(C * (1 - Math.min(1, kcal / 900)));
  const b = demo.querySelector('.ah-ring b');
  if (reduce) b.textContent = kcal;
  else { const t0 = performance.now(); const step = t => { const k = Math.min(1, (t - t0) / 800); b.textContent = Math.round(kcal * (1 - Math.pow(1 - k, 3))); if (k < 1 && demo.isConnected) requestAnimationFrame(step); }; requestAnimationFrame(step); }
  demo.querySelectorAll('.ah-mac > div').forEach((row, i) => { row.querySelector('i').style.width = `${Math.min(100, m[i] / MAC[i][2] * 100)}%`; row.querySelector('b').textContent = `${m[i]} g`; });
}
function clear(demo) {
  demo.classList.remove('ah-res', 'ah-go');
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

function scan() {
  const hero = document.querySelector('#app .hero');
  if (hero && !hero.dataset.ah && document.querySelector('#authf')) build(hero);
}
const app = document.getElementById('app');
if (app) { new MutationObserver(scan).observe(app, { childList: true, subtree: true }); scan(); }
