// Vzhľady appky. „Klasický“ = pôvodný tmavý/svetlý dizajn. „Sušienka“ = svetlý vzhľad podľa ikony GainTrain:
// gradient z ikony (mätová, tyrkysová, modrá), karty z matného skla s jemným svetlom a mäkkým tieňom,
// čisté písmo s výraznými číslami, a kruh kalórií ako sušienka, z ktorej ubúda, čo zješ.
// Rozloženie obrazoviek sa nemení, mení sa len vzhľad. Voľba sa uloží v telefóne (fw_skin) a vyberá sa v Profile pri Vzhľade.
// Sušienka je svetlá: pri jej zapnutí sa svetlý režim zapne sám a pri návrate na Klasický sa vráti pôvodná voľba.
import { getMode, setMode } from './theme.js';

const KEY = 'fw_skin', PREV = 'fw_skin_prev_mode';
const H = document.documentElement;
const get = () => { try { return localStorage.getItem(KEY) === 'cookie' ? 'cookie' : 'classic'; } catch (_) { return 'classic'; } };
const S = 'html[data-skin=cookie]';

const CSS = `
${S}{--bg:#EAFBF5;--bg-2:#E0F6EF;--card:rgba(255,255,255,.66);--card-2:rgba(255,255,255,.5);--line:rgba(7,30,40,.1);--text:#0B1512;--muted:#5B6D68;
 --accent:#16B07A;--accent-ink:#FFFFFF;--accent-2:#C97B3F;--protein:#22C987;--carbs:#2A86E6;--fat:#DFA367;--danger:#E0344F;--track:rgba(7,30,40,.08);
 --ck-grad:linear-gradient(135deg,#7CFFB2 0%,#3EE6D0 52%,#5BB8FF 100%);
 --gl:rgba(255,255,255,.64);--gl-b:1px solid rgba(255,255,255,.8);
 --gl-sh:0 1px 0 rgba(255,255,255,.75) inset,0 18px 40px -20px rgba(7,30,40,.38),0 6px 14px -8px rgba(7,30,40,.16);
 --gl-sh2:0 1px 0 rgba(255,255,255,.85) inset,0 30px 60px -28px rgba(7,30,40,.48),0 10px 24px -12px rgba(7,30,40,.2);
 --dk:rgba(7,17,15,.84);color-scheme:light}
${S},${S} body{background:#4fe8d2 linear-gradient(170deg,#8FFFC6 0%,#4AE9D6 48%,#58B2FF 100%) fixed!important;min-height:100%}
${S} body::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:0;background:
 radial-gradient(120% 60% at 15% 0%,rgba(190,255,220,.85),rgba(190,255,220,0) 55%),
 radial-gradient(45% 28% at 80% 6%,rgba(255,255,255,.7),rgba(255,255,255,0) 70%),
 radial-gradient(110% 70% at 50% 112%,rgba(63,139,255,.75),rgba(63,139,255,0) 62%)}
${S} #app{position:relative;z-index:1}
${S} body::after{display:none!important}

/* písmo: čisté, hrubé len čísla a nadpisy */
${S} .screen h1,${S} .tdh-g,${S} .qa-h{font-family:'Inter','Sora',system-ui,sans-serif;font-weight:800;font-style:normal;letter-spacing:-.03em;color:#0B1512}
${S} .screen h2,${S} .screen h3{font-family:'Inter','Sora',system-ui,sans-serif;font-weight:700;letter-spacing:-.02em}
${S} .hk-c b,${S} .hk-eat b,${S} .mtile b,${S} .grid3 .stat b{font-family:'Inter','Sora',system-ui,sans-serif;font-weight:800;font-style:normal;letter-spacing:-.04em;color:#0B1512}
${S} .muted,${S} .small.muted{color:var(--muted)!important}

/* sklo: všetky karty */
${S} .card,${S} .mtile,${S} .ml,${S} #wx,${S} #sp,${S} .duo>*,${S} .fwdk-t>*,${S} .shop-card,${S} .fr-card,${S} .tip,
${S} details.an,${S} .pg-card,${S} .tile,${S} .dc-t,${S} .dc-i,${S} .qk-b,${S} .wc-card,${S} .rp-card,${S} .rd-card,${S} .ci,
${S} .pfx-plan,${S} .pfx-tiles>*,${S} .grid3 .stat,${S} .ck-c{
 background:var(--gl)!important;border:var(--gl-b)!important;box-shadow:var(--gl-sh)!important;color:var(--text);
 -webkit-backdrop-filter:blur(18px) saturate(1.3);backdrop-filter:blur(18px) saturate(1.3)}
${S} .ck-c.ck-in{background:rgba(255,255,255,.55)!important;box-shadow:0 1px 0 rgba(255,255,255,.8) inset,0 4px 10px -6px rgba(7,30,40,.2)!important;-webkit-backdrop-filter:none;backdrop-filter:none}
${S} .hero-k,${S} .pfx-hero{background:rgba(255,255,255,.74)!important;border:var(--gl-b)!important;box-shadow:var(--gl-sh2)!important;border-radius:32px!important;
 -webkit-backdrop-filter:blur(22px) saturate(1.35);backdrop-filter:blur(22px) saturate(1.35)}
${S} .hero-k::before,${S} .hero-k::after,${S} .pfx-hero::before{display:none!important}
${S} .card.accent,${S} .rp-card{background:linear-gradient(135deg,rgba(255,246,227,.88),rgba(255,233,194,.72))!important}

/* hlavička Dnes */
${S} .tdh-cal,${S} .tdh-s{background:rgba(255,255,255,.58)!important;border:var(--gl-b)!important;color:#0B1512!important;box-shadow:var(--gl-sh)!important;-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}
${S} .tdh-cal .cal-ic{background:#07110F!important;box-shadow:0 4px 10px -4px rgba(0,0,0,.55)!important}
${S} .tdh-cal .cal-ic b{color:#fff!important}
${S} .tdh-streak{background:linear-gradient(135deg,rgba(255,255,255,.78),rgba(255,230,200,.6))!important;border:var(--gl-b)!important;color:#C44D14!important;box-shadow:var(--gl-sh)!important}
${S} .tdh-streak::after{display:none!important}
${S} .tdh-edit{color:#07110F}

/* týždeň */
${S} .wk-d .wk-l{color:#2A3A36!important;font-weight:600}
${S} .wk-d.hit .wk-r::before{background:linear-gradient(145deg,#8FFFC6,#3EE6D0)!important;box-shadow:0 1px 0 rgba(255,255,255,.7) inset,0 6px 12px -6px rgba(20,160,140,.8)!important}
${S} .wk-d.hit .wk-r b{color:#07110F!important}
${S} .wk-d.now{background:#07110F!important;border-radius:18px;box-shadow:0 10px 20px -8px rgba(7,17,15,.7)}
${S} .wk-d.now .wk-l{color:#7CFFB2!important}
${S} .wk-d.now .wk-r b{color:#fff!important}
${S} .rg-track{stroke:rgba(7,30,40,.1)!important}

/* kruh kalórií = sušienka */
${S} .hk-ring .hk-rings,${S} .hk-ring .breath{display:none!important}
${S} .screen.td .hk-ring::before,${S} .screen.td .hk-ring::after{display:none!important}
${S} .ck-ring{position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;pointer-events:none}
${S} .hk-c{z-index:1}
${S} .hk-c b{font-size:44px!important}
${S} .hk-c span{color:#5B6D68!important;font-weight:600}
${S} .hk-pc{background:var(--ck-grad)!important;color:#07110F!important;border:0!important;font-style:normal;font-weight:700;box-shadow:0 6px 12px -6px rgba(62,230,208,.8)}
${S} .hero-k.over .hk-pc{background:linear-gradient(135deg,#FFC9C9,#FF9A9A)!important}
${S} .hk-t{color:#0B1512!important;font-weight:700}
${S} .hk-edit{background:var(--dk)!important;color:#fff!important;border:1px solid rgba(255,255,255,.14)!important;box-shadow:0 8px 16px -8px rgba(0,0,0,.6)}
${S} .hk-eat span{color:#5B6D68!important}

/* jedlá dňa pod kruhom */
${S} .mbp{background:rgba(255,255,255,.5)!important;border:0!important;box-shadow:inset 0 0 0 1.5px rgba(7,30,40,.1)!important;color:#2A3A36!important}
${S} .mbp.on{background:linear-gradient(180deg,color-mix(in srgb,var(--mc) 10%,#fff),color-mix(in srgb,var(--mc) 26%,#fff))!important;box-shadow:0 1px 0 #fff inset,0 8px 14px -9px var(--mc)!important;color:#0B1512!important}
${S} .mbp.on::after{box-shadow:0 0 8px var(--mc)!important}
${S} .mbp i{color:inherit!important}

/* makrá */
${S} .mtile{border-radius:22px!important}
${S} .mt-b{background:rgba(7,30,40,.08)!important;border:0!important;border-radius:6px!important;height:8px!important;overflow:hidden;box-shadow:inset 0 1px 2px rgba(7,30,40,.08)}
${S} .mt-b i{border:0!important;border-radius:6px}
${S} .mt-b i::after{display:none!important}

/* tlačidlá a prepínače */
${S} .btn{border:var(--gl-b)!important;background:rgba(255,255,255,.62)!important;color:#0B1512!important;box-shadow:var(--gl-sh)!important}
${S} .btn.primary{background:var(--dk)!important;color:#fff!important;border-color:rgba(255,255,255,.14)!important;box-shadow:0 1px 0 rgba(255,255,255,.12) inset,0 14px 26px -12px rgba(0,0,0,.6)!important}
${S} .seg,${S} .pg-per{background:rgba(7,30,40,.08)!important;border:0!important;box-shadow:inset 0 1px 2px rgba(7,30,40,.1)!important}
${S} .seg button,${S} .seg a,${S} .pg-per button{color:#2A3A36!important}
${S} .seg .on,${S} .seg button.on,${S} .seg a.on,${S} .pg-per button.on{background:#fff!important;color:#0B1512!important;box-shadow:0 1px 0 #fff inset,0 6px 14px -6px rgba(7,30,40,.35)!important;transform:none!important}
${S} .seg .on *,${S} .pg-per button.on *{color:#0B1512!important}
${S} .lvl button{background:var(--gl)!important;border:var(--gl-b)!important;box-shadow:var(--gl-sh)!important;color:#0B1512!important}
${S} .lvl button.on{background:var(--dk)!important;color:#fff!important;border-color:rgba(255,255,255,.14)!important}
${S} .lvl button.on small,${S} .lvl button.on .lv-t small{color:#9FB0AB!important}
${S} .lvl button.on .lv-ic{background:var(--ck-grad)!important}
${S} .chip,${S} .pill{border:0!important}
${S} .ml-add{box-shadow:0 8px 16px -8px rgba(0,0,0,.35)!important}
${S} textarea,${S} .input{background:rgba(255,255,255,.62)!important;border:var(--gl-b)!important;box-shadow:inset 0 1px 3px rgba(7,30,40,.08)!important;color:#0B1512!important}

/* lišta a plusko */
${S} .nav{background:var(--dk)!important;border:1px solid rgba(255,255,255,.14)!important;box-shadow:0 1px 0 rgba(255,255,255,.12) inset,0 20px 40px -18px rgba(0,0,0,.7)!important}
${S} .nav a{color:#8A9B96!important}
${S} .nav a.on{color:#7CFFB2!important}
${S} .nav a.on .ic{background:var(--ck-grad)!important;color:#07110F!important;box-shadow:0 8px 18px -8px rgba(62,230,208,.8),0 1px 0 rgba(255,255,255,.6) inset}
${S} .nav a.on .ic svg{color:#07110F!important}
${S} .nav-lens{display:none!important}
${S} .qa-fab{background:linear-gradient(140deg,#8FFFC6,#3EE6D0 55%,#5BB8FF)!important;border:0!important;color:#07110F!important;
 box-shadow:0 2px 0 rgba(255,255,255,.7) inset,0 -6px 14px rgba(0,80,120,.18) inset,0 16px 30px -10px rgba(24,150,160,.75)!important}
${S} .qa-fab svg{color:#07110F!important;stroke:#07110F}
${S} .bd-fab{box-shadow:0 10px 22px -10px rgba(7,30,40,.55)!important}

/* plusko: rýchly zápis */
${S} .qa-ov{background:linear-gradient(170deg,rgba(143,255,198,.96),rgba(74,233,214,.96) 48%,rgba(88,178,255,.96))!important;-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}
${S} .qa-in .qa-m{background:linear-gradient(180deg,color-mix(in srgb,var(--c,#7CFFB2) 10%,#fff),color-mix(in srgb,var(--c,#7CFFB2) 26%,#fff))!important;border:var(--gl-b)!important;box-shadow:0 1px 0 #fff inset,0 12px 22px -12px var(--c,rgba(7,30,40,.4))!important}
${S} .qa-in .fq,${S} .qa-in .qa-w,${S} .qa-in .qa-t:not(.qa-hero .qa-t){background:var(--gl)!important;border:var(--gl-b)!important;box-shadow:var(--gl-sh)!important}
${S} .qa-hero{box-shadow:0 30px 60px -28px rgba(30,20,120,.6)!important}
${S} .qa-lb{color:#2A3A36!important;font-weight:700}

/* štatistiky váhy */
${S} .grid3 .stat{border-radius:22px!important;padding:12px 12px 11px!important}
${S} .grid3 .stat::before{content:'';display:block;width:8px;height:8px;border-radius:50%;margin-bottom:8px}
${S} .grid3 .stat:nth-child(1)::before{background:#22C987;box-shadow:0 0 8px #22C987}
${S} .grid3 .stat:nth-child(2)::before{background:#2A86E6;box-shadow:0 0 8px #2A86E6}
${S} .grid3 .stat:nth-child(3)::before{background:#DFA367;box-shadow:0 0 8px #DFA367}
${S} .grid3 .stat b{font-size:26px!important}
${S} .grid3 .stat span{color:#5B6D68!important;font-weight:600}
${S} .pos{color:#117A50!important}

/* graf váhy */
${S} svg.chart .trend{stroke:url(#ckWl)!important;stroke-width:4!important;fill:none!important;filter:drop-shadow(0 6px 6px rgba(34,201,135,.35))}
${S} svg.chart .raw{fill:#fff!important;stroke:rgba(7,30,40,.35)!important;stroke-width:1.4!important;opacity:1!important}
${S} svg.chart .grid{stroke:rgba(7,30,40,.1)!important;stroke-dasharray:3 5}
${S} svg.chart .lbl{fill:#5B6D68!important;font-weight:600}
${S} svg.chart .ck-area{fill:url(#ckWg)}
${S} svg.chart .ck-end{fill:#fff;stroke:#22C987;stroke-width:3;filter:drop-shadow(0 4px 6px rgba(34,201,135,.45))}
${S} svg.chart .ck-end2{display:none}

/* Pokrok */
${S} .pgx-rings,${S} .pgx-chart{--accent:#22C987}
${S} .pgx-area{fill:rgba(62,230,208,.3)!important}
${S} .pgx-line{stroke:#22C987!important;stroke-width:3.8!important;filter:drop-shadow(0 6px 6px rgba(34,201,135,.35))!important}
${S} .pgx-proj{stroke:#22C987!important}

/* panel Upraviť Dnes */
${S} .tde-s{background:rgba(240,252,248,.94)!important;-webkit-backdrop-filter:blur(24px);backdrop-filter:blur(24px)}
${S} .tde-r{background:var(--gl)!important;border:var(--gl-b)!important;box-shadow:var(--gl-sh)!important}
${S} .tde-r.drag{border-color:#3EE6D0!important}
${S} .td-editlink{border:var(--gl-b)!important;color:#2A3A36!important;background:rgba(255,255,255,.4)!important}
`;

// ---------- sušienka v kruhu kalórií ----------
const NS = 'http://www.w3.org/2000/svg';
const CHIPS = [[-24, -8, 4.6, 3.8], [-6, -34, 4, 3.2], [0, 37, 4.2, 3.4], [34, 10, 3.8, 3], [-34, 20, 3.4, 2.7], [30, -28, 3.6, 2.9], [22, 32, 3, 2.4], [-36, -24, 3, 2.4], [38, -6, 2.6, 2.1], [-18, 35, 2.8, 2.2], [-12, -16, 2.6, 2.1], [14, 18, 2.4, 2]];
let uid = 0;
function cookieSvg(pct) {
  const k = Math.max(0, Math.min(1, pct / 100)), id = 'ck' + (++uid);
  const ang = k * 360, bites = [], inner = [], crumbs = [];
  // odhryznutia pozdĺž zjedenej časti (od vrchu v smere hodín)
  if (k > 0.005) {
    const step = 19;
    for (let a = -90 + step * 0.45; a < -90 + ang + step * 0.3; a += step) {
      const x = 38.5 * Math.cos(a * Math.PI / 180), y = 38.5 * Math.sin(a * Math.PI / 180);
      bites.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="14.5"/>`);
      inner.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="12"/>`);
    }
    // omrvinky: deterministicky podľa percenta, aby pri prekreslení neskákali
    let s = 7 + Math.round(k * 100);
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const n = Math.min(11, 4 + Math.round(k * 10));
    for (let i = 0, t = 0; i < n && t < 80; t++) {
      const a = -84 + rnd() * Math.max(10, ang - 4), rr = 48 + rnd() * 9;
      const x = rr * Math.cos(a * Math.PI / 180), y = rr * Math.sin(a * Math.PI / 180);
      if (y > 42) continue;
      i++;
      const sz = 0.9 + rnd() * 1.2, col = ['#C98A50', '#DFA367', '#9D5F2E', '#E9BE86'][Math.floor(rnd() * 4)];
      crumbs.push(`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${sz.toFixed(1)}" ry="${(sz * 0.7).toFixed(1)}" transform="rotate(${Math.round(rnd() * 120 - 60)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${col}"/>`);
    }
  }
  const full = k >= 0.995;
  return `<svg class="ck-ring" viewBox="-50 -50 100 100" aria-hidden="true" xmlns="${NS}">
  <defs>
   <radialGradient id="${id}g" cx=".4" cy=".32" r=".8"><stop offset="0" stop-color="#F7D4A4"/><stop offset=".45" stop-color="#DFA367"/><stop offset=".85" stop-color="#B4723A"/><stop offset="1" stop-color="#95582A"/></radialGradient>
   <radialGradient id="${id}h" cx=".32" cy=".22" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
   <radialGradient id="${id}c" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#5A3520"/><stop offset="1" stop-color="#2A1609"/></radialGradient>
   <radialGradient id="${id}i" cx=".5" cy=".5" r=".5"><stop offset=".6" stop-color="#F4D9B0"/><stop offset="1" stop-color="#E7BE85"/></radialGradient>
   <radialGradient id="${id}t" cx=".4" cy=".3" r=".75"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#EEF6F4"/></radialGradient>
   <mask id="${id}m" maskUnits="userSpaceOnUse" x="-70" y="-70" width="140" height="140"><rect x="-70" y="-70" width="140" height="140" fill="#fff"/><g fill="#000">${bites.join('')}</g></mask>
   <mask id="${id}n" maskUnits="userSpaceOnUse" x="-70" y="-70" width="140" height="140"><rect x="-70" y="-70" width="140" height="140" fill="#fff"/><g fill="#000">${inner.join('')}</g></mask>
   <filter id="${id}s" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#5A3016" flood-opacity=".36"/></filter>
   <filter id="${id}d" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#5A3016" flood-opacity=".26"/></filter>
  </defs>
  <circle r="45" fill="none" stroke="rgba(7,30,40,.14)" stroke-width="1.2" stroke-dasharray="1.4 2.8"/>
  ${full ? '' : `<g filter="url(#${id}s)">
   <g mask="url(#${id}n)"><circle r="45" fill="url(#${id}i)"/></g>
   <g mask="url(#${id}m)"><circle r="45" fill="url(#${id}g)"/><circle r="45" fill="url(#${id}h)"/><circle r="40" fill="none" stroke="#9D5F2E" stroke-width="2" opacity=".35"/>
    <g fill="url(#${id}c)">${CHIPS.map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>`).join('')}</g>
    <g fill="#fff" opacity=".35">${CHIPS.slice(0, 6).map(([x, y, rx]) => `<ellipse cx="${x - 1}" cy="${y - 1.4}" rx="${(rx * 0.35).toFixed(1)}" ry="${(rx * 0.22).toFixed(1)}"/>`).join('')}</g></g>
  </g>`}
  <g>${crumbs.join('')}</g>
  <circle r="29.5" fill="url(#${id}t)" filter="url(#${id}d)"/>
  <circle r="29.5" fill="none" stroke="rgba(255,255,255,.9)" stroke-width=".8"/>
 </svg>`;
}
function paintRing() {
  if (H.dataset.skin !== 'cookie') return;
  document.querySelectorAll('#app .hk-ring').forEach(r => {
    const lv = Number(r.dataset.lv) || 0;
    const cur = r.querySelector(':scope > .ck-ring');
    if (cur && cur.dataset.lv === String(lv)) return;
    cur?.remove();
    r.insertAdjacentHTML('afterbegin', cookieSvg(lv));
    r.querySelector(':scope > .ck-ring').dataset.lv = String(lv);
  });
}

// ---------- automatické sklenené karty ----------
// Obrazoviek je veľa a karty majú rôzne triedy. V Sušienke preto karty aj na zriedkavejších obrazovkách nájdeme podľa vzhľadu:
// svetlé pozadie, zaoblené rohy, rozumná veľkosť. Dostanú sklenený vzhľad. Vnorené karty v karte dostanú jemnejšiu verziu.
const MANUAL = '.card,.hero-k,.mtile,.ml,#wx,#sp,.duo>*,.fwdk-t>*,.shop-card,.fr-card,.tip,details.an,.pg-card,.tile,.dc-t,.dc-i,.qk-b,.wc-card,.rp-card,.rd-card,.ci,.lvl button,.pfx-hero,.pfx-plan,.pfx-tiles>*,.seg,.pg-per,.mbp,.tdh-cal,.tdh-streak,.btn';
const seen = new WeakSet();
// farba môže prísť ako rgb(...) alebo color(srgb 0..1) (výsledok color-mix)
const light = c => {
  let m = c.match(/rgba?\(([^)]+)\)/), k = 1;
  if (!m) { m = c.match(/color\(srgb ([^)]+)\)/); k = 255; }
  if (!m) return false;
  const v = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  const [r, g, b] = v.slice(0, 3).map(x => x * k), a = v[3] == null ? 1 : v[3];
  return a > 0.15 && (0.2126 * r + 0.7152 * g + 0.0722 * b) > 205;
};
function scanCards() {
  if (H.dataset.skin !== 'cookie') return;
  const vw = innerWidth;
  document.querySelectorAll('#app .screen, .sheet-bg > *, .tde-s, .qa-in').forEach(root => {
    root.querySelectorAll('div,section,article,a,button,li,label,details,aside,form').forEach(el => {
      if (seen.has(el)) return;
      const w = el.offsetWidth, h = el.offsetHeight;
      if (!w || !h) return; // ešte nevykreslené: skúsime pri ďalšom prechode
      seen.add(el);
      if (el.closest('.nav,.ck-ring,.hk-ring')) return;
      if (w < 84 || h < 42 || w > vw * 0.95) return;
      if (el.matches(MANUAL)) return;
      const cs = getComputedStyle(el);
      if (parseFloat(cs.borderTopLeftRadius) < 11 || cs.position === 'fixed' || cs.borderTopStyle === 'dashed') return;
      const bgi = cs.backgroundImage;
      if (!light(cs.backgroundColor) && !(bgi.includes('gradient') && (bgi.match(/(rgba?|color)\([^)]+\)/g) || []).some(light))) return;
      const host = el.parentElement?.closest('.ck-c,' + MANUAL);
      el.classList.add('ck-c');
      if (host && root.contains(host)) el.classList.add('ck-in');
      else if (w > 250) el.classList.add('ck-l');
    });
  });
}

// graf váhy: plocha pod trendom a výrazný posledný bod (len vizuál, dáta sa nemenia)
function paintCharts() {
  if (H.dataset.skin !== 'cookie') return;
  document.querySelectorAll('#app svg.chart').forEach(svg => {
    if (svg.querySelector('.ck-area')) return;
    const tp = svg.querySelector('.trend'); if (!tp) return;
    const pts = (tp.getAttribute('d') || '').match(/-?[\d.]+,-?[\d.]+/g); if (!pts || pts.length < 2) return;
    const vb = (svg.getAttribute('viewBox') || '').split(/\s+/).map(Number), bottom = (vb[3] || 190) - 24;
    const [fx] = pts[0].split(',').map(Number), [lx, ly] = pts[pts.length - 1].split(',').map(Number);
    const NS = 'http://www.w3.org/2000/svg';
    const defs = document.createElementNS(NS, 'defs');
    defs.innerHTML = '<linearGradient id="ckWg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3EE6D0" stop-opacity=".5"/><stop offset="1" stop-color="#5BB8FF" stop-opacity="0"/></linearGradient><linearGradient id="ckWl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7CFFB2"/><stop offset=".5" stop-color="#22C987"/><stop offset="1" stop-color="#3EE6D0"/></linearGradient>';
    const area = document.createElementNS(NS, 'path');
    area.setAttribute('class', 'ck-area'); area.setAttribute('d', `${tp.getAttribute('d')} L${lx},${bottom} L${fx},${bottom} Z`);
    svg.insertBefore(defs, svg.firstChild); tp.before(area);
    const e1 = document.createElementNS(NS, 'circle'); e1.setAttribute('class', 'ck-end'); e1.setAttribute('cx', lx); e1.setAttribute('cy', ly); e1.setAttribute('r', 7);
    const e2 = document.createElementNS(NS, 'circle'); e2.setAttribute('class', 'ck-end2'); e2.setAttribute('cx', lx); e2.setAttribute('cy', ly); e2.setAttribute('r', 3.5);
    svg.append(e1, e2);
  });
}

// ---------- zapnutie ----------
let style = null, font = null;
function apply() {
  const sk = get();
  if (sk === 'cookie') {
    H.dataset.skin = 'cookie';
    if (!style) { style = document.createElement('style'); style.dataset.fwLight = ''; style.dataset.skin = ''; style.textContent = CSS; }
    if (!style.isConnected) document.head.appendChild(style);
    if (!font) {
      font = document.createElement('link'); font.rel = 'stylesheet';
      font.href = 'https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,600;0,700;0,800;1,800;1,900&display=swap';
      document.head.appendChild(font);
    }
    let m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = '#8CFBC6';
    paintRing(); scanCards(); paintCharts();
  } else {
    delete H.dataset.skin;
    style?.remove();
    document.querySelectorAll('.ck-ring,.ck-area,.ck-end,.ck-end2').forEach(e => e.remove());
    document.querySelectorAll('.ck-c').forEach(e => e.classList.remove('ck-c', 'ck-l', 'ck-in'));
  }
}
export function getSkin() { return get(); }
export function setSkin(v) {
  try {
    if (v === 'cookie') {
      if (get() !== 'cookie') localStorage.setItem(PREV, getMode());
      localStorage.setItem(KEY, 'cookie');
      setMode('light');
    } else {
      localStorage.setItem(KEY, 'classic');
      const p = localStorage.getItem(PREV); if (p) setMode(p);
    }
  } catch (_) { }
  apply();
  try { window.fwTrack?.('skin_set', { v }); } catch (_) { }
}

// ---------- výber v Profile (pridá sa do karty Vzhľad) ----------
// náhľady vzhľadov: štýl mimo prevodu svetlého režimu (inak by tmavý náhľad zosvetlel)
const pst = document.createElement('style'); pst.dataset.fwLight = '';
pst.textContent = `.sk-sw{display:block;width:100%;height:54px;border-radius:12px;margin-bottom:8px}
.sk-sw.c{background:linear-gradient(160deg,#171C24,#0B0E12);box-shadow:inset 0 0 0 1px rgba(255,255,255,.14)}
.sk-sw.k{background:linear-gradient(135deg,#7CFFB2,#3EE6D0 50%,#5BB8FF);box-shadow:inset 0 0 0 2.5px #0D1117}`;
document.head.appendChild(pst);
const SW = k => `<i class="sk-sw ${k}"></i>`;
function profileUi() {
  const card = document.querySelector('#fwTheme'); if (!card || card.querySelector('#fwSkin')) return;
  const box = document.createElement('div'); box.id = 'fwSkin'; box.style.margin = '10px 0 12px';
  box.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
    <button type="button" data-sk="classic" class="sk-o" style="all:unset;cursor:pointer;padding:8px;border-radius:16px;text-align:center;font-weight:700;font-size:13px">${SW('c')}Klasický</button>
    <button type="button" data-sk="cookie" class="sk-o" style="all:unset;cursor:pointer;padding:8px;border-radius:16px;text-align:center;font-weight:700;font-size:13px">${SW('k')}Sušienka</button>
  </div>`;
  const seg = card.querySelector('.seg');
  card.insertBefore(box, seg);
  const note = document.createElement('p'); note.className = 'muted small'; note.id = 'fwSkinNote'; note.style.margin = '8px 2px 0';
  note.textContent = 'Sušienka je svetlý vzhľad podľa ikony appky. Tmavá verzia príde neskôr.';
  const mark = () => {
    const sk = get();
    box.querySelectorAll('[data-sk]').forEach(b => { const on = b.dataset.sk === sk; b.style.outline = on ? '2.5px solid var(--accent)' : '1px solid var(--line)'; b.setAttribute('aria-pressed', String(on)); });
    seg.style.display = sk === 'cookie' ? 'none' : '';
    card.querySelectorAll(':scope > p.muted').forEach(p => { if (p !== note) p.style.display = sk === 'cookie' ? 'none' : ''; });
    if (sk === 'cookie') { if (!note.isConnected) seg.after(note); } else note.remove();
  };
  box.querySelectorAll('[data-sk]').forEach(b => b.onclick = () => { setSkin(b.dataset.sk); mark(); });
  mark();
}

apply();
const app = document.getElementById('app');
if (app) {
  let q = 0;
  const mo = new MutationObserver(() => { if (q) return; q = requestAnimationFrame(() => { q = 0; paintRing(); paintCharts(); profileUi(); setTimeout(scanCards, 60); setTimeout(scanCards, 600); }); });
  mo.observe(app, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-lv'] });
  mo.observe(document.body, { childList: true }); // spodné panely sa vkladajú priamo do body
}
