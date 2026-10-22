// Jedna veta po zápise jedla: čo zápis znamená pre zvyšok dňa. Základ sa počíta v telefóne z dnešných zápisov a cieľov (bez čakania),
// a ak stihne odpovedať AI kouč (funkcia coach-afterlog), ukáže sa jeho osobná veta o tom, čo človek práve zapísal.
// Ukáže sa na pár sekúnd nad spodnou lištou; ťuknutie otvorí chat s pomocníkom.
import * as db from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';
import { currentLang } from './i18n.js';

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

const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// čísla s jednotkou zvýrazníme rovnako ako vo vete z pravidiel (ide až po escapovaní, takže HTML od AI sa nikdy nevykoná)
const boldNums = t => t.replace(/((?:\d{1,3}(?:[\s ]\d{3})+|\d+)(?:[.,]\d+)?\s?(?:kcal|kg|g|%))(?![\p{L}\d])/giu, '<b>$1</b>');

// Osobná veta od kouča (AI): reaguje na to, čo človek práve zapísal. Čaká najviac chvíľu, potom sa ukáže veta z pravidiel hore.
// Pri chybe, limite alebo bez internetu sa nestane nič viditeľné. Najviac raz za 30 sekúnd.
let aiAt = 0;
async function aiSentence(p, foods, sum, n) {
  if (!navigator.onLine || Date.now() - aiAt < 30000) return '';
  aiAt = Date.now();
  const last = foods.slice(-Math.min(3, Math.max(1, n || 1))).map(f => ({ name: f.name, meal: f.meal, grams: f.grams, kcal: f.kcal, protein: f.protein }));
  const body = {
    lang: currentLang(), name: String(p.name || '').trim().split(/\s+/)[0], goal: p.goal, hour: new Date().getHours(), n_today: foods.length,
    target: { kcal: p.target_kcal, protein: p.target_protein }, eaten: { kcal: sum.kcal, protein: sum.protein, carbs: sum.carbs, fat: sum.fat }, last,
  };
  const call = db.sb.functions.invoke('coach-afterlog', { body }).then(r => (!r.error && r.data?.s ? String(r.data.s) : '')).catch(() => '');
  return Promise.race([call, new Promise(res => setTimeout(() => res(''), 2600))]);
}

addEventListener('fw-logged', async e => {
  try {
    if (localStorage.getItem(OFF) === '1') return;
    const st = ctx.state || {}, p = st.profile; if (!p?.id) return;
    const date = st.date || calc.today(); if (date !== calc.today()) return;
    const t0 = Date.now();
    const foods = await db.listFood(p.id, date);
    const sum = calc.sumMacros(foods);
    const rule = sentence(sum, p, foods.length);
    const ai = Number(p.target_kcal) > 0 && foods.length ? await aiSentence(p, foods, sum, e?.detail?.n) : '';
    const html = ai ? boldNums(esc(ai)) : rule;
    if (!html) return;
    if (ai) { try { window.fwTrack && window.fwTrack('afterlog_shown', { ai: 1 }); } catch (_) { } }
    setTimeout(() => show(html), Math.max(0, 700 - (Date.now() - t0)));
  } catch (_) { /* veta po zápise je bonus */ }
});
