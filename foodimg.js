import * as db from './data.js';
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
.fi.ph{width:42px!important;height:42px!important;background:#fff!important;overflow:hidden}.fi.ph img{width:100%;height:100%;object-fit:contain;padding:3px;box-sizing:border-box;display:block}
.ft.sm{width:40px;height:40px;border-radius:11px}.ft.sm i{font-size:21px}
`;
if (!document.getElementById('ft-css')) { const el = document.createElement('style'); el.id = 'ft-css'; el.textContent = CSS; document.head.appendChild(el); }

// jedna dlaždica s fotkou alebo ikonkou; ak sa fotka nenačíta, ostane ikonka
export function thumb(f, cls = '') {
  const img = f?.img || null;
  return `<span class="ft ${img ? 'ph' : ''} ${cls}" data-fid="${f?.id || ''}" data-name="${esc(f?.name)}">${img ? `<img src="${esc(img)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.parentNode.classList.remove('ph');this.remove()">` : ''}<i>${foodEmoji(f?.name)}</i></span>`;
}

// obrázok mimo stránky sa nesmie načítavať s loading=lazy, inak sa nikdy nenatiahne
function attach(el, u) {
  if (!u || el.classList.contains('ph')) return;
  const im = new Image();
  im.alt = ''; im.decoding = 'async'; im.referrerPolicy = 'no-referrer'; im.src = u;
  im.onload = () => { if (!el.classList.contains('ph')) { el.classList.add('ph'); el.prepend(im); } };
}

// doplní fotky do už vykreslených riadkov (záznamy z denníka nemajú vždy food_id)
export function fillThumbs(root, map) {
  root.querySelectorAll('.ft[data-fid]').forEach(el => attach(el, map.get(Number(el.dataset.fid))));
}

function attachFi(el, u) {
  if (!u || el.classList.contains('ph')) return;
  const im = new Image();
  im.alt = ''; im.decoding = 'async'; im.referrerPolicy = 'no-referrer'; im.src = u;
  im.onload = () => { el.classList.add('ph'); el.textContent = ''; el.appendChild(im); };
}

// fotka podľa názvu: záznamy z denníka (písané textom, AI) často nemajú food_id, tak ich spárujeme s databázou podľa názvu
const KEY = 'fw_imgn1';
let memo = null;
const hits = () => {
  if (memo) return memo;
  memo = new Map();
  try { Object.entries(JSON.parse(localStorage.getItem(KEY) || '{}')).forEach(([k, v]) => memo.set(k, v)); } catch (_) { }
  return memo;
};
const saveHits = () => { try { localStorage.setItem(KEY, JSON.stringify(Object.fromEntries([...hits()].filter(([, v]) => v).slice(-1500)))); } catch (_) { } };
const miss = new Set();
export async function imgByNames(names) {
  const m = hits();
  const todo = [...new Set(names.filter(n => n && !m.has(n) && !miss.has(n)))];
  if (todo.length) {
    await db.ready;
    for (let i = 0; i < todo.length; i += 40) {
      const chunk = todo.slice(i, i + 40);
      try {
        const { data } = await db.sb.rpc('img_for_names', { names: chunk });
        (data || []).forEach(r => { if (r.img) m.set(r.n, r.img); else miss.add(r.n); });
      } catch (_) { chunk.forEach(n => miss.add(n)); }
    }
    saveHits();
  }
  return m;
}
export async function hydrate(root = document) {
  const els = [...root.querySelectorAll('.ft[data-name]:not(.ph)')].filter(e => e.dataset.name && e.dataset.h !== '1');
  const fis = [...root.querySelectorAll('.ml-list .fi:not(.ph)')].filter(e => e.dataset.h !== '1' && e.parentNode.querySelector('.fn b'));
  if (!els.length && !fis.length) return;
  els.forEach(e => { e.dataset.h = '1'; });
  fis.forEach(e => { e.dataset.h = '1'; e.dataset.name = e.parentNode.querySelector('.fn b').textContent; });
  const m = await imgByNames([...els, ...fis].map(e => e.dataset.name));
  els.forEach(el => attach(el, m.get(el.dataset.name)));
  fis.forEach(el => attachFi(el, m.get(el.dataset.name)));
}
let tm = null;
new MutationObserver(() => { clearTimeout(tm); tm = setTimeout(() => hydrate(document).catch(() => { }), 120); }).observe(document.documentElement, { childList: true, subtree: true });
