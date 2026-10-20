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
.ft.ld i{visibility:hidden}
.ft.ld{background:linear-gradient(90deg,var(--bg-2),var(--card-2),var(--bg-2));background-size:200% 100%;animation:ftS 1.2s linear infinite}
@keyframes ftS{from{background-position:200% 0}to{background-position:-200% 0}}
@media (prefers-reduced-motion:reduce){.ft.ld{animation:none}}
.ft:not(.ph) img{opacity:0}
.ft img{width:100%;height:100%;object-fit:contain;padding:3px;box-sizing:border-box;display:block}
.res.hasft{gap:12px;justify-content:flex-start}
.res.hasft .n{flex:1;min-width:0}
.res.hasft .k{margin-left:auto}
.fi.ph{width:42px!important;height:42px!important;background:#fff!important;overflow:hidden}.fi.ph img{width:100%;height:100%;object-fit:contain;padding:3px;box-sizing:border-box;display:block}
.ft.sm{width:40px;height:40px;border-radius:11px}.ft.sm i{font-size:21px}
.screen.td .wk-r .rg.ov{filter:drop-shadow(0 0 4px rgba(255,92,122,.6))}
html[data-theme=light] .screen.td .wk-r .rg.ov .rg-fill{stroke:#E5446A}
html[data-theme=light] .screen.td .wk-r .rg.ov{filter:none}
`;
if (!document.getElementById('ft-css')) { const el = document.createElement('style'); el.id = 'ft-css'; el.textContent = CSS; document.head.appendChild(el); }

// jedna dlaždica s fotkou alebo ikonkou; ak sa fotka nenačíta, ostane ikonka
export function thumb(f, cls = '') {
  const img = f?.img || hits().get(f?.name) || null;
  // kym sa fotka nacita, je to neutralna dlazdica (nie biela, nie emoji); ikonka az ked je iste, ze fotka neexistuje
  const wait = !!img || (f?.name && !miss.has(f.name));
  return `<span class="ft ${wait ? 'ld' : ''} ${cls}" data-fid="${f?.id || ''}" data-name="${esc(f?.name)}">${img ? `<img src="${esc(img)}" alt="" decoding="async" referrerpolicy="no-referrer" onload="var p=this.parentNode;p.classList.remove('ld');p.classList.add('ph')" onerror="this.parentNode.classList.remove('ph','ld');this.remove()">` : ''}<i>${foodEmoji(f?.name)}</i></span>`;
}

// obrázok mimo stránky sa nesmie načítavať s loading=lazy, inak sa nikdy nenatiahne
function attach(el, u) {
  if (!u || el.classList.contains('ph')) return;
  const im = new Image();
  im.alt = ''; im.decoding = 'async'; im.referrerPolicy = 'no-referrer'; im.src = u;
  im.onload = () => { el.classList.remove('ld'); if (!el.classList.contains('ph')) { el.classList.add('ph'); el.prepend(im); } };
  im.onerror = () => el.classList.remove('ld');
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
const MK = 'fw_imgm1';
const miss = new Set();
try { JSON.parse(localStorage.getItem(MK) || '[]').forEach(n => miss.add(n)); } catch (_) { }
const failed = new Set();
const saveMiss = () => { try { localStorage.setItem(MK, JSON.stringify([...miss].filter(n => !failed.has(n)).slice(-1500))); } catch (_) { } };
const warm = u => { try { const i = new Image(); i.decoding = 'async'; i.referrerPolicy = 'no-referrer'; i.src = u; } catch (_) { } };
try { [...hits().values()].filter(Boolean).slice(-80).forEach(warm); } catch (_) { }
export async function imgByNames(names) {
  const m = hits();
  const todo = [...new Set(names.filter(n => n && !m.has(n) && !miss.has(n)))];
  if (todo.length) {
    await db.ready;
    for (let i = 0; i < todo.length; i += 40) {
      const chunk = todo.slice(i, i + 40);
      try {
        const { data } = await db.sb.rpc('img_for_names', { names: chunk });
        (data || []).forEach(r => { if (r.img) { m.set(r.n, r.img); warm(r.img); } else miss.add(r.n); });
      } catch (_) { chunk.forEach(n => { miss.add(n); failed.add(n); }); }
    }
    saveHits(); saveMiss();
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
  els.forEach(el => { const u = m.get(el.dataset.name); if (u) attach(el, u); else el.classList.remove('ld'); });
  fis.forEach(el => attachFi(el, m.get(el.dataset.name)));
}
setInterval(() => document.querySelectorAll('.ft.ld').forEach(e => { if (!e.dataset.t) e.dataset.t = String(Date.now()); else if (Date.now() - Number(e.dataset.t) > 3000) e.classList.remove('ld'); }), 1000);
let tm = null;
// riadky jedal v Dnes: fotka z pamate sa vlozi hned (v tom istom okamihu ako sa riadok vykresli), aby ikonka neprebliknula
function syncFill() {
  const m = hits();
  document.querySelectorAll('.ml-list .fi:not(.ph)').forEach(el => {
    const b = el.parentNode.querySelector('.fn b'); if (!b) return;
    const u = m.get(b.textContent); if (!u) return;
    const im = new Image(); im.alt = ''; im.referrerPolicy = 'no-referrer'; im.src = u;
    el.classList.add('ph'); el.textContent = ''; el.appendChild(im);
  });
}
// po kliknutí na krížik riadok hneď zmizne, nečaká sa na prekreslenie
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('.ml-list .del'); const li = b && b.closest('li');
  if (li) {
    li.style.pointerEvents = 'none'; li.style.overflow = 'hidden'; li.style.boxSizing = 'border-box'; li.style.height = li.offsetHeight + 'px';
    void li.offsetHeight;
    li.style.transition = 'height .16s ease, opacity .12s ease, padding .16s ease, border-width .16s ease';
    li.style.height = '0'; li.style.opacity = '0'; li.style.paddingTop = '0'; li.style.paddingBottom = '0'; li.style.borderWidth = '0';
  }
}, true);
new MutationObserver(() => { syncFill(); clearTimeout(tm); tm = setTimeout(() => hydrate(document).catch(() => { }), 120); }).observe(document.documentElement, { childList: true, subtree: true });
