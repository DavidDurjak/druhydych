// Fotka pri každom jedle. Balené produkty majú fotku z Open Food Facts (ukladá sa do foods.img),
// ostatné dostanú peknú ikonku podľa názvu, takže riadok nikdy nie je prázdny.
const ascii = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// poradie je dôležité: špecifickejšie pravidlá idú prvé
const RULES = [
  [/protein|whey|srvatk|kreatin|creatine|bcaa|gainer|pre-?workout|izolat|kazein|casein|aminokys/, '💪'],
  [/vitamin|vitamín|omega|magnez|zinok|zinc|kolagen|collagen|multivit|probiot|doplnok|tablet|kapsul/, '💊'],
  [/pivo|beer|lager|radler|ipa\b/, '🍺'], [/vino|wine|prosecco|sekt|champagne/, '🍷'], [/vodka|whisk|rum\b|gin\b|likér|liker|tequila|borovicka|slivovic|pálenk|palenk|koňak|konak|brandy/, '🥃'],
  [/energy|energet|monster|red ?bull|rockstar|redbull/, '⚡'], [/cola|pepsi|fanta|sprite|limonad|sirup|ice ?tea|kofola|tonic|malinovk/, '🥤'],
  [/kava|káva|coffee|espresso|cappuccino|latte|americano/, '☕'], [/caj\b|čaj|tea\b/, '🍵'], [/dzus|džús|juice|smoothie|nektar|nektár/, '🧃'], [/voda|water|mineralk|perliv|magnesia/, '💧'],
  [/mlieko|milk|kefir|kefír|acidko|maslienk|smotana|cream/, '🥛'], [/jogurt|yogurt|skyr|tvaroh|cottage|pudding|puding/, '🥣'], [/syr\b|syry|cheese|mozzarella|eidam|gouda|parmez|camembert|feta|bryndz|niva|cheddar|halloumi|ricotta/, '🧀'], [/maslo\b|butter|margarin/, '🧈'],
  [/vajce|vajcia|vajic|egg|omelet|praženic|prazenic/, '🥚'],
  [/kura|kuracie|kurac|chicken|hydina|morka|morčac|morcac|turkey|kacic|kačic/, '🍗'], [/hovadz|hovädz|bravcov|steak|beef|pork|mleté|mlete|sekan|rezen|rezeň|klobas|parok|párok|salam|saláma|sunka|šunka|slanin|bacon|ham\b|mäso|maso|kebab|burger/, '🥩'],
  [/losos|salmon|tuniak|tuna|ryba|ryby|fish|treska|pstruh|sardin|makrel|krevet|shrimp|kreveta|morsk/, '🐟'],
  [/pizza/, '🍕'], [/hranolk|hranolč|fries|chips|chipsy|crisps|popcorn|slane|tyčink|tycink|snack/, '🍟'], [/hamburger|cheeseburger|hot ?dog|sendvic|sendvič|sandwich|toast|wrap|tortill|kebab/, '🥪'],
  [/cestovin|těstovin|testovin|pasta|spaghet|špaget|penne|fusilli|lasagn|nudl|noodle|rezanc/, '🍝'], [/ryza|ryža|rice|risotto|sushi/, '🍚'], [/polievk|soup|vyvar|vývar/, '🍲'], [/salat|šalát|salad/, '🥗'],
  [/chlieb|chleb|pecivo|rozok|rožok|bageta|žemľ|zemle|croissant|toastov|knackebrot|knäcke|bread|pita|tost/, '🍞'], [/ovsen|vlocky|vločky|musli|müsli|granola|cereal|corn ?flakes|kaša|kasa|porridge|špalda|spalda/, '🥣'],
  [/cokolad|čokolád|chocolate|kakao|nutella|bonbon|cukrik|cukrík|gumov|haribo|lizat|žuvačk|zuvack|marcipan/, '🍫'], [/zmrzlin|ice ?cream|nanuk|sorbet|zmrzl/, '🍨'], [/kolac|koláč|torta|dort|cake|donut|muffin|brownie|cookie|sušienk|susienk|keks|oblatk|oplatk|palacink|palacinky|buchta|zakusk|croissant|vafl|waffle|pernik|perník/, '🍰'],
  [/med\b|honey|džem|dzem|jam\b|marmelad|sirup javor|maple/, '🍯'], [/orech|orieš|oriesk|mandl|almond|arašid|arasid|peanut|lieskov|kesu|cashew|pistac|pistác|semien|semiačk|chia|ľan|lan\b|slnečnic|slnecnic|tahini|burák|burak/, '🥜'],
  [/banan|banán/, '🍌'], [/jablk|apple/, '🍎'], [/pomaranc|pomaranč|mandarin|mandarín|citrus|orange|citrón|citron|lemon|grep|grapefruit/, '🍊'], [/jahod|strawberr/, '🍓'], [/hroznov|hrozno|grape|hrozienk/, '🍇'], [/melon|dyna|dyňa|water ?melon|lubenic|ľubenic/, '🍉'], [/hrusk|hruška|pear/, '🍐'], [/broskyn|marhuľ|marhul|peach|slivk|slivky|plum|cherry|cresn|čereš|ceres/, '🍑'], [/ananas|ananás|pineapple|mango|kiwi|avokad|avocado|papaya/, '🥭'], [/ovocie|fruit|bobul|berry|boruvk|čučoried|malin|ríbez|ribez/, '🫐'],
  [/mrkv|carrot/, '🥕'], [/paradajk|rajc|tomato|kečup|kecup|ketchup/, '🍅'], [/zemiak|potato|kaša zemiak|hranolky/, '🥔'], [/brokolic|brokolic|broccoli|karfiol|kapust|kapusta|cabbage|špenát|spenat|spinach|listov/, '🥦'], [/uhork|cucumber|cuketa|cuketa|zucchini|paprik|pepper|baklazan|baklažán/, '🥒'], [/cibul|onion|cesnak|garlic|pór|por\b/, '🧅'], [/kukuric|kukuričn|corn\b|hrach|hrášok|fazul|šošovic|sosovic|cizrn|bean|lentil|chickpea|tofu|tempeh|sója|soja/, '🌽'], [/zelenin|vegetable|huby|hríb|hrib|šampiň|sampin|mushroom/, '🥬'],
  [/olej|oil|ocot|vinegar|omacka|omáčka|sauce|dressing|majonez|majonéz|horčic|horcic|mustard|pesto|bechamel/, '🫒'], [/kolagen|sol\b|soľ|korenie|spice|bylink|herb/, '🧂'],
];

export function foodEmoji(name) {
  const n = ascii(name);
  for (const [re, e] of RULES) if (re.test(n)) return e;
  return '🍽️';
}

const CSS = `
.ft{position:relative;flex:0 0 auto;width:52px;height:52px;border-radius:14px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--bg-2);border:1px solid var(--line)}
.ft i{font-style:normal;font-size:26px;line-height:1}
.ft.ph{background:#fff;border-color:transparent}
.ft.ph i{display:none}
.ft img{width:100%;height:100%;object-fit:contain;padding:3px;box-sizing:border-box;display:block}
.res.hasft{gap:12px;justify-content:flex-start}
.res.hasft .n{flex:1;min-width:0}
.res.hasft .k{margin-left:auto}
.ft.sm{width:40px;height:40px;border-radius:11px}.ft.sm i{font-size:21px}
`;
if (!document.getElementById('ft-css')) { const el = document.createElement('style'); el.id = 'ft-css'; el.textContent = CSS; document.head.appendChild(el); }

// jedna dlaždica s fotkou alebo ikonkou; ak sa fotka nenačíta, ostane ikonka
export function thumb(f, cls = '') {
  const img = f?.img || null;
  return `<span class="ft ${img ? 'ph' : ''} ${cls}" data-fid="${f?.id || ''}">${img ? `<img src="${esc(img)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.parentNode.classList.remove('ph');this.remove()">` : ''}<i>${foodEmoji(f?.name)}</i></span>`;
}

// doplní fotky do už vykreslených riadkov (napr. Nedávno: záznamy z denníka nemajú fotku, ale majú food_id)
export function fillThumbs(root, map) {
  root.querySelectorAll('.ft[data-fid]').forEach(el => {
    const u = map.get(Number(el.dataset.fid));
    if (!u || el.classList.contains('ph')) return;
    const im = new Image();
    im.alt = ''; im.loading = 'lazy'; im.decoding = 'async'; im.referrerPolicy = 'no-referrer'; im.src = u;
    im.onload = () => { el.classList.add('ph'); el.prepend(im); };
  });
}
