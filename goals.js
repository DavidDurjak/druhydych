// v0.9: Moje ciele. Automatické ciele alebo vlastné kalórie a makrá (gramy, %, g/kg, predvoľby), plus voda.
import * as db from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';

const $app = () => ctx.$app;
const state = () => ctx.state;
const h = (...a) => ctx.h(...a), toast = (...a) => ctx.toast(...a), nav = (...a) => ctx.nav(...a);
const r0 = v => Math.round(Number(v) || 0);
const r1 = v => Math.round((Number(v) || 0) * 10) / 10;
const fmt1 = v => String(r1(v)).replace('.', ',');

const CSS = `
.gl-mode { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; }
.gl-mode button { -webkit-appearance: none; appearance: none; text-align: left; display: flex; flex-direction: column; justify-content: flex-start; padding: 14px; border-radius: 18px; border: 1px solid var(--line); background: var(--card); color: var(--text); cursor: pointer; }
.gl-mode button b { display: block; font-size: 15px; margin-bottom: 3px; }
.gl-mode button span { font-size: 12px; color: var(--muted); line-height: 1.35; display: block; }
.gl-mode button.on { border-color: var(--accent); background: rgba(124,255,178,.08); }
.gl-kcal { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.gl-kcal input { width: 100%; min-width: 0; text-align: center; font: inherit; font-size: 40px; font-weight: 800; letter-spacing: -0.03em; background: none; border: 0; color: var(--text); font-variant-numeric: tabular-nums; outline: none; padding: 0; }
.gl-kcal input:focus { color: var(--accent); }
.gl-step { -webkit-appearance: none; appearance: none; width: 46px; height: 46px; flex: 0 0 auto; border-radius: 14px; border: 1px solid var(--line); background: var(--bg-2); color: var(--text); font-size: 22px; cursor: pointer; }
.gl-sub { text-align: center; font-size: 12px; color: var(--muted); margin-top: 2px; }
.gl-presets { display: flex; gap: 8px; overflow-x: auto; padding: 2px 0 4px; margin: 0 -2px 14px; scrollbar-width: none; }
.gl-presets::-webkit-scrollbar { display: none; }
.gl-presets button { -webkit-appearance: none; appearance: none; flex: 0 0 auto; padding: 9px 13px; border-radius: 99px; border: 1px solid var(--line); background: var(--card); color: var(--text); font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; }
.gl-presets button.on { border-color: var(--accent); color: var(--accent); background: rgba(124,255,178,.08); }
.gl-bar { display: flex; height: 10px; border-radius: 99px; overflow: hidden; gap: 2px; margin: 4px 0 14px; }
.gl-bar i { display: block; height: 100%; transition: flex .2s; }
.gl-m { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 4px 10px; padding: 12px 0; border-top: 1px solid var(--line); }
.gl-m:first-of-type { border-top: 0; }
.gl-m .lb { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 15px; }
.gl-m .lb i { width: 10px; height: 10px; border-radius: 50%; }
.gl-m .meta { grid-column: 1; font-size: 12px; color: var(--muted); }
.gl-m .meta em { font-style: normal; color: var(--text); font-weight: 700; }
.gl-m .ctl { grid-row: 1 / span 2; grid-column: 2; display: flex; align-items: center; gap: 6px; }
.gl-m .ctl button { -webkit-appearance: none; appearance: none; width: 38px; height: 38px; border-radius: 12px; border: 1px solid var(--line); background: var(--bg-2); color: var(--text); font-size: 18px; cursor: pointer; }
.gl-m .ctl input { width: 64px; height: 38px; text-align: center; border-radius: 12px; border: 1px solid var(--line); background: var(--card); color: var(--text); font: inherit; font-weight: 800; font-size: 17px; font-variant-numeric: tabular-nums; }
.gl-m .ctl span { font-size: 13px; color: var(--muted); width: 10px; }
.gl-m.auto .ctl input { border-color: rgba(124,255,178,.45); }
.gl-warn { margin-top: 10px; padding: 10px 12px; border-radius: 14px; font-size: 13px; line-height: 1.45; background: rgba(255,200,87,.1); color: #FFC857; }
.gl-auto { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 10px; }
.gl-auto div { background: var(--bg-2); border-radius: 14px; padding: 10px 6px; text-align: center; }
.gl-auto b { display: block; font-size: 18px; font-variant-numeric: tabular-nums; }
.gl-auto span { font-size: 11px; color: var(--muted); }
`;
function css() { if (!document.getElementById('glcss')) { const s = document.createElement('style'); s.id = 'glcss'; s.textContent = CSS; document.head.appendChild(s); } }

// predvoľby: bielkoviny v g/kg, tuky ako % kalórií alebo pevné sacharidy, zvyšok dopočítame
const PRESETS = [
  { id: 'bal', name: 'Vyvážené', p: 1.8, fatPct: 0.25 },
  { id: 'hp', name: 'Viac bielkovín', p: 2.2, fatPct: 0.25 },
  { id: 'lc', name: 'Low carb', p: 2.0, carbs: 100 },
  { id: 'keto', name: 'Keto', p: 1.6, carbs: 25 },
  { id: 'hc', name: 'Viac sacharidov', p: 1.6, fatPct: 0.2 },
];

export async function renderGoals() {
  css();
  const st = state(), p = st.profile;
  const weights = await db.listWeights(p.id).catch(() => []);
  const kg = Number(weights[weights.length - 1]?.weight_kg || p.start_weight || 75);
  const auto = calc.targets({ sex: p.sex, weightKg: kg, heightCm: Number(p.height_cm), birthYear: p.birth_year, activity: p.activity, goal: p.goal });
  let mode = p.targets_mode === 'custom' ? 'custom' : 'auto';
  const t = { kcal: r0(p.target_kcal || auto.kcal), p: r0(p.target_protein || auto.protein), c: r0(p.target_carbs || auto.carbs), f: r0(p.target_fat || auto.fat) };
  let lastEdited = null, preset = null;
  let water = p.water_goal || 8;

  const sumKcal = () => 4 * t.p + 4 * t.c + 9 * t.f;
  // gramy sú pravda: zmena bielkovín alebo tukov dopočíta sacharidy, zmena sacharidov zmení kalórie
  const refill = () => { const c = (t.kcal - 4 * t.p - 9 * t.f) / 4; if (c < 0) { t.c = 0; t.kcal = r0(sumKcal()); } else t.c = r0(c); };
  const applyPreset = pr => {
    t.p = r0(pr.p * kg);
    if (pr.carbs != null) { t.c = pr.carbs; t.f = Math.max(0, r0((t.kcal - 4 * t.p - 4 * t.c) / 9)); }
    else { t.f = r0(t.kcal * pr.fatPct / 9); refill(); }
    t.kcal = r0(sumKcal());
  };

  const draw = () => {
    const k = sumKcal() || 1;
    const pc = { p: 4 * t.p / k, c: 4 * t.c / k, f: 9 * t.f / k };
    const warns = [];
    if (mode === 'custom') {
      if (t.kcal < 1200) warns.push('Menej ako 1 200 kcal denne je na dlhodobé fungovanie veľmi málo. Ak to nie je plán s lekárom, odporúčame viac.');
      if (t.p < 1.2 * kg) warns.push(`Bielkoviny ${fmt1(t.p / kg)} g/kg sú málo na udržanie svalov. Pri chudnutí odporúčame aspoň 1,6 g/kg.`);
      if (t.f < 0.6 * kg) warns.push(`Tuky ${fmt1(t.f / kg)} g/kg sú nízko. Pod 0,6 g/kg môžu trpieť hormóny a sýtosť.`);
    }
    const macroRow = (key, lbl, color, perKg = true) => `<div class="gl-m ${mode === 'custom' && key === 'c' && lastEdited !== 'c' ? 'auto' : ''}">
        <div class="lb"><i style="background:${color}"></i>${lbl}</div>
        <div class="meta"><em>${Math.round(pc[key] * 100)} %</em> kalórií${perKg ? ` · ${fmt1(t[key] / kg)} g/kg` : ''}${mode === 'custom' && key === 'c' && lastEdited !== 'c' ? ' · dopočítané' : ''}</div>
        <div class="ctl"><button data-mg="${key}:-5" aria-label="Menej">−</button><input data-mi="${key}" type="number" inputmode="numeric" value="${t[key]}"><span>g</span><button data-mg="${key}:5" aria-label="Viac">+</button></div>
      </div>`;

    $app().innerHTML = `<div class="screen">
      <div class="topbar"><div><h1>Moje ciele</h1><p class="muted small">Kalórie, makrá a voda na každý deň</p></div></div>

      <div class="gl-mode">
        <button data-mode="auto" class="${mode === 'auto' ? 'on' : ''}"><b>Automaticky</b><span>Vypočítame z váhy, výšky, aktivity a cieľa a každý týždeň upravíme podľa výsledkov.</span></button>
        <button data-mode="custom" class="${mode === 'custom' ? 'on' : ''}"><b>Vlastné</b><span>Nastavíš si kalórie a makrá sám, presne na gramy.</span></button>
      </div>

      ${mode === 'auto' ? `<section class="pg-card">
        <h3>Tvoje automatické ciele</h3>
        <p class="muted small mt">${calc.GOAL[p.goal]?.label || ''} · ${fmt1(kg)} kg · výdaj ${auto.tdee} kcal</p>
        <div class="gl-auto">
          <div><b>${auto.kcal}</b><span>kcal</span></div>
          <div><b>${auto.protein}</b><span>bielkoviny g</span></div>
          <div><b>${auto.carbs}</b><span>sacharidy g</span></div>
          <div><b>${auto.fat}</b><span>tuky g</span></div>
        </div>
        <p class="muted small mt">Cieľ alebo aktivitu zmeníš v Profile cez „Upraviť údaje“.</p>
      </section>` : `
      <section class="pg-card">
        <div class="gl-kcal"><button class="gl-step" data-k="-50" aria-label="Menej kalórií">−</button><input id="glK" type="number" inputmode="numeric" value="${t.kcal}" aria-label="Kalórie"><button class="gl-step" data-k="50" aria-label="Viac kalórií">+</button></div>
        <p class="gl-sub">kcal denne · automaticky by to bolo ${auto.kcal}</p>
      </section>
      <div class="gl-presets">${PRESETS.map(pr => `<button data-pr="${pr.id}" class="${preset === pr.id ? 'on' : ''}">${pr.name}</button>`).join('')}</div>
      <section class="pg-card">
        <div class="gl-bar"><i style="flex:${pc.p};background:var(--protein)"></i><i style="flex:${pc.c};background:var(--carbs)"></i><i style="flex:${pc.f};background:var(--fat)"></i></div>
        ${macroRow('p', 'Bielkoviny', 'var(--protein)')}
        ${macroRow('c', 'Sacharidy', 'var(--carbs)', false)}
        ${macroRow('f', 'Tuky', 'var(--fat)')}
        ${warns.map(w => `<div class="gl-warn">${h(w)}</div>`).join('')}
      </section>
      <p class="muted small mb">Zmena bielkovín alebo tukov dopočíta sacharidy, aby kalórie sedeli. Zmena sacharidov upraví kalórie.</p>`}

      <section class="pg-card">
        <div class="gl-m"><div class="lb"><i style="background:#5AC8FA"></i>Voda</div><div class="meta"><em>${String(water * 0.25).replace('.', ',')} l</em> denne · ${water} pohárov</div>
          <div class="ctl"><button data-w="-1" aria-label="Menej vody">−</button><input id="glW" value="${String(water * 0.25).replace('.', ',')}" inputmode="decimal" autocomplete="off" aria-label="Voda v litroch"><span>l</span><button data-w="1" aria-label="Viac vody">+</button></div></div>
      </section>

      <button class="btn primary gl-save mt" id="glSave">${mode === 'auto' ? 'Použiť automatické ciele' : 'Uložiť moje ciele'}</button>
      ${mode === 'custom' ? '<p class="muted small center mt">Kým máš vlastné ciele, appka ti ich sama nemení. Týždenný report a tipy fungujú ďalej.</p>' : ''}
    </div>${nav('#/ciele')}`;
    bind();
  };

  const bind = () => {
    const R = $app();
    R.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { mode = b.dataset.mode; draw(); });
    R.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { t.kcal = Math.max(800, Math.min(6000, t.kcal + Number(b.dataset.k))); preset = null; lastEdited = 'kcal'; refill(); draw(); });
    R.querySelector('#glK')?.addEventListener('change', e => { t.kcal = Math.max(800, Math.min(6000, r0(e.target.value) || t.kcal)); preset = null; lastEdited = 'kcal'; refill(); draw(); });
    const setMacro = (key, v) => {
      t[key] = Math.max(0, Math.min(800, r0(v)));
      preset = null; lastEdited = key;
      if (key === 'c') t.kcal = r0(sumKcal()); else refill();
      draw();
    };
    R.querySelectorAll('[data-mg]').forEach(b => b.onclick = () => { const [key, d] = b.dataset.mg.split(':'); setMacro(key, t[key] + Number(d)); });
    R.querySelectorAll('[data-mi]').forEach(inp => inp.onchange = () => setMacro(inp.dataset.mi, inp.value));
    R.querySelectorAll('[data-pr]').forEach(b => b.onclick = () => { const pr = PRESETS.find(x => x.id === b.dataset.pr); applyPreset(pr); preset = pr.id; lastEdited = null; draw(); });
    R.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { water = Math.max(4, Math.min(20, water + Number(b.dataset.w))); draw(); });
    // litre sa dajú aj napísať: zaokrúhli sa na pohár (0,25 l) a drží sa v rozsahu 1 až 5 l
    const gw = R.querySelector('#glW');
    if (gw) {
      gw.addEventListener('focus', () => gw.select());
      const apply = () => { const v = parseFloat(String(gw.value).replace(',', '.')); if (isFinite(v) && v > 0) water = Math.max(4, Math.min(20, Math.round(v / 0.25))); draw(); };
      gw.addEventListener('change', apply);
      gw.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); gw.blur(); } });
    }
    R.querySelector('#glSave').onclick = save;
  };

  const save = async () => {
    const btn = $app().querySelector('#glSave'); btn.disabled = true;
    const next = mode === 'auto'
      ? { targets_mode: 'auto', target_kcal: auto.kcal, target_protein: auto.protein, target_carbs: auto.carbs, target_fat: auto.fat, water_goal: water }
      : { targets_mode: 'custom', target_kcal: r0(sumKcal()), target_protein: t.p, target_carbs: t.c, target_fat: t.f, water_goal: water };
    try {
      st.profile = await db.applyTarget(p.id, { date: calc.today(), old_kcal: p.target_kcal, new_kcal: next.target_kcal, reason: mode === 'auto' ? 'Automatické ciele' : 'Vlastné ciele', avg_intake: null, trend_change: null }, next);
      toast(mode === 'auto' ? 'Automatické ciele zapnuté' : 'Tvoje ciele sú uložené');
      location.hash = '#/';
    } catch (e) { toast(e.message, true); btn.disabled = false; }
  };
  draw();
}
