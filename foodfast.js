// Okamžité hľadanie jedál: naša overená slovenská databáza (~1 100 jedál) je uložená v telefóne,
// takže výsledky sa ukážu hneď pri prvom písmene, bez čakania na server. Výsledky zo servera ich potom doplnia.
// Poradie je rovnaké ako na serveri: presná zhoda, všetky slová, začiatok názvu, obľúbenosť, kratší názov.
import * as db from './data.js';

const KEY = 'fw_core_v1', MAX_AGE = 3 * 864e5;
const COLS = 'id,name,brand,barcode,kcal,protein,carbs,fat,fiber,sugar,salt,portions,is_recipe,recipe,servings,total_grams,verified,uses,is_public,gluten,lactose,allergens,traces,gi,img,search,kw';
export const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

let rows = null, loading = null;
function prep(list) {
  for (const r of list) { r._h = ' ' + norm(r.search || r.name) + ' ' + norm(r.kw || '') + ' ' + norm(r.brand || '') + ' '; r._n = norm(r.name); r.mine = false; }
  return list;
}
function fromCache() {
  try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o?.rows?.length) return o; } catch (_) { /* poškodená pamäť */ }
  return null;
}
async function fetchAll() {
  await db.ready;
  const { data, error } = await db.sb.from('foods').select(COLS).eq('is_public', true).or('verified.eq.true,src.in.(curated,chain)').limit(3000);
  if (error || !data?.length) throw error || new Error('prázdne');
  try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), rows: data })); } catch (_) { /* plné úložisko */ }
  return data;
}
// načíta sa pri otvorení obrazovky Jedlo; staré dáta sa obnovia na pozadí
export function ensure() {
  if (rows) return Promise.resolve(rows);
  if (loading) return loading;
  const c = fromCache();
  if (c) {
    rows = prep(c.rows);
    if (Date.now() - (c.t || 0) > MAX_AGE) fetchAll().then(d => { rows = prep(d); }).catch(() => { });
    return Promise.resolve(rows);
  }
  loading = fetchAll().then(d => (rows = prep(d))).catch(() => (rows = null)).finally(() => { loading = null; });
  return loading;
}
export const ready = () => !!rows;

export function search(q, lim = 12) {
  if (!rows) return [];
  const nq = norm(q); if (!nq) return [];
  const words = nq.split(' ');
  const out = [];
  for (const r of rows) {
    const hay = r._h;
    let all = true;
    for (const w of words) if (!hay.includes(' ' + w)) { all = false; break; }
    if (!all) continue;
    const exact = r._n === nq, pre = r._n.startsWith(nq), wpre = (' ' + r._n).includes(' ' + nq);
    const s = (exact ? 1000 : 0) + (pre ? 300 : 0) + (wpre ? 120 : 0) + Math.min(80, (r.uses || 0) * 4) + (r.img ? 10 : 0) - r._n.length * 0.6;
    out.push([s, r]);
  }
  out.sort((a, b) => b[0] - a[0]);
  return out.slice(0, lim).map(x => x[1]);
}
