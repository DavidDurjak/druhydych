// Celá knižnica receptov (v162): pôvodných 130 receptov z recipes.data.js + recepty zo Slovenska, Česka, Európy a sveta.
import { RECIPES as BASE, CATS } from './recipes.data.js';
import { I as I0 } from './recipes.ing.js';
import { R1 } from './recipes.d1.js';
import { R2 } from './recipes.d2.js';
import { R3 } from './recipes.d3.js';
import { R4 } from './recipes.d4.js';
import { R5 } from './recipes.d5.js';
import { R6 } from './recipes.d6.js';
import { R7 } from './recipes.d7.js';
import { R8 } from './recipes.d8.js';
import { R9 } from './recipes.d9.js';
import { R10 } from './recipes.d10.js';
import { R11 } from './recipes.d11.js';
import { R12, I12 } from './recipes.d12.js';
import { R13, I13 } from './recipes.d13.js';
import { R14, I14 } from './recipes.d14.js';
import { R15, I15 } from './recipes.d15.js';
import { R16, I16 } from './recipes.d16.js';
import { R17, I17 } from './recipes.d17.js';
import { R18, I18 } from './recipes.d18.js';
import { R19, I19 } from './recipes.d19.js';
import { R20, I20 } from './recipes.d20.js';
import { R21, I21 } from './recipes.d21.js';
import { R22, I22 } from './recipes.d22.js';
import { R23, I23 } from './recipes.d23.js';
import { R24, I24 } from './recipes.d24.js';
import { R25, I25 } from './recipes.d25.js';
import { R26, I26 } from './recipes.d26.js';
import { R27, I27 } from './recipes.d27.js';
import { R28, I28 } from './recipes.d28.js';
import { R29, I29 } from './recipes.d29.js';
import { R30, I30 } from './recipes.d30.js';
import { R31, I31 } from './recipes.d31.js';
import { R32, I32 } from './recipes.d32.js';
import { R33, I33 } from './recipes.d33.js';
import { R34, I34 } from './recipes.d34.js';
import { R35, I35 } from './recipes.d35.js';
import { R36, I36 } from './recipes.d36.js';
import { R37, I37 } from './recipes.d37.js';
import { R38, I38 } from './recipes.d38.js';
import { R39, I39 } from './recipes.d39.js';
import { R40, I40 } from './recipes.d40.js';
import { R41, I41 } from './recipes.d41.js';
import { R42, I42 } from './recipes.d42.js';
import { R43, I43 } from './recipes.d43.js';
import { R44, I44 } from './recipes.d44.js';
import { R45, I45 } from './recipes.d45.js';
import { R46, I46 } from './recipes.d46.js';
import { R47, I47 } from './recipes.d47.js';
import { R48, I48 } from './recipes.d48.js';
import { R49, I49 } from './recipes.d49.js';
import { R50, I50 } from './recipes.d50.js';
import { R51, I51 } from './recipes.d51.js';
import { R52, I52 } from './recipes.d52.js';
import { R53, I53 } from './recipes.d53.js';
import { R54, I54 } from './recipes.d54.js';
import { R55, I55 } from './recipes.d55.js';
import { R56, I56 } from './recipes.d56.js';
import { R57, I57 } from './recipes.d57.js';
import { R58, I58 } from './recipes.d58.js';
import { R59, I59 } from './recipes.d59.js';
import { R60, I60 } from './recipes.d60.js';
import { R61, I61 } from './recipes.d61.js';
import { R62, I62 } from './recipes.d62.js';

const I = { ...I0, ...I12, ...I13, ...I14, ...I15, ...I16, ...I17, ...I18, ...I19, ...I20, ...I21, ...I22, ...I23, ...I24, ...I25, ...I26, ...I27, ...I28, ...I29, ...I30, ...I31, ...I32, ...I33, ...I34, ...I35, ...I36, ...I37, ...I38, ...I39, ...I40, ...I41, ...I42, ...I43, ...I44, ...I45, ...I46, ...I47, ...I48, ...I49, ...I50, ...I51, ...I52, ...I53, ...I54, ...I55, ...I56, ...I57, ...I58, ...I59, ...I60, ...I61, ...I62 };

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
  ...[...R1, ...R2, ...R3, ...R4, ...R5, ...R6, ...R7, ...R8, ...R9, ...R10, ...R11, ...R12, ...R13, ...R14, ...R15, ...R16, ...R17, ...R18, ...R19, ...R20, ...R21, ...R22, ...R23, ...R24, ...R25, ...R26, ...R27, ...R28, ...R29, ...R30, ...R31, ...R32, ...R33, ...R34, ...R35, ...R36, ...R37, ...R38, ...R39, ...R40, ...R41, ...R42, ...R43, ...R44, ...R45, ...R46, ...R47, ...R48, ...R49, ...R50, ...R51, ...R52, ...R53, ...R54, ...R55, ...R56, ...R57, ...R58, ...R59, ...R60, ...R61, ...R62].map(r => build(...r)),
];
