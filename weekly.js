// Denný a týždenný check-in sú zrušené: nikto ich nevyplňal (týždenný ani raz, denný raz). Top appky (MacroFactor) to robia inak:
// check-in je týždenné vyhodnotenie, ktoré spraví appka sama z jedla a váhy a človek iba prijme nový cieľ jedným ťukom.
// Tento modul:
// 1) z Dnes odstráni karty Denný check-in a Týždenný check-in (aj výzvu v týždennom reporte) a riadok Večerný check-in v Pripomienkach,
// 2) kartu Týždenné prehodnotenie premení na Týždenné vyhodnotenie: tri čísla týždňa (váha, priemer kcal, zapísané dni), tlačidlo Prijať,
// 3) v plusovom menu dá namiesto Check-inu Spánok a Týždeň otvorí týždenný report,
// 4) staré odkazy (#/checkin, #/tyzden, napr. zo starých notifikácií) presmeruje na Dnes a na týždenný report.
import { lastAdapt } from './adapt.js';
import * as U from './units.js';

const CSS = `
#app a.ci[href="#/checkin"],#app a.wc-card[href="#/tyzden"]{display:none!important}
#adaptCard .wv-st{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
#adaptCard .wv-st>div{background:var(--bg-2,var(--bg));border:1px solid var(--line);border-radius:14px;padding:10px 8px;text-align:center;min-width:0}
#adaptCard .wv-st b{display:block;font-size:17px;font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:-.01em;white-space:nowrap}
#adaptCard .wv-st b.wv-dn{color:var(--accent)}
#adaptCard .wv-st b.wv-up{color:#FFC857}
#adaptCard .wv-st small{display:block;font-size:11px;color:var(--muted);margin-top:2px}
#adaptCard .wv-rep{display:inline-block;margin:12px 0 0 4px;font-size:13px;font-weight:600;color:var(--muted);text-decoration:none}
`;
if (!document.getElementById('wv-css')) { const s = document.createElement('style'); s.id = 'wv-css'; s.textContent = CSS; document.head.appendChild(s); }

// ---------- staré adresy ----------
const MOVE = { '#/checkin': '#/', '#/tyzden': '#/report' };
function reroute() {
  const path = (location.hash || '#/').split('?')[0];
  if (MOVE[path]) location.replace(MOVE[path]);
}
addEventListener('hashchange', reroute);
reroute();

// ---------- karta Týždenné vyhodnotenie ----------
function enhance(c) {
  if (c.dataset.wv) return;
  c.dataset.wv = '1';
  const h3 = c.querySelector('h3'); if (h3) h3.textContent = 'Týždenné vyhodnotenie';
  const a = lastAdapt();
  if (a) {
    const ch = a.ch;
    const kg = ch == null ? '–' : `${U.fmtWD(ch)} ${U.wUnit()}`;
    const cls = ch == null ? '' : ch < 0 ? 'wv-dn' : ch > 0 ? 'wv-up' : '';
    const avg = Math.round(a.avg7 ?? a.avg ?? 0);
    const days = a.days7 ?? Math.min(7, a.days || 0);
    c.querySelector('.row.between')?.insertAdjacentHTML('afterend', `<div class="wv-st">
      <div><b class="${cls}">${kg}</b><small>váha za týždeň</small></div>
      <div><b>${avg || '–'}</b><small>kcal priemer</small></div>
      <div><b>${days}/7</b><small>zapísané dni</small></div></div>`);
    // riadok „Priemer … kcal z … dní, trend …“ už hovoria čísla hore
    [...c.querySelectorAll('p.muted.small')].find(p => /^Priemer /.test(p.textContent.trim()))?.remove();
  }
  const yes = c.querySelector('#adaptYes');
  if (yes) yes.textContent = yes.textContent.replace('Nastaviť', 'Prijať');
  const no = c.querySelector('#adaptNo');
  if (no && !yes) { no.textContent = 'Rozumiem'; no.classList.remove('ghost'); no.classList.add('primary'); }
  c.insertAdjacentHTML('beforeend', '<a class="wv-rep" href="#/report">Celý týždenný report ›</a>');
}

// ---------- plusové menu ----------
function fixMenu(root) {
  root.querySelectorAll('[data-qa="checkin"]').forEach(b => {
    b.dataset.qa = 'sleep';
    b.innerHTML = '<i>🌙</i><span>Spánok<small>Ako si spal</small></span>';
  });
  root.querySelectorAll('[data-qa="week"] small').forEach(s => { if (s.textContent !== 'Vyhodnotenie') s.textContent = 'Vyhodnotenie'; });
}
document.addEventListener('click', e => {
  const b = e.target.closest?.('[data-qa="sleep"], [data-qa="week"]'); if (!b) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const sleep = b.dataset.qa === 'sleep';
  document.querySelector('.qa-fab')?.click();
  const target = sleep ? '#/' : '#/report';
  if ((location.hash || '#/').split('?')[0] !== target) location.hash = target;
  if (!sleep) return;
  // Dnes sa vykreslí, karta Spánok príde o chvíľu: počkáme na ňu a otvoríme týždeň spánku
  let n = 0;
  const t = setInterval(() => {
    const open = document.querySelector('#sp [data-sp="open"]');
    if (open) { clearInterval(t); open.click(); } else if (++n > 40) clearInterval(t);
  }, 150);
}, true);

// ---------- všetko, čo sa práve vykreslilo ----------
function run() {
  document.querySelectorAll('#app a.ci[href="#/checkin"], #app a.wc-card[href="#/tyzden"]').forEach(el => el.remove());
  // Pripomienky: večerný check-in už nie je (server ho neposiela)
  document.querySelectorAll('#app input[name="checkin_on"]').forEach(i => i.closest('.rrow')?.remove());
  document.querySelectorAll('a[href="#/tyzden"]').forEach(a => a.setAttribute('href', '#/report'));
  const c = document.getElementById('adaptCard'); if (c) enhance(c);
  fixMenu(document);
}
let raf = 0;
new MutationObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(run); }).observe(document.body, { childList: true, subtree: true });
run();
