// Diéty a rozpoznávanie surovín: čistá logika bez závislostí (používa ju dxcore, recepty, jedálničky aj onboarding).
// Z názvu suroviny alebo jedla sa odvodia značky (mäso, ryba, mliečne, vajcia, lepok, orechy...) a z nich sa podľa zvolených diét
// vyhodnotí, či je jedlo v poriadku. Je to odhad z názvu a zloženia, nie laboratórny rozbor, preto pri balených potravinách
// a pri alergiách appka vždy pripomína kontrolu obalu.

export const DIETS = {
  vegetarian: { icon: '🥕', title: 'Vegetarián', sub: 'Bez mäsa a rýb. Vajcia a mliečne výrobky ostávajú.', forbid: ['meat', 'fish', 'shellfish', 'gelatin'] },
  vegan: { icon: '🌱', title: 'Vegán', sub: 'Bez všetkého živočíšneho: mäso, ryby, mlieko, vajcia, med.', forbid: ['meat', 'fish', 'shellfish', 'gelatin', 'dairy', 'egg', 'honey'] },
  pescatarian: { icon: '🐟', title: 'Pescetarián', sub: 'Bez mäsa. Ryby a morské plody ostávajú.', forbid: ['meat', 'gelatin'] },
  nopork: { icon: '🐖', title: 'Bez bravčového', sub: 'Bravčové mäso, slanina, šunka a údeniny sa označia.', forbid: ['pork'], warn: ['gelatin'] },
  nobeef: { icon: '🐄', title: 'Bez hovädzieho', sub: 'Hovädzie a teľacie mäso sa označí.', forbid: ['beef'] },
  halal: { icon: '☪️', title: 'Halal', sub: 'Bez bravčového a alkoholu. Pôvod mäsa si over u predajcu.', forbid: ['pork', 'alcohol'], warn: ['gelatin'] },
  kosher: { icon: '✡️', title: 'Kosher', sub: 'Bez bravčového a morských plodov, mäso sa nemieša s mliečnym.', forbid: ['pork', 'shellfish'], mix: true, warn: ['gelatin'] },
};
export const DIET_KEYS = Object.keys(DIETS);

const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// pravidlá: [značky, regulárny výraz nad textom bez diakritiky, výnimky]
// poradie nie je dôležité, každé pravidlo sa vyhodnotí samostatne
const RULES = [
  // ---- mäso ----
  [['meat', 'pork'], /bravc|\bsunk|slanin|bocik|klobas|parky|parok|salam|prsut|chorizo|oskvark|jaternic|bratwurst|udene maso|mortadel|spek\b|krkovick|bravcov|lalok|spekac|slaninka|jagdwurst|sobrasada|morcilla|longaniza|butifarra|kaszanka|cervelat|falukorv|wurst\b|lancmit|pastet|zmiesane maso|mlete maso zmies|hot ?dog|debrecin|kabanos|tlacenk|jelito|slanink|pancetta|guanciale|prosciutto|jamon|bacon|sausage|\bham\b/, /morcac|kurac|hydin|moracia|moraci|kuraci/],
  [['meat', 'beef'], /hovadz|telac|bresaola|byci|zmiesane maso|mlete maso zmies|kajmak.*maso|\bbeef\b|hovadzi loj|loj\b/],
  [['meat', 'poultry'], /kurac|kura\b|kure\b|cele kura|moracia|morcac|kacac|husac|kapun|hydin|krutie|krutia|\bkrut|\bmork[ay]\b|\bhus\b|chicken|turkey|duck/],
  [['meat', 'game'], /diviac|srnc|jelen|zajac|kralic|bazant|divina|prepelic|koroptv/],
  [['meat'], /jahnac|baran|kozacie|maso|mäso|pecen\b|pecen |kuracia pecen|dr[zž]k|vyvar.*(hovadz|kurac|bravc|masov)|(hovadz|kurac|bravc|masov).*vyvar|kosti|loj\b|masť|mast\b|bravcova mast|pecienka|steak|krvav/, /rastlinn|sojov|vegansk|bez masa|ryzov|tofu|hubov|ovocn/],
  // ---- ryby a morské plody ----
  [['fish'], /losos|tuniak|tunak|treska|pstruh|makrel|makrela|sardink|sardel|sled\b|slede|kapor|\bancovic|anchov|\bryb|rybi|rybac|surimi|kaviar|dashi|bonito|stuka|zubac|tilapi|mintaj|panga|sumec|uhor morsk|halibut|platesa|sebast|kambala|lipan|pangas|fish|tuna|salmon|\buhor(?!k)|\buden\w* uhor|jeseter|\bokun|\braja\b|ostriez|hadok|lutefisk|\bcod\b|\bikra|\bikry|\bikre/, /rybez|ryby bez|rybizl|rybiz|ryba bez|ryzov|rybnik/],
  [['shellfish', 'crustaceans'], /krevet|\bkrab|\bhomar|langust|\brak\b|\braky\b|\bracie\b|\bracich\b|\brakov|shrimp|prawn|lobster|\bcrab/],
  [['shellfish', 'molluscs'], /\bmusl[eao]\b|ustric|kalamar|chobotnic|sepi[ae]|hrebenatk|slimak|makkys|oyster|squid|octopus|scallop|mussel/, /hliv|huba|hriby/],
  // ---- mliečne ----
  [['dairy'], /mlie[ck]|mlieko|smotan|\bmaslo|jogurt|kefir|tvaroh|\bsyr\b|\bsyry\b|eidam|ementa|gouda|parmez|mozzarel|\bfeta\b|cheddar|mascarpone|ricott|cottage|skyr|halloumi|gorgonzol|hermelin|ostiepok|bryndz|\bghi\b|\bghee\b|ghi |paneer|zakys|srvatk|kazein|zmrzlin|biela cokolad|mliecna cokolad|kajmak|raclette|gruy|pecorino|kozi syr|besamel|bechamel|syr |cream\b|butter|yogurt|cheese|whey|syrovy|pizza syr|trappist|nivea|encian|romadur|camembert|brie\b|emmental|provolone|\bgrana\b|grana padano|taleggio|burrata|quark|kondenzovane|parenic|zincic|korbacik|cappuccino|\blatte\b|macchiato|flat white|syrov[aeyuo]|pizza|lasagn|tvaruz|stilton|pesto|trahana/, /kokosov|mandlov|sojov|ovsen[ey] mlie|ryzov[ey] mlie|rastlinn|arasidov|kakaov|lieskov|sezamov|kesu maslo|\bkokos/],
  // ---- vajcia ----
  [['egg'], /turron|vajc|vajec|vajce|zltk|bielok|majonez|piskot|vaječn|vacec|tiramisu|egg|mayonnaise|alioli|aioli|marshmallow|merinky|pusinky|snehov/, /vaječný olej/],
  // ---- med, želatína ----
  [['honey'], /turron|(^|\s)med($|\s|\()|\bmedu\b|medom|medovy sirup|honey/, /medovnik|medovy sirup z agav/],
  [['gelatin'], /zelatin|marshmallow|gumov|gummy|zelé |zele cukr|zelatina|ziv[ae]lna/],
  // ---- alkohol ----
  [['alcohol'], /\bvino\b|biele vino|cervene vino|\bpivo\b|\bpiva\b|\brum\b|brandy|whisk|vodka|likér|liker\b|konak|palenk|mirin|\bsake\b|prosecco|sampansk|sherry|portske|amaretto|marsala|\bgin\b|bourbon|kirsch|calvados|tequila|slivovic|borovick|becherovk|jagermeister|rumova|vinny ocot.*alko/, /ocot|bezalko|nealko|bez alkoholu/],
  // ---- alergény a lepok ----
  [['gluten'], /psenic|\bmuka\b|razn|zitn|jacmen|spald|lepok|\bzemla\b|zemle|chlieb|rozok|rozky|pecivo|cestovin|\bcesto\b|\bcesta\b|filo\b|struhank|krupic|bulgur|kuskus|couscous|seitan|\bpita\b|naan\b|croissant|gnocchi|praclik|susienk|vajecn[ey] rezance|\budon|\bsoba\b|ramen|somen|granola|sojova omacka|knedl|palacink|ovsen|vlocky|\bovos|\boat|\bpivo\b|pizza|\bsladov|\bslad\b|piskot|bageta|\btoast|musli|buchty|lokse|halusky|spagety|makaron|penne|lasagne|tarhon|baklava|panko|atta\b|graham|maces|\bfrik\b|\bkama\b|wonton|\botruby|lamana psenica|perlovy jacmen|\bkrupy\b|krupy\b|\bbagel|freekeh|trahana|oblatk|plat\w+ na jarn|\broux\b|roux zmes|japonska kari zmes/,
    /bezlepk|bez lepku|ryzov|kukuric|cicer|pohank|tapiok|mandlov|kokosov|manioko|prosov|cirok|tefov|gastanov|\bjamu\b|mungo|sojov[ae] muk|bataty|hrachov|lepkav|lupin|amarant|quinoa|fazul|zemiakov[ae] muk|bananov|bajra|jowar|\bragi\b|farinha|sklenen|sladk\w* zemiak|prosa|jahly|jahel/],

  // ---- alkohol: značky a destiláty ----
  [['alcohol'], /\bkozel\b|pilsner|zlaty bazant|corgon|smadny mnich|staropramen|budvar|heineken|krusovice|radegast|gambrinus|urquell|absint|tuzemsk|bozkov|hruskovic|jablkovic|fernet|metaxa|ouzo|rakija|grappa|cognac|aperol|campari|baileys|\bmartini\b|spritz|\bcidr|\bcider|mojito|cuba libre|mimosa|vermut|medovin|lager|\bale\b|stout/, /bezalko|nealko|bez alkoholu|0[,.]0/],
  [['honey'], /medovin/],
  // ---- hotové jedlá: pravdepodobné zložky (znak ? = odhad z bežnej receptúry, nie istota) ----
  [['meat'], /kebab|gyros|doner|shawarma|hamburger|\bburger|hot ?dog|con carne|bolonsk|\bragu\b|sekana|kapustnic|drzkov|\bspek\b|kuracie|kurac/, /vegan|vegetarian|falafel|bez masa|sojov|rastlinn|veggie|zeleninov|plant|hrachov/],
  [['pork?'], /rezen|gulas|segedin|paprikas|kapustnic|sekana|vyprazan\w* mas|cordon|gordon|karbonatek|ragu\b|bolonsk|lasagn|\bhot ?dog|parok/, /kurac|morcac|syr|karfiol|hlivov|sojov|vegansk|zeleninov|hovadz|telac|rybi|ryb/],
  [['beef?'], /hamburger|\bburger|gulas|bolonsk|lasagn|ragu\b|kebab|gyros|doner|con carne/, /kurac|zinger|chicken|vegan|veggie|sojov|rastlinn|zeleninov|pork|bravc/],
  [['dairy?'], /horuca cokolad|\bkakao\b|\bpuding|pudding|palacink|lievanc|langos|lokse|vianocka|mazanec|siska|donut|strudl|buchta|buchty|torta|\bkolac|cookie|croissant|vafl|waffle|rizoto|risotto|cokolad|zmrzlin|dezert|krem\b|jogurtov|mlecn|syrov|pizza|lasagn|bechamel|gratin|zapekan|musli tyc|proteinov\w* (tycin|puding|napoj)|whey/, /vegan|rastlinn|sojov|kokosov|mandlov|ovsen|bez laktoz|tmava|horka|85 ?%|70 ?%|ryzov|chia/],
  [['egg?'], /palacink|lievanc|langos|lokse|vianocka|mazanec|siska|donut|strudl|buchta|buchty|torta|\bkolac|cookie|croissant|vafl|waffle|tiestovin|cestovin|vyprazan|trojobal|obalovan|rezen|cordon|nugget|majonez|tatarsk|sendvic|puding/, /vegan|bez vajec|rastlinn|ryzov|bezlepk|bez lepku|chia/],
  [['gluten'], /kaiserk|vianocka|mazanec|siska|donut|strudl|buchta|buchty|gombovce|sulanc|langos|lievanc|palacink|lokse|torta\b|\bkolac|perni[kc]|cookie|keks|waffle|vafl|sendvic|sandwich|hamburger|\bburger|hot ?dog|kebab|\bwrap\b|rezen|nugget|cordon|obalovan|trojobal|nachos|chipsy z psen/, /bezlepk|bez lepku|ryzov|kukuric|vegan.*bez|chia/],
  [['gluten?'], /vyprazan|sushi|polievka s|omacka|rizoto|risotto|puding|musli|tycink|ovocn\w* knedl/, /bezlepk|bez lepku|ryzov|chia/],
  [['peanut'], /arasid|peanut|arasidov/],
  [['nuts'], /pesto|turron|mandl|vlasske|vlask|liesk|kesu|pistaci|pekan|makadam|pinio|orech|orechy|marcipan|nugat|nutella|almond|walnut|hazelnut|cashew|pistachio/, /muskat|kokosov[ey] orech|arasid/],
  [['soy'], /\bsoj|tofu|tempeh|miso|edamame|natto|sojov|soy|sojova|sojove/],
  [['sesame'], /sezam|tahini|hummus|sesame|halva|chalva/],
  [['celery'], /zeler|celery/],
  [['mustard'], /horcic|mustard|dijon/],
  [['lupin'], /lupin/],
];

const COMPILED = RULES.map(([tags, re, ex]) => [tags, re, ex || null]);
const cache = new Map();

// značky pre jeden text (názov suroviny alebo jedla); výsledok je Set
export function tagsOf(text) {
  const key = String(text || '');
  if (cache.has(key)) return cache.get(key);
  const n = norm(key), out = new Set();
  if (n) {
    for (const [tags, re, ex] of COMPILED) {
      if (!re.test(n)) continue;
      if (ex && ex.test(n)) continue;
      tags.forEach(t => out.add(t));
    }
    // upresnenia: hydina nie je bravčové ani hovädzie, ryba nie je mäso
    if (out.has('poultry') || out.has('game')) { /* hydina a zver sú mäso, ale nie bravčové */ }
    if (/morcac|kurac|moraci|hydin/.test(n) && /sunk|parky|salam|klobas/.test(n)) out.delete('pork');
    if (out.has('pork') && /morc|kurac|hydin|kuraci|krutie/.test(n)) out.delete('pork');
    if (out.has('dairy') && /(kokosov|mandlov|sojov|ovsen|ryzov|kesu|rastlinn|vegansk)\w*\s+(mlie|jogurt|smotan|syr|maslo)/.test(n)) out.delete('dairy');
    if (out.has('dairy') && /(arasidov|mandlov|lieskov|kakaov|kokosov|sezamov|rastlinn|sheabutter|shea)\w*\s+maslo/.test(n)) out.delete('dairy');
    if (out.has('dairy') && /^(?:kokosove|kokosova|mandlove|sojove|ovsene|ryzove) /.test(n)) out.delete('dairy');
    if (out.has('dairy') && /\bkokosov/.test(n) && /smotan|mlie/.test(n)) out.delete('dairy');
    if (out.has('dairy') && /sojov|rastlinn/.test(n)) out.delete('dairy');
    if (out.has('egg') && /bez vajec|bezvajec|vegansk/.test(n)) out.delete('egg');
    if (out.has('fish') && /rybez|ryzov|rybnik/.test(n)) out.delete('fish');
    // odhad ('?') platí len vtedy, keď o tej istej veci nie je istota
    for (const t of [...out]) if (t.endsWith('?') && out.has(t.slice(0, -1))) out.delete(t);
    // vedľajšie značky pre alergény
    if (out.has('dairy')) out.add('milk');
    if (out.has('pork') || out.has('beef') || out.has('poultry') || out.has('game')) out.add('meat');
  }
  cache.set(key, out);
  return out;
}

// spojenie značiek z viacerých textov (napr. surovín receptu)
export function tagsOfAll(texts) {
  const out = new Set();
  for (const t of texts) tagsOf(t).forEach(x => out.add(x));
  return out;
}

// značky podľa údajov jedla z databázy a Open Food Facts: názov + zložky + vyhlásené alergény a vegán/vegetarián príznak
export function tagsOfFood(f) {
  const out = new Set(tagsOf([f?.name, f?.kw].filter(Boolean).join(' ')));
  const A = Array.isArray(f?.allergens) ? f.allergens : null;
  if (A) {
    if (A.includes('milk')) { out.add('dairy'); out.add('milk'); }
    if (A.includes('egg')) out.add('egg');
    if (A.includes('fish')) out.add('fish');
    if (A.includes('crustaceans')) { out.add('shellfish'); out.add('crustaceans'); }
    if (A.includes('molluscs')) { out.add('shellfish'); out.add('molluscs'); }
    if (A.includes('gluten')) out.add('gluten');
  }
  // príznak z Open Food Facts má prednosť pred odhadom z názvu
  if (f?.vg === 'vegan') ['meat', 'pork', 'beef', 'poultry', 'game', 'fish', 'shellfish', 'dairy', 'milk', 'egg', 'honey', 'gelatin'].forEach(t => out.delete(t));
  else if (f?.vg === 'vegetarian') ['meat', 'pork', 'beef', 'poultry', 'game', 'fish', 'shellfish', 'gelatin'].forEach(t => out.delete(t));
  else if (f?.vg === 'no') out.add('meat?');
  return out;
}

// vyhodnotenie značiek podľa zvolených diét: [{ diet, level: 'bad'|'warn', why }]
export function judge(tags, diets) {
  const out = [];
  for (const k of diets || []) {
    const d = DIETS[k]; if (!d) continue;
    const hit = d.forbid.filter(t => tags.has(t));
    if (hit.length) { out.push({ diet: k, level: 'bad', why: reason(hit, tags) }); continue; }
    if (d.mix && tags.has('meat') && tags.has('dairy')) { out.push({ diet: k, level: 'bad', why: 'mäso spolu s mliečnym' }); continue; }
    const w = (d.warn || []).filter(t => tags.has(t));
    if (w.length) { out.push({ diet: k, level: 'warn', why: reason(w, tags) }); continue; }
    const p = d.forbid.filter(t => tags.has(t + '?'));
    if (p.length) out.push({ diet: k, level: 'warn', why: 'pravdepodobne ' + reason(p, tags) });
  }
  return out;
}
const WHY = { meat: 'mäso', pork: 'bravčové', beef: 'hovädzie', poultry: 'hydina', fish: 'ryba', shellfish: 'morské plody', dairy: 'mliečne výrobky', egg: 'vajcia', honey: 'med', gelatin: 'želatína', alcohol: 'alkohol' };
function reason(hit, tags) {
  // pri mäse povedz konkrétnejšie, čo to je
  const pick = [];
  for (const t of hit) {
    if (t === 'meat') pick.push(tags.has('pork') ? 'bravčové' : tags.has('beef') ? 'hovädzie' : tags.has('poultry') ? 'hydina' : tags.has('game') ? 'zverina' : 'mäso');
    else pick.push(WHY[t] || t);
  }
  return [...new Set(pick)].join(', ');
}
export const whyName = t => WHY[t] || t;

// recepty: značky a výsledok sa počítajú len raz pre každý recept
const rcache = new WeakMap();
export function recipeTags(r) {
  let t = rcache.get(r);
  if (!t) { t = tagsOfAll([r.name, ...(r.ing || []).map(i => i.name)]); rcache.set(r, t); }
  return t;
}

// celková vhodnosť pre používateľa: diéty + zdravotné režimy, ktoré sa dajú vyhodnotiť zo surovín
// cfg = { diets:[], modes:[], allergens:[] }; vracia { level: 'ok'|'warn'|'bad', items:[{k, level, why}] }
export function fit(tags, cfg) {
  const items = [];
  for (const j of judge(tags, cfg?.diets)) items.push({ k: j.diet, level: j.level, why: j.why });
  const modes = cfg?.modes || [];
  if (modes.includes('celiac')) { if (tags.has('gluten')) items.push({ k: 'celiac', level: 'bad', why: 'lepok' }); else if (tags.has('gluten?')) items.push({ k: 'celiac', level: 'warn', why: 'pravdepodobne lepok' }); }
  if (modes.includes('lactose')) { if (tags.has('dairy')) items.push({ k: 'lactose', level: 'bad', why: 'laktóza' }); else if (tags.has('dairy?')) items.push({ k: 'lactose', level: 'warn', why: 'pravdepodobne laktóza' }); }
  if (modes.includes('allergy')) {
    const hit = (cfg.allergens || []).filter(a => tags.has(a === 'milk' ? 'milk' : a));
    if (hit.length) items.push({ k: 'allergy', level: 'bad', why: hit.join(', ') });
  }
  const level = items.some(i => i.level === 'bad') ? 'bad' : items.length ? 'warn' : 'ok';
  return { level, items };
}
