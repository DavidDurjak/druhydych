// Týždenné prehodnotenie cieľa podľa skutočného výdaja (z príjmu a trendu váhy). Pri málo dátach padne späť na jednoduché pravidlo.
import * as db from './data.js';
import * as calc from './calc.js';
import * as v2 from './app2.js';
import * as T from './tdee.js';

// Rozhodnutia z check-inu: { 'YYYY-MM-DD': 'x' (nedopísaný, vynechať) | 'ok' (celý, aj keď nízky) }
const MK = uid => 'fw_ckd:' + uid;
function getMarks(uid) { try { return JSON.parse(localStorage.getItem(MK(uid))) || {}; } catch (_) { return {}; } }
function setMark(uid, d, v) {
  const m = getMarks(uid); m[d] = v;
  const keep = Object.keys(m).sort().slice(-60), out = {}; keep.forEach(k => { out[k] = m[k]; });
  try { localStorage.setItem(MK(uid), JSON.stringify(out)); } catch (_) { }
}

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
      const marks = getMarks(p.id);
      const exclude = Object.keys(marks).filter(d => marks[d] === 'x'), include = Object.keys(marks).filter(d => marks[d] === 'ok');
      const est = T.estimateTdee({ intakeByDay, weights: wl, formulaTdee: f.tdee, today: calc.today(), exclude, include });
      // podozrivo nízke dni za posledné 2 týždne, o ktorých človek ešte nerozhodol (modul „neúplné dni“)
      const lowLine = Math.max(1000, 0.6 * (p.target_kcal || f.tdee));
      const suspect = Object.keys(intakeByDay).filter(d => d >= calc.addDays(calc.today(), -14) && intakeByDay[d] > 0 && intakeByDay[d] < lowLine && !marks[d])
        .sort().slice(-5).map(d => ({ d, kcal: Math.round(intakeByDay[d]) }));
      if (est.ok && est.w >= 0.25) {
        const tgt = T.targetFromTdee({ tdee: est.tdee, goal: p.goal, sex: p.sex, currentTarget: p.target_kcal });
        const tr = calc.trend(wl);
        return { newKcal: tgt.newKcal, adjust: tgt.adjust, reason: T.describe(est, tgt), avg: est.avgIntake, ch: calc.trendChange(tr, 7), days: est.days,
          tdee: est.tdee, formula: est.formula, conf: est.conf, confText: T.confText(est.conf), spanDays: est.spanDays, clamped: est.clamped, measured: true,
          suspect, uid: p.id, rawLast: wl[wl.length - 1].weight, trendLast: tr.length ? tr[tr.length - 1].trend : null };
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
    <p class="muted small">Odhad z ${a.days} zapísaných dní, ${a.confText}. Čím dlhšie zapisuješ jedlo a váhu, tým presnejší je.${a.clamped ? ' Dáta vyzerajú nezvyčajne, preto odhad držím bližšie k vzorcu.' : ''}</p>
    ${a.rawLast && a.trendLast ? `<div class="tdx-w"><span>Posledné váženie <b>${fmtKg(a.rawLast)}</b></span><span>Trend <b>${fmtKg(a.trendLast)}</b></span><p>Rozhoduje trend, nie jedno váženie. Voda a soľ vedia váhu na deň pohnúť aj o kilo.</p></div>` : ''}
    ${a.suspect?.length ? `<div class="tdx-s" data-uid="${a.uid}"><b>Tieto dni vyzerajú nedopísané</b><p>Boli celé? Nedopísané dni nechám mimo výpočtu, aby ti nevyšiel zbytočne nízky výdaj.</p>
      ${a.suspect.map(x => `<div class="tdx-sr"><span>${dayLbl(x.d)} · ${x.kcal} kcal</span><button data-ck="${x.d}:x">Nedopísaný</button><button data-ck="${x.d}:ok">Bol celý</button></div>`).join('')}</div>` : ''}</div>`;
}
const fmtKg = v => (Math.round(Number(v) * 10) / 10).toString().replace('.', ',') + ' kg';
const dayLbl = d => { const t = new Date(d + 'T00:00:00'); return ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'][t.getDay()] + ' ' + t.getDate() + '. ' + (t.getMonth() + 1) + '.'; };
if (typeof document !== 'undefined') document.addEventListener('click', e => {
  const b = e.target.closest?.('[data-ck]'); if (!b) return;
  const box = b.closest('.tdx-s'), [d, v] = b.dataset.ck.split(':');
  setMark(box.dataset.uid, d, v);
  const row = b.closest('.tdx-sr'); row.innerHTML = `<span>${dayLbl(d)}</span><em>${v === 'x' ? 'vynechám z výpočtu' : 'započítam'}</em>`;
  try { window.fwTrack && window.fwTrack('ck_day', { v }); } catch (_) { }
  if (!box.querySelector('button')) setTimeout(() => window.dispatchEvent(new HashChangeEvent('hashchange')), 900);
});
if (typeof document !== 'undefined' && !document.getElementById('tdx-css')) {
  const st = document.createElement('style'); st.id = 'tdx-css';
  st.textContent = `.tdx{margin:12px 0 4px}.tdx-r{display:grid;grid-template-columns:132px 1fr 46px;align-items:center;gap:10px;margin:6px 0;font-size:13px}.tdx-r span{color:var(--muted)}.tdx-r.on span{color:var(--text);font-weight:600}.tdx-r i{display:block;height:8px;border-radius:4px;background:var(--track);overflow:hidden}.tdx-r b{display:block;height:100%;border-radius:4px;background:var(--muted);opacity:.55}.tdx-r.on b{background:var(--accent);opacity:1}.tdx-r em{font-style:normal;text-align:right;font-variant-numeric:tabular-nums;font-weight:700;color:var(--text)}.tdx p{margin:8px 0 0}.tdx-w{display:flex;gap:16px;flex-wrap:wrap;margin-top:12px;font-size:13px;color:var(--muted)}.tdx-w b{color:var(--text)}.tdx-w p{flex-basis:100%;margin:2px 0 0;font-size:12px}.tdx-s{margin-top:14px;padding:12px;border-radius:14px;background:color-mix(in srgb,#FFC857 10%,var(--card))}.tdx-s>b{font-size:14px}.tdx-s>p{font-size:12.5px;color:var(--muted);margin:2px 0 8px}.tdx-sr{display:flex;align-items:center;gap:6px;margin-top:6px;font-size:13px}.tdx-sr span{flex:1;font-variant-numeric:tabular-nums}.tdx-sr em{font-style:normal;color:var(--accent);font-weight:600}.tdx-sr button{border:1px solid var(--line);background:var(--bg);color:var(--text);border-radius:99px;padding:6px 10px;font:600 12px inherit;font-family:inherit;cursor:pointer}`;
  document.head.appendChild(st);
}
