// Generátor tréningových plánov (gym). Čistá logika.

export const EXERCISES = {
  squat:        { name: 'Drep s činkou',               muscle: 'nohy',     type: 'compound' },
  legpress:     { name: 'Leg press',                   muscle: 'nohy',     type: 'compound' },
  rdl:          { name: 'Rumunský mŕtvy ťah',          muscle: 'zadný reťazec', type: 'compound' },
  deadlift:     { name: 'Mŕtvy ťah',                   muscle: 'zadný reťazec', type: 'compound' },
  lunge:        { name: 'Výpady s jednoručkami',       muscle: 'nohy',     type: 'compound' },
  legcurl:      { name: 'Zakopávanie na stroji',       muscle: 'hamstringy', type: 'isolation' },
  legext:       { name: 'Predkopávanie na stroji',     muscle: 'kvadricepsy', type: 'isolation' },
  calf:         { name: 'Výpony na lýtka',             muscle: 'lýtka',    type: 'isolation' },
  bench:        { name: 'Bench press',                 muscle: 'hrudník',  type: 'compound' },
  incline_db:   { name: 'Tlak s jednoručkami na šikmej lavici', muscle: 'hrudník', type: 'compound' },
  pushup:       { name: 'Kliky',                       muscle: 'hrudník',  type: 'compound' },
  dip:          { name: 'Dipy',                        muscle: 'hrudník',  type: 'compound' },
  flye:         { name: 'Rozpažovanie (stroj / kladka)', muscle: 'hrudník', type: 'isolation' },
  ohp:          { name: 'Tlak nad hlavu',              muscle: 'ramená',   type: 'compound' },
  latraise:     { name: 'Upažovanie s jednoručkami',   muscle: 'ramená',   type: 'isolation' },
  facepull:     { name: 'Face pull',                   muscle: 'zadné ramená', type: 'isolation' },
  pullup:       { name: 'Zhyby (alebo s dopomocou)',   muscle: 'chrbát',   type: 'compound' },
  latpull:      { name: 'Sťahovanie kladky',           muscle: 'chrbát',   type: 'compound' },
  row_bb:       { name: 'Príťahy s činkou v predklone', muscle: 'chrbát',  type: 'compound' },
  row_cable:    { name: 'Príťahy na spodnej kladke',   muscle: 'chrbát',   type: 'compound' },
  row_db:       { name: 'Príťahy s jednoručkou',       muscle: 'chrbát',   type: 'compound' },
  curl:         { name: 'Bicepsový zdvih',             muscle: 'biceps',   type: 'isolation' },
  hammer:       { name: 'Kladivový zdvih',             muscle: 'biceps',   type: 'isolation' },
  triceps_push: { name: 'Tricepsové sťahovanie kladky', muscle: 'triceps', type: 'isolation' },
  skull:        { name: 'Francúzsky tlak',             muscle: 'triceps',  type: 'isolation' },
  plank:        { name: 'Plank',                       muscle: 'core',     type: 'isolation', time: true },
  legraise:     { name: 'Zdvihy nôh vo vise',          muscle: 'core',     type: 'isolation' },
  cable_crunch: { name: 'Skracovačky na kladke',       muscle: 'core',     type: 'isolation' },
  hipthrust:    { name: 'Hip thrust',                  muscle: 'zadok',    type: 'compound' },
  cardio:       { name: 'Kardio (chôdza do kopca / bicykel)', muscle: 'kardio', type: 'cardio', time: true },
};

// Rozsahy opakovaní podľa cieľa
const REPS = {
  lose:     { compound: [10, 12], isolation: [12, 15], sets: 3 },
  maintain: { compound: [8, 10],  isolation: [10, 12], sets: 3 },
  gain:     { compound: [6, 8],   isolation: [8, 12],  sets: 4 },
};

// Šablóny: 2 až 5 dní
const TEMPLATES = {
  2: [
    { name: 'Celé telo A', ex: ['squat', 'bench', 'row_cable', 'ohp', 'legcurl', 'plank'] },
    { name: 'Celé telo B', ex: ['deadlift', 'incline_db', 'latpull', 'lunge', 'latraise', 'legraise'] },
  ],
  3: [
    { name: 'Celé telo A', ex: ['squat', 'bench', 'row_cable', 'latraise', 'curl', 'plank'] },
    { name: 'Celé telo B', ex: ['rdl', 'ohp', 'latpull', 'legpress', 'triceps_push', 'legraise'] },
    { name: 'Celé telo C', ex: ['deadlift', 'incline_db', 'row_db', 'lunge', 'facepull', 'cable_crunch'] },
  ],
  4: [
    { name: 'Horná A (tlaky)', ex: ['bench', 'ohp', 'incline_db', 'latraise', 'triceps_push', 'skull'] },
    { name: 'Dolná A', ex: ['squat', 'rdl', 'legpress', 'legcurl', 'calf', 'plank'] },
    { name: 'Horná B (ťahy)', ex: ['pullup', 'row_bb', 'row_cable', 'facepull', 'curl', 'hammer'] },
    { name: 'Dolná B', ex: ['deadlift', 'lunge', 'hipthrust', 'legext', 'calf', 'legraise'] },
  ],
  5: [
    { name: 'Hrudník + triceps', ex: ['bench', 'incline_db', 'flye', 'dip', 'triceps_push', 'skull'] },
    { name: 'Chrbát + biceps', ex: ['deadlift', 'pullup', 'row_bb', 'row_cable', 'curl', 'hammer'] },
    { name: 'Nohy', ex: ['squat', 'legpress', 'rdl', 'legcurl', 'legext', 'calf'] },
    { name: 'Ramená + core', ex: ['ohp', 'latraise', 'facepull', 'plank', 'legraise', 'cable_crunch'] },
    { name: 'Horná (objem)', ex: ['incline_db', 'latpull', 'row_db', 'flye', 'curl', 'triceps_push'] },
  ],
};

export function generatePlan({ goal = 'maintain', days = 3, gym = true }) {
  days = Math.max(2, Math.min(5, Number(days) || 3));
  const r = REPS[goal] || REPS.maintain;
  const tpl = TEMPLATES[days];
  const plan = tpl.map((d, i) => ({
    day: i + 1,
    name: d.name,
    exercises: d.ex.map(id => {
      const e = EXERCISES[id];
      const isCardio = e.type === 'cardio';
      const range = e.type === 'compound' ? r.compound : r.isolation;
      return {
        id, name: e.name, muscle: e.muscle,
        sets: e.time ? (isCardio ? 1 : 3) : r.sets,
        reps: e.time ? null : `${range[0]}-${range[1]}`,
        seconds: e.id === 'cardio' ? 1200 : (e.time ? 45 : null),
      };
    }),
  }));
  // Pri chudnutí pridaj kardio na koniec každého dňa
  if (goal === 'lose') plan.forEach(d => d.exercises.push({ id: 'cardio', name: EXERCISES.cardio.name, muscle: 'kardio', sets: 1, reps: null, seconds: 900 }));
  return { name: `${days}× týždenne · ${goal === 'lose' ? 'chudnutie' : goal === 'gain' ? 'naberanie' : 'udržiavanie'}`, days: plan };
}

// Ktorý deň plánu je dnes na rade: ďalší po poslednom odcvičenom
export function nextDay(plan, logs) {
  if (!plan?.days?.length) return 1;
  const done = logs.filter(l => l.done).sort((a, b) => a.date < b.date ? 1 : -1);
  if (!done.length) return 1;
  return (done[0].plan_day % plan.days.length) + 1;
}

export function weekAdherence(logs, trainingDays, weekStart) {
  const done = logs.filter(l => l.done && l.date >= weekStart).length;
  return { done, target: Number(trainingDays || 0) };
}
