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
  ['lt', 'Lietuvių'], ['lv', 'Latviešu'], ['et', 'Eesti'], ['el', 'Ελληνικά']];
const OK = new Set(LANGS.map(l => l[0]));
const H = document.documentElement;

// doterajší používatelia appku poznajú po slovensky: tým sa jazyk nezmení sám od seba (napr. pri anglickom iPhone), prepnú si ho v Profile
try { if (!localStorage.getItem(KEY) && Object.keys(localStorage).some(k => k.startsWith('fw_prof_') || k === 'fw_snap')) localStorage.setItem(KEY, 'sk'); } catch (_) { /* nič */ }

export function getChoice() { try { return localStorage.getItem(KEY) || 'auto'; } catch (_) { return 'auto'; } }
function phoneLang() {
  for (const l of navigator.languages || [navigator.language || 'sk']) { const c = String(l).slice(0, 2).toLowerCase(); if (OK.has(c)) return c; }
  return 'en';
}
export function currentLang() { const c = getChoice(); return c !== 'auto' && OK.has(c) ? c : phoneLang(); }
export function setChoice(c) { try { localStorage.setItem(KEY, c); } catch (_) { } location.reload(); }

const LANG = currentLang();
H.lang = LANG;

// ---------- výber jazyka v Profile (vedľa Vzhľadu) ----------
function profileUi() {
  const theme = document.querySelector('#app #fwTheme');
  if (!theme) return;
  const had = document.querySelector('#fwLang');
  // karta ide vždy hneď pod Vzhľad (Profil si Vzhľad pri prekreslení presúva)
  if (had) { if (had.previousElementSibling !== theme) theme.after(had); return; }
  const card = document.createElement('div');
  card.className = 'card'; card.id = 'fwLang'; card.style.marginTop = '14px';
  const opts = [['auto', null], ...LANGS].map(([k, n]) => `<option value="${k}"${k === getChoice() ? ' selected' : ''}>${n || ''}</option>`).join('');
  card.innerHTML = `<b>Jazyk</b>
    <select class="input notranslate" id="fwLangSel" style="margin-top:10px;width:100%;height:48px;font-size:16px">${opts}</select>
    <p class="muted small" style="margin:8px 2px 0">Automaticky sa riadi jazykom telefónu. Preklad robí AI, zriedka môže byť nepresný.</p>`;
  const sel = card.querySelector('#fwLangSel');
  // „Automaticky“ sa ukáže v jazyku appky aj s tým, čo telefón práve používa
  sel.options[0].textContent = `${tr('Automaticky') || 'Automaticky'} (${(LANGS.find(l => l[0] === phoneLang()) || [, 'English'])[1]})`;
  sel.onchange = () => setChoice(sel.value);
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

const NUM = /\d+(?:[.,:]\d+)*/g;
function keyOf(core) { const nums = []; const k = core.replace(NUM, m => `{${nums.push(m) - 1}}`); return [k, nums]; }
// preklad celého textu; null = ešte nie je v slovníku (pošle sa na preklad), undefined = netreba prekladať
function tr(text) {
  if (LANG === 'sk' || !text) return undefined;
  const core = text.trim();
  if (core.length < 1 || core.length > 600 || !/\p{L}/u.test(core) || out.has(core)) return undefined;
  const [k, nums] = keyOf(core);
  const v = dict.get(k);
  if (v === undefined) { miss.add(k); schedule(); return null; }
  const lead = text.match(/^\s*/)[0], trail = text.match(/\s*$/)[0];
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
  try {
    for (let i = 0; i < keys.length; i += 80) {
      const part = keys.slice(i, i + 80); part.forEach(k => flying.add(k));
      try {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/i18n`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY }, body: JSON.stringify({ lang: LANG, strings: part }) });
        const j = await r.json();
        const m = j?.map || {};
        part.forEach(k => { if (m[k]) put(k, m[k]); else failed.set(k, Date.now() + 120000); });
      } catch (_) { part.forEach(k => failed.set(k, Date.now() + 60000)); }
      part.forEach(k => flying.delete(k));
      save(); scanAll();
    }
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
    lastSync = newest; save(); scanAll();
  } catch (_) { /* ostane slovník zo zariadenia */ }
  reveal();
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
  st.textContent = 'html.fw-i18n-wait #app{visibility:hidden}';
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
