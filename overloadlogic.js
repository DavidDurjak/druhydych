// Progresia z reálnych výkonov: z histórie zapísaných sérií spočíta, či pri cviku pridať váhu, držať ju alebo ju znížiť.
// Čistá logika bez závislostí, aby sa dala testovať. Pravidlá (dvojitá progresia):
// - všetky predpísané série na hornej hranici rozsahu opakovaní = pridaj váhu a začni opäť od spodnej hranice,
// - inak drž váhu a skús o opakovanie viac v najslabšej sérii,
// - pod spodnou hranicou dva tréningy po sebe = váhu mierne zníž (jeden zlý deň nič nemení),
// - tri tréningy bez zlepšenia = stagnácia, navrhne sa výmena cviku alebo deload.

const num = v => { const n = Number(String(v ?? '').replace(',', '.')); return isFinite(n) ? n : 0; };
const r05 = v => Math.round(v * 2) / 2;
const e1rm = (kg, reps) => kg * (1 + Math.min(reps, 20) / 30);
export const MAX_SESSIONS = 4;

export function parseRange(txt) {
  const m = /(\d+)\s*[-–]\s*(\d+)/.exec(String(txt || ''));
  if (m) return { lo: Number(m[1]), hi: Number(m[2]) };
  const s = /(\d+)/.exec(String(txt || ''));
  return s ? { lo: Number(s[1]), hi: Number(s[1]) } : { lo: 8, hi: 12 };
}

// logs: riadky workout_logs. Vráti tréningy daného cviku od najnovšieho: [{date, sets:[{kg, reps}]}]
export function sessionsFor(exId, logs, beforeDate) {
  const out = [];
  [...(logs || [])].filter(l => l.done && (!beforeDate || l.date < beforeDate)).sort((a, b) => a.date < b.date ? 1 : -1).forEach(l => {
    const sets = (l.sets || []).filter(s => s.ex === exId && num(s.reps) > 0 && (s.done || l.done)).map(s => ({ kg: num(s.kg), reps: num(s.reps) }));
    if (sets.length) out.push({ date: l.date, sets });
  });
  return out.slice(0, MAX_SESSIONS);
}

// krok navyšovania podľa náročnosti cviku
export function increment(ex) {
  if (!ex) return 2.5;
  const lower = ex.u === 'lower' || ['quads', 'hams', 'glutes'].includes(Object.entries(ex.m || {}).sort((a, b) => b[1] - a[1])[0]?.[0]);
  if (ex.rr === 'H') return lower ? 5 : 2.5;
  if (ex.rr === 'M') return lower ? 5 : 2.5;
  return 1.25;
}

function topOf(sess) {
  const kg = Math.max(...sess.sets.map(s => s.kg));
  const main = sess.sets.filter(s => s.kg === kg);
  return { kg, main, minReps: Math.min(...main.map(s => s.reps)), best: Math.max(...sess.sets.map(s => e1rm(s.kg, s.reps))) };
}

// ex: položka z EXERCISES, plan: {sets, reps, startKg}, sessions: výstup sessionsFor, opts: {deload}
export function recommend({ ex, plan, sessions, deload = false, fmt = v => String(v).replace('.', ','), unit = 'kg' }) {
  const K = v => `${fmt(v)} ${unit}`;
  const { lo, hi } = parseRange(plan.reps);
  const need = Math.max(1, Number(plan.sets) || 3);
  const out = { kind: 'start', kg: null, reps: lo, stalled: false, text: '' };
  if (!sessions.length) {
    if (plan.startKg) { out.kg = plan.startKg; out.text = `Začni okolo ${K(plan.startKg)}, posledné opakovanie má byť ťažké, ale čisté.`; }
    return out;
  }
  const s0 = topOf(sessions[0]);
  const weighted = s0.kg > 0;
  const inc = increment(ex);
  out.last = { kg: s0.kg, reps: s0.main.map(s => s.reps) };

  if (deload) {
    out.kind = 'deload'; out.kg = weighted ? s0.kg : null; out.reps = hi;
    out.text = 'Deload týždeň: rovnaká váha, polovica sérií, nechaj si väčšiu rezervu.';
    return out;
  }

  // stagnácia: tri tréningy po sebe sa najlepšia séria nezlepšila o viac než 1 %
  if (weighted && sessions.length >= 3 && sessions.slice(0, 3).every(s => topOf(s).kg > 0)) {
    const a = topOf(sessions[0]).best, b = topOf(sessions[2]).best, spanOk = sessions[0].date > sessions[2].date;
    if (spanOk && a <= b * 1.01) out.stalled = true;
  }

  const allTop = s0.main.length >= need && s0.main.every(s => s.reps >= hi);
  if (!weighted) {
    const weak = Math.min(...sessions[0].sets.map(s => s.reps));
    if (sessions[0].sets.length >= need && weak >= hi) { out.kind = 'harder'; out.text = `Všetky série na ${hi} opakovaní. Pridaj záťaž alebo ťažší variant a začni od ${lo}.`; }
    else { out.kind = 'reps'; out.reps = Math.min(hi, weak + 1); out.text = `Cieľ: ${out.reps} opakovaní v každej sérii (naposledy najmenej ${weak}).`; }
    return out;
  }
  if (allTop) {
    out.kind = 'add'; out.kg = r05(s0.kg + inc); out.reps = lo;
    out.text = `Zvládol si ${hi} opakovaní vo všetkých sériách. Pridaj na ${K(out.kg)} a začni od ${lo}.`;
  } else if (s0.main.length < need && s0.main.every(s => s.reps >= hi)) {
    out.kind = 'hold'; out.kg = s0.kg; out.reps = hi;
    out.text = `Drž ${K(s0.kg)}, urob všetky série (${need}) na ${hi} opakovaní a potom pridáš váhu.`;
  } else if (s0.minReps < lo) {
    const prev = sessions[1] ? topOf(sessions[1]) : null;
    if (prev && prev.kg >= s0.kg && prev.minReps < lo) {
      out.kind = 'drop'; out.kg = Math.max(inc, Math.round(s0.kg * 0.9 / inc) * inc); out.reps = lo;
      out.text = `Dva tréningy pod ${lo} opakovaní. Zníž na ${K(out.kg)}, vráť sa k čistej technike a postupne sa vrátiš hore.`;
    } else {
      out.kind = 'hold'; out.kg = s0.kg; out.reps = lo;
      out.text = `Drž ${K(s0.kg)} a cieľ je aspoň ${lo} opakovaní v každej sérii (naposledy ${s0.minReps}).`;
    }
  } else {
    out.kind = 'hold'; out.kg = s0.kg; out.reps = Math.min(hi, s0.minReps + 1);
    out.text = `Drž ${K(s0.kg)} a skús ${out.reps} opakovaní aj v najslabšej sérii (naposledy ${s0.minReps}).`;
  }
  if (out.stalled && out.kind !== 'add') out.text += ' Už tri tréningy sa nehýbeš. Skús výmenu cviku alebo deload.';
  return out;
}

// súhrn pre celý deň: kto ide hore, kto stagnuje, či treba deload
export function summarize(recs) {
  const w = recs.filter(r => r.kind !== 'start');
  const up = w.filter(r => r.kind === 'add' || r.kind === 'harder').length;
  const stalled = w.filter(r => r.stalled || r.kind === 'drop').length;
  return { total: w.length, up, stalled, deload: w.length >= 3 && stalled >= Math.ceil(w.length / 2) };
}
