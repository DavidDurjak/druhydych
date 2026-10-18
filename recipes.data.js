// Hotové recepty (Inšpiruj sa): jednoduché jedlá na raňajky, obed, večeru a desiatu.
// Hodnoty surovín sú na 100 g (kcal, bielkoviny, sacharidy, tuky), surovina sa váži v stave uvedenom v názve.
const I = {
  kuracie: ['Kuracie prsia', 120, 22.5, 0, 2.6],
  hovadzie: ['Mleté hovädzie (10 % tuku)', 176, 20, 0, 10],
  losos: ['Losos', 208, 20, 0, 13],
  tuniak: ['Tuniak vo vlastnej šťave', 116, 26, 0, 1],
  vajce: ['Vajcia', 143, 12.6, 0.7, 9.5],
  ryza: ['Ryža (surová)', 360, 7, 79, 0.6],
  cestoviny: ['Cestoviny (suché)', 360, 13, 72, 1.5],
  zemiaky: ['Zemiaky', 77, 2, 17, 0.1],
  sladke: ['Sladké zemiaky', 86, 1.6, 20, 0.1],
  vlocky: ['Ovsené vločky', 372, 13.5, 59, 7],
  chlieb: ['Celozrnný chlieb', 247, 9, 41, 3.5],
  tortilla: ['Pšeničná tortilla', 310, 8, 52, 7],
  mlieko: ['Polotučné mlieko', 47, 3.4, 4.8, 1.5],
  jogurt: ['Grécky jogurt biely', 97, 9, 4, 5],
  tvaroh: ['Tvaroh odtučnený', 70, 12, 3.5, 0.5],
  cottage: ['Cottage cheese', 98, 11, 3.4, 4.3],
  syr: ['Eidam 30 %', 250, 29, 1, 15],
  proteinp: ['Srvátkový proteín', 380, 78, 6, 6],
  banan: ['Banán', 89, 1.1, 22.8, 0.3],
  jablko: ['Jablko', 52, 0.3, 14, 0.2],
  boruvky: ['Čučoriedky', 57, 0.7, 14, 0.3],
  avokado: ['Avokádo', 160, 2, 9, 15],
  orechy: ['Vlašské orechy', 654, 15, 14, 65],
  arasidy: ['Arašidové maslo', 600, 25, 12, 50],
  med: ['Med', 304, 0.3, 82, 0],
  kakao: ['Kakao', 230, 20, 11, 14],
  olej: ['Olivový olej', 884, 0, 0, 100],
  cibula: ['Cibuľa', 40, 1.1, 9, 0.1],
  paprika: ['Paprika', 31, 1, 6, 0.3],
  rajciny: ['Paradajky', 18, 0.9, 3.9, 0.2],
  uhorka: ['Uhorka', 15, 0.7, 3, 0.1],
  brokolica: ['Brokolica', 34, 2.8, 7, 0.4],
  sampinony: ['Šampiňóny', 22, 3.1, 3.3, 0.3],
  hrasok: ['Hrášok', 81, 5, 14, 0.4],
  fazula: ['Červená fazuľa (konzerva)', 90, 6, 14, 0.5],
};

// [id, názov, ikona, kategória, minúty, porcie, [[surovina, gramy], ...], [kroky]]
const R = [
  ['palacinky', 'Proteínové palacinky', '🥞', 'breakfast', 15, 1, [['vlocky', 40], ['vajce', 100], ['banan', 80], ['proteinp', 25], ['mlieko', 60], ['olej', 3]],
    ['Vločky, vajcia, banán, proteín a mlieko rozmixuj na hladké cesto.', 'Na miernom ohni vylej na panvicu s kvapkou oleja malé palacinky.', 'Obracaj po 2 minútach, keď sa na okrajoch tvoria bublinky.']],
  ['kasa', 'Ovsená kaša s banánom a orechmi', '🥣', 'breakfast', 8, 1, [['vlocky', 60], ['mlieko', 200], ['banan', 100], ['orechy', 15], ['med', 10]],
    ['Vločky povar v mlieku 4 až 5 minút za stáleho miešania.', 'Navrch daj nakrájaný banán, nasekané orechy a med.']],
  ['prazenica', 'Praženica s celozrnným chlebom', '🍳', 'breakfast', 10, 1, [['vajce', 150], ['chlieb', 80], ['rajciny', 100], ['olej', 5]],
    ['Na oleji zľahka orestuj nakrájané paradajky.', 'Pridaj rozšľahané vajcia a miešaj, kým sa nezrazia.', 'Podávaj s chlebom.']],
  ['jogurt-boruvky', 'Grécky jogurt s vločkami a čučoriedkami', '🫐', 'breakfast', 3, 1, [['jogurt', 200], ['vlocky', 40], ['boruvky', 80], ['med', 10]],
    ['Jogurt daj do misky, pridaj vločky a čučoriedky.', 'Zalej medom.']],
  ['tvaroh-misa', 'Tvarohová misa s jablkom a orechmi', '🍎', 'breakfast', 5, 1, [['tvaroh', 200], ['jablko', 120], ['orechy', 10], ['med', 10]],
    ['Tvaroh rozmiešaj do hladka.', 'Pridaj nakrájané jablko, nasekané orechy a med.']],
  ['avokado-toast', 'Toast s avokádom a vajíčkom', '🥑', 'breakfast', 10, 1, [['chlieb', 80], ['avokado', 60], ['vajce', 100], ['olej', 3]],
    ['Chlieb opeč v hriankovači.', 'Avokádo roztlač vidličkou a natri na chlieb.', 'Na oleji usmaž dve vajíčka a polož navrch.']],
  ['proteinova-kasa', 'Proteínová kaša s čučoriedkami', '🥣', 'breakfast', 8, 1, [['vlocky', 50], ['mlieko', 200], ['proteinp', 25], ['boruvky', 60]],
    ['Vločky povar v mlieku 4 až 5 minút.', 'Zlož z ohňa, vmiešaj proteín a pridaj čučoriedky.']],

  ['rizoto', 'Kuracie rizoto so zeleninou', '🍚', 'lunch', 30, 1, [['kuracie', 150], ['ryza', 80], ['cibula', 40], ['paprika', 80], ['hrasok', 50], ['olej', 8]],
    ['Na oleji opeč nakrájané kuracie na kocky, odlož ho bokom.', 'Orestuj cibuľu a papriku, pridaj ryžu a zalej 2 dielmi vody.', 'Po 10 minútach pridaj hrášok a kuracie, duš do zmäknutia ryže.']],
  ['kuracie-ryza', 'Kuracie s ryžou a brokolicou', '🍗', 'lunch', 25, 1, [['kuracie', 170], ['ryza', 80], ['brokolica', 200], ['olej', 8]],
    ['Ryžu uvar podľa obalu, brokolicu zľahka podus v pare.', 'Kuracie nakrájaj na plátky a opeč na oleji dozlata.', 'Podávaj spolu, dochuť soľou, korením a citrónom.']],
  ['tuniak-cestoviny', 'Cestoviny s tuniakom a paradajkami', '🍝', 'lunch', 20, 1, [['cestoviny', 90], ['tuniak', 120], ['rajciny', 200], ['cibula', 30], ['olej', 8]],
    ['Cestoviny uvar al dente.', 'Na oleji orestuj cibuľu, pridaj paradajky a duš 8 minút.', 'Vmiešaj tuniaka a cestoviny a krátko prehrej.']],
  ['wrap', 'Kuracie wrap so zeleninou', '🌯', 'lunch', 15, 1, [['tortilla', 60], ['kuracie', 120], ['uhorka', 60], ['rajciny', 60], ['jogurt', 40], ['olej', 4]],
    ['Kuracie nakrájaj na prúžky a opeč na oleji.', 'Tortillu natri jogurtom, pridaj kuracie a zeleninu.', 'Zroluj a prekroj.']],
  ['chili', 'Chili con carne s ryžou', '🌶️', 'lunch', 35, 1, [['hovadzie', 150], ['fazula', 120], ['rajciny', 150], ['cibula', 40], ['ryza', 70], ['olej', 5]],
    ['Na oleji opeč cibuľu a mleté mäso do zhnednutia.', 'Pridaj paradajky, fazuľu a korenie, duš 20 minút.', 'Podávaj s uvarenou ryžou.']],
  ['kuracie-sladke', 'Kuracie so sladkými zemiakmi a paprikou', '🍠', 'lunch', 35, 1, [['kuracie', 160], ['sladke', 200], ['paprika', 80], ['olej', 8]],
    ['Rúru predhrej na 200 °C.', 'Sladké zemiaky a papriku nakrájaj, pokvapkaj olejom a peč 15 minút.', 'Pridaj okorenené kuracie a peč ďalších 15 minút.']],

  ['losos', 'Losos so zemiakmi a brokolicou', '🐟', 'dinner', 25, 1, [['losos', 150], ['zemiaky', 250], ['brokolica', 150], ['olej', 5]],
    ['Zemiaky uvar do mäkka, brokolicu podus v pare.', 'Lososa osoľ a opeč na oleji po 4 minúty z každej strany.', 'Podávaj s citrónom.']],
  ['omeleta', 'Omeleta so zeleninou a syrom', '🍳', 'dinner', 12, 1, [['vajce', 200], ['sampinony', 80], ['paprika', 60], ['syr', 30], ['olej', 5]],
    ['Na oleji opeč šampiňóny a papriku.', 'Zalej rozšľahanými vajcami a posyp strúhaným syrom.', 'Prikry, nechaj 3 minúty prepiecť a prelož napoly.']],
  ['tuniakovy-salat', 'Tuniakový šalát s vajíčkom', '🥗', 'dinner', 12, 1, [['tuniak', 120], ['vajce', 50], ['uhorka', 100], ['rajciny', 100], ['olej', 8], ['chlieb', 40]],
    ['Vajce uvar natvrdo a nakrájaj.', 'Zeleninu nakrájaj, pridaj tuniaka a vajce.', 'Zalej olejom, dochuť citrónom a podávaj s chlebom.']],
  ['kuracie-zemiaky', 'Kuracie s pečenými zemiakmi', '🍗', 'dinner', 40, 1, [['kuracie', 170], ['zemiaky', 250], ['paprika', 80], ['olej', 8]],
    ['Rúru predhrej na 200 °C.', 'Zemiaky nakrájané na mesiačiky premiešaj s olejom a korením, peč 15 minút.', 'Pridaj kuracie a papriku, peč ďalších 20 minút.']],
  ['cottage-chlieb', 'Cottage cheese chlieb so zeleninou', '🥪', 'dinner', 5, 1, [['chlieb', 100], ['cottage', 150], ['uhorka', 80], ['rajciny', 80]],
    ['Chlieb natri cottage cheese.', 'Navrch daj plátky uhorky a paradajky, dochuť soľou a korením.']],

  ['puding', 'Proteínový tvarohový puding', '🍫', 'snack', 5, 1, [['tvaroh', 200], ['proteinp', 25], ['kakao', 8], ['mlieko', 50]],
    ['Všetko rozmixuj alebo rozmiešaj do hladkého krému.', 'Pred jedením nechaj 10 minút v chladničke.']],
  ['jogurt-orechy', 'Grécky jogurt s orechmi a medom', '🍯', 'snack', 2, 1, [['jogurt', 200], ['orechy', 20], ['med', 10]],
    ['Jogurt daj do misky, posyp nasekanými orechmi a zalej medom.']],
  ['banan-arasidy', 'Banán s arašidovým maslom', '🍌', 'snack', 2, 1, [['banan', 120], ['arasidy', 20]],
    ['Banán nakrájaj na kolieska a natri na ne arašidové maslo.']],
  ['shake', 'Proteínový shake s banánom', '🥤', 'snack', 3, 1, [['mlieko', 250], ['proteinp', 30], ['banan', 100], ['vlocky', 20]],
    ['Všetko rozmixuj dohladka a hneď vypi.']],
];

export const CATS = [['breakfast', 'Raňajky'], ['lunch', 'Obed'], ['dinner', 'Večera'], ['snack', 'Desiata']];

export const RECIPES = R.map(([id, name, icon, cat, min, servings, items, steps]) => {
  const ing = items.map(([k, g]) => { const [n, kcal, protein, carbs, fat] = I[k]; return { name: n, grams: g, per100: { kcal, protein, carbs, fat } }; });
  const t = ing.reduce((a, i) => { const f = i.grams / 100; a.g += i.grams; a.kcal += i.per100.kcal * f; a.protein += i.per100.protein * f; a.carbs += i.per100.carbs * f; a.fat += i.per100.fat * f; return a; }, { g: 0, kcal: 0, protein: 0, carbs: 0, fat: 0 });
  const s = servings || 1;
  return { id, name, icon, cat, min, servings: s, ing, steps, grams: t.g, per: { kcal: Math.round(t.kcal / s), protein: Math.round(t.protein / s), carbs: Math.round(t.carbs / s), fat: Math.round(t.fat / s) } };
});
