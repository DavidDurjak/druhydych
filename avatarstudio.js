// Avatar štúdio (v313). Vlastný editor avatara priamo v appke (bez prihlasovania do inej služby), štýlom ako Messenger:
// hore veľký náhľad, dole kategórie (Štýl, Postava, Tvár, Vlasy, Oblečenie, Doplnky, Pozadie) s farbami a voľbami.
// Avatara nakreslí AI na serveri (funkcia avatar-gen) z vybraných volieb, voliteľne podľa tvojej fotky, aby sa ti podobal.
// Úpravy hotového avatara držia rovnakú tvár (pošle sa predchádzajúca verzia a len zmenené voľby). Verzie sa dajú porovnať a vybrať.
// Selfie sa nikde neukladá, do profilu ide len hotový avatar (512 × 512 JPEG cez uploadAvatarBlob).
import { sb } from './data.js';
import { ctx } from './app.js';
import { uploadAvatarBlob, uploadErr } from './avatarmaker.js';

const LIMIT = 8;
const SW = { // farby políčok (len náhľad voľby)
  skin: { s1: '#F6E0D3', s2: '#EECBB2', s3: '#E2B08E', s4: '#C99A6E', s5: '#B37E52', s6: '#94603B', s7: '#6E4428', s8: '#43281A' },
  eyes: { brown: '#7A4A26', dark: '#3B2214', hazel: '#8F7A3C', green: '#4E8A57', blue: '#4F86C6', gray: '#8E9BA6' },
  hairc: { black: '#16120F', dbrown: '#3A2518', brown: '#6B4426', auburn: '#8A3B1E', blond: '#D8B26A', platinum: '#ECE6D6', red: '#C2552A', gray: '#A7A39C' },
  color: { black: '#15171A', white: '#F4F4F2', gray: '#9AA0A8', navy: '#1F2D4D', green: '#0F6B4C', red: '#8E1F2A', beige: '#D5C2A2', pink: '#D69AA6' },
  bg: { studio: 'radial-gradient(circle at 50% 35%,#3a3f47,#15171b)', green: 'linear-gradient(160deg,#145c3f,#06120d)', gym: 'linear-gradient(160deg,#6b4a2a,#1c1510)', outdoor: 'linear-gradient(160deg,#e3b261,#4d6b3a)', light: 'linear-gradient(160deg,#f4f5f7,#c9ced6)' },
};
const HAIR_M = ['buzz', 'fade', 'crop', 'slick', 'side', 'medium', 'curly', 'long', 'locs', 'cornrows', 'afro', 'bald'];
const HAIR_F = ['long', 'wavy', 'pony', 'bun', 'bob', 'pixie', 'curly', 'braids', 'locs', 'afro', 'slick', 'buzz'];
const T = {
  style: { real3d: 'Realistický 3D', photo: 'Ako fotka', anim: 'Animovaný 3D' },
  gender: { m: 'Muž', f: 'Žena' },
  age: { a18: '18 až 24', a25: '25 až 34', a35: '35 až 44', a45: '45 až 54', a55: '55+' },
  build: { slim: 'Štíhla', fit: 'Atletická', muscular: 'Svalnatá', big: 'Mohutná' },
  skin: { s1: 'Veľmi svetlá', s2: 'Svetlá', s3: 'Svetlá teplá', s4: 'Olivová', s5: 'Opálená', s6: 'Svetlohnedá', s7: 'Hnedá', s8: 'Tmavá' },
  expr: { smile: 'Úsmev', soft: 'Jemný úsmev', serious: 'Sústredený' },
  eyes: { brown: 'Hnedé', dark: 'Tmavohnedé', hazel: 'Orieškové', green: 'Zelené', blue: 'Modré', gray: 'Sivé' },
  beard: { none: 'Bez brady', stubble: 'Strnisko', short: 'Krátka', full: 'Plná', goatee: 'Briadka', mustache: 'Fúzy' },
  hair: { buzz: 'Strojček', fade: 'Fade', crop: 'Krátky strih', slick: 'Dozadu', side: 'S pešinkou', medium: 'Stredne dlhé', curly: 'Kučeravé', long: 'Dlhé rovné', wavy: 'Dlhé vlnité', pony: 'Cop', bun: 'Drdol', bob: 'Mikádo', pixie: 'Pixie', braids: 'Vrkôčiky', cornrows: 'Cornrows', locs: 'Dredy', afro: 'Afro', bald: 'Holá hlava' },
  hairc: { black: 'Čierne', dbrown: 'Tmavohnedé', brown: 'Hnedé', auburn: 'Gaštanové', blond: 'Blond', platinum: 'Platinové', red: 'Ryšavé', gray: 'Šedivé' },
  outfit: { tee: 'Tričko', tank: 'Tielko', hoodie: 'Mikina', comp: 'Kompresné', zip: 'Bunda na zips', bra: 'Top a bunda' },
  color: { black: 'Čierna', white: 'Biela', gray: 'Sivá', navy: 'Tmavomodrá', green: 'Zelená', red: 'Bordová', beige: 'Béžová', pink: 'Ružová' },
  glasses: { none: 'Žiadne', square: 'Hranaté', round: 'Okrúhle', metal: 'Kovové', sun: 'Slnečné' },
  hat: { none: 'Nič', cap: 'Šiltovka', beanie: 'Čiapka', band: 'Čelenka' },
  extra: { none: 'Nič', chain: 'Retiazka', earrings: 'Náušnice', headphones: 'Slúchadlá' },
  bg: { green: 'Zelené', studio: 'Štúdio', gym: 'Posilňovňa', outdoor: 'Vonku', light: 'Svetlé' },
};
const STYLE_SUB = { real3d: 'Ako postava z modernej hry, realistická pleť a vlasy', photo: 'Vyzerá ako profesionálna fotka zo štúdia', anim: 'Ako z animovaného filmu, stále ľudský' };
const CATS = [
  { id: 'style', t: 'Štýl', g: [['style', 'Ako má avatar vyzerať']] },
  { id: 'body', t: 'Postava', g: [['gender', 'Pohlavie'], ['age', 'Vek'], ['build', 'Postava'], ['skin', 'Pleť']] },
  { id: 'face', t: 'Tvár', g: [['expr', 'Výraz'], ['eyes', 'Oči'], ['beard', 'Brada']] },
  { id: 'hair', t: 'Vlasy', g: [['hair', 'Účes'], ['hairc', 'Farba vlasov']] },
  { id: 'wear', t: 'Oblečenie', g: [['outfit', 'Oblečenie'], ['color', 'Farba']] },
  { id: 'acc', t: 'Doplnky', g: [['glasses', 'Okuliare'], ['hat', 'Na hlavu'], ['extra', 'Doplnky']] },
  { id: 'bg', t: 'Pozadie', g: [['bg', 'Pozadie']] },
];
const FACE_KEYS = ['gender', 'age', 'skin', 'expr', 'eyes', 'beard', 'hair', 'hairc', 'build'];
const STEPS = ['Skladám tvár…', 'Ladím pleť a oči…', 'Češem vlasy…', 'Obliekam…', 'Nasvecujem…', 'Posledné detaily…'];

const CSS = `
.avs{position:fixed;inset:0;z-index:90;display:flex;flex-direction:column;background:var(--bg);color:var(--text);animation:avsIn .28s cubic-bezier(.2,.8,.2,1) both}
@keyframes avsIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
.avs-top{flex:none;display:flex;align-items:center;gap:10px;padding:calc(env(safe-area-inset-top) + 8px) 14px 8px}
.avs-top b{flex:1;font-size:17px;font-weight:800;letter-spacing:-.02em}
.avs-ic{flex:none;width:38px;height:38px;border-radius:50%;border:1px solid var(--line);background:var(--card);color:var(--text);font-size:22px;line-height:1;display:grid;place-items:center;cursor:pointer}
.avs-use{flex:none;height:38px;padding:0 16px;border-radius:19px;border:0;background:var(--accent);color:var(--accent-ink,#06301A);font-weight:800;font-size:14px;cursor:pointer}
.avs-use:disabled{opacity:.35}
.avs-stage{flex:none;position:relative;display:flex;flex-direction:column;align-items:center;padding:6px 16px 10px}
.avs-pv{position:relative;width:min(58vw,250px);aspect-ratio:1;border-radius:50%;overflow:hidden;background:var(--avbg,linear-gradient(160deg,#145c3f,#06120d));box-shadow:0 24px 50px -24px rgba(0,0,0,.6),0 0 0 4px var(--card),0 0 0 5px var(--line);transition:background .3s}
.avs-pv img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;animation:avsPop .45s cubic-bezier(.2,.9,.25,1.2) both}
@keyframes avsPop{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:none}}
.avs-sil{position:absolute;inset:0}
.avs-sil svg{width:100%;height:100%;display:block}
.avs-busy{position:absolute;inset:0;display:grid;place-items:center;background:rgba(6,10,8,.45);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
.avs-busy::before{content:'';position:absolute;inset:-2px;border-radius:50%;background:conic-gradient(from 0deg,transparent 0 70%,var(--accent) 88%,transparent 100%);-webkit-mask:radial-gradient(circle,transparent calc(50% - 5px),#000 calc(50% - 4px));mask:radial-gradient(circle,transparent calc(50% - 5px),#000 calc(50% - 4px));animation:avsSpin 1.1s linear infinite}
@keyframes avsSpin{to{transform:rotate(360deg)}}
.avs-busy span{position:relative;color:#fff;font-weight:800;font-size:14px;text-align:center;padding:0 22px;text-shadow:0 1px 8px rgba(0,0,0,.6)}
.avs-hint{margin:10px 0 0;color:var(--muted);font-size:13px;text-align:center;min-height:18px}
.avs-self{display:flex;align-items:center;gap:8px;margin-top:10px}
.avs-chip{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 14px;border-radius:18px;border:1px solid var(--line);background:var(--card);color:var(--text);font-size:13.5px;font-weight:700;cursor:pointer;white-space:nowrap}
.avs-chip img{width:26px;height:26px;border-radius:50%;object-fit:cover;margin-left:-8px}
.avs-chip.on{border-color:color-mix(in srgb,var(--accent) 60%,transparent);background:color-mix(in srgb,var(--accent) 12%,var(--card))}
.avs-chip i{font-style:normal;color:var(--muted);font-size:16px;margin-right:-4px}
.avs-vers{display:flex;gap:8px;margin-top:10px;max-width:100%;overflow-x:auto;scrollbar-width:none;padding:2px}
.avs-vers::-webkit-scrollbar{display:none}
.avs-vers button{flex:none;width:44px;height:44px;border-radius:50%;padding:0;border:2px solid transparent;background:var(--card);overflow:hidden;cursor:pointer}
.avs-vers button.on{border-color:var(--accent)}
.avs-vers img{width:100%;height:100%;object-fit:cover;display:block}
.avs-panel{flex:1;min-height:0;display:flex;flex-direction:column;background:var(--card);border-top-left-radius:26px;border-top-right-radius:26px;border:1px solid var(--line);border-bottom:0;box-shadow:0 -12px 30px -18px rgba(0,0,0,.5)}
.avs-tabs{flex:none;display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;padding:12px 12px 8px}
.avs-tabs::-webkit-scrollbar{display:none}
.avs-tab{flex:none;height:36px;padding:0 14px;border-radius:18px;border:0;background:none;color:var(--muted);font-weight:800;font-size:14px;cursor:pointer;position:relative}
.avs-tab.on{background:var(--card-2);color:var(--text)}
.avs-tab.ch::after{content:'';position:absolute;top:7px;right:7px;width:6px;height:6px;border-radius:50%;background:var(--accent)}
.avs-body{flex:1;min-height:0;overflow-y:auto;padding:4px 16px 16px;-webkit-overflow-scrolling:touch}
.avs-g{margin-bottom:16px}
.avs-g h4{margin:0 0 8px;font-size:12.5px;font-weight:800;color:var(--muted);letter-spacing:.01em}
.avs-opts{display:flex;flex-wrap:wrap;gap:8px}
.avs-o{min-height:40px;padding:0 15px;border-radius:14px;border:1.5px solid var(--line);background:var(--bg-2,var(--card-2));color:var(--text);font-size:14px;font-weight:700;cursor:pointer}
.avs-o.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 14%,var(--bg-2,var(--card-2)))}
.avs-o.keep{border-style:dashed}
.avs-sw{display:grid;grid-template-columns:repeat(auto-fill,minmax(54px,1fr));gap:10px}
.avs-s{display:flex;flex-direction:column;align-items:center;gap:5px;border:0;background:none;color:var(--muted);font-size:11px;font-weight:700;cursor:pointer;padding:0}
.avs-s i{width:44px;height:44px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12),0 0 0 2px var(--card),0 0 0 3.5px transparent;transition:box-shadow .15s}
.avs-s.on{color:var(--text)}
.avs-s.on i{box-shadow:inset 0 0 0 1px rgba(0,0,0,.12),0 0 0 2px var(--card),0 0 0 4px var(--accent)}
.avs-s.keep i{background:repeating-linear-gradient(45deg,var(--card-2) 0 6px,var(--bg-2,var(--bg)) 6px 12px)}
.avs-st{display:grid;gap:8px}
.avs-st button{display:flex;align-items:center;gap:12px;text-align:left;padding:13px 14px;border-radius:16px;border:1.5px solid var(--line);background:var(--bg-2,var(--card-2));color:var(--text);cursor:pointer}
.avs-st button.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,var(--bg-2,var(--card-2)))}
.avs-st b{display:block;font-size:15px}.avs-st small{display:block;color:var(--muted);font-size:12.5px;margin-top:2px}
.avs-st i{flex:none;width:12px;height:12px;border-radius:50%;border:2px solid var(--muted)}
.avs-st .on i{border-color:var(--accent);background:var(--accent)}
.avs-foot{flex:none;padding:10px 16px calc(env(safe-area-inset-bottom) + 12px);background:var(--card);border-top:1px solid var(--line)}
.avs-go{width:100%;height:52px;border-radius:26px;border:0;background:var(--accent);color:var(--accent-ink,#06301A);font-size:16px;font-weight:800;cursor:pointer;box-shadow:0 10px 24px -12px color-mix(in srgb,var(--accent) 80%,transparent)}
.avs-go:disabled{opacity:.45}
.avs-left{margin:7px 0 0;text-align:center;color:var(--muted);font-size:12px}
.avs-err{margin:8px 0 0;text-align:center;color:var(--danger,#FF5C7A);font-size:13px;font-weight:700}
@media (min-height:760px){.avs-pv{width:min(62vw,270px)}}
@media (prefers-reduced-motion:reduce){.avs,.avs-pv img,.avs-busy::before{animation:none}}
`;

const SIL = `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="39" r="17" fill="#fff" fill-opacity=".38"/><ellipse cx="50" cy="101" rx="35" ry="36" fill="#fff" fill-opacity=".38"/></svg>`;

const toB64 = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
// štvorcový výrez zo stredu, zmenšený na N bodov
async function squareJpeg(src, N, q = 0.88) {
  const img = await loadImg(src);
  const s = Math.min(img.naturalWidth, img.naturalHeight);
  const cv = document.createElement('canvas'); cv.width = N; cv.height = N;
  const g = cv.getContext('2d'); g.imageSmoothingQuality = 'high';
  g.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, N, N);
  return new Promise((res, rej) => cv.toBlob(b => b ? res(b) : rej(new Error('blob')), 'image/jpeg', q));
}
// selfie: zmenšiť dlhšiu stranu pod 512 (AI modely berú referenčný obrázok do 512 bodov)
async function shrink(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImg(url);
    const k = Math.min(1, 500 / Math.max(img.naturalWidth, img.naturalHeight));
    const cv = document.createElement('canvas'); cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.9));
    return { b64: await toB64(blob), url: cv.toDataURL('image/jpeg', 0.6) };
  } finally { URL.revokeObjectURL(url); }
}

function defaults(sex) {
  const f = sex === 'f';
  return { style: 'real3d', gender: f ? 'f' : 'm', age: 'a25', build: 'fit', skin: 's3', expr: 'soft', eyes: 'brown', beard: f ? 'none' : 'stubble', hair: f ? 'pony' : 'fade', hairc: 'dbrown', outfit: f ? 'bra' : 'tee', color: 'black', glasses: 'none', hat: 'none', extra: 'none', bg: 'green' };
}

export function openAvatarStudio() {
  if (document.querySelector('.avs')) return;
  if (!document.getElementById('avsCss')) { const s = document.createElement('style'); s.id = 'avsCss'; s.textContent = CSS; document.head.appendChild(s); }
  if (!document.getElementById('avsSw')) { // farby volieb: skutočné farby aj vo svetlom režime (data-fw-light = svetlý režim ich neprefarbí)
    const s = document.createElement('style'); s.id = 'avsSw'; s.dataset.fwLight = '';
    s.textContent = Object.entries(SW).map(([k, m]) => Object.entries(m).map(([v, c]) => k === 'bg' ? `.avs .avs-pv[data-bg="${v}"]{background:${c}!important}.avs .avs-s[data-sw="bg-${v}"] i{background:${c}!important}` : `.avs .avs-s[data-sw="${k}-${v}"] i{background:${c}!important}`).join('')).join('');
    document.head.appendChild(s);
  }
  const me = ctx.state?.profile || {};
  const h = (s) => ctx.h(s);
  const st = {
    o: defaults(me.sex), tab: 'style', selfie: null, vers: [], sel: -1, busy: false, err: '', left: null, step: 0,
  };
  const el = document.createElement('div'); el.className = 'avs'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Avatar štúdio');
  document.body.appendChild(el); document.body.style.overflow = 'hidden';
  let timer = null;
  const close = () => { clearInterval(timer); el.remove(); document.body.style.overflow = ''; };

  const cur = () => st.vers[st.sel];
  // čo sa zmenilo oproti vybranej verzii (pri úprave sa pošle len to)
  const changed = () => { const v = cur(); if (!v) return []; return Object.keys(st.o).filter(k => st.o[k] !== v.o[k] && st.o[k] !== 'keep'); };
  const catChanged = (c) => { const ch = changed(); return c.g.some(([k]) => ch.includes(k)); };
  const visible = (k) => !(k === 'beard' && st.o.gender === 'f');
  const itemsFor = (k) => {
    let keys = Object.keys(T[k]);
    if (k === 'hair') keys = st.o.gender === 'f' ? HAIR_F : st.o.gender === 'm' ? HAIR_M : [...new Set([...HAIR_M, ...HAIR_F])];
    if (k === 'outfit' && st.o.gender === 'm') keys = keys.filter(x => x !== 'bra');
    return keys;
  };

  const group = ([k, title]) => {
    if (!visible(k)) return '';
    const keep = st.selfie && FACE_KEYS.includes(k);
    if (k === 'style') {
      return `<div class="avs-g"><h4>${h(title)}</h4><div class="avs-st">${Object.keys(T.style).map(v => `<button type="button" data-k="style" data-v="${v}" class="${st.o.style === v ? 'on' : ''}"><i></i><span><b>${T.style[v]}</b><small>${STYLE_SUB[v]}</small></span></button>`).join('')}</div></div>`;
    }
    const keys = itemsFor(k);
    if (SW[k]) {
      return `<div class="avs-g"><h4>${h(title)}</h4><div class="avs-sw">${keep ? `<button type="button" class="avs-s keep${st.o[k] === 'keep' ? ' on' : ''}" data-k="${k}" data-v="keep"><i></i>Z fotky</button>` : ''}${keys.map(v => `<button type="button" class="avs-s${st.o[k] === v ? ' on' : ''}" data-k="${k}" data-v="${v}" data-sw="${k}-${v}" aria-label="${h(T[k][v])}"><i></i>${h(T[k][v])}</button>`).join('')}</div></div>`;
    }
    return `<div class="avs-g"><h4>${h(title)}</h4><div class="avs-opts">${keep ? `<button type="button" class="avs-o keep${st.o[k] === 'keep' ? ' on' : ''}" data-k="${k}" data-v="keep">Ako na fotke</button>` : ''}${keys.map(v => `<button type="button" class="avs-o${st.o[k] === v ? ' on' : ''}" data-k="${k}" data-v="${v}">${h(T[k][v])}</button>`).join('')}</div></div>`;
  };

  const cta = () => {
    if (st.busy) return 'Vytváram avatara…';
    if (!cur()) return 'Vytvoriť avatara';
    const n = changed().length;
    return n ? `Použiť zmeny (${n})` : 'Vytvoriť inú verziu';
  };
  const hint = () => {
    if (st.busy) return 'Trvá to zvyčajne 10 až 20 sekúnd';
    if (cur() && changed().length) return 'Tvár ostane rovnaká, zmení sa len to, čo si upravil';
    if (cur()) return 'Páči sa? Ťukni na Použiť. Alebo uprav čokoľvek dole';
    return st.selfie ? 'Avatar bude podobný tebe z fotky' : 'Nastav si vzhľad a ťukni na Vytvoriť';
  };

  const draw = () => {
    const v = cur();
    el.innerHTML = `
      <div class="avs-top"><button class="avs-ic" type="button" data-x aria-label="Zavrieť">×</button><b>Avatar štúdio</b><button class="avs-use" type="button" data-use ${v && !st.busy ? '' : 'disabled'}>Použiť</button></div>
      <div class="avs-stage">
        <div class="avs-pv" data-bg="${SW.bg[st.o.bg] ? st.o.bg : 'green'}">
          ${v ? `<img src="${v.url}" alt="Tvoj avatar">` : `<div class="avs-sil">${SIL}</div>`}
          ${st.busy ? `<div class="avs-busy"><span data-step>${STEPS[st.step % STEPS.length]}</span></div>` : ''}
        </div>
        <p class="avs-hint">${h(hint())}</p>
        ${st.vers.length > 1 ? `<div class="avs-vers" aria-label="Verzie">${st.vers.map((x, i) => `<button type="button" data-ver="${i}" class="${i === st.sel ? 'on' : ''}" aria-label="Verzia ${i + 1}"><img src="${x.url}" alt=""></button>`).join('')}</div>` : ''}
        ${v ? '' : `<div class="avs-self">${st.selfie
          ? `<button type="button" class="avs-chip on" data-selfie><img src="${st.selfie.url}" alt="">Podľa mojej fotky</button><button type="button" class="avs-chip" data-noself aria-label="Bez fotky"><i>×</i></button>`
          : `<button type="button" class="avs-chip" data-selfie>📷 Podľa mojej fotky</button>`}</div>`}
        <input type="file" accept="image/*" data-file hidden>
      </div>
      <div class="avs-panel">
        <div class="avs-tabs" role="tablist">${CATS.map(c => `<button type="button" role="tab" class="avs-tab${st.tab === c.id ? ' on' : ''}${catChanged(c) ? ' ch' : ''}" data-tab="${c.id}" aria-selected="${st.tab === c.id}">${c.t}</button>`).join('')}</div>
        <div class="avs-body">${CATS.find(c => c.id === st.tab).g.map(group).join('')}
          ${st.tab === 'style' ? `<p class="avs-left" style="text-align:left;margin:0">Avatara kreslí AI podľa tvojich volieb. ${st.selfie ? 'Fotka slúži len na podobu a nikde sa neukladá.' : 'Môžeš pridať aj svoju fotku, aby sa ti podobal.'}</p>` : ''}
        </div>
        <div class="avs-foot">
          <button class="avs-go" type="button" data-go ${st.busy || st.left === 0 ? 'disabled' : ''}>${h(cta())}</button>
          ${st.err ? `<p class="avs-err">${h(st.err)}</p>` : st.left != null ? `<p class="avs-left">${st.left === 0 ? 'Dnešné pokusy sú minuté, zajtra sa obnovia' : `Dnes ti zostáva ${st.left} z ${LIMIT} pokusov`}</p>` : ''}
        </div>
      </div>`;
    const body = el.querySelector('.avs-body');
    body.scrollTop = st.scroll || 0;
    body.addEventListener('scroll', () => { st.scroll = body.scrollTop; }, { passive: true });
  };

  el.addEventListener('click', async (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.hasAttribute('data-x')) return close();
    if (st.busy && !t.hasAttribute('data-tab') && !t.dataset.k) return;
    if (t.dataset.tab) { st.tab = t.dataset.tab; st.scroll = 0; draw(); return; }
    if (t.dataset.k) {
      const k = t.dataset.k, v = t.dataset.v; st.o[k] = v;
      if (k === 'gender') { // účes a oblečenie sedia k pohlaviu
        if (v === 'f') { if (!HAIR_F.includes(st.o.hair)) st.o.hair = 'pony'; st.o.beard = 'none'; }
        if (v === 'm') { if (!HAIR_M.includes(st.o.hair)) st.o.hair = 'fade'; if (st.o.outfit === 'bra') st.o.outfit = 'tee'; }
      }
      st.err = ''; draw(); return;
    }
    if (t.dataset.ver != null) { st.sel = Number(t.dataset.ver); st.o = { ...st.vers[st.sel].o }; draw(); return; }
    if (t.hasAttribute('data-selfie')) { el.querySelector('[data-file]').click(); return; }
    if (t.hasAttribute('data-noself')) { st.selfie = null; for (const k of FACE_KEYS) if (st.o[k] === 'keep') st.o[k] = defaults(me.sex)[k]; draw(); return; }
    if (t.hasAttribute('data-go')) return generate();
    if (t.hasAttribute('data-use')) return useIt(t);
  });
  el.addEventListener('change', async (e) => {
    const f = e.target.matches('[data-file]') && e.target.files?.[0]; if (!f) return;
    if (!/^image\//.test(f.type || 'image/') || f.size > 25e6) { ctx.toast('Vyber obrázok do 25 MB', true); return; }
    try { st.selfie = await shrink(f); for (const k of FACE_KEYS) st.o[k] = 'keep'; st.tab = 'body'; st.err = ''; draw(); }
    catch (_) { ctx.toast('Túto fotku sa nepodarilo otvoriť', true); }
  });

  async function generate() {
    if (st.busy) return;
    const base = cur();
    const ch = changed();
    const edit = !!base && ch.length > 0;
    const payload = { opts: { ...st.o } };
    if (edit) { payload.prev = base.b64; payload.changed = ch; }
    else if (base?.selfie || (!base && st.selfie)) payload.selfie = (base?.selfie || st.selfie).b64;
    st.busy = true; st.err = ''; st.step = 0; draw();
    timer = setInterval(() => { st.step++; const s = el.querySelector('[data-step]'); if (s) s.textContent = STEPS[st.step % STEPS.length]; }, 2600);
    try {
      const { data, error } = await sb.functions.invoke('avatar-gen', { body: payload });
      let d = data;
      if (error) { try { d = await error.context?.json?.(); } catch (_) { d = null; } }
      if (d?.left != null) st.left = d.left;
      if (!d?.image) throw new Error(d?.error || 'Avatara sa nepodarilo vytvoriť. Skús to znova.');
      // pre úpravy a uloženie držíme štvorcový JPEG 768 bodov
      const blob = await squareJpeg(`data:${d.mime || 'image/png'};base64,${d.image}`, 768, 0.9);
      const url = URL.createObjectURL(blob);
      const b64 = await toB64(await squareJpeg(url, 500, 0.9)); // menšia kópia ako podklad pre úpravy
      URL.revokeObjectURL(url);
      const v = { url: 'data:image/jpeg;base64,' + await toB64(blob), b64, o: { ...st.o }, selfie: edit ? base.selfie : (base?.selfie || st.selfie) };
      // vybraná voľba „Ako na fotke“ ostáva v novej verzii ako základ
      st.vers.push(v); if (st.vers.length > 8) st.vers.shift(); st.sel = st.vers.length - 1;
      try { navigator.vibrate?.(15); } catch (_) { }
    } catch (err) {
      st.err = String(err?.message || '').slice(0, 160) || 'Avatara sa nepodarilo vytvoriť. Skús to znova.';
      if (/Failed to fetch|NetworkError|Load failed/i.test(st.err)) st.err = 'Bez internetu. Skontroluj pripojenie a skús znova.';
    } finally { clearInterval(timer); st.busy = false; if (el.isConnected) draw(); }
  }

  async function useIt(btn) {
    const v = cur(); if (!v) return;
    btn.disabled = true; btn.textContent = 'Ukladám…';
    try {
      const blob = await squareJpeg(v.url, 512, 0.88);
      await uploadAvatarBlob(blob);
      ctx.toast('Avatar je tvoja nová profilovka'); close();
    } catch (err) { ctx.toast(uploadErr(err), true); btn.disabled = false; btn.textContent = 'Použiť'; }
  }

  draw();
  // koľko pokusov dnes zostáva (ticho, bez chyby pri výpadku)
  sb.functions.invoke('avatar-gen', { body: { check: true } }).then(({ data }) => { if (data && data.left != null && el.isConnected && !st.busy) { st.left = data.left; draw(); } }).catch(() => { });
}
try { window.fwAvatarStudio = openAvatarStudio; } catch (_) { }
