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
.kc-s h2{font-size:22px;letter-spacing:-.02em;margin:0 0 6px}
.kc-s .lead{font-size:14.5px;line-height:1.5;margin:0 0 16px;color:var(--text)}
.kc-s .lead b{font-weight:800}
.kc-bar{position:relative;height:16px;border-radius:99px;background:var(--bg-2);margin:26px 0 10px}
.kc-bar i{position:absolute;top:0;bottom:0;display:block}
.kc-bar .b{left:0;border-radius:99px 0 0 99px;background:var(--muted);opacity:.5}
.kc-bar .a{border-radius:0 99px 99px 0;background:var(--accent);opacity:.85}
.kc-bar u{position:absolute;top:-7px;bottom:-7px;width:3px;margin-left:-1.5px;border-radius:3px;background:var(--text);text-decoration:none}
.kc-bar u em{position:absolute;bottom:100%;left:50%;transform:translateX(-50%);margin-bottom:4px;font-style:normal;font-size:11.5px;font-weight:800;white-space:nowrap;color:var(--text)}
.kc-lg{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:12px;color:var(--muted);margin-bottom:14px}
.kc-lg span{display:inline-flex;align-items:center;gap:6px}.kc-lg i{width:9px;height:9px;border-radius:50%;display:block}
.kc-eat{display:flex;justify-content:space-between;padding:12px 14px;border-radius:16px;background:var(--bg-2);font-size:14px;margin-bottom:6px}
.kc-eat b{font-variant-numeric:tabular-nums}
.kc-r{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:11px 0;border-top:1px solid var(--line)}
.kc-r span{font-size:14.5px}.kc-r small{display:block;font-size:12px;color:var(--muted);margin-top:2px;line-height:1.35}
.kc-r b{font-variant-numeric:tabular-nums;font-size:16px;white-space:nowrap}
.kc-r.sum{border-top:1px solid var(--muted)}.kc-r.sum span,.kc-r.sum b{font-weight:800}
.kc-r.me b{color:var(--accent)}
.kc-q{margin:12px 0 0;font-size:12.5px;line-height:1.5;color:var(--muted)}
.kc-q b{color:var(--text)}
.kc-s .btn{margin-top:16px;width:100%}
`;
document.head.appendChild(st);

const r10 = v => Math.round(v / 10) * 10;

async function open() {
  const p = ctx.state?.profile; if (!p) return;
  const eaten = Number(root.querySelector('.hk-eat b')?.dataset.count) || 0;
  const target = Number(p.target_kcal) || 0;
  const left = target - eaten;
  const bg = ctx.sheet(`<div class="kc-s"><h2>Tvoj dnešný cieľ</h2><p class="lead">Načítavam výpočet.</p></div>`);
  const body = bg.querySelector('.kc-s');
  const done = html => { if (body.isConnected) body.innerHTML = html; wire(bg); };
  const eatRow = `<div class="kc-eat"><span>Dnes zjedené ${n(eaten)} kcal</span><b>${left < 0 ? 'nad cieľ ' + n(-left) : 'zostáva ' + n(left)}</b></div>`;
  try {
    if (!(p.sex && p.height_cm && p.birth_year)) { done(`<h2>Tvoj dnešný cieľ</h2><p class="lead">Cieľ je <b>${n(target)} kcal</b>. Doplň výšku, rok narodenia a pohlavie v Profile a ukážem ti, ako sa počíta.</p>${eatRow}<button class="btn primary" data-kc-x>Zavrieť</button>`); return; }
    const weights = await db.listWeights(p.id).catch(() => []);
    const kg = Number(weights[weights.length - 1]?.weight_kg || p.start_weight || 75);
    const f = calc.targets({ sex: p.sex, weightKg: kg, heightCm: Number(p.height_cm), birthYear: p.birth_year, activity: p.activity, goal: p.goal });
    let tdee = f.tdee, est = null;
    try {
      const wl = weights.map(w => ({ date: w.date, weight: Number(w.weight_kg) }));
      if (wl.length >= T.MIN_WEIGHINS) {
        const fd = await db.foodByDay(p.id, calc.addDays(calc.today(), -T.WINDOW), calc.addDays(calc.today(), -1));
        const ibd = {}; Object.keys(fd).forEach(d => { ibd[d] = fd[d].kcal; });
        const e = T.estimateTdee({ intakeByDay: ibd, weights: wl, formulaTdee: f.tdee, today: calc.today() });
        if (e.ok && e.w >= 0.25) { est = e; tdee = e.tdee; }
      }
    } catch (_) { /* bez zmeraného výdaja ostane vzorec */ }
    tdee = r10(tdee);
    const bmr = Math.min(f.bmr, tdee), act = tdee - bmr;
    const want = T.targetFromTdee({ tdee, goal: p.goal, sex: p.sex, currentTarget: 0 }).want;
    const gap = tdee - target;                                   // kladné = deficit
    const week = Math.abs(gap) * 7 / T.KCAL_PER_KG;
    const wk = String(Math.round(week * 10) / 10).replace('.', ',');
    const custom = p.targets_mode === 'custom';
    const lead = Math.abs(gap) < 60
      ? `Tvoj cieľ <b>${n(target)} kcal</b> je zhruba rovný tomu, čo denne spáliš. Váha by sa mala držať.`
      : gap > 0 ? `Denne spáliš zhruba <b>${n(tdee)} kcal</b>. Cieľ <b>${n(target)} kcal</b> je o ${n(gap)} nižší, čo je asi <b>${wk} kg</b> tuku za týždeň.`
        : `Denne spáliš zhruba <b>${n(tdee)} kcal</b>. Cieľ <b>${n(target)} kcal</b> je o ${n(-gap)} vyšší, čo je asi <b>${wk} kg</b> za týždeň navyše.`;
    const scale = Math.max(tdee, target) * 1.06;
    const pct = v => (v / scale * 100).toFixed(1) + '%';
    const bar = `<div class="kc-bar" role="img" aria-label="Výdaj a cieľ"><i class="b" style="width:${pct(bmr)}"></i><i class="a" style="left:${pct(bmr)};width:${pct(act)}"></i><u style="left:${pct(target)}"><em>cieľ ${n(target)}</em></u></div>
      <div class="kc-lg"><span><i style="background:var(--muted);opacity:.6"></i>v pokoji ${n(bmr)}</span><span><i style="background:var(--accent)"></i>pohyb ${n(act)}</span></div>`;
    const d = calc.decodeActivity(p.activity);
    const actSub = d ? `${calc.JOBS[d.job].label.replace('Sedím väčšinu dňa', 'Väčšinu dňa sedíš').replace('Som na nohách', 'Počas dňa si na nohách').replace('Fyzická práca', 'Fyzická práca')}, ${n(d.steps)} krokov denne, ${d.days} ${d.days === 1 ? 'tréning' : d.days < 5 ? 'tréningy' : 'tréningov'} týždenne` : (calc.ACTIVITY[p.activity]?.label || '');
    const g = calc.GOAL[p.goal] || calc.GOAL.maintain;
    let q = '';
    if (custom) q = `Ciele si nastavil sám, preto ich appka sama nemení. Podľa výpočtu pre cieľ „${g.label.toLowerCase()}“ by to bolo <b>${n(want)} kcal</b>${Math.abs(want - target) >= 10 ? ` (rozdiel ${want - target > 0 ? '+' : '−'}${n(Math.abs(want - target))})` : ''}.`;
    else if (Math.abs(target - want) >= 60) q = `Cieľ sa upravuje postupne, najviac o ${T.MAX_STEP} kcal naraz. Výpočet teraz ukazuje <b>${n(want)} kcal</b>.`;
    const meas = est
      ? measuredHtml({ measured: true, formula: r10(est.formula), tdee, days: est.days, confText: T.confText(est.conf), clamped: est.clamped })
      : '<p class="kc-q">Skutočný výdaj z tvojich dát ukážem, keď budeš mať aspoň dva týždne zápisov jedla a pár vážení.</p>';
    done(`<h2>Tvoj dnešný cieľ</h2><p class="lead">${lead}</p>${bar}${eatRow}
      <div class="kc-r"><span>Bazálny výdaj<small>čo telo spáli v pokoji (${n(kg)} kg, ${n(p.height_cm)} cm, ${f.age} rokov)</small></span><b>${n(bmr)}</b></div>
      <div class="kc-r"><span>Pohyb<small>${actSub}</small></span><b>+ ${n(act)}</b></div>
      <div class="kc-r sum"><span>Denný výdaj</span><b>${n(tdee)}</b></div>
      <div class="kc-r me"><span>Tvoj cieľ<small>${custom ? 'nastavený ručne' : g.label}</small></span><b>${n(target)}</b></div>
      ${q ? `<p class="kc-q">${q}</p>` : ''}${meas}
      <button class="btn primary" data-kc-go>Upraviť ciele</button><button class="btn ghost" data-kc-x style="margin-top:8px">Zavrieť</button>`);
  } catch (_) { done('<h2>Tvoj dnešný cieľ</h2><p class="lead">Výpočet sa teraz nepodarilo načítať. Skús to o chvíľu.</p><button class="btn primary" data-kc-x>Zavrieť</button>'); }
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
