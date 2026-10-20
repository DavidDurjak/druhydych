// Dnes: ikonka "i" pri dnešnom cieli. Po ťuknutí ukáže, odkiaľ sa cieľ berie: bazálny výdaj, aktivita, cieľ a
// (keď je dosť dát) skutočný výdaj zmeraný z tvojho jedla a váhy. Rozloženie Dnes sa nemení, pribudne len ikonka.
import * as db from './data.js';
import * as calc from './calc.js';
import * as T from './tdee.js';
import { measuredHtml } from './adapt.js';
import { ctx } from './app.js';

const root = document.getElementById('app');
const n = v => Math.round(Number(v) || 0).toLocaleString('sk-SK');

const st = document.createElement('style');
st.textContent = `
.kc-l{display:inline-flex;align-items:center;gap:6px;min-width:0}
.kc-i{-webkit-appearance:none;appearance:none;position:relative;width:22px;height:22px;padding:0;border-radius:50%;border:1px solid var(--line);background:transparent;color:var(--muted);font:italic 700 13px/1 Georgia,'Times New Roman',serif;display:grid;place-items:center;cursor:pointer;transition:transform .12s,color .15s,border-color .15s;-webkit-tap-highlight-color:transparent}
.kc-i::after{content:'';position:absolute;inset:-8px}
.kc-i:active{transform:scale(.9);color:var(--accent);border-color:var(--accent)}
.kc-s{padding:2px 0 4px}
.kc-s h2{font-size:22px;letter-spacing:-.02em;margin:0 0 4px}
.kc-s>p.sub{color:var(--muted);font-size:13.5px;line-height:1.45;margin:0 0 14px}
.kc-top{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}
.kc-top div{background:var(--bg-2);border-radius:16px;padding:12px 6px;text-align:center}
.kc-top b{display:block;font-size:22px;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.kc-top span{font-size:11.5px;color:var(--muted)}
.kc-r{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:11px 0;border-top:1px solid var(--line)}
.kc-r:first-of-type{border-top:0}
.kc-r span{font-size:14.5px}.kc-r small{display:block;font-size:12px;color:var(--muted);margin-top:2px;line-height:1.35}
.kc-r b{font-variant-numeric:tabular-nums;font-size:16px;white-space:nowrap}
.kc-r.sum{border-top:1px solid var(--muted)}.kc-r.sum span,.kc-r.sum b{font-weight:800}
.kc-n{margin:12px 0 0;padding:10px 12px;border-radius:14px;background:var(--bg-2);font-size:13px;line-height:1.45;color:var(--text)}
.kc-s .btn{margin-top:14px;width:100%}
`;
document.head.appendChild(st);

async function open() {
  const p = ctx.state?.profile; if (!p) return;
  const eaten = Number(root.querySelector('.hk-eat b')?.dataset.count) || 0;
  const target = Number(p.target_kcal) || 0;
  const left = target - eaten;
  const bg = ctx.sheet(`<div class="kc-s"><h2>Tvoj dnešný cieľ</h2><p class="sub">Načítavam výpočet.</p></div>`);
  const body = bg.querySelector('.kc-s');
  const done = html => { if (body.isConnected) body.innerHTML = html; };
  try {
    const top = `<div class="kc-top"><div><b>${n(target)}</b><span>cieľ kcal</span></div><div><b>${n(eaten)}</b><span>zjedené</span></div><div><b>${n(Math.abs(left))}</b><span>${left < 0 ? 'nad cieľ' : 'zostáva'}</span></div></div>`;
    if (!(p.sex && p.height_cm && p.birth_year)) { done(`<h2>Tvoj dnešný cieľ</h2>${top}<p class="kc-n">Doplň výšku, rok narodenia a pohlavie v Profile a ukážem ti, ako sa cieľ počíta.</p><button class="btn primary" data-kc-x>Zavrieť</button>`); wire(bg); return; }
    const weights = await db.listWeights(p.id).catch(() => []);
    const kg = Number(weights[weights.length - 1]?.weight_kg || p.start_weight || 75);
    const f = calc.targets({ sex: p.sex, weightKg: kg, heightCm: Number(p.height_cm), birthYear: p.birth_year, activity: p.activity, goal: p.goal });
    let tdee = f.tdee, want = f.kcal, est = null;
    try {
      const wl = weights.map(w => ({ date: w.date, weight: Number(w.weight_kg) }));
      if (wl.length >= T.MIN_WEIGHINS) {
        const fd = await db.foodByDay(p.id, calc.addDays(calc.today(), -T.WINDOW), calc.addDays(calc.today(), -1));
        const ibd = {}; Object.keys(fd).forEach(d => { ibd[d] = fd[d].kcal; });
        const e = T.estimateTdee({ intakeByDay: ibd, weights: wl, formulaTdee: f.tdee, today: calc.today() });
        if (e.ok && e.w >= 0.25) { est = e; tdee = e.tdee; want = T.targetFromTdee({ tdee: e.tdee, goal: p.goal, sex: p.sex, currentTarget: 0 }).want; }
      }
    } catch (_) { /* bez zmeraného výdaja ostane vzorec */ }
    const act = calc.ACTIVITY[p.activity];
    const d = calc.decodeActivity(p.activity);
    const actSub = d ? `${calc.JOBS[d.job].label}, ${n(d.steps)} krokov denne, ${d.days} ${d.days === 1 ? 'tréning' : d.days < 5 ? 'tréningy' : 'tréningov'} týždenne` : (act?.label || '');
    const g = calc.GOAL[p.goal] || calc.GOAL.maintain;
    const delta = want - tdee;
    const custom = p.targets_mode === 'custom';
    let note = '';
    if (custom) note = `Máš nastavené vlastné ciele, preto ich appka sama nemení. Podľa výpočtu by cieľ bol ${n(want)} kcal.`;
    else if (Math.abs(target - want) >= 60) note = `Cieľ sa upravuje postupne, najviac o ${T.MAX_STEP} kcal naraz. Výpočet teraz ukazuje ${n(want)} kcal.`;
    const meas = est ? measuredHtml({ measured: true, formula: est.formula, tdee: est.tdee, days: est.days, confText: T.confText(est.conf), clamped: est.clamped }) : '<p class="kc-n">Skutočný výdaj z tvojich dát ukážem, keď budeš mať aspoň dva týždne zápisov jedla a pár vážení.</p>';
    done(`<h2>Tvoj dnešný cieľ</h2><p class="sub">Cieľ vychádza z tvojho tela, z toho, ako sa hýbeš, a z toho, čo chceš dosiahnuť.</p>${top}
      <div class="kc-r"><span>Bazálny výdaj<small>energia, ktorú telo spáli v pokoji (${n(kg)} kg, ${n(p.height_cm)} cm, ${f.age} rokov)</small></span><b>${n(f.bmr)}</b></div>
      <div class="kc-r"><span>Aktivita<small>${actSub}</small></span><b>+ ${n(tdee - f.bmr)}</b></div>
      <div class="kc-r sum"><span>Denný výdaj</span><b>${n(tdee)}</b></div>
      <div class="kc-r"><span>Tvoj cieľ<small>${g.label}</small></span><b>${delta > 0 ? '+ ' : delta < 0 ? '− ' : ''}${n(Math.abs(delta))}</b></div>
      <div class="kc-r sum"><span>Kalorický cieľ</span><b>${n(want)}</b></div>
      ${note ? `<p class="kc-n">${note}</p>` : ''}${meas}
      <button class="btn primary" data-kc-go>Upraviť ciele</button><button class="btn ghost" data-kc-x style="margin-top:8px">Zavrieť</button>`);
    wire(bg);
  } catch (_) { done('<h2>Tvoj dnešný cieľ</h2><p class="sub">Výpočet sa teraz nepodarilo načítať. Skús to o chvíľu.</p><button class="btn primary" data-kc-x>Zavrieť</button>'); wire(bg); }
}
function wire(bg) {
  bg.querySelector('[data-kc-x]')?.addEventListener('click', () => bg.remove());
  bg.querySelector('[data-kc-go]')?.addEventListener('click', () => { bg.remove(); location.hash = '#/ciele'; });
}

function enhance() {
  const t = root?.querySelector('.screen.td .hk-top .hk-t:not([data-kc])'); if (!t) return;
  t.dataset.kc = '1';
  const w = document.createElement('span'); w.className = 'kc-l';
  t.before(w); w.appendChild(t);
  const b = document.createElement('button'); b.type = 'button'; b.className = 'kc-i'; b.textContent = 'i';
  b.setAttribute('aria-label', 'Ako sa cieľ počíta');
  b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); open(); });
  w.appendChild(b);
}
if (root) { new MutationObserver(enhance).observe(root, { childList: true, subtree: true }); enhance(); }
