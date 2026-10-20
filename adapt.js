// Týždenné prehodnotenie cieľa podľa skutočného výdaja (z príjmu a trendu váhy). Pri málo dátach padne späť na jednoduché pravidlo.
import * as db from './data.js';
import * as calc from './calc.js';
import * as v2 from './app2.js';
import * as T from './tdee.js';

export async function check(p, weights) {
  try {
    if (p.role === 'coach' && !p.onboarded) return null;
    const ws = calc.weekStart();
    const hist = await db.listTargetHistory(p.id);
    if (hist.some(t => t.date >= ws)) return null;                       // tento týždeň už bolo
    if (calc.today() < calc.addDays(p.start_date || calc.today(), 7)) return null; // prvý týždeň nič
    const wl = weights.map(w => ({ date: w.date, weight: Number(w.weight_kg) }));
    if (wl.length >= T.MIN_WEIGHINS && p.height_cm && p.birth_year && p.sex) {
      const fd = await db.foodByDay(p.id, calc.addDays(calc.today(), -T.WINDOW), calc.addDays(calc.today(), -1));
      const intakeByDay = {}; Object.keys(fd).forEach(d => { intakeByDay[d] = fd[d].kcal; });
      const kg = wl[wl.length - 1].weight;
      const f = calc.targets({ sex: p.sex, weightKg: kg, heightCm: Number(p.height_cm), birthYear: p.birth_year, activity: p.activity, goal: p.goal });
      const est = T.estimateTdee({ intakeByDay, weights: wl, formulaTdee: f.tdee, today: calc.today() });
      if (est.ok && est.w >= 0.25) {
        const tgt = T.targetFromTdee({ tdee: est.tdee, goal: p.goal, sex: p.sex, currentTarget: p.target_kcal });
        const tr = calc.trend(wl);
        return { newKcal: tgt.newKcal, adjust: tgt.adjust, reason: T.describe(est, tgt), avg: est.avgIntake, ch: calc.trendChange(tr, 7), days: est.days,
          tdee: est.tdee, formula: est.formula, conf: est.conf, confText: T.confText(est.conf), spanDays: est.spanDays, clamped: est.clamped, measured: true };
      }
    }
  } catch (_) { /* padne späť na jednoduché pravidlo */ }
  return v2.checkAdaptive(p, weights);
}

// Karta: porovnanie vzorca a skutočného výdaja (len keď ide o odhad z dát)
export function measuredHtml(a) {
  if (!a?.measured) return '';
  const mx = Math.max(a.formula, a.tdee) || 1;
  const row = (lbl, v, cls) => `<div class="tdx-r ${cls}"><span>${lbl}</span><i><b style="width:${Math.round(v / mx * 100)}%"></b></i><em>${v}</em></div>`;
  return `<div class="tdx">${row('Podľa vzorca', a.formula, '')}${row('Tvoj skutočný výdaj', a.tdee, 'on')}
    <p class="muted small">Odhad z ${a.days} zapísaných dní, ${a.confText}. Čím dlhšie zapisuješ jedlo a váhu, tým presnejší je.${a.clamped ? ' Dáta vyzerajú nezvyčajne, preto odhad držím bližšie k vzorcu.' : ''}</p></div>`;
}
if (typeof document !== 'undefined' && !document.getElementById('tdx-css')) {
  const st = document.createElement('style'); st.id = 'tdx-css';
  st.textContent = `.tdx{margin:12px 0 4px}.tdx-r{display:grid;grid-template-columns:132px 1fr 46px;align-items:center;gap:10px;margin:6px 0;font-size:13px}.tdx-r span{color:var(--muted)}.tdx-r.on span{color:var(--text);font-weight:600}.tdx-r i{display:block;height:8px;border-radius:4px;background:var(--track);overflow:hidden}.tdx-r b{display:block;height:100%;border-radius:4px;background:var(--muted);opacity:.55}.tdx-r.on b{background:var(--accent);opacity:1}.tdx-r em{font-style:normal;text-align:right;font-variant-numeric:tabular-nums;font-weight:700;color:var(--text)}.tdx p{margin:8px 0 0}`;
  document.head.appendChild(st);
}
