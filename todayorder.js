// Poradie kariet na Dnes. Pravidlo: čím častejšie to človek počas dňa ťuká, tým vyššie to je.
// 1) Jedlo: kalórie, rýchly zápis, jedlá dňa a rozbor dňa (hlavná vec appky, ťuká sa 3 až 6× denne).
// 2) Denné návyky a telo: voda (viackrát denne), spánok (raz ráno), kroky z hodiniek, tréning a váha.
// 3) Výzvy a týždeň: týždenné vyhodnotenie (raz týždenne), Na dnes, novinky.
// 4) Plánovanie a objavovanie: nákupný zoznam (raz týždenne), Objav v appke, kamaráti.
// Karty pribúdajú postupne z rôznych modulov, preto ich tu po každom vykreslení zoradíme. Karta, ktorú tu nepoznáme,
// ostane hneď za kartou, za ktorou ju jej modul vložil. Poradie sa mení len vtedy, keď nesedí, aby sa nič zbytočne neprekresľovalo.
const ORDER = [
  '.tdh', '.wk', '.back-card', '.hero-k', '.qk', '.wk-avg', '.tip',
  '.meals', 'details.an',
  '#wx', '#sp', '.act', '.duo',
  '#adaptCard', '.fwdk', '.rd-card', '.wc-card', '.rp-card', '#pushCard', '#newsSlot',
  '#fw-shop', '#fw-discover', '#fw-friends',
];
const rankOf = el => ORDER.findIndex(s => el.matches(s));

function sort(scr) {
  const kids = [...scr.children];
  // neznáma karta dostane poradie karty pred ňou (drží sa jej), poradie v rámci rovnakej skupiny ostáva
  let prev = -1;
  const ranked = kids.map((el, i) => { const r = rankOf(el); const k = r >= 0 ? r : prev; if (r >= 0) prev = r; return { el, k, i }; });
  const want = ranked.slice().sort((a, b) => a.k - b.k || a.i - b.i).map(x => x.el);
  if (want.every((el, i) => el === kids[i])) return false;
  // presunie len tie karty, ktoré sú na zlom mieste
  want.forEach((el, i) => { const at = scr.children[i]; if (at !== el) scr.insertBefore(el, at); });
  return true;
}

const app = document.getElementById('app');
if (app) {
  const mo = new MutationObserver(() => {
    const scr = app.querySelector('.screen.td');
    if (!scr) return;
    if (sort(scr)) mo.takeRecords(); // vlastné presuny nespúšťajú ďalšie triedenie
  });
  mo.observe(app, { childList: true, subtree: true });
}
