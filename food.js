// Vyhľadávanie jedál v Open Food Facts (online). Spolu s údajmi o lepku, laktóze a alergénoch pre stravovacie režimy.
import { offTags } from './dxcore.js';

function parseOFF(p) {
  const n = p.nutriments || {};
  const kcal = n['energy-kcal_100g'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : null);
  if (kcal == null) return null;
  const sug = n.sugars_100g, salt = n.salt_100g, fib = n.fiber_100g;
  return {
    name: p.product_name || p.product_name_sk || p.product_name_en || 'Bez názvu',
    brand: p.brands || '',
    kcal: Math.round(kcal),
    protein: Number(n.proteins_100g || 0),
    carbs: Number(n.carbohydrates_100g || 0),
    fat: Number(n.fat_100g || 0),
    sugar: sug == null ? null : Number(sug),
    salt: salt == null ? null : Number(salt),
    fiber: fib == null ? null : Number(fib),
    source: 'off',
    barcode: p.code || null,
    ...offTags(p),
  };
}

const FIELDS = 'product_name,product_name_sk,product_name_en,brands,nutriments,code,allergens_tags,traces_tags,labels_tags,ingredients_text,ingredients_text_sk';

export async function searchOFF(q, { signal } = {}) {
  if (!q || q.length < 2) return [];
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=20&fields=${FIELDS}&countries_tags_en=slovakia|czech-republic`;
  const res = await fetch(url, { signal, headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error('Open Food Facts nedostupné');
  const json = await res.json();
  let items = (json.products || []).map(parseOFF).filter(Boolean);
  if (items.length < 5) {
    const url2 = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=20&fields=${FIELDS}`;
    const r2 = await fetch(url2, { signal, headers: { 'Accept': 'application/json' } });
    if (r2.ok) {
      const j2 = await r2.json();
      const more = (j2.products || []).map(parseOFF).filter(Boolean);
      const seen = new Set(items.map(i => i.barcode));
      for (const m of more) if (!seen.has(m.barcode)) items.push(m);
    }
  }
  return items.slice(0, 25);
}

export async function lookupBarcode(code) {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`);
  if (!res.ok) return null;
  const json = await res.json();
  if (json.status !== 1 || !json.product) return null;
  return parseOFF(json.product);
}
