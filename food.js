// Vyhľadávanie jedál: základné potraviny (offline) + Open Food Facts (online)

// Hodnoty na 100 g
export const BASIC_FOODS = [
  ['Kuracie prsia (surové)', 110, 23, 0, 1.5],
  ['Kuracie prsia (grilované)', 165, 31, 0, 3.6],
  ['Hovädzie mleté 10 %', 176, 20, 0, 10],
  ['Bravčové karé', 180, 22, 0, 10],
  ['Losos', 208, 20, 0, 13],
  ['Tuniak v konzerve (vo vlastnej šťave)', 116, 26, 0, 1],
  ['Vajce (1 ks = 55 g)', 155, 13, 1.1, 11],
  ['Vaječné bielka', 52, 11, 0.7, 0.2],
  ['Tvaroh polotučný', 110, 15, 4, 3],
  ['Skyr', 63, 11, 4, 0.2],
  ['Grécky jogurt 0 %', 57, 10, 3.6, 0.2],
  ['Biely jogurt 3,5 %', 65, 4, 5, 3.5],
  ['Mlieko polotučné', 47, 3.3, 4.8, 1.5],
  ['Eidam 30 %', 260, 29, 0, 16],
  ['Mozzarella', 250, 18, 1, 19],
  ['Cottage cheese', 98, 11, 3, 4.3],
  ['Srvátkový proteín (prášok)', 380, 78, 6, 5],
  ['Ryža biela (varená)', 130, 2.7, 28, 0.3],
  ['Ryža biela (suchá)', 360, 7, 79, 0.6],
  ['Cestoviny (varené)', 158, 5.8, 31, 0.9],
  ['Cestoviny (suché)', 360, 12, 72, 1.5],
  ['Zemiaky (varené)', 87, 1.9, 20, 0.1],
  ['Sladké zemiaky', 86, 1.6, 20, 0.1],
  ['Ovsené vločky', 370, 13, 60, 7],
  ['Chlieb celozrnný', 250, 9, 43, 3.5],
  ['Rožok biely (1 ks = 50 g)', 290, 8, 57, 2.5],
  ['Ryžové chlebíčky', 390, 8, 82, 3],
  ['Banán', 89, 1.1, 23, 0.3],
  ['Jablko', 52, 0.3, 14, 0.2],
  ['Jahody', 32, 0.7, 8, 0.3],
  ['Čučoriedky', 57, 0.7, 14, 0.3],
  ['Pomaranč', 47, 0.9, 12, 0.1],
  ['Avokádo', 160, 2, 9, 15],
  ['Brokolica', 34, 2.8, 7, 0.4],
  ['Mrkva', 41, 0.9, 10, 0.2],
  ['Uhorka', 15, 0.7, 3.6, 0.1],
  ['Paradajka', 18, 0.9, 3.9, 0.2],
  ['Paprika', 31, 1, 6, 0.3],
  ['Špenát', 23, 2.9, 3.6, 0.4],
  ['Olivový olej', 884, 0, 0, 100],
  ['Maslo', 717, 0.9, 0.1, 81],
  ['Arašidové maslo', 588, 25, 20, 50],
  ['Mandle', 579, 21, 22, 50],
  ['Vlašské orechy', 654, 15, 14, 65],
  ['Med', 304, 0.3, 82, 0],
  ['Horká čokoláda 70 %', 600, 8, 45, 42],
  ['Kofola', 42, 0, 10, 0],
  ['Coca-Cola', 42, 0, 10.6, 0],
  ['Pizza (1 ks cca 400 g)', 266, 11, 33, 10],
  ['Kebab v žemli', 215, 12, 20, 10],
  ['Hranolky', 312, 3.4, 41, 15],
].map(([name, kcal, protein, carbs, fat]) => ({ name, brand: 'Základné', kcal, protein, carbs, fat, source: 'basic' }));

function norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function searchBasic(q) {
  const n = norm(q);
  if (!n) return BASIC_FOODS.slice(0, 12);
  return BASIC_FOODS.filter(f => norm(f.name).includes(n)).slice(0, 12);
}

function parseOFF(p) {
  const n = p.nutriments || {};
  const kcal = n['energy-kcal_100g'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : null);
  if (kcal == null) return null;
  return {
    name: p.product_name || p.product_name_sk || p.product_name_en || 'Bez názvu',
    brand: p.brands || '',
    kcal: Math.round(kcal),
    protein: Number(n.proteins_100g || 0),
    carbs: Number(n.carbohydrates_100g || 0),
    fat: Number(n.fat_100g || 0),
    source: 'off',
    barcode: p.code || null,
  };
}

const FIELDS = 'product_name,product_name_sk,product_name_en,brands,nutriments,code';

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
