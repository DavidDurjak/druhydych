// Poradie kariet na Dnes. Pravidlo: čím častejšie to človek počas dňa ťuká, tým vyššie to je.
// 1) Jedlo: kalórie, rýchly zápis, jedlá dňa a rozbor dňa (hlavná vec appky, ťuká sa 3 až 6× denne).
// 2) Denné návyky a telo: voda (viackrát denne), spánok (raz ráno), kroky z hodiniek, tréning a váha.
// 3) Výzvy a týždeň: týždenné vyhodnotenie (raz týždenne), Na dnes, novinky.
// 4) Plánovanie a objavovanie: nákupný zoznam (raz týždenne), Objav v appke, kamaráti.
// Karty pribúdajú postupne z rôznych modulov, preto ich tu po každom vykreslení zoradíme. Karta, ktorú tu nepoznáme,
// ostane hneď za kartou, za ktorou ju jej modul vložil. Poradie sa mení len vtedy, keď nesedí, aby sa nič zbytočne neprekresľovalo.
//
// Vlastné rozloženie (todayedit.js): človek si karty pod hlavnou kartou kalórií môže preusporiadať a skryť.
// Hlavička, týždenný pás a karta kalórií ostávajú vždy hore. Jedlá dňa sa dajú presunúť, ale nie skryť (bez nich appka nemá zmysel).
// Uloží sa poradie a zoznam skrytých kariet do telefónu (localStorage) aj do účtu (profiles.today_layout), aby rozloženie
// išlo s človekom na nový telefón aj po preinštalovaní. Vyhráva novšia zmena (čas „at“). Nová karta, ktorú človek ešte nevidel,
// sa zaradí na svoje predvolené miesto.
import * as db from './data.js';
import { ctx } from './app.js';

const FIXED = ['.tdh', '.wk', '.back-card', '.hero-k'];

// id, selektor, názov a ikona do úprav, lock = nedá sa skryť
export const CARDS = [
  { id: 'qk', sel: '.qk', label: 'Rýchle akcie', sub: 'Hľadať, Kód, AI zápis, Iný deň', ic: '⚡' },
  { id: 'avg', sel: '.wk-avg', label: 'Týždenný priemer', sub: 'Priemer kalórií za týždeň', ic: '📊' },
  { id: 'tip', sel: '.tip', label: 'Tip na dnes', sub: 'Krátka rada podľa tvojho dňa', ic: '🧭' },
  { id: 'diet', sel: '#dxdash', label: 'Moja diéta', sub: 'Bezlepková, vegánska a iné', ic: '🌾' },
  { id: 'meals', sel: '.meals', label: 'Jedlá dňa', sub: 'Raňajky, obed, večera...', ic: '🍽️', lock: true },
  { id: 'an', sel: 'details.an', label: 'Rozbor dňa', sub: 'Odkiaľ prichádzajú kalórie', ic: '🔍' },
  { id: 'wx', sel: '#wx', label: 'Pitný režim', sub: 'Voda a denný cieľ', ic: '💧' },
  { id: 'sp', sel: '#sp', label: 'Spánok', sub: 'Hodiny spánku a týždeň', ic: '🌙' },
  { id: 'act', sel: '.act', label: 'Kroky a aktivita', sub: 'Údaje z hodiniek', ic: '👟' },
  { id: 'duo', sel: '.duo', label: 'Tréning a váha', sub: 'Plán tréningu a posledná váha', ic: '🏋️' },
  { id: 'adapt', sel: '#adaptCard', label: 'Týždenné vyhodnotenie', sub: 'Adaptívny cieľ kalórií', ic: '📈' },
  { id: 'deck', sel: '.fwdk', label: 'Na dnes', sub: 'Check-in, report, pripomienky', ic: '✅' },
  { id: 'news', sel: '#newsSlot', label: 'Novinky', sub: 'Čo je nové v appke', ic: '📰' },
  { id: 'shop', sel: '#fw-shop', label: 'Nákupný zoznam', sub: 'Suroviny z jedálnička', ic: '🛒' },
  { id: 'disc', sel: '#fw-discover', label: 'Objav v appke', sub: 'Jedálniček, návyky a ďalšie', ic: '✨' },
  { id: 'fr', sel: '#fw-friends', label: 'Kamaráti', sub: 'Porovnaj sa s kamarátmi', ic: '👥' },
];
const DEFAULT = CARDS.map(c => c.id);
const byId = Object.fromEntries(CARDS.map(c => [c.id, c]));
const KEY = 'fw_td_layout_v1';

const clean = v => (v && Array.isArray(v.order) && Array.isArray(v.hidden))
  ? { order: v.order.filter(id => byId[id]).slice(0, 40), hidden: v.hidden.filter(id => byId[id] && !byId[id].lock).slice(0, 40), at: Number(v.at) || 0 }
  : null;
let layout = load();
function load() {
  try { const v = clean(JSON.parse(localStorage.getItem(KEY) || 'null')); if (v) return v; } catch (_) { }
  return { order: [], hidden: [], at: 0 };
}
const saveLocal = () => { try { localStorage.setItem(KEY, JSON.stringify(layout)); } catch (_) { } };

// účet: zápis s malým oneskorením (pri ťahaní kariet sa nezapisuje pri každom pohybe)
let pushT = 0, lastUid = '', lastSeen = -1;
function push() {
  clearTimeout(pushT);
  pushT = setTimeout(async () => {
    const p = ctx.state?.profile; if (!p?.id) return;
    const v = { order: layout.order, hidden: layout.hidden, at: layout.at };
    try { const { error } = await db.sb.from('profiles').update({ today_layout: v }).eq('id', p.id); if (!error) { p.today_layout = v; lastSeen = v.at; } } catch (_) { /* offline: zapíše sa pri ďalšej zmene alebo otvorení */ }
  }, 700);
}
// po načítaní profilu: novšie rozloženie z účtu prevezme, novšie z telefónu pošle do účtu
function sync() {
  const p = ctx.state?.profile; if (!p?.id) return;
  const remote = clean(p.today_layout), rat = remote?.at || 0;
  if (p.id === lastUid && rat === lastSeen) return;
  lastUid = p.id; lastSeen = rat;
  if (remote && rat > (layout.at || 0)) { layout = remote; saveLocal(); return true; }
  if ((layout.at || 0) > rat) push();
}

// poradie, ktoré človek nastavil + nové karty na ich predvolenom mieste (za najbližšou predchádzajúcou kartou)
export function mergedOrder(l = layout) {
  if (!l.order.length) return DEFAULT.slice();
  const out = l.order.slice();
  DEFAULT.forEach((id, i) => {
    if (out.includes(id)) return;
    let at = 0;
    for (let j = i - 1; j >= 0; j--) { const k = out.indexOf(DEFAULT[j]); if (k >= 0) { at = k + 1; break; } }
    out.splice(at, 0, id);
  });
  return out;
}
export const getLayout = () => ({ order: mergedOrder(), hidden: layout.hidden.slice() });
export const isCustom = () => layout.order.length > 0 || layout.hidden.length > 0;
export function setLayout(next) {
  layout = clean({ order: next.order || [], hidden: next.hidden || [], at: Date.now() });
  saveLocal(); push(); refresh();
}
// pôvodné rozloženie sa tiež uloží (s časom), aby sa vrátilo aj na ostatných telefónoch
export function resetLayout() {
  layout = { order: [], hidden: [], at: Date.now() };
  saveLocal(); push(); refresh();
}
export const cardOf = el => CARDS.find(c => el.matches(c.sel)) || null;

function ranker() {
  const pos = Object.fromEntries(mergedOrder().map((id, i) => [id, FIXED.length + i]));
  return el => {
    const f = FIXED.findIndex(s => el.matches(s));
    if (f >= 0) return f;
    const c = cardOf(el);
    return c ? pos[c.id] : -1;
  };
}

function sort(scr) {
  const rankOf = ranker();
  const hid = new Set(layout.hidden);
  const kids = [...scr.children];
  // skrytie: len prepne triedu (karta ostane v stránke, aby ju jej modul mohol ďalej obnovovať)
  kids.forEach(el => { const c = cardOf(el); const off = !!c && hid.has(c.id); if (el.classList.contains('td-off') !== off) el.classList.toggle('td-off', off); });
  // neznáma karta dostane poradie karty pred ňou (drží sa jej), poradie v rámci rovnakej skupiny ostáva
  let prev = -1;
  const ranked = kids.map((el, i) => { const r = rankOf(el); const k = r >= 0 ? r : prev; if (r >= 0) prev = r; return { el, k, i }; });
  const want = ranked.slice().sort((a, b) => a.k - b.k || a.i - b.i).map(x => x.el);
  if (want.every((el, i) => el === kids[i])) return false;
  // presunie len tie karty, ktoré sú na zlom mieste
  want.forEach((el, i) => { const at = scr.children[i]; if (at !== el) scr.insertBefore(el, at); });
  return true;
}

const st = document.createElement('style');
st.textContent = '.screen.td>.td-off{display:none!important}';
document.head.appendChild(st);

const app = document.getElementById('app');
let mo = null;
function refresh() {
  const scr = app?.querySelector('.screen.td');
  if (!scr) return;
  sort(scr);
  mo?.takeRecords();
}
if (app) {
  mo = new MutationObserver(() => {
    const scr = app.querySelector('.screen.td');
    if (!scr) return;
    sync();
    sort(scr);
    mo.takeRecords(); // vlastné presuny a prepnutia tried nespúšťajú ďalšie triedenie
  });
  mo.observe(app, { childList: true, subtree: true });
  refresh();
}
