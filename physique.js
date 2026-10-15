// Analýza postavy z fotiek (AI). Len pre dospelých. Fotky sa neukladajú, ukladá sa iba výsledok.
// Fotenie: návod ku každej póze, fotoaparát s časovačom a siluetou, kontrola svetla a ostrosti ešte v telefóne.
import * as db from './data.js';
import { ctx } from './app.js';

const h = (...a) => ctx.h(...a), toast = (...a) => ctx.toast(...a), sheet = (...a) => ctx.sheet(...a);

export const LABEL = { shoulders: 'Predné a bočné ramená', reardelt: 'Zadné ramená', chest: 'Hrudník', lats: 'Šírka chrbta (lats)', backthick: 'Hrúbka chrbta a trapézy', biceps: 'Biceps', triceps: 'Triceps', quads: 'Predné stehná', hams: 'Zadné stehná', glutes: 'Zadok', calves: 'Lýtka', core: 'Brucho a stred tela',
  back: 'Chrbát', arms: 'Ruky', posterior: 'Zadok a zadné stehná' };
const ROW_ORDER = ['shoulders', 'reardelt', 'chest', 'lats', 'backthick', 'back', 'biceps', 'triceps', 'arms', 'quads', 'hams', 'glutes', 'posterior', 'calves', 'core'];
const POSES = [
  { k: 'front', t: 'Spredu uvoľnene', sub: 'Povinná', why: 'Ukáže ramená, hrudník, brucho a predné stehná.',
    steps: ['Stoj rovno, päty na šírku bokov, ruky voľne pri tele.', 'Ramená stiahni dole a dozadu, hruď mierne von. Brucho nestahuj a nenafukuj sa.', 'Pozeraj do objektívu. V zábere musíš byť celý od hlavy po päty.'] },
  { k: 'frontbi', t: 'Spredu dvojitý biceps', sub: 'Odporúčaná', why: 'Ukáže biceps, ramená a hrudník napnuté, vtedy je ich tvar najlepšie vidieť.',
    steps: ['Zdvihni lakte do výšky ramien, päste smerom k hlave.', 'Stiahni lopatky a napni naraz biceps, hruď, brucho aj stehná.', 'Brada mierne dole. V zábere aspoň od hlavy po stehná, lepšie celý.'] },
  { k: 'side', t: 'Zboku', sub: 'Odporúčaná', why: 'Ukáže hrúbku hrudníka, triceps, zadok a držanie tela.',
    steps: ['Postav sa presne bokom, ľavým bokom k telefónu.', 'Ruky voľne pri tele alebo triceps napnutý tesne za telom. Hruď von, lopatky stiahnuté.', 'Hlava rovno, pozeraj pred seba. Celý od hlavy po päty.'] },
  { k: 'back', t: 'Zozadu uvoľnene', sub: 'Odporúčaná', why: 'Ukáže šírku chrbta, zadné ramená, zadok, zadné stehná a lýtka.',
    steps: ['Chrbtom k telefónu, päty na šírku bokov, ruky voľne pri tele.', 'Ramená nechaj dole, nezdvíhaj ich k hlave. Lakte mierne odtiahni od tela, nech je vidieť šírka chrbta.', 'Celý od hlavy po päty, lýtka musia byť v zábere.'] },
  { k: 'backbi', t: 'Zozadu dvojitý biceps', sub: 'Odporúčaná', why: 'Ukáže hrúbku chrbta, trapézy a zadné ramená napnuté.',
    steps: ['Chrbtom k telefónu, lakte do výšky ramien.', 'Stiahni lopatky a roztiahni chrbát do tvaru V. Napni zadok, zadné stehná a lýtka.', 'V zábere aspoň od hlavy po stehná, lepšie celý.'] },
  { k: 'abs', t: 'Brucho a nohy', sub: 'Odporúčaná', why: 'Ukáže brucho a predné stehná, kde je vidieť oddelenie svalov.',
    steps: ['Spredu, ruky spojené za hlavou, lakte do strán.', 'Jednu nohu daj o krok dopredu a napni stehno. Brucho nestahuj, drž prirodzene.', 'V zábere aspoň od hlavy po kolená.'] },
];
const POSE = Object.fromEntries(POSES.map(p => [p.k, p]));
const UPPER = ['chest', 'back', 'lats', 'backthick', 'shoulders', 'reardelt', 'arms', 'biceps', 'triceps'], LOWER = ['quads', 'posterior', 'hams', 'glutes', 'calves'];

// ---------- silueta pózy ----------
const L = (pts, w, o) => `<polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="${o || 0.45}"/>`;
const TORSO = '<path d="M30 34 Q50 27 70 34 L66 60 Q62 78 61 94 L39 94 Q38 78 34 60 Z" fill="currentColor" fill-opacity=".16" stroke="currentColor" stroke-width="1.2" stroke-opacity=".7"/>';
const HEAD = '<circle cx="50" cy="16" r="9" fill="currentColor" fill-opacity=".16" stroke="currentColor" stroke-width="1.2" stroke-opacity=".7"/>';
const BACKLINES = '<path d="M50 28 L50 92" stroke="currentColor" stroke-width="1" stroke-dasharray="2 2" opacity=".6" fill="none"/><path d="M39 44 Q45 56 49 50 M61 44 Q55 56 51 50" stroke="currentColor" stroke-width="1" fill="none" opacity=".6"/>';
const LEGS = L('43,98 42,150 41,194', 12) + L('57,98 58,150 59,194', 12);
export function fig(k, overlay) {
  let g = '';
  if (k === 'front') g = TORSO + HEAD + L('28,38 22,66 20,94', 8) + L('72,38 78,66 80,94', 8) + LEGS;
  else if (k === 'frontbi') g = TORSO + HEAD + L('30,38 10,38 10,15', 8) + L('70,38 90,38 90,15', 8) + '<circle cx="10" cy="11" r="4.5" fill="currentColor" opacity=".45"/><circle cx="90" cy="11" r="4.5" fill="currentColor" opacity=".45"/>' + LEGS;
  else if (k === 'side') g = '<path d="M43 32 Q56 33 58 46 L57 70 Q57 86 55 96 L44 96 Q41 70 43 50 Z" fill="currentColor" fill-opacity=".16" stroke="currentColor" stroke-width="1.2" stroke-opacity=".7"/><circle cx="50" cy="16" r="9" fill="currentColor" fill-opacity=".16" stroke="currentColor" stroke-width="1.2" stroke-opacity=".7"/>' + L('49,38 49,66 50,92', 8) + L('50,98 50,150 50,194', 12) + L('50,196 63,196', 5) + '<path d="M70 10 L82 10 M78 6 L82 10 L78 14" stroke="currentColor" stroke-width="1.2" fill="none" opacity=".6"/>';
  else if (k === 'back') g = TORSO + BACKLINES + HEAD + L('28,38 22,66 20,94', 8) + L('72,38 78,66 80,94', 8) + LEGS;
  else if (k === 'backbi') g = TORSO + BACKLINES + HEAD + L('30,38 10,38 10,15', 8) + L('70,38 90,38 90,15', 8) + '<circle cx="10" cy="11" r="4.5" fill="currentColor" opacity=".45"/><circle cx="90" cy="11" r="4.5" fill="currentColor" opacity=".45"/>' + LEGS;
  else g = TORSO + HEAD + L('31,38 12,24 39,12', 8) + L('69,38 88,24 61,12', 8) + L('43,98 42,150 41,194', 12) + L('57,98 62,150 67,192', 12);
  const frame = overlay ? '<path d="M4 2 H96 M4 198 H96" stroke="currentColor" stroke-width=".8" stroke-dasharray="3 3" opacity=".7"/><text x="6" y="9" font-size="5" fill="currentColor" opacity=".8">hlava</text><text x="6" y="196" font-size="5" fill="currentColor" opacity=".8">päty</text>' : '';
  return `<svg viewBox="0 0 100 200" class="px-fig" aria-hidden="true" preserveAspectRatio="xMidYMid meet">${frame}${g}</svg>`;
}

// ---------- kontrola kvality fotky ----------
export function metricsOf(img) {
  const W = 256, s = W / img.width, H = Math.max(8, Math.round(img.height * s));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, W, H);
  const d = x.getImageData(0, 0, W, H).data, g = new Float32Array(W * H);
  let sum = 0;
  for (let i = 0; i < W * H; i++) { const v = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]; g[i] = v; sum += v; }
  const mean = sum / (W * H);
  let vs = 0; for (let i = 0; i < W * H; i++) vs += (g[i] - mean) ** 2;
  const std = Math.sqrt(vs / (W * H));
  let ls = 0, ls2 = 0, n = 0;
  for (let yy = 1; yy < H - 1; yy++) for (let xx = 1; xx < W - 1; xx++) {
    const i = yy * W + xx, l = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - W] - g[i + W];
    ls += l; ls2 += l * l; n++;
  }
  const lap = ls2 / n - (ls / n) ** 2;
  // protisvetlo: stred (kde stojí telo) je výrazne tmavší než okraje (okno za chrbtom)
  let cs = 0, cn = 0, es = 0, en = 0;
  for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
    const inner = xx > W * 0.3 && xx < W * 0.7 && yy > H * 0.12 && yy < H * 0.88, edge = xx < W * 0.12 || xx > W * 0.88;
    if (inner) { cs += g[yy * W + xx]; cn++; } else if (edge) { es += g[yy * W + xx]; en++; }
  }
  return { mean, std, lap, back: cn && en ? { center: cs / cn, edge: es / en } : null };
}
export function qualityOf(w, hgt, m) {
  const hard = [], soft = [];
  if (Math.min(w, hgt) < 700) hard.push('Fotka má nízke rozlíšenie. Použi hlavný fotoaparát, nie priblíženie ani snímku obrazovky.');
  if (hgt / w < 1.2) hard.push('Fotku urob na výšku, aby sa zmestila celá postava od hlavy po päty.');
  if (m.mean < 55) hard.push('Fotka je príliš tmavá. Postav sa čelom k oknu alebo zapni svetlo pred sebou.');
  if (m.mean > 215) hard.push('Fotka je presvetlená. Vyhni sa priamemu slnku a blesku.');
  if (!hard.length) {
    if (m.back && m.back.edge > 130 && m.back.center < m.back.edge * 0.55) soft.push('Silné protisvetlo, telo je v tieni. Otoč sa čelom k oknu alebo zapni svetlo pred sebou.');
    if (m.std < 30) soft.push('Fotka je plochá a bez kontrastu. Svetlo zboku zvýrazní svaly.');
    if (m.lap < 35) soft.push('Fotka vyzerá rozmazaná. Oprej telefón o niečo a nechaj ostriť.');
  }
  return { hard, soft };
}
function loadImg(file) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Fotku sa nepodarilo načítať')); };
    img.src = url;
  });
}
function toJpeg(img, max, q) {
  const s = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  const url = c.toDataURL('image/jpeg', q);
  return { url, b64: url.slice(url.indexOf(',') + 1) };
}

// ---------- fotoaparát s časovačom ----------
function openCamera(pose, done) {
  if (!navigator.mediaDevices?.getUserMedia) return false;
  let stream = null, facing = 'environment', ti = 2, tick = null, ac = null, shot = null, prevUrl = '';
  const TIMES = [0, 5, 10, 15], txt = s => s ? s + ' s' : 'Hneď';
  const ov = document.createElement('div'); ov.className = 'px-cam';
  ov.innerHTML = `<video playsinline muted autoplay></video><img class="px-prev" alt="" hidden><div class="px-guide">${fig(pose.k, true)}</div><div class="px-count" hidden></div><div class="px-flash"></div>
    <div class="px-cam-top"><button data-c="close" aria-label="Zavrieť">×</button><span>${h(pose.t)}</span><button data-c="flip" aria-label="Otočiť kameru">⟲</button></div>
    <div class="px-cam-msg"></div>
    <div class="px-cam-bot" data-m="live"><button class="px-t" data-c="timer">${txt(TIMES[ti])}</button><button class="px-shut" data-c="shot" aria-label="Odfotiť"></button><span class="px-sp"></span></div>
    <div class="px-cam-bot" data-m="count" hidden><button class="px-t" data-c="cancel">Zrušiť</button></div>
    <div class="px-cam-bot" data-m="review" hidden><button class="px-t" data-c="retake">Znova</button><button class="px-use" data-c="use">Použiť fotku</button></div>`;
  document.body.appendChild(ov);
  const $ = s => ov.querySelector(s), vid = $('video');
  const mode = m => ov.querySelectorAll('[data-m]').forEach(b => { b.hidden = b.dataset.m !== m; });
  const stop = () => { clearInterval(tick); tick = null; stream?.getTracks().forEach(t => t.stop()); stream = null; };
  const vis = () => { if (document.hidden) close(); };
  function close() { stop(); document.removeEventListener('visibilitychange', vis); if (prevUrl) URL.revokeObjectURL(prevUrl); try { ac?.close(); } catch (_) { /* nič */ } ov.remove(); }
  document.addEventListener('visibilitychange', vis);
  const beep = (f, d) => { try { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; g.gain.value = 0.12; o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + d); } catch (_) { /* bez zvuku */ } };
  async function start() {
    stop(); $('.px-cam-msg').textContent = '';
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: facing }, width: { ideal: 1440 }, height: { ideal: 2560 } } });
      vid.srcObject = stream; vid.classList.toggle('mirror', facing === 'user'); await vid.play().catch(() => { /* autoplay */ });
    } catch (_) { $('.px-cam-msg').textContent = 'Kameru sa nepodarilo zapnúť. Povoľ ju v nastaveniach prehliadača, alebo zavri a vyber fotku z galérie.'; }
  }
  function snap() {
    if (!stream || !vid.videoWidth) { mode('live'); return; }
    const c = document.createElement('canvas'); c.width = vid.videoWidth; c.height = vid.videoHeight; c.getContext('2d').drawImage(vid, 0, 0);
    c.toBlob(b => {
      if (!b) { mode('live'); return; }
      shot = b; if (prevUrl) URL.revokeObjectURL(prevUrl); prevUrl = URL.createObjectURL(b);
      const pv = $('.px-prev'); pv.src = prevUrl; pv.hidden = false; pv.classList.toggle('mirror', facing === 'user'); vid.hidden = true; $('.px-guide').hidden = true; mode('review');
    }, 'image/jpeg', 0.92);
  }
  function shoot() {
    try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); ac.resume?.(); } catch (_) { /* bez zvuku */ }
    let n = TIMES[ti];
    if (!n) { snap(); return; }
    const cnt = $('.px-count'); mode('count'); cnt.hidden = false; cnt.textContent = n;
    tick = setInterval(() => {
      n--;
      if (n <= 0) { clearInterval(tick); tick = null; cnt.hidden = true; beep(1320, 0.25); navigator.vibrate?.(80); ov.classList.add('flash'); setTimeout(() => ov.classList.remove('flash'), 220); snap(); return; }
      cnt.textContent = n; if (n <= 3) { beep(880, 0.1); navigator.vibrate?.(30); }
    }, 1000);
  }
  ov.addEventListener('click', e => {
    const c = e.target.closest('[data-c]')?.dataset.c; if (!c) return;
    if (c === 'close') close();
    else if (c === 'flip') { facing = facing === 'environment' ? 'user' : 'environment'; start(); }
    else if (c === 'timer') { ti = (ti + 1) % TIMES.length; e.target.textContent = txt(TIMES[ti]); }
    else if (c === 'shot') shoot();
    else if (c === 'cancel') { clearInterval(tick); tick = null; $('.px-count').hidden = true; mode('live'); }
    else if (c === 'retake') { shot = null; $('.px-prev').hidden = true; vid.hidden = false; $('.px-guide').hidden = false; mode('live'); }
    else if (c === 'use' && shot) { const f = new File([shot], 'pose.jpg', { type: 'image/jpeg' }); close(); done(f); }
  });
  start();
  return true;
}

// ---------- dáta ----------
async function lastChecks(uid) {
  const { data, error } = await db.sb.from('physique_checks').select('id,created_at,result').eq('user_id', uid).eq('ok', true).order('created_at', { ascending: false }).limit(5);
  if (error) throw new Error(error.message);
  return (data || []).filter(r => r.result?.usable);
}
async function callAi(images) {
  const { data, error } = await db.sb.functions.invoke('physique-ai', { body: { images } });
  if (error) {
    let msg = error.message;
    try { const j = await error.context.json(); if (j?.error) msg = j.error; } catch (_) { /* nič */ }
    throw new Error(msg);
  }
  return data;
}
const fmtDate = iso => { const d = new Date(iso); return isNaN(d) ? '' : `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`; };
export function applyHint(prio) {
  const up = prio.filter(k => UPPER.includes(k)).length, lo = prio.filter(k => LOWER.includes(k)).length;
  return { priority: prio.slice(0, 2), emphasis: up > lo ? 'upper' : lo > up ? 'lower' : 'balanced' };
}
const photoWord = n => n === 1 ? 'fotka' : n < 5 ? 'fotky' : 'fotiek';

// ---------- vzhľad ----------
const CSS = `
.px-card{margin-bottom:12px;padding:14px;border-radius:18px;border:1px solid var(--line);background:linear-gradient(160deg,rgba(124,255,178,.10),rgba(124,255,178,.02))}
.px-card b{display:block;font-size:15px}.px-card p{margin:4px 0 10px}
.px-tip{margin:0 0 14px;padding:0;list-style:none}.px-tip li{position:relative;padding:0 0 8px 22px;font-size:13.5px;line-height:1.45}.px-tip li:before{content:'';position:absolute;left:2px;top:6px;width:8px;height:8px;border-radius:50%;background:var(--accent)}
.px-slots{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:10px 0 12px}
.px-slot{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:2px;min-height:168px;border-radius:14px;border:1px dashed var(--line);background:var(--card-2);color:var(--text);cursor:pointer;overflow:hidden;text-align:center;padding:8px;font-size:12.5px;-webkit-tap-highlight-color:transparent}
.px-slot b{font-size:13.5px;position:relative}.px-slot small{color:var(--muted);font-size:11.5px;line-height:1.3;position:relative}.px-slot>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.px-slot .px-mini{position:absolute;left:0;right:0;top:8px;bottom:46px;display:flex;justify-content:center;color:var(--accent);opacity:.8}.px-mini .px-fig{height:100%}
.px-slot.has{border-style:solid;border-color:var(--accent)}.px-slot.bad{border-style:solid;border-color:#ff7a7a}
.px-slot .tag{position:absolute;left:6px;bottom:6px;right:6px;padding:4px 6px;border-radius:8px;background:rgba(0,0,0,.7);color:#fff;font-size:11px;line-height:1.25}
.px-slot .px-x{position:absolute;right:6px;top:6px;width:26px;height:26px;border-radius:50%;background:rgba(0,0,0,.65);color:#fff;font-size:17px;line-height:26px;text-align:center}
.px-warn{margin:0 0 8px;padding:10px 12px;border-radius:12px;font-size:12.5px;line-height:1.45;background:rgba(255,122,122,.12);border:1px solid rgba(255,122,122,.35)}
.px-warn.soft{background:rgba(255,210,122,.10);border-color:rgba(255,210,122,.35)}
.px-note{font-size:12px;color:var(--muted);line-height:1.5;margin:10px 2px 0}
.px-meter{margin:0 0 12px;padding:11px 13px;border-radius:14px;background:var(--card-2);border:1px solid var(--line);font-size:13px;line-height:1.45}
.px-meter .bars{display:flex;gap:4px;margin:0 0 7px}.px-meter .bars i{flex:1;height:5px;border-radius:3px;background:rgba(255,255,255,.1)}.px-meter .bars i.on{background:var(--accent)}
.px-prep{margin:0 0 12px;border-radius:14px;border:1px solid var(--line);background:var(--card-2);overflow:hidden}
.px-prep summary{padding:12px 14px;font-size:14px;font-weight:600;cursor:pointer;list-style:none}.px-prep summary::-webkit-details-marker{display:none}.px-prep summary:after{content:'+';float:right;color:var(--muted)}.px-prep[open] summary:after{content:'−'}
.px-prep .px-tip{padding:0 14px;margin:0}
.px-guidebig{display:flex;justify-content:center;color:var(--accent);margin:6px 0 10px}.px-guidebig .px-fig{height:230px}
.px-m{margin:0 0 10px}.px-m .r{display:flex;align-items:center;gap:10px;font-size:13.5px}.px-m .r>span{flex:0 0 118px}
.px-m i{flex:1;height:8px;border-radius:4px;background:rgba(255,255,255,.09);overflow:hidden}.px-m i b{display:block;height:100%;border-radius:4px;background:var(--accent)}
.px-m.low i b{background:#ffd27a}.px-m em{flex:0 0 42px;text-align:right;font-style:normal;font-size:12px;color:var(--muted)}.px-m em.up{color:var(--accent)}.px-m em.dn{color:#ff9b9b}
.px-m small{display:block;color:var(--muted);font-size:12px;line-height:1.4;margin:2px 0 0 128px}.px-m small b.dn{color:#ffd27a}.px-m small b.up{color:var(--accent)}
.px-h{font-size:14px;margin:16px 0 6px}.px-list{margin:0 0 0 18px;padding:0;font-size:13.5px;line-height:1.5}
.px-sum{font-size:14px;line-height:1.5;margin:6px 0 4px}.px-prio{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 4px}.px-prio span{padding:7px 12px;border-radius:999px;border:1px solid var(--accent);background:rgba(124,255,178,.12);font-size:13.5px}
.px-pn{margin:6px 0 0;padding:0;list-style:none;font-size:12.5px;color:var(--muted);line-height:1.45}.px-pn b{color:var(--text)}
.px-lvl{display:inline-block;margin:2px 0 6px;padding:5px 11px;border-radius:999px;background:var(--card-2);border:1px solid var(--line);font-size:12.5px}
.px-caut{margin:12px 0 0;padding:11px 13px;border-radius:12px;background:rgba(255,210,122,.10);border:1px solid rgba(255,210,122,.4);font-size:13px;line-height:1.45}
.px-load{text-align:center;padding:22px 6px}.px-load .strip{display:flex;justify-content:center;gap:6px;margin:0 auto 14px}.px-load .ph{position:relative;width:64px;height:86px;border-radius:10px;overflow:hidden;background:#000;flex:0 0 auto}.px-load .ph img{width:100%;height:100%;object-fit:cover;opacity:.8}
.px-load .ph:after{content:'';position:absolute;left:0;right:0;height:3px;background:var(--accent);box-shadow:0 0 14px var(--accent);animation:pxScan 1.6s ease-in-out infinite alternate}
@keyframes pxScan{from{top:0}to{top:calc(100% - 3px)}}@media (prefers-reduced-motion:reduce){.px-load .ph:after{animation:none;top:50%}}
.px-cam{position:fixed;inset:0;z-index:35;background:#000;color:#fff;display:flex;flex-direction:column}
.px-cam video,.px-cam .px-prev{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.px-cam .mirror{transform:scaleX(-1)}
.px-guide{position:absolute;inset:0;display:flex;justify-content:center;align-items:center;padding:64px 28px 128px;color:#fff;opacity:.4;pointer-events:none}.px-guide .px-fig{height:100%;max-width:100%}
.px-cam-top{position:absolute;left:0;right:0;top:0;padding:calc(10px + env(safe-area-inset-top)) 12px 10px;display:flex;align-items:center;justify-content:space-between;background:linear-gradient(rgba(0,0,0,.6),transparent);font-size:14px;font-weight:600}
.px-cam-top button{width:42px;height:42px;border-radius:50%;border:0;background:rgba(0,0,0,.45);color:#fff;font-size:22px}
.px-cam-bot{position:absolute;left:0;right:0;bottom:0;padding:16px 18px calc(18px + env(safe-area-inset-bottom));display:flex;align-items:center;justify-content:space-between;background:linear-gradient(transparent,rgba(0,0,0,.65))}
.px-cam-bot[hidden],.px-cam [hidden]{display:none!important}
.px-t{min-width:76px;height:42px;border-radius:21px;border:0;background:rgba(255,255,255,.18);color:#fff;font-size:14px;font-weight:600;padding:0 14px}.px-sp{width:76px}
.px-shut{width:70px;height:70px;border-radius:50%;border:4px solid #fff;background:rgba(255,255,255,.25);box-shadow:inset 0 0 0 5px #000}
.px-use{height:46px;border-radius:23px;border:0;background:var(--accent);color:var(--accent-ink);font-size:15px;font-weight:700;padding:0 22px}
.px-count{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:150px;font-weight:800;text-shadow:0 4px 30px rgba(0,0,0,.7);pointer-events:none}
.px-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;transition:opacity .2s}.px-cam.flash .px-flash{opacity:.85;transition:none}
.px-cam-msg{position:absolute;left:18px;right:18px;top:96px;font-size:13.5px;line-height:1.45;text-align:center;text-shadow:0 1px 8px #000}
`;
if (typeof document !== 'undefined' && !document.getElementById('px-css')) { const st = document.createElement('style'); st.id = 'px-css'; st.textContent = CSS; document.head.appendChild(st); }

export function physiqueCardHtml() {
  return `<div class="px-card"><b>📸 Analýza postavy (AI)</b><p class="muted small">Odfoť sa a AI ohodnotí každý sval ako kouč: čo zaostáva, čo ide dobre a čo s tým v tréningu. Podľa toho ti vie nastaviť plán.</p><button class="btn sm primary" id="physOpen">Otvoriť analýzu</button></div>`;
}

// ---------- hlavné okno ----------
export async function openPhysique({ profile, onApply }) {
  const age = profile.birth_year ? new Date().getFullYear() - Number(profile.birth_year) : 0;
  const bg = sheet('<div id="pxBody"><p class="muted small">Načítavam…</p></div>');
  const body = bg.querySelector('#pxBody');
  const close = () => bg.remove();
  const head = t => `<div class="row between"><h2>${t}</h2><button class="del" data-x aria-label="Zavrieť">×</button></div>`;
  const bindX = () => body.querySelector('[data-x]')?.addEventListener('click', close);
  if (age < 18) {
    body.innerHTML = head('Analýza postavy') + `<p class="muted small mt">Táto funkcia je len pre dospelých. ${profile.birth_year ? '' : 'Doplň rok narodenia v profile.'}</p>`;
    return bindX();
  }
  let history = [], picked = {}; // picked: pose -> { b64, url, bad, hard, soft }
  try { history = await lastChecks(profile.id); } catch (_) { /* bez histórie */ }

  const showResult = (rec, prev) => {
    const r = rec.result, ms = r.muscles || {}, v2 = r.v === 2, cmp = v2 && prev?.result?.v === 2;
    const rows = ROW_ORDER.filter(k => ms[k]).map(k => {
      const m = ms[k];
      if (!m.score) return `<div class="px-m"><div class="r"><span>${LABEL[k]}</span><i></i><em>nevidno</em></div></div>`;
      const pv = cmp ? prev.result.muscles?.[k]?.score : 0, dl = pv ? m.score - pv : 0;
      const low = v2 ? m.vs === 'zaostáva' : m.score <= 2;
      const tagTxt = v2 && m.vs === 'zaostáva' ? '<b class="dn">Zaostáva.</b> ' : v2 && m.vs === 'vedie' ? '<b class="up">Vedie.</b> ' : '';
      return `<div class="px-m${low ? ' low' : ''}"><div class="r"><span>${LABEL[k]}</span><i><b style="width:${m.score * 20}%"></b></i><em class="${dl > 0 ? 'up' : dl < 0 ? 'dn' : ''}">${m.score}/5${dl > 0 ? ' ▲' : dl < 0 ? ' ▼' : ''}</em></div>${m.note || tagTxt ? `<small>${tagTxt}${h(m.note || '')}</small>` : ''}</div>`;
    }).join('');
    const pkeys = r.priorities || [], prio = pkeys.map(k => LABEL[k]).filter(Boolean);
    const pnotes = pkeys.filter(k => r.priority_notes?.[k]).map(k => `<li><b>${LABEL[k]}:</b> ${h(r.priority_notes[k])}</li>`).join('');
    const conf = r.confidence >= 0.75 ? 'vysoká' : r.confidence >= 0.5 ? 'stredná' : 'nízka';
    const badPhotos = (r.photos || []).filter(p => p.ok === false && p.issue).map(p => `<li><b>${h(POSE[p.pose]?.t || p.pose)}:</b> ${h(p.issue)}</li>`).join('');
    const retake = (r.retake || []).map(t => `<li>${h(t)}</li>`).join('');
    body.innerHTML = head('Tvoja analýza') + `<p class="muted small">${fmtDate(rec.created_at)}${cmp ? ' · porovnanie s ' + fmtDate(prev.created_at) : ''}</p>
      ${r.level ? `<span class="px-lvl">Stupňeo rozvoja: <b>${h(r.level)}</b></span>` : ''}
      ${r.summary ? `<p class="px-sum">${h(r.summary)}</p>` : ''}
      ${prio.length ? `<p class="px-h">Priorita na zlepšenie</p><div class="px-prio">${prio.map(t => `<span>${h(t)}</span>`).join('')}</div>${pnotes ? `<ul class="px-pn">${pnotes}</ul>` : ''}` : ''}
      <p class="px-h">Hodnotenie svalov</p>${rows}
      ${(r.strengths || []).length ? `<p class="px-h">Silné stránky</p><ul class="px-list">${r.strengths.map(t => `<li>${h(t)}</li>`).join('')}</ul>` : ''}
      ${r.proportions ? `<p class="px-h">Proporcie</p><p class="small" style="margin:0">${h(r.proportions)}</p>` : ''}
      ${r.symmetry ? `<p class="px-h">Symetria</p><p class="small" style="margin:0">${h(r.symmetry)}</p>` : ''}
      ${r.posture ? `<p class="px-h">Držanie tela</p><p class="small" style="margin:0">${h(r.posture)}</p>` : ''}
      ${r.conditioning ? `<p class="px-h">Viditeľnosť svalov</p><p class="small" style="margin:0">${h(r.conditioning)}</p>` : ''}
      ${(r.advice || []).length ? `<p class="px-h">Čo s tým v tréningu</p><ul class="px-list">${r.advice.map(t => `<li>${h(t)}</li>`).join('')}</ul>` : ''}
      ${badPhotos || retake ? `<p class="px-h">Ako fotiť nabudúce</p><ul class="px-list">${badPhotos}${retake}</ul>` : ''}
      ${r.caution ? `<div class="px-caut">${h(r.caution)}</div>` : ''}
      <p class="px-note">Spoľahlivosť odhadu: ${conf}. Je to odhad AI z fotiek, nie lekárske ani súťažné posúdenie. Svetlo, pumpa a napnutie výsledok ovplyvňujú. Fotka nikdy nenahradí kouča, ktorý ťa vidí osobne.</p>
      ${pkeys.length ? '<button class="btn primary mt" id="pxApply">Nastaviť plán podľa analýzy</button>' : ''}
      <button class="btn mt" id="pxNew">Nová analýza</button>
      <button class="btn ghost mt" id="pxDel">Zmazať túto analýzu</button>`;
    bindX();
    body.querySelector('#pxNew').onclick = startNew;
    body.querySelector('#pxApply')?.addEventListener('click', () => { close(); onApply(applyHint(pkeys)); });
    body.querySelector('#pxDel').onclick = async () => {
      if (!confirm('Zmazať túto analýzu?')) return;
      try { const { error } = await db.sb.from('physique_checks').delete().eq('id', rec.id); if (error) throw new Error(error.message); history = history.filter(x => x.id !== rec.id); toast('Analýza zmazaná'); home(); }
      catch (e) { toast(e.message, true); }
    };
  };

  const home = () => {
    if (!history.length) return startNew();
    const l = history[0], pr = (l.result.priorities || []).map(k => LABEL[k]).filter(Boolean);
    body.innerHTML = head('Analýza postavy') + `<div class="px-card"><b>Posledná analýza: ${fmtDate(l.created_at)}</b><p class="muted small">${pr.length ? 'Priorita: ' + h(pr.join(', ')) : 'Bez zvýraznenej priority'}</p><button class="btn sm primary" id="pxShow">Zobraziť</button></div>
      <button class="btn primary" id="pxNew">Nová analýza</button>
      <p class="px-note">Odporúčame novú analýzu raz za 4 až 8 týždňov, v rovnakom svetle, na rovnakom mieste a v rovnakú dennú dobu, aby si videl skutočný pokrok.</p>`;
    bindX();
    body.querySelector('#pxShow').onclick = () => showResult(l, history[1]);
    body.querySelector('#pxNew').onclick = startNew;
  };

  function startNew() { picked = {}; capture(); }

  // pokrytie: koľko svalov vie AI z poslaných póz posúdiť
  function coverage() {
    const has = k => picked[k] && !picked[k].bad;
    const n = POSES.filter(p => has(p.k)).length, front = has('front'), back = has('back') || has('backbi'), side = has('side');
    const c = [front, back, side].filter(Boolean).length;
    const lvl = !front ? 0 : c >= 3 && n >= 4 ? 3 : c >= 2 ? 2 : 1;
    const miss = [];
    if (front && !back) miss.push('zozadu (šírka a hrúbka chrbta, zadné ramená, zadok, lýtka)');
    if (front && !side) miss.push('zboku (triceps, držanie tela)');
    if (front && c >= 3 && n < 4) miss.push('dvojitý biceps spredu alebo zozadu (napnuté svaly)');
    return { n, lvl, miss };
  }

  function guide(k) {
    const p = POSE[k];
    body.innerHTML = head(h(p.t)) + `<div class="px-guidebig">${fig(k)}</div>
      <p class="muted small" style="margin:0 0 8px">${h(p.why)}</p>
      <ul class="px-tip">${p.steps.map(s => `<li>${h(s)}</li>`).join('')}</ul>
      ${navigator.mediaDevices?.getUserMedia ? '<button class="btn primary" id="pxCam">Odfotiť s časovačom</button>' : ''}
      <label class="btn mt" style="display:block;text-align:center;cursor:pointer">Vybrať fotku z galérie<input type="file" accept="image/*" hidden id="pxFile"></label>
      <button class="btn ghost mt" id="pxBack">Späť</button>
      <p class="px-note">Časovač ti dá čas oprieť telefón a zaujať pózu. Posledné 3 sekundy pípa.</p>`;
    bindX();
    body.querySelector('#pxBack').onclick = capture;
    body.querySelector('#pxFile').onchange = e => { const f = e.target.files?.[0]; if (f) take(k, f); };
    body.querySelector('#pxCam')?.addEventListener('click', () => { if (!openCamera(p, f => take(k, f))) toast('Kamera nie je dostupná, vyber fotku z galérie', true); });
  }

  async function take(k, file) {
    try {
      const img = await loadImg(file), q = qualityOf(img.width, img.height, metricsOf(img));
      const j = toJpeg(img, 1152, 0.82);
      picked[k] = { b64: j.b64, url: j.url, bad: q.hard.length > 0, hard: q.hard, soft: q.soft };
    } catch (e) { toast(e.message || 'Fotku sa nepodarilo načítať', true); }
    capture();
  }

  function capture() {
    const cov = coverage(), lvlTxt = ['—', 'nízka', 'stredná', 'vysoká'][cov.lvl];
    const warns = POSES.filter(p => picked[p.k]).flatMap(p => [...picked[p.k].hard.map(t => [p.t, t, '']), ...picked[p.k].soft.map(t => [p.t, t, ' soft'])])
      .map(([a, t, c]) => `<div class="px-warn${c}"><b style="display:inline">${h(a)}:</b> ${h(t)}</div>`).join('');
    const slot = p => {
      const s = picked[p.k];
      return `<div class="px-slot${s ? (s.bad ? ' bad' : ' has') : ''}" role="button" tabindex="0" data-slot="${p.k}">
        ${s ? `<img src="${s.url}" alt=""><span class="px-x" data-del="${p.k}" aria-label="Odstrániť">×</span><span class="tag">${h(p.t)}: ${s.bad ? 'nevhodná, vyfoť znova' : s.soft.length ? 'použiteľná' : 'dobrá'}</span>`
          : `<span class="px-mini">${fig(p.k)}</span><b>${h(p.t)}</b><small>${h(p.sub)}</small>`}</div>`;
    };
    body.innerHTML = head('Nová analýza') + `
      <p class="muted small">Čím viac póz pošleš, tým presnejšie AI ohodnotí každý sval. Ťukni na pózu, uvidíš návod a môžeš sa odfotiť s časovačom.</p>
      <details class="px-prep"><summary>Príprava: svetlo, vzdialenosť, oblečenie</summary><ul class="px-tip">
        <li>Svetlo: stoj čelom k oknu alebo lampe. Nie pod stropným svetlom, žiadne protisvetlo, blesk ani filtre.</li>
        <li>Telefón na výšku vo výške pása až hrude, 2 až 3 metre od teba. Oprieť o poličku alebo použi časovač.</li>
        <li>Pozadie: jednoduchá stena, bez zrkadiel a bez ľudí v zábere.</li>
        <li>Plavky alebo krátke šortky, bez trička. Ženy športová podprsenka. Voľné oblečenie skrýva svaly.</li>
        <li>V pózach dvojitý biceps a brucho svaly naozaj napni. Uvoľnená póza ukáže menej.</li>
        <li>Pri každej analýze rovnaké miesto, svetlo a dennú dobu (najlepšie ráno), inak sa pokrok nedá férovo porovnať.</li></ul></details>
      <div class="px-slots">${POSES.map(slot).join('')}</div>
      ${warns}
      <div class="px-meter"><div class="bars"><i class="${cov.lvl >= 1 ? 'on' : ''}"></i><i class="${cov.lvl >= 2 ? 'on' : ''}"></i><i class="${cov.lvl >= 3 ? 'on' : ''}"></i></div>
        ${cov.lvl ? `Presnosť hodnotenia: <b>${lvlTxt}</b>.${cov.miss.length ? ' Pridaj ' + h(cov.miss.join(', ')) + '.' : ' Máš všetko potrebné.'}` : 'Začni pózou spredu uvoľnene, tá je povinná.'}</div>
      <button class="btn primary" id="pxGo" ${cov.n && picked.front && !picked.front.bad ? '' : 'disabled'}>Analyzovať${cov.n ? ` (${cov.n} ${photoWord(cov.n)})` : ''}</button>
      <p class="px-note">Fotky sa odošlú na spracovanie AI službe Google a neukladajú sa u nás. Uloží sa len textový výsledok, ktorý môžeš kedykoľvek zmazať. Fotky nevidí kouč ani kamaráti.</p>`;
    bindX();
    body.querySelectorAll('[data-slot]').forEach(el => {
      const open = e => {
        const d = e.target.closest('[data-del]');
        if (d) { e.stopPropagation(); delete picked[d.dataset.del]; capture(); return; }
        guide(el.dataset.slot);
      };
      el.onclick = open; el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(e); } };
    });
    body.querySelector('#pxGo').onclick = analyze;
  }

  async function analyze() {
    const list = POSES.filter(p => picked[p.k] && !picked[p.k].bad);
    if (!list.length) return;
    const images = list.map(p => ({ pose: p.k, data: picked[p.k].b64 }));
    const steps = ['Kontrolujem kvalitu fotiek…', 'Hodnotím ramená a hrudník…', 'Hodnotím chrbát a ruky…', 'Hodnotím nohy a brucho…', 'Skladám odporúčania…'];
    body.innerHTML = `<div class="px-load"><div class="strip">${list.map(p => `<div class="ph"><img src="${picked[p.k].url}" alt=""></div>`).join('')}</div><b id="pxStep">${steps[0]}</b><p class="muted small mt">Trvá to približne minútu. Nezatváraj appku.</p></div>`;
    let si = 0; const iv = setInterval(() => { si = Math.min(si + 1, steps.length - 1); const el = body.querySelector('#pxStep'); if (el) el.textContent = steps[si]; }, 9000);
    try {
      const out = await callAi(images);
      const r = out?.result;
      if (!r?.usable) {
        body.innerHTML = head('Fotky sa nedali použiť') + `<p class="small mt">AI na týchto fotkách nevie spoľahlivo hodnotiť:</p><ul class="px-list">${(r?.issues?.length ? r.issues : ['Skús fotky urobiť znova podľa tipov.']).map(t => `<li>${h(t)}</li>`).join('')}</ul><button class="btn primary mt" id="pxAgain">Opraviť fotky</button>`;
        bindX(); body.querySelector('#pxAgain').onclick = capture; return;
      }
      const rec = { id: out.id, created_at: out.created_at || new Date().toISOString(), result: r };
      history = [rec, ...history];
      picked = {};
      showResult(rec, history[1]);
    } catch (e) {
      body.innerHTML = head('Nepodarilo sa') + `<p class="muted small mt">${h(e.message)}</p><button class="btn primary mt" id="pxAgain">Skúsiť znova</button>`;
      bindX(); body.querySelector('#pxAgain').onclick = capture;
    } finally { clearInterval(iv); }
  }
  home();
}
