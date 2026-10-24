// Pokrok: krásne prázdne stavy pre nového používateľa a karta "Tvoj štart".
// Keď ešte nie sú dáta, karty neukazujú pomĺčky a prázdne grafy, ale náznak toho, čo sa tu objaví, a jedno jasné tlačidlo, čo urobiť.
// Modul sa len pozerá na vykreslenú kartu Pokrok (nič nepočíta znova), takže výpočty ostávajú v progress.js.
const CSS = `
.pe-quest{position:relative;overflow:hidden;margin-bottom:12px;padding:16px;border-radius:22px;border:1px solid color-mix(in srgb,var(--accent) 30%,var(--line));
  background:radial-gradient(100% 140% at 100% 0%,color-mix(in srgb,var(--accent) 18%,transparent),transparent 62%),var(--card);animation:peIn .6s cubic-bezier(.2,.9,.3,1) both}
@keyframes peIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.pe-qh{display:flex;align-items:center;gap:14px;margin-bottom:12px}
.pe-qr{position:relative;flex:none;width:56px;height:56px}
.pe-qr svg{width:100%;height:100%;transform:rotate(-90deg)}
.pe-qr circle{fill:none;stroke-width:6;stroke-linecap:round}
.pe-qr .t{stroke:var(--track,color-mix(in srgb,var(--text) 10%,transparent))}
.pe-qr .v{stroke:var(--accent);stroke-dasharray:138.2;stroke-dashoffset:138.2;animation:peRing 1.2s cubic-bezier(.2,.8,.2,1) .3s forwards}
@keyframes peRing{to{stroke-dashoffset:var(--to)}}
.pe-qr b{position:absolute;inset:0;display:grid;place-items:center;font-size:16px;font-weight:800;letter-spacing:-.02em}
.pe-qh h3{margin:0;font-size:19px;font-weight:800;letter-spacing:-.03em}
.pe-qh p{margin:2px 0 0;font-size:13px;color:var(--muted)}
.pe-steps{display:grid;gap:8px}
.pe-s{position:relative;display:flex;align-items:center;gap:12px;padding:12px;border-radius:16px;background:color-mix(in srgb,var(--bg-2) 85%,transparent);border:1px solid var(--line);color:var(--text);text-decoration:none;overflow:hidden;transition:transform .12s}
.pe-s:active{transform:scale(.985)}
.pe-s i{flex:none;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;border:2px solid var(--line)}
.pe-s i svg{width:14px;height:14px;opacity:0;stroke:var(--bg);stroke-width:3;fill:none;stroke-linecap:round;stroke-linejoin:round}
.pe-s.done i{background:var(--accent);border-color:var(--accent)}
.pe-s.done i svg{opacity:1}
.pe-s.done{opacity:.6}
.pe-s div{flex:1;min-width:0}
.pe-s b{display:block;font-size:14.5px;font-weight:700;letter-spacing:-.01em}
.pe-s small{font-size:12px;color:var(--muted)}
.pe-s em{flex:none;font-style:normal;color:var(--muted);font-size:18px}
.pe-s.next{border-color:color-mix(in srgb,var(--accent) 55%,var(--line))}
.pe-s.next::after{content:'';position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,color-mix(in srgb,var(--accent) 22%,transparent) 50%,transparent 70%);transform:translateX(-100%);animation:peSweep 3.2s ease-in-out 1s infinite}
@keyframes peSweep{60%,100%{transform:translateX(100%)}}
.pe-s.next i{border-color:var(--accent)}
.pe-s.next em{color:var(--accent)}

.pe-gw{position:relative;margin:10px 0 4px}
.pe-gw svg{width:100%;height:auto;display:block;overflow:visible}
.pe-gl{fill:none;stroke:var(--accent);stroke-width:3;stroke-linecap:round;stroke-dasharray:3 9;opacity:.5;animation:peFlow 2.4s linear infinite}
@keyframes peFlow{to{stroke-dashoffset:-24}}
.pe-gg{stroke:var(--line);stroke-width:1;opacity:.6}
.pe-ga{fill:url(#peg);opacity:.9}
.pe-ov{display:flex;flex-direction:column;align-items:center;text-align:center;padding:6px 14px 0}
.pe-ov b{font-size:16px;font-weight:800;letter-spacing:-.02em}
.pe-ov p{margin:4px 0 12px;max-width:270px;font-size:12.5px;line-height:1.4;color:var(--muted)}
.pe-bars{position:relative;margin:4px 0 0}
.pe-bars .gb{display:flex;align-items:flex-end;gap:5px;height:92px;padding:0 2px;margin-bottom:12px}
.pe-bars .gb i{flex:1;border-radius:6px;background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 34%,transparent),color-mix(in srgb,var(--accent) 6%,transparent));animation:peWave 2.6s ease-in-out infinite;animation-delay:calc(var(--i)*90ms)}
@keyframes peWave{50%{opacity:.35;transform:scaleY(.86)}}
.pe-bars .gb i{transform-origin:50% 100%}
.pe-cap{margin:12px 0 0;text-align:center;font-size:12.5px;color:var(--muted)}
.pe-cap .btn{margin-top:10px}
.pe-cta{display:inline-flex;margin-top:12px}
.pgx-ins{scroll-padding-inline:16px}
.pe-tz{position:relative}
.pe-tz article{opacity:.9}
.pe-tz article em{display:inline-block;margin-top:10px;padding:4px 9px;border-radius:99px;font-style:normal;font-size:11px;font-weight:700;color:var(--muted);background:color-mix(in srgb,var(--bg) 50%,transparent)}
@media (prefers-reduced-motion:reduce){.pe-quest,.pe-qr .v,.pe-s.next::after,.pe-gl,.pe-bars .gb i{animation:none!important}.pe-qr .v{stroke-dashoffset:var(--to)}}
`;
const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

const CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const btn = (href, label) => `<a class="btn primary sm" href="${href}">${label}</a>`;

function quest(pg) {
  const best = Number(pg.querySelector('.st-best b')?.textContent) || 0;
  const hasWeight = !!pg.querySelector('.pgx-big span[data-to]');
  const streak = Number(pg.querySelector('.st-n b')?.dataset.to) || 0;
  const steps = [
    [best > 0, 'Zapíš prvé jedlo', 'Appka spočíta kalórie a makrá', '#/jedlo'],
    [hasWeight, 'Zapíš svoju váhu', 'Z nej sa kreslí tvoja krivka', '#/vaha'],
    [streak >= 3, 'Zapisuj 3 dni v rade', 'Prvá séria a prvý míľnik', '#/jedlo'],
  ];
  const done = steps.filter(s => s[0]).length;
  if (done === steps.length) return;
  const nextIdx = steps.findIndex(s => !s[0]);
  const el = document.createElement('section'); el.className = 'pe-quest';
  el.innerHTML = `<div class="pe-qh"><div class="pe-qr"><svg viewBox="0 0 48 48"><circle class="t" cx="24" cy="24" r="22"/><circle class="v" cx="24" cy="24" r="22" style="--to:${(138.2 * (1 - done / steps.length)).toFixed(1)}"/></svg><b>${done}/${steps.length}</b></div>
    <div><h3>Tvoj štart</h3><p>${done ? 'Ide ti to. Ešte ' + (steps.length - done) + (steps.length - done === 1 ? ' krok.' : ' kroky.') : 'Tri kroky a Pokrok ožije.'}</p></div></div>
    <div class="pe-steps">${steps.map(([ok, t, s, href], i) => `<a class="pe-s ${ok ? 'done' : ''} ${i === nextIdx ? 'next' : ''}" href="${href}"><i>${CHECK}</i><div><b>${t}</b><small>${s}</small></div>${ok ? '' : '<em>›</em>'}</a>`).join('')}</div>`;
  const hero = pg.querySelector('.pgx-hero');
  if (hero) hero.before(el);
}

function emptyWeight(pg) {
  const box = pg.querySelector('.pgx-hero .pgx-empty'); if (!box) return;
  const one = !!pg.querySelector('.pgx-big span[data-to]');
  const big = pg.querySelector('.pgx-big');
  if (big && !one) { const day = pg.querySelector('.pgx-rc b')?.textContent || '1'; big.classList.remove('good', 'bad'); big.innerHTML = `Deň ${day}`; }
  box.className = 'pe-gw';
  box.innerHTML = `<svg viewBox="0 0 340 100" aria-hidden="true"><defs><linearGradient id="peg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".14"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
    ${[28, 56, 84].map(y => `<line class="pe-gg" x1="6" x2="334" y1="${y}" y2="${y}"/>`).join('')}
    <path class="pe-ga" d="M6,14 C70,18 100,44 150,50 C200,56 240,72 334,82 L334,96 L6,96 Z"/>
    <path class="pe-gl" d="M6,14 C70,18 100,44 150,50 C200,56 240,72 334,82"/></svg>
    <div class="pe-ov"><b>${one ? 'Máš prvé vážené' : 'Tvoja krivka začína tu'}</b><p>${one ? 'Zapíš druhé a krivka sa nakreslí aj s predpoveďou na 8 týždňov dopredu.' : 'Váž sa ráno, nalačno. Po druhom vážení sa nakreslí krivka s predpoveďou.'}</p>${btn('#/vaha', 'Zapísať váhu')}</div>`;
}

function emptyKcal(pg) {
  const sec = pg.querySelector('.pgx-kc'); if (!sec) return;
  if (!/bez dát/.test(sec.querySelector('.pg-chip')?.textContent || '')) return;
  const bw = sec.querySelector('.pgx-bw'); if (!bw) return;
  const hs = [46, 70, 58, 86, 64, 92, 52, 78, 60, 88, 68, 74, 56, 82];
  const box = document.createElement('div'); box.className = 'pe-bars';
  box.innerHTML = `<div class="gb">${hs.map((h, i) => `<i style="height:${h}%;--i:${i}"></i>`).join('')}</div>
    <div class="pe-ov"><b>Tu uvidíš každý deň oproti cieľu</b><p>Zelený stĺpec znamená, že si trafil cieľ. Po prvom zapísanom dni sa objaví prvý.</p>${btn('#/jedlo', 'Zapísať jedlo')}</div>`;
  bw.replaceWith(box);
  sec.querySelector('.pgx-read')?.remove();
  sec.querySelector('.pg-legend')?.remove();
}

function emptyMacros(pg) {
  const mac = pg.querySelector('.pgx-mac'); if (!mac) return;
  const sec = mac.closest('.pg-card');
  if (!/bez dát/.test(sec.querySelector('.pg-chip')?.textContent || '') || sec.querySelector('.pe-cap')) return;
  mac.insertAdjacentHTML('afterend', `<p class="pe-cap">Po prvom zapísanom dni sa krúžky rozsvietia podľa toho, koľko z cieľa si splnil.</p>`);
}

function emptyGrid(pg) {
  const sum = pg.querySelector('.hm-sum'); if (!sum) return;
  if ((sum.querySelector('b')?.textContent || '') !== '0') return;
  sum.innerHTML = 'Každý zapísaný deň tu rozsvieti jedno políčko. Dnešné bude prvé v rade.';
}

function emptyStreak(pg) {
  const st = pg.querySelector('.pgx-st'); if (!st || st.classList.contains('hot') || st.querySelector('.pe-cta')) return;
  st.querySelector('.st-next')?.insertAdjacentHTML('beforeend', `<div class="pe-cta">${btn('#/jedlo', 'Zapísať jedlo')}</div>`);
}

function teasers(pg) {
  const box = pg.querySelector('.pgx-ins'); if (!box) return;
  const a = box.querySelectorAll('article');
  if (a.length !== 1 || !/Zapisuj aspoň/.test(a[0].textContent)) return;
  const items = [
    ['🍕', 'Víkend alebo týždeň? Uvidíš, kedy ješ viac.', '#FFB547'],
    ['💪', 'Koľko dní z týždňa si splnil bielkoviny.', 'var(--accent)'],
    ['🎯', 'Najpresnejší deň, keď si trafil cieľ na kalóriu.', '#5BB8FF'],
  ];
  box.classList.add('pe-tz');
  box.innerHTML = items.map(([i, t, k]) => `<article style="--k:${k}"><span>${i}</span><p>${t}</p><em>po 4 dňoch zápisu</em></article>`).join('');
}

function run() {
  const pg = document.querySelector('#app .screen.pg');
  if (!pg || pg.dataset.pe) return;
  if (!pg.querySelector('.pgx-hero') || !pg.querySelector('.pgx-st')) return;
  pg.dataset.pe = '1';
  quest(pg); emptyWeight(pg); emptyKcal(pg); emptyMacros(pg); emptyGrid(pg); emptyStreak(pg); teasers(pg);
}
let q = 0;
const app = document.getElementById('app');
if (app) { new MutationObserver(() => { if (q) return; q = requestAnimationFrame(() => { q = 0; run(); }); }).observe(app, { childList: true, subtree: true }); run(); }
