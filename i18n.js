// Jazyk appky. Appka je napísaná po slovensky a do jazyka používateľa sa prekladá sama, za behu, priamo na obrazovke:
// každý text (aj z funkcií pridaných v budúcnosti) sa pri prvom zobrazení pošle na preklad (funkcia i18n, AI), uloží sa do
// spoločného slovníka (tabuľka i18n) a odvtedy sa všetkým zobrazuje okamžite z pamäte zariadenia. Nič sa nemusí prekladať ručne.
// Predvolene podľa jazyka telefónu (Automaticky), v Profile sa dá zvoliť natrvalo. Čísla sa neprekladajú: 2 300 kcal, 17. októbra
// a podobne sa uložia ako vzor ({0} kcal) a čísla sa vložia späť. Texty v prvkoch s triedou notranslate sa nechajú tak.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const KEY = 'fw_lang';
const LANGS = [['sk', 'Slovenčina'], ['cs', 'Čeština'], ['de', 'Deutsch'], ['hu', 'Magyar'], ['pl', 'Polski'], ['en', 'English'], ['uk', 'Українська'],
  ['es', 'Español'], ['fr', 'Français'], ['it', 'Italiano'], ['ro', 'Română'], ['hr', 'Hrvatski'], ['sl', 'Slovenščina'], ['sr', 'Srpski'], ['bg', 'Български'],
  ['ru', 'Русский'], ['nl', 'Nederlands'], ['pt', 'Português'], ['sv', 'Svenska'], ['da', 'Dansk'], ['no', 'Norsk'], ['fi', 'Suomi'], ['tr', 'Türkçe'],
  ['lt', 'Lietuvių'], ['lv', 'Latviešu'], ['et', 'Eesti'], ['el', 'Ελληνικά'],
  ['ar', 'العربية'], ['he', 'עברית'], ['fa', 'فارسی'], ['hi', 'हिन्दी'], ['bn', 'বাংলা'], ['ur', 'اردو'], ['zh', '中文'], ['ja', '日本語'], ['ko', '한국어'],
  ['vi', 'Tiếng Việt'], ['id', 'Bahasa Indonesia'], ['ms', 'Bahasa Melayu'], ['th', 'ไทย'], ['tl', 'Filipino'], ['sw', 'Kiswahili'], ['ca', 'Català'],
  ['is', 'Íslenska'], ['bs', 'Bosanski'], ['mk', 'Македонски'], ['sq', 'Shqip'],
  // ďalšie jazyky, aby appku mal vo svojom jazyku skoro každý na svete
  ['zh-TW', '繁體中文'], ['pt-BR', 'Português (Brasil)'], ['ta', 'தமிழ்'], ['te', 'తెలుగు'], ['mr', 'मराठी'], ['gu', 'ગુજરાતી'], ['kn', 'ಕನ್ನಡ'],
  ['ml', 'മലയാളം'], ['pa', 'ਪੰਜਾਬੀ'], ['or', 'ଓଡ଼ିଆ'], ['as', 'অসমীয়া'], ['ne', 'नेपाली'], ['si', 'සිංහල'], ['my', 'မြန်မာ'], ['km', 'ខ្មែរ'], ['lo', 'ລາວ'],
  ['mn', 'Монгол'], ['ka', 'ქართული'], ['hy', 'Հայերեն'], ['az', 'Azərbaycanca'], ['kk', 'Қазақша'], ['uz', 'Oʻzbekcha'], ['ky', 'Кыргызча'],
  ['tg', 'Тоҷикӣ'], ['tk', 'Türkmençe'], ['be', 'Беларуская'], ['ps', 'پښتو'], ['sd', 'سنڌي'], ['ku', 'Kurdî'], ['am', 'አማርኛ'], ['ha', 'Hausa'],
  ['yo', 'Yorùbá'], ['ig', 'Igbo'], ['zu', 'isiZulu'], ['xh', 'isiXhosa'], ['af', 'Afrikaans'], ['so', 'Soomaali'], ['rw', 'Kinyarwanda'],
  ['mg', 'Malagasy'], ['jv', 'Basa Jawa'], ['su', 'Basa Sunda'], ['ceb', 'Cebuano'], ['eu', 'Euskara'], ['gl', 'Galego'], ['cy', 'Cymraeg'],
  ['ga', 'Gaeilge'], ['mt', 'Malti'], ['lb', 'Lëtzebuergesch']];
const RTL = new Set(['ar', 'he', 'fa', 'ur', 'ps', 'sd']);
// kódy, ktoré telefóny posielajú inak ako my (nb/nn = nórčina, fil = filipínčina, iw = hebrejčina, in = indonézština)
const ALIAS = { nb: 'no', nn: 'no', fil: 'tl', iw: 'he', in: 'id' };
const OK = new Set(LANGS.map(l => l[0]));
// tradičná čínština (Taiwan, Hongkong, Macao) a brazílska portugalčina majú vlastný slovník; trojpísmenové kódy (ceb) ostávajú celé
const codeOf = l => {
  const s = String(l).toLowerCase().replace('_', '-'), t = s.split('-')[0];
  if (t === 'zh' && /-(tw|hk|mo|hant)/.test(s)) return 'zh-TW';
  if (t === 'pt' && /-br/.test(s)) return 'pt-BR';
  return ALIAS[t] || (OK.has(t) ? t : t.slice(0, 2));
};
const H = document.documentElement;

// doterajší používatelia appku poznajú po slovensky: tým sa jazyk nezmení sám od seba (napr. pri anglickom iPhone), prepnú si ho v Profile
try { if (!localStorage.getItem(KEY) && Object.keys(localStorage).some(k => k.startsWith('fw_prof_') || k === 'fw_snap')) localStorage.setItem(KEY, 'sk'); } catch (_) { /* nič */ }

export function getChoice() { try { return localStorage.getItem(KEY) || 'auto'; } catch (_) { return 'auto'; } }
function phoneLang() {
  for (const l of navigator.languages || [navigator.language || 'sk']) { const c = codeOf(l); if (OK.has(c)) return c; }
  return 'en';
}
export function currentLang() { const c = getChoice(); return c !== 'auto' && OK.has(c) ? c : phoneLang(); }
export function setChoice(c) { try { localStorage.setItem(KEY, c); } catch (_) { } location.reload(); }
// pred prepnutím sa stiahne celý slovník jazyka, aby bola appka po reštarte hneď celá preložená (bez blikania slovenčiny)
async function prefetch(code) {
  if (code === 'sk') return;
  const map = {}; let from = 0, newest = '';
  for (;;) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/i18n?select=src,dst,created_at&lang=eq.${code}&order=created_at.asc`, { headers: { apikey: SUPABASE_ANON_KEY, Range: `${from}-${from + 999}`, 'Range-Unit': 'items' } });
    if (!r.ok) throw new Error('i18n ' + r.status);
    const rows = await r.json();
    for (const x of rows) { map[x.src] = x.dst; if (x.created_at > newest) newest = x.created_at; }
    if (rows.length < 1000) break;
    from += 1000;
  }
  try { localStorage.setItem('fw_i18n_' + code, JSON.stringify(map)); localStorage.setItem('fw_i18n_t_' + code, newest); } catch (_) { /* plné úložisko */ }
}

const LANG = currentLang();
H.lang = LANG;
H.dir = RTL.has(LANG) ? 'rtl' : 'ltr';

// ---------- výber jazyka v Profile (vedľa Vzhľadu): vlastný zoznam ako v top appkách, nie systémový výber ----------
const cap = t => t ? t[0].toLocaleUpperCase() + t.slice(1) : t;
function localName(code) { try { return cap(new Intl.DisplayNames([LANG], { type: 'language' }).of(code)); } catch (_) { return ''; } }
const nativeName = code => (LANGS.find(l => l[0] === code) || [, code])[1];
const LCSS = `
.lg-btn{display:flex;align-items:center;gap:12px;width:100%;margin-top:10px;padding:12px 14px;border-radius:16px;border:1px solid var(--line);background:var(--card-2,rgba(255,255,255,.04));color:var(--text);font:inherit;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent}
.lg-btn:active{transform:scale(.99)}
.lg-btn .lg-g{flex:none;width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--accent)}
.lg-btn b{display:block;font-size:16px;font-weight:700}.lg-btn small{display:block;font-size:12.5px;color:var(--muted);margin-top:2px}
.lg-btn .lg-ch{margin-left:auto;color:var(--muted);flex:none}
.lg-bg{position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.5);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);display:flex;align-items:flex-end;justify-content:center;animation:lgf .18s ease-out}
.lg-sh{width:100%;max-width:560px;height:84vh;max-height:84vh;display:flex;flex-direction:column;background:var(--card);border-radius:28px 28px 0 0;border-top:1px solid var(--line);padding:8px 0 env(safe-area-inset-bottom);animation:lgu .28s cubic-bezier(.2,.9,.2,1)}
.lg-grab{width:38px;height:5px;border-radius:3px;background:var(--line);margin:4px auto 6px}
.lg-hd{display:flex;align-items:center;justify-content:space-between;padding:6px 18px 10px}.lg-hd h3{margin:0;font-size:20px;letter-spacing:-.01em}
.lg-x{width:34px;height:34px;border-radius:50%;border:0;background:var(--card-2,rgba(255,255,255,.06));color:var(--text);font-size:18px;cursor:pointer}
.lg-q{margin:0 18px 8px;display:flex;align-items:center;gap:8px;padding:0 12px;border-radius:14px;background:var(--card-2,rgba(255,255,255,.05));border:1px solid var(--line)}
.lg-q input{flex:1;border:0;background:none;color:var(--text);font:inherit;font-size:16px;padding:11px 0;outline:none}
.lg-ls{overflow:auto;padding:0 10px 14px;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
.lg-sec{font-size:12.5px;font-weight:700;color:var(--muted);padding:14px 10px 6px}
.lg-it{display:flex;align-items:center;gap:12px;width:100%;padding:11px 10px;border:0;border-radius:14px;background:none;color:var(--text);font:inherit;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent}
.lg-it:active{background:var(--card-2,rgba(255,255,255,.05))}
.lg-it b{display:block;font-size:16px;font-weight:650}.lg-it small{display:block;font-size:13px;color:var(--muted);margin-top:1px}
.lg-it .lg-ok{margin-left:auto;flex:none;width:24px;height:24px;border-radius:50%;border:2px solid var(--line);display:grid;place-items:center}
.lg-it.on{background:color-mix(in srgb,var(--accent) 9%,transparent)}.lg-it.on .lg-ok{border-color:var(--accent);background:var(--accent);color:#06261a}
.lg-it .lg-sp{margin-left:auto;width:20px;height:20px;border-radius:50%;border:2.5px solid color-mix(in srgb,var(--accent) 30%,transparent);border-top-color:var(--accent);animation:lgs .7s linear infinite}
.lg-empty{padding:30px 10px;text-align:center;color:var(--muted)}
.lg-note{font-size:12.5px;color:var(--muted);padding:2px 20px 10px;line-height:1.4}
@keyframes lgu{from{transform:translateY(100%)}}@keyframes lgf{from{opacity:0}}@keyframes lgs{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.lg-bg,.lg-sh{animation:none}}`;
const GLOBE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg>';
const CHECK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
function css() { if (document.getElementById('lg-css')) return; const st = document.createElement('style'); st.id = 'lg-css'; st.textContent = LCSS; document.head.appendChild(st); }
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function openPicker() {
  css();
  const cur = getChoice(), ph = phoneLang();
  const phoneSet = [...new Set((navigator.languages || []).map(codeOf).filter(c => OK.has(c)))];
  const sug = [...new Set([...phoneSet, 'sk', 'cs', 'en', 'de'])].slice(0, 5);
  const row = (code, title, sub) => `<button class="lg-it notranslate${code === cur ? ' on' : ''}" data-l="${code}"><span><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span><span class="lg-ok">${code === cur ? CHECK : ''}</span></button>`;
  const item = code => { const n = nativeName(code), l = localName(code); return row(code, n, code === LANG || !l || l.toLowerCase() === n.toLowerCase() ? '' : l); };
  const all = [...LANGS].map(l => l[0]).sort((x, y) => nativeName(x).localeCompare(nativeName(y), LANG));
  const bg = document.createElement('div'); bg.className = 'lg-bg';
  bg.innerHTML = `<div class="lg-sh" role="dialog" aria-modal="true" aria-label="Jazyk aplikácie"><div class="lg-grab"></div>
    <div class="lg-hd"><h3>Jazyk aplikácie</h3><button class="lg-x" aria-label="Zavrieť">✕</button></div>
    <label class="lg-q"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" style="color:var(--muted)"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input type="search" placeholder="Hľadať jazyk" autocomplete="off" enterkeyhint="search"></label>
    <div class="lg-ls"></div><p class="lg-note">Preklad robí AI, zriedka môže byť nepresný.</p></div>`;
  const ls = bg.querySelector('.lg-ls'), q = bg.querySelector('input');
  const draw = () => {
    const f = q.value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const hit = code => !f || [nativeName(code), localName(code), code].some(t => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(f));
    let h = '';
    if (!f) {
      h += row('auto', `${tr('Automaticky') || 'Automaticky'}`, `${tr('Podľa telefónu') || 'Podľa telefónu'}: ${nativeName(ph)}`);
      h += `<div class="lg-sec">${tr('Navrhované') || 'Navrhované'}</div>` + sug.map(item).join('');
      h += `<div class="lg-sec">${tr('Všetky jazyky') || 'Všetky jazyky'}</div>` + all.filter(c => !sug.includes(c)).map(item).join('');
    } else {
      const list = all.filter(hit);
      h = list.length ? list.map(item).join('') : `<div class="lg-empty">${tr('Nič sa nenašlo') || 'Nič sa nenašlo'}</div>`;
    }
    ls.innerHTML = h;
  };
  const close = () => { bg.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  bg.addEventListener('click', async e => {
    if (e.target === bg || e.target.closest('.lg-x')) { close(); return; }
    const it = e.target.closest('[data-l]'); if (!it || bg.dataset.busy) return;
    const code = it.dataset.l;
    if (code === cur) { close(); return; }
    bg.dataset.busy = '1';
    ls.querySelectorAll('.lg-it').forEach(x => x.classList.toggle('on', x === it));
    const ok = it.querySelector('.lg-ok'); if (ok) ok.outerHTML = '<span class="lg-sp" aria-label="Načítavam"></span>';
    const target = code === 'auto' ? ph : code;
    try { await Promise.race([prefetch(target), new Promise(r => setTimeout(r, 8000))]); } catch (_) { /* preklad sa doplní za behu */ }
    setChoice(code);
  });
  q.addEventListener('input', draw);
  document.addEventListener('keydown', onKey);
  draw();
  document.body.appendChild(bg);
}
function profileUi() {
  const theme = document.querySelector('#app #fwTheme');
  if (!theme) return;
  const had = document.querySelector('#fwLang');
  // karta ide vždy hneď pod Vzhľad (Profil si Vzhľad pri prekreslení presúva)
  if (had) { if (had.previousElementSibling !== theme) theme.after(had); return; }
  css();
  const c = getChoice(), code = c === 'auto' ? phoneLang() : c;
  const card = document.createElement('div');
  card.className = 'card'; card.id = 'fwLang'; card.style.marginTop = '14px';
  card.innerHTML = `<b>Jazyk</b>
    <button class="lg-btn" id="fwLangBtn" type="button"><span class="lg-g">${GLOBE}</span><span><b class="notranslate">${esc(nativeName(code))}</b><small>${c === 'auto' ? 'Automaticky podľa telefónu' : 'Zmeniť jazyk aplikácie'}</small></span>
      <svg class="lg-ch" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button>`;
  card.querySelector('#fwLangBtn').onclick = openPicker;
  theme.after(card);
}
const app = document.getElementById('app');
if (app) new (window.__fwNativeMO || MutationObserver)(profileUi).observe(app, { childList: true, subtree: true });

// ---------- slovník ----------
const dict = new Map(), out = new Set();
const LS = 'fw_i18n_' + LANG, LS_T = 'fw_i18n_t_' + LANG;
let lastSync = '';
if (LANG !== 'sk') {
  try { const o = JSON.parse(localStorage.getItem(LS) || '{}'); for (const k in o) { dict.set(k, o[k]); out.add(o[k].trim()); } lastSync = localStorage.getItem(LS_T) || ''; } catch (_) { /* prázdny slovník */ }
}
let saveT = 0;
function save() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(LS, JSON.stringify(Object.fromEntries(dict))); localStorage.setItem(LS_T, lastSync); } catch (_) { /* plné úložisko */ } }, 800); }
function put(k, v) { if (!v) return; dict.set(k, v); out.add(v.trim()); }
// záloha: kým text nemá preklad v jazyku používateľa, ukáže sa v najbližšom preloženom jazyku (nie po slovensky):
// brazílska portugalčina → portugalčina, tradičná čínština → zjednodušená, ostatné → angličtina
const FBL = { 'pt-BR': 'pt', 'zh-TW': 'zh' }[LANG] || 'en';
const FB = LANG !== 'sk' && LANG !== FBL;
const fbDict = new Map(); let fbSync = '';
if (FB) {
  try { const o = JSON.parse(localStorage.getItem('fw_i18n_' + FBL) || '{}'); for (const k in o) { fbDict.set(k, o[k]); out.add(o[k].trim()); } fbSync = localStorage.getItem('fw_i18n_t_' + FBL) || ''; } catch (_) { /* bez zálohy */ }
}

const NUM = /\d+(?:[.,:]\d+)*/g;
function keyOf(core) { const nums = []; const k = core.replace(NUM, m => `{${nums.push(m) - 1}}`); return [k, nums]; }
// preklad celého textu; null = ešte nie je v slovníku (pošle sa na preklad), undefined = netreba prekladať
// skratky dní sú bez kontextu nejednoznačné (sk „So“ = sobota, nem. „So“ = nedeľa), preto ich dáva priamo kalendár zariadenia
const OVR = new Map();
if (LANG !== 'sk') {
  try {
    const f = new Intl.DateTimeFormat(LANG, { weekday: 'short' }), cap1 = t => t.charAt(0).toLocaleUpperCase(LANG) + t.slice(1);
    ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'].forEach((d, i) => OVR.set(d, cap1(f.format(new Date(2024, 0, 1 + i))).replace(/\.$/, '')));
  } catch (_) { /* bez kalendára */ }
}
function tr(text) {
  if (LANG === 'sk' || !text) return undefined;
  const core = text.trim();
  const o = OVR.get(core); if (o) { out.add(o); return text.replace(core, o); }
  if (core.length < 1 || core.length > 600 || !/\p{L}/u.test(core) || out.has(core)) return undefined;
  const [k, nums] = keyOf(core);
  const v = dict.get(k);
  const lead = text.match(/^\s*/)[0], trail = text.match(/\s*$/)[0];
  if (v === undefined) {
    miss.add(k); schedule();
    const f = FB && fbDict.get(k);
    return f ? lead + f.trim().replace(/\{(\d+)\}/g, (m, i) => nums[i] ?? m) + trail : null;
  }
  return lead + v.trim().replace(/\{(\d+)\}/g, (m, i) => nums[i] ?? m) + trail;
}

// ---------- doťahovanie prekladov ----------
const miss = new Set(), flying = new Set(), failed = new Map();
let schedT = 0, busy = false;
function schedule() { if (!schedT) schedT = setTimeout(flush, 250); }
async function flush() {
  schedT = 0;
  if (busy) { schedule(); return; }
  const now = Date.now();
  const keys = [...miss].filter(k => !flying.has(k) && !(failed.get(k) > now));
  miss.clear();
  if (!keys.length) return;
  busy = true;
  // dávky po 60 textov, tri naraz: prvé spustenie v novom jazyku je tak niekoľkonásobne rýchlejšie
  const parts = []; for (let i = 0; i < keys.length; i += 60) parts.push(keys.slice(i, i + 60));
  const one = async part => {
    part.forEach(k => flying.add(k));
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/i18n`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY }, body: JSON.stringify({ lang: LANG, strings: part }) });
      const j = await r.json();
      const m = j?.map || {};
      part.forEach(k => { if (m[k]) put(k, m[k]); else failed.set(k, Date.now() + 120000); });
    } catch (_) { part.forEach(k => failed.set(k, Date.now() + 60000)); }
    part.forEach(k => flying.delete(k));
    save(); scanAll();
  };
  try {
    await Promise.all([0, 1, 2].map(async () => { while (parts.length) await one(parts.shift()); }));
  } finally { busy = false; reveal(); }
}
async function sync() {
  try {
    const since = lastSync;
    let from = 0, newest = since;
    for (;;) {
      const q = `${SUPABASE_URL}/rest/v1/i18n?select=src,dst,created_at&lang=eq.${LANG}${since ? `&created_at=gt.${encodeURIComponent(since)}` : ''}&order=created_at.asc`;
      const r = await fetch(q, { headers: { apikey: SUPABASE_ANON_KEY, Range: `${from}-${from + 999}`, 'Range-Unit': 'items' } });
      if (!r.ok) break;
      const rows = await r.json();
      for (const x of rows) { put(x.src, x.dst); if (x.created_at > newest) newest = x.created_at; }
      if (rows.length < 1000) break;
      from += 1000;
    }
    lastSync = newest; save();
    if (FB) await syncFb();
    scanAll();
  } catch (_) { /* ostane slovník zo zariadenia */ }
  reveal();
}
async function syncFb() {
  let from = 0, newest = fbSync;
  for (;;) {
    const q = `${SUPABASE_URL}/rest/v1/i18n?select=src,dst,created_at&lang=eq.${FBL}${fbSync ? `&created_at=gt.${encodeURIComponent(fbSync)}` : ''}&order=created_at.asc`;
    const r = await fetch(q, { headers: { apikey: SUPABASE_ANON_KEY, Range: `${from}-${from + 999}`, 'Range-Unit': 'items' } });
    if (!r.ok) return;
    const rows = await r.json();
    for (const x of rows) { fbDict.set(x.src, x.dst); out.add(String(x.dst).trim()); if (x.created_at > newest) newest = x.created_at; }
    if (rows.length < 1000) break;
    from += 1000;
  }
  fbSync = newest;
  try { localStorage.setItem('fw_i18n_' + FBL, JSON.stringify(Object.fromEntries(fbDict))); localStorage.setItem('fw_i18n_t_' + FBL, fbSync); } catch (_) { /* plné úložisko */ }
}

// ---------- prekladanie obrazovky ----------
const SKIP = 'script,style,textarea,input,code,pre,[contenteditable],.notranslate,[translate="no"]';
const ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
const mine = new WeakMap(); // text, ktorý sme do uzla zapísali my (aby sa neprekladal dookola)
function doText(n) {
  const v = n.nodeValue; if (!v || mine.get(n) === v) return;
  const p = n.parentElement; if (!p || p.closest(SKIP)) return;
  const t = tr(v); if (!t || t === v) return;
  mine.set(n, t); n.nodeValue = t;
}
const mineA = new WeakMap();
function doAttr(el, a) {
  const v = el.getAttribute(a); if (!v) return;
  const m = mineA.get(el); if (m && m[a] === v) return;
  if (el.closest('.notranslate,[translate="no"]')) return;
  const t = tr(v); if (!t || t === v) return;
  (mineA.get(el) || mineA.set(el, {}).get(el))[a] = t; el.setAttribute(a, t);
}
function scan(root) {
  if (!root) return;
  if (root.nodeType === 3) { doText(root); return; }
  if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
  if (root.nodeType === 1) { if (root.matches('script,style')) return; ATTRS.forEach(a => root.hasAttribute(a) && doAttr(root, a)); }
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) doText(n);
  root.querySelectorAll?.('[placeholder],[aria-label],[title],[alt]').forEach(el => ATTRS.forEach(a => el.hasAttribute(a) && doAttr(el, a)));
}
function scanAll() { scan(document.body); const t = tr(document.title); if (t) document.title = t; }

// kým sa pri úplne prvom spustení v cudzom jazyku nenačíta slovník, obrazovka sa na chvíľu skryje (bez preblikávania slovenčiny)
let revealed = false;
function reveal() { if (revealed) return; revealed = true; H.classList.remove('fw-i18n-wait'); }

if (LANG !== 'sk') {
  const st = document.createElement('style'); st.dataset.fwLight = '';
  st.textContent = 'html.fw-i18n-wait #app,html.fw-i18n-wait .fnq{visibility:hidden}';
  document.head.appendChild(st);
  if (!dict.size) { H.classList.add('fw-i18n-wait'); setTimeout(reveal, 2500); } else reveal();
  const MO = window.__fwNativeMO || MutationObserver;
  new MO(recs => {
    for (const r of recs) {
      if (r.type === 'characterData') doText(r.target);
      else if (r.type === 'attributes') doAttr(r.target, r.attributeName);
      else r.addedNodes.forEach(scan);
    }
  }).observe(H, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  if (document.body) scanAll(); else addEventListener('DOMContentLoaded', scanAll);
  // okná prehliadača (potvrdenia) tiež v jazyku používateľa
  for (const f of ['confirm', 'alert', 'prompt']) { const o = window[f]?.bind(window); if (o) window[f] = (m, ...rest) => o(tr(String(m ?? '')) || m, ...rest); }
  sync();
  setInterval(sync, 30 * 60 * 1000);
}

export { tr };
