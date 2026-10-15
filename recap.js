// Týždeň v príbehu: celoobrazovkový prehľad týždňa v štýle Instagram stories / Spotify Wrapped.
// Skóre, jedlo, tréning, séria dní, telo a jedna vec na budúci týždeň. Na konci kartička na zdieľanie.
// Na Dnes sa ponúkne cez kartu týždenného reportu (nedeľa od 18:00), na obrazovke reportu cez tlačidlo "Prehrať týždeň".
import * as db from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';
import { weeklyReport, fmtSleep } from './health.js';
import { defaultWeek } from './report.js';
import { draw } from './sharecard.js';

const h = (...a) => ctx.h(...a);
const SLIDE_MS = 5500;
const MILESTONES = [3, 7, 14, 30, 60, 100, 200, 365];
const DAYS = ['P', 'U', 'S', 'Š', 'P', 'S', 'N'];
const FOCUS = {
  log: 'Zapisuj jedlo každý deň',
  kcal: 'Traf kalórie aspoň 5 dní zo 7',
  training: 'Odtrénuj všetky plánované tréningy',
  protein: 'Bielkoviny ku každému jedlu',
  weigh: 'Váž sa aspoň 3x ráno',
};
const FOCUS_WHY = {
  log: 'Aj nedokonalý zápis je lepší ako žiadny. Zaberie to minútu denne.',
  kcal: 'Plánuj večeru podľa toho, koľko ti zostáva.',
  training: 'Daj si tréningy do kalendára ako stretnutie.',
  protein: 'Tvaroh, vajcia, kuracie, skyr alebo strukoviny.',
  weigh: 'Po WC, pred jedlom. Z viacerých vážení vyjde presnejší trend.',
};
const dni = n => n === 1 ? 'deň' : n >= 2 && n <= 4 ? 'dni' : 'dní';
const sgn = v => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v);
const fmtNum = v => Number(v).toLocaleString('sk-SK');
const verdict = s => s >= 85 ? 'Výborný týždeň' : s >= 70 ? 'Silný týždeň' : s >= 50 ? 'Solídny základ' : s >= 25 ? 'Je čo zlepšovať' : 'Týždeň na reštart';
const scoreLine = s => s >= 85 ? 'Na tejto úrovni sa dá stavať.' : s >= 70 ? 'Silný základ. Chýba už len konzistentnosť.' : s >= 50 ? 'Priemer. Z priemeru sa výsledky nerobia.' : s >= 25 ? 'Slabý týždeň. Nehľadaj výhovorky, nájdi príčinu.' : 'Reštart. Začni jedným zápisom ešte dnes.';
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const CSS = `
.rc{position:fixed;inset:0;z-index:200;background:#0B0E12;color:#F4F7FA;overflow:hidden;font-family:'Sora',system-ui,-apple-system,sans-serif;touch-action:manipulation;-webkit-user-select:none;user-select:none;animation:rcIn .22s ease-out}
@keyframes rcIn{from{opacity:0;transform:scale(1.03)}to{opacity:1;transform:none}}
.rc-bars{position:absolute;left:14px;right:14px;top:calc(env(safe-area-inset-top) + 12px);display:flex;gap:5px;z-index:4}
.rc-bars i{flex:1;height:4px;border-radius:4px;background:rgba(255,255,255,.18);overflow:hidden}
.rc-bars b{display:block;height:100%;width:0;background:#F4F7FA;border-radius:4px}
.rc-x{position:absolute;right:10px;top:calc(env(safe-area-inset-top) + 22px);z-index:5;width:44px;height:44px;border:0;border-radius:50%;background:rgba(255,255,255,.1);color:#F4F7FA;font:inherit;font-size:26px;line-height:1;cursor:pointer;-webkit-appearance:none;appearance:none}
.rc-brand{position:absolute;left:18px;top:calc(env(safe-area-inset-top) + 28px);z-index:4;display:flex;align-items:center;gap:8px;font-weight:800;font-size:15px;letter-spacing:.01em}
.rc-brand svg{width:20px;height:20px}
.rc-tap{position:absolute;top:0;bottom:0;z-index:2}
.rc-tap.l{left:0;width:32%}.rc-tap.r{right:0;width:68%}
.rc-stage{position:absolute;inset:0;z-index:3;pointer-events:none}
.rc-s{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:calc(env(safe-area-inset-top) + 84px) 28px calc(env(safe-area-inset-bottom) + 36px);opacity:0;visibility:hidden;transition:opacity .25s}
.rc-s.on{opacity:1;visibility:visible}
.rc-s::before{content:"";position:absolute;inset:0;z-index:-1;background:radial-gradient(120% 70% at 50% 38%,var(--g1,rgba(124,255,178,.22)),rgba(11,14,18,0) 62%),radial-gradient(90% 50% at 90% 100%,var(--g2,rgba(63,213,196,.12)),rgba(11,14,18,0) 70%)}
.rc-k{font-size:15px;font-weight:600;color:#8C97A6;margin:0 0 6px}
.rc-h{font-size:34px;line-height:1.12;font-weight:800;margin:0;letter-spacing:-.01em}
.rc-big{font-size:132px;line-height:.95;font-weight:800;margin:6px 0 0;letter-spacing:-.04em;font-variant-numeric:tabular-nums}
.rc-big small{font-size:46px;color:#8C97A6;font-weight:700;letter-spacing:0;margin-left:6px}
.rc-t{font-size:19px;line-height:1.4;color:#C6CEDA;margin:14px 0 0;max-width:30ch}
.rc-t b{color:#F4F7FA}
.rc-chip{display:inline-flex;align-self:flex-start;margin-top:16px;padding:9px 16px;border-radius:99px;font-weight:700;font-size:16px;background:rgba(255,255,255,.08)}
.rc-chip.up{background:rgba(124,255,178,.15);color:#7CFFB2}.rc-chip.dn{background:rgba(255,138,122,.15);color:#FF8A7A}
.rc-dots{display:flex;gap:9px;margin:22px 0 4px}
.rc-dots span{flex:1;max-width:44px;text-align:center;font-size:12px;font-weight:700;color:#8C97A6}
.rc-dots span i{display:block;height:44px;border-radius:14px;background:rgba(255,255,255,.08);margin-bottom:6px;transition:background .3s,transform .3s}
.rc-dots span.f i{background:var(--c,#7CFFB2);box-shadow:0 0 18px -4px var(--c,#7CFFB2)}
.rc-bar{height:12px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden;margin-top:22px}
.rc-bar i{display:block;height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,#3FD5C4,#7CFFB2);transition:width 1s cubic-bezier(.2,.8,.2,1)}
.rc-ring{width:250px;height:250px;margin:0 auto 6px;position:relative}
.rc-ring svg{width:100%;height:100%;transform:rotate(-90deg);overflow:visible}
.rc-ring .v{position:absolute;inset:0;display:grid;place-content:center;text-align:center}
.rc-ring .v b{font-size:84px;font-weight:800;line-height:1;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.rc-ring .v span{font-size:15px;color:#8C97A6;font-weight:600}
.rc-c{text-align:center;align-items:center}.rc-c .rc-t{max-width:26ch}.rc-c .rc-chip{align-self:center}
.rc-flame{width:92px;height:92px;margin:0 0 4px;filter:drop-shadow(0 0 22px rgba(255,138,76,.55))}
.rc-pills{display:flex;flex-direction:column;gap:10px;margin-top:22px;align-self:stretch;text-align:left}
.rc-pill{display:flex;justify-content:space-between;align-items:baseline;padding:15px 18px;border-radius:18px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.07)}
.rc-pill span{color:#9AA6B6;font-size:15px;margin-right:12px}.rc-pill b{font-size:22px;font-weight:800}
.rc-pill em{font-style:normal;font-size:14px;margin-left:8px;font-weight:700}
.rc-act{display:flex;flex-direction:column;gap:10px;margin-top:26px;pointer-events:auto}
.rc-act button,.rc-act a{pointer-events:auto;display:block;text-align:center;font:inherit;font-weight:800;font-size:17px;padding:16px;border-radius:18px;border:0;cursor:pointer;-webkit-appearance:none;appearance:none;text-decoration:none}
.rc-act .go{background:#7CFFB2;color:#06301A}.rc-act .gh{background:rgba(255,255,255,.1);color:#F4F7FA}
.rc-hint{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom) + 18px);text-align:center;font-size:13px;color:#6F7A89;z-index:3;pointer-events:none}
.rc-s.pop .rc-big,.rc-s.pop .rc-h,.rc-s.pop .rc-t,.rc-s.pop .rc-pills,.rc-s.pop .rc-dots,.rc-s.pop .rc-chip{animation:rcUp .55s cubic-bezier(.2,.8,.2,1) both}
.rc-s.pop .rc-t{animation-delay:.12s}.rc-s.pop .rc-chip,.rc-s.pop .rc-pills,.rc-s.pop .rc-dots{animation-delay:.2s}
@keyframes rcUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.rc,.rc-s.pop *{animation:none!important}.rc-s{transition:none}.rc-bar i{transition:none}}
.rp-play{display:flex;align-items:center;justify-content:center;gap:8px}
`;
if (typeof document !== 'undefined' && !document.getElementById('rc-css')) { const s = document.createElement('style'); s.id = 'rc-css'; s.textContent = CSS; document.head.appendChild(s); }

const FLAME = 'M13.4 2.6c.3 2.6 2.1 3.9 3.5 5.9 1.5 2.1 2.1 4.2 1.6 6.4-.7 3.1-3.4 5.2-6.5 5.2-3.3 0-5.9-2.4-5.9-5.6 0-2 .9-3.5 2.2-4.8.2 1.1.8 1.9 1.7 2.3-.4-2.9.5-5.9 3.4-11.4z';
const flameSvg = (cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="rcfl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC46B"/><stop offset="1" stop-color="#FF6B35"/></linearGradient></defs><path d="${FLAME}" fill="url(#rcfl)"/></svg>`;
const miniFlame = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${FLAME}" fill="rgba(124,255,178,.2)" stroke="#7CFFB2" stroke-width="1.9" stroke-linejoin="round"/></svg>`;

function longest(dates) {
  const s = [...new Set(dates)].sort(); let best = 0, run = 0, prev = null;
  for (const d of s) { run = prev && calc.addDays(prev, 1) === d ? run + 1 : 1; best = Math.max(best, run); prev = d; }
  return best;
}

async function gather(uid, from) {
  const [r, dates] = await Promise.all([weeklyReport(uid, from), db.activityDates(uid, calc.addDays(calc.today(), -400))]);
  const set = new Set(dates);
  const week = Array.from({ length: 7 }, (_, i) => calc.addDays(from, i));
  return { r, from, week: week.map(d => set.has(d)), streak: calc.streak(dates), best: longest(dates) };
}

function build(D, me) {
  const r = D.r, S = [];
  const score = Number(r.score) || 0, prev = r.prev_score == null ? null : Number(r.prev_score);
  const delta = prev != null && (prev > 0 || score > 0) ? score - prev : null;
  const empty = !r.days_logged && !r.weigh_ins && !r.trainings;
  const period = `${calc.fmtDate(D.from)} až ${calc.fmtDate(calc.addDays(D.from, 6))}`;
  const name = (me?.name || '').split(' ')[0];

  S.push({ g: ['rgba(124,255,178,.24)', 'rgba(63,213,196,.1)'], c: true, html: `
    <p class="rc-k">${h(period)}</p><h2 class="rc-big" style="font-size:64px;letter-spacing:-.03em">Tvoj týždeň${name ? ',<br>' + h(name) : ''}</h2>
    <p class="rc-t">${empty ? 'Tento týždeň je zatiaľ prázdny.' : 'Pozrime sa, ako ti to naozaj išlo. Bez príkras.'}</p>` });

  if (empty) {
    S.push({ g: ['rgba(255,138,122,.18)', 'rgba(255,138,76,.08)'], last: true, html: `
      <p class="rc-k">Zatiaľ bez dát</p><h2 class="rc-h">Nemám z čoho rátať.</h2>
      <p class="rc-t">Zapíš aspoň jedno jedlo a už zajtra tu uvidíš prvé čísla.</p>
      <div class="rc-act"><a class="go" href="#/dnes" data-close>Zapísať jedlo</a><button class="gh" data-close>Zavrieť</button></div>` });
    return S;
  }

  const R = 112, C = 2 * Math.PI * R;
  S.push({ g: score >= 70 ? ['rgba(124,255,178,.26)', 'rgba(63,213,196,.1)'] : score >= 40 ? ['rgba(255,196,107,.2)', 'rgba(255,138,76,.08)'] : ['rgba(255,138,122,.22)', 'rgba(255,107,53,.08)'], c: true, html: `
    <div class="rc-ring"><svg viewBox="0 0 250 250" aria-hidden="true"><defs><linearGradient id="rcg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3FD5C4"/><stop offset="1" stop-color="#7CFFB2"/></linearGradient></defs>
      <circle cx="125" cy="125" r="${R}" fill="none" stroke="rgba(255,255,255,.09)" stroke-width="20"/>
      <circle class="rc-arc" cx="125" cy="125" r="${R}" fill="none" stroke="url(#rcg)" stroke-width="20" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${C.toFixed(1)}" data-off="${(C * (1 - Math.min(100, score) / 100)).toFixed(1)}" style="transition:stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)"/></svg>
      <div class="v"><b data-n="${score}">0</b><span>zo 100</span></div></div>
    <h2 class="rc-h">${verdict(score)}</h2>
    ${delta != null ? `<span class="rc-chip ${delta > 0 ? 'up' : delta < 0 ? 'dn' : ''}">${sgn(delta)} oproti minulému týždňu</span>` : '<span class="rc-chip">Prvý týždeň, porovnanie príde nabudúce</span>'}
    <p class="rc-t">${scoreLine(score)}</p>` });

  if (r.days_logged) {
    const tp = Number(r.target_protein) || 0, pa = Number(r.protein_avg) || 0;
    const pct = tp ? Math.min(100, Math.round(pa / tp * 100)) : 0;
    const gap = tp ? Math.max(0, Math.round(tp - pa)) : 0;
    S.push({ g: ['rgba(255,138,76,.22)', 'rgba(255,196,107,.08)'], html: `
      <p class="rc-k">Jedlo</p><h2 class="rc-big">${r.days_logged}<small>/ 7 dní</small></h2>
      <div class="rc-dots" style="--c:#FFB26B">${D.week.map((on, i) => `<span class="${on ? 'f' : ''}"><i></i>${DAYS[i]}</span>`).join('')}</div>
      <p class="rc-t">${r.days_logged >= 7 ? '<b>Každý deň.</b> Takto sa buduje výsledok.' : r.days_logged >= 5 ? `Dobré. Nezapísaný deň je deň, o ktorom nič nevieš.` : `Nezapísaný deň je deň naslepo. Cieľ je aspoň 5 zo 7.`}</p>
      ${tp && pa ? `<div class="rc-bar" aria-hidden="true"><i data-w="${pct}"></i></div><p class="rc-t" style="margin-top:10px">Bielkoviny <b>${Math.round(pa)} g</b> denne z ${tp} g. ${gap <= tp * 0.08 ? 'Cieľ splnený.' : `Chýba ti ${gap} g každý deň.`}</p>` : ''}` });
  }

  if (r.training_goal > 0 || r.trainings > 0) {
    const g = Number(r.training_goal) || 0, t = Number(r.trainings) || 0;
    S.push({ g: ['rgba(63,213,196,.24)', 'rgba(70,130,255,.1)'], html: `
      <p class="rc-k">Tréning</p><h2 class="rc-big">${t}<small>/ ${g || '?'}</small></h2>
      <div class="rc-dots" style="--c:#3FD5C4">${Array.from({ length: Math.max(g, t, 1) }, (_, i) => `<span class="${i < t ? 'f' : ''}"><i></i></span>`).join('')}</div>
      <p class="rc-t">${g && t >= g ? '<b>Plán splnený.</b> Presne tak sa to robí.' : t === 0 ? 'Žiadny tréning. Nový týždeň začína v pondelok, nie "nejako potom".' : g ? `Chýba ${g - t}. Daj si ich do kalendára ako stretnutie.` : 'Dobrá práca. Pridaj si v Tréningu plán, nech to má smer.'}</p>` });
  }

  const st = D.streak, nextM = MILESTONES.find(m => m > st);
  S.push({ g: ['rgba(255,138,76,.28)', 'rgba(255,60,60,.08)'], c: true, html: `
    ${flameSvg('rc-flame')}<p class="rc-k">Séria</p><h2 class="rc-big" data-nn="${st}">${st}<small>${dni(st)}</small></h2>
    <p class="rc-t">${st === 0 ? 'Séria je na nule. Jeden zápis dnes ju znova rozbehne.' : st >= 14 ? `<b>Toto je disciplína.</b> Nepusti to teraz.` : st >= 3 ? 'Rozbieha sa to. Nezastavuj.' : 'Začiatok. Zajtra ju predĺž.'}</p>
    <div class="rc-pills"><div class="rc-pill"><span>Tvoja najdlhšia séria</span><b>${D.best}</b></div>${nextM ? `<div class="rc-pill"><span>Ďalší míľnik: ${nextM} ${dni(nextM)}</span><b>ešte ${nextM - st}</b></div>` : ''}</div>` });

  const pills = [];
  if (r.weight_avg != null) {
    const wd = r.prev_weight_avg != null ? Math.round((r.weight_avg - r.prev_weight_avg) * 10) / 10 : null;
    pills.push(`<div class="rc-pill"><span>Priemerná váha</span><b>${String(r.weight_avg).replace('.', ',')} kg${wd != null ? `<em style="color:#9AA6B6">${sgn(wd).replace('.', ',')}</em>` : ''}</b></div>`);
  }
  if (r.steps_avg != null) pills.push(`<div class="rc-pill"><span>Kroky denne</span><b>${fmtNum(Math.round(r.steps_avg))}</b></div>`);
  if (r.sleep_avg != null) pills.push(`<div class="rc-pill"><span>Spánok za noc</span><b>${fmtSleep(Number(r.sleep_avg))}</b></div>`);
  if (pills.length) S.push({ g: ['rgba(150,130,255,.22)', 'rgba(63,213,196,.08)'], html: `
    <p class="rc-k">Telo a regenerácia</p><h2 class="rc-h">Čo hovoria čísla.</h2><div class="rc-pills">${pills.join('')}</div>` });

  const fk = FOCUS[r.focus] ? r.focus : 'log';
  S.push({ g: ['rgba(124,255,178,.22)', 'rgba(63,213,196,.1)'], last: true, html: `
    <p class="rc-k">Budúci týždeň</p><h2 class="rc-h">${h(FOCUS[fk])}</h2><p class="rc-t">${h(FOCUS_WHY[fk])}</p>
    <div class="rc-act"><button class="go" data-share>Zdieľať kartičku</button><a class="gh" href="#/report" data-close>Celý report</a><button class="gh" data-close>Zavrieť</button></div>` });
  return S;
}

function cardData(D, me) {
  const r = D.r, score = Number(r.score) || 0, prev = r.prev_score == null ? null : Number(r.prev_score);
  const delta = prev != null && (prev > 0 || score > 0) ? score - prev : null;
  const stats = [{ val: `${r.days_logged}/7`, lbl: 'dní so zápisom' }, { val: `${r.in_goal}/7`, lbl: 'dní v cieli kcal' }];
  if (r.training_goal > 0) stats.push({ val: `${r.trainings}/${r.training_goal}`, lbl: 'tréningy' });
  if (r.days_logged && r.protein_avg != null) stats.push({ val: `${Math.round(r.protein_avg)} g`, lbl: 'bielkoviny / deň' });
  if (stats.length < 4 && D.streak) stats.push({ val: String(D.streak), lbl: 'dní v rade' });
  return { score, verdict: verdict(score), delta: delta != null ? `${sgn(delta)} oproti minulému týždňu` : '', stats: stats.slice(0, 4), period: `${calc.fmtDate(D.from)} – ${calc.fmtDate(calc.addDays(D.from, 6))}`, name: (me?.name || '').split(' ')[0] };
}

async function shareCard(D, me) {
  const d = cardData(D, me);
  try { await Promise.race([document.fonts.load('800 80px Sora'), new Promise(r => setTimeout(r, 1200))]); } catch (_) { /* náhradné písmo */ }
  const cv = draw(d);
  const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
  const file = new File([blob], 'fuelwind-tyzden.png', { type: 'image/png' });
  try {
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'Fuelwind', text: `Môj týždeň s Fuelwind: ${d.score}/100` }); return; }
  } catch (e) { if (e?.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'fuelwind-tyzden.png';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  ctx.toast('Kartička sa uložila do stiahnutých súborov');
}

let opened = false;
export async function openRecap(from) {
  if (opened) return; opened = true;
  const me = ctx.state?.profile;
  if (!me) { opened = false; return; }
  let D;
  try { D = await gather(me.id, from || defaultWeek()); } catch (e) { opened = false; ctx.toast('Týždeň sa nepodarilo načítať', true); return; }
  const slides = build(D, me);
  const root = document.createElement('div');
  root.className = 'rc'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Tvoj týždeň');
  root.innerHTML = `<div class="rc-brand">${miniFlame}Fuelwind</div>
    <div class="rc-bars">${slides.map(() => '<i><b></b></i>').join('')}</div>
    <button class="rc-x" aria-label="Zavrieť">×</button>
    <div class="rc-tap l"></div><div class="rc-tap r"></div>
    <div class="rc-stage">${slides.map((s, i) => `<section class="rc-s ${s.c ? 'rc-c' : ''}" data-i="${i}" style="--g1:${s.g[0]};--g2:${s.g[1]}" aria-hidden="true">${s.html}</section>`).join('')}</div>
    <div class="rc-hint">Ťukni vpravo ďalej, vľavo späť, drž pre pauzu</div>`;
  document.body.appendChild(root);
  const prevOv = document.body.style.overflow; document.body.style.overflow = 'hidden';

  const els = [...root.querySelectorAll('.rc-s')], bars = [...root.querySelectorAll('.rc-bars b')];
  const auto = !reduced();
  let cur = -1, t = 0, paused = false, timer = null;

  const animate = el => {
    el.querySelectorAll('[data-n]').forEach(n => {
      const to = Number(n.dataset.n);
      if (reduced() || !to) { n.textContent = to; return; }
      const t0 = performance.now();
      const step = tt => { const k = Math.min(1, (tt - t0) / 1000); n.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1 && cur >= 0 && els[cur] === el) requestAnimationFrame(step); else n.textContent = to; };
      requestAnimationFrame(step);
    });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.querySelectorAll('.rc-arc').forEach(c => c.setAttribute('stroke-dashoffset', c.dataset.off));
      el.querySelectorAll('[data-w]').forEach(b => { b.style.width = b.dataset.w + '%'; });
    }));
  };
  const show = i => {
    if (i < 0) i = 0;
    if (i >= els.length) { close(); return; }
    cur = i; t = 0;
    els.forEach((e, k) => { e.classList.toggle('on', k === i); e.classList.toggle('pop', k === i); e.setAttribute('aria-hidden', k === i ? 'false' : 'true'); });
    bars.forEach((b, k) => { b.style.width = k < i ? '100%' : '0'; });
    // znovu spustiť animácie vstupu
    const e = els[i]; e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop');
    e.querySelectorAll('.rc-arc').forEach(c => c.setAttribute('stroke-dashoffset', c.getAttribute('stroke-dasharray')));
    e.querySelectorAll('[data-w]').forEach(b => { b.style.width = '0'; });
    animate(e);
  };
  const tick = () => {
    if (paused || cur < 0) return;
    const s = slides[cur];
    if (!auto || s.last) { bars[cur].style.width = '100%'; return; }
    t += 50; bars[cur].style.width = Math.min(100, t / SLIDE_MS * 100) + '%';
    if (t >= SLIDE_MS) show(cur + 1);
  };
  function close() {
    clearInterval(timer); document.removeEventListener('keydown', key);
    root.remove(); document.body.style.overflow = prevOv; opened = false;
  }
  function key(e) { if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') show(cur + 1); else if (e.key === 'ArrowLeft') show(cur - 1); }
  document.addEventListener('keydown', key);

  let down = 0;
  const tapZone = (el, dir) => {
    el.addEventListener('pointerdown', () => { down = Date.now(); paused = true; });
    const up = () => { const held = Date.now() - down > 260; paused = false; if (!held && down) show(cur + dir); down = 0; };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', () => { paused = false; down = 0; });
    el.addEventListener('contextmenu', e => e.preventDefault());
  };
  tapZone(root.querySelector('.rc-tap.l'), -1); tapZone(root.querySelector('.rc-tap.r'), 1);
  root.querySelector('.rc-x').onclick = close;
  root.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) close();
    if (e.target.closest('[data-share]')) shareCard(D, me);
  });
  show(0);
  timer = setInterval(tick, 50);
  root.querySelector('.rc-x').focus({ preventScroll: true });
}

// ---------- vstupy do príbehu ----------
if (typeof document !== 'undefined') {
  const app = document.getElementById('app');
  // karta na Dnes (nedeľa od 18:00, pondelok, utorok): otvorí príbeh namiesto holého reportu
  document.addEventListener('click', e => {
    const a = e.target.closest?.('a.rp-card');
    if (!a) return;
    e.preventDefault(); e.stopPropagation();
    openRecap();
  }, true);
  const enhance = () => {
    const card = app?.querySelector('a.rp-card:not([data-rc])');
    if (card) {
      card.dataset.rc = '1';
      const t = card.querySelector('h3'), p = card.querySelector('p'), go = card.querySelector('.rp-card-go');
      if (t) t.textContent = 'Tvoj týždeň je pripravený';
      if (p) p.textContent = 'Pozri si ho ako príbeh a pošli kamarátom.';
      if (go) go.textContent = '▶';
    }
    const sc = app?.querySelector('.screen.rp:not([data-rcp])');
    if (sc && sc.querySelector('a.btn.ghost[href="#/pokrok"]')) {
      sc.dataset.rcp = '1';
      const q = new URLSearchParams((location.hash.split('?')[1]) || '');
      const b = document.createElement('button'); b.className = 'btn primary mb rp-play'; b.id = 'rcPlay'; b.textContent = '▶ Prehrať týždeň';
      b.onclick = () => openRecap(q.get('w') ? calc.weekStart(q.get('w')) : undefined);
      const anchor = sc.querySelector('#shareCard') || sc.querySelector('a.btn.ghost[href="#/pokrok"]');
      anchor.before(b);
    }
  };
  if (app) new MutationObserver(enhance).observe(app, { childList: true, subtree: true });
}
