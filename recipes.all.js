// Celá knižnica receptov (v156): pôvodných 130 receptov z recipes.data.js + recepty zo Slovenska, Česka, Európy a sveta.
import { RECIPES as BASE, CATS } from './recipes.data.js';
import { I } from './recipes.ing.js';
import { R1 } from './recipes.d1.js';
import { R2 } from './recipes.d2.js';
import { R3 } from './recipes.d3.js';
import { R4 } from './recipes.d4.js';
import { R5 } from './recipes.d5.js';

export { CATS };

// odkiaľ jedlo pochádza (pôvodné fit recepty majú kuchyňu 'fit', pokiaľ nie sú uvedené nižšie)
export const CUIS = [['fit', 'Fit'], ['sk', 'Slovensko'], ['cz', 'Česko'], ['hu', 'Maďarsko'], ['pl', 'Poľsko'], ['east', 'Východná Európa'], ['de', 'Nemecko a Rakúsko'], ['ch', 'Švajčiarsko a Benelux'], ['it', 'Taliansko'], ['gr', 'Grécko'], ['es', 'Španielsko'], ['pt', 'Portugalsko'], ['fr', 'Francúzsko'], ['uk', 'Británia'], ['nordic', 'Škandinávia'], ['balkan', 'Balkán'], ['tr', 'Orient a Afrika'], ['asia', 'Ázia'], ['america', 'Amerika']];
const C0 = { 'bryndzove-halusky': 'sk', kapustnica: 'sk', 'bryndzova-natierka': 'sk', 'sulance-mak': 'sk', makovnik: 'sk', zemiakova: 'sk', 'zemiakove-placky': 'sk', 'plnena-paprika': 'sk', fazulova: 'sk', sosovicova: 'sk',
  'hubova-kulajda': 'cz', cesnakova: 'cz', 'vanilkove-rozky': 'cz', babovka: 'cz', 'kuracia-polievka': 'cz', 'ryzovy-nakyp': 'cz',
  gulas: 'hu', 'jablkovy-zavin': 'de', 'spagety-bolonske': 'it', caprese: 'it', minestrone: 'it', tiramisu: 'it', 'panna-cotta': 'it', frittata: 'it', rizoto: 'it', 'fit-lasagne': 'it', 'kuracie-caprese': 'it', 'fit-pizza': 'it',
  'grecky-salat': 'gr', chili: 'america', brownies: 'america', 'americke-palacinky': 'america', cezar: 'america', 'fit-burger': 'america', cheesecake: 'america', 'bananovy-chlebik': 'america', 'mrkvovy-kolac': 'america', 'boruvkove-muffiny': 'america',
  'cizrnove-kari': 'asia', 'stirfry-kuracie': 'asia', 'tofu-stirfry': 'asia', 'humus-tanier': 'tr', 'humus-zelenina': 'tr', 'tortilla-vajce': 'america', wrap: 'america' };

// [id, názov, kategória, kuchyňa, minúty, porcie, [[surovina, gramy], ...], [kroky]]
const build = (id, name, cat, cuis, min, servings, items, steps) => {
  const ing = items.map(([k, g]) => { const [n, kcal, protein, carbs, fat] = I[k]; return { name: n, grams: g, per100: { kcal, protein, carbs, fat } }; });
  const t = ing.reduce((a, i) => { const f = i.grams / 100; a.g += i.grams; a.kcal += i.per100.kcal * f; a.protein += i.per100.protein * f; a.carbs += i.per100.carbs * f; a.fat += i.per100.fat * f; return a; }, { g: 0, kcal: 0, protein: 0, carbs: 0, fat: 0 });
  const s = servings || 1;
  return { id, name, cat, cuis, min, servings: s, ing, steps, grams: t.g, per: { kcal: Math.round(t.kcal / s), protein: Math.round(t.protein / s), carbs: Math.round(t.carbs / s), fat: Math.round(t.fat / s) } };
};

export const RECIPES = [
  ...BASE.map(r => ({ ...r, cuis: C0[r.id] || 'fit' })),
  ...[...R1, ...R2, ...R3, ...R4, ...R5].map(r => build(...r)),
];
