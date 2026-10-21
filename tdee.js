// Skutočný výdaj kalórií z reálnych dát: priemerný príjem a trend váhy (čistá logika, bez databázy).
// Výdaj = príjem mínus denný prebytok, ktorý vidno na váhe (1 kg telesnej hmotnosti ~ 7700 kcal).
import * as calc from './calc.js';

export const KCAL_PER_KG = 7700;
export const WINDOW = 28;
export const MIN_SPAN = 14, MIN_WEIGHINS = 4, MIN_DAYS = 10;
export const MAX_STEP = 250;           // cieľ sa jednorazovo nepohne o viac ako 250 kcal
export const MAX_BLEND = 0.85;         // vzorec nikdy úplne nezmizne

const iso = d => new Date(d + 'T00:00:00');
const diffDays = (a, b) => Math.round((iso(b) - iso(a)) / 86400000);
const round10 = v => Math.round(v / 10) * 10;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// intakeByDay: { 'YYYY-MM-DD': kcal }, weights: [{ date, weight }] (celá história, kg), formulaTdee: výdaj podľa vzorca
export function estimateTdee({ intakeByDay, weights, formulaTdee, today, windowDays = WINDOW, exclude = [], include = [] }) {
  const end = calc.addDays(today, -1), start = calc.addDays(end, -(windowDays - 1));
  const all = calc.trend([...weights].sort((a, b) => a.date.localeCompare(b.date)).map(w => ({ date: w.date, weight: Number(w.weight) })));
  // prvé dva body klzavého priemeru sú ešte ovplyvnené štartom, nepoužijeme ich
  const usable = all.filter((p, i) => i >= 2 && p.date >= start && p.date <= end);
  const have = { weighIns: usable.length, spanDays: usable.length ? diffDays(usable[0].date, usable[usable.length - 1].date) : 0 };
  if (!formulaTdee || usable.length < MIN_WEIGHINS || have.spanDays < MIN_SPAN) return { ok: false, have, why: 'weights' };

  const first = usable[0].date, last = usable[usable.length - 1].date;
  const floor = Math.max(900, 0.5 * formulaTdee);          // pod touto hranicou je deň pravdepodobne nedopísaný
  const ex = new Set(exclude), inc = new Set(include);
  // dni, ktoré človek v check-ine označil ako nedopísané, sa vynechajú; dni potvrdené ako celé sa počítajú aj pod hranicou
  const days = Object.keys(intakeByDay).filter(d => d >= first && d <= last && !ex.has(d) && Number(intakeByDay[d]) > 0 && (inc.has(d) || Number(intakeByDay[d]) >= floor));
  const spanDays = have.spanDays + 1;
  have.completeDays = days.length;
  if (days.length < MIN_DAYS) return { ok: false, have, why: 'food' };
  const avgIntake = days.reduce((a, d) => a + Number(intakeByDay[d]), 0) / days.length;

  // sklon trendu (kg za deň), metóda najmenších štvorcov
  const xs = usable.map(p => diffDays(first, p.date)), ys = usable.map(p => p.trend);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let sxy = 0, sxx = 0; xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; });
  const slope = sxx ? sxy / sxx : 0;

  let observed = avgIntake - slope * KCAL_PER_KG;
  const lo = 0.7 * formulaTdee, hi = 1.4 * formulaTdee;
  const clamped = observed < lo || observed > hi;
  observed = clamp(observed, lo, hi);

  // koľko veríme dátam: dlhšie okno, viac zapísaných dní a častejšie váženie = vyššia váha
  const spanF = clamp((spanDays - 7) / 21, 0, 1);
  const covF = clamp((days.length / spanDays) / 0.75, 0, 1);
  const weighF = clamp(usable.length / (spanDays / 3), 0, 1);
  const w = MAX_BLEND * spanF * covF * weighF;
  const tdee = round10(w * observed + (1 - w) * formulaTdee);
  const conf = w < 0.35 ? 'low' : w < 0.65 ? 'mid' : 'high';
  return { ok: true, tdee, observed: Math.round(observed), formula: Math.round(formulaTdee), w: Math.round(w * 100) / 100, conf, clamped,
    avgIntake: Math.round(avgIntake), slopeWeek: Math.round(slope * 7 * 100) / 100, days: days.length, spanDays, have };
}

// nový cieľ z výdaja a cieľa používateľa, s limitom na veľkosť kroku
export function targetFromTdee({ tdee, goal, sex, currentTarget }) {
  const delta = (calc.GOAL[goal] || calc.GOAL.maintain).delta;
  const floor = calc.MIN_KCAL[sex] || 1500;
  let want = Math.max(floor, tdee + Math.max(delta, -calc.MAX_DEFICIT));
  want = round10(want);
  let next = currentTarget ? clamp(want, currentTarget - MAX_STEP, currentTarget + MAX_STEP) : want;
  next = round10(Math.max(floor, next));
  if (currentTarget && Math.abs(next - currentTarget) < 60) next = currentTarget;
  return { want, newKcal: next, adjust: currentTarget ? next - currentTarget : 0, capped: next !== want && currentTarget && Math.abs(want - currentTarget) > MAX_STEP };
}

const CONF_TXT = { low: 'zatiaľ málo dát', mid: 'stredná istota', high: 'vysoká istota' };
export const confText = c => CONF_TXT[c] || '';

export function describe(est, tgt) {
  const base = `Podľa tvojich zápisov ti telo spaľuje približne ${est.tdee} kcal denne (vzorec odhadoval ${est.formula}).`;
  if (!tgt.adjust) return `${base} Cieľ ${tgt.newKcal} kcal ostáva.`;
  return `${base} ${tgt.adjust > 0 ? 'Zvyšujem' : 'Znižujem'} cieľ o ${Math.abs(tgt.adjust)} kcal na ${tgt.newKcal}.${tgt.capped ? ' Ďalší krok urobím o týždeň, aby to bolo plynulé.' : ''}`;
}
