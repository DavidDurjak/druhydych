// Jedna veta po zápise jedla (ako Simple Avo): čo zápis znamená pre zvyšok dňa. Počíta sa v telefóne z dnešných zápisov a cieľov,
// bez AI a bez čakania. Ukáže sa na pár sekúnd nad spodnou lištou; ťuknutie otvorí chat s pomocníkom.
import * as db from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';

const CSS = `
.al-pill{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 86px);z-index:900;transform:translate(-50%,24px);opacity:0;display:flex;gap:10px;align-items:flex-start;
  width:min(440px,calc(100% - 32px));padding:12px 14px;border-radius:18px;background:var(--card);color:var(--text);border:1px solid color-mix(in srgb,var(--accent) 35%,var(--line));
  box-shadow:0 16px 40px rgba(0,0,0,.28);transition:transform .35s cubic-bezier(.2,1.2,.4,1),opacity .25s;cursor:pointer;-webkit-tap-highlight-color:transparent}
.al-pill.on{transform:translate(-50%,0);opacity:1}
.al-pill i{font-style:normal;font-size:18px;line-height:1.3;color:var(--accent)}
.al-pill p{margin:0;font-size:14px;line-height:1.4}
.al-pill b{font-weight:700}
.al-pill button{margin-left:auto;border:0;background:none;color:var(--muted);font-size:18px;line-height:1;padding:0 0 0 6px;cursor:pointer}
@media (prefers-reduced-motion:reduce){.al-pill{transition:none}}
`;
if (!document.getElementById('al-css')) { const s = document.createElement('style'); s.id = 'al-css'; s.textContent = CSS; document.head.appendChild(s); }

const r0 = v => Math.round(Number(v) || 0);
const OFF = 'fw_al_off';

// pravidlá v poradí dôležitosti; vždy jedna veta s konkrétnym číslom
function sentence(sum, p, n) {
  const tk = Number(p.target_kcal) || 0, tp = Number(p.target_protein) || 0; if (!tk) return '';
  const left = tk - sum.kcal, pGap = tp - sum.protein, hour = new Date().getHours();
  if (n === 1 && sum.kcal < tk * 0.4) return `Prvý zápis dňa je za tebou. Zostáva <b>${r0(left)} kcal</b>${tp ? ` a <b>${r0(Math.max(0, pGap))} g</b> bielkovín` : ''}.`;
  if (left < -tk * 0.1) return `Dnes si nad cieľom o <b>${r0(-left)} kcal</b>. Jeden deň nič nepokazí, rozhoduje týždenný priemer. Zvyšok dňa už ľahšie.`;
  if (left < -60) return `Si mierne nad cieľom, o <b>${r0(-left)} kcal</b>. V pohode, zajtra pokračuj normálne.`;
  if (left <= 150 && pGap > 20) return `Kalórie sú skoro vyčerpané, ale bielkovín chýba <b>${r0(pGap)} g</b>. Ak ešte niečo, tak chudé: skyr, tvaroh alebo kuracie.`;
  if (left <= 150) return `Deň máš takmer presne v pláne, zostáva <b>${r0(Math.max(0, left))} kcal</b>. Takto sa to robí.`;
  if (tp && pGap <= 0) return `Bielkoviny máš splnené. Zostáva <b>${r0(left)} kcal</b> na čokoľvek, čo ti chutí.`;
  if (hour >= 18 && left > tk * 0.4) return `Zostáva ešte <b>${r0(left)} kcal</b>. Daj si poriadnu večeru, nech nejdeš spať hladný${pGap > 25 ? ` a doplň <b>${r0(pGap)} g</b> bielkovín` : ''}.`;
  if (tp && pGap > 0) {
    const meals = hour < 11 ? 3 : hour < 15 ? 2 : 1, per = Math.min(60, Math.ceil(pGap / meals / 5) * 5);
    return `Zostáva <b>${r0(left)} kcal</b> a <b>${r0(pGap)} g</b> bielkovín. ${meals > 1 ? `Do ďalšieho jedla daj aspoň <b>${per} g</b> bielkovín.` : 'Večera by mala byť hlavne bielkovinová.'}`;
  }
  return `Zostáva <b>${r0(left)} kcal</b>.`;
}

let el = null, tmr = 0;
function show(html) {
  if (!el) {
    el = document.createElement('div'); el.className = 'al-pill'; el.setAttribute('role', 'status');
    el.addEventListener('click', e => {
      if (e.target.closest('button')) { el.classList.remove('on'); return; }
      el.classList.remove('on'); document.querySelector('.bd-fab')?.click();
    });
    document.body.appendChild(el);
  }
  el.innerHTML = `<i>✦</i><p>${html}</p><button aria-label="Zavrieť">×</button>`;
  requestAnimationFrame(() => el.classList.add('on'));
  clearTimeout(tmr); tmr = setTimeout(() => el.classList.remove('on'), 6500);
}

addEventListener('fw-logged', async () => {
  try {
    if (localStorage.getItem(OFF) === '1') return;
    const st = ctx.state || {}, p = st.profile; if (!p?.id) return;
    const date = st.date || calc.today(); if (date !== calc.today()) return;
    const foods = await db.listFood(p.id, date);
    const s = sentence(calc.sumMacros(foods), p, foods.length);
    if (s) setTimeout(() => show(s), 700);
  } catch (_) { /* veta po zápise je bonus */ }
});
