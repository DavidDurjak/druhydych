// Osobné poradie vo výsledkoch hľadania: jedlá, ktoré človek už zapisoval (aspoň 2x), idú vo výsledkoch navrch,
// najčastejšie prvé. Ostatné ostávajú v pôvodnom poradí. Pri akejkoľvek chybe sa nič nemení.
import * as db from './data.js';

export function boost(rows, counts) {
  if (!Array.isArray(rows) || !counts || !counts.size) return rows;
  const mine = [], rest = [];
  rows.forEach((r, i) => { const n = counts.get(r?.id); if (n >= 2) mine.push({ r, n, i }); else rest.push(r); });
  if (!mine.length) return rows;
  mine.sort((a, b) => b.n - a.n || a.i - b.i);
  return mine.map(x => x.r).concat(rest);
}

let cache = null;
async function loadCounts(sb) {
  if (cache && Date.now() - cache.t < 300000) return cache.m;
  const { data: s } = await sb.auth.getSession();
  const uid = s?.session?.user?.id; if (!uid) return null;
  const since = new Date(Date.now() - 120 * 864e5).toISOString().slice(0, 10);
  const { data, error } = await sb.from('food_logs').select('food_id').eq('user_id', uid).gte('date', since).not('food_id', 'is', null).limit(1500);
  if (error || !data) return null;
  const m = new Map(); data.forEach(x => m.set(x.food_id, (m.get(x.food_id) || 0) + 1));
  cache = { t: Date.now(), m };
  return m;
}

// hľadania bez výsledku (len text hľadaného jedla, bez účtu): vidíme, čo ľuďom v databáze chýba
let emT = null; const emSeen = new Set();
function emptyNote(q, n) {
  try {
    clearTimeout(emT);
    const t = String(q).trim().toLowerCase().slice(0, 40);
    if (n > 0 || t.length < 3 || emSeen.has(t)) return;
    emT = setTimeout(() => { emSeen.add(t); window.fwTrack && window.fwTrack('search_empty', { q: t }); }, 2500);
  } catch (_) { /* bez záznamu */ }
}

db.ready.then(() => {
  const sb = db.sb;
  if (!sb || sb.__pers) return; sb.__pers = true;
  const orig = sb.rpc.bind(sb);
  sb.rpc = (name, args, ...rest) => {
    const p = orig(name, args, ...rest);
    if ((name !== 'search_foods_v2' && name !== 'search_foods') || !args?.q || String(args.q).trim().length < 2) return p;
    return Promise.resolve(p).then(async r => {
      try {
        if (r?.error || !Array.isArray(r?.data)) return r;
        emptyNote(args.q, r.data.length);
        const m = await loadCounts(sb);
        const out = boost(r.data, m);
        return out === r.data ? r : { ...r, data: out };
      } catch (_) { return r; }
    });
  };
}).catch(() => { });
