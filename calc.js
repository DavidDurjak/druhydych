// Výpočty: kalorické ciele, makrá, trend váhy. Čistá logika bez závislostí.

export const ACTIVITY = {
  low:      { label: 'Sedavý (škola, žiadny šport)',      factor: 1.2 },
  light:    { label: 'Ľahký (1 až 2 tréningy týždenne)',  factor: 1.375 },
  moderate: { label: 'Stredný (3 až 4 tréningy týždenne)', factor: 1.55 },
  high:     { label: 'Vysoký (5+ tréningov týždenne)',    factor: 1.725 },
};

export const GOAL = {
  lose:     { label: 'Schudnúť',       delta: -500 },
  maintain: { label: 'Udržať váhu',    delta: 0 },
  gain:     { label: 'Nabrať svaly',   delta: +300 },
};

// Bezpečnostné minimá pre mladých ľudí (nikdy nejdeme pod ne)
export const MIN_KCAL = { m: 1800, f: 1500 };
export const MAX_DEFICIT = 500;

export function ageFromYear(birthYear, now = new Date()) {
  return now.getFullYear() - Number(birthYear);
}

// Mifflin-St Jeor
export function bmr({ sex, weightKg, heightCm, age }) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === 'm' ? base + 5 : base - 161);
}

export function tdee(bmrValue, activity) {
  const f = (ACTIVITY[activity] || ACTIVITY.light).factor;
  return Math.round(bmrValue * f);
}

export function targets({ sex, weightKg, heightCm, birthYear, activity, goal }) {
  const age = ageFromYear(birthYear);
  const b = bmr({ sex, weightKg, heightCm, age });
  const t = tdee(b, activity);
  let delta = (GOAL[goal] || GOAL.maintain).delta;
  if (delta < -MAX_DEFICIT) delta = -MAX_DEFICIT;
  let kcal = t + delta;
  const floor = MIN_KCAL[sex] || 1500;
  if (kcal < floor) kcal = floor;
  kcal = Math.round(kcal / 10) * 10;

  // Bielkoviny: 1.8 g/kg pri chudnutí a naberaní, 1.6 pri udržiavaní
  const proteinPerKg = goal === 'maintain' ? 1.6 : 1.8;
  const protein = Math.round(weightKg * proteinPerKg);
  // Tuky: 25 % kalórií
  const fat = Math.round((kcal * 0.25) / 9);
  // Sacharidy: zvyšok
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { bmr: b, tdee: t, kcal, protein, carbs, fat, age };
}

// Trend váhy: exponenciálny kĺzavý priemer, aby denné výkyvy (voda, jedlo) nerozhadzovali graf
export function trend(points, alpha = 0.25) {
  // points: [{date:'YYYY-MM-DD', weight:number}] zoradené vzostupne
  const out = [];
  let ema = null;
  for (const p of points) {
    ema = ema === null ? p.weight : ema + alpha * (p.weight - ema);
    out.push({ date: p.date, weight: p.weight, trend: Math.round(ema * 100) / 100 });
  }
  return out;
}

// Zmena trendu za posledných N dní (kg)
export function trendChange(trended, days = 7) {
  if (trended.length < 2) return null;
  const last = trended[trended.length - 1];
  const cutoff = addDays(last.date, -days);
  const ref = [...trended].reverse().find(p => p.date <= cutoff) || trended[0];
  return Math.round((last.trend - ref.trend) * 100) / 100;
}

export function sumMacros(rows) {
  return rows.reduce((a, r) => ({
    kcal: a.kcal + Number(r.kcal || 0),
    protein: a.protein + Number(r.protein || 0),
    carbs: a.carbs + Number(r.carbs || 0),
    fat: a.fat + Number(r.fat || 0),
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
}

// Prepočet makier z hodnôt na 100 g na zadané gramy
export function scale(per100, grams) {
  const k = Number(grams) / 100;
  const r = v => Math.round(Number(v || 0) * k * 10) / 10;
  return { kcal: Math.round(Number(per100.kcal || 0) * k), protein: r(per100.protein), carbs: r(per100.carbs), fat: r(per100.fat) };
}

export function today() {
  const d = new Date();
  return toISO(d);
}
export function toISO(d) {
  const z = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
export function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toISO(d);
}
export function fmtDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${Number(d)}. ${Number(m)}.`;
}
