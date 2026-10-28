// Vzhľady appky. „Klasický“ = pôvodný tmavý/svetlý dizajn. „Sušienka“ = svetlý vzhľad podľa ikony GainTrain:
// gradient z ikony (mätová, tyrkysová, modrá), karty ako nálepky (biele, hrubý čierny obrys, tvrdý tieň),
// hrubé šikmé čísla a nadpisy, a kruh kalórií ako sušienka, z ktorej ubúda, čo zješ.
// Rozloženie obrazoviek sa nemení, mení sa len vzhľad. Voľba sa uloží v telefóne (fw_skin) a vyberá sa v Profile pri Vzhľade.
// Sušienka je svetlá: pri jej zapnutí sa svetlý režim zapne sám a pri návrate na Klasický sa vráti pôvodná voľba.
import { getMode, setMode } from './theme.js';

const KEY = 'fw_skin', PREV = 'fw_skin_prev_mode';
const H = document.documentElement;
const get = () => { try { return localStorage.getItem(KEY) === 'cookie' ? 'cookie' : 'classic'; } catch (_) { return 'classic'; } };
const S = 'html[data-skin=cookie]';

const CSS = `
${S}{--bg:transparent;--bg-2:#EAF8F4;--card:#FFFFFF;--card-2:#F3FBF8;--line:rgba(13,17,23,.16);--text:#0D1117;--muted:#4E5A64;
 --accent:#0D1117;--accent-ink:#7CFFB2;--accent-2:#D9955A;--protein:#1FBF76;--carbs:#2F8FE8;--fat:#D9955A;--danger:#E0344F;
 --ink:#0D1117;--ck-grad:linear-gradient(135deg,#7CFFB2 0%,#3EE6D0 50%,#5BB8FF 100%);--ck-sh:4px 4px 0 #0D1117;--ck-b:2.5px solid #0D1117;--track:#E3ECEA;color-scheme:light}
${S},${S} body{background:#5BE0D0 linear-gradient(165deg,#93FFC5 0%,#54ECD8 45%,#63BEFF 100%) fixed!important;min-height:100%}
${S} body::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:0;background:
 radial-gradient(75% 38% at 8% 0%,rgba(255,255,255,.66),rgba(255,255,255,0) 62%),
 radial-gradient(55% 32% at 108% 30%,rgba(255,255,255,.32),rgba(255,255,255,0) 70%),
 radial-gradient(80% 45% at 50% 108%,rgba(40,110,230,.26),rgba(40,110,230,0) 70%)}
${S} #app{position:relative;z-index:1}
${S} body::after{display:none!important}

/* písmo: hrubé šikmé na nadpisy a čísla */
${S} .screen h1,${S} .tdh-g,${S} .hk-c b,${S} .hk-eat b,${S} .mtile b,${S} .disp-ck{font-family:'Inter','Sora',system-ui,sans-serif;font-weight:900;font-style:italic;letter-spacing:-.035em}
${S} .screen h2{font-family:'Inter','Sora',system-ui,sans-serif;font-weight:800;letter-spacing:-.02em}

/* karty ako nálepky */
${S} .card,${S} .mtile,${S} .ml,${S} #wx,${S} #sp,${S} .duo>*,${S} .fwdk-t>*,${S} .shop-card,${S} .fr-card,${S} #dxdash,${S} .tip,
${S} details.an,${S} .pg-card,${S} .tile,${S} .dc-t,${S} .dc-i,${S} .qk-b,${S} .wc-card,${S} .rp-card,${S} .rd-card,${S} .ci{
 background:#fff!important;border:var(--ck-b)!important;box-shadow:var(--ck-sh)!important;color:var(--text)}
${S} .card.accent{background:#FFF1DE!important}
${S} .hero-k{background:#fff!important;border:3px solid #0D1117!important;box-shadow:6px 6px 0 #0D1117!important;border-radius:30px!important}
${S} .hero-k::before,${S} .hero-k::after{display:none!important}
${S} .muted,${S} .small.muted{color:var(--muted)!important}

/* hlavička Dnes */
${S} .tdh-cal,${S} .tdh-s{background:#fff!important;border:2px solid #0D1117!important;color:#0D1117!important;box-shadow:2px 2px 0 #0D1117}
${S} .tdh-cal .cal-ic{background:#0D1117!important}
${S} .tdh-cal .cal-ic b{color:#fff!important}
${S} .tdh-streak{background:#FFF1DE!important;border:2px solid #0D1117!important;color:#C04E12!important;box-shadow:2px 2px 0 #0D1117!important}
${S} .tdh-streak::after{display:none!important}
${S} .tdh-edit{color:#0D1117}

/* týždeň */
${S} .wk-d.hit .wk-r::before{background:#7CFFB2!important;box-shadow:inset 0 0 0 2.5px #0D1117!important}
${S} .wk-d.hit .wk-r b{color:#0D1117!important}
${S} .wk-d.now{background:#0D1117!important;border-radius:18px}
${S} .wk-d.now .wk-l{color:#7CFFB2!important}
${S} .wk-d.now .wk-r b{color:#fff!important}
${S} .wk-d .wk-l{color:#0D1117!important;font-weight:800}
${S} .rg-track{stroke:rgba(13,17,23,.18)!important}

/* kruh kalórií = sušienka */
${S} .hk-ring .hk-rings,${S} .hk-ring .breath{display:none!important}
${S} .screen.td .hk-ring::before,${S} .screen.td .hk-ring::after{display:none!important}
${S} .ck-ring{position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;pointer-events:none}
${S} .hk-c{z-index:1}
${S} .hk-c b{font-size:44px!important;color:#0D1117}
${S} .hk-c span{color:#3E4A55!important;font-weight:700}
${S} .hk-pc{background:#7CFFB2!important;color:#0D1117!important;border:2px solid #0D1117;font-style:normal;font-weight:800}
${S} .hero-k.over .hk-pc{background:#FFD3D3!important}
${S} .hk-t{color:#0D1117!important;font-weight:800}
${S} .hk-edit{background:#0D1117!important;color:#7CFFB2!important;border:0!important}
${S} .hk-eat span{color:#3E4A55!important}

/* jedlá dňa pod kruhom */
${S} .mbp{background:#fff!important;border:2px dashed #0D1117!important;color:#0D1117!important}
${S} .mbp.on{background:#E6FFF1!important;border-style:solid!important;box-shadow:2px 2px 0 #0D1117!important}
${S} .mbp i{color:#0D1117!important}

/* makrá */
${S} .mtile{border-radius:18px!important;box-shadow:3px 3px 0 #0D1117!important}
${S} .hk-macros .mtile:nth-child(1){background:#E6FFF1!important}
${S} .hk-macros .mtile:nth-child(2){background:#E7F3FF!important}
${S} .hk-macros .mtile:nth-child(3){background:#FFF1E0!important}
${S} .mt-b{background:#E8EFEE!important;border:2px solid #0D1117;border-radius:6px!important;height:10px!important;overflow:hidden}
${S} .mt-b i{border-right:2px solid #0D1117}
${S} .mt-b i::after{display:none!important}

/* tlačidlá, prepínače, polia */
${S} .btn{border:2px solid #0D1117!important;background:#fff!important;color:#0D1117!important;box-shadow:3px 3px 0 #0D1117}
${S} .btn.primary{background:#0D1117!important;color:#7CFFB2!important}
${S} .seg{background:#fff!important;border:2.5px solid #0D1117!important;box-shadow:3px 3px 0 #0D1117}
${S} .seg .on,${S} .seg button.on,${S} .seg a.on{background:var(--ck-grad)!important;color:#0D1117!important;box-shadow:inset 0 0 0 2px #0D1117!important;transform:none!important}
${S} .seg .on *{color:#0D1117!important}
${S} .pg-per{background:#fff!important;border:2.5px solid #0D1117!important;box-shadow:3px 3px 0 #0D1117!important}
${S} .pg-per button{color:#3E4A55!important}
${S} .pg-per button.on{background:var(--ck-grad)!important;color:#0D1117!important;box-shadow:inset 0 0 0 2px #0D1117!important}
${S} .pg-per button.on *{color:#0D1117!important}
${S} .lvl button{background:#fff!important;border:2.5px solid #0D1117!important;box-shadow:3px 3px 0 #0D1117!important;color:#0D1117!important}
${S} .lvl button.on{background:#0D1117!important;color:#fff!important}
${S} .lvl button.on small,${S} .lvl button.on .lv-t small{color:#B8C3CC!important}
${S} .lvl button.on .lv-ic{background:var(--ck-grad)!important}
${S} .pfx-hero,${S} .pfx-plan,${S} .pfx-tiles>*,${S} .pg-card,${S} .rp-card{background:#fff!important;border:2.5px solid #0D1117!important;box-shadow:4px 4px 0 #0D1117!important}
${S} .pfx-hero{border-width:3px!important;box-shadow:6px 6px 0 #0D1117!important}
${S} .pfx-hero::before{display:none!important}
${S} .rp-card{background:#FFF1DE!important}
${S} .chip,${S} .pill{border:2px solid #0D1117!important}

/* lišta a plusko */
${S} .nav{background:#0D1117!important;border:0!important;box-shadow:0 12px 26px rgba(13,17,23,.38),inset 0 1px 0 rgba(255,255,255,.1)!important}
${S} .nav a{color:#8E99A4!important}
${S} .nav a.on{color:#7CFFB2!important}
${S} .nav a.on .ic{background:var(--ck-grad)!important;color:#0D1117!important;box-shadow:inset 0 0 0 2px #0D1117}
${S} .nav a.on .ic svg{color:#0D1117!important}
${S} .nav-lens{display:none!important}
${S} .qa-fab{background:var(--ck-grad)!important;border:3px solid #0D1117!important;box-shadow:4px 4px 0 #0D1117!important;color:#0D1117!important}
${S} .qa-fab svg{color:#0D1117!important;stroke:#0D1117}
${S} .bd-fab{border-radius:50%!important;box-shadow:0 0 0 2.5px #0D1117,3px 3px 0 2.5px #0D1117!important}

/* panel Upraviť Dnes */
${S} .tde-s{background:#F3FBF8}
${S} .tde-r{border:2px solid #0D1117!important;box-shadow:2px 2px 0 #0D1117}
${S} .td-editlink{border-color:#0D1117!important;color:#0D1117!important;background:rgba(255,255,255,.5)!important}
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
    const step = 20;
    for (let a = -90 + step * 0.45; a < -90 + ang + step * 0.3; a += step) {
      const x = 39 * Math.cos(a * Math.PI / 180), y = 39 * Math.sin(a * Math.PI / 180);
      bites.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="14.8"/>`);
      inner.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="11.8"/>`);
    }
    // omrvinky: deterministicky podľa percenta, aby pri prekreslení neskákali
    let s = 7 + Math.round(k * 100);
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const n = Math.min(9, 3 + Math.round(k * 10));
    for (let i = 0, t = 0; i < n && t < 60; t++) {
      const a = -86 + rnd() * Math.max(10, ang - 2), rr = 49.5 + rnd() * 7;
      const x = rr * Math.cos(a * Math.PI / 180), y = rr * Math.sin(a * Math.PI / 180);
      if (y > 44) continue;
      i++;
      const col = ['#A9622F', '#7A4220', '#DE9B5E', '#3A2214'][Math.floor(rnd() * 4)];
      crumbs.push(`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(1.2 + rnd()).toFixed(1)}" ry="${(0.8 + rnd() * 0.5).toFixed(1)}" transform="rotate(${Math.round(rnd() * 100 - 50)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${col}"/>`);
    }
  }
  const full = k >= 0.995;
  return `<svg class="ck-ring" viewBox="-50 -50 100 100" aria-hidden="true" xmlns="${NS}">
  <defs>
   <radialGradient id="${id}g" cx=".36" cy=".3" r=".85"><stop offset="0" stop-color="#F8D29A"/><stop offset=".5" stop-color="#DE9B5E"/><stop offset="1" stop-color="#A9622F"/></radialGradient>
   <mask id="${id}m" maskUnits="userSpaceOnUse" x="-70" y="-70" width="140" height="140"><rect x="-70" y="-70" width="140" height="140" fill="#fff"/><g fill="#000">${bites.join('')}</g></mask>
   <mask id="${id}n" maskUnits="userSpaceOnUse" x="-70" y="-70" width="140" height="140"><rect x="-70" y="-70" width="140" height="140" fill="#fff"/><g fill="#000">${inner.join('')}</g></mask>
   <filter id="${id}s" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="2.4" dy="2.8" stdDeviation="0" flood-color="#0D1117" flood-opacity="1"/></filter>
  </defs>
  <circle r="44" fill="none" stroke="#0D1117" stroke-width="1.1" stroke-dasharray="1.6 2.6" opacity=".35"/>
  ${full ? '' : `<g filter="url(#${id}s)">
   <g mask="url(#${id}n)"><circle r="46" fill="#0D1117"/><circle r="43.6" fill="#F3D3A6"/><circle r="31.6" fill="#0D1117"/><circle r="30" fill="#fff"/></g>
   <g mask="url(#${id}m)"><circle r="46" fill="#0D1117"/><circle r="43.5" fill="url(#${id}g)"/><circle r="38" fill="none" stroke="#B06A33" stroke-width="2.2" opacity=".55"/>
    <g fill="#3A2214">${CHIPS.map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>`).join('')}</g>
    <g fill="#FFE3B8" opacity=".55"><circle cx="-28" cy="-30" r="1.4"/><circle cx="14" cy="-38" r="1.1"/><circle cx="-40" cy="4" r="1"/></g></g>
  </g>`}
  <g>${crumbs.join('')}</g>
  <circle r="30" fill="#fff" stroke="#0D1117" stroke-width="1.8"/>
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
    paintRing();
  } else {
    delete H.dataset.skin;
    style?.remove();
    document.querySelectorAll('.ck-ring').forEach(e => e.remove());
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
  new MutationObserver(() => { if (q) return; q = requestAnimationFrame(() => { q = 0; paintRing(); profileUi(); }); }).observe(app, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-lv'] });
}
